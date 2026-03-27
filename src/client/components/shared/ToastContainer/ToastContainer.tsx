import { useUiStore } from '../../../stores/ui';
import { Toast } from '../Toast/Toast';
import styles from './ToastContainer.module.css';

export function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container} data-testid="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
