import { useEffect } from 'react';

interface PurgeNewsModalProps {
  open: boolean;
  expirationDays: number;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const PurgeNewsModal = ({
  open,
  expirationDays,
  onClose,
  onConfirm,
  loading = false,
}: PurgeNewsModalProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      id="ov"
      className="on"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" role="alertdialog" aria-modal="true">
        <h3>¿Purgar noticias caducadas?</h3>
        <p>
          Se eliminarán de forma permanente las noticias con más de {expirationDays} días
          de antigüedad. Esta acción no se puede deshacer.
        </p>
        <div className="row" style={{ justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="btn dan" onClick={onConfirm} disabled={loading}>
            {loading ? 'Purgando...' : 'Purgar noticias'}
          </button>
        </div>
      </div>
    </div>
  );
};
