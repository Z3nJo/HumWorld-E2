import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createTerm, deleteTerm, fetchTerms, patchTerm } from '../infrastructure/dictionaryApi';
import {
  compareTerms, type CreateTermInput, type LanguageFilterOption, type PatchTermInput,
  type StatusFilterOption, type Term,
} from '../domain/dictionary';
import { useDebounce } from './useDebounce';

export function useDictionary(
  statusFilter: StatusFilterOption = 'active',
  languageFilter: LanguageFilterOption = 'all',
) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const requestIdRef = useRef(0);
  const termsRef = useRef<Term[]>(terms);

  useEffect(() => { termsRef.current = terms; }, [terms]);

  const load = useCallback(async (query?: string) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchTerms(query);
      if (requestId === requestIdRef.current) setTerms(fetched);
    } catch (err) {
      if (requestId === requestIdRef.current) setError(err instanceof Error ? err.message : 'Error al cargar los términos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Synchronize the debounced query with the external API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(debouncedSearchQuery);
  }, [debouncedSearchQuery, load]);

  const addTerm = useCallback(async (input: CreateTermInput) => {
    const previous = termsRef.current;
    const tempId = -Date.now();
    const now = new Date().toISOString();
    setTerms((current) => [...current, {
      id: tempId, word: input.word.trim(), lang: input.lang, value: input.value,
      active: input.active ?? true, created_at: now, updated_at: now,
    }]);
    try {
      const created = await createTerm(input);
      setTerms((current) => current.map((term) => term.id === tempId ? created : term));
      return created;
    } catch (err) { setTerms(previous); throw err; }
  }, []);

  const updateTerm = useCallback(async (id: number, input: PatchTermInput) => {
    const previous = termsRef.current;
    const existing = previous.find((term) => term.id === id);
    if (!existing) throw new Error(`Término con ID ${id} no encontrado`);
    setTerms((current) => current.map((term) => term.id === id ? {
      ...term,
      word: input.word !== undefined ? input.word.trim() : term.word,
      lang: input.lang ?? term.lang,
      value: input.value ?? term.value,
      active: input.active ?? term.active,
      updated_at: new Date().toISOString(),
    } : term));
    try {
      const updated = await patchTerm(id, input);
      setTerms((current) => current.map((term) => term.id === id ? updated : term));
      return updated;
    } catch (err) { setTerms(previous); throw err; }
  }, []);

  const removeTerm = useCallback(async (id: number) => {
    const previous = termsRef.current;
    setTerms((current) => current.map((term) => term.id === id
      ? { ...term, active: false, updated_at: new Date().toISOString() } : term));
    try { await deleteTerm(id); } catch (err) { setTerms(previous); throw err; }
  }, []);

  const visibleTerms = useMemo(() => terms.filter((term) => {
    if (statusFilter === 'active' && !term.active) return false;
    if (statusFilter === 'inactive' && term.active) return false;
    if (languageFilter !== 'all' && term.lang !== languageFilter) return false;
    const query = searchQuery.trim().toLowerCase();
    return !query || term.word.toLowerCase().includes(query);
  }).sort(compareTerms), [terms, searchQuery, statusFilter, languageFilter]);

  const maxAbsValue = useMemo(() => {
    if (visibleTerms.length === 0) return 10;
    const maxValue = Math.max(...visibleTerms.map((term) => Math.abs(term.value)));
    return maxValue > 0 ? maxValue : 10;
  }, [visibleTerms]);

  return { terms, visibleTerms, maxAbsValue, loading, error, searchQuery, setSearchQuery, load, addTerm, updateTerm, removeTerm };
}
