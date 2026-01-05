'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

// Flat colors for avatar backgrounds based on first letter
const AVATAR_COLORS: Record<string, string> = {
  A: 'bg-rose-500',
  B: 'bg-pink-500',
  C: 'bg-fuchsia-500',
  D: 'bg-purple-500',
  E: 'bg-violet-500',
  F: 'bg-indigo-500',
  G: 'bg-blue-500',
  H: 'bg-sky-500',
  I: 'bg-cyan-500',
  J: 'bg-teal-500',
  K: 'bg-emerald-500',
  L: 'bg-green-500',
  M: 'bg-lime-500',
  N: 'bg-yellow-500',
  O: 'bg-amber-500',
  P: 'bg-orange-500',
  Q: 'bg-red-500',
  R: 'bg-rose-600',
  S: 'bg-pink-600',
  T: 'bg-purple-600',
  U: 'bg-indigo-600',
  V: 'bg-blue-600',
  W: 'bg-teal-600',
  X: 'bg-emerald-600',
  Y: 'bg-amber-600',
  Z: 'bg-orange-600'
};

function getAvatarColor(name?: string): string {
  if (!name) return 'bg-gray-400';
  const firstLetter = name.charAt(0).toUpperCase();
  return AVATAR_COLORS[firstLetter] || 'bg-gray-400';
}

interface UserAvatarProps {
  src?: string;
  name?: string;
  className?: string;
  fallbackClassName?: string;
  showInitial?: boolean;
}

export function UserAvatar({ src, name, className, fallbackClassName, showInitial = true }: UserAvatarProps) {
  const colorClass = getAvatarColor(name);
  const initial = name?.charAt(0).toUpperCase() || '';

  return (
    <Avatar className={className}>
      <AvatarImage src={src} alt={name || 'User'} className='object-cover' />
      <AvatarFallback className={cn(colorClass, 'text-white', fallbackClassName)}>
        {showInitial && initial ? (
          initial
        ) : (
          <User className='w-1/2 h-1/2' />
        )}
      </AvatarFallback>
    </Avatar>
  );
}

// Export the color getter for use in other components
export { getAvatarColor, AVATAR_COLORS };

