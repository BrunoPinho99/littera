
import React, { useState, useRef, useEffect } from 'react';
import { EssayInput } from '../types';

interface EssayEditorProps {
  topicTitle: string;
  onCancel: () => void;
  onSubmit: (input: EssayInput) => void;
  isSubmitting: boolean;
  initialMode?: 'text' | 'image';
  startTime: number;
}

const EssayEditor: React.FC<EssayEditorProps> = ({ 
  topicTitle, 
  onCancel, 
  onSubmit, 
  isSubmitting, 
  initialMode = 'text',
  startTime
}) => {
  const [mode, setMode] = useState<'text' | 'image'>(initialMode);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Controla se foi finalizado (não deve mostrar banner ao desmontar por submit/cancel)
  const finishedRef = useRef(false);

  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

  // Carregar rascunho ao montar
  useEffect(() => {
    const draftKey = `draft_${topicTitle}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      setText(savedDraft);
    }

    // Marca redação em andamento
    localStorage.setItem('littera_essay_in_progress', JSON.stringify({
      topicTitle,
      startTime,
      savedAt: Date.now()
    }));

    return () => {
      // Ao desmontar: remove a marca de progresso (seja por cancel ou submit)
      localStorage.removeItem('littera_essay_in_progress');
    };
  }, [topicTitle]);

  // Auto-save com Debounce
  useEffect(() => {
    if (text.length === 0) return;
    
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      localStorage.setItem(`draft_${topicTitle}`, text);
      setSaveStatus('saved');
      // Volta para idle após 2 segundos
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);

    return () => clearTimeout(timer);
  }, [text, topicTitle]);

  // Lógica do Cronômetro - Resistente a trocas de aba
  useEffect(() => {
    if (isSubmitting) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = now - startTime;
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsedTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    updateTimer(); // Atualização inicial imediata
    const timer = setInterval(updateTimer, 1000);

    // Garante atualização instantânea ao voltar para a aba
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startTime, isSubmitting]);

  useEffect(() => {
    let interval: any;
    if (isSubmitting) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 30) return prev + 2;
          if (prev < 70) return prev + 0.5;
          if (prev < 92) return prev + 0.1;
          return prev;
        });
      }, 50);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isSubmitting]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("O arquivo é muito grande. Máximo 5MB.");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    // Limpa o rascunho ao enviar
    localStorage.removeItem(`draft_${topicTitle}`);
    if (mode === 'text') {
      onSubmit({ type: 'text', content: text });
    } else {
      if (!imageFile || !imagePreview) return;
      const base64Data = imagePreview.split(',')[1];
      const mimeType = imageFile.type;
      onSubmit({ type: 'image', base64: base64Data, mimeType });
    }
  };

  const canSubmit = () => {
    if (isSubmitting) return false;
    if (mode === 'text') return wordCount >= 5;
    if (mode === 'image') return !!imageFile;
    return false;
  };

  return (
    <div className="bg-white dark:bg-surface-dark rounded-2xl sm:rounded-3xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-fade-in flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-180px)] lg:h-[calc(100vh-200px)] min-h-[400px] relative">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-slate-800/50 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
        <div className="flex-1 min-w-0 sm:mr-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Tema da Redação</h3>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded-md">
              <span className="material-icons-outlined text-xs text-primary">timer</span>
              <span className="text-xs font-black text-primary font-mono">{elapsedTime}</span>
            </div>
            
            {/* Indicador de Auto-save */}
            <div className={`flex items-center gap-1.5 transition-opacity duration-500 ${saveStatus === 'idle' ? 'opacity-0' : 'opacity-100'}`}>
              <span className={`material-icons-outlined text-xs ${saveStatus === 'saving' ? 'animate-spin text-amber-500' : 'text-emerald-500'}`}>
                {saveStatus === 'saving' ? 'sync' : 'cloud_done'}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${saveStatus === 'saving' ? 'text-amber-500' : 'text-emerald-500'}`}>
                {saveStatus === 'saving' ? 'Salvando...' : 'Rascunho salvo'}
              </span>
            </div>
          </div>
          <h2 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white line-clamp-1" title={topicTitle}>{topicTitle}</h2>
        </div>
        
        <div className="flex bg-gray-200 dark:bg-slate-700 p-1 rounded-lg shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setMode('text')}
            disabled={isSubmitting}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all ${mode === 'text' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Digitar
          </button>
          <button
            onClick={() => setMode('image')}
            disabled={isSubmitting}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all ${mode === 'image' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Enviar Foto
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-grow p-0 relative bg-white dark:bg-slate-900/30 overflow-hidden">
        {mode === 'text' ? (
          <div className="h-full relative overflow-auto">
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)',
                backgroundSize: '100% 2.25rem',
                backgroundPosition: '0 2.2rem'
              }}
            ></div>
            
            <textarea
              className="w-full h-full p-4 sm:p-8 pt-[0.45rem] resize-none bg-transparent border-0 focus:ring-0 text-gray-800 dark:text-gray-200 text-base sm:text-xl font-serif leading-[2.25rem] placeholder-gray-300 dark:placeholder-slate-600 outline-none relative z-10"
              placeholder="Comece a escrever sua redação aqui..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isSubmitting}
              spellCheck={false}
            />
             <div className="absolute bottom-4 right-4 text-right pointer-events-none z-20">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm bg-white/90 dark:bg-black/40 backdrop-blur-sm border border-gray-100 dark:border-slate-800 ${wordCount < 100 ? 'text-amber-600' : 'text-green-600'}`}>
                {wordCount} palavras
              </span>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 bg-gray-50/30 dark:bg-slate-900/30">
            <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-surface-dark transition-all hover:border-primary/50 relative overflow-hidden">
               <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={isSubmitting}
               />
               
               {imagePreview ? (
                 <div className="relative w-full h-full group">
                   <img src={imagePreview} alt="Preview" className="w-full h-full object-contain p-4" />
                   {!isSubmitting && (
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-white text-gray-900 px-4 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
                        >
                          Trocar Imagem
                        </button>
                     </div>
                   )}
                 </div>
               ) : (
                 <div 
                    onClick={() => !isSubmitting && fileInputRef.current?.click()}
                    className={`flex flex-col items-center cursor-pointer p-10 text-center ${isSubmitting ? 'pointer-events-none opacity-50' : ''}`}
                 >
                   <span className="material-icons-outlined text-5xl text-gray-300 dark:text-slate-600 mb-4">add_a_photo</span>
                   <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">Clique para tirar uma foto da sua folha</p>
                   <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Certifique-se de que o texto esteja legível e bem iluminado</p>
                 </div>
               )}
            </div>
          </div>
        )}
      </div>
      
      {/* Loading Overlay — Professional Correction UX */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[9999] bg-white dark:bg-[#0c1021] overflow-y-auto transition-all duration-300">
          <div className="min-h-full w-full flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-lg animate-fade-in text-center py-8">
              
              {/* Animated Brain Icon */}
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 mx-auto mb-6 sm:mb-8">
              {/* Outer rotating ring */}
              <div 
                className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20"
                style={{ animation: 'correctionSpin 8s linear infinite' }}
              />
              {/* Middle pulsing ring */}
              <div 
                className="absolute inset-2 rounded-full border-[3px] border-transparent"
                style={{ 
                  borderTopColor: '#004ac6',
                  borderRightColor: '#2563eb',
                  animation: 'correctionSpin 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                }}
              />
              {/* Inner glow */}
              <div 
                className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/10 to-blue-400/10"
                style={{ animation: 'correctionPulse 2s ease-in-out infinite' }}
              />
              {/* Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span 
                  className="material-icons-outlined text-primary text-4xl"
                  style={{ animation: 'correctionIconFloat 3s ease-in-out infinite' }}
                >
                  psychology
                </span>
              </div>
            </div>

            {/* Title */}
            <h3 
              className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-2"
              style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
            >
              Corrigindo sua redação
            </h3>
            <p className="text-gray-400 dark:text-gray-500 mb-6 sm:mb-8 text-xs sm:text-sm font-medium">
              Nossa I.A. está analisando cada competência com cuidado
            </p>

            {/* Progress Bar */}
            <div className="w-full max-w-xs mx-auto mb-6 sm:mb-8">
              <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full relative"
                  style={{ 
                    width: `${progress}%`, 
                    transition: 'width 0.3s ease',
                    background: 'linear-gradient(90deg, #004ac6, #2563eb, #60a5fa)',
                  }}
                >
                  {/* Shimmer effect on progress bar */}
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                      animation: 'correctionShimmer 1.5s ease-in-out infinite',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="w-full max-w-sm mx-auto space-y-2 sm:space-y-3 mb-6 sm:mb-8">
              {[
                { label: 'Leitura e compreensão do texto', threshold: 15, icon: 'auto_stories' },
                { label: 'Avaliação das 5 competências ENEM', threshold: 40, icon: 'checklist_rtl' },
                { label: 'Análise de coerência e coesão', threshold: 65, icon: 'hub' },
                { label: 'Gerando feedback personalizado', threshold: 85, icon: 'rate_review' },
              ].map((step, i) => {
                const isComplete = progress > step.threshold;
                const isActive = !isComplete && (i === 0 || progress > [0, 15, 40, 65][i]);
                return (
                  <div 
                    key={i} 
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${
                      isComplete 
                        ? 'bg-emerald-50 dark:bg-emerald-950/30' 
                        : isActive 
                          ? 'bg-primary/5 dark:bg-primary/10' 
                          : 'bg-gray-50 dark:bg-slate-800/50'
                    }`}
                  >
                    {/* Step icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-500 ${
                      isComplete 
                        ? 'bg-emerald-500 text-white' 
                        : isActive 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-300 dark:text-slate-600'
                    }`}>
                      {isComplete ? (
                        <span className="material-icons-outlined text-lg" style={{ animation: 'correctionCheckPop 0.3s ease-out' }}>check</span>
                      ) : isActive ? (
                        <span className="material-icons-outlined text-lg" style={{ animation: 'correctionIconFloat 1.5s ease-in-out infinite' }}>{step.icon}</span>
                      ) : (
                        <span className="material-icons-outlined text-lg">{step.icon}</span>
                      )}
                    </div>
                    
                    {/* Step label */}
                    <span className={`text-sm font-semibold transition-colors duration-500 ${
                      isComplete 
                        ? 'text-emerald-700 dark:text-emerald-400' 
                        : isActive 
                          ? 'text-gray-800 dark:text-white' 
                          : 'text-gray-300 dark:text-slate-600'
                    }`}>
                      {step.label}
                    </span>
                    
                    {/* Active indicator */}
                    {isActive && (
                      <div className="ml-auto flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" style={{ animation: 'correctionDot 1.4s ease-in-out infinite' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" style={{ animation: 'correctionDot 1.4s ease-in-out 0.2s infinite' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" style={{ animation: 'correctionDot 1.4s ease-in-out 0.4s infinite' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom tag */}
            <p className="text-[11px] font-bold text-gray-300 dark:text-slate-600 uppercase tracking-[0.15em]">
              Gemini Flash • Análise profunda em segundos
            </p>
          </div>
          
          {/* Inline keyframes for correction overlay */}
          <style>{`
            @keyframes correctionSpin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes correctionPulse {
              0%, 100% { opacity: 0.5; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.08); }
            }
            @keyframes correctionIconFloat {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-3px); }
            }
            @keyframes correctionShimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
            @keyframes correctionCheckPop {
              0% { transform: scale(0); opacity: 0; }
              60% { transform: scale(1.3); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes correctionDot {
              0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
                40% { opacity: 1; transform: scale(1.2); }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-3 sm:p-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center gap-3">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-gray-600 dark:text-gray-400 text-sm sm:text-base font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit()}
          className="px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-white text-sm sm:text-base font-bold shadow-lg shadow-violet-500/30 transition-all flex items-center gap-2"
        >
          {isSubmitting ? 'Analisando...' : 'Entregar Redação'}
          {!isSubmitting && <span className="material-icons-outlined text-sm">send</span>}
        </button>
      </div>
    </div>
  );
};

export default EssayEditor;
