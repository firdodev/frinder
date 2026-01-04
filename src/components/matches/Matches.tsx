'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Users,
  Clock,
  Send,
  Check,
  UserCheck
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
            matchedAt: m.createdAt instanceof Date ? m.createdAt : m.createdAt?.toDate() || new Date(),
            isOnline: false,
            relationshipGoal: otherUserProfile?.relationshipGoal
          };
        })
      );

      setMatches(mappedMatches);
      setLoading(false);
    });

    // Subscribe to pending requests (outgoing)
    const unsubscribePending = subscribeToPendingRequests(user.uid, (requests) => {
      setPendingRequests(requests);
    });

    // Subscribe to incoming requests (people who liked you)
    const unsubscribeIncoming = subscribeToIncomingRequests(user.uid, (requests) => {
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

  const filteredMatches = matches.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <DialogContent className='dark:bg-black dark:border-gray-800'>
          <DialogHeader>
            <DialogTitle className='dark:text-white'>Unmatch {matchToUnmatch?.name}?</DialogTitle>
            <DialogDescription>
              This will remove your match and you won't be able to message each other anymore. This action cannot be undone.
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
              className='w-full max-h-[90vh] bg-white dark:bg-gray-950 rounded-t-3xl overflow-hidden lg:rounded-2xl lg:max-w-md lg:max-h-[85vh] lg:shadow-2xl'
            >
              {/* Match Profile Header */}
              <div className='relative h-72 lg:h-64'>
                <img
                  src={selectedMatch.photo}
                  alt={selectedMatch.name}
                  className='w-full h-full object-cover'
                />
                <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent' />
                <button
                  onClick={() => setSelectedMatch(null)}
                  className='absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
                <div className='absolute bottom-4 left-4 right-4'>
                  <h2 className='text-2xl font-bold text-white'>
                    {selectedMatch.name}{selectedMatch.age ? `, ${selectedMatch.age}` : ''}
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

                {/* Looking For */}
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
      <div className='px-4 pt-4 pb-3 border-b dark:border-gray-800 bg-white dark:bg-black'>
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
            className='pl-10 dark:bg-gray-900 dark:border-gray-800'
          />
        </div>
      </div>

      {/* Matches Content */}
      <div className='flex-1 overflow-y-auto'>
        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <div className='px-4 py-3 border-b dark:border-gray-800'>
            <div className='flex items-center gap-2 mb-3'>
              <Send className='w-4 h-4 text-frinder-gold' />
              <h2 className='text-sm font-semibold dark:text-white'>Pending Requests</h2>
              <Badge variant='secondary' className='bg-frinder-gold/10 text-frinder-gold text-xs'>
                {pendingRequests.length}
              </Badge>
            </div>
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
                    <Avatar className='w-14 h-14 border-2 border-frinder-gold'>
                      <AvatarImage src={request.photos?.[0]} alt={request.displayName} />
                      <AvatarFallback className='bg-frinder-gold text-white'>
                        {request.displayName?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
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
                className='w-full max-h-[80vh] bg-white dark:bg-gray-950 rounded-t-3xl overflow-hidden lg:rounded-2xl lg:max-w-md lg:max-h-[85vh] lg:shadow-2xl'
              >
                {/* Pending Profile Header */}
                <div className='relative h-64'>
                  <img
                    src={selectedPending.photos?.[0] || ''}
                    alt={selectedPending.displayName}
                    className='w-full h-full object-cover'
                  />
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
                      {selectedPending.displayName}{selectedPending.age ? `, ${selectedPending.age}` : ''}
                    </h2>
                    {selectedPending.city && (
                      <div className='flex items-center gap-1 text-white/80 mt-1'>
                        <MapPin className='w-4 h-4' />
                        <span className='text-sm'>
                          {selectedPending.city}{selectedPending.country ? `, ${selectedPending.country}` : ''}
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
          <div className='px-4 py-3 border-b dark:border-gray-800 bg-frinder-orange/5'>
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
                    <Avatar className='w-14 h-14 border-2 border-frinder-orange'>
                      <AvatarImage src={request.photos?.[0]} alt={request.displayName} />
                      <AvatarFallback className='bg-frinder-orange text-white'>
                        {request.displayName?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
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
                className='w-full max-h-[80vh] bg-white dark:bg-gray-950 rounded-t-3xl overflow-hidden lg:rounded-2xl lg:max-w-md lg:max-h-[85vh] lg:shadow-2xl'
              >
                {/* Incoming Profile Header */}
                <div className='relative h-64'>
                  <img
                    src={selectedIncoming.photos?.[0] || ''}
                    alt={selectedIncoming.displayName}
                    className='w-full h-full object-cover'
                  />
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
                      {selectedIncoming.displayName}{selectedIncoming.age ? `, ${selectedIncoming.age}` : ''}
                    </h2>
                    {selectedIncoming.city && (
                      <div className='flex items-center gap-1 text-white/80 mt-1'>
                        <MapPin className='w-4 h-4' />
                        <span className='text-sm'>
                          {selectedIncoming.city}{selectedIncoming.country ? `, ${selectedIncoming.country}` : ''}
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
              {searchQuery
                ? 'Try a different search term'
                : 'Start swiping to find your perfect match!'}
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
                  <img
                    src={match.photo}
                    alt={match.name}
                    className='w-full h-full object-cover'
                  />
                  <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent' />
                  <div className='absolute bottom-0 left-0 right-0 p-1'>
                    <p className='text-white text-[10px] font-medium truncate'>
                      {match.name.split(' ')[0]}
                    </p>
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
