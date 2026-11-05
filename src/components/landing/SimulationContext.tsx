"use client";

import React, { createContext, useContext, useMemo, useState } from 'react';

export type QuemCorrigeOption = 'banca' | 'professores' | 'ambos';
export type RedacoesMesOption = 1 | 2 | 4;

export interface SimulationState {
  alunos: number;
  redacoesPorAluno: RedacoesMesOption;
  quemCorrige: QuemCorrigeOption;
  valorPorRedacao: number;
  horaProfessor: number;
  redacoesMes: number;
  custoProfessorUnitario: number;
  custoUnitario: number;
  gastoMensal: number;
  gastoAnual: number;
  horasSemana: number;
  simulationAttached: boolean;
  setAlunos: (v: number) => void;
  setRedacoesPorAluno: (v: RedacoesMesOption) => void;
  setQuemCorrige: (v: QuemCorrigeOption) => void;
  setValorPorRedacao: (v: number) => void;
  setHoraProfessor: (v: number) => void;
  markSimulationAttached: () => void;
}

export const formatIntegerPtBr = (val: number): string =>
  Math.round(val).toLocaleString('pt-BR');

export const formatCurrencyFullPtBr = (val: number): string =>
  `R$ ${Math.round(val).toLocaleString('pt-BR')}`;

export const formatCurrencyUnitPtBr = (val: number): string => {
  const rounded = Math.round(val * 100) / 100;
  if (Number.isInteger(rounded)) {
    return `R$ ${rounded.toLocaleString('pt-BR')}`;
  }
  return `R$ ${rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatCurrencyAnnualPtBr = (val: number): string => {
  if (val >= 1_000_000) {
    const millions = val / 1_000_000;
    const formatted = Number.isInteger(Math.round(millions * 10) / 10)
      ? Math.round(millions).toLocaleString('pt-BR')
      : millions.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return `R$ ${formatted} mi`;
  }
  if (val >= 1_000) {
    return `R$ ${Math.round(val / 1_000).toLocaleString('pt-BR')} mil`;
  }
  return formatCurrencyFullPtBr(val);
};

export const QUEM_CORRIGE_LABELS: Record<QuemCorrigeOption, string> = {
  banca: 'Banca terceirizada',
  professores: 'Professores da escola',
  ambos: 'Os dois',
};

const SimulationContext = createContext<SimulationState | null>(null);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alunos, setAlunosState] = useState<number>(800);
  const [redacoesPorAluno, setRedacoesState] = useState<RedacoesMesOption>(2);
  const [quemCorrige, setQuemState] = useState<QuemCorrigeOption>('banca');
  const [valorPorRedacao, setValorState] = useState<number>(6);
  const [horaProfessor, setHoraState] = useState<number>(60);
  const [simulationAttached, setSimulationAttached] = useState<boolean>(false);

  const value = useMemo<SimulationState>(() => {
    const redacoesMes = alunos * redacoesPorAluno;
    const custoBanca = valorPorRedacao;
    const custoProfessorUnitario = (horaProfessor * 10) / 60;

    let custoUnitario = custoBanca;
    if (quemCorrige === 'professores') {
      custoUnitario = custoProfessorUnitario;
    } else if (quemCorrige === 'ambos') {
      custoUnitario = (custoBanca + custoProfessorUnitario) / 2;
    }

    const gastoMensal = redacoesMes * custoUnitario;
    const gastoAnual = gastoMensal * 10;
    const horasSemana = Math.round((redacoesMes * 10) / 60 / 4.33);

    return {
      alunos,
      redacoesPorAluno,
      quemCorrige,
      valorPorRedacao,
      horaProfessor,
      redacoesMes,
      custoProfessorUnitario,
      custoUnitario,
      gastoMensal,
      gastoAnual,
      horasSemana,
      simulationAttached,
      setAlunos: (v) => {
        setAlunosState(v);
        setSimulationAttached(true);
      },
      setRedacoesPorAluno: (v) => {
        setRedacoesState(v);
        setSimulationAttached(true);
      },
      setQuemCorrige: (v) => {
        setQuemState(v);
        setSimulationAttached(true);
      },
      setValorPorRedacao: (v) => {
        setValorState(v);
        setSimulationAttached(true);
      },
      setHoraProfessor: (v) => {
        setHoraState(v);
        setSimulationAttached(true);
      },
      markSimulationAttached: () => setSimulationAttached(true),
    };
  }, [alunos, redacoesPorAluno, quemCorrige, valorPorRedacao, horaProfessor, simulationAttached]);

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};

export const useSimulation = (): SimulationState => {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return ctx;
};

