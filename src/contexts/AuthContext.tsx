import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginLocally: (name: string, email: string) => void;
  logoutLocally: () => void;
  isLocal: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginLocally: () => {},
  logoutLocally: () => {},
  isLocal: false
});

export const useAuth = () => useContext(AuthContext);

const getLocalSession = () => {
  try {
    return window.localStorage.getItem('nutri-local-session-user');
  } catch (e) {
    return null;
  }
};

const setLocalSession = (val: string) => {
  try {
    window.localStorage.setItem('nutri-local-session-user', val);
  } catch (e) {}
};

const clearLocalSession = () => {
  try {
    window.localStorage.removeItem('nutri-local-session-user');
  } catch (e) {}
};

const DEFAULT_DIRECT_GUEST: User = {
  uid: 'guest-direct-user',
  email: 'usuario@nutriai.com',
  displayName: 'Usuário NutriAI',
  emailVerified: true,
  providerData: [{ providerId: 'password', email: 'usuario@nutriai.com', displayName: 'Usuário NutriAI', uid: 'guest-direct-user', phoneNumber: null, photoURL: null }]
} as unknown as User;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    let resolved = false;

    // Timeout fallback for sandboxed/blocked environments
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        const currentLocal = getLocalSession();
        if (currentLocal) {
          try {
            setUser(JSON.parse(currentLocal));
            setIsLocal(true);
          } catch (e) {
            setUser(DEFAULT_DIRECT_GUEST);
            setIsLocal(true);
          }
        } else {
          setUser(DEFAULT_DIRECT_GUEST);
          setIsLocal(true);
        }
        setLoading(false);
      }
    }, 1000);

    // Check active local session first
    const localUserStr = getLocalSession();
    if (localUserStr) {
      try {
        const localUser = JSON.parse(localUserStr);
        setUser(localUser);
        setIsLocal(true);
        resolved = true;
        clearTimeout(timeoutId);
        setLoading(false);
        return;
      } catch (e) {
        clearLocalSession();
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      resolved = true;
      clearTimeout(timeoutId);
      
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsLocal(false);
        clearLocalSession();
      } else {
        const currentLocal = getLocalSession();
        if (currentLocal) {
          try {
            setUser(JSON.parse(currentLocal));
            setIsLocal(true);
          } catch (e) {
            setUser(DEFAULT_DIRECT_GUEST);
            setIsLocal(true);
          }
        } else {
          // Enter directly with direct guest session
          setUser(DEFAULT_DIRECT_GUEST);
          setIsLocal(true);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error('Firebase Auth initialization error:', error);
      resolved = true;
      clearTimeout(timeoutId);
      setUser(DEFAULT_DIRECT_GUEST);
      setIsLocal(true);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const loginLocally = (name: string, email: string) => {
    const mockUser = {
      uid: 'local-user-' + Math.random().toString(36).substring(2, 9),
      email,
      displayName: name,
      emailVerified: true,
      providerData: [{ providerId: 'password', email, displayName: name, uid: 'local', phoneNumber: null, photoURL: null }]
    } as unknown as User;
    
    setLocalSession(JSON.stringify(mockUser));
    setUser(mockUser);
    setIsLocal(true);
  };

  const logoutLocally = async () => {
    clearLocalSession();
    setUser(null);
    setIsLocal(false);
    try {
      await firebaseSignOut(auth);
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginLocally, logoutLocally, isLocal }}>
      {children}
    </AuthContext.Provider>
  );
};
