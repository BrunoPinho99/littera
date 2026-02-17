
import React from 'react';
import { CorrectionResult } from '../types';

interface CorrectionResultProps {
  result: CorrectionResult;
  onBack: () => void;
}

const CorrectionResultView: React.FC<CorrectionResultProps> = ({ result, onBack }) => {
  const getScoreColor = (score: number) => {
    if (result.aiDetected) return "text-rose-600";
    if (score >= 900) return "text-green-500";
    if (score >= 700) return "text-primary";
    if (score >= 500) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-10 px-4 md:px-0">
      <div className="bg-surface-light dark:bg-surface-dark rounded-3xl shadow-xl overflow-hidden mb-8 border border-gray-100 dark:border-slate-700">
        
        {/* IA Detection Banner - Agora Estático */}
        {result.aiDetected && (
          <div className="bg-rose-600 text-white p-6 flex flex-col md:flex-row items-center gap-4 border-b border-rose-700">
            <span className="material-symbols-outlined text-4xl">robot_2</span>
            <div className="text-center md:text-left">
              <h4 className="font-black uppercase tracking-widest text-sm">Redação Invalidada - Detecção de I.A.</h4>
              <p className="text-xs font-medium opacity-95 leading-relaxed mt-1">
                {result.aiJustification || "Nossos algoritmos identificaram padrões sintáticos e estruturais típicos de modelos de linguagem artificiais. A nota foi zerada por violação da política de autoria."}
              </p>
            </div>
          </div>
        )}

        {/* Header / Score */}
        <div className={`p-10 text-center relative overflow-hidden ${result.aiDetected ? 'bg-rose-50' : 'bg-slate-900 text-white'}`}>
          {!result.aiDetected && (
             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 to-transparent pointer-events-none"></div>
          )}
          
          <div className="flex flex-col items-center relative z-10">
            <h2 className={`${result.aiDetected ? 'text-rose-400' : 'text-gray-400'} text-sm font-bold uppercase tracking-widest mb-2`}>
              {result.aiDetected ? "Redação Zerada" : "Nota Final"}
            </h2>
            <div className={`text-7xl md:text-8xl font-black mb-4 ${getScoreColor(result.totalScore)} drop-shadow-lg`}>
              {result.totalScore}
            </div>

            {/* Tema da Redação */}
            {result.topicTitle && (
              <div className="bg-white/95 backdrop-blur-sm px-6 py-3 rounded-2xl mb-8 shadow-xl max-w-xl mx-auto border border-white/20">
                <h3 className="text-[#111827] font-bold text-sm md:text-base leading-tight">
                  {result.topicTitle}
                </h3>
              </div>
            )}
            
            <div className="flex flex-wrap justify-center gap-4 items-center">
              <div className={`px-4 py-1.5 rounded-full backdrop-blur-md text-xs font-bold border flex items-center gap-2 ${result.aiDetected ? 'bg-rose-100 border-rose-200 text-rose-600' : 'bg-white/10 border-white/20 text-white'}`}>
                <span className="material-icons-outlined text-sm">timer</span>
                Produzida em: {result.timeTaken || "--"}
              </div>
              <div className={`px-4 py-1.5 rounded-full backdrop-blur-md text-xs font-bold border ${result.aiDetected ? 'bg-rose-600 text-white border-rose-700' : 'bg-primary/20 border-primary/30 text-primary-light'}`}>
                 {result.aiDetected ? "INFRAÇÃO TÉCNICA" : (result.totalScore >= 800 ? "Elite Littera" : "Em Evolução")}
              </div>
            </div>
          </div>
        </div>

        {/* General Feedback */}
        <div className="p-8 border-b border-gray-100 dark:border-slate-700">
          <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white mb-4">
            <span className="material-icons-outlined text-primary">psychology</span>
            Análise Geral
          </h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
            {result.generalComment}
          </p>
        </div>

        {/* Competencies */}
        <div className={`p-8 ${result.aiDetected ? 'opacity-40 grayscale pointer-events-none' : 'bg-gray-50 dark:bg-slate-800/30'}`}>
          <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white mb-6">
            <span className="material-icons-outlined text-primary">checklist</span>
            Detalhamento por Competência
          </h3>
          
          <div className="space-y-6">
            {result.competencies.map((comp, index) => (
              <div key={index} className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200">{comp.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Nota:</span>
                    <span className={`font-bold text-lg ${comp.score === 200 ? 'text-green-500' : comp.score >= 160 ? 'text-primary' : 'text-amber-500'}`}>
                      {comp.score}/200
                    </span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 mb-3">
                  <div 
                    className={`h-2 rounded-full transition-all duration-1000 ${comp.score === 200 ? 'bg-green-500' : comp.score >= 160 ? 'bg-primary' : 'bg-amber-400'}`} 
                    style={{ width: `${(comp.score / 200) * 100}%` }}
                  ></div>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  "{comp.feedback}"
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="p-8 flex justify-center">
            <button 
                onClick={onBack}
                className="flex items-center gap-2 px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:shadow-lg transition-all"
            >
                <span className="material-icons-outlined">arrow_back</span>
                Tentar Novamente
            </button>
        </div>

      </div>
    </div>
  );
};

export default CorrectionResultView;
    