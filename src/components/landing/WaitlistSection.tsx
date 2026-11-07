"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRightIcon,
  CheckTimelineIcon,
  CopyIcon,
  SequencesIcon,
  TillmornDiamondGlyph,
} from './TillmornIcons';
import {
  formatCurrencyFullPtBr,
  formatIntegerPtBr,
  useSimulation,
} from './SimulationContext';

const WAITLIST_AVATARS = [
  'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
];

const PERKS = [
  'Correção ao vivo',
  'Simulação da sua instituição',
  'Proposta em até 24 h',
];

export const WaitlistSection: React.FC = () => {
  const {
    alunos,
    redacoesPorAluno,
    quemCorrige,
    valorPorRedacao,
    horaProfessor,
    gastoMensal,
    gastoAnual,
    simulationAttached,
  } = useSimulation();

  const [email, setEmail] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setScheduled(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText('https://littera.com.br/reuniao/helena');
    } catch {
      // Fallback
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="reuniao"
      data-framer-name="Agendamento"
      className="w-full bg-white pt-[110px] lg:pt-[140px] pb-[40px] px-5 sm:px-[40px]"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="max-w-[1200px] mx-auto rounded-[36px] bg-[#F4F5F7] p-[28px] sm:p-[48px] lg:p-[64px] flex flex-col lg:flex-row items-center justify-between gap-[44px] lg:gap-[56px] relative overflow-hidden"
      >
        {/* Left Column: Form & Social Proof */}
        <div className="w-full lg:max-w-[540px] flex flex-col items-start gap-[24px]">
          <h2 className="tm-display text-[38px] sm:text-[54px] lg:text-[64px] font-medium leading-[1.02] tracking-[-0.04em] text-[#0A0A0B]">
            Traga 3 redações.
            <span className="block text-[#2F5BFF]">Veja a correção na hora.</span>
          </h2>

          <p className="tm-sans text-[16px] sm:text-[17.5px] leading-[1.45] text-[#6B6F76] max-w-[500px]">
            Em 30 minutos, corrigimos ao vivo redações reais dos seus alunos, refazemos a conta da
            calculadora com os seus números e apresentamos a proposta para sua escola ou cursinho.
          </p>

          {/* Pill Email Form */}
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-[520px] rounded-full bg-white p-[6px] pl-[18px] shadow-[0_8px_22px_rgba(10,15,31,0.06)] flex items-center justify-between gap-[10px]"
          >
            {/* Hidden fields storing simulation inputs */}
            <input type="hidden" name="sim_alunos" value={alunos} />
            <input type="hidden" name="sim_redacoes" value={redacoesPorAluno} />
            <input type="hidden" name="sim_quem" value={quemCorrige} />
            <input type="hidden" name="sim_banca" value={valorPorRedacao} />
            <input type="hidden" name="sim_prof" value={horaProfessor} />
            <input type="hidden" name="sim_gasto_mes" value={gastoMensal} />
            <input type="hidden" name="sim_gasto_ano" value={gastoAnual} />

            <div className="flex items-center gap-[10px] flex-1 min-w-0">
              <SequencesIcon className="w-[16px] h-[16px] text-[#6B6F76] shrink-0" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (scheduled) setScheduled(false);
                }}
                placeholder="E-mail institucional da escola ou cursinho"
                aria-label="E-mail institucional"
                className="w-full border-0 bg-transparent p-0 focus:ring-0 focus:outline-none tm-sans text-[14.5px] text-[#0A0A0B] placeholder:text-[#8E929B]"
              />
            </div>

            <button
              type="submit"
              className="rounded-full bg-[#0A0A0B] hover:bg-[#2A2B30] text-white px-[22px] py-[13px] tm-sans text-[14.5px] font-medium leading-none inline-flex items-center gap-[8px] shrink-0 transition-colors cursor-pointer"
            >
              <span>{scheduled ? 'Reunião solicitada' : 'Agendar reunião'}</span>
              {scheduled ? (
                <CheckTimelineIcon className="w-[14px] h-[14px] text-[#35D07F]" />
              ) : (
                <ArrowRightIcon className="w-[14px] h-[14px]" />
              )}
            </button>
          </form>

          {/* Simulation attached info pill */}
          {simulationAttached && (
            <div className="inline-flex items-center gap-[8px] px-[12px] py-[6px] rounded-full bg-white text-[#2F5BFF] border border-[#2F5BFF]/20 tm-sans text-[12.5px] font-medium">
              <span className="w-[6px] h-[6px] rounded-full bg-[#2F5BFF]" />
              <span>
                Simulação anexada: {formatIntegerPtBr(alunos)} alunos ·{' '}
                {formatCurrencyFullPtBr(gastoMensal)}/mês
              </span>
            </div>
          )}

          {/* Avatares + Prova Social */}
          <div className="pt-[4px] flex items-center gap-[14px]">
            <div className="flex items-center -space-x-[10px]">
              {WAITLIST_AVATARS.map((src, idx) => (
                <img
                  key={src}
                  src={src}
                  alt={`Escola cadastrada ${idx + 1}`}
                  decoding="async"
                  className="w-[38px] h-[38px] rounded-full object-cover border-2 border-[#F4F5F7]"
                />
              ))}
            </div>
            <div className="flex flex-col">
              <span className="tm-sans text-[14px] font-medium leading-[1.25] text-[#0A0A0B]">
                Escolas e cursinhos de todo o Brasil
              </span>
              <span className="tm-sans text-[13px] leading-[1.25] text-[#6B6F76]">
                já fizeram a simulação
              </span>
            </div>
          </div>

          {/* 3 Perks */}
          <div className="pt-[4px] flex flex-wrap items-center gap-x-[20px] gap-y-[10px]">
            {PERKS.map((perk) => (
              <div key={perk} className="inline-flex items-center gap-[8px]">
                <span className="w-[19px] h-[19px] rounded-full bg-[#2F5BFF]/10 text-[#2F5BFF] flex items-center justify-center shrink-0">
                  <CheckTimelineIcon className="w-[11px] h-[11px]" />
                </span>
                <span className="tm-sans text-[13.5px] font-medium text-[#0A0A0B]">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Floating Toast + Stacked Spot Card */}
        <div className="w-full max-w-[430px] relative pt-[48px] flex flex-col items-center">
          {/* Floating Toast: Colégio Horizonte acabou de agendar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="self-end mb-[14px] rounded-full bg-white py-[7px] pl-[10px] pr-[14px] shadow-[0_10px_24px_rgba(10,15,31,0.08)] inline-flex items-center gap-[9px] z-20"
          >
            <span className="w-[8px] h-[8px] rounded-full bg-[#35D07F] animate-pulse" />
            <span className="tm-sans text-[12.5px] font-medium text-[#6B6F76]">
              Colégio Horizonte acabou de agendar
            </span>
          </motion.div>

          {/* Stacked Depth Cards + Main Spot Card */}
          <div className="relative w-full">
            <div
              aria-hidden="true"
              className="absolute -top-[18px] inset-x-[26px] h-[40px] rounded-t-[22px] bg-white/45 pointer-events-none"
            />
            <div
              aria-hidden="true"
              className="absolute -top-[9px] inset-x-[13px] h-[40px] rounded-t-[22px] bg-white/75 pointer-events-none"
            />

            <div className="relative z-10 w-full rounded-[26px] bg-white p-[26px] sm:p-[30px] shadow-[0_24px_50px_rgba(10,15,31,0.08)] flex flex-col gap-[20px]">
              {/* Card Top Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-[9px]">
                  <TillmornDiamondGlyph size={20} className="text-[#0A0A0B]" />
                  <span className="tm-sans text-[14px] font-medium text-[#6B6F76]">
                    Sua reunião
                  </span>
                </div>
                <span className="rounded-full bg-[#35D07F]/[0.16] text-[#0E8A4A] px-[10px] py-[4.5px] inline-flex items-center gap-[6px] tm-sans text-[12px] font-medium leading-none">
                  <span className="w-[6px] h-[6px] rounded-full bg-[#35D07F]" />
                  Confirmada
                </span>
              </div>

              {/* Data e hora grande */}
              <div className="tm-display text-[44px] sm:text-[52px] font-medium leading-[0.95] tracking-[-0.04em] text-[#0A0A0B]">
                Quinta · 10:30
              </div>

              {/* Convite prompt */}
              <p className="tm-sans text-[13.5px] text-[#6B6F76] leading-snug">
                Chame quem decide com você: mantenedor, direção ou coordenação.
              </p>

              {/* Referral Link Copy Box */}
              <div className="rounded-[14px] bg-[#F4F5F7] py-[8px] pl-[14px] pr-[8px] flex items-center justify-between gap-[10px]">
                <span className="tm-sans text-[13px] font-medium text-[#0A0A0B] truncate">
                  littera.com.br/reuniao/helena
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-[10px] bg-white hover:bg-[#FAFAFB] text-[#0A0A0B] px-[11px] py-[7px] shadow-[0_2px_6px_rgba(10,15,31,0.06)] inline-flex items-center gap-[6px] tm-sans text-[12px] font-medium leading-none cursor-pointer transition-colors shrink-0"
                >
                  <CopyIcon className="w-[13px] h-[13px]" />
                  <span>{copied ? 'Copiado!' : 'Copiar convite'}</span>
                </button>
              </div>

              {/* Batch Progress */}
              <div className="flex flex-col gap-[8px] pt-[2px]">
                <div className="flex items-center justify-between tm-sans text-[12.5px]">
                  <span className="text-[#6B6F76]">Implantações para o próximo mês</span>
                  <span className="font-medium text-[#0A0A0B] tabular-nums">7 / 10 vagas</span>
                </div>
                <div className="w-full h-[7px] rounded-full bg-[#0A0A0B]/[0.08] overflow-hidden">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    style={{ width: '70%' }}
                    className="h-full rounded-full bg-[#2F5BFF] origin-left"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};
