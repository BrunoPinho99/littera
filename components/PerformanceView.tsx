
import React, { useEffect, useState, useMemo } from 'react';
import { getUserStats, calculateUserRank } from '../services/databaseService';
import { SavedEssay } from '../types';
import CorrectionResultView from './CorrectionResult';

interface PerformanceViewProps {
  userId?: string;
  isDemo?: boolean;
}

const ITEMS_PER_PAGE = 5;

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
    <div className="animate-fade-in pb-20 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-3 mb-3">
             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
               <span className="material-icons-outlined">insights</span>
             </div>
             <span className="text-xs font-black uppercase tracking-widest text-primary">Analytics</span>
           </div>
           <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
             Sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Evolução</span>
           </h1>
        </div>
        {!isDemo && (
          <div className="px-4 py-2 bg-green-500/10 text-green-600 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Dados em Tempo Real
          </div>
        )}
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Card 1: Main Rank (Large) */}
        <div className="col-span-1 md:col-span-2 row-span-2 bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-card relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors duration-700"></div>
           
           <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nível Atual</p>
                    <h2 className={`text-3xl font-black ${currentRank.color}`}>{currentRank.label}</h2>
                 </div>
                 <div className={`w-16 h-16 ${currentRank.bg} ${currentRank.color} rounded-2xl flex items-center justify-center shadow-inner`}>
                    <span className="material-icons-outlined text-3xl">{currentRank.icon}</span>
                 </div>
              </div>

              <div className="mt-8">
                 <div className="flex justify-between items-end mb-3">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                       {currentRank.next ? `Próximo: Nível ${currentRank.next}` : 'Nível Máximo'}
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                       {Math.round(Math.min((stats.totalEssays / (currentRank.next || 100)) * 100, 100))}%
                    </span>
                 </div>
                 <div className="w-full h-4 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden p-1">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-purple-400 rounded-full shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min((stats.totalEssays / (currentRank.next || 100)) * 100, 100)}%` }}
                    ></div>
                 </div>
                 <p className="text-xs text-slate-400 font-medium mt-3">
                   {currentRank.next 
                     ? `Escreva mais ${currentRank.next - stats.totalEssays} redações para evoluir.` 
                     : 'Você alcançou o topo da jornada!'}
                 </p>
              </div>
           </div>
        </div>

        {/* Card 2: Average Score */}
        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-6 border border-gray-100 dark:border-white/5 shadow-card flex flex-col justify-center items-center text-center relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent"></div>
           <div className="relative z-10">
              <span className="material-icons-outlined text-amber-500 text-3xl mb-2">stars</span>
              <h3 className="text-4xl font-black text-slate-900 dark:text-white mb-1">{stats.averageScore}</h3>
              <p className="text-[10px] font-black text-amber-600/80 uppercase tracking-widest">Média Geral</p>
           </div>
        </div>

        {/* Card 3: Total Essays */}
        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-6 border border-gray-100 dark:border-white/5 shadow-card flex flex-col justify-center items-center text-center relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
           <div className="relative z-10">
              <span className="material-icons-outlined text-primary text-3xl mb-2">history_edu</span>
              <h3 className="text-4xl font-black text-slate-900 dark:text-white mb-1">{stats.totalEssays}</h3>
              <p className="text-[10px] font-black text-primary/80 uppercase tracking-widest">Redações</p>
           </div>
        </div>

        {/* Card 4: AI Insight (Span 2) */}
        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[2.5rem] p-8 border border-white/10 shadow-premium relative overflow-hidden">
           <span className="material-icons-outlined absolute -right-6 -bottom-6 text-white/5 text-[10rem]">psychology</span>
           <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                 <span className="material-icons-outlined text-purple-400">auto_awesome</span>
                 <h3 className="text-sm font-black uppercase tracking-widest text-purple-200">Insight da IA</h3>
              </div>
              <p className="text-lg font-medium leading-relaxed text-slate-200 max-w-md">
                 {hasData 
                   ? `Sua nota máxima de ${Math.max(...stats.history.map((h: any) => h.score))} indica domínio da estrutura. Foque na Competência 3 (Argumentação) para consistência.`
                   : "Ainda estamos coletando dados para gerar insights personalizados. Comece sua primeira redação!"}
              </p>
           </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Competencies Chart */}
         <div className="lg:col-span-1 bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-card">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6">Radar de Competências</h3>
            <div className="space-y-5">
               {stats.competencyAverages.length > 0 ? stats.competencyAverages.map((comp: any, i: number) => (
                  <div key={i}>
                     <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{comp.name}</span>
                        <span className={comp.average >= 160 ? 'text-green-500' : 'text-amber-500'}>{comp.average}</span>
                     </div>
                     <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                           className={`h-full rounded-full ${comp.average >= 160 ? 'bg-green-500' : 'bg-amber-400'}`}
                           style={{ width: `${(comp.average / 200) * 100}%` }}
                        ></div>
                     </div>
                  </div>
               )) : (
                  <p className="text-sm text-slate-400 text-center py-10">Sem dados suficientes.</p>
               )}
            </div>
         </div>

         {/* History List */}
         <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-card flex flex-col">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-black text-slate-900 dark:text-white">Histórico Recente</h3>
            </div>
            
            <div className="space-y-3 flex-1">
               {hasData ? currentHistory.map((essay: SavedEssay) => (
                  <div 
                    key={essay.id}
                    onClick={() => essay.result && setSelectedEssay(essay)}
                    className="group flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-gray-200 dark:hover:border-slate-700 hover:shadow-md transition-all cursor-pointer"
                  >
                     <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm ${essay.score >= 800 ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                           {essay.score}
                        </div>
                        <div>
                           <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1 group-hover:text-primary transition-colors">{essay.tema}</h4>
                           <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {new Date(essay.data_envio).toLocaleDateString()}
                           </p>
                        </div>
                     </div>
                     <span className="material-icons-outlined text-gray-300 group-hover:translate-x-1 transition-transform">chevron_right</span>
                  </div>
               )) : (
                  <div className="text-center py-12">
                     <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                        <span className="material-icons-outlined text-2xl">edit_off</span>
                     </div>
                     <p className="text-sm text-slate-500">Nenhuma redação encontrada.</p>
                  </div>
               )}
            </div>

            {/* Pagination Controls */}
            {historyTotalPages > 1 && (
               <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <button 
                     onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                     disabled={historyPage === 1}
                     className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                  >
                     <span className="material-icons-outlined text-sm">chevron_left</span>
                  </button>
                  <span className="text-xs font-bold text-gray-400">
                     {historyPage} / {historyTotalPages}
                  </span>
                  <button 
                     onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                     disabled={historyPage === historyTotalPages}
                     className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                  >
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
