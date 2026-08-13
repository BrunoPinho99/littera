
import React, { useState, useRef, useEffect } from 'react';
import { EssayInput } from '../types';

interface EssayEditorProps {
  topicTitle: string;
  onCancel: () => void;
  onSubmit: (input: EssayInput) => void;
  onHandwrittenSubmit?: (base64: string, mimeType: string) => void;
  isSubmitting: boolean;
  startTime: number;
}

const EssayEditor: React.FC<EssayEditorProps> = ({ 
  topicTitle, 
  onCancel, 
  onSubmit,
  onHandwrittenSubmit,
  isSubmitting, 
  startTime
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const _finishedRef = useRef(false);

  // Marca redação em andamento ao montar
  useEffect(() => {
    localStorage.setItem('littera_essay_in_progress', JSON.stringify({
      topicTitle,
      startTime,
      savedAt: Date.now()
    }));

    return () => {
      localStorage.removeItem('littera_essay_in_progress');
    };
  }, [topicTitle]);

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
    if (!imageFile || !imagePreview) return;
    localStorage.removeItem(`draft_${topicTitle}`);
    // Route through handwritten handler for OCR + annotated correction
    if (onHandwrittenSubmit) {
      const base64Data = imagePreview.split(',')[1];
      const mimeType = imageFile.type;
      onHandwrittenSubmit(base64Data, mimeType);
    } else {
      const base64Data = imagePreview.split(',')[1];
      const mimeType = imageFile.type;
      onSubmit({ type: 'image', base64: base64Data, mimeType });
    }
  };

  const canSubmit = () => {
    if (isSubmitting) return false;
    return !!imageFile;
  };

  return (
    <div className="bg-surface-container-lowest dark:bg-surface-dark rounded-2xl sm:rounded-3xl shadow-ambient-lg border-none overflow-hidden animate-fade-in flex flex-col min-h-0 max-h-[calc(100vh-120px)] sm:max-h-[calc(100vh-160px)] relative">
      {/* Header */}
      <div className="bg-surface-container-low dark:bg-slate-800/50 px-3 sm:px-6 py-3 sm:py-4 shadow-sm border-none flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 z-10">
        <div className="flex-1 min-w-0 sm:mr-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] font-display">Tema da Redação</h3>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded-md">
              <span className="material-icons-outlined text-xs text-primary">timer</span>
              <span className="text-xs font-black text-primary font-mono">{elapsedTime}</span>
            </div>
          </div>
          <h2 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white line-clamp-1 font-display" title={topicTitle}>{topicTitle}</h2>
        </div>
        
        <button 
          onClick={() => !isSubmitting && fileInputRef.current?.click()}
          className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors rounded-lg shrink-0 self-start sm:self-auto cursor-pointer ${
            imagePreview 
              ? 'bg-emerald-500 hover:bg-emerald-600' 
              : 'bg-primary hover:bg-primary/90'
          }`}
        >
          <span className="material-icons-outlined text-sm text-white">{imagePreview ? 'swap_horiz' : 'photo_camera'}</span>
          <span className="text-xs font-black text-white uppercase tracking-widest">{imagePreview ? 'Trocar Foto' : 'Tirar Foto'}</span>
        </button>
      </div>

      {/* Photo Upload Area */}
      <div className="flex-grow p-0 relative bg-surface-container-lowest dark:bg-slate-900/30 overflow-y-auto flex flex-col min-h-0">
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
          /* ===== PHOTO SELECTED STATE ===== */
          <div className="flex flex-col h-full">
            {/* Success Banner */}
            <div className="p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm border-none flex items-center gap-3 shrink-0 z-10">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <span className="material-icons-outlined text-white text-sm">check</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Foto carregada com sucesso!</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400/80 truncate">
                  {imageFile?.name || 'imagem.jpg'} • {imageFile ? `${(imageFile.size / 1024).toFixed(0)} KB` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-700/50 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span className="material-icons-outlined text-sm">swap_horiz</span>
                  Trocar
                </button>
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-800/40 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span className="material-icons-outlined text-sm">delete</span>
                  Remover
                </button>
              </div>
            </div>

            {/* Image Preview */}
            <div className="flex-1 relative bg-surface-container-low dark:bg-slate-900/50 flex items-center justify-center p-4 overflow-hidden">
              <img 
                src={imagePreview} 
                alt="Preview da redação" 
                className="max-w-full max-h-full object-contain rounded-lg shadow-ambient border-none" 
              />
            </div>
          </div>
        ) : (
          /* ===== NO PHOTO STATE ===== */
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
            <div 
              onClick={() => !isSubmitting && fileInputRef.current?.click()}
              className={`w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/30 dark:border-slate-600 rounded-2xl bg-surface-container-lowest dark:bg-surface-dark transition-all hover:border-primary/50 hover:bg-primary/[0.02] cursor-pointer group ${isSubmitting ? 'pointer-events-none opacity-50' : ''}`}
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center mb-4">
                <span className="material-icons-outlined text-3xl sm:text-4xl text-primary">add_a_photo</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-bold text-base sm:text-lg text-center mb-1">Clique para tirar uma foto da sua redação</p>
              <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 text-center mb-5 max-w-xs">
                Certifique-se de que o texto esteja legível e bem iluminado
              </p>
              <div className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 group-hover:bg-primary/90 transition-colors pointer-events-none">
                <span className="material-icons-outlined text-base">photo_camera</span>
                Abrir Câmera / Galeria
              </div>
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
              className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-2 font-display"
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
                { label: 'Lendo caligrafia da foto', threshold: 10, icon: 'photo_camera' },
                { label: 'Transcrevendo texto manuscrito', threshold: 30, icon: 'draw' },
                { label: 'Avaliação das 5 competências ENEM', threshold: 50, icon: 'checklist_rtl' },
                { label: 'Mapeando trechos por competência', threshold: 70, icon: 'palette' },
                { label: 'Gerando feedback personalizado', threshold: 85, icon: 'rate_review' },
              ].map((step, i) => {
                const isComplete = progress > step.threshold;
                const thresholds = [0, 10, 30, 50, 70];
                const isActive = !isComplete && (i === 0 || progress > (thresholds[i] || 0));
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
      <div className={`p-3 sm:p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] border-none flex justify-between items-center gap-3 transition-colors z-10 ${imagePreview ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-surface-container-low dark:bg-slate-800/50'}`}>
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-gray-600 dark:text-gray-400 text-sm sm:text-base font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
        >
          Cancelar
        </button>

        {imagePreview && !isSubmitting && (
          <p className="hidden sm:block text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span className="material-icons-outlined text-xs align-middle mr-1">check_circle</span>
            Pronto para enviar
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit()}
          className={`px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl text-white text-sm sm:text-base font-bold shadow-lg transition-all flex items-center gap-2 ${
            canSubmit() 
              ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' 
              : 'bg-gray-300 dark:bg-slate-600 cursor-not-allowed shadow-none'
          }`}
        >
          {isSubmitting ? 'Analisando...' : (imagePreview ? 'Entregar Redação ✓' : 'Selecione uma Foto')}
          {!isSubmitting && imagePreview && <span className="material-icons-outlined text-sm">send</span>}
        </button>
      </div>
    </div>
  );
};

export default EssayEditor;
