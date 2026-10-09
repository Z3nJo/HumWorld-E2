import { useState } from 'react';
import { ToastContainer } from '../../components/Toast/ToastContainer';
import { useSources } from '../../features/sources/application/useSources';
import type {
  Continent,
  CreateSourceBatchInput,
  ReplaceSourceInput,
  Source,
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
    filteredSources,
    channelGroups,
    openChannelIds,
    loading,
    error,
    toggleChannelOpen,
    toggleSourceActive,
    addSourcesBatch,
    updateSourceItem,
    removeSourceItem,
    reload,
  } = useSources(continentFilter, statusFilter);

  const { toasts, addToast, removeToast } = useToast();

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);

  // Delete modal state
  const [deletingSource, setDeletingSource] = useState<Source | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenCreateDrawer = () => {
    setEditingSource(null);
    setDrawerOpen(true);
  };

  const handleOpenEditDrawer = (source: Source) => {
    setEditingSource(source);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingSource(null);
  };

  const handleToggleActive = async (sourceId: number) => {
    try {
      const updated = await toggleSourceActive(sourceId);
      if (updated) {
        addToast(
          `Fuente «${updated.name}» ${updated.active ? 'activada' : 'desactivada'}`,
          'success',
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar estado';
      addToast(msg, 'error');
    }
  };

  const handleCreateBatch = async (input: CreateSourceBatchInput) => {
    try {
      const res = await addSourcesBatch(input);
      addToast(
        `Canal «${res.channel.name}» creado con ${res.sources.length} feed(s) RSS`,
        'success',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear la fuente';
      addToast(msg, 'error');
      throw err;
    }
  };

  const handleUpdateSource = async (id: number, input: ReplaceSourceInput) => {
    try {
      const updated = await updateSourceItem(id, input);
      addToast(`Fuente «${updated.name}» actualizada`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar la fuente';
      addToast(msg, 'error');
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSource) return;
    setDeleting(true);
    try {
      await removeSourceItem(deletingSource.id);
      addToast(`Fuente «${deletingSource.name}» eliminada`, 'success');
      setDeletingSource(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar la fuente';
      addToast(msg, 'error');
    } finally {
      setDeleting(false);
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
              aria-label="Filtrar por continente"
            >
              <option value="">Todos los continentes</option>
              {CONTINENTS.map((c) => (
                <option key={c} value={c}>
                  {CONTINENT_LABELS[c]}
                </option>
              ))}
            </select>

            <div className="seg" role="group" aria-label="Filtrar por estado">
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
              {channelGroups.length} fuente(s) · {filteredSources.length} canal(es)
            </span>
          </div>

          <button className="btn pri" onClick={handleOpenCreateDrawer}>
            + Nueva fuente
          </button>
        </div>

        <div className="backend-note" role="note">
          <strong>REQUIERE BACK</strong>
          <span>
            El backend actual permite gestionar fuentes RSS, pero todavía no expone estado propio
            ni país para los canales. Esas capacidades se muestran como no disponibles.
          </span>
        </div>

        {loading && (
          <div className="card" style={{ padding: '24px' }}>
            <div className="sk" style={{ height: '180px' }} />
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
            onToggleSourceActive={handleToggleActive}
            onEditSource={handleOpenEditDrawer}
            onDeleteSource={(s) => setDeletingSource(s)}
          />
        )}
      </div>

      <SourceDrawer
        isOpen={drawerOpen}
        editingSource={editingSource}
        onClose={handleCloseDrawer}
        onCreateBatch={handleCreateBatch}
        onUpdateSource={handleUpdateSource}
      />

      <DeleteSourceModal
        source={deletingSource}
        onClose={() => setDeletingSource(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </>
  );
};
