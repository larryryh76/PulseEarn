import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  UserCredential
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
  addDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import toast from 'react-hot-toast';
import { UserData } from '../types';
import { awardPoints } from '../utils/economy';

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  signup: (email: string, password: string, username: string) => Promise<void>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  logActivity: (type: string, points: number, description: string) => Promise<void>;
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

        if (!result.success) {
          if (result.error?.includes('Daily cap')) {
            toast.error('Daily Pulse cap reached!');
          }
          return;
        }

        // Update streak separately
        await updateDoc(userDocRef, {
          streak: increment(1)
        });

        // Send notification
        await addDoc(collection(db, 'users', uid, 'notifications'), {
          title: 'Daily Reward Claimed!',
          description: 'You earned +10 Pulse for checking in today.',
          type: 'reward_claimed',
          read: false,
          timestamp: serverTimestamp()
        });

        toast.success('+10 Points Daily Reward Claimed!', {
          icon: '🎁',
          duration: 4000,
        });
      }
    }
  }

  async function signup(email: string, password: string, username: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Admin Logic: Check for exact email
    const isAdmin = email.toLowerCase() === 'admin@pulse.com';
    const role = isAdmin ? 'admin' : 'user';

    if (isAdmin) {
      console.warn("--- ADMIN ACCOUNT CREATED ---");
      console.log(`Email: ${email}`);
      console.log(`Role: ${role}`);
      console.log(`Route: /pulse-core`);
      console.warn("-----------------------------");
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
      referredBy: null,
      streak: 1,
      totalEarnedToday: 10,
      lastRewardDate: Timestamp.fromDate(today),
      createdAt: Timestamp.now(),
      role: role as 'admin' | 'user',
      isBanned: false,
      isFlagged: false,
      actionsInLastMinute: 0,
      earnedInLastHour: 0,
    };

    await setDoc(doc(db, 'users', user.uid), {
      ...newUserData,
      createdAt: serverTimestamp()
    });

    await awardPoints(user.uid, 10, 'referral_bonus', 'Signup Welcome Bonus');

    // Send welcome notification
    await addDoc(collection(db, 'users', user.uid, 'notifications'), {
      title: 'Welcome to PulseEarn!',
      description: 'Start completing missions to earn your first Pulse rewards.',
      type: 'system',
      read: false,
      timestamp: serverTimestamp()
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
        console.log(`[Auth] Authenticated: ${user.email}`);
        unsubscribeData = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserData;
            const isAdminEmail = user.email?.toLowerCase() === 'admin@pulse.com';

            // AUTOMATIC ELEVATION: If admin email but not admin role in DB, fix it.
            if (isAdminEmail && data.role !== 'admin') {
              console.log(`[Auth] Admin email detected without admin role. Upgrading document...`);
              try {
                await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
              } catch (e) {
                console.error("[Auth] Failed to auto-upgrade admin role:", e);
              }
            }

            const resolvedData = {
              ...data,
              role: (isAdminEmail || data.role === 'admin') ? 'admin' : 'user'
            };

            console.log(`[Auth] Role Verification:`, {
              email: user.email,
              dbRole: data.role,
              activeRole: resolvedData.role,
              isSystemAdmin: isAdminEmail
            });

            setUserData(resolvedData as UserData);

            // ADMIN SEPARATION: Only standard users get daily rewards
            if (resolvedData.role !== 'admin') {
              checkDailyReward(user.uid);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user data:", error);
          setLoading(false);
        });
      } else {
        if (unsubscribeData) {
          unsubscribeData();
          unsubscribeData = undefined;
        }
        setUserData(null);
        setLoading(false);
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
    logActivity
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
