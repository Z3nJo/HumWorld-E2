import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Source } from '../../features/sources/domain/source';
import * as sourcesApi from '../../features/sources/infrastructure/sourcesApi';
import { SourcesPage } from './SourcesPage';

vi.mock('../../features/sources/infrastructure/sourcesApi');

describe('SourcesPage', () => {
  const sampleSources: Source[] = [
    {
      id: 1,
      channelId: 10,
      name: 'Portada',
      feedUrl: 'https://elpais.com/rss/portada.xml',
      iptcCategory: 'politics',
      language: 'es',
      active: true,
      channel: { id: 10, name: 'El País', continent: 'Europa' },
    },
    {
      id: 2,
      channelId: 10,
      name: 'Economía',
      feedUrl: 'https://elpais.com/rss/economia.xml',
      iptcCategory: 'economy/business/finance',
      language: 'es',
      active: false,
      channel: { id: 10, name: 'El País', continent: 'Europa' },
    },
    {
      id: 3,
      channelId: 20,
      name: 'NPR News',
      feedUrl: 'https://npr.org/rss/news.xml',
      iptcCategory: 'politics',
      language: 'en',
      active: true,
      channel: { id: 20, name: 'NPR', continent: 'America' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders channels and feeds successfully', async () => {
    vi.mocked(sourcesApi.fetchSources).mockResolvedValueOnce(sampleSources);

    render(<SourcesPage />);

    expect(screen.getByText('Fuentes y canales RSS')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('El País')).toBeInTheDocument();
      expect(screen.getByText('NPR')).toBeInTheDocument();
    });

    // The first channel feeds are open by default
    expect(screen.getByText('https://elpais.com/rss/portada.xml')).toBeInTheDocument();
    expect(screen.getByText('https://elpais.com/rss/economia.xml')).toBeInTheDocument();
  });

  it('filters by continent and status', async () => {
    vi.mocked(sourcesApi.fetchSources).mockResolvedValueOnce(sampleSources);

    render(<SourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('El País')).toBeInTheDocument();
    });

    // Filter by America
    fireEvent.change(screen.getByLabelText(/Filtrar por continente/i), {
      target: { value: 'America' },
    });

    expect(screen.queryByText('El País')).not.toBeInTheDocument();
    expect(screen.getByText('NPR')).toBeInTheDocument();

    // Reset continent filter, filter by Inactivas
    fireEvent.change(screen.getByLabelText(/Filtrar por continente/i), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Inactivas' }));

    expect(screen.getByText('El País')).toBeInTheDocument();
    expect(screen.queryByText('NPR')).not.toBeInTheDocument(); // NPR was active
  });

  it('toggles a feed active switch', async () => {
    vi.mocked(sourcesApi.fetchSources).mockResolvedValueOnce(sampleSources);
    vi.mocked(sourcesApi.patchSource).mockResolvedValueOnce({
      ...sampleSources[0],
      active: false,
    });

    render(<SourcesPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Activar o desactivar Portada')).toBeInTheDocument();
    });

    const switchBtn = screen.getByLabelText('Activar o desactivar Portada');
    expect(switchBtn).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(switchBtn);

    await waitFor(() => {
      expect(sourcesApi.patchSource).toHaveBeenCalledWith(1, { active: false });
      expect(screen.getByText(/desactivada/i)).toBeInTheDocument();
    });
  });

  it('opens and closes drawer for new source', async () => {
    const user = userEvent.setup();
    vi.mocked(sourcesApi.fetchSources).mockResolvedValueOnce(sampleSources);

    render(<SourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('El País')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '+ Nueva fuente' }));

    expect(screen.getByText('Registrar medio y canales RSS')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('Registrar medio y canales RSS')).not.toBeInTheDocument();
  });

  it('keeps unsupported channel controls visible but disabled', async () => {
    vi.mocked(sourcesApi.fetchSources).mockResolvedValueOnce(sampleSources);

    render(<SourcesPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Estado del canal El País: REQUIERE BACK')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Estado del canal El País: REQUIERE BACK')).toBeDisabled();
    expect(screen.getAllByText('REQUIERE BACK').length).toBeGreaterThan(0);
  });

  it('opens delete modal and confirms deletion of a source', async () => {
    const user = userEvent.setup();
    vi.mocked(sourcesApi.fetchSources).mockResolvedValueOnce(sampleSources);
    vi.mocked(sourcesApi.deleteSource).mockResolvedValueOnce(undefined);

    render(<SourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('https://elpais.com/rss/portada.xml')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    await user.click(deleteButtons[0]);

    expect(screen.getByText(/¿Eliminar «Portada»\?/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Eliminar fuente' }));

    await waitFor(() => {
      expect(sourcesApi.deleteSource).toHaveBeenCalledWith(1);
      expect(screen.getByText(/Fuente «Portada» eliminada/i)).toBeInTheDocument();
    });
  });
});
