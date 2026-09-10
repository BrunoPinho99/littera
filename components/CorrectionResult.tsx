
import React, { useEffect, useState } from 'react';
import { CorrectionResult } from '../types';
import Fireworks from './Fireworks';

interface CorrectionResultProps {
  result: CorrectionResult;
  onBack: () => void;
  onEvolution?: () => void;
}

const CorrectionResultView: React.FC<CorrectionResultProps> = ({ result, onBack, onEvolution }) => {
  const [barsVisible, setBarsVisible] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBarsVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Trigger fireworks when score > 0
  useEffect(() => {
    if (result.totalScore > 0) {
      // Small delay so the score animates in first
      const t = setTimeout(() => setShowFireworks(true), 600);
      return () => clearTimeout(t);
    }
  }, [result.totalScore]);

  const getScoreColor = (score: number) => {
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

  const getScoreLabel = (score: number) => {
    if (score >= 900) return "🏆 Elite Littera";
    if (score >= 700) return "🌟 Excelente";
    if (score >= 500) return "⬆ Em Evolução";
    if (score > 0) return "📝 Continue Praticando";
    return "Sem Pontuação";
  };

  const scorePercent = Math.round((result.totalScore / 1000) * 100);

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-10 px-4 md:px-0">

      {/* 🎆 Fireworks celebration */}
      {showFireworks && (
        <Fireworks
          duration={4500}
          onComplete={() => setShowFireworks(false)}
        />
      )}

      {/* Sticky Back — glassmorphism pill */}
      <div className="sticky top-24 z-50 flex justify-start mb-6 pointer-events-none">
        <button
          onClick={onBack}
          className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 bg-surface/90 backdrop-blur-xl text-on-surface-variant rounded-pill font-bold text-label-lg shadow-ambient border-none hover:text-primary transition-all"
        >
          <span className="material-icons-outlined text-lg">arrow_back</span>
          Voltar
        </button>
      </div>

      {/* Main Card — No border, ambient shadow */}
      <div className="bg-surface-container-lowest rounded-card shadow-ambient overflow-hidden mb-8">

        {/* Header Score — Dark inset */}
        <div className="p-6 sm:p-10 text-center relative overflow-hidden bg-on-surface text-white">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 to-transparent pointer-events-none"></div>

          <div className="flex flex-col items-center relative z-10">
            <h2 className="text-on-surface-variant text-label-sm uppercase tracking-[0.25em] mb-3">
              Nota Final
            </h2>

            <div className={`text-6xl sm:text-8xl md:text-9xl font-black mb-2 tabular-nums ${getScoreColor(result.totalScore)} font-display tracking-tighter`}>
              {result.totalScore}
            </div>
            <p className="text-body-md font-bold mb-6 text-white/40">
              de 1000 pontos
            </p>

            {/* Score progress */}
            <div className="w-full max-w-xs mx-auto mb-6">
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary-container transition-all duration-1000 ease-out"
                  style={{ width: barsVisible ? `${scorePercent}%` : '0%' }}
                ></div>
              </div>
              <p className="text-label-sm text-white/30 text-right mt-1">{scorePercent}%</p>
            </div>

            {/* Topic title chip */}
            {result.topicTitle && (
              <div className="bg-white/95 backdrop-blur-sm px-6 py-3 rounded-card mb-6 shadow-ambient max-w-xl mx-auto">
                <h3 className="text-on-surface font-bold text-body-md leading-tight">
                  {result.topicTitle}
                </h3>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3 items-center">
              <div className="px-4 py-1.5 rounded-pill backdrop-blur-md text-label-md font-bold flex items-center gap-2 bg-white/10 text-white">
                <span className="material-icons-outlined text-sm">timer</span>
                {result.timeTaken || "--"}
              </div>
              <div className={`px-4 py-1.5 rounded-pill backdrop-blur-md text-label-md font-bold ${result.totalScore >= 800 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-primary/20 text-primary-light'}`}>
                {getScoreLabel(result.totalScore)}
              </div>
            </div>
          </div>
        </div>

        {/* Zero Reason Alert */}
        {result.zeroReason && (
          <div className="p-5 sm:p-8 bg-rose-50 dark:bg-rose-900/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-800/30 flex items-center justify-center flex-shrink-0">
                <span className="material-icons-outlined text-rose-500 text-xl">warning</span>
              </div>
              <div>
                <h3 className="text-title-lg text-rose-700 dark:text-rose-300 font-black mb-1">Redação Zerada</h3>
                <p className="text-body-md text-rose-600 dark:text-rose-400 font-bold">{result.zeroReason}</p>
              </div>
            </div>
          </div>
        )}

        {/* General Feedback — Tonal layering (surface-container-low section) */}
        <div className="p-5 sm:p-8 bg-surface-container-low">
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

        {/* Strengths & Improvements */}
        {((result.strengths && result.strengths.length > 0) || (result.priorityImprovements && result.priorityImprovements.length > 0)) && (
          <div className="p-5 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.strengths && result.strengths.length > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                <h4 className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-black text-label-lg mb-3">
                  <span className="material-icons-outlined text-base">thumb_up</span>
                  Pontos Fortes
                </h4>
                <ul className="space-y-2">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-body-sm text-emerald-700 dark:text-emerald-300">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span className="font-medium">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.priorityImprovements && result.priorityImprovements.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                <h4 className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-black text-label-lg mb-3">
                  <span className="material-icons-outlined text-base">priority_high</span>
                  Prioridades de Melhoria
                </h4>
                <ul className="space-y-2">
                  {result.priorityImprovements.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-body-sm text-amber-700 dark:text-amber-300">
                      <span className="text-amber-400 mt-0.5">→</span>
                      <span className="font-medium">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Competencies — surface back to surface-container-lowest */}
        <div className="p-5 sm:p-8">
          <h3 className="flex items-center gap-2 text-title-lg text-on-surface mb-6">
            <div className="w-8 h-8 rounded-xl bg-primary-fixed/40 flex items-center justify-center">
              <span className="material-icons-outlined text-primary text-base">checklist</span>
            </div>
            Detalhamento por Competência
          </h3>

          <div className="space-y-4">
            {result.competencies.map((comp, index) => (
              <div key={index} className="bg-surface-container-low p-4 sm:p-5 rounded-card hover:shadow-card transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-surface-container-high flex items-center justify-center">
                      <span className="text-label-sm text-on-surface-variant">C{index + 1}</span>
                    </div>
                    <h4 className="font-bold text-on-surface text-body-md">{comp.name}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {comp.level && (
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        comp.score >= 160 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 
                        comp.score >= 120 ? 'bg-primary/10 text-primary' :
                        comp.score >= 80 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                        'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                      }`}>
                        {comp.level}
                      </span>
                    )}
                    <span className={`font-black text-xl tabular-nums ${getBarColor(comp.score).replace('bg-', 'text-')} font-display`}>
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

                {/* Tips */}
                {comp.tips && comp.tips.length > 0 && (
                  <div className="mt-3 p-3 bg-primary/5 dark:bg-primary/10 rounded-xl">
                    <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-2">💡 Dicas para Melhorar</p>
                    <ul className="space-y-1.5">
                      {comp.tips.map((tip, ti) => (
                        <li key={ti} className="flex items-start gap-2 text-body-sm text-on-surface-variant">
                          <span className="text-primary font-bold mt-0.5 text-xs">{ti + 1}.</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Errors */}
                {comp.errors && comp.errors.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider">🔍 Erros Encontrados</p>
                    {comp.errors.map((err, ei) => (
                      <div key={ei} className="flex items-start gap-3 p-2.5 bg-rose-50/50 dark:bg-rose-900/10 rounded-lg border border-rose-100/50 dark:border-rose-800/20">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black uppercase text-rose-400 bg-rose-100 dark:bg-rose-900/30 px-1.5 py-0.5 rounded">{err.type}</span>
                          </div>
                          <p className="text-body-sm">
                            <span className="line-through text-rose-400 font-medium">{err.excerpt}</span>
                            <span className="text-on-surface-variant mx-1.5">→</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{err.correction}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="p-5 sm:p-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          {onEvolution && (
            <button
              onClick={onEvolution}
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white dark:bg-surface-dark border-2 border-primary text-primary rounded-pill font-black text-label-lg hover:bg-primary/5 dark:hover:bg-primary/20 transition-all active:scale-95"
            >
              <span className="material-icons-outlined">trending_up</span>
              Acompanhar Evolução
            </button>
          )}
          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 px-8 py-3.5 btn-gradient text-on-primary rounded-pill font-black text-label-lg hover:scale-[1.02] hover:shadow-glow transition-all active:scale-95"
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

