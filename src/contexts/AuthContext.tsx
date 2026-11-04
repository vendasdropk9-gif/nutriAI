import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth, signInWithGoogle as firebaseSignInWithGoogle } from '../lib/firebase';

export const TEST_GUEST_USER: any = {
  uid: 'guest-test-user-nutri-ai',
  email: 'teste@nutriai.app',
  displayName: 'Usuário de Teste (Demo)',
  emailVerified: true,
  isAnonymous: true,
  isGuest: true,
  photoURL: null,
  phoneNumber: null,
  providerId: 'firebase',
  providerData: [
    {
      providerId: 'password',
      uid: 'guest-test-user-nutri-ai',
      displayName: 'Usuário de Teste (Demo)',
      email: 'teste@nutriai.app',
      phoneNumber: null,
      photoURL: null
    }
  ],
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString()
  },
  getIdToken: async () => 'mock-guest-token',
  getIdTokenResult: async () => ({ token: 'mock-guest-token', claims: {} }),
  reload: async () => {},
  delete: async () => {}
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<any>;
  signUpWithEmail: (email: string, pass: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  loginAsGuest: () => void;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signInWithGoogle: async () => {},
  loginAsGuest: () => {},
  isGuest: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('nutri-guest-mode') === 'true';
    } catch {
      return false;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('nutri-guest-mode') === 'true') {
        return TEST_GUEST_USER as User;
      }
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsGuest(false);
        try { localStorage.removeItem('nutri-guest-mode'); } catch (e) {}
      } else {
        try {
          if (localStorage.getItem('nutri-guest-mode') === 'true') {
            setUser(TEST_GUEST_USER as User);
            setIsGuest(true);
          } else {
            setUser(null);
            setIsGuest(false);
          }
        } catch (e) {
          setUser(null);
          setIsGuest(false);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginAsGuest = () => {
    try {
      localStorage.setItem('nutri-guest-mode', 'true');
    } catch (e) {}
    setIsGuest(true);
    setUser(TEST_GUEST_USER as User);
    setLoading(false);
  };

  const logout = async () => {
    try {
      localStorage.removeItem('nutri-guest-mode');
    } catch (e) {}
    setIsGuest(false);
    setUser(null);
    try {
      await firebaseSignOut(auth);
    } catch (e) {}
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      localStorage.removeItem('nutri-guest-mode');
    } catch (e) {}
    setIsGuest(false);
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      localStorage.removeItem('nutri-guest-mode');
    } catch (e) {}
    setIsGuest(false);
    return createUserWithEmailAndPassword(auth, email, pass);
  };

  const signInWithGoogle = async () => {
    try {
      localStorage.removeItem('nutri-guest-mode');
    } catch (e) {}
    setIsGuest(false);
    return firebaseSignInWithGoogle();
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, signInWithEmail, signUpWithEmail, signInWithGoogle, loginAsGuest, isGuest }}>
      {children}
    </AuthContext.Provider>
  );
};
