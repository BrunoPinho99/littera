"use client";

import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { motion } from 'framer-motion';
import { SectionHeading } from './SectionHeading';
import { CheckTimelineIcon, ShieldCheckIcon, SyncArrowsIcon } from './TillmornIcons';

type TagTone = 'light' | 'cobalt' | 'dark';

interface IntegrationTag {
  label: string;
  dot: string;
  tone: TagTone;
}

const SCHOOL_INTEGRATION_TAGS: IntegrationTag[] = [
  { label: 'Google Classroom', dot: '#0F9D58', tone: 'light' },
  { label: 'Microsoft Teams', dot: '#6264A7', tone: 'dark' },
  { label: 'Google Workspace', dot: '#4285F4', tone: 'cobalt' },
  { label: 'Microsoft 365', dot: '#D83B01', tone: 'light' },
  { label: 'Moodle', dot: '#F98012', tone: 'light' },
  { label: 'Canvas', dot: '#E63228', tone: 'light' },
  { label: 'Totvs Educacional', dot: '#008289', tone: 'light' },
  { label: 'Sponte', dot: '#1E88E5', tone: 'cobalt' },
  { label: 'Agenda Edu', dot: '#3D5AFE', tone: 'light' },
  { label: 'ClassApp', dot: '#00BFA5', tone: 'light' },
  { label: 'Planilha Excel/CSV', dot: '#107C41', tone: 'dark' },
  { label: 'Login Google', dot: '#EA4335', tone: 'light' },
  { label: 'Login Microsoft', dot: '#00A4EF', tone: 'light' },
];

function seededNoise(seed: number): number {
  const val = Math.sin(seed * 999) * 10000;
  return val - Math.floor(val);
}

