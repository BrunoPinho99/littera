"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { SectionHeading } from './SectionHeading';
import { ChevronDownMarkIcon, OverviewIcon } from './TillmornIcons';

interface VoiceLineSpec {
  widthPct: string;
  highlighted?: boolean;
}

const CRITERION_LINES: VoiceLineSpec[] = [
  { widthPct: '100%' },
  { widthPct: '92.2%' },
  { widthPct: '70.1%', highlighted: true },
  { widthPct: '84%' },
  { widthPct: '50.2%' },
];

interface OrbitTool {
  name: string;
  dotColor: string;
  initialAngle: number;
}

const SCHOOL_ORBIT_TOOLS: OrbitTool[] = [
  { name: 'Google Classroom', dotColor: '#0F9D58', initialAngle: -2.72 },
  { name: 'Microsoft Teams', dotColor: '#6264A7', initialAngle: -1.62 },
  { name: 'Google Workspace', dotColor: '#4285F4', initialAngle: -0.63 },
  { name: 'Moodle', dotColor: '#F98012', initialAngle: 0.21 },
  { name: 'Planilhas', dotColor: '#107C41', initialAngle: 1.13 },
  { name: 'WhatsApp', dotColor: '#25D366', initialAngle: 2.41 },
];

const SchoolIntegrationsOrbit: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const rx = 132;
    const ry = 88;

    const applyPositions = (angleDelta: number, ramp: number) => {
      SCHOOL_ORBIT_TOOLS.forEach((tool, idx) => {
        const el = pillRefs.current[idx];
        if (!el) return;
        const baseX = rx * Math.cos(tool.initialAngle);
        const baseY = ry * Math.sin(tool.initialAngle);
        const theta = tool.initialAngle + angleDelta;
        const targetX = rx * Math.cos(theta);
        const targetY = ry * Math.sin(theta);
        const x = baseX + (targetX - baseX) * ramp;
        const y = baseY + (targetY - baseY) * ramp;
        const depthScale = 1 - 0.06 * (1 - (Math.sin(theta) + 1) / 2) * ramp;
        el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(
          2
        )}px, 0) scale(${depthScale.toFixed(4)})`;
      });
    };

    applyPositions(0, 0);
    if (prefersReduced) return;

    let rafId = 0;
    let isIntersecting = false;
    let startTs = performance.now();
    let accumulatedMs = 0;

    const tick = (now: number) => {
      const elapsed = accumulatedMs + (now - startTs);
      const angleDelta = (elapsed / 40000) * Math.PI * 2;
      const ramp = 1 - Math.pow(1 - Math.min(1, Math.max(0, elapsed / 800)), 3);
      applyPositions(angleDelta, ramp);
      rafId = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (!rafId) {
        startTs = performance.now();
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const stop = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
        accumulatedMs += performance.now() - startTs;
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
      if (isIntersecting && !document.hidden) {
        start();
      } else {
        stop();
      }
    });
    observer.observe(container);

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else if (isIntersecting) {
        start();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-framer-name="Integrations Orbit"
      className="relative w-[340px] h-[236px] shrink-0 max-w-full flex items-center justify-center select-none"
    >
      {/* Dashed Elliptical Ring */}
      <div
        data-framer-name="Ring"
        aria-hidden="true"
        className="w-[264px] sm:w-[292px] h-[176px] sm:h-[194px] rounded-[50%] border border-dashed border-[#0A0A0B]/[0.14] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      />

      {/* Central Littera Core */}
      <div
        data-framer-name="Core"
        className="w-[72px] h-[72px] rounded-[24px] bg-[#0A0A0B] text-white shadow-[0_12px_15px_rgba(10,15,31,0.2)] flex items-center justify-center relative z-10"
      >
        <ChevronDownMarkIcon className="w-[24px] h-[24px]" strokeWidth={2.5} />
      </div>

      {/* 6 Orbiting Stack Pills */}
      {SCHOOL_ORBIT_TOOLS.map((tool, idx) => (
        <div
          key={tool.name}
          ref={(el) => {
            pillRefs.current[idx] = el;
          }}
          data-framer-name={tool.name}
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate3d(${(
              132 * Math.cos(tool.initialAngle)
            ).toFixed(1)}px, ${(88 * Math.sin(tool.initialAngle)).toFixed(1)}px, 0)`,
          }}
          className="absolute z-20 rounded-full bg-white shadow-[0_6px_8px_rgba(10,15,31,0.08)] py-[7px] pl-[8px] pr-[12px] flex items-center gap-[7px] will-change-transform whitespace-nowrap"
        >
          <span
            aria-hidden="true"
            className="w-[14px] h-[14px] rounded-full shrink-0"
            style={{ backgroundColor: tool.dotColor }}
          />
          <span className="tm-sans text-[12.5px] font-medium leading-none text-[#0A0A0B]">
            {tool.name}
          </span>
        </div>
      ))}
    </div>
  );
};

