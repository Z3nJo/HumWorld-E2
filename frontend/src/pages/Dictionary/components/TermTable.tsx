import type {
  LanguageFilterOption,
  PatchTermInput,
  StatusFilterOption,
  Term,
} from '../../../features/dictionary/domain/dictionary';
import { TermRow } from './TermRow';
import './TermTable.css';

interface TermTableProps {
  terms: Term[];
  maxAbsValue: number;
  highlight?: string;
  searchQuery: string;
  statusFilter: StatusFilterOption;
  languageFilter: LanguageFilterOption;
  newTermIds?: Set<number>;
  onUpdate: (id: number, data: PatchTermInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export const TermTable = ({
  terms,
  maxAbsValue,
  highlight,
  searchQuery,
  statusFilter,
  languageFilter,
  newTermIds,
  onUpdate,
  onDelete,
}: TermTableProps) => {
  const getEmptyMessage = () => {
    if (searchQuery.trim()) {
      return `Sin resultados para «${searchQuery}». Puedes añadirlo con el formulario superior.`;
    }
    if (languageFilter === 'es') return 'No hay términos en español para esta vista.';
    if (languageFilter === 'en') return 'No hay términos en inglés para esta vista.';
    if (statusFilter === 'inactive') return 'No hay términos inactivos.';
    if (statusFilter === 'all') return 'No hay términos registrados en el diccionario.';
    return 'No hay términos activos.';
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
      <colgroup>
        <col className="t-col-term" />
        <col className="t-col-language" />
        <col className="t-col-value" />
        <col className="t-col-actions" />
      </colgroup>
      <thead>
        <tr>
          <th className="t-col-term">Término</th>
          <th className="t-col-language">Idioma</th>
          <th className="t-col-value">Valor</th>
          <th className="t-col-actions t-actions-heading">
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
