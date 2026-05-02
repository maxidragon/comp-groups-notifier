import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import DashboardPage from './pages/DashboardPage';
import CompetitionsPage from './pages/CompetitionsPage';
import CompetitionDetailPage from './pages/CompetitionDetailPage';
import PublicPage from './pages/PublicPage';
import CompetitionLivePage from './pages/CompetitionLivePage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ─── Public live routes (no auth) ─────────────────── */}
          <Route path="/live" element={<PublicPage />} />
          <Route path="/live/:id" element={<CompetitionLivePage />} />

          {/* ─── Auth routes ───────────────────────────────────── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* ─── Protected admin routes ────────────────────────── */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="competitions" element={<CompetitionsPage />} />
            <Route path="competitions/:id" element={<CompetitionDetailPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
