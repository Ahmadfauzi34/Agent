
/**
 * RUST-INSPIRED SAFETY UTILITIES
 * Shared types for safe error handling across modules.
 */
export type Result<T, E = Error> = 
  | { readonly ok: true; readonly value: T; readonly error?: never }
  | { readonly ok: false; readonly error: E; readonly value?: never };

export const Ok = <T,>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E,>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * REDUX/RXJS STYLE ACTIONS
 * Strongly typed actions for the Tensor Stream.
 */
export type TFAction = 
  | { type: 'MATH'; payload: { arrayA: number[]; arrayB: number[]; operation: 'add' | 'sub' | 'mul' | 'div' | 'dot' } }
  | { type: 'COSINE'; payload: { vectorA: number[]; vectorB: number[] } }
  | { type: 'OUTLIERS'; payload: { data: number[]; threshold: number } }
  | { type: 'STATS'; payload: { data: number[] } }
  | { type: 'LOAD_MODEL'; payload: { url: string } } // Load from URL
  | { 
      type: 'CREATE_DENSE_MODEL'; 
      payload: { 
        layers: Array<{ 
          type?: 'dense' | 'flatten' | 'dropout' | 'lstm'; // Default 'dense'
          units?: number; 
          activation?: string; 
          inputShape?: number[]; 
          l1Regularization?: number;
          rate?: number; // For dropout
          returnSequences?: boolean; // For LSTM
        }> 
      } 
    }
  | { type: 'TRAIN_MODEL'; payload: { x: number[]; y: number[]; epochs: number; batchSize?: number; learningRate?: number } }
  | { type: 'PREDICT'; payload: { input: number[] } }
  | { type: 'DB_INSERT'; payload: { text: string; vector: number[] } }
  | { type: 'DB_SEARCH'; payload: { vector: number[]; topK?: number } }
  // NEW ACTIONS FOR MODEL PERSISTENCE
  | { type: 'SAVE_MODEL_LOCAL'; payload: { name: string } }
  | { type: 'LOAD_MODEL_LOCAL'; payload: { name: string } }
  | { type: 'LIST_MODELS_LOCAL'; payload: {} };
