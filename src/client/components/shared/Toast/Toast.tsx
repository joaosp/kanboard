import { useEffect } from 'react';
import { useUiStore, Toast as ToastType } from '../../../stores/ui';
import styles from './Toast.module.css';

interface ToastProps {
  toast: ToastType;
}

export function Toast({ toast }: ToastProps) {
  const removeToast = useUiStore((s) => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`} data-testid="toast">
      <span>{toast.message}</span>
      <button
        className={styles.closeButton}
        onClick={() => removeToast(toast.id)}
        data-testid="toast-close"
      >
        &times;
      </button>
    </div>
  );
}
