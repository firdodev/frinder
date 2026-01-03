import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  Timestamp,
  DocumentData,
  deleteDoc,
  increment
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '@/contexts/AuthContext';

// Types
export interface Swipe {
  odFromUserId: string;
  odToUserId: string;
  direction: 'left' | 'right' | 'superlike';
  timestamp: Timestamp;
}

// User Credits & Subscription Types
export interface UserCredits {
  superLikes: number;
  lastFreeSuperLike: Timestamp | null;
  totalSuperLikesPurchased: number;
  swipeCount: number; // For ad tracking
  lastSwipeCountReset: Timestamp | null;
}

export interface UserSubscription {
  isPremium: boolean;
  isAdFree: boolean;
  premiumExpiresAt: Timestamp | null;
  adFreeExpiresAt: Timestamp | null;
  // Premium benefits
  unlimitedSuperLikes: boolean;
  canSeeWhoLikedYou: boolean;
  unlimitedRewinds: boolean;
  priorityInDiscovery: boolean;
  advancedFilters: boolean;
}

export interface Match {
  id: string;
  users: string[];
  userProfiles: { [key: string]: UserProfile };
  createdAt: Timestamp;
  lastMessage?: string;
  lastMessageTime?: Timestamp;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  read: boolean;
}

// Date Request types
export interface DateRequest {
  id: string;
  matchId: string;
  senderId: string;
  recipientId: string;
  title: string;
  date: Timestamp;
  time: string;
  location: string;
  description?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Timestamp;
  respondedAt?: Timestamp;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  photo: string;
  creatorId: string;
  members: string[];
  memberProfiles: { [key: string]: UserProfile };
  interests: string[];
  activity: string;
  location?: string;
  createdAt: Timestamp;
}

// Get users to swipe on (filtered by opposite gender, same city, and shared interests)
export async function getUsersToSwipe(
  currentUserId: string,
  currentUserProfile?: UserProfile,
  limitCount: number = 20
): Promise<UserProfile[]> {
  try {
    // Get users the current user has already swiped on
    const swipesRef = collection(db, 'swipes');
    const swipedQuery = query(swipesRef, where('fromUserId', '==', currentUserId));
    const swipedSnapshot = await getDocs(swipedQuery);
    const swipedUserIds = swipedSnapshot.docs.map(doc => doc.data().toUserId);
    swipedUserIds.push(currentUserId); // Exclude self

    // Get all users with complete profiles
    const usersRef = collection(db, 'users');
    const usersQuery = query(
      usersRef,
      where('isProfileComplete', '==', true),
      limit(100) // Fetch more to filter
    );
    const usersSnapshot = await getDocs(usersQuery);

    let users: UserProfile[] = [];
    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data() as UserProfile;
      if (!swipedUserIds.includes(userData.uid)) {
        users.push(userData);
      }
    });

    // Apply filters if current user profile is available
    if (currentUserProfile) {
      // Filter by opposite gender
      const oppositeGender = currentUserProfile.gender === 'male' ? 'female' : 
                            currentUserProfile.gender === 'female' ? 'male' : null;
      
      if (oppositeGender) {
        users = users.filter(user => user.gender === oppositeGender);
      }

      // Filter by same city (if user has city set)
      if (currentUserProfile.city) {
        const sameCity = users.filter(user => user.city === currentUserProfile.city);
        // If there are users in the same city, prioritize them
        if (sameCity.length > 0) {
          // Also include nearby users from same country
          const sameCountry = users.filter(
            user => user.country === currentUserProfile.country && user.city !== currentUserProfile.city
          );
          users = [...sameCity, ...sameCountry];
        }
      }

      // Sort by shared interests (more shared interests = higher priority)
      if (currentUserProfile.interests && currentUserProfile.interests.length > 0) {
        const usersWithScore = users.map(user => ({
          ...user,
          _sharedInterests: user.interests?.filter(
            interest => currentUserProfile.interests?.includes(interest)
          ).length || 0
        })).sort((a, b) => (b._sharedInterests || 0) - (a._sharedInterests || 0));

        // Remove the temporary field
        users = usersWithScore.map(({ _sharedInterests, ...user }) => user as UserProfile);
      }
    }

    return users.slice(0, limitCount);
  } catch (error) {
    console.error('Error getting users to swipe:', error);
    return [];
  }
}

// Record a swipe
export async function recordSwipe(
  fromUserId: string,
  toUserId: string,
  direction: 'left' | 'right' | 'superlike'
): Promise<{ isMatch: boolean; matchId?: string; isSuperLike?: boolean }> {
  try {
    const swipeId = `${fromUserId}_${toUserId}`;
    await setDoc(doc(db, 'swipes', swipeId), {
      fromUserId,
      toUserId,
      direction,
      timestamp: serverTimestamp()
    });

    // SUPER LIKE: Automatically creates a match and notifies the other user
    if (direction === 'superlike') {
      // Use the super like credit
      const used = await useSuperLike(fromUserId);
      if (!used) {
        // Shouldn't happen if UI checked first, but handle gracefully
        console.warn('Super like used but no credits available');
      }
      
      // Create automatic match for super like
      const matchId = await createMatch(fromUserId, toUserId, true);
      
      // Also record a "super liked" notification for the other user
      await setDoc(doc(db, 'superLikes', `${fromUserId}_${toUserId}`), {
        fromUserId,
        toUserId,
        timestamp: serverTimestamp(),
        seen: false
      });
      
      return { isMatch: true, matchId, isSuperLike: true };
    }

    // Regular right swipe - check if it's a mutual match
    if (direction === 'right') {
      const reverseSwipeId = `${toUserId}_${fromUserId}`;
      const reverseSwipeDoc = await getDoc(doc(db, 'swipes', reverseSwipeId));

      if (
        reverseSwipeDoc.exists() &&
        (reverseSwipeDoc.data().direction === 'right' || reverseSwipeDoc.data().direction === 'superlike')
      ) {
        // It's a match!
        const matchId = await createMatch(fromUserId, toUserId);
        return { isMatch: true, matchId };
      }
    }

    return { isMatch: false };
  } catch (error) {
    console.error('Error recording swipe:', error);
    return { isMatch: false };
  }
}

