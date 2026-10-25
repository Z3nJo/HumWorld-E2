import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { fetchDashboard, fetchInfluentialNews, fetchInfluentialTerms } from '../../dashboard/infrastructure/dashboardApi';
import { LandingPage } from './LandingPage';

vi.mock('../../dashboard/infrastructure/dashboardApi');

beforeEach(() => {
  vi.mocked(fetchDashboard).mockRejectedValue(new Error('offline'));
  vi.mocked(fetchInfluentialTerms).mockRejectedValue(new Error('offline'));
  vi.mocked(fetchInfluentialNews).mockRejectedValue(new Error('offline'));
});

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

  it('keeps the headline, both buttons and the legend visible over the globe', () => {
    renderLanding();

    const hero = screen.getByRole('region', { name: '¿De qué humor está el mundo?' });
    expect(within(hero).getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(within(hero).getByRole('link', { name: 'Explorar el humor global →' })).toBeInTheDocument();
    expect(within(hero).getByRole('link', { name: 'Cómo funciona' })).toBeInTheDocument();
    expect(within(hero).getByRole('img', { name: /^Escala de humor/ })).toBeInTheDocument();
  });

  it('draws the particle globe on a decorative canvas hidden from screen readers', () => {
    const { container } = renderLanding();

    expect(container.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true');
  });

  it('tells the how-it-works story with an example headline and its dictionary terms', () => {
    renderLanding();

    const section = screen.getByRole('region', { name: 'De un titular a un color en el mapa' });
    const terms = within(section).getAllByText(/^(acuerdo|récord|crecimiento|inflación)/, { selector: 'mark' });

    expect(terms).toHaveLength(4);
    expect(within(section).getByText(/Ejemplo ilustrativo de un titular/)).toBeInTheDocument();
    expect(section.querySelector('[data-map-slot]')).toBeInTheDocument();
  });

  it('labels the globe as illustrative sample data', () => {
    renderLanding();

    expect(screen.getByText('Globo de fondo ilustrativo · valores de ejemplo')).toBeInTheDocument();
  });

  it('renders without crashing when canvas getContext returns null', () => {
    // jsdom has no canvas; browsers can also return null, e.g. past the context limit.
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    expect(() => renderLanding()).not.toThrow();
    expect(getContext).toHaveBeenCalledWith('2d');

    getContext.mockRestore();
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

  it("shows the API's real humor of the day in the panel preview once it arrives", async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({
      fecha_desde: '2026-10-25', fecha_hasta: '2026-10-25', continente: null, pais: null,
      agregados: [{ continente: 'Europa', pais: null, humor: -0.4, noticias: 9, suficiente: true }],
    });
    vi.mocked(fetchInfluentialTerms).mockResolvedValue({
      fecha_desde: '2026-10-25', fecha_hasta: '2026-10-25', continente: null, pais: null,
      terminos: [{ id_termino: 1, termino: 'sequía', idioma: 'es', peso: -6, aporte_total: -12, frecuencia: 3 }],
    });
    vi.mocked(fetchInfluentialNews).mockResolvedValue({
      noticias: [{
        id_noticia: 1, titulo: 'Sequía récord golpea la cosecha', url: 'https://x.test', canal: 'X',
        continente: 'Europa', pais: 'ES', fecha_registro: '2026-10-25', valor_humor: -0.91,
      }],
    });
    renderLanding();

    expect(await screen.findByText('Sequía récord golpea la cosecha')).toBeInTheDocument();
    expect(screen.getByText('sequía')).toBeInTheDocument();
    expect(screen.getByText('−0,91')).toBeInTheDocument();
    expect(screen.queryByText('Acuerdo regional amplía cuotas de exportación')).not.toBeInTheDocument();
    expect(screen.getByText(/^Datos reales del \d{2}-\d{2}-\d{4}$/)).toBeInTheDocument();
  });

  it('keeps the illustrative samples and says so when the API is unavailable', async () => {
    renderLanding();

    await waitFor(() => expect(fetchDashboard).toHaveBeenCalled());
    expect(screen.getByText('Previsualizaciones con datos de ejemplo')).toBeInTheDocument();
    expect(screen.getByText('Acuerdo regional amplía cuotas de exportación')).toBeInTheDocument();
  });
});
