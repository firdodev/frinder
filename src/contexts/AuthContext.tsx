'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { updateUserProfileInMatches } from '@/lib/firebaseServices';
import { checkRateLimit, sanitizeProfileData } from '@/lib/security';

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
  relationshipGoal: 'relationship' | 'casual' | 'friends';
  createdAt: Date;
  isProfileComplete: boolean;
  isEmailVerified: boolean;
  emailNotifications?: boolean;
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
  resetPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_EMAIL_DOMAIN = '@universitetipolis.edu.al';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Update user presence when online/offline
  const updatePresence = async (userId: string, isOnline: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isOnline,
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setUser(user);
      if (user) {
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data() as UserProfile);
        }
        // Set user as online
        await updatePresence(user.uid, true);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle visibility change and beforeunload for presence
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence(user.uid, true);
      } else {
        updatePresence(user.uid, false);
      }
    };

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline status on page close
      const data = JSON.stringify({ isOnline: false });
      navigator.sendBeacon?.(`/api/presence?userId=${user.uid}`, data);
      // Fallback: direct update (may not always complete)
      updatePresence(user.uid, false);
    };

    // Set online when window gains focus
    const handleFocus = () => {
      updatePresence(user.uid, true);
    };

    // Set offline when window loses focus (optional - can be too aggressive)
    // const handleBlur = () => {
    //   updatePresence(user.uid, false);
    // };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);

    // Set online immediately
    updatePresence(user.uid, true);

    // Heartbeat to keep online status fresh (every 30 seconds)
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updatePresence(user.uid, true);
      }
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      clearInterval(heartbeatInterval);
      // Set offline when component unmounts
      updatePresence(user.uid, false);
    };
  }, [user]);

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
      relationshipGoal: 'friends',
      createdAt: new Date(),
      isProfileComplete: false,
      isEmailVerified: false
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), initialProfile);
    setUserProfile(initialProfile);
  };

  const signOut = async () => {
    if (user) {
      // Set offline before signing out
      await updatePresence(user.uid, false);
    }
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    if (!validateEmail(email)) {
      throw new Error(`Only ${ALLOWED_EMAIL_DOMAIN} email addresses are allowed`);
    }

    // Rate limit password reset requests
    const { allowed, resetIn } = checkRateLimit(email, 'passwordReset');
    if (!allowed) {
      const resetInMinutes = Math.ceil(resetIn / 60000);
      throw new Error(`Too many reset attempts. Please try again in ${resetInMinutes} minute(s).`);
    }

    // Generate password reset link using Firebase
    const actionCodeSettings = {
      url: window.location.origin,
      handleCodeInApp: false
    };
    let resetLink = '';
    try {
      // Dynamically import to avoid SSR issues
      const { getAuth, sendPasswordResetEmail } = await import('firebase/auth');
      const authInstance = getAuth();
      // Firebase does not return the link, so we need to use the Admin SDK for custom links.
      // As a workaround, use the default Firebase reset email, but send a custom email via API.
      // Here, we construct the link manually for the custom email (for production, use Admin SDK).
      resetLink = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`;
      // But for now, use the default reset link pattern:
      // (This is a placeholder; in production, use the Admin SDK to generate the link)
      resetLink = `${window.location.origin}/reset-password?email=${encodeURIComponent(email)}`;
    } catch (e) {
      // fallback
      resetLink = `${window.location.origin}/reset-password?email=${encodeURIComponent(email)}`;
    }

    // Call the API route to send the email
    const res = await fetch('/api/send-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, resetLink })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send password reset email.');
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    // Rate limit profile updates
    const { allowed, resetIn } = checkRateLimit(user.uid, 'profileUpdate');
    if (!allowed) {
      const resetInSeconds = Math.ceil(resetIn / 1000);
      throw new Error(`Please wait ${resetInSeconds} seconds before updating again.`);
    }

    // Sanitize profile data
    const sanitizedData = sanitizeProfileData(data) as Partial<UserProfile>;

    const updatedProfile = { ...userProfile, ...sanitizedData } as UserProfile;
    await setDoc(doc(db, 'users', user.uid), updatedProfile);
    setUserProfile(updatedProfile);

    // Update profile in all matches (async, non-blocking)
    updateUserProfileInMatches(user.uid, sanitizedData).catch(console.error);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) throw new Error('No user logged in');

    // Validate new password
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }

    // Rate limit password changes
    const { allowed, resetIn } = checkRateLimit(user.uid, 'passwordChange');
    if (!allowed) {
      const resetInMinutes = Math.ceil(resetIn / 60000);
      throw new Error(`Too many attempts. Please try again in ${resetInMinutes} minute(s).`);
    }

    // Re-authenticate user before changing password
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);
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

      // Instead of deleting the user profile, mark as deleted and set photo to black
      await setDoc(doc(db, 'users', userId), {
        isDeleted: true,
        photos: [
          'solid-black'
        ],
        displayName: 'Deleted User',
        bio: '',
        age: null,
        gender: 'other',
        city: '',
        country: '',
        interests: [],
        lookingFor: 'both',
        relationshipGoal: 'friends',
        createdAt: new Date(),
        isProfileComplete: false,
        isEmailVerified: false,
        email: '',
        uid: userId
      }, { merge: true });

      // Delete Firebase Auth user
      await deleteUser(user);

      setUserProfile(null);
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, userProfile, loading, signIn, signUp, signOut, updateProfile, deleteAccount, resetPassword, changePassword }}
    >
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
