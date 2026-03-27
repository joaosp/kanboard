import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/auth';
import styles from './Navbar.module.css';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className={styles.navbar} data-testid="navbar">
      <span className={styles.brand}>Kanboard</span>
      <div className={styles.userSection}>
        <span className={styles.userName} data-testid="navbar-user">{user?.name}</span>
        <button className={styles.logoutButton} onClick={handleLogout} data-testid="logout-button">
          Logout
        </button>
      </div>
    </nav>
  );
}
