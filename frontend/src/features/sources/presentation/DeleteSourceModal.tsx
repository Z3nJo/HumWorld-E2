import { useEffect } from 'react';
import type { Source } from '../domain/source';

interface DeleteSourceModalProps {
  source: Source | null;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const DeleteSourceModal = ({
  source,
  onClose,
  onConfirm,
  loading = false,
}: DeleteSourceModalProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!source) return null;

  return (
    <div className="ov on" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="alertdialog" aria-modal="true">
        <h3>¿Eliminar «{source.name}»?</h3>
        <p>
          Se eliminará permanentemente la fuente RSS con URL{' '}
          <code className="mono">{source.feedUrl}</code> del medio{' '}
          <strong>{source.channel.name}</strong>. Esta acción no se puede deshacer. Si solo
          quieres dejar de capturarla, desactívala.
        </p>
        <div className="row" style={{ justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="btn dan" onClick={onConfirm} disabled={loading}>
            {loading ? 'Eliminando...' : 'Eliminar fuente'}
          </button>
        </div>
      </div>
    </div>
  );
};