// Create a match
async function createMatch(userId1: string, userId2: string, isSuperLike: boolean = false): Promise<string> {
  const matchId = [userId1, userId2].sort().join('_');

  // Check if match already exists (for super likes where they might already be matched)
  const existingMatch = await getDoc(doc(db, 'matches', matchId));
  if (existingMatch.exists()) {
    return matchId; // Already matched
  }

  // Get both user profiles
  const user1Doc = await getDoc(doc(db, 'users', userId1));
  const user2Doc = await getDoc(doc(db, 'users', userId2));

  const userProfiles: { [key: string]: DocumentData } = {};
  if (user1Doc.exists()) userProfiles[userId1] = user1Doc.data();
  if (user2Doc.exists()) userProfiles[userId2] = user2Doc.data();

  await setDoc(doc(db, 'matches', matchId), {
    users: [userId1, userId2],
    userProfiles,
    createdAt: serverTimestamp(),
    isSuperLike,
    superLikedBy: isSuperLike ? userId1 : null
  });

  return matchId;
}

// Get user's matches
export async function getMatches(userId: string): Promise<Match[]> {
  try {
    const matchesRef = collection(db, 'matches');
    const matchesQuery = query(matchesRef, where('users', 'array-contains', userId), orderBy('createdAt', 'desc'));
    const matchesSnapshot = await getDocs(matchesQuery);

    return matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Match[];
  } catch (error) {
    console.error('Error getting matches:', error);
    return [];
  }
}

// Subscribe to matches in real-time
export function subscribeToMatches(userId: string, callback: (matches: Match[]) => void): () => void {
  const matchesRef = collection(db, 'matches');
  const matchesQuery = query(matchesRef, where('users', 'array-contains', userId), orderBy('createdAt', 'desc'));

  return onSnapshot(matchesQuery, snapshot => {
    const matches = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(match => !(match as any).unmatched) as Match[]; // Filter out unmatched
    callback(matches);
  });
}

// Subscribe to unmatched conversations (for showing old messages with disabled chat)
export function subscribeToUnmatchedConversations(
  userId: string, 
  callback: (matches: (Match & { unmatched: boolean; unmatchedAt?: Timestamp })[]
) => void): () => void {
  const matchesRef = collection(db, 'matches');
  const matchesQuery = query(matchesRef, where('users', 'array-contains', userId), orderBy('createdAt', 'desc'));

  return onSnapshot(matchesQuery, snapshot => {
    const unmatchedMatches = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(match => (match as any).unmatched === true && (match as any).lastMessage) as (Match & { unmatched: boolean; unmatchedAt?: Timestamp })[];
    callback(unmatchedMatches);
  });
}

// Subscribe to total unread message count across all matches
export function subscribeToUnreadCount(userId: string, callback: (count: number) => void): () => void {
  const matchesRef = collection(db, 'matches');
  const matchesQuery = query(matchesRef, where('users', 'array-contains', userId));

  return onSnapshot(matchesQuery, async (snapshot) => {
    let totalUnread = 0;
    
    // For each match, count unread messages not sent by current user
    const countPromises = snapshot.docs.map(async (matchDoc) => {
      const messagesRef = collection(db, 'matches', matchDoc.id, 'messages');
      // Only query for unread messages, then filter by sender client-side
      const unreadQuery = query(messagesRef, where('read', '==', false));
      const unreadSnapshot = await getDocs(unreadQuery);
      
      // Filter out messages sent by current user
      return unreadSnapshot.docs.filter(doc => doc.data().senderId !== userId).length;
    });
    
    const counts = await Promise.all(countPromises);
    totalUnread = counts.reduce((sum, count) => sum + count, 0);
    
    callback(totalUnread);
  });
}

// Send a message
export async function sendMessage(
  matchId: string, 
  senderId: string, 
  text: string, 
  imageUrl?: string,
  replyTo?: { id: string; text: string; senderId: string }
): Promise<string> {
  try {
    const messagesRef = collection(db, 'matches', matchId, 'messages');
    const messageDoc = doc(messagesRef);

    const messageData: {
      senderId: string;
      text: string;
      timestamp: ReturnType<typeof serverTimestamp>;
      read: boolean;
      imageUrl?: string;
      type: 'text' | 'image';
      replyTo?: { id: string; text: string; senderId: string };
    } = {
      senderId,
      text,
      timestamp: serverTimestamp(),
      read: false,
      type: imageUrl ? 'image' : 'text'
    };

    if (imageUrl) {
      messageData.imageUrl = imageUrl;
    }

    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    await setDoc(messageDoc, messageData);

    // Get match to find the other user
    const matchDoc = await getDoc(doc(db, 'matches', matchId));
    const matchData = matchDoc.data();
    const otherUserId = matchData?.users?.find((id: string) => id !== senderId);

    // Update match with last message and increment unread count for other user
    const updateData: Record<string, unknown> = {
      lastMessage: imageUrl ? '📷 Photo' : text,
      lastMessageTime: serverTimestamp()
    };

    if (otherUserId) {
      updateData[`unreadCount.${otherUserId}`] = increment(1);
    }

    await updateDoc(doc(db, 'matches', matchId), updateData);

    return messageDoc.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Subscribe to messages in real-time
export function subscribeToMessages(matchId: string, callback: (messages: Message[]) => void): () => void {
  const messagesRef = collection(db, 'matches', matchId, 'messages');
  const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(messagesQuery, snapshot => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      matchId,
      ...doc.data()
    })) as Message[];
    callback(messages);
  });
}

