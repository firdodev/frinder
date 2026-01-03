'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import { Heart, X, Star, RotateCcw, Info, MapPin, Briefcase, Loader2, Sparkles, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { getUsersToSwipe, recordSwipe } from '@/lib/firebaseServices';
import { toast } from 'sonner';

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

// Mock data for development
const MOCK_PROFILES: Profile[] = [
  {
    id: 'mock-1',
    name: 'Emma',
    age: 24,
    bio: 'Coffee enthusiast ☕ | Love hiking and photography 📸 | Looking for genuine connections',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
    ],
    interests: ['Photography', 'Hiking', 'Coffee', 'Travel', 'Art'],
    distance: '2 km away',
    course: 'New York, USA'
  },
  {
    id: 'mock-2',
    name: 'Alex',
    age: 26,
    bio: 'Software developer by day, musician by night 🎸 | Always up for an adventure',
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
    ],
    interests: ['Music', 'Coding', 'Gaming', 'Fitness', 'Movies'],
    distance: '5 km away',
    course: 'San Francisco, USA'
  },
  {
    id: 'mock-3',
    name: 'Sofia',
    age: 23,
    bio: 'Foodie exploring the city one restaurant at a time 🍕 | Yoga lover 🧘‍♀️',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
    ],
    interests: ['Food', 'Yoga', 'Cooking', 'Wellness', 'Fashion'],
    distance: '3 km away',
    course: 'Los Angeles, USA'
  },
  {
    id: 'mock-4',
    name: 'Marcus',
    age: 28,
    bio: 'Entrepreneur & fitness junkie 💪 | Let\'s grab a coffee and talk about life',
    photos: [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
    ],
    interests: ['Business', 'Fitness', 'Startups', 'Networking', 'Coffee'],
    distance: '8 km away',
    course: 'Austin, USA'
  },
  {
    id: 'mock-5',
    name: 'Luna',
    age: 25,
    bio: 'Artist 🎨 | Cat mom 🐱 | Believes in magic and good vibes ✨',
    photos: [
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800',
      'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=800',
    ],
    interests: ['Art', 'Cats', 'Reading', 'Nature', 'Spirituality'],
    distance: '1 km away',
    course: 'Portland, USA'
  },
  {
    id: 'mock-6',
    name: 'Jake',
    age: 27,
    bio: 'Travel addict 🌍 | 30 countries and counting | Photography is my passion',
    photos: [
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800',
    ],
    interests: ['Travel', 'Photography', 'Adventure', 'Languages', 'Camping'],
    distance: '4 km away',
    course: 'Denver, USA'
  },
];

// Check if running in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Firework particle for celebration
function Firework({ delay, x, color }: { delay: number; x: number; color: string }) {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i * 30) * (Math.PI / 180),
  }));

  return (
    <motion.div
      className='absolute'
      style={{ left: `${x}%`, top: '60%' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ delay, duration: 1.5, times: [0, 0.1, 0.8, 1] }}
    >
      {/* Launch trail */}
      <motion.div
        className='absolute w-1 h-16 rounded-full'
        style={{ backgroundColor: color, left: '50%', transform: 'translateX(-50%)' }}
        initial={{ opacity: 0, y: 200, scaleY: 1 }}
        animate={{ opacity: [0, 1, 0], y: [200, 0, 0], scaleY: [1, 1, 0] }}
        transition={{ delay, duration: 0.4 }}
      />
      {/* Explosion particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className='absolute w-3 h-3 rounded-full'
          style={{ backgroundColor: color }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{
            x: Math.cos(particle.angle) * 100,
            y: Math.sin(particle.angle) * 100,
            opacity: [0, 1, 1, 0],
            scale: [0, 1.5, 1, 0],
          }}
          transition={{ delay: delay + 0.4, duration: 1, ease: 'easeOut' }}
        />
      ))}
    </motion.div>
  );
}

// Fireworks display for match celebration
function FireworksDisplay() {
  const colors = ['#ed8c00', '#ffbe42', '#ff6b6b', '#4ade80', '#3b82f6', '#ffffff'];
  const fireworks = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: 10 + Math.random() * 80,
    delay: Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  return (
    <div className='absolute inset-0 pointer-events-none overflow-hidden'>
      {fireworks.map((fw) => (
        <Firework key={fw.id} delay={fw.delay} x={fw.x} color={fw.color} />
      ))}
      {/* Second wave of fireworks */}
      {fireworks.map((fw) => (
        <Firework key={`wave2-${fw.id}`} delay={fw.delay + 2.5} x={(fw.x + 40) % 100} color={colors[(fw.id + 2) % colors.length]} />
      ))}
      {/* Third wave */}
      {fireworks.map((fw) => (
        <Firework key={`wave3-${fw.id}`} delay={fw.delay + 5} x={(fw.x + 20) % 100} color={colors[(fw.id + 4) % colors.length]} />
      ))}
    </div>
  );
}

