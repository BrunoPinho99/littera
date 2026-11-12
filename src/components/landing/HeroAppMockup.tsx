"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import {
  AnalyticsIcon,
  InboxIcon,
  LeadsIcon,
  MeetingsIcon,
  OverviewIcon,
  PlusIcon,
  SequencesIcon,
  TillmornDiamondGlyph,
} from './TillmornIcons';

interface CountUpValueProps {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  usePtBrGrouping?: boolean;
  className?: string;
}

const CountUpValue: React.FC<CountUpValueProps> = ({
  target,
  prefix = '',
  suffix = '',
  decimals = 0,
  usePtBrGrouping = false,
  className = '',
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const formatNumber = (val: number) => {
    if (usePtBrGrouping) {
      if (decimals === 0) {
        return Math.round(val).toLocaleString('pt-BR');
      }
      return val.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    return val.toFixed(decimals);
  };

  const [display, setDisplay] = useState<string>(() =>
    prefersReducedMotion
      ? `${prefix}${formatNumber(target)}${suffix}`
      : `${prefix}${formatNumber(0)}${suffix}`
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(`${prefix}${formatNumber(target)}${suffix}`);
      return;
    }
    const el = ref.current;
    if (!el) return;

    let rafId = 0;
    let started = false;

    const runAnimation = () => {
      if (started) return;
      started = true;
      const t0 = performance.now();
      const duration = 1200;

      const tick = (now: number) => {
        const progress = Math.min(1, Math.max(0, (now - t0) / duration));
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = target * eased;
        setDisplay(`${prefix}${formatNumber(current)}${suffix}`);
        if (progress < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          setDisplay(`${prefix}${formatNumber(target)}${suffix}`);
        }
      };

      rafId = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          runAnimation();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [target, prefix, suffix, decimals, usePtBrGrouping, prefersReducedMotion]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {display}
    </span>
  );
};

interface KpiItem {
  id: string;
  label: string;
  mobileLabel: string;
  target: number;
  prefix?: string;
  suffix?: string;
  delta: string;
  usePtBrGrouping?: boolean;
  bars: number[];
}

const KPI_ITEMS: KpiItem[] = [
  {
    id: 'corrigidas',
    label: 'Redações corrigidas',
    mobileLabel: 'Corrigidas',
    target: 1248,
    usePtBrGrouping: true,
    delta: '+41%',
    bars: [10, 16, 13, 19, 22, 29, 35],
  },
  {
    id: 'media',
    label: 'Nota média',
    mobileLabel: 'Média',
    target: 742,
    delta: '+38 pts',
    bars: [10, 13, 11, 17, 20, 28, 35],
  },
  {
    id: 'devolutiva',
    label: 'Devolutiva média',
    mobileLabel: 'Devolutiva',
    target: 14,
    suffix: ' s',
    delta: '−99%',
    bars: [20, 24, 23, 28, 31, 33, 35],
  },
  {
    id: 'economia',
    label: 'Economia no mês',
    mobileLabel: 'Economia',
    target: 7488,
    prefix: 'R$ ',
    usePtBrGrouping: true,
    delta: '+31%',
    bars: [12, 17, 15, 23, 25, 30, 35],
  },
];

type ActivityStatus = 'Corrigida' | 'Reescrita' | 'Evoluiu' | 'Revisão' | 'Professor' | 'Novo';

interface ActivityLead {
  id: string;
  initials: string;
  avatarBg: string;
  title: string;
  detail: string;
  time: string;
  status: ActivityStatus;
}

const INITIAL_ACTIVITY: ActivityLead[] = [
  {
    id: 'ana-beatriz',
    initials: 'AB',
    avatarBg: 'rgba(53, 208, 127, 0.22)',
    title: 'Ana Beatriz · 3º A',
    detail: 'Corrigida: 880 pontos',
    time: '2 min',
    status: 'Corrigida',
  },
  {
    id: 'lucas-ferreira',
    initials: 'LF',
    avatarBg: 'rgba(47, 91, 255, 0.22)',
    title: 'Lucas Ferreira · 3º B',
    detail: 'Enviou a 2ª versão do texto',
    time: '14 min',
    status: 'Reescrita',
  },
  {
    id: 'julia-martins',
    initials: 'JM',
    avatarBg: 'rgba(140, 199, 153, 0.25)',
    title: 'Júlia Martins · 2º A',
    detail: 'Competência 3 subiu de 120 para 160',
    time: '38 min',
    status: 'Evoluiu',
  },
  {
    id: 'pedro-henrique',
    initials: 'PH',
    avatarBg: 'rgba(237, 140, 115, 0.25)',
    title: 'Pedro Henrique · 3º C',
    detail: 'Encaminhada ao professor: possível fuga ao tema',
    time: '1 h',
    status: 'Revisão',
  },
  {
    id: 'carla-souza',
    initials: 'CS',
    avatarBg: 'rgba(178, 153, 229, 0.25)',
    title: 'Prof.ª Carla Souza · Linguagens',
    detail: 'Comentou 4 redações do 3º A',
    time: '2 h',
    status: 'Professor',
  },
  {
    id: 'turma-3b',
    initials: '3B',
    avatarBg: 'rgba(153, 191, 217, 0.25)',
    title: 'Turma 3º B',
    detail: 'Novo tema: “Saúde mental na juventude”',
    time: '3 h',
    status: 'Novo',
  },
];

const STATUS_STYLES: Record<ActivityStatus, string> = {
  Corrigida: 'bg-[#35D07F]/[0.16] text-[#178047]',
  Reescrita: 'bg-[#2F5BFF] text-white',
  Evoluiu: 'bg-[#2F5BFF]/[0.12] text-[#2F5BFF]',
  Revisão: 'bg-[#F4F5F7] text-[#6B6F76]',
  Professor: 'bg-[#F4F5F7] text-[#6B6F76]',
  Novo: 'bg-[#F4F5F7] text-[#6B6F76]',
};

const ROW_OPACITIES = [1, 1, 1, 1, 0.6, 0.3];

const TODAY_CLASSES = [
  { id: 'p1', title: 'Plantão de redação — 3º A', meta: '10:30 · Pauta gerada pelo Littera' },
  { id: 'p2', title: 'Reforço: Competência 5 — 3º B', meta: '13:00 · Pauta gerada pelo Littera' },
  { id: 'p3', title: 'Mentoria — alunos abaixo de 600', meta: '16:00 · Lista gerada pelo Littera' },
];

const REWRITE_RATE_BARS = [21, 28, 34, 45, 52, 58, 64];

interface SidebarItem {
  id: string;
  label: string;
  badge?: string;
  Icon: React.FC<{ className?: string }>;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'visao-geral', label: 'Visão geral', Icon: OverviewIcon },
  { id: 'turmas', label: 'Turmas', Icon: LeadsIcon },
  { id: 'redacoes', label: 'Redações', Icon: SequencesIcon },
  { id: 'revisoes', label: 'Revisões', badge: '12', Icon: InboxIcon },
  { id: 'temas', label: 'Temas', Icon: MeetingsIcon },
  { id: 'relatorios', label: 'Relatórios', Icon: AnalyticsIcon },
];

export const HeroAppMockup: React.FC = () => {
  const [activeNav, setActiveNav] = useState<string>('visao-geral');
  const [leads, setLeads] = useState<ActivityLead[]>(INITIAL_ACTIVITY);
  const [paused, setPaused] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const activityRef = useRef<HTMLDivElement>(null);
  const [activityInView, setActivityInView] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const { scrollY } = useScroll();
  const rawRotateX = useTransform(scrollY, [0, 460], [14, 0]);
  const rawScale = useTransform(scrollY, [0, 460], [0.91, 1]);
  const rawOpacity = useTransform(scrollY, [0, 320], [0.92, 1]);

  const rotateX = useSpring(rawRotateX, { stiffness: 220, damping: 30, mass: 0.4 });
  const scale = useSpring(rawScale, { stiffness: 220, damping: 30, mass: 0.4 });
  const stageOpacity = useSpring(rawOpacity, { stiffness: 220, damping: 30, mass: 0.4 });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const updateViewport = () => setIsCompactViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    const el = activityRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setActivityInView(entry.isIntersecting);
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || paused || !activityInView) return;
    const interval = window.setInterval(() => {
      setLeads((prev) => {
        const next = [...prev];
        const last = next.pop();
        if (last) next.unshift(last);
        return next;
      });
    }, 1800);
    return () => window.clearInterval(interval);
  }, [paused, activityInView, prefersReducedMotion]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 1200 }}
      className="w-full min-w-0 max-w-[1280px] mx-auto pt-[56px] md:pt-[68px] px-3 sm:px-6 xl:px-0 relative z-10 overflow-hidden"
    >
      {/* Frosted Glass Stage Container */}
      <motion.div
        data-framer-name="Stage"
        style={
          prefersReducedMotion || isCompactViewport
            ? undefined
            : {
                rotateX,
                scale,
                opacity: stageOpacity,
                transformOrigin: '50% 0%',
              }
        }
        className="relative w-full min-w-0 max-w-full rounded-t-[28px] sm:rounded-t-[36px] bg-white/[0.42] backdrop-blur-[16px] border border-b-0 border-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_-12px_50px_rgba(10,15,31,0.03)] pt-[28px] sm:pt-[54px] lg:pt-[62px] px-2.5 sm:px-8 lg:px-[70px] overflow-hidden will-change-transform"
      >
        {/* Inner App Window (app.littera.com.br) */}
        <div
          data-framer-name="App Window"
          className="w-full min-w-0 max-w-[1140px] mx-auto bg-white rounded-t-[20px] border border-[#E9EBEF] border-b-0 shadow-[0_32px_72px_rgba(10,15,31,0.12)] overflow-hidden text-left"
        >
          {/* Browser Chrome Title Bar */}
          <div className="h-[42px] px-[16px] border-b border-[#E9EBEF] bg-white flex items-center justify-between select-none">
            <div className="flex items-center gap-[6px] w-[48px]">
              <span className="w-[9px] h-[9px] rounded-full bg-[#E9EBEF]" />
              <span className="w-[9px] h-[9px] rounded-full bg-[#E9EBEF]" />
              <span className="w-[9px] h-[9px] rounded-full bg-[#E9EBEF]" />
            </div>

            <div className="w-[210px] sm:w-[252px] h-[23px] rounded-[7px] bg-[#F4F5F7] flex items-center justify-center">
              <span className="tm-sans text-[12.5px] leading-[15px] text-[#6B6F76]">
                app.littera.com.br
              </span>
            </div>

            <div className="w-[48px]" />
          </div>

          {/* Dashboard Workspace Body */}
          <div className="flex flex-col md:flex-row">
            {/* Left Sidebar */}
            <aside className="hidden md:flex w-full md:w-[212px] shrink-0 bg-[#FAFAFB] border-b md:border-b-0 md:border-r border-[#E9EBEF] p-[18px_14px] md:p-[20px_16px] flex-col justify-between">
              <div>
                {/* Sidebar Logo */}
                <div className="flex items-center gap-[8px] px-[10px] mb-[18px]">
                  <TillmornDiamondGlyph size={19} className="text-[#0A0A0B]" />
                  <span className="tm-sans text-[16px] leading-[20.8px] font-medium tracking-[0.16px] text-[#0A0A0B]">
                    Littera
                  </span>
                </div>

                {/* Sidebar Navigation */}
                <nav
                  aria-label="Mockup sidebar"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1 gap-[3px]"
                >
                  {SIDEBAR_ITEMS.map((item) => {
                    const isActive = activeNav === item.id;
                    const IconComponent = item.Icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveNav(item.id)}
                        className={`relative flex items-center justify-between w-full h-[35px] px-[10px] rounded-[10px] text-[14px] leading-[18.2px] transition-colors cursor-pointer ${
                          isActive
                            ? 'font-medium text-[#0A0A0B]'
                            : 'font-normal text-[#6B6F76] hover:text-[#0A0A0B]'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="tm-hero-sidebar-pill"
                            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                            className="absolute inset-0 rounded-[10px] bg-white shadow-[0_2px_6px_rgba(10,15,31,0.06)] border border-black/[0.03]"
                          />
                        )}
                        <span className="relative z-10 inline-flex items-center gap-[9px]">
                          <IconComponent
                            className={`w-[14px] h-[14px] ${
                              isActive ? 'text-[#0A0A0B]' : 'text-[#6B6F76]'
                            }`}
                          />
                          <span>{item.label}</span>
                        </span>
                        {item.badge && (
                          <span className="relative z-10 inline-flex items-center justify-center px-[7px] py-[1.5px] rounded-full bg-[#2F5BFF] text-white text-[11.5px] leading-[13.8px] font-medium tabular-nums">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Bottom Agent Status Card */}
              <div className="mt-5 md:mt-10 md:mb-16 bg-white border border-[#E9EBEF] rounded-[14px] p-[13px_14px] shadow-[0_1px_2px_rgba(10,15,31,0.02)]">
                <div className="flex items-center gap-[8px]">
                  <span className="relative flex h-[7px] w-[7px] shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#35D07F] opacity-75" />
                    <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-[#35D07F]" />
                  </span>
                  <span className="tm-sans text-[13px] leading-[16.9px] font-medium text-[#0A0A0B]">
                    O Littera está corrigindo
                  </span>
                </div>
                <p className="mt-[3px] tm-sans text-[12px] leading-[15.6px] text-[#6B6F76]">
                  Avaliando 37 redações…
                </p>
                <div className="mt-[10px] h-[3px] w-full rounded-full bg-[#F4F5F7] overflow-hidden">
                  <motion.div
                    initial={{ scaleX: 0.05, opacity: 1 }}
                    animate={{
                      scaleX: [0.05, 1, 1],
                      opacity: [1, 1, 0],
                    }}
                    transition={{
                      duration: 3.2,
                      times: [0, 0.8, 1],
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    style={{ transformOrigin: '0% 50%' }}
                    className="h-full w-full rounded-full bg-[#2F5BFF]"
                  />
                </div>
              </div>
            </aside>

            {/* Center & Right Main Workspace */}
            <div className="flex-1 min-w-0 bg-white p-[16px] sm:p-[28px_30px_34px]">
              {/* Top Greeting Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-[22px]">
                <div>
                  <h2 className="tm-display text-[25px] sm:text-[30px] leading-[1.2] font-medium tracking-[-0.03em] text-[#0A0A0B]">
                    Bom dia, Helena
                  </h2>
                  <p className="mt-[2px] tm-sans text-[14.5px] sm:text-[15px] leading-[19.5px] text-[#6B6F76]">
                    Veja o que o Littera corrigiu desde ontem.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-[8px]">
                  <span className="inline-flex items-center px-[13px] py-[7px] rounded-full border border-[#E9EBEF] bg-white tm-sans text-[13px] leading-[15.6px] font-medium text-[#0A0A0B] tabular-nums">
                    Seg, 16 mar
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-[6px] px-[14px] py-[7.5px] rounded-full bg-[#0A0A0B] hover:bg-[#2A2B30] transition-colors tm-sans text-[13px] leading-[15.6px] font-medium text-white cursor-pointer"
                  >
                    <PlusIcon className="w-[12px] h-[12px]" />
                    <span>Novo tema</span>
                  </button>
                </div>
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[12px] mb-[14px]">
                {KPI_ITEMS.map((kpi) => (
                  <div
                    key={kpi.id}
                    className="rounded-[16px] border border-[#E9EBEF] bg-white p-[15px] flex flex-col justify-between min-h-[106px]"
                  >
                    <span className="tm-sans text-[13px] leading-[16.9px] text-[#6B6F76]">
                      <span className="hidden sm:inline">{kpi.label}</span>
                      <span className="sm:hidden">{kpi.mobileLabel}</span>
                    </span>

                    <div className="mt-[6px] flex items-end justify-between gap-2">
                      <div className="flex flex-col items-start">
                        <CountUpValue
                          target={kpi.target}
                          prefix={kpi.prefix}
                          suffix={kpi.suffix}
                          usePtBrGrouping={kpi.usePtBrGrouping}
                          className="tm-display text-[28px] sm:text-[30px] leading-[34.5px] font-medium tracking-[-0.03em] text-[#0A0A0B]"
                        />
                        <span className="mt-[6px] inline-flex items-center px-[8px] py-[2px] rounded-full bg-[#35D07F]/[0.16] text-[#178047] tm-sans text-[12px] leading-[15px] font-medium tabular-nums">
                          {kpi.delta}
                        </span>
                      </div>

                      {/* Mini 7-bar Spark Histogram */}
                      <div
                        className="flex items-end gap-[3.5px] h-[36px] pb-[1px]"
                        aria-hidden="true"
                      >
                        {kpi.bars.map((barHeight, idx) => {
                          const isLast = idx === kpi.bars.length - 1;
                          return (
                            <motion.span
                              key={idx}
                              initial={{ scaleY: 0 }}
                              whileInView={{ scaleY: 1 }}
                              viewport={{ once: true, amount: 0.3 }}
                              transition={{
                                duration: 0.7,
                                delay: 0.15 + idx * 0.07,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              style={{
                                height: `${barHeight}px`,
                                transformOrigin: '50% 100%',
                              }}
                              className={`w-[5.5px] rounded-[2px] block ${
                                isLast ? 'bg-[#2F5BFF]' : 'bg-[#2F5BFF]/[0.18]'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Lower Split: Live Activity + Today / Reescrita */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_268px] gap-[14px]">
                {/* Live Activity Feed */}
                <div
                  ref={activityRef}
                  onPointerEnter={() => setPaused(true)}
                  onPointerLeave={() => setPaused(false)}
                  className="rounded-[16px] border border-[#E9EBEF] bg-white overflow-hidden"
                >
                  <div className="h-[46px] px-[18px] flex items-center justify-between">
                    <span className="tm-sans text-[15px] leading-[19.5px] font-medium text-[#0A0A0B]">
                      <span className="hidden sm:inline">Atividade ao vivo</span>
                      <span className="sm:hidden">Ao vivo</span>
                    </span>
                    <span className="inline-flex items-center gap-[5px] px-[9px] py-[3px] rounded-full bg-[#35D07F]/[0.16] text-[#178047] tm-sans text-[11.5px] leading-[13.8px] font-medium">
                      <span className="w-[5px] h-[5px] rounded-full bg-[#35D07F] animate-pulse" />
                      <span>Ao vivo</span>
                    </span>
                  </div>

                  <div className="divide-y divide-[#E9EBEF] border-t border-[#E9EBEF]">
                    {leads.map((lead, idx) => (
                      <motion.div
                        key={lead.id}
                        layout="position"
                        initial={{ opacity: 0, y: -18 }}
                        animate={{ opacity: ROW_OPACITIES[idx] ?? 0.3, y: 0 }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        className="h-[51px] px-[12px] sm:px-[18px] flex items-center justify-between gap-3 bg-white min-w-0"
                      >
                        <div className="flex items-center gap-[11px] min-w-0 flex-1">
                          <span
                            style={{ backgroundColor: lead.avatarBg }}
                            className="w-[29px] h-[29px] rounded-full flex items-center justify-center shrink-0 tm-sans text-[11.5px] leading-none font-medium text-[#0A0A0B]"
                          >
                            {lead.initials}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="tm-sans text-[14px] leading-[17.5px] font-medium text-[#0A0A0B] truncate">
                              {lead.title}
                            </p>
                            <p className="tm-sans text-[13px] leading-[16.5px] text-[#6B6F76] truncate">
                              {lead.detail}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-[10px] shrink-0">
                          <span className="tm-sans text-[12px] leading-[15.6px] text-[#6B6F76] tabular-nums">
                            {lead.time}
                          </span>
                          <span
                            className={`inline-flex items-center justify-center px-[9px] py-[2.5px] rounded-full tm-sans text-[12px] leading-[15px] font-medium ${STATUS_STYLES[lead.status]}`}
                          >
                            {lead.status}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Hoje · 3 plantões + Taxa de reescrita */}
                <div className="flex flex-col gap-[14px]">
                  {/* Hoje · 3 plantões */}
                  <div className="rounded-[16px] border border-[#E9EBEF] bg-white p-[16px]">
                    <div className="flex items-center justify-between mb-[12px]">
                      <span className="tm-sans text-[15px] leading-[19.5px] font-medium text-[#0A0A0B]">
                        Hoje
                      </span>
                      <span className="tm-sans text-[13px] leading-[16.9px] text-[#6B6F76] tabular-nums">
                        3 plantões
                      </span>
                    </div>

                    <div className="space-y-[7px]">
                      {TODAY_CLASSES.map((item, idx) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 12 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.3 }}
                          transition={{
                            duration: 0.6,
                            delay: 0.1 + idx * 0.11,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="rounded-[10px] bg-[#2F5BFF] px-[12px] py-[8.5px] text-white"
                        >
                          <p className="tm-sans text-[13.5px] leading-[17.5px] font-medium text-white truncate">
                            {item.title}
                          </p>
                          <p className="tm-sans text-[11.5px] leading-[15px] text-white/75 tabular-nums truncate">
                            {item.meta}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Taxa de reescrita · 64% */}
                  <div className="rounded-[16px] border border-[#E9EBEF] bg-white p-[15px_16px_17px] flex-1 flex flex-col justify-between">
                    <div>
                      <span className="tm-sans text-[13px] leading-[16.9px] text-[#6B6F76] block">
                        Taxa de reescrita
                      </span>
                      <CountUpValue
                        target={64}
                        decimals={0}
                        suffix="%"
                        className="mt-[2px] block tm-display text-[30px] leading-[36px] font-medium tracking-[-0.03em] text-[#0A0A0B]"
                      />
                    </div>

                    <div
                      className="mt-[12px] flex items-end justify-between gap-[7px] h-[64px]"
                      aria-hidden="true"
                    >
                      {REWRITE_RATE_BARS.map((heightPx, idx) => {
                        const isHighlight = idx === REWRITE_RATE_BARS.length - 1;
                        return (
                          <motion.span
                            key={idx}
                            initial={{ scaleY: 0 }}
                            whileInView={{ scaleY: 1 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{
                              duration: 0.7,
                              delay: 0.15 + idx * 0.07,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            style={{
                              height: `${heightPx}px`,
                              transformOrigin: '50% 100%',
                              background: isHighlight
                                ? 'linear-gradient(180deg, #2F5BFF 0%, rgba(47, 91, 255, 0.28) 100%)'
                                : 'rgba(47, 91, 255, 0.11)',
                            }}
                            className="flex-1 rounded-[4px] block"
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Editorial Fade Overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[135px] bg-gradient-to-b from-white/0 via-white/75 to-white z-20"
        />
      </motion.div>
    </motion.div>
  );
};
