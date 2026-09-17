import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeFetch } from '../utils/api';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  UserCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  collection,
  addDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserData } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../components/ui/Logo';
import MaintenanceOverlay, { MaintenanceType } from '../components/ui/MaintenanceOverlay';
import { PSELogo } from '../components/psemine/pse';
import {
  PULSE_EARN_PRODUCT,
  repairWelcomeBonusIfMissing,
  runPulseEarnOnboarding,
} from '../engines/product/pulseEarnProduct';

/**
 * Which product an account is being created for. Entitlement is explicit:
 * a signup grants the product that was actually chosen, never both.
 */
export type ProductId = 'pulseearn' | 'psemine';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * AuthContext — SHARED IDENTITY & SESSION INFRASTRUCTURE. NOT product behaviour.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This provider is mounted above the router (src/main.tsx), so whatever runs
 * here runs for EVERY route, in every product. It is therefore limited to:
 *
 *   • Firebase authentication (signup / login / Google / logout)
 *   • session restoration + identity (`currentUser`, `users/{uid}` snapshot)
 *   • role resolution (admin / moderator / user)
 *   • generic account security (email verification, password reset, activity log)
 *
 * It deliberately contains NO product economy. PulseEarn's daily reward,
 * welcome bonus, referral bonuses and reward toasts live in
 * src/engines/product/pulseEarnProduct.ts and are only invoked from
 * PulseEarn-scoped signup or from PulseEarnProductProvider (mounted on
 * PulseEarn routes only). PSEmine's economy lives entirely on the PSEmine
 * backend (/api/mine/*).
 *
 * The old behaviour — a global `users/{uid}` listener that claimed the
 * PulseEarn daily reward for any authenticated, email-verified, non-ops user —
 * meant a PSEmine-only miner on /mine/dashboard triggered a PulseEarn points
 * mutation and a PulseEarn toast. Shared infrastructure, not shared product
 * behaviour: the rule this file now enforces.
 */
interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  /**
   * Creates the account for one explicit product. The entitlement written to
   * `users/{uid}.productAccess` matches the chosen product and never grants
   * the other one implicitly.
   */
  signup: (email: string, password: string, username: string, referralCode?: string, product?: ProductId) => Promise<void>;
  login: (email: string, password: string) => Promise<UserCredential>;
  signInWithGoogle: (referralCode?: string, product?: ProductId) => Promise<void>;
  logout: () => Promise<void>;
  logActivity: (type: string, points: number, description: string) => Promise<void>;
  sendVerification: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  reauthenticate: (password: string) => Promise<void>;
  systemError: MaintenanceType | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(true);
  const [systemError, setSystemError] = useState<MaintenanceType | null>(null);

  // Safety: Initialization Timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && !systemError) {
        console.warn("Auth initialization timed out. Forcing loading state to false.");
        setLoading(false);
        setIsRestoring(false);
      }
    }, 30000); // 30 seconds
    return () => clearTimeout(timer);
  }, [loading, systemError]);

  const generateReferralCode = (uid: string) => {
    return `PULSE-${uid.slice(0, 6).toUpperCase()}`;
  };

  async function logActivity(type: string, points: number, description: string, uid?: string) {
    const targetUid = uid || currentUser?.uid;
    if (!targetUid) return;

    try {
      const activitiesCol = collection(db, 'users', targetUid, 'activities');
      await addDoc(activitiesCol, {
        type,
        points,
        description,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }

  async function sendVerification() {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  }

  async function resetPassword(email: string) {
    // Route through the backend so the user receives the BRANDED PulseEarn email (via Resend)
    // instead of Firebase's default template. The server returns dispatchMethod === 'server'
    // when it sent the branded email, or 'client_fallback' when branded delivery is unavailable
    // (no Resend key / send failure) — in which case we dispatch via the Firebase client SDK so
    // password reset always works. Errors also fall back rather than leaving the user stuck.
    try {
      const res = await safeFetch('/api/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res?.success && res?.dispatchMethod !== 'client_fallback') return;
    } catch {
      // ignore and fall back to Firebase client SDK below
    }
    await sendPasswordResetEmail(auth, email);
  }

  async function updateUserEmail(newEmail: string) {
    if (auth.currentUser) {
      await firebaseUpdateEmail(auth.currentUser, newEmail);
    }
  }

  async function updateUserPassword(newPassword: string) {
    if (auth.currentUser) {
      await firebaseUpdatePassword(auth.currentUser, newPassword);
    }
  }

  async function reauthenticate(password: string) {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error("No active session found for re-authentication.");
    }

    // Ensure the account is a password provider
    const providers = auth.currentUser.providerData.map(p => p.providerId);
    if (!providers.includes('password')) {
      throw new Error("Direct password updates are only available for email/password accounts.");
    }

    const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
    await reauthenticateWithCredential(auth.currentUser, credential);
  }

  /**
   * Creates the shared identity profile for a new account.
   *
   * `product` is the product the user actually signed up for:
   *   • 'pulseearn' → productAccess { pulseearn: true, psemine: false }
   *   • 'psemine'   → productAccess { pulseearn: false, psemine: true }
   *   • null        → no product grant (identity self-healing only)
   *
   * The account is the SAME Firebase identity across products. Only the
   * entitlement differs — which is the distinction the old default
   * `{ pulseearn: true, psemine: true }` erased.
   */
  async function initializeUserProfile(
    user: User,
    username: string,
    product: ProductId | null,
    referralCodeInput?: string
  ) {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // Existing identity: entitlement is never upgraded or downgraded here.
      // PulseEarn's missing-welcome-bonus repair is a PulseEarn-only concern.
      if (product === PULSE_EARN_PRODUCT) {
        await repairWelcomeBonusIfMissing(user.uid);
      }
      return;
    }

    const referralCode = generateReferralCode(user.uid);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const newUserData: UserData = {
      uid: user.uid,
      email: user.email,
      username,
      points: 0,
      referralCode,
      referredBy: null, // Initially null
      streak: 0,
      totalEarnedToday: 0,
      xp: 0,
      level: 1,
      lastRewardDate: Timestamp.fromDate(yesterday),
      createdAt: Timestamp.now(),
      role: 'user',
      status: 'active',
      // EXPLICIT ENTITLEMENT — exactly one product on signup.
      productAccess: {
        pulseearn: product === PULSE_EARN_PRODUCT,
        psemine: product === 'psemine'
      },
      isBanned: false,
      isFlagged: false,
      onboardingCompleted: false,
      avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.uid}`,
      stats: {
        tasksCompleted: 0,
        referralsCount: 0,
        predictionsCount: 0,
        totalEarnings: 0,
        weeklyEarnings: 0
      },
      preferences: {
        notifications: true,
        rewardAlerts: true,
        marketing: false,
        soundEnabled: true,
        vibrationEnabled: true,
        privacyMode: false,
        preferredCategories: ['Daily', 'Social']
      }
    };

    await setDoc(userRef, {
      ...newUserData,
      createdAt: serverTimestamp()
    });

    // PulseEarn-only post-signup economy. PSEmine's onboarding is entirely
    // backend-owned (/api/mine/enroll + /api/mine/referrals/register), so there
    // is nothing to run here for a PSEmine signup — and definitely no
    // PulseEarn points, XP or toasts.
    if (product === PULSE_EARN_PRODUCT) {
      await runPulseEarnOnboarding(user, username, referralCodeInput);
    }
  }

  async function signup(
    email: string,
    password: string,
    username: string,
    referralCodeInput?: string,
    product: ProductId = PULSE_EARN_PRODUCT
  ) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Request branded verification email from backend
    try {
      const idToken = await user.getIdToken();
      const res = await safeFetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.success) throw new Error(res.message);
    } catch (err) {
      console.error("[AuthContext] Backend Verification Request Failed:", err);
      // Fallback to Firebase standard if backend fails
      await sendEmailVerification(user, {
        url: 'https://pulseearn.online/auth/action',
        handleCodeInApp: true
      });
    }

    await initializeUserProfile(user, username, product, referralCodeInput);
  }

  async function signInWithGoogle(
    referralCodeInput?: string,
    product: ProductId = PULSE_EARN_PRODUCT
  ) {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    await initializeUserProfile(user, user.displayName || `User_${user.uid.slice(0, 5)}`, product, referralCodeInput);
  }

  function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
    setUserData(null);
  }

  useEffect(() => {
    if (localStorage.getItem('pulseearn-test-bypass') === 'true') {
      setCurrentUser({
        uid: 'test-user-uid',
        email: 'test@pulseearn.online',
        emailVerified: true,
        getIdToken: async () => 'test-id-token',
        getIdTokenResult: async () => ({ token: 'test-id-token', claims: { role: 'user' } }),
      } as any);
      setUserData({
        uid: 'test-user-uid',
        email: 'test@pulseearn.online',
        username: 'PremiumUser',
        points: 12500,
        referralCode: 'PULSE-TEST',
        referredBy: null,
        streak: 5,
        totalEarnedToday: 450,
        xp: 3200,
        level: 3,
        role: 'user',
        status: 'active',
        onboardingCompleted: true,
        productAccess: { pulseearn: true, psemine: false },
        stats: {
          tasksCompleted: 15,
          referralsCount: 3,
          predictionsCount: 8,
          totalEarnings: 24500,
          weeklyEarnings: 1250
        }
      } as any);
      setLoading(false);
      setIsRestoring(false);
      return;
    }

    let unsubscribeData: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (user) {
        unsubscribeData = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserData;
            // Preserve all valid roles — admin, moderator, user
            const resolvedRole: UserData['role'] =
              data.role === 'admin' ? 'admin' :
              data.role === 'moderator' ? 'moderator' : 'user';
            const resolvedData: UserData = {
              ...data,
              role: resolvedRole,
              status: data.status || 'active'
            };

            setUserData(resolvedData as UserData);
            setSystemError(null);

            // IDENTITY ONLY. No product economy runs here — see the header
            // comment: a global listener must never mutate a product's economy
            // or raise a product toast on another product's routes.
          } else {
             // Priority 5: Resilience - Auto-Healing Identity Sync
             // Auth exists but profile doesn't? Attempt to re-initialize profile to prevent 'IDENTITY_NOT_FOUND' shell.
             console.warn("[AuthContext] Identity Drift Detected: Attempting Self-Healing...");
             try {
                // Re-run initialization using current auth metadata. `null`
                // product: self-healing repairs the identity record only and
                // never grants a product entitlement.
                await initializeUserProfile(user, user.displayName || `User_${user.uid.slice(0, 5)}`, null);
                if (import.meta.env.DEV) console.log("[AuthContext] Identity Refreshed Successfully.");
             } catch (healError) {
                console.error("[AuthContext] Self-Healing Failed:", healError);
                setSystemError('IDENTITY_NOT_FOUND');
             }
          }
          setLoading(false);
          setIsRestoring(false);
        }, (error: any) => {
          console.error("[AuthContext] Firestore Fatal Error:", error.code, error.message);
          if (error.code === 'permission-denied') {
            setSystemError('PERMISSION_DENIED');
          } else {
            setSystemError('INITIALIZATION_FAILED');
          }
          setLoading(false);
          setIsRestoring(false);
        });
      } else {
        if (unsubscribeData) {
          unsubscribeData();
          unsubscribeData = undefined;
        }
        setUserData(null);
        setLoading(false);
        setIsRestoring(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeData) unsubscribeData();
    };
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    signup,
    login,
    signInWithGoogle,
    logout,
    logActivity,
    sendVerification,
    resetPassword,
    updateUserEmail,
    updateUserPassword,
    reauthenticate,
    systemError
  };

  return (
    <AuthContext.Provider value={value}>
      <AnimatePresence>
        {systemError && (
           <MaintenanceOverlay
             type={systemError}
             onRetry={() => window.location.reload()}
           />
        )}

        {isRestoring && !systemError ? (
          typeof window !== 'undefined' && window.location.pathname.startsWith('/mine') ? (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4" style={{ background: '#0A0E14' }}>
              <PSELogo size={40} />
              <div className="h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: 'rgba(255,255,255,0.13)', borderTopColor: '#2E90FA' }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: '#5B6472' }}>Initializing mining session</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-[#050507] flex flex-col items-center justify-center gap-6"
            >
               <div className="scale-150 mb-4">
                  <Logo />
               </div>
               <div className="flex flex-col items-center gap-3">
                  <div className="w-48 h-1 bg-surface-glass rounded-full overflow-hidden relative">
                     <motion.div
                       initial={{ left: '-100%' }}
                       animate={{ left: '100%' }}
                       transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                       className="absolute inset-0 w-1/2 bg-primary rounded-full shadow-[0_0_15px_rgba(0,112,255,0.5)]"
                     />
                  </div>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Loading Account</p>
               </div>
            </motion.div>
          )
        ) : null}
      </AnimatePresence>
      {!loading && !systemError && children}
    </AuthContext.Provider>
  );
};
