'use client';

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Heart, 
  MessageCircle, 
  ThumbsUp, 
  Gift,
  Bell,
  Mail,
  Smartphone
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsSheet({ open, onOpenChange }: NotificationsSheetProps) {
  const { notifications, updateNotification } = useSettings();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto dark:bg-gray-900 dark:border-gray-800">
        <SheetHeader>
          <SheetTitle className="dark:text-white">Notifications</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Activity Notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Activity
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-[#ed8c00]" />
                  <div>
                    <Label className="text-sm font-medium dark:text-white">New Matches</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      When you match with someone
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={notifications.matches} 
                  onCheckedChange={(checked) => updateNotification('matches', checked)}
                  className="data-[state=checked]:bg-[#ed8c00]"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-[#ed8c00]" />
                  <div>
                    <Label className="text-sm font-medium dark:text-white">Messages</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      When you receive a new message
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={notifications.messages} 
                  onCheckedChange={(checked) => updateNotification('messages', checked)}
                  className="data-[state=checked]:bg-[#ed8c00]"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <ThumbsUp className="w-5 h-5 text-[#ed8c00]" />
                  <div>
                    <Label className="text-sm font-medium dark:text-white">Likes</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      When someone likes your profile
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={notifications.likes} 
                  onCheckedChange={(checked) => updateNotification('likes', checked)}
                  className="data-[state=checked]:bg-[#ed8c00]"
                />
              </div>
            </div>
          </div>

          <Separator className="dark:bg-gray-800" />

          {/* Marketing */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Marketing
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-[#ed8c00]" />
                <div>
                  <Label className="text-sm font-medium dark:text-white">Promotions & Tips</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Special offers and dating tips
                  </p>
                </div>
              </div>
              <Switch 
                checked={notifications.promotions} 
                onCheckedChange={(checked) => updateNotification('promotions', checked)}
                className="data-[state=checked]:bg-[#ed8c00]"
              />
            </div>
          </div>

          <Separator className="dark:bg-gray-800" />

          {/* Notification Channels */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Notification Channels
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Bell className="w-5 h-5 text-[#ed8c00]" />
                <div>
                  <p className="text-sm font-medium dark:text-white">Push Notifications</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enabled • Manage in device settings
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Mail className="w-5 h-5 text-[#ed8c00]" />
                <div>
                  <p className="text-sm font-medium dark:text-white">Email Notifications</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Important updates only
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Smartphone className="w-5 h-5 text-[#ed8c00]" />
                <div>
                  <p className="text-sm font-medium dark:text-white">SMS</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Security alerts only
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
