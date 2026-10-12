import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConfigFormErrors, RuntimeConfig } from '../domain/config';
import { validateConfig } from '../domain/config';
import { fetchConfig, updateConfig } from '../infrastructure/configApi';

export function useConfig() {
  const [serverConfig, setServerConfig] = useState<RuntimeConfig | null>(null);
  const [draftConfig, setDraftConfig] = useState<RuntimeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchConfig();
      setServerConfig(data);
      setDraftConfig(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los parámetros';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const formErrors: ConfigFormErrors = useMemo(() => {
    if (!draftConfig) return {};
    return validateConfig(draftConfig);
  }, [draftConfig]);

  const isValid = useMemo(() => Object.keys(formErrors).length === 0, [formErrors]);

  const isDirty = useMemo(() => {
    if (!serverConfig || !draftConfig) return false;
    return (
      serverConfig.capturePeriodicityMinutes !== draftConfig.capturePeriodicityMinutes ||
      serverConfig.newsExpirationDays !== draftConfig.newsExpirationDays
    );
  }, [serverConfig, draftConfig]);

  const setCapturePeriodicityMinutes = useCallback((value: number) => {
    setDraftConfig((prev) => (prev ? { ...prev, capturePeriodicityMinutes: value } : null));
  }, []);

  const setNewsExpirationDays = useCallback((value: number) => {
    setDraftConfig((prev) => (prev ? { ...prev, newsExpirationDays: value } : null));
  }, []);

  const discardChanges = useCallback(() => {
    if (serverConfig) setDraftConfig({ ...serverConfig });
  }, [serverConfig]);

  const saveConfig = useCallback(async (): Promise<RuntimeConfig> => {
    if (!draftConfig || !isValid) throw new Error('Parámetros no válidos');
    setSaving(true);
    setError(null);
    try {
      const updated = await updateConfig(draftConfig);
      setServerConfig(updated);
      setDraftConfig(updated);
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar los parámetros';
      setError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [draftConfig, isValid]);

  return {
    serverConfig,
    draftConfig,
    loading,
    saving,
    error,
    formErrors,
    isDirty,
    isValid,
    setCapturePeriodicityMinutes,
    setNewsExpirationDays,
    discardChanges,
    saveConfig,
    reload: load,
  };
}
