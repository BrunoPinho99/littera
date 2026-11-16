
import React, { useState, useRef, useEffect } from 'react';
import { EssayInput } from '../types';
import AITextLoading from '@/components/ui/ai-text-loading';
import { Brain } from 'lucide-react';

interface EssayEditorProps {
  topicTitle: string;
  onCancel: () => void;
  onSubmit: (input: EssayInput) => void;
  onHandwrittenSubmit?: (base64: string, mimeType: string) => void;
  isSubmitting: boolean;
  startTime: number;
}

export const compressEssayImage = (
  file: File,
  maxDimension = 1280,
  quality = 0.82
): Promise<{ dataUrl: string; sizeKB: number }> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Falha ao inicializar contexto de imagem (Canvas).'));
        return;
      }

      // Fundo branco para evitar transparências pretas ao converter PNG/HEIC para JPEG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64Part = dataUrl.split(',')[1] || '';
      const sizeBytes = Math.ceil((base64Part.length * 3) / 4);
      const sizeKB = Math.max(1, Math.round(sizeBytes / 1024));

      resolve({ dataUrl, sizeKB });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível processar a imagem selecionada.'));
    };

    img.src = objectUrl;
  });
};

const EssayEditor: React.FC<EssayEditorProps> = ({ 
  topicTitle, 
  onCancel, 
  onSubmit,
  onHandwrittenSubmit,
  isSubmitting, 
  startTime
}) => {
  const effectiveTopicTitle = topicTitle?.trim() || "Desafios para a formação educacional de surdos no Brasil";
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressedSizeKB, setCompressedSizeKB] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);
  const _finishedRef = useRef(false);

  // Marca redação em andamento ao montar
  useEffect(() => {
    localStorage.setItem('littera_essay_in_progress', JSON.stringify({
      topicTitle: effectiveTopicTitle,
      startTime,
      savedAt: Date.now()
    }));

    return () => {
      localStorage.removeItem('littera_essay_in_progress');
    };
  }, [effectiveTopicTitle]);

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

  // Cronômetro do intervalo pedagógico em tempo real
  useEffect(() => {
    // Checa se há intervalo ativo ao carregar
    const lastSub = localStorage.getItem('littera_last_essay_submitted_at');
    if (lastSub) {
      const elapsed = Date.now() - parseInt(lastSub, 10);
      const tenMinutes = 10 * 60 * 1000;
      if (elapsed < tenMinutes) {
        setCooldownSeconds(Math.ceil((tenMinutes - elapsed) / 1000));
      }
    }
  }, []);

  useEffect(() => {
    if (cooldownSeconds === null || cooldownSeconds <= 0) return;

    const interval = setInterval(() => {
      setCooldownSeconds(prev => {
        if (!prev || prev <= 1) {
          localStorage.removeItem('littera_last_essay_submitted_at');
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownSeconds]);

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        alert("O arquivo é muito grande. Máximo 15MB.");
        return;
      }
      try {
        const { dataUrl, sizeKB } = await compressEssayImage(file, 1280, 0.82);
        setImageFile(file);
        setImagePreview(dataUrl);
        setCompressedSizeKB(sizeKB);
      } catch (err) {
        console.error('[EssayEditor] Erro ao comprimir imagem:', err);
        alert("Não foi possível processar a foto. Tente outra imagem.");
      }
    }
  };

  const handleSubmit = () => {
    if (!imageFile || !imagePreview || isSubmitting || isSubmittingRef.current) return;

    // Trava de intervalo pedagógico (Anti-spam / Anti-script - 10 minutos entre envios)
    const lastSub = localStorage.getItem('littera_last_essay_submitted_at');
    if (lastSub) {
      const elapsed = Date.now() - parseInt(lastSub, 10);
      const tenMinutes = 10 * 60 * 1000;
      if (elapsed < tenMinutes) {
        const remainingSecs = Math.ceil((tenMinutes - elapsed) / 1000);
        setCooldownSeconds(remainingSecs);
        return;
      }
    }

    isSubmittingRef.current = true;
    setCooldownSeconds(null);
    localStorage.removeItem(`draft_${effectiveTopicTitle}`);
    localStorage.setItem('littera_last_essay_submitted_at', Date.now().toString());

    const base64Data = imagePreview.split(',')[1];
    const mimeType = 'image/jpeg';

    // Route through handwritten handler for OCR + annotated correction
    if (onHandwrittenSubmit) {
      onHandwrittenSubmit(base64Data, mimeType);
    } else {
      onSubmit({ type: 'image', base64: base64Data, mimeType });
    }

    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 2000);
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
          <h2 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white line-clamp-1 font-display" title={effectiveTopicTitle}>{effectiveTopicTitle}</h2>
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

      {/* Cooldown Banner (informational only) */}
      {cooldownSeconds !== null && cooldownSeconds > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/40 p-3 sm:p-4 flex items-center justify-between gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200 animate-fade-in shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-icons-outlined text-amber-600 text-lg shrink-0">hourglass_top</span>
            <span className="font-semibold">
              Intervalo pedagógico ativo: aguarde {Math.floor(cooldownSeconds / 60)}m {(cooldownSeconds % 60).toString().padStart(2, '0')}s antes de enviar nova redação. Aproveite para reler o tema e refletir sobre a estrutura.
            </span>
          </div>
        </div>
      )}

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
                  {imageFile?.name || 'imagem.jpg'} • {compressedSizeKB ? `${compressedSizeKB} KB • Otimizada para leitura IA` : (imageFile ? `${(imageFile.size / 1024).toFixed(0)} KB` : '')}
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
                  onClick={() => { setImageFile(null); setImagePreview(null); setCompressedSizeKB(null); }}
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
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 w-full">
            <div 
              onClick={() => !isSubmitting && fileInputRef.current?.click()}
              className={`w-full max-w-3xl flex-1 max-h-[500px] min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-primary/30 dark:border-primary/20 rounded-3xl bg-primary/[0.02] dark:bg-primary/[0.01] transition-all duration-300 hover:border-primary hover:bg-primary/[0.04] hover:scale-[1.01] hover:shadow-ambient cursor-pointer group relative overflow-hidden ${isSubmitting ? 'pointer-events-none opacity-50' : ''}`}
            >
              {/* Decorative background blobs */}
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500"></div>
              <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-secondary/10 rounded-full blur-3xl group-hover:bg-secondary/20 transition-all duration-500"></div>

              <div className="relative z-10 flex flex-col items-center text-center p-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white dark:bg-surface-dark shadow-sm border border-surface-container-high flex items-center justify-center mb-6 group-hover:-translate-y-2 transition-transform duration-300">
                  <span className="material-icons-outlined text-4xl sm:text-5xl text-primary">add_a_photo</span>
                </div>
                
                <h3 className="text-on-surface font-black text-xl sm:text-2xl mb-2 tracking-tight">
                  Envie a foto da sua redação
                </h3>
                
                <p className="text-body-md text-on-surface-variant max-w-md mx-auto mb-8 leading-relaxed">
                  Para uma correção precisa, certifique-se de que o texto esteja <strong className="text-primary font-bold">legível</strong>, <strong className="text-primary font-bold">bem iluminado</strong> e <strong className="text-primary font-bold">sem cortes</strong>.
                </p>
                
                <div className="px-8 py-3.5 btn-gradient text-on-primary rounded-pill font-black text-label-lg flex items-center gap-2 group-hover:shadow-glow transition-all pointer-events-none">
                  <span className="material-icons-outlined text-lg">photo_camera</span>
                  Abrir Câmera / Galeria
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Loading Overlay — Professional Correction UX */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[9999] bg-white text-gray-900 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50/80 via-white to-white select-none">
          <div className="w-full max-w-md animate-fade-in text-center flex flex-col items-center justify-center">
            
            {/* Animated Brain Icon */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-6">
              {/* Outer rotating ring */}
              <div 
                className="absolute inset-0 rounded-full border-2 border-dashed border-blue-500/25"
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
                className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-500/10"
                style={{ animation: 'correctionPulse 2s ease-in-out infinite' }}
              />
              {/* Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain 
                  className="w-10 h-10 text-primary"
                  style={{ animation: 'correctionIconFloat 3s ease-in-out infinite' }}
                />
              </div>
            </div>

            {/* AITextLoading - Kokonut UI Animated Shimmer */}
            <AITextLoading 
              texts={[
                "Analisando sua redação...",
                "Lendo a caligrafia da folha...",
                "Avaliando as 5 competências ENEM...",
                "Mapeando pontos fortes e desvios...",
                "Calculando nota ENEM oficial...",
                "Preparando devolutiva pedagógica..."
              ]}
              className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neutral-950 via-neutral-400 to-neutral-950"
              interval={2000}
            />

            <p className="text-gray-500 mt-2 mb-8 text-sm font-medium">
              Nossa Inteligência Artificial está analisando cada critério com precisão
            </p>

            {/* Progress Bar */}
            <div className="w-full max-w-xs mx-auto">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
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