// Mark messages as read
export async function markMessagesAsRead(matchId: string, userId: string): Promise<void> {
  try {
    const messagesRef = collection(db, 'matches', matchId, 'messages');
    const unreadQuery = query(messagesRef, where('read', '==', false), where('senderId', '!=', userId));
    const unreadSnapshot = await getDocs(unreadQuery);

    const updates = unreadSnapshot.docs.map(doc => updateDoc(doc.ref, { read: true }));

    await Promise.all(updates);

    // Reset unread count for this user on the match document
    await updateDoc(doc(db, 'matches', matchId), {
      [`unreadCount.${userId}`]: 0
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

// ==================== DATE REQUEST FUNCTIONS ====================

// Create a date request
export async function createDateRequest(
  matchId: string,
  senderId: string,
  recipientId: string,
  data: {
    title: string;
    date: Date;
    time: string;
    location: string;
    description?: string;
  }
): Promise<string> {
  try {
    const dateRequestsRef = collection(db, 'matches', matchId, 'dateRequests');
    const dateRequestDoc = doc(dateRequestsRef);

    const dateRequest = {
      senderId,
      recipientId,
      title: data.title,
      date: Timestamp.fromDate(data.date),
      time: data.time,
      location: data.location,
      description: data.description || '',
      status: 'pending',
      createdAt: serverTimestamp()
    };

    await setDoc(dateRequestDoc, dateRequest);

    // Update match with last message
    await updateDoc(doc(db, 'matches', matchId), {
      lastMessage: `📅 Date request: ${data.title}`,
      lastMessageTime: serverTimestamp()
    });

    return dateRequestDoc.id;
  } catch (error) {
    console.error('Error creating date request:', error);
    throw error;
  }
}

// Respond to a date request (accept or decline)
export async function respondToDateRequest(
  matchId: string,
  dateRequestId: string,
  status: 'accepted' | 'declined'
): Promise<void> {
  try {
    const dateRequestRef = doc(db, 'matches', matchId, 'dateRequests', dateRequestId);
    
    await updateDoc(dateRequestRef, {
      status,
      respondedAt: serverTimestamp()
    });

    // Update match with response
    const statusEmoji = status === 'accepted' ? '✅' : '❌';
    await updateDoc(doc(db, 'matches', matchId), {
      lastMessage: `${statusEmoji} Date request ${status}`,
      lastMessageTime: serverTimestamp()
    });
  } catch (error) {
    console.error('Error responding to date request:', error);
    throw error;
  }
}

// Subscribe to date requests for a match
export function subscribeToDateRequests(
  matchId: string,
  callback: (dateRequests: DateRequest[]) => void
): () => void {
  const dateRequestsRef = collection(db, 'matches', matchId, 'dateRequests');
  const dateRequestsQuery = query(dateRequestsRef, orderBy('createdAt', 'asc'));

  return onSnapshot(dateRequestsQuery, snapshot => {
    const dateRequests = snapshot.docs.map(doc => ({
      id: doc.id,
      matchId,
      ...doc.data()
    })) as DateRequest[];
    callback(dateRequests);
  });
}

// ==================== END DATE REQUEST FUNCTIONS ====================

// Get groups to swipe on (excludes groups user is member of and groups they created)
export async function getGroupsToSwipe(currentUserId: string, limitCount: number = 10): Promise<Group[]> {
  try {
    const groupsRef = collection(db, 'groups');
    const groupsQuery = query(groupsRef, limit(limitCount * 2)); // Fetch more to filter
    const groupsSnapshot = await getDocs(groupsQuery);

    return groupsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Group))
      .filter(group => 
        !group.members?.includes(currentUserId) && // Not a member
        group.creatorId !== currentUserId // Not the creator
      )
      .slice(0, limitCount);
  } catch (error) {
    console.error('Error getting groups:', error);
    return [];
  }
}

// Join a group
export async function joinGroup(groupId: string, userId: string): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();

    await updateDoc(doc(db, 'groups', groupId), {
      members: arrayUnion(userId),
      [`memberProfiles.${userId}`]: userData
    });
  } catch (error) {
    console.error('Error joining group:', error);
    throw error;
  }
}

// Create a group
export async function createGroup(
  creatorId: string,
  groupData: Omit<Group, 'id' | 'creatorId' | 'members' | 'memberProfiles' | 'createdAt'>
): Promise<string> {
  try {
    const userDoc = await getDoc(doc(db, 'users', creatorId));
    const userData = userDoc.data();

    const groupRef = doc(collection(db, 'groups'));
    await setDoc(groupRef, {
      ...groupData,
      creatorId,
      members: [creatorId],
      memberProfiles: { [creatorId]: userData },
      createdAt: serverTimestamp()
    });

    return groupRef.id;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
}

// Get user's joined groups
export async function getUserGroups(userId: string): Promise<Group[]> {
  try {
    const groupsRef = collection(db, 'groups');
    const groupsQuery = query(groupsRef, where('members', 'array-contains', userId));
    const groupsSnapshot = await getDocs(groupsQuery);

    return groupsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Group));
  } catch (error) {
    console.error('Error getting user groups:', error);
    return [];
  }
}

// Subscribe to user's groups in real-time
export function subscribeToUserGroups(
  userId: string,
  callback: (groups: Group[]) => void
): () => void {
  const groupsRef = collection(db, 'groups');
  const groupsQuery = query(groupsRef, where('members', 'array-contains', userId));
  
  return onSnapshot(groupsQuery, (snapshot) => {
    const groups = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Group));
    callback(groups);
  });
}

// Get group members (for admin view)
export async function getGroupMembers(groupId: string): Promise<UserProfile[]> {
  try {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) return [];
    
    const groupData = groupDoc.data();
    const memberProfiles = groupData.memberProfiles || {};
    
    return Object.values(memberProfiles) as UserProfile[];
  } catch (error) {
    console.error('Error getting group members:', error);
    return [];
  }
}

// Remove member from group (admin only)
export async function removeGroupMember(groupId: string, memberId: string, adminId: string): Promise<void> {
  try {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const groupData = groupDoc.data();
    
    // Check if user is admin (creator)
    if (groupData.creatorId !== adminId) {
      throw new Error('Only the group admin can remove members');
    }
    
    // Cannot remove yourself as admin
    if (memberId === adminId) {
      throw new Error('Admin cannot be removed from the group');
    }
    
    // Remove member from members array and memberProfiles
    const updatedMembers = (groupData.members || []).filter((id: string) => id !== memberId);
    const updatedProfiles = { ...groupData.memberProfiles };
    delete updatedProfiles[memberId];
    
    await updateDoc(doc(db, 'groups', groupId), {
      members: updatedMembers,
      memberProfiles: updatedProfiles
    });
  } catch (error) {
    console.error('Error removing group member:', error);
    throw error;
  }
}

