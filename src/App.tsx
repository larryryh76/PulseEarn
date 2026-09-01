import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Home from './pages/Home'
import Signup from './pages/Signup'
import Login from './pages/Login'
import VerifyEmail from './pages/VerifyEmail'
import AuthAction from './pages/AuthAction'
import Dashboard from './pages/Dashboard'
import Predictions from './pages/predictions/Predictions'
import Referrals from './pages/Referrals'
import Wallet from './pages/Wallet'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import SupportCenter from './pages/SupportCenter'
import Guide from './pages/Guide'
import Marketplace from './pages/Marketplace'
import PSEmineAdmin from './pages/admin/PSEmineAdmin'
import OpsLayout from './pages/admin/OpsLayout'
import {
  OpsOverview as AdminOverview,
  OpsValidation as AdminValidation,
  OpsLedger as AdminLedger,
  OpsUsers as AdminUsers,
  OpsEconomy as AdminEconomy,
  OpsBroadcasts as AdminBroadcasts,
  OpsAuditCenter as AdminAuditCenter,
  OpsTasks as AdminTasks,
  OpsPredictions as AdminPredictions,
  OpsWithdrawals as AdminWithdrawals,
  OpsXP as AdminXP,
  OpsSupport as AdminSupport,
  OpsHealth as AdminHealth,
  OpsModerators as AdminModerators,
  OpsOfferwalls as AdminOfferwalls,
  OpsMarketplace as AdminMarketplace
} from './pages/admin/modules'
import PrivacyPolicy from './pages/legal/PrivacyPolicy'
import TermsOfService from './pages/legal/TermsOfService'
import CookiePolicy from './pages/legal/CookiePolicy'
import RewardPolicy from './pages/legal/RewardPolicy'
import FraudPolicy from './pages/legal/FraudPolicy'
import VerificationPolicy from './pages/legal/VerificationPolicy'
import WithdrawalPolicy from './pages/legal/WithdrawalPolicy'
import ReferralPolicy from './pages/legal/ReferralPolicy'
import CommunityGuidelines from './pages/legal/CommunityGuidelines'
import SupportPolicy from './pages/legal/SupportPolicy'
import HelpCenter from './pages/legal/HelpCenter'
import { PSEMineLanding } from './pages/psemine/PSEMineLanding'
import PSEMineLogin from './pages/psemine/PSEMineLogin'
import PSEMineSignup from './pages/psemine/PSEMineSignup'
import PSEMineForgotPassword from './pages/psemine/PSEMineForgotPassword'
import PSEMineActivate from './pages/psemine/PSEMineActivate'
import PSEMineDashboard from './pages/psemine/PSEMineDashboard'
import PSEMineTools from './pages/psemine/PSEMineTools'
import PSEMineWallet from './pages/psemine/PSEMineWallet'
import PSEMineActivity from './pages/psemine/PSEMineActivity'
import PSEMineReferrals from './pages/psemine/PSEMineReferrals'
import PSEMineProfile from './pages/psemine/PSEMineProfile'
import { useAuth } from './contexts/AuthContext'
import { Toaster } from 'react-hot-toast'
import { CheckCircle2, AlertCircle, Zap } from 'lucide-react'
import MainLayout from './components/layout/MainLayout'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-primary/10 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!currentUser) return <Navigate to="/login" replace />;

  const isOpsUser = userData?.role === 'admin' || userData?.role === 'moderator' || userData?.isRoot === true;

  // Enforce Product Access for PulseEarn
  const productAccess = userData?.productAccess || { pulseearn: true, psemine: false };
  if (!productAccess.pulseearn && !isOpsUser) {
    return <Navigate to="/mine/dashboard" replace />;
  }

  const isTestBypass = localStorage.getItem('pulseearn-test-bypass') === 'true';
  // Fix #18: Google OAuth users (and others with verified emails) skip the /verify-email redirect
  if (!currentUser.emailVerified && !isOpsUser && !isTestBypass && window.location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

const PSEMineProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-primary/10 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!currentUser) return <Navigate to="/mine/login" replace />;

  const isOpsUser = userData?.role === 'admin' || userData?.role === 'moderator' || userData?.isRoot === true;

  // Enforce Product Access for PSEmine
  const productAccess = userData?.productAccess || { pulseearn: true, psemine: false };
  if (!productAccess.psemine && !isOpsUser) {
    return <Navigate to="/mine/activate" replace />;
  }

  return <>{children}</>;
};

const OpsRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-primary/10 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!currentUser) return <Navigate to="/login" replace />;

  const role = userData?.role;
  const isOps = role === 'admin' || role === 'moderator' || userData?.isRoot === true;

  if (!isOps) {
    const productAccess = userData?.productAccess || { pulseearn: true, psemine: false };
    if (!productAccess.pulseearn) {
      return <Navigate to="/mine/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();
  if (loading) return null;
  if (currentUser) {
    if (userData?.role === 'admin' || userData?.role === 'moderator') return <Navigate to="/admin" replace />;
    const productAccess = userData?.productAccess || { pulseearn: true, psemine: false };
    if (!productAccess.pulseearn) {
      return <Navigate to="/mine/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const PSEMinePublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();
  if (loading) return null;
  if (currentUser) {
    const productAccess = userData?.productAccess || { pulseearn: true, psemine: false };
    if (productAccess.psemine || userData?.role === 'admin' || userData?.role === 'moderator' || userData?.isRoot === true) {
      return <Navigate to="/mine/dashboard" replace />;
    }
    return <Navigate to="/mine/activate" replace />;
  }
  return <>{children}</>;
};

const AppLayout: React.FC = () => {
  return (
    <MainLayout>
       <Outlet />
    </MainLayout>
  );
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
        <Route path="/auth/action" element={<AuthAction />} />

        {/* PERSISTENT APP ARCHITECTURE */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
           <Route path="/dashboard" element={<Dashboard />} />
           <Route path="/marketplace" element={<Marketplace />} />
           <Route path="/tasks" element={<Marketplace />} />
           <Route path="/predictions" element={<Predictions />} />
           <Route path="/referrals" element={<Referrals />} />
           <Route path="/wallet" element={<Wallet />} />
           <Route path="/me" element={<Profile />} />
           <Route path="/notifications" element={<Notifications />} />
           <Route path="/support" element={<SupportCenter />} />
           <Route path="/guide" element={<Guide />} />
           <Route path="/offerwalls" element={<Marketplace />} />
        </Route>

        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        <Route path="/reward-policy" element={<RewardPolicy />} />
        <Route path="/fraud-policy" element={<FraudPolicy />} />
        <Route path="/verification-policy" element={<VerificationPolicy />} />
        <Route path="/withdrawal-policy" element={<WithdrawalPolicy />} />
        <Route path="/referral-policy" element={<ReferralPolicy />} />
        <Route path="/community-guidelines" element={<CommunityGuidelines />} />
        <Route path="/support-policy" element={<SupportPolicy />} />
        <Route path="/help" element={<HelpCenter />} />

        <Route path="/mine" element={<PSEMineLanding />} />
        <Route path="/mine/login" element={<PSEMinePublicRoute><PSEMineLogin /></PSEMinePublicRoute>} />
        <Route path="/mine/signup" element={<PSEMinePublicRoute><PSEMineSignup /></PSEMinePublicRoute>} />
        <Route path="/mine/forgot-password" element={<PSEMineForgotPassword />} />
        <Route path="/mine/activate" element={<ProtectedRoute><PSEMineActivate /></ProtectedRoute>} />
        <Route path="/mine/app" element={<Navigate to="/mine/dashboard" replace />} />
        <Route path="/mine/dashboard" element={<PSEMineProtectedRoute><PSEMineDashboard /></PSEMineProtectedRoute>} />
        <Route path="/mine/tools" element={<PSEMineProtectedRoute><PSEMineTools /></PSEMineProtectedRoute>} />
        <Route path="/mine/wallet" element={<PSEMineProtectedRoute><PSEMineWallet /></PSEMineProtectedRoute>} />
        <Route path="/mine/activity" element={<PSEMineProtectedRoute><PSEMineActivity /></PSEMineProtectedRoute>} />
        <Route path="/mine/referrals" element={<PSEMineProtectedRoute><PSEMineReferrals /></PSEMineProtectedRoute>} />
        <Route path="/mine/me" element={<PSEMineProtectedRoute><PSEMineProfile /></PSEMineProtectedRoute>} />

        <Route path="/admin" element={<OpsRoute><Navigate to="/admin/overview" replace /></OpsRoute>} />
  <Route path="/admin/psemine" element={<OpsRoute><PSEmineAdmin /></OpsRoute>} />
        <Route path="/admin/overview" element={<OpsRoute><OpsLayout><AdminOverview /></OpsLayout></OpsRoute>} />
	        <Route path="/admin/marketplace" element={<OpsRoute><OpsLayout><AdminMarketplace /></OpsLayout></OpsRoute>} />
        <Route path="/admin/validation" element={<OpsRoute><OpsLayout><AdminValidation /></OpsLayout></OpsRoute>} />
        <Route path="/admin/ledger" element={<OpsRoute><OpsLayout><AdminLedger /></OpsLayout></OpsRoute>} />
        <Route path="/admin/users" element={<OpsRoute><OpsLayout><AdminUsers /></OpsLayout></OpsRoute>} />
        <Route path="/admin/security" element={<OpsRoute><OpsLayout><AdminAuditCenter /></OpsLayout></OpsRoute>} />
        <Route path="/admin/economy" element={<OpsRoute><OpsLayout><AdminEconomy /></OpsLayout></OpsRoute>} />
        <Route path="/admin/broadcasts" element={<OpsRoute><OpsLayout><AdminBroadcasts /></OpsLayout></OpsRoute>} />
        <Route path="/admin/audit" element={<OpsRoute><OpsLayout><AdminAuditCenter /></OpsLayout></OpsRoute>} />
        <Route path="/admin/tasks" element={<OpsRoute><OpsLayout><AdminTasks /></OpsLayout></OpsRoute>} />
        <Route path="/admin/predictions" element={<OpsRoute><OpsLayout><AdminPredictions /></OpsLayout></OpsRoute>} />
        <Route path="/admin/withdrawals" element={<OpsRoute><OpsLayout><AdminWithdrawals /></OpsLayout></OpsRoute>} />
        <Route path="/admin/support" element={<OpsRoute><OpsLayout><AdminSupport /></OpsLayout></OpsRoute>} />
        <Route path="/admin/xp" element={<OpsRoute><OpsLayout><AdminXP /></OpsLayout></OpsRoute>} />
        <Route path="/admin/health" element={<OpsRoute><OpsLayout><AdminHealth /></OpsLayout></OpsRoute>} />
        <Route path="/admin/moderators" element={<OpsRoute><OpsLayout><AdminModerators /></OpsLayout></OpsRoute>} />
        <Route path="/admin/offerwalls" element={<OpsRoute><OpsLayout><AdminOfferwalls /></OpsLayout></OpsRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
