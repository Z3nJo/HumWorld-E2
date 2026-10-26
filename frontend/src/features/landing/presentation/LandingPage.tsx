import { useRef } from 'react';
import { GlobeCanvas } from './GlobeCanvas';
import { Hero } from './Hero';
import { HowItWorks } from './HowItWorks';
import { LandingFooter } from './LandingFooter';
import { LandingHeader } from './LandingHeader';
import { PanelPreview } from './PanelPreview';
import { Scope } from './Scope';
import { KineticText, RevealText } from './ScrollText';
import { Stats } from './Stats';
import { useReveal } from './useReveal';
import { WhatIs } from './WhatIs';
import './LandingPage.css';

export const LandingPage = () => {
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);

  return (
    <div ref={root} className="lp">
      <GlobeCanvas root={root} />
      <LandingHeader />
      <main>
        <Hero />
        <KineticText lines={['Leemos el', 'tono del mundo']} />
        <WhatIs />
        <HowItWorks />
        <Stats />
        <PanelPreview />
        <div className="lp-container lp-statement">
          <RevealText text="Un indicador para leer el mundo, no un veredicto sobre él." />
        </div>
        <Scope />
      </main>
      <LandingFooter />
    </div>
  );
};