const PhysicsSchoolPills: React.FC = () => {
  const arenaRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return;
    const updateSize = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    updateSize();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = arenaRef.current;
    if (!el || !size.w || !size.h || typeof window === 'undefined') return;

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      let cursorX = 0;
      let row = 0;
      pillRefs.current.forEach((pill, i) => {
        if (!pill) return;
        const pw = pill.offsetWidth || 110;
        if (cursorX + pw > size.w) {
          cursorX = (row % 2 ? 0 : 24) + seededNoise(i) * 20;
          row++;
        }
        const x = cursorX;
        const y = size.h - 44 - row * 40;
        const angle = (seededNoise(i + 7) - 0.5) * 0.35;
        pill.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${angle.toFixed(3)}rad)`;
        cursorX += pw + 6;
      });
      return;
    }

    const { Engine, Bodies, Composite, Mouse, MouseConstraint, Body } = Matter;
    let engine: Matter.Engine | null = null;
    let rafId = 0;
    let mouse: Matter.Mouse | null = null;
    let started = false;

    pillRefs.current.forEach((pill, idx) => {
      if (pill) {
        const startX = (size.w / SCHOOL_INTEGRATION_TAGS.length) * idx;
        pill.style.transform = `translate3d(${startX.toFixed(1)}px, -220px, 0)`;
      }
    });

    const startPhysics = () => {
      if (started) return;
      started = true;

      engine = Engine.create();
      engine.gravity.y = 1;

      const w = size.w;
      const h = size.h;
      const wallOpts = { isStatic: true, restitution: 0.2 };

      Composite.add(engine.world, [
        Bodies.rectangle(w / 2, h + 50, w * 3, 100, wallOpts),
        Bodies.rectangle(-50, h / 2, 100, h * 4, wallOpts),
        Bodies.rectangle(w + 50, h / 2, 100, h * 4, wallOpts),
      ]);

      const pillBodies = pillRefs.current.map((pill, idx) => {
        const pw = pill?.offsetWidth || 116;
        const ph = pill?.offsetHeight || 44;
        const spawnX = 40 + seededNoise(idx + 3) * Math.max(40, w - 80);
        const spawnY = -60 - idx * 55 - seededNoise(idx) * 40;
        const body = Bodies.rectangle(spawnX, spawnY, pw, ph, {
          chamfer: { radius: ph / 2 },
          restitution: 0.25,
          friction: 0.5,
          density: 0.002,
        });
        Body.setAngle(body, (seededNoise(idx + 11) - 0.5) * 0.8);
        return body;
      });

      Composite.add(engine.world, pillBodies);

      mouse = Mouse.create(el);
      const mouseAny = mouse as unknown as {
        element: HTMLElement;
        mousewheel: EventListener;
      };
      mouseAny.element.removeEventListener('mousewheel', mouseAny.mousewheel);
      mouseAny.element.removeEventListener('DOMMouseScroll', mouseAny.mousewheel);
      mouseAny.element.removeEventListener('wheel', mouseAny.mousewheel);

      const mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: {
          stiffness: 0.2,
          render: { visible: false },
        },
      });
      Composite.add(engine.world, mouseConstraint);

      let prevTs = performance.now();
      const step = (now: number) => {
        if (!engine) return;
        const dt = Math.min(32, Math.max(8, now - prevTs));
        prevTs = now;
        Engine.update(engine, dt);

        pillBodies.forEach((body, idx) => {
          const pill = pillRefs.current[idx];
          if (!pill) return;
          const pw = pill.offsetWidth;
          const ph = pill.offsetHeight;
          const tx = body.position.x - pw / 2;
          const ty = body.position.y - ph / 2;
          pill.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${body.angle.toFixed(4)}rad)`;
        });

        rafId = window.requestAnimationFrame(step);
      };

      rafId = window.requestAnimationFrame(step);
    };

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            startPhysics();
          }
        },
        { threshold: 0.3 }
      );
      io.observe(el);
    } else {
      startPhysics();
    }

    return () => {
      io?.disconnect();
      window.cancelAnimationFrame(rafId);
      if (engine) {
        Composite.clear(engine.world, false);
        Engine.clear(engine);
      }
      if (mouse) {
        const mouseWithClear = Mouse as unknown as {
          clearSourceEvents?: (m: Matter.Mouse) => void;
        };
        mouseWithClear.clearSourceEvents?.(mouse);
      }
    };
  }, [size.w, size.h]);

  return (
    <div
      ref={arenaRef}
      role="list"
      aria-label="Integrações disponíveis"
      className="relative w-full flex-1 min-h-[300px] select-none touch-pan-y"
    >
      {SCHOOL_INTEGRATION_TAGS.map((tag, idx) => {
        const toneClasses =
          tag.tone === 'cobalt'
            ? 'bg-[#2F5BFF] text-white'
            : tag.tone === 'dark'
              ? 'bg-[#0A0A0B] text-white'
              : 'bg-white text-[#0A0A0B]';

        return (
          <div
            key={tag.label}
            role="listitem"
            ref={(node) => {
              pillRefs.current[idx] = node;
            }}
            style={{
              transform: 'translate3d(0px, -220px, 0)',
            }}
            className={`absolute left-0 top-0 z-10 inline-flex items-center gap-[9px] py-[12px] pl-[14px] pr-[18px] rounded-full whitespace-nowrap shadow-[0_4px_12px_rgba(10,10,11,0.08)] cursor-grab active:cursor-grabbing will-change-transform tm-sans text-[15.5px] sm:text-[16.5px] font-medium leading-[1.2] tracking-[-0.01em] ${toneClasses}`}
          >
            <span
              aria-hidden="true"
              className="w-[14px] h-[14px] rounded-full shrink-0"
              style={{
                backgroundColor: tag.tone === 'light' ? tag.dot : '#FFFFFF',
              }}
            />
            <span>{tag.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export const IntegrationsBentoSection: React.FC = () => {
  return (
    <section
      id="integracoes"
      data-framer-name="Integrações"
      className="w-full bg-white pt-[120px] lg:pt-[150px] pb-[40px] px-5 sm:px-[40px]"
    >
      <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-[52px] lg:gap-[64px]">
        <SectionHeading lines={['Encaixa na rotina', 'da sua instituição.']} />

        <div className="w-full flex flex-col gap-[24px]">
          {/* Top Row: Card A (Physics) + Card B (Implantação 48 horas) */}
          <div className="w-full flex flex-col lg:flex-row gap-[24px] lg:h-[520px]">
            {/* Top-Left Wide Physics Card */}
            <motion.div
              data-framer-name="Card · Funciona com o que a escola já usa"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="flex-1 h-[460px] lg:h-[520px] rounded-[28px] bg-[#F4F5F7] pt-[36px] px-[28px] sm:px-[36px] pb-[18px] flex flex-col justify-between overflow-hidden relative"
            >
              <div className="relative z-20 flex flex-col gap-[6px] pointer-events-none">
                <h3 className="tm-display text-[26px] sm:text-[28px] font-medium leading-[1.2] tracking-[-0.02em] text-[#0A0A0B]">
                  Funciona com o que você já usa
                </h3>
                <p className="tm-sans text-[15.5px] leading-[1.42] text-[#6B6F76]">
                  13+ integrações para escolas e cursinhos. Turmas importadas. Zero retrabalho.
                </p>
              </div>

              <PhysicsSchoolPills />
            </motion.div>

            {/* Top-Right Photo Card: No ar em 48 horas */}
            <motion.div
              data-framer-name="Card · No ar em 48 horas"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.08 }}
              className="w-full lg:w-[384px] h-[480px] lg:h-[520px] rounded-[28px] p-[24px] sm:p-[28px] relative overflow-hidden flex flex-col justify-between shrink-0 bg-[#1B1D21]"
            >
              <img
                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=85"
                alt="Ambiente educacional de implantação rápida"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/35 pointer-events-none"
              />

              <div className="relative z-10 flex flex-col gap-[4px]">
                <span className="tm-sans text-[15px] font-normal text-white/85">No ar em</span>
                <div className="tm-display text-[40px] sm:text-[44px] font-medium leading-[1.04] tracking-[-0.03em] text-white">
                  48 horas
                </div>
              </div>

              {/* Frosted 3-step onboarding checklist */}
              <div className="relative z-10 rounded-[22px] bg-white/[0.93] backdrop-blur-[10px] p-[18px] sm:p-[20px] shadow-[0_16px_32px_rgba(10,15,31,0.16)] flex flex-col gap-[13px]">
                <div className="flex items-center gap-[12px]">
                  <span className="w-[22px] h-[22px] rounded-full bg-[#2F5BFF] text-white flex items-center justify-center shrink-0">
                    <CheckTimelineIcon className="w-[12.5px] h-[12.5px]" />
                  </span>
                  <span className="tm-sans text-[14.5px] font-medium text-[#0A0A0B]">
                    Importe suas turmas
                  </span>
                </div>

                <div className="flex items-center gap-[12px]">
                  <span className="w-[22px] h-[22px] rounded-full bg-[#2F5BFF] text-white flex items-center justify-center shrink-0">
                    <CheckTimelineIcon className="w-[12.5px] h-[12.5px]" />
                  </span>
                  <span className="tm-sans text-[14.5px] font-medium text-[#0A0A0B]">
                    Publique o primeiro tema
                  </span>
                </div>

                <div className="flex items-center gap-[12px]">
                  <span className="w-[22px] h-[22px] rounded-full border-[1.75px] border-[#2F5BFF] shrink-0" />
                  <span className="tm-sans text-[14.5px] text-[#6B6F76]">
                    Convide os professores
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom Row: 3 Equal Bento Cards */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
            {/* Cell 1: Segurança institucional */}
            <motion.div
              data-framer-name="Segurança institucional"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.04 }}
              className="rounded-[28px] bg-[#F4F5F7] p-[32px] min-h-[268px] flex flex-col justify-between gap-[20px]"
            >
              <div className="w-[46px] h-[46px] rounded-full bg-white shadow-[0_4px_10px_rgba(10,15,31,0.06)] flex items-center justify-center text-[#2F5BFF]">
                <ShieldCheckIcon className="w-[21px] h-[21px]" />
              </div>

              <div className="flex flex-col gap-[8px]">
                <h3 className="tm-display text-[24px] sm:text-[25px] font-medium leading-[1.2] tracking-[-0.02em] text-[#0A0A0B]">
                  Segurança institucional
                </h3>
                <p className="tm-sans text-[14.5px] sm:text-[15px] leading-[1.45] text-[#6B6F76]">
                  Dados criptografados, acesso por perfil e textos nunca usados para treinar modelos
                  de terceiros.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-[8px]">
                {['LGPD', 'SSO', 'Criptografia'].map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full bg-white px-[12px] py-[5.5px] tm-sans text-[12px] font-medium leading-none text-[#0A0A0B] shadow-[0_2px_4px_rgba(10,15,31,0.04)]"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Cell 2: Critério ENEM (5 competências · Nota de 0 a 1000) */}
            <motion.div
              data-framer-name="Critério ENEM"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.1 }}
              className="rounded-[28px] bg-[#F4F5F7] p-[32px] min-h-[268px] flex flex-col justify-between gap-[20px]"
            >
              <div className="flex flex-col gap-[8px]">
                <div className="tm-display text-[46px] sm:text-[54px] font-medium leading-none tracking-[-0.04em] text-[#0A0A0B] tabular-nums">
                  5 competências
                </div>
                <p className="tm-sans text-[15px] leading-[1.35] text-[#6B6F76]">
                  Nota de 0 a 1000 em cada redação
                </p>
              </div>

              <div className="flex flex-col gap-[14px]">
                <div className="w-full h-[9px] rounded-full bg-[#0A0A0B]/[0.08] overflow-hidden">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{
                      duration: 1.4,
                      delay: 0.2,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{ width: '100%' }}
                    className="h-full rounded-full bg-[#2F5BFF] origin-left"
                  />
                </div>
                <p className="tm-sans text-[13.5px] leading-[1.4] text-[#6B6F76]">
                  Matriz de referência ENEM — avaliada linha por linha.
                </p>
              </div>
            </motion.div>

            {/* Cell 3: Notas no boletim, sem digitar */}
            <motion.div
              data-framer-name="Sincronização Boletim"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.16 }}
              className="rounded-[28px] bg-[#F4F5F7] p-[32px] min-h-[268px] flex flex-col justify-between gap-[18px]"
            >
              <h3 className="tm-display text-[24px] sm:text-[25px] font-medium leading-[1.2] tracking-[-0.02em] text-[#0A0A0B]">
                Notas no boletim, sem digitar
              </h3>

              <div className="flex flex-col gap-[10px]">
                <div className="rounded-[14px] bg-white px-[14px] py-[12px] shadow-[0_4px_10px_rgba(10,15,31,0.05)] flex items-center justify-between gap-2">
                  <span className="tm-sans text-[13.5px] font-medium text-[#0A0A0B]">
                    Littera · 3º A
                  </span>
                  <span className="rounded-full bg-[#2F5BFF]/10 text-[#2F5BFF] px-[10px] py-[4.5px] tm-sans text-[11.5px] font-medium leading-none shrink-0">
                    Redação corrigida · 880
                  </span>
                </div>

                <div className="flex items-center gap-[6px] pl-[10px] text-[#1F9D55]">
                  <SyncArrowsIcon className="w-[14px] h-[14px]" />
                  <span className="tm-sans text-[12.5px] font-medium leading-none">
                    Sincronizado há 2 s
                  </span>
                </div>

                <div className="rounded-[14px] bg-white px-[14px] py-[12px] shadow-[0_4px_10px_rgba(10,15,31,0.05)] flex items-center justify-between gap-2">
                  <span className="tm-sans text-[13.5px] font-medium text-[#0A0A0B]">
                    Classroom · 3º A
                  </span>
                  <span className="rounded-full bg-[#35D07F]/15 text-[#178047] px-[10px] py-[4.5px] tm-sans text-[11.5px] font-medium leading-none shrink-0">
                    Nota lançada
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
