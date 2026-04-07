
import React, { useEffect, useState, useMemo } from 'react';
import { getUserStats, calculateUserRank, JOURNEY_TIERS } from '../services/databaseService';
import { SavedEssay } from '../types';
import CorrectionResultView from './CorrectionResult';
import { peerRankings } from '../data/rankingData';

interface PerformanceViewProps {
  userId?: string;
  isDemo?: boolean;
}

// ─── Mini bar chart component ────────────────────────────────────────────────
const ScoreBar: React.FC<{ score: number; max: number; date: string; isActive: boolean; onClick: () => void }> = ({
  score, max, date, isActive, onClick
}) => {
  const pct = Math.round((score / 1000) * 100);
  const color = score >= 800 ? '#10b981' : score >= 600 ? '#004ac6' : score >= 400 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center gap-1.5 group cursor-pointer" onClick={onClick}>
      <div
        className={`text-[9px] font-black transition-all ${isActive ? 'text-primary scale-110' : 'text-transparent group-hover:text-on-surface-variant'}`}
        style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
      >
        {score}
      </div>
      <div className="relative flex items-end" style={{ height: 72, width: 20 }}>
        <div className="absolute inset-x-0 bottom-0 rounded-t-md bg-surface-container-high" style={{ height: '100%' }}></div>
        <div
          className={`relative w-full rounded-t-md transition-all duration-700 ease-out ${isActive ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
          style={{ height: `${pct}%`, background: color }}
        ></div>
      </div>
      <span className="text-[8px] font-bold text-on-surface-variant rotate-45 origin-left" style={{ whiteSpace: 'nowrap' }}>
        {new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
      </span>
    </div>
  );
};

// ─── Circular progress ───────────────────────────────────────────────────────
const CircleProgress: React.FC<{ value: number; max: number; color: string; size?: number; strokeWidth?: number }> = ({
  value, max, color, size = 80, strokeWidth = 7
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct)}
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
    </svg>
  );
};

// ─── Calendar Component ───────────────────────────────────────────────────────
const EssayCalendar: React.FC<{ history: SavedEssay[] }> = ({ history }) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0=sun

  // Collect essay dates as Set of day numbers
  const essayDays = useMemo(() => {
    const days = new Set<number>();
    history.forEach(e => {
      const d = new Date(e.data_envio);
      if (d.getFullYear() === year && d.getMonth() === month) {
        days.add(d.getDate());
      }
    });
    return days;
  }, [history, year, month]);

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthName = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-black text-on-surface text-sm capitalize">{monthName}</h4>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
          <span className="text-[10px] font-bold text-on-surface-variant">Redação enviada</span>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-2">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[9px] font-black text-slate-300 uppercase tracking-wider py-1">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-1">
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map(day => {
          const hasEssay = essayDays.has(day);
          const isToday = day === today.getDate();
          return (
            <div
              key={day}
              className={`relative aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all
                ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                ${hasEssay ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-on-surface-variant hover:bg-gray-50'}`}
            >
              {hasEssay && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full flex items-center justify-center border border-white">
                  <span className="material-icons-outlined text-white" style={{ fontSize: 8 }}>check</span>
                </span>
              )}
              {day}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t ghost-border flex items-center justify-between">
        <p className="text-xs font-bold text-on-surface-variant">{essayDays.size} redaç{essayDays.size === 1 ? 'ão' : 'ões'} este mês</p>
        {essayDays.size >= 7 && (
          <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-full">🏆 Streak!</span>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PerformanceView: React.FC<PerformanceViewProps> = ({ userId, isDemo }) => {
  const [stats, setStats] = useState<any>({
    totalEssays: 0, averageScore: 0, totalPoints: 0,
    history: [] as SavedEssay[], competencyAverages: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedEssay, setSelectedEssay] = useState<SavedEssay | null>(null);
  const [activeBarIdx, setActiveBarIdx] = useState<number | null>(null);
  const [barsVisible, setBarsVisible] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const targetId = userId || 'demo';
        const data = await getUserStats(targetId);
        setStats(data);
        setTimeout(() => setBarsVisible(true), 400);
      } catch (err) {
        console.warn('Erro ao carregar stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, isDemo]);

  const currentRank = useMemo(() => calculateUserRank(stats.totalEssays), [stats.totalEssays]);
  const hasData = stats.totalEssays > 0;

  // Ranking position from peer data
  const myPoints = stats.totalPoints || 0;
  const rankPosition = useMemo(() => {
    const allPoints = peerRankings.map(p => p.points);
    return allPoints.filter(p => p > myPoints).length + 1;
  }, [myPoints]);

  // Last 10 essays for chart
  const chartHistory = useMemo(() => [...stats.history].reverse().slice(0, 12), [stats.history]);

  // Sorted history for list
  const sortedHistory = useMemo(() => stats.history, [stats.history]);
  const totalPages = Math.ceil(sortedHistory.length / ITEMS_PER_PAGE);
  const currentHistory = sortedHistory.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE);

  // Best and worst scores
  const bestScore = hasData ? Math.max(...stats.history.map((h: SavedEssay) => h.score)) : 0;
  const latestScore = hasData ? stats.history[0]?.score || 0 : 0;
  const latestDelta = stats.history.length >= 2
    ? latestScore - (stats.history[1]?.score || 0)
    : 0;

  // Tier progress
  const tierIdx = JOURNEY_TIERS.findIndex(t => t.label === currentRank.label);
  const nextTier = JOURNEY_TIERS[tierIdx + 1];
  const tierPrev = JOURNEY_TIERS[tierIdx - 1];
  const tierMin = currentRank.min;
  const tierMax = currentRank.next || currentRank.max;
  const tierProgress = Math.min(Math.round(((stats.totalEssays - tierMin) / ((tierMax - tierMin) || 1)) * 100), 100);

  if (selectedEssay?.result) {
    return (
      <div className="animate-fade-in">
        <CorrectionResultView result={selectedEssay.result} onBack={() => setSelectedEssay(null)} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-gray-100 dark:border-slate-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-on-surface-variant font-bold animate-pulse text-xs uppercase tracking-[0.2em]">Carregando evolução...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-24 max-w-7xl mx-auto">

      {/* ── Page Header ── */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-icons-outlined text-primary text-base">insights</span>
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-primary">Painel do Aluno</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-on-surface tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
            Minha <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Evolução</span>
          </h1>
        </div>
        {!isDemo && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Dados em Tempo Real
          </div>
        )}
      </div>

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

        {/* Card: Nota Atual */}
        <div className="bg-surface-container-lowest rounded-card p-5 ghost-border shadow-ambient relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3">Última Nota</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-on-surface" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>{latestScore}</span>
            <span className={`text-xs font-black mb-1 ${latestDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {latestDelta !== 0 && (latestDelta > 0 ? '↑' : '↓')}{Math.abs(latestDelta)}
            </span>
          </div>
          <p className="text-[10px] text-on-surface-variant font-medium mt-1">de 1000 pontos</p>
        </div>

        {/* Card: Média */}
        <div className="bg-surface-container-lowest rounded-card p-5 ghost-border shadow-ambient relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none"></div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3">Média Geral</p>
          <span className="text-4xl font-black text-on-surface" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>{stats.averageScore}</span>
          <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${(stats.averageScore / 1000) * 100}%` }}></div>
          </div>
        </div>

        {/* Card: Redações */}
        <div className="bg-surface-container-lowest rounded-card p-5 ghost-border shadow-ambient relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none"></div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3">Redações</p>
          <span className="text-4xl font-black text-on-surface" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>{stats.totalEssays}</span>
          <p className="text-[10px] text-on-surface-variant font-medium mt-1">enviadas</p>
        </div>

        {/* Card: Ranking */}
        <div className="bg-on-surface rounded-card p-5 border border-white/5 shadow-ambient relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 text-white/5 text-[5rem] leading-none font-black select-none" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            #{rankPosition}
          </div>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3">Ranking</p>
          <span className="text-4xl font-black text-white" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>#{rankPosition}</span>
          <p className="text-[10px] text-on-surface-variant font-medium mt-1">posição global</p>
        </div>
      </div>

      {/* ── Row 2: Chart + Calendar + Rank Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Evolution Chart (2/3 width) */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-card p-6 ghost-border shadow-ambient">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-on-surface text-base">Gráfico de Evolução</h3>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">Últimas {chartHistory.length} redações</p>
            </div>
            {hasData && (
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                <span className="material-icons-outlined" style={{ fontSize: 14 }}>trending_up</span>
                Melhor: {bestScore}
              </div>
            )}
          </div>

          {hasData ? (
            <div className="overflow-x-auto pb-2">
              <div className="flex items-end gap-2" style={{ minWidth: chartHistory.length * 36 }}>
                {chartHistory.map((essay, i) => (
                  <ScoreBar
                    key={essay.id}
                    score={essay.score}
                    max={1000}
                    date={essay.data_envio}
                    isActive={activeBarIdx === i}
                    onClick={() => setActiveBarIdx(activeBarIdx === i ? null : i)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-icons-outlined text-slate-200 text-5xl mb-3">bar_chart</span>
              <p className="text-sm font-bold text-on-surface-variant">Faça sua primeira redação para ver seu gráfico de evolução</p>
            </div>
          )}

          {/* Selected bar detail */}
          {activeBarIdx !== null && chartHistory[activeBarIdx] && (
            <div className="mt-4 p-4 bg-surface-container-low rounded-xl border ghost-border animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-on-surface line-clamp-1">{chartHistory[activeBarIdx].tema}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{new Date(chartHistory[activeBarIdx].data_envio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-2xl text-on-surface">{chartHistory[activeBarIdx].score}</p>
                  <p className="text-[10px] text-on-surface-variant font-medium">pontos</p>
                </div>
              </div>
              {chartHistory[activeBarIdx].result && (
                <button
                  onClick={() => setSelectedEssay(chartHistory[activeBarIdx])}
                  className="mt-3 w-full py-2 text-xs font-black text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors uppercase tracking-wider"
                >
                  Ver correção completa →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Calendar (1/3) */}
        <div className="bg-surface-container-lowest rounded-card p-6 ghost-border shadow-ambient">
          <EssayCalendar history={stats.history} />
        </div>
      </div>

      {/* ── Row 3: Competency Radar + Rank Progress + History ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column: Competencies + Rank progression */}
        <div className="space-y-6">

          {/* Rank card */}
          <div className="bg-surface-container-lowest rounded-card p-6 ghost-border shadow-ambient">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-on-surface text-sm">Nível de Escritor</h3>
              <div className={`w-10 h-10 ${currentRank.bg} ${currentRank.color} rounded-xl flex items-center justify-center`}>
                <span className="material-icons-outlined text-lg">{currentRank.icon}</span>
              </div>
            </div>

            {/* Tier road */}
            <div className="space-y-2 mb-5">
              {JOURNEY_TIERS.map((tier, i) => {
                const isCurrent = tier.label === currentRank.label;
                const isPast = i < tierIdx;
                return (
                  <div key={tier.label} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${isCurrent ? 'bg-primary/5 border border-primary/20' : ''}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isPast ? 'bg-emerald-500' : isCurrent ? 'bg-primary' : 'bg-surface-container-high'}`}>
                      {isPast ? (
                        <span className="material-icons-outlined text-white" style={{ fontSize: 12 }}>check</span>
                      ) : isCurrent ? (
                        <span className="w-2 h-2 bg-white rounded-full"></span>
                      ) : null}
                    </div>
                    <span className={`text-xs font-bold ${isCurrent ? 'text-primary' : isPast ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-600'}`}>
                      {tier.label}
                    </span>
                    {isCurrent && (
                      <span className="ml-auto text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">ATUAL</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress to next */}
            {nextTier && (
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-on-surface-variant">Progresso</span>
                  <span className="text-primary">{tierProgress}%</span>
                </div>
                <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: barsVisible ? `${tierProgress}%` : '0%' }}
                  ></div>
                </div>
                <p className="text-[10px] text-on-surface-variant mt-2 font-medium">
                  {nextTier.min - stats.totalEssays} redações para {nextTier.label}
                </p>
              </div>
            )}
          </div>

          {/* Competencies */}
          <div className="bg-surface-container-lowest rounded-card p-6 ghost-border shadow-ambient">
            <h3 className="font-black text-on-surface text-sm mb-5">Competências ENEM</h3>
            <div className="space-y-4">
              {stats.competencyAverages.length > 0 ? stats.competencyAverages.map((comp: any, i: number) => {
                const pct = Math.round((comp.average / 200) * 100);
                const color = comp.average >= 160 ? '#10b981' : comp.average >= 120 ? '#004ac6' : '#f59e0b';
                const cLabel = `C${i + 1}`;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <CircleProgress value={comp.average} max={200} color={color} size={32} strokeWidth={3} />
                        <span className="text-xs font-bold text-on-surface-variant truncate max-w-[120px]">{cLabel}. {comp.name}</span>
                      </div>
                      <span className="font-black text-sm" style={{ color }}>{comp.average}<span className="text-slate-300 font-medium text-xs">/200</span></span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: barsVisible ? `${pct}%` : '0%', background: color, transitionDelay: `${i * 80}ms` }}
                      ></div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8">
                  <span className="material-icons-outlined text-slate-200 text-3xl mb-2">radar</span>
                  <p className="text-xs text-on-surface-variant font-medium">Dados disponíveis após sua primeira redação</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Essay history list (2/3 width) */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-card ghost-border shadow-ambient flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b ghost-border flex items-center justify-between">
            <div>
              <h3 className="font-black text-on-surface">Histórico de Redações</h3>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">{stats.totalEssays} no total</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black text-on-surface-variant uppercase tracking-wider">
              <span>Nota</span>
              <span className="hidden md:inline">Data</span>
              <span></span>
            </div>
          </div>

          <div className="flex-1 divide-y ">
            {hasData ? currentHistory.map((essay: SavedEssay, idx: number) => {
              const scoreColor = essay.score >= 800 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : essay.score >= 600 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : essay.score >= 400 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400';
              return (
                <div
                  key={essay.id}
                  onClick={() => essay.result && setSelectedEssay(essay)}
                  className={`group flex items-center gap-4 px-6 py-4 hover:bg-surface-container-low transition-colors ${essay.result ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {/* Rank number */}
                  <span className="text-xs font-black text-slate-300 dark:text-slate-600 w-5 shrink-0">
                    {(historyPage - 1) * ITEMS_PER_PAGE + idx + 1}
                  </span>

                  {/* Score badge */}
                  <div className={`w-14 h-14 shrink-0 rounded-2xl flex flex-col items-center justify-center font-black ${scoreColor}`}>
                    <span className="text-lg leading-none">{essay.score}</span>
                    <span className="text-[9px] font-bold opacity-70 mt-0.5">pts</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-on-surface line-clamp-1 group-hover:text-primary transition-colors">{essay.tema}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-on-surface-variant">
                        {new Date(essay.data_envio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {essay.result && (
                        <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full">Corrigida</span>
                      )}
                    </div>
                  </div>

                  {/* Competency mini bars */}
                  {essay.result?.competencies && (
                    <div className="hidden md:flex items-end gap-0.5 h-8">
                      {essay.result.competencies.map((c, ci) => (
                        <div key={ci} className="w-3 rounded-sm bg-gray-100 dark:bg-slate-700 relative overflow-hidden" style={{ height: 32 }}>
                          <div
                            className="absolute bottom-0 w-full rounded-sm"
                            style={{
                              height: `${(c.score / 200) * 100}%`,
                              background: c.score >= 160 ? '#10b981' : c.score >= 120 ? '#004ac6' : '#f59e0b'
                            }}
                          ></div>
                        </div>
                      ))}
                    </div>
                  )}

                  <span className="material-icons-outlined text-on-surface-variant/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all text-xl shrink-0">
                    chevron_right
                  </span>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-20 h-20 bg-primary/5 rounded-card flex items-center justify-center mx-auto mb-5">
                  <span className="material-icons-outlined text-primary text-4xl">history_edu</span>
                </div>
                <h4 className="font-black text-on-surface text-lg mb-2 tracking-tight">Nenhuma redação ainda</h4>
                <p className="text-sm text-on-surface-variant max-w-xs leading-relaxed">
                  Escreva sua primeira redação na aba "Praticar" para começar a acompanhar sua evolução aqui.
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t ghost-border flex items-center justify-between">
              <button
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-on-surface-variant hover:text-primary disabled:opacity-30 transition-colors rounded-xl hover:bg-gray-50"
              >
                <span className="material-icons-outlined text-sm">chevron_left</span>
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setHistoryPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${p === historyPage ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-gray-100'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                disabled={historyPage === totalPages}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-on-surface-variant hover:text-primary disabled:opacity-30 transition-colors rounded-xl hover:bg-gray-50"
              >
                Próximo
                <span className="material-icons-outlined text-sm">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceView;
