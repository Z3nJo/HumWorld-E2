import { Hero } from './Hero';
import { LandingFooter } from './LandingFooter';
import { LandingHeader } from './LandingHeader';
import './LandingPage.css';

export const LandingPage = () => (
  <div className="lp">
    <LandingHeader />
    <main>
      <Hero />
    </main>
    <LandingFooter />
  </div>
);
