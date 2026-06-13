import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Signup from './pages/Signup'
import Login from './pages/Login'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Predictions from './pages/predictions/Predictions'
import Referrals from './pages/Referrals'
import Wallet from './pages/Wallet'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import CampaignDetails from './pages/CampaignDetails'
import SupportCenter from './pages/SupportCenter'
import AdminOpsLayout from './components/layout/admin/AdminOpsLayout'
import {
  AdminOverview,
  AdminCampaigns,
  AdminValidation,
  AdminLedger,
  AdminUsers,
  AdminSecurity,
  AdminEconomy,
  AdminBroadcasts,
  AdminAudit,
  AdminTasks,
  AdminPredictions,
  AdminWithdrawals,
  AdminMissions,
  AdminSupport
} from './pages/admin/modules'
import PrivacyPolicy from './pages/legal/PrivacyPolicy'
import TermsOfService from './pages/legal/TermsOfService'
import CookiePolicy from './pages/legal/CookiePolicy'
import RewardPolicy from './pages/legal/RewardPolicy'
import FraudPolicy from './pages/legal/FraudPolicy'
import VerificationPolicy from './pages/legal/VerificationPolicy'
import { useAuth } from './contexts/AuthContext'
import { Toaster } from 'react-hot-toast'
import { CheckCircle2, AlertCircle, Zap } from 'lucide-react'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!currentUser) return <Navigate to="/login" replace />;

  const isAdmin = currentUser.email?.toLowerCase() === import.meta.env.VITE_ADMIN_EMAIL;
  if (!currentUser.emailVerified && !isAdmin && window.location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();

  // If still loading, wait for auth state
  if (loading) return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  // No user, go to login
  if (!currentUser) return <Navigate to="/login" replace />;

  // Special check for hardcoded admin email during transition
  const isAdminEmail = currentUser.email?.toLowerCase() === import.meta.env.VITE_ADMIN_EMAIL;
  const isAdminRole = userData?.role === 'admin';

  if (!isAdminEmail && !isAdminRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();
  if (loading) return null;
  if (currentUser) {
    if (userData?.role === 'admin') return <Navigate to="/admin" replace />;
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
            background: '#12121A',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '1.25rem',
            fontSize: '11px',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            padding: '12px 20px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          },
          success: {
            icon: <CheckCircle2 size={16} className="text-success" />,
            style: {
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }
          },
          error: {
            icon: <AlertCircle size={16} className="text-danger" />,
            style: {
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }
          },
          loading: {
            icon: <Zap size={16} className="text-primary animate-pulse" />,
          }
        }}
      />
      <Routes>
        <Route path="/" element={<PublicRoute><Home /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/verify-email" element={<ProtectedRoute><VerifyEmail /></ProtectedRoute>} />

        {/* Core Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="/predictions" element={<ProtectedRoute><Predictions /></ProtectedRoute>} />
        <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
        <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetails /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
        <Route path="/me" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><SupportCenter /></ProtectedRoute>} />

        {/* Legal Routes */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        <Route path="/reward-policy" element={<RewardPolicy />} />
        <Route path="/fraud-policy" element={<FraudPolicy />} />
        <Route path="/verification-policy" element={<VerificationPolicy />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute><Navigate to="/admin/overview" replace /></AdminRoute>} />
        <Route path="/admin/overview" element={<AdminRoute><AdminOpsLayout><AdminOverview /></AdminOpsLayout></AdminRoute>} />
        <Route path="/admin/campaigns" element={<AdminRoute><AdminOpsLayout><AdminCampaigns /></AdminOpsLayout></AdminRoute>} />
        <Route path="/admin/validation" element={<AdminRoute><AdminOpsLayout><AdminValidation /></AdminOpsLayout></AdminRoute>} />
        <Route path="/admin/ledger" element={<AdminRoute><AdminOpsLayout><AdminLedger /></AdminOpsLayout></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminOpsLayout><AdminUsers /></AdminOpsLayout></AdminRoute>} />
        <Route path="/admin/security" element={<AdminRoute><AdminOpsLayout><AdminSecurity /></AdminOpsLayout></AdminRoute>} />
        <Route path="/admin/economy" element={<AdminRoute><AdminOpsLayout><AdminEconomy /></AdminOpsLayout></AdminRoute>} />
        <Route path="/admin/broadcasts" element={<AdminRoute><AdminOpsLayout><AdminBroadcasts /></AdminOpsLayout></AdminRoute>} />
        <Route path="/admin/audit" element={<AdminRoute><AdminOpsLayout><AdminAudit /></AdminOpsLayout></AdminRoute>} />
        <Route path="/admin/tasks" element={<AdminRoute><AdminOpsLayout><AdminTasks /></AdminOpsLayout></AdminRoute>} />
        <Route path="/admin/predictions" element={<AdminRoute><AdminOpsLayout><AdminPredictions /></AdminOpsLayout></AdminRoute>} />
        <Route path="/admin/withdrawals" element={<AdminRoute><AdminOpsLayout><AdminWithdrawals /></AdminOpsLayout></AdminRoute>} />
        <Route path="/admin/missions" element={<AdminRoute><AdminOpsLayout><AdminMissions /></AdminOpsLayout></AdminRoute>} />
        <Route path="/admin/support" element={<AdminRoute><AdminOpsLayout><AdminSupport /></AdminOpsLayout></AdminRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
