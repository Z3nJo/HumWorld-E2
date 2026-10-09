import { act, render } from '@testing-library/react';
import { useRef } from 'react';
import { useReveal } from './useReveal';

const Page = () => {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);
  return (
    <div ref={ref} className="lp">
      <section className="lp-section">
        <h2>First</h2>
        <p>Second</p>
      </section>
    </div>
  );
};

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

describe('useReveal', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('leaves content untouched when IntersectionObserver is missing', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(<Page />);

    expect(container.querySelector('.lp')).not.toHaveClass('lp--reveal');
  });

  it('marks section blocks as they enter the viewport, once', () => {
    let notify: Callback = () => {};
    const unobserve = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: Callback) {
          notify = callback;
        }
        observe = vi.fn();
        unobserve = unobserve;
        disconnect = vi.fn();
      },
    );
    const { container, getByText } = render(<Page />);
    const first = getByText('First');

    act(() => notify([{ target: first, isIntersecting: true }]));

    expect(container.querySelector('.lp')).toHaveClass('lp--reveal');
    expect(first).toHaveClass('lp-in');
    expect(getByText('Second')).not.toHaveClass('lp-in');
    expect(unobserve).toHaveBeenCalledWith(first);
  });
});
