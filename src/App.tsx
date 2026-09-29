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
import { PSEMineShell } from './components/psemine/PSEMineShell'
import { PseStateProvider } from './components/psemine/PseStateProvider'
import { PSEMineEntry } from './pages/psemine/PSEMineEntry'
import { PSEMineDashboard } from './pages/psemine/PSEMineDashboard'
import { PSEMineTools } from './pages/psemine/PSEMineTools'
import { PSEMineWallet } from './pages/psemine/PSEMineWallet'
import { PSEMineReferrals } from './pages/psemine/PSEMineReferrals'
import { PSEMineActivity } from './pages/psemine/PSEMineActivity'
import { PSEMineMe } from './pages/psemine/PSEMineMe'
import { PSEmineAuth, PSEmineForgotPassword, PSEmineVerifyEmail, PSEmineProtectedRoute } from './pages/psemine/PSEmineAuth'
import { PSEminePolicy } from './pages/psemine/PSEminePolicy'
import { PSEMineAuthProvider } from './contexts/PSEMineAuthContext'
import { PSEMineProvider } from './contexts/PSEMineContext'
import { AdminPSEMine } from './pages/admin/AdminPSEMine'
import { useAuth } from './contexts/AuthContext'
import {
  hasPulseEarnAccess,
  isOpsAccount,
  resolveHomeRoute,
  resolveNonPulseEarnRoute,
} from './engines/product/productRouting'
import { Toaster } from 'react-hot-toast'
import { CheckCircle2, AlertCircle, Zap } from 'lucide-react'
import MainLayout from './components/layout/MainLayout'
import { PulseEarnProductProvider } from './contexts/PulseEarnProductContext'
import { TaskProvider } from './contexts/TaskContext'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-primary/10 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!currentUser) return <Navigate to="/login" replace />;

  const isOpsUser = isOpsAccount(userData);

  // PRODUCT ISOLATION. Being signed in is not a PulseEarn entitlement. An account
  // whose productAccess explicitly excludes PulseEarn (which is exactly what a
  // PSEmine signup writes) is handed to its own product BEFORE any PulseEarn
  // surface renders - including the daily-reward claim inside
  // PulseEarnProductProvider. This runs ahead of the verification redirect so an
  // unverified PSEmine account verifies inside PSEmine, not on /verify-email.
  if (userData && !isOpsUser && !hasPulseEarnAccess(userData)) {
    return <Navigate to={resolveNonPulseEarnRoute(userData)} replace />;
  }

  const isTestBypass = localStorage.getItem('pulseearn-test-bypass') === 'true';
  // Fix #18: Google OAuth users (and others with verified emails) skip the /verify-email redirect
  if (!currentUser.emailVerified && !isOpsUser && !isTestBypass && window.location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace />;
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

  const isOps = isOpsAccount(userData);

  if (!isOps) {
    // Whoever this is, send them to the product that actually owns them rather
    // than assuming PulseEarn.
    return <Navigate to={resolveHomeRoute(userData) ?? '/'} replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();
  if (loading) return null;
  if (currentUser) {
    // ONE decision, from one place. An account with no product yet is left on the
    // public page instead of being pushed into a product it does not belong to.
    const home = resolveHomeRoute(userData);
    if (home) return <Navigate to={home} replace />;
  }
  return <>{children}</>;
};

/**
 * PulseEarn product scope.
 *
 * Every PulseEarn route renders inside these providers, and no other route
 * does. They own PulseEarn-only behaviour (daily reward claim + reward toasts +
 * fingerprinting, and the tasks/activities/predictions listeners). PSEmine
 * routes mount their own providers and never inherit these.
 */
const PulseEarnRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PulseEarnProductProvider>
    <TaskProvider>
      {children}
    </TaskProvider>
  </PulseEarnProductProvider>
);

const AppLayout: React.FC = () => {
  return (
    <PulseEarnRoute>
      <MainLayout>
         <Outlet />
      </MainLayout>
    </PulseEarnRoute>
  );
};

