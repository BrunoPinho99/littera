
import React, { useState, useRef } from 'react';
import { generateCustomTopic } from '../services/geminiService';
import { Topic } from '../types';

interface CreateTopicCardProps {
  onTopicGenerated: (topic: Topic) => void;
}

const CreateTopicCard: React.FC<CreateTopicCardProps> = ({ onTopicGenerated }) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const newTopic = await generateCustomTopic(prompt);
      onTopicGenerated(newTopic);
      setPrompt("");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setErrorMsg(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleBarClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="relative mt-8 sm:mt-12">

      {/* Card */}
      <div className="relative bg-white dark:bg-surface-dark rounded-3xl overflow-hidden shadow-xl border border-gray-100 dark:border-slate-700/50">
        
        {/* Subtle gradient top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-400 to-primary/60" />

        <div className="p-6 sm:p-10 lg:p-12">
          
          {/* Top section: badge + title + description — always centered */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 bg-primary/10 dark:bg-primary/20 rounded-full">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">Modo Criativo</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
              Crie seu Próprio Tema
            </h3>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
              Digite um assunto (ex: "Tecnologia e Saúde") e nossa IA criará um tema completo estilo ENEM para você.
            </p>
          </div>

          {/* Input bar — full width, prominent */}
          <div className="max-w-2xl mx-auto">
            <div
              onClick={handleBarClick}
              className={`relative flex items-center rounded-2xl transition-all duration-300 cursor-text ${
                isFocused 
                  ? 'ring-2 ring-primary shadow-lg shadow-primary/10 bg-white dark:bg-slate-800' 
                  : 'bg-gray-50 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-600 hover:border-primary/40'
              }`}
            >
              <span className="material-icons-outlined text-gray-400 dark:text-gray-500 pl-4 sm:pl-5 select-none text-xl">auto_awesome</span>
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                disabled={isGenerating}
                placeholder="Sobre o que você quer escrever?"
                className="flex-1 w-full min-w-0 py-4 px-3 sm:px-4 bg-transparent border-none outline-none text-gray-900 dark:text-white font-semibold placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base"
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
                disabled={isGenerating || !prompt.trim()}
                className={`mr-2 sm:mr-3 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center gap-2 shrink-0 ${
                  prompt.trim() && !isGenerating
                    ? 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/30'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                  <span className="material-icons-outlined animate-spin text-base">sync</span>
                ) : (
                  <>
                    <span className="material-icons-outlined text-base">arrow_upward</span>
                    <span className="hidden sm:inline">Gerar</span>
                  </>
                )}
              </button>
            </div>

            {/* Helpers row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-3 gap-2 px-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPrompt("Surpreenda-me com um tema inédito e atual do ENEM");
                  setTimeout(() => handleGenerate(), 100);
                }}
                disabled={isGenerating}
                className="text-xs sm:text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 group/random"
              >
                <span className="material-icons-outlined text-sm group-hover/random:animate-spin">casino</span>
                Sem ideias? Gere um tema surpresa
              </button>

              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <span className="material-icons-outlined text-xs">keyboard_return</span>
                Enter para gerar
              </p>
            </div>

            {errorMsg && (
              <div className="mt-4 flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3 animate-fade-in">
                <span className="material-icons-outlined text-red-500 text-base shrink-0 mt-0.5">error_outline</span>
                <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">{errorMsg}</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default CreateTopicCard;
