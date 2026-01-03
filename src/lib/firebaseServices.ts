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
  DocumentData
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

// Send a message
export async function sendMessage(matchId: string, senderId: string, text: string): Promise<string> {
  try {
    const messagesRef = collection(db, 'matches', matchId, 'messages');
    const messageDoc = doc(messagesRef);

    await setDoc(messageDoc, {
      senderId,
      text,
      timestamp: serverTimestamp(),
      read: false
    });

    // Update match with last message
    await updateDoc(doc(db, 'matches', matchId), {
      lastMessage: text,
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
