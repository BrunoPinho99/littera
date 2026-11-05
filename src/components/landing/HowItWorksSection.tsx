"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { SectionHeading } from './SectionHeading';
import { ChevronDownMarkIcon } from './TillmornIcons';

interface SubmissionItem {
  initial: string;
  name: string;
  detail: string;
  badge: string;
  badgeType: 'corrigindo' | 'reescrita' | 'semlimite';
  muted?: boolean;
}

const SUBMISSION_ITEMS: SubmissionItem[] = [
  {
    initial: 'A',
    name: 'Ana Beatriz · 3º A',
    detail: '1ª versão enviada',
    badge: 'Corrigindo',
    badgeType: 'corrigindo',
  },
  {
    initial: 'L',
    name: 'Lucas Ferreira · 3º B',
    detail: '2ª versão do mesmo tema',
    badge: 'Reescrita',
    badgeType: 'reescrita',
  },
  {
    initial: 'J',
    name: 'Júlia Martins · 2º A',
    detail: '5ª redação do mês',
    badge: 'Sem limite',
    badgeType: 'semlimite',
    muted: true,
  },
];

const FEEDBACK_HIGHLIGHT = 'Boa tese, Ana.';
const FEEDBACK_REST =
  ' Sua proposta cita o agente e a ação, mas falta detalhar o meio. Explique como ela será feita para chegar a 200 na Competência 5.';
const TOTAL_FEEDBACK_CHARS = FEEDBACK_HIGHLIGHT.length + FEEDBACK_REST.length;

const DevolutivaCard: React.FC = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.45 });
  const [typedChars, setTypedChars] = useState<number>(0);

  useEffect(() => {
    if (!isInView) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setTypedChars(TOTAL_FEEDBACK_CHARS);
      return;
    }

    let current = 0;
    const timer = window.setInterval(() => {
      current += 1;
      setTypedChars(current);
      if (current >= TOTAL_FEEDBACK_CHARS) {
        window.clearInterval(timer);
      }
    }, 20);

    return () => window.clearInterval(timer);
  }, [isInView]);

  const highlightVisible = FEEDBACK_HIGHLIGHT.slice(
    0,
    Math.min(typedChars, FEEDBACK_HIGHLIGHT.length)
  );
  const restCount = Math.max(0, typedChars - FEEDBACK_HIGHLIGHT.length);
  const restVisible = FEEDBACK_REST.slice(0, restCount);
  const isTyping = isInView && typedChars < TOTAL_FEEDBACK_CHARS;

  return (
    <div
      ref={cardRef}
      data-framer-name="Devolutiva"
      className="w-full max-w-[340px] rounded-[20px] bg-white shadow-[0_10px_16px_rgba(10,15,31,0.06)] py-[18px] px-[18px] flex flex-col items-start gap-[10px]"
    >
      {/* Recipient Row */}
      <div className="flex items-center gap-[8px]">
        <div className="w-[20px] h-[20px] rounded-[5px] bg-[#0A0A0B] text-white flex items-center justify-center shrink-0">
          <ChevronDownMarkIcon className="w-[12px] h-[12px]" strokeWidth={2.5} />
        </div>
        <span className="tm-sans text-[13px] font-medium leading-none text-[#0A0A0B]">
          Para Ana Beatriz · 3º A
        </span>
      </div>

      {/* Typewriter Message Body */}
      <div className="relative w-full tm-sans text-[13.5px] leading-[1.42] tracking-[-0.01em]">
        <p aria-hidden="true" className="invisible select-none">
          <span>{FEEDBACK_HIGHLIGHT}</span>
          <span>{FEEDBACK_REST}</span>
        </p>
        <p className="absolute inset-0 text-[#0A0A0B]">
          <span className="text-[#2F5BFF] font-medium">{highlightVisible}</span>
          <span>{restVisible}</span>
          {isTyping ? (
            <span
              aria-hidden="true"
              className="inline-block w-[1.5px] h-[13px] bg-[#2F5BFF] ml-[1px] align-middle animate-pulse"
            />
          ) : null}
        </p>
      </div>

      {/* Competencies breakdown pills */}
      <div className="w-full pt-1 border-t border-black/[0.05] flex flex-wrap items-center gap-[4px] tm-sans text-[11px] leading-tight text-[#6B6F76] tabular-nums">
        <span className="bg-[#F4F5F7] px-[6px] py-[2px] rounded-[5px]">C1 160</span>
        <span className="bg-[#2F5BFF]/10 text-[#2F5BFF] font-medium px-[6px] py-[2px] rounded-[5px]">
          C2 200
        </span>
        <span className="bg-[#F4F5F7] px-[6px] py-[2px] rounded-[5px]">C3 160</span>
        <span className="bg-[#2F5BFF]/10 text-[#2F5BFF] font-medium px-[6px] py-[2px] rounded-[5px]">
          C4 200
        </span>
        <span className="bg-[#F4F5F7] px-[6px] py-[2px] rounded-[5px]">C5 160</span>
        <span className="bg-[#0A0A0B] text-white font-medium px-[7px] py-[2px] rounded-[5px] ml-auto">
          880
        </span>
      </div>

      {/* Seal */}
      <div className="rounded-full bg-[#2F5BFF]/10 text-[#2F5BFF] px-[9px] py-[4px] tm-sans text-[11.5px] font-medium leading-none tabular-nums">
        Corrigida em 11 s · padrão ENEM
      </div>
    </div>
  );
};

