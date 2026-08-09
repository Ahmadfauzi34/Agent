
import * as tf from '@tensorflow/tfjs';
import { Ok, Err } from './types.ts';
import type { Result } from './types.ts';

interface VectorRecord {
  id: string;
  text: string;
  vector: number[];
}

/**
 * CUSTOM ACTIVATION: MISH
 * f(x) = x * tanh(softplus(x))
 * Implemented as a custom layer to ensure compatibility across TFJS versions.
 */
class MishLayer extends tf.layers.Layer {
  static className = 'MishLayer'; // Important for serialization

  constructor() {
    super({});
  }

  computeOutputShape(inputShape: tf.Shape) {
    return inputShape;
  }

  call(inputs: tf.Tensor | tf.Tensor[]) {
    return tf.tidy(() => {
      const x = Array.isArray(inputs) ? inputs[0] : inputs;
      // softplus(x) = ln(1 + e^x)
      const sp = tf.softplus(x);
      // tanh(sp)
      const t = tf.tanh(sp);
      // x * t
      return x.mul(t);
    });
  }
}
// Register specifically so loadModel/saveModel works with it
tf.serialization.registerClass(MishLayer);


/**
 * TF.JS SERVICE (THE ENGINE)
 * Handles all tensor manipulations and mathematical computations.
 */
export class TensorFlowEngine {
  // Store the currently loaded model in memory
  private static activeModel: tf.LayersModel | null = null;
  // In-Memory Vector Database (Simulating LanceDB)
  private static vectorDb: VectorRecord[] = [];
  private static dbLoaded: boolean = false;
  private static DB_KEY = 'SENTINEL_VECTOR_DB_V1';

  private static ensureDbLoaded() {
      if (!this.dbLoaded && typeof window !== 'undefined') {
          try {
              const saved = localStorage.getItem(this.DB_KEY);
              if (saved) {
                  this.vectorDb = JSON.parse(saved);
                  console.log(`[Engine] Loaded ${this.vectorDb.length} memories from storage.`);
              }
          } catch (e) {
              console.error("[Engine] Failed to load DB", e);
          }
          this.dbLoaded = true;
      }
  }

  private static saveDb() {
      if (typeof window !== 'undefined') {
          try {
              // Limit check: Simple safeguard for LocalStorage (5MB limit)
              // If too large, keep only the last 50 items
              if (this.vectorDb.length > 50) {
                  this.vectorDb = this.vectorDb.slice(-50);
              }
              localStorage.setItem(this.DB_KEY, JSON.stringify(this.vectorDb));
          } catch (e) {
              console.error("[Engine] Failed to save DB", e);
          }
      }
  }

  /**
   * Melakukan operasi matematika element-wise pada dua tensor.
   */
  static performTensorMath(a: number[], b: number[], operation: 'add' | 'sub' | 'mul' | 'div' | 'dot'): Result<{ result: number[] | number, shape: number[] }, string> {
    if (a.length !== b.length) {
      return Err(`Dimensi tidak cocok: Tensor A (${a.length}) dan B (${b.length}) harus memiliki ukuran yang sama.`);
    }

    try {
      return tf.tidy(() => {
        const tA = tf.tensor1d(a);
        const tB = tf.tensor1d(b);
        let res: tf.Tensor;

        if (operation === 'dot') {
            res = tf.dot(tA, tB);
            return Ok({
                result: res.dataSync()[0],
                shape: []
            });
        }

        switch (operation) {
          case 'add': res = tf.add(tA, tB); break;
          case 'sub': res = tf.sub(tA, tB); break;
          case 'mul': res = tf.mul(tA, tB); break;
          case 'div': res = tf.div(tA, tB); break;
          default: return Err("Operasi tidak dikenal.");
        }

        return Ok({
          result: Array.from(res.dataSync()),
          shape: res.shape
        });
      });
    } catch (e) {
      return Err(`Gagal memanipulasi tensor: ${String(e)}`);
    }
  }

