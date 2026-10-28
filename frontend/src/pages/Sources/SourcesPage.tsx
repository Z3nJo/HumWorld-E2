import { useState } from 'react';
import { captureSources } from '../../features/sources/infrastructure/sourcesApi';
import { ToastContainer } from '../../components/Toast/ToastContainer';
import { useSources } from '../../features/sources/application/useSources';
import type {
  CaptureResult,
  ChannelWithSources,
  Continent,
  CreateSourceBatchInput,
  SourceStatusFilter,
} from '../../features/sources/domain/source';
import { CONTINENT_LABELS, CONTINENTS } from '../../features/sources/domain/source';
import { DeleteSourceModal } from '../../features/sources/presentation/DeleteSourceModal';
import { SourceDrawer } from '../../features/sources/presentation/SourceDrawer';
import { SourceTable } from '../../features/sources/presentation/SourceTable';
import { useToast } from '../../hooks/useToast';
import './SourcesPage.css';

export const SourcesPage = () => {
  const [continentFilter, setContinentFilter] = useState<Continent | ''>('');
  const [statusFilter, setStatusFilter] = useState<SourceStatusFilter>('all');

  const {
    channelGroups,
    openChannelIds,
    loading,
    error,
    toggleChannelOpen,
    toggleSourceActive,
    toggleChannelActive,
    addSourcesBatch,
    editSourceBatch,
    deactivateChannelGroup,
    reload,
  } = useSources(continentFilter, statusFilter);

  const { toasts, addToast, removeToast } = useToast();

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChannelWithSources | null>(null);

  // Deactivate modal state
  const [deactivatingChannel, setDeactivatingChannel] = useState<ChannelWithSources | null>(
    null,
  );
  const [deactivating, setDeactivating] = useState(false);

  // Manual capture
  const [capturing, setCapturing] = useState(false);

  const runCapture = async (sourceIds?: number[]) => {
    setCapturing(true);
    try {
      const res: CaptureResult = await captureSources(sourceIds);
      const msg = `Captura finalizada: ${res.inserted} noticias insertadas, ${res.failedSources} fuentes fallidas, ${res.skippedSourceIds.length} fuentes omitidas`;
      addToast(msg, res.failedSources > 0 ? 'error' : 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al ejecutar la captura';
      addToast(msg, 'error');
    } finally {
      setCapturing(false);
    }
  };

  const handleCaptureChannel = (channel: ChannelWithSources) =>
    runCapture(channel.sources.filter((c) => c.active).map((c) => c.id));

  // Count channels and feeds for visible groups
  const totalFeeds = channelGroups.reduce((acc, g) => acc + g.sources.length, 0);

  const handleOpenCreateDrawer = () => {
    setEditingChannel(null);
    setDrawerOpen(true);
  };

  const handleOpenEditDrawer = (channel: ChannelWithSources) => {
    setEditingChannel(channel);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingChannel(null);
  };

  // Toggle feed switch
  const handleToggleSourceActive = async (sourceId: number) => {
    try {
      const res = await toggleSourceActive(sourceId);
      if (res) {
        addToast(`Canal ${res.active ? 'activado' : 'desactivado'}`, 'success');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar estado del canal';
      addToast(msg, 'error');
    }
  };

  // Toggle channel (medio) switch
  const handleToggleChannelActive = async (channelId: number) => {
    try {
      const res = await toggleChannelActive(channelId);
      if (res) {
        addToast(
          `«${res.name}» ${res.active ? 'activada' : 'desactivada'}`,
          'success',
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar estado de la fuente';
      addToast(msg, 'error');
    }
  };

  // Create new batch
  const handleCreateBatch = async (input: CreateSourceBatchInput) => {
    try {
      const res = await addSourcesBatch(input);
      addToast(
        `Fuente creada con ${res.sources.length} canal(es)`,
        'success',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear la fuente';
      addToast(msg, 'error');
      throw err;
    }
  };

  // Edit batch
  const handleEditBatch = async (
    input: Parameters<typeof editSourceBatch>[0],
    existing: ChannelWithSources,
  ) => {
    try {
      await editSourceBatch(input, existing);
      addToast(`Fuente «${input.nombre}» actualizada`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar la fuente';
      addToast(msg, 'error');
      throw err;
    }
  };

  // Confirm deactivate channel
  const handleConfirmDeactivate = async () => {
    if (!deactivatingChannel) return;
    setDeactivating(true);
    try {
      await deactivateChannelGroup(deactivatingChannel.id);
      addToast(`Fuente «${deactivatingChannel.name}» desactivada`, 'success');
      setDeactivatingChannel(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al desactivar la fuente';
      addToast(msg, 'error');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <header className="top">
        <div>
          <h1>Fuentes y canales RSS</h1>
          <p>
            Fuentes de noticias y sus canales RSS. Solo se capturan canales activos de
            fuentes activas.
          </p>
        </div>
      </header>

      <div className="view">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <select
              className="sel"
              value={continentFilter}
              onChange={(e) => setContinentFilter(e.target.value as Continent | '')}
              aria-label="Continente"
            >
              <option value="">Todos los continentes</option>
              {CONTINENTS.map((k) => (
                <option key={k} value={k}>
                  {CONTINENT_LABELS[k]}
                </option>
              ))}
            </select>

            <div className="seg" role="group" aria-label="Estado">
              {(['all', 'active', 'inactive'] as const).map((v) => (
                <button
                  key={v}
                  className={statusFilter === v ? 'on' : ''}
                  onClick={() => setStatusFilter(v)}
                >
                  {v === 'all' ? 'Todas' : v === 'active' ? 'Activas' : 'Inactivas'}
                </button>
              ))}
            </div>

            <span className="meta">
              {channelGroups.length} fuentes · {totalFeeds} canales
            </span>
          </div>

          <div className="row">
            <button className="btn" onClick={() => runCapture()} disabled={capturing}>
              {capturing ? 'Capturando…' : 'Capturar ahora'}
            </button>
            <button className="btn pri" onClick={handleOpenCreateDrawer}>
              + Nueva fuente
            </button>
          </div>
        </div>

        {loading && (
          <div className="card">
            <div className="empty">
              <b>Cargando fuentes…</b>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="errbox" role="alert">
            <b>No se pudieron cargar las fuentes</b>
            <span className="mono" style={{ fontSize: '12px' }}>
              {error}
            </span>
            <button className="btn sm" onClick={reload}>
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && (
          <SourceTable
            channelGroups={channelGroups}
            openChannelIds={openChannelIds}
            onToggleChannelOpen={toggleChannelOpen}
            onToggleSourceActive={handleToggleSourceActive}
            onToggleGroupActive={handleToggleChannelActive}
            onEditChannel={handleOpenEditDrawer}
            onDeleteChannel={(channel) => setDeactivatingChannel(channel)}
            onCaptureChannel={handleCaptureChannel}
            capturing={capturing}
          />
        )}
      </div>

      <SourceDrawer
        isOpen={drawerOpen}
        editingChannel={editingChannel}
        onClose={handleCloseDrawer}
        onCreateBatch={handleCreateBatch}
        onEditBatch={handleEditBatch}
        onShowErrorToast={(msg) => addToast(msg, 'error')}
      />

      <DeleteSourceModal
        channel={deactivatingChannel}
        onClose={() => setDeactivatingChannel(null)}
        onConfirm={handleConfirmDeactivate}
        loading={deactivating}
      />
    </>
  );
};
