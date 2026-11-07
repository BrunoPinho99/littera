"use client";

import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { SectionHeading } from './SectionHeading';

interface ManualTask {
  label: string;
  duration: string;
  rotateDeg: number;
  offsetClass: string;
}

const MANUAL_TASKS: ManualTask[] = [
  { label: 'Corrigir 150 redações à mão', duration: '25 h', rotateDeg: -0.9, offsetClass: 'sm:ml-0' },
  { label: 'Escrever devolutivas individuais', duration: '6 h 15 min', rotateDeg: 0.7, offsetClass: 'sm:ml-[16px]' },
  { label: 'Lançar notas na planilha', duration: '2 h 30 min', rotateDeg: -0.6, offsetClass: 'sm:ml-[4px]' },
  { label: 'Conferir notas divergentes', duration: '2 h', rotateDeg: 0.95, offsetClass: 'sm:ml-[20px]' },
  { label: 'Montar relatório para a coordenação', duration: '1 h 30 min', rotateDeg: -0.5, offsetClass: 'sm:ml-[8px]' },
];

interface LitteraSlot {
  time: string;
  title: string;
  subtitle: string;
}

const LITTERA_SLOTS: LitteraSlot[] = [
  { time: '10:30', title: 'Plantão de redação — 3º A', subtitle: 'Pauta gerada pelo Littera' },
  { time: '13:00', title: 'Aula: proposta de intervenção — 3º B', subtitle: 'Baseada nos erros da semana' },
  { time: '16:00', title: 'Mentoria — alunos abaixo de 600', subtitle: 'Lista gerada pelo Littera' },
];