/** Mounts application routes, shared services, and the providers for each product. */
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
        <Route path="/" element={<PulseEarnRoute><PublicRoute><Home /></PublicRoute></PulseEarnRoute>} />
        <Route path="/signup" element={<PulseEarnRoute><PublicRoute><Signup /></PublicRoute></PulseEarnRoute>} />
        <Route path="/login" element={<PulseEarnRoute><PublicRoute><Login /></PublicRoute></PulseEarnRoute>} />
        <Route path="/verify-email" element={<PulseEarnRoute><ProtectedRoute><VerifyEmail /></ProtectedRoute></PulseEarnRoute>} />
        <Route path="/auth/action" element={<PulseEarnRoute><AuthAction /></PulseEarnRoute>} />

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

        {/* PSEMINE 90-DAY CAMPAIGN ECOSYSTEM */}
        <Route path="/mine/login" element={<PSEMineAuthProvider><PSEmineAuth /></PSEMineAuthProvider>} />
        <Route path="/mine/signup" element={<PSEMineAuthProvider><PSEmineAuth mode="signup" /></PSEMineAuthProvider>} />
        <Route path="/mine/forgot-password" element={<PSEMineAuthProvider><PSEmineForgotPassword /></PSEMineAuthProvider>} />
        <Route path="/mine/verify-email" element={<PSEMineAuthProvider><PSEmineVerifyEmail /></PSEMineAuthProvider>} />
        {/* /mine resolves the destination before rendering either public or console UI. */}
        <Route path="/mine" element={
          <PSEMineAuthProvider>
            <PSEMineProvider>
              <PseStateProvider>
                <PSEMineEntry />
              </PseStateProvider>
            </PSEMineProvider>
          </PSEMineAuthProvider>
        } />
        {/* PSEmine console: the authenticated product shell. */}
        <Route element={
          <PSEMineAuthProvider>
            <PSEMineProvider>
              <PseStateProvider>
                <PSEMineShell />
              </PseStateProvider>
            </PSEMineProvider>
          </PSEMineAuthProvider>
        }>
          <Route path="/mine/dashboard" element={<PSEmineProtectedRoute><PSEMineDashboard /></PSEmineProtectedRoute>} />
          <Route path="/mine/tools" element={<PSEmineProtectedRoute><PSEMineTools /></PSEmineProtectedRoute>} />
          <Route path="/mine/wallet" element={<PSEmineProtectedRoute><PSEMineWallet /></PSEmineProtectedRoute>} />
          <Route path="/mine/referrals" element={<PSEmineProtectedRoute><PSEMineReferrals /></PSEmineProtectedRoute>} />
          <Route path="/mine/activity" element={<PSEmineProtectedRoute><PSEMineActivity /></PSEmineProtectedRoute>} />
          {/* The guide is an OVERLAY over the console, not a page of its own.
              Both routes render the console and the shell opens the guide's
              plate on top of it, so learning the product never costs the reader
              the product — and finishing onboarding reveals a console that is
              already loaded behind the plate. */}
          <Route path="/mine/guide" element={<PSEmineProtectedRoute><PSEMineDashboard /></PSEmineProtectedRoute>} />
          <Route path="/mine/guide/onboarding" element={<PSEmineProtectedRoute><PSEMineDashboard /></PSEmineProtectedRoute>} />
          <Route path="/mine/me" element={<PSEmineProtectedRoute><PSEMineMe /></PSEmineProtectedRoute>} />
        </Route>

        {/* PSEmine product documents. Public by design: the terms, the purchase
            terms and the risk disclosure have to be readable BEFORE an account
            exists, and they are reachable at every point where a person commits
            to something (sign-up, a purchase, a payout wallet). */}
        <Route path="/mine/terms" element={<PSEminePolicy doc="terms" />} />
        <Route path="/mine/privacy" element={<PSEminePolicy doc="privacy" />} />
        <Route path="/mine/cookies" element={<PSEminePolicy doc="cookies" />} />
        <Route path="/mine/campaign-terms" element={<PSEminePolicy doc="campaign-terms" />} />
        <Route path="/mine/purchase-terms" element={<PSEminePolicy doc="purchase-terms" />} />
        <Route path="/mine/payout-policy" element={<PSEminePolicy doc="payout-policy" />} />
        <Route path="/mine/referral-terms" element={<PSEminePolicy doc="referral-terms" />} />
        <Route path="/mine/risk" element={<PSEminePolicy doc="risk" />} />
        <Route path="/mine/support" element={<PSEminePolicy doc="support" />} />

        <Route path="/admin" element={<OpsRoute><Navigate to="/admin/overview" replace /></OpsRoute>} />
        <Route path="/admin/overview" element={<OpsRoute><OpsLayout><AdminOverview /></OpsLayout></OpsRoute>} />
        <Route path="/admin/mine" element={<OpsRoute><OpsLayout><PSEMineProvider><AdminPSEMine /></PSEMineProvider></OpsLayout></OpsRoute>} />
        <Route path="/admin/psemine" element={<OpsRoute><Navigate to="/admin/mine" replace /></OpsRoute>} />
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
