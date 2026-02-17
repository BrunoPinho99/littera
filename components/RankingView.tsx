
import React, { useState, useMemo, useEffect } from 'react';
import { peerRankings } from '../data/rankingData';
import { getUserStats } from '../services/databaseService';
import { RankUser } from '../types';
import { supabase } from '../supabaseClient';

interface RankingViewProps {
  showAllEntries?: boolean; // Prop para visão institucional (Professor)
  manualData?: RankUser[]; // Dados vindos do Dashboard Institucional
}

const ITEMS_PER_PAGE = 10;

const RankingView: React.FC<RankingViewProps> = ({ showAllEntries = false, manualData }) => {
  const [filter, setFilter] = useState<'global' | 'school' | 'class'>('global');
  const [userStats, setUserStats] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadData = async () => {
      if (manualData) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setCurrentUser(session.user);
        const stats = await getUserStats(session.user.id);
        setUserStats(stats);
      }
      setIsLoading(false);
    };
    loadData();
  }, [manualData]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const fullRanking = useMemo(() => {
    // Se houver dados manuais (Professor), ignoramos mocks e o "Eu" do professor
    if (manualData) {
      return [...manualData].sort((a, b) => b.points - a.points);
    }

    // Lógica para Aluno: Criar objeto do usuário atual com dados reais
    const me: RankUser = {
      id: currentUser?.id || "me",
      name: currentUser?.user_metadata?.full_name || "Você",
      avatar: currentUser?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=Voce&background=8B5CF6&color=fff`,
      points: userStats?.history?.reduce((acc: number, curr: any) => acc + curr.score, 0) || 0,
      essaysCount: userStats?.totalEssays || 0,
      school: currentUser?.user_metadata?.school || "Colégio Aplicação",
      className: currentUser?.user_metadata?.class_name || "3º Ano A",
      isCurrentUser: true,
      trend: 'neutral'
    };

    // Combinar com os "Peers" simulados
    let list = [me, ...peerRankings];

    // Aplicar Filtros de Contexto (Escola/Turma)
    if (filter === 'school') {
      list = list.filter(u => u.school === me.school);
    } else if (filter === 'class') {
      list = list.filter(u => u.school === me.school && u.className === me.className);
    }

    // Ordenar por pontos
    return list.sort((a, b) => b.points - a.points);
  }, [filter, userStats, currentUser, manualData]);

  // Visibilidade: Professor vê tudo; Aluno vê Top 3 + Ele mesmo (na lógica original)
  // Com paginação, vamos mostrar a lista paginada para facilitar a visualização
  const visibleList = useMemo(() => {
    if (showAllEntries || manualData) return fullRanking;
    return fullRanking; // Mostra todos para permitir paginação
  }, [fullRanking, showAllEntries, manualData]);

  const totalPages = Math.ceil(visibleList.length / ITEMS_PER_PAGE);
  const currentItems = visibleList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const topThree = fullRanking.slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-bold animate-pulse uppercase tracking-widest text-xs">Calculando Posições...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-20 px-4">
      {/* Header Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full mb-6">
          <span className="material-icons-outlined text-sm">military_tech</span>
          <span className="text-xs font-black uppercase tracking-widest">Temporada 2024</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter">
          Ranking de <span className="text-primary">Elite</span>
        </h1>
        
        {/* Filtros: Ocultar se estiver em visão manual/institucional pois o Dashboard já filtra */}
        {!manualData && (
          <div className="bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl inline-flex gap-1 shadow-inner mt-6">
            {(['global', 'school', 'class'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 uppercase tracking-tighter ${
                  filter === f 
                    ? 'bg-white dark:bg-slate-700 text-primary shadow-md scale-105' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {f === 'global' ? 'Brasil' : f === 'school' ? 'Minha Escola' : 'Minha Turma'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Podium Display (Apenas na primeira página e se não for lista filtrada vazia) */}
      {currentPage === 1 && topThree.length > 0 && (
        <div className="flex justify-center items-end gap-2 md:gap-6 mb-20 min-h-[360px]">
          {/* 2nd Place */}
          <div className="flex flex-col items-center group order-1">
            {topThree[1] && (
              <>
                <div className="relative mb-4">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-slate-200 p-1 bg-white shadow-xl group-hover:-translate-y-2 transition-transform duration-500">
                    <img src={topThree[1].avatar} className="w-full h-full object-cover rounded-full" alt="" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center border-2 border-white font-black text-slate-500 text-xs">2º</div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/50 w-24 md:w-36 h-32 rounded-t-[2rem] flex flex-col justify-end pb-6 items-center border-t-4 border-slate-300">
                  <p className="font-black text-[10px] md:text-xs text-gray-900 dark:text-white truncate w-full px-2 text-center">{topThree[1].name}</p>
                  <p className="text-primary font-black text-[10px]">{topThree[1].points} pts</p>
                </div>
              </>
            )}
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center group order-2 z-10">
            {topThree[0] && (
              <>
                <div className="relative mb-6">
                  <span className="material-icons-outlined text-amber-400 text-5xl absolute -top-14 left-1/2 -translate-x-1/2 animate-bounce">workspace_premium</span>
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-amber-400 p-1 bg-white shadow-2xl ring-8 ring-amber-400/5 group-hover:-translate-y-4 transition-transform duration-500">
                    <img src={topThree[0].avatar} className="w-full h-full object-cover rounded-full" alt="" />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-amber-400 text-white px-4 py-1.5 rounded-full font-black text-[9px] shadow-lg border-2 border-white whitespace-nowrap uppercase tracking-tighter">LÍDER ABSOLUTO</div>
                </div>
                <div className="bg-gradient-to-b from-amber-50 to-white dark:from-amber-900/10 dark:to-surface-dark w-32 md:w-48 h-48 rounded-t-[2.5rem] flex flex-col justify-end pb-8 items-center border-t-4 border-amber-400 shadow-xl">
                  <p className="font-black text-xs md:text-sm text-gray-900 dark:text-white truncate w-full px-4 text-center">{topThree[0].name}</p>
                  <p className="text-primary font-black text-xs">{topThree[0].points} pts</p>
                </div>
              </>
            )}
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center group order-3">
            {topThree[2] && (
              <>
                <div className="relative mb-4">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-amber-800/20 p-1 bg-white shadow-xl group-hover:-translate-y-2 transition-transform duration-500">
                    <img src={topThree[2].avatar} className="w-full h-full object-cover rounded-full" alt="" />
                  </div>
                  <div className="absolute -top-2 -left-2 w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center border-2 border-white font-black text-amber-800 text-xs">3º</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/5 w-24 md:w-36 h-24 rounded-t-[2rem] flex flex-col justify-end pb-6 items-center border-t-4 border-amber-700/20">
                  <p className="font-black text-[10px] md:text-xs text-gray-900 dark:text-white truncate w-full px-2 text-center">{topThree[2].name}</p>
                  <p className="text-primary font-black text-[10px]">{topThree[2].points} pts</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Full List Table */}
      <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] shadow-premium border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            Classificação {manualData ? 'Institucional' : filter === 'global' ? 'Brasil' : 'Focada'}
          </h3>
          <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase">
            {fullRanking.length} Alunos
          </span>
        </div>

        <div className="divide-y divide-gray-50 dark:divide-slate-800">
          {currentItems.map((user, idx) => {
            // Calcular o índice real baseado na página
            const realIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx;
            
            return (
              <div 
                key={user.id} 
                className={`flex items-center justify-between px-8 py-6 transition-colors hover:bg-gray-50/80 dark:hover:bg-slate-800/30 ${user.isCurrentUser ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-primary' : ''}`}
              >
                <div className="flex items-center gap-6">
                  <span className={`w-8 text-center font-black text-lg ${realIndex < 3 ? 'text-primary' : 'text-gray-300'}`}>{realIndex + 1}º</span>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img src={user.avatar} className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" alt="" />
                      {user.isCurrentUser && <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>}
                    </div>
                    <div>
                      <h4 className={`font-black text-sm ${user.isCurrentUser ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                        {user.name} {user.isCurrentUser && !showAllEntries && "(Você)"}
                      </h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{user.school} • {user.className}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-12">
                  <div className="hidden md:block text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Redações</p>
                    <p className="font-black text-gray-900 dark:text-white">{user.essaysCount}</p>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className="text-xl font-black text-gray-900 dark:text-white leading-none">{user.points}</p>
                    <p className="text-[9px] font-black text-primary uppercase tracking-tighter">Pontos</p>
                  </div>
                </div>
              </div>
            );
          })}
          {visibleList.length === 0 && (
            <div className="py-20 text-center text-gray-400 font-bold">Nenhum dado disponível.</div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-8 py-6 bg-gray-50/30 flex justify-center items-center gap-4">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all text-gray-500"
            >
              <span className="material-icons-outlined">chevron_left</span>
            </button>
            <span className="text-xs font-bold text-gray-500">
              Página {currentPage} de {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all text-gray-500"
            >
              <span className="material-icons-outlined">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingView;
