import type { ToastMessage } from '../../hooks/useToast';
import './Toast.css';

interface ToastItemProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export const ToastItem = ({ toast, onClose }: ToastItemProps) => {
  const isSuccess = toast.type === 'success';
  const isLoading = toast.type === 'loading';

  return (
    <div
      className={`ts ${isSuccess ? 'ts--success' : isLoading ? 'ts--loading' : 'ts--error'}`}
      role={isSuccess || isLoading ? 'status' : 'alert'}
    >
      {isLoading ? <span className="ts-spinner" aria-hidden="true" /> : <code>{isSuccess ? '200' : 'ERR'}</code>}
      <span>{toast.message}</span>
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
