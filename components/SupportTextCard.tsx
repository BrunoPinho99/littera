
import React, { useState } from 'react';
import { SupportText } from '../types';

interface SupportTextCardProps {
  data: SupportText;
  compact?: boolean;
}

const SupportTextCard: React.FC<SupportTextCardProps> = ({ data, compact = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Limita o texto para exibição no card de acordo com o modo
  const maxLength = compact ? 85 : 120;
  const previewText = data.content.length > maxLength 
    ? data.content.substring(0, maxLength) + "..." 
    : data.content;

  return (
    <>
      <div className={`group relative bg-[#F8F9FE] dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-[1.5rem] ${compact ? 'p-5' : 'p-8'} text-left transition-all duration-300 hover:shadow-lg hover:border-primary/20 flex flex-col`}>
        <div className="relative z-10">
          <div className={`flex items-center gap-3 ${compact ? 'mb-2' : 'mb-4'}`}>
            <div className={`${compact ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} bg-white dark:bg-surface-dark text-primary flex items-center justify-center shadow-sm border border-gray-50 dark:border-white/5 group-hover:bg-primary group-hover:text-white transition-all`}>
              <span className={`material-icons-outlined ${compact ? 'text-sm' : 'text-[22px]'}`}>
                {data.icon === 'article' ? 'description' : data.icon}
              </span>
            </div>
            <h4 className={`font-bold ${compact ? 'text-sm' : 'text-[17px]'} text-gray-900 dark:text-white group-hover:text-primary transition-colors`}>
              {data.title}
            </h4>
          </div>
          <p className={`${compact ? 'text-[12px]' : 'text-[14.5px]'} text-gray-500 dark:text-gray-400 leading-relaxed font-medium`}>
            {previewText}
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="relative z-10 mt-3 text-primary font-bold text-[10px] uppercase tracking-widest flex items-center gap-1 hover:underline group/btn"
        >
          Expandir leitura
          <span className="material-icons-outlined text-[12px] group-hover/btn:translate-x-1 transition-transform">add_circle_outline</span>
        </button>
      </div>

      {/* Modal de Texto Completo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fade-in">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
          ></div>
          
          <div className="relative bg-white dark:bg-surface-dark w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-primary/5 p-8 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="material-icons-outlined text-2xl">{data.icon === 'article' ? 'description' : data.icon}</span>
                </div>
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white text-xl tracking-tight">{data.title}</h3>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Fonte Motivadora</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center shadow-sm"
              >
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            
            <div className="p-10 max-h-[70vh] overflow-y-auto scrollbar-hide">
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed font-medium whitespace-pre-wrap">
                  {data.content}
                </p>
              </div>
            </div>

            <div className="p-8 bg-gray-50 dark:bg-slate-900/50 flex justify-center border-t border-gray-100 dark:border-slate-800">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-10 py-3 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
              >
                Entendido, fechar
              </button>
            </div>
          </div>
        </div>
      )}

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

export default SupportTextCard;
