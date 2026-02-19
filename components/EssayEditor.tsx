
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

  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

  // Carregar rascunho ao montar
  useEffect(() => {
    const draftKey = `draft_${topicTitle}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      setText(savedDraft);
    }
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
    <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-fade-in flex flex-col h-[calc(100vh-200px)] min-h-[600px] relative">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-slate-800/50 px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-3 mb-1">
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
          <h2 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1" title={topicTitle}>{topicTitle}</h2>
        </div>
        
        <div className="flex bg-gray-200 dark:bg-slate-700 p-1 rounded-lg shrink-0">
          <button
            onClick={() => setMode('text')}
            disabled={isSubmitting}
            className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${mode === 'text' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Digitar
          </button>
          <button
            onClick={() => setMode('image')}
            disabled={isSubmitting}
            className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${mode === 'image' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-gray-500 dark:text-gray-400'}`}
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
              className="w-full h-full p-8 pt-[0.45rem] resize-none bg-transparent border-0 focus:ring-0 text-gray-800 dark:text-gray-200 text-xl font-serif leading-[2.25rem] placeholder-gray-300 dark:placeholder-slate-600 outline-none relative z-10"
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
      
      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 z-50 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md flex flex-col items-center justify-center transition-all duration-300 p-6">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 p-8 relative overflow-hidden animate-fade-in text-center">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100 dark:bg-slate-700">
               <div 
                 className="h-full bg-gradient-to-r from-primary via-purple-400 to-blue-400 transition-all duration-300"
                 style={{ width: `${progress}%` }}
               ></div>
            </div>
            
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 mx-auto relative">
              <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="material-icons-outlined text-primary absolute text-3xl">auto_fix_high</span>
            </div>

            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Análise Inteligente</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium">
              Extraindo insights e validando competências...
            </p>

            <div className="space-y-4 text-left bg-gray-50 dark:bg-slate-900/50 p-6 rounded-2xl">
               <div className="flex items-center gap-3 text-sm">
                  <span className={`material-icons-outlined text-lg ${progress > 15 ? 'text-green-500' : 'text-gray-300'}`}>
                    {progress > 15 ? 'check_circle' : 'circle'}
                  </span>
                  <span className={progress > 15 ? 'text-gray-700 dark:text-white font-bold' : 'text-gray-400'}>Análise forense ativa</span>
               </div>
               <div className="flex items-center gap-3 text-sm">
                  <span className={`material-icons-outlined text-lg ${progress > 45 ? 'text-green-500' : 'text-gray-300'}`}>
                    {progress > 45 ? 'check_circle' : 'circle'}
                  </span>
                  <span className={progress > 45 ? 'text-gray-700 dark:text-white font-bold' : 'text-gray-400'}>Avaliação de repertório</span>
               </div>
               <div className="flex items-center gap-3 text-sm">
                  <span className={`material-icons-outlined text-lg ${progress > 80 ? 'text-green-500' : 'text-gray-300'}`}>
                    {progress > 80 ? 'check_circle' : 'circle'}
                  </span>
                  <span className={progress > 80 ? 'text-gray-700 dark:text-white font-bold' : 'text-gray-400'}>Finalizando relatório</span>
               </div>
            </div>
            
            <p className="mt-8 text-[10px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">
              Rede Neural Flash Otimizada
            </p>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-3 rounded-xl text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit()}
          className="px-8 py-3 rounded-xl bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-white font-bold shadow-lg shadow-violet-500/30 transition-all flex items-center gap-2"
        >
          {isSubmitting ? 'Analisando...' : 'Entregar Redação'}
          {!isSubmitting && <span className="material-icons-outlined text-sm">send</span>}
        </button>
      </div>
    </div>
  );
};

export default EssayEditor;
