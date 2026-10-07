import { useState, type FormEvent } from 'react';
import type { Language, PatchTermDto, Term } from '../../../types/dictionary';
import { ValueBar } from './ValueBar';
import './TermRow.css';

interface TermRowEditProps {
  term: Term;
  maxAbsValue: number;
  onSave: (id: number, data: PatchTermDto) => Promise<void>;
  onCancel: () => void;
}

export const TermRowEdit = ({
  term,
  maxAbsValue,
  onSave,
  onCancel,
}: TermRowEditProps) => {
  const [word, setWord] = useState<string>(term.word);
  const [lang, setLang] = useState<Language>(term.lang);
  const [valueStr, setValueStr] = useState<string>(String(term.value));
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const numericValue = parseFloat(valueStr) || 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!word.trim()) {
      setError('El término es obligatorio');
      return;
    }

    if (isNaN(numericValue)) {
      setError('El valor debe ser un número');
      return;
    }

    if (numericValue < -10 || numericValue > 10) {
      setError('El valor debe estar entre −10 y +10');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(term.id, {
        word: word.trim(),
        lang,
        value: numericValue,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar los cambios';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="dict-row-edit-tr">
      <td colSpan={4}>
        <form className="dict-row-edit-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="inp"
            style={{ flex: 2, minWidth: '160px' }}
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Término"
            autoFocus
            disabled={saving}
          />

          <select
            className="sel"
            style={{ width: '120px' }}
            value={lang}
            onChange={(e) => setLang(e.target.value as Language)}
            disabled={saving}
          >
            <option value="es">Español</option>
            <option value="en">Inglés</option>
          </select>

          <input
            type="number"
            step="any"
            min="-10"
            max="10"
            className="inp mono"
            style={{ width: '90px' }}
            value={valueStr}
            onChange={(e) => setValueStr(e.target.value)}
            placeholder="Valor"
            disabled={saving}
          />

          <ValueBar value={numericValue} maxAbsValue={maxAbsValue} size="mini" showNumber={false} />

          {error && <span className="errtxt" style={{ marginLeft: '6px' }}>{error}</span>}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              type="submit"
              className="btn pri sm"
              disabled={saving}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              className="btn ghost sm"
              onClick={onCancel}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
};
