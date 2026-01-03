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
  deleteDoc
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
): Promise<{ isMatch: boolean; matchId?: string }> {
  try {
    const swipeId = `${fromUserId}_${toUserId}`;
    await setDoc(doc(db, 'swipes', swipeId), {
      fromUserId,
      toUserId,
      direction,
      timestamp: serverTimestamp()
    });

    // Check if it's a match (other user also swiped right)
    if (direction === 'right' || direction === 'superlike') {
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
async function createMatch(userId1: string, userId2: string): Promise<string> {
  const matchId = [userId1, userId2].sort().join('_');

  // Get both user profiles
  const user1Doc = await getDoc(doc(db, 'users', userId1));
  const user2Doc = await getDoc(doc(db, 'users', userId2));

  const userProfiles: { [key: string]: DocumentData } = {};
  if (user1Doc.exists()) userProfiles[userId1] = user1Doc.data();
  if (user2Doc.exists()) userProfiles[userId2] = user2Doc.data();

  await setDoc(doc(db, 'matches', matchId), {
    users: [userId1, userId2],
    userProfiles,
    createdAt: serverTimestamp()
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
    const matches = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Match[];
    callback(matches);
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
export async function sendMessage(matchId: string, senderId: string, text: string, imageUrl?: string): Promise<string> {
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

    await setDoc(messageDoc, messageData);

    // Update match with last message
    await updateDoc(doc(db, 'matches', matchId), {
      lastMessage: imageUrl ? '📷 Photo' : text,
      lastMessageTime: serverTimestamp()
    });

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
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

// Get groups to swipe on
export async function getGroupsToSwipe(currentUserId: string, limitCount: number = 10): Promise<Group[]> {
  try {
    const groupsRef = collection(db, 'groups');
    const groupsQuery = query(groupsRef, limit(limitCount));
    const groupsSnapshot = await getDocs(groupsQuery);

    return groupsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Group))
      .filter(group => !group.members?.includes(currentUserId));
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
    // Delete all messages in the match
    const messagesRef = collection(db, 'matches', matchId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);
    const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    // Delete the match document
    await deleteDoc(doc(db, 'matches', matchId));
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
