
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';
import { tfStream, LogEntry } from './rx-engine';
import { TF_TOOLS } from './tools';
import { TensorSimulation, SimulationType } from './simulation';
import { runARCAgent } from './src/arc-agent';

// More robust message type allowing structured content (Parts)
interface Message {
  role: 'user' | 'model' | 'system';
  content: string | any[]; 
  isToolCall?: boolean;
}

const MODELS = [
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Deep Research)' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Fast)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-flash-latest', name: 'Gemini Flash (Stable)' },
];

const SYSTEM_INSTRUCTION = `
You are Sentinel Core v5.0, an expert Machine Learning Engineer.
You have access to a local TensorFlow.js environment via function calling (tools).

**CRITICAL PROTOCOL FOR TOOL USE:**
1. **Separation of Concerns**: 
   - If the user provides code snippets for review, debugging, or explanation, **DO NOT** execute them using 'performTensorMath' or 'createDenseModel'. Just analyze the text.
   - Only execute tools when the user asks you to PERFORM an action (e.g., "Run this math", "Train a model", "Memorize this").
2. **Environment Awareness**:
   - The user knows you are an AI. Do not simulate a fake environment. 
   - You actually HAVE these tools available. Use them when requested to perform real computation.

**MEMORY & HISTORY**:
- Use 'storeMemory' and 'recallMemory' for long-term facts.

**TF.JS CAPABILITIES**:
- Math: performTensorMath, cosineSimilarity, computeStatistics
- Data: detectOutliers
- Modeling: createDenseModel (layers: dense, flatten, dropout, lstm), trainModel, runPrediction
- Persistence: saveModel, loadLocalModel, listLocalModels
- **Tensor Calculus Lab**: configureSimulation (Run zero-parameter PDE simulations like 'reaction-diffusion' or 'wave-equation' directly on the GPU). Use this for creative research and generative art!
- **ARC Agent Research**: runARCAgent (Menjalankan simulasi agent FFT untuk menyelesaikan soal ARC). Gunakan ini jika user meminta riset ARC.
`;

