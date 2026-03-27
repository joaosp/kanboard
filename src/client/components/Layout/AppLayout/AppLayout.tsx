import { Outlet } from 'react-router-dom';
import { Navbar } from '../Navbar/Navbar';
import { ToastContainer } from '../../shared/ToastContainer/ToastContainer';
import styles from './AppLayout.module.css';

export function AppLayout() {
  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.content}>
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}
