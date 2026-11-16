"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { SectionHeading } from './SectionHeading';
import { TillmornButton } from './TillmornButton';
import { CheckTimelineIcon } from './TillmornIcons';

const DIAGNOSTICO_ITEMS = [
  'Volume de alunos e turmas ativas',
  'Rotina atual de correção e feedback',
  'Objetivos pedagógicos da instituição',
];

const PROPOSTA_ITEMS = [
  'Planos para escolas de 50 a 2.000 alunos',
  'Opção Enterprise para redes e operações maiores',
  'Economia real frente a corretores manuais',
];

const IMPLEMENTACAO_ITEMS = [
  'Setup rápido das turmas e permissões',
  'Treinamento da equipe pedagógica',
  'Início imediato das correções por IA',
];

interface HiringStepProps {
  number: string;
  title: string;
  description: string;
  items: string[];
  delay: number;
}

const HiringStep: React.FC<HiringStepProps> = ({
  number,
  title,
  description,
  items,
  delay,
}) => (
  <motion.div
    data-framer-name={`Etapa ${number} · ${title}`}
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ type: 'spring', stiffness: 260, damping: 28, delay }}
    className="relative flex flex-col justify-between overflow-hidden rounded-[28px] p-[22px] sm:p-[36px] bg-[#F4F5F7] text-[#0A0A0B] border border-black/[0.04] transition-all duration-300"
  >
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <span className="tm-sans text-[12.5px] font-semibold uppercase tracking-[0.12em] text-[#2F5BFF] bg-[#2F5BFF]/10 px-[10px] py-[4px] rounded-full">
          Passo 0{number}
        </span>
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full tm-display text-[16px] font-semibold bg-white text-[#2F5BFF] shadow-[0_2px_6px_rgba(10,15,31,0.06)]">
          {number}
        </span>
      </div>

      <div className="mt-[20px] sm:mt-[26px]">
        <h3 className="tm-display text-[22px] sm:text-[26px] font-medium leading-[1.2] tracking-[-0.025em] text-[#0A0A0B]">
          {title}
        </h3>
        <p className="mt-[8px] sm:mt-[10px] tm-sans text-[14.5px] sm:text-[15px] leading-[1.45] text-[#6B6F76]">
          {description}
        </p>
      </div>

      <div className="my-[20px] sm:my-[24px] h-[1px] w-full bg-[#0A0A0B]/[0.06]" />

      <ul className="flex flex-col gap-[12px]">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-[10px]">
            <span className="mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#2F5BFF]/10 text-[#2F5BFF]">
              <CheckTimelineIcon className="h-[10.5px] w-[10.5px]" />
            </span>
            <span className="tm-sans text-[14px] sm:text-[14.5px] leading-[1.35] text-[#374151]">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  </motion.div>
);

export const PricingSection: React.FC = () => {
  return (
    <section
      id="como-contratar"
      data-framer-name="Como Funciona a Contratação"
      className="w-full bg-white px-4 pb-[40px] pt-[80px] sm:px-[40px] sm:pt-[120px] lg:pt-[150px]"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-[36px] lg:gap-[44px]">
        <div className="flex max-w-[860px] flex-col items-center gap-[16px] text-center">
          <SectionHeading
            lines={['Como funciona a implantação', 'na sua instituição.']}
            mobileLines={['Como funciona']}
          />
          <p className="tm-sans max-w-[760px] text-[16px] leading-[1.45] text-[#6B6F76] sm:text-[18px]">
            Dimensionado para a sua realidade. Mais prática constante para cada estudante, do
            colégio local às grandes redes de ensino.
          </p>
          <span className="rounded-full border border-[#2F5BFF]/20 bg-[#2F5BFF]/[0.07] px-[14px] py-[7px] tm-sans text-[13px] font-semibold text-[#2146D0]">
            Processo ágil · sem travar a rotina da escola
          </span>
        </div>

        <div className="grid w-full grid-cols-1 items-stretch gap-[24px] pt-[8px] lg:grid-cols-3">
          <HiringStep
            number="1"
            title="Reunião de Diagnóstico"
            description="Entendemos o volume de alunos, a operação de correção e as necessidades pedagógicas da sua escola."
            items={DIAGNOSTICO_ITEMS}
            delay={0}
          />
          <HiringStep
            number="2"
            title="Proposta Personalizada"
            description="Adequamos a solução ao porte da instituição, com economia real frente ao custo de corretores manuais."
            items={PROPOSTA_ITEMS}
            delay={0.08}
          />
          <HiringStep
            number="3"
            title="Implementação Guiada"
            description="Colocamos sua operação para funcionar rápido, com equipe treinada e correções por IA desde o início."
            items={IMPLEMENTACAO_ITEMS}
            delay={0.16}
          />
        </div>

        {/* Único CTA centralizado para a jornada completa */}
        <div className="flex flex-col items-center gap-[12px] pt-[16px] w-full max-w-[380px] sm:max-w-none">
          <TillmornButton
            label="Agendar conversa de diagnóstico"
            variant="primary"
            href="#waitlist"
            className="w-full sm:w-auto px-[24px] sm:px-[34px] py-[14px] sm:py-[16px] text-[15px] sm:text-[16px]"
          />
          <p className="text-center tm-sans text-[13.5px] sm:text-[14px] text-[#6B6F76]">
            Da primeira conversa à primeira correção em até 24 horas.
          </p>
        </div>
      </div>
    </section>
  );
};