// Leave a group
export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  try {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const groupData = groupDoc.data();
    
    // Admin cannot leave (must delete group instead)
    if (groupData.creatorId === userId) {
      throw new Error('Admin cannot leave the group. Delete the group instead.');
    }
    
    const updatedMembers = (groupData.members || []).filter((id: string) => id !== userId);
    const updatedProfiles = { ...groupData.memberProfiles };
    delete updatedProfiles[userId];
    
    await updateDoc(doc(db, 'groups', groupId), {
      members: updatedMembers,
      memberProfiles: updatedProfiles
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    throw error;
  }
}

// Delete a group (admin only) - deletes group, all messages, and associated data
export async function deleteGroup(groupId: string, adminId: string): Promise<void> {
  try {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const groupData = groupDoc.data();
    
    if (groupData.creatorId !== adminId) {
      throw new Error('Only the group admin can delete the group');
    }
    
    // Delete all messages in the group
    const messagesRef = collection(db, 'groups', groupId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);
    const deletePromises = messagesSnapshot.docs.map(msgDoc => deleteDoc(msgDoc.ref));
    await Promise.all(deletePromises);
    
    // Delete the group document itself
    await deleteDoc(doc(db, 'groups', groupId));
  } catch (error) {
    console.error('Error deleting group:', error);
    throw error;
  }
}

// Get user profile by ID
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

// Update user profile in all matches
export async function updateUserProfileInMatches(userId: string, profileData: Partial<UserProfile>): Promise<void> {
  try {
    // Get all matches for this user
    const matchesRef = collection(db, 'matches');
    const matchesQuery = query(matchesRef, where('users', 'array-contains', userId));
    const matchesSnapshot = await getDocs(matchesQuery);
    
    // Update user profile in each match
    const updatePromises = matchesSnapshot.docs.map(async (matchDoc) => {
      const matchData = matchDoc.data();
      const currentUserProfile = matchData.userProfiles?.[userId] || {};
      
      await updateDoc(doc(db, 'matches', matchDoc.id), {
        [`userProfiles.${userId}`]: { ...currentUserProfile, ...profileData }
      });
    });
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error updating user profile in matches:', error);
    // Don't throw - this is a non-critical operation
  }
}

// Update user online status
export async function updateUserPresence(userId: string, isOnline: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      isOnline,
      lastSeen: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating presence:', error);
  }
}

// Update typing status for a match
export async function updateTypingStatus(matchId: string, userId: string, isTyping: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'matches', matchId), {
      [`typing.${userId}`]: isTyping ? serverTimestamp() : null
    });
  } catch (error) {
    console.error('Error updating typing status:', error);
  }
}

// Subscribe to typing status for a match
export function subscribeToTypingStatus(
  matchId: string, 
  otherUserId: string, 
  callback: (isTyping: boolean) => void
): () => void {
  return onSnapshot(doc(db, 'matches', matchId), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      const typingTimestamp = data.typing?.[otherUserId];
      if (typingTimestamp) {
        // Consider typing if timestamp is within last 5 seconds
        const typingTime = typingTimestamp.toDate?.() || new Date(typingTimestamp);
        const isRecent = Date.now() - typingTime.getTime() < 5000;
        callback(isRecent);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
}

// Subscribe to a user's online status
export function subscribeToUserPresence(userId: string, callback: (isOnline: boolean, lastSeen?: Date) => void): () => void {
  return onSnapshot(doc(db, 'users', userId), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      const isOnline = data.isOnline || false;
      const lastSeen = data.lastSeen?.toDate();
      callback(isOnline, lastSeen);
    } else {
      callback(false);
    }
  });
}

