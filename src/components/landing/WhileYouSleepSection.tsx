"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SectionHeading } from './SectionHeading';
import {
  AnalyticsIcon,
  CheckTimelineIcon,
  MeetingsIcon,
  ReplyTimelineIcon,
  SequencesIcon,
} from './TillmornIcons';

interface NightEventItem {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  threshold: number;
  offsetPct: string;
  Icon: React.FC<{ className?: string }>;
}

const NIGHT_EVENTS: NightEventItem[] = [
  {
    id: 'tema',
    time: '18:00',
    title: 'Tema da semana liberado',
    subtitle: '3º A, B e C · 312 alunos',
    threshold: 0,
    offsetPct: '16%',
    Icon: SequencesIcon,
  },
  {
    id: 'recebidas',
    time: '19:30',
    title: '486 redações recebidas',
    subtitle: 'Cada uma corrigida em segundos',
    threshold: 0.19,
    offsetPct: '38%',
    Icon: CheckTimelineIcon,
  },
  {
    id: 'reescrita',
    time: '20:52',
    title: 'Júlia reescreveu',
    subtitle: '“Agora entendi a proposta de intervenção.”',
    threshold: 0.37,
    offsetPct: '12%',
    Icon: ReplyTimelineIcon,
  },
  {
    id: 'alta',
    time: '22:41',
    title: 'Competência 5 em alta',
    subtitle: '3º B · média +40 pts na reescrita',
    threshold: 0.6,
    offsetPct: '32%',
    Icon: MeetingsIcon,
  },
  {
    id: 'relatorio',
    time: '6:15',
    title: 'Relatório pronto',
    subtitle: 'Os 3 erros mais comuns de cada turma',
    threshold: 0.88,
    offsetPct: '14%',
    Icon: AnalyticsIcon,
  },
];

const HOURS_RULER = ['18h', '21h', '0h', '3h', '6h'];

