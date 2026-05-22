import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Earn from './pages/Earn'
import Invite from './pages/Invite'
import Profile from './pages/Profile'
import Predict from './pages/Predict'
import Withdraw from './pages/Withdraw'
import ControlCenter from './pages/ControlCenter'
import AdminLayout from './components/layout/AdminLayout'
import UserDirectory from './components/admin/UserDirectory'
import TaskOrchestrator from './components/admin/TaskOrchestrator'
import CampaignManager from './components/admin/CampaignManager'
import EconomyConsole from './components/admin/EconomyConsole'
import ProtocolAuditLogs from './components/admin/ProtocolAuditLogs'
import SystemSettingsPanel from './components/admin/SystemSettingsPanel'
import AdminAIConsole from './components/admin/AdminAIConsole'
import { useAuth } from './contexts/AuthContext'
import { Toaster } from 'react-hot-toast'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) return null;

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If admin is trying to access restricted user-only routes
  const userOnlyRoutes = ['/dashboard', '/tasks', '/rewards', '/referrals', '/predict'];
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
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0D0D12',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600'
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
        <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />

        <Route path="/pulse-core" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<ControlCenter />} />
          <Route path="ai" element={<AdminAIConsole />} />
          <Route path="users" element={<UserDirectory />} />
          <Route path="tasks" element={<TaskOrchestrator />} />
          <Route path="campaigns" element={<CampaignManager />} />
          <Route path="economy" element={<EconomyConsole />} />
          <Route path="audit" element={<ProtocolAuditLogs />} />
          <Route path="settings" element={
            <div className="max-w-2xl mx-auto space-y-8 py-8">
              <h1 className="text-2xl font-bold mb-8 text-center">Global Protocol Configuration</h1>
              <SystemSettingsPanel />
            </div>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
