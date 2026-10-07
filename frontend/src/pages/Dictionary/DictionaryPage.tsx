import { useMemo, useState } from 'react';
import { ToastContainer } from '../../components/Toast/ToastContainer';
import { useToast } from '../../hooks/useToast';
import type { CreateTermDto, PatchTermDto } from '../../types/dictionary';
import { AddTermForm } from './components/AddTermForm';
import { SearchBar } from './components/SearchBar';
import { TermTable } from './components/TermTable';
import { useDebounce } from './hooks/useDebounce';
import { useDictionary } from './hooks/useDictionary';
import './DictionaryPage.css';

const TERMS_PER_PAGE = 12;

export const DictionaryPage = () => {
  const {
    visibleTerms,
    maxAbsValue,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    addTerm,
    updateTerm,
    removeTerm,
  } = useDictionary();

  const { toasts, addToast, removeToast } = useToast();
  const [newTermIds, setNewTermIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);

  // Debounced query for highlighting and text matching
  const debouncedQuery = useDebounce(searchQuery, 300);
  const pageCount = Math.max(1, Math.ceil(visibleTerms.length / TERMS_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const pagedTerms = useMemo(() => {
    const start = currentPage * TERMS_PER_PAGE;
    return visibleTerms.slice(start, start + TERMS_PER_PAGE);
  }, [currentPage, visibleTerms]);

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
          <p>Términos en español e inglés con su valor de humor entre − 10 y +10.</p>
        </div>
      </header>

      <div className="view">
        <AddTermForm maxAbsValue={maxAbsValue} onSubmit={handleCreateTerm} />

        <div className="card">
          <div className="ch">
            <div className="row" style={{ gap: '16px', flex: 1 }}>
              <SearchBar
                value={searchQuery}
                onChange={(value) => {
                  setSearchQuery(value);
                  setPage(0);
                }}
                count={visibleTerms.length}
              />
            </div>
            <small>Ordenado alfabéticamente</small>
          </div>

          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
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
                terms={pagedTerms}
                maxAbsValue={maxAbsValue}
                highlight={debouncedQuery}
                searchQuery={debouncedQuery}
                newTermIds={newTermIds}
                onUpdate={handleUpdateTerm}
                onDelete={handleRemoveTerm}
              />
            )}
          </div>

          {!loading && !error && visibleTerms.length > 0 && (
            <nav className="pagination" aria-label="Paginación del diccionario">
              <span className="meta">
                {currentPage * TERMS_PER_PAGE + 1}–{Math.min((currentPage + 1) * TERMS_PER_PAGE, visibleTerms.length)} de {visibleTerms.length}
              </span>
              <div className="pagination-controls">
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  aria-label="Página anterior"
                >
                  ‹ Anterior
                </button>
                <span className="meta" aria-live="polite">Página {currentPage + 1} / {pageCount}</span>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setPage(Math.min(pageCount - 1, currentPage + 1))}
                  disabled={currentPage >= pageCount - 1}
                  aria-label="Página siguiente"
                >
                  Siguiente ›
                </button>
              </div>
            </nav>
          )}
        </div>
      </div>
    </>
  );
};
