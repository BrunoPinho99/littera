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
  dark?: boolean;
  delay: number;
}

const HiringStep: React.FC<HiringStepProps> = ({
  number,
  title,
  description,
  items,
  dark = false,
  delay,
}) => (
  <motion.div
    data-framer-name={`Etapa ${number} · ${title}`}
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ type: 'spring', stiffness: 260, damping: 28, delay }}
    className={`relative flex flex-col overflow-hidden rounded-[28px] p-[32px] sm:p-[36px] ${
      dark ? 'bg-[#04060E] text-white' : 'bg-[#F4F5F7] text-[#0A0A0B]'
    }`}
  >
    {dark && (
      <motion.div
        aria-hidden="true"
        animate={{ opacity: [0.82, 1, 0.82], scale: [1, 1.06, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(62% 48% at 58% 36%, rgba(47, 91, 255, 0.52) 0%, rgba(47, 91, 255, 0) 100%)',
        }}
        className="absolute inset-0 pointer-events-none"
      />
    )}

    <div className="relative z-10 flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`tm-sans text-[13px] font-semibold uppercase tracking-[0.12em] ${
            dark ? 'text-[#9BB4FF]' : 'text-[#2F5BFF]'
          }`}
        >
          Etapa {number}
        </span>
        <span
          className={`flex h-[36px] w-[36px] items-center justify-center rounded-full tm-display text-[18px] font-medium ${
            dark ? 'bg-white/10 text-white' : 'bg-[#2F5BFF]/10 text-[#2F5BFF]'
          }`}
        >
          {number}
        </span>
      </div>

      <div className="mt-[28px]">
        <h3 className="tm-display text-[28px] font-medium leading-[1.15] tracking-[-0.025em]">
          {title}
        </h3>
        <p
          className={`mt-[12px] tm-sans text-[15.5px] leading-[1.45] ${
            dark ? 'text-white/75' : 'text-[#6B6F76]'
          }`}
        >
          {description}
        </p>
      </div>

      <div
        className={`my-[28px] h-[1px] w-full ${
          dark ? 'bg-white/[0.14]' : 'bg-[#0A0A0B]/[0.08]'
        }`}
      />

      <ul className="flex flex-col gap-[14px]">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-[12px]">
            <span
              className={`mt-[1px] flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full ${
                dark ? 'bg-[#35D07F]/20 text-[#35D07F]' : 'bg-[#2F5BFF]/10 text-[#2F5BFF]'
              }`}
            >
              <CheckTimelineIcon className="h-[11.5px] w-[11.5px]" />
            </span>
            <span
              className={`tm-sans text-[15px] leading-[1.3] ${
                dark ? 'text-white/90' : 'text-[#0A0A0B]'
              }`}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-[32px]">
        <TillmornButton
          label="Agendar demonstração"
          variant={dark ? 'white' : 'primary'}
          href="#waitlist"
          className="w-full"
        />
      </div>
    </div>
  </motion.div>
);

export const PricingSection: React.FC = () => {
  return (
    <section
      id="como-contratar"
      data-framer-name="Como Contratar"
      className="w-full bg-white px-5 pb-[40px] pt-[120px] sm:px-[40px] lg:pt-[150px]"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-[36px] lg:gap-[44px]">
        <div className="flex max-w-[860px] flex-col items-center gap-[16px] text-center">
          <SectionHeading
            lines={['Correção ilimitada.', 'Feita para a rotina da sua escola.']}
            mobileLines={['Correção ilimitada.']}
          />
          <p className="tm-sans max-w-[760px] text-[16px] leading-[1.45] text-[#6B6F76] sm:text-[18px]">
            Uma contratação consultiva para instituições de 50 a 2.000 alunos, com plano
            Enterprise para redes maiores. Todos os alunos praticam livremente, sem limite de
            envios de redações.
          </p>
          <span className="rounded-full border border-[#2F5BFF]/20 bg-[#2F5BFF]/[0.07] px-[14px] py-[7px] tm-sans text-[13px] font-semibold text-[#2146D0]">
            Sem custo por redação · envios ilimitados para os alunos
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
            dark
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

        <p className="pt-[8px] text-center tm-sans text-[15px] font-medium text-[#4B5563]">
          Da primeira conversa ao primeiro feedback, sua escola começa sem travar a rotina.
        </p>
      </div>
    </section>
  );
};
