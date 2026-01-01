'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SettingsSheet } from './SettingsSheet';
import { PrivacySheet } from './PrivacySheet';
import { NotificationsSheet } from './NotificationsSheet';
import { HelpSheet } from './HelpSheet';
import {
  Settings,
  Edit,
  Camera,
  MapPin,
  LogOut,
  ChevronRight,
  Shield,
  Bell,
  HelpCircle,
  Star,
  Moon,
  Sun,
  Verified
} from 'lucide-react';

export default function Profile() {
  const { userProfile, updateProfile, signOut } = useAuth();
  const { darkMode, toggleDarkMode } = useSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [editData, setEditData] = useState({
    displayName: userProfile?.displayName || 'John Doe',
    bio: userProfile?.bio || 'Coffee lover ☕ | Adventure seeker | Looking for meaningful connections',
    age: userProfile?.age || 22
  });

  // Profile data from Firebase
  const profile = {
    displayName: userProfile?.displayName || 'Your Name',
    bio: userProfile?.bio || 'Tell others about yourself...',
    age: userProfile?.age || 22,
    photos: userProfile?.photos || [],
    interests: userProfile?.interests || [],
    location: userProfile?.city ? `${userProfile.city}, ${userProfile.country}` : '',
    verified: userProfile?.isEmailVerified || false,
    stats: {
      matches: 0,
      likes: 0,
      superLikes: 0
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile(editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  return (
    <div className='h-full overflow-y-auto bg-[#fff7ed] dark:bg-gray-900'>
      {/* Header with profile photo */}
      <div className='relative h-56 sm:h-64'>
        <div className='absolute inset-0 bg-[#ed8c00]' />
        <div className='absolute inset-0 flex flex-col items-center justify-center text-white'>
          <div className='relative'>
            <Avatar className='w-24 h-24 sm:w-28 sm:h-28 border-4 border-white shadow-xl'>
              <AvatarImage src={profile.photos[0]} alt={profile.displayName} />
              <AvatarFallback className='text-2xl sm:text-3xl bg-[#cc5d00] text-white'>{profile.displayName[0]}</AvatarFallback>
            </Avatar>
            {profile.verified && (
              <div className='absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-500 flex items-center justify-center border-2 border-white'>
                <Verified className='w-4 h-4 sm:w-5 sm:h-5 text-white' />
              </div>
            )}
            <button className='absolute bottom-0 left-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-lg flex items-center justify-center'>
              <Camera className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ed8c00]' />
            </button>
          </div>
          <h1 className='text-xl sm:text-2xl font-bold mt-3 sm:mt-4'>
            {profile.displayName}, {profile.age}
          </h1>
          {profile.location && (
            <div className='flex items-center gap-2 mt-1 text-white/90'>
              <MapPin className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
              <span className='text-xs sm:text-sm'>{profile.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className='px-3 sm:px-4 -mt-6 relative z-10'>
        <Card className='border-0 shadow-lg dark:bg-gray-800'>
          <CardContent className='p-3 sm:p-4'>
            <div className='grid grid-cols-3 gap-3 sm:gap-4 text-center'>
              <div>
                <div className='text-xl sm:text-2xl font-bold text-[#ed8c00]'>{profile.stats.matches}</div>
                <div className='text-[10px] sm:text-xs text-muted-foreground'>Matches</div>
              </div>
              <div>
                <div className='text-xl sm:text-2xl font-bold text-[#ffbe42]'>{profile.stats.likes}</div>
                <div className='text-[10px] sm:text-xs text-muted-foreground'>Likes</div>
              </div>
              <div>
                <div className='text-xl sm:text-2xl font-bold text-blue-500'>{profile.stats.superLikes}</div>
                <div className='text-[10px] sm:text-xs text-muted-foreground'>Super Likes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bio & Interests */}
      <div className='px-3 sm:px-4 mt-3 sm:mt-4'>
        <Card className='border-0 shadow-md dark:bg-gray-800'>
          <CardContent className='p-3 sm:p-4'>
            <div className='flex items-center justify-between mb-2 sm:mb-3'>
              <h2 className='font-semibold text-sm sm:text-base dark:text-white'>About Me</h2>
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <button className='p-1.5 sm:p-2 hover:bg-muted dark:hover:bg-gray-700 rounded-full transition-colors'>
                    <Edit className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground' />
                  </button>
                </DialogTrigger>
                <DialogContent className='sm:max-w-md mx-4 dark:bg-gray-800'>
                  <DialogHeader>
                    <DialogTitle className='dark:text-white'>Edit Profile</DialogTitle>
                  </DialogHeader>
                  <div className='space-y-3 sm:space-y-4 py-3 sm:py-4'>
                    <div className='space-y-1.5 sm:space-y-2'>
                      <Label htmlFor='name' className='dark:text-white'>Display Name</Label>
                      <Input
                        id='name'
                        value={editData.displayName}
                        onChange={e => setEditData(prev => ({ ...prev, displayName: e.target.value }))}
                        className='dark:bg-gray-700 dark:border-gray-600 dark:text-white'
                      />
                    </div>
                    <div className='space-y-1.5 sm:space-y-2'>
                      <Label htmlFor='age' className='dark:text-white'>Age</Label>
                      <Input
                        id='age'
                        type='number'
                        value={editData.age}
                        onChange={e => setEditData(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                        className='dark:bg-gray-700 dark:border-gray-600 dark:text-white'
                      />
                    </div>
                    <div className='space-y-1.5 sm:space-y-2'>
                      <Label htmlFor='bio' className='dark:text-white'>Bio</Label>
                      <Textarea
                        id='bio'
                        value={editData.bio}
                        onChange={e => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                        className='min-h-[100px] dark:bg-gray-700 dark:border-gray-600 dark:text-white'
                      />
                    </div>
                    <Button onClick={handleSaveProfile} className='w-full bg-[#ed8c00] hover:bg-[#cc5d00]'>
                      Save Changes
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className='text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4'>{profile.bio}</p>

            <h3 className='font-semibold mb-1.5 sm:mb-2 text-sm sm:text-base dark:text-white'>Interests</h3>
            <div className='flex flex-wrap gap-1.5 sm:gap-2'>
              {profile.interests.map(interest => (
                <Badge
                  key={interest}
                  variant='secondary'
                  className='bg-[#ed8c00]/10 text-[#ed8c00] hover:bg-[#ed8c00]/20 text-xs sm:text-sm'
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Photos */}
      <div className='px-3 sm:px-4 mt-3 sm:mt-4'>
        <Card className='border-0 shadow-md dark:bg-gray-800'>
          <CardContent className='p-3 sm:p-4'>
            <div className='flex items-center justify-between mb-2 sm:mb-3'>
              <h2 className='font-semibold text-sm sm:text-base dark:text-white'>My Photos</h2>
              <button className='text-xs sm:text-sm text-[#ed8c00] font-medium'>Edit</button>
            </div>
            <div className='grid grid-cols-3 gap-1.5 sm:gap-2'>
              {profile.photos.map((photo, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  className='aspect-[3/4] rounded-lg overflow-hidden'
                >
                  <img src={photo} alt={`Photo ${index + 1}`} className='w-full h-full object-cover' />
                </motion.div>
              ))}
              {[...Array(Math.max(0, 6 - profile.photos.length))].map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className='aspect-[3/4] rounded-lg border-2 border-dashed border-muted dark:border-gray-700 flex items-center justify-center'
                >
                  <Camera className='w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground' />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Items */}
      <div className='px-3 sm:px-4 mt-3 sm:mt-4 pb-6 sm:pb-8'>
        <Card className='border-0 shadow-md dark:bg-gray-800'>
          <CardContent className='p-2'>
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className='w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted dark:hover:bg-gray-700 transition-colors'
            >
              <div className='w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center'>
                {darkMode ? <Moon className='w-5 h-5 text-purple-600 dark:text-purple-300' /> : <Sun className='w-5 h-5 text-yellow-600' />}
              </div>
              <span className='flex-1 text-left font-medium dark:text-white'>Dark Mode</span>
              <div
                className={`w-12 h-7 rounded-full transition-colors ${darkMode ? 'bg-[#ed8c00]' : 'bg-muted dark:bg-gray-600'} relative`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </div>
            </button>

            {/* Settings */}
            <button
              onClick={() => setSettingsOpen(true)}
              className='w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted dark:hover:bg-gray-700 transition-colors'
            >
              <div className='w-10 h-10 rounded-full bg-muted dark:bg-gray-700 flex items-center justify-center'>
                <Settings className='w-5 h-5 text-muted-foreground' />
              </div>
              <span className='flex-1 text-left font-medium dark:text-white'>Settings</span>
              <ChevronRight className='w-5 h-5 text-muted-foreground' />
            </button>

            {/* Privacy & Safety */}
            <button
              onClick={() => setPrivacyOpen(true)}
              className='w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted dark:hover:bg-gray-700 transition-colors'
            >
              <div className='w-10 h-10 rounded-full bg-muted dark:bg-gray-700 flex items-center justify-center'>
                <Shield className='w-5 h-5 text-muted-foreground' />
              </div>
              <span className='flex-1 text-left font-medium dark:text-white'>Privacy & Safety</span>
              <ChevronRight className='w-5 h-5 text-muted-foreground' />
            </button>

            {/* Notifications */}
            <button
              onClick={() => setNotificationsOpen(true)}
              className='w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted dark:hover:bg-gray-700 transition-colors'
            >
              <div className='w-10 h-10 rounded-full bg-muted dark:bg-gray-700 flex items-center justify-center'>
                <Bell className='w-5 h-5 text-muted-foreground' />
              </div>
              <span className='flex-1 text-left font-medium dark:text-white'>Notifications</span>
              <ChevronRight className='w-5 h-5 text-muted-foreground' />
            </button>

            {/* Get Premium */}
            <button
              className='w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted dark:hover:bg-gray-700 transition-colors'
            >
              <div className='w-10 h-10 rounded-full bg-gradient-to-r from-[#ed8c00] to-[#ffbe42] flex items-center justify-center'>
                <Star className='w-5 h-5 text-white' />
              </div>
              <span className='flex-1 text-left font-medium dark:text-white'>Get Premium</span>
              <Badge className='bg-[#ed8c00]'>NEW</Badge>
              <ChevronRight className='w-5 h-5 text-muted-foreground' />
            </button>

            {/* Help & Support */}
            <button
              onClick={() => setHelpOpen(true)}
              className='w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted dark:hover:bg-gray-700 transition-colors'
            >
              <div className='w-10 h-10 rounded-full bg-muted dark:bg-gray-700 flex items-center justify-center'>
                <HelpCircle className='w-5 h-5 text-muted-foreground' />
              </div>
              <span className='flex-1 text-left font-medium dark:text-white'>Help & Support</span>
              <ChevronRight className='w-5 h-5 text-muted-foreground' />
            </button>

            {/* Sign out */}
            <button
              onClick={() => signOut()}
              className='w-full flex items-center gap-4 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500'
            >
              <div className='w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center'>
                <LogOut className='w-5 h-5' />
              </div>
              <span className='flex-1 text-left font-medium'>Sign Out</span>
            </button>
          </CardContent>
        </Card>

        {/* App version */}
        <p className='text-center text-xs text-muted-foreground mt-6'>Frinder v1.0.0</p>
      </div>

      {/* Settings Sheets */}
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <PrivacySheet open={privacyOpen} onOpenChange={setPrivacyOpen} />
      <NotificationsSheet open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      <HelpSheet open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
