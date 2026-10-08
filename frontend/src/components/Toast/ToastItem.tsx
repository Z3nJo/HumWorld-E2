import type { ToastMessage } from '../../hooks/useToast';
import './Toast.css';

interface ToastItemProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export const ToastItem = ({ toast, onClose }: ToastItemProps) => {
  const isSuccess = toast.type === 'success';

  return (
    <div
      className={`ts ${isSuccess ? 'ts--success' : 'ts--error'}`}
      role={isSuccess ? 'status' : 'alert'}
    >
      <code>{isSuccess ? '200' : 'ERR'}</code>
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
