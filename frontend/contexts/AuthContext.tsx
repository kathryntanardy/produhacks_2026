// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../constants/firebase';

type BackendUser = {
  id: number;
  firebase_uid: string;
  name: string;
  email: string;
  rank: number;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  backendUser: BackendUser | null;
  syncBackendUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  backendUser: null,
  syncBackendUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);

  const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:5001';

  const saveProfileToFirestore = async (firebaseUser: User) => {
    const profileRef = doc(db, 'users', firebaseUser.uid);
    await setDoc(
      profileRef,
      {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        displayName: firebaseUser.displayName ?? '',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const syncBackendUser = async () => {
    if (!auth.currentUser) {
      setBackendUser(null);
      return;
    }

    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch(`${apiBaseUrl}/auth/firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        name: auth.currentUser.displayName ?? '',
        email: auth.currentUser.email ?? '',
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.error || 'Failed syncing user with backend');
    }

    const payload = await response.json();
    setBackendUser(payload.user ?? null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setBackendUser(null);
        setLoading(false);
        return;
      }

      try {
        await saveProfileToFirestore(firebaseUser);
      } catch (error) {
        console.warn('Firestore profile sync warning:', error);
      }

      try {
        await syncBackendUser();
      } catch (error) {
        console.warn('Backend user sync warning:', error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, backendUser, syncBackendUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);