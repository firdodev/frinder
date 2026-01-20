'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import {
  Heart,
  X,
  Star,
  MapPin,
  Loader2,
  Sparkles,
  MessageCircle,
  Crown,
  Zap,
  User,
  Users,
  ShoppingBag,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Bookmark,
  Menu,
  Flame,
  SlidersHorizontal,
  Lock,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarColor } from '@/components/ui/user-avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import {
  getUsersToSwipe,
  recordSwipe,
  canUseSuperLike,
  incrementSwipeCount,
  addSuperLikes,
  purchasePremium,
  purchaseAdFree,
  recordPurchase,
  subscribeToUserCredits,
  subscribeToUserSubscription,
  type UserCredits,
  type UserSubscription
} from '@/lib/firebaseServices';
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
  city?: string;
  relationshipGoal?: 'relationship' | 'casual' | 'friends';
  gender?: 'male' | 'female' | 'other';
  university?: string;
  storyPhoto?: string; // Active story photo URL
}

// Gold star particle for super like celebration
function GoldStar({ delay, startX, startY }: { delay: number; startX: number; startY: number }) {
  const endX = startX + (Math.random() - 0.5) * 200;
  const endY = startY - 100 - Math.random() * 300;
  const rotation = Math.random() * 720 - 360;
  const size = 12 + Math.random() * 20;

  return (
    <motion.div
      className='absolute pointer-events-none'
      initial={{ 
        x: startX, 
        y: startY, 
        opacity: 0, 
        scale: 0,
        rotate: 0
      }}
      animate={{ 
        x: endX,
        y: endY,
        opacity: [0, 1, 1, 0],
        scale: [0, 1.2, 1, 0.5],
        rotate: rotation
      }}
      transition={{ 
        delay, 
        duration: 1.5, 
        ease: 'easeOut'
      }}
    >
      <Star 
        size={size} 
        className='text-yellow-400 drop-shadow-lg' 
        fill='currentColor'
        style={{ filter: 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.8))' }}
      />
    </motion.div>
  );
}

// Full screen gold stars explosion for super like
function SuperLikeStarsExplosion({ show }: { show: boolean }) {
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    if (show) {
      const newStars = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 100,
        y: window.innerHeight / 2,
        delay: Math.random() * 0.5
      }));
      setStars(newStars);
    } else {
      setStars([]);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className='fixed inset-0 pointer-events-none z-50 overflow-hidden'>
      {stars.map(star => (
        <GoldStar key={star.id} delay={star.delay} startX={star.x} startY={star.y} />
      ))}
    </div>
  );
}

