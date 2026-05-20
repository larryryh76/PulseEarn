import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCn4mw4DT5cCOO-590uLPRMBnKuhiaJjms",
  authDomain: "pulseearn-a4b16.firebaseapp.com",
  projectId: "pulseearn-a4b16",
  storageBucket: "pulseearn-a4b16.firebasestorage.app",
  messagingSenderId: "867830834697",
  appId: "1:867830834697:web:0b53c34baf22de26e5bad8",
  measurementId: "G-BLGWT49Z64"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
