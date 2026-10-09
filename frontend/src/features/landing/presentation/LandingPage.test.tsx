import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';

const renderLanding = () =>
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );

describe('LandingPage', () => {
  it('renders the main headline', () => {
    renderLanding();

    expect(
      screen.getByRole('heading', { level: 1, name: '¿De qué humor está el mundo?' }),
    ).toBeInTheDocument();
  });

  it('points every panel CTA to the dashboard', () => {
    renderLanding();

    const ctas = screen.getAllByRole('link', { name: /Ir al panel|Explorar el humor global/ });

    expect(ctas).toHaveLength(3);
    ctas.forEach((cta) => expect(cta).toHaveAttribute('href', '/dashboard'));
  });

  it('links the section nav to the in-page anchors', () => {
    renderLanding();

    const nav = screen.getByRole('navigation', { name: 'Secciones' });
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual(['#que-es', '#como-funciona', '#que-veras']);
  });

  it('opens the repository link safely in a new tab', () => {
    renderLanding();

    const repo = screen.getByRole('link', { name: /Repositorio en GitHub/ });

    expect(repo).toHaveAttribute('href', 'https://github.com/Z3nJo/HumWorld-E2');
    expect(repo).toHaveAttribute('target', '_blank');
    expect(repo.getAttribute('rel')).toContain('noopener');
  });

  it('exposes the humor scale legend as an image with an accessible name', () => {
    renderLanding();

    expect(
      screen.getByRole('img', {
        name: 'Escala de humor: de negativo a la izquierda, pasando por neutro, a positivo a la derecha',
      }),
    ).toBeInTheDocument();
  });
});
