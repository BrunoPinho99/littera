"use client";

import React from 'react';
import { MarketingLayout } from './layout';
import { FloatingNavbar } from '../../components/landing/FloatingNavbar';
import { HeroSection } from '../../components/landing/HeroSection';
import { HowItWorksSection } from '../../components/landing/HowItWorksSection';
import { RoiCalculatorSection } from '../../components/landing/RoiCalculatorSection';
import { WhileYouSleepSection } from '../../components/landing/WhileYouSleepSection';
import { FeaturesBentoSection } from '../../components/landing/FeaturesBentoSection';
import { ComparisonSection } from '../../components/landing/ComparisonSection';
import { IntegrationsBentoSection } from '../../components/landing/IntegrationsBentoSection';
import { EditorialQuoteSection } from '../../components/landing/EditorialQuoteSection';
import { CustomerStoriesSection } from '../../components/landing/CustomerStoriesSection';
import { PricingSection } from '../../components/landing/PricingSection';
import { WaitlistSection } from '../../components/landing/WaitlistSection';
import { FaqSection } from '../../components/landing/FaqSection';
import { CtaAndFooterSection } from '../../components/landing/CtaAndFooterSection';
import { SimulationProvider } from '../../components/landing/SimulationContext';

export const MarketingPageContent: React.FC = () => {
  return (
    <SimulationProvider>
      <FloatingNavbar />
      <main>
        {/* Dobra 1: Hero (#inicio) + Dobra 2: Faixa de Escolas / Selos */}
        <HeroSection />

        {/* Dobra 3: Da folha em branco à nota (#como-funciona) */}
        <HowItWorksSection />

        {/* Dobra 4: Calculadora (#calculadora - sobe da 8ª posição) */}
        <RoiCalculatorSection />

        {/* Dobra 5: Linha do tempo noturna (A escola fecha. A correção não.) */}
        <WhileYouSleepSection />

        {/* Dobra 6: Recursos (#recursos - Critério de banca. Escala de software.) */}
        <FeaturesBentoSection />

        {/* Dobra 7: Antes e depois (Menos pilha de papel. Mais aula.) */}
        <ComparisonSection />

        {/* Dobra 8: Integrações e segurança (#integracoes - Encaixa na rotina da escola.) */}
        <IntegrationsBentoSection />

        {/* Dobra 9: Depoimento em destaque + 3 métricas */}
        <EditorialQuoteSection />

        {/* Dobra 10: Resultados por escola (#escolas - Escolas que pararam de contar folhas.) */}
        <CustomerStoriesSection />

        {/* Dobra 11: Como contratar (#como-contratar - Um valor fixo.) */}
        <PricingSection />

        {/* Dobra 12: Agende sua demonstração (#waitlist - Traga 3 redações. Veja a correção na hora.) */}
        <WaitlistSection />

        {/* Dobra 13: Dúvidas respondidas (#duvidas) */}
        <FaqSection />

        {/* Dobra 14: CTA final + Dobra 15: Footer */}
        <CtaAndFooterSection />
      </main>
    </SimulationProvider>
  );
};

export const TillmornMarketingPage: React.FC = () => {
  return (
    <MarketingLayout>
      <MarketingPageContent />
    </MarketingLayout>
  );
};

export default MarketingPageContent;
