'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion';
import { Heart, X, Star, RotateCcw, Users, MapPin, Plus, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { getGroupsToSwipe, joinGroup, createGroup, type Group as FirebaseGroup } from '@/lib/firebaseServices';

interface GroupMember {
  id: string;
  name: string;
  photo: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  photo: string;
  members: GroupMember[];
  interests: string[];
  activity: string;
  location?: string;
}

// Mock data for development
const MOCK_GROUPS: Group[] = [
  {
    id: 'mock-group-1',
    name: 'Weekend Hikers',
    description: 'A group for outdoor enthusiasts who love exploring trails and mountains every weekend. All skill levels welcome!',
    photo: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800',
    members: [
      { id: 'm1', name: 'Alex', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
      { id: 'm2', name: 'Jordan', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' },
      { id: 'm3', name: 'Sam', photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200' },
    ],
    interests: ['Hiking', 'Nature', 'Fitness', 'Photography'],
    activity: 'Every Saturday morning',
    location: 'Mountain trails nearby'
  },
  {
    id: 'mock-group-2',
    name: 'Coffee & Code',
    description: 'Tech professionals and hobbyists meeting up to code, share knowledge, and enjoy good coffee together.',
    photo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
    members: [
      { id: 'm4', name: 'Taylor', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' },
      { id: 'm5', name: 'Chris', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
      { id: 'm6', name: 'Pat', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200' },
      { id: 'm7', name: 'Morgan', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200' },
    ],
    interests: ['Coding', 'Tech', 'Coffee', 'Networking', 'Startups'],
    activity: 'Wednesdays 6 PM',
    location: 'Local coffee shops'
  },
  {
    id: 'mock-group-3',
    name: 'Foodies Unite',
    description: 'Exploring the best restaurants, hidden gems, and food trucks in the city. From street food to fine dining!',
    photo: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    members: [
      { id: 'm8', name: 'Jamie', photo: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200' },
      { id: 'm9', name: 'Casey', photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200' },
    ],
    interests: ['Food', 'Cooking', 'Wine', 'Travel', 'Photography'],
    activity: 'Bi-weekly dinners',
    location: 'Various restaurants'
  },
  {
    id: 'mock-group-4',
    name: 'Yoga & Mindfulness',
    description: 'A peaceful community focused on yoga practice, meditation, and overall wellness. Beginners welcome!',
    photo: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
    members: [
      { id: 'm10', name: 'River', photo: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=200' },
      { id: 'm11', name: 'Sky', photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200' },
      { id: 'm12', name: 'Luna', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' },
    ],
    interests: ['Yoga', 'Wellness', 'Meditation', 'Fitness', 'Nature'],
    activity: 'Daily morning sessions',
    location: 'Park & Studio'
  },
  {
    id: 'mock-group-5',
    name: 'Board Game Nights',
    description: 'Weekly board game sessions for strategy lovers, casual players, and everyone in between. Bring your favorites!',
    photo: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800',
    members: [
      { id: 'm13', name: 'Drew', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
      { id: 'm14', name: 'Quinn', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' },
      { id: 'm15', name: 'Blake', photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200' },
      { id: 'm16', name: 'Avery', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200' },
      { id: 'm17', name: 'Riley', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
    ],
    interests: ['Gaming', 'Social', 'Strategy', 'Fun', 'Networking'],
    activity: 'Friday nights',
    location: 'Member homes (rotating)'
  },
];

// Check if running in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

interface SwipeGroupCardProps {
  group: Group;
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  isTop: boolean;
}

function SwipeGroupCard({ group, onSwipe, isTop }: SwipeGroupCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotate = useTransform(x, [-300, 0, 300], [-30, 0, 30]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const superLikeOpacity = useTransform(y, [-100, 0], [1, 0]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 150;
      const velocityThreshold = 500;

      if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
        onSwipe('right');
      } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
        onSwipe('left');
      } else if (info.offset.y < -threshold || info.velocity.y < -velocityThreshold) {
        onSwipe('up');
      }
    },
    [onSwipe]
  );

  return (
    <motion.div
      className={`absolute w-full h-full ${isTop ? 'z-10' : 'z-0'}`}
      style={{ x, y, rotate }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.5 }}
      animate={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.5 }}
    >
      <div className='w-full h-full rounded-3xl overflow-hidden bg-card shadow-2xl relative swipe-card'>
        {/* Photo */}
        <div className='relative w-full h-full'>
          <img src={group.photo || '/placeholder-group.png'} alt={group.name} className='w-full h-full object-cover' />

          {/* Like/Nope/Super Like indicators */}
          <motion.div className='absolute top-20 left-8 rotate-[-20deg]' style={{ opacity: likeOpacity }}>
            <div className='border-4 border-green-500 text-green-500 text-4xl font-bold px-4 py-2 rounded-lg'>JOIN</div>
          </motion.div>

          <motion.div className='absolute top-20 right-8 rotate-[20deg]' style={{ opacity: nopeOpacity }}>
            <div className='border-4 border-red-500 text-red-500 text-4xl font-bold px-4 py-2 rounded-lg'>PASS</div>
          </motion.div>

          <motion.div className='absolute top-20 left-1/2 -translate-x-1/2' style={{ opacity: superLikeOpacity }}>
            <div className='border-4 border-blue-500 text-blue-500 text-4xl font-bold px-4 py-2 rounded-lg'>SUPER</div>
          </motion.div>

          {/* Overlay */}
          <div className='absolute inset-x-0 bottom-0 h-3/4 bg-black/60' />

          {/* Group info */}
          <div className='absolute bottom-0 left-0 right-0 p-6 text-white'>
            {/* Group badge */}
            <div className='flex items-center gap-2 mb-3'>
              <div className='bg-[#ed8c00] px-3 py-1 rounded-full flex items-center gap-1'>
                <Users className='w-4 h-4' />
                <span className='text-sm font-medium'>{group.members.length} members</span>
              </div>
              {group.activity && (
                <div className='bg-white/20 px-3 py-1 rounded-full'>
                  <span className='text-sm'>{group.activity}</span>
                </div>
              )}
            </div>

            <h2 className='text-2xl font-bold mb-2'>{group.name}</h2>

            {group.location && (
              <div className='flex items-center gap-2 text-white/80 mb-3'>
                <MapPin className='w-4 h-4' />
                <span className='text-sm'>{group.location}</span>
              </div>
            )}

            <p className='text-white/90 mb-4 line-clamp-2'>{group.description}</p>

            {/* Members preview */}
            {group.members.length > 0 && (
              <div className='flex items-center gap-3 mb-4'>
                <div className='flex -space-x-2'>
                  {group.members.slice(0, 4).map(member => (
                    <Avatar key={member.id} className='w-8 h-8 border-2 border-white'>
                      <AvatarImage src={member.photo} alt={member.name} />
                      <AvatarFallback className='bg-[#ed8c00] text-white text-xs'>{member.name[0]}</AvatarFallback>
                    </Avatar>
                  ))}
                  {group.members.length > 4 && (
                    <div className='w-8 h-8 rounded-full bg-[#ed8c00] border-2 border-white flex items-center justify-center text-xs font-bold'>
                      +{group.members.length - 4}
                    </div>
                  )}
                </div>
                <span className='text-sm text-white/80'>
                  {group.members
                    .map(m => m.name)
                    .slice(0, 2)
                    .join(', ')}
                  {group.members.length > 2 && ` +${group.members.length - 2}`}
                </span>
              </div>
            )}

            {/* Interests */}
            {group.interests.length > 0 && (
              <div className='flex flex-wrap gap-2'>
                {group.interests.filter(i => i).map((interest, index) => (
                  <Badge key={`${interest}-${index}`} variant='secondary' className='bg-white/20 text-white border-0'>
                    {interest}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SwipeGroups() {
  const { user, userProfile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastAction, setLastAction] = useState<{ group: Group; direction: string } | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    interests: [] as string[],
    activity: '',
    location: ''
  });
  const [creating, setCreating] = useState(false);
  const [customInterest, setCustomInterest] = useState('');

  // Predefined interest tags for better algorithm matching
  const availableTags = [
    'Sports', 'Fitness', 'Music', 'Art', 'Photography', 'Gaming', 'Travel',
    'Food', 'Cooking', 'Reading', 'Movies', 'Tech', 'Coding', 'Fashion',
    'Dance', 'Yoga', 'Hiking', 'Camping', 'Beach', 'Nature', 'Nightlife',
    'Coffee', 'Wine', 'Pets', 'Dogs', 'Cats', 'Volunteering', 'Languages',
    'Business', 'Startups', 'Networking', 'Study', 'Research', 'Writing'
  ];

  const toggleInterest = (interest: string) => {
    setNewGroup(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !newGroup.interests.includes(customInterest.trim())) {
      setNewGroup(prev => ({
        ...prev,
        interests: [...prev.interests, customInterest.trim()]
      }));
      setCustomInterest('');
    }
  };

  // Load groups from Firebase (or mock data in development)
  useEffect(() => {
    async function loadGroups() {
      // In development, use mock data for testing
      if (isDevelopment) {
        setLoading(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setGroups(MOCK_GROUPS);
        setLoading(false);
        return;
      }

      if (!user?.uid) return;

      try {
        setLoading(true);
        const firebaseGroups = await getGroupsToSwipe(user.uid);

        // Map Firebase groups to our Group interface
        const mappedGroups: Group[] = firebaseGroups.map((g: FirebaseGroup) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          photo: g.photo || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
          members:
            g.members?.map(memberId => {
              const profile = g.memberProfiles?.[memberId];
              return {
                id: memberId,
                name: profile?.displayName || 'Unknown',
                photo: profile?.photos?.[0] || '/placeholder-avatar.png'
              };
            }) || [],
          interests: g.interests || [],
          activity: g.activity || 'Weekly meetups',
          location: g.location
        }));

        setGroups(mappedGroups);
      } catch (error) {
        console.error('Error loading groups:', error);
      } finally {
        setLoading(false);
      }
    }

    loadGroups();
  }, [user?.uid]);

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right' | 'up') => {
      if (groups.length === 0) return;

      const currentGroup = groups[0];
      setLastAction({ group: currentGroup, direction });
      setGroups(prev => prev.slice(1));

      // In development, skip Firebase operations
      if (isDevelopment) {
        console.log(`[DEV] Swiped ${direction} on group: ${currentGroup.name}`);
        return;
      }

      if (!user?.uid) return;

      if (direction === 'right' || direction === 'up') {
        try {
          await joinGroup(currentGroup.id, user.uid);
        } catch (error) {
          console.error('Error joining group:', error);
        }
      }
    },
    [groups, user?.uid]
  );

  const handleUndo = () => {
    if (lastAction) {
      setGroups(prev => [lastAction.group, ...prev]);
      setLastAction(null);
    }
  };

  const handleButtonSwipe = (direction: 'left' | 'right' | 'up') => {
    if (groups.length > 0) {
      handleSwipe(direction);
    }
  };

  const handleCreateGroup = async () => {
    // In development, simulate group creation
    if (isDevelopment) {
      const mockNewGroup: Group = {
        id: `mock-new-${Date.now()}`,
        name: newGroup.name,
        description: newGroup.description,
        photo: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
        members: [{ id: 'current-user', name: 'You', photo: '/placeholder-avatar.png' }],
        interests: newGroup.interests,
        activity: newGroup.activity,
        location: newGroup.location
      };
      setGroups(prev => [mockNewGroup, ...prev]);
      setShowCreateDialog(false);
      setNewGroup({ name: '', description: '', interests: [], activity: '', location: '' });
      return;
    }

    if (!user?.uid || !userProfile) return;

    try {
      setCreating(true);
      await createGroup(user.uid, {
        name: newGroup.name,
        description: newGroup.description,
        interests: newGroup.interests,
        activity: newGroup.activity,
        location: newGroup.location,
        photo: ''
      });

      setShowCreateDialog(false);
      setNewGroup({ name: '', description: '', interests: [], activity: '', location: '' });
      setCustomInterest('');
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className='h-full flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='w-12 h-12 animate-spin text-[#ed8c00] mx-auto mb-4' />
          <p className='text-muted-foreground'>Finding groups for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col'>
      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto dark:bg-black dark:border-gray-800'>
          <DialogHeader>
            <DialogTitle className='dark:text-white'>Create a Group</DialogTitle>
            <DialogDescription>Start a new group and invite others to join!</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div>
              <Label htmlFor='name' className='dark:text-white'>Group Name</Label>
              <Input
                id='name'
                value={newGroup.name}
                onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder='Weekend Hikers'
                className='dark:bg-gray-900 dark:border-gray-800 dark:text-white'
              />
            </div>
            <div>
              <Label htmlFor='description' className='dark:text-white'>Description</Label>
              <Textarea
                id='description'
                value={newGroup.description}
                onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                placeholder='What is your group about?'
                className='dark:bg-gray-900 dark:border-gray-800 dark:text-white'
              />
            </div>
            
            {/* Interest Tags Section */}
            <div>
              <Label className='dark:text-white'>Interests</Label>
              <p className='text-xs text-muted-foreground mb-3'>Select tags that describe your group for better matching</p>
              
              {/* Selected Tags */}
              {newGroup.interests.length > 0 && (
                <div className='flex flex-wrap gap-2 mb-3 p-3 rounded-lg bg-frinder-orange/5 dark:bg-gray-900 border border-frinder-orange/20 dark:border-gray-800'>
                  {newGroup.interests.map((interest, index) => (
                    <Badge
                      key={`selected-${interest}-${index}`}
                      className='bg-frinder-orange text-white hover:bg-frinder-burnt cursor-pointer pr-1'
                      onClick={() => toggleInterest(interest)}
                    >
                      {interest}
                      <X className='w-3 h-3 ml-1' />
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Available Tags Grid */}
              <div className='max-h-32 overflow-y-auto border rounded-lg p-3 dark:border-gray-800'>
                <div className='flex flex-wrap gap-2'>
                  {availableTags
                    .filter(tag => !newGroup.interests.includes(tag))
                    .map(tag => (
                      <Badge
                        key={tag}
                        variant='outline'
                        className='cursor-pointer hover:bg-frinder-orange/10 hover:border-frinder-orange transition-colors dark:border-gray-700 dark:text-white'
                        onClick={() => toggleInterest(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                </div>
              </div>
              
              {/* Custom Interest Input */}
              <div className='flex gap-2 mt-3'>
                <Input
                  value={customInterest}
                  onChange={e => setCustomInterest(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomInterest())}
                  placeholder='Add custom interest...'
                  className='flex-1 dark:bg-gray-900 dark:border-gray-800 dark:text-white'
                />
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  onClick={addCustomInterest}
                  disabled={!customInterest.trim()}
                  className='shrink-0'
                >
                  <Plus className='w-4 h-4' />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor='activity' className='dark:text-white'>Activity Schedule</Label>
              <Input
                id='activity'
                value={newGroup.activity}
                onChange={e => setNewGroup({ ...newGroup, activity: e.target.value })}
                placeholder='Weekend trips'
                className='dark:bg-gray-900 dark:border-gray-800 dark:text-white'
              />
            </div>
            <div>
              <Label htmlFor='location' className='dark:text-white'>Location</Label>
              <Input
                id='location'
                value={newGroup.location}
                onChange={e => setNewGroup({ ...newGroup, location: e.target.value })}
                placeholder='Campus or City'
                className='dark:bg-gray-900 dark:border-gray-800 dark:text-white'
              />
            </div>
            <Button
              className='w-full bg-frinder-orange hover:bg-frinder-burnt text-white'
              onClick={handleCreateGroup}
              disabled={creating || !newGroup.name || !newGroup.description}
            >
              {creating ? <Loader2 className='w-4 h-4 animate-spin mr-2' /> : null}
              Create Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className='px-4 pt-2 pb-4'>
        <div className='flex items-center justify-center gap-2 text-[#ed8c00]'>
          <Users className='w-5 h-5' />
          <span className='font-semibold'>Discover Groups</span>
        </div>
      </div>

      {/* Cards stack */}
      <div className='flex-1 relative px-4 pb-4'>
        {groups.length > 0 ? (
          <div className='relative w-full h-full max-w-md mx-auto'>
            {groups.slice(0, 2).map((group, index) => (
              <SwipeGroupCard key={group.id} group={group} onSwipe={handleSwipe} isTop={index === 0} />
            ))}
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center h-full text-center px-8'>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className='w-24 h-24 rounded-full bg-[#ed8c00]/10 flex items-center justify-center mb-6'
            >
              <Users className='w-12 h-12 text-[#ed8c00]' />
            </motion.div>
            <h2 className='text-2xl font-bold mb-2'>No more groups</h2>
            <p className='text-muted-foreground mb-4'>Check back later or create your own group!</p>
            <Button className='bg-[#ed8c00] hover:bg-[#cc5d00] text-white' onClick={() => setShowCreateDialog(true)}>
              <Plus className='w-4 h-4 mr-2' />
              Create Group
            </Button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {groups.length > 0 && (
        <div className='px-4 pb-6'>
          <div className='flex items-center justify-center gap-4 max-w-md mx-auto'>
            {/* Undo */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleUndo}
              disabled={!lastAction}
              className='w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center disabled:opacity-30 border border-muted'
            >
              <RotateCcw className='w-5 h-5 text-[#ffb100]' />
            </motion.button>

            {/* Pass */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleButtonSwipe('left')}
              className='w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-red-100'
            >
              <X className='w-8 h-8 text-red-500' />
            </motion.button>

            {/* Super Like */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleButtonSwipe('up')}
              className='w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border border-muted'
            >
              <Star className='w-6 h-6 text-blue-500' fill='currentColor' />
            </motion.button>

            {/* Join */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleButtonSwipe('right')}
              className='w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-green-100'
            >
              <Heart className='w-8 h-8 text-green-500' fill='currentColor' />
            </motion.button>

            {/* Create group */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowCreateDialog(true)}
              className='w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border border-muted'
            >
              <Plus className='w-6 h-6 text-[#cc5d00]' />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
