"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { SectionHeading } from './SectionHeading';
import { TillmornButton } from './TillmornButton';
import { CheckTimelineIcon } from './TillmornIcons';

const REUNIAO_ITEMS = [
  'Diagnóstico da rotina de correção da sua escola ou cursinho',
  'Simulação da economia da sua instituição',
  'Correção ao vivo de redações dos seus alunos',
  'Proposta em até 24 h',
  'Sem compromisso',
];

const PROPOSTA_ITEMS = [
  'Correções ilimitadas nas 5 competências',
  'Fila de revisão do professor',
  'Relatórios por turma e competência',
  'Banco de temas no padrão ENEM',
  'Adequado à LGPD',
];

const IMPLANTACAO_ITEMS = [
  'Importação das turmas',
  'Treinamento dos professores',
  'Integração com Classroom e Teams',
  'Acompanhamento no primeiro bimestre',
  'Suporte por e-mail e WhatsApp',
];

export const PricingSection: React.FC = () => {
  return (
    <section
      id="como-contratar"
      data-framer-name="Como Contratar"
      className="w-full bg-white pt-[120px] lg:pt-[150px] pb-[40px] px-5 sm:px-[40px]"
    >
      <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-[36px] lg:gap-[44px]">
        <div className="flex flex-col items-center gap-[16px] text-center max-w-[840px]">
          <SectionHeading
            lines={['Um valor fixo.', 'Do tamanho da sua instituição.']}
            mobileLines={['Um valor fixo.']}
          />
          <p className="tm-sans text-[16px] sm:text-[18px] leading-[1.45] text-[#6B6F76] max-w-[700px]">
            Sem tabela pública e sem custo por folha: para escolas e cursinhos, a proposta é calculada
            pelo número de alunos ativos e apresentada na reunião.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-[24px] items-stretch pt-[8px]">
          {/* Card 1 · Reunião */}
          <motion.div
            data-framer-name="Etapa 1 · Reunião"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="rounded-[28px] bg-[#F4F5F7] p-[32px] sm:p-[36px] flex flex-col justify-between"
          >
            <div>
              <div className="flex flex-col gap-[8px]">
                <h3 className="tm-display text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-[#0A0A0B]">
                  Reunião
                </h3>
                <p className="tm-sans text-[15px] leading-[1.35] text-[#6B6F76]">
                  Entendemos a rotina da sua escola ou cursinho e refazemos a conta com os seus números.
                </p>
              </div>

              <div className="mt-[36px] flex flex-col gap-[6px]">
                <div className="flex items-baseline gap-[6px]">
                  <span className="tm-display text-[48px] sm:text-[56px] font-medium leading-none tracking-[-0.04em] text-[#0A0A0B] tabular-nums">
                    30 min
                  </span>
                </div>
                <span className="tm-sans text-[13px] text-[#6B6F76]">
                  Online, com direção ou coordenação
                </span>
              </div>

              <div className="mt-[28px]">
                <TillmornButton
                  label="Agendar reunião"
                  variant="primary"
                  href="#reuniao"
                  className="w-full"
                />
              </div>

              <div className="my-[28px] h-[1px] w-full bg-[#0A0A0B]/[0.08]" />

              <ul className="flex flex-col gap-[14px]">
                {REUNIAO_ITEMS.map((feat) => (
                  <li key={feat} className="flex items-center gap-[12px]">
                    <span className="w-[20px] h-[20px] rounded-full bg-[#2F5BFF]/10 text-[#2F5BFF] flex items-center justify-center shrink-0">
                      <CheckTimelineIcon className="w-[11.5px] h-[11.5px]" />
                    </span>
                    <span className="tm-sans text-[15px] leading-[1.3] text-[#0A0A0B]">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Card 2 · Proposta (Destaque) */}
          <motion.div
            data-framer-name="Etapa 2 · Proposta"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.08 }}
            className="rounded-[28px] bg-[#04060E] text-white p-[32px] sm:p-[36px] relative overflow-hidden flex flex-col justify-between"
          >
            {/* Ambient Cobalt Radial Glow */}
            <motion.div
              aria-hidden="true"
              animate={{
                opacity: [0.82, 1, 0.82],
                scale: [1, 1.06, 1],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                background:
                  'radial-gradient(62% 48% at 58% 36%, rgba(47, 91, 255, 0.52) 0%, rgba(47, 91, 255, 0) 100%)',
              }}
              className="absolute inset-0 pointer-events-none"
            />

            <div className="relative z-10">
              <div className="flex flex-col gap-[8px]">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="tm-display text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-white">
                    Proposta
                  </h3>
                  <span className="rounded-full bg-[#2F5BFF] text-white px-[11px] py-[5px] tm-sans text-[12px] font-medium leading-none">
                    Sem custo por folha
                  </span>
                </div>
                <p className="tm-sans text-[15px] leading-[1.35] text-white/70">
                  Um valor fixo pelo número de alunos, com correções ilimitadas.
                </p>
              </div>

              <div className="mt-[36px] flex flex-col gap-[6px]">
                <div className="flex items-baseline gap-[6px]">
                  <span className="tm-display text-[48px] sm:text-[56px] font-medium leading-none tracking-[-0.04em] text-white">
                    Valor fixo
                  </span>
                </div>
                <span className="tm-sans text-[13px] text-white/65">
                  Por aluno, em contrato anual
                </span>
              </div>

              <div className="mt-[28px]">
                <TillmornButton
                  label="Receber minha proposta"
                  variant="white"
                  href="#reuniao"
                  className="w-full"
                />
              </div>

              <div className="my-[28px] h-[1px] w-full bg-white/[0.14]" />

              <ul className="flex flex-col gap-[14px]">
                {PROPOSTA_ITEMS.map((feat) => (
                  <li key={feat} className="flex items-center gap-[12px]">
                    <span className="w-[20px] h-[20px] rounded-full bg-[#35D07F]/20 text-[#35D07F] flex items-center justify-center shrink-0">
                      <CheckTimelineIcon className="w-[11.5px] h-[11.5px]" />
                    </span>
                    <span className="tm-sans text-[15px] leading-[1.3] text-white/90">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Card 3 · Implantação */}
          <motion.div
            data-framer-name="Etapa 3 · Implantação"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.16 }}
            className="rounded-[28px] bg-[#F4F5F7] p-[32px] sm:p-[36px] flex flex-col justify-between"
          >
            <div>
              <div className="flex flex-col gap-[8px]">
                <h3 className="tm-display text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-[#0A0A0B]">
                  Implantação
                </h3>
                <p className="tm-sans text-[15px] leading-[1.35] text-[#6B6F76]">
                  Turmas importadas e professores treinados, prontos para o primeiro tema.
                </p>
              </div>

              <div className="mt-[36px] flex flex-col gap-[6px]">
                <div className="flex items-baseline">
                  <span className="tm-display text-[48px] sm:text-[56px] font-medium leading-none tracking-[-0.04em] text-[#0A0A0B] tabular-nums">
                    48 h
                  </span>
                </div>
                <span className="tm-sans text-[13px] text-[#6B6F76]">
                  Do aceite ao primeiro tema
                </span>
              </div>

              <div className="mt-[28px]">
                <TillmornButton
                  label="Falar com um especialista"
                  variant="primary"
                  href="#reuniao"
                  className="w-full"
                />
              </div>

              <div className="my-[28px] h-[1px] w-full bg-[#0A0A0B]/[0.08]" />

              <ul className="flex flex-col gap-[14px]">
                {IMPLANTACAO_ITEMS.map((feat) => (
                  <li key={feat} className="flex items-center gap-[12px]">
                    <span className="w-[20px] h-[20px] rounded-full bg-[#2F5BFF]/10 text-[#2F5BFF] flex items-center justify-center shrink-0">
                      <CheckTimelineIcon className="w-[11.5px] h-[11.5px]" />
                    </span>
                    <span className="tm-sans text-[15px] leading-[1.3] text-[#0A0A0B]">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>

        <p className="pt-[8px] tm-sans text-[15px] font-medium text-[#4B5563] text-center">
          Sem custo por folha. Sem limite de envios. Sem surpresa no orçamento.
        </p>
      </div>
    </section>
  );
};
