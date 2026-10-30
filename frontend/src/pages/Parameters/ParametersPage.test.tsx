import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as configApi from '../../features/config/infrastructure/configApi';
import { ParametersPage } from './ParametersPage';

vi.mock('../../features/config/infrastructure/configApi');

describe('ParametersPage', () => {
  const initialConfig = {
    capturePeriodicityMinutes: 60,
    newsExpirationDays: 30,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially then displays parameters', async () => {
    vi.mocked(configApi.fetchConfig).mockResolvedValueOnce(initialConfig);

    render(<ParametersPage />);

    expect(screen.getByText('Parámetros generales')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText(/Periodicidad de captura/i)).toHaveValue(60);
      expect(screen.getByLabelText(/Caducidad de noticias/i)).toHaveValue(30);
    });

    expect(screen.getByLabelText(/Mínimo de noticias por región/i)).toBeDisabled();
    expect(screen.getByText('Sin cambios')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar parámetros' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeDisabled();
  });

  it('allows user to change periodicity and updates dirty state', async () => {
    const user = userEvent.setup();
    vi.mocked(configApi.fetchConfig).mockResolvedValueOnce(initialConfig);

    render(<ParametersPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Periodicidad de captura/i)).toHaveValue(60);
    });

    const periodicityInput = screen.getByLabelText(/Periodicidad de captura/i);
    await user.clear(periodicityInput);
    await user.type(periodicityInput, '15');

    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar parámetros' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeEnabled();
  });

  it('reverts modifications when clicking Descartar', async () => {
    const user = userEvent.setup();
    vi.mocked(configApi.fetchConfig).mockResolvedValueOnce(initialConfig);

    render(<ParametersPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Periodicidad de captura/i)).toHaveValue(60);
    });

    const periodicityInput = screen.getByLabelText(/Periodicidad de captura/i);
    await user.clear(periodicityInput);
    await user.type(periodicityInput, '20');
    await user.click(screen.getByRole('button', { name: 'Descartar' }));

    expect(periodicityInput).toHaveValue(60);
    expect(screen.getByText('Sin cambios')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar parámetros' })).toBeDisabled();
  });

  it('saves updated configuration successfully without the unsupported field', async () => {
    const user = userEvent.setup();
    vi.mocked(configApi.fetchConfig).mockResolvedValueOnce(initialConfig);
    const updatedConfig = { capturePeriodicityMinutes: 45, newsExpirationDays: 30 };
    vi.mocked(configApi.updateConfig).mockResolvedValueOnce(updatedConfig);

    render(<ParametersPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Periodicidad de captura/i)).toHaveValue(60);
    });

    const periodicityInput = screen.getByLabelText(/Periodicidad de captura/i);
    await user.clear(periodicityInput);
    await user.type(periodicityInput, '45');
    await user.click(screen.getByRole('button', { name: 'Guardar parámetros' }));

    await waitFor(() => {
      expect(configApi.updateConfig).toHaveBeenCalledWith(updatedConfig);
      expect(screen.getByText('Parámetros guardados correctamente')).toBeInTheDocument();
    });

    expect(screen.getByText('Sin cambios')).toBeInTheDocument();
  });

  it('displays load-error box when fetch fails and allows retry', async () => {
    vi.mocked(configApi.fetchConfig)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(initialConfig);

    render(<ParametersPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('No se pudieron cargar los parámetros')).toBeInTheDocument();
    });

    // El formulario NO debe aparecer mientras hay error de carga
    expect(screen.queryByLabelText(/Periodicidad de captura/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Periodicidad de captura/i)).toHaveValue(60);
    });
  });

  it('shows save-error inline but keeps the form and draft on PUT failure', async () => {
    const user = userEvent.setup();
    vi.mocked(configApi.fetchConfig).mockResolvedValueOnce(initialConfig);
    vi.mocked(configApi.updateConfig).mockRejectedValueOnce(new Error('500 Internal Server Error'));

    render(<ParametersPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Periodicidad de captura/i)).toHaveValue(60);
    });

    const periodicityInput = screen.getByLabelText(/Periodicidad de captura/i);
    await user.clear(periodicityInput);
    await user.type(periodicityInput, '45');
    await user.click(screen.getByRole('button', { name: 'Guardar parámetros' }));

    await waitFor(() => {
      // El banner de error de guardado aparece
      expect(screen.getByText('No se pudieron guardar los parámetros')).toBeInTheDocument();
      expect(screen.getAllByText('500 Internal Server Error').length).toBeGreaterThan(0);
    });

    // El formulario debe seguir visible con el borrador (45)
    expect(screen.getByLabelText(/Periodicidad de captura/i)).toHaveValue(45);
    // El botón Guardar debe seguir habilitado para reintentar
    expect(screen.getByRole('button', { name: 'Guardar parámetros' })).toBeEnabled();
    // El botón Reintentar NO debe aparecer (no es un error de carga)
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('rejects decimal input and shows validation error', async () => {
    const user = userEvent.setup();
    vi.mocked(configApi.fetchConfig).mockResolvedValueOnce(initialConfig);

    render(<ParametersPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Periodicidad de captura/i)).toHaveValue(60);
    });

    const periodicityInput = screen.getByLabelText(/Periodicidad de captura/i);
    await user.clear(periodicityInput);
    await user.type(periodicityInput, '1.5');

    // valueAsNumber de 1.5 es 1.5, no entero → falla validación
    expect(screen.getByRole('button', { name: 'Guardar parámetros' })).toBeDisabled();
    expect(screen.getByText('Debe ser un entero mayor o igual a 1')).toBeInTheDocument();
  });

  describe('manual purge', () => {
    const renderLoaded = async () => {
      vi.mocked(configApi.fetchConfig).mockResolvedValueOnce(initialConfig);
      render(<ParametersPage />);
      await waitFor(() =>
        expect(screen.getByLabelText(/Caducidad de noticias/i)).toHaveValue(30),
      );
    };

    it('asks for confirmation and does not purge on cancel', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Purgar ahora' }));
      expect(screen.getByText(/más de 30 días/)).toBeInTheDocument();
      expect(configApi.purgeExpiredNews).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(configApi.purgeExpiredNews).not.toHaveBeenCalled();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('purges on confirm and shows a success toast without a count', async () => {
      const user = userEvent.setup();
      vi.mocked(configApi.purgeExpiredNews).mockResolvedValueOnce(undefined);
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Purgar ahora' }));
      await user.click(screen.getByRole('button', { name: 'Purgar noticias' }));

      expect(await screen.findByText('Se purgaron las noticias caducadas')).toBeInTheDocument();
      expect(configApi.purgeExpiredNews).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('is disabled with pending changes', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      const input = screen.getByLabelText(/Caducidad de noticias/i);
      await user.clear(input);
      await user.type(input, '10');

      expect(screen.getByRole('button', { name: 'Purgar ahora' })).toBeDisabled();
      expect(screen.getByText(/Guarda o descarta los cambios/)).toBeInTheDocument();
    });

    it('disables confirmation while purging', async () => {
      const user = userEvent.setup();
      let resolve!: () => void;
      vi.mocked(configApi.purgeExpiredNews).mockReturnValueOnce(
        new Promise<void>((r) => {
          resolve = r;
        }),
      );
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Purgar ahora' }));
      await user.click(screen.getByRole('button', { name: 'Purgar noticias' }));

      expect(screen.getByRole('button', { name: 'Purgando...' })).toBeDisabled();
      resolve();
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    });

    it('shows an error toast on failure and allows retrying', async () => {
      const user = userEvent.setup();
      vi.mocked(configApi.purgeExpiredNews).mockRejectedValueOnce(new Error('Falla del servidor'));
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Purgar ahora' }));
      await user.click(screen.getByRole('button', { name: 'Purgar noticias' }));

      expect(await screen.findByText('Falla del servidor')).toBeInTheDocument();
      expect(screen.getByLabelText(/Caducidad de noticias/i)).toHaveValue(30);
      expect(screen.getByRole('button', { name: 'Purgar ahora' })).toBeEnabled();
    });
  });
});
