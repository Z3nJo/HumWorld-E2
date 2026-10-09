import { render } from '@testing-library/react';
import { HERO_SAMPLE } from '../domain/humorScale';
import { WorldMap } from './WorldMap';

const pulses = (container: HTMLElement) => container.querySelectorAll('.lp-map__pulse');

describe('WorldMap', () => {
  it('draws one pulse per inhabited continent on the hero map', () => {
    const { container } = render(<WorldMap variant="hero" values={HERO_SAMPLE} />);

    expect(pulses(container)).toHaveLength(5);
  });

  it('draws no pulses on the card map', () => {
    const { container } = render(<WorldMap variant="card" values={HERO_SAMPLE} />);

    expect(pulses(container)).toHaveLength(0);
  });

  it('restarts only the pulse of the continent whose value changed', () => {
    const { container, rerender } = render(<WorldMap variant="hero" values={HERO_SAMPLE} />);
    const [america, europa] = pulses(container);

    rerender(<WorldMap variant="hero" values={{ ...HERO_SAMPLE, America: 0.6 }} />);
    const [nextAmerica, nextEuropa] = pulses(container);

    expect(nextAmerica).not.toBe(america);
    expect(nextEuropa).toBe(europa);
  });
});
