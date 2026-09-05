import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
  UserCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export interface PsemineProfile {
  uid: string;
  email: string | null;
  username: string;
  hasCompletedGuide: boolean;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

interface PsemineAuthContextType {
  currentUser: User | null;
  psemineProfile: PsemineProfile | null;
  loading: boolean;
  signup: (email: string, password: string, username: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  loginWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
  sendVerification: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (oobCode: string, newPassword: string) => Promise<void>;
  completeGuide: () => Promise<void>;
  refreshVerificationStatus: () => Promise<void>;
}

const PsemineAuthContext = createContext<PsemineAuthContextType | undefined>(undefined);

export const usePsemineAuth = () => {
  const context = useContext(PsemineAuthContext);
  if (context === undefined) {
    throw new Error('usePsemineAuth must be used within a PsemineAuthProvider');
  }
  return context;
};

export const PsemineAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [psemineProfile, setPsemineProfile] = useState<PsemineProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Safety initialization timeout (15 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("[PSEmine Auth] Initialization timeout fallback.");
        setLoading(false);
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [loading]);

  const initializePsemineProfile = async (user: User, username?: string): Promise<PsemineProfile> => {
    const profileRef = doc(db, 'psemine_profiles', user.uid);
    const snap = await getDoc(profileRef);

    if (snap.exists()) {
      return snap.data() as PsemineProfile;
    }

    const newProfile: PsemineProfile = {
      uid: user.uid,
      email: user.email,
      username: username || user.displayName || `Miner_${user.uid.slice(0, 5)}`,
      hasCompletedGuide: false
    };

    await setDoc(profileRef, {
      ...newProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return newProfile;
  };

  const signup = async (email: string, password: string, username: string): Promise<UserCredential> => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Send email verification with custom redirect to /mine/verify-email if possible
    try {
      await sendEmailVerification(user);
    } catch (err) {
      console.warn("[PSEmine Auth] Email verification dispatch failed on signup:", err);
    }

    await initializePsemineProfile(user, username);
    return credential;
  };

  const login = async (email: string, password: string): Promise<UserCredential> => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async (): Promise<UserCredential> => {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    await initializePsemineProfile(credential.user);
    return credential;
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setPsemineProfile(null);
  };

  const sendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const refreshVerificationStatus = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setCurrentUser({ ...auth.currentUser });
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const confirmResetPassword = async (oobCode: string, newPassword: string) => {
    await confirmPasswordReset(auth, oobCode, newPassword);
  };

  const completeGuide = async () => {
    if (!currentUser) return;
    const profileRef = doc(db, 'psemine_profiles', currentUser.uid);
    const snap = await getDoc(profileRef);

    if (snap.exists()) {
      const existingData = snap.data();
      const updatePayload = {
        email: currentUser.email,
        username: psemineProfile?.username || existingData?.username || currentUser.displayName || `Miner_${currentUser.uid.slice(0, 5)}`,
        hasCompletedGuide: true,
        updatedAt: serverTimestamp()
      };
      await setDoc(profileRef, updatePayload, { merge: true });
      setPsemineProfile((prev) => ({
        ...prev,
        uid: currentUser.uid,
        email: currentUser.email,
        username: prev?.username || existingData?.username || currentUser.displayName || `Miner_${currentUser.uid.slice(0, 5)}`,
        hasCompletedGuide: true
      }));
    } else {
      const createPayload = {
        uid: currentUser.uid,
        email: currentUser.email,
        username: psemineProfile?.username || currentUser.displayName || `Miner_${currentUser.uid.slice(0, 5)}`,
        hasCompletedGuide: true
      };
      await setDoc(profileRef, {
        ...createPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setPsemineProfile({
        ...createPayload,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        const profileRef = doc(db, 'psemine_profiles', user.uid);
        unsubscribeProfile = onSnapshot(profileRef, async (snap) => {
          if (snap.exists()) {
            setPsemineProfile(snap.data() as PsemineProfile);
          } else {
            try {
              const created = await initializePsemineProfile(user);
              setPsemineProfile(created);
            } catch (err) {
              console.error("[PSEmine Auth] Failed to create profile on snap miss:", err);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("[PSEmine Auth] Profile listener error:", error);
          setLoading(false);
        });
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = undefined;
        }
        setPsemineProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const value = {
    currentUser,
    psemineProfile,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    sendVerification,
    resetPassword,
    confirmResetPassword,
    completeGuide,
    refreshVerificationStatus
  };

  return (
    <PsemineAuthContext.Provider value={value}>
      {children}
    </PsemineAuthContext.Provider>
  );
};
