'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Users, MessageCircle, User } from 'lucide-react';
import SwipePeople from '@/components/swipe/SwipePeople';
import SwipeGroups from '@/components/swipe/SwipeGroups';
import Messages from '@/components/messages/Messages';
import Profile from '@/components/profile/Profile';
import { useSettings } from '@/contexts/SettingsContext';

type Tab = 'swipe' | 'groups' | 'messages' | 'profile';

export default function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>('swipe');
  const { darkMode } = useSettings();

  const tabs = [
    { id: 'swipe' as Tab, icon: Heart, label: 'Swipe', fillActive: true },
    { id: 'groups' as Tab, icon: Users, label: 'Groups', fillActive: false },
    { id: 'messages' as Tab, icon: MessageCircle, label: 'Messages', fillActive: false },
    { id: 'profile' as Tab, icon: User, label: 'Profile', fillActive: false }
  ];

  return (
    <div className='h-screen flex flex-col bg-background dark:bg-gray-900'>
      {/* Header */}
      <div className='px-4 py-3 flex items-center justify-between border-b bg-white dark:bg-gray-900 dark:border-gray-800'>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className='flex items-center gap-2'>
          <div className='w-8 h-8 rounded-full gradient-primary flex items-center justify-center'>
            <Heart className='w-4 h-4 text-white' fill='white' />
          </div>
          <span className='text-xl font-bold bg-gradient-to-r from-[#ed8c00] to-[#ffbe42] bg-clip-text text-transparent'>
            Frinder
          </span>
        </motion.div>

        {/* Header actions based on tab */}
        <div className='flex items-center gap-2'>
          {activeTab === 'swipe' && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className='p-2 rounded-full hover:bg-muted dark:hover:bg-gray-800'
            >
              <svg
                className='w-6 h-6 text-muted-foreground'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M12 5v14M5 12h14' />
              </svg>
            </motion.button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className='flex-1 overflow-hidden'>
        <AnimatePresence mode='wait'>
          {activeTab === 'swipe' && (
            <motion.div
              key='swipe'
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className='h-full'
            >
              <SwipePeople />
            </motion.div>
          )}
          {activeTab === 'groups' && (
            <motion.div
              key='groups'
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className='h-full'
            >
              <SwipeGroups />
            </motion.div>
          )}
          {activeTab === 'messages' && (
            <motion.div
              key='messages'
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className='h-full'
            >
              <Messages />
            </motion.div>
          )}
          {activeTab === 'profile' && (
            <motion.div
              key='profile'
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className='h-full'
            >
              <Profile />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div className='border-t bg-white dark:bg-gray-900 dark:border-gray-800 safe-bottom'>
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
                    activeTab === tab.id ? 'text-[#ed8c00]' : 'text-muted-foreground'
                  }`}
                  fill={activeTab === tab.id && tab.fillActive ? '#ed8c00' : 'none'}
                />
              </div>
              <span
                className={`text-[10px] sm:text-xs font-medium transition-colors ${
                  activeTab === tab.id ? 'text-[#ed8c00]' : 'text-muted-foreground'
                }`}
              >
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <motion.div layoutId='activeTab' className='absolute -bottom-2 w-1 h-1 rounded-full bg-[#ed8c00]' />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
