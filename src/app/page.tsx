'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthPage from '@/components/auth/AuthPage';
import ProfileSetup from '@/components/profile/ProfileSetup';
import MainApp from '@/components/layout/MainApp';
import LandingPage from '@/components/landing/LandingPage';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className='min-h-screen bg-[#ed8c00] flex flex-col items-center justify-center'>
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className='w-20 h-20 rounded-full bg-white shadow-2xl flex items-center justify-center mb-4'
      >
        <Heart className='w-10 h-10 text-[#ed8c00]' fill='#ed8c00' />
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='text-white text-lg font-medium'>
        Loading...
      </motion.p>
    </div>
  );
}

export default function Home() {
  const { user, userProfile, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return <LoadingScreen />;
  }

  // Not logged in - show landing page or auth page
  if (!user) {
    if (showAuth) {
      return <AuthPage onBack={() => setShowAuth(false)} />;
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  // Logged in but email not verified - stay in auth page for verification
  if (!userProfile?.isEmailVerified) {
    return <AuthPage onBack={() => setShowAuth(false)} />;
  }

  // Logged in but profile not complete - show profile setup
  if (!userProfile?.isProfileComplete) {
    return <ProfileSetup />;
  }

  // Logged in with complete profile - show main app
  return <MainApp />;
}