export const HowItWorksSection: React.FC = () => {
  return (
    <section
      id="como-funciona"
      data-framer-name="Como Funciona"
      className="w-full bg-white pt-[140px] lg:pt-[160px] pb-[40px] px-5 sm:px-[40px]"
    >
      <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-[52px] lg:gap-[64px]">
        <SectionHeading lines={['Da folha em branco', 'à nota.']} />

        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
          {/* Card 1: Envia */}
          <motion.div
            data-framer-name="Passo · Envia"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0 }}
            className="min-h-[412px] rounded-[28px] bg-[#F4F5F7] flex flex-col justify-between overflow-hidden"
          >
            <div
              data-framer-name="Visual"
              className="pt-[36px] px-[24px] sm:px-[28px] h-[300px] w-full flex flex-col items-center"
            >
              <div className="w-full max-w-[328px] flex flex-col gap-[8px]">
                {SUBMISSION_ITEMS.map((item, idx) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: item.muted ? 0.6 : 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{
                      duration: 0.6,
                      delay: 0.1 + idx * 0.11,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="rounded-[16px] bg-white shadow-[0_6px_8px_rgba(10,15,31,0.05)] py-[12px] pl-[14px] pr-[16px] flex items-center gap-[12px]"
                  >
                    <div className="w-[34px] h-[34px] rounded-[10px] bg-[#F4F5F7] flex items-center justify-center tm-sans text-[13px] font-medium text-[#0A0A0B] shrink-0">
                      {item.initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="tm-sans text-[14px] font-medium leading-[1.25] text-[#0A0A0B] truncate">
                        {item.name}
                      </div>
                      <div className="tm-sans text-[12.5px] leading-[1.3] text-[#6B6F76] truncate mt-[1px]">
                        {item.detail}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-[9px] py-[4px] tm-sans text-[12px] font-medium leading-none shrink-0 ${
                        item.badgeType === 'semlimite'
                          ? 'bg-[#35D07F]/15 text-[#178047]'
                          : 'bg-[#2F5BFF]/10 text-[#2F5BFF]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="px-[28px] pb-[30px] flex flex-col gap-[8px]">
              <div className="flex items-center justify-between">
                <h3 className="tm-display text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-[#0A0A0B]">
                  Envia
                </h3>
                <span className="rounded-full bg-white px-[10px] py-[4px] tm-sans text-[12px] font-medium text-[#6B6F76] shadow-sm">
                  Envios ilimitados
                </span>
              </div>
              <p className="tm-sans text-[15.5px] leading-[1.42] text-[#6B6F76]">
                O aluno escreve quantas vezes precisar — sem cota e sem fila.
              </p>
            </div>
          </motion.div>

          {/* Card 2: Corrige */}
          <motion.div
            data-framer-name="Passo · Corrige"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.08 }}
            className="min-h-[412px] rounded-[28px] bg-[#F4F5F7] flex flex-col justify-between overflow-hidden"
          >
            <div
              data-framer-name="Visual"
              className="pt-[32px] px-[20px] sm:px-[28px] h-[300px] w-full flex flex-col items-center"
            >
              <DevolutivaCard />
            </div>

            <div className="px-[28px] pb-[30px] flex flex-col gap-[8px]">
              <div className="flex items-center justify-between">
                <h3 className="tm-display text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-[#0A0A0B]">
                  Corrige
                </h3>
                <span className="rounded-full bg-[#2F5BFF]/10 px-[10px] py-[4px] tm-sans text-[12px] font-medium text-[#2F5BFF]">
                  Corrigida em 11 s
                </span>
              </div>
              <p className="tm-sans text-[15.5px] leading-[1.42] text-[#6B6F76]">
                Avalia as 5 competências do ENEM e explica cada nota.
              </p>
            </div>
          </motion.div>

          {/* Card 3: Evolui */}
          <motion.div
            data-framer-name="Passo · Evolui"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.16 }}
            className="min-h-[412px] rounded-[28px] bg-[#F4F5F7] flex flex-col justify-between overflow-hidden"
          >
            <div
              data-framer-name="Visual"
              className="pt-[36px] px-[24px] sm:px-[28px] h-[300px] w-full flex flex-col items-center"
            >
              <div
                data-framer-name="Linha do dia"
                className="w-full max-w-[328px] rounded-[20px] bg-white shadow-[0_10px_12px_rgba(10,15,31,0.06)] p-[16px] flex flex-col gap-[8px]"
              >
                <div className="flex items-center justify-between w-full pb-[2px]">
                  <span className="tm-sans text-[14px] font-medium text-[#0A0A0B]">
                    Evolução no mesmo dia
                  </span>
                  <span className="tm-sans text-[12px] font-medium text-[#178047] bg-[#35D07F]/[0.16] px-[8px] py-[2px] rounded-full tabular-nums">
                    +120 pts
                  </span>
                </div>

                {/* 14:10 1ª versão corrigida */}
                <div className="flex items-center justify-between h-[38px] px-[10px] rounded-[10px] bg-[#F4F5F7]">
                  <span className="tm-sans text-[12px] text-[#6B6F76] tabular-nums">14:10</span>
                  <span className="tm-sans text-[12.5px] font-medium text-[#0A0A0B]">
                    1ª versão corrigida
                  </span>
                  <span className="tm-sans text-[13px] font-medium text-[#0A0A0B] tabular-nums">
                    760
                  </span>
                </div>

                {/* 14:35 Ana lê a devolutiva */}
                <div className="flex items-center justify-between h-[36px] px-[10px]">
                  <span className="tm-sans text-[12px] text-[#6B6F76] tabular-nums">14:35</span>
                  <span className="tm-sans text-[12px] text-[#6B6F76]">
                    Ana lê a devolutiva
                  </span>
                  <span className="tm-sans text-[12px] text-[#6B6F76]">—</span>
                </div>

                {/* 15:02 2ª versão corrigida · Reescrita no mesmo dia */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: -8 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{
                    duration: 0.65,
                    delay: 0.28,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                  className="rounded-[10px] bg-[#2F5BFF] py-[10px] px-[12px] flex items-center justify-between text-white shadow-[0_6px_14px_rgba(47,91,255,0.28)]"
                >
                  <div className="flex flex-col">
                    <span className="tm-sans text-[12.5px] font-medium leading-[1.25] text-white">
                      2ª versão corrigida
                    </span>
                    <span className="tm-sans text-[11px] leading-[1.25] text-white/80">
                      Reescrita no mesmo dia
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="tm-sans text-[16px] font-medium leading-none text-white tabular-nums">
                      880
                    </span>
                    <span className="tm-sans text-[10.5px] text-white/85 tabular-nums">
                      +120 pts
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>

            <div className="px-[28px] pb-[30px] flex flex-col gap-[8px]">
              <div className="flex items-center justify-between">
                <h3 className="tm-display text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-[#0A0A0B]">
                  Evolui
                </h3>
                <span className="rounded-full bg-[#35D07F]/15 px-[10px] py-[4px] tm-sans text-[12px] font-medium text-[#178047]">
                  +120 pts
                </span>
              </div>
              <p className="tm-sans text-[15.5px] leading-[1.42] text-[#6B6F76]">
                Reescreve no mesmo dia e vê a nota subir.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
