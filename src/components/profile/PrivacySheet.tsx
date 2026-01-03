'use client';

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, 
  EyeOff, 
  Clock, 
  CheckCheck, 
  Mail,
  Shield,
  UserX,
  Ban
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

interface PrivacySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrivacySheet({ open, onOpenChange }: PrivacySheetProps) {
  const { privacy, updatePrivacy } = useSettings();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto dark:bg-black dark:border-gray-800">
        <SheetHeader>
          <SheetTitle className="dark:text-white">Privacy & Safety</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Visibility */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Visibility
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <div className="flex items-center gap-3">
                  {privacy.showOnlineStatus ? (
                    <Eye className="w-5 h-5 text-[#ed8c00]" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <Label className="text-sm font-medium dark:text-white">Online Status</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Show when you&apos;re active
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={privacy.showOnlineStatus} 
                  onCheckedChange={(checked) => updatePrivacy('showOnlineStatus', checked)}
                  className="data-[state=checked]:bg-[#ed8c00]"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#ed8c00]" />
                  <div>
                    <Label className="text-sm font-medium dark:text-white">Last Seen</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Show your last active time
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={privacy.showLastSeen} 
                  onCheckedChange={(checked) => updatePrivacy('showLastSeen', checked)}
                  className="data-[state=checked]:bg-[#ed8c00]"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCheck className="w-5 h-5 text-[#ed8c00]" />
                  <div>
                    <Label className="text-sm font-medium dark:text-white">Read Receipts</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Let others know when you&apos;ve read messages
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={privacy.showReadReceipts} 
                  onCheckedChange={(checked) => updatePrivacy('showReadReceipts', checked)}
                  className="data-[state=checked]:bg-[#ed8c00]"
                />
              </div>
            </div>
          </div>

          <Separator className="dark:bg-gray-800" />

          {/* Discoverability */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Discoverability
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#ed8c00]" />
                <div>
                  <Label className="text-sm font-medium dark:text-white">Find by Email</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Let others find you using your email
                  </p>
                </div>
              </div>
              <Switch 
                checked={privacy.discoverableByEmail} 
                onCheckedChange={(checked) => updatePrivacy('discoverableByEmail', checked)}
                className="data-[state=checked]:bg-[#ed8c00]"
              />
            </div>
          </div>

          <Separator className="dark:bg-gray-800" />

          {/* Safety */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Safety
            </h3>
            
            <button className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left">
              <UserX className="w-5 h-5 text-[#ed8c00]" />
              <div>
                <p className="text-sm font-medium dark:text-white">Blocked Users</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Manage your blocked list
                </p>
              </div>
            </button>

            <button className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left">
              <Ban className="w-5 h-5 text-[#ed8c00]" />
              <div>
                <p className="text-sm font-medium dark:text-white">Hidden Profiles</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Profiles you&apos;ve hidden from discovery
                </p>
              </div>
            </button>

            <button className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left">
              <Shield className="w-5 h-5 text-[#ed8c00]" />
              <div>
                <p className="text-sm font-medium dark:text-white">Safety Tips</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Learn how to stay safe while dating
                </p>
              </div>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
