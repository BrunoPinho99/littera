"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface SectionHeadingProps {
  lines: string[];
  mobileLines?: string[];
  className?: string;
}

const AnimatedLines: React.FC<{ lines: string[]; keyPrefix: string }> = ({
  lines,
  keyPrefix,
}) => {
  let wordCounter = 0;

  return (
    <>
      {lines.map((line, lineIdx) => {
        const words = line.split(' ');
        return (
          <span key={`${keyPrefix}-${lineIdx}`} className="block">
            {words.map((word, idxInLine) => {
              const currentWordIdx = wordCounter++;
              return (
                <React.Fragment key={`${keyPrefix}-${lineIdx}-${idxInLine}-${word}`}>
                  <motion.span
                    initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{
                      duration: 0.85,
                      delay: currentWordIdx * 0.055,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="inline-block will-change-transform"
                  >
                    {word}
                  </motion.span>
                  {idxInLine < words.length - 1 ? ' ' : null}
                </React.Fragment>
              );
            })}
          </span>
        );
      })}
    </>
  );
};

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  lines,
  mobileLines,
  className = '',
}) => {
  return (
    <h2
      className={`tm-display text-[24px] xs:text-[28px] sm:text-[46px] lg:text-[66px] font-medium leading-[1.1] sm:leading-[1.06] tracking-[-0.035em] text-[#0A0A0B] text-center ${className}`}
    >
      {mobileLines && mobileLines.length > 0 ? (
        <>
          <span className="sm:hidden block">
            <AnimatedLines lines={mobileLines} keyPrefix="mob" />
          </span>
          <span className="hidden sm:block">
            <AnimatedLines lines={lines} keyPrefix="desk" />
          </span>
        </>
      ) : (
        <AnimatedLines lines={lines} keyPrefix="all" />
      )}
    </h2>
  );
};
