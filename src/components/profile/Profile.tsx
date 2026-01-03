'use client';

import { useState, useRef } from 'react';
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
import { uploadProfilePhoto, deleteProfilePhoto, compressImage } from '@/lib/storageService';
import { toast } from 'sonner';
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
  Verified,
  X,
  Plus,
  Loader2
} from 'lucide-react';

export default function Profile() {
  const { user, userProfile, updateProfile, signOut } = useAuth();
  const { darkMode, toggleDarkMode } = useSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPhotos, setIsEditingPhotos] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editData, setEditData] = useState({
    displayName: userProfile?.displayName || 'John Doe',
    bio: userProfile?.bio || 'Coffee lover | Adventure seeker | Looking for meaningful connections',
    age: userProfile?.age || 22
  });

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
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const file = files[0];
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    if (profile.photos.length >= 6) {
      toast.error('Maximum 6 photos allowed');
      return;
    }

    try {
      setUploadingPhoto(true);
      const compressedFile = await compressImage(file, 1024, 0.8);
      const photoUrl = await uploadProfilePhoto(user.uid, compressedFile, profile.photos.length);
      await updateProfile({ photos: [...profile.photos, photoUrl] });
      toast.success('Photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async (index: number) => {
    if (!user) return;
    const photoUrl = profile.photos[index];
    if (!photoUrl) return;

    try {
      setDeletingPhoto(index);
      await deleteProfilePhoto(photoUrl);
      const newPhotos = profile.photos.filter((_, i) => i !== index);
      await updateProfile({ photos: newPhotos });
      toast.success('Photo deleted!');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    } finally {
      setDeletingPhoto(null);
    }
  };

  const handleSetMainPhoto = async (index: number) => {
    if (index === 0 || !user) return;
    try {
      const newPhotos = [...profile.photos];
      const [photo] = newPhotos.splice(index, 1);
      newPhotos.unshift(photo);
      await updateProfile({ photos: newPhotos });
      toast.success('Main photo updated!');
    } catch (error) {
      console.error('Error setting main photo:', error);
      toast.error('Failed to update main photo');
    }
  };

  return (
    <div className='h-full overflow-y-auto bg-[#fff7ed] dark:bg-black'>
      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        onChange={handlePhotoUpload}
        className='hidden'
      />
      
      <div className='relative h-56 sm:h-64'>
        <div className='absolute inset-0 bg-frinder-orange' />
        <div className='absolute inset-0 flex flex-col items-center justify-center text-white'>
          <div className='absolute top-4 left-4 right-4 flex justify-between'>
            <button
              onClick={toggleDarkMode}
              className='w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors'
            >
              {darkMode ? <Moon className='w-5 h-5 text-white' /> : <Sun className='w-5 h-5 text-white' />}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className='w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors'
            >
              <Settings className='w-5 h-5 text-white' />
            </button>
          </div>
          
          <div className='relative'>
            <Avatar className='w-24 h-24 sm:w-28 sm:h-28 border-4 border-white shadow-xl'>
              <AvatarImage src={profile.photos[0]} alt={profile.displayName} />
              <AvatarFallback className='text-2xl sm:text-3xl bg-frinder-burnt text-white'>{profile.displayName[0]}</AvatarFallback>
            </Avatar>
            {profile.verified && (
              <div className='absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-500 flex items-center justify-center border-2 border-white'>
                <Verified className='w-4 h-4 sm:w-5 sm:h-5 text-white' />
              </div>
            )}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className='absolute bottom-0 left-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform'
            >
              <Camera className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-frinder-orange' />
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

      <div className='px-3 sm:px-4 -mt-6 relative z-10'>
        <Card className='border-0 shadow-lg dark:bg-gray-900 dark:border-gray-800'>
          <CardContent className='p-3 sm:p-4'>
            <div className='grid grid-cols-3 gap-3 sm:gap-4 text-center'>
              <div>
                <div className='text-xl sm:text-2xl font-bold text-frinder-orange'>{profile.stats.matches}</div>
                <div className='text-[10px] sm:text-xs text-muted-foreground'>Matches</div>
              </div>
              <div>
                <div className='text-xl sm:text-2xl font-bold text-frinder-gold'>{profile.stats.likes}</div>
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

      <div className='px-3 sm:px-4 mt-3 sm:mt-4'>
        <Card className='border-0 shadow-md dark:bg-gray-900 dark:border-gray-800'>
          <CardContent className='p-3 sm:p-4'>
            <div className='flex items-center justify-between mb-2 sm:mb-3'>
              <h2 className='font-semibold text-sm sm:text-base dark:text-white'>About Me</h2>
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <button className='p-1.5 sm:p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-full transition-colors'>
                    <Edit className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground' />
                  </button>
                </DialogTrigger>
                <DialogContent className='sm:max-w-md mx-4 dark:bg-black dark:border-gray-800'>
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
                        className='dark:bg-gray-900 dark:border-gray-800 dark:text-white'
                      />
                    </div>
                    <div className='space-y-1.5 sm:space-y-2'>
                      <Label htmlFor='age' className='dark:text-white'>Age</Label>
                      <Input
                        id='age'
                        type='number'
                        value={editData.age}
                        onChange={e => setEditData(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                        className='dark:bg-gray-900 dark:border-gray-800 dark:text-white'
                      />
                    </div>
                    <div className='space-y-1.5 sm:space-y-2'>
                      <Label htmlFor='bio' className='dark:text-white'>Bio</Label>
                      <Textarea
                        id='bio'
                        value={editData.bio}
                        onChange={e => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                        className='min-h-25 dark:bg-gray-900 dark:border-gray-800 dark:text-white'
                      />
                    </div>
                    <Button onClick={handleSaveProfile} className='w-full bg-frinder-orange hover:bg-frinder-burnt'>
                      Save Changes
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className='text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4'>{profile.bio}</p>

            <h3 className='font-semibold mb-1.5 sm:mb-2 text-sm sm:text-base dark:text-white'>Interests</h3>
            <div className='flex flex-wrap gap-1.5 sm:gap-2'>
              {profile.interests.filter(interest => interest).map((interest, index) => (
                <Badge
                  key={`${interest}-${index}`}
                  variant='secondary'
                  className='bg-frinder-orange/10 text-frinder-orange hover:bg-frinder-orange/20 text-xs sm:text-sm'
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='px-3 sm:px-4 mt-3 sm:mt-4'>
        <Card className='border-0 shadow-md dark:bg-gray-900 dark:border-gray-800'>
          <CardContent className='p-3 sm:p-4'>
            <div className='flex items-center justify-between mb-2 sm:mb-3'>
              <h2 className='font-semibold text-sm sm:text-base dark:text-white'>My Photos</h2>
              <button 
                onClick={() => setIsEditingPhotos(!isEditingPhotos)}
                className='text-xs sm:text-sm text-frinder-orange font-medium'
              >
                {isEditingPhotos ? 'Done' : 'Edit'}
              </button>
            </div>
            <div className='grid grid-cols-3 gap-1.5 sm:gap-2'>
              {profile.photos.map((photo, index) => (
                <motion.div
                  key={`photo-${index}`}
                  whileHover={{ scale: isEditingPhotos ? 1 : 1.05 }}
                  className='aspect-3/4 rounded-lg overflow-hidden relative group'
                >
                  <img src={photo} alt={`Photo ${index + 1}`} className='w-full h-full object-cover' />
                  {index === 0 && (
                    <div className='absolute top-1 left-1 bg-frinder-orange text-white text-[10px] px-1.5 py-0.5 rounded'>
                      Main
                    </div>
                  )}
                  {isEditingPhotos && (
                    <div className='absolute inset-0 bg-black/40 flex items-center justify-center gap-2'>
                      {deletingPhoto === index ? (
                        <Loader2 className='w-6 h-6 text-white animate-spin' />
                      ) : (
                        <>
                          <button
                            onClick={() => handleDeletePhoto(index)}
                            className='w-8 h-8 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors'
                          >
                            <X className='w-4 h-4 text-white' />
                          </button>
                          {index !== 0 && (
                            <button
                              onClick={() => handleSetMainPhoto(index)}
                              className='w-8 h-8 rounded-full bg-frinder-orange flex items-center justify-center hover:bg-frinder-burnt transition-colors'
                            >
                              <Star className='w-4 h-4 text-white' />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
              
              {profile.photos.length < 6 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className='aspect-3/4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center hover:border-frinder-orange hover:bg-frinder-orange/5 transition-colors'
                >
                  {uploadingPhoto ? (
                    <Loader2 className='w-6 h-6 text-frinder-orange animate-spin' />
                  ) : (
                    <Plus className='w-6 h-6 text-gray-400' />
                  )}
                </motion.button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='px-3 sm:px-4 mt-3 sm:mt-4 pb-6'>
        <Card className='border-0 shadow-md dark:bg-gray-900 dark:border-gray-800'>
          <CardContent className='p-0 divide-y dark:divide-gray-800'>
            <button 
              onClick={() => setSettingsOpen(true)}
              className='w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 dark:hover:bg-gray-800/50 transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-frinder-orange/10 flex items-center justify-center'>
                  <Settings className='w-4 h-4 sm:w-5 sm:h-5 text-frinder-orange' />
                </div>
                <span className='font-medium text-sm sm:text-base dark:text-white'>Settings</span>
              </div>
              <ChevronRight className='w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground' />
            </button>
            
            <button 
              onClick={() => setPrivacyOpen(true)}
              className='w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 dark:hover:bg-gray-800/50 transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/10 flex items-center justify-center'>
                  <Shield className='w-4 h-4 sm:w-5 sm:h-5 text-blue-500' />
                </div>
                <span className='font-medium text-sm sm:text-base dark:text-white'>Privacy</span>
              </div>
              <ChevronRight className='w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground' />
            </button>
            
            <button 
              onClick={() => setNotificationsOpen(true)}
              className='w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 dark:hover:bg-gray-800/50 transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500/10 flex items-center justify-center'>
                  <Bell className='w-4 h-4 sm:w-5 sm:h-5 text-green-500' />
                </div>
                <span className='font-medium text-sm sm:text-base dark:text-white'>Notifications</span>
              </div>
              <ChevronRight className='w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground' />
            </button>
            
            <button 
              onClick={() => setHelpOpen(true)}
              className='w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 dark:hover:bg-gray-800/50 transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-500/10 flex items-center justify-center'>
                  <HelpCircle className='w-4 h-4 sm:w-5 sm:h-5 text-purple-500' />
                </div>
                <span className='font-medium text-sm sm:text-base dark:text-white'>Help & Support</span>
              </div>
              <ChevronRight className='w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground' />
            </button>
            
            <button 
              onClick={signOut}
              className='w-full flex items-center justify-between p-3 sm:p-4 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500/10 flex items-center justify-center'>
                  <LogOut className='w-4 h-4 sm:w-5 sm:h-5 text-red-500' />
                </div>
                <span className='font-medium text-sm sm:text-base text-red-500'>Sign Out</span>
              </div>
              <ChevronRight className='w-4 h-4 sm:w-5 sm:h-5 text-red-400' />
            </button>
          </CardContent>
        </Card>
      </div>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <PrivacySheet open={privacyOpen} onOpenChange={setPrivacyOpen} />
      <NotificationsSheet open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      <HelpSheet open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
