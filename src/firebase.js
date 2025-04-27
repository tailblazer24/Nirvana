// src/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA2SmH6ZEle53aV3BdoSm9SgexIifaH_SQ",
  authDomain: "selfcare-website-96949.firebaseapp.com",
  projectId: "selfcare-website-96949",
  storageBucket: "selfcare-website-96949.firebasestorage.app",
  messagingSenderId: "1012064294977",
  appId: "1:1012064294977:web:cff22e8cd35f9fa39acec0",
  measurementId: "G-NRKETKQXT5"
};

// Initialize only once
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Export initialized instances
export const auth = getAuth(app);
export const db = getFirestore(app);
