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
  'Conversa rápida de 20 min',
  'Diagnóstico do volume da escola',
  'Proposta sem compromisso',
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

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatWhatsApp(e.target.value));
    if (scheduled) setScheduled(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !whatsapp.trim()) return;
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
      id="waitlist"
      data-framer-name="Agendamento"
      className="w-full bg-white pt-[80px] sm:pt-[110px] lg:pt-[140px] pb-[40px] px-4 sm:px-[40px]"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="max-w-[1080px] mx-auto rounded-[28px] sm:rounded-[36px] bg-[#0A1B3F] text-white p-[20px] xs:p-[28px] sm:p-[60px] lg:p-[72px] flex flex-col items-center text-center gap-[24px] sm:gap-[32px] relative overflow-hidden shadow-[0_24px_60px_rgba(10,27,63,0.35)]"
      >
        {/* Glow de fundo orgânico azul elétrico */}
        <div
          aria-hidden="true"
          className="absolute -top-[120px] left-1/2 -translate-x-1/2 w-[600px] h-[360px] bg-[#1455E8]/40 blur-[90px] rounded-full pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-[80px] right-[-40px] w-[350px] h-[250px] bg-[#2F5BFF]/25 blur-[80px] rounded-full pointer-events-none"
        />

        <div className="relative z-10 w-full max-w-[720px] flex flex-col items-center gap-[18px] sm:gap-[20px]">
          <h2 className="tm-display text-[26px] xs:text-[34px] sm:text-[52px] lg:text-[62px] font-semibold leading-[1.08] tracking-[-0.035em] text-white">
            Agende uma conversa com nosso time.
            <span className="block text-[#60A5FA]">Conheça o Littera na prática.</span>
          </h2>

          <p className="tm-sans text-[15px] sm:text-[18.5px] leading-[1.5] text-white/80 max-w-[600px]">
            Em 20 minutos, entendemos o volume da sua instituição, tiramos dúvidas sobre o método de correção e montamos a proposta ideal para a sua escola ou cursinho.
          </p>

          {/* Form Multicampo: Nome, Email, WhatsApp */}
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-[580px] rounded-[20px] sm:rounded-[24px] bg-white p-[14px] xs:p-[16px] sm:p-[20px] shadow-[0_16px_40px_rgba(0,0,0,0.3)] flex flex-col gap-[12px] text-left"
          >
            {/* Hidden fields storing simulation inputs */}
            <input type="hidden" name="sim_alunos" value={alunos} />
            <input type="hidden" name="sim_redacoes" value={redacoesPorAluno} />
            <input type="hidden" name="sim_quem" value={quemCorrige} />
            <input type="hidden" name="sim_banca" value={valorPorRedacao} />
            <input type="hidden" name="sim_prof" value={horaProfessor} />
            <input type="hidden" name="sim_gasto_mes" value={gastoMensal} />
            <input type="hidden" name="sim_gasto_ano" value={gastoAnual} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
              {/* Campo Nome */}
              <div className="flex flex-col gap-[4px]">
                <label className="tm-sans text-[12px] font-medium text-[#4B5563]">Seu nome</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (scheduled) setScheduled(false);
                  }}
                  placeholder="Nome completo"
                  aria-label="Seu nome"
                  className="w-full rounded-[12px] bg-[#F4F5F7] px-[14px] py-[11px] border border-transparent focus:border-[#2F5BFF] focus:bg-white focus:outline-none tm-sans text-[14.5px] text-[#0A0A0B] placeholder:text-[#9CA3AF] transition-all"
                />
              </div>

              {/* Campo WhatsApp */}
              <div className="flex flex-col gap-[4px]">
                <label className="tm-sans text-[12px] font-medium text-[#4B5563]">WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={handleWhatsAppChange}
                  placeholder="(11) 99999-9999"
                  aria-label="WhatsApp"
                  className="w-full rounded-[12px] bg-[#F4F5F7] px-[14px] py-[11px] border border-transparent focus:border-[#2F5BFF] focus:bg-white focus:outline-none tm-sans text-[14.5px] text-[#0A0A0B] placeholder:text-[#9CA3AF] transition-all"
                />
              </div>
            </div>

            {/* Campo Email */}
            <div className="flex flex-col gap-[4px]">
              <label className="tm-sans text-[12px] font-medium text-[#4B5563]">Seu melhor e-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (scheduled) setScheduled(false);
                }}
                placeholder="exemplo@email.com"
                aria-label="E-mail"
                className="w-full rounded-[12px] bg-[#F4F5F7] px-[14px] py-[11px] border border-transparent focus:border-[#2F5BFF] focus:bg-white focus:outline-none tm-sans text-[14.5px] text-[#0A0A0B] placeholder:text-[#9CA3AF] transition-all"
              />
            </div>

            <button
              type="submit"
              className="mt-[4px] w-full rounded-[14px] bg-[#1455E8] hover:bg-[#0E44C4] text-white py-[14px] tm-sans text-[15px] font-semibold leading-none flex items-center justify-center gap-[8px] transition-colors cursor-pointer shadow-[0_4px_16px_rgba(20,85,232,0.4)]"
            >
              <span>{scheduled ? 'Conversa solicitada com sucesso!' : 'Agendar conversa'}</span>
              {scheduled ? (
                <CheckTimelineIcon className="w-[15px] h-[15px] text-white" />
              ) : (
                <ArrowRightIcon className="w-[15px] h-[15px]" />
              )}
            </button>
          </form>

          {/* Simulation attached info pill */}
          {simulationAttached && (
            <div className="inline-flex items-center gap-[8px] px-[14px] py-[7px] rounded-full bg-white/10 text-white backdrop-blur-md border border-white/20 tm-sans text-[13px] font-medium">
              <span className="w-[7px] h-[7px] rounded-full bg-[#60A5FA]" />
              <span>
                Simulação anexada: {formatIntegerPtBr(alunos)} alunos · {redacoesPorAluno}{' '}
                {redacoesPorAluno === 1 ? 'redação' : 'redações'}/aluno ·{' '}
                {formatCurrencyFullPtBr(gastoMensal)}/mês
              </span>
            </div>
          )}

          {/* Avatares + Prova Social */}
          <div className="pt-[6px] flex flex-col sm:flex-row items-center justify-center gap-[12px] sm:gap-[14px] text-center sm:text-left">
            <div className="flex items-center -space-x-[10px]">
              {WAITLIST_AVATARS.map((src, idx) => (
                <img
                  key={src}
                  src={src}
                  alt={`Escola cadastrada ${idx + 1}`}
                  decoding="async"
                  className="w-[38px] h-[38px] rounded-full object-cover border-2 border-[#0A1B3F]"
                />
              ))}
            </div>
            <div className="flex flex-col text-left">
              <span className="tm-sans text-[14px] font-medium leading-[1.25] text-white">
                Escolas e cursinhos de todo o Brasil
              </span>
              <span className="tm-sans text-[13px] leading-[1.25] text-white/70">
                já agendaram uma apresentação
              </span>
            </div>
          </div>

          {/* 3 Perks */}
          <div className="pt-[10px] flex flex-wrap items-center justify-center gap-x-[24px] gap-y-[10px]">
            {PERKS.map((perk) => (
              <div key={perk} className="inline-flex items-center gap-[8px]">
                <span className="w-[20px] h-[20px] rounded-full bg-white/15 text-[#93C5FD] flex items-center justify-center shrink-0">
                  <CheckTimelineIcon className="w-[11.5px] h-[11.5px]" />
                </span>
                <span className="tm-sans text-[13.5px] font-medium text-white/90">{perk}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
};
