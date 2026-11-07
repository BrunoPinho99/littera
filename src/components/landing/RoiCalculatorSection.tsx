"use client";

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SectionHeading } from './SectionHeading';
import {
  formatCurrencyAnnualPtBr,
  formatCurrencyFullPtBr,
  formatCurrencyUnitPtBr,
  formatIntegerPtBr,
  QuemCorrigeOption,
  RedacoesMesOption,
  useSimulation,
} from './SimulationContext';

interface RoiSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

const RoiSlider: React.FC<RoiSliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}) => {
  const pct = ((value - min) / Math.max(1, max - min)) * 100;

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex items-end justify-between gap-[12px]">
        <span className="tm-sans text-[15.5px] font-medium text-[#4B5563]">{label}</span>
        <span className="tm-display text-[28px] sm:text-[32px] font-medium leading-[1.1] tracking-[-0.03em] text-[#0A0A0B] tabular-nums">
          {format(value)}
        </span>
      </div>

      <div className="relative h-[24px]">
        {/* Track */}
        <div className="absolute left-0 right-0 top-[9px] h-[6px] rounded-[3px] bg-[#E0E2E7]" />
        {/* Cobalt Fill */}
        <div
          style={{ width: `${pct}%` }}
          className="absolute left-0 top-[9px] h-[6px] rounded-[3px] bg-[#2F5BFF]"
        />
        {/* Thumb Knob */}
        <div
          style={{ left: `calc(${pct}% - ${(pct / 100) * 24}px)` }}
          className="absolute top-0 w-[24px] h-[24px] rounded-full bg-white border-2 border-[#2F5BFF] shadow-[0_2px_6px_rgba(10,10,11,0.15)] pointer-events-none"
        />
        {/* Native Range Input */}
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-[24px] m-0 opacity-0 cursor-grab active:cursor-grabbing"
        />
      </div>

      <div className="flex items-center justify-between tm-sans text-[13px] text-[#6B6F76] tabular-nums">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
};

