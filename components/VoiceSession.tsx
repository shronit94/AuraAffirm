
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { getSystemInstruction, COMPLETE_SESSION_TOOL, TRANSLATIONS } from '../constants';
import { decode, decodeAudioData, createPcmBlob } from '../utils/audioUtils';
import PulseCircle from './PulseCircle';

interface VoiceSessionProps {
  onClose: () => void;
  onFinish: (quote: string, theme: string) => void;
  isFirstTime: boolean;
}

interface Message {
  id: string;
  role: 'aura' | 'user';
  text: string;
}

const VoiceSession: React.FC<VoiceSessionProps> = ({ onClose, onFinish, isFirstTime }) => {
  const [status, setStatus] = useState<'connecting' | 'active' | 'error'>('connecting');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(msg);
    setDebugLogs(prev => [...prev.slice(-4), msg]); // Keep last 5 logs
  };

  const [pendingFinishData, setPendingFinishData] = useState<{ quote: string, theme: string } | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const pendingModelTextRef = useRef<string>('');
  const transcriptionTimersRef = useRef<number[]>([]);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  const shouldStartNewMessageRef = useRef<boolean>(true);
  const currentAuraMessageIdRef = useRef<string | null>(null);

  const t = TRANSLATIONS;

  const scrollToBottom = useCallback(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle session completion: wait for tool call AND audio to finish
  useEffect(() => {
    if (pendingFinishData && !isSpeaking) {
      const finalTimer = setTimeout(() => {
        onFinish(pendingFinishData.quote, pendingFinishData.theme);
      }, 1500);
      return () => clearTimeout(finalTimer);
    }
  }, [pendingFinishData, isSpeaking, onFinish]);

  const cleanupTimers = useCallback(() => {
    transcriptionTimersRef.current.forEach(timer => window.clearTimeout(timer));
    transcriptionTimersRef.current = [];
  }, []);

  const renderMessageContent = (text: string) => {
    const parts = text.split(/(\[MANTRA\].*?\[\/MANTRA\]|\[MANTRA\].*?$)/gs);

    return parts.map((part, i) => {
      if (part.startsWith('[MANTRA]')) {
        const mantraText = part.replace(/\[MANTRA\]/g, '').replace(/\[\/MANTRA\]/g, '');
        if (!mantraText.trim()) return null;

        return (
          <span
            key={i}
            className="block my-6 font-sans font-black uppercase tracking-[0.15em] text-rose-600 text-3xl not-italic leading-tight border-l-4 border-rose-200 pl-6 py-2 animate-in fade-in slide-in-from-left-2 duration-700"
          >
            {mantraText}
          </span>
        );
      }

      const cleanPart = part.replace(/\[MANTRA\]/g, '').replace(/\[\/MANTRA\]/g, '');
      if (!cleanPart.trim()) return null;

      return <span key={i}>{cleanPart}</span>;
    });
  };

  const cleanup = useCallback(() => {
    cleanupTimers();
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { }
    });
    sourcesRef.current.clear();
  }, [cleanupTimers]);

  useEffect(() => {
    const startSession = async () => {
      try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API Key missing.");

        const ai = new GoogleGenAI({ apiKey });

        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        sessionPromiseRef.current = ai.live.connect({
          model: 'gemini-2.0-flash-exp',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            systemInstruction: getSystemInstruction(isFirstTime),
            tools: [{ functionDeclarations: [COMPLETE_SESSION_TOOL] }],
            // inputAudioTranscription disabled: we only want Aura's speech displayed
            outputAudioTranscription: { model: "gemini-2.0-flash-exp" },
          },
          callbacks: {
            onopen: async () => {
              addLog("WebSocket connected via SDK!");
              // Ensure contexts are resumed
              try {
                if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();
                if (outputAudioContextRef.current?.state === 'suspended') await outputAudioContextRef.current.resume();
                addLog("AudioContexts resumed.");
              } catch (e) {
                addLog(`Resume error: ${e}`);
              }
              setStatus('active');
              const source = audioContextRef.current!.createMediaStreamSource(stream);
              const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
              addLog("Audio pipeline created.");

              let chunkCount = 0;
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);

                chunkCount++;
                if (chunkCount % 100 === 0) addLog(`Processed ${chunkCount} audio chunks...`);

                sessionPromiseRef.current?.then((session) => {
                  if (session) {
                    session.sendRealtimeInput({ media: { mimeType: "audio/pcm;rate=16000", data: pcmBlob.data } });
                  }
                });
              };

              source.connect(scriptProcessor);
              scriptProcessor.connect(audioContextRef.current!.destination);

              // Trigger initial greeting - wait slightly for audio path to be 100% stable
              setTimeout(() => {
                sessionPromiseRef.current?.then((session) => {
                  try {
                    addLog("Sending initial greeting turns...");
                    session.sendClientContent({
                      turns: [{ role: 'user', parts: [{ text: "The user has joined. Please greet them according to your instructions." }] }],
                      turnComplete: true
                    });
                    addLog("Greeting sent!");
                  } catch (e) {
                    addLog(`Failed to send greeting: ${e}`);
                  }
                });
              }, 1000);
            },
            onmessage: async (message: LiveServerMessage) => {
              const ctx = outputAudioContextRef.current!;

              if (message.toolCall) {
                addLog(`Received tool call: ${JSON.stringify(message.toolCall)}`);
                for (const fc of message.toolCall.functionCalls) {
                  if (fc.name === 'completeSession') {
                    const args = fc.args as { quote: string, theme: string };
                    setPendingFinishData(args);
                    sessionPromiseRef.current?.then(s => s.sendToolResponse({
                      functionResponses: [{ id: fc.id, name: fc.name, response: { result: "ok" } }]
                    }));
                  }
                }
              }

              if (message.serverContent) {
                if (message.serverContent.turnComplete) {
                  addLog("Turn complete received.");
                  shouldStartNewMessageRef.current = true;
                  currentAuraMessageIdRef.current = null;
                }
                if (message.serverContent.interrupted) {
                  addLog("Interruption received.");
                }
              }

              // Handle Aura's speech transcription
              if (message.serverContent?.outputTranscription) {
                pendingModelTextRef.current += message.serverContent.outputTranscription.text;
              }

              // Audio Playback
              const parts = message.serverContent?.modelTurn?.parts || [];
              if (parts.length > 0) addLog(`Received ${parts.length} parts in model turn.`);

              for (const part of parts) {
                const audioData = part.inlineData?.data;
                if (audioData) {
                  addLog(`Received audio data chunk (${audioData.length} chars)`);
                  setIsSpeaking(true);
                  const scheduledTime = Math.max(nextStartTimeRef.current, ctx.currentTime);

                  try {
                    const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                    const source = ctx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(ctx.destination);

                    const textSnapshot = pendingModelTextRef.current;
                    pendingModelTextRef.current = '';

                    const delayMs = (scheduledTime - ctx.currentTime) * 1000;
                    const timerId = window.setTimeout(() => {
                      if (textSnapshot.trim()) {
                        if (shouldStartNewMessageRef.current || !currentAuraMessageIdRef.current) {
                          const newId = Math.random().toString(36);
                          currentAuraMessageIdRef.current = newId;
                          shouldStartNewMessageRef.current = false;
                          setMessages(prev => [...prev, { id: newId, role: 'aura', text: textSnapshot }]);
                        } else {
                          setMessages(prev => {
                            const lastIndex = prev.findIndex(m => m.id === currentAuraMessageIdRef.current);
                            if (lastIndex !== -1) {
                              const updated = [...prev];
                              const existing = updated[lastIndex];
                              updated[lastIndex] = { ...existing, text: existing.text + " " + textSnapshot };
                              return updated;
                            }
                            return [...prev, { id: currentAuraMessageIdRef.current!, role: 'aura', text: textSnapshot }];
                          });
                        }
                      }
                    }, Math.max(0, delayMs));
                    transcriptionTimersRef.current.push(timerId);

                    source.addEventListener('ended', () => {
                      sourcesRef.current.delete(source);
                      if (sourcesRef.current.size === 0) {
                        setIsSpeaking(false);
                      }
                    });

                    source.start(scheduledTime);
                    nextStartTimeRef.current = scheduledTime + buffer.duration;
                    sourcesRef.current.add(source);
                  } catch (err) {
                    addLog(`Audio playback error: ${err}`);
                    console.error("Audio playback error:", err);
                  }
                }
              }

              // Handle interruptions (Aura stops speaking when user speaks)
              if (message.serverContent?.interrupted) {
                for (const s of sourcesRef.current) {
                  try { s.stop(); } catch (e) { }
                }
                sourcesRef.current.clear();
                setIsSpeaking(false);
                nextStartTimeRef.current = 0;
              }
            },
            onerror: (e) => {
              addLog(`Session error: ${e.message || e}`);
              setStatus('error');
              setErrorMessage('Connection lost. Please try reconnecting.');
            },
          }
        });
      } catch (err: any) {
        addLog(`Setup error: ${err.message}`);
        setStatus('error');
        setErrorMessage(err.message);
      }
    };

    startSession();
    return () => cleanup();
  }, [cleanup, isFirstTime]);

  if (status === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-rose-50/95 backdrop-blur-2xl">
        <p className="text-rose-900 font-medium bg-white/50 px-8 py-4 rounded-3xl border border-rose-100 text-center max-w-xs shadow-sm">
          {errorMessage}
        </p>
        <button onClick={onClose} className="mt-8 px-8 py-3 bg-rose-500 text-white rounded-full font-bold shadow-lg shadow-rose-200">Return</button>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-4 md:p-6 bg-rose-50/95 backdrop-blur-2xl text-left ltr`}>
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full bg-white/50 hover:bg-white text-rose-500 transition-all z-50 shadow-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="max-w-2xl w-full flex flex-col h-full space-y-6 pt-12 pb-6">
        <header className="text-center space-y-2 flex-shrink-0">
          <h2 className="text-3xl font-serif text-rose-800 tracking-tight">
            {t.mindfulAffirmations}
          </h2>
        </header>

        <div className="flex justify-center py-4 scale-75">
          <PulseCircle isActive={status === 'active'} color={isSpeaking ? 'bg-indigo-400' : 'bg-rose-400'} />
        </div>

        <div className="glass flex-grow overflow-y-auto rounded-[2.5rem] p-6 md:p-10 shadow-inner relative flex flex-col space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-grow items-center justify-center">
              <p className="text-rose-400/60 italic font-serif text-2xl text-center">
                {status === 'connecting' || messages.length === 0 ? "Aura is entering..." : ""}
              </p>
            </div>
          ) : (
            <div className="space-y-8 pb-4">
              {messages.map((m) => (
                <div key={m.id} className="flex flex-col items-start space-y-2">
                  <div className="max-w-[90%] rounded-[2rem] px-8 py-5 shadow-sm border border-white/40 bg-white/70 text-rose-950 rounded-bl-none italic font-serif text-xl leading-relaxed animate-in fade-in slide-in-from-bottom-2">
                    {renderMessageContent(m.text)}
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Debug Overlay */}
      <div className="fixed bottom-2 left-2 right-2 z-[60] flex flex-col items-center pointer-events-none">
        <div className="bg-black/50 text-white text-[10px] p-2 rounded max-w-md mx-auto font-mono flex flex-col gap-2">
          <div className="max-h-32 overflow-y-auto">
            {debugLogs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
          <button
            onClick={() => {
              addLog("Manual Ping clicked...");
              sessionPromiseRef.current?.then(s => {
                s.sendClientContent({ turns: [{ role: 'user', parts: [{ text: "Hello Aura, are you there?" }] }], turnComplete: true });
                addLog("Sent manual 'Hello'");
              }).catch(e => addLog(`Ping failed: ${e}`));
            }}
            className="bg-rose-500 text-white px-2 py-1 rounded self-start hover:bg-rose-600 pointer-events-auto"
          >
            Force Say "Hello"
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceSession;
