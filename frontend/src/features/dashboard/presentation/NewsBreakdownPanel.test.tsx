import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewsBreakdownPanel } from './NewsBreakdownPanel';
import { fetchNewsBreakdown } from '../infrastructure/dashboardApi';
import type { InfluentialNews } from '../domain/dashboard';

vi.mock('../infrastructure/dashboardApi', () => ({ fetchNewsBreakdown: vi.fn() }));

const news: InfluentialNews = {
  id_noticia: 7, titulo: 'Crisis en el puerto', url: 'https://example.com/7', canal: 'Canal',
  continente: 'America', pais: 'CL', fecha_registro: '2026-09-01T15:30:00Z', valor_humor: -0.4,
};

const breakdown = {
  valor_humor: -0.4,
  terminos: [
    { id_termino: 1, palabra: 'crisis', valor: -4, ocurrencias: 2, aporte_humor: -8 },
    { id_termino: 2, palabra: 'paz', valor: 3, ocurrencias: 1, aporte_humor: 3 },
  ],
};

describe('NewsBreakdownPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens as a modal dialog and lists words in received order with visible signs', async () => {
    vi.mocked(fetchNewsBreakdown).mockResolvedValue(breakdown);
    render(<NewsBreakdownPanel news={news} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: /desglose de palabras/i });
    expect(dialog).toHaveAttribute('open');
    expect(within(dialog).getByText('Crisis en el puerto')).toBeInTheDocument();
    expect(await within(dialog).findByText('crisis')).toBeInTheDocument();
    const rows = within(dialog).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual(['crisis−4,002−8,00', 'paz+3,001+3,00']);
    expect(within(dialog).getByText(/escala de términos/i)).toBeInTheDocument();
    expect(fetchNewsBreakdown).toHaveBeenCalledTimes(1);
    expect(fetchNewsBreakdown).toHaveBeenCalledWith(7);
  });

  it('closes with the close button and when the dialog is dismissed with Escape', async () => {
    vi.mocked(fetchNewsBreakdown).mockResolvedValue(breakdown);
    const onClose = vi.fn();
    render(<NewsBreakdownPanel news={news} onClose={onClose} />);
    await screen.findByText('crisis');
    await userEvent.setup().click(screen.getByRole('button', { name: /cerrar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent(screen.getByRole('dialog', { hidden: true }), new Event('close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('shows the error and retries', async () => {
    vi.mocked(fetchNewsBreakdown).mockRejectedValueOnce(new Error('Fallo de red')).mockResolvedValue(breakdown);
    render(<NewsBreakdownPanel news={news} onClose={() => {}} />);
    expect(await screen.findByText(/fallo de red/i)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: /reintentar/i }));
    await waitFor(() => expect(screen.getByText('crisis')).toBeInTheDocument());
    expect(fetchNewsBreakdown).toHaveBeenCalledTimes(2);
  });
});