export const FeaturesBentoSection: React.FC = () => {
  const handoffRef = useRef<HTMLDivElement>(null);
  const handoffInView = useInView(handoffRef, { once: true, amount: 0.35 });
  const [isHandoffHovered, setIsHandoffHovered] = useState(false);
  const [introToastVisible, setIntroToastVisible] = useState(false);

  const { scrollYProgress } = useScroll({
    target: handoffRef,
    offset: ['start end', 'center center'],
  });
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.1, 1]);

  useEffect(() => {
    if (!handoffInView) return;
    const showTimer = window.setTimeout(() => setIntroToastVisible(true), 420);
    const hideTimer = window.setTimeout(() => setIntroToastVisible(false), 3400);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [handoffInView]);

  const showReviewToast = isHandoffHovered || introToastVisible;

  return (
    <section
      id="recursos"
      data-framer-name="Recursos"
      className="w-full bg-white pt-[140px] lg:pt-[160px] pb-[40px] px-5 sm:px-[40px]"
    >
      <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-[52px] lg:gap-[64px]">
        <SectionHeading
          lines={['Critério de banca.', 'Escala de software.']}
          mobileLines={['Critério de banca.']}
        />

        <div className="w-full flex flex-col lg:flex-row gap-[24px] lg:h-[640px]">
          {/* Left Tall Bento Card: Sabe quando chamar o professor */}
          <motion.div
            ref={handoffRef}
            data-framer-name="Card · Fila do Professor"
            onPointerEnter={() => setIsHandoffHovered(true)}
            onPointerLeave={() => setIsHandoffHovered(false)}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-full lg:w-[521px] h-[520px] lg:h-[640px] rounded-[28px] p-[28px] relative overflow-hidden flex flex-col justify-end shrink-0 bg-[#1C1917] cursor-pointer"
          >
            {/* Scroll-Linked Zoom Photo Background (Professora em ambiente escolar / notebook) */}
            <motion.img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1400&q=85"
              alt="Professora revisando redação no notebook"
              decoding="async"
              style={{ scale: photoScale }}
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none will-change-transform"
            />

            {/* Subtle Vignette Scrim */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-black/20 pointer-events-none"
            />

            {/* Top Notification Toast: Enviada para revisão · Prof.ª Carla */}
            <motion.div
              data-framer-name="Review Toast"
              initial={false}
              animate={{
                opacity: showReviewToast ? 1 : 0,
                y: showReviewToast ? 0 : -8,
              }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-[28px] left-[28px] right-[28px] sm:right-auto z-20 rounded-full bg-white/[0.95] backdrop-blur-[10px] py-[9px] pl-[12px] pr-[16px] shadow-[0_12px_24px_rgba(10,15,31,0.14)] flex items-center gap-[9px] pointer-events-none"
            >
              <div className="w-[20px] h-[20px] rounded-full bg-[#2F5BFF] text-white flex items-center justify-center shrink-0">
                <OverviewIcon className="w-[11px] h-[11px]" />
              </div>
              <span className="tm-sans text-[13px] font-medium leading-none text-[#0A0A0B] truncate">
                Enviada para revisão · Prof.ª Carla
              </span>
            </motion.div>

            {/* Bottom Frosted Handoff Copy Card */}
            <div
              data-framer-name="Handoff Card"
              style={{
                transform: isHandoffHovered ? 'translateY(-8px)' : 'translateY(0px)',
                boxShadow: isHandoffHovered
                  ? '0 28px 40px rgba(10, 10, 11, 0.22)'
                  : '0 16px 20px rgba(10, 15, 31, 0.12)',
              }}
              className="relative z-20 w-full rounded-[22px] bg-white/92 backdrop-blur-[12px] py-[22px] px-[24px] flex flex-col gap-[8px] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            >
              <h3 className="tm-display text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-[#0A0A0B]">
                Sabe quando chamar o professor
              </h3>
              <p className="tm-sans text-[15.5px] leading-[1.42] text-[#6B6F76]">
                <span className="hidden sm:inline">
                  Casos sensíveis vão para a fila do professor — com o trecho marcado e o motivo.
                </span>
                <span className="sm:hidden">Com o trecho marcado e o motivo.</span>
              </p>
            </div>
          </motion.div>

          {/* Right Column: Corrige com o critério do ENEM + Vive na rotina da escola */}
          <div className="flex-1 flex flex-col gap-[24px] min-w-0">
            {/* Top-Right Card: Corrige com o critério do ENEM */}
            <motion.div
              data-framer-name="Card · Criterio ENEM"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.08 }}
              className="flex-1 min-h-[280px] lg:h-[308px] rounded-[28px] bg-[#F4F5F7] p-[28px] sm:p-[36px] flex flex-col sm:flex-row items-center justify-between gap-[28px] sm:gap-[32px]"
            >
              <div className="w-full sm:w-[230px] shrink-0 flex flex-col gap-[8px]">
                <h3 className="tm-display text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-[#0A0A0B]">
                  Corrige com o critério do ENEM
                </h3>
                <p className="tm-sans text-[15.5px] leading-[1.42] text-[#6B6F76]">
                  <span className="hidden sm:inline">
                    Cada nota vem com o trecho que a justifica, competência por competência.
                  </span>
                  <span className="sm:hidden">Cada nota vem justificada.</span>
                </p>
              </div>

              <div
                data-framer-name="Visual Criterio"
                className="w-full sm:w-[321px] max-w-full rounded-[20px] bg-white shadow-[0_10px_12px_rgba(10,15,31,0.06)] pt-[18px] px-[20px] pb-[20px] flex flex-col gap-[14px]"
              >
                <div className="flex items-center justify-between gap-2 pb-[2px]">
                  <span className="tm-sans text-[14px] font-medium text-[#0A0A0B] truncate">
                    Competência 3 · 3º A
                  </span>
                  <span className="rounded-full bg-[#2F5BFF]/10 text-[#2F5BFF] px-[9px] py-[4px] tm-sans text-[11.5px] font-medium leading-none whitespace-nowrap shrink-0">
                    Matriz de referência ENEM
                  </span>
                </div>

                <div className="w-full flex flex-col gap-[10px]">
                  {CRITERION_LINES.map((line, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{
                        duration: 0.7,
                        delay: 0.2 + idx * 0.16,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{ width: line.widthPct }}
                      className={`h-[8px] rounded-[4px] origin-left ${
                        line.highlighted ? 'bg-[#2F5BFF]/[0.45]' : 'bg-[#0A0A0B]/[0.08]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Bottom-Right Card: Vive na rotina da escola */}
            <motion.div
              data-framer-name="Card · Rotina Escola"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.16 }}
              className="flex-1 min-h-[300px] lg:h-[308px] rounded-[28px] bg-[#F4F5F7] p-[28px] sm:p-[36px] flex flex-col sm:flex-row items-center justify-between gap-[24px] sm:gap-[32px] overflow-hidden"
            >
              <div className="w-full sm:w-[211px] shrink-0 flex flex-col gap-[8px]">
                <h3 className="tm-display text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-[#0A0A0B]">
                  Vive na rotina da escola
                </h3>
                <p className="tm-sans text-[15.5px] leading-[1.42] text-[#6B6F76]">
                  <span className="hidden sm:inline">
                    Turmas, notas e relatórios conectados ao que a escola já usa.
                  </span>
                  <span className="sm:hidden">Conecta turmas, notas e relatórios.</span>
                </p>
              </div>

              <SchoolIntegrationsOrbit />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