// Unmatch/unfriend a user
export async function unmatchUser(matchId: string): Promise<void> {
  try {
    // Get the match document to retrieve user IDs
    const matchDoc = await getDoc(doc(db, 'matches', matchId));
    
    if (matchDoc.exists()) {
      const matchData = matchDoc.data();
      const users = matchData.users as string[];
      
      if (users && users.length === 2) {
        // Delete swipe records in both directions
        const swipeId1 = `${users[0]}_${users[1]}`;
        const swipeId2 = `${users[1]}_${users[0]}`;
        
        await Promise.all([
          deleteDoc(doc(db, 'swipes', swipeId1)).catch(() => {}), // Ignore if doesn't exist
          deleteDoc(doc(db, 'swipes', swipeId2)).catch(() => {})  // Ignore if doesn't exist
        ]);
      }
      
      // Mark the match as unmatched instead of deleting
      // This preserves chat history but prevents new messages
      await updateDoc(doc(db, 'matches', matchId), {
        unmatched: true,
        unmatchedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error unmatching user:', error);
    throw error;
  }
}

// Get match count for a user
export async function getMatchCount(userId: string): Promise<number> {
  try {
    const matchesRef = collection(db, 'matches');
    const matchesQuery = query(matchesRef, where('users', 'array-contains', userId));
    const matchesSnapshot = await getDocs(matchesQuery);
    return matchesSnapshot.size;
  } catch (error) {
    console.error('Error getting match count:', error);
    return 0;
  }
}

// Get count of likes received (people who swiped right on this user)
export async function getLikesReceivedCount(userId: string): Promise<number> {
  try {
    const swipesRef = collection(db, 'swipes');
    // Count swipes where this user is the target and direction is 'right'
    const likesQuery = query(
      swipesRef,
      where('toUserId', '==', userId),
      where('direction', '==', 'right')
    );
    const likesSnapshot = await getDocs(likesQuery);
    return likesSnapshot.size;
  } catch (error) {
    console.error('Error getting likes received count:', error);
    return 0;
  }
}

// Get count of super likes received
export async function getSuperLikesReceivedCount(userId: string): Promise<number> {
  try {
    const superLikesRef = collection(db, 'superLikes');
    // Query super likes where this user is the recipient
    const superLikesQuery = query(
      superLikesRef,
      where('toUserId', '==', userId)
    );
    const superLikesSnapshot = await getDocs(superLikesQuery);
    return superLikesSnapshot.size;
  } catch (error) {
    console.error('Error getting super likes received count:', error);
    return 0;
  }
}

// Get all profile stats at once
export async function getUserProfileStats(userId: string): Promise<{
  matches: number;
  likesReceived: number;
  superLikesReceived: number;
}> {
  const [matches, likesReceived, superLikesReceived] = await Promise.all([
    getMatchCount(userId),
    getLikesReceivedCount(userId),
    getSuperLikesReceivedCount(userId)
  ]);
  
  return { matches, likesReceived, superLikesReceived };
}

// Search for users by name
export async function searchUsers(
  currentUserId: string,
  searchQuery: string,
  limitCount: number = 20
): Promise<(UserProfile & { id: string })[]> {
  try {
    if (!searchQuery.trim()) return [];

    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    // Filter users by name (case-insensitive)
    const searchLower = searchQuery.toLowerCase();
    const users = usersSnapshot.docs
      .map(doc => ({
        ...doc.data(),
        id: doc.id
      } as UserProfile & { id: string }))
      .filter(user => {
        // Exclude current user
        if (user.id === currentUserId) return false;
        // Match by displayName
        const nameMatch = user.displayName?.toLowerCase().includes(searchLower);
        // Match by city
        const cityMatch = user.city?.toLowerCase().includes(searchLower);
        return nameMatch || cityMatch;
      })
      .slice(0, limitCount);

    return users;
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

// Send a match request (swipe right on a specific user)
export async function sendMatchRequest(
  fromUserId: string,
  toUserId: string
): Promise<{ isMatch: boolean; matchId?: string }> {
  return recordSwipe(fromUserId, toUserId, 'right');
}

// Check if users are already matched
export async function checkIfMatched(userId1: string, userId2: string): Promise<{ isMatched: boolean; matchId?: string }> {
  try {
    const matchId = [userId1, userId2].sort().join('_');
    const matchDoc = await getDoc(doc(db, 'matches', matchId));
    
    if (matchDoc.exists()) {
      const data = matchDoc.data();
      // Check if match was unmatched
      if (data.unmatched) {
        return { isMatched: false };
      }
      return { isMatched: true, matchId };
    }
    return { isMatched: false };
  } catch (error) {
    console.error('Error checking match status:', error);
    return { isMatched: false };
  }
}

// Check if user has already swiped on another user
export async function checkSwipeStatus(fromUserId: string, toUserId: string): Promise<'none' | 'left' | 'right' | 'superlike'> {
  try {
    const swipeId = `${fromUserId}_${toUserId}`;
    const swipeDoc = await getDoc(doc(db, 'swipes', swipeId));
    
    if (swipeDoc.exists()) {
      return swipeDoc.data().direction;
    }
    return 'none';
  } catch (error) {
    console.error('Error checking swipe status:', error);
    return 'none';
  }
}

// Get pending match requests (people you swiped right on but haven't matched)
export async function getPendingRequests(userId: string): Promise<(UserProfile & { swipedAt: Date })[]> {
  try {
    // Get all right swipes from this user
    const swipesRef = collection(db, 'swipes');
    const swipesQuery = query(
      swipesRef,
      where('fromUserId', '==', userId),
      where('direction', 'in', ['right', 'superlike'])
    );
    const swipesSnapshot = await getDocs(swipesQuery);
    
    const pendingRequests: (UserProfile & { swipedAt: Date })[] = [];
    
    for (const swipeDoc of swipesSnapshot.docs) {
      const swipeData = swipeDoc.data();
      const targetUserId = swipeData.toUserId;
      
      // Check if there's already a match (excluding unmatched)
      const matchId = [userId, targetUserId].sort().join('_');
      const matchDoc = await getDoc(doc(db, 'matches', matchId));
      
      if (matchDoc.exists() && !matchDoc.data().unmatched) {
        // Already matched, skip
        continue;
      }
      
      // Get the target user's profile
      const userDoc = await getDoc(doc(db, 'users', targetUserId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        pendingRequests.push({
          ...userData,
          swipedAt: swipeData.timestamp?.toDate() || new Date()
        });
      }
    }
    
    // Sort by most recent
    pendingRequests.sort((a, b) => b.swipedAt.getTime() - a.swipedAt.getTime());
    
    return pendingRequests;
  } catch (error) {
    console.error('Error getting pending requests:', error);
    return [];
  }
}

// Subscribe to pending requests in real-time
export function subscribeToPendingRequests(
  userId: string,
  callback: (requests: (UserProfile & { swipedAt: Date })[]) => void
): () => void {
  const swipesRef = collection(db, 'swipes');
  const swipesQuery = query(
    swipesRef,
    where('fromUserId', '==', userId),
    where('direction', 'in', ['right', 'superlike'])
  );
  
  return onSnapshot(swipesQuery, async (snapshot) => {
    const pendingRequests: (UserProfile & { swipedAt: Date })[] = [];
    
    for (const swipeDoc of snapshot.docs) {
      const swipeData = swipeDoc.data();
      const targetUserId = swipeData.toUserId;
      
      // Check if there's already a match (excluding unmatched)
      const matchId = [userId, targetUserId].sort().join('_');
      const matchDoc = await getDoc(doc(db, 'matches', matchId));
      
      if (matchDoc.exists() && !matchDoc.data().unmatched) {
        continue;
      }
      
      // Get the target user's profile
      const userDoc = await getDoc(doc(db, 'users', targetUserId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        pendingRequests.push({
          ...userData,
          swipedAt: swipeData.timestamp?.toDate() || new Date()
        });
      }
    }
    
    pendingRequests.sort((a, b) => b.swipedAt.getTime() - a.swipedAt.getTime());
    callback(pendingRequests);
  });
}

// Cancel/remove a pending match request
export async function cancelPendingRequest(fromUserId: string, toUserId: string): Promise<void> {
  try {
    const swipeId = `${fromUserId}_${toUserId}`;
    await deleteDoc(doc(db, 'swipes', swipeId));
  } catch (error) {
    console.error('Error canceling pending request:', error);
    throw error;
  }
}

// Get incoming match requests (people who liked you but you haven't responded)
export async function getIncomingRequests(userId: string): Promise<(UserProfile & { swipedAt: Date })[]> {
  try {
    // Get all right swipes TO this user
    const swipesRef = collection(db, 'swipes');
    const swipesQuery = query(
      swipesRef,
      where('toUserId', '==', userId),
      where('direction', 'in', ['right', 'superlike'])
    );
    const swipesSnapshot = await getDocs(swipesQuery);
    
    const incomingRequests: (UserProfile & { swipedAt: Date })[] = [];
    
    for (const swipeDoc of swipesSnapshot.docs) {
      const swipeData = swipeDoc.data();
      const fromUserId = swipeData.fromUserId;
      
      // Check if there's already a match (excluding unmatched)
      const matchId = [userId, fromUserId].sort().join('_');
      const matchDoc = await getDoc(doc(db, 'matches', matchId));
      
      if (matchDoc.exists() && !matchDoc.data().unmatched) {
        // Already matched, skip
        continue;
      }
      
      // Check if current user already swiped on this person
      const reverseSwipeId = `${userId}_${fromUserId}`;
      const reverseSwipeDoc = await getDoc(doc(db, 'swipes', reverseSwipeId));
      if (reverseSwipeDoc.exists()) {
        // Already responded, skip
        continue;
      }
      
      // Get the from user's profile
      const userDoc = await getDoc(doc(db, 'users', fromUserId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        incomingRequests.push({
          ...userData,
          swipedAt: swipeData.timestamp?.toDate() || new Date()
        });
      }
    }
    
    // Sort by most recent
    incomingRequests.sort((a, b) => b.swipedAt.getTime() - a.swipedAt.getTime());
    
    return incomingRequests;
  } catch (error) {
    console.error('Error getting incoming requests:', error);
    return [];
  }
}

// Subscribe to incoming requests in real-time
export function subscribeToIncomingRequests(
  userId: string,
  callback: (requests: (UserProfile & { swipedAt: Date })[]) => void
): () => void {
  const swipesRef = collection(db, 'swipes');
  const swipesQuery = query(
    swipesRef,
    where('toUserId', '==', userId),
    where('direction', 'in', ['right', 'superlike'])
  );
  
  return onSnapshot(swipesQuery, async (snapshot) => {
    const incomingRequests: (UserProfile & { swipedAt: Date })[] = [];
    
    for (const swipeDoc of snapshot.docs) {
      const swipeData = swipeDoc.data();
      const fromUserId = swipeData.fromUserId;
      
      // Check if there's already a match (excluding unmatched)
      const matchId = [userId, fromUserId].sort().join('_');
      const matchDoc = await getDoc(doc(db, 'matches', matchId));
      
      if (matchDoc.exists() && !matchDoc.data().unmatched) {
        continue;
      }
      
      // Check if current user already swiped on this person
      const reverseSwipeId = `${userId}_${fromUserId}`;
      const reverseSwipeDoc = await getDoc(doc(db, 'swipes', reverseSwipeId));
      if (reverseSwipeDoc.exists()) {
        continue;
      }
      
      const userDoc = await getDoc(doc(db, 'users', fromUserId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        incomingRequests.push({
          ...userData,
          swipedAt: swipeData.timestamp?.toDate() || new Date()
        });
      }
    }
    
    incomingRequests.sort((a, b) => b.swipedAt.getTime() - a.swipedAt.getTime());
    callback(incomingRequests);
  });
}

// Accept an incoming match request (creates a match)
export async function acceptMatchRequest(currentUserId: string, fromUserId: string): Promise<string> {
  try {
    // This will create a match since the other person already swiped right
    const result = await sendMatchRequest(currentUserId, fromUserId);
    return result.matchId || '';
  } catch (error) {
    console.error('Error accepting match request:', error);
    throw error;
  }
}

// Decline an incoming match request
export async function declineMatchRequest(currentUserId: string, fromUserId: string): Promise<void> {
  try {
    // Swipe left on them (this prevents them from showing up again)
    const swipeId = `${currentUserId}_${fromUserId}`;
    await setDoc(doc(db, 'swipes', swipeId), {
      fromUserId: currentUserId,
      toUserId: fromUserId,
      direction: 'left',
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error declining match request:', error);
    throw error;
  }
}

// Voice Call Types
export interface CallData {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto: string;
  receiverId: string;
  receiverName: string;
  receiverPhoto: string;
  matchId: string;
  status: 'ringing' | 'ongoing' | 'ended' | 'missed' | 'declined';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  createdAt: Timestamp;
  endedAt?: Timestamp;
}

export interface IceCandidate {
  id: string;
  candidate: RTCIceCandidateInit;
  fromUserId: string;
  timestamp: Timestamp;
}

// Create a new voice call
export async function createCall(
  callerId: string,
  callerName: string,
  callerPhoto: string,
  receiverId: string,
  receiverName: string,
  receiverPhoto: string,
  matchId: string,
  offer: RTCSessionDescriptionInit
): Promise<string> {
  try {
    const callRef = doc(collection(db, 'calls'));
    const callData: Omit<CallData, 'id'> = {
      callerId,
      callerName,
      callerPhoto,
      receiverId,
      receiverName,
      receiverPhoto,
      matchId,
      status: 'ringing',
      offer,
      createdAt: serverTimestamp() as Timestamp
    };
    await setDoc(callRef, callData);
    return callRef.id;
  } catch (error) {
    console.error('Error creating call:', error);
    throw error;
  }
}

// Answer a call
export async function answerCall(callId: string, answer: RTCSessionDescriptionInit): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      answer,
      status: 'ongoing'
    });
  } catch (error) {
    console.error('Error answering call:', error);
    throw error;
  }
}

// End a call
export async function endCall(callId: string, status: 'ended' | 'missed' | 'declined' = 'ended'): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status,
      endedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error ending call:', error);
    throw error;
  }
}

// Add ICE candidate
export async function addIceCandidate(
  callId: string,
  candidate: RTCIceCandidateInit,
  fromUserId: string
): Promise<void> {
  try {
    const candidateRef = doc(collection(db, 'calls', callId, 'iceCandidates'));
    await setDoc(candidateRef, {
      candidate,
      fromUserId,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
    throw error;
  }
}

// Subscribe to call state
export function subscribeToCall(
  callId: string,
  callback: (call: CallData | null) => void
): () => void {
  const callRef = doc(db, 'calls', callId);
  return onSnapshot(callRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as CallData);
    } else {
      callback(null);
    }
  });
}

// Subscribe to ICE candidates
export function subscribeToIceCandidates(
  callId: string,
  excludeUserId: string,
  callback: (candidate: IceCandidate) => void
): () => void {
  const candidatesRef = collection(db, 'calls', callId, 'iceCandidates');
  const q = query(candidatesRef, orderBy('timestamp'));
  
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        if (data.fromUserId !== excludeUserId) {
          callback({
            id: change.doc.id,
            ...data
          } as IceCandidate);
        }
      }
    });
  });
}

