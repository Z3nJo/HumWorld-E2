import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createTerm, deleteTerm, fetchTerms, patchTerm } from '../../../api/dictionary';
import type { CreateTermDto, PatchTermDto, Term } from '../../../types/dictionary';

export function useDictionary() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Track latest terms in ref for safe rollbacks
  const termsRef = useRef<Term[]>(terms);
  useEffect(() => {
    termsRef.current = terms;
  }, [terms]);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchTerms(q);
      setTerms(fetched);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los términos';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    // The initial request synchronizes component state with the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Optimistic Add Term
  const addTerm = useCallback(async (dto: CreateTermDto): Promise<Term> => {
    const previous = termsRef.current;
    const tempId = -Date.now();
    const tempTerm: Term = {
      id: tempId,
      word: dto.word.trim(),
      lang: dto.lang,
      value: dto.value,
      active: dto.active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic insert
    setTerms((prev) => [...prev, tempTerm]);

    try {
      const created = await createTerm(dto);
      // Replace temporary term with server response
      setTerms((prev) => prev.map((t) => (t.id === tempId ? created : t)));
      return created;
    } catch (err) {
      // Rollback
      setTerms(previous);
      throw err;
    }
  }, []);

  // Optimistic Update Term
  const updateTerm = useCallback(async (id: number, dto: PatchTermDto): Promise<Term> => {
    const previous = termsRef.current;
    const existing = previous.find((t) => t.id === id);
    if (!existing) {
      throw new Error(`Término con ID ${id} no encontrado`);
    }

    const updatedOptimistic: Term = {
      ...existing,
      word: dto.word !== undefined ? dto.word.trim() : existing.word,
      lang: dto.lang !== undefined ? dto.lang : existing.lang,
      value: dto.value !== undefined ? dto.value : existing.value,
      active: dto.active !== undefined ? dto.active : existing.active,
      updated_at: new Date().toISOString(),
    };

    setTerms((prev) => prev.map((t) => (t.id === id ? updatedOptimistic : t)));

    try {
      const updated = await patchTerm(id, dto);
      setTerms((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    } catch (err) {
      // Rollback
      setTerms(previous);
      throw err;
    }
  }, []);

  // Optimistic Remove (physical delete from list)
  const removeTerm = useCallback(async (id: number): Promise<void> => {
    const previous = termsRef.current;

    // Optimistic update: remove from list immediately
    setTerms((prev) => prev.filter((t) => t.id !== id));

    try {
      await deleteTerm(id);
    } catch (err) {
      // Rollback
      setTerms(previous);
      throw err;
    }
  }, []);

  // Filtered and sorted terms for display
  const visibleTerms = useMemo(() => {
    return terms
      .filter((term) => {
        // La vista principal muestra únicamente términos vigentes.
        // Los inactivos se conservan en la base de datos por el borrado lógico,
        // pero no deben aparecer en el diccionario operativo.
        if (!term.active) return false;

        // Text search filter (case-insensitive substring match)
        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          const word = term.word.toLowerCase();
          return word.includes(query);
        }

        return true;
      })
      .sort((a, b) => a.word.localeCompare(b.word, 'es', { sensitivity: 'base' }));
  }, [terms, searchQuery]);

  // Max absolute value across visible terms for proportional ValueBar scaling
  const maxAbsValue = useMemo(() => {
    if (visibleTerms.length === 0) return 10;
    const maxVal = Math.max(...visibleTerms.map((t) => Math.abs(t.value)));
    return maxVal > 0 ? maxVal : 10;
  }, [visibleTerms]);

  return {
    terms,
    visibleTerms,
    maxAbsValue,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    load,
    addTerm,
    updateTerm,
    removeTerm,
  };
}