// Firework particle for celebration
function Firework({ delay, x, color }: { delay: number; x: number; color: string }) {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: i * 30 * (Math.PI / 180)
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
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className='absolute w-3 h-3 rounded-full'
          style={{ backgroundColor: color }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{
            x: Math.cos(particle.angle) * 100,
            y: Math.sin(particle.angle) * 100,
            opacity: [0, 1, 1, 0],
            scale: [0, 1.5, 1, 0]
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
    color: colors[Math.floor(Math.random() * colors.length)]
  }));

  return (
    <div className='absolute inset-0 pointer-events-none overflow-hidden'>
      {fireworks.map(fw => (
        <Firework key={fw.id} delay={fw.delay} x={fw.x} color={fw.color} />
      ))}
      {/* Second wave of fireworks */}
      {fireworks.map(fw => (
        <Firework
          key={`wave2-${fw.id}`}
          delay={fw.delay + 2.5}
          x={(fw.x + 40) % 100}
          color={colors[(fw.id + 2) % colors.length]}
        />
      ))}
      {/* Third wave */}
      {fireworks.map(fw => (
        <Firework
          key={`wave3-${fw.id}`}
          delay={fw.delay + 5}
          x={(fw.x + 20) % 100}
          color={colors[(fw.id + 4) % colors.length]}
        />
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
    size: 16 + Math.random() * 24
  }));

  return (
    <div className='absolute inset-0 pointer-events-none overflow-hidden'>
      {hearts.map(heart => (
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
              <AvatarFallback className={`${getAvatarColor(userName)} text-white text-xs`}>
                {userPhoto ? userName[0] : <User className='w-4 h-4' />}
              </AvatarFallback>
            </Avatar>
            <Avatar className='w-8 h-8 border-2 border-white'>
              <AvatarImage src={matchPhoto} />
              <AvatarFallback className={`${getAvatarColor(matchName)} text-white text-xs`}>
                {matchPhoto ? matchName[0] : <User className='w-4 h-4' />}
              </AvatarFallback>
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
                rotate: [0, 180, 360]
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
              <h1 className='text-5xl sm:text-7xl font-black text-white text-center drop-shadow-2xl'>IT'S A</h1>
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
              <motion.div animate={{ x: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                <Avatar className='w-28 h-28 sm:w-36 sm:h-36 border-4 border-white shadow-2xl'>
                  <AvatarImage src={userPhoto} />
                  <AvatarFallback className={`text-3xl ${getAvatarColor(userName)} text-white font-bold`}>
                    {userPhoto ? userName[0] : <User className='w-12 h-12' />}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                <Heart className='w-12 h-12 sm:w-16 sm:h-16 text-white drop-shadow-xl' fill='currentColor' />
              </motion.div>

              <motion.div animate={{ x: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                <Avatar className='w-28 h-28 sm:w-36 sm:h-36 border-4 border-white shadow-2xl'>
                  <AvatarImage src={matchPhoto} />
                  <AvatarFallback className={`text-3xl ${getAvatarColor(matchName)} text-white font-bold`}>
                    {matchPhoto ? matchName[0] : <User className='w-12 h-12' />}
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
  onButtonSwipe,
  onSuperLike
}: {
  profile: Profile;
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  isTop: boolean;
  onButtonSwipe?: (direction: 'left' | 'right' | 'up') => void;
  onSuperLike?: () => void;
}) {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const controls = useAnimation();

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotate = useTransform(x, [-300, 0, 300], [-25, 0, 25]);
  const likeOpacity = useTransform(x, [0, 50, 150], [0, 0.3, 1]);
  const nopeOpacity = useTransform(x, [-150, -50, 0], [1, 0.3, 0]);
  const superLikeOpacity = useTransform(y, [-150, -50, 0], [1, 0.3, 0]);
  const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 80;
      const velocityThreshold = 400;

      if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
        controls.start({ 
          x: 500, 
          rotate: 20, 
          opacity: 0, 
          transition: { 
            type: 'spring', 
            stiffness: 300, 
            damping: 25,
            opacity: { duration: 0.2 }
          } 
        }).then(() => onSwipe('right'));
      } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
        controls.start({ 
          x: -500, 
          rotate: -20, 
          opacity: 0, 
          transition: { 
            type: 'spring', 
            stiffness: 300, 
            damping: 25,
            opacity: { duration: 0.2 }
          } 
        }).then(() => onSwipe('left'));
      } else if (info.offset.y < -threshold || info.velocity.y < -velocityThreshold) {
        onSuperLike?.();
        controls.start({ 
          y: -600, 
          scale: 0.9, 
          opacity: 0, 
          transition: { 
            type: 'spring', 
            stiffness: 200, 
            damping: 20,
            opacity: { duration: 0.3 }
          } 
        }).then(() => onSwipe('up'));
      } else {
        controls.start({ 
          x: 0, 
          y: 0, 
          rotate: 0, 
          scale: 1, 
          transition: { 
            type: 'spring', 
            stiffness: 400, 
            damping: 25,
            mass: 0.8
          } 
        });
      }
    },
    [onSwipe, controls, onSuperLike]
  );

  const triggerButtonSwipe = useCallback(
    (direction: 'left' | 'right' | 'up') => {
      if (direction === 'right') {
        controls.start({ 
          x: 500, 
          rotate: 15, 
          opacity: 0, 
          transition: { 
            type: 'spring', 
            stiffness: 250, 
            damping: 20,
            opacity: { duration: 0.25 }
          } 
        }).then(() => onSwipe('right'));
      } else if (direction === 'left') {
        controls.start({ 
          x: -500, 
          rotate: -15, 
          opacity: 0, 
          transition: { 
            type: 'spring', 
            stiffness: 250, 
            damping: 20,
            opacity: { duration: 0.25 }
          } 
        }).then(() => onSwipe('left'));
      } else {
        onSuperLike?.();
        controls.start({ 
          y: -600, 
          scale: 1.1, 
          opacity: 0, 
          transition: { 
            type: 'spring', 
            stiffness: 200, 
            damping: 18,
            opacity: { duration: 0.35 }
          } 
        }).then(() => onSwipe('up'));
      }
    },
    [onSwipe, controls, onSuperLike]
  );

  useEffect(() => {
    if (onButtonSwipe && isTop) {
      (window as any).__triggerSwipe = triggerButtonSwipe;
    }
    return () => {
      if ((window as any).__triggerSwipe === triggerButtonSwipe) {
        delete (window as any).__triggerSwipe;
      }
    };
  }, [triggerButtonSwipe, onButtonSwipe, isTop]);

  // Combine photos with story (story appears at the end)
  const allPhotos = profile.storyPhoto 
    ? [...profile.photos, profile.storyPhoto]
    : profile.photos;
  
  const isStoryPhoto = profile.storyPhoto && currentPhoto === allPhotos.length - 1;

  const nextPhoto = () => {
    if (currentPhoto < allPhotos.length - 1) setCurrentPhoto(currentPhoto + 1);
  };

  const prevPhoto = () => {
    if (currentPhoto > 0) setCurrentPhoto(currentPhoto - 1);
  };

  return (
    <>
      {/* Main swipeable card - outer container */}
      <motion.div
        className='absolute inset-3 top-14 bottom-20 z-10 flex flex-col'
        style={{ x, y, rotate, scale }}
        drag={!isExpanded}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.9}
        onDragEnd={handleDragEnd}
        animate={controls}
        initial={{ scale: 0.98, opacity: 0, y: 20 }}
        whileInView={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        whileTap={{ cursor: isExpanded ? 'default' : 'grabbing' }}
      >
        {/* Unified card container */}
        <div className='flex flex-col h-full rounded-[2.5rem] overflow-hidden shadow-2xl bg-zinc-900'>
          {/* Inner photo section */}
          <div className='flex-1 relative'>
            {/* Photo */}
            <div className='absolute inset-0'>
              <AnimatePresence mode='wait'>
                {allPhotos[currentPhoto] ? (
                  <motion.img
                    key={currentPhoto}
                    src={allPhotos[currentPhoto]}
                    alt={profile.name}
                    className='w-full h-full object-cover'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                ) : (
                  <motion.div
                    key='placeholder'
                    className='w-full h-full flex items-center justify-center bg-gradient-to-br from-frinder-orange to-frinder-burnt'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <User className='w-32 h-32 text-white/60' />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Story indicator badge - shows when viewing story photo */}
            {isStoryPhoto && (
              <div className='absolute top-4 left-1/2 transform -translate-x-1/2 z-30'>
                <div className='px-3 py-1 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 rounded-full'>
                  <span className='text-white text-xs font-semibold'>Story</span>
                </div>
              </div>
            )}

            {/* Photo indicators - horizontal bars */}
            {allPhotos.length > 1 && (
              <div className='absolute top-4 left-4 right-4 flex gap-1.5 z-20'>
                {allPhotos.map((_, i) => {
                  const isStory = profile.storyPhoto && i === allPhotos.length - 1;
                  return (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        i === currentPhoto 
                          ? isStory 
                            ? 'bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600' 
                            : 'bg-white' 
                          : isStory 
                            ? 'bg-gradient-to-r from-yellow-400/40 via-pink-500/40 to-purple-600/40'
                            : 'bg-white/30'
                      }`}
                    />
                  );
                })}
              </div>
            )}

          {/* Photo navigation areas */}
          <div className='absolute inset-0 flex z-10'>
            <div className='w-1/2 h-full' onClick={prevPhoto} />
            <div className='w-1/2 h-full' onClick={nextPhoto} />
          </div>

          {/* LIKE overlay */}
          <motion.div
            className='absolute inset-0 bg-green-500/90 flex items-center justify-center pointer-events-none z-30 rounded-3xl'
            style={{ opacity: likeOpacity }}
          >
            <div className='flex flex-col items-center'>
              <div className='w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mb-4'>
                <Heart className='w-14 h-14 text-white' fill='currentColor' />
              </div>
              <span className='text-white text-5xl font-black tracking-wider'>LIKE</span>
            </div>
          </motion.div>

          {/* NOPE overlay */}
          <motion.div
            className='absolute inset-0 bg-red-500/90 flex items-center justify-center pointer-events-none z-30 rounded-3xl'
            style={{ opacity: nopeOpacity }}
          >
            <div className='flex flex-col items-center'>
              <div className='w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mb-4'>
                <X className='w-14 h-14 text-white' strokeWidth={3} />
              </div>
              <span className='text-white text-5xl font-black tracking-wider'>NOPE</span>
            </div>
          </motion.div>

          {/* SUPER LIKE overlay - Gold with stars */}
          <motion.div
            className='absolute inset-0 flex items-center justify-center pointer-events-none z-30 rounded-3xl overflow-hidden'
            style={{ 
              opacity: superLikeOpacity,
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)'
            }}
          >
            {/* Animated stars background */}
            <div className='absolute inset-0'>
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className='absolute'
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    rotate: [0, 180, 360],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: Math.random() * 1.5,
                  }}
                >
                  <Star className='w-6 h-6 text-white/60' fill='currentColor' />
                </motion.div>
              ))}
            </div>
            <div className='flex flex-col items-center relative z-10'>
              <motion.div 
                className='w-28 h-28 rounded-full bg-white/30 flex items-center justify-center mb-4'
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Star className='w-14 h-14 text-white drop-shadow-lg' fill='currentColor' />
              </motion.div>
              <span className='text-white text-4xl font-black tracking-wider drop-shadow-lg'>SUPER LIKE</span>
            </div>
          </motion.div>

          {/* Bottom gradient */}
          <div className='absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none' />

          {/* Profile info - bottom section of photo */}
          <div className='absolute bottom-24 left-0 right-0 p-5 text-white z-20'>
            {/* Name row with info button */}
            <div className='flex items-end justify-between'>
              <div>
                {/* Name and badge */}
                <div className='flex items-center gap-2 mb-1'>
                  <h2 className='text-3xl font-bold'>
                    {profile.name}, {profile.age}
                  </h2>
                  <BadgeCheck className='w-6 h-6 text-blue-400' fill='currentColor' />
                </div>

                {/* Location info */}
                {(profile.city || profile.course) && (
                  <div className='flex items-center gap-2 text-white/90'>
                    <MapPin className='w-4 h-4' />
                    <span className='text-sm font-medium'>
                      {profile.city}{profile.city && profile.course && ' · '}{profile.course}
                    </span>
                  </div>
                )}
              </div>

              {/* Info button - bottom right of info section */}
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
                className='w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20'
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronDown className='w-5 h-5 text-white' />
              </motion.button>
            </div>
          </div>

          {/* Expanded info panel - slides up from bottom inside card */}
          <AnimatePresence mode='wait'>
            {isExpanded && (
              <motion.div
                className='absolute inset-0 z-40 flex flex-col bg-[#1a1a1a]'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Top section - photo with gradient */}
                <motion.div 
                  className='relative h-1/2'
                  initial={{ height: '100%' }}
                  animate={{ height: '50%' }}
                  exit={{ height: '100%' }}
                  transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                >
                  <img
                    src={profile.photos[currentPhoto] || ''}
                    alt={profile.name}
                    className='w-full h-full object-cover'
                  />
                  {/* Photo indicators */}
                  {profile.photos.length > 1 && (
                    <div className='absolute top-4 left-4 right-4 flex gap-1.5 z-10'>
                      {profile.photos.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            i === currentPhoto ? 'bg-white' : 'bg-white/30'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  {/* Photo navigation */}
                  <div className='absolute inset-0 flex'>
                    <div className='w-1/2 h-full' onClick={prevPhoto} />
                    <div className='w-1/2 h-full' onClick={nextPhoto} />
                  </div>
                  {/* Bottom gradient */}
                  <div className='absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent' />
                </motion.div>

                {/* Bottom section - profile details */}
                <motion.div
                  className='flex-1 bg-black/95 backdrop-blur-md p-5 overflow-y-auto'
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1], delay: 0.05 }}
                >
                  {/* Close button */}
                  <motion.div 
                    className='flex justify-between items-start mb-4'
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                  >
                    <div className='flex items-center gap-2'>
                      <h2 className='text-2xl font-bold text-white'>
                        {profile.name}, {profile.age}
                      </h2>
                      <BadgeCheck className='w-6 h-6 text-blue-400' fill='currentColor' />
                    </div>
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(false);
                      }}
                      className='w-9 h-9 rounded-full bg-white/20 flex items-center justify-center'
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <ChevronDown className='w-5 h-5 text-white' />
                    </motion.button>
                  </motion.div>

                  {/* Location */}
                  {profile.course && (
                    <motion.div 
                      className='flex items-center gap-2 text-white/70 mb-3'
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      <MapPin className='w-4 h-4' />
                      <span className='text-sm'>{profile.course}</span>
                    </motion.div>
                  )}

                  {/* Looking for */}
                  {profile.relationshipGoal && (
                    <motion.div 
                      className='flex items-center gap-2 mb-4'
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25, duration: 0.3 }}
                    >
                      <span className='px-3 py-1.5 bg-white/20 rounded-full text-sm font-medium text-white flex items-center gap-1.5'>
                        <Heart className='w-3.5 h-3.5' />
                        {profile.relationshipGoal === 'relationship' && 'Looking for a relationship'}
                        {profile.relationshipGoal === 'casual' && 'Looking for something casual'}
                        {profile.relationshipGoal === 'friends' && 'Looking for friends'}
                      </span>
                    </motion.div>
                  )}

                  {/* Bio */}
                  {profile.bio && (
                    <motion.p 
                      className='text-white/80 mb-4'
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.3 }}
                    >
                      {profile.bio}
                    </motion.p>
                  )}

                  {/* Interests */}
                  {profile.interests && profile.interests.length > 0 && (
                    <motion.div 
                      className='flex flex-wrap gap-2'
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35, duration: 0.3 }}
                    >
                      {profile.interests.filter(i => i).map((interest, idx) => (
                        <motion.span
                          key={`${interest}-${idx}`}
                          className='px-3 py-1.5 bg-frinder-orange/20 text-frinder-orange rounded-full text-sm font-medium'
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 + idx * 0.05, duration: 0.2 }}
                        >
                          {interest}
                        </motion.span>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons section - inside card, floating over gradient */}
          <div className='absolute bottom-6 left-0 right-0 flex items-center justify-center gap-5 z-30'>
            {/* Nope - X */}
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                onButtonSwipe?.('left');
              }}
              className='w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg'
            >
              <X className='w-7 h-7 text-zinc-600' strokeWidth={2.5} />
            </motion.button>

            {/* Super Like - Star */}
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                onButtonSwipe?.('up');
              }}
              className='w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center shadow-lg'
            >
              <Star className='w-6 h-6 text-white' fill='currentColor' />
            </motion.button>

            {/* Like - Heart */}
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                onButtonSwipe?.('right');
              }}
              className='w-16 h-16 rounded-full bg-pink-500 flex items-center justify-center shadow-lg'
            >
              <Heart className='w-8 h-8 text-white' fill='currentColor' />
            </motion.button>
          </div>
        </div>
        </div>
      </motion.div>
    </>
  );
}

// Groups View Component - shows list of groups to join/chat
interface GroupsViewProps {
  onOpenGroupChat?: (groupId: string) => void;
}

interface GroupItem {
  id: string;
  name: string;
  description: string;
  photo: string;
  memberCount: number;
  isPrivate: boolean;
  lastMessage?: string;
  isMember?: boolean;
  creatorId?: string;
}

function GroupsView({ onOpenGroupChat }: GroupsViewProps) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [myGroups, setMyGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'discover' | 'mygroups'>('mygroups');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function loadGroups() {
      if (!user?.uid) return;
      try {
        setLoading(true);
        // Import and call the group functions
        const { getGroupsToSwipe, getMyGroups } = await import('@/lib/firebaseServices');
        
        const [availableGroups, userGroups] = await Promise.all([
          getGroupsToSwipe(user.uid),
          getMyGroups ? getMyGroups(user.uid) : Promise.resolve([])
        ]);

        setGroups(availableGroups.map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description || '',
          photo: g.photo || '',
          memberCount: g.members?.length || 0,
          isPrivate: g.isPrivate || false,
          isMember: false,
          creatorId: g.creatorId
        })));

        // Sort user groups - created by user first
        const sortedUserGroups = (userGroups || [])
          .map((g: any) => ({
            id: g.id,
            name: g.name,
            description: g.description || '',
            photo: g.photo || '',
            memberCount: g.members?.length || 0,
            isPrivate: g.isPrivate || false,
            lastMessage: g.lastMessage || '',
            isMember: true,
            creatorId: g.creatorId
          }))
          .sort((a: GroupItem, b: GroupItem) => {
            // Groups created by user come first
            const aIsCreator = a.creatorId === user.uid;
            const bIsCreator = b.creatorId === user.uid;
            if (aIsCreator && !bIsCreator) return -1;
            if (!aIsCreator && bIsCreator) return 1;
            return 0;
          });

        setMyGroups(sortedUserGroups);
      } catch (error) {
        console.error('Error loading groups:', error);
      } finally {
        setLoading(false);
      }
    }

    loadGroups();
  }, [user?.uid]);

  const handleJoinGroup = async (groupId: string) => {
    if (!user?.uid) return;
    try {
      const { joinGroup } = await import('@/lib/firebaseServices');
      await joinGroup(groupId, user.uid);
      toast.success('Joined group successfully!');
      // Move to my groups
      const joinedGroup = groups.find(g => g.id === groupId);
      if (joinedGroup) {
        setMyGroups(prev => [...prev, { ...joinedGroup, isMember: true }]);
        setGroups(prev => prev.filter(g => g.id !== groupId));
      }
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Failed to join group');
    }
  };

  const handleCreateGroup = async () => {
    if (!user?.uid || !newGroupName.trim()) return;
    try {
      setCreating(true);
      const { createGroup } = await import('@/lib/firebaseServices');
      const newGroupId = await createGroup(user.uid, {
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        photo: '',
        activity: '',
        location: '',
        interests: [],
        isPrivate: newGroupPrivate,
      });
      
      // Add to my groups at the top
      setMyGroups(prev => [{
        id: newGroupId,
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        photo: '',
        memberCount: 1,
        isPrivate: newGroupPrivate,
        isMember: true,
        creatorId: user.uid
      }, ...prev]);
      
      // Reset form
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupPrivate(false);
      setShowCreateGroup(false);
      toast.success('Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader2 className='w-8 h-8 animate-spin text-frinder-orange' />
      </div>
    );
  }

  return (
    <div className='px-4 pb-24 relative min-h-full'>
      {/* View Toggle */}
      <div className='flex gap-2 mb-4 p-1 bg-black/20 rounded-full'>
        <button
          onClick={() => setViewMode('mygroups')}
          className={`flex-1 py-2 px-4 rounded-full text-sm font-semibold transition-all ${
            viewMode === 'mygroups'
              ? 'bg-frinder-orange text-white'
              : 'text-white/70'
          }`}
        >
          My Groups
        </button>
        <button
          onClick={() => setViewMode('discover')}
          className={`flex-1 py-2 px-4 rounded-full text-sm font-semibold transition-all ${
            viewMode === 'discover'
              ? 'bg-frinder-orange text-white'
              : 'text-white/70'
          }`}
        >
          Discover
        </button>
      </div>

      {/* Groups List */}
      <div className='space-y-4'>
        {viewMode === 'mygroups' ? (
          myGroups.length > 0 ? (
            myGroups.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                className='rounded-3xl overflow-hidden shadow-xl cursor-pointer active:scale-[0.98] transition-transform'
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                  border: '2px solid rgba(255, 138, 76, 0.3)',
                }}
                onClick={() => onOpenGroupChat?.(group.id)}
              >
                {/* Group Photo Section */}
                <div className='relative h-32 overflow-hidden'>
                  {group.photo ? (
                    <img src={group.photo} alt={group.name} className='w-full h-full object-cover' />
                  ) : (
                    <div className='w-full h-full bg-gradient-to-br from-frinder-orange/30 to-frinder-orange/10 flex items-center justify-center'>
                      <Users className='w-12 h-12 text-frinder-orange/70' />
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent' />
                  
                  {/* Creator badge */}
                  {group.creatorId === user?.uid && (
                    <div className='absolute top-3 left-3 px-2 py-1 bg-frinder-orange rounded-full flex items-center gap-1'>
                      <span className='text-white text-xs font-semibold'>Creator</span>
                    </div>
                  )}
                  
                  {/* Private badge */}
                  {group.isPrivate && (
                    <div className='absolute top-3 right-3 p-1.5 bg-black/40 rounded-full backdrop-blur-sm'>
                      <Lock className='w-3.5 h-3.5 text-white' />
                    </div>
                  )}
                  
                  {/* Group name overlay */}
                  <div className='absolute bottom-3 left-4 right-4'>
                    <h3 className='font-bold text-white text-lg drop-shadow-lg'>{group.name}</h3>
                  </div>
                </div>
                
                {/* Group Info Section */}
                <div className='p-4 bg-black/20 backdrop-blur-sm'>
                  <div className='flex items-center justify-between'>
                    <div className='flex-1 min-w-0'>
                      <p className='text-gray-300 text-sm truncate'>{group.lastMessage || group.description}</p>
                      <div className='flex items-center gap-2 mt-1.5'>
                        <Users className='w-3.5 h-3.5 text-frinder-orange' />
                        <span className='text-gray-400 text-xs'>{group.memberCount} members</span>
                      </div>
                    </div>
                    <div className='w-10 h-10 rounded-full bg-frinder-orange flex items-center justify-center flex-shrink-0 ml-3'>
                      <MessageCircle className='w-5 h-5 text-white' />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className='text-center py-12'>
              <Users className='w-12 h-12 text-white/30 mx-auto mb-3' />
              <p className='text-gray-300'>You haven't joined any groups yet</p>
              <button
                onClick={() => setViewMode('discover')}
                className='mt-3 px-4 py-2 bg-frinder-orange text-white rounded-full text-sm font-medium'
              >
                Discover Groups
              </button>
            </div>
          )
        ) : (
          groups.length > 0 ? (
            groups.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                className='rounded-3xl overflow-hidden shadow-xl'
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                  border: '2px solid rgba(255, 138, 76, 0.3)',
                }}
              >
                {/* Group Photo Section */}
                <div className='relative h-32 overflow-hidden'>
                  {group.photo ? (
                    <img src={group.photo} alt={group.name} className='w-full h-full object-cover' />
                  ) : (
                    <div className='w-full h-full bg-gradient-to-br from-frinder-orange/30 to-frinder-orange/10 flex items-center justify-center'>
                      <Users className='w-12 h-12 text-frinder-orange/70' />
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent' />
                  
                  {/* Private badge */}
                  {group.isPrivate && (
                    <div className='absolute top-3 right-3 p-1.5 bg-black/40 rounded-full backdrop-blur-sm'>
                      <Lock className='w-3.5 h-3.5 text-white' />
                    </div>
                  )}
                  
                  {/* Group name overlay */}
                  <div className='absolute bottom-3 left-4 right-4'>
                    <h3 className='font-bold text-white text-lg drop-shadow-lg'>{group.name}</h3>
                  </div>
                </div>
                
                {/* Group Info Section */}
                <div className='p-4 bg-black/20 backdrop-blur-sm'>
                  <div className='flex items-center justify-between'>
                    <div className='flex-1 min-w-0'>
                      <p className='text-gray-300 text-sm line-clamp-1'>{group.description}</p>
                      <div className='flex items-center gap-2 mt-1.5'>
                        <Users className='w-3.5 h-3.5 text-frinder-orange' />
                        <span className='text-gray-400 text-xs'>{group.memberCount} members</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinGroup(group.id)}
                      className='px-5 py-2.5 bg-frinder-orange text-white rounded-full text-sm font-semibold flex-shrink-0 ml-3 shadow-lg hover:bg-frinder-orange/90 transition-colors'
                    >
                      {group.isPrivate ? 'Request' : 'Join'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className='text-center py-12'>
              <Users className='w-12 h-12 text-white/30 mx-auto mb-3' />
              <p className='text-gray-300'>No groups to discover</p>
              <p className='text-gray-500 text-sm'>Check back later for new groups!</p>
            </div>
          )
        )}
      </div>

      {/* Floating Plus Button - only in My Groups */}
      {viewMode === 'mygroups' && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 20 }}
          onClick={() => setShowCreateGroup(true)}
          className='fixed bottom-24 right-6 w-14 h-14 bg-frinder-orange rounded-full shadow-2xl flex items-center justify-center z-50'
          style={{
            boxShadow: '0 4px 20px rgba(255, 138, 76, 0.5)'
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Plus className='w-7 h-7 text-white' />
        </motion.button>
      )}

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center'
            onClick={() => setShowCreateGroup(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className='w-full max-w-lg bg-zinc-900 rounded-t-3xl p-6'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='w-12 h-1 bg-white/20 rounded-full mx-auto mb-6' />
              
              <h2 className='text-xl font-bold text-white mb-6'>Create New Group</h2>
              
              <div className='space-y-4'>
                <div>
                  <label className='text-sm text-gray-400 mb-1.5 block'>Group Name</label>
                  <input
                    type='text'
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder='Enter group name...'
                    className='w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-frinder-orange'
                  />
                </div>
                
                <div>
                  <label className='text-sm text-gray-400 mb-1.5 block'>Description</label>
                  <textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder='What is this group about?'
                    rows={3}
                    className='w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-frinder-orange resize-none'
                  />
                </div>
                
                <div className='flex items-center justify-between py-2'>
                  <div>
                    <p className='text-white font-medium'>Private Group</p>
                    <p className='text-sm text-gray-500'>Only invited members can join</p>
                  </div>
                  <button
                    onClick={() => setNewGroupPrivate(!newGroupPrivate)}
                    className={`w-12 h-7 rounded-full transition-colors ${
                      newGroupPrivate ? 'bg-frinder-orange' : 'bg-white/20'
                    }`}
                  >
                    <motion.div
                      animate={{ x: newGroupPrivate ? 22 : 2 }}
                      className='w-5 h-5 bg-white rounded-full shadow'
                    />
                  </button>
                </div>
              </div>
              
              <div className='flex gap-3 mt-6'>
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className='flex-1 py-3 rounded-xl bg-white/10 text-white font-semibold'
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || creating}
                  className='flex-1 py-3 rounded-xl bg-frinder-orange text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2'
                >
                  {creating ? (
                    <Loader2 className='w-5 h-5 animate-spin' />
                  ) : (
                    <>
                      <Plus className='w-5 h-5' />
                      Create
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SwipePeopleProps {
  onGoToShop?: () => void;
  onGoToProfile?: () => void;
  onOpenGroupChat?: (groupId: string) => void;
}

export default function SwipePeople({ onGoToShop, onGoToProfile, onOpenGroupChat }: SwipePeopleProps) {
  const { user, userProfile } = useAuth();
  useSettings();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastAction, setLastAction] = useState<{ profile: Profile; direction: string } | null>(null);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [showMatchCelebration, setShowMatchCelebration] = useState(false);
  const [useFullScreenMatch, setUseFullScreenMatch] = useState(true);
  const [showSuperLikeStars, setShowSuperLikeStars] = useState(false);
  const [activeTab, setActiveTab] = useState<'groups' | 'foryou' | 'nearby'>('foryou');

  // Credits & Subscription state
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);

  // Dialog states
  const [showAdDialog, setShowAdDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showNoSuperLikesDialog, setShowNoSuperLikesDialog] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);

  // Check if user has super likes available
  const hasSuperLikes = userSubscription?.unlimitedSuperLikes || (userCredits?.superLikes ?? 0) > 0;

  // Trigger super like stars animation
  const triggerSuperLikeAnimation = useCallback(() => {
    setShowSuperLikeStars(true);
    setTimeout(() => setShowSuperLikeStars(false), 2000);
  }, []);

  // Load settings for match notification preference
  useEffect(() => {
    const savedPreference = localStorage.getItem('frinder_fullScreenMatch');
    if (savedPreference !== null) {
      setUseFullScreenMatch(JSON.parse(savedPreference));
    }
  }, []);

  // Subscribe to user credits and subscription
  useEffect(() => {
    if (!user?.uid) return;

    const unsubCredits = subscribeToUserCredits(user.uid, setUserCredits);
    const unsubSub = subscribeToUserSubscription(user.uid, setUserSubscription);

    return () => {
      unsubCredits();
      unsubSub();
    };
  }, [user?.uid]);

  // Ad countdown timer
  useEffect(() => {
    if (showAdDialog && adCountdown > 0) {
      const timer = setTimeout(() => setAdCountdown(adCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [showAdDialog, adCountdown]);

  // Load users to swipe from Firebase
  useEffect(() => {
    async function loadProfiles() {
      if (!user?.uid || !userProfile) return;

      try {
        setLoading(true);
        const users = await getUsersToSwipe(user.uid, userProfile);

        // Import story function
        const { getActiveStoryForUser } = await import('@/lib/firebaseServices');

        // Map Firebase user profiles to our Profile interface
        // Filter out users without valid photos
        const mappedProfilesPromises: Promise<Profile | null>[] = users
          .filter((u: any) => {
            // Check if user has at least one valid photo URL
            const photos = u.photos || [];
            const validPhotos = photos.filter((p: string) => p && p.trim() !== '' && !p.includes('placeholder'));
            return validPhotos.length > 0;
          })
          .map(async (u: any) => {
            // Fetch active story for this user (exclude matchesOnly stories in discover)
            const storyPhoto = await getActiveStoryForUser(u.uid || u.id, false);
            
            return {
              id: u.uid || u.id,
              name: u.displayName || u.name,
              age: u.age,
              bio: u.bio,
              photos: (u.photos || []).filter((p: string) => p && p.trim() !== ''),
              interests: u.interests || [],
              course: u.city ? `${u.city}, ${u.country}` : '',
              distance: u.city === userProfile.city ? 'Same city' : u.country === userProfile.country ? 'Same country' : '',
              relationshipGoal: u.relationshipGoal,
              gender: u.gender,
              university: u.university,
              storyPhoto: storyPhoto || undefined
            } as Profile;
          });

        const mappedProfiles = (await Promise.all(mappedProfilesPromises)).filter((p): p is Profile => p !== null);

        // Separate profiles by gender priority (opposite gender first)
        const currentUserGender = userProfile.gender;
        const oppositeGender = currentUserGender === 'male' ? 'female' : currentUserGender === 'female' ? 'male' : null;
        
        // Split into opposite gender and same gender groups
        const oppositeGenderProfiles = mappedProfiles.filter(p => p.gender === oppositeGender);
        const sameGenderProfiles = mappedProfiles.filter(p => p.gender !== oppositeGender);
        
        // Shuffle each group separately using Fisher-Yates algorithm
        const shuffleArray = (arr: Profile[]) => {
          const shuffled = [...arr];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        };
        
        // Combine: opposite gender first (shuffled), then same gender (shuffled)
        const sortedProfiles = [...shuffleArray(oppositeGenderProfiles), ...shuffleArray(sameGenderProfiles)];

        setAllProfiles(sortedProfiles);
        setProfiles(sortedProfiles);
      } catch (error) {
        console.error('Error loading profiles:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfiles();
  }, [user?.uid, userProfile]);

  // Filter profiles based on active tab
  useEffect(() => {
    if (activeTab === 'nearby' && userProfile?.university) {
      // Show only people from the same university
      const universityProfiles = allProfiles.filter(p => 
        p.university && p.university.toLowerCase() === userProfile.university?.toLowerCase()
      );
      setProfiles(universityProfiles);
    } else {
      // Show everyone (For You)
      setProfiles(allProfiles);
    }
  }, [activeTab, allProfiles, userProfile?.university]);

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right' | 'up') => {
      if (profiles.length === 0) return;

      const currentProfile = profiles[0];

      // Check if super like and if user can use it
      if (direction === 'up' && user?.uid) {
        const canUse = await canUseSuperLike(user.uid);
        if (!canUse.canUse) {
          setShowNoSuperLikesDialog(true);
          return;
        }
      }

      setLastAction({ profile: currentProfile, direction });

      // Remove the swiped profile and recycle if disliked (left swipe)
      // For left swipes, add the profile back to the end to create infinite loop
      setProfiles(prev => {
        const remaining = prev.slice(1);
        if (direction === 'left') {
          // Add disliked profile back to the end for infinite loop
          return [...remaining, currentProfile];
        }
        return remaining;
      });

      if (!user?.uid) return;

      try {
        // Check if ad should be shown (every 5 swipes for non-premium)
        const adResult = await incrementSwipeCount(user.uid, 5); // Pass 5 as the swipe interval
        if (adResult.showAd) {
          setAdCountdown(5);
          setShowAdDialog(true);
        }

        // Record swipe to Firebase
        const swipeDirection = direction === 'up' ? 'superlike' : direction;

        const result = await recordSwipe(user.uid, currentProfile.id, swipeDirection);

        if (result.isMatch && (direction === 'right' || direction === 'up')) {
          // It's a match!
          setMatchedProfile(currentProfile);
          setShowMatchCelebration(true);

          if (result.isSuperLike) {
            toast.success("⭐ Super Like Match! They'll know you really like them!");
          }
        }
      } catch (error) {
        console.error('Error recording swipe:', error);
      }
    },
    [profiles, user?.uid]
  );

  // Purchase handlers
  const handlePurchaseSuperLikes = async () => {
    if (!user?.uid) return;
    setPurchasing(true);
    try {
      // In a real app, this would go through a payment provider
      // For now, we'll simulate the purchase
      await addSuperLikes(user.uid, 10);
      await recordPurchase(user.uid, 'super_likes', 1.0);
      toast.success('🎉 10 Super Likes added to your account!');
      setShowNoSuperLikesDialog(false);
      setShowUpgradeDialog(false);
    } catch (error) {
      console.error('Error purchasing super likes:', error);
      toast.error('Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handlePurchasePremium = async () => {
    if (!user?.uid) return;
    setPurchasing(true);
    try {
      await purchasePremium(user.uid);
      await recordPurchase(user.uid, 'premium', 5.0);
      toast.success('👑 Welcome to Frinder Premium!');
      setShowUpgradeDialog(false);
      setShowNoSuperLikesDialog(false);
    } catch (error) {
      console.error('Error purchasing premium:', error);
      toast.error('Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handlePurchaseAdFree = async () => {
    if (!user?.uid) return;
    setPurchasing(true);
    try {
      await purchaseAdFree(user.uid);
      await recordPurchase(user.uid, 'ad_free', 1.0);
      toast.success('✨ Ads removed! Enjoy uninterrupted swiping!');
      setShowAdDialog(false);
      setShowUpgradeDialog(false);
    } catch (error) {
      console.error('Error purchasing ad-free:', error);
      toast.error('Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleUndo = () => {
    if (lastAction) {
      setProfiles(prev => [lastAction.profile, ...prev]);
      setLastAction(null);
    }
  };

  const handleButtonSwipe = async (direction: 'left' | 'right' | 'up') => {
    if (profiles.length > 0) {
      // Check super likes BEFORE triggering animation
      if (direction === 'up' && !hasSuperLikes) {
        setShowNoSuperLikesDialog(true);
        return;
      }

      // Trigger stars animation for super like
      if (direction === 'up') {
        triggerSuperLikeAnimation();
      }
      
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
      <div className='h-full flex items-center justify-center bg-background dark:bg-black'>
        <div className='text-center'>
          <Loader2 className='w-12 h-12 animate-spin text-frinder-orange mx-auto mb-4' />
          <p className='text-muted-foreground'>Finding people near you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col bg-background dark:bg-black relative'>
      {/* Header with tabs and profile icon */}
      <div className='absolute top-0 left-0 right-0 z-40 pt-3 pb-2 px-4'>
        <div className='flex items-center justify-between'>
          {/* Left spacer for balance */}
          <div className='w-10 h-10' />

          {/* Center - Tabs */}
          <div className='flex items-center gap-1 p-1 rounded-full bg-black/40 backdrop-blur-xl'>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'groups'
                  ? 'bg-frinder-orange text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Users className='w-4 h-4' />
              Groups
            </button>
            <button
              onClick={() => setActiveTab('foryou')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'foryou'
                  ? 'bg-frinder-orange text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Flame className='w-4 h-4' />
              For You
            </button>
            <button
              onClick={() => setActiveTab('nearby')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'nearby'
                  ? 'bg-frinder-orange text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <MapPin className='w-4 h-4' />
              Nearby
            </button>
          </div>

          {/* Right - Profile */}
          <button 
            onClick={onGoToProfile}
            className='w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white/30 bg-black/20 backdrop-blur-sm'
          >
            {userProfile?.photos?.[0] ? (
              <img
                src={userProfile.photos[0]}
                alt='Profile'
                className='w-full h-full object-cover'
              />
            ) : (
              <User className='w-5 h-5 text-white/80' />
            )}
          </button>
        </div>
      </div>

      {/* Super Like Stars Explosion */}
      <SuperLikeStarsExplosion show={showSuperLikeStars} />

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
        }}
        useFullScreen={useFullScreenMatch}
      />

      {/* Content based on active tab */}
      {activeTab === 'groups' ? (
        /* Groups View */
        <div className='flex-1 pt-16 overflow-y-auto'>
          <GroupsView onOpenGroupChat={onOpenGroupChat} />
        </div>
      ) : (
        /* Cards stack - fills entire screen */
        <div className='flex-1 relative overflow-hidden'>
        {profiles.length > 0 ? (
          <div className='absolute inset-0'>
            {/* Render card behind - stacked effect */}
            <AnimatePresence>
              {profiles.length > 1 && (
                <motion.div
                  key={`second-${profiles[1].id}`}
                  className='absolute left-5 right-5 top-18 bottom-22 z-[5] pointer-events-none'
                  initial={{ opacity: 0, scale: 0.92, y: 15 }}
                  animate={{ opacity: 0.8, scale: 0.96, y: 5 }}
                  exit={{ opacity: 0, scale: 1, y: -20 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <div className='w-full h-full rounded-[2rem] overflow-hidden shadow-xl'>
                    <div className='relative h-full'>
                      {profiles[1].photos[0] ? (
                        <img
                          src={profiles[1].photos[0]}
                          alt={profiles[1].name}
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <div className='w-full h-full flex items-center justify-center bg-gradient-to-br from-frinder-orange to-frinder-burnt'>
                          <User className='w-28 h-28 text-white/50' />
                        </div>
                      )}
                      <div className='absolute inset-0 bg-black/20' />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top card - interactive */}
            <SwipeCard
              key={profiles[0].id}
              profile={profiles[0]}
              onSwipe={handleSwipe}
              isTop={true}
              onButtonSwipe={handleButtonSwipe}
              onSuperLike={triggerSuperLikeAnimation}
            />
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center h-full text-center px-6'>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className='w-24 h-24 rounded-full bg-frinder-orange/10 flex items-center justify-center mb-6'
            >
              <Heart className='w-12 h-12 text-frinder-orange' />
            </motion.div>
            <h2 className='text-2xl font-bold mb-2 text-foreground'>
              {activeTab === 'nearby' ? 'No one from your university yet' : 'No more people'}
            </h2>
            <p className='text-muted-foreground'>
              {activeTab === 'nearby' 
                ? 'Be the first to invite friends from your university!' 
                : 'Check back later for more potential matches!'}
            </p>
            {activeTab === 'nearby' && (
              <button
                onClick={() => setActiveTab('foryou')}
                className='mt-4 px-6 py-2 bg-frinder-orange text-white rounded-full font-medium hover:bg-frinder-orange/90 transition-colors'
              >
                Browse Everyone
              </button>
            )}
          </div>
        )}
      </div>
      )}

      {/* No Super Likes Dialog */}
      <Dialog open={showNoSuperLikesDialog} onOpenChange={setShowNoSuperLikesDialog}>
        <DialogContent className='sm:max-w-md dark:bg-black'>
          <DialogHeader>
            <DialogTitle className='text-center flex flex-col items-center gap-2'>
              <div className='w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center'>
                <Star className='w-8 h-8 text-blue-500' />
              </div>
              <span className='text-xl'>Out of Super Likes!</span>
            </DialogTitle>
            <DialogDescription className='text-center'>
              Super Likes instantly match you with someone special. Visit the shop to get more!
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3 pt-4'>
            <Button
              onClick={() => {
                setShowNoSuperLikesDialog(false);
                onGoToShop?.();
              }}
              className='w-full bg-gradient-to-r from-frinder-orange to-frinder-gold text-white'
            >
              <ShoppingBag className='w-4 h-4 mr-2' />
              Go to Shop
            </Button>
            <Button variant='outline' onClick={() => setShowNoSuperLikesDialog(false)} className='w-full'>
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ad Dialog */}
      <Dialog open={showAdDialog} onOpenChange={setShowAdDialog}>
        <DialogContent className='sm:max-w-md dark:bg-black'>
          <DialogHeader>
            <DialogTitle className='text-center'>Quick Break!</DialogTitle>
            <DialogDescription className='text-center'>
              Support Frinder by watching this quick ad, or go ad-free!
            </DialogDescription>
          </DialogHeader>
          <div className='py-8 bg-gray-100 dark:bg-black rounded-lg flex items-center justify-center'>
            <div className='text-center text-muted-foreground'>
              <div className='w-16 h-16 mx-auto mb-2 bg-gray-300 dark:bg-gray-700 rounded flex items-center justify-center'>
                <Zap className='w-8 h-8' />
              </div>
              <p className='text-sm'>Ad Placeholder</p>
            </div>
          </div>
          <div className='space-y-3'>
            <Button
              onClick={() => setShowAdDialog(false)}
              className='w-full bg-frinder-orange hover:bg-frinder-burnt text-white'
            >
              Continue Swiping
            </Button>
            <Button onClick={handlePurchaseAdFree} disabled={purchasing} variant='outline' className='w-full'>
              {purchasing ? <Loader2 className='w-4 h-4 animate-spin mr-2' /> : null}
              Remove Ads - $1/month
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Shop Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className='sm:max-w-lg dark:bg-black'>
          <DialogHeader>
            <DialogTitle className='text-center flex flex-col items-center gap-2'>
              <div className='w-16 h-16 rounded-full bg-frinder-orange/10 flex items-center justify-center'>
                <Crown className='w-8 h-8 text-frinder-orange' />
              </div>
              <span className='text-xl'>Frinder Shop</span>
            </DialogTitle>
            <DialogDescription className='text-center'>
              Upgrade your experience and find your match faster!
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 pt-4'>
            {/* Super Likes Pack */}
            <div className='border dark:border-gray-700 rounded-lg p-4 flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center'>
                  <Star className='w-6 h-6 text-blue-500' fill='currentColor' />
                </div>
                <div>
                  <h4 className='font-semibold dark:text-white'>10 Super Likes</h4>
                  <p className='text-sm text-muted-foreground'>Instant match guarantee</p>
                </div>
              </div>
              <Button
                onClick={handlePurchaseSuperLikes}
                disabled={purchasing}
                className='bg-blue-500 hover:bg-blue-600 text-white'
              >
                {purchasing ? <Loader2 className='w-4 h-4 animate-spin' /> : '$1'}
              </Button>
            </div>

            {/* Ad-Free */}
            <div className='border dark:border-gray-700 rounded-lg p-4 flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center'>
                  <Zap className='w-6 h-6 text-green-500' />
                </div>
                <div>
                  <h4 className='font-semibold dark:text-white'>Ad-Free Swiping</h4>
                  <p className='text-sm text-muted-foreground'>No interruptions for 1 month</p>
                </div>
              </div>
              <Button
                onClick={handlePurchaseAdFree}
                disabled={purchasing || userSubscription?.isAdFree}
                variant={userSubscription?.isAdFree ? 'outline' : 'default'}
                className={userSubscription?.isAdFree ? '' : 'bg-green-500 hover:bg-green-600 text-white'}
              >
                {userSubscription?.isAdFree ? (
                  'Active'
                ) : purchasing ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  '$1/mo'
                )}
              </Button>
            </div>

            {/* Premium */}
            <div className='border-2 border-frinder-orange rounded-lg p-4 relative overflow-hidden'>
              <div className='absolute top-0 right-0 bg-frinder-orange text-white text-xs px-2 py-1 rounded-bl'>
                Best Value
              </div>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='w-12 h-12 rounded-full bg-frinder-orange/10 flex items-center justify-center'>
                    <Crown className='w-6 h-6 text-frinder-orange' />
                  </div>
                  <div>
                    <h4 className='font-semibold dark:text-white'>Frinder Premium</h4>
                    <ul className='text-sm text-muted-foreground space-y-0.5'>
                      <li>• Unlimited Super Likes</li>
                      <li>• No Ads</li>
                      <li>• See who liked you</li>
                      <li>• Priority in search</li>
                      <li>• Read receipts</li>
                    </ul>
                  </div>
                </div>
                <Button
                  onClick={handlePurchasePremium}
                  disabled={purchasing || userSubscription?.isPremium}
                  variant={userSubscription?.isPremium ? 'outline' : 'default'}
                  className={userSubscription?.isPremium ? '' : 'bg-frinder-orange hover:bg-frinder-burnt text-white'}
                >
                  {userSubscription?.isPremium ? (
                    'Active'
                  ) : purchasing ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    '$5/mo'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
