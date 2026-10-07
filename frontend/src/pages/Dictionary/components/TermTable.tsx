import type { PatchTermDto, Term } from '../../../types/dictionary';
import { TermRow } from './TermRow';
import './TermTable.css';

interface TermTableProps {
  terms: Term[];
  maxAbsValue: number;
  highlight?: string;
  searchQuery: string;
  newTermIds?: Set<number>;
  onUpdate: (id: number, data: PatchTermDto) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export const TermTable = ({
  terms,
  maxAbsValue,
  highlight,
  searchQuery,
  newTermIds,
  onUpdate,
  onDelete,
}: TermTableProps) => {
  const getEmptyMessage = () => {
    if (searchQuery.trim()) {
      return `Sin resultados para «${searchQuery}». Puedes añadirlo con el formulario superior.`;
    }
    return 'No hay términos registrados en el diccionario.';
  };

  if (terms.length === 0) {
    return (
      <div className="empty">
        <b>Sin términos</b>
        {getEmptyMessage()}
      </div>
    );
  }

  return (
    <table className="t" aria-label="Diccionario de términos">
      <thead>
        <tr>
          <th>Término</th>
          <th>Idioma</th>
          <th>Valor</th>
          <th style={{ textAlign: 'right' }}>
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {terms.map((term) => (
          <TermRow
            key={term.id}
            term={term}
            maxAbsValue={maxAbsValue}
            highlight={highlight}
            isNew={newTermIds?.has(term.id)}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </tbody>
    </table>
  );
};
