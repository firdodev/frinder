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
    <div className='min-h-screen bg-black flex flex-col items-center justify-center'>
      {/* Animated Logo */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', duration: 1, bounce: 0.5 }}
        className='relative mb-8'
      >
        {/* Pulsing ring */}
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className='absolute inset-0 w-24 h-24 rounded-full border-4 border-frinder-orange'
        />
        {/* Second ring offset */}
        <motion.div
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.3, 0, 0.3]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          className='absolute inset-0 w-24 h-24 rounded-full border-2 border-frinder-gold'
        />
        {/* Logo container */}
        <div className='w-24 h-24 rounded-full bg-frinder-orange flex items-center justify-center shadow-2xl shadow-frinder-orange/50'>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <Heart className='w-12 h-12 text-white' fill='white' />
          </motion.div>
        </div>
      </motion.div>
      
      {/* Brand name */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className='text-3xl font-bold text-frinder-orange mb-4'
      >
        Frinder
      </motion.h1>
      
      {/* Loading dots */}
      <div className='flex items-center gap-2'>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              y: [-4, 4, -4],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut'
            }}
            className='w-3 h-3 rounded-full bg-frinder-gold'
          />
        ))}
      </div>
      
      {/* Loading text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className='text-white/60 text-sm mt-6'
      >
        Finding your perfect match...
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

  // Logged in but no username - show auth page for profile completion
  if (!userProfile?.username) {
    return <AuthPage />;
  }

  // Logged in but profile not complete - show profile setup (bio, photos, etc.)
  if (!userProfile?.isProfileComplete) {
    return <ProfileSetup />;
  }

  // Logged in with complete profile - show main app
  return <MainApp />;
}
