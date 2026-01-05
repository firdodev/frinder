'use client';

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Moon, Sun, Globe, Trash2, LogOut, ChevronRight, AlertTriangle, Loader2, Sparkles, Key, Eye, EyeOff, UserX, Ban, Shield } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const { darkMode, toggleDarkMode } = useSettings();
  const { signOut, deleteAccount, changePassword } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [fullScreenMatch, setFullScreenMatch] = useState(true);
  
  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Load full screen match preference
  useEffect(() => {
    const saved = localStorage.getItem('frinder_fullScreenMatch');
    if (saved !== null) {
      setFullScreenMatch(JSON.parse(saved));
    }
  }, []);

  const toggleFullScreenMatch = () => {
    const newValue = !fullScreenMatch;
    setFullScreenMatch(newValue);
    localStorage.setItem('frinder_fullScreenMatch', JSON.stringify(newValue));
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      handleClosePasswordDialog();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('wrong-password') || error.message.includes('invalid-credential')) {
          toast.error('Current password is incorrect');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Failed to change password');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleClosePasswordDialog = () => {
    setShowPasswordDialog(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      onOpenChange(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password');
      return;
    }

    try {
      setDeleting(true);
      await deleteAccount(deletePassword);
      toast.success('Account deleted successfully');
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error deleting account:', error);
      if (error instanceof Error && error.message.includes('wrong-password')) {
        toast.error('Incorrect password');
      } else {
        toast.error('Failed to delete account. Please try again.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full sm:max-w-md overflow-y-auto dark:bg-black dark:border-gray-800'>
        <SheetHeader>
          <SheetTitle className='dark:text-white'>Settings</SheetTitle>
        </SheetHeader>

        <div className='mt-6 space-y-6'>
          {/* Appearance */}
          <div className='space-y-4'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
              Appearance
            </h3>

            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl'>
              <div className='flex items-center gap-3'>
                {darkMode ? (
                  <Moon className='w-5 h-5 text-frinder-orange' />
                ) : (
                  <Sun className='w-5 h-5 text-frinder-orange' />
                )}
                <div>
                  <Label className='text-sm font-medium dark:text-white'>Dark Mode</Label>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {darkMode ? 'Currently using dark theme' : 'Currently using light theme'}
                  </p>
                </div>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={toggleDarkMode}
                className='data-[state=checked]:bg-frinder-orange'
              />
            </div>
          </div>

          <Separator className='dark:bg-gray-800' />

          {/* Match Notifications */}
          <div className='space-y-4'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
              Match Notifications
            </h3>

            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl'>
              <div className='flex items-center gap-3'>
                <Sparkles className='w-5 h-5 text-frinder-orange' />
                <div>
                  <Label className='text-sm font-medium dark:text-white'>Full Screen Match Popup</Label>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {fullScreenMatch
                      ? 'Celebrate matches with full screen animation'
                      : 'Show matches as toast notifications'}
                  </p>
                </div>
              </div>
              <Switch
                checked={fullScreenMatch}
                onCheckedChange={toggleFullScreenMatch}
                className='data-[state=checked]:bg-frinder-orange'
              />
            </div>
          </div>

          <Separator className='dark:bg-gray-800' />

          {/* Language & Region */}
          <div className='space-y-4'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
              Language & Region
            </h3>

            <button className='w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
              <div className='flex items-center gap-3'>
                <Globe className='w-5 h-5 text-frinder-orange' />
                <div className='text-left'>
                  <p className='text-sm font-medium dark:text-white'>Language</p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>English (US)</p>
                </div>
              </div>
              <ChevronRight className='w-5 h-5 text-gray-400' />
            </button>
          </div>

          <Separator className='dark:bg-gray-800' />

          {/* Safety */}
          <div className='space-y-4'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Safety</h3>

            <button
              onClick={() => setShowPasswordDialog(true)}
              className='w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left'
            >
              <Key className='w-5 h-5 text-frinder-orange' />
              <div>
                <p className='text-sm font-medium dark:text-white'>Change Password</p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>Update your account password</p>
              </div>
            </button>

            <button className='w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left'>
              <UserX className='w-5 h-5 text-frinder-orange' />
              <div>
                <p className='text-sm font-medium dark:text-white'>Blocked Users</p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>Manage your blocked list</p>
              </div>
            </button>

            <button className='w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left'>
              <Ban className='w-5 h-5 text-frinder-orange' />
              <div>
                <p className='text-sm font-medium dark:text-white'>Hidden Profiles</p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>Profiles you&apos;ve hidden from discovery</p>
              </div>
            </button>

            <button className='w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left'>
              <Shield className='w-5 h-5 text-frinder-orange' />
              <div>
                <p className='text-sm font-medium dark:text-white'>Safety Tips</p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>Learn how to stay safe while dating</p>
              </div>
            </button>
          </div>

          <Separator className='dark:bg-gray-800' />

          {/* Account Actions */}
          <div className='space-y-4'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Account</h3>

            <Button
              variant='outline'
              className='w-full justify-start gap-3 h-14 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20'
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className='w-5 h-5' />
              <div className='text-left'>
                <p className='text-sm font-medium'>Delete Account</p>
                <p className='text-xs opacity-70'>Permanently delete your data</p>
              </div>
            </Button>

            <Button
              variant='outline'
              className='w-full justify-start gap-3 h-14 dark:border-gray-800 dark:hover:bg-gray-900'
              onClick={handleLogout}
            >
              <LogOut className='w-5 h-5 text-gray-600 dark:text-gray-400' />
              <div className='text-left'>
                <p className='text-sm font-medium dark:text-white'>Log Out</p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>Sign out of your account</p>
              </div>
            </Button>
          </div>

          {/* App Info */}
          <div className='pt-6 text-center'>
            <p className='text-xs text-gray-400 dark:text-gray-500'>Frinder v1.0.0</p>
            <p className='text-xs text-gray-400 dark:text-gray-500 mt-1'>Made with ❤️ for meaningful connections</p>
          </div>
        </div>
      </SheetContent>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className='sm:max-w-md dark:bg-black dark:border-gray-800'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-red-600'>
              <AlertTriangle className='w-5 h-5' />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account, all your matches, messages, and
              photos.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='delete-password'>Enter your password to confirm</Label>
              <Input
                id='delete-password'
                type='password'
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                placeholder='Your password'
                className='dark:bg-gray-900 dark:border-gray-800'
              />
            </div>
          </div>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              variant='outline'
              onClick={() => {
                setShowDeleteDialog(false);
                setDeletePassword('');
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleDeleteAccount} disabled={deleting || !deletePassword}>
              {deleting ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={handleClosePasswordDialog}>
        <DialogContent className='sm:max-w-md dark:bg-black dark:border-gray-800'>
          <DialogHeader>
            <DialogTitle className='dark:text-white'>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new password to update your account.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='currentPassword'>Current Password</Label>
              <div className='relative'>
                <Input
                  id='currentPassword'
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder='Enter current password'
                  className='dark:bg-gray-900 dark:border-gray-800 pr-10'
                />
                <button
                  type='button'
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                >
                  {showCurrentPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                </button>
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='newPassword'>New Password</Label>
              <div className='relative'>
                <Input
                  id='newPassword'
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder='Enter new password'
                  className='dark:bg-gray-900 dark:border-gray-800 pr-10'
                />
                <button
                  type='button'
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                >
                  {showNewPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                </button>
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='confirmPassword'>Confirm New Password</Label>
              <Input
                id='confirmPassword'
                type={showNewPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder='Confirm new password'
                className='dark:bg-gray-900 dark:border-gray-800'
              />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              variant='outline'
              onClick={handleClosePasswordDialog}
              disabled={isChangingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword}
              className='bg-frinder-orange hover:bg-frinder-orange/90 text-white'
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
