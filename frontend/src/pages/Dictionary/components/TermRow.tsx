import { useState } from 'react';
import type { PatchTermDto, Term } from '../../../types/dictionary';
import { LangBadge } from './LangBadge';
import { TermRowEdit } from './TermRowEdit';
import { ValueBar } from './ValueBar';
import './TermRow.css';

interface TermRowProps {
  term: Term;
  maxAbsValue: number;
  highlight?: string;
  isNew?: boolean;
  onUpdate: (id: number, data: PatchTermDto) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function renderHighlightedWord(word: string, highlight?: string) {
  if (!highlight || !highlight.trim()) {
    return <span className="dict-row-word">{word}</span>;
  }

  const query = highlight.trim();
  const lowerWord = word.toLowerCase();
  const lowerQuery = query.toLowerCase();

  const index = lowerWord.indexOf(lowerQuery);
  if (index === -1) {
    return <span className="dict-row-word">{word}</span>;
  }

  const before = word.slice(0, index);
  const match = word.slice(index, index + query.length);
  const after = word.slice(index + query.length);

  return (
    <span className="dict-row-word">
      {before}
      <mark className="dict-highlight">{match}</mark>
      {after}
    </span>
  );
}

export const TermRow = ({
  term,
  maxAbsValue,
  highlight,
  isNew = false,
  onUpdate,
  onDelete,
}: TermRowProps) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setIsExiting(true);
    setTimeout(async () => {
      try {
        await onDelete(term.id);
      } catch {
        setIsExiting(false);
        setIsConfirmingDelete(false);
      } finally {
        setIsDeleting(false);
      }
    }, 220);
  };

  if (isEditing) {
    return (
      <TermRowEdit
        term={term}
        maxAbsValue={maxAbsValue}
        onSave={async (id, data) => {
          await onUpdate(id, data);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  const isInactive = !term.active;
  const rowClasses = [
    isInactive ? 'dict-row--inactive' : '',
    isNew ? 'dict-row--entering' : '',
    isExiting ? 'dict-row--exiting' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <tr className={rowClasses}>
      <td className="dict-cell-word">
        {renderHighlightedWord(term.word, highlight)}
      </td>

      <td style={{ width: '90px' }}>
        <LangBadge lang={term.lang} isInactive={isInactive} />
      </td>

      <td style={{ width: '220px' }}>
        <ValueBar value={term.value} maxAbsValue={maxAbsValue} />
      </td>

      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        {isInactive ? (
          <span className="pill pill-inactive" title="Término inactivo">
            INACTIVO
          </span>
        ) : isConfirmingDelete ? (
          <span className="dict-delete-confirm-box">
            <span className="dict-delete-confirm-label">¿Seguro?</span>
            <button
              type="button"
              className="btn dan sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              Sí, eliminar
            </button>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={isDeleting}
            >
              No
            </button>
          </span>
        ) : (
          <>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setIsEditing(true)}
              aria-label={`Editar ${term.word}`}
            >
              Editar
            </button>
            <button
              type="button"
              className="btn ghost sm"
              style={{ color: 'var(--neg)' }}
              onClick={() => setIsConfirmingDelete(true)}
              aria-label={`Eliminar ${term.word}`}
            >
              Eliminar
            </button>
          </>
        )}
      </td>
    </tr>
  );
};
