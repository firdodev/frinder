'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getAvatarColor } from '@/components/ui/user-avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import {
  Search as SearchIcon,
  Heart,
  X,
  Loader2,
  MapPin,
  Sparkles,
  MessageCircle,
  Star,
  User,
  ArrowLeft,
  SlidersHorizontal,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  searchUsersAdvanced,
  sendMatchRequest,
  checkIfMatched,
  checkSwipeStatus,
  cancelPendingRequest
} from '@/lib/firebaseServices';
import { toast } from 'sonner';

// Pre-defined interests for selection
const AVAILABLE_INTERESTS = [
  'Music', 'Sports', 'Gaming', 'Travel', 'Photography', 'Art', 'Cooking', 'Reading',
  'Movies', 'Fitness', 'Dancing', 'Nature', 'Technology', 'Fashion', 'Yoga', 'Coffee',
  'Wine', 'Hiking', 'Beach', 'Nightlife', 'Animals', 'Volunteering', 'Writing', 'Concerts'
];

interface SearchResult {
  id: string;
  displayName: string;
  age?: number;
  photo: string;
  photos: string[];
  bio?: string;
  city?: string;
  country?: string;
  university?: string;
  interests?: string[];
  lookingFor?: 'people' | 'groups' | 'both';
  swipeStatus: 'none' | 'left' | 'right' | 'superlike';
  isMatched: boolean;
  matchId?: string;
}

interface SearchFilters {
  name: string;
  interests: string[];
  ageMin: number | null;
  ageMax: number | null;
  university: string;
  notMatched: boolean;
}

interface SearchProps {
  onStartChat?: (matchId: string, name: string, photo: string, otherUserId: string) => void;
}

