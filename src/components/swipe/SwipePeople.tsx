'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import {
  Heart,
  X,
  Star,
  RotateCcw,
  Info,
  MapPin,
  Briefcase,
  Loader2,
  Sparkles,
  MessageCircle,
  Crown,
  Zap,
  ShieldCheck,
  User,
  ShoppingBag
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  relationshipGoal?: 'relationship' | 'casual' | 'friends';
  gender?: 'male' | 'female' | 'other';
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
  const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 80;
      const velocityThreshold = 400;

      if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
        setExitDirection('right');
        controls
          .start({
            x: 500,
            rotate: 30,
            opacity: 0,
            transition: { duration: 0.3, ease: 'easeOut' }
          })
          .then(() => onSwipe('right'));
      } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
        setExitDirection('left');
        controls
          .start({
            x: -500,
            rotate: -30,
            opacity: 0,
            transition: { duration: 0.3, ease: 'easeOut' }
          })
          .then(() => onSwipe('left'));
      } else if (info.offset.y < -threshold || info.velocity.y < -velocityThreshold) {
        setExitDirection('up');
        controls
          .start({
            y: -600,
            scale: 0.8,
            opacity: 0,
            transition: { duration: 0.4, ease: 'easeOut' }
          })
          .then(() => onSwipe('up'));
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
  const triggerButtonSwipe = useCallback(
    (direction: 'left' | 'right' | 'up') => {
      setExitDirection(direction);
      if (direction === 'right') {
        controls
          .start({
            x: 500,
            rotate: 30,
            opacity: 0,
            transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] }
          })
          .then(() => onSwipe('right'));
      } else if (direction === 'left') {
        controls
          .start({
            x: -500,
            rotate: -30,
            opacity: 0,
            transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] }
          })
          .then(() => onSwipe('left'));
      } else {
        controls
          .start({
            y: -600,
            scale: 1.2,
            opacity: 0,
            transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] }
          })
          .then(() => onSwipe('up'));
      }
    },
    [onSwipe, controls]
  );

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
            {profile.photos[currentPhoto] ? (
              <motion.img
                key={currentPhoto}
                src={profile.photos[currentPhoto]}
                alt={profile.name}
                className='w-full h-full object-cover'
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <motion.div
                key='placeholder'
                className={`w-full h-full flex items-center justify-center ${getAvatarColor(profile.name)}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <User className='w-32 h-32 text-white/60' />
              </motion.div>
            )}
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
              <motion.div className='flex flex-col items-center'>
                <motion.div
                  className='w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4'
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <Heart className='w-12 h-12 sm:w-16 sm:h-16 text-white' fill='currentColor' />
                </motion.div>
                <span className='text-white text-4xl sm:text-6xl font-black tracking-wider drop-shadow-lg'>LIKE</span>
              </motion.div>
            </motion.div>
          )}

          {/* NOPE overlay - Full card flat red */}
          {isTop && (
            <motion.div
              className='absolute inset-0 bg-red-500 flex items-center justify-center pointer-events-none z-30'
              style={{ opacity: nopeOpacity }}
            >
              <motion.div className='flex flex-col items-center'>
                <motion.div
                  className='w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4'
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                >
                  <X className='w-12 h-12 sm:w-16 sm:h-16 text-white' strokeWidth={3} />
                </motion.div>
                <span className='text-white text-4xl sm:text-6xl font-black tracking-wider drop-shadow-lg'>NOPE</span>
              </motion.div>
            </motion.div>
          )}

          {/* SUPER LIKE overlay - Full card flat blue */}
          {isTop && (
            <motion.div
              className='absolute inset-0 bg-blue-500 flex items-center justify-center pointer-events-none z-30'
              style={{ opacity: superLikeOpacity }}
            >
              <motion.div className='flex flex-col items-center'>
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

          {/* Improved gradient overlay - subtle at top, stronger at bottom for text */}
          <div className='absolute inset-0 pointer-events-none'>
            {/* Top subtle vignette */}
            <div className='absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent' />
            {/* Bottom gradient for text - more compact */}
            <div className='absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/90 via-black/50 to-transparent' />
          </div>

          {/* Profile info */}
          <div className='absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white z-20'>
            <div className='flex items-end justify-between'>
              <div className='flex-1'>
                <h2 className='text-2xl sm:text-3xl font-bold mb-1 drop-shadow-lg'>
                  {profile.name}, {profile.age}
                </h2>
                {profile.course && (
                  <div className='flex items-center gap-2 text-white/90 mb-1'>
                    <Briefcase className='w-3 h-3 sm:w-4 sm:h-4' />
                    <span className='text-xs sm:text-sm drop-shadow'>{profile.course}</span>
                  </div>
                )}
                {profile.distance && (
                  <div className='flex items-center gap-2 text-white/90'>
                    <MapPin className='w-3 h-3 sm:w-4 sm:h-4' />
                    <span className='text-xs sm:text-sm drop-shadow'>{profile.distance}</span>
                  </div>
                )}
                {profile.relationshipGoal && (
                  <div className='flex items-center gap-2 text-white/90 mt-1'>
                    <Heart className='w-3 h-3 sm:w-4 sm:h-4' />
                    <span className='text-xs sm:text-sm drop-shadow'>
                      {profile.relationshipGoal === 'relationship' && 'Looking for a relationship'}
                      {profile.relationshipGoal === 'casual' && 'Something casual'}
                      {profile.relationshipGoal === 'friends' && 'Just friends'}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={e => {
                  e.stopPropagation();
                  setShowInfo(!showInfo);
                }}
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
                    {profile.interests
                      .filter(i => i)
                      .map((interest, index) => (
                        <Badge
                          key={`${interest}-${index}`}
                          variant='secondary'
                          className='bg-white/20 text-white border-0 text-xs sm:text-sm backdrop-blur-sm'
                        >
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

interface SwipePeopleProps {
  onGoToShop?: () => void;
}

export default function SwipePeople({ onGoToShop }: SwipePeopleProps) {
  const { user, userProfile } = useAuth();
  const { notifications } = useSettings();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastAction, setLastAction] = useState<{ profile: Profile; direction: string } | null>(null);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [showMatchCelebration, setShowMatchCelebration] = useState(false);
  const [useFullScreenMatch, setUseFullScreenMatch] = useState(true);

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

        // Map Firebase user profiles to our Profile interface
        // Filter out users without valid photos
        const mappedProfiles: Profile[] = users
          .filter((u: any) => {
            // Check if user has at least one valid photo URL
            const photos = u.photos || [];
            const validPhotos = photos.filter((p: string) => p && p.trim() !== '' && !p.includes('placeholder'));
            return validPhotos.length > 0;
          })
          .map((u: any) => ({
            id: u.uid || u.id,
            name: u.displayName || u.name,
            age: u.age,
            bio: u.bio,
            photos: (u.photos || []).filter((p: string) => p && p.trim() !== ''),
            interests: u.interests || [],
            course: u.city ? `${u.city}, ${u.country}` : '',
            distance: u.city === userProfile.city ? 'Same city' : u.country === userProfile.country ? 'Same country' : '',
            relationshipGoal: u.relationshipGoal,
            gender: u.gender
          }));

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

        setProfiles(sortedProfiles);
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
              className='w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-black shadow-lg flex items-center justify-center disabled:opacity-30 border border-muted dark:border-frinder-orange/20 transition-shadow hover:shadow-xl'
            >
              <RotateCcw className='w-4 h-4 sm:w-5 sm:h-5 text-frinder-amber' />
            </motion.button>

            {/* Nope */}
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => handleButtonSwipe('left')}
              className='w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white dark:bg-black shadow-lg flex items-center justify-center border-2 border-red-200 dark:border-red-900/50 transition-all hover:shadow-xl hover:border-red-300'
            >
              <X className='w-7 h-7 sm:w-8 sm:h-8 text-red-500' strokeWidth={2.5} />
            </motion.button>

            {/* Super Like */}
            <motion.button
              whileHover={hasSuperLikes ? { scale: 1.15 } : {}}
              whileTap={hasSuperLikes ? { scale: 0.85 } : {}}
              onClick={() => {
                if (hasSuperLikes) {
                  handleButtonSwipe('up');
                } else {
                  setShowNoSuperLikesDialog(true);
                }
              }}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full shadow-lg flex items-center justify-center border transition-all relative ${
                hasSuperLikes
                  ? 'bg-white dark:bg-black border-blue-200 dark:border-blue-900/50 hover:shadow-xl hover:border-blue-300'
                  : 'bg-gray-100 dark:bg-black border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
              }`}
            >
              <Star className={`w-5 h-5 sm:w-6 sm:h-6 ${hasSuperLikes ? 'text-blue-500' : 'text-gray-400'}`} fill='currentColor' />
              {!hasSuperLikes && (
                <span className='absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold'>0</span>
              )}
            </motion.button>

            {/* Like */}
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => handleButtonSwipe('right')}
              className='w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white dark:bg-black shadow-lg flex items-center justify-center border-2 border-green-200 dark:border-green-900/50 transition-all hover:shadow-xl hover:border-green-300'
            >
              <Heart className='w-7 h-7 sm:w-8 sm:h-8 text-green-500' fill='currentColor' />
            </motion.button>
          </div>

          {/* Super Likes Counter */}
          <div className='flex justify-center mt-2'>
            <div className='flex items-center gap-1 text-xs text-muted-foreground'>
              <Star className='w-3 h-3 text-blue-500' fill='currentColor' />
              <span>{userCredits?.superLikes ?? 0} Super Likes</span>
              {userSubscription?.isPremium && (
                <Badge className='ml-1 bg-frinder-orange text-white text-[10px] px-1 py-0'>Premium</Badge>
              )}
            </div>
          </div>
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
