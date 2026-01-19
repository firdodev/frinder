'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Heart,
  Users,
  MessageCircle,
  User,
  Settings,
  LogOut,
  Sparkles,
  Search,
  Star,
  Crown,
  ShoppingBag,
  ChevronRight,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import SwipePeople from '@/components/swipe/SwipePeople';
import SwipeGroups from '@/components/swipe/SwipeGroups';
import Messages from '@/components/messages/Messages';
import Profile from '@/components/profile/Profile';
import Matches from '@/components/matches/Matches';
import SearchComponent from '@/components/search/Search';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToUnreadCount,
  subscribeToUserCredits,
  subscribeToUserSubscription,
  type UserCredits,
  type UserSubscription
} from '@/lib/firebaseServices';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SettingsSheet } from '@/components/profile/SettingsSheet';
import { Button } from '@/components/ui/button';
import AdminPanelTab from '@/components/admin/AdminPanelTab';

type Tab = 'swipe' | 'groups' | 'search' | 'matches' | 'messages' | 'profile' | 'admin';

// Onboarding Tutorial Component
function OnboardingTutorial({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  
  const steps = [
    {
      icon: Heart,
      title: "Welcome to Frinder!",
      description: "Let's show you how to find your perfect match",
      color: "from-frinder-orange to-frinder-gold",
      details: [
        "Swipe through profiles",
        "Match with people who like you back",
        "Start meaningful conversations"
      ]
    },
    {
      icon: ThumbsUp,
      title: "Like Someone",
      description: "Swipe right or tap the heart to like",
      color: "from-green-400 to-emerald-500",
      details: [
        "Swipe the card to the RIGHT",
        "Or tap the green heart button",
        "If they like you back, it's a match!"
      ]
    },
    {
      icon: ThumbsDown,
      title: "Pass on Someone",
      description: "Swipe left or tap X to pass",
      color: "from-red-400 to-rose-500",
      details: [
        "Swipe the card to the LEFT",
        "Or tap the red X button",
        "Don't worry, they may appear again later"
      ]
    },
    {
      icon: Star,
      title: "Super Like ⭐",
      description: "Stand out from the crowd!",
      color: "from-blue-400 to-indigo-500",
      details: [
        "Swipe UP or tap the star button",
        "They'll know you really like them",
        "Much higher chance of matching!"
      ]
    },
    {
      icon: ShoppingBag,
      title: "Get More Features",
      description: "Visit the Shop for upgrades",
      color: "from-purple-400 to-pink-500",
      details: [
        "Go to Profile → Shop",
        "Buy Super Likes to stand out",
        "Upgrade to Pro for unlimited features"
      ]
    }
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;
  const isLastStep = step === steps.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        key={step}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-8 bg-white' : 'w-2 bg-white/30'
              }`}
              animate={{ scale: i === step ? 1 : 0.8 }}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-black rounded-3xl overflow-hidden shadow-2xl">
          {/* Icon header */}
          <div className={`bg-gradient-to-br ${currentStep.color} p-8 flex justify-center`}>
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: step === 3 ? [0, -10, 10, 0] : 0 
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              <Icon className="w-12 h-12 text-white" />
            </motion.div>
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-2 dark:text-white">{currentStep.title}</h2>
            <p className="text-muted-foreground mb-6">{currentStep.description}</p>

            <div className="space-y-3 mb-8">
              {currentStep.details.map((detail, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 text-left bg-gray-50 dark:bg-black rounded-xl px-4 py-3"
                >
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${currentStep.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {i + 1}
                  </div>
                  <span className="text-sm dark:text-gray-200">{detail}</span>
                </motion.div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              {step > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1"
                >
                  Back
                </Button>
              )}
              <Button
                onClick={() => {
                  if (isLastStep) {
                    onComplete();
                  } else {
                    setStep(s => s + 1);
                  }
                }}
                className={`flex-1 bg-gradient-to-r ${currentStep.color} text-white border-0 hover:opacity-90`}
              >
                {isLastStep ? "Start Swiping!" : "Next"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Skip button */}
        <button
          onClick={onComplete}
          className="w-full mt-4 text-white/60 hover:text-white text-sm transition-colors"
        >
          Skip tutorial
        </button>
      </motion.div>
    </motion.div>
  );
}

const ADMIN_EMAILS = [
  'rikardo_balaj@universitetipolis.edu.al',
  'firdeus_kasaj@universitetipolis.edu.al'
];

export default function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>('swipe');
  useSettings(); // Keep for potential future use
  const { user, userProfile, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Check if user has seen onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('frinder_onboarding_complete');
    if (!hasSeenOnboarding) {
      // Small delay to let the app load first
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('frinder_onboarding_complete', 'true');
    setShowOnboarding(false);
  };

  // Subscribe to unread message count
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToUnreadCount(user.uid, count => {
      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [user?.uid]);

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

  const isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email);

  // Grant admins unlimited superlikes, pro, and no ads
  let effectiveUserSubscription = userSubscription;
  let effectiveUserCredits = userCredits;
  if (isAdmin) {
    effectiveUserSubscription = {
      isPremium: true,
      isAdFree: true,
      premiumExpiresAt: null,
      adFreeExpiresAt: null,
      unlimitedSuperLikes: true,
      canSeeWhoLikedYou: true,
      unlimitedRewinds: true,
      priorityInDiscovery: true,
      advancedFilters: true,
    };
    effectiveUserCredits = {
      superLikes: 99999,
      lastFreeSuperLike: userCredits?.lastFreeSuperLike ?? null,
      totalSuperLikesPurchased: userCredits?.totalSuperLikesPurchased ?? 0,
      swipeCount: userCredits?.swipeCount ?? 0,
      lastSwipeCountReset: userCredits?.lastSwipeCountReset ?? null,
    };
  }

  const tabs: { id: Tab; icon: any; label: string; fillActive: boolean }[] = [
    { id: 'swipe', icon: Heart, label: 'Discover', fillActive: true },
    { id: 'groups', icon: Users, label: 'Groups', fillActive: false },
    { id: 'search', icon: Search, label: 'Search', fillActive: false },
    { id: 'matches', icon: Sparkles, label: 'Matches', fillActive: false },
    { id: 'messages', icon: MessageCircle, label: 'Messages', fillActive: false },
  ];
  if (isAdmin) {
    tabs.push({ id: 'admin', icon: Crown, label: 'Admin', fillActive: false });
  }

  const handleStartChat = (_matchId: string, _name: string, _photo: string, _otherUserId: string) => {
    setActiveTab('messages');
  };

  const handleOpenGroupChat = (groupId: string) => {
    setSelectedGroupId(groupId);
    setActiveTab('messages');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'swipe':
        return <SwipePeople onGoToShop={() => setActiveTab('profile')} onGoToProfile={() => setActiveTab('profile')} />;
      case 'groups':
        return <SwipeGroups onOpenGroupChat={handleOpenGroupChat} />;
      case 'search':
        return <SearchComponent />;
      case 'matches':
        return <Matches onStartChat={handleStartChat} />;
      case 'messages':
        return <Messages initialGroupId={selectedGroupId} onGroupOpened={() => setSelectedGroupId(null)} />;
      case 'profile':
        return <Profile onGoToShop={() => setActiveTab('profile')} onBack={() => setActiveTab('swipe')} />;
      case 'admin':
        if (!isAdmin) {
          return (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <h2 className="text-2xl font-bold mb-2">Unauthorized</h2>
              <p className="text-muted-foreground">You are not authorized to view this panel.</p>
            </div>
          );
        }
        return <AdminPanelTab />;
      default:
        return <SwipePeople onGoToShop={() => setActiveTab('profile')} />;
    }
  };

  return (
    <div className='h-dvh flex bg-gray-100 dark:bg-black mobile-fullscreen'>
      {/* Onboarding Tutorial */}
      <AnimatePresence>
        {showOnboarding && <OnboardingTutorial onComplete={handleOnboardingComplete} />}
      </AnimatePresence>

      {/* Desktop Sidebar - hidden on mobile */}
      <aside className='hidden lg:flex flex-col w-80 bg-white dark:bg-black m-3 rounded-2xl shadow-xl dark:shadow-none dark:border dark:border-frinder-orange/20'>
        {/* Logo */}
        <div className='p-6 border-b dark:border-frinder-orange/20'>
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setActiveTab('swipe')}
            className='flex items-center gap-3 hover:opacity-80 transition-opacity'
          >
            <Image src='/frinder-logo.png' alt='Frinder' width={40} height={40} className='rounded-xl shadow-md' priority />
            <div className='text-left'>
              <span className='text-2xl font-bold bg-gradient-to-r from-frinder-orange to-frinder-gold bg-clip-text text-transparent'>
                Frinder
              </span>
              <p className='text-xs text-muted-foreground'>Find your match</p>
            </div>
          </motion.button>
        </div>

        {/* User Profile Card */}
        <div className='p-4'>
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className='bg-gradient-to-br from-frinder-orange/10 via-frinder-gold/5 to-transparent dark:from-frinder-orange/20 dark:via-frinder-gold/10 dark:to-transparent rounded-2xl p-4 border border-frinder-orange/20 dark:border-frinder-orange/30'
          >
            <div className='flex items-center gap-3'>
              <button onClick={() => setActiveTab('profile')} className='hover:opacity-80 transition-opacity'>
                <Avatar className='w-14 h-14 border-2 border-frinder-orange cursor-pointer shadow-lg shadow-frinder-orange/20'>
                  <AvatarImage src={userProfile?.photos?.[0]} alt={userProfile?.displayName} />
                  <AvatarFallback className='bg-frinder-orange text-white text-lg'>
                    {userProfile?.displayName?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
              <div className='flex-1 min-w-0'>
                <h3 className='font-semibold truncate dark:text-white'>{userProfile?.displayName || 'User'}</h3>
                <p className='text-xs text-muted-foreground truncate'>
                  {userProfile?.city}, {userProfile?.country}
                </p>
                {effectiveUserSubscription?.isPremium && (
                  <div className='flex items-center gap-1 mt-1'>
                    <Crown className='w-3 h-3 text-frinder-orange' />
                    <span className='text-[10px] font-semibold text-frinder-orange'>PRO MEMBER</span>
                  </div>
                )}
              </div>
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className='w-5 h-5 text-frinder-orange' />
              </motion.div>
            </div>
            {/* Super Likes Counter */}
            <div className='mt-3 pt-3 border-t border-frinder-orange/20 dark:border-frinder-orange/30 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Star className='w-4 h-4 text-blue-500' fill='currentColor' />
                <span className='text-xs text-muted-foreground'>Super Likes</span>
              </div>
              <span className='text-sm font-bold text-blue-500'>
                {isAdmin ? '∞' : (userCredits?.superLikes ?? 0)}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className='flex-1 px-4 py-2 overflow-y-auto'>
          <div className='space-y-1'>
            {tabs.map((tab, index) => (
              <motion.button
                key={tab.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-frinder-orange to-frinder-burnt text-white shadow-lg shadow-frinder-orange/30'
                    : 'hover:bg-gray-100 dark:hover:bg-frinder-orange/10 text-muted-foreground hover:text-foreground dark:hover:text-white'
                }`}
              >
                <div className='relative'>
                  <tab.icon
                    className='w-5 h-5'
                    fill={activeTab === tab.id && tab.fillActive ? 'currentColor' : 'none'}
                  />
                  {tab.id === 'messages' && unreadCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className='absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 shadow-md'
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.span>
                  )}
                </div>
                <span className='font-medium'>{tab.label}</span>
                {activeTab === tab.id && (
                  <ChevronRight className='w-4 h-4 ml-auto' />
                )}
              </motion.button>
            ))}
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className='p-4 border-t dark:border-frinder-orange/20 space-y-2'>
          <button
            onClick={() => setSettingsOpen(true)}
            className='w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-frinder-orange/10 text-muted-foreground hover:text-foreground dark:hover:text-white transition-all'
          >
            <Settings className='w-5 h-5' />
            <span className='font-medium'>Settings</span>
          </button>
          <button
            onClick={() => signOut()}
            className='w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all group'
          >
            <LogOut className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
            <span className='font-medium'>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className='flex-1 flex flex-col min-w-0 lg:my-3 lg:mr-3'>
        {/* Status bar background - extends behind notch on mobile */}
        <div className='lg:hidden status-bar-bg status-bar-bg-white' />

        {/* Desktop Header */}
        <div className='hidden lg:flex px-6 py-5 items-center justify-between bg-white dark:bg-black rounded-t-2xl border-b dark:border-frinder-orange/20'>
          <div>
            <h1 className='text-2xl font-bold dark:text-white'>{tabs.find(t => t.id === activeTab)?.label}</h1>
            <p className='text-sm text-muted-foreground'>
              {activeTab === 'swipe' && 'Find your perfect match'}
              {activeTab === 'groups' && 'Join groups with similar interests'}
              {activeTab === 'search' && 'Search for people and groups'}
              {activeTab === 'matches' && 'View and interact with your matches'}
              {activeTab === 'messages' && 'Chat with your matches'}
              {activeTab === 'profile' && 'Manage your profile'}
            </p>
          </div>
          <div className='flex items-center gap-4'>
            {/* Desktop Super Likes indicator */}
            <div className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20'>
              <Star className='w-4 h-4 text-blue-500' fill='currentColor' />
              <span className='text-sm font-semibold text-blue-500'>
                {isAdmin ? '∞' : (userCredits?.superLikes ?? 0)}
              </span>
            </div>
            <Avatar className='w-10 h-10 border-2 border-frinder-orange shadow-lg shadow-frinder-orange/20'>
              <AvatarImage src={userProfile?.photos?.[0]} alt={userProfile?.displayName} />
              <AvatarFallback className='bg-frinder-orange text-white'>
                {userProfile?.displayName?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-hidden ${activeTab === 'profile' ? 'pb-0' : 'pb-20'} lg:pb-0 lg:bg-white lg:dark:bg-black lg:rounded-b-2xl lg:shadow-xl lg:dark:shadow-none lg:dark:border lg:dark:border-t-0 lg:dark:border-frinder-orange/20`}>
          <AnimatePresence mode='wait'>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className='h-full'
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Navigation - hidden on desktop and profile */}
        {activeTab !== 'profile' && (
        <div className='lg:hidden fixed bottom-0 left-0 right-0 pl-safe pr-safe' style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className='mx-3 mb-3 rounded-2xl bg-white/95 dark:bg-black/95 backdrop-blur-lg border border-gray-200 dark:border-frinder-orange/20 shadow-lg'>
          <div className='flex items-center justify-around py-2'>
            {tabs.map(tab => (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab(tab.id as Tab)}
                className='relative flex flex-col items-center gap-1 p-2 min-w-[50px] sm:min-w-[60px]'
              >
                <div className='relative'>
                  <tab.icon
                    className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${
                      activeTab === tab.id ? 'text-frinder-orange' : 'text-muted-foreground'
                    }`}
                    fill={activeTab === tab.id && tab.fillActive ? 'currentColor' : 'none'}
                  />
                  {tab.id === 'messages' && unreadCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className='absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5'
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.span>
                  )}
                </div>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId='activeTab'
                    className='absolute -bottom-1 w-6 h-1 rounded-full bg-frinder-orange'
                  />
                )}
              </motion.button>
            ))}
          </div>
          </div>
        </div>
        )}
      </div>

      {/* Settings Sheet */}
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