  /**
   * Menghitung kemiripan kosinus (Cosine Similarity) antara dua vektor.
   */
  static cosineSimilarity(a: number[], b: number[]): Result<{ similarity: number }, string> {
     if (a.length !== b.length) return Err("Vector dimensions must match for similarity check.");
     
     return tf.tidy(() => {
        const tA = tf.tensor1d(a);
        const tB = tf.tensor1d(b);
        const dotProduct = tf.dot(tA, tB);
        const normA = tf.norm(tA);
        const normB = tf.norm(tB);
        
        const similarity = tf.div(dotProduct, tf.mul(normA, normB));
        return Ok({ similarity: similarity.dataSync()[0] });
     });
  }

  static detectOutliers(data: number[], threshold: number = 2): Result<{ outliers: number[], indices: number[] }, string> {
      if (data.length === 0) return Err("Data kosong.");

      return tf.tidy(() => {
          const t = tf.tensor1d(data);
          const moments = tf.moments(t);
          const mean = moments.mean;
          const std = moments.variance.sqrt();

          const zScores = tf.abs(tf.div(tf.sub(t, mean), std));
          const mask = zScores.greater(threshold);
          
          const maskData = mask.dataSync();
          const outliers: number[] = [];
          const indices: number[] = [];

          maskData.forEach((isOutlier, index) => {
              if (isOutlier) {
                  outliers.push(data[index]);
                  indices.push(index);
              }
          });

          return Ok({ outliers, indices });
      });
  }

  static computeStatistics(data: number[]): Result<{ mean: number; std: number; min: number; max: number }, string> {
    if (data.length === 0) return Err("Empty dataset provided.");
    
    return tf.tidy(() => {
      const t = tf.tensor1d(data);
      const mean = t.mean().dataSync()[0];
      const std = tf.moments(t).variance.sqrt().dataSync()[0];
      const min = t.min().dataSync()[0];
      const max = t.max().dataSync()[0];
      
      return Ok({ mean, std, min, max });
    });
  }

  // --- ADVANCED MODEL MANAGEMENT ---

  static async loadModel(url: string): Promise<Result<{ message: string }, string>> {
      try {
          if (this.activeModel) this.activeModel.dispose();
          this.activeModel = await tf.loadLayersModel(url);
          return Ok({ message: `Model loaded successfully from ${url}` });
      } catch (e) {
          return Err(`Failed to load model: ${String(e)}`);
      }
  }

  static async saveModelLocal(name: string): Promise<Result<{ message: string; path: string }, string>> {
      if (!this.activeModel) return Err("No active model to save. Create or train one first.");
      try {
          const savePath = `localstorage://${name}`;
          await this.activeModel.save(savePath);
          return Ok({ message: `Model saved successfully.`, path: savePath });
      } catch (e) {
          return Err(`Failed to save model: ${String(e)}`);
      }
  }

  static async loadLocalModel(name: string): Promise<Result<{ message: string }, string>> {
      try {
          const loadPath = `localstorage://${name}`;
          if (this.activeModel) this.activeModel.dispose();
          this.activeModel = await tf.loadLayersModel(loadPath);
          return Ok({ message: `Model '${name}' loaded from LocalStorage.` });
      } catch (e) {
          return Err(`Failed to load model '${name}': ${String(e)} (Model might not exist)`);
      }
  }

  static async listLocalModels(): Promise<Result<{ models: any }, string>> {
      try {
          const models = await tf.io.listModels();
          return Ok({ models });
      } catch (e) {
          return Err(`Failed to list models: ${String(e)}`);
      }
  }

