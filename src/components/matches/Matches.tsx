'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar, getAvatarColor } from '@/components/ui/user-avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Heart,
  MessageCircle,
  Search,
  Loader2,
  MapPin,
  Calendar,
  Sparkles,
  UserX,
  MoreHorizontal,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  Send,
  Check,
  UserCheck,
  User,
  Lock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToMatches,
  unmatchUser,
  getUserProfile,
  subscribeToPendingRequests,
  cancelPendingRequest,
  subscribeToIncomingRequests,
  acceptMatchRequest,
  declineMatchRequest,
  getActiveStoryForUser,
  getUserStories,
  sendMessage,
  type Match as FirebaseMatch
} from '@/lib/firebaseServices';
import { UserProfile } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MatchProfile {
  id: string;
  odMatchId: string;
  name: string;
  age?: number;
  photo: string;
  photos: string[];
  bio?: string;
  location?: string;
  interests?: string[];
  matchedAt: Date;
  isOnline?: boolean;
  lastSeen?: Date;
  relationshipGoal?: 'relationship' | 'casual' | 'friends';
  lookingFor?: 'people' | 'groups' | 'both';
  storyPhoto?: string;
  allStories?: Array<{ id: string; photoUrl: string; createdAt: Date; expiresAt: Date; matchesOnly: boolean }>;
}

interface MatchesProps {
  onStartChat: (matchId: string, matchName: string, matchPhoto: string, otherUserId: string) => void;
}

