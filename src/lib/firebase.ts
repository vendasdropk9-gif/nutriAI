import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, setLogLevel, doc, getDocFromServer, setDoc, updateDoc, onSnapshot, collection, serverTimestamp, query, where, getDocs, addDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress debug/info logs from Firestore to avoid cluttering the console with benign gRPC stream cancellations
setLogLevel('error');

const app = initializeApp(firebaseConfig);

// Use initializeFirestore with optimized settings for sandbox/proxy environments
// memoryLocalCache prevents IndexedDB issues in multi-tab development
// experimentalForceLongPolling avoids persistent gRPC stream drops by proxies
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId); 

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIframe = window !== window.parent;

    if ((isStandalone || isMobile) && !isIframe) {
      await signInWithRedirect(auth, googleProvider);
      return null; // The page will navigate away
    } else {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
