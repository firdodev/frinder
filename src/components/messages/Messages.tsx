'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  Send,
  Phone,
  Video,
  MoreVertical,
  Image as ImageIcon,
  Smile,
  Heart,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToMatches,
  subscribeToMessages,
  sendMessage,
  markMessagesAsRead,
  type Match as FirebaseMatch,
  type Message as FirebaseMessage
} from '@/lib/firebaseServices';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  type: 'text' | 'image' | 'gif';
  isRead: boolean;
}

interface Match {
  id: string;
  odMatchId: string;
  name: string;
  photo: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isOnline: boolean;
  isNewMatch?: boolean;
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 1000 * 60 * 60) {
    const minutes = Math.floor(diff / (1000 * 60));
    return minutes === 0 ? 'Just now' : `${minutes}m ago`;
  } else if (diff < 1000 * 60 * 60 * 24) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}

interface ChatViewProps {
  match: Match;
  currentUserId: string;
  onBack: () => void;
}

function ChatView({ match, currentUserId, onBack }: ChatViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to messages for this match
  useEffect(() => {
    if (!match.id) return;

    setLoading(true);
    const unsubscribe = subscribeToMessages(match.id, (firebaseMessages: FirebaseMessage[]) => {
      const mappedMessages: Message[] = firebaseMessages.map(m => ({
        id: m.id,
        senderId: m.senderId,
        text: m.text,
        timestamp: m.timestamp instanceof Date ? m.timestamp : m.timestamp.toDate(),
        type: 'text',
        isRead: m.read
      }));
      setMessages(mappedMessages);
      setLoading(false);

      // Mark messages as read
      const unreadMessages = firebaseMessages.filter(m => !m.read && m.senderId !== currentUserId);
      if (unreadMessages.length > 0) {
        markMessagesAsRead(match.id, currentUserId);
      }
    });

    return () => unsubscribe();
  }, [match.id, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      await sendMessage(match.id, currentUserId, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className='h-full flex flex-col bg-background dark:bg-gray-900'>
      {/* Chat header */}
      <div className='px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 border-b bg-white dark:bg-gray-900 dark:border-gray-800'>
        <button onClick={onBack} className='p-1 hover:bg-muted dark:hover:bg-gray-800 rounded-full'>
          <ChevronLeft className='w-5 h-5 sm:w-6 sm:h-6 dark:text-white' />
        </button>
        <div className='relative'>
          <Avatar className='w-9 h-9 sm:w-10 sm:h-10'>
            <AvatarImage src={match.photo} alt={match.name} />
            <AvatarFallback className='bg-[#ed8c00] text-white'>{match.name[0]}</AvatarFallback>
          </Avatar>
          {match.isOnline && (
            <span className='absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-900' />
          )}
        </div>
        <div className='flex-1'>
          <h3 className='font-semibold text-sm sm:text-base dark:text-white'>{match.name}</h3>
          <p className='text-[10px] sm:text-xs text-muted-foreground'>{match.isOnline ? 'Online' : 'Offline'}</p>
        </div>
        <div className='flex items-center gap-1 sm:gap-2'>
          <button className='p-1.5 sm:p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-full'>
            <Phone className='w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground' />
          </button>
          <button className='p-1.5 sm:p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-full'>
            <Video className='w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground' />
          </button>
          <button className='p-1.5 sm:p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-full'>
            <MoreVertical className='w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground' />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className='flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4'>
        {loading ? (
          <div className='flex items-center justify-center h-full'>
            <Loader2 className='w-8 h-8 animate-spin text-[#ed8c00]' />
          </div>
        ) : (
          <>
            {/* Match notification */}
            <div className='flex flex-col items-center py-4 sm:py-6'>
              <div className='relative mb-3 sm:mb-4'>
                <Avatar className='w-20 h-20 sm:w-24 sm:h-24 border-4 border-[#ed8c00]'>
                  <AvatarImage src={match.photo} alt={match.name} />
                  <AvatarFallback className='bg-[#ed8c00] text-white text-xl sm:text-2xl'>{match.name[0]}</AvatarFallback>
                </Avatar>
                <div className='absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#ed8c00] px-2.5 sm:px-3 py-1 rounded-full'>
                  <Heart className='w-3 h-3 sm:w-4 sm:h-4 text-white' fill='white' />
                </div>
              </div>
              <h3 className='font-bold text-base sm:text-lg mb-1 dark:text-white'>You matched with {match.name}!</h3>
              <p className='text-xs sm:text-sm text-muted-foreground text-center'>Say hi and start the conversation</p>
            </div>

            {/* Message bubbles */}
            {messages.map(message => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] sm:max-w-[75%] px-3 sm:px-4 py-2 rounded-2xl ${
                    message.senderId === currentUserId
                      ? 'bg-[#ed8c00] text-white rounded-br-sm'
                      : 'bg-muted dark:bg-gray-800 text-foreground dark:text-white rounded-bl-sm'
                  }`}
                >
                  <p className='text-sm sm:text-base'>{message.text}</p>
                  <p
                    className={`text-[10px] sm:text-xs mt-1 ${
                      message.senderId === currentUserId ? 'text-white/70' : 'text-muted-foreground'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className='p-3 sm:p-4 border-t bg-white dark:bg-gray-900 dark:border-gray-800 safe-bottom'>
        <div className='flex items-center gap-1 sm:gap-2'>
          <button className='p-1.5 sm:p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-full'>
            <ImageIcon className='w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground' />
          </button>
          <button className='p-1.5 sm:p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-full'>
            <Smile className='w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground' />
          </button>
          <Input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder='Type a message...'
            className='flex-1 rounded-full text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white'
            disabled={sending}
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className='w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#ed8c00] flex items-center justify-center disabled:opacity-50'
          >
            {sending ? (
              <Loader2 className='w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin' />
            ) : (
              <Send className='w-4 h-4 sm:w-5 sm:h-5 text-white' />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to matches from Firebase
  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    const unsubscribe = subscribeToMatches(user.uid, (firebaseMatches: FirebaseMatch[]) => {
      const mappedMatches: Match[] = firebaseMatches.map(m => {
        // Find the other user in the match
        const otherUserIndex = m.users[0] === user.uid ? 1 : 0;
        const otherUserId = m.users[otherUserIndex];
        const otherUserProfile = m.userProfiles?.[otherUserId];
        const otherUserName = otherUserProfile?.displayName || 'Unknown';
        const otherUserPhoto = otherUserProfile?.photos?.[0] || '';

        return {
          id: m.id,
          odMatchId: otherUserId,
          name: otherUserName,
          photo: otherUserPhoto,
          lastMessage: m.lastMessage,
          lastMessageTime: m.lastMessageTime instanceof Date ? m.lastMessageTime : m.lastMessageTime?.toDate(),
          unreadCount: (m as any).unreadCount?.[user.uid] || 0,
          isOnline: false, // Would need presence system for this
          isNewMatch: !m.lastMessage
        };
      });

      // Sort by last message time
      mappedMatches.sort((a, b) => {
        if (a.isNewMatch && !b.isNewMatch) return -1;
        if (!a.isNewMatch && b.isNewMatch) return 1;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      });

      setMatches(mappedMatches);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  if (!user) {
    return (
      <div className='h-full flex items-center justify-center'>
        <p className='text-muted-foreground'>Please sign in to view messages</p>
      </div>
    );
  }

  if (selectedMatch) {
    return <ChatView match={selectedMatch} currentUserId={user.uid} onBack={() => setSelectedMatch(null)} />;
  }

  // Get new matches and conversations
  const newMatches = matches.filter(m => m.isNewMatch);
  const conversations = matches.filter(m => !m.isNewMatch && m.lastMessage);

  if (loading) {
    return (
      <div className='h-full flex items-center justify-center dark:bg-gray-900'>
        <div className='text-center'>
          <Loader2 className='w-10 h-10 sm:w-12 sm:h-12 animate-spin text-[#ed8c00] mx-auto mb-3 sm:mb-4' />
          <p className='text-muted-foreground text-sm sm:text-base'>Loading your matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col dark:bg-gray-900'>
      {/* Header */}
      <div className='px-3 sm:px-4 pt-3 sm:pt-4 pb-2'>
        <h1 className='text-xl sm:text-2xl font-bold dark:text-white'>Messages</h1>
      </div>

      <div className='flex-1 overflow-y-auto'>
        {/* New matches */}
        {newMatches.length > 0 && (
          <div className='px-3 sm:px-4 py-3 sm:py-4'>
            <h2 className='text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3 flex items-center gap-2'>
              <Sparkles className='w-3 h-3 sm:w-4 sm:h-4 text-[#ed8c00]' />
              New Matches
            </h2>
            <div className='flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-3 sm:-mx-4 px-3 sm:px-4'>
              {newMatches.map(match => (
                <motion.button
                  key={match.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedMatch(match)}
                  className='flex flex-col items-center gap-1.5 sm:gap-2 min-w-[60px] sm:min-w-[72px]'
                >
                  <div className='relative'>
                    <Avatar className='w-14 h-14 sm:w-16 sm:h-16 border-2 border-[#ed8c00] animate-pulse-glow'>
                      <AvatarImage src={match.photo} alt={match.name} />
                      <AvatarFallback className='bg-[#ed8c00] text-white'>{match.name[0]}</AvatarFallback>
                    </Avatar>
                    {match.isOnline && (
                      <span className='absolute bottom-1 right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-900' />
                    )}
                  </div>
                  <span className='text-xs sm:text-sm font-medium dark:text-white'>{match.name}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Conversations */}
        {conversations.length > 0 && (
          <div className='px-3 sm:px-4'>
            <h2 className='text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3'>Messages</h2>
            <div className='space-y-1.5 sm:space-y-2'>
              <AnimatePresence>
                {conversations.map(match => (
                  <motion.button
                    key={match.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => setSelectedMatch(match)}
                    className='w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl hover:bg-muted dark:hover:bg-gray-800 transition-colors'
                  >
                    <div className='relative'>
                      <Avatar className='w-12 h-12 sm:w-14 sm:h-14'>
                        <AvatarImage src={match.photo} alt={match.name} />
                        <AvatarFallback className='bg-[#ed8c00] text-white'>{match.name[0]}</AvatarFallback>
                      </Avatar>
                      {match.isOnline && (
                        <span className='absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500 border-2 border-white dark:border-gray-900' />
                      )}
                    </div>
                    <div className='flex-1 text-left min-w-0'>
                      <div className='flex items-center justify-between mb-0.5 sm:mb-1'>
                        <h3 className='font-semibold text-sm sm:text-base dark:text-white'>{match.name}</h3>
                        <span className='text-[10px] sm:text-xs text-muted-foreground'>
                          {match.lastMessageTime && formatTime(match.lastMessageTime)}
                        </span>
                      </div>
                      <p
                        className={`text-xs sm:text-sm truncate ${
                          match.unreadCount > 0 ? 'text-foreground dark:text-white font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        {match.lastMessage}
                      </p>
                    </div>
                    {match.unreadCount > 0 && <Badge className='bg-[#ed8c00] text-white text-[10px] sm:text-xs'>{match.unreadCount}</Badge>}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Empty state */}
        {matches.length === 0 && (
          <div className='flex flex-col items-center justify-center h-full text-center px-6 sm:px-8'>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className='w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#ed8c00]/10 flex items-center justify-center mb-4 sm:mb-6'
            >
              <Heart className='w-10 h-10 sm:w-12 sm:h-12 text-[#ed8c00]' />
            </motion.div>
            <h2 className='text-xl sm:text-2xl font-bold mb-2 dark:text-white'>No matches yet</h2>
            <p className='text-muted-foreground text-sm sm:text-base'>Start swiping to find your match!</p>
          </div>
        )}
      </div>
    </div>
  );
}
