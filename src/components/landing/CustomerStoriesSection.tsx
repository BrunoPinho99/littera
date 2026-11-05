"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SectionHeading } from './SectionHeading';
import { PlusIcon } from './TillmornIcons';

interface CustomerStory {
  company: string;
  metric: string;
  metricLabel: string;
  quote: string;
  person: string;
  role: string;
  photo: string;
}

const SCHOOL_STORIES: CustomerStory[] = [
  {
    company: 'Colégio Parceiro · Ensino Médio',
    metric: '−58%',
    metricLabel: 'custo com correção',
    quote: 'Cortamos a banca terceirizada sem reduzir uma única redação.',
    person: 'Mariana Duarte',
    role: 'Diretora administrativa',
    photo: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1600&q=85',
  },
  {
    company: 'Rede Educacional · Ensino Médio',
    metric: '+96 pts',
    metricLabel: 'na média de redação',
    quote: 'Os alunos passaram a reescrever por conta própria.',
    person: 'Prof. Marcelo Ribeiro',
    role: 'Coordenador pedagógico',
    photo: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1600&q=85',
  },
  {
    company: 'Curso & Colégio · Pré-vestibular',
    metric: '5×',
    metricLabel: 'redações por aluno no semestre',
    quote: 'Tiramos o limite de envios e o orçamento não mudou.',
    person: 'Renato Guimarães',
    role: 'Mantenedor',
    photo: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=85',
  },
];

const CYCLE_DURATION_MS = 6000;

export const CustomerStoriesSection: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const fillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hoverTimerRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    startTsRef.current = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      if (isPaused) {
        startTsRef.current = now - ((now - startTsRef.current) % CYCLE_DURATION_MS);
      }
      const progress = Math.min(
        1,
        Math.max(0, (now - startTsRef.current) / CYCLE_DURATION_MS)
      );
      const activeFill = fillRefs.current[activeIdx];
      if (activeFill) {
        activeFill.style.width = `${(progress * 100).toFixed(2)}%`;
      }
      if (!isPaused && progress >= 1) {
        startTsRef.current = now;
        setActiveIdx((prev) => (prev + 1) % SCHOOL_STORIES.length);
      } else {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [activeIdx, isPaused]);

  const handleCardEnter = (idx: number) => {
    setIsPaused(true);
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = window.setTimeout(() => {
      if (idx !== activeIdx) {
        startTsRef.current = performance.now();
        setActiveIdx(idx);
      }
    }, 90);
  };

  const handleCardLeave = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }
    setIsPaused(false);
    startTsRef.current = performance.now();
  };

  const handleCardClick = (idx: number) => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }
    setIsPaused(true);
    startTsRef.current = performance.now();
    setActiveIdx(idx);
  };

  return (
    <section
      id="escolas"
      data-framer-name="Escolas"
      className="w-full bg-white pt-[120px] lg:pt-[150px] pb-[40px] px-5 sm:px-[40px]"
    >
      <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-[52px] lg:gap-[64px]">
        <SectionHeading lines={['Escolas que pararam', 'de contar folhas.']} />

        {/* Desktop Interactive Expandable Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:flex w-full h-[600px] gap-[12px]"
        >
          {SCHOOL_STORIES.map((story, idx) => {
            const isOpen = idx === activeIdx;
            return (
              <div
                key={story.company}
                data-framer-name="Story"
                onPointerEnter={() => handleCardEnter(idx)}
                onPointerLeave={handleCardLeave}
                onClick={() => handleCardClick(idx)}
                style={{
                  flexGrow: isOpen ? 700 : 238,
                  flexBasis: 0,
                  minWidth: 0,
                  transition: 'flex-grow 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                className="relative h-full rounded-[28px] bg-[#141824] overflow-hidden cursor-pointer select-none"
              >
                <img
                  src={story.photo}
                  alt={`${story.person} em ${story.company}`}
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
                />

                {/* Editorial Bottom Gradient Scrim */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20 pointer-events-none"
                />

                {/* Top Progress Bar (Open) OR Frosted Plus Badge (Collapsed) */}
                {isOpen ? (
                  <div className="absolute top-[24px] left-[28px] right-[28px] h-[2.5px] rounded-full bg-white/30 overflow-hidden z-20">
                    <div
                      ref={(node) => {
                        fillRefs.current[idx] = node;
                      }}
                      data-framer-name="Fill"
                      style={{ width: '0%' }}
                      className="h-full rounded-full bg-white"
                    />
                  </div>
                ) : (
                  <div
                    aria-hidden="true"
                    className="absolute top-[22px] right-[22px] z-20 w-[40px] h-[40px] rounded-full bg-white/[0.18] backdrop-blur-md border border-white/25 text-white flex items-center justify-center transition-transform duration-300 hover:scale-105"
                  >
                    <PlusIcon className="w-[14px] h-[14px]" />
                  </div>
                )}

                {/* Bottom Story Content */}
                {isOpen ? (
                  <motion.div
                    key={`open-${story.company}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-x-0 bottom-0 z-20 p-[36px] flex flex-col gap-[12px]"
                  >
                    <span className="tm-sans text-[15.5px] font-medium text-white/90">
                      {story.company}
                    </span>

                    <div className="flex items-baseline gap-[14px]">
                      <span className="tm-display text-[72px] xl:text-[80px] font-medium leading-[0.95] tracking-[-0.05em] text-white tabular-nums">
                        {story.metric}
                      </span>
                      <span className="tm-sans text-[18px] leading-[1.3] text-white/85">
                        {story.metricLabel}
                      </span>
                    </div>

                    <p className="mt-[4px] max-w-[560px] tm-display text-[21px] xl:text-[23px] font-medium leading-[1.28] tracking-[-0.02em] text-white">
                      “{story.quote}”
                    </p>

                    <span className="mt-[2px] tm-sans text-[14.5px] text-white/80">
                      {story.person} · {story.role}
                    </span>
                  </motion.div>
                ) : (
                  <div className="absolute inset-x-0 bottom-0 z-20 p-[24px] flex flex-col gap-[4px]">
                    <span className="tm-sans text-[14.5px] font-medium text-white/90">
                      {story.company}
                    </span>
                    <span className="tm-display text-[42px] font-medium leading-[1.08] tracking-[-0.04em] text-white tabular-nums">
                      {story.metric}
                    </span>
                    <span className="tm-sans text-[14px] leading-[1.3] text-white/85">
                      {story.metricLabel}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Mobile / Tablet Stacked Cards */}
        <div className="flex lg:hidden w-full flex-col gap-[16px]">
          {SCHOOL_STORIES.map((story) => (
            <div
              key={story.company}
              className="relative w-full h-[500px] sm:h-[540px] rounded-[28px] bg-[#141824] overflow-hidden"
            >
              <img
                src={story.photo}
                alt={`${story.person} em ${story.company}`}
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 z-10 p-[28px] flex flex-col gap-[10px]">
                <span className="tm-sans text-[15px] font-medium text-white/90">
                  {story.company}
                </span>
                <div className="flex items-baseline gap-[10px]">
                  <span className="tm-display text-[56px] font-medium leading-none tracking-[-0.05em] text-white tabular-nums">
                    {story.metric}
                  </span>
                  <span className="tm-sans text-[16px] text-white/85">{story.metricLabel}</span>
                </div>
                <p className="tm-display text-[20px] font-medium leading-[1.3] tracking-[-0.02em] text-white">
                  “{story.quote}”
                </p>
                <span className="tm-sans text-[14px] text-white/80">
                  {story.person} · {story.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