// Subscribe to incoming calls for a user
export function subscribeToIncomingCalls(
  userId: string,
  callback: (call: CallData | null) => void
): () => void {
  const callsRef = collection(db, 'calls');
  const q = query(
    callsRef,
    where('receiverId', '==', userId),
    where('status', '==', 'ringing'),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      callback({ id: doc.id, ...doc.data() } as CallData);
    } else {
      callback(null);
    }
  });
}

// Group Message type
export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  text: string;
  timestamp: Timestamp;
  type: 'text' | 'image';
  imageUrl?: string;
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
  };
}

// Send a message to a group
export async function sendGroupMessage(
  groupId: string,
  senderId: string,
  senderName: string,
  senderPhoto: string,
  text: string,
  imageUrl?: string,
  replyTo?: { id: string; text: string; senderId: string; senderName: string }
): Promise<string> {
  try {
    const messagesRef = collection(db, 'groups', groupId, 'messages');
    const messageDoc = doc(messagesRef);

    const messageData: {
      senderId: string;
      senderName: string;
      senderPhoto: string;
      text: string;
      timestamp: ReturnType<typeof serverTimestamp>;
      type: 'text' | 'image';
      imageUrl?: string;
      replyTo?: { id: string; text: string; senderId: string; senderName: string };
    } = {
      senderId,
      senderName,
      senderPhoto,
      text,
      timestamp: serverTimestamp(),
      type: imageUrl ? 'image' : 'text'
    };

    if (imageUrl) {
      messageData.imageUrl = imageUrl;
    }

    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    await setDoc(messageDoc, messageData);

    // Update group with last message
    await updateDoc(doc(db, 'groups', groupId), {
      lastMessage: imageUrl ? '📷 Photo' : text,
      lastMessageTime: serverTimestamp(),
      lastMessageSender: senderName
    });

    return messageDoc.id;
  } catch (error) {
    console.error('Error sending group message:', error);
    throw error;
  }
}

