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

  it('labels the background map as illustrative sample data', () => {
    renderLanding();

    expect(screen.getByText('Mapa de fondo ilustrativo · valores de ejemplo')).toBeInTheDocument();
  });

  it('renders a section for every in-page anchor', () => {
    renderLanding();

    const ids = screen.getAllByRole('region').map((region) => region.id);

    expect(ids).toEqual(expect.arrayContaining(['que-es', 'como-funciona', 'que-veras', 'alcance']));
  });

  it('links each how-it-works step to its page', () => {
    renderLanding();

    const section = screen.getByRole('region', { name: 'De un titular a un color en el mapa' });
    const hrefs = within(section)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual(['/fuentes', '/dictionary', '/parametros', '/dashboard']);
  });

  it('formats influential news scores with sign and comma decimal', () => {
    renderLanding();

    expect(screen.getByText('+0,82')).toBeInTheDocument();
    expect(screen.getByText('−0,76')).toBeInTheDocument();
  });

  it('lists what the project does and does not do', () => {
    renderLanding();

    const scope = screen.getByRole('region', { name: 'Transparencia y alcance' });

    expect(within(scope).getByRole('heading', { name: 'Lo que hace' })).toBeInTheDocument();
    expect(within(scope).getByRole('heading', { name: 'Lo que no hace' })).toBeInTheDocument();
    expect(within(scope).getAllByRole('listitem')).toHaveLength(8);
  });
});