  /**
   * Creates a custom neural network architecture based on specifications.
   */
  static async createDenseModel(layersConfig: Array<{ 
    type?: 'dense' | 'flatten' | 'dropout' | 'lstm',
    units?: number, 
    activation?: string, 
    inputShape?: number[], 
    l1Regularization?: number,
    rate?: number,
    returnSequences?: boolean
  }>): Promise<Result<{ message: string }, string>> {
      try {
          if (this.activeModel) this.activeModel.dispose();

          const model = tf.sequential();
          
          layersConfig.forEach((config, index) => {
             const layerType = config.type || 'dense';
             const baseConfig: any = {};

             // Apply inputShape only to the first layer
             if (index === 0 && config.inputShape) {
                 baseConfig.inputShape = config.inputShape;
             }

             switch(layerType) {
                 case 'dense':
                     if (!config.units) throw new Error(`Layer ${index} (Dense) missing 'units'.`);
                     baseConfig.units = config.units;
                     
                     // HANDLE CUSTOM MISH ACTIVATION
                     // If user asks for 'mish', we set dense to 'linear' then append MishLayer
                     let requestedActivation = config.activation || 'relu';
                     if (requestedActivation === 'mish') {
                         baseConfig.activation = 'linear';
                     } else {
                         baseConfig.activation = requestedActivation;
                     }

                     if (config.l1Regularization) {
                         baseConfig.kernelRegularizer = tf.regularizers.l1({ l1: config.l1Regularization });
                     }
                     
                     model.add(tf.layers.dense(baseConfig));

                     // Append Mish Custom Layer if requested
                     if (requestedActivation === 'mish') {
                         model.add(new MishLayer());
                     }
                     break;

                 case 'flatten':
                     model.add(tf.layers.flatten(baseConfig));
                     break;

                 case 'dropout':
                     if (config.rate === undefined) throw new Error(`Layer ${index} (Dropout) missing 'rate'.`);
                     baseConfig.rate = config.rate;
                     model.add(tf.layers.dropout(baseConfig));
                     break;

                 case 'lstm':
                     if (!config.units) throw new Error(`Layer ${index} (LSTM) missing 'units'.`);
                     baseConfig.units = config.units;
                     baseConfig.returnSequences = config.returnSequences || false;
                     model.add(tf.layers.lstm(baseConfig));
                     break;

                 default:
                     console.warn(`Unknown layer type ${layerType}, defaulting to Dense`);
                     baseConfig.units = config.units || 10;
                     baseConfig.activation = 'relu';
                     model.add(tf.layers.dense(baseConfig));
             }
          });

          // Compile with standard optimizer for general tasks
          model.compile({ 
              loss: 'meanSquaredError', 
              optimizer: tf.train.adam(0.01) 
          });

          this.activeModel = model;
          return Ok({ message: `Custom Architecture Created: ${layersConfig.length} layers (Mish supported).` });
      } catch (e: any) {
          return Err(`Failed to create custom model: ${e.message || String(e)}`);
      }
  }

  /**
   * Trains the active model with provided data.
   */
  static async trainModel(x: number[], y: number[], epochs: number, learningRate: number = 0.01): Promise<Result<{ loss: number, epochs: number }, string>> {
     if (!this.activeModel) return Err("No model initialized. Call createDenseModel first.");

     try {
         // Re-compile if learning rate changed
         this.activeModel.compile({
             loss: 'meanSquaredError',
             optimizer: tf.train.adam(learningRate)
         });

         const xTensor = tf.tensor(x);
         const yTensor = tf.tensor(y);

         // Dynamic reshape based on model input/output shapes
         const inputShape = this.activeModel.inputs[0].shape;
         // Handle input shape logic carefully
         // Dense: [null, features]
         // LSTM: [null, steps, features]
         
         // Simple assumption: If input is 3D (LSTM), we rely on user providing flattened data that fits
         // Current limitation: This simple train function expects flattened X and tries to auto-reshape.
         // For LSTM/Sequence data, this basic reshape logic needs to be smarter or rely on 'inputShape' of layer 0.
         
         const inputLayerShape = inputShape;
         let reshapedX: tf.Tensor;
         
         if (inputLayerShape.length === 3) {
             // LSTM Case: [batch, steps, features]
             const steps = inputLayerShape[1];
             const features = inputLayerShape[2];
             if (!steps || !features) return Err("LSTM Input shape requires explicit steps and features dimensions.");
             
             const numSamples = x.length / (steps * features);
             reshapedX = xTensor.reshape([numSamples, steps, features]);
         } else {
             // Dense Case: [batch, features]
             const nFeatures = inputLayerShape[1];
             if (!nFeatures) return Err("Model input shape undefined.");
             const numSamples = x.length / nFeatures;
             reshapedX = xTensor.reshape([numSamples, nFeatures]);
         }
         
         // Similar logic for Y
         const outputShape = this.activeModel.outputs[0].shape;
         // Usually [batch, units]
         const nOutputs = outputShape[1] || 1;
         const numSamplesY = y.length / nOutputs; // Approximate check
         
         const reshapedY = yTensor.reshape([numSamplesY, nOutputs]);

         const h = await this.activeModel.fit(reshapedX, reshapedY, {
             epochs: epochs,
             shuffle: true,
             verbose: 0
         });

         xTensor.dispose();
         yTensor.dispose();
         reshapedX.dispose();
         reshapedY.dispose();

         const finalLoss = h.history.loss[h.history.loss.length - 1] as number;
         return Ok({ loss: finalLoss, epochs });

     } catch (e: any) {
         return Err(`Training failed: ${e.message || String(e)}`);
     }
  }