const App = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'Sentinel Core v5.0 initialized. \nArchitecture: Dynamic Neural Networks enabled. \nStrategy: Deep Chain-of-Thought.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [activeTab, setActiveTab] = useState<'chat' | 'logs' | 'simulation' | 'arc'>('chat');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [simType, setSimType] = useState<SimulationType>('reaction-diffusion');
  const [simParams, setSimParams] = useState<any>({});
  const [arcLogs, setArcLogs] = useState<string>("");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);
  const arcLogScrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<TensorSimulation | null>(null);
  const animFrameRef = useRef<number>(0);

  // ... (useEffect hooks)

  const handleRunARC = async () => {
      setArcLogs("Running ARC Agent...");
      // Allow UI to update before running heavy task
      setTimeout(() => {
          const result = runARCAgent();
          setArcLogs(result);
      }, 100);
  };

  useEffect(() => {
    if (!simRef.current) {
      simRef.current = new TensorSimulation(256, 256);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'simulation' && simRef.current && canvasRef.current) {
      const renderLoop = async () => {
        simRef.current!.step(simType, simParams);
        await simRef.current!.renderToCanvas(canvasRef.current!, simType);
        animFrameRef.current = requestAnimationFrame(renderLoop);
      };
      animFrameRef.current = requestAnimationFrame(renderLoop);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeTab, simType, simParams]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !simRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    simRef.current.addDrop(x, y, 10, simType);
  };

  useEffect(() => {
    if (activeTab === 'chat') {
        scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [messages, activeTab]);

  useEffect(() => {
    if (activeTab === 'logs') {
        logScrollRef.current?.scrollTo(0, logScrollRef.current.scrollHeight);
    }
  }, [logs, activeTab]);

  useEffect(() => {
      const sub = tfStream.logSubject.subscribe(entry => {
          setLogs(prev => [...prev, entry]);
      });
      return () => sub.unsubscribe();
  }, []);

  const getEmbedding = async (text: string): Promise<number[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const embeddingModels = ['text-embedding-004', 'text-embedding-004'];
    
    for (const model of embeddingModels) {
        try {
            const result = await ai.models.embedContent({ model, contents: text });
            if (result.embeddings?.[0]?.values) return result.embeddings[0].values;
        } catch (e: any) {
            console.warn(`Embedding failed for ${model}:`, e.message);
            if (model === embeddingModels[embeddingModels.length - 1]) throw e;
        }
    }
    throw new Error("Failed to generate embedding.");
  };

  const handleToolCall = async (fc: any): Promise<any> => {
    try {
        let result;
        const args = fc.args || {};

        if (fc.name === 'performTensorMath') {
            result = await tfStream.dispatch({ type: 'MATH', payload: args });
        } else if (fc.name === 'cosineSimilarity') {
            result = await tfStream.dispatch({ type: 'COSINE', payload: args });
        } else if (fc.name === 'detectOutliers') {
            result = await tfStream.dispatch({ type: 'OUTLIERS', payload: args });
        } else if (fc.name === 'computeStatistics') {
            result = await tfStream.dispatch({ type: 'STATS', payload: args });
        } else if (fc.name === 'createDenseModel') {
            result = await tfStream.dispatch({ type: 'CREATE_DENSE_MODEL', payload: { layers: args.layers } });
        } else if (fc.name === 'trainModel') {
            result = await tfStream.dispatch({ type: 'TRAIN_MODEL', payload: { x: args.x, y: args.y, epochs: args.epochs, learningRate: args.learningRate } });
        } else if (fc.name === 'runPrediction') {
            result = await tfStream.dispatch({ type: 'PREDICT', payload: { input: args.input } });
        } else if (fc.name === 'storeMemory') {
            try {
                const vector = await getEmbedding(args.text);
                result = await tfStream.dispatch({ type: 'DB_INSERT', payload: { text: args.text, vector } });
            } catch (e: any) {
                return { error: `Memory Store Failed: ${e.message}` };
            }
        } else if (fc.name === 'recallMemory') {
            try {
                const vector = await getEmbedding(args.query);
                result = await tfStream.dispatch({ type: 'DB_SEARCH', payload: { vector, topK: 3 } });
            } catch (e: any) {
                return { error: `Memory Recall Failed: ${e.message}` };
            }
        } else if (fc.name === 'saveModel') {
            result = await tfStream.dispatch({ type: 'SAVE_MODEL_LOCAL', payload: { name: args.name } });
        } else if (fc.name === 'loadLocalModel') {
            result = await tfStream.dispatch({ type: 'LOAD_MODEL_LOCAL', payload: { name: args.name } });
        } else if (fc.name === 'listLocalModels') {
            result = await tfStream.dispatch({ type: 'LIST_MODELS_LOCAL', payload: {} });
        } else if (fc.name === 'configureSimulation') {
            setSimType(args.type);
            setSimParams(args.params || {});
            if (simRef.current) simRef.current.reset(args.type);
            setActiveTab('simulation');
            result = { success: true, message: `Simulation ${args.type} started with params: ${JSON.stringify(args.params)}` };
        } else if (fc.name === 'runARCAgent') {
            const logs = runARCAgent();
            result = { success: true, logs };
        } else {
            return { error: `Unknown function: ${fc.name}` };
        }

        if (result.ok === false) {
            return { error: result.error };
        }
        return result.value;
    } catch (e: any) {
        return { error: `System Crash in handleToolCall: ${e.message}` };
    }
  };

  const processResponseStream = async (ai: GoogleGenAI, currentHistory: Message[], newModelMsg: Message): Promise<void> => {
     try {
         const isPro = selectedModel.includes('pro');
         
         const streamResult = await ai.models.generateContentStream({
            model: selectedModel,
            contents: currentHistory.map(m => ({
                role: m.role === 'system' ? 'user' : (m.role as any),
                parts: Array.isArray(m.content) ? m.content : [{ text: m.content }]
            })),
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                tools: [{ functionDeclarations: TF_TOOLS as any }]
            }
         });

         let accumulatedText = "";
         let allFunctionCalls: any[] = [];
         let allParts: any[] = [];
         let lastChunk: any = null;
         
         for await (const chunk of streamResult) {
             lastChunk = chunk;
             if (chunk.candidates?.[0]?.content?.parts) {
                 allParts.push(...chunk.candidates[0].content.parts);
             }
             if (chunk.text) {
                 accumulatedText += chunk.text;
                 setMessages(prev => {
                     const updated = [...prev];
                     updated[updated.length - 1] = { 
                         ...updated[updated.length - 1], 
                         content: accumulatedText 
                     };
                     return updated;
                 });
             }
             if (chunk.functionCalls) {
                 allFunctionCalls.push(...chunk.functionCalls);
             }
         }

         if (!lastChunk) {
             throw new Error("Empty response from AI service.");
         }

         const calls = allFunctionCalls;

         if (calls && calls.length > 0) {
             // Indicate processing state
             setMessages(prev => {
                 const updated = [...prev];
                 updated[updated.length - 1] = { 
                     ...updated[updated.length - 1], 
                     content: accumulatedText || "⚙️ Executing Neural Operations..." 
                 };
                 return updated;
             });

             // Execute tools
             const toolResponses = await Promise.all(calls.map(async (fc) => {
                 const result = await handleToolCall(fc);
                 // IMPORTANT: response must be an object/map for Gemini API
                 return { 
                     functionResponse: { 
                         name: fc.name, 
                         response: typeof result === 'object' ? result : { result } 
                     } 
                 };
             }));

             // Construct valid history for the next turn
             // 1. The model's turn that requested the tool (must contain the functionCall parts)
             // We use the exact parts returned by the model to preserve thought signatures
             const modelToolCallMsg: Message = { 
                 role: 'model', 
                 content: allParts,
                 isToolCall: true
             };

             // 2. The user's turn containing the tool results
             const toolResponseMsg: Message = {
                 role: 'user', // API often treats tool responses as 'user' or 'function' role
                 content: toolResponses,
                 isToolCall: true
             };

             const nextHistory = [...currentHistory, modelToolCallMsg, toolResponseMsg];

             // Create placeholder for the FOLLOW-UP text response
             const nextResponseMsg: Message = { role: 'model', content: '' };
             
             setMessages(prev => [
                 ...prev.slice(0, -1), // Remove temporary placeholder
                 { ...modelToolCallMsg, content: accumulatedText || "✅ Computations Complete." }, // Show partial text or status
                 nextResponseMsg
             ]);

             // Recursive call to generate text answer based on tool results
             await processResponseStream(ai, nextHistory, nextResponseMsg);
         }

     } catch (e: any) {
         console.error("Stream Error:", e);
         setMessages(prev => {
             const last = prev[prev.length - 1];
             if (last.role === 'model' && !last.content) {
                 return [...prev.slice(0, -1), { role: 'system', content: `⚠️ System Error: ${e.message}` }];
             }
             return [...prev, { role: 'system', content: `⚠️ System Error: ${e.message}` }];
         });
     }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input };
    const initialModelMsg: Message = { role: 'model', content: '' };
    
    setMessages(prev => [...prev, userMsg, initialModelMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Pass history excluding the placeholder model msg
      await processResponseStream(ai, [...messages, userMsg], initialModelMsg);
    } catch (error: any) {
         console.error("Top Level Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#020617] p-4 md:p-8">
      <header className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
              </div>
              <div>
                  <h1 className="text-xl font-bold tracking-tight glow-text uppercase">Sentinel Core v5.0</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 mono">MODE:</span>
                    <select 
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="bg-transparent text-[10px] font-bold text-indigo-400 border-none outline-none cursor-pointer hover:text-indigo-300 uppercase tracking-widest p-0 m-0"
                    >
                      {MODELS.map(m => (
                        <option key={m.id} value={m.id} className="bg-[#0f172a] text-slate-300">
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${selectedModel.includes('flash') ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
              <span className={`text-xs mono uppercase tracking-widest ${selectedModel.includes('flash') ? 'text-amber-500' : 'text-rose-500'}`}>
                {selectedModel.includes('flash') ? 'Fast' : 'MAX REASONING'}
              </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg w-fit border border-slate-800">
            <button 
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-widest transition-all ${activeTab === 'chat' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
            >
                CHAT INTERFACE
            </button>
            <button 
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-widest transition-all flex items-center gap-2 ${activeTab === 'logs' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
            >
                SYSTEM LOGS
                {logs.length > 0 && <span className="bg-slate-800 text-[9px] px-1.5 rounded-full border border-slate-600">{logs.length}</span>}
            </button>
            <button 
                onClick={() => setActiveTab('simulation')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-widest transition-all ${activeTab === 'simulation' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
            >
                TENSOR LAB
            </button>
            <button 
                onClick={() => setActiveTab('arc')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-widest transition-all ${activeTab === 'arc' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
            >
                ARC LAB
            </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col glass rounded-2xl shadow-2xl relative border-slate-800">
        
        {/* CHAT VIEW */}
        <div className={`flex-1 overflow-y-auto p-6 space-y-4 scroll-hide ${activeTab === 'chat' ? 'block' : 'hidden'}`} ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl p-4 ${
                m.role === 'user' 
                  ? 'bg-cyan-600/20 border border-cyan-500/30 text-cyan-50 shadow-lg' 
                  : m.role === 'system'
                  ? 'bg-slate-800/40 border border-slate-700/50 text-slate-500 mono text-[10px]'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-200'
              }`}>
                <div className="whitespace-pre-wrap leading-relaxed">
                    {typeof m.content === 'string' 
                        ? m.content 
                        : (m.isToolCall 
                            ? '⚙️ Executing Logic Chain...' 
                            : JSON.stringify(m.content)
                        )
                    }
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex gap-2 items-center">
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s] ${selectedModel.includes('flash') ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></div>
                <span className="text-xs text-slate-500 ml-2 mono animate-pulse">Stream Active via RxJS...</span>
              </div>
            </div>
          )}
        </div>

        {/* LOGS VIEW */}
        <div className={`flex-1 overflow-y-auto bg-[#0a0f1e] p-4 scroll-hide ${activeTab === 'logs' ? 'block' : 'hidden'}`} ref={logScrollRef}>
            <div className="font-mono text-xs space-y-1">
                {logs.length === 0 && <div className="text-slate-600 italic">No system logs recorded yet...</div>}
                {logs.map((log) => (
                    <div key={log.id + log.timestamp} className="border-l-2 border-slate-800 pl-3 py-1 hover:bg-slate-900/50 transition-colors group">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-slate-600">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 2 } as any)}</span>
                            <span className={`px-1.5 rounded text-[9px] font-bold tracking-wider ${
                                log.type === 'ACTION' ? 'bg-blue-900/30 text-blue-400' :
                                log.type === 'RESULT' ? 'bg-emerald-900/30 text-emerald-400' :
                                'bg-red-900/30 text-red-400'
                            }`}>{log.type}</span>
                            <span className="text-slate-300 font-bold">{log.actionType}</span>
                        </div>
                        <div className="text-slate-400 mb-1">{log.message}</div>
                        {log.data && (
                            <pre className="bg-black/30 text-slate-500 p-2 rounded overflow-x-auto text-[10px] group-hover:text-slate-400 transition-colors">
                                {JSON.stringify(log.data, null, 2)}
                            </pre>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* SIMULATION VIEW */}
        <div className={`flex-1 overflow-hidden bg-black flex flex-col items-center justify-center relative ${activeTab === 'simulation' ? 'flex' : 'hidden'}`}>
            {/* ... simulation content ... */}
            <canvas 
                ref={canvasRef} 
                width={256} 
                height={256} 
                onClick={handleCanvasClick}
                className="w-full h-full object-contain cursor-crosshair"
                style={{ imageRendering: 'pixelated' }}
            />
        </div>

        {/* ARC LAB VIEW */}
        <div className={`flex-1 overflow-y-auto bg-[#0a0f1e] p-4 scroll-hide ${activeTab === 'arc' ? 'block' : 'hidden'}`} ref={arcLogScrollRef}>
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <div>
                        <h2 className="text-lg font-bold text-emerald-400 glow-text">ARC AGENT CONTROL</h2>
                        <p className="text-xs text-slate-500 mono">Multi-Level Reasoning System (PDR + VSA + Logic)</p>
                    </div>
                    <button 
                        onClick={handleRunARC}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg active:scale-95 transition-all mono text-xs tracking-widest"
                    >
                        RUN AGENT
                    </button>
                </div>

                {/* VISUALIZATION DASHBOARD */}
                <div id="mri-dashboard-react" className="bg-black border border-slate-800 rounded-xl p-4 font-mono text-xs">
                    <h3 className="text-emerald-500 mb-2 border-b border-emerald-900/50 pb-1">🧠 PDR LIVE DIAGNOSTIC</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-slate-400 mb-1">Spatial Signal (Primal Y)</p>
                            <canvas id="spatial-canvas" width="400" height="100" className="w-full h-24 bg-slate-900 border border-slate-700 rounded"></canvas>
                        </div>
                        <div>
                            <p className="text-slate-400 mb-1">Spectral Spectrum (Dual Z)</p>
                            <canvas id="spectral-canvas" width="400" height="100" className="w-full h-24 bg-slate-900 border border-slate-700 rounded"></canvas>
                        </div>
                    </div>

                    <div className="flex gap-4 text-[10px] text-slate-500 border-t border-slate-800 pt-2">
                        <div>STATUS: <span id="gate-status" className="font-bold">--</span></div>
                        <div>Freq PMR: <span id="freq-pmr" className="font-bold text-slate-300">0.00</span></div>
                        <div>Spat PMR: <span id="spat-pmr" className="font-bold text-slate-300">0.00</span></div>
                    </div>
                </div>

                {/* LOGS OUTPUT */}
                <div className="bg-black/50 border border-slate-800 rounded-xl p-4 font-mono text-[10px] text-slate-400 whitespace-pre-wrap overflow-x-auto">
                    {arcLogs || "Ready to initialize..."}
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Deep analysis or build custom Neural Network..."
              className={`flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all mono text-sm ${selectedModel.includes('flash') ? 'focus:ring-amber-500/40' : 'focus:ring-rose-500/40'}`}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className={`disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2 ${selectedModel.includes('flash') ? 'bg-amber-600 hover:bg-amber-500' : 'bg-rose-700 hover:bg-rose-600'}`}
            >
              <span className="hidden md:inline">ENGAGE</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            </button>
          </div>
          <div className="mt-2 flex gap-4 overflow-x-auto py-1 scroll-hide">
             <button onClick={() => setInput("Simpan histori chat ini ke memori")} className={`text-[10px] px-2 py-1 rounded border border-slate-800 text-slate-500 transition-colors whitespace-nowrap mono uppercase ${selectedModel.includes('flash') ? 'hover:border-amber-500 hover:text-amber-400' : 'hover:border-rose-500 hover:text-rose-400'}`}>Simpan Memori</button>
             <button onClick={() => setInput("Apa yang kita bahas terakhir kali?")} className={`text-[10px] px-2 py-1 rounded border border-slate-800 text-slate-500 transition-colors whitespace-nowrap mono uppercase ${selectedModel.includes('flash') ? 'hover:border-amber-500 hover:text-amber-400' : 'hover:border-rose-500 hover:text-rose-400'}`}>Recall Memory</button>
          </div>
        </div>
      </main>

      <footer className="mt-4 flex justify-between items-center text-[10px] text-slate-600 mono uppercase tracking-widest px-2">
        <div>Sentinel Core v5.0 // DEEP RESEARCH ENABLED</div>
        <div className="hidden md:block">TF.js + RxJS + {selectedModel}</div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
