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
import { Moon, Sun, Globe, Trash2, LogOut, ChevronRight, AlertTriangle, Loader2, Sparkles, Bell } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const { darkMode, toggleDarkMode } = useSettings();
  const { signOut, deleteAccount } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [fullScreenMatch, setFullScreenMatch] = useState(true);

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
    </Sheet>
  );
}