  /**
   * Runs inference on the active model.
   */
  static async runPrediction(input: number[]): Promise<Result<{ prediction: number[] }, string>> {
      if (!this.activeModel) return Err("No model loaded. Train or load a model first.");
      try {
          const inputShape = this.activeModel.inputs[0].shape;
          let t: tf.Tensor;

          if (inputShape.length === 3) {
              // LSTM Input: [1, steps, features]
               const steps = inputShape[1];
               const features = inputShape[2];
               if (!steps || !features) return Err("LSTM Prediction requires known input shape.");
               t = tf.tensor(input, [1, steps, features]);
          } else {
              // Dense Input: [1, features]
              const nFeatures = inputShape[1];
              if (!nFeatures) return Err("Model input shape undefined.");
              t = tf.tensor(input, [1, nFeatures]);
          }

          const pred = this.activeModel.predict(t) as tf.Tensor;
          const result = Array.from(pred.dataSync()) as number[];
          
          t.dispose();
          pred.dispose();

          return Ok({ prediction: result });
      } catch (e: any) {
          return Err(`Prediction failed: ${e.message || String(e)}`);
      }
  }

  /**
   * Stores a vector memory.
   */
  static async insertVector(text: string, vector: number[]): Promise<Result<{ id: string }, string>> {
      this.ensureDbLoaded();
      const id = Math.random().toString(36).substring(2, 10);
      this.vectorDb.push({ id, text, vector });
      this.saveDb();
      return Ok({ id });
  }

  /**
   * Searches for similar vectors using cosine similarity.
   */
  static async searchVector(vector: number[], topK: number = 3): Promise<Result<{ matches: any[] }, string>> {
      this.ensureDbLoaded();
      if (this.vectorDb.length === 0) return Err("Memory DB is empty.");

      // Compute cosine similarity for all in a single batched tensor operation
      const scores = tf.tidy(() => {
          const query = tf.tensor1d(vector);
          const dbTensors = tf.tensor2d(this.vectorDb.map(r => r.vector));

          const queryNorm = tf.norm(query);
          const dbNorms = tf.norm(dbTensors, 2, 1);

          const dotProducts = dbTensors.matMul(query.expandDims(1)).squeeze();
          const sim = tf.div(dotProducts, tf.mul(queryNorm, dbNorms));

          if (this.vectorDb.length === 1) {
              return [sim.dataSync()[0]];
          }
          return Array.from(sim.dataSync());
      });

      const matches = this.vectorDb.map((record, i) => ({
          ...record,
          score: scores[i]
      }));

      // Sort descending
      matches.sort((a, b) => b.score - a.score);
      return Ok({ matches: matches.slice(0, topK) });
  }
}
