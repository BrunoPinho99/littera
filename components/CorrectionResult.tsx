
import React, { useEffect, useState } from 'react';
import { CorrectionResult } from '../types';

interface CorrectionResultProps {
  result: CorrectionResult;
  onBack: () => void;
}

const CorrectionResultView: React.FC<CorrectionResultProps> = ({ result, onBack }) => {
  const [barsVisible, setBarsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBarsVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  const getScoreColor = (score: number) => {
    if (result.aiDetected) return "text-rose-600";
    if (score >= 900) return "text-emerald-500";
    if (score >= 700) return "text-primary";
    if (score >= 500) return "text-amber-500";
    return "text-red-500";
  };

  const getBarColor = (score: number) => {
    if (score === 200) return 'bg-emerald-500';
    if (score >= 160) return 'bg-primary';
    if (score >= 120) return 'bg-amber-400';
    return 'bg-rose-400';
  };

  const scorePercent = Math.round((result.totalScore / 1000) * 100);

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-10 px-4 md:px-0">

      {/* Sticky Back — glassmorphism pill */}
      <div className="sticky top-24 z-50 flex justify-start mb-6 pointer-events-none">
        <button
          onClick={onBack}
          className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 bg-surface/90 backdrop-blur-xl text-on-surface-variant rounded-pill font-bold text-label-lg shadow-ambient ghost-border hover:text-primary transition-all"
        >
          <span className="material-icons-outlined text-lg">arrow_back</span>
          Voltar
        </button>
      </div>

      {/* Main Card — No border, ambient shadow */}
      <div className="bg-surface-container-lowest rounded-card shadow-ambient overflow-hidden mb-8">

        {/* AI Detection Banner */}
        {result.aiDetected && (
          <div className="bg-rose-600 text-white p-6 flex flex-col md:flex-row items-center gap-4">
            <span className="material-symbols-outlined text-4xl">robot_2</span>
            <div className="text-center md:text-left">
              <h4 className="font-black uppercase tracking-widest text-label-lg">Redação Invalidada — Detecção de I.A.</h4>
              <p className="text-body-sm font-medium opacity-95 leading-relaxed mt-1">
                {result.aiJustification || "Nossos algoritmos identificaram padrões sintáticos e estruturais típicos de modelos de linguagem artificiais. A nota foi zerada por violação da política de autoria."}
              </p>
            </div>
          </div>
        )}

        {/* Header Score — Dark inset */}
        <div className={`p-10 text-center relative overflow-hidden ${result.aiDetected ? 'bg-rose-50' : 'bg-on-surface text-white'}`}>
          {!result.aiDetected && (
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 to-transparent pointer-events-none"></div>
          )}

          <div className="flex flex-col items-center relative z-10">
            <h2 className={`${result.aiDetected ? 'text-rose-400' : 'text-on-surface-variant'} text-label-sm uppercase tracking-[0.25em] mb-3`}>
              {result.aiDetected ? "Redação Zerada" : "Nota Final"}
            </h2>

            <div className={`text-8xl md:text-9xl font-black mb-2 tabular-nums ${getScoreColor(result.totalScore)}`}
              style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', letterSpacing: '-0.04em' }}>
              {result.totalScore}
            </div>
            <p className={`text-body-md font-bold mb-6 ${result.aiDetected ? 'text-rose-300' : 'text-white/40'}`}>
              de 1000 pontos
            </p>

            {/* Score progress */}
            {!result.aiDetected && (
              <div className="w-full max-w-xs mx-auto mb-6">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary-container transition-all duration-1000 ease-out"
                    style={{ width: barsVisible ? `${scorePercent}%` : '0%' }}
                  ></div>
                </div>
                <p className="text-label-sm text-white/30 text-right mt-1">{scorePercent}%</p>
              </div>
            )}

            {/* Topic title chip */}
            {result.topicTitle && (
              <div className="bg-white/95 backdrop-blur-sm px-6 py-3 rounded-card mb-6 shadow-ambient max-w-xl mx-auto">
                <h3 className="text-on-surface font-bold text-body-md leading-tight">
                  {result.topicTitle}
                </h3>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3 items-center">
              <div className={`px-4 py-1.5 rounded-pill backdrop-blur-md text-label-md font-bold flex items-center gap-2 ${result.aiDetected ? 'bg-rose-100 text-rose-600' : 'bg-white/10 text-white'}`}>
                <span className="material-icons-outlined text-sm">timer</span>
                {result.timeTaken || "--"}
              </div>
              <div className={`px-4 py-1.5 rounded-pill backdrop-blur-md text-label-md font-bold ${result.aiDetected ? 'bg-rose-600 text-white' : result.totalScore >= 800 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-primary/20 text-primary-light'}`}>
                {result.aiDetected ? "INFRAÇÃO TÉCNICA" : (result.totalScore >= 800 ? "🏆 Elite Littera" : "⬆ Em Evolução")}
              </div>
            </div>
          </div>
        </div>

        {/* General Feedback — Tonal layering (surface-container-low section) */}
        <div className="p-8 bg-surface-container-low">
          <h3 className="flex items-center gap-2 text-title-lg text-on-surface mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary-fixed/40 flex items-center justify-center">
              <span className="material-icons-outlined text-primary text-base">psychology</span>
            </div>
            Análise Geral
          </h3>
          <p className="text-body-lg text-on-surface-variant leading-relaxed">
            {result.generalComment}
          </p>
        </div>

        {/* Competencies — surface back to surface-container-lowest */}
        <div className={`p-8 ${result.aiDetected ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
          <h3 className="flex items-center gap-2 text-title-lg text-on-surface mb-6">
            <div className="w-8 h-8 rounded-xl bg-primary-fixed/40 flex items-center justify-center">
              <span className="material-icons-outlined text-primary text-base">checklist</span>
            </div>
            Detalhamento por Competência
          </h3>

          <div className="space-y-4">
            {result.competencies.map((comp, index) => (
              <div key={index} className="bg-surface-container-low p-5 rounded-card hover:shadow-card transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-surface-container-high flex items-center justify-center">
                      <span className="text-label-sm text-on-surface-variant">C{index + 1}</span>
                    </div>
                    <h4 className="font-bold text-on-surface text-body-md">{comp.name}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-black text-xl tabular-nums ${getBarColor(comp.score).replace('bg-', 'text-')}`}
                          style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
                      {comp.score}
                    </span>
                    <span className="text-label-md text-on-surface-variant">/200</span>
                  </div>
                </div>

                <div className="w-full bg-surface-container-high rounded-full h-2 mb-3 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ease-out ${getBarColor(comp.score)}`}
                    style={{
                      width: barsVisible ? `${(comp.score / 200) * 100}%` : '0%',
                      transitionDelay: `${index * 80}ms`
                    }}
                  ></div>
                </div>

                <p className="text-body-sm text-on-surface-variant leading-relaxed">
                  {comp.feedback}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="p-8 flex justify-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-8 py-3.5 btn-gradient text-on-primary rounded-pill font-black text-label-lg hover:scale-[1.02] hover:shadow-glow transition-all active:scale-95"
          >
            <span className="material-icons-outlined">edit_note</span>
            Escrever Outra Redação
          </button>
        </div>
      </div>
    </div>
  );
};

export default CorrectionResultView;