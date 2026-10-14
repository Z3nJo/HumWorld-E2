import { useEffect } from 'react';
import type { ChannelWithSources } from '../domain/source';

interface DeleteSourceModalProps {
  channel: ChannelWithSources | null;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const DeleteSourceModal = ({
  channel,
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

  if (!channel) return null;

  return (
    <div
      id="ov"
      className="on"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" role="alertdialog" aria-modal="true">
        <h3>¿Eliminar «{channel.name}»?</h3>
        <p>
          Se desactivará la fuente «{channel.name}». Se conservan sus canales RSS y
          sus noticias; podrás reactivarla con el interruptor.
        </p>
        <div className="row" style={{ justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="btn dan" onClick={onConfirm} disabled={loading}>
            {loading ? 'Desactivando...' : 'Desactivar fuente'}
          </button>
        </div>
      </div>
    </div>
  );
};