// Subscribe to group messages in real-time
export function subscribeToGroupMessages(
  groupId: string,
  callback: (messages: GroupMessage[]) => void
): () => void {
  const messagesRef = collection(db, 'groups', groupId, 'messages');
  const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(messagesQuery, snapshot => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      groupId,
      ...doc.data()
    })) as GroupMessage[];
    callback(messages);
  });
}

// ==================== CREDITS & SUBSCRIPTION SYSTEM ====================

// Initialize user credits (called when user first signs up or if missing)
export async function initializeUserCredits(userId: string): Promise<UserCredits> {
  const creditsRef = doc(db, 'userCredits', userId);
  const creditsDoc = await getDoc(creditsRef);
  
  if (!creditsDoc.exists()) {
    const initialCredits: Omit<UserCredits, 'lastFreeSuperLike' | 'lastSwipeCountReset'> & { lastFreeSuperLike: null; lastSwipeCountReset: null } = {
      superLikes: 1, // Start with 1 free super like
      lastFreeSuperLike: null,
      totalSuperLikesPurchased: 0,
      swipeCount: 0,
      lastSwipeCountReset: null
    };
    await setDoc(creditsRef, initialCredits);
    return initialCredits as UserCredits;
  }
  
  return creditsDoc.data() as UserCredits;
}

// Initialize user subscription
export async function initializeUserSubscription(userId: string): Promise<UserSubscription> {
  const subRef = doc(db, 'userSubscriptions', userId);
  const subDoc = await getDoc(subRef);
  
  if (!subDoc.exists()) {
    const initialSub: UserSubscription = {
      isPremium: false,
      isAdFree: false,
      premiumExpiresAt: null,
      adFreeExpiresAt: null,
      unlimitedSuperLikes: false,
      canSeeWhoLikedYou: false,
      unlimitedRewinds: false,
      priorityInDiscovery: false,
      advancedFilters: false
    };
    await setDoc(subRef, initialSub);
    return initialSub;
  }
  
  return subDoc.data() as UserSubscription;
}

// Get user credits
export async function getUserCredits(userId: string): Promise<UserCredits> {
  const creditsRef = doc(db, 'userCredits', userId);
  const creditsDoc = await getDoc(creditsRef);
  
  if (!creditsDoc.exists()) {
    return initializeUserCredits(userId);
  }
  
  return creditsDoc.data() as UserCredits;
}

// Get user subscription
export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const subRef = doc(db, 'userSubscriptions', userId);
  const subDoc = await getDoc(subRef);
  
  if (!subDoc.exists()) {
    return initializeUserSubscription(userId);
  }
  
  // Check if subscriptions have expired
  const sub = subDoc.data() as UserSubscription;
  const now = new Date();
  let needsUpdate = false;
  const updates: Partial<UserSubscription> = {};
  
  if (sub.premiumExpiresAt && sub.premiumExpiresAt.toDate() < now) {
    updates.isPremium = false;
    updates.unlimitedSuperLikes = false;
    updates.canSeeWhoLikedYou = false;
    updates.unlimitedRewinds = false;
    updates.priorityInDiscovery = false;
    updates.advancedFilters = false;
    needsUpdate = true;
  }
  
  if (sub.adFreeExpiresAt && sub.adFreeExpiresAt.toDate() < now) {
    updates.isAdFree = false;
    needsUpdate = true;
  }
  
  if (needsUpdate) {
    await updateDoc(subRef, updates);
    return { ...sub, ...updates };
  }
  
  return sub;
}