// Floating heart animation for match celebration
function FloatingHearts() {
  const hearts = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    size: 16 + Math.random() * 24,
  }));

  return (
    <div className='absolute inset-0 pointer-events-none overflow-hidden'>
      {hearts.map((heart) => (
        <motion.div
          key={heart.id}
          className='absolute text-pink-500'
          initial={{ 
            x: `${heart.x}vw`, 
            y: '100vh',
            opacity: 0,
            scale: 0 
          }}
          animate={{ 
            y: '-20vh',
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1, 0.5],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ 
            duration: heart.duration,
            delay: heart.delay,
            repeat: Infinity,
            ease: 'easeOut'
          }}
        >
          <Heart size={heart.size} fill='currentColor' />
        </motion.div>
      ))}
    </div>
  );
}

// Full screen match celebration component
function MatchCelebration({
  show,
  onClose,
  userPhoto,
  userName,
  matchPhoto,
  matchName,
  onSendMessage,
  useFullScreen
}: {
  show: boolean;
  onClose: () => void;
  userPhoto: string;
  userName: string;
  matchPhoto: string;
  matchName: string;
  onSendMessage: () => void;
  useFullScreen: boolean;
}) {
  // Toast notification mode - useEffect must be at top level
  useEffect(() => {
    if (show && !useFullScreen) {
      toast.success(
        <div className='flex items-center gap-3'>
          <div className='flex -space-x-2'>
            <Avatar className='w-8 h-8 border-2 border-white'>
              <AvatarImage src={userPhoto} />
              <AvatarFallback className='bg-frinder-orange text-white text-xs'>{userName[0]}</AvatarFallback>
            </Avatar>
            <Avatar className='w-8 h-8 border-2 border-white'>
              <AvatarImage src={matchPhoto} />
              <AvatarFallback className='bg-frinder-orange text-white text-xs'>{matchName[0]}</AvatarFallback>
            </Avatar>
          </div>
          <div>
            <p className='font-bold'>It&apos;s a Match! 🎉</p>
            <p className='text-sm opacity-80'>You and {matchName} liked each other</p>
          </div>
        </div>,
        {
          duration: 5000,
          action: {
            label: 'Message',
            onClick: onSendMessage
          }
        }
      );
      onClose();
    }
  }, [show, useFullScreen, userPhoto, userName, matchPhoto, matchName, onSendMessage, onClose]);

  // Return nothing for toast mode or when not showing
  if (!show || !useFullScreen) return null;

  // Full screen celebration mode
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className='fixed inset-0 z-50 bg-black'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Flat orange background with pulsing overlay */}
          <div className='absolute inset-0 bg-frinder-orange' />
          <motion.div
            className='absolute inset-0 bg-frinder-burnt'
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {/* Fireworks */}
          <FireworksDisplay />

          {/* Content */}
          <div className='relative z-10 flex flex-col items-center justify-center h-full px-6'>
            {/* Sparkle effects */}
            <motion.div
              className='absolute'
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Sparkles className='w-32 h-32 text-white/20' />
            </motion.div>

            {/* Match text */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', duration: 0.8, bounce: 0.5 }}
              className='mb-8'
            >
              <h1 className='text-5xl sm:text-7xl font-black text-white text-center drop-shadow-2xl'>
                IT'S A
              </h1>
              <motion.h1
                className='text-6xl sm:text-8xl font-black text-white text-center drop-shadow-2xl'
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                MATCH!
              </motion.h1>
            </motion.div>

            {/* Avatars */}
            <motion.div
              className='flex items-center justify-center gap-4 sm:gap-6 mb-8'
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', bounce: 0.6 }}
            >
              <motion.div
                animate={{ x: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Avatar className='w-28 h-28 sm:w-36 sm:h-36 border-4 border-white shadow-2xl'>
                  <AvatarImage src={userPhoto} />
                  <AvatarFallback className='text-3xl bg-white text-frinder-orange font-bold'>
                    {userName[0]}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Heart className='w-12 h-12 sm:w-16 sm:h-16 text-white drop-shadow-xl' fill='currentColor' />
              </motion.div>

              <motion.div
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Avatar className='w-28 h-28 sm:w-36 sm:h-36 border-4 border-white shadow-2xl'>
                  <AvatarImage src={matchPhoto} />
                  <AvatarFallback className='text-3xl bg-white text-frinder-orange font-bold'>
                    {matchName[0]}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            </motion.div>

            {/* Match name */}
            <motion.p
              className='text-xl sm:text-2xl text-white/90 text-center mb-10'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              You and <span className='font-bold'>{matchName}</span> liked each other!
            </motion.p>

            {/* Buttons */}
            <motion.div
              className='flex flex-col sm:flex-row gap-4 w-full max-w-sm'
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                onClick={onSendMessage}
                className='flex-1 bg-white text-frinder-orange hover:bg-white/90 font-bold text-lg py-6 rounded-full shadow-xl'
              >
                <MessageCircle className='w-5 h-5 mr-2' />
                Send Message
              </Button>
              <Button
                onClick={onClose}
                variant='outline'
                className='flex-1 border-2 border-white text-white hover:bg-white/20 font-bold text-lg py-6 rounded-full bg-transparent'
              >
                Keep Swiping
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SwipeCard({
  profile,
  onSwipe,
  isTop,
  onButtonSwipe
}: {
  profile: Profile;
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  isTop: boolean;
  onButtonSwipe?: (direction: 'left' | 'right' | 'up') => void;
}) {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | null>(null);
  const controls = useAnimation();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // More dramatic rotation
  const rotate = useTransform(x, [-300, 0, 300], [-30, 0, 30]);
  
  // Full card overlay opacities with earlier trigger
  const likeOpacity = useTransform(x, [0, 50, 150], [0, 0.3, 1]);
  const nopeOpacity = useTransform(x, [-150, -50, 0], [1, 0.3, 0]);
  const superLikeOpacity = useTransform(y, [-150, -50, 0], [1, 0.3, 0]);
  
  // Card scale during drag
  const scale = useTransform(
    x,
    [-200, 0, 200],
    [0.95, 1, 0.95]
  );

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 80;
      const velocityThreshold = 400;

      if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
        setExitDirection('right');
        controls.start({
          x: 500,
          rotate: 30,
          opacity: 0,
          transition: { duration: 0.3, ease: 'easeOut' }
        }).then(() => onSwipe('right'));
      } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
        setExitDirection('left');
        controls.start({
          x: -500,
          rotate: -30,
          opacity: 0,
          transition: { duration: 0.3, ease: 'easeOut' }
        }).then(() => onSwipe('left'));
      } else if (info.offset.y < -threshold || info.velocity.y < -velocityThreshold) {
        setExitDirection('up');
        controls.start({
          y: -600,
          scale: 0.8,
          opacity: 0,
          transition: { duration: 0.4, ease: 'easeOut' }
        }).then(() => onSwipe('up'));
      } else {
        // Spring back
        controls.start({
          x: 0,
          y: 0,
          rotate: 0,
          scale: 1,
          transition: { type: 'spring', stiffness: 500, damping: 30 }
        });
      }
    },
    [onSwipe, controls]
  );

  // Button swipe animations
  const triggerButtonSwipe = useCallback((direction: 'left' | 'right' | 'up') => {
    setExitDirection(direction);
    if (direction === 'right') {
      controls.start({
        x: 500,
        rotate: 30,
        opacity: 0,
        transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] }
      }).then(() => onSwipe('right'));
    } else if (direction === 'left') {
      controls.start({
        x: -500,
        rotate: -30,
        opacity: 0,
        transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] }
      }).then(() => onSwipe('left'));
    } else {
      controls.start({
        y: -600,
        scale: 1.2,
        opacity: 0,
        transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] }
      }).then(() => onSwipe('up'));
    }
  }, [onSwipe, controls]);

  // Expose button swipe to parent
  useEffect(() => {
    if (onButtonSwipe && isTop) {
      // This is a hack to communicate with parent
      (window as any).__triggerSwipe = triggerButtonSwipe;
    }
    return () => {
      if ((window as any).__triggerSwipe === triggerButtonSwipe) {
        delete (window as any).__triggerSwipe;
      }
    };
  }, [triggerButtonSwipe, onButtonSwipe, isTop]);

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
      style={{ x, y, rotate, scale }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      animate={controls}
      initial={{ scale: isTop ? 1 : 0.95, opacity: 1 }}
      whileTap={{ cursor: 'grabbing' }}
    >
      <div className='w-full h-full rounded-3xl overflow-hidden bg-card shadow-2xl relative'>
        {/* Photo */}
        <div className='relative w-full h-full'>
          <AnimatePresence mode='wait'>
            <motion.img
              key={currentPhoto}
              src={profile.photos[currentPhoto] || '/placeholder-avatar.png'}
              alt={profile.name}
              className='w-full h-full object-cover'
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </AnimatePresence>

          {/* Photo indicators */}
          {profile.photos.length > 1 && (
            <div className='absolute top-4 left-4 right-4 flex gap-1 z-20'>
              {profile.photos.map((_, i) => (
                <motion.div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    i === currentPhoto ? 'bg-white' : 'bg-white/40'
                  }`}
                  initial={false}
                  animate={{ scaleX: i === currentPhoto ? 1 : 0.95 }}
                />
              ))}
            </div>
          )}

          {/* Photo navigation areas */}
          <div className='absolute inset-0 flex z-10'>
            <div className='w-1/2 h-full' onClick={prevPhoto} />
            <div className='w-1/2 h-full' onClick={nextPhoto} />
          </div>

          {/* LIKE overlay - Full card flat green */}
          {isTop && (
            <motion.div
              className='absolute inset-0 bg-green-500 flex items-center justify-center pointer-events-none z-30'
              style={{ opacity: likeOpacity }}
            >
              <motion.div 
                className='flex flex-col items-center'
              >
                <motion.div
                  className='w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4'
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <Heart className='w-12 h-12 sm:w-16 sm:h-16 text-white' fill='currentColor' />
                </motion.div>
                <span className='text-white text-4xl sm:text-6xl font-black tracking-wider drop-shadow-lg'>
                  LIKE
                </span>
              </motion.div>
            </motion.div>
          )}

          {/* NOPE overlay - Full card flat red */}
          {isTop && (
            <motion.div
              className='absolute inset-0 bg-red-500 flex items-center justify-center pointer-events-none z-30'
              style={{ opacity: nopeOpacity }}
            >
              <motion.div 
                className='flex flex-col items-center'
              >
                <motion.div
                  className='w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4'
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                >
                  <X className='w-12 h-12 sm:w-16 sm:h-16 text-white' strokeWidth={3} />
                </motion.div>
                <span className='text-white text-4xl sm:text-6xl font-black tracking-wider drop-shadow-lg'>
                  NOPE
                </span>
              </motion.div>
            </motion.div>
          )}

          {/* SUPER LIKE overlay - Full card flat blue */}
          {isTop && (
            <motion.div
              className='absolute inset-0 bg-blue-500 flex items-center justify-center pointer-events-none z-30'
              style={{ opacity: superLikeOpacity }}
            >
              <motion.div 
                className='flex flex-col items-center'
              >
                <motion.div
                  className='w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4'
                  animate={{ y: [0, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                >
                  <Star className='w-12 h-12 sm:w-16 sm:h-16 text-white' fill='currentColor' />
                </motion.div>
                <span className='text-white text-3xl sm:text-5xl font-black tracking-wider drop-shadow-lg'>
                  SUPER LIKE
                </span>
              </motion.div>
            </motion.div>
          )}

          {/* Dark overlay for text readability */}
          <div className='absolute inset-x-0 bottom-0 h-2/3 bg-black/60 pointer-events-none' />

          {/* Profile info */}
          <div className='absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white z-20'>
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
                onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
                className='w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors'
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
                    {profile.interests.filter(i => i).map((interest, index) => (
                      <Badge key={`${interest}-${index}`} variant='secondary' className='bg-white/20 text-white border-0 text-xs sm:text-sm backdrop-blur-sm'>
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
  const { notifications } = useSettings();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastAction, setLastAction] = useState<{ profile: Profile; direction: string } | null>(null);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [showMatchCelebration, setShowMatchCelebration] = useState(false);
  const [useFullScreenMatch, setUseFullScreenMatch] = useState(true);

  // Load settings for match notification preference
  useEffect(() => {
    const savedPreference = localStorage.getItem('frinder_fullScreenMatch');
    if (savedPreference !== null) {
      setUseFullScreenMatch(JSON.parse(savedPreference));
    }
  }, []);

  // Load users to swipe from Firebase (or mock data in development)
  useEffect(() => {
    async function loadProfiles() {
      // In development, use mock data for testing
      if (isDevelopment) {
        setLoading(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setProfiles(MOCK_PROFILES);
        setLoading(false);
        return;
      }

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
      if (profiles.length === 0) return;

      const currentProfile = profiles[0];
      setLastAction({ profile: currentProfile, direction });

      // Remove the swiped profile from UI immediately
      setProfiles(prev => prev.slice(1));

      // In development, simulate a match on every other right swipe
      if (isDevelopment) {
        if ((direction === 'right' || direction === 'up') && Math.random() > 0.5) {
          setMatchedProfile(currentProfile);
          setShowMatchCelebration(true);
        }
        return;
      }

      if (!user?.uid) return;

      try {
        // Record swipe to Firebase
        const swipeDirection = direction === 'up' ? 'superlike' : direction;

        const result = await recordSwipe(user.uid, currentProfile.id, swipeDirection);

        if (result.isMatch && (direction === 'right' || direction === 'up')) {
          // It's a match!
          setMatchedProfile(currentProfile);
          setShowMatchCelebration(true);
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
      // Trigger the card animation via window reference
      const triggerSwipe = (window as any).__triggerSwipe;
      if (triggerSwipe) {
        triggerSwipe(direction);
      } else {
        handleSwipe(direction);
      }
    }
  };

  if (loading) {
    return (
      <div className='h-full flex items-center justify-center dark:bg-black'>
        <div className='text-center'>
          <Loader2 className='w-12 h-12 animate-spin text-frinder-orange mx-auto mb-4' />
          <p className='text-muted-foreground'>Finding people near you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col dark:bg-black'>
      {/* Full Screen Match Celebration */}
      <MatchCelebration
        show={showMatchCelebration}
        onClose={() => setShowMatchCelebration(false)}
        userPhoto={userProfile?.photos?.[0] || '/placeholder-avatar.png'}
        userName={userProfile?.displayName || 'You'}
        matchPhoto={matchedProfile?.photos[0] || '/placeholder-avatar.png'}
        matchName={matchedProfile?.name || 'Someone'}
        onSendMessage={() => {
          setShowMatchCelebration(false);
          // TODO: Navigate to messages
        }}
        useFullScreen={useFullScreenMatch}
      />

      {/* Cards stack */}
      <div className='flex-1 relative px-3 sm:px-4 pt-2 sm:pt-4 pb-2 sm:pb-4 overflow-hidden'>
        {profiles.length > 0 ? (
          <div className='relative w-full h-full max-w-md mx-auto'>
            <AnimatePresence>
              {profiles.slice(0, 2).map((profile, index) => (
                <SwipeCard 
                  key={profile.id} 
                  profile={profile} 
                  onSwipe={handleSwipe} 
                  isTop={index === 0}
                  onButtonSwipe={index === 0 ? handleButtonSwipe : undefined}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center h-full text-center px-6 sm:px-8'>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className='w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-frinder-orange/10 flex items-center justify-center mb-4 sm:mb-6'
            >
              <Heart className='w-10 h-10 sm:w-12 sm:h-12 text-frinder-orange' />
            </motion.div>
            <h2 className='text-xl sm:text-2xl font-bold mb-2 dark:text-white'>No more people</h2>
            <p className='text-muted-foreground text-sm sm:text-base'>Check back later for more potential matches!</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {profiles.length > 0 && (
        <div className='px-4 pb-4 sm:pb-6'>
          <div className='flex items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto'>
            {/* Undo */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleUndo}
              disabled={!lastAction}
              className='w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-gray-900 shadow-lg flex items-center justify-center disabled:opacity-30 border border-muted dark:border-gray-800 transition-shadow hover:shadow-xl'
            >
              <RotateCcw className='w-4 h-4 sm:w-5 sm:h-5 text-frinder-amber' />
            </motion.button>

            {/* Nope */}
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => handleButtonSwipe('left')}
              className='w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white dark:bg-gray-900 shadow-lg flex items-center justify-center border-2 border-red-200 dark:border-red-900/50 transition-all hover:shadow-xl hover:border-red-300'
            >
              <X className='w-7 h-7 sm:w-8 sm:h-8 text-red-500' strokeWidth={2.5} />
            </motion.button>

            {/* Super Like */}
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => handleButtonSwipe('up')}
              className='w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-gray-900 shadow-lg flex items-center justify-center border border-blue-200 dark:border-blue-900/50 transition-all hover:shadow-xl hover:border-blue-300'
            >
              <Star className='w-5 h-5 sm:w-6 sm:h-6 text-blue-500' fill='currentColor' />
            </motion.button>

            {/* Like */}
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => handleButtonSwipe('right')}
              className='w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white dark:bg-gray-900 shadow-lg flex items-center justify-center border-2 border-green-200 dark:border-green-900/50 transition-all hover:shadow-xl hover:border-green-300'
            >
              <Heart className='w-7 h-7 sm:w-8 sm:h-8 text-green-500' fill='currentColor' />
            </motion.button>

            {/* Boost */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className='w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-gray-900 shadow-lg flex items-center justify-center border border-muted dark:border-gray-800 transition-shadow hover:shadow-xl'
            >
              <svg className='w-5 h-5 sm:w-6 sm:h-6 text-frinder-burnt' viewBox='0 0 24 24' fill='currentColor'>
                <path d='M13 3L4 14h7l-1 7 9-11h-7l1-7z' />
              </svg>
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
