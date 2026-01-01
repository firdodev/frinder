'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion';
import { Heart, X, Star, RotateCcw, Info, MapPin, Briefcase, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { getUsersToSwipe, recordSwipe } from '@/lib/firebaseServices';

interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  photos: string[];
  interests: string[];
  distance?: string;
  course?: string;
}

function SwipeCard({
  profile,
  onSwipe,
  isTop
}: {
  profile: Profile;
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  isTop: boolean;
}) {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const superLikeOpacity = useTransform(y, [-100, 0], [1, 0]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 100;
      const velocityThreshold = 500;

      if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
        onSwipe('right');
      } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
        onSwipe('left');
      } else if (info.offset.y < -threshold || info.velocity.y < -velocityThreshold) {
        onSwipe('up');
      }
    },
    [onSwipe]
  );

  const nextPhoto = () => {
    if (currentPhoto < profile.photos.length - 1) {
      setCurrentPhoto(currentPhoto + 1);
    }
  };

  const prevPhoto = () => {
    if (currentPhoto > 0) {
      setCurrentPhoto(currentPhoto - 1);
    }
  };

  return (
    <motion.div
      className={`absolute w-full h-full ${isTop ? 'z-10' : 'z-0'}`}
      style={{ x, y, rotate }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.5 }}
      animate={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.5 }}
    >
      <div className='w-full h-full rounded-3xl overflow-hidden bg-card shadow-2xl relative swipe-card'>
        {/* Photo */}
        <div className='relative w-full h-full'>
          <AnimatePresence mode='wait'>
            <motion.img
              key={currentPhoto}
              src={profile.photos[currentPhoto] || '/placeholder-avatar.png'}
              alt={profile.name}
              className='w-full h-full object-cover'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </AnimatePresence>

          {/* Photo indicators */}
          {profile.photos.length > 1 && (
            <div className='absolute top-4 left-4 right-4 flex gap-1'>
              {profile.photos.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    i === currentPhoto ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Photo navigation areas */}
          <div className='absolute inset-0 flex'>
            <div className='w-1/2 h-full' onClick={prevPhoto} />
            <div className='w-1/2 h-full' onClick={nextPhoto} />
          </div>

          {/* Like/Nope/Super Like indicators */}
          <motion.div className='absolute top-16 sm:top-20 left-4 sm:left-8 rotate-[-20deg]' style={{ opacity: likeOpacity }}>
            <div className='border-4 border-green-500 text-green-500 text-2xl sm:text-4xl font-bold px-3 sm:px-4 py-1 sm:py-2 rounded-lg'>LIKE</div>
          </motion.div>

          <motion.div className='absolute top-16 sm:top-20 right-4 sm:right-8 rotate-[20deg]' style={{ opacity: nopeOpacity }}>
            <div className='border-4 border-red-500 text-red-500 text-2xl sm:text-4xl font-bold px-3 sm:px-4 py-1 sm:py-2 rounded-lg'>NOPE</div>
          </motion.div>

          <motion.div className='absolute top-16 sm:top-20 left-1/2 -translate-x-1/2' style={{ opacity: superLikeOpacity }}>
            <div className='border-4 border-blue-500 text-blue-500 text-xl sm:text-4xl font-bold px-2 sm:px-4 py-1 sm:py-2 rounded-lg whitespace-nowrap'>
              SUPER LIKE
            </div>
          </motion.div>

          {/* Overlay for text readability */}
          <div className='absolute inset-x-0 bottom-0 h-2/3 bg-black/50' />

          {/* Profile info */}
          <div className='absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white'>
            <div className='flex items-end justify-between'>
              <div className='flex-1'>
                <h2 className='text-2xl sm:text-3xl font-bold mb-1'>
                  {profile.name}, {profile.age}
                </h2>
                {profile.course && (
                  <div className='flex items-center gap-2 text-white/80 mb-1'>
                    <Briefcase className='w-3 h-3 sm:w-4 sm:h-4' />
                    <span className='text-xs sm:text-sm'>{profile.course}</span>
                  </div>
                )}
                {profile.distance && (
                  <div className='flex items-center gap-2 text-white/80'>
                    <MapPin className='w-3 h-3 sm:w-4 sm:h-4' />
                    <span className='text-xs sm:text-sm'>{profile.distance}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className='w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center'
              >
                <Info className='w-4 h-4 sm:w-5 sm:h-5' />
              </button>
            </div>

            {/* Expanded info */}
            <AnimatePresence>
              {showInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className='mt-3 sm:mt-4 overflow-hidden'
                >
                  <p className='text-white/90 mb-2 sm:mb-3 text-sm sm:text-base'>{profile.bio}</p>
                  <div className='flex flex-wrap gap-1.5 sm:gap-2'>
                    {profile.interests.map(interest => (
                      <Badge key={interest} variant='secondary' className='bg-white/20 text-white border-0 text-xs sm:text-sm'>
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SwipePeople() {
  const { user, userProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastAction, setLastAction] = useState<{ profile: Profile; direction: string } | null>(null);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [showMatchDialog, setShowMatchDialog] = useState(false);

  // Load users to swipe from Firebase
  useEffect(() => {
    async function loadProfiles() {
      if (!user?.uid || !userProfile) return;

      try {
        setLoading(true);
        const users = await getUsersToSwipe(user.uid, userProfile);

        // Map Firebase user profiles to our Profile interface
        const mappedProfiles: Profile[] = users.map((u: any) => ({
          id: u.uid || u.id,
          name: u.displayName || u.name,
          age: u.age,
          bio: u.bio,
          photos: u.photos && u.photos.length > 0 ? u.photos : ['/placeholder-avatar.png'],
          interests: u.interests || [],
          course: u.city ? `${u.city}, ${u.country}` : '',
          distance: u.city === userProfile.city ? 'Same city' : u.country === userProfile.country ? 'Same country' : ''
        }));

        setProfiles(mappedProfiles);
      } catch (error) {
        console.error('Error loading profiles:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfiles();
  }, [user?.uid, userProfile]);

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right' | 'up') => {
      if (!user?.uid || profiles.length === 0) return;

      const currentProfile = profiles[0];
      setLastAction({ profile: currentProfile, direction });

      // Remove the swiped profile from UI immediately
      setProfiles(prev => prev.slice(1));

      try {
        // Record swipe to Firebase
        const swipeDirection = direction === 'up' ? 'superlike' : direction;

        const result = await recordSwipe(user.uid, currentProfile.id, swipeDirection);

        if (result.isMatch && (direction === 'right' || direction === 'up')) {
          // It's a match!
          setMatchedProfile(currentProfile);
          setShowMatchDialog(true);
        }
      } catch (error) {
        console.error('Error recording swipe:', error);
      }
    },
    [profiles, user?.uid]
  );

  const handleUndo = () => {
    if (lastAction) {
      setProfiles(prev => [lastAction.profile, ...prev]);
      setLastAction(null);
    }
  };

  const handleButtonSwipe = (direction: 'left' | 'right' | 'up') => {
    if (profiles.length > 0) {
      handleSwipe(direction);
    }
  };

  if (loading) {
    return (
      <div className='h-full flex items-center justify-center dark:bg-gray-900'>
        <div className='text-center'>
          <Loader2 className='w-12 h-12 animate-spin text-[#ed8c00] mx-auto mb-4' />
          <p className='text-muted-foreground'>Finding people near you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col dark:bg-gray-900'>
      {/* Match Dialog */}
      <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
        <DialogContent className='sm:max-w-md text-center mx-4 dark:bg-gray-800'>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.5 }}>
            <div className='py-4 sm:py-6'>
              <div className='flex justify-center items-center gap-2 sm:gap-4 mb-4 sm:mb-6'>
                <Avatar className='w-16 h-16 sm:w-24 sm:h-24 border-4 border-[#ed8c00]'>
                  <AvatarImage src={userProfile?.photos?.[0] || '/placeholder-avatar.png'} />
                  <AvatarFallback className='text-xl sm:text-2xl bg-[#ed8c00] text-white'>
                    {userProfile?.displayName?.charAt(0) || 'Y'}
                  </AvatarFallback>
                </Avatar>
                <Heart className='w-8 h-8 sm:w-10 sm:h-10 text-[#ed8c00]' fill='currentColor' />
                <Avatar className='w-16 h-16 sm:w-24 sm:h-24 border-4 border-[#ed8c00]'>
                  <AvatarImage src={matchedProfile?.photos[0] || '/placeholder-avatar.png'} />
                  <AvatarFallback className='text-xl sm:text-2xl bg-[#ed8c00] text-white'>
                    {matchedProfile?.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <h2 className='text-2xl sm:text-3xl font-bold text-[#ed8c00] mb-2'>It&apos;s a Match!</h2>
              <p className='text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base'>You and {matchedProfile?.name} liked each other</p>
              <div className='flex gap-3 sm:gap-4 justify-center'>
                <Button variant='outline' onClick={() => setShowMatchDialog(false)} className='text-sm dark:border-gray-600 dark:hover:bg-gray-700'>
                  Keep Swiping
                </Button>
                <Button
                  className='bg-[#ed8c00] hover:bg-[#cc5d00] text-white text-sm'
                  onClick={() => setShowMatchDialog(false)}
                >
                  Send Message
                </Button>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Cards stack */}
      <div className='flex-1 relative px-3 sm:px-4 pt-2 sm:pt-4 pb-2 sm:pb-4'>
        {profiles.length > 0 ? (
          <div className='relative w-full h-full max-w-md mx-auto'>
            {profiles.slice(0, 2).map((profile, index) => (
              <SwipeCard key={profile.id} profile={profile} onSwipe={handleSwipe} isTop={index === 0} />
            ))}
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center h-full text-center px-6 sm:px-8'>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className='w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#ed8c00]/10 flex items-center justify-center mb-4 sm:mb-6'
            >
              <Heart className='w-10 h-10 sm:w-12 sm:h-12 text-[#ed8c00]' />
            </motion.div>
            <h2 className='text-xl sm:text-2xl font-bold mb-2 dark:text-white'>No more people</h2>
            <p className='text-muted-foreground text-sm sm:text-base'>Check back later for more potential matches!</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {profiles.length > 0 && (
        <div className='px-4 pb-4 sm:pb-6'>
          <div className='flex items-center justify-center gap-2 sm:gap-4 max-w-md mx-auto'>
            {/* Undo */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleUndo}
              disabled={!lastAction}
              className='w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center disabled:opacity-30 border border-muted dark:border-gray-700'
            >
              <RotateCcw className='w-4 h-4 sm:w-5 sm:h-5 text-[#ffb100]' />
            </motion.button>

            {/* Nope */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleButtonSwipe('left')}
              className='w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center border-2 border-red-100 dark:border-red-900'
            >
              <X className='w-6 h-6 sm:w-8 sm:h-8 text-red-500' />
            </motion.button>

            {/* Super Like */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleButtonSwipe('up')}
              className='w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center border border-muted dark:border-gray-700'
            >
              <Star className='w-5 h-5 sm:w-6 sm:h-6 text-blue-500' fill='currentColor' />
            </motion.button>

            {/* Like */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleButtonSwipe('right')}
              className='w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center border-2 border-green-100 dark:border-green-900'
            >
              <Heart className='w-6 h-6 sm:w-8 sm:h-8 text-green-500' fill='currentColor' />
            </motion.button>

            {/* Boost placeholder */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className='w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center border border-muted dark:border-gray-700'
            >
              <svg className='w-5 h-5 sm:w-6 sm:h-6 text-[#cc5d00]' viewBox='0 0 24 24' fill='currentColor'>
                <path d='M13 3L4 14h7l-1 7 9-11h-7l1-7z' />
              </svg>
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
