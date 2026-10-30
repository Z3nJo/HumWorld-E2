import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Channel, Source } from '../../features/sources/domain/source';
import * as sourcesApi from '../../features/sources/infrastructure/sourcesApi';
import { SourcesPage } from './SourcesPage';

vi.mock('../../features/sources/infrastructure/sourcesApi');

describe('SourcesPage', () => {
  const sampleChannels: Channel[] = [
    {
      id: 1,
      name: 'El País',
      continent: 'Europa',
      country: 'ES',
      siteUrl: 'https://elpais.com',
      active: true,
    },
    {
      id: 2,
      name: 'NPR',
      continent: 'America',
      country: 'US',
      siteUrl: 'https://npr.org',
      active: false,
    },
  ];

  const sampleSources: Source[] = [
    {
      id: 101,
      channelId: 1,
      name: 'El País · Portada',
      feedUrl: 'https://elpais.com/rss/portada.xml',
      category: 'politics',
      iptcCategory: 'politics',
      language: 'es',
      active: true,
      channel: sampleChannels[0],
    },
    {
      id: 102,
      channelId: 1,
      name: 'El País · Economía',
      feedUrl: 'https://elpais.com/rss/economia.xml',
      category: 'economy/business/finance',
      iptcCategory: 'economy/business/finance',
      language: 'es',
      active: false,
      channel: sampleChannels[0],
    },
    {
      id: 201,
      channelId: 2,
      name: 'NPR · News',
      feedUrl: 'https://npr.org/rss/news.xml',
      category: 'politics',
      iptcCategory: 'politics',
      language: 'en',
      active: true,
      channel: sampleChannels[1],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sourcesApi.fetchChannels).mockResolvedValue(sampleChannels);
    vi.mocked(sourcesApi.fetchSources).mockResolvedValue(sampleSources);
  });

  it('renders header, counter, and expands first channel automatically', async () => {
    render(<SourcesPage />);

    expect(screen.getByText('Fuentes y canales RSS')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Fuentes de noticias y sus canales RSS. Solo se capturan canales activos de fuentes activas.',
      ),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('El País')).toBeInTheDocument();
      expect(screen.getByText('NPR')).toBeInTheDocument();
    });

    // Counter: 2 fuentes · 3 canales
    expect(screen.getByText('2 fuentes · 3 canales')).toBeInTheDocument();

    // First channel (El País, id 1) is expanded automatically on initial load
    expect(screen.getByText('https://elpais.com/rss/portada.xml')).toBeInTheDocument();
    expect(screen.getByText('Política')).toBeInTheDocument();
    expect(screen.getByText('Economía')).toBeInTheDocument();

    // NPR (id 2) is collapsed
    expect(screen.queryByText('https://npr.org/rss/news.xml')).not.toBeInTheDocument();

    // Language pills: El País has 'es'
    const esElements = screen.getAllByText('ES');
    expect(esElements.some((el) => el.classList.contains('pill'))).toBe(true);
  });

  it('filters by continent and status locally over all loaded items', async () => {
    render(<SourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('El País')).toBeInTheDocument();
    });

    // Filter by America
    fireEvent.change(screen.getByLabelText('Continente'), {
      target: { value: 'America' },
    });

    expect(screen.queryByText('El País')).not.toBeInTheDocument();
    expect(screen.getByText('NPR')).toBeInTheDocument();
    expect(screen.getByText('1 fuentes · 1 canales')).toBeInTheDocument();

    // Reset continent, filter by Inactivas (NPR is inactive)
    fireEvent.change(screen.getByLabelText('Continente'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Inactivas' }));

    expect(screen.queryByText('El País')).not.toBeInTheDocument();
    expect(screen.getByText('NPR')).toBeInTheDocument();

    // Filter by Activas (El País is active)
    fireEvent.click(screen.getByRole('button', { name: 'Activas' }));
    expect(screen.getByText('El País')).toBeInTheDocument();
    expect(screen.queryByText('NPR')).not.toBeInTheDocument();
  });

  it('allows manual collapse and expansion with ghost button', async () => {
    render(<SourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('El País')).toBeInTheDocument();
    });

    const expandButtons = screen.getAllByLabelText('Ver canales');
    const elPaisExpandBtn = expandButtons[0];
    expect(elPaisExpandBtn).toHaveAttribute('aria-expanded', 'true');

    // Collapse El País
    fireEvent.click(elPaisExpandBtn);
    expect(elPaisExpandBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('https://elpais.com/rss/portada.xml')).not.toBeInTheDocument();

    // Re-expand El País
    fireEvent.click(elPaisExpandBtn);
    expect(elPaisExpandBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('https://elpais.com/rss/portada.xml')).toBeInTheDocument();
  });

  it('toggles channel switch with patchChannel and shows toast with name', async () => {
    vi.mocked(sourcesApi.patchChannel).mockResolvedValueOnce({
      ...sampleChannels[0],
      active: false,
    });

    render(<SourcesPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Activar El País')).toBeInTheDocument();
    });

    const sw = screen.getByLabelText('Activar El País');
    expect(sw).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(sw);

    await waitFor(() => {
      expect(sourcesApi.patchChannel).toHaveBeenCalledWith(1, { activo: false });
      expect(screen.getByText(/«El País» desactivada/i)).toBeInTheDocument();
    });
  });

  it('rolls back channel switch if patchChannel fails', async () => {
    vi.mocked(sourcesApi.patchChannel).mockRejectedValueOnce(
      new Error('Error de red al actualizar'),
    );

    render(<SourcesPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Activar El País')).toBeInTheDocument();
    });

    const sw = screen.getByLabelText('Activar El País');
    fireEvent.click(sw);

    await waitFor(() => {
      expect(screen.getByText('Error de red al actualizar')).toBeInTheDocument();
      expect(sw).toHaveAttribute('aria-checked', 'true');
    });
  });

  it('toggles feed switch with patchSource and shows Canal activado/desactivado toast', async () => {
    vi.mocked(sourcesApi.patchSource).mockResolvedValueOnce({
      ...sampleSources[0],
      active: false,
    });

    render(<SourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('https://elpais.com/rss/portada.xml')).toBeInTheDocument();
    });

    const feedSwitches = screen.getAllByLabelText('Activar canal');
    const portadaSw = feedSwitches[0];
    expect(portadaSw).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(portadaSw);

    await waitFor(() => {
      expect(sourcesApi.patchSource).toHaveBeenCalledWith(101, { active: false });
      expect(screen.getByText('Canal desactivado')).toBeInTheDocument();
    });
  });

  it('opens create drawer, validates fields, and creates a source with POST /sources', async () => {
    const user = userEvent.setup();
    vi.mocked(sourcesApi.createSources).mockResolvedValueOnce({
      channel: {
        id: 3,
        name: 'Clarín',
        continent: 'America',
        country: 'AR',
        siteUrl: 'https://clarin.com',
        active: true,
      },
      sources: [
        {
          id: 301,
          channelId: 3,
          name: 'Clarín · Política',
          feedUrl: 'https://clarin.com/rss.xml',
          category: 'politics',
          iptcCategory: 'politics',
          language: 'es',
          active: true,
          channel: {
            id: 3,
            name: 'Clarín',
            continent: 'America',
            country: 'AR',
            siteUrl: 'https://clarin.com',
            active: true,
          },
        },
      ],
    });

    render(<SourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('El País')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '+ Nueva fuente' }));

    expect(screen.getByText('Nueva fuente')).toBeInTheDocument();
    expect(screen.getByText('Registrar fuente RSS')).toBeInTheDocument();

    // Trigger validation error by submitting empty
    await user.click(screen.getByRole('button', { name: 'Crear fuente' }));
    expect(screen.getByText('Revisa los campos marcados')).toBeInTheDocument();
    expect(screen.getByText('Campo obligatorio')).toBeInTheDocument();

    // Fill valid data
    const nameInput = screen.getByLabelText('Nombre');
    const urlInput = screen.getByLabelText('URL del sitio');
    const feedInputs = screen.getAllByLabelText('URL RSS');

    await user.type(nameInput, 'Clarín');
    await user.type(urlInput, 'https://clarin.com');
    await user.type(feedInputs[0], 'https://clarin.com/rss.xml');

    await user.click(screen.getByRole('button', { name: 'Crear fuente' }));

    await waitFor(() => {
      expect(sourcesApi.createSources).toHaveBeenCalledWith({
        channel: {
          name: 'Clarín',
          siteUrl: 'https://clarin.com',
          continent: 'America',
          country: null,
          active: true,
        },
        sources: [
          {
            name: 'Clarín · Política',
            feedUrl: 'https://clarin.com/rss.xml',
            iptcCategory: 'politics',
            language: 'es',
            active: true,
          },
        ],
      });
      expect(screen.getByText('Fuente creada con 1 canal(es)')).toBeInTheDocument();
    });
  });

  it('opens delete modal and deactivates channel with DELETE /channels/{id}', async () => {
    const user = userEvent.setup();
    vi.mocked(sourcesApi.deleteChannel).mockResolvedValueOnce(undefined);

    render(<SourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('El País')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    await user.click(deleteButtons[0]);

    // Modal with truthful deactivation text
    expect(screen.getByText('¿Eliminar «El País»?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Se desactivará la fuente «El País». Se conservan sus canales RSS y sus noticias; podrás reactivarla con el interruptor.',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Desactivar fuente' }));

    await waitFor(() => {
      expect(sourcesApi.deleteChannel).toHaveBeenCalledWith(1);
      expect(screen.getByText('Fuente «El País» desactivada')).toBeInTheDocument();
    });
  });

  it('keeps drawer open and shows error toast when 400 error occurs', async () => {
    const user = userEvent.setup();
    vi.mocked(sourcesApi.createSources).mockRejectedValueOnce(
      new Error('El nombre del canal ya existe'),
    );

    render(<SourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('El País')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '+ Nueva fuente' }));

    const nameInput = screen.getByLabelText('Nombre');
    const urlInput = screen.getByLabelText('URL del sitio');
    const feedInputs = screen.getAllByLabelText('URL RSS');

    await user.type(nameInput, 'El País');
    await user.type(urlInput, 'https://elpais.com');
    await user.type(feedInputs[0], 'https://elpais.com/rss/dup.xml');

    await user.click(screen.getByRole('button', { name: 'Crear fuente' }));

    await waitFor(() => {
      expect(screen.getByText('El nombre del canal ya existe')).toBeInTheDocument();
      // Drawer is still open
      expect(screen.getByText('Registrar fuente RSS')).toBeInTheDocument();
      expect(nameInput).toHaveValue('El País');
    });
  });

  describe('manual capture', () => {
    const captureOk = { inserted: 5, failedSources: 0, skippedSourceIds: [9] };

    it('captures all sources and shows the summary toast', async () => {
      vi.mocked(sourcesApi.captureSources).mockResolvedValue(captureOk);
      render(<SourcesPage />);
      await waitFor(() => expect(screen.getByText('El País')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Capturar ahora' }));

      await waitFor(() =>
        expect(
          screen.getByText(/5 noticias insertadas, 0 fuentes fallidas, 1 fuentes omitidas/),
        ).toBeInTheDocument(),
      );
      expect(sourcesApi.captureSources).toHaveBeenCalledWith(undefined);
    });

    it('disables capture actions while the request is pending', async () => {
      let resolve!: (v: typeof captureOk) => void;
      vi.mocked(sourcesApi.captureSources).mockReturnValue(
        new Promise((r) => {
          resolve = r;
        }),
      );
      render(<SourcesPage />);
      await waitFor(() => expect(screen.getByText('El País')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Capturar ahora' }));

      expect(screen.getByRole('button', { name: 'Capturando…' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Capturar El País' })).toBeDisabled();

      resolve(captureOk);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Capturar ahora' })).toBeEnabled(),
      );
    });

    it('captures only the active RSS channels of a source', async () => {
      vi.mocked(sourcesApi.captureSources).mockResolvedValue(captureOk);
      render(<SourcesPage />);
      await waitFor(() => expect(screen.getByText('El País')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Capturar El País' }));

      await waitFor(() => expect(sourcesApi.captureSources).toHaveBeenCalledWith([101]));
    });

    it('disables per-source capture for inactive sources', async () => {
      render(<SourcesPage />);
      await waitFor(() => expect(screen.getByText('NPR')).toBeInTheDocument());

      expect(screen.getByRole('button', { name: 'Capturar NPR' })).toBeDisabled();
    });

    it('uses the error style when sources failed', async () => {
      vi.mocked(sourcesApi.captureSources).mockResolvedValue({
        inserted: 1,
        failedSources: 2,
        skippedSourceIds: [],
      });
      render(<SourcesPage />);
      await waitFor(() => expect(screen.getByText('El País')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Capturar ahora' }));

      const toast = await screen.findByText(/2 fuentes fallidas/);
      expect(toast.closest('[class*="error"]')).not.toBeNull();
    });

    it('shows an error toast and keeps the table when the request fails', async () => {
      vi.mocked(sourcesApi.captureSources).mockRejectedValue(new Error('Fallo de red'));
      render(<SourcesPage />);
      await waitFor(() => expect(screen.getByText('El País')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Capturar ahora' }));

      expect(await screen.findByText('Fallo de red')).toBeInTheDocument();
      expect(screen.getByText('El País')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Capturar ahora' })).toBeEnabled();
    });
  });
});
