'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Heart, Users, MessageCircle, User, Flame, Settings, LogOut, Sparkles, Search, Star, Crown } from 'lucide-react';
import SwipePeople from '@/components/swipe/SwipePeople';
import SwipeGroups from '@/components/swipe/SwipeGroups';
import Messages from '@/components/messages/Messages';
import Profile from '@/components/profile/Profile';
import Matches from '@/components/matches/Matches';
import SearchComponent from '@/components/search/Search';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToUnreadCount, subscribeToUserCredits, subscribeToUserSubscription, type UserCredits, type UserSubscription } from '@/lib/firebaseServices';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SettingsSheet } from '@/components/profile/SettingsSheet';

type Tab = 'swipe' | 'groups' | 'search' | 'matches' | 'messages' | 'profile';

export default function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>('swipe');
  const { darkMode } = useSettings();
  const { user, userProfile, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [selectedChatInfo, setSelectedChatInfo] = useState<{
    matchId: string;
    name: string;
    photo: string;
    otherUserId: string;
  } | null>(null);

  // Subscribe to unread message count
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToUnreadCount(user.uid, (count) => {
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

  const tabs = [
    { id: 'swipe' as Tab, icon: Heart, label: 'Discover', fillActive: true },
    { id: 'groups' as Tab, icon: Users, label: 'Groups', fillActive: false },
    { id: 'search' as Tab, icon: Search, label: 'Search', fillActive: false },
    { id: 'matches' as Tab, icon: Sparkles, label: 'Matches', fillActive: false },
    { id: 'messages' as Tab, icon: MessageCircle, label: 'Messages', fillActive: false },
    { id: 'profile' as Tab, icon: User, label: 'Profile', fillActive: false }
  ];

  const handleStartChat = (matchId: string, name: string, photo: string, otherUserId: string) => {
    setSelectedChatInfo({ matchId, name, photo, otherUserId });
    setActiveTab('messages');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'swipe':
        return <SwipePeople />;
      case 'groups':
        return <SwipeGroups />;
      case 'search':
        return <SearchComponent />;
      case 'matches':
        return <Matches onStartChat={handleStartChat} />;
      case 'messages':
        return <Messages />;
      case 'profile':
        return <Profile />;
      default:
        return <SwipePeople />;
    }
  };

  return (
    <div className='h-screen flex bg-background dark:bg-black'>
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className='hidden lg:flex flex-col w-72 border-r bg-white dark:bg-black dark:border-gray-800'>
        {/* Logo */}
        <div className='p-6 border-b dark:border-gray-800'>
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            className='flex items-center gap-3'
          >
            <Image 
              src='/frinder-logo.png' 
              alt='Frinder' 
              width={40} 
              height={40} 
              className='rounded-xl shadow-lg'
              priority
            />
            <div>
              <span className='text-2xl font-bold bg-gradient-to-r from-frinder-orange to-frinder-gold bg-clip-text text-transparent'>
                Frinder
              </span>
              <p className='text-xs text-muted-foreground'>Find your match</p>
            </div>
          </motion.div>
        </div>

        {/* User Profile Card */}
        <div className='p-4'>
          <div className='bg-gradient-to-br from-frinder-orange/10 to-frinder-gold/10 dark:from-frinder-orange/20 dark:to-frinder-gold/20 rounded-xl p-4'>
            <div className='flex items-center gap-3'>
              <Avatar className='w-12 h-12 border-2 border-frinder-orange'>
                <AvatarImage src={userProfile?.photos?.[0]} alt={userProfile?.displayName} />
                <AvatarFallback className='bg-frinder-orange text-white'>
                  {userProfile?.displayName?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className='flex-1 min-w-0'>
                <h3 className='font-semibold text-sm truncate dark:text-white'>
                  {userProfile?.displayName || 'User'}
                </h3>
                <p className='text-xs text-muted-foreground truncate'>
                  {userProfile?.city}, {userProfile?.country}
                </p>
              </div>
              <Sparkles className='w-5 h-5 text-frinder-orange' />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className='flex-1 px-3 py-2'>
          <div className='space-y-1'>
            {tabs.map(tab => (
              <motion.button
                key={tab.id}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-frinder-orange text-white shadow-lg shadow-frinder-orange/25'
                    : 'hover:bg-muted dark:hover:bg-gray-900 text-muted-foreground hover:text-foreground dark:hover:text-white'
                }`}
              >
                <div className='relative'>
                  <tab.icon
                    className='w-5 h-5'
                    fill={activeTab === tab.id && tab.fillActive ? 'currentColor' : 'none'}
                  />
                  {tab.id === 'messages' && unreadCount > 0 && (
                    <span className='absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1'>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className='font-medium'>{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className='p-4 border-t dark:border-gray-800 space-y-2'>
          <button 
            onClick={() => setSettingsOpen(true)}
            className='w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted dark:hover:bg-gray-900 text-muted-foreground hover:text-foreground dark:hover:text-white transition-all'
          >
            <Settings className='w-5 h-5' />
            <span className='font-medium'>Settings</span>
          </button>
          <button 
            onClick={() => signOut()}
            className='w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all'
          >
            <LogOut className='w-5 h-5' />
            <span className='font-medium'>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className='flex-1 flex flex-col min-w-0'>
        {/* Mobile Header - hidden on desktop */}
        <div className='lg:hidden px-4 py-3 flex items-center justify-between border-b bg-white dark:bg-black dark:border-gray-800'>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className='flex items-center gap-2'>
            <img 
              src='/frinder-logo.png' 
              alt='Frinder' 
              className='w-8 h-8 rounded-full'
            />
            <span className='text-xl font-bold bg-gradient-to-r from-frinder-orange to-frinder-gold bg-clip-text text-transparent'>
              Frinder
            </span>
          </motion.div>
          
          {/* Credits Display - Mobile */}
          <div className='flex items-center gap-2'>
            <div className='flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 dark:bg-blue-500/20'>
              <Star className='w-3.5 h-3.5 text-blue-500' fill='currentColor' />
              <span className='text-xs font-semibold text-blue-600 dark:text-blue-400'>
                {userSubscription?.unlimitedSuperLikes ? '∞' : (userCredits?.superLikes ?? 0)}
              </span>
            </div>
            {userSubscription?.isPremium && (
              <div className='flex items-center gap-1 px-2 py-1 rounded-full bg-frinder-orange/10 dark:bg-frinder-orange/20'>
                <Crown className='w-3.5 h-3.5 text-frinder-orange' />
              </div>
            )}
          </div>
        </div>

        {/* Desktop Header */}
        <div className='hidden lg:flex px-6 py-4 items-center justify-between border-b bg-white dark:bg-black dark:border-gray-800'>
          <div>
            <h1 className='text-2xl font-bold dark:text-white'>
              {tabs.find(t => t.id === activeTab)?.label}
            </h1>
            <p className='text-sm text-muted-foreground'>
              {activeTab === 'swipe' && 'Find your perfect match'}
              {activeTab === 'groups' && 'Join groups with similar interests'}
              {activeTab === 'matches' && 'View and interact with your matches'}
              {activeTab === 'messages' && 'Chat with your matches'}
              {activeTab === 'profile' && 'Manage your profile'}
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <Avatar className='w-10 h-10 border-2 border-frinder-orange'>
              <AvatarImage src={userProfile?.photos?.[0]} alt={userProfile?.displayName} />
              <AvatarFallback className='bg-frinder-orange text-white'>
                {userProfile?.displayName?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-hidden'>
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

        {/* Mobile Bottom Navigation - hidden on desktop */}
        <div className='lg:hidden border-t bg-white dark:bg-black dark:border-gray-800 safe-bottom'>
          <div className='flex items-center justify-around py-2 pb-safe'>
            {tabs.map(tab => (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab(tab.id)}
                className='relative flex flex-col items-center gap-1 p-2 min-w-[60px] sm:min-w-[64px]'
              >
                <div className='relative'>
                  <tab.icon
                    className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${
                      activeTab === tab.id ? 'text-frinder-orange' : 'text-muted-foreground'
                    }`}
                    fill={activeTab === tab.id && tab.fillActive ? 'currentColor' : 'none'}
                  />
                  {tab.id === 'messages' && unreadCount > 0 && (
                    <span className='absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1'>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-medium transition-colors ${
                    activeTab === tab.id ? 'text-frinder-orange' : 'text-muted-foreground'
                  }`}
                >
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <motion.div layoutId='activeTab' className='absolute -bottom-2 w-1 h-1 rounded-full bg-frinder-orange' />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Sheet */}
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
