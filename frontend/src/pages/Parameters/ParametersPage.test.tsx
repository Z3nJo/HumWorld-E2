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

  it('displays error box when fetch fails and allows retry', async () => {
    vi.mocked(configApi.fetchConfig)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(initialConfig);

    render(<ParametersPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Periodicidad de captura/i)).toHaveValue(60);
    });
  });
});
