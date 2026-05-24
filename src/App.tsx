import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Signup from './pages/Signup'
import Login from './pages/Login'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Earn from './pages/Earn'
import Invite from './pages/Invite'
import Profile from './pages/Profile'
import Predict from './pages/Predict'
import Wallet from './pages/Wallet'
import AdminLayout from './components/layout/AdminLayout'
import PointAIConsole from './components/admin/PointAIConsole'
import SystemEngineerConsole from './components/admin/SystemEngineerConsole'
import TaskOrchestrator from './components/admin/TaskOrchestrator'
import UserModeration from './components/admin/UserModeration'
import SystemSettings from './components/admin/SystemSettings'
import EcosystemIntelligence from './components/admin/EcosystemIntelligence'
import { useAuth } from './contexts/AuthContext'
import { Toaster } from 'react-hot-toast'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) return null;

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // EMAIL VERIFICATION CHECK
  // TEMPORARY: admin bypasses email verification on the frontend
  const isAdmin = currentUser.email?.toLowerCase() === import.meta.env.VITE_ADMIN_EMAIL;

  if (!currentUser.emailVerified && !isAdmin && window.location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace />;
  }

  // If admin is trying to access restricted user-only routes
  const userOnlyRoutes = ['/dashboard', '/tasks', '/rewards', '/referrals', '/predict', '/wallet'];
  const isUserOnlyRoute = userOnlyRoutes.some(route => window.location.pathname.startsWith(route));

  if (userData?.role === 'admin' && (isUserOnlyRoute || window.location.pathname === '/')) {
    return <Navigate to="/pulse-core" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) return null;

  const hasAccess = currentUser && userData?.role === 'admin';

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) return null;

  if (currentUser) {
    if (userData?.role === 'admin') {
      return <Navigate to="/pulse-core" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(13, 13, 18, 0.95)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: '500',
            backdropFilter: 'blur(10px)',
            padding: '12px 20px',
            maxWidth: '90vw',
          },
        }}
      />
      <Routes>
        <Route path="/" element={
          <PublicRoute>
            <Home />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        } />
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/verify-email" element={
          <ProtectedRoute>
            <VerifyEmail />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="/rewards" element={<ProtectedRoute><Earn /></ProtectedRoute>} />
        <Route path="/referrals" element={<ProtectedRoute><Invite /></ProtectedRoute>} />
        <Route path="/me" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/predict" element={<ProtectedRoute><Predict /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
        <Route path="/withdraw" element={<Navigate to="/wallet" replace />} />

        <Route path="/pulse-core" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<EcosystemIntelligence />} />
          <Route path="points" element={<PointAIConsole />} />
          <Route path="engineer" element={<SystemEngineerConsole />} />
          <Route path="users" element={<UserModeration />} />
          <Route path="tasks" element={<TaskOrchestrator />} />
          <Route path="settings" element={<SystemSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