export const RoiCalculatorSection: React.FC = () => {
  const {
    alunos,
    redacoesPorAluno,
    quemCorrige,
    valorPorRedacao,
    horaProfessor,
    custoProfessorUnitario,
    custoUnitario,
    gastoMensal,
    gastoAnual,
    horasSemana,
    setAlunos,
    setRedacoesPorAluno,
    setQuemCorrige,
    setValorPorRedacao,
    setHoraProfessor,
    markSimulationAttached,
  } = useSimulation();

  const [glowPos, setGlowPos] = useState({ x: 15, y: 85 });
  const resultCardRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = resultCardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setGlowPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleGoToBooking = (e: React.MouseEvent) => {
    e.preventDefault();
    markSimulationAttached();
    const target = document.querySelector('#reuniao');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const showBancaSlider = quemCorrige === 'banca' || quemCorrige === 'ambos';
  const showProfSlider = quemCorrige === 'professores' || quemCorrige === 'ambos';

  // Dynamic legend for big number
  let bigNumberLegend = 'por mês com banca corretora';
  let calloutText: string | null = null;

  if (quemCorrige === 'professores') {
    bigNumberLegend = 'por mês em horas de professor';
    calloutText = `Mesmo sem banca, cada redação custa ${formatCurrencyUnitPtBr(
      custoProfessorUnitario
    )} em tempo de professor.`;
  } else if (quemCorrige === 'ambos') {
    bigNumberLegend = 'por mês entre banca e professores';
    calloutText = 'Metade das redações vai para a banca; metade fica com os professores.';
  }

  return (
    <section
      id="calculadora"
      data-framer-name="Calculadora"
      className="w-full bg-white pt-[120px] lg:pt-[150px] pb-[40px] px-5 sm:px-[40px]"
    >
      <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-[44px] lg:gap-[56px]">
        <div className="flex flex-col items-center gap-[16px] text-center max-w-[840px]">
          <SectionHeading
            lines={['Quanto custa corrigir redação', 'na sua escola ou cursinho?']}
            mobileLines={['Quanto custa sua correção?']}
          />
          <p className="tm-sans text-[16.5px] sm:text-[18.5px] leading-[1.45] text-[#6B6F76] max-w-[680px]">
            Mova os controles. Em 20 segundos, você vê um custo que hoje não aparece na planilha.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="w-full flex flex-col lg:flex-row gap-[24px] items-stretch"
        >
          {/* Left Controls Card */}
          <div className="flex-1 min-w-0 rounded-[28px] bg-[#F4F5F7] p-[28px] sm:p-[44px] flex flex-col gap-[32px] sm:gap-[38px]">
            {/* Controle 1: Alunos */}
            <RoiSlider
              label="Alunos que escrevem redação"
              value={alunos}
              min={100}
              max={5000}
              step={50}
              format={formatIntegerPtBr}
              onChange={setAlunos}
            />

            {/* Controle 2: Redações por aluno, por mês */}
            <div className="flex flex-col gap-[14px]">
              <span className="tm-sans text-[15.5px] font-medium text-[#4B5563]">
                Redações por aluno, por mês
              </span>
              <div
                role="radiogroup"
                aria-label="Redações por aluno, por mês"
                className="relative flex gap-[4px] p-[4px] rounded-full bg-white shadow-sm"
              >
                {([1, 2, 4] as RedacoesMesOption[]).map((qty) => {
                  const active = redacoesPorAluno === qty;
                  return (
                    <button
                      key={qty}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setRedacoesPorAluno(qty)}
                      className={`relative flex-1 py-[10px] rounded-full cursor-pointer tm-sans text-[14.5px] font-medium transition-colors duration-200 ${
                        active ? 'text-white' : 'text-[#6B6F76] hover:text-[#0A0A0B]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="calc-essays-seg"
                          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                          className="absolute inset-0 rounded-full bg-[#0A0A0B]"
                        />
                      )}
                      <span className="relative z-10">{qty}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Controle 3: Quem corrige hoje? */}
            <div className="flex flex-col gap-[14px]">
              <span className="tm-sans text-[15.5px] font-medium text-[#4B5563]">
                Quem corrige hoje?
              </span>
              <div
                role="radiogroup"
                aria-label="Quem corrige hoje?"
                className="relative flex flex-wrap sm:flex-nowrap gap-[4px] p-[4px] rounded-[18px] sm:rounded-full bg-white shadow-sm"
              >
                {(
                  [
                    { id: 'banca', label: 'Banca terceirizada' },
                    { id: 'professores', label: 'Professores da escola' },
                    { id: 'ambos', label: 'Os dois' },
                  ] as { id: QuemCorrigeOption; label: string }[]
                ).map((opt) => {
                  const active = quemCorrige === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setQuemCorrige(opt.id)}
                      className={`relative flex-1 py-[10px] px-2 rounded-full cursor-pointer tm-sans text-[13px] sm:text-[14px] font-medium transition-colors duration-200 text-center ${
                        active ? 'text-white' : 'text-[#6B6F76] hover:text-[#0A0A0B]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="calc-who-seg"
                          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                          className="absolute inset-0 rounded-full bg-[#0A0A0B]"
                        />
                      )}
                      <span className="relative z-10 whitespace-nowrap">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Controle 4: Quanto a escola paga por redação (Banca ou Os dois) */}
            {showBancaSlider && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <RoiSlider
                  label="Quanto a escola paga por redação"
                  value={valorPorRedacao}
                  min={2}
                  max={20}
                  step={0.5}
                  format={formatCurrencyUnitPtBr}
                  onChange={setValorPorRedacao}
                />
              </motion.div>
            )}

            {/* Controle 5: Hora do professor, com encargos (Professores ou Os dois) */}
            {showProfSlider && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <RoiSlider
                  label="Hora do professor, com encargos"
                  value={horaProfessor}
                  min={25}
                  max={150}
                  step={5}
                  format={formatCurrencyFullPtBr}
                  onChange={setHoraProfessor}
                />
              </motion.div>
            )}

            <span className="mt-auto tm-sans text-[13px] text-[#8E929B] border-t border-black/[0.06] pt-4">
              Cálculo com 10 minutos de leitura por redação e ano letivo de 10 meses.
            </span>
          </div>

          {/* Right Cobalt Results Card */}
          <div
            ref={resultCardRef}
            onPointerMove={handlePointerMove}
            className="flex-1 min-w-0 rounded-[28px] bg-[#2F5BFF] text-white p-[28px] sm:p-[44px] relative overflow-hidden flex flex-col justify-between gap-[24px]"
          >
            {/* Pointer-follow radial highlight */}
            <div
              aria-hidden="true"
              style={{
                background: `radial-gradient(50% 50% at ${glowPos.x.toFixed(1)}% ${glowPos.y.toFixed(
                  1
                )}%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 100%)`,
              }}
              className="absolute inset-0 pointer-events-none transition-[background] duration-200"
            />

            <div className="relative z-10 flex flex-col gap-[8px]">
              <span className="tm-sans text-[16px] text-white/80">Hoje, sua instituição gasta</span>

              <div className="flex flex-col">
                <div className="flex items-baseline gap-[12px] flex-wrap">
                  <span className="tm-display text-[58px] sm:text-[76px] xl:text-[88px] font-medium leading-[0.92] tracking-[-0.04em] tabular-nums">
                    {formatCurrencyFullPtBr(gastoMensal)}
                  </span>
                </div>
                <span className="tm-sans text-[15px] sm:text-[16px] text-white/85 mt-2">
                  {bigNumberLegend}
                </span>

                {calloutText && (
                  <p className="mt-3 p-3 rounded-[12px] bg-white/[0.12] backdrop-blur-sm tm-sans text-[13.5px] leading-snug text-white/95">
                    {calloutText}
                  </p>
                )}
              </div>
            </div>

            <div className="relative z-10 h-[1px] w-full bg-white/[0.22]" />

            {/* 3 Secondary metrics */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-[18px]">
              <div className="flex flex-col gap-[3px]">
                <span className="tm-display text-[26px] sm:text-[30px] font-medium leading-tight tracking-[-0.02em] tabular-nums">
                  {formatCurrencyAnnualPtBr(gastoAnual)}
                </span>
                <span className="tm-sans text-[12.5px] text-white/75">por ano letivo</span>
              </div>

              <div className="flex flex-col gap-[3px]">
                <span className="tm-display text-[26px] sm:text-[30px] font-medium leading-tight tracking-[-0.02em] tabular-nums">
                  {formatCurrencyUnitPtBr(custoUnitario)}
                </span>
                <span className="tm-sans text-[12.5px] text-white/75">por redação corrigida</span>
              </div>

              <div className="flex flex-col gap-[3px]">
                <span className="tm-display text-[26px] sm:text-[30px] font-medium leading-tight tracking-[-0.02em] tabular-nums">
                  {horasSemana} h
                </span>
                <span className="tm-sans text-[12.5px] text-white/75">
                  de leitura, toda semana
                </span>
              </div>
            </div>

            {/* Comparison Bars: Hoje vs Com o Littera */}
            <div className="relative z-10 flex flex-col gap-[10px] pt-[6px]">
              <span className="tm-sans text-[13px] text-white/80">
                Redações por aluno, por mês
              </span>

              {/* Hoje */}
              <div className="flex flex-col gap-[4px]">
                <div className="flex items-center justify-between tm-sans text-[12.5px]">
                  <span className="text-white/85">Hoje</span>
                  <span className="font-medium tabular-nums">{redacoesPorAluno}</span>
                </div>
                <div className="w-full h-[8px] rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    initial={false}
                    animate={{
                      width: `${Math.max(12, (redacoesPorAluno / 6) * 100)}%`,
                    }}
                    transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                    className="h-full rounded-full bg-white/50"
                  />
                </div>
              </div>

              {/* Com o Littera */}
              <div className="flex flex-col gap-[4px]">
                <div className="flex items-center justify-between tm-sans text-[12.5px]">
                  <span className="text-white font-medium">Com o Littera</span>
                  <span className="font-medium text-white">Sem limite</span>
                </div>
                <div className="w-full h-[8px] rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full w-full rounded-full bg-white" />
                </div>
              </div>
            </div>

            {/* Conversion CTA to #reuniao */}
            <div className="relative z-10 flex flex-col gap-[10px] pt-2">
              <button
                type="button"
                onClick={handleGoToBooking}
                className="w-full py-[15px] px-[22px] rounded-full bg-white hover:bg-[#F4F5F7] text-[#0A0A0B] tm-sans text-[15.5px] font-medium shadow-[0_4px_16px_rgba(10,15,31,0.14)] transition-colors cursor-pointer text-center"
              >
                Ver quanto o Littera custa para sua instituição
              </button>
              <p className="tm-sans text-[12.5px] text-white/75 text-center leading-snug">
                Levamos esta simulação para a reunião, com a proposta personalizada para seu colégio ou cursinho.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
