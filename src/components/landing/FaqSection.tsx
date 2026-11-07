"use client";

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SectionHeading } from './SectionHeading';
import { ArrowUpIcon, PlusIcon } from './TillmornIcons';

interface FaqEntry {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqEntry[] = [
  {
    question: 'Como o Littera corrige uma redação?',
    answer:
      'A IA lê o texto inteiro e dá uma nota de 0 a 200 em cada uma das 5 competências do ENEM. A devolutiva chega em segundos, com o trecho que justifica cada nota e o que fazer para subir.',
  },
  {
    question: 'A nota é confiável como a de um corretor humano?',
    answer:
      'O Littera foi calibrado com redações corrigidas por corretores experientes e é medido com a mesma régua de discrepância usada no ENEM. Casos ambíguos vão para a revisão do professor antes de chegar ao aluno.',
  },
  {
    question: 'Quanto custa?',
    answer:
      'Um valor fixo por aluno, em contrato anual, com correções ilimitadas. Apresentamos a proposta na reunião, já com a simulação da calculadora para a sua escola ou cursinho.',
  },
  {
    question: 'Dá para testar antes de contratar?',
    answer:
      'Não trabalhamos com período de teste. Na reunião, corrigimos ao vivo redações reais dos seus alunos, para a equipe ver a qualidade antes de decidir.',
  },
  {
    question: 'Funciona com as plataformas que a instituição já usa?',
    answer:
      'Sim. Google Classroom, Microsoft Teams e planilhas estão conectados. As turmas são importadas em minutos e as notas voltam para onde a escola ou cursinho já lança.',
  },
  {
    question: 'Em quanto tempo a escola ou cursinho começa a usar?',
    answer:
      'Em até 48 horas depois do aceite. Importamos as turmas, publicamos o primeiro tema e treinamos os professores em uma sessão de 1 hora.',
  },
  {
    question: 'Os dados dos alunos estão seguros?',
    answer:
      'Sim. Seguimos a LGPD, criptografamos os dados e controlamos o acesso por perfil. Os textos dos alunos nunca são usados para treinar modelos de terceiros.',
  },
  {
    question: 'E quando o professor discordar da nota?',
    answer:
      'Ele ajusta a nota em um clique e deixa o próprio comentário; o aluno vê a versão final. Cada ajuste ajuda a calibrar o Littera para a sua instituição.',
  },
  {
    question: 'O Littera substitui o professor de redação?',
    answer:
      'Não. Ele assume o trabalho braçal de ler e pontuar. O professor fica com o que só ele faz: aula, plantão e acompanhamento de quem mais precisa.',
  },
];

const CYCLING_PROMPTS: { text: string; targetFaqIdx: number }[] = [
  { text: 'Pergunte qualquer coisa ao Littera…', targetFaqIdx: 0 },
  { text: 'Quanto custa?', targetFaqIdx: 2 },
  { text: 'Dá para testar antes de contratar?', targetFaqIdx: 3 },
  { text: 'A nota é confiável como a de um corretor humano?', targetFaqIdx: 1 },
  { text: 'Em quanto tempo começamos a usar?', targetFaqIdx: 5 },
];

export const FaqSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [promptIdx, setPromptIdx] = useState(0);
  const [typedText, setTypedText] = useState(CYCLING_PROMPTS[0].text);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let currentPrompt = 0;
    let charCount = CYCLING_PROMPTS[0].text.length;
    let isDeleting = true;
    let timerId = 0;

    const step = () => {
      if (isDeleting) {
        charCount--;
        if (charCount <= 0) {
          isDeleting = false;
          currentPrompt = (currentPrompt + 1) % CYCLING_PROMPTS.length;
          setPromptIdx(currentPrompt);
        }
      } else {
        charCount++;
        const nextFull = CYCLING_PROMPTS[currentPrompt].text;
        if (charCount >= nextFull.length) {
          isDeleting = true;
          setTypedText(nextFull);
          timerId = window.setTimeout(step, 1800);
          return;
        }
      }

      const activeStr = CYCLING_PROMPTS[currentPrompt].text;
      setTypedText(activeStr.slice(0, Math.max(charCount, 0)) || '\u200B');
      timerId = window.setTimeout(step, isDeleting ? 28 : 55);
    };

