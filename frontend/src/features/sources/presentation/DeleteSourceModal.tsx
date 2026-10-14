import { useEffect } from 'react';
import type { ChannelGroup, Source } from '../domain/source';

interface DeleteSourceModalProps {
  source: Source | null;
  channelGroup?: ChannelGroup | null;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const DeleteSourceModal = ({
  source,
  channelGroup,
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

  if (!source && !channelGroup) return null;

  const titleName = channelGroup ? channelGroup.name : source?.name;
  const description = channelGroup
    ? `Se eliminará la fuente junto con sus ${channelGroup.sources.length} canales RSS. Esta acción no se puede deshacer. Si solo quieres dejar de capturarla, desactívala.`
    : `Se eliminará permanentemente la fuente RSS con URL ${source?.feedUrl} del medio ${source?.channel.name}. Esta acción no se puede deshacer. Si solo quieres dejar de capturarla, desactívala.`;

  return (
    <div className="ov on" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="alertdialog" aria-modal="true">
        <h3>¿Eliminar «{titleName}»?</h3>
        <p>{description}</p>
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
