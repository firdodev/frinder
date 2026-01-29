'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion';
import { Heart, X, Star, RotateCcw, Users, MapPin, Plus, Loader2, Lock, Globe, Crown, Check, XCircle, ChevronDown, ChevronUp, Clock, Pencil, Camera, Image as ImageIcon, Trash2, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { getGroupsToSwipe, joinGroup, createGroup, subscribeToMyCreatedGroups, approveJoinRequest, declineJoinRequest, updateGroup, deleteGroup, type Group as FirebaseGroup } from '@/lib/firebaseServices';
import { uploadGroupPhoto, compressImage } from '@/lib/storageService';
import { toast } from 'sonner';

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
  isPrivate?: boolean;
  pendingMembers?: GroupMember[];
  creatorId?: string;
}

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
            <div className='border-4 border-green-500 text-green-500 text-4xl font-bold px-4 py-2 rounded-lg'>
              {group.isPrivate ? 'REQUEST' : 'JOIN'}
            </div>
          </motion.div>

          <motion.div className='absolute top-20 right-8 rotate-[20deg]' style={{ opacity: nopeOpacity }}>
            <div className='border-4 border-red-500 text-red-500 text-4xl font-bold px-4 py-2 rounded-lg'>PASS</div>
          </motion.div>

          <motion.div className='absolute top-20 left-1/2 -translate-x-1/2' style={{ opacity: superLikeOpacity }}>
            <div className='border-4 border-blue-500 text-blue-500 text-4xl font-bold px-4 py-2 rounded-lg'>SUPER</div>
          </motion.div>

          {/* Overlay - gradient for better photo visibility */}
          <div className='absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent' />

          {/* Group info */}
          <div className='absolute bottom-0 left-0 right-0 p-6 text-white'>
            {/* Group badge */}
            <div className='flex items-center gap-2 mb-3'>
              <div className='bg-[#ed8c00] px-3 py-1 rounded-full flex items-center gap-1'>
                <Users className='w-4 h-4' />
                <span className='text-sm font-medium'>{group.members.length} members</span>
              </div>
              {group.isPrivate && (
                <div className='bg-amber-500/80 px-3 py-1 rounded-full flex items-center gap-1'>
                  <Lock className='w-3.5 h-3.5' />
                  <span className='text-sm'>Private</span>
                </div>
              )}
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
                {group.interests
                  .filter(i => i)
                  .map((interest, index) => (
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

interface SwipeGroupsProps {
  onOpenGroupChat?: (groupId: string) => void;
}

export default function SwipeGroups({ onOpenGroupChat }: SwipeGroupsProps) {
  const { user, userProfile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastAction, setLastAction] = useState<{ group: Group; direction: string } | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMyGroups, setShowMyGroups] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'temporary' | 'my'>('all');
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    interests: [] as string[],
    activity: '',
    location: '',
    isPrivate: false,
    isTemporary: false,
    maxMembers: 10,
    endTime: ''
  });
  const [creating, setCreating] = useState(false);
  const [customInterest, setCustomInterest] = useState('');
  
  // Edit group state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editGroup, setEditGroup] = useState({
    name: '',
    description: '',
    interests: [] as string[],
    activity: '',
    location: '',
    isPrivate: false,
    photo: ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editCustomInterest, setEditCustomInterest] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);

  // Predefined interest tags for better algorithm matching
  const availableTags = [
    'Sports',
    'Fitness',
    'Music',
    'Art',
    'Photography',
    'Gaming',
    'Travel',
    'Food',
    'Cooking',
    'Reading',
    'Movies',
    'Tech',
    'Coding',
    'Fashion',
    'Dance',
    'Yoga',
    'Hiking',
    'Camping',
    'Beach',
    'Nature',
    'Nightlife',
    'Coffee',
    'Wine',
    'Pets',
    'Dogs',
    'Cats',
    'Volunteering',
    'Languages',
    'Business',
    'Startups',
    'Networking',
    'Study',
    'Research',
    'Writing'
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

  // Load groups from Firebase
  useEffect(() => {
    async function loadGroups() {
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
          location: g.location,
          isPrivate: g.isPrivate || false,
          creatorId: g.creatorId,
          isTemporary: g.isTemporary || false,
          maxMembers: g.maxMembers || 10,
          endTime: g.endTime || null
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

  // Subscribe to my created groups
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToMyCreatedGroups(user.uid, (firebaseGroups) => {
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
        pendingMembers:
          g.pendingMembers?.map(memberId => {
            const profile = g.pendingMemberProfiles?.[memberId];
            return {
              id: memberId,
              name: profile?.displayName || 'Unknown',
              photo: profile?.photos?.[0] || '/placeholder-avatar.png'
            };
          }) || [],
        interests: g.interests || [],
        activity: g.activity || 'Weekly meetups',
        location: g.location,
        isPrivate: g.isPrivate || false,
        creatorId: g.creatorId
      }));

      setMyGroups(mappedGroups);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right' | 'up') => {
      if (groups.length === 0) return;

      const currentGroup = groups[0];
      setLastAction({ group: currentGroup, direction });
      setGroups(prev => prev.slice(1));

      if (!user?.uid) return;

      if (direction === 'right' || direction === 'up') {
        try {
          const result = await joinGroup(currentGroup.id, user.uid);
          if (result === 'requested') {
            toast.success('Join request sent!', {
              description: `Your request to join "${currentGroup.name}" is pending approval.`
            });
          } else {
            toast.success('Joined group!', {
              description: `You are now a member of "${currentGroup.name}".`
            });
          }
        } catch (error) {
          console.error('Error joining group:', error);
          toast.error('Failed to join group');
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
    if (!user?.uid || !userProfile) return;

    try {
      setCreating(true);
      await createGroup(user.uid, {
        name: newGroup.name,
        description: newGroup.description,
        interests: newGroup.interests,
        activity: newGroup.activity,
        location: newGroup.location,
        photo: '',
        isPrivate: newGroup.isPrivate,
        isTemporary: newGroup.isTemporary,
        maxMembers: newGroup.isTemporary ? newGroup.maxMembers : undefined,
        endTime: newGroup.isTemporary ? newGroup.endTime : undefined
      });

      toast.success(newGroup.isTemporary ? 'Temporary group created!' : 'Group created!', {
        description: newGroup.isPrivate ? 'Your private group has been created.' : 'Your public group has been created.'
      });

      setShowCreateDialog(false);
      setNewGroup({ name: '', description: '', interests: [], activity: '', location: '', isPrivate: false, isTemporary: false, maxMembers: 10, endTime: '' });
      setCustomInterest('');
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  // Handle approve/decline join requests
  const handleApproveRequest = async (groupId: string, requesterId: string) => {
    if (!user?.uid) return;

    try {
      setProcessingRequest(requesterId);
      await approveJoinRequest(groupId, requesterId, user.uid);
      toast.success('Request approved!');
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDeclineRequest = async (groupId: string, requesterId: string) => {
    if (!user?.uid) return;

    try {
      setProcessingRequest(requesterId);
      await declineJoinRequest(groupId, requesterId, user.uid);
      toast.success('Request declined');
    } catch (error) {
      console.error('Error declining request:', error);
      toast.error('Failed to decline request');
    } finally {
      setProcessingRequest(null);
    }
  };

  // Open edit dialog for a group
  const handleOpenEditDialog = (group: Group) => {
    setEditingGroup(group);
    setEditGroup({
      name: group.name,
      description: group.description,
      interests: group.interests || [],
      activity: group.activity || '',
      location: group.location || '',
      isPrivate: group.isPrivate || false,
      photo: group.photo || ''
    });
    setSelectedPhoto(null);
    setEditCustomInterest('');
    setShowEditDialog(true);
  };

  // Toggle edit interest
  const toggleEditInterest = (interest: string) => {
    setEditGroup(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  // Add custom edit interest
  const addEditCustomInterest = () => {
    if (editCustomInterest.trim() && !editGroup.interests.includes(editCustomInterest.trim())) {
      setEditGroup(prev => ({
        ...prev,
        interests: [...prev.interests, editCustomInterest.trim()]
      }));
      setEditCustomInterest('');
    }
  };

  // Handle photo selection for edit
  const handleEditPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
    }
  };

  // Save group edits
  const handleSaveGroup = async () => {
    if (!user?.uid || !editingGroup) return;

    try {
      setSaving(true);

      let photoUrl = editGroup.photo;

      // Upload new photo if selected
      if (selectedPhoto) {
        setUploadingPhoto(true);
        try {
          const compressed = await compressImage(selectedPhoto);
          photoUrl = await uploadGroupPhoto(editingGroup.id, compressed);
        } catch (error) {
          console.error('Error uploading photo:', error);
          toast.error('Failed to upload photo');
          setUploadingPhoto(false);
          setSaving(false);
          return;
        }
        setUploadingPhoto(false);
      }

      await updateGroup(editingGroup.id, user.uid, {
        name: editGroup.name,
        description: editGroup.description,
        interests: editGroup.interests,
        activity: editGroup.activity,
        location: editGroup.location,
        isPrivate: editGroup.isPrivate,
        photo: photoUrl
      });

      toast.success('Group updated!');
      setShowEditDialog(false);
      setEditingGroup(null);
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  // Delete group
  const handleDeleteGroup = async () => {
    if (!user?.uid || !editingGroup) return;

    try {
      setDeleting(true);
      await deleteGroup(editingGroup.id, user.uid);
      toast.success('Group deleted successfully');
      setShowDeleteConfirm(false);
      setShowEditDialog(false);
      setEditingGroup(null);
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    } finally {
      setDeleting(false);
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

  // Tab UI
  const filteredGroups = activeTab === 'temporary'
    ? groups.filter(g => {
        const isExpired = g.endTime && new Date(g.endTime).getTime() <= Date.now();
        const isFull = g.maxMembers && g.members.length >= g.maxMembers;
        return g.isTemporary && !isExpired && !isFull;
      })
    : activeTab === 'my'
      ? myGroups
      : activeTab === 'discover'
        ? groups.filter(g => !g.isTemporary)
        : groups;

  return (
    <div className='h-full flex flex-col'>
      <div className='flex gap-2 justify-center py-4'>
        <Button variant={activeTab === 'my' ? 'default' : 'outline'} onClick={() => setActiveTab('my')}>My Groups</Button>
        <Button variant={activeTab === 'discover' ? 'default' : 'outline'} onClick={() => setActiveTab('discover')}>Discover</Button>
        <Button variant={activeTab === 'temporary' ? 'default' : 'outline'} onClick={() => setActiveTab('temporary')}>Temporary</Button>
      </div>
      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto dark:bg-black dark:border-frinder-orange/20'>
          <DialogHeader>
            <DialogTitle className='dark:text-white'>Create a Group</DialogTitle>
            <DialogDescription>Start a new group and invite others to join!</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div>
              <Label htmlFor='name' className='dark:text-white'>
                Group Name
              </Label>
              <Input
                id='name'
                value={newGroup.name}
                onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder='Weekend Hikers'
                className='dark:bg-black dark:border-frinder-orange/20 dark:text-white'
              />
            </div>
            <div>
              <Label htmlFor='description' className='dark:text-white'>
                Description
              </Label>
              <Textarea
                id='description'
                value={newGroup.description}
                onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                placeholder='What is your group about?'
                className='dark:bg-black dark:border-frinder-orange/20 dark:text-white'
              />
            </div>

            {/* Temporary Group Toggle */}
            <div className='flex items-center justify-between p-4 rounded-lg bg-muted/50 dark:bg-black mb-2'>
              <div className='flex items-center gap-3'>
                <Switch
                  checked={newGroup.isTemporary}
                  onCheckedChange={(checked) => setNewGroup({ ...newGroup, isTemporary: checked })}
                />
                <div>
                  <p className='font-medium dark:text-white'>Temporary Group</p>
                  <p className='text-xs text-muted-foreground'>Swipe to join, auto-deletes at end time</p>
                </div>
              </div>
            </div>

            {/* Max Members for Temporary Groups */}
            {newGroup.isTemporary && (
              <div>
                <Label htmlFor='maxMembers' className='dark:text-white'>Max People</Label>
                <Input
                  id='maxMembers'
                  type='number'
                  min={2}
                  max={100}
                  value={newGroup.maxMembers}
                  onChange={e => setNewGroup({ ...newGroup, maxMembers: parseInt(e.target.value) })}
                  placeholder='Max people in group'
                  className='dark:bg-black dark:border-frinder-orange/20 dark:text-white'
                />
              </div>
            )}
            {/* End Time for Temporary Groups */}
            {newGroup.isTemporary && (
              <div>
                <Label htmlFor='endTime' className='dark:text-white'>End Time <span className='text-red-500'>(group will be deleted)</span></Label>
                <Input
                  id='endTime'
                  type='datetime-local'
                  value={newGroup.endTime}
                  onChange={e => setNewGroup({ ...newGroup, endTime: e.target.value })}
                  className='dark:bg-black dark:border-frinder-orange/20 dark:text-white border-red-500'
                />
              </div>
            )}

            {/* Privacy Toggle */}
            <div className='flex items-center justify-between p-4 rounded-lg bg-muted/50 dark:bg-black'>
              <div className='flex items-center gap-3'>
                {newGroup.isPrivate ? (
                  <div className='w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center'>
                    <Lock className='w-5 h-5 text-amber-600 dark:text-amber-400' />
                  </div>
                ) : (
                  <div className='w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center'>
                    <Globe className='w-5 h-5 text-green-600 dark:text-green-400' />
                  </div>
                )}
                <div>
                  <p className='font-medium dark:text-white'>
                    {newGroup.isPrivate ? 'Private Group' : 'Public Group'}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {newGroup.isPrivate 
                      ? 'Only approved members can join' 
                      : 'Anyone can join this group'}
                  </p>
                </div>
              </div>
              <Switch
                checked={newGroup.isPrivate}
                onCheckedChange={(checked) => setNewGroup({ ...newGroup, isPrivate: checked })}
              />
            </div>

            {/* Interest Tags Section */}
            <div>
              <Label className='dark:text-white'>Interests</Label>
              <p className='text-xs text-muted-foreground mb-3'>
                Select tags that describe your group for better matching
              </p>

              {/* Selected Tags */}
              {newGroup.interests.length > 0 && (
                <div className='flex flex-wrap gap-2 mb-3 p-3 rounded-lg bg-frinder-orange/5 dark:bg-black border border-frinder-orange/20 dark:border-frinder-orange/20'>
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
              <div className='max-h-32 overflow-y-auto border rounded-lg p-3 dark:border-frinder-orange/20'>
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
                  className='flex-1 dark:bg-black dark:border-frinder-orange/20 dark:text-white'
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
              <Label htmlFor='activity' className='dark:text-white'>
                Activity Schedule
              </Label>
              <Input
                id='activity'
                value={newGroup.activity}
                onChange={e => setNewGroup({ ...newGroup, activity: e.target.value })}
                placeholder='Weekend trips'
                className='dark:bg-black dark:border-frinder-orange/20 dark:text-white'
              />
            </div>
            <div>
              <Label htmlFor='location' className='dark:text-white'>
                Location
              </Label>
              <Input
                id='location'
                value={newGroup.location}
                onChange={e => setNewGroup({ ...newGroup, location: e.target.value })}
                placeholder='Campus or City'
                className='dark:bg-black dark:border-frinder-orange/20 dark:text-white'
              />
            </div>
            <Button
              className='w-full bg-frinder-orange hover:bg-frinder-burnt text-white'
              onClick={handleCreateGroup}
              disabled={creating || !newGroup.name || !newGroup.description || (newGroup.isTemporary && (!newGroup.maxMembers || !newGroup.endTime))}
            >
              {creating ? <Loader2 className='w-4 h-4 animate-spin mr-2' /> : null}
              {newGroup.isTemporary ? 'Create Temporary Group' : 'Create Group'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) setShowDeleteConfirm(false);
      }}>
        <DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto dark:bg-black dark:border-frinder-orange/20'>
          <DialogHeader>
            <DialogTitle className='dark:text-white'>Edit Group</DialogTitle>
            <DialogDescription>Customize your group settings and appearance</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            {/* Group Photo */}
            <div>
              <Label className='dark:text-white'>Group Photo</Label>
              <div className='mt-2 flex items-center gap-4'>
                <div className='relative'>
                  <div className='w-24 h-24 rounded-xl overflow-hidden bg-muted dark:bg-black border-2 border-dashed border-gray-300 dark:border-gray-700'>
                    {selectedPhoto ? (
                      <img 
                        src={URL.createObjectURL(selectedPhoto)} 
                        alt='Preview' 
                        className='w-full h-full object-cover'
                      />
                    ) : editGroup.photo ? (
                      <img 
                        src={editGroup.photo} 
                        alt={editGroup.name} 
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <div className='w-full h-full flex items-center justify-center'>
                        <Users className='w-10 h-10 text-muted-foreground' />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => editPhotoInputRef.current?.click()}
                    className='absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-frinder-orange text-white flex items-center justify-center shadow-lg hover:bg-frinder-burnt transition-colors'
                  >
                    <Camera className='w-4 h-4' />
                  </button>
                </div>
                <input
                  ref={editPhotoInputRef}
                  type='file'
                  accept='image/*'
                  onChange={handleEditPhotoSelect}
                  className='hidden'
                />
                <div className='flex-1'>
                  <p className='text-sm text-muted-foreground'>
                    Upload a photo for your group. Recommended size: 400x400px
                  </p>
                  {selectedPhoto && (
                    <button
                      onClick={() => setSelectedPhoto(null)}
                      className='text-xs text-red-500 hover:text-red-600 mt-1'
                    >
                      Remove selected photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor='edit-name' className='dark:text-white'>
                Group Name
              </Label>
              <Input
                id='edit-name'
                value={editGroup.name}
                onChange={e => setEditGroup({ ...editGroup, name: e.target.value })}
                placeholder='Weekend Hikers'
                className='dark:bg-black dark:border-frinder-orange/20 dark:text-white'
              />
            </div>
            <div>
              <Label htmlFor='edit-description' className='dark:text-white'>
                Description
              </Label>
              <Textarea
                id='edit-description'
                value={editGroup.description}
                onChange={e => setEditGroup({ ...editGroup, description: e.target.value })}
                placeholder='What is your group about?'
                className='dark:bg-black dark:border-frinder-orange/20 dark:text-white'
              />
            </div>

            {/* Privacy Toggle */}
            <div className='flex items-center justify-between p-4 rounded-lg bg-muted/50 dark:bg-black'>
              <div className='flex items-center gap-3'>
                {editGroup.isPrivate ? (
                  <div className='w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center'>
                    <Lock className='w-5 h-5 text-amber-600 dark:text-amber-400' />
                  </div>
                ) : (
                  <div className='w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center'>
                    <Globe className='w-5 h-5 text-green-600 dark:text-green-400' />
                  </div>
                )}
                <div>
                  <p className='font-medium dark:text-white'>
                    {editGroup.isPrivate ? 'Private Group' : 'Public Group'}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {editGroup.isPrivate 
                      ? 'Only approved members can join' 
                      : 'Anyone can join this group'}
                  </p>
                </div>
              </div>
              <Switch
                checked={editGroup.isPrivate}
                onCheckedChange={(checked) => setEditGroup({ ...editGroup, isPrivate: checked })}
              />
            </div>

            {/* Interest Tags Section */}
            <div>
              <Label className='dark:text-white'>Interests</Label>
              <p className='text-xs text-muted-foreground mb-3'>
                Select tags that describe your group for better matching
              </p>

              {/* Selected Tags */}
              {editGroup.interests.length > 0 && (
                <div className='flex flex-wrap gap-2 mb-3 p-3 rounded-lg bg-frinder-orange/5 dark:bg-black border border-frinder-orange/20 dark:border-frinder-orange/20'>
                  {editGroup.interests.map((interest, index) => (
                    <Badge
                      key={`edit-selected-${interest}-${index}`}
                      className='bg-frinder-orange text-white hover:bg-frinder-burnt cursor-pointer pr-1'
                      onClick={() => toggleEditInterest(interest)}
                    >
                      {interest}
                      <X className='w-3 h-3 ml-1' />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Available Tags Grid */}
              <div className='max-h-32 overflow-y-auto border rounded-lg p-3 dark:border-frinder-orange/20'>
                <div className='flex flex-wrap gap-2'>
                  {availableTags
                    .filter(tag => !editGroup.interests.includes(tag))
                    .map(tag => (
                      <Badge
                        key={`edit-${tag}`}
                        variant='outline'
                        className='cursor-pointer hover:bg-frinder-orange/10 hover:border-frinder-orange transition-colors dark:border-gray-700 dark:text-white'
                        onClick={() => toggleEditInterest(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                </div>
              </div>

              {/* Custom Interest Input */}
              <div className='flex gap-2 mt-3'>
                <Input
                  value={editCustomInterest}
                  onChange={e => setEditCustomInterest(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEditCustomInterest())}
                  placeholder='Add custom interest...'
                  className='flex-1 dark:bg-black dark:border-frinder-orange/20 dark:text-white'
                />
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  onClick={addEditCustomInterest}
                  disabled={!editCustomInterest.trim()}
                  className='shrink-0'
                >
                  <Plus className='w-4 h-4' />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor='edit-activity' className='dark:text-white'>
                Activity Schedule
              </Label>
              <Input
                id='edit-activity'
                value={editGroup.activity}
                onChange={e => setEditGroup({ ...editGroup, activity: e.target.value })}
                placeholder='Weekend trips'
                className='dark:bg-black dark:border-frinder-orange/20 dark:text-white'
              />
            </div>
            <div>
              <Label htmlFor='edit-location' className='dark:text-white'>
                Location
              </Label>
              <Input
                id='edit-location'
                value={editGroup.location}
                onChange={e => setEditGroup({ ...editGroup, location: e.target.value })}
                placeholder='Campus or City'
                className='dark:bg-black dark:border-frinder-orange/20 dark:text-white'
              />
            </div>
            <Button
              className='w-full bg-frinder-orange hover:bg-frinder-burnt text-white'
              onClick={handleSaveGroup}
              disabled={saving || deleting || !editGroup.name || !editGroup.description}
            >
              {saving ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin mr-2' />
                  {uploadingPhoto ? 'Uploading photo...' : 'Saving...'}
                </>
              ) : (
                'Save Changes'
              )}
            </Button>

            {/* Delete Group Section */}
            <div className='pt-4 mt-4 border-t border-gray-200 dark:border-frinder-orange/20'>
              {!showDeleteConfirm ? (
                <Button
                  variant='outline'
                  className='w-full border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20'
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={saving || deleting}
                >
                  <Trash2 className='w-4 h-4 mr-2' />
                  Delete Group
                </Button>
              ) : (
                <div className='space-y-3'>
                  <p className='text-sm text-center text-red-500 font-medium'>
                    Are you sure you want to delete this group? This action cannot be undone.
                  </p>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      className='flex-1'
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      className='flex-1 bg-red-500 hover:bg-red-600 text-white'
                      onClick={handleDeleteGroup}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <>
                          <Loader2 className='w-4 h-4 animate-spin mr-2' />
                          Deleting...
                        </>
                      ) : (
                        'Delete'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
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

      {/* My Groups Section */}
      {myGroups.length > 0 && (
        <div className='px-4 mb-4'>
          <button 
            onClick={() => setShowMyGroups(!showMyGroups)}
            className='w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 dark:bg-black hover:bg-muted dark:hover:bg-gray-800 transition-colors'
          >
            <div className='flex items-center gap-2'>
              <Crown className='w-5 h-5 text-[#ed8c00]' />
              <span className='font-semibold dark:text-white'>My Groups</span>
              <Badge variant='secondary' className='bg-[#ed8c00]/10 text-[#ed8c00]'>
                {myGroups.length}
              </Badge>
            </div>
            {showMyGroups ? (
              <ChevronUp className='w-5 h-5 text-muted-foreground' />
            ) : (
              <ChevronDown className='w-5 h-5 text-muted-foreground' />
            )}
          </button>

          <AnimatePresence>
            {showMyGroups && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className='overflow-hidden'
              >
                <div className='space-y-3 mt-3 max-h-[300px] overflow-y-auto'>
                  {myGroups.map(group => (
                    <div 
                      key={group.id} 
                      className='p-3 rounded-lg bg-card border dark:border-frinder-orange/20'
                    >
                      <div className='flex items-start gap-3'>
                        <button
                          onClick={() => onOpenGroupChat?.(group.id)}
                          className='relative hover:opacity-80 transition-opacity'
                        >
                          {group.photo ? (
                            <img 
                              src={group.photo} 
                              alt={group.name} 
                              className='w-14 h-14 rounded-lg object-cover'
                            />
                          ) : (
                            <div className='w-14 h-14 rounded-lg bg-muted dark:bg-black flex items-center justify-center'>
                              <Users className='w-6 h-6 text-muted-foreground' />
                            </div>
                          )}
                          {/* Badge for temporary group */}
                          {group.isTemporary && (
                            <span className='absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded'>Temporary</span>
                          )}
                        </button>
                        <button 
                          onClick={() => onOpenGroupChat?.(group.id)}
                          className='flex-1 min-w-0 text-left hover:opacity-80 transition-opacity'
                        >
                          <div className='flex items-center gap-2'>
                            <h3 className='font-semibold dark:text-white truncate'>{group.name}</h3>
                            {group.isPrivate ? (
                              <Lock className='w-3.5 h-3.5 text-amber-500 flex-shrink-0' />
                            ) : (
                              <Globe className='w-3.5 h-3.5 text-green-500 flex-shrink-0' />
                            )}
                          </div>
                          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                            <Users className='w-3 h-3' />
                            <span>{group.members.length} members</span>
                          </div>
                        </button>
                        <div className='flex items-center gap-1'>
                          {/* Chat button */}
                          <Button
                            size='sm'
                            variant='outline'
                            className='shrink-0 h-8 px-2 gap-1 dark:border-gray-700 text-frinder-orange hover:text-frinder-burnt hover:bg-frinder-orange/10'
                            onClick={() => onOpenGroupChat?.(group.id)}
                          >
                            <MessageCircle className='w-3.5 h-3.5' />
                          </Button>
                          {/* Edit button */}
                          <Button
                            size='sm'
                            variant='outline'
                            className='shrink-0 h-8 px-2 gap-1 dark:border-gray-700'
                            onClick={() => handleOpenEditDialog(group)}
                          >
                            <Pencil className='w-3.5 h-3.5' />
                          </Button>
                        </div>
                      </div>

                      {/* Pending Requests Section */}
                      {group.isPrivate && group.pendingMembers && group.pendingMembers.length > 0 && (
                        <div className='mt-3 pt-3 border-t dark:border-frinder-orange/20'>
                          <div className='flex items-center gap-2 mb-2'>
                            <Clock className='w-4 h-4 text-amber-500' />
                            <span className='text-sm font-medium dark:text-white'>
                              Pending Requests ({group.pendingMembers.length})
                            </span>
                          </div>
                          <div className='space-y-2'>
                            {group.pendingMembers.map(member => (
                              <div 
                                key={member.id} 
                                className='flex items-center justify-between p-2 rounded-lg bg-muted/50 dark:bg-black'
                              >
                                <div className='flex items-center gap-2'>
                                  <Avatar className='w-8 h-8'>
                                    <AvatarImage src={member.photo} alt={member.name} />
                                    <AvatarFallback className='bg-[#ed8c00] text-white text-xs'>
                                      {member.name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className='text-sm font-medium dark:text-white'>{member.name}</span>
                                </div>
                                <div className='flex items-center gap-1'>
                                  <Button
                                    size='sm'
                                    variant='ghost'
                                    className='h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                                    onClick={() => handleApproveRequest(group.id, member.id)}
                                    disabled={processingRequest === member.id}
                                  >
                                    {processingRequest === member.id ? (
                                      <Loader2 className='w-4 h-4 animate-spin' />
                                    ) : (
                                      <Check className='w-4 h-4' />
                                    )}
                                  </Button>
                                  <Button
                                    size='sm'
                                    variant='ghost'
                                    className='h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30'
                                    onClick={() => handleDeclineRequest(group.id, member.id)}
                                    disabled={processingRequest === member.id}
                                  >
                                    <XCircle className='w-4 h-4' />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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
