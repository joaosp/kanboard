import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginForm } from './components/Auth/LoginForm/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm/RegisterForm';
import { AuthGuard } from './components/Auth/AuthGuard';
import { AppLayout } from './components/Layout/AppLayout/AppLayout';
import { BoardList } from './components/Board/BoardList/BoardList';
import { BoardView } from './components/Board/BoardView/BoardView';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route path="/boards" element={<BoardList />} />
          <Route path="/boards/:boardId" element={<BoardView />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/boards" replace />} />
    </Routes>
  );
}
