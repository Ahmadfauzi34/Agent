
import { Type } from '@google/genai';

/**
 * AI SERVICE CONFIGURATION
 * Definition of tools available to the LLM.
 */
export const TF_TOOLS = [
  {
    name: 'performTensorMath',
    description: 'Melakukan operasi matematika element-wise atau dot product pada dua array.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        arrayA: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: 'Vektor A.' },
        arrayB: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: 'Vektor B.' },
        operation: { 
          type: Type.STRING, 
          enum: ['add', 'sub', 'mul', 'div', 'dot'],
          description: 'Operasi: add, sub, mul, div, atau dot (perkalian titik).' 
        }
      },
      required: ['arrayA', 'arrayB', 'operation']
    }
  },
  {
    name: 'cosineSimilarity',
    description: 'Menghitung tingkat kemiripan (similarity) antara dua vektor data.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        vectorA: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: 'Vektor pertama.' },
        vectorB: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: 'Vektor kedua.' }
      },
      required: ['vectorA', 'vectorB']
    }
  },
  {
    name: 'detectOutliers',
    description: 'Mendeteksi anomali (outlier) dalam data numerik menggunakan analisis Z-Score.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        data: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: 'Data numerik untuk di-scan.' },
        threshold: { type: Type.NUMBER, description: 'Ambang batas sensitivitas (default 2). Semakin kecil semakin sensitif.' }
      },
      required: ['data']
    }
  },
  {
    name: 'computeStatistics',
    description: 'Calculates mean, standard deviation, minimum, and maximum of a numeric array using TensorFlow.js.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        data: {
          type: Type.ARRAY,
          items: { type: Type.NUMBER },
          description: 'The list of numbers to analyze.'
        }
      },
      required: ['data']
    }
  },
  {
    name: 'createDenseModel',
    description: 'ADVANCED: Defines a custom Neural Network architecture. Supports Dense, Flatten, Dropout, and LSTM layers.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        layers: {
          type: Type.ARRAY,
          description: 'List of layer definitions.',
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ['dense', 'flatten', 'dropout', 'lstm'], description: 'Layer type. Default: dense.' },
              units: { type: Type.NUMBER, description: 'Number of neurons/units (Required for Dense/LSTM).' },
              activation: { type: Type.STRING, description: 'Activation function (relu, sigmoid, tanh, softmax, mish). For Dense layers.' },
              inputShape: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: 'Required ONLY for the first layer.' },
              l1Regularization: { type: Type.NUMBER, description: 'Optional: L1 Regularization factor (e.g. 0.01) for Dense layers.' },
              rate: { type: Type.NUMBER, description: 'Dropout rate (0.0 - 1.0). Required for Dropout layer.' },
              returnSequences: { type: Type.BOOLEAN, description: 'For LSTM: Whether to return the full sequence. True if feeding into another LSTM.' }
            },
            required: [] // Units is conditionally required, but we'll let the logic handle validation
          }
        }
      },
      required: ['layers']
    }
  },
  {
    name: 'trainModel',
    description: 'Trains the currently loaded/created model with provided data.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: 'Flattened input data (training features).' },
        y: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: 'Flattened target data (labels/values).' },
        epochs: { type: Type.NUMBER, description: 'Number of training iterations (recommend 50-500 depending on complexity).' },
        learningRate: { type: Type.NUMBER, description: 'Optimizer learning rate (default 0.01).' }
      },
      required: ['x', 'y', 'epochs']
    }
  },
  {
    name: 'runPrediction',
    description: 'Runs inference (prediction) on the currently loaded model with the given input data.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        input: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: 'Input data vector for the model.' }
      },
      required: ['input']
    }
  },
  {
    name: 'saveModel',
    description: 'Saves the CURRENTLY trained TensorFlow model to Browser LocalStorage. Call this after training is complete so the model persists.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'A unique name for the model (e.g. "xor_model_v1").' }
      },
      required: ['name']
    }
  },
  {
    name: 'loadLocalModel',
    description: 'Loads a previously saved model from Browser LocalStorage into active memory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'The name of the model to load.' }
      },
      required: ['name']
    }
  },
  {
    name: 'listLocalModels',
    description: 'Lists all TensorFlow models currently saved in Browser LocalStorage.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  },
  {
    name: 'storeMemory',
    description: 'Stores text summaries, facts, or conversation history into the Vector Database (LanceDB simulation) for long-term retrieval.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: 'The text, summary, or fact to be stored.' }
      },
      required: ['text']
    }
  },
  {
    name: 'recallMemory',
    description: 'Searches the Vector Database (LanceDB) for relevant context using semantic search.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'The search query or concept to find.' }
      },
      required: ['query']
    }
  },
  {
    name: 'configureSimulation',
    description: 'Mengkonfigurasi dan menjalankan simulasi kalkulus tensor nol-parameter (Reaction-Diffusion atau Wave Equation).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: { 
          type: Type.STRING, 
          enum: ['reaction-diffusion', 'wave-equation'],
          description: 'Jenis simulasi kalkulus tensor.' 
        },
        params: {
          type: Type.OBJECT,
          description: 'Parameter persamaan diferensial. Untuk reaction-diffusion: f (feed), k (kill), da, db. Untuk wave-equation: damping, c (wave speed).',
          properties: {
              f: { type: Type.NUMBER },
              k: { type: Type.NUMBER },
              da: { type: Type.NUMBER },
              db: { type: Type.NUMBER },
              damping: { type: Type.NUMBER },
              c: { type: Type.NUMBER }
          }
        }
      },
      required: ['type']
    }
  },
  {
    name: 'runARCAgent',
    description: 'Menjalankan agen ARC (Abstraction and Reasoning Corpus) berbasis FFT (Holographic Reduced Representations) pada database soal ARC.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  }
];