const START_MINUTES = 1080; // 18:00
const SPAN_MINUTES = 780; // -> 07:00 (1080 + 780 = 1860; 1860 % 1440 = 420)

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function formatMinutesTo24h(rawMinutes: number): string {
  const total = ((Math.round(rawMinutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(h24).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export const WhileYouSleepSection: React.FC = () => {
  const pinRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState<number>(0.6); // default focused on 22:41

  useEffect(() => {
    let rafId = 0;

    const updateProgress = () => {
      rafId = 0;
      const el = pinRef.current;
      if (!el || typeof window === 'undefined') return;
      const rect = el.getBoundingClientRect();
      const scrollable = Math.max(1, rect.height - window.innerHeight);
      const next = clamp01(-rect.top / scrollable);
      setProgress((prev) => (Math.abs(prev - next) < 0.0005 ? prev : next));
    };

    const onScrollOrResize = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const handleJumpToThreshold = useCallback((threshold: number) => {
    const el = pinRef.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const pageTop = window.scrollY + rect.top;
    const scrollable = Math.max(1, rect.height - window.innerHeight);
    const targetScrollY = pageTop + Math.min(1, threshold + 0.015) * scrollable;
    window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
  }, []);

  const clockLabel = formatMinutesTo24h(START_MINUTES + progress * SPAN_MINUTES);
  const actionsCount = Math.round(180 + progress * 522);
  const dawnOpacity = clamp01((progress - 0.45) / 0.55);

  let activeIdx = 0;
  NIGHT_EVENTS.forEach((ev, idx) => {
    if (progress >= ev.threshold) {
      activeIdx = idx;
    }
  });

  return (
    <section
      data-framer-name="Rotina Noturna"
      className="w-full bg-white pt-[140px] lg:pt-[160px] pb-[40px] px-3 sm:px-[20px]"
    >
      <div className="max-w-[1200px] mx-auto mb-[52px] lg:mb-[64px] px-2">
        <SectionHeading lines={['A escola fecha.', 'A correção não.']} />
      </div>

      {/* Desktop Sticky Scroll-Driven Night-to-Dawn Panel */}
      <div
        ref={pinRef}
        data-framer-name="Pin"
        className="hidden lg:block max-w-[1400px] mx-auto relative h-[2250px]"
      >
        <div
          data-framer-name="Night Panel"
          className="sticky top-[24px] w-full h-[min(846px,calc(100vh-48px))] min-h-[660px] rounded-[36px] overflow-hidden bg-[#050814] pt-[32px] px-[40px] pb-0 flex flex-col justify-between select-none shadow-[0_24px_60px_rgba(5,8,20,0.16)]"
        >
          {/* Procedural Cobalt Gradient Base Fallback */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(65% 60% at 48% 58%, rgba(47,91,255,0.42) 0%, rgba(16,33,96,0.34) 45%, rgba(5,8,20,1) 100%)',
            }}
          />

          {/* Night 3D Cobalt Ribbon Art Layer */}
          <img
            src="https://framerusercontent.com/images/Yauq7SLjbx0zFq7OVVy3sY9rwU.jpg?width=2400&height=1345"
            alt=""
            aria-hidden="true"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* Scroll-Crossfaded Dawn Layer */}
          <div
            data-framer-name="Dawn Layer"
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none transition-opacity duration-150 ease-out"
            style={{ opacity: dawnOpacity }}
          >
            <img
              src="https://framerusercontent.com/images/08qakQA1Q2X3dkpWzXNrtN3CxaE.jpg?width=2400&height=1600"
              alt=""
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Bottom Legibility Shade */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(5, 10, 26, 0) 52%, rgba(5, 10, 26, 0.48) 100%)',
            }}
          />

          {/* Top Bar: Last Night Pill + Live Scroll Clock */}
          <div className="relative z-20 flex items-start justify-between gap-6">
            <div
              data-framer-name="Chip · Ontem à noite"
              className="rounded-full bg-white/[0.15] backdrop-blur-[10px] border border-white/[0.16] px-[14px] py-[8px] flex items-center gap-[8px]"
            >
              <span className="relative flex w-[7px] h-[7px]">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#35D07F] opacity-75" />
                <span className="relative inline-flex rounded-full w-[7px] h-[7px] bg-[#35D07F]" />
              </span>
              <span className="tm-sans text-[13px] font-medium text-white tabular-nums tracking-[-0.01em]">
                Ontem à noite · 18:00 → 7:00
              </span>
            </div>

            <div
              data-framer-name="Clock"
              className="rounded-[24px] bg-[#050814]/35 backdrop-blur-[12px] border border-white/[0.14] px-[24px] py-[16px] flex flex-col items-end gap-[4px]"
            >
              <div className="tm-display text-[56px] xl:text-[64px] font-medium leading-none tracking-[-0.03em] text-white tabular-nums">
                {clockLabel}
              </div>
              <div className="tm-sans text-[14px] leading-snug text-white/75 tabular-nums">
                {actionsCount} correções desde as 18h
              </div>
            </div>
          </div>

          {/* Chronological Events Stems + Track + Hours Ruler */}
          <div
            data-framer-name="Events"
            className="relative z-20 flex-1 flex flex-col justify-end min-h-0 mt-2"
          >
            {/* 5 Staggered Event Columns */}
            <div className="grid grid-cols-5 w-full flex-1 max-h-[540px] min-h-0">
              {NIGHT_EVENTS.map((ev, idx) => {
                const reached = progress >= ev.threshold;
                const isCurrent = idx === activeIdx;
                const EventIcon = ev.Icon;

                return (
                  <div
                    key={ev.id}
                    data-framer-name={`Col · ${ev.time}`}
                    className="flex flex-col items-start h-full min-w-0"
                  >
                    {/* Vertical Stagger Spacer */}
                    <div style={{ height: ev.offsetPct }} className="shrink-0" />

                    {/* Floating Frosted Event Card */}
                    <motion.button
                      type="button"
                      onClick={() => handleJumpToThreshold(ev.threshold)}
                      data-framer-name={`Event · ${ev.title}`}
                      animate={{
                        scale: isCurrent ? 1 : reached ? 0.99 : 0.97,
                        opacity: reached ? 1 : 0.48,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 340,
                        damping: 26,
                      }}
                      style={{
                        borderColor: isCurrent ? '#2F5BFF' : 'rgba(255, 255, 255, 0.7)',
                      }}
                      className="w-max max-w-[240px] xl:max-w-none rounded-[20px] bg-white/[0.92] backdrop-blur-[10px] border py-[14px] pl-[14px] pr-[18px] shadow-[0_24px_50px_rgba(10,15,31,0.14)] flex items-center gap-[12px] text-left cursor-pointer relative z-20 focus:outline-none"
                    >
                      <div
                        data-framer-name="Icon"
                        className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 transition-colors duration-300 ${
                          isCurrent
                            ? 'bg-[#2F5BFF] text-white'
                            : 'bg-[#F4F5F7] text-[#0A0A0B]'
                        }`}
                      >
                        <EventIcon className="w-[16px] h-[16px]" />
                      </div>

                      <div className="pr-[6px] min-w-0">
                        <div className="tm-sans text-[14px] font-medium leading-[1.25] text-[#0A0A0B] truncate">
                          {ev.title}
                        </div>
                        <div className="tm-sans text-[12.5px] leading-[1.3] text-[#6B6F76] truncate mt-[2px]">
                          {ev.subtitle}
                        </div>
                      </div>

                      <span className="tm-sans text-[12px] text-[#6B6F76] tabular-nums shrink-0">
                        {ev.time}
                      </span>
                    </motion.button>

                    {/* Vertical Hairline Stem + Track Node */}
                    <div
                      data-framer-name="Stem"
                      className="flex-1 flex flex-col items-center ml-0 w-[10px] min-h-[24px]"
                    >
                      <div
                        data-framer-name="Connector"
                        className={`w-[1px] flex-1 transition-colors duration-300 ${
                          reached ? 'bg-white/75' : 'bg-white/40'
                        }`}
                      />
                      <div
                        data-framer-name="Node"
                        className={`w-[8px] h-[8px] rounded-full -mb-[5px] relative z-30 transition-all duration-300 ${
                          reached ? 'bg-white' : 'bg-white/40'
                        } ${
                          isCurrent
                            ? 'scale-125 shadow-[0_0_0_3px_#2F5BFF,0_0_0_9px_rgba(47,91,255,0.32)]'
                            : ''
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Horizontal Timeline Track */}
            <div
              data-framer-name="Track"
              className="w-full h-[2px] bg-white/[0.28] relative z-10 rounded-full overflow-hidden"
            >
              <div
                data-framer-name="Progress"
                className="h-full bg-white rounded-full"
                style={{ width: `${(progress * 100).toFixed(2)}%` }}
              />
            </div>

            {/* Bottom Hours Ruler (18h .. 6h) */}
            <div
              data-framer-name="Hours"
              className="w-full pt-[15px] pb-[32px] flex items-center justify-between tm-sans text-[13px] text-white/75 tabular-nums"
            >
              {HOURS_RULER.map((hour) => (
                <span key={hour}>{hour}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Night Timeline (< 1024px) */}
      <div
        data-framer-name="Timeline · Mobile"
        className="lg:hidden max-w-[760px] mx-auto rounded-[28px] overflow-hidden bg-[#050814] p-6 sm:p-8 relative text-white shadow-[0_20px_50px_rgba(5,8,20,0.18)]"
      >
        <img
          src="https://framerusercontent.com/images/Yauq7SLjbx0zFq7OVVy3sY9rwU.jpg?width=2400&height=1345"
          alt=""
          aria-hidden="true"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#050814]/40 via-[#050814]/55 to-[#050814]/85 pointer-events-none"
        />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="rounded-full bg-white/[0.15] backdrop-blur-[10px] border border-white/[0.16] px-[13px] py-[7px] inline-flex items-center gap-[8px]">
              <span className="w-[7px] h-[7px] rounded-full bg-[#35D07F]" />
              <span className="tm-sans text-[12.5px] font-medium text-white tabular-nums">
                18:00 → 7:00
              </span>
            </div>

            <div className="rounded-[20px] bg-[#050814]/45 backdrop-blur-[12px] border border-white/[0.14] px-4 py-3 text-right">
              <div className="tm-display text-[36px] font-medium leading-none text-white tabular-nums">
                22:41
              </div>
              <div className="tm-sans text-[12.5px] text-white/75 tabular-nums mt-1">
                702 correções
              </div>
            </div>
          </div>

          <div className="relative pl-6 flex flex-col gap-3.5">
            <div className="absolute left-[7px] top-3 bottom-3 w-[2px] bg-white/30 rounded-full" />
            {NIGHT_EVENTS.map((ev, idx) => {
              const EventIcon = ev.Icon;
              const isHighlighted = idx === 3; // 22:41 Competência 5 em alta
              return (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: idx * 0.07 }}
                  className="relative flex items-center"
                >
                  <span
                    className={`absolute -left-[21px] w-[10px] h-[10px] rounded-full ${
                      isHighlighted
                        ? 'bg-white shadow-[0_0_0_3px_#2F5BFF,0_0_0_8px_rgba(47,91,255,0.3)]'
                        : 'bg-white'
                    }`}
                  />
                  <div
                    className={`w-full rounded-[18px] bg-white/[0.94] backdrop-blur-[10px] p-3.5 flex items-center gap-3 shadow-lg ${
                      isHighlighted ? 'border border-[#2F5BFF]' : 'border border-white/70'
                    }`}
                  >
                    <div
                      className={`w-[36px] h-[36px] rounded-[10px] flex items-center justify-center shrink-0 ${
                        isHighlighted
                          ? 'bg-[#2F5BFF] text-white'
                          : 'bg-[#F4F5F7] text-[#0A0A0B]'
                      }`}
                    >
                      <EventIcon className="w-[15px] h-[15px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="tm-sans text-[13.5px] font-medium text-[#0A0A0B] truncate">
                        {ev.title}
                      </div>
                      <div className="tm-sans text-[12px] text-[#6B6F76] truncate">
                        {ev.subtitle}
                      </div>
                    </div>
                    <span className="tm-sans text-[11.5px] text-[#6B6F76] tabular-nums shrink-0">
                      {ev.time}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/15 tm-sans text-[12px] text-white/70 tabular-nums">
            {HOURS_RULER.map((hour) => (
              <span key={hour}>{hour}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