export default function Search({ onStartChat }: SearchProps) {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [cancelingRequest, setCancelingRequest] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Filter state
  const [filters, setFilters] = useState<SearchFilters>({
    name: '',
    interests: [],
    ageMin: null,
    ageMax: null,
    university: '',
    notMatched: false
  });
  
  // Temp filter state for the sheet
  const [tempFilters, setTempFilters] = useState<SearchFilters>({
    name: '',
    interests: [],
    ageMin: null,
    ageMax: null,
    university: '',
    notMatched: false
  });

  // Check if any filters are active
  const hasActiveFilters = filters.name || filters.interests.length > 0 || 
    filters.ageMin !== null || filters.ageMax !== null || filters.university || filters.notMatched;

  // Load all users initially and when filters change
  const loadUsers = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const users = await searchUsersAdvanced(user.uid, filters);

      // Check match and swipe status for each user in parallel batches
      const batchSize = 10;
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
              university: u.university,
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

      // Apply notMatched filter if enabled
      const filteredResults = filters.notMatched 
        ? resultsWithStatus.filter(r => !r.isMatched)
        : resultsWithStatus;

      setResults(filteredResults);
    } catch (error) {
      console.error('Load users error:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [user?.uid, filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleApplyFilters = () => {
    // Validate age range
    if (tempFilters.ageMin !== null && tempFilters.ageMin < 18) {
      toast.error('Minimum age must be at least 18');
      return;
    }
    if (tempFilters.ageMax !== null && tempFilters.ageMax < 18) {
      toast.error('Maximum age must be at least 18');
      return;
    }
    if (tempFilters.ageMax !== null && tempFilters.ageMax > 99) {
      toast.error('Maximum age must be at most 99');
      return;
    }
    if (tempFilters.ageMin !== null && tempFilters.ageMax !== null && tempFilters.ageMin > tempFilters.ageMax) {
      toast.error('Minimum age cannot be greater than maximum age');
      return;
    }
    
    setFilters(tempFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const cleared: SearchFilters = {
      name: '',
      interests: [],
      ageMin: null,
      ageMax: null,
      university: '',
      notMatched: false
    };
    setTempFilters(cleared);
    setFilters(cleared);
    setShowFilters(false);
  };

  const removeFilter = (type: 'name' | 'interest' | 'age' | 'university' | 'notMatched', value?: string) => {
    setFilters(prev => {
      const updated = { ...prev };
      if (type === 'name') updated.name = '';
      if (type === 'interest' && value) {
        updated.interests = prev.interests.filter(i => i !== value);
      }
      if (type === 'age') {
        updated.ageMin = null;
        updated.ageMax = null;
      }
      if (type === 'university') updated.university = '';
      if (type === 'notMatched') updated.notMatched = false;
      return updated;
    });
  };

  const toggleInterest = (interest: string) => {
    setTempFilters(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSendRequest = async (targetUser: SearchResult) => {
    if (!user?.uid) return;

    setSendingRequest(targetUser.id);
    try {
      const result = await sendMatchRequest(user.uid, targetUser.id);

      if (result.isMatch) {
        toast.success(`It's a match! You and ${targetUser.displayName} liked each other!`, {
          icon: '💕'
        });
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

  // Profile detail view
  if (selectedUser) {
    return (
      <div className='h-full flex flex-col dark:bg-black'>
        {/* Full screen profile */}
        <div className='relative flex-1'>
          {/* Photo with swipe for multiple */}
          <div className='relative h-full'>
            {selectedUser.photos.length > 0 ? (
              <>
                <img
                  src={selectedUser.photos[currentPhotoIndex] || selectedUser.photo}
                  alt={selectedUser.displayName}
                  className='w-full h-full object-cover'
                />
                {/* Photo indicators */}
                {selectedUser.photos.length > 1 && (
                  <div className='absolute top-4 left-4 right-4 flex gap-1'>
                    {selectedUser.photos.map((_, idx) => (
                      <div
                        key={idx}
                        className={`flex-1 h-1 rounded-full transition-all ${
                          idx === currentPhotoIndex ? 'bg-white' : 'bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                )}
                {/* Tap areas for photo navigation */}
                {selectedUser.photos.length > 1 && (
                  <>
                    <div
                      className='absolute left-0 top-0 w-1/3 h-full cursor-pointer'
                      onClick={() => setCurrentPhotoIndex(prev => Math.max(0, prev - 1))}
                    />
                    <div
                      className='absolute right-0 top-0 w-1/3 h-full cursor-pointer'
                      onClick={() => setCurrentPhotoIndex(prev => Math.min(selectedUser.photos.length - 1, prev + 1))}
                    />
                  </>
                )}
              </>
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${getAvatarColor(selectedUser.displayName)}`}>
                <User className='w-32 h-32 text-white/80' />
              </div>
            )}

            {/* Gradient overlay */}
            <div className='absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent' />

            {/* Back button */}
            <button
              onClick={() => {
                setSelectedUser(null);
                setCurrentPhotoIndex(0);
              }}
              className='absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors'
            >
              <ArrowLeft className='w-5 h-5' />
            </button>

            {/* Match indicator */}
            {selectedUser.isMatched && (
              <div className='absolute top-4 right-4 flex items-center gap-1 bg-frinder-orange px-3 py-1.5 rounded-full'>
                <Sparkles className='w-4 h-4 text-white' />
                <span className='text-sm font-medium text-white'>Matched</span>
              </div>
            )}

            {/* User info at bottom */}
            <div className='absolute bottom-0 left-0 right-0 p-4 pb-6'>
              <h2 className='text-3xl font-bold text-white'>
                {selectedUser.displayName}
                {selectedUser.age ? `, ${selectedUser.age}` : ''}
              </h2>
              
              {(selectedUser.city || selectedUser.country) && (
                <div className='flex items-center gap-1 text-white/80 mt-1'>
                  <MapPin className='w-4 h-4' />
                  <span>{[selectedUser.city, selectedUser.country].filter(Boolean).join(', ')}</span>
                </div>
              )}

              {selectedUser.university && (
                <div className='flex items-center gap-1 text-white/80 mt-1'>
                  <GraduationCap className='w-4 h-4' />
                  <span>{selectedUser.university}</span>
                </div>
              )}

              {/* Bio */}
              {selectedUser.bio && (
                <p className='text-white/90 text-sm mt-3 line-clamp-3'>{selectedUser.bio}</p>
              )}

              {/* Interests */}
              {selectedUser.interests && selectedUser.interests.length > 0 && (
                <div className='flex flex-wrap gap-2 mt-3'>
                  {selectedUser.interests.filter(Boolean).slice(0, 5).map((interest, index) => (
                    <Badge
                      key={`${interest}-${index}`}
                      className='bg-white/20 backdrop-blur-sm text-white border-0'
                    >
                      {interest}
                    </Badge>
                  ))}
                  {selectedUser.interests.length > 5 && (
                    <Badge className='bg-white/20 backdrop-blur-sm text-white border-0'>
                      +{selectedUser.interests.length - 5}
                    </Badge>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className='flex gap-3 mt-4'>
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
                    className='flex-1 bg-frinder-orange hover:bg-frinder-burnt h-14 text-lg'
                  >
                    <MessageCircle className='w-6 h-6 mr-2' />
                    Message
                  </Button>
                ) : selectedUser.swipeStatus === 'right' || selectedUser.swipeStatus === 'superlike' ? (
                  <Button
                    variant='outline'
                    onClick={() => handleCancelRequest(selectedUser)}
                    disabled={cancelingRequest === selectedUser.id}
                    className='flex-1 h-14 text-lg bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20'
                  >
                    {cancelingRequest === selectedUser.id ? (
                      <Loader2 className='w-6 h-6 animate-spin' />
                    ) : (
                      <>
                        <X className='w-6 h-6 mr-2' />
                        Cancel Request
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => handleSendRequest(selectedUser)}
                      disabled={sendingRequest === selectedUser.id}
                      className='flex-1 bg-frinder-orange hover:bg-frinder-burnt h-14 text-lg'
                    >
                      {sendingRequest === selectedUser.id ? (
                        <Loader2 className='w-6 h-6 animate-spin' />
                      ) : (
                        <>
                          <Heart className='w-6 h-6 mr-2' />
                          Like
                        </>
                      )}
                    </Button>
                    <Button
                      variant='outline'
                      onClick={() => handleSendRequest(selectedUser)}
                      disabled={sendingRequest === selectedUser.id}
                      className='h-14 px-6 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20'
                    >
                      <Star className='w-6 h-6' fill='currentColor' />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col dark:bg-black overflow-hidden'>
      {/* Scrollable content area */}
      <div className='flex-1 overflow-y-auto'>
        {/* Header - part of scrollable content */}
        <div className='px-4 pt-4 pb-3'>
          <div className='flex items-center justify-between'>
            <h1 className='text-2xl font-bold dark:text-white'>Explore</h1>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => {
                setTempFilters(filters);
                setShowFilters(true);
              }}
              className='relative'
            >
              <SlidersHorizontal className='w-5 h-5' />
              {hasActiveFilters && (
                <span className='absolute -top-1 -right-1 w-2 h-2 rounded-full bg-frinder-orange' />
              )}
            </Button>
          </div>

          {/* Active filters as removable pills */}
          {hasActiveFilters && (
          <div className='flex flex-wrap gap-2 mt-3 overflow-x-auto pb-1'>
            {filters.name && (
              <Badge
                variant='secondary'
                className='bg-zinc-800 text-white border-0 pr-1 flex items-center gap-1'
              >
                <span>"{filters.name}"</span>
                <button onClick={() => removeFilter('name')} className='p-0.5 hover:bg-white/20 rounded-full'>
                  <X className='w-3 h-3' />
                </button>
              </Badge>
            )}
            {(filters.ageMin !== null || filters.ageMax !== null) && (
              <Badge
                variant='secondary'
                className='bg-zinc-800 text-white border-0 pr-1 flex items-center gap-1'
              >
                <span>{filters.ageMin || 18}-{filters.ageMax || 99} y.o.</span>
                <button onClick={() => removeFilter('age')} className='p-0.5 hover:bg-white/20 rounded-full'>
                  <X className='w-3 h-3' />
                </button>
              </Badge>
            )}
            {filters.university && (
              <Badge
                variant='secondary'
                className='bg-zinc-800 text-white border-0 pr-1 flex items-center gap-1'
              >
                <span>{filters.university}</span>
                <button onClick={() => removeFilter('university')} className='p-0.5 hover:bg-white/20 rounded-full'>
                  <X className='w-3 h-3' />
                </button>
              </Badge>
            )}
            {filters.interests.map(interest => (
              <Badge
                key={interest}
                variant='secondary'
                className='bg-zinc-800 text-white border-0 pr-1 flex items-center gap-1'
              >
                <span>{interest}</span>
                <button onClick={() => removeFilter('interest', interest)} className='p-0.5 hover:bg-white/20 rounded-full'>
                  <X className='w-3 h-3' />
                </button>
              </Badge>
            ))}
            {filters.notMatched && (
              <Badge
                variant='secondary'
                className='bg-zinc-800 text-white border-0 pr-1 flex items-center gap-1'
              >
                <span>Not Matched</span>
                <button onClick={() => removeFilter('notMatched')} className='p-0.5 hover:bg-white/20 rounded-full'>
                  <X className='w-3 h-3' />
                </button>
              </Badge>
            )}
          </div>
        )}
        </div>

        {/* Results Grid - continuous with header */}
        <div className='px-2 pb-24'>
          {initialLoading ? (
            <div className='flex items-center justify-center h-48'>
              <Loader2 className='w-8 h-8 animate-spin text-frinder-orange' />
            </div>
          ) : results.length > 0 ? (
            <div className='grid grid-cols-2 gap-2'>
              {results.map(result => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className='relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer'
                onClick={() => setSelectedUser(result)}
              >
                {result.photo ? (
                  <img
                    src={result.photo}
                    alt={result.displayName}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${getAvatarColor(result.displayName)}`}>
                    <User className='w-16 h-16 text-white/80' />
                  </div>
                )}
                
                {/* Gradient overlay */}
                <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent' />
                
                {/* Match indicator */}
                {result.isMatched && (
                  <div className='absolute top-2 right-2'>
                    <Sparkles className='w-5 h-5 text-frinder-orange drop-shadow-lg' />
                  </div>
                )}

                {/* Pending indicator */}
                {(result.swipeStatus === 'right' || result.swipeStatus === 'superlike') && !result.isMatched && (
                  <div className='absolute top-2 right-2'>
                    <Heart className='w-5 h-5 text-frinder-orange fill-frinder-orange drop-shadow-lg' />
                  </div>
                )}
                
                {/* Name and age */}
                <div className='absolute bottom-0 left-0 right-0 p-3'>
                  <h3 className='text-white font-semibold text-lg leading-tight'>
                    {result.displayName.split(' ')[0]}
                  </h3>
                  {result.age && (
                    <span className='text-white/80 text-sm'>{result.age}</span>
                  )}
                </div>

                {/* Like button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!result.isMatched && result.swipeStatus === 'none') {
                      handleSendRequest(result);
                    }
                  }}
                  className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${result.isMatched || result.swipeStatus !== 'none' 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : 'bg-white/90 hover:bg-white'}`}
                  disabled={result.isMatched || result.swipeStatus !== 'none' || sendingRequest === result.id}
                >
                  {sendingRequest === result.id ? (
                    <Loader2 className='w-5 h-5 animate-spin text-frinder-orange' />
                  ) : (
                    <Heart
                      className={`w-5 h-5 ${
                        result.isMatched || result.swipeStatus !== 'none'
                          ? 'text-frinder-orange fill-frinder-orange'
                          : 'text-zinc-400'
                      }`}
                    />
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center h-48 text-center px-6'>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className='w-16 h-16 rounded-full bg-frinder-orange/10 flex items-center justify-center mb-4'
            >
              <SearchIcon className='w-8 h-8 text-frinder-orange' />
            </motion.div>
            <h3 className='font-semibold dark:text-white mb-1'>No Results Found</h3>
            <p className='text-sm text-muted-foreground'>
              {hasActiveFilters ? 'Try adjusting your filters' : 'No users available'}
            </p>
          </div>
        )}
        </div>
      </div>

      {/* Filter Sheet */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side='bottom' className='h-[85vh] rounded-t-3xl dark:bg-zinc-900'>
          <SheetHeader className='text-left'>
            <SheetTitle className='text-xl'>Search & Filter</SheetTitle>
          </SheetHeader>

          <div className='mt-6 space-y-6 overflow-y-auto max-h-[calc(85vh-180px)] pb-4'>
            {/* Name search */}
            <div className='space-y-2'>
              <Label className='text-sm font-medium'>Search by Name</Label>
              <div className='relative'>
                <SearchIcon className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                <Input
                  value={tempFilters.name}
                  onChange={e => setTempFilters(prev => ({ ...prev, name: e.target.value }))}
                  placeholder='Enter name...'
                  className='pl-10 dark:bg-zinc-800 dark:border-zinc-700'
                />
              </div>
            </div>

            {/* Age range */}
            <div className='space-y-2'>
              <Label className='text-sm font-medium'>Age Range</Label>
              <div className='flex items-center gap-3'>
                <Input
                  type='number'
                  value={tempFilters.ageMin ?? ''}
                  onChange={e => setTempFilters(prev => ({ 
                    ...prev, 
                    ageMin: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  placeholder='Min'
                  min={18}
                  max={99}
                  className='dark:bg-zinc-800 dark:border-zinc-700'
                />
                <span className='text-muted-foreground'>to</span>
                <Input
                  type='number'
                  value={tempFilters.ageMax ?? ''}
                  onChange={e => setTempFilters(prev => ({ 
                    ...prev, 
                    ageMax: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  placeholder='Max'
                  min={18}
                  max={99}
                  className='dark:bg-zinc-800 dark:border-zinc-700'
                />
              </div>
            </div>

            {/* University */}
            <div className='space-y-2'>
              <Label className='text-sm font-medium'>University</Label>
              <div className='relative'>
                <GraduationCap className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                <Input
                  value={tempFilters.university}
                  onChange={e => setTempFilters(prev => ({ ...prev, university: e.target.value }))}
                  placeholder='Enter university...'
                  className='pl-10 dark:bg-zinc-800 dark:border-zinc-700'
                />
              </div>
            </div>

            {/* Interests */}
            <div className='space-y-2'>
              <Label className='text-sm font-medium'>Interests</Label>
              <div className='flex flex-wrap gap-2'>
                {AVAILABLE_INTERESTS.map(interest => (
                  <Badge
                    key={interest}
                    variant={tempFilters.interests.includes(interest) ? 'default' : 'outline'}
                    className={`cursor-pointer transition-all ${
                      tempFilters.interests.includes(interest)
                        ? 'bg-frinder-orange hover:bg-frinder-burnt text-white border-frinder-orange'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:border-zinc-700'
                    }`}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Not Matched filter */}
            <div className='flex items-center justify-between py-2'>
              <div>
                <Label className='text-sm font-medium'>Not Matched Only</Label>
                <p className='text-xs text-muted-foreground'>Show only people you haven't matched with</p>
              </div>
              <Switch
                checked={tempFilters.notMatched}
                onCheckedChange={(checked) => setTempFilters(prev => ({ ...prev, notMatched: checked }))}
              />
            </div>
          </div>

          {/* Floating action buttons - Dynamic Island style */}
          <div className='absolute bottom-6 left-4 right-4 pointer-events-none'>
            <div className='flex gap-3 p-3 bg-white/20 dark:bg-black/30 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl pointer-events-auto'>
              <Button
                variant='ghost'
                onClick={handleClearFilters}
                className='flex-1 h-12 text-black dark:text-white hover:bg-white/20'
              >
                Clear All
              </Button>
              <Button
                onClick={handleApplyFilters}
                className='flex-1 h-12 bg-frinder-orange hover:bg-frinder-burnt'
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
