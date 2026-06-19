import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
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
import Guide from './pages/Guide'
import OpsLayout from './pages/admin/OpsLayout'
import {
  OpsOverview as AdminOverview,
  OpsCampaigns as AdminCampaigns,
  OpsCampaignDetail as AdminCampaignDetail,
  OpsSponsoredCampaigns as AdminSponsored,
  OpsSponsoredCampaignDetail as AdminSponsoredDetail,
  OpsValidation as AdminValidation,
  OpsLedger as AdminLedger,
  OpsUsers as AdminUsers,
  OpsEconomy as AdminEconomy,
  OpsBroadcasts as AdminBroadcasts,
  OpsAuditCenter as AdminAuditCenter,
  OpsTasks as AdminTasks,
  OpsPredictions as AdminPredictions,
  OpsWithdrawals as AdminWithdrawals,
  OpsMissions as AdminMissions,
  OpsXP as AdminXP,
  OpsSupport as AdminSupport
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

  const isAdminEmail = currentUser.email?.toLowerCase() === import.meta.env.VITE_ADMIN_EMAIL;
  const isAdminRole = userData?.role === 'admin';
  const isAdmin = isAdminEmail || isAdminRole;

  if (!currentUser.emailVerified && !isAdmin && window.location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-primary/10 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!currentUser) return <Navigate to="/login" replace />;

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
    const isAdminEmail = currentUser.email?.toLowerCase() === import.meta.env.VITE_ADMIN_EMAIL;
    if (userData?.role === 'admin' || isAdminEmail) return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
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

        {/* PERSISTENT APP ARCHITECTURE */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
           <Route path="/dashboard" element={<Dashboard />} />
           <Route path="/tasks" element={<Tasks />} />
           <Route path="/predictions" element={<Predictions />} />
           <Route path="/referrals" element={<Referrals />} />
           <Route path="/campaigns/:id" element={<CampaignDetails />} />
           <Route path="/wallet" element={<Wallet />} />
           <Route path="/me" element={<Profile />} />
           <Route path="/notifications" element={<Notifications />} />
           <Route path="/support" element={<SupportCenter />} />
           <Route path="/guide" element={<Guide />} />
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

        <Route path="/admin" element={<AdminRoute><Navigate to="/admin/overview" replace /></AdminRoute>} />
        <Route path="/admin/overview" element={<AdminRoute><OpsLayout><AdminOverview /></OpsLayout></AdminRoute>} />
        <Route path="/admin/campaigns" element={<AdminRoute><OpsLayout><AdminCampaigns /></OpsLayout></AdminRoute>} />
        <Route path="/admin/campaigns/:id" element={<AdminRoute><OpsLayout><AdminCampaignDetail /></OpsLayout></AdminRoute>} />
        <Route path="/admin/sponsored" element={<AdminRoute><OpsLayout><AdminSponsored /></OpsLayout></AdminRoute>} />
        <Route path="/admin/sponsored/:id" element={<AdminRoute><OpsLayout><AdminSponsoredDetail /></OpsLayout></AdminRoute>} />
        <Route path="/admin/validation" element={<AdminRoute><OpsLayout><AdminValidation /></OpsLayout></AdminRoute>} />
        <Route path="/admin/ledger" element={<AdminRoute><OpsLayout><AdminLedger /></OpsLayout></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><OpsLayout><AdminUsers /></OpsLayout></AdminRoute>} />
        <Route path="/admin/security" element={<AdminRoute><OpsLayout><AdminAuditCenter /></OpsLayout></AdminRoute>} />
        <Route path="/admin/economy" element={<AdminRoute><OpsLayout><AdminEconomy /></OpsLayout></AdminRoute>} />
        <Route path="/admin/broadcasts" element={<AdminRoute><OpsLayout><AdminBroadcasts /></OpsLayout></AdminRoute>} />
        <Route path="/admin/audit" element={<AdminRoute><OpsLayout><AdminAuditCenter /></OpsLayout></AdminRoute>} />
        <Route path="/admin/tasks" element={<AdminRoute><OpsLayout><AdminTasks /></OpsLayout></AdminRoute>} />
        <Route path="/admin/predictions" element={<AdminRoute><OpsLayout><AdminPredictions /></OpsLayout></AdminRoute>} />
        <Route path="/admin/withdrawals" element={<AdminRoute><OpsLayout><AdminWithdrawals /></OpsLayout></AdminRoute>} />
        <Route path="/admin/missions" element={<AdminRoute><OpsLayout><AdminMissions /></OpsLayout></AdminRoute>} />
        <Route path="/admin/support" element={<AdminRoute><OpsLayout><AdminSupport /></OpsLayout></AdminRoute>} />
        <Route path="/admin/xp" element={<AdminRoute><OpsLayout><AdminXP /></OpsLayout></AdminRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