export default function Matches({ onStartChat }: MatchesProps) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<(UserProfile & { swipedAt: Date })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<MatchProfile | null>(null);
  const [selectedPending, setSelectedPending] = useState<(UserProfile & { swipedAt: Date }) | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<(UserProfile & { swipedAt: Date })[]>([]);
  const [selectedIncoming, setSelectedIncoming] = useState<(UserProfile & { swipedAt: Date }) | null>(null);
  const [processingIncoming, setProcessingIncoming] = useState<string | null>(null);
  const [showUnmatchDialog, setShowUnmatchDialog] = useState(false);
  const [matchToUnmatch, setMatchToUnmatch] = useState<MatchProfile | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  
  // Story viewing state
  const [viewingStory, setViewingStory] = useState<MatchProfile | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storyDirection, setStoryDirection] = useState<'next' | 'prev'>('next');
  const [storyReply, setStoryReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showPendingSection, setShowPendingSection] = useState(false);
  const storyReplyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);

    // Subscribe to matches
    const unsubscribeMatches = subscribeToMatches(user.uid, async (firebaseMatches: FirebaseMatch[]) => {
      const mappedMatches: MatchProfile[] = await Promise.all(
        firebaseMatches.map(async m => {
          const otherUserIndex = m.users[0] === user.uid ? 1 : 0;
          const otherUserId = m.users[otherUserIndex];
          const otherUserProfile = m.userProfiles?.[otherUserId];
          
          // Fetch ALL stories for this matched user (only if we have a valid userId)
          let storyPhoto: string | undefined;
          let allStories: Array<{ id: string; photoUrl: string; createdAt: Date; expiresAt: Date; matchesOnly: boolean }> | undefined;
          if (otherUserId) {
            try {
              const stories = await getUserStories(otherUserId);
              allStories = stories;
              storyPhoto = stories.length > 0 ? stories[0].photoUrl : undefined;
            } catch (e) {
              console.error('Error fetching stories:', e);
            }
          }

          return {
            id: m.id,
            odMatchId: otherUserId,
            name: otherUserProfile?.displayName || 'Unknown',
            age: otherUserProfile?.age,
            photo: otherUserProfile?.photos?.[0] || '',
            photos: otherUserProfile?.photos || [],
            bio: otherUserProfile?.bio,
            location: otherUserProfile?.city
              ? `${otherUserProfile.city}${otherUserProfile.country ? `, ${otherUserProfile.country}` : ''}`
              : undefined,
            interests: otherUserProfile?.interests || [],
            matchedAt: m.createdAt instanceof Date 
              ? m.createdAt 
              : (m.createdAt && typeof (m.createdAt as any).toDate === 'function') 
                ? (m.createdAt as any).toDate() 
                : new Date(),
            isOnline: false,
            relationshipGoal: otherUserProfile?.relationshipGoal,
            lookingFor: otherUserProfile?.lookingFor,
            storyPhoto,
            allStories
          };
        })
      );

      setMatches(mappedMatches);
      setLoading(false);
    });

    // Subscribe to pending requests (outgoing)
    const unsubscribePending = subscribeToPendingRequests(user.uid, requests => {
      setPendingRequests(requests);
    });

    // Subscribe to incoming requests (people who liked you)
    const unsubscribeIncoming = subscribeToIncomingRequests(user.uid, requests => {
      setIncomingRequests(requests);
    });

    return () => {
      unsubscribeMatches();
      unsubscribePending();
      unsubscribeIncoming();
    };
  }, [user?.uid]);

  const handleUnmatch = async () => {
    if (!matchToUnmatch) return;
    try {
      await unmatchUser(matchToUnmatch.id);
      toast.success(`Unmatched with ${matchToUnmatch.name}`);
      setMatches(prev => prev.filter(m => m.id !== matchToUnmatch.id));
      if (selectedMatch?.id === matchToUnmatch.id) {
        setSelectedMatch(null);
      }
    } catch (error) {
      toast.error('Failed to unmatch');
    }
    setShowUnmatchDialog(false);
    setMatchToUnmatch(null);
  };

  const handleAcceptRequest = async (request: UserProfile & { swipedAt: Date }) => {
    if (!user?.uid) return;
    setProcessingIncoming(request.uid);
    try {
      await acceptMatchRequest(user.uid, request.uid);
      toast.success(`You matched with ${request.displayName}!`, { icon: '💕' });
      setSelectedIncoming(null);
    } catch (error) {
      toast.error('Failed to accept request');
    } finally {
      setProcessingIncoming(null);
    }
  };

  const handleDeclineRequest = async (request: UserProfile & { swipedAt: Date }) => {
    if (!user?.uid) return;
    setProcessingIncoming(request.uid);
    try {
      await declineMatchRequest(user.uid, request.uid);
      toast.success('Request declined');
      setSelectedIncoming(null);
    } catch (error) {
      toast.error('Failed to decline request');
    } finally {
      setProcessingIncoming(null);
    }
  };

  // Story reply handlers
  const handleSendStoryReply = async (message: string) => {
    if (!viewingStory || !user?.uid || !message.trim()) return;
    
    setSendingReply(true);
    try {
      // Send message with story reference
      const storyMessage = `📸 Replied to story: "${message}"`;
      await sendMessage(viewingStory.id, user.uid, storyMessage);
      toast.success('Reply sent!');
      setStoryReply('');
      setViewingStory(null);
    } catch (error) {
      console.error('Error sending story reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleSendHeartReaction = async () => {
    if (!viewingStory || !user?.uid) return;
    
    setSendingReply(true);
    try {
      // Send heart emoji as reaction to story
      const heartMessage = `❤️ Reacted to your story`;
      await sendMessage(viewingStory.id, user.uid, heartMessage);
      toast.success('Heart sent!');
      setViewingStory(null);
    } catch (error) {
      console.error('Error sending heart reaction:', error);
      toast.error('Failed to send reaction');
    } finally {
      setSendingReply(false);
    }
  };

  const matchesWithStories = matches.filter(m => m.storyPhoto);
  const filteredMatches = matches.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const formatMatchDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className='h-full flex items-center justify-center dark:bg-black'>
        <div className='text-center'>
          <Loader2 className='w-12 h-12 animate-spin text-frinder-orange mx-auto mb-4' />
          <p className='text-muted-foreground'>Loading your matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col dark:bg-black'>
      {/* Unmatch Confirmation Dialog */}
      <Dialog open={showUnmatchDialog} onOpenChange={setShowUnmatchDialog}>
        <DialogContent className='dark:bg-black dark:border-frinder-orange/20'>
          <DialogHeader>
            <DialogTitle className='dark:text-white'>Unmatch {matchToUnmatch?.name}?</DialogTitle>
            <DialogDescription>
              This will remove your match and you won't be able to message each other anymore. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className='flex gap-3 mt-4'>
            <Button variant='outline' onClick={() => setShowUnmatchDialog(false)} className='flex-1'>
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleUnmatch} className='flex-1'>
              <UserX className='w-4 h-4 mr-2' />
              Unmatch
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {viewingStory && viewingStory.allStories && viewingStory.allStories.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 bg-black flex flex-col'
            onClick={() => setViewingStory(null)}
          >
            {/* Progress bars for multiple stories */}
            {viewingStory.allStories.length > 1 && (
              <div className='absolute top-2 left-4 right-4 z-20 flex gap-1.5'>
                {viewingStory.allStories.map((_, index) => (
                  <div 
                    key={index} 
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      index === currentStoryIndex 
                        ? 'bg-frinder-orange shadow-[0_0_8px_rgba(255,140,0,0.6)]' 
                        : 'bg-white/20 backdrop-blur-md'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Story Header - Blurry Card Style */}
            <div className='absolute top-4 left-4 right-4 z-10 flex items-start justify-between'>
              {/* User Info Card */}
              <div className='bg-black/25 backdrop-blur-2xl rounded-2xl px-3 py-2.5 flex items-center gap-3 border border-white/10 shadow-lg'>
                {/* Profile Picture */}
                <div className='w-10 h-10 rounded-full overflow-hidden border-2 border-white/30'>
                  {viewingStory.photo ? (
                    <img 
                      src={viewingStory.photo} 
                      alt={viewingStory.name}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${getAvatarColor(viewingStory.name)}`}>
                      <User className='w-5 h-5 text-white' />
                    </div>
                  )}
                </div>
                <div>
                  <p className='text-white font-semibold text-base'>
                    {viewingStory.name}{viewingStory.age ? <span className='font-medium text-white ml-1.5'>{viewingStory.age}</span> : ''}
                  </p>
                  {/* Matches Only badge inside card */}
                  {viewingStory.allStories[currentStoryIndex]?.matchesOnly && (
                    <p className='text-frinder-orange text-xs flex items-center gap-1 mt-0.5'>
                      <Lock className='w-3 h-3' />
                      Matches only
                    </p>
                  )}
                </div>
              </div>
              
              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewingStory(null);
                }}
                className='w-10 h-10 rounded-full bg-black/25 backdrop-blur-2xl border border-white/10 shadow-lg flex items-center justify-center hover:bg-black/40 transition-colors'
              >
                <X className='w-5 h-5 text-white' />
              </button>
            </div>

            {/* Navigation Arrows */}
            {viewingStory.allStories.length > 1 && (
              <>
                {/* Previous Story Button */}
                {currentStoryIndex > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStoryDirection('prev');
                      setCurrentStoryIndex(currentStoryIndex - 1);
                    }}
                    className='absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors'
                  >
                    <ChevronLeft className='w-6 h-6 text-white' />
                  </button>
                )}
                
                {/* Next Story Button */}
                {currentStoryIndex < viewingStory.allStories.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStoryDirection('next');
                      setCurrentStoryIndex(currentStoryIndex + 1);
                    }}
                    className='absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors'
                  >
                    <ChevronRight className='w-6 h-6 text-white' />
                  </button>
                )}
              </>
            )}
            
            {/* Story Image with Cube Animation */}
            <div className='flex-1 flex items-center justify-center overflow-hidden' style={{ perspective: '1000px' }}>
              <AnimatePresence mode='wait' initial={false}>
                <motion.img 
                  key={`${viewingStory.id}-${currentStoryIndex}`}
                  src={viewingStory.allStories[currentStoryIndex]?.photoUrl || viewingStory.storyPhoto} 
                  alt='Story' 
                  className='w-full h-full object-cover'
                  onClick={(e) => e.stopPropagation()}
                  initial={{ 
                    rotateY: storyDirection === 'next' ? 45 : -45,
                    opacity: 0,
                    x: storyDirection === 'next' ? 100 : -100
                  }}
                  animate={{ 
                    rotateY: 0,
                    opacity: 1,
                    x: 0
                  }}
                  exit={{ 
                    rotateY: storyDirection === 'next' ? -45 : 45,
                    opacity: 0,
                    x: storyDirection === 'next' ? -100 : 100
                  }}
                  transition={{ 
                    type: 'tween',
                    ease: [0.25, 0.46, 0.45, 0.94],
                    duration: 0.25
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                />
              </AnimatePresence>
            </div>

            {/* Story Reply Footer */}
            <div className='absolute bottom-0 left-0 right-0 p-4 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent'>
              <div className='flex items-center gap-3'>
                {/* Blurry Input */}
                <div className='flex-1 relative'>
                  <input
                    ref={storyReplyRef}
                    type='text'
                    value={storyReply}
                    onChange={(e) => setStoryReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && storyReply.trim()) {
                        handleSendStoryReply(storyReply);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder='Enter your answer...'
                    className='w-full px-4 py-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-frinder-orange/50 text-sm'
                  />
                </div>
                
                {/* Send Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (storyReply.trim()) {
                      handleSendStoryReply(storyReply);
                    }
                  }}
                  disabled={sendingReply || !storyReply.trim()}
                  className='w-12 h-12 rounded-full bg-frinder-orange flex items-center justify-center hover:bg-frinder-burnt transition-colors disabled:opacity-50'
                >
                  {sendingReply ? (
                    <Loader2 className='w-5 h-5 text-white animate-spin' />
                  ) : (
                    <Send className='w-5 h-5 text-white' />
                  )}
                </button>
                
                {/* Heart Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSendHeartReaction();
                  }}
                  disabled={sendingReply}
                  className='w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-50'
                >
                  <Heart className='w-6 h-6 text-white fill-white' />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Detail Sheet/Dialog */}
      <AnimatePresence>
        {selectedMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end lg:items-center lg:justify-center'
            onClick={() => setSelectedMatch(null)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className='w-full max-h-[90vh] bg-white dark:bg-black rounded-t-3xl overflow-hidden lg:rounded-2xl lg:max-w-md lg:max-h-[85vh] lg:shadow-2xl'
            >
              {/* Match Profile Header */}
              <div className='relative h-72 lg:h-64'>
                {selectedMatch.photo === 'solid-black' ? (
                  <div className='w-full h-full bg-black'></div>
                ) : selectedMatch.photo && selectedMatch.photo.trim() !== '' && !selectedMatch.photo.includes('placeholder') ? (
                  <img src={selectedMatch.photo} alt={selectedMatch.name} className='w-full h-full object-cover' />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${getAvatarColor(selectedMatch.name)}`}>
                    <User className='w-24 h-24 text-white/80' />
                  </div>
                )}
                <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent' />
                <button
                  onClick={() => setSelectedMatch(null)}
                  className='absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
                <div className='absolute bottom-4 left-4 right-4'>
                  <h2 className='text-2xl font-bold text-white'>
                    {selectedMatch.name}
                    {selectedMatch.age ? `, ${selectedMatch.age}` : ''}
                  </h2>
                  {selectedMatch.location && (
                    <div className='flex items-center gap-1 text-white/80 mt-1'>
                      <MapPin className='w-4 h-4' />
                      <span className='text-sm'>{selectedMatch.location}</span>
                    </div>
                  )}
                  <div className='flex items-center gap-1 text-white/60 mt-1'>
                    <Calendar className='w-4 h-4' />
                    <span className='text-sm'>Matched {formatMatchDate(selectedMatch.matchedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Match Content */}
              <div className='p-4 overflow-y-auto max-h-[calc(90vh-288px)] lg:max-h-[calc(85vh-256px)]'>
                {/* Action Buttons */}
                <div className='flex gap-3 mb-6'>
                  <Button
                    onClick={() => {
                      onStartChat(selectedMatch.id, selectedMatch.name, selectedMatch.photo, selectedMatch.odMatchId);
                      setSelectedMatch(null);
                    }}
                    className='flex-1 bg-frinder-orange hover:bg-frinder-burnt h-12'
                  >
                    <MessageCircle className='w-5 h-5 mr-2' />
                    Message
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => {
                      setMatchToUnmatch(selectedMatch);
                      setShowUnmatchDialog(true);
                    }}
                    className='h-12 px-4 text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20'
                  >
                    <UserX className='w-5 h-5' />
                  </Button>
                </div>

                {/* Looking For (Relationship Goal) */}
                {selectedMatch.relationshipGoal && (
                  <div className='mb-6'>
                    <h3 className='font-semibold dark:text-white mb-2'>Looking For</h3>
                    <Badge className='bg-frinder-orange/10 text-frinder-orange border border-frinder-orange/20'>
                      <Heart className='w-3 h-3 mr-1.5' />
                      {selectedMatch.relationshipGoal === 'relationship' && 'A relationship'}
                      {selectedMatch.relationshipGoal === 'casual' && 'Something casual'}
                      {selectedMatch.relationshipGoal === 'friends' && 'Just friends'}
                    </Badge>
                  </div>
                )}

                {/* Interested In (People/Groups) */}
                {selectedMatch.lookingFor && (
                  <div className='mb-6'>
                    <h3 className='font-semibold dark:text-white mb-2'>Interested In</h3>
                    <Badge className='bg-blue-500/10 text-blue-500 border border-blue-500/20'>
                      <Users className='w-3 h-3 mr-1.5' />
                      {selectedMatch.lookingFor === 'people' && 'Meeting people'}
                      {selectedMatch.lookingFor === 'groups' && 'Joining groups'}
                      {selectedMatch.lookingFor === 'both' && 'People & Groups'}
                    </Badge>
                  </div>
                )}

                {/* Bio */}
                {selectedMatch.bio && (
                  <div className='mb-6'>
                    <h3 className='font-semibold dark:text-white mb-2'>About</h3>
                    <p className='text-muted-foreground text-sm leading-relaxed'>{selectedMatch.bio}</p>
                  </div>
                )}

                {/* Interests */}
                {selectedMatch.interests && selectedMatch.interests.length > 0 && (
                  <div className='mb-6'>
                    <h3 className='font-semibold dark:text-white mb-2'>Interests</h3>
                    <div className='flex flex-wrap gap-2'>
                      {selectedMatch.interests.filter(Boolean).map((interest, index) => (
                        <Badge
                          key={`${interest}-${index}`}
                          className='bg-frinder-orange/10 text-frinder-orange border border-frinder-orange/20'
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photos Gallery */}
                {selectedMatch.photos.length > 1 && (
                  <div>
                    <h3 className='font-semibold dark:text-white mb-2'>Photos</h3>
                    <div className='grid grid-cols-3 gap-2'>
                      {selectedMatch.photos.slice(1).map((photo, index) => (
                        <div key={index} className='aspect-square rounded-xl overflow-hidden'>
                          <img src={photo} alt={`Photo ${index + 2}`} className='w-full h-full object-cover' />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className='px-4 pt-4 pb-3 border-b dark:border-frinder-orange/20 bg-white dark:bg-black'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-2'>
            <Heart className='w-6 h-6 text-frinder-orange' fill='currentColor' />
            <h1 className='text-xl font-bold dark:text-white'>My Matches</h1>
            <Badge variant='secondary' className='bg-frinder-orange/10 text-frinder-orange'>
              {matches.length}
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder='Search matches...'
            className='pl-10 dark:bg-black dark:border-frinder-orange/20'
          />
        </div>
      </div>

      {/* Matches Content */}
      <div className='flex-1 overflow-y-auto'>
        {/* Stories Section - Only show if there are matches with stories */}
        {matchesWithStories.length > 0 && (
          <div className='px-4 py-3 border-b dark:border-frinder-orange/20'>
            <div className='flex items-center gap-2 mb-3'>
              <div className='w-5 h-5 rounded-full bg-gradient-to-tr from-frinder-orange via-pink-500 to-purple-600 flex items-center justify-center'>
                <Sparkles className='w-3 h-3 text-white' />
              </div>
              <h2 className='text-sm font-semibold dark:text-white'>Stories</h2>
              <Badge variant='secondary' className='bg-frinder-orange/10 text-frinder-orange text-xs'>
                {matchesWithStories.length}
              </Badge>
            </div>
            <div className='flex gap-3 overflow-x-auto pb-2 -mx-4 px-4'>
              {matchesWithStories.map(match => (
                <motion.button
                  key={match.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setCurrentStoryIndex(0);
                    setViewingStory(match);
                  }}
                  className='flex flex-col items-center gap-1.5 min-w-16'
                >
                  <div className='relative'>
                    {/* Orange gradient ring for story indicator */}
                    <div className='w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-frinder-orange via-pink-500 to-purple-600'>
                      <div className='w-full h-full rounded-full border-2 border-white dark:border-black overflow-hidden'>
                        {match.photo ? (
                          <img 
                            src={match.photo} 
                            alt={match.name}
                            className='w-full h-full object-cover'
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${getAvatarColor(match.name)}`}>
                            <User className='w-6 h-6 text-white/80' />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className='text-xs text-center truncate w-full dark:text-white'>
                    {match.name?.split(' ')[0] || 'User'}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Incoming Requests Section (People who liked you) */}
        {incomingRequests.length > 0 && (
          <div className='px-4 py-3 border-b dark:border-frinder-orange/20 bg-frinder-orange/5'>
            <div className='flex items-center gap-2 mb-3'>
              <Heart className='w-4 h-4 text-frinder-orange fill-frinder-orange' />
              <h2 className='text-sm font-semibold dark:text-white'>Likes You</h2>
              <Badge variant='secondary' className='bg-frinder-orange/10 text-frinder-orange text-xs'>
                {incomingRequests.length}
              </Badge>
            </div>
            <div className='flex gap-3 overflow-x-auto pb-2 -mx-4 px-4'>
              {incomingRequests.map(request => (
                <motion.button
                  key={request.uid}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedIncoming(request)}
                  className='flex flex-col items-center gap-1.5 min-w-16'
                >
                  <div className='relative'>
                    <UserAvatar
                      src={request.photos?.[0]}
                      name={request.displayName}
                      className='w-14 h-14 border-2 border-frinder-orange'
                      showInitial={!!request.photos?.[0]}
                    />
                    <div className='absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-frinder-orange rounded-full flex items-center justify-center'>
                      <Heart className='w-3 h-3 text-white fill-white' />
                    </div>
                  </div>
                  <span className='text-xs text-center truncate w-full dark:text-white'>
                    {request.displayName?.split(' ')[0] || 'User'}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Pending Requests Section - Collapsible */}
        {pendingRequests.length > 0 && (
          <div className='border-b dark:border-frinder-orange/20'>
            <button
              onClick={() => setShowPendingSection(!showPendingSection)}
              className='w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors'
            >
              <div className='flex items-center gap-2'>
                <Send className='w-4 h-4 text-frinder-gold' />
                <h2 className='text-sm font-semibold dark:text-white'>Pending Requests</h2>
                <Badge variant='secondary' className='bg-frinder-gold/10 text-frinder-gold text-xs'>
                  {pendingRequests.length}
                </Badge>
              </div>
              {showPendingSection ? (
                <ChevronUp className='w-4 h-4 text-muted-foreground' />
              ) : (
                <ChevronDown className='w-4 h-4 text-muted-foreground' />
              )}
            </button>
            <AnimatePresence>
              {showPendingSection && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className='overflow-hidden'
                >
                  <div className='px-4 pb-3'>
                    <div className='flex gap-3 overflow-x-auto pb-2 -mx-4 px-4'>
                      {pendingRequests.map(request => (
                        <motion.button
                          key={request.uid}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedPending(request)}
                          className='flex flex-col items-center gap-1.5 min-w-16'
                        >
                          <div className='relative'>
                            <UserAvatar
                              src={request.photos?.[0]}
                              name={request.displayName}
                              className='w-14 h-14 border-2 border-frinder-gold'
                              showInitial={!!request.photos?.[0]}
                            />
                            <div className='absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-frinder-gold rounded-full flex items-center justify-center'>
                              <Clock className='w-3 h-3 text-white' />
                            </div>
                          </div>
                          <span className='text-xs text-center truncate w-full dark:text-white'>
                            {request.displayName?.split(' ')[0] || 'User'}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Pending Request Detail Sheet/Dialog */}
        <AnimatePresence>
          {selectedPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end lg:items-center lg:justify-center'
              onClick={() => setSelectedPending(null)}
            >
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className='w-full max-h-[80vh] bg-white dark:bg-black rounded-t-3xl overflow-hidden lg:rounded-2xl lg:max-w-md lg:max-h-[85vh] lg:shadow-2xl'
              >
                {/* Pending Profile Header */}
                <div className='relative h-64'>
                  {selectedPending.photos?.[0] ? (
                    <img
                      src={selectedPending.photos[0]}
                      alt={selectedPending.displayName}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${getAvatarColor(selectedPending.displayName)}`}>
                      <User className='w-24 h-24 text-white/80' />
                    </div>
                  )}
                  <div className='absolute inset-0 bg-black/40' />
                  <button
                    onClick={() => setSelectedPending(null)}
                    className='absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors'
                  >
                    <X className='w-5 h-5' />
                  </button>
                  <div className='absolute bottom-4 left-4 right-4'>
                    <div className='flex items-center gap-2 mb-2'>
                      <Badge className='bg-frinder-gold text-white'>
                        <Clock className='w-3 h-3 mr-1' />
                        Request Pending
                      </Badge>
                    </div>
                    <h2 className='text-2xl font-bold text-white'>
                      {selectedPending.displayName}
                      {selectedPending.age ? `, ${selectedPending.age}` : ''}
                    </h2>
                    {selectedPending.city && (
                      <div className='flex items-center gap-1 text-white/80 mt-1'>
                        <MapPin className='w-4 h-4' />
                        <span className='text-sm'>
                          {selectedPending.city}
                          {selectedPending.country ? `, ${selectedPending.country}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pending Content */}
                <div className='p-4'>
                  <div className='bg-frinder-gold/10 border border-frinder-gold/20 rounded-xl p-4 mb-4'>
                    <p className='text-sm text-center text-frinder-gold'>
                      <Send className='w-4 h-4 inline mr-2' />
                      Waiting for {selectedPending.displayName?.split(' ')[0]} to like you back
                    </p>
                  </div>

                  {/* Looking For */}
                  {selectedPending.relationshipGoal && (
                    <div className='mb-4'>
                      <h3 className='font-semibold dark:text-white mb-2'>Looking For</h3>
                      <Badge className='bg-frinder-gold/10 text-frinder-gold border border-frinder-gold/20'>
                        <Heart className='w-3 h-3 mr-1.5' />
                        {selectedPending.relationshipGoal === 'relationship' && 'A relationship'}
                        {selectedPending.relationshipGoal === 'casual' && 'Something casual'}
                        {selectedPending.relationshipGoal === 'friends' && 'Just friends'}
                      </Badge>
                    </div>
                  )}

                  {/* Bio */}
                  {selectedPending.bio && (
                    <div className='mb-4'>
                      <h3 className='font-semibold dark:text-white mb-2'>About</h3>
                      <p className='text-muted-foreground text-sm leading-relaxed'>{selectedPending.bio}</p>
                    </div>
                  )}

                  {/* Interests */}
                  {selectedPending.interests && selectedPending.interests.length > 0 && (
                    <div className='mb-4'>
                      <h3 className='font-semibold dark:text-white mb-2'>Interests</h3>
                      <div className='flex flex-wrap gap-2'>
                        {selectedPending.interests.filter(Boolean).map((interest, index) => (
                          <Badge
                            key={`${interest}-${index}`}
                            className='bg-frinder-gold/10 text-frinder-gold border border-frinder-gold/20'
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cancel Request Button */}
                  <Button
                    variant='outline'
                    className='w-full border-red-300 text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950'
                    onClick={async () => {
                      if (!user) return;
                      try {
                        await cancelPendingRequest(user.uid, selectedPending.uid);
                        setSelectedPending(null);
                        toast.success('Request cancelled');
                      } catch (error) {
                        console.error('Error cancelling request:', error);
                        toast.error('Failed to cancel request');
                      }
                    }}
                  >
                    <X className='w-4 h-4 mr-2' />
                    Cancel Request
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Incoming Requests Section (People who liked you) */}
        {incomingRequests.length > 0 && (
          <div className='px-4 py-3 border-b dark:border-frinder-orange/20 bg-frinder-orange/5'>
            <div className='flex items-center gap-2 mb-3'>
              <Heart className='w-4 h-4 text-frinder-orange fill-frinder-orange' />
              <h2 className='text-sm font-semibold dark:text-white'>Likes You</h2>
              <Badge variant='secondary' className='bg-frinder-orange/10 text-frinder-orange text-xs'>
                {incomingRequests.length}
              </Badge>
            </div>
            <div className='flex gap-3 overflow-x-auto pb-2 -mx-4 px-4'>
              {incomingRequests.map(request => (
                <motion.button
                  key={request.uid}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedIncoming(request)}
                  className='flex flex-col items-center gap-1.5 min-w-16'
                >
                  <div className='relative'>
                    <UserAvatar
                      src={request.photos?.[0]}
                      name={request.displayName}
                      className='w-14 h-14 border-2 border-frinder-orange'
                      showInitial={!!request.photos?.[0]}
                    />
                    <div className='absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-frinder-orange rounded-full flex items-center justify-center'>
                      <Heart className='w-3 h-3 text-white fill-white' />
                    </div>
                  </div>
                  <span className='text-xs text-center truncate w-full dark:text-white'>
                    {request.displayName?.split(' ')[0] || 'User'}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Incoming Request Detail Sheet/Dialog */}
        <AnimatePresence>
          {selectedIncoming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end lg:items-center lg:justify-center'
              onClick={() => setSelectedIncoming(null)}
            >
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className='w-full max-h-[80vh] bg-white dark:bg-black rounded-t-3xl overflow-hidden lg:rounded-2xl lg:max-w-md lg:max-h-[85vh] lg:shadow-2xl'
              >
                {/* Incoming Profile Header */}
                <div className='relative h-64'>
                  {selectedIncoming.photos?.[0] ? (
                    <img
                      src={selectedIncoming.photos[0]}
                      alt={selectedIncoming.displayName}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${getAvatarColor(selectedIncoming.displayName)}`}>
                      <User className='w-24 h-24 text-white/80' />
                    </div>
                  )}
                  <div className='absolute inset-0 bg-black/40' />
                  <button
                    onClick={() => setSelectedIncoming(null)}
                    className='absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors'
                  >
                    <X className='w-5 h-5' />
                  </button>
                  <div className='absolute bottom-4 left-4 right-4'>
                    <div className='flex items-center gap-2 mb-2'>
                      <Badge className='bg-frinder-orange text-white'>
                        <Heart className='w-3 h-3 mr-1 fill-white' />
                        Likes You
                      </Badge>
                    </div>
                    <h2 className='text-2xl font-bold text-white'>
                      {selectedIncoming.displayName}
                      {selectedIncoming.age ? `, ${selectedIncoming.age}` : ''}
                    </h2>
                    {selectedIncoming.city && (
                      <div className='flex items-center gap-1 text-white/80 mt-1'>
                        <MapPin className='w-4 h-4' />
                        <span className='text-sm'>
                          {selectedIncoming.city}
                          {selectedIncoming.country ? `, ${selectedIncoming.country}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Incoming Content */}
                <div className='p-4'>
                  <div className='bg-frinder-orange/10 border border-frinder-orange/20 rounded-xl p-4 mb-4'>
                    <p className='text-sm text-center text-frinder-orange'>
                      <Heart className='w-4 h-4 inline mr-2 fill-frinder-orange' />
                      {selectedIncoming.displayName?.split(' ')[0]} wants to match with you!
                    </p>
                  </div>

                  {/* Looking For */}
                  {selectedIncoming.relationshipGoal && (
                    <div className='mb-4'>
                      <h3 className='font-semibold dark:text-white mb-2'>Looking For</h3>
                      <Badge className='bg-frinder-orange/10 text-frinder-orange border border-frinder-orange/20'>
                        <Heart className='w-3 h-3 mr-1.5' />
                        {selectedIncoming.relationshipGoal === 'relationship' && 'A relationship'}
                        {selectedIncoming.relationshipGoal === 'casual' && 'Something casual'}
                        {selectedIncoming.relationshipGoal === 'friends' && 'Just friends'}
                      </Badge>
                    </div>
                  )}

                  {/* Bio */}
                  {selectedIncoming.bio && (
                    <div className='mb-4'>
                      <h3 className='font-semibold dark:text-white mb-2'>About</h3>
                      <p className='text-muted-foreground text-sm leading-relaxed'>{selectedIncoming.bio}</p>
                    </div>
                  )}

                  {/* Interests */}
                  {selectedIncoming.interests && selectedIncoming.interests.length > 0 && (
                    <div className='mb-4'>
                      <h3 className='font-semibold dark:text-white mb-2'>Interests</h3>
                      <div className='flex flex-wrap gap-2'>
                        {selectedIncoming.interests.filter(Boolean).map((interest, index) => (
                          <Badge
                            key={`${interest}-${index}`}
                            className='bg-frinder-orange/10 text-frinder-orange border border-frinder-orange/20'
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Accept/Decline Buttons */}
                  <div className='flex gap-3'>
                    <Button
                      variant='outline'
                      className='flex-1 border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-900'
                      onClick={() => handleDeclineRequest(selectedIncoming)}
                      disabled={processingIncoming === selectedIncoming.uid}
                    >
                      {processingIncoming === selectedIncoming.uid ? (
                        <Loader2 className='w-4 h-4 animate-spin' />
                      ) : (
                        <>
                          <X className='w-4 h-4 mr-2' />
                          Decline
                        </>
                      )}
                    </Button>
                    <Button
                      className='flex-1 bg-frinder-orange hover:bg-frinder-burnt text-white'
                      onClick={() => handleAcceptRequest(selectedIncoming)}
                      disabled={processingIncoming === selectedIncoming.uid}
                    >
                      {processingIncoming === selectedIncoming.uid ? (
                        <Loader2 className='w-4 h-4 animate-spin' />
                      ) : (
                        <>
                          <Check className='w-4 h-4 mr-2' />
                          Accept
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Matches Grid */}
        <div className='p-4'>
          {filteredMatches.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full text-center px-6'>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className='w-20 h-20 rounded-full bg-frinder-orange/10 flex items-center justify-center mb-4'
              >
                {searchQuery ? (
                  <Search className='w-10 h-10 text-frinder-orange' />
                ) : (
                  <Heart className='w-10 h-10 text-frinder-orange' />
                )}
              </motion.div>
              <h2 className='text-xl font-bold mb-2 dark:text-white'>
                {searchQuery ? 'No matches found' : 'No matches yet'}
              </h2>
              <p className='text-muted-foreground'>
                {searchQuery ? 'Try a different search term' : 'Start swiping to find your perfect match!'}
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-4 gap-1.5'>
              {filteredMatches.map(match => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedMatch(match)}
                  className='cursor-pointer'
                >
                  <div className='relative aspect-square rounded-lg overflow-hidden'>
                    {match.photo && match.photo.trim() !== '' && !match.photo.includes('placeholder') ? (
                      <img src={match.photo} alt={match.name} className='w-full h-full object-cover' />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${getAvatarColor(match.name)}`}>
                        <User className='w-8 h-8 text-white/80' />
                      </div>
                    )}
                    <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent' />
                    <div className='absolute bottom-0 left-0 right-0 p-1'>
                      <p className='text-white text-[10px] font-medium truncate'>{match.name.split(' ')[0]}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
