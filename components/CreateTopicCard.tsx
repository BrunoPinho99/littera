
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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const newTopic = await generateCustomTopic(prompt);
      onTopicGenerated(newTopic);
      setPrompt("");
      // Rola para o topo para ver o novo tema
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      alert(msg);
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

  // Garante que o clique na "barra" foque o input
  const handleBarClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className={`relative mt-8 group transition-all duration-500 ${isFocused ? 'scale-[1.01]' : 'hover:scale-[1.01]'}`}>

      <div className="relative bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 rounded-[2.5rem] p-8 md:p-12 flex flex-col lg:flex-row items-center gap-8 lg:gap-12 shadow-card">

        {/* Ícone e Texto */}
        <div className="w-full lg:flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 bg-primary/5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Modo Criativo</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Crie seu Próprio Tema</h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed max-w-md mx-auto lg:mx-0">
            Digite um assunto (ex: "Tecnologia e Saúde") e nossa IA criará um tema completo estilo ENEM para você.
          </p>
        </div>

        {/* Input Area */}
        <div className="w-full lg:w-[65%] relative">
          <div
            onClick={handleBarClick}
            className={`relative flex items-center bg-gray-50 dark:bg-slate-900 rounded-2xl transition-all duration-300 border-2 cursor-text ${isFocused ? 'border-primary shadow-lg shadow-primary/10 bg-white dark:bg-black' : 'border-transparent'}`}
          >
            <span className="material-icons-outlined text-gray-400 pl-4 select-none">magic_button</span>
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              placeholder="Sobre o que você quer escrever hoje?"
              className="flex-1 w-full min-w-0 py-4 px-4 bg-transparent border-none outline-none text-slate-800 dark:text-white font-bold placeholder-gray-400 text-sm md:text-base"
            />
            <button
              onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
              disabled={isGenerating || !prompt.trim()}
              className="mr-2 p-2 rounded-xl bg-primary text-white hover:bg-primary-dark disabled:bg-gray-200 disabled:text-gray-400 transition-all active:scale-95 shadow-md flex items-center justify-center shrink-0"
            >
              {isGenerating ? (
                <span className="material-icons-outlined animate-spin text-lg">sync</span>
              ) : (
                <span className="material-icons-outlined text-lg">arrow_upward</span>
              )}
            </button>
          </div>

          <div className="flex justify-between items-center mt-3 px-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPrompt("Surpreenda-me com um tema inédito e atual do ENEM");
                // Pequeno delay para a UI atualizar antes de enviar
                setTimeout(() => handleGenerate(), 100);
              }}
              disabled={isGenerating}
              className="text-xs font-bold text-primary hover:text-primary-dark transition-colors flex items-center gap-1 group/random"
            >
              <span className="material-icons-outlined text-sm group-hover/random:animate-spin">casino</span>
              Sem ideias? Gere um tema surpresa
            </button>

            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Pressione Enter para gerar
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CreateTopicCard;
