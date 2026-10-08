import { useState, type FormEvent } from 'react';
import type { CreateTermInput, Language } from '../../../features/dictionary/domain/dictionary';
import { ValueBar } from './ValueBar';
import './AddTermForm.css';

interface AddTermFormProps {
  maxAbsValue?: number;
  onSubmit: (dto: CreateTermInput) => Promise<void>;
  onLanguageChange?: (language: Language) => void;
}

export const AddTermForm = ({ maxAbsValue = 10, onSubmit, onLanguageChange }: AddTermFormProps) => {
  const [word, setWord] = useState('');
  const [lang, setLang] = useState<Language>('es');
  const [valueStr, setValueStr] = useState('');
  const [errors, setErrors] = useState<{ word?: string; value?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const numericValue = valueStr.trim() !== '' ? parseFloat(valueStr) : 0;

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 380);
  };

  const validate = () => {
    const newErrors: { word?: string; value?: string } = {};
    if (!word.trim()) newErrors.word = 'El término es obligatorio';
    if (valueStr.trim() === '') newErrors.value = 'Indica un valor numérico';
    else if (Number.isNaN(Number(valueStr))) newErrors.value = 'El valor debe ser un número decimal';
    else if (Number(valueStr) < -10 || Number(valueStr) > 10) newErrors.value = 'El valor debe estar entre −10 y +10';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) { triggerShake(); return; }
    setSubmitting(true);
    try {
      await onSubmit({ word: word.trim(), lang, value: Number(valueStr) });
      setWord('');
      setValueStr('');
      setLang('es');
      setErrors({});
    } catch {
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`card ${isShaking ? 'dict-add-card--shake' : ''}`}>
      <div className="cb" style={{ paddingTop: '16px' }}>
        <form className="dict-add-form-grid" onSubmit={handleSubmit} noValidate>
          <label className="f">
            Nuevo término
            <input type="text" className={`inp ${errors.word ? 'err' : ''}`} placeholder="p. ej. esperanza" value={word} onChange={(e) => { setWord(e.target.value); if (errors.word) setErrors((prev) => ({ ...prev, word: undefined })); }} disabled={submitting} />
            {errors.word && <span className="errtxt">{errors.word}</span>}
          </label>
          <label className="f">
            Idioma
            <select
              className="sel"
              value={lang}
              onChange={(e) => {
                const nextLanguage = e.target.value as Language;
                setLang(nextLanguage);
                onLanguageChange?.(nextLanguage);
              }}
              disabled={submitting}
            >
              <option value="es">Español</option>
              <option value="en">Inglés</option>
            </select>
          </label>
          <label className="f">
            Valor (−10 a 10)
            <div className="dict-val-input-wrap">
              <input type="number" step="any" min="-10" max="10" className={`inp mono ${errors.value ? 'err' : ''}`} placeholder="0" value={valueStr} onChange={(e) => { setValueStr(e.target.value); if (errors.value) setErrors((prev) => ({ ...prev, value: undefined })); }} disabled={submitting} />
              {valueStr.trim() !== '' && !Number.isNaN(numericValue) && <ValueBar value={numericValue} maxAbsValue={maxAbsValue} size="mini" showNumber={false} />}
            </div>
            {errors.value && <span className="errtxt">{errors.value}</span>}
          </label>
          <div><button type="submit" className="btn pri" style={{ marginTop: '22px' }} disabled={submitting}>{submitting ? 'Añadiendo...' : 'Añadir'}</button></div>
        </form>
      </div>
    </div>
  );
};
