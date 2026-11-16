import { useCallback, useState } from 'react';

export interface ToastProgress {
  current: number;
  total: number;
  detail?: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'loading';
  progress?: ToastProgress;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastMessage = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after 3s only for success toasts
    if (type === 'success') {
      setTimeout(() => {
        removeToast(id);
      }, 3000);
    }

    return id;
  }, [removeToast]);

  const updateToast = useCallback((id: string, patch: Partial<Omit<ToastMessage, 'id'>>) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    updateToast,
    clearToasts,
  };
}
