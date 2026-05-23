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

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  signup: (email: string, password: string, username: string, referralCode?: string) => Promise<void>;
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

  async function signup(email: string, password: string, username: string, referralCodeInput?: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Admin Logic: Check for exact email
    const isAdmin = email.toLowerCase() === 'admin@pulse.com';
    const role = isAdmin ? 'admin' : 'user';

    // Referral Logic
    let referredBy = null;
    if (referralCodeInput) {
      const q = query(collection(db, 'users'), where('referralCode', '==', referralCodeInput));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const referrerDoc = querySnapshot.docs[0];
        referredBy = referrerDoc.id;

        // Award points to referrer
        await awardPoints(referredBy, 50, 'referral_bonus', `Referral bonus for ${username}`);
        await addDoc(collection(db, 'users', referredBy, 'notifications'), {
          title: 'Referral Mission Success!',
          description: `A new node (${username}) joined via your code. +50 Pulse awarded.`,
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
      actionsInLastMinute: 0,
      earnedInLastHour: 0,
      avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${user.uid}`,
      stats: {
        tasksCompleted: 0,
        referralsCount: 0,
        predictionsCount: 0
      },
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
        unsubscribeData = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserData;
            const isAdminEmail = user.email?.toLowerCase() === 'admin@pulse.com';

            // AUTOMATIC ELEVATION: If admin email but not admin role in DB, fix it.
            if (isAdminEmail && data.role !== 'admin') {
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

            setUserData(resolvedData as UserData);

            // ADMIN SEPARATION: Only standard users get daily rewards
            if (resolvedData.role !== 'admin') {
              checkDailyReward(user.uid);
              EcosystemBot.evaluateUserEngagement(resolvedData as UserData);
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
