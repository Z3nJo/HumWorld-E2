import { useState } from 'react';
import { ToastContainer } from '../../components/Toast/ToastContainer';
import { useToast } from '../../hooks/useToast';
import type { CreateTermDto, PatchTermDto } from '../../types/dictionary';
import { AddTermForm } from './components/AddTermForm';
import { SearchBar } from './components/SearchBar';
import { StatusFilter } from './components/StatusFilter';
import { TermTable } from './components/TermTable';
import { useDebounce } from './hooks/useDebounce';
import { useDictionary } from './hooks/useDictionary';
import './DictionaryPage.css';

export const DictionaryPage = () => {
  const {
    visibleTerms,
    maxAbsValue,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    addTerm,
    updateTerm,
    removeTerm,
  } = useDictionary();

  const { toasts, addToast, removeToast } = useToast();
  const [newTermIds, setNewTermIds] = useState<Set<number>>(new Set());
  const [annotActive, setAnnotActive] = useState<boolean>(false);

  // Debounced query for highlighting and text matching
  const debouncedQuery = useDebounce(searchQuery, 300);

  const handleCreateTerm = async (dto: CreateTermDto) => {
    try {
      const created = await addTerm(dto);
      // Track newly added term ID to trigger entrance animation
      setNewTermIds((prev) => new Set(prev).add(created.id));
      setTimeout(() => {
        setNewTermIds((prev) => {
          const next = new Set(prev);
          next.delete(created.id);
          return next;
        });
      }, 1500);

      addToast(`Término «${created.word}» añadido`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear el término';
      addToast(msg, 'error');
      throw err;
    }
  };

  const handleUpdateTerm = async (id: number, dto: PatchTermDto) => {
    try {
      const updated = await updateTerm(id, dto);
      addToast(`Término «${updated.word}» actualizado`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar el término';
      addToast(msg, 'error');
      throw err;
    }
  };

  const handleRemoveTerm = async (id: number) => {
    try {
      await removeTerm(id);
      addToast('Término eliminado del diccionario', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar el término';
      addToast(msg, 'error');
      throw err;
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <header className="top">
        <div>
          <h1>Diccionario de términos</h1>
          <p>Términos en español e inglés con su valor de humor entre −10 y +10.</p>
        </div>
        <div className="tools">
          <button
            type="button"
            className={`anntog ${annotActive ? 'on' : ''}`}
            onClick={() => setAnnotActive(!annotActive)}
            aria-pressed={annotActive}
          >
            Anotaciones de diseño
          </button>
        </div>
      </header>

      <div className={`view ${annotActive ? 'annon' : ''}`}>
        <AddTermForm maxAbsValue={maxAbsValue} onSubmit={handleCreateTerm} />

        <div className="card">
          <div className="ch">
            <div className="row" style={{ gap: '16px', flex: 1 }}>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                count={visibleTerms.length}
              />
              <StatusFilter
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
            <small>Ordenado alfabéticamente</small>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {loading && visibleTerms.length === 0 ? (
              <div className="empty">
                <b>Cargando términos...</b>
                Consultando el diccionario en el backend.
              </div>
            ) : error && visibleTerms.length === 0 ? (
              <div className="errbox" role="alert" style={{ margin: '18px' }}>
                <b>No se pudieron cargar los términos</b>
                <span className="mono" style={{ fontSize: '12px' }}>{error}</span>
              </div>
            ) : (
              <TermTable
                terms={visibleTerms}
                maxAbsValue={maxAbsValue}
                highlight={debouncedQuery}
                statusFilter={statusFilter}
                searchQuery={debouncedQuery}
                newTermIds={newTermIds}
                onUpdate={handleUpdateTerm}
                onDelete={handleRemoveTerm}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};