    timerId = window.setTimeout(step, 2200);
    return () => window.clearTimeout(timerId);
  }, []);

  const handlePromptSend = () => {
    const target = CYCLING_PROMPTS[promptIdx]?.targetFaqIdx ?? 0;
    setOpenIdx(target);
  };

  return (
    <section
      id="duvidas"
      data-framer-name="Dúvidas"
      className="w-full bg-white pt-[120px] lg:pt-[150px] pb-[40px] px-5 sm:px-[40px]"
    >
      <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row items-start justify-between gap-[44px] lg:gap-[48px]">
        {/* Left Column: Heading + Ask Littera Portrait Card */}
        <div className="w-full lg:w-[464px] shrink-0 flex flex-col items-start gap-[36px]">
          <SectionHeading lines={['Dúvidas,', 'respondidas.']} className="!text-left" />

          <motion.div
            data-framer-name="Pergunte ao Littera"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="w-full h-[460px] sm:h-[494px] rounded-[28px] bg-[#F4F5F7] relative overflow-hidden p-[20px] flex flex-col justify-end gap-[12px]"
          >
            <img
              src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=85"
              alt="Assistente pedagógica Littera"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
            />

            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"
            />

            {/* Floating Greeting Bubble */}
            <div
              data-framer-name="Mensagem"
              className="relative z-10 rounded-[18px] bg-white px-[16px] py-[13px] shadow-[0_10px_24px_rgba(10,15,31,0.12)] w-max max-w-full flex flex-col gap-[3px]"
            >
              <div className="inline-flex items-center gap-[7px]">
                <span className="w-[6.5px] h-[6.5px] rounded-full bg-[#35D07F] shrink-0" />
                <span className="tm-sans text-[13px] font-medium text-[#0A0A0B]">Littera</span>
              </div>
              <span className="tm-sans text-[13.5px] text-[#6B6F76]">
                Oi! Pergunte como eu corrigiria as redações dos seus alunos.
              </span>
            </div>

            {/* Live Cycling Prompt Input Bar */}
            <button
              type="button"
              onClick={handlePromptSend}
              aria-label="Fazer esta pergunta ao Littera"
              className="relative z-10 w-full rounded-full bg-white py-[8px] pl-[20px] pr-[8px] shadow-[0_12px_28px_rgba(10,15,31,0.12)] flex items-center justify-between gap-[12px] text-left cursor-pointer group"
            >
              <span className="tm-sans text-[14px] text-[#6B6F76] truncate">{typedText}</span>
              <span className="w-[40px] h-[40px] rounded-full bg-[#0A0A0B] group-hover:bg-[#2A2B30] text-white flex items-center justify-center shrink-0 transition-colors">
                <ArrowUpIcon className="w-[15px] h-[15px]" />
              </span>
            </button>
          </motion.div>
        </div>

        {/* Right Column: 9 Interactive Accordion FAQ Items */}
        <div className="w-full flex-1 min-w-0 border-t border-b border-[#0A0A0B]/[0.08] divide-y divide-[#0A0A0B]/[0.08] lg:mt-[24px]">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={item.question} className="w-full">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full py-[24px] flex items-center justify-between gap-[20px] text-left cursor-pointer group"
                >
                  <h3 className="tm-sans text-[17.5px] sm:text-[19px] font-medium leading-[1.35] tracking-[-0.01em] text-[#0A0A0B]">
                    {item.question}
                  </h3>
                  <span
                    className={`w-[36px] h-[36px] rounded-full bg-[#F4F5F7] group-hover:bg-[#E9EBEF] text-[#0A0A0B] flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isOpen ? 'rotate-45' : 'rotate-0'
                    }`}
                  >
                    <PlusIcon className="w-[14px] h-[14px]" />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-[24px] pr-[36px] tm-sans text-[15.5px] leading-[1.55] text-[#6B6F76]">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
