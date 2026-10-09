import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as configApi from '../infrastructure/configApi';
import { useConfig } from './useConfig';

vi.mock('../infrastructure/configApi');

describe('useConfig hook', () => {
  const initialConfig = {
    capturePeriodicityMinutes: 60,
    newsExpirationDays: 30,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads configuration on mount and sets initial state', async () => {
    vi.mocked(configApi.fetchConfig).mockResolvedValueOnce(initialConfig);

    const { result } = renderHook(() => useConfig());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.serverConfig).toEqual(initialConfig);
    expect(result.current.draftConfig).toEqual(initialConfig);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isValid).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('detects dirty state when values are modified', async () => {
    vi.mocked(configApi.fetchConfig).mockResolvedValueOnce(initialConfig);

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setCapturePeriodicityMinutes(15);
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.draftConfig?.capturePeriodicityMinutes).toBe(15);
  });

  it('discards modifications back to server config', async () => {
    vi.mocked(configApi.fetchConfig).mockResolvedValueOnce(initialConfig);

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setCapturePeriodicityMinutes(10);
      result.current.setNewsExpirationDays(7);
    });

    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.discardChanges();
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.draftConfig).toEqual(initialConfig);
  });

  it('validates minimum values and flags errors', async () => {
    vi.mocked(configApi.fetchConfig).mockResolvedValueOnce(initialConfig);

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setCapturePeriodicityMinutes(0);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.formErrors.capturePeriodicityMinutes).toBe('Debe ser un entero mayor o igual a 1');
  });

  it('saves configuration and resets dirty state with new values', async () => {
    vi.mocked(configApi.fetchConfig).mockResolvedValueOnce(initialConfig);
    const updatedConfig = { capturePeriodicityMinutes: 45, newsExpirationDays: 14 };
    vi.mocked(configApi.updateConfig).mockResolvedValueOnce(updatedConfig);

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setCapturePeriodicityMinutes(45);
      result.current.setNewsExpirationDays(14);
    });

    await act(async () => {
      await result.current.saveConfig();
    });

    expect(configApi.updateConfig).toHaveBeenCalledWith(updatedConfig);
    expect(result.current.serverConfig).toEqual(updatedConfig);
    expect(result.current.isDirty).toBe(false);
  });
});
