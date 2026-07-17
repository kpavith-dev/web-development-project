import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ReservationsPage from './pages/ReservationsPage';
import AreasPage from './pages/AreasPage';
import SlotsPage from './pages/SlotsPage';
import SecurityPage from './pages/SecurityPage';
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';
import { useAuth } from './context/AuthContext';

const App = () => {
  const { user } = useAuth();
  const protectedPage = (page) => (user ? <MainLayout>{page}</MainLayout> : <Navigate to="/login" replace />);

  return (
    <>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={protectedPage(<DashboardPage />)} />
        <Route path="/reservations" element={protectedPage(<ReservationsPage />)} />
        <Route path="/areas" element={protectedPage(<AreasPage />)} />
        <Route path="/slots" element={protectedPage(<SlotsPage />)} />
        <Route path="/security" element={protectedPage(<SecurityPage />)} />
        <Route path="/reports" element={protectedPage(<ReportsPage />)} />
        <Route path="/profile" element={protectedPage(<ProfilePage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer position="top-right" theme="dark" />
    </>
  );
};

export default App;
