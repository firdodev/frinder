'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar, getAvatarColor } from '@/components/ui/user-avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Search as SearchIcon,
  Heart,
  X,
  Loader2,
  MapPin,
  Sparkles,
  Check,
  UserPlus,
  MessageCircle,
  Star,
  Users,
  User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  searchUsers,
  sendMatchRequest,
  checkIfMatched,
  checkSwipeStatus,
  cancelPendingRequest
} from '@/lib/firebaseServices';
import { toast } from 'sonner';

interface SearchResult {
  id: string;
  displayName: string;
  age?: number;
  photo: string;
  photos: string[];
  bio?: string;
  city?: string;
  country?: string;
  interests?: string[];
  lookingFor?: 'people' | 'groups' | 'both';
  swipeStatus: 'none' | 'left' | 'right' | 'superlike';
  isMatched: boolean;
  matchId?: string;
}

interface SearchProps {
  onStartChat?: (matchId: string, name: string, photo: string, otherUserId: string) => void;
}

export default function Search({ onStartChat }: SearchProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [cancelingRequest, setCancelingRequest] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, SearchResult[]>>(new Map());

  const performSearch = useCallback(
    async (query: string) => {
      if (!user?.uid || !query.trim()) {
        setResults([]);
        return;
      }

      const trimmedQuery = query.trim().toLowerCase();
      
      // Check cache first
      if (cacheRef.current.has(trimmedQuery)) {
        setResults(cacheRef.current.get(trimmedQuery)!);
        return;
      }

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoading(true);
      try {
        const users = await searchUsers(user.uid, query);

        // Check match and swipe status for each user in parallel batches
        const batchSize = 5;
        const resultsWithStatus: SearchResult[] = [];
        
        for (let i = 0; i < users.length; i += batchSize) {
          const batch = users.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async u => {
              const [matchStatus, swipeStatus] = await Promise.all([
                checkIfMatched(user.uid, u.id),
                checkSwipeStatus(user.uid, u.id)
              ]);

              return {
                id: u.id,
                displayName: u.displayName || 'Unknown',
                age: u.age,
                photo: u.photos?.[0] || '',
                photos: u.photos || [],
                bio: u.bio,
                city: u.city,
                country: u.country,
                interests: u.interests || [],
                lookingFor: u.lookingFor,
                swipeStatus,
                isMatched: matchStatus.isMatched,
                matchId: matchStatus.matchId
              };
            })
          );
          resultsWithStatus.push(...batchResults);
        }

        // Cache the results
        cacheRef.current.set(trimmedQuery, resultsWithStatus);
        // Limit cache size
        if (cacheRef.current.size > 20) {
          const firstKey = cacheRef.current.keys().next().value;
          if (firstKey) cacheRef.current.delete(firstKey);
        }

        setResults(resultsWithStatus);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Search error:', error);
          toast.error('Failed to search');
        }
      } finally {
        setLoading(false);
      }
    },
    [user?.uid]
  );

  // Debounced search with longer delay for optimization
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.trim()) {
      // Use shorter delay for cached queries
      const delay = cacheRef.current.has(searchQuery.trim().toLowerCase()) ? 100 : 400;
      debounceRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, delay);
    } else {
      setResults([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  const handleSendRequest = async (targetUser: SearchResult) => {
    if (!user?.uid) return;

    setSendingRequest(targetUser.id);
    try {
      const result = await sendMatchRequest(user.uid, targetUser.id);

      if (result.isMatch) {
        toast.success(`It's a match! You and ${targetUser.displayName} liked each other!`, {
          icon: '💕'
        });
        // Update the result to show as matched
        setResults(prev =>
          prev.map(r =>
            r.id === targetUser.id
              ? { ...r, isMatched: true, matchId: result.matchId, swipeStatus: 'right' as const }
              : r
          )
        );
        if (selectedUser?.id === targetUser.id) {
          setSelectedUser(prev =>
            prev ? { ...prev, isMatched: true, matchId: result.matchId, swipeStatus: 'right' } : null
          );
        }
      } else {
        toast.success(`Request sent to ${targetUser.displayName}!`);
        // Update swipe status
        setResults(prev => prev.map(r => (r.id === targetUser.id ? { ...r, swipeStatus: 'right' as const } : r)));
        if (selectedUser?.id === targetUser.id) {
          setSelectedUser(prev => (prev ? { ...prev, swipeStatus: 'right' } : null));
        }
      }
    } catch (error) {
      toast.error('Failed to send request');
    } finally {
      setSendingRequest(null);
    }
  };

  const handleCancelRequest = async (targetUser: SearchResult) => {
    if (!user?.uid) return;

    setCancelingRequest(targetUser.id);
    try {
      await cancelPendingRequest(user.uid, targetUser.id);
      toast.success('Request cancelled');
      // Update swipe status back to none
      setResults(prev => prev.map(r => (r.id === targetUser.id ? { ...r, swipeStatus: 'none' as const } : r)));
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(prev => (prev ? { ...prev, swipeStatus: 'none' } : null));
      }
    } catch (error) {
      toast.error('Failed to cancel request');
    } finally {
      setCancelingRequest(null);
    }
  };

  const getActionButton = (result: SearchResult) => {
    if (result.isMatched) {
      return (
        <Button
          size='sm'
          onClick={e => {
            e.stopPropagation();
            if (result.matchId && onStartChat) {
              onStartChat(result.matchId, result.displayName, result.photo, result.id);
            }
          }}
          className='bg-frinder-orange hover:bg-frinder-burnt text-white'
        >
          <MessageCircle className='w-4 h-4 mr-1' />
          Chat
        </Button>
      );
    }

    if (result.swipeStatus === 'right' || result.swipeStatus === 'superlike') {
      return (
        <Button
          size='sm'
          variant='outline'
          onClick={e => {
            e.stopPropagation();
            handleCancelRequest(result);
          }}
          disabled={cancelingRequest === result.id}
          className='text-red-500 border-red-300 hover:bg-red-50 dark:hover:bg-red-950'
        >
          {cancelingRequest === result.id ? (
            <Loader2 className='w-4 h-4 animate-spin' />
          ) : (
            <>
              <X className='w-4 h-4 mr-1' />
              Cancel
            </>
          )}
        </Button>
      );
    }

    return (
      <Button
        size='sm'
        onClick={e => {
          e.stopPropagation();
          handleSendRequest(result);
        }}
        disabled={sendingRequest === result.id}
        className='bg-frinder-orange hover:bg-frinder-burnt text-white'
      >
        {sendingRequest === result.id ? (
          <Loader2 className='w-4 h-4 animate-spin' />
        ) : (
          <>
            <Heart className='w-4 h-4 mr-1' />
            Like
          </>
        )}
      </Button>
    );
  };

  return (
    <div className='h-full flex flex-col dark:bg-black'>
      {/* User Detail Sheet */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 bg-black/50 backdrop-blur-sm'
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className='absolute bottom-0 left-0 right-0 max-h-[85vh] bg-white dark:bg-gray-950 rounded-t-3xl overflow-hidden'
            >
              {/* Profile Header */}
              <div className='relative h-64'>
                {selectedUser.photo ? (
                  <img src={selectedUser.photo} alt={selectedUser.displayName} className='w-full h-full object-cover' />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${getAvatarColor(selectedUser.displayName)}`}>
                    <User className='w-24 h-24 text-white/80' />
                  </div>
                )}
                <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent' />
                <button
                  onClick={() => setSelectedUser(null)}
                  className='absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>

                {/* Match indicator */}
                {selectedUser.isMatched && (
                  <div className='absolute top-4 left-4 flex items-center gap-1 bg-frinder-orange px-3 py-1.5 rounded-full'>
                    <Sparkles className='w-4 h-4 text-white' />
                    <span className='text-sm font-medium text-white'>Matched</span>
                  </div>
                )}

                <div className='absolute bottom-4 left-4 right-4'>
                  <h2 className='text-2xl font-bold text-white'>
                    {selectedUser.displayName}
                    {selectedUser.age ? `, ${selectedUser.age}` : ''}
                  </h2>
                  {(selectedUser.city || selectedUser.country) && (
                    <div className='flex items-center gap-1 text-white/80 mt-1'>
                      <MapPin className='w-4 h-4' />
                      <span className='text-sm'>
                        {[selectedUser.city, selectedUser.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className='p-4 overflow-y-auto max-h-[calc(85vh-256px)]'>
                {/* Action Buttons */}
                <div className='flex gap-3 mb-6'>
                  {selectedUser.isMatched ? (
                    <Button
                      onClick={() => {
                        if (selectedUser.matchId && onStartChat) {
                          onStartChat(
                            selectedUser.matchId,
                            selectedUser.displayName,
                            selectedUser.photo,
                            selectedUser.id
                          );
                          setSelectedUser(null);
                        }
                      }}
                      className='flex-1 bg-frinder-orange hover:bg-frinder-burnt h-12'
                    >
                      <MessageCircle className='w-5 h-5 mr-2' />
                      Message
                    </Button>
                  ) : selectedUser.swipeStatus === 'right' || selectedUser.swipeStatus === 'superlike' ? (
                    <Button
                      variant='outline'
                      onClick={() => handleCancelRequest(selectedUser)}
                      disabled={cancelingRequest === selectedUser.id}
                      className='flex-1 h-12 text-red-500 border-red-300 hover:bg-red-50 dark:hover:bg-red-950'
                    >
                      {cancelingRequest === selectedUser.id ? (
                        <Loader2 className='w-5 h-5 animate-spin' />
                      ) : (
                        <>
                          <X className='w-5 h-5 mr-2' />
                          Cancel Request
                        </>
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleSendRequest(selectedUser)}
                        disabled={sendingRequest === selectedUser.id}
                        className='flex-1 bg-frinder-orange hover:bg-frinder-burnt h-12'
                      >
                        {sendingRequest === selectedUser.id ? (
                          <Loader2 className='w-5 h-5 animate-spin' />
                        ) : (
                          <>
                            <Heart className='w-5 h-5 mr-2' />
                            Send Like
                          </>
                        )}
                      </Button>
                      <Button
                        variant='outline'
                        onClick={() => handleSendRequest(selectedUser)}
                        disabled={sendingRequest === selectedUser.id}
                        className='h-12 px-4 border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      >
                        <Star className='w-5 h-5' fill='currentColor' />
                      </Button>
                    </>
                  )}
                </div>

                {/* Looking For */}
                {selectedUser.lookingFor && (
                  <div className='mb-6'>
                    <h3 className='font-semibold dark:text-white mb-2'>Looking For</h3>
                    <Badge className='bg-frinder-orange/10 text-frinder-orange border border-frinder-orange/20'>
                      <Users className='w-3 h-3 mr-1.5' />
                      {selectedUser.lookingFor === 'people' && 'People to meet'}
                      {selectedUser.lookingFor === 'groups' && 'Groups to join'}
                      {selectedUser.lookingFor === 'both' && 'People & Groups'}
                    </Badge>
                  </div>
                )}

                {/* Bio */}
                {selectedUser.bio && (
                  <div className='mb-6'>
                    <h3 className='font-semibold dark:text-white mb-2'>About</h3>
                    <p className='text-muted-foreground text-sm leading-relaxed'>{selectedUser.bio}</p>
                  </div>
                )}

                {/* Interests */}
                {selectedUser.interests && selectedUser.interests.length > 0 && (
                  <div className='mb-6'>
                    <h3 className='font-semibold dark:text-white mb-2'>Interests</h3>
                    <div className='flex flex-wrap gap-2'>
                      {selectedUser.interests.filter(Boolean).map((interest, index) => (
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
                {selectedUser.photos.length > 1 && (
                  <div>
                    <h3 className='font-semibold dark:text-white mb-2'>Photos</h3>
                    <div className='grid grid-cols-3 gap-2'>
                      {selectedUser.photos.slice(1).map((photo, index) => (
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
        <div className='flex items-center gap-2 mb-4'>
          <SearchIcon className='w-6 h-6 text-frinder-orange' />
          <h1 className='text-xl font-bold dark:text-white'>Find People</h1>
        </div>

        {/* Search Input */}
        <div className='relative'>
          <SearchIcon className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder='Search by name or city...'
            className='pl-10 dark:bg-gray-900 dark:border-gray-800'
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
            >
              <X className='w-4 h-4' />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className='flex-1 overflow-y-auto p-4'>
        {loading ? (
          <div className='flex items-center justify-center h-48'>
            <Loader2 className='w-8 h-8 animate-spin text-frinder-orange' />
          </div>
        ) : results.length > 0 ? (
          <div className='space-y-3'>
            {results.map(result => (
              <motion.div key={result.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  className='overflow-hidden cursor-pointer hover:shadow-lg transition-shadow dark:bg-gray-900 dark:border-gray-800'
                  onClick={() => setSelectedUser(result)}
                >
                  <CardContent className='p-3'>
                    <div className='flex items-center gap-3'>
                      <div className='relative'>
                        <UserAvatar
                          src={result.photo}
                          name={result.displayName}
                          className='w-14 h-14'
                          showInitial={!!result.photo}
                        />
                        {result.isMatched && (
                          <span className='absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-frinder-orange flex items-center justify-center'>
                            <Sparkles className='w-3 h-3 text-white' />
                          </span>
                        )}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2'>
                          <h3 className='font-semibold dark:text-white truncate'>
                            {result.displayName}
                            {result.age ? `, ${result.age}` : ''}
                          </h3>
                          {result.isMatched && (
                            <Badge className='bg-frinder-orange/10 text-frinder-orange text-xs'>Matched</Badge>
                          )}
                        </div>
                        {(result.city || result.country) && (
                          <div className='flex items-center gap-1 text-muted-foreground text-sm'>
                            <MapPin className='w-3 h-3' />
                            <span className='truncate'>{[result.city, result.country].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                        {result.bio && <p className='text-xs text-muted-foreground truncate mt-0.5'>{result.bio}</p>}
                      </div>
                      {getActionButton(result)}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : searchQuery ? (
          <div className='flex flex-col items-center justify-center h-48 text-center'>
            <SearchIcon className='w-12 h-12 text-muted-foreground mb-3' />
            <p className='text-muted-foreground'>No users found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center h-48 text-center px-6'>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className='w-16 h-16 rounded-full bg-frinder-orange/10 flex items-center justify-center mb-4'
            >
              <UserPlus className='w-8 h-8 text-frinder-orange' />
            </motion.div>
            <h3 className='font-semibold dark:text-white mb-1'>Find New People</h3>
            <p className='text-sm text-muted-foreground'>
              Search by name or city to discover new people to connect with
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
