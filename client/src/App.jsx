import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { WalletProvider } from './contexts/WalletContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SignalsPage from './pages/SignalsPage';
import RobotsPage from './pages/RobotsPage';
import StakingPage from './pages/StakingPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WalletProvider>
          <SocketProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="signals" element={<SignalsPage />} />
                <Route path="robots" element={<ProtectedRoute roles={['admin', 'trader']}><RobotsPage /></ProtectedRoute>} />
                <Route path="staking" element={<ProtectedRoute roles={['admin', 'trader']}><StakingPage /></ProtectedRoute>} />
                <Route path="admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </SocketProvider>
        </WalletProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