// Subscribe to user credits in real-time
export function subscribeToUserCredits(
  userId: string,
  callback: (credits: UserCredits) => void
): () => void {
  const creditsRef = doc(db, 'userCredits', userId);
  
  return onSnapshot(creditsRef, async (snapshot) => {
    if (!snapshot.exists()) {
      const credits = await initializeUserCredits(userId);
      callback(credits);
    } else {
      callback(snapshot.data() as UserCredits);
    }
  });
}

// Subscribe to user subscription in real-time
export function subscribeToUserSubscription(
  userId: string,
  callback: (subscription: UserSubscription) => void
): () => void {
  const subRef = doc(db, 'userSubscriptions', userId);
  
  return onSnapshot(subRef, async (snapshot) => {
    if (!snapshot.exists()) {
      const sub = await initializeUserSubscription(userId);
      callback(sub);
    } else {
      callback(snapshot.data() as UserSubscription);
    }
  });
}

// Check if user can use a super like (has credits or premium)
export async function canUseSuperLike(userId: string): Promise<{ canUse: boolean; reason?: string }> {
  const [credits, subscription] = await Promise.all([
    getUserCredits(userId),
    getUserSubscription(userId)
  ]);
  
  // Premium users have unlimited super likes
  if (subscription.isPremium && subscription.unlimitedSuperLikes) {
    return { canUse: true };
  }
  
  // Check if user has super likes available
  if (credits.superLikes > 0) {
    return { canUse: true };
  }
  
  // Check if user can claim their daily free super like
  const now = new Date();
  const lastFree = credits.lastFreeSuperLike?.toDate();
  
  if (!lastFree || (now.getTime() - lastFree.getTime()) >= 24 * 60 * 60 * 1000) {
    // Can claim daily free super like
    return { canUse: true };
  }
  
  // Calculate time until next free super like
  const nextFreeTime = new Date(lastFree.getTime() + 24 * 60 * 60 * 1000);
  const hoursLeft = Math.ceil((nextFreeTime.getTime() - now.getTime()) / (60 * 60 * 1000));
  
  return { 
    canUse: false, 
    reason: `No super likes available. Next free super like in ${hoursLeft} hours. Buy more or upgrade to Premium!`
  };
}

// Use a super like
export async function useSuperLike(userId: string): Promise<boolean> {
  const creditsRef = doc(db, 'userCredits', userId);
  const [credits, subscription] = await Promise.all([
    getUserCredits(userId),
    getUserSubscription(userId)
  ]);
  
  // Premium users don't consume super likes
  if (subscription.isPremium && subscription.unlimitedSuperLikes) {
    return true;
  }
  
  // Check if user has super likes
  if (credits.superLikes > 0) {
    await updateDoc(creditsRef, {
      superLikes: increment(-1)
    });
    return true;
  }
  
  // Check if can claim daily free
  const now = new Date();
  const lastFree = credits.lastFreeSuperLike?.toDate();
  
  if (!lastFree || (now.getTime() - lastFree.getTime()) >= 24 * 60 * 60 * 1000) {
    // Claim and use daily free super like (don't add to count, just mark as used)
    await updateDoc(creditsRef, {
      lastFreeSuperLike: serverTimestamp()
    });
    return true;
  }
  
  return false;
}

// Add super likes (after purchase)
export async function addSuperLikes(userId: string, amount: number): Promise<void> {
  const creditsRef = doc(db, 'userCredits', userId);
  await getUserCredits(userId); // Ensure initialized
  
  await updateDoc(creditsRef, {
    superLikes: increment(amount),
    totalSuperLikesPurchased: increment(amount)
  });
}

// Increment swipe count and check if ad should be shown
export async function incrementSwipeCount(userId: string): Promise<{ showAd: boolean; swipeCount: number }> {
  const creditsRef = doc(db, 'userCredits', userId);
  const [credits, subscription] = await Promise.all([
    getUserCredits(userId),
    getUserSubscription(userId)
  ]);
  
  // Premium or ad-free users don't see ads
  if (subscription.isPremium || subscription.isAdFree) {
    return { showAd: false, swipeCount: credits.swipeCount };
  }
  
  const newCount = credits.swipeCount + 1;
  const showAd = newCount % 10 === 0;
  
  await updateDoc(creditsRef, {
    swipeCount: newCount
  });
  
  return { showAd, swipeCount: newCount };
}

// Purchase premium subscription
export async function purchasePremium(userId: string): Promise<void> {
  const subRef = doc(db, 'userSubscriptions', userId);
  await getUserSubscription(userId); // Ensure initialized
  
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month
  
  await updateDoc(subRef, {
    isPremium: true,
    premiumExpiresAt: Timestamp.fromDate(expiresAt),
    // Premium benefits
    unlimitedSuperLikes: true,
    canSeeWhoLikedYou: true,
    unlimitedRewinds: true,
    priorityInDiscovery: true,
    advancedFilters: true,
    // Premium includes ad-free
    isAdFree: true,
    adFreeExpiresAt: Timestamp.fromDate(expiresAt)
  });
}

// Purchase ad-free subscription
export async function purchaseAdFree(userId: string): Promise<void> {
  const subRef = doc(db, 'userSubscriptions', userId);
  await getUserSubscription(userId); // Ensure initialized
  
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month
  
  await updateDoc(subRef, {
    isAdFree: true,
    adFreeExpiresAt: Timestamp.fromDate(expiresAt)
  });
}

// Record a purchase transaction
export async function recordPurchase(
  userId: string,
  type: 'super_likes' | 'premium' | 'ad_free',
  amount: number,
  transactionId?: string
): Promise<void> {
  const purchaseRef = doc(collection(db, 'purchases'));
  await setDoc(purchaseRef, {
    userId,
    type,
    amount,
    transactionId: transactionId || null,
    createdAt: serverTimestamp()
  });
}



