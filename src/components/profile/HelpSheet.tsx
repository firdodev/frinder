'use client';

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  MessageCircle,
  FileText,
  Shield,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  BookOpen
} from 'lucide-react';

interface HelpSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpSheet({ open, onOpenChange }: HelpSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full sm:max-w-md overflow-y-auto dark:bg-black dark:border-frinder-orange/20'>
        <SheetHeader>
          <SheetTitle className='dark:text-white'>Help & Support</SheetTitle>
        </SheetHeader>

        <div className='mt-6 space-y-6'>
          {/* Quick Help */}
          <div className='space-y-4'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
              Quick Help
            </h3>

            <div className='space-y-3'>
              <button className='w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-black rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
                <div className='flex items-center gap-3'>
                  <HelpCircle className='w-5 h-5 text-[#ed8c00]' />
                  <div className='text-left'>
                    <p className='text-sm font-medium dark:text-white'>FAQs</p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Common questions answered</p>
                  </div>
                </div>
                <ChevronRight className='w-5 h-5 text-gray-400' />
              </button>

              <button className='w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-black rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
                <div className='flex items-center gap-3'>
                  <BookOpen className='w-5 h-5 text-[#ed8c00]' />
                  <div className='text-left'>
                    <p className='text-sm font-medium dark:text-white'>How Frinder Works</p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Learn about matching and features</p>
                  </div>
                </div>
                <ChevronRight className='w-5 h-5 text-gray-400' />
              </button>
            </div>
          </div>

          <Separator className='dark:bg-black' />

          {/* Contact */}
          <div className='space-y-4'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
              Contact Us
            </h3>

            <div className='space-y-3'>
              <button className='w-full flex items-center justify-between p-4 bg-[#ed8c00]/10 dark:bg-[#ed8c00]/20 rounded-xl hover:bg-[#ed8c00]/20 dark:hover:bg-[#ed8c00]/30 transition-colors'>
                <div className='flex items-center gap-3'>
                  <MessageCircle className='w-5 h-5 text-[#ed8c00]' />
                  <div className='text-left'>
                    <p className='text-sm font-medium text-[#ed8c00]'>Chat with Support</p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Get help from our team</p>
                  </div>
                </div>
                <ExternalLink className='w-5 h-5 text-[#ed8c00]' />
              </button>

              <button className='w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-black rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
                <div className='flex items-center gap-3'>
                  <AlertCircle className='w-5 h-5 text-[#ed8c00]' />
                  <div className='text-left'>
                    <p className='text-sm font-medium dark:text-white'>Report a Problem</p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Report bugs or issues</p>
                  </div>
                </div>
                <ChevronRight className='w-5 h-5 text-gray-400' />
              </button>
            </div>
          </div>

          <Separator className='dark:bg-black' />

          {/* Safety */}
          <div className='space-y-4'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
              Safety & Community
            </h3>

            <div className='space-y-3'>
              <button className='w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-black rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
                <div className='flex items-center gap-3'>
                  <Shield className='w-5 h-5 text-[#ed8c00]' />
                  <div className='text-left'>
                    <p className='text-sm font-medium dark:text-white'>Safety Center</p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Tips for safe dating</p>
                  </div>
                </div>
                <ChevronRight className='w-5 h-5 text-gray-400' />
              </button>

              <button className='w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-black rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
                <div className='flex items-center gap-3'>
                  <FileText className='w-5 h-5 text-[#ed8c00]' />
                  <div className='text-left'>
                    <p className='text-sm font-medium dark:text-white'>Community Guidelines</p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Our rules and expectations</p>
                  </div>
                </div>
                <ChevronRight className='w-5 h-5 text-gray-400' />
              </button>
            </div>
          </div>

          <Separator className='dark:bg-black' />

          {/* Legal */}
          <div className='space-y-4'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Legal</h3>

            <div className='flex flex-wrap gap-2'>
              <button className='px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
                Terms of Service
              </button>
              <button className='px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
                Privacy Policy
              </button>
              <button className='px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
                Cookie Policy
              </button>
              <button className='px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
                Licenses
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
