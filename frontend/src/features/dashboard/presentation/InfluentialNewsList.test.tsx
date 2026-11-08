import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchNewsBreakdown } from '../infrastructure/dashboardApi';
import { InfluentialNewsList } from './InfluentialNewsList';
import type { InfluentialNews } from '../domain/dashboard';

vi.mock('../infrastructure/dashboardApi', () => ({ fetchNewsBreakdown: vi.fn() }));

const item = (over: Partial<InfluentialNews>): InfluentialNews => ({
  id_noticia: 1,
  titulo: 'Titular uno',
  url: 'https://example.com/uno',
  canal: 'Canal Uno',
  continente: 'America',
  pais: 'CL',
  fecha_registro: '2026-09-01T15:30:00Z',
  valor_humor: 0.4,
  ...over,
});

describe('InfluentialNewsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchNewsBreakdown).mockResolvedValue({ valor_humor: 0.4, terminos: [] });
  });

  it('keeps received order with position, visible sign and scope', () => {
    render(<InfluentialNewsList scopeTitle="Chile" news={[
      item({ id_noticia: 1, titulo: 'Positiva suave', valor_humor: 0.4 }),
      item({ id_noticia: 2, titulo: 'Negativa intensa', valor_humor: -0.9 }),
    ]} />);
    expect(screen.getByText(/Top 10 por \|valor_humor\| · Chile/)).toBeInTheDocument();
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    const [first, second] = rows.map((r) => r.querySelector('summary')!);
    expect(first).toHaveTextContent('1Positiva suave+0,40');
    expect(second).toHaveTextContent('2Negativa intensa−0,90');
  });

  it('opens and closes the detail with UTC date, polarity, source and safe link', async () => {
    const user = userEvent.setup();
    render(<InfluentialNewsList scopeTitle="Global" news={[item({ valor_humor: -0.5 })]} />);
    const summary = screen.getAllByText('Titular uno')[0].closest('summary')!;
    const details = summary.closest('details')!;
    expect(details).not.toHaveAttribute('open');
    await user.click(summary);
    expect(details).toHaveAttribute('open');
    expect(within(details).getByText('Negativa')).toBeInTheDocument();
    expect(within(details).getByText(/15:30 UTC/)).toBeInTheDocument();
    expect(within(details).getByText('Fuente')).toBeInTheDocument();
    expect(within(details).getByText(/Canal Uno · Chile/)).toBeInTheDocument();
    const link = within(details).getByRole('link', { name: /noticia original/i });
    expect(link).toHaveAttribute('href', 'https://example.com/uno');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await user.click(summary);
    expect(details).not.toHaveAttribute('open');
  });

  it('shows continent as source when pais is null', () => {
    render(<InfluentialNewsList scopeTitle="Global" news={[item({ pais: null, continente: 'Europa' })]} />);
    expect(screen.getByText(/Canal Uno · Europa/)).toBeInTheDocument();
  });

  it('falls back to the ISO code when the region has no name', () => {
    render(<InfluentialNewsList scopeTitle="Global" news={[item({ pais: 'QQ' })]} />);
    expect(screen.getByText(/Canal Uno · QQ/)).toBeInTheDocument();
  });

  it('shows attributed countries in the expanded detail', async () => {
    const user = userEvent.setup();
    render(<InfluentialNewsList scopeTitle="Global" news={[
      item({ paises_atribuidos: ['BR', 'AR'] }),
    ]} />);
    await user.click(screen.getAllByText('Titular uno')[0]);
    expect(screen.getByText('Sobre')).toBeInTheDocument();
    expect(screen.getByText('Brasil, Argentina')).toBeInTheDocument();
  });

  it('does not render a link for non-navigable URLs', () => {
    render(<InfluentialNewsList scopeTitle="Global" news={[item({ url: 'javascript:alert(1)' })]} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(/enlace original no está disponible/i)).toBeInTheDocument();
  });

  it('shows the empty state', () => {
    render(<InfluentialNewsList scopeTitle="Global" news={[]} />);
    expect(screen.getByText('Sin noticias evaluables')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('does not request any breakdown when rendering the list', () => {
    render(<InfluentialNewsList scopeTitle="Global" news={[item({}), item({ id_noticia: 2 })]} />);
    expect(fetchNewsBreakdown).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument();
  });

  it('opens one panel per click, requests once and closes it', async () => {
    const user = userEvent.setup();
    render(<InfluentialNewsList scopeTitle="Global" news={[item({}), item({ id_noticia: 2, titulo: 'Titular dos' })]} />);
    await user.click(screen.getAllByText('Titular dos')[0]);
    await user.click(screen.getAllByRole('button', { name: /ver desglose de palabras/i })[1]);
    expect(await screen.findByRole('dialog', { name: /desglose de palabras/i })).toBeInTheDocument();
    expect(fetchNewsBreakdown).toHaveBeenCalledTimes(1);
    expect(fetchNewsBreakdown).toHaveBeenCalledWith(2);
    await user.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument();
  });
});
