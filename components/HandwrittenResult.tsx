
import React, { useEffect, useState, useRef } from 'react';
import { HandwrittenCorrectionResult, CompetencyId } from '../types';
import Fireworks from './Fireworks';

interface HandwrittenResultProps {
  result: HandwrittenCorrectionResult;
  onBack: () => void;
  onEvolution?: () => void;
}

// --- Color System per Competency ---
const COMPETENCY_COLORS: Record<CompetencyId, {
  bg: string;       // background for highlight spans
  text: string;     // text color for labels
  border: string;   // border for cards
  dot: string;      // dot color for legend
  chip: string;     // chip bg for popover
}> = {
  C1: { bg: 'rgba(0, 74, 198, 0.10)',    text: 'text-blue-700',    border: 'border-blue-500',    dot: 'bg-blue-500',    chip: 'bg-blue-50'    },
  C2: { bg: 'rgba(111, 95, 160, 0.12)',   text: 'text-purple-700',  border: 'border-purple-500',  dot: 'bg-purple-500',  chip: 'bg-purple-50'  },
  C3: { bg: 'rgba(5, 150, 105, 0.10)',    text: 'text-emerald-700', border: 'border-emerald-500', dot: 'bg-emerald-500', chip: 'bg-emerald-50' },
  C4: { bg: 'rgba(217, 119, 6, 0.10)',    text: 'text-amber-700',   border: 'border-amber-500',   dot: 'bg-amber-500',   chip: 'bg-amber-50'   },
  C5: { bg: 'rgba(220, 38, 38, 0.10)',    text: 'text-rose-700',    border: 'border-rose-500',    dot: 'bg-rose-500',    chip: 'bg-rose-50'    },
};

const COMPETENCY_SHORT: Record<CompetencyId, string> = {
  C1: 'Norma Culta',
  C2: 'Compreensão',
  C3: 'Argumentação',
  C4: 'Coesão',
  C5: 'Intervenção',
};

const COMPETENCY_BORDER_CLASSES: Record<CompetencyId, string> = {
  C1: 'border-b-2 border-blue-400/60',
  C2: 'border-b-2 border-purple-400/60',
  C3: 'border-b-2 border-emerald-400/60',
  C4: 'border-b-2 border-amber-400/60',
  C5: 'border-b-2 border-rose-400/60',
};

