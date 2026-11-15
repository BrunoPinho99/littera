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

interface LiveCorrectionFeed {
  student: string;
  grade: string;
  competency: string;
  status: string;
  time: string;
}

const LIVE_CORRECTIONS: LiveCorrectionFeed[] = [
  { student: 'Isabela Rocha · 3º B', grade: '920', competency: 'ENEM 5 Competências', status: 'Corrigida', time: 'agora' },
  { student: 'Lucas Mendes · 3º A', grade: '880', competency: 'Devolutiva gerada', status: 'Corrigida', time: 'há 12s' },
  { student: 'Mariana Duarte · 2º A', grade: '960', competency: 'Trechos justificados', status: 'Corrigida', time: 'há 45s' },
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
        <SectionHeading lines={['Menos pilhas de papel.', 'Mais foco no que importa.']} />

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

            {/* Subtle Gradient Scrim to ensure complete legibility against ribbon art */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#EBF1FC]/90 via-[#EBF1FC]/50 to-transparent pointer-events-none z-[1]" />

            <div className="relative z-10 flex flex-col items-start">
              <span className="rounded-full bg-[#2F5BFF] text-white px-[14px] py-[7px] tm-sans text-[13px] font-medium leading-none shadow-[0_4px_12px_rgba(47,91,255,0.28)]">
                Com o Littera
              </span>

              <div className="mt-[20px] rounded-[18px] bg-white/70 backdrop-blur-md px-[16px] py-[10px] -ml-[16px] border border-white/80 shadow-[0_4px_20px_rgba(47,91,255,0.06)] inline-flex flex-col">
                <div className="tm-display text-[48px] sm:text-[58px] font-semibold leading-none tracking-[-0.04em] text-[#0A0A0B] tabular-nums">
                  Segundos
                </div>
                <p className="mt-[8px] tm-sans text-[15px] font-medium leading-[1.35] text-[#2D333F]">
                  para corrigir cada redação com rigor ENEM.
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-[28px] flex flex-col items-start gap-[14px] w-full max-w-[440px]">
              {/* Live Correction Feed Card */}
              <div
                data-framer-name="Correcoes em tempo real"
                className="w-full rounded-[22px] bg-white/95 backdrop-blur-[12px] p-[18px] sm:p-[20px] shadow-[0_20px_40px_rgba(10,15,31,0.12)] border border-white/60 flex flex-col gap-[10px]"
              >
                <div className="flex items-center justify-between pb-[6px] border-b border-black/[0.05]">
                  <div className="flex items-center gap-[8px]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2F5BFF] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2F5BFF]"></span>
                    </span>
                    <span className="tm-sans text-[13.5px] font-semibold text-[#0A0A0B]">
                      Correções em tempo real
                    </span>
                  </div>
                  <span className="tm-sans text-[11.5px] font-medium text-[#2F5BFF] bg-[#2F5BFF]/10 px-[8px] py-[3px] rounded-full">
                    ENEM Oficial
                  </span>
                </div>

                {LIVE_CORRECTIONS.map((item, idx) => (
                  <motion.div
                    key={item.student}
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{
                      duration: 0.6,
                      delay: 0.2 + idx * 0.15,
                      ease: [0.34, 1.56, 0.64, 1],
                    }}
                    className="rounded-[14px] bg-[#F7F9FD] border border-[#E3E8F5] p-[12px] flex items-center justify-between gap-[12px] shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="tm-sans text-[13.5px] font-semibold text-[#0A0A0B] truncate">
                        {item.student}
                      </span>
                      <span className="tm-sans text-[12px] text-[#6B6F76] truncate">
                        {item.competency} · {item.time}
                      </span>
                    </div>

                    <div className="flex items-center gap-[8px] shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="tm-display text-[15px] font-bold text-[#0A0A0B] leading-none">
                          {item.grade}
                        </span>
                        <span className="tm-sans text-[10px] text-[#16A34A] font-semibold">
                          pts
                        </span>
                      </div>
                      <div className="w-[24px] h-[24px] rounded-full bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center font-bold text-[12px]">
                        ✓
                      </div>
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
