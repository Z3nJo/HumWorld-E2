import { useRef } from 'react';
import { GlobeCanvas } from './GlobeCanvas';
import { Hero } from './Hero';
import { HowItWorks } from './HowItWorks';
import { LandingFooter } from './LandingFooter';
import { LandingHeader } from './LandingHeader';
import { PanelPreview } from './PanelPreview';
import { Scope } from './Scope';
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
        <WhatIs />
        <HowItWorks />
        <PanelPreview />
        <Scope />
      </main>
      <LandingFooter />
    </div>
  );
};
