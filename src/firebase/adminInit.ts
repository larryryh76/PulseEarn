import { auth, db } from './config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

export const initializeAdmin = async () => {
  const adminEmail = 'admin@pulse.com';
  const adminPass = 'Admin123!';

  try {
    console.log("Starting Admin Initialization...");

    // 1. Try to create the user in Auth
    let user;
    try {
      const cred = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
      user = cred.user;
      console.log("Admin user created in Auth.");
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-in-use') {
        console.log("Admin email already in use, logging in instead...");
        const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPass);
        user = cred.user;
      } else {
        throw authError;
      }
    }

    // 2. Ensure User Document exists in Firestore
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: adminEmail,
      username: 'SystemAdmin',
      points: 1000,
      referralCode: 'ADMIN-PULSE',
      referredBy: null,
      streak: 1,
      totalEarnedToday: 0,
      role: 'admin',
      createdAt: serverTimestamp(),
      lastRewardDate: Timestamp.now(),
      isBanned: false,
      isFlagged: false
    }, { merge: true });

    console.log("Admin Firestore document initialized.");
    return { success: true, email: adminEmail, password: adminPass };
  } catch (error: any) {
    console.error("Admin Init Failed:", error.message);
    return { success: false, error: error.message };
  }
};
