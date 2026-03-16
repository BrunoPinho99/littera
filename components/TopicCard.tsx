
import React from 'react';
import { Topic, SupportText } from '../types';

interface TopicCardProps {
  topic: Topic;
  onRefresh: () => void;
  isLoading: boolean;
  onWrite: () => void;
  onUpload: () => void;
}

const TopicCard: React.FC<TopicCardProps> = ({ topic, onRefresh, isLoading, onWrite, onUpload }) => {
  const [countdown, setCountdown] = React.useState<number | null>(null);
  const [selectedText, setSelectedText] = React.useState<SupportText | null>(null);

  const handleWriteClick = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(interval);
          setTimeout(() => {
            setCountdown(null);
            onWrite();
          }, 500); // Pequeno delay no "1" antes de ir
          return 1;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  return (
    <>
      <div className="relative group perspective">
        {/* Overlay de Contagem Regressiva */}
        {countdown !== null && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm transition-all duration-300">
            <div className="text-9xl font-black text-white animate-bounce">
              {countdown}
            </div>
          </div>
        )}

        <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-premium border border-gray-100 dark:border-white/5 overflow-hidden transition-all duration-500">

          {/* Barra de Loading Sutil */}
          {isLoading && (
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 dark:bg-white/5 overflow-hidden z-30">
              <div className="h-full bg-primary animate-shimmer w-1/3 absolute top-0" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}></div>
            </div>
          )}

          <div className="p-6 md:p-8 flex flex-col items-center text-center relative z-20">

            {/* Badge Flutuante (Botão de recarregar menorzinho ao centro) */}
            <div className="mb-3 animate-float">
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-gray-100 dark:border-white/5 text-primary hover:bg-primary hover:text-white transition-all duration-300 group/badge"
              >
                <span className={`material-icons-outlined text-[13px] transition-transform duration-700 ${isLoading ? 'animate-spin' : 'group-hover/badge:rotate-180'}`}>autorenew</span>
                <span className="text-[9px] font-black uppercase tracking-widest">Gerar Novo Tema</span>
              </button>
            </div>

            {/* Título Hero */}
            <h2 className={`max-w-4xl text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-[1.15] mb-6 mt-4 tracking-tight transition-all duration-500 ${isLoading ? 'opacity-30 blur-sm scale-95' : 'opacity-100 scale-100'}`}>
              {topic.title}
            </h2>

            <div className="w-16 h-1.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent rounded-full mb-6"></div>

            {/* Seção de Apoio - Cards Modernos */}
            <div className="w-full max-w-5xl mb-6">
              <div className="flex items-center justify-center gap-3 mb-4 opacity-50">
                <div className="h-px w-8 bg-gray-300 dark:bg-slate-700"></div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Contexto & Apoio</span>
                <div className="h-px w-8 bg-gray-300 dark:bg-slate-700"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topic.supportTexts.slice(0, 2).map((text) => (
                  <div
                    key={text.id}
                    onClick={() => setSelectedText(text)}
                    className="flex text-left bg-gray-50/80 dark:bg-slate-800/50 p-4 lg:p-5 rounded-[1.5rem] border border-gray-100 dark:border-white/5 hover:border-primary/20 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg transition-all duration-300 group/card cursor-pointer items-center justify-between"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-primary group-hover/card:bg-primary group-hover/card:text-white transition-colors">
                        <span className="material-icons-outlined text-xl">{text.icon === 'article' ? 'description' : text.icon}</span>
                      </div>
                      <div className="truncate">
                        <h4 className="font-bold text-[13px] md:text-sm text-slate-800 dark:text-slate-200 truncate">{text.title}</h4>
                        <span className="text-primary font-bold text-[9px] uppercase tracking-widest flex items-center gap-1 group-hover/card:underline mt-0.5">
                          Abrir leitura
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 material-icons-outlined text-gray-400 group-hover/card:text-primary transition-colors group-hover/card:translate-x-1 duration-300">chevron_right</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ações Principais (CTAs) */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto relative z-30">
              <button
                onClick={handleWriteClick}
                disabled={isLoading}
                className="group relative px-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-slate-900/20 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <span className="material-icons-outlined text-xl group-hover:rotate-12 transition-transform">edit_note</span>
                <span>Escrever Redação</span>
              </button>

              <button
                onClick={onUpload}
                disabled={isLoading}
                className="px-6 py-4 bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl font-black text-xs transition-all hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="material-icons-outlined text-lg">add_a_photo</span>
                <span>Enviar Foto</span>
              </button>
            </div>
          </div>

          {/* Efeito de Fundo Sutil */}
          <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-gray-50/50 dark:from-slate-800/50 to-transparent pointer-events-none z-0"></div>
        </div>
      </div>

      {/* Modal de Texto Completo */}
      {
        selectedText && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 animate-fade-in">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setSelectedText(null)}
            ></div>

            <div className="relative bg-white dark:bg-surface-dark w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up">
              <div className="bg-primary/5 p-8 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="material-icons-outlined text-2xl">{selectedText.icon === 'article' ? 'description' : selectedText.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-white text-xl tracking-tight leading-tight">{selectedText.title}</h3>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Fonte Motivadora</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedText(null)}
                  className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center shadow-sm shrink-0 ml-4"
                >
                  <span className="material-icons-outlined">close</span>
                </button>
              </div>

              <div className="p-10 max-h-[60vh] overflow-y-auto scrollbar-hide">
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <p className="text-gray-600 dark:text-gray-300 text-[15px] md:text-base leading-relaxed font-medium whitespace-pre-wrap">
                    {selectedText.content}
                  </p>
                </div>
              </div>

              <div className="p-8 bg-gray-50 dark:bg-slate-900/50 flex justify-center border-t border-gray-100 dark:border-slate-800">
                <button
                  onClick={() => setSelectedText(null)}
                  className="px-10 py-3 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                >
                  Entendido, fechar
                </button>
              </div>
            </div>
          </div>
        )
      }

      <style>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-up {
          animation: scaleUp 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default TopicCard;
