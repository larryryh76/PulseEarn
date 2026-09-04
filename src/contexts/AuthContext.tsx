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
  updateDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  collection,
  addDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import toast from 'react-hot-toast';
import { UserData } from '../types';
import { PointTransactionEngine } from '../engines/points/PointTransactionEngine';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../components/ui/Logo';
import PSEMineLoader from '../components/psemine/PSEMineLoader';
import MaintenanceOverlay, { MaintenanceType } from '../components/ui/MaintenanceOverlay';
import { EconomyConfigEngine } from '../engines/system/EconomyConfigEngine';
import { NotificationEngine } from '../engines/system/NotificationEngine';
import { UserEngine } from '../engines/system/UserEngine';

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  signup: (email: string, password: string, username: string, referralCode?: string, productContext?: 'pulseearn' | 'psemine') => Promise<void>;
  login: (email: string, password: string) => Promise<UserCredential>;
  signInWithGoogle: (referralCode?: string, productContext?: 'pulseearn' | 'psemine') => Promise<void>;
  activatePSEMineAccess: (walletAddress?: string) => Promise<void>;
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

  async function checkDailyReward(uid: string) {
    try {
      const config = await EconomyConfigEngine.getConfig();

      // Calculate local date string for the claim ID
      const utcOffset = -new Date().getTimezoneOffset();
      const now = new Date();
      const localDate = new Date(now.getTime() + utcOffset * 60000);
      const localDayStr = localDate.toISOString().split('T')[0];

      const claimId = `daily_${localDayStr}_${uid}`;

      const result = await PointTransactionEngine.execute({
        userId: uid,
        amount: config.rewards.dailyLoginPoints,
        type: 'daily_reward',
        source: 'Daily Login Bonus',
        claimId,
        xpReward: config.rewards.dailyLoginXP,
        metadata: { localDay: localDayStr }
      });

      if (result.success) {
        toast.success('Daily Reward Claimed!', {
           icon: '🎁',
           duration: 5000,
           position: 'top-center'
        });
      } else if (result.error !== 'DAILY_REWARD_COOLDOWN' && result.error !== 'REWARD_ALREADY_CLAIMED') {
         // Show visible error toast for legitimate failures
         toast.error(`Daily Reward Error: ${result.error}`, { position: 'top-center' });
      }
    } catch (error: any) {
      console.error("[AuthContext] Daily Reward Sync Failed:", error.message);
      toast.error(`System Error: Daily reward check failed`, { position: 'top-center' });
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

  async function initializeUserProfile(
    user: User,
    username: string,
    referralCodeInput?: string,
    productContext: 'pulseearn' | 'psemine' = 'pulseearn'
  ) {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
       // Repair path for welcome bonus
       try {
          const claimRef = doc(db, 'system_claims', `welcome_${user.uid}`);
          const claimSnap = await getDoc(claimRef);
          if (!claimSnap.exists()) {
             if (import.meta.env.DEV) console.log("[AuthContext] Repairing Welcome Bonus...");
             const config = await EconomyConfigEngine.getConfig();
             await PointTransactionEngine.execute({
               userId: user.uid,
               amount: config.rewards.welcomeBonusPoints ?? 30,
               type: 'welcome_bonus',
               source: 'Welcome Bonus (Repair)',
               claimId: `welcome_${user.uid}`,
               xpReward: config.rewards.welcomeBonusXP ?? 50
             });
          }
       } catch (err) {
          console.error("[AuthContext] Welcome Bonus Repair Failed:", err);
       }
       return;
    }

    // Create document FIRST
    const referralCode = generateReferralCode(user.uid);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const initialProductAccess = productContext === 'psemine'
      ? { pulseearn: false, psemine: true }
      : { pulseearn: true, psemine: false };

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
      // Authentication and PSEmine campaign participation remain separate states.
      productAccess: initialProductAccess,
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

    // Everything after this is wrapped in its own try/catch to isolate failures

    // 1. Referral Linkage - SEC-001: Backend-authoritative lookup + immediate bonus distribution
    if (referralCodeInput) {
       try {
          const idToken = await user.getIdToken();
          const res = await safeFetch('/api/referrals/lookup', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ referralCode: referralCodeInput })
          });

          if (res.success) {
            const referredBy = res.referrerId;

            // Create referral record first
            const referralDocRef = doc(collection(db, 'referrals'));
            const referralDocId = referralDocRef.id;

            await setDoc(referralDocRef, {
              referrerId: referredBy,
              refereeId: user.uid,
              refereeUsername: username,
              status: 'REGISTERED',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });

            // Update user with referral info
            await updateDoc(userRef, {
              referredBy,
              referralDocId
            });

            // Immediately apply signup bonuses (30 PTS to referee, 50 PTS to referrer)
            const bonusRes = await safeFetch('/api/referrals/apply-signup-bonus', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                referrerId: referredBy,
                referralDocId: referralDocId
              })
            });

            if (bonusRes.success) {
              // Show toasts for both users if in same session
              toast.success(`Referral Bonus: +${bonusRes.refereeBonusPoints} PTS`, {
                icon: '🎁',
                duration: 6000,
                position: 'top-center'
              });

              // Notify referrer about the bonus and new member
              await NotificationEngine.send({
                userId: referredBy,
                title: 'Referral Bonus Earned',
                description: `${username} joined using your code. You earned ${bonusRes.referrerBonusPoints} PTS!`,
                type: 'referral_joined'
              });
            }
          }
       } catch (err) {
          console.error("[AuthContext] Referral Linkage Failure (Isolated):", err);
       }
    }

    // 2. Welcome Bonus
    try {
      const config = await EconomyConfigEngine.getConfig();
      const amount = config.rewards.welcomeBonusPoints ?? 30;
      const xpReward = config.rewards.welcomeBonusXP ?? 50;

      const result = await PointTransactionEngine.execute({
        userId: user.uid,
        amount,
        type: 'welcome_bonus',
        source: 'Welcome Bonus',
        claimId: `welcome_${user.uid}`,
        xpReward
      });

      if (result.success && amount > 0) {
        toast.success(`Welcome Bonus Credited: +${amount} PTS`, {
          icon: '🎁',
          duration: 6000,
          position: 'top-center'
        });
      }
    } catch (err) {
      console.error("[AuthContext] Welcome Bonus Dispatch Failed (Isolated):", err);
    }

    // 3. New Identity Notification
    try {
      await NotificationEngine.send({
         userId: user.uid,
         title: 'Identity Synchronized',
         description: 'Your PulseEarn profile has been established. Welcome to the network.',
         type: 'system'
      });
    } catch (err) {
      console.error("[AuthContext] Profile Notification Failed (Isolated):", err);
    }
  }

  async function signup(
    email: string,
    password: string,
    username: string,
    referralCodeInput?: string,
    productContext: 'pulseearn' | 'psemine' = 'pulseearn'
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

    await initializeUserProfile(user, username, referralCodeInput, productContext);
  }

  async function signInWithGoogle(
    referralCodeInput?: string,
    productContext: 'pulseearn' | 'psemine' = 'pulseearn'
  ) {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    await initializeUserProfile(user, user.displayName || `User_${user.uid.slice(0, 5)}`, referralCodeInput, productContext);
  }

  async function activatePSEMineAccess() {
    if (!currentUser) throw new Error('You must be signed in to activate PSEmine.');
    const token = await currentUser.getIdToken(true);
    const response = await safeFetch('/api/psemine/onboarding', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!response?.success) throw new Error(response?.message || 'PSEmine onboarding could not be completed.');
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
        productAccess: { pulseearn: true, psemine: true },
        onboardingCompleted: true,
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
              status: data.status || 'active',
              productAccess: data.productAccess || {
                pulseearn: true,
                psemine: false
              }
            };

            setUserData(resolvedData as UserData);
            setSystemError(null);

            // Skip fingerprinting and daily reward checks for ops users (admin/moderator)
            if (resolvedData.role !== 'admin' && resolvedData.role !== 'moderator') {
              UserEngine.recordFingerprint(user.uid);
              if (user.emailVerified) {
                checkDailyReward(user.uid);
              }
            }
          } else {
             // Priority 5: Resilience - Auto-Healing Identity Sync
             // Auth exists but profile doesn't? Attempt to re-initialize profile to prevent 'IDENTITY_NOT_FOUND' shell.
             console.warn("[AuthContext] Identity Drift Detected: Attempting Self-Healing...");
             try {
                // Re-run initialization using current auth metadata
                await initializeUserProfile(user, user.displayName || `User_${user.uid.slice(0, 5)}`);
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
    activatePSEMineAccess,
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
          window.location.pathname.startsWith('/mine') ? (
            <div className="fixed inset-0 z-[100]">
              <PSEMineLoader message="Loading PSEmine Workspace..." />
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
