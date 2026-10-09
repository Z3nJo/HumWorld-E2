import { Hero } from './Hero';
import { HowItWorks } from './HowItWorks';
import { LandingFooter } from './LandingFooter';
import { LandingHeader } from './LandingHeader';
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
      <Scope />
    </main>
    <LandingFooter />
  </div>
);
