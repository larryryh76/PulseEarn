import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  UserCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateEmail as firebaseUpdateEmail
} from 'firebase/auth';
import {
  doc,
  setDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import toast from 'react-hot-toast';
import { UserData } from '../types';
import { PointTransactionEngine } from '../engines/points/PointTransactionEngine';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../components/ui/Logo';

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  signup: (email: string, password: string, username: string, referralCode?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  logActivity: (type: string, points: number, description: string) => Promise<void>;
  sendVerification: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;
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

  // Safety: Initialization Timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("Auth initialization timed out. Forcing loading state to false.");
        setLoading(false);
        setIsRestoring(false);
      }
    }, 10000); // 10 seconds
    return () => clearTimeout(timer);
  }, [loading]);

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
    const now = new Date();
    // Use UTC date string to ensure midnight reset is consistent globally
    const todayStr = now.toISOString().split('T')[0];
    const claimId = `daily_${todayStr}_${uid}`;

    try {
      console.log(`[DailyReward] Checking for ${uid} (Claim: ${claimId})`);
      const { EconomyConfigEngine } = await import('../engines/system/EconomyConfigEngine');
      const config = await EconomyConfigEngine.getConfig();

      const result = await PointTransactionEngine.execute({
        userId: uid,
        amount: config.rewards.dailyLoginPoints,
        type: 'daily_reward',
        source: 'Daily Login Bonus',
        claimId,
        xpReward: config.rewards.dailyLoginXP
      });

      if (!result.success) {
        if (result.error === 'REWARD_ALREADY_CLAIMED' || result.error === 'DAILY_REWARD_COOLDOWN') {
           console.log(`[DailyReward] Already claimed for ${todayStr}`);
        } else {
           console.warn(`[DailyReward] Execution failure: ${result.error}`);
        }
        return;
      }

      console.log(`[DailyReward] Success! Granting points and triggering events.`);

      await addDoc(collection(db, 'users', uid, 'notifications'), {
        title: 'Daily Reward Claimed!',
        description: `You earned +${config.rewards.dailyLoginPoints} Pulse for checking in today.`,
        type: 'reward_claimed',
        read: false,
        timestamp: serverTimestamp()
      });

      const { SystemTaskEngine } = await import('../engines/tasks/SystemTaskEngine');
      await SystemTaskEngine.processEvent(uid, 'daily_login');

      toast.success('Daily Reward Claimed!', { icon: '🎁' });
    } catch (error: any) {
      console.error("[DailyReward] System Error:", error.message);
    }
  }

  async function sendVerification() {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function updateUserEmail(newEmail: string) {
    if (auth.currentUser) {
      await firebaseUpdateEmail(auth.currentUser, newEmail);
    }
  }

  async function signup(email: string, password: string, username: string, referralCodeInput?: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Send initial verification
    await sendEmailVerification(user);

    const isAdmin = email.toLowerCase() === import.meta.env.VITE_ADMIN_EMAIL;
    const role = isAdmin ? 'admin' : 'user';

    let referredBy = null;
    if (referralCodeInput) {
      const q = query(collection(db, 'users'), where('referralCode', '==', referralCodeInput));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const referrerDoc = querySnapshot.docs[0];
        referredBy = referrerDoc.id;

        const { EconomyConfigEngine } = await import('../engines/system/EconomyConfigEngine');
        const config = await EconomyConfigEngine.getConfig();

        await PointTransactionEngine.execute({
          userId: referredBy,
          amount: config.rewards.referralBonusPoints,
          type: 'referral_bonus',
          source: `Referral bonus for ${username}`,
          claimId: `referral_${referredBy}_${user.uid}`,
          xpReward: config.rewards.referralBonusXP
        });

        await addDoc(collection(db, 'users', referredBy, 'notifications'), {
          title: 'Referral task Success!',
          description: `A new member (${username}) joined via your code.`,
          type: 'system',
          read: false,
          timestamp: serverTimestamp()
        });

        // Trigger System Task Engine for referral completion
        const { SystemTaskEngine } = await import('../engines/tasks/SystemTaskEngine');
        await SystemTaskEngine.processEvent(referredBy, 'referral_completed');
      }
    }

    const referralCode = generateReferralCode(user.uid);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newUserData: UserData = {
      uid: user.uid,
      email: user.email,
      username,
      points: 0, // Start at 0, awarded via awardPoints for history consistency
      referralCode,
      referredBy,
      streak: 1,
      totalEarnedToday: 0,
      xp: 0,
      level: 1,
      lastRewardDate: Timestamp.fromDate(today),
      createdAt: Timestamp.now(),
      role: role as 'admin' | 'user',
      isBanned: false,
      isFlagged: false,
      avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${user.uid}`,
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

    await setDoc(doc(db, 'users', user.uid), {
      ...newUserData,
      createdAt: serverTimestamp()
    });

    // Award Welcome Bonus and ensure it's logged in history
    await PointTransactionEngine.execute({
      userId: user.uid,
      amount: 10,
      type: 'referral_bonus',
      source: 'Signup Welcome Reward',
      claimId: `welcome_${user.uid}`,
      xpReward: 50
    });
  }

  function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
    setUserData(null);
  }

  useEffect(() => {
    let unsubscribeData: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (user) {
        unsubscribeData = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserData;
            const resolvedData = {
              ...data,
              role: (user.email?.toLowerCase() === import.meta.env.VITE_ADMIN_EMAIL || data.role === 'admin') ? 'admin' : 'user'
            };

            setUserData(resolvedData as UserData);

            if (resolvedData.role !== 'admin' && user.emailVerified) {
              checkDailyReward(user.uid);
            }
          }
          setLoading(false);
          setIsRestoring(false);
        }, (error) => {
          console.error("[AuthContext] Firestore Error:", error);
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
    logout,
    logActivity,
    sendVerification,
    resetPassword,
    updateUserEmail
  };

  return (
    <AuthContext.Provider value={value}>
      <AnimatePresence>
        {isRestoring ? (
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
        ) : null}
      </AnimatePresence>
      {!loading && children}
    </AuthContext.Provider>
  );
};
