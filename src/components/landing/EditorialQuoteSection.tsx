"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * Modelo de depoimento institucional (Dobra 9).
 * Substitua pelos dados reais e autorizados da primeira escola cliente antes de publicar.
 */
export const FEATURED_SCHOOL_QUOTE = {
  quote:
    'A devolutiva da banca levava duas semanas e o vestibulando já tinha perdido o ritmo. Hoje ele reescreve no mesmo dia — e o cursinho cortou custos sem limitar envios.',
  authorName: 'Coordenação Pedagógica & Redação',
  authorRole: 'Colégio e Pré-Vestibular Parceiro',
  avatarUrl:
    'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=400&q=85',
} as const;

interface ProofCountUpKpiProps {
  prefix?: string;
  target?: number;
  staticDisplay?: string;
  decimals?: number;
  suffix?: string;
  label: string;
}

const ProofCountUpKpi: React.FC<ProofCountUpKpiProps> = ({
  prefix = '',
  target,
  staticDisplay,
  decimals = 0,
  suffix = '',
  label,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [text, setText] = useState<string>(() =>
    staticDisplay ?? `${prefix}${(0).toFixed(decimals)}${suffix}`
  );

  useEffect(() => {
    if (staticDisplay || typeof target !== 'number') {
      if (staticDisplay) setText(staticDisplay);
      return;
    }
    if (!inView) return;

    const duration = 1100;
    const startTs = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - startTs) / duration));
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = (target * eased).toFixed(decimals);
      setText(`${prefix}${val}${suffix}`);
      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        setText(`${prefix}${target.toFixed(decimals)}${suffix}`);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [inView, prefix, target, staticDisplay, decimals, suffix]);

  return (
    <div
      ref={ref}
      className="flex flex-col items-center justify-center py-[14px] px-[20px] gap-[6px] text-center"
    >
      <div className="tm-display text-[44px] sm:text-[56px] lg:text-[62px] font-medium leading-[1.04] tracking-[-0.04em] text-[#0A0A0B] tabular-nums">
        {text}
      </div>
      <span className="tm-sans text-[15px] text-[#6B6F76]">{label}</span>
    </div>
  );
};

export const EditorialQuoteSection: React.FC = () => {
  return (
    <section
      data-framer-name="Depoimento e Métricas"
      className="w-full bg-white pt-[110px] lg:pt-[140px] pb-[40px] px-5 sm:px-[40px]"
    >
      <div className="max-w-[1020px] mx-auto flex flex-col items-center">
        <motion.blockquote
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[920px] text-center tm-display text-[26px] sm:text-[36px] lg:text-[42px] font-medium leading-[1.18] tracking-[-0.03em] text-[#0A0A0B]"
        >
          “{FEATURED_SCHOOL_QUOTE.quote}”
        </motion.blockquote>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mt-[28px] flex items-center gap-[14px]"
        >
          <img
            src={FEATURED_SCHOOL_QUOTE.avatarUrl}
            alt={FEATURED_SCHOOL_QUOTE.authorName}
            decoding="async"
            className="w-[50px] h-[50px] rounded-full object-cover shrink-0"
          />
          <div className="flex flex-col">
            <span className="tm-sans text-[15px] font-medium leading-[1.3] text-[#0A0A0B]">
              {FEATURED_SCHOOL_QUOTE.authorName}
            </span>
            <span className="tm-sans text-[13.5px] leading-[1.35] text-[#6B6F76]">
              {FEATURED_SCHOOL_QUOTE.authorRole}
            </span>
          </div>
        </motion.div>

        {/* 3 Métricas (versão pré-primeiro-cliente conforme especificação) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.75, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="mt-[64px] lg:mt-[80px] w-full max-w-[980px] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#0A0A0B]/[0.08]"
        >
          <ProofCountUpKpi staticDisplay="Ilimitadas" label="redações por aluno" />
          <ProofCountUpKpi target={14} decimals={0} suffix=" s" label="de devolutiva" />
          <ProofCountUpKpi target={24} decimals={0} suffix="/7" label="sempre disponível" />
        </motion.div>
      </div>
    </section>
  );
};

