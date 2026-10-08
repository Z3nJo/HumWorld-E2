import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DictionaryPage } from './DictionaryPage';
import { createTerm, deleteTerm, fetchTerms, patchTerm } from '../../features/dictionary/infrastructure/dictionaryApi';
import type { Term } from '../../features/dictionary/domain/dictionary';

vi.mock('../../features/dictionary/infrastructure/dictionaryApi', () => ({
  createTerm: vi.fn(),
  deleteTerm: vi.fn(),
  fetchTerms: vi.fn(),
  patchTerm: vi.fn(),
}));

const mockedFetchTerms = vi.mocked(fetchTerms);
const mockedCreateTerm = vi.mocked(createTerm);
const mockedDeleteTerm = vi.mocked(deleteTerm);
const mockedPatchTerm = vi.mocked(patchTerm);

const makeTerm = (id: number, word: string, active = true): Term => ({
  id, word, lang: 'es', value: id % 2 === 0 ? 4 : -3, active,
  created_at: '2026-10-08T00:00:00.000Z', updated_at: '2026-10-08T00:00:00.000Z',
});

const makeLanguageTerm = (id: number, word: string, lang: 'es' | 'en', active = true): Term => ({
  ...makeTerm(id, word, active), lang,
});

describe('DictionaryPage', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    mockedFetchTerms.mockResolvedValue([makeTerm(1, 'Zorro'), makeTerm(2, 'beta', false), makeTerm(3, 'Árbol')]);
    mockedCreateTerm.mockResolvedValue(makeTerm(4, 'nuevo'));
    mockedPatchTerm.mockResolvedValue(makeTerm(1, 'Zorro actualizado'));
    mockedDeleteTerm.mockResolvedValue(undefined);
  });

  it('loads active terms alphabetically and switches status filters', async () => {
    render(<DictionaryPage />);
    const columnClasses = () => Array.from(screen.getByRole('table').querySelectorAll('col')).map((column) => column.className);

    expect(await screen.findByText('Árbol')).toBeInTheDocument();
    const activeColumnClasses = columnClasses();
    expect(screen.queryByText('beta')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Solo inactivos' }));
    expect(await screen.findByText('beta')).toBeInTheDocument();
    expect(columnClasses()).toEqual(activeColumnClasses);
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(screen.getByText('Zorro')).toBeInTheDocument();
    expect(screen.getByText('INACTIVO')).toBeInTheDocument();
    expect(columnClasses()).toEqual(activeColumnClasses);
  });

  it('uses the upper language selector to filter the table and combines with status', async () => {
    mockedFetchTerms.mockResolvedValue([
      makeLanguageTerm(1, 'Zorro', 'en'), makeLanguageTerm(2, 'Árbol', 'es'),
      makeLanguageTerm(3, 'beta', 'en', false), makeLanguageTerm(4, 'aldea', 'es'),
    ]);
    render(<DictionaryPage />);
    await screen.findByText('Árbol');
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(screen.getByText('aldea')).toBeInTheDocument();
    expect(screen.queryByText('Zorro')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Idioma'), { target: { value: 'en' } });
    expect(screen.getByText('Zorro')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
    expect(screen.queryByText('aldea')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Solo inactivos' }));
    expect(screen.getByText('beta')).toBeInTheDocument();
    expect(screen.queryByText('Zorro')).not.toBeInTheDocument();
  });

  it('sends only the final debounced search and keeps the active status filter', async () => {
    mockedFetchTerms.mockImplementation(async (query) => {
      const terms = [makeTerm(1, 'alegría'), makeTerm(2, 'beta', false)];
      return query ? terms.filter((term) => term.word.toLowerCase().includes(query.toLowerCase())) : terms;
    });
    render(<DictionaryPage />);
    const search = await screen.findByRole('textbox', { name: 'Buscar término' });
    const callsBeforeSearch = mockedFetchTerms.mock.calls.length;
    fireEvent.change(search, { target: { value: 'a' } });
    fireEvent.change(search, { target: { value: 'al' } });
    await new Promise((resolve) => setTimeout(resolve, 350));
    await waitFor(() => expect(mockedFetchTerms).toHaveBeenCalledWith('al'));
    expect(mockedFetchTerms.mock.calls.length).toBe(callsBeforeSearch + 1);
    expect(screen.getByRole('table').textContent).toContain('alegría');
    expect(screen.queryByText('beta')).not.toBeInTheDocument();
  });

  it('paginates twelve rows and resets to the first page when the filter changes', async () => {
    mockedFetchTerms.mockResolvedValue(Array.from({ length: 13 }, (_, index) => makeTerm(index + 1, `término-${String(index + 1).padStart(2, '0')}`)));
    render(<DictionaryPage />);
    expect(await screen.findByText('término-01')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(await screen.findByText('término-13')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Solo inactivos' }));
    expect(await screen.findByText('Sin términos')).toBeInTheDocument();
  });

  it('keeps a logically deleted term visible in inactive and all views', async () => {
    render(<DictionaryPage />);
    const row = (await screen.findByText('Zorro')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Eliminar Zorro' }));
    fireEvent.click(within(row).getByRole('button', { name: 'Sí, eliminar' }));
    await waitFor(() => expect(mockedDeleteTerm).toHaveBeenCalledWith(1));
    fireEvent.click(screen.getByRole('button', { name: 'Solo inactivos' }));
    expect(await screen.findByText('Zorro')).toBeInTheDocument();
  });

  it('shows API errors and preserves data for failed CRUD operations', async () => {
    mockedDeleteTerm.mockRejectedValue(new Error('No se pudo eliminar'));
    render(<DictionaryPage />);
    const row = (await screen.findByText('Zorro')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Eliminar Zorro' }));
    fireEvent.click(within(row).getByRole('button', { name: 'Sí, eliminar' }));
    await waitFor(() => expect(screen.getByText('No se pudo eliminar')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Eliminar Zorro' })).toBeInTheDocument();
  });

  it('creates and updates terms successfully', async () => {
    render(<DictionaryPage />);
    await screen.findByText('Zorro');
    fireEvent.change(screen.getByPlaceholderText('p. ej. esperanza'), { target: { value: 'nuevo' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
    await waitFor(() => expect(mockedCreateTerm).toHaveBeenCalledWith({ word: 'nuevo', lang: 'es', value: 5 }));
    const row = (await screen.findByText('Zorro')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Editar Zorro' }));
    const editInput = await screen.findByPlaceholderText('Término');
    fireEvent.change(editInput, { target: { value: 'Zorro actualizado' } });
    fireEvent.click(within(editInput.closest('tr') as HTMLElement).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(mockedPatchTerm).toHaveBeenCalled());
  });
});
