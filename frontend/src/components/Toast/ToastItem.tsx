import type { ToastMessage, ToastProgress } from '../../hooks/useToast';
import './Toast.css';

interface ToastItemProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const ToastProgressBar = ({
  message,
  progress,
}: {
  message: string;
  progress: ToastProgress;
}) => {
  const { current, total, detail } = progress;
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  // While running, show the source being processed (1-based), never past the total.
  const position = Math.min(current + 1, total);
  return (
    <div className="ts-progress">
      <span>{message}</span>
      <div
        className="ts-progress-track"
        role="progressbar"
        aria-label={message}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="ts-progress-bar" style={{ width: `${percent}%` }} />
      </div>
      <div className="ts-progress-meta">
        <span>{`Fuente ${position} de ${total}`}</span>
        <span>{`${percent}%`}</span>
      </div>
      {detail && <span className="ts-progress-detail">{detail}</span>}
    </div>
  );
};

export const ToastItem = ({ toast, onClose }: ToastItemProps) => {
  const isSuccess = toast.type === 'success';
  const isLoading = toast.type === 'loading';

  return (
    <div
      className={`ts ${isSuccess ? 'ts--success' : isLoading ? 'ts--loading' : 'ts--error'}`}
      role={isSuccess || isLoading ? 'status' : 'alert'}
    >
      {isLoading ? <span className="ts-spinner" aria-hidden="true" /> : <code>{isSuccess ? '200' : 'ERR'}</code>}
      {toast.progress ? (
        <ToastProgressBar message={toast.message} progress={toast.progress} />
      ) : (
        <span>{toast.message}</span>
      )}
      <button
        type="button"
        className="ts-close"
        onClick={() => onClose(toast.id)}
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  );
};
