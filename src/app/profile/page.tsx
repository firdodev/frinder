'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import {
  ArrowLeft,
  MapPin,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function ProfileViewPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { darkMode } = useSettings();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const profile = {
    displayName: userProfile?.displayName || 'User',
    age: userProfile?.age || 0,
    bio: userProfile?.bio || '',
    city: userProfile?.city || '',
    country: userProfile?.country || '',
    photos: userProfile?.photos || [],
    interests: userProfile?.interests || [],
    relationshipGoal: userProfile?.relationshipGoal || 'relationship'
  };

  const location = profile.city && profile.country 
    ? `${profile.city}, ${profile.country}` 
    : profile.city || profile.country || '';

  const getRelationshipGoalText = () => {
    switch (profile.relationshipGoal) {
      case 'relationship': return '💕 Looking for a relationship';
      case 'casual': return '😎 Something casual';
      case 'friends': return '🤝 Just making friends';
      default: return '';
    }
  };

  const handlePrevPhoto = () => {
    setCurrentPhotoIndex((prev) => 
      prev === 0 ? profile.photos.length - 1 : prev - 1
    );
  };

  const handleNextPhoto = () => {
    setCurrentPhotoIndex((prev) => 
      prev === profile.photos.length - 1 ? 0 : prev + 1
    );
  };

  const handleClose = () => {
    router.back();
  };

  if (!userProfile) {
    return (
      <div className='fixed inset-0 bg-black flex items-center justify-center'>
        <p className='text-white'>Loading...</p>
      </div>
    );
  }

  return (
    <div className='fixed inset-0 w-screen h-screen bg-black overflow-hidden'>
      {/* Photo viewer */}
      <div className='relative h-full w-full'>
        {/* Photos */}
        <AnimatePresence mode='wait'>
          {profile.photos.length > 0 && (
            <motion.img
              key={currentPhotoIndex}
              src={profile.photos[currentPhotoIndex]}
              alt={`Photo ${currentPhotoIndex + 1}`}
              className='w-full h-full object-cover'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Gradient overlay */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40' />

        {/* Top bar */}
        <div className='absolute top-0 left-0 right-0 p-4 flex items-center justify-between'>
          <button
            onClick={handleClose}
            className='w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center'
          >
            <ArrowLeft className='w-5 h-5 text-white' />
          </button>
          
          {/* Photo indicators */}
          {profile.photos.length > 1 && (
            <div className='flex gap-1'>
              {profile.photos.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 rounded-full transition-all ${
                    index === currentPhotoIndex
                      ? 'w-6 bg-white'
                      : 'w-1 bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
          
          <div className='w-10' /> {/* Spacer for alignment */}
        </div>

        {/* Photo navigation - tap zones */}
        {profile.photos.length > 1 && (
          <>
            <button
              onClick={handlePrevPhoto}
              className='absolute left-0 top-20 bottom-40 w-1/3 flex items-center justify-start pl-2'
            >
              <div className='w-8 h-8 rounded-full bg-black/20 backdrop-blur flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity'>
                <ChevronLeft className='w-5 h-5 text-white' />
              </div>
            </button>
            <button
              onClick={handleNextPhoto}
              className='absolute right-0 top-20 bottom-40 w-1/3 flex items-center justify-end pr-2'
            >
              <div className='w-8 h-8 rounded-full bg-black/20 backdrop-blur flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity'>
                <ChevronRight className='w-5 h-5 text-white' />
              </div>
            </button>
          </>
        )}

        {/* Profile info */}
        <div className='absolute bottom-0 left-0 right-0 p-6'>
          <div className='flex items-center gap-2 mb-2'>
            <h1 className='text-3xl font-bold text-white'>
              {profile.displayName}, {profile.age}
            </h1>
          </div>

          {location && (
            <div className='flex items-center gap-2 text-white/80 mb-2'>
              <MapPin className='w-4 h-4' />
              <span>{location}</span>
            </div>
          )}

          {profile.relationshipGoal && (
            <div className='mb-3'>
              <span className='px-3 py-1 rounded-full bg-frinder-orange/80 text-white text-sm'>
                {getRelationshipGoalText()}
              </span>
            </div>
          )}

          {profile.bio && (
            <p className='text-white/90 mb-4'>{profile.bio}</p>
          )}

          {profile.interests && profile.interests.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {profile.interests.map((interest, index) => (
                <span
                  key={index}
                  className='px-3 py-1 rounded-full bg-white/20 backdrop-blur text-white text-sm'
                >
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
