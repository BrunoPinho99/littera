import React, { useState, useEffect } from 'react';
import { Assignment } from '../types';

interface ChallengeBannerProps {
  assignments: Assignment[];
  onStartWriting: (assignment: Assignment) => void;
  forceShowId?: string | null;
  onClearForceShow?: () => void;
}

export const ChallengeBanner: React.FC<ChallengeBannerProps> = ({
  assignments,
  onStartWriting,
  forceShowId,
  onClearForceShow
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [selectedForModal, setSelectedForModal] = useState<Assignment | null>(null);

  // Filtrar apenas desafios válidos que têm título
  const validAssignments = (assignments || []).filter(a => Boolean(a && a.title));
  const currentAssignment = validAssignments[currentIndex] || null;

  // Efeito de cronômetro e expiração
  useEffect(() => {
    if (!currentAssignment || !currentAssignment.due_date) {
      setTimeRemaining(null);
      return;
    }

    const calculateTime = () => {
      const due = new Date(currentAssignment.due_date).getTime();
      const now = Date.now();
      const diff = due - now;
      setTimeRemaining(diff);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [currentAssignment]);

  // Checar se o desafio atual foi fechado pelo aluno (localStorage)
  useEffect(() => {
    if (currentAssignment) {
      if (forceShowId === currentAssignment.id) {
        setIsDismissed(false);
        setSelectedForModal(currentAssignment);
        if (onClearForceShow) onClearForceShow();
      } else {
        const dismissed = localStorage.getItem(`scritta_dismissed_challenge_${currentAssignment.id}`);
        setIsDismissed(dismissed === 'true');
      }
    }
  }, [currentAssignment, forceShowId]);

  if (!currentAssignment) return null;

  // REGRA DO USUÁRIO: "quando o tempo acabar a barra superior no painel do aluno precisa parar de aparecer"
  if (timeRemaining !== null && timeRemaining <= 0) {
    return null;
  }

  if (isDismissed && forceShowId !== currentAssignment.id) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(`scritta_dismissed_challenge_${currentAssignment.id}`, 'true');
  };

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d : ${String(hours).padStart(2, '0')}h : ${String(minutes).padStart(2, '0')}m : ${String(seconds).padStart(2, '0')}s`;
    }
    return `${String(hours).padStart(2, '0')}h : ${String(minutes).padStart(2, '0')}m : ${String(seconds).padStart(2, '0')}s`;
  };

  const formattedDueDate = currentAssignment.due_date
    ? new Date(currentAssignment.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Sem data limite';

  const textBase = currentAssignment.base_text || currentAssignment.description || 'Nenhum texto de apoio adicional fornecido.';

  return (
    <>
      {/* ═══ BARRA SUPERIOR DE DESAFIO ATIVO ═══ */}
      <div className="mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/15 via-purple-500/10 to-indigo-500/15 backdrop-blur-2xl border border-primary/30 p-5 sm:p-7 shadow-ambient transition-all duration-300 group hover:border-primary/50">
        {/* Glow de fundo animado */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Lado Esquerdo: Badge e Título */}
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-on-primary text-xs font-black tracking-wider uppercase shadow-sm">
                <span className="material-icons-outlined text-sm">emoji_events</span>
                Desafio do Professor
              </span>

              {validAssignments.length > 1 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-bold">
                  {currentIndex + 1} de {validAssignments.length}
                </span>
              )}

              {/* Relógio / Cronômetro */}
              {timeRemaining !== null ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold animate-pulse">
                  <span className="material-icons-outlined text-sm">timer</span>
                  Vence em: {formatCountdown(timeRemaining)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-medium">
                  <span className="material-icons-outlined text-sm">event</span>
                  {formattedDueDate}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
              {currentAssignment.title}
            </h2>

            <p className="text-sm text-on-surface-variant line-clamp-2 leading-relaxed">
              {textBase}
            </p>
          </div>

          {/* Lado Direito: Botões de Ação */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {validAssignments.length > 1 && (
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % validAssignments.length)}
                className="p-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant transition-all text-sm font-bold flex items-center gap-1"
                title="Próximo desafio"
              >
                <span className="material-icons-outlined text-lg">swap_horiz</span>
                Outros ({validAssignments.length})
              </button>
            )}

            <button
              onClick={() => setSelectedForModal(currentAssignment)}
              className="px-4 py-3 rounded-2xl bg-surface/80 hover:bg-surface text-on-surface border border-outline-variant/40 transition-all duration-200 text-sm font-bold shadow-sm flex items-center gap-1.5"
            >
              <span className="material-icons-outlined text-lg">description</span>
              Ver Detalhes
            </button>

            <button
              onClick={() => onStartWriting(currentAssignment)}
              className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-on-primary transition-all duration-300 text-sm font-bold shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
            >
              <span className="material-icons-outlined text-lg">edit_note</span>
              Escrever Redação Agora
            </button>

            <button
              onClick={handleDismiss}
              className="w-10 h-10 rounded-2xl bg-surface/50 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all ml-1"
              title="Fechar aviso (você pode reabri-lo no Navbar a qualquer momento)"
            >
              <span className="material-icons-outlined text-xl">close</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══ MODAL DE DETALHES DO DESAFIO ═══ */}
      {selectedForModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-outline-variant/30 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Cabeçalho Modal */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold uppercase tracking-wider">
                  🎯 Desafio Oficial
                </span>
                <h3 className="text-2xl font-black text-on-surface leading-snug" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
                  {selectedForModal.title}
                </h3>
                <p className="text-xs text-on-surface-variant flex items-center gap-2">
                  <span>Turma: <strong>{selectedForModal.class_id || 'Geral'}</strong></span>
                  <span>•</span>
                  <span>Prazo: <strong>{formattedDueDate}</strong></span>
                </p>
              </div>

              <button
                onClick={() => setSelectedForModal(null)}
                className="w-10 h-10 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-all shrink-0"
              >
                <span className="material-icons-outlined text-xl">close</span>
              </button>
            </div>

            {/* Cronômetro no Modal */}
            {timeRemaining !== null && timeRemaining > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="material-icons-outlined text-2xl text-amber-600 dark:text-amber-400">timer</span>
                  <div>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Tempo Restante para Entrega</p>
                    <p className="text-base font-black text-amber-800 dark:text-amber-200">{formatCountdown(timeRemaining)}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-amber-700/80 dark:text-amber-300/80 hidden sm:block">Não deixe para a última hora!</span>
              </div>
            )}

            {/* Texto de Apoio / Instruções */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider text-primary">Instruções e Texto de Apoio</h4>
              <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-on-surface-variant text-sm leading-relaxed whitespace-pre-wrap">
                {selectedForModal.base_text || selectedForModal.description || 'Nenhum texto adicional foi fornecido pelo professor.'}
              </div>
            </div>

            {/* Rodapé e CTA */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-outline-variant/20">
              <button
                onClick={() => setSelectedForModal(null)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-all font-bold text-sm"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  const target = selectedForModal;
                  setSelectedForModal(null);
                  onStartWriting(target);
                }}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary transition-all font-bold text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <span className="material-icons-outlined text-lg">edit_note</span>
                Escrever Redação Agora
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default ChallengeBanner;
