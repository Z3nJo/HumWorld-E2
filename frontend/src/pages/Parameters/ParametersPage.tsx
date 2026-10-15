import { ToastContainer } from '../../components/Toast/ToastContainer';
import { useConfig } from '../../features/config/application/useConfig';
import { ConfigCards } from '../../features/config/presentation/ConfigCards';
import { useToast } from '../../hooks/useToast';
import './ParametersPage.css';

export const ParametersPage = () => {
  const {
    draftConfig,
    loading,
    saving,
    loadError,
    saveError,
    formErrors,
    isDirty,
    isValid,
    setCapturePeriodicityMinutes,
    setNewsExpirationDays,
    discardChanges,
    saveConfig,
    reload,
  } = useConfig();

  const { toasts, addToast, removeToast } = useToast();

  const handleSave = async () => {
    try {
      await saveConfig();
      addToast('Parámetros guardados correctamente', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar los parámetros';
      addToast(msg, 'error');
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <header className="params-top">
        <div>
          <h1>Parámetros generales</h1>
          <p>Periodicidad de captura y caducidad de noticias.</p>
        </div>
      </header>

      <div className="params-view">
        {loading && (
          <div className="card" style={{ padding: '24px' }}>
            <div className="sk" style={{ height: '140px' }} />
          </div>
        )}

        {loadError && !loading && (
          <div className="errbox" role="alert">
            <b>No se pudieron cargar los parámetros</b>
            <span className="mono" style={{ fontSize: '12px' }}>
              {loadError}
            </span>
            <button className="params-btn params-btn-sm" onClick={reload}>
              Reintentar
            </button>
          </div>
        )}

        {!loading && !loadError && draftConfig && (
          <>
            {saveError && (
              <div className="errbox" role="alert">
                <b>No se pudieron guardar los parámetros</b>
                <span className="mono" style={{ fontSize: '12px' }}>
                  {saveError}
                </span>
              </div>
            )}

            <ConfigCards
              captureMinutes={draftConfig.capturePeriodicityMinutes}
              expirationDays={draftConfig.newsExpirationDays}
              humorMinimumNewsAggregation={draftConfig.humorMinimumNewsAggregation}
              onChangeCaptureMinutes={setCapturePeriodicityMinutes}
              onChangeExpirationDays={setNewsExpirationDays}
              errors={formErrors}
              disabled={saving}
            />

            <div className="row actions" style={{ justifyContent: 'flex-end', gap: '10px' }}>
              <span className="meta">{isDirty ? 'Cambios sin guardar' : 'Sin cambios'}</span>
              <button className="params-btn" onClick={discardChanges} disabled={!isDirty || saving}>
                Descartar
              </button>
              <button className="params-btn params-btn-pri" onClick={handleSave} disabled={!isDirty || !isValid || saving}>
                {saving ? 'Guardando...' : 'Guardar parámetros'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};
