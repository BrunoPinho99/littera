
import React, { useEffect, useState, useMemo } from 'react';
import { getUserStats, calculateUserRank } from '../services/databaseService';
import { SavedEssay } from '../types';
import CorrectionResultView from './CorrectionResult';

interface PerformanceViewProps {
  userId?: string;
  isDemo?: boolean;
}

const ITEMS_PER_PAGE = 5;


// --- Custom Charts ---
const RadarChart = ({ stats }: { stats: any }) => {
  if (!stats || !stats.competencyAverages || stats.competencyAverages.length === 0) {
    return <div className="text-center py-10 text-slate-400">Sem dados suficientes.</div>;
  }

  const size = 240;
  const center = size / 2;
  const radius = (size / 2) - 40; // 80px

  const axes = [
    { key: "Gramática", label: "Gramática" },
    { key: "Coesão", label: "Coesão" },
    { key: "Argumentação", label: "Argumentação" },
    { key: "Vocabulário", label: "Vocabulário" },
    { key: "Estrutura", label: "Estrutura" },
    { key: "Repertório", label: "Repertório" }
  ];

  const getAverage = (name) => {
     const found = stats.competencyAverages.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
     return found ? found.average : 100;
  };

  const getScoreOut10 = (val) => (val / 20).toFixed(1);

  const polygonPoints = axes.map((axis, i) => {
    const angle = (Math.PI / 3) * i - (Math.PI / 2);
    const val = getAverage(axis.key); 
    const r = (val / 200) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(" ");

  const bgPolygons = [1, 0.8, 0.6, 0.4, 0.2].map(scale => {
    return axes.map((_, i) => {
      const angle = (Math.PI / 3) * i - (Math.PI / 2);
      const r = radius * scale;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(" ");
  });

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[250px] relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* BG Polygons */}
        {bgPolygons.map((pts, i) => (
          <polygon key={i} points={pts} fill={i === 0 ? "#F8FAFC" : "none"} stroke="#E2E8F0" strokeWidth="1" />
        ))}
        {/* Axis lines */}
        {axes.map((_, i) => {
          const angle = (Math.PI / 3) * i - (Math.PI / 2);
          return (
            <line 
              key={`line-${i}`}
              x1={center} y1={center} 
              x2={center + radius * Math.cos(angle)} 
              y2={center + radius * Math.sin(angle)} 
              stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4"
            />
          );
        })}
        {/* Data Polygon */}
        <polygon 
          points={polygonPoints} 
          fill="rgba(59, 130, 246, 0.6)" 
          stroke="#2563EB" 
          strokeWidth="2" 
        />
        {/* Labels */}
        {axes.map((axis, i) => {
          const angle = (Math.PI / 3) * i - (Math.PI / 2);
          const r = radius + 25;
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle);
          const val = getAverage(axis.key);
          return (
            <text key={`label-${i}`} x={x} y={y} fontSize="11" fontWeight="600" fill="#1E293B" textAnchor="middle" dominantBaseline="middle">
              <tspan x={x} dy="-0.4em">{axis.label}</tspan>
              <tspan x={x} dy="1.4em" fill="#64748B" fontSize="10">({getScoreOut10(val)})</tspan> 
            </text>
          );
        })}
      </svg>
    </div>
  );
};

const LineChart = ({ history }: { history: any[] }) => {
  if (!history || history.length < 2) {
    return (
      <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
        Faça pelo menos 2 redações para ver o gráfico.
      </div>
    );
  }

  const sorted = [...history].sort((a,b) => new Date(a.data_envio).getTime() - new Date(b.data_envio).getTime()).slice(-6); // last 6
  
  const width = 300;
  const height = 180;
  const padding = 20;
  const bottomPadding = 40;
  const leftPadding = 30;

  const minScore = 600; // 6.0
  const maxScore = 1000; // 10.0

  const getX = (index) => leftPadding + (index * ((width - leftPadding - padding) / Math.max(1, sorted.length - 1)));
  const getY = (score) => height - bottomPadding - (((score - minScore) / (maxScore - minScore)) * (height - bottomPadding - padding));

  const pathD = sorted.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.score)}`).join(" ");
  const areaD = `${pathD} L ${getX(sorted.length - 1)} ${height - bottomPadding} L ${getX(0)} ${height - bottomPadding} Z`;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="flex flex-col items-center justify-center w-full mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-w-full overflow-visible">
        <defs>
          <linearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.0)" />
          </linearGradient>
        </defs>
        
        {/* Y Axis Grid */}
        {[6.0, 6.5, 7.0, 7.5, 8.0, 8.5].map((val) => {
          const y = getY(val * 100);
          return (
            <g key={val}>
              <line x1={leftPadding} y1={y} x2={width - padding} y2={y} stroke="#F1F5F9" strokeWidth="1" />
              <text x={leftPadding - 8} y={y} fontSize="10" fill="#94A3B8" textAnchor="end" dominantBaseline="middle">{val.toFixed(1)}</text>
            </g>
          );
        })}

        {/* Data Area */}
        <path d={areaD} fill="url(#gradientFill)" />
        
        {/* Data Line */}
        <path d={pathD} fill="none" stroke="#3B82F6" strokeWidth="2" />

        {/* Dots & Values */}
        {sorted.map((d, i) => (
          <g key={i}>
            <text x={getX(i)} y={getY(d.score) - 10} fontSize="10" fontWeight="bold" fill="#334155" textAnchor="middle">
              {(d.score / 100).toFixed(1)}
            </text>
            <circle cx={getX(i)} cy={getY(d.score)} r="4" fill="#3B82F6" stroke="#fff" strokeWidth="2" />
            <text x={getX(i)} y={height - bottomPadding + 15} fontSize="10" fill="#64748B" textAnchor="middle">
              {months[new Date(d.data_envio).getMonth()]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};


const PerformanceView: React.FC<PerformanceViewProps> = ({ userId, isDemo }) => {
  const [stats, setStats] = useState<any>({
    totalEssays: 0,
    averageScore: 0,
    totalPoints: 0,
    history: [] as SavedEssay[],
    competencyAverages: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedEssay, setSelectedEssay] = useState<SavedEssay | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Garante que se for demo ou undefined, usa 'demo' para buscar no localStorage correto
        const targetId = userId || 'demo';
        const data = await getUserStats(targetId);
        setStats(data);
      } catch (err: any) {
        console.warn("Erro ao carregar estatísticas:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, isDemo]);

  const currentRank = useMemo(() => calculateUserRank(stats.totalEssays), [stats.totalEssays]);

  // Histórico já vem ordenado do service, mas garantimos aqui
  const sortedHistory = useMemo(() => stats.history, [stats.history]);
  
  const historyTotalPages = Math.ceil(sortedHistory.length / ITEMS_PER_PAGE);
  const currentHistory = sortedHistory.slice(
    (historyPage - 1) * ITEMS_PER_PAGE,
    historyPage * ITEMS_PER_PAGE
  );

  if (selectedEssay && selectedEssay.result) {
    return (
      <div className="animate-fade-in">
        <button 
          onClick={() => setSelectedEssay(null)}
          className="mb-8 px-6 py-3 bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
        >
          <span className="material-icons-outlined text-lg">arrow_back</span>
          Voltar para Visão Geral
        </button>
        <CorrectionResultView 
          result={selectedEssay.result} 
          onBack={() => setSelectedEssay(null)} 
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6">
        <div className="relative w-20 h-20">
           <div className="absolute inset-0 border-4 border-gray-100 dark:border-slate-800 rounded-full"></div>
           <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-slate-400 font-bold animate-pulse text-xs uppercase tracking-[0.2em]">Sincronizando Dados...</p>
      </div>
    );
  }

  const hasData = stats.totalEssays > 0;

  
  return (
    <div className="animate-fade-in pb-20 max-w-6xl mx-auto px-6 font-display pt-8">
      
      {/* Header */}
      <div className="mb-10 flex flex-col gap-2">
         <div className="flex items-center gap-2 mb-2">
           <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
             <span className="material-icons-outlined text-sm">insights</span>
           </div>
           <span className="text-[11px] font-black uppercase tracking-widest text-[#1E293B]">Analytics</span>
         </div>
         <h1 className="text-4xl md:text-[42px] font-extrabold text-slate-900 dark:text-white tracking-tight">
           Sua <span className="text-blue-600">Evolução</span> Analítica
         </h1>
      </div>

      {/* Top 2 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        
        {/* Left Card: Nível Atual */}
        <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between min-h-[260px] relative">
          <div className="flex justify-between items-start mb-10">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Nível Atual</p>
              <h2 className="text-4xl font-black text-blue-600 tracking-tight">{currentRank.label}</h2>
            </div>
            <button className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors flex items-center justify-center">
              <span className="material-icons-outlined text-sm">edit</span>
            </button>
          </div>
          
          <div>
            <div className="flex justify-between items-end mb-3">
              <span className="text-sm font-semibold text-slate-600">
                {currentRank.next ? `Próximo: Nível ${currentRank.next}` : 'Nível Máximo'}
              </span>
              <span className="text-2xl font-black text-blue-600">
                {Math.round(Math.min((stats.totalEssays / (currentRank.next || 100)) * 100, 100))}%
              </span>
            </div>
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-[3px]">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min((stats.totalEssays / (currentRank.next || 100)) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-[13px] text-slate-500 font-medium mt-4">
              {currentRank.next 
                ? `Escreva mais ${currentRank.next - stats.totalEssays} redações para evoluir.` 
                : 'Você alcançou o topo da jornada!'}
            </p>
          </div>
        </div>

        {/* Right Card: Stats & Insight */}
        <div className="bg-[#2B3A55] rounded-[2rem] p-8 shadow-lg flex flex-col justify-between min-h-[260px] text-white">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#384865] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <span className="material-icons-outlined text-white/70 text-2xl mb-2">stars</span>
              <h3 className="text-[40px] font-black leading-none mb-2">{(stats.averageScore / 100).toFixed(1)}</h3>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Média Geral</p>
            </div>
            <div className="bg-[#384865] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <span className="material-icons-outlined text-white/70 text-2xl mb-2">history_edu</span>
              <h3 className="text-[40px] font-black leading-none mb-2">{stats.totalEssays}</h3>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Redações</p>
            </div>
          </div>
          <div className="bg-[#1E293B] rounded-2xl p-5 border border-white/5">
             <div className="flex items-center gap-2 mb-2">
                <span className="material-icons-outlined text-blue-400 text-[18px]">auto_awesome</span>
                <h4 className="text-[11px] font-black uppercase tracking-widest text-[#93C5FD]">Insight Direcionado</h4>
             </div>
             <p className="text-[14px] text-blue-100/80 leading-snug">
                {hasData 
                  ? "Sua consistência melhorou em 15% na última semana. Foque na Coesão para alcançar a próxima etapa!"
                  : "Comece a praticar para receber insights automatizados."}
             </p>
          </div>
        </div>

      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Radar Chart */}
        <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col h-full">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Radar de Competências</h3>
          <div className="flex-1 flex items-center justify-center">
             <RadarChart stats={stats} />
          </div>
        </div>

        {/* Line Chart */}
        <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col h-full">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Evolução da Pontuação de Escrita</h3>
          <div className="flex-1 flex items-center justify-center">
             <LineChart history={stats.history} />
          </div>
        </div>

        {/* History List */}
        <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 md:col-span-2">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Histórico Recente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {hasData ? currentHistory.map((essay) => (
               <div 
                 key={essay.id}
                 onClick={() => essay.result && setSelectedEssay(essay)}
                 className="flex flex-col p-5 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md cursor-pointer transition-all bg-slate-50/50 hover:bg-white"
               >
                 <div className="flex justify-between items-start mb-2">
                   <h4 className="font-bold text-slate-800 text-sm line-clamp-2 pr-4">{essay.tema}</h4>
                   <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                     {new Date(essay.data_envio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                   </span>
                 </div>
                 <p className="text-[13px] font-semibold text-slate-500 mt-auto pt-2">
                   (Score: {(essay.score / 100).toFixed(1)})
                 </p>
               </div>
             )) : (
               <div className="text-center py-8 col-span-full">
                 <p className="text-sm text-slate-500">Nenhuma redação encontrada.</p>
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );

};

export default PerformanceView;
