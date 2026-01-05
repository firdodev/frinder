'use client';

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, EyeOff, Clock, CheckCheck, Mail, Shield, UserX, Ban, Key, Loader2 } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PrivacySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrivacySheet({ open, onOpenChange }: PrivacySheetProps) {
  const { privacy, updatePrivacy } = useSettings();
  const { changePassword } = useAuth();
  
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

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
      setPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
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
    setPasswordDialogOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full sm:max-w-md overflow-y-auto dark:bg-black dark:border-gray-800'>
        <SheetHeader>
          <SheetTitle className='dark:text-white'>Privacy & Safety</SheetTitle>
        </SheetHeader>

        <div className='mt-6 space-y-6'>
          {/* Visibility */}
          <div className='space-y-4'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
              Visibility
            </h3>

            <div className='space-y-3'>
              <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl'>
                <div className='flex items-center gap-3'>
                  {privacy.showOnlineStatus ? (
                    <Eye className='w-5 h-5 text-[#ed8c00]' />
                  ) : (
                    <EyeOff className='w-5 h-5 text-gray-400' />
                  )}
                  <div>
                    <Label className='text-sm font-medium dark:text-white'>Online Status</Label>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Show when you&apos;re active</p>
                  </div>
                </div>
                <Switch
                  checked={privacy.showOnlineStatus}
                  onCheckedChange={checked => updatePrivacy('showOnlineStatus', checked)}
                  className='data-[state=checked]:bg-[#ed8c00]'
                />
              </div>

              <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl'>
                <div className='flex items-center gap-3'>
                  <Clock className='w-5 h-5 text-[#ed8c00]' />
                  <div>
                    <Label className='text-sm font-medium dark:text-white'>Last Seen</Label>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Show your last active time</p>
                  </div>
                </div>
                <Switch
                  checked={privacy.showLastSeen}
                  onCheckedChange={checked => updatePrivacy('showLastSeen', checked)}
                  className='data-[state=checked]:bg-[#ed8c00]'
                />
              </div>

              <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl'>
                <div className='flex items-center gap-3'>
                  <CheckCheck className='w-5 h-5 text-[#ed8c00]' />
                  <div>
                    <Label className='text-sm font-medium dark:text-white'>Read Receipts</Label>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      Let others know when you&apos;ve read messages
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacy.showReadReceipts}
                  onCheckedChange={checked => updatePrivacy('showReadReceipts', checked)}
                  className='data-[state=checked]:bg-[#ed8c00]'
                />
              </div>
            </div>
          </div>

          <Separator className='dark:bg-gray-800' />

          {/* Discoverability */}
          <div className='space-y-4'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
              Discoverability
            </h3>

            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl'>
              <div className='flex items-center gap-3'>
                <Mail className='w-5 h-5 text-[#ed8c00]' />
                <div>
                  <Label className='text-sm font-medium dark:text-white'>Find by Email</Label>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>Let others find you using your email</p>
                </div>
              </div>
              <Switch
                checked={privacy.discoverableByEmail}
                onCheckedChange={checked => updatePrivacy('discoverableByEmail', checked)}
                className='data-[state=checked]:bg-[#ed8c00]'
              />
            </div>
          </div>

          <Separator className='dark:bg-gray-800' />

          {/* Safety */}
          <div className='space-y-4'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Safety</h3>

            <button
              onClick={() => setPasswordDialogOpen(true)}
              className='w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left'
            >
              <Key className='w-5 h-5 text-[#ed8c00]' />
              <div>
                <p className='text-sm font-medium dark:text-white'>Change Password</p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>Update your account password</p>
              </div>
            </button>

            <button className='w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left'>
              <UserX className='w-5 h-5 text-[#ed8c00]' />
              <div>
                <p className='text-sm font-medium dark:text-white'>Blocked Users</p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>Manage your blocked list</p>
              </div>
            </button>

            <button className='w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left'>
              <Ban className='w-5 h-5 text-[#ed8c00]' />
              <div>
                <p className='text-sm font-medium dark:text-white'>Hidden Profiles</p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>Profiles you&apos;ve hidden from discovery</p>
              </div>
            </button>

            <button className='w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left'>
              <Shield className='w-5 h-5 text-[#ed8c00]' />
              <div>
                <p className='text-sm font-medium dark:text-white'>Safety Tips</p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>Learn how to stay safe while dating</p>
              </div>
            </button>
          </div>
        </div>
      </SheetContent>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={handleClosePasswordDialog}>
        <DialogContent className='dark:bg-gray-900 dark:border-gray-800'>
          <DialogHeader>
            <DialogTitle className='dark:text-white'>Change Password</DialogTitle>
            <DialogDescription className='dark:text-gray-400'>
              Enter your current password and a new password to update your account.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 mt-4'>
            <div className='space-y-2'>
              <Label htmlFor='currentPassword' className='dark:text-white'>Current Password</Label>
              <div className='relative'>
                <Input
                  id='currentPassword'
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder='Enter current password'
                  className='dark:bg-gray-800 dark:border-gray-700 dark:text-white pr-10'
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
              <Label htmlFor='newPassword' className='dark:text-white'>New Password</Label>
              <div className='relative'>
                <Input
                  id='newPassword'
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder='Enter new password'
                  className='dark:bg-gray-800 dark:border-gray-700 dark:text-white pr-10'
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
              <Label htmlFor='confirmPassword' className='dark:text-white'>Confirm New Password</Label>
              <Input
                id='confirmPassword'
                type={showNewPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder='Confirm new password'
                className='dark:bg-gray-800 dark:border-gray-700 dark:text-white'
              />
            </div>

            <div className='flex gap-3 pt-4'>
              <Button
                variant='outline'
                onClick={handleClosePasswordDialog}
                className='flex-1 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800'
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className='flex-1 bg-[#ed8c00] hover:bg-[#d17d00] text-white'
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
