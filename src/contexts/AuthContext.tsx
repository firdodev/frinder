'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  bio: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  city: string;
  country: string;
  photos: string[];
  interests: string[];
  lookingFor: 'people' | 'groups' | 'both';
  createdAt: Date;
  isProfileComplete: boolean;
  isEmailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_EMAIL_DOMAIN = '@universitetipolis.edu.al';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setUser(user);
      if (user) {
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data() as UserProfile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const validateEmail = (email: string): boolean => {
    return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
  };

  const signIn = async (email: string, password: string) => {
    if (!validateEmail(email)) {
      throw new Error(`Only ${ALLOWED_EMAIL_DOMAIN} email addresses are allowed`);
    }
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    if (!validateEmail(email)) {
      throw new Error(`Only ${ALLOWED_EMAIL_DOMAIN} email addresses are allowed`);
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);

    // Create initial profile
    const initialProfile: UserProfile = {
      uid: userCredential.user.uid,
      email: email,
      displayName: '',
      bio: '',
      age: 18,
      gender: 'other',
      city: '',
      country: '',
      photos: [],
      interests: [],
      lookingFor: 'both',
      createdAt: new Date(),
      isProfileComplete: false,
      isEmailVerified: false
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), initialProfile);
    setUserProfile(initialProfile);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    const updatedProfile = { ...userProfile, ...data } as UserProfile;
    await setDoc(doc(db, 'users', user.uid), updatedProfile);
    setUserProfile(updatedProfile);
  };

  const deleteAccount = async (password: string) => {
    if (!user || !user.email) throw new Error('No user logged in');

    try {
      // Re-authenticate user before deleting
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      const userId = user.uid;

      // Delete user's photos from storage
      try {
        const photosRef = ref(storage, `users/${userId}/photos`);
        const photosList = await listAll(photosRef);
        await Promise.all(photosList.items.map(item => deleteObject(item)));
      } catch (e) {
        // Photos folder might not exist
        console.log('No photos to delete or error:', e);
      }

      // Delete user's swipes
      const swipesQuery = query(collection(db, 'swipes'), where('fromUserId', '==', userId));
      const swipesSnapshot = await getDocs(swipesQuery);
      const batch = writeBatch(db);
      swipesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      // Delete user profile from Firestore
      await deleteDoc(doc(db, 'users', userId));

      // Delete Firebase Auth user
      await deleteUser(user);

      setUserProfile(null);
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signIn, signUp, signOut, updateProfile, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