const HandwrittenResultView: React.FC<HandwrittenResultProps> = ({ result, onBack, onEvolution }) => {
  const [barsVisible, setBarsVisible] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [activeCompetencies, setActiveCompetencies] = useState<Set<CompetencyId>>(
    new Set(['C1', 'C2', 'C3', 'C4', 'C5'])
  );
  const [expandedCompetency, setExpandedCompetency] = useState<CompetencyId | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setBarsVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (result.totalScore > 0) {
      const t = setTimeout(() => setShowFireworks(true), 600);
      return () => clearTimeout(t);
    }
  }, [result.totalScore]);

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveSegment(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    return "Imagem não processada";
  };

  const toggleCompetency = (id: CompetencyId) => {
    setActiveCompetencies(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const scorePercent = Math.round((result.totalScore / 1000) * 100);

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-10 px-4 md:px-0">

      {/* Fireworks */}
      {showFireworks && (
        <Fireworks duration={4500} onComplete={() => setShowFireworks(false)} />
      )}

      {/* Sticky Back */}
      <div className="sticky top-24 z-50 flex justify-start mb-6 pointer-events-none">
        <button
          onClick={onBack}
          className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 bg-surface/90 backdrop-blur-xl text-on-surface-variant rounded-pill font-bold text-label-lg shadow-ambient ghost-border hover:text-primary transition-all"
        >
          <span className="material-icons-outlined text-lg">arrow_back</span>
          Voltar
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════
          MAIN CARD
      ═══════════════════════════════════════════════════ */}
      <div className="bg-surface-container-lowest rounded-card shadow-ambient overflow-hidden mb-8">

        {/* ── Header Score ── */}
        <div className="p-6 sm:p-10 text-center relative overflow-hidden bg-on-surface text-white">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 to-transparent pointer-events-none"></div>

          <div className="flex flex-col items-center relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-icons-outlined text-primary-light text-lg">photo_camera</span>
              <h2 className="text-on-surface-variant text-label-sm uppercase tracking-[0.25em]">
                Correção Manuscrita
              </h2>
            </div>

            <div className={`text-6xl sm:text-8xl md:text-9xl font-black mb-2 tabular-nums ${getScoreColor(result.totalScore)}`}
              style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', letterSpacing: '-0.04em' }}>
              {result.totalScore}
            </div>
            <p className="text-body-md font-bold mb-6 text-white/40">
              de 1000 pontos
            </p>

            {/* Progress bar */}
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

        {/* ── General Feedback ── */}
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

        {/* ═══════════════════════════════════════════════════
            ANNOTATED TEXT SECTION
        ═══════════════════════════════════════════════════ */}
        <div className="p-5 sm:p-8">
          <h3 className="flex items-center gap-2 text-title-lg text-on-surface mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary-fixed/40 flex items-center justify-center">
              <span className="material-icons-outlined text-primary text-base">auto_stories</span>
            </div>
            Texto Transcrito
          </h3>
          <p className="text-body-sm text-on-surface-variant mb-5">
            Clique nos trechos coloridos para ver observações detalhadas da avaliação.
          </p>

          {/* ── Competency Legend / Filter Bar ── */}
          <div className="flex flex-wrap gap-2 mb-6">
            {((['C1', 'C2', 'C3', 'C4', 'C5'] as CompetencyId[]).map(id => {
              const colors = COMPETENCY_COLORS[id];
              const isActive = activeCompetencies.has(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleCompetency(id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-pill text-label-md font-bold transition-all border ${
                    isActive
                      ? `${colors.chip} ${colors.text} ${colors.border}`
                      : 'bg-surface-container-high text-on-surface-variant border-transparent opacity-50'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${colors.dot} ${!isActive ? 'opacity-30' : ''}`}></span>
                  {COMPETENCY_SHORT[id]}
                </button>
              );
            }))}
          </div>

          {/* ── Rendered Annotated Text ── */}
          <div
            className="bg-surface-container-low rounded-card p-5 sm:p-8 relative"
            style={{
              backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)',
              backgroundSize: '100% 2rem',
              backgroundPosition: '0 0.5rem',
            }}
          >
            <div className="font-serif text-base sm:text-lg leading-[2rem] text-on-surface whitespace-pre-wrap">
              {result.annotatedSegments.map((seg, i) => {
                // Neutral segments
                if (seg.type === 'neutral' || !seg.competencyId) {
                  return <span key={i}>{seg.text}</span>;
                }

                const cId = seg.competencyId;
                const colors = COMPETENCY_COLORS[cId];
                const isVisible = activeCompetencies.has(cId);

                // If this competency is toggled off, render as plain text
                if (!isVisible) {
                  return <span key={i}>{seg.text}</span>;
                }

                const isActive = activeSegment === i;

                return (
                  <span key={i} className="relative inline">
                    <span
                      className={`${COMPETENCY_BORDER_CLASSES[cId]} cursor-pointer rounded-sm px-0.5 
                                 transition-all duration-200 hover:opacity-75`}
                      style={{ backgroundColor: colors.bg }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSegment(isActive ? null : i);
                      }}
                    >
                      {seg.text}
                    </span>

                    {/* Popover */}
                    {isActive && (
                      <div
                        ref={popoverRef}
                        className="absolute z-50 left-0 mt-2 p-4 bg-surface-container-lowest shadow-ambient-lg rounded-xl max-w-xs sm:max-w-sm border border-outline-variant/30 animate-fade-in"
                        style={{ top: '100%' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`}></span>
                          <p className={`text-label-md font-bold ${colors.text}`}>
                            {result.competencies.find(c => c.id === cId)?.name || cId}
                          </p>
                        </div>
                        <p className="text-body-sm text-on-surface-variant leading-relaxed">
                          {seg.observation}
                        </p>
                        <button
                          onClick={() => setActiveSegment(null)}
                          className="mt-3 text-label-sm text-on-surface-variant hover:text-primary transition-colors"
                        >
                          Fechar ✕
                        </button>
                      </div>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            COMPETENCY DETAIL CARDS
        ═══════════════════════════════════════════════════ */}
        <div className="p-5 sm:p-8 bg-surface-container-low">
          <h3 className="flex items-center gap-2 text-title-lg text-on-surface mb-6">
            <div className="w-8 h-8 rounded-xl bg-primary-fixed/40 flex items-center justify-center">
              <span className="material-icons-outlined text-primary text-base">checklist</span>
            </div>
            Detalhamento por Competência
          </h3>

          <div className="space-y-4">
            {result.competencies.map((comp, index) => {
              const cId = comp.id;
              const colors = COMPETENCY_COLORS[cId];
              const isExpanded = expandedCompetency === cId;

              return (
                <div
                  key={cId}
                  className={`bg-surface-container-lowest rounded-card overflow-hidden transition-shadow hover:shadow-card border-l-4 ${colors.border}`}
                >
                  {/* Card Header */}
                  <button
                    onClick={() => setExpandedCompetency(isExpanded ? null : cId)}
                    className="w-full p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`}></span>
                      <h4 className="font-bold text-on-surface text-body-md">{comp.name}</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-xl tabular-nums ${getBarColor(comp.score).replace('bg-', 'text-')}`}
                              style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
                          {comp.score}
                        </span>
                        <span className="text-label-md text-on-surface-variant">/200</span>
                      </div>
                      <span className={`material-icons-outlined text-on-surface-variant text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </div>
                  </button>

                  {/* Score bar */}
                  <div className="px-4 sm:px-5 pb-3">
                    <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-700 ease-out ${getBarColor(comp.score)}`}
                        style={{
                          width: barsVisible ? `${(comp.score / 200) * 100}%` : '0%',
                          transitionDelay: `${index * 80}ms`
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-4 sm:px-5 pb-5 space-y-4">
                      {/* Feedback */}
                      <p className="text-body-sm text-on-surface-variant leading-relaxed">
                        {comp.feedback}
                      </p>

                      {/* Suggestions */}
                      {comp.suggestions && comp.suggestions.length > 0 && (
                        <div>
                          <h5 className="text-label-md text-on-surface font-bold mb-2 flex items-center gap-1.5">
                            <span className="material-icons-outlined text-sm text-primary">lightbulb</span>
                            Sugestões de Melhoria
                          </h5>
                          <ul className="space-y-1.5">
                            {comp.suggestions.map((s, si) => (
                              <li key={si} className="flex items-start gap-2 text-body-sm text-on-surface-variant">
                                <span className="text-primary mt-0.5">•</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            OVERALL SUGGESTIONS
        ═══════════════════════════════════════════════════ */}
        {result.overallSuggestions && result.overallSuggestions.length > 0 && (
          <div className="p-5 sm:p-8">
            <h3 className="flex items-center gap-2 text-title-lg text-on-surface mb-4">
              <div className="w-8 h-8 rounded-xl bg-primary-fixed/40 flex items-center justify-center">
                <span className="material-icons-outlined text-primary text-base">tips_and_updates</span>
              </div>
              Recomendações Gerais
            </h3>

            <div className="space-y-3">
              {result.overallSuggestions.map((suggestion, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 bg-surface-container-low rounded-xl"
                >
                  <div className="w-6 h-6 rounded-lg bg-primary-fixed/40 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-label-sm text-primary font-bold">{i + 1}</span>
                  </div>
                  <p className="text-body-md text-on-surface-variant leading-relaxed">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CTA ── */}
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

export default HandwrittenResultView;