export const ComparisonSection: React.FC = () => {
  const [mobileTab, setMobileTab] = useState<'hoje' | 'littera'>('hoje');
  const rightCardRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: rightCardRef,
    offset: ['start end', 'center center'],
  });
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.1, 1]);

  return (
    <section
      data-framer-name="Comparativo Antes e Depois"
      className="w-full bg-white pt-[120px] lg:pt-[150px] pb-[40px] px-5 sm:px-[40px]"
    >
      <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-[44px] lg:gap-[56px]">
        <SectionHeading lines={['Menos pilha de papel.', 'Mais aula.']} />

        {/* Mobile Toggle Tabs */}
        <div
          role="tablist"
          aria-label="Comparativo"
          className="lg:hidden inline-flex items-center p-[4px] rounded-full bg-[#F4F5F7] gap-[4px]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'hoje'}
            onClick={() => setMobileTab('hoje')}
            className={`relative px-[18px] py-[8.5px] rounded-full tm-sans text-[14px] font-medium transition-colors cursor-pointer ${
              mobileTab === 'hoje' ? 'text-[#0A0A0B]' : 'text-[#6B6F76]'
            }`}
          >
            {mobileTab === 'hoje' && (
              <motion.span
                layoutId="comp-tab-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                className="absolute inset-0 rounded-full bg-white shadow-sm"
              />
            )}
            <span className="relative z-10">Sua equipe hoje</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'littera'}
            onClick={() => setMobileTab('littera')}
            className={`relative px-[18px] py-[8.5px] rounded-full tm-sans text-[14px] font-medium transition-colors cursor-pointer ${
              mobileTab === 'littera' ? 'text-[#0A0A0B]' : 'text-[#6B6F76]'
            }`}
          >
            {mobileTab === 'littera' && (
              <motion.span
                layoutId="comp-tab-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                className="absolute inset-0 rounded-full bg-white shadow-sm"
              />
            )}
            <span className="relative z-10">Com o Littera</span>
          </button>
        </div>

        {/* Side by Side Grid on Desktop / Tabbed on Mobile */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-[24px]">
          {/* Left Card: Sua equipe hoje */}
          <motion.div
            data-framer-name="Sua equipe hoje"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className={`rounded-[28px] bg-[#F4F5F7] p-[28px] sm:p-[40px] min-h-[580px] lg:min-h-[620px] flex-col justify-between overflow-hidden ${
              mobileTab === 'hoje' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <div className="flex flex-col items-start">
              <span className="rounded-full bg-white text-[#0A0A0B] px-[14px] py-[7px] tm-sans text-[13px] font-medium leading-none shadow-[0_2px_6px_rgba(10,15,31,0.05)]">
                Sua equipe hoje
              </span>

              <div className="mt-[24px] tm-display text-[48px] sm:text-[62px] font-medium leading-none tracking-[-0.04em] text-[#0A0A0B] tabular-nums">
                37 h 15 min
              </div>
              <p className="mt-[10px] tm-sans text-[15.5px] leading-[1.4] text-[#6B6F76]">
                de correção manual, toda semana
              </p>
            </div>

            <div data-framer-name="Tasks" className="mt-[32px] flex flex-col gap-[10px] w-full">
              {MANUAL_TASKS.map((task, idx) => (
                <motion.div
                  key={task.label}
                  initial={{ opacity: 0, y: 16, rotate: 0 }}
                  whileInView={{ opacity: 1, y: 0, rotate: task.rotateDeg }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{
                    duration: 0.6,
                    delay: 0.1 + idx * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`w-full max-w-[420px] rounded-[16px] bg-white px-[18px] py-[13.5px] shadow-[0_6px_16px_rgba(10,15,31,0.05)] flex items-center justify-between gap-3 ${task.offsetClass}`}
                >
                  <span className="tm-sans text-[14px] font-medium text-[#0A0A0B] truncate">
                    {task.label}
                  </span>
                  <span className="rounded-full bg-[#F4F5F7] text-[#6B6F76] px-[10px] py-[4.5px] tm-sans text-[12px] font-medium leading-none tabular-nums shrink-0">
                    {task.duration}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Card: Com o Littera */}
          <motion.div
            ref={rightCardRef}
            data-framer-name="Com o Littera"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.08 }}
            className={`rounded-[28px] bg-[#DCE5F7] p-[28px] sm:p-[40px] min-h-[580px] lg:min-h-[620px] relative overflow-hidden flex-col justify-between ${
              mobileTab === 'littera' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Background Liquid Cobalt Art */}
            <motion.img
              src="/assets/landing/card-cobalt-bg.jpg"
              srcSet="https://framerusercontent.com/images/FbUouOgrumvGhKZWChps7V6wofg.jpg?scale-down-to=1024&width=2400&height=1345 1024w, /assets/landing/card-cobalt-bg.jpg 2048w"
              sizes="(max-width: 1024px) 100vw, 600px"
              alt=""
              aria-hidden="true"
              decoding="async"
              style={{ scale: bgScale }}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none will-change-transform"
            />

            <div className="relative z-10 flex flex-col items-start">
              <span className="rounded-full bg-[#2F5BFF] text-white px-[14px] py-[7px] tm-sans text-[13px] font-medium leading-none shadow-[0_4px_12px_rgba(47,91,255,0.28)]">
                Com o Littera
              </span>

              <div className="mt-[24px] tm-display text-[52px] sm:text-[64px] font-medium leading-none tracking-[-0.04em] text-[#0A0A0B] tabular-nums">
                0 h
              </div>
              <p className="mt-[10px] tm-sans text-[15.5px] leading-[1.4] text-[#0A0A0B]/75">
                de correção braçal. Só aula.
              </p>
            </div>

            <div className="relative z-10 mt-[28px] flex flex-col items-start gap-[14px] w-full max-w-[440px]">
              {/* Frosted Agenda Card */}
              <div
                data-framer-name="Agenda"
                className="w-full rounded-[22px] bg-white/[0.94] backdrop-blur-[10px] p-[18px] sm:p-[20px] shadow-[0_18px_36px_rgba(10,15,31,0.1)] flex flex-col gap-[10px]"
              >
                <div className="flex items-center justify-between pb-[4px]">
                  <span className="tm-sans text-[15px] font-medium text-[#0A0A0B]">Segunda</span>
                  <span className="tm-sans text-[13px] text-[#6B6F76]">16 mar</span>
                </div>

                {LITTERA_SLOTS.map((slot, idx) => (
                  <motion.div
                    key={slot.time}
                    initial={{ opacity: 0, scale: 0.9, y: -12 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{
                      duration: 0.7,
                      delay: 0.25 + idx * 0.18,
                      ease: [0.34, 1.56, 0.64, 1],
                    }}
                    className="flex items-center gap-[12px]"
                  >
                    <span className="w-[42px] shrink-0 tm-sans text-[12.5px] text-[#6B6F76] tabular-nums">
                      {slot.time}
                    </span>
                    <div className="flex-1 rounded-[12px] bg-[#2F5BFF] text-white px-[14px] py-[10px] flex flex-col gap-[2px] shadow-[0_6px_14px_rgba(47,91,255,0.25)] min-w-0">
                      <span className="tm-sans text-[13.5px] font-medium leading-[1.25] truncate">
                        {slot.title}
                      </span>
                      <span className="tm-sans text-[12px] leading-[1.2] text-white/80 truncate">
                        {slot.subtitle}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Summary Pill */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-full bg-white py-[8.5px] px-[14px] shadow-[0_8px_18px_rgba(10,15,31,0.08)] inline-flex items-center gap-[8px]"
              >
                <span className="w-[7px] h-[7px] rounded-full bg-[#35D07F] shrink-0" />
                <span className="tm-sans text-[13px] font-medium leading-none text-[#0A0A0B] tabular-nums">
                  1.248 redações corrigidas esta semana
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
