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
  updateDoc,
  increment,
  getDoc,
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
import { awardPoints } from '../utils/economy';
import { EcosystemBot } from '../utils/ecosystemBot';
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
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      const lastRewardDate = data.lastRewardDate?.toDate();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isNotToday = !lastRewardDate || lastRewardDate < today;

      if (isNotToday) {
        const result = await awardPoints(uid, 10, 'daily_reward', 'Daily Login Bonus');

        if (!result.success) return;

        await updateDoc(userDocRef, { streak: increment(1) });

        await addDoc(collection(db, 'users', uid, 'notifications'), {
          title: 'Daily Reward Claimed!',
          description: 'You earned +10 Pulse for checking in today.',
          type: 'reward_claimed',
          read: false,
          timestamp: serverTimestamp()
        });

        toast.success('Daily Reward Claimed!', { icon: '🎁' });
      }
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

    const isAdmin = email.toLowerCase() === 'admin@pulse.com';
    const role = isAdmin ? 'admin' : 'user';

    let referredBy = null;
    if (referralCodeInput) {
      const q = query(collection(db, 'users'), where('referralCode', '==', referralCodeInput));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const referrerDoc = querySnapshot.docs[0];
        referredBy = referrerDoc.id;

        await awardPoints(referredBy, 50, 'referral_bonus', `Referral bonus for ${username}`);
        await addDoc(collection(db, 'users', referredBy, 'notifications'), {
          title: 'Referral Mission Success!',
          description: `A new member (${username}) joined via your code.`,
          type: 'system',
          read: false,
          timestamp: serverTimestamp()
        });
      }
    }

    const referralCode = generateReferralCode(user.uid);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newUserData: UserData = {
      uid: user.uid,
      email: user.email,
      username,
      points: 10,
      referralCode,
      referredBy,
      streak: 1,
      totalEarnedToday: 10,
      xp: 0,
      level: 1,
      lastRewardDate: Timestamp.fromDate(today),
      createdAt: Timestamp.now(),
      role: role as 'admin' | 'user',
      isBanned: false,
      isFlagged: false,
      avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${user.uid}`,
      stats: { tasksCompleted: 0, referralsCount: 0, predictionsCount: 0 },
      preferences: {
        notifications: true,
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

    await awardPoints(user.uid, 10, 'referral_bonus', 'Signup Welcome Bonus');
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
              role: (user.email?.toLowerCase() === 'admin@pulse.com' || data.role === 'admin') ? 'admin' : 'user'
            };

            setUserData(resolvedData as UserData);

            if (resolvedData.role !== 'admin' && user.emailVerified) {
              checkDailyReward(user.uid);
              EcosystemBot.evaluateUserEngagement(resolvedData as UserData);
            }
          }
          setLoading(false);
          setIsRestoring(false);
        }, (error) => {
          console.error("Error fetching user data:", error);
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
                <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden relative">
                   <motion.div
                     initial={{ left: '-100%' }}
                     animate={{ left: '100%' }}
                     transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                     className="absolute inset-0 w-1/2 bg-primary rounded-full shadow-[0_0_15px_rgba(0,112,255,0.5)]"
                   />
                </div>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Restoring Secure Session</p>
             </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {!loading && children}
    </AuthContext.Provider>
  );
};
