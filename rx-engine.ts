
import { Subject, firstValueFrom, from, of, Observable, timeout } from 'rxjs';
import { filter, map, mergeMap, catchError, tap, share } from 'rxjs';
import { TensorFlowEngine } from './engine';
import { TFAction, Result, Err } from './types';

// Unique ID generator for stream correlation
const uuid = () => Math.random().toString(36).substring(2, 9);

interface StreamPacket {
  id: string;
  action: TFAction;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'ACTION' | 'RESULT' | 'ERROR';
  actionType?: string;
  message: string;
  data?: any;
}

/**
 * RXJS UTILITY: GEMINI STREAM BRIDGE
 * Converts Gemini's AsyncIterable stream into a hot RxJS Observable.
 * This allows you to treat AI tokens just like any other event in the system.
 */
export function fromGeminiStream(stream: AsyncIterable<any>): Observable<string> {
  return new Observable<string>(subscriber => {
    (async () => {
      try {
        for await (const chunk of stream) {
          // Gemini chunk.text might be undefined if it's purely a function call chunk
          const text = chunk.text; 
          if (text) {
            subscriber.next(text);
          }
        }
        subscriber.complete();
      } catch (err) {
        subscriber.error(err);
      }
    })();
  });
}

class RxTensorFlowBridge {
  private _actionSubject = new Subject<StreamPacket>();
  public readonly logSubject = new Subject<LogEntry>();
  
  public readonly resultStream$ = this._actionSubject.pipe(
    // Log Action Dispatch
    tap(packet => {
      this.logSubject.next({
        id: packet.id,
        timestamp: Date.now(),
        type: 'ACTION',
        actionType: packet.action.type,
        message: `Dispatching ${packet.action.type}`,
        data: packet.action.payload
      });
      console.log(`[RxJS] Processing Action: ${packet.action.type}`, packet);
    }),
    mergeMap(packet => {
      // Execute the action (async)
      return from(this._execute(packet.action)).pipe(
        // Pass actionType through the pipe for the next logger
        map(result => ({ id: packet.id, result, actionType: packet.action.type })),
        catchError(err => of({ 
          id: packet.id, 
          result: Err(`Stream Error: ${String(err)}`),
          actionType: packet.action.type
        }))
      );
    }),
    // Log Result/Error
    tap(packet => {
       this.logSubject.next({
         id: packet.id,
         timestamp: Date.now(),
         type: packet.result.ok ? 'RESULT' : 'ERROR',
         actionType: packet.actionType,
         message: packet.result.ok ? `Success: ${packet.actionType}` : `Failed: ${packet.actionType}`,
         data: packet.result.ok ? packet.result.value : packet.result.error
       });
    }),
    share()
  );

  constructor() {
    this.resultStream$.subscribe(); 
  }

  public async dispatch(action: TFAction): Promise<Result<any, string>> {
    const id = uuid();
    
    // We create the promise BEFORE emitting to ensure we don't miss the result
    // Added 20s timeout to prevent hanging forever if TFJS freezes
    const resultPromise = firstValueFrom(
      this.resultStream$.pipe(
        filter(packet => packet.id === id),
        map(packet => packet.result),
        timeout({ 
            first: 20000, 
            with: () => of(Err("Timeout: TensorFlow Engine took too long to respond.")) 
        }) 
      )
    );

    this._actionSubject.next({ id, action });
    return resultPromise;
  }

  private async _execute(action: TFAction): Promise<Result<any, string>> {
    try {
        switch (action.type) {
        case 'MATH':
            return TensorFlowEngine.performTensorMath(action.payload.arrayA, action.payload.arrayB, action.payload.operation);
        case 'COSINE':
            return TensorFlowEngine.cosineSimilarity(action.payload.vectorA, action.payload.vectorB);
        case 'OUTLIERS':
            return TensorFlowEngine.detectOutliers(action.payload.data, action.payload.threshold);
        case 'STATS':
            return TensorFlowEngine.computeStatistics(action.payload.data);
        case 'LOAD_MODEL':
            return TensorFlowEngine.loadModel(action.payload.url);
        case 'CREATE_DENSE_MODEL':
            return TensorFlowEngine.createDenseModel(action.payload.layers);
        case 'TRAIN_MODEL':
            return TensorFlowEngine.trainModel(action.payload.x, action.payload.y, action.payload.epochs, action.payload.learningRate);
        case 'PREDICT':
            return TensorFlowEngine.runPrediction(action.payload.input);
        case 'DB_INSERT':
            return TensorFlowEngine.insertVector(action.payload.text, action.payload.vector);
        case 'DB_SEARCH':
            return TensorFlowEngine.searchVector(action.payload.vector, action.payload.topK);
        case 'SAVE_MODEL_LOCAL':
            return TensorFlowEngine.saveModelLocal(action.payload.name);
        case 'LOAD_MODEL_LOCAL':
            return TensorFlowEngine.loadLocalModel(action.payload.name);
        case 'LIST_MODELS_LOCAL':
            return TensorFlowEngine.listLocalModels();
        default:
            return Err("Unknown Action Type in Stream");
        }
    } catch (e) {
        return Err(`Engine Execution Crash: ${String(e)}`);
    }
  }
}

export const tfStream = new RxTensorFlowBridge();
