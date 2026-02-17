
import { Notification } from "../types";

export const notificationsData: Notification[] = [
  {
    id: '1',
    type: 'correction',
    title: 'Redação Corrigida',
    message: 'Sua redação sobre "Inteligência Artificial" foi corrigida. Você tirou 920 pontos! Veja os detalhes.',
    timestamp: '2h atrás',
    read: false
  },
  {
    id: '2',
    type: 'ranking',
    title: 'Você subiu no Ranking!',
    message: 'Parabéns! Você ultrapassou 15 estudantes na sua escola e entrou no Top 10 semanal.',
    timestamp: '5h atrás',
    read: false
  },
  {
    id: '3',
    type: 'tip',
    title: 'Dica do dia: Competência 1',
    message: 'Cuidado com o uso da crase antes de palavras masculinas. Revise nossa aula rápida sobre gramática.',
    timestamp: '1d atrás',
    read: true
  },
  {
    id: '4',
    type: 'assignment',
    title: 'Nova Tarefa Atribuída',
    message: 'O professor Carlos agendou uma redação sobre "Meio Ambiente" para entregar até sexta-feira.',
    timestamp: '2d atrás',
    read: true
  },
  {
    id: '5',
    type: 'system',
    title: 'Bem-vindo ao Littera',
    message: 'Estamos felizes em ter você aqui. Complete seu perfil para ganhar seus primeiros pontos de experiência.',
    timestamp: '3d atrás',
    read: true
  }
];
    