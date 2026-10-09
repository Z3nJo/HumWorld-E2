import { render } from '@testing-library/react';
import { HERO_SAMPLE } from '../domain/humorScale';
import { MapPulses } from './WorldMap';

const pulses = (container: HTMLElement) => container.querySelectorAll('.lp-map__pulse');

describe('MapPulses', () => {
  it('draws one pulse per inhabited continent', () => {
    const { container } = render(<MapPulses values={HERO_SAMPLE} />);

    expect(pulses(container)).toHaveLength(5);
  });

  it('restarts only the pulse of the continent whose value changed', () => {
    const { container, rerender } = render(<MapPulses values={HERO_SAMPLE} />);
    const [america, europa] = pulses(container);

    rerender(<MapPulses values={{ ...HERO_SAMPLE, America: 0.6 }} />);
    const [nextAmerica, nextEuropa] = pulses(container);

    expect(nextAmerica).not.toBe(america);
    expect(nextEuropa).toBe(europa);
  });
});
