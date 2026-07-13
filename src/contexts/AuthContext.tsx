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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    let resolved = false;

    // In iframe, sandboxed, or cookie-blocked environments, Firebase Auth initialization can hang.
    // We set a 1.5-second fallback timeout to guarantee the application loads.
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        console.warn('Firebase Auth initialization timed out. Proceeding with fallback local guest check.');
        
        // Try to load any local user, else let the screen render (which will show the Login page)
        const currentLocal = localStorage.getItem('nutri-local-session-user');
        if (currentLocal) {
          try {
            setUser(JSON.parse(currentLocal));
            setIsLocal(true);
          } catch (e) {
            setUser(null);
            setIsLocal(false);
          }
        } else {
          setUser(null);
          setIsLocal(false);
        }
        setLoading(false);
      }
    }, 1500);

    // Check if there is an active local session first (super fast)
    const localUserStr = localStorage.getItem('nutri-local-session-user');
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
        localStorage.removeItem('nutri-local-session-user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      resolved = true;
      clearTimeout(timeoutId);

      if (firebaseUser) {
        setUser(firebaseUser);
        setIsLocal(false);
        // Clear local session if we got a real Firebase user
        localStorage.removeItem('nutri-local-session-user');
      } else {
        // If they logged out from firebase, we should also log out locally
        const currentLocal = localStorage.getItem('nutri-local-session-user');
        if (currentLocal) {
          try {
            setUser(JSON.parse(currentLocal));
            setIsLocal(true);
          } catch (e) {
            setUser(null);
            setIsLocal(false);
          }
        } else {
          setUser(null);
          setIsLocal(false);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error('Firebase Auth initialization error:', error);
      resolved = true;
      clearTimeout(timeoutId);
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

    localStorage.setItem('nutri-local-session-user', JSON.stringify(mockUser));
    setUser(mockUser);
    setIsLocal(true);
  };

  const logoutLocally = async () => {
    localStorage.removeItem('nutri-local-session-user');
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
