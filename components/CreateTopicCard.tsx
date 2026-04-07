
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
    <div className={`relative mt-8 group transition-all duration-500 ${isFocused ? 'scale-[1.01]' : 'hover:scale-[1.005]'}`}>

      {/* Card — "Littera Standard": surface-container-lowest, no borders, ambient shadow */}
      <div className="relative bg-surface-container-lowest rounded-card p-8 md:p-12 flex flex-col lg:flex-row items-center gap-8 lg:gap-12 shadow-ambient">

        {/* Left: Label + Description */}
        <div className="w-full lg:flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 bg-secondary-container rounded-pill">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-label-sm uppercase tracking-widest text-on-secondary-container">Modo Criativo</span>
          </div>
          <h3 className="text-headline-sm font-display text-on-surface tracking-tight mb-2" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>Crie seu Próprio Tema</h3>
          <p className="text-body-md text-on-surface-variant leading-relaxed max-w-md mx-auto lg:mx-0">
            Digite um assunto (ex: "Tecnologia e Saúde") e nossa IA criará um tema completo estilo ENEM para você.
          </p>
        </div>

        {/* Right: Input */}
        <div className="w-full lg:w-[65%] relative">
          <div
            onClick={handleBarClick}
            className={`relative flex items-center bg-surface-container-low rounded-input transition-all duration-300 cursor-text ${isFocused ? 'ring-2 ring-primary shadow-glow-sm bg-surface-container-lowest' : 'ghost-border'}`}
          >
            <span className="material-icons-outlined text-on-surface-variant pl-4 select-none">magic_button</span>
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
              className="flex-1 w-full min-w-0 py-4 px-4 bg-transparent border-none outline-none text-on-surface font-bold placeholder-on-surface-variant/50 text-body-lg"
            />
            <button
              onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
              disabled={isGenerating || !prompt.trim()}
              className="mr-2 p-2 rounded-xl btn-gradient text-on-primary disabled:bg-surface-container-high disabled:text-on-surface-variant transition-all active:scale-95 shadow-card flex items-center justify-center shrink-0"
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
                setTimeout(() => handleGenerate(), 100);
              }}
              disabled={isGenerating}
              className="text-label-md text-primary hover:text-primary-dark transition-colors flex items-center gap-1 group/random"
            >
              <span className="material-icons-outlined text-sm group-hover/random:animate-spin">casino</span>
              Sem ideias? Gere um tema surpresa
            </button>

            <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">
              Enter para gerar
            </p>
          </div>

          {errorMsg && (
            <div className="mt-3 flex items-start gap-2 bg-rose-50 rounded-input px-4 py-3 animate-fade-in">
              <span className="material-icons-outlined text-rose-500 text-base shrink-0 mt-0.5">error_outline</span>
              <p className="text-label-md text-rose-600 leading-relaxed">{errorMsg}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CreateTopicCard;
