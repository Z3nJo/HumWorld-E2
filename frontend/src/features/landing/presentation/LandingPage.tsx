import { Hero } from './Hero';
import { HowItWorks } from './HowItWorks';
import { LandingFooter } from './LandingFooter';
import { LandingHeader } from './LandingHeader';
import { PanelPreview } from './PanelPreview';
import { Scope } from './Scope';
import { WhatIs } from './WhatIs';
import './LandingPage.css';

export const LandingPage = () => (
  <div className="lp">
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
