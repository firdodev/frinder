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
import {
  checkRateLimit,
  sanitizeMessage,
  sanitizeInput,
  sanitizeDisplayName,
  sanitizeBio,
  sanitizeInterests
} from './security';

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
  // Whop subscription management
  membershipId?: string | null;
  cancelAtPeriodEnd?: boolean;
  // Pro super likes (15/month, 1/day)
  proSuperLikesRemaining?: number;
  proSuperLikesResetAt?: Timestamp | null;
  lastProSuperLikeUsed?: Timestamp | null;
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
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: Timestamp;
  respondedAt?: Timestamp;
  cancelledAt?: Timestamp;
  cancelledBy?: string;
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
  isPrivate: boolean;
  pendingMembers?: string[];
  pendingMemberProfiles?: { [key: string]: UserProfile };
  createdAt: Timestamp;
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  lastMessageSender?: string;
}

// Check if a display name is already taken by another user
export async function isDisplayNameTaken(displayName: string, currentUserId?: string): Promise<boolean> {
  try {
    const normalizedName = displayName.trim().toLowerCase();
    if (!normalizedName) return false;

    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      // Skip the current user's own profile
      if (currentUserId && doc.id === currentUserId) continue;
      
      // Check if display name matches (case-insensitive)
      if (userData.displayName && userData.displayName.trim().toLowerCase() === normalizedName) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking display name:', error);
    return false; // In case of error, allow the name (backend validation should also check)
  }
}

// Get users to swipe on (excludes users already interacted with)
// Endless discovery: disliked users will reappear, only active matches are excluded
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
    
    const excludedUserIds: string[] = [currentUserId]; // Always exclude self
    
    // Get all matches for this user
    const matchesRef = collection(db, 'matches');
    const matchesQuery = query(
      matchesRef,
      where('users', 'array-contains', currentUserId)
    );
    const matchesSnapshot = await getDocs(matchesQuery);
    
    // Build sets for active matches and unmatched users
    const activeMatchedUsers = new Set<string>();
    const unmatchedUsers = new Set<string>();
    
    matchesSnapshot.docs.forEach(matchDoc => {
      const matchData = matchDoc.data();
      matchData.users.forEach((uid: string) => {
        if (uid !== currentUserId) {
          if (matchData.unmatched) {
            unmatchedUsers.add(uid);
          } else {
            activeMatchedUsers.add(uid);
          }
        }
      });
    });
    
    swipedSnapshot.docs.forEach(swipeDoc => {
      const swipeData = swipeDoc.data();
      const direction = swipeData.direction;
      const targetUserId = swipeData.toUserId;
      
      // If user was unmatched, allow them to reappear (don't exclude)
      if (unmatchedUsers.has(targetUserId)) {
        return; // Don't exclude, they can reappear
      }
      
      // Only exclude users who are in an ACTIVE match (not unmatched)
      // This means: right swipes that resulted in a match, OR pending right swipes
      if (direction === 'right' || direction === 'superlike') {
        // Check if this is an active match - if so, exclude
        if (activeMatchedUsers.has(targetUserId)) {
          excludedUserIds.push(targetUserId);
        }
        // If it's a pending like (no match yet), still show them so user knows they already liked
        // Actually, let's exclude pending likes too to avoid confusion
        excludedUserIds.push(targetUserId);
      }
      // LEFT SWIPES: Don't exclude! This makes discovery endless
      // Users you disliked will show up again in the feed
    });

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
      if (!excludedUserIds.includes(userData.uid)) {
        users.push(userData);
      }
    });

    // No filters applied - show all users regardless of gender, location, or interests

    return users.slice(0, limitCount);
  } catch (error) {
    console.error('Error getting users to swipe:', error);
    return [];
  }
}

// Send notification email (like, superlike, match)
export async function sendNotificationEmail(
  toUserId: string,
  fromUserId: string,
  type: 'like' | 'superlike' | 'match'
): Promise<void> {
  try {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Get recipient's profile
    const toUserDoc = await getDoc(doc(db, 'users', toUserId));
    if (!toUserDoc.exists()) return;
    const toUser = toUserDoc.data() as UserProfile;
    
    // Get sender's profile
    const fromUserDoc = await getDoc(doc(db, 'users', fromUserId));
    if (!fromUserDoc.exists()) return;
    const fromUser = fromUserDoc.data() as UserProfile;
    
    // Check if recipient has email notifications enabled (default to true if not set)
    const emailNotificationsEnabled = toUser.emailNotifications !== false;
    if (!emailNotificationsEnabled) return;
    
    // Check if recipient has a valid email
    if (!toUser.email) return;
    
    // Send notification email via API (uses nodemailer on server)
    const baseUrl = window.location.origin;
    await fetch(`${baseUrl}/api/send-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: toUser.email,
        toName: toUser.displayName,
        fromName: fromUser.displayName,
        fromPhoto: fromUser.photos?.[0] || '',
        type
      })
    });
  } catch (error) {
    // Don't throw - email is non-critical
    console.error('Error sending notification email:', error);
  }
}

// Record a swipe
export async function recordSwipe(
  fromUserId: string,
  toUserId: string,
  direction: 'left' | 'right' | 'superlike'
): Promise<{ isMatch: boolean; matchId?: string; isSuperLike?: boolean }> {
  try {
    // Rate limit check
    const rateLimitAction = direction === 'superlike' ? 'superlike' : 'swipe';
    const { allowed, resetIn } = checkRateLimit(fromUserId, rateLimitAction);
    if (!allowed) {
      const resetInMinutes = Math.ceil(resetIn / 60000);
      throw new Error(
        `Too many ${direction === 'superlike' ? 'super likes' : 'swipes'}. Please wait ${resetInMinutes} minute(s).`
      );
    }

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

      // TRANSFER: Give the super like to the recipient!
      // The person who got super liked receives 1 super like credit
      await addSuperLikes(toUserId, 1);

      // Create automatic match for super like
      const matchId = await createMatch(fromUserId, toUserId, true);

      // Also record a "super liked" notification for the other user
      await setDoc(doc(db, 'superLikes', `${fromUserId}_${toUserId}`), {
        fromUserId,
        toUserId,
        timestamp: serverTimestamp(),
        seen: false
      });

      // Send superlike email notification to recipient
      sendNotificationEmail(toUserId, fromUserId, 'superlike');

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

  // Check if match already exists
  const existingMatch = await getDoc(doc(db, 'matches', matchId));
  if (existingMatch.exists()) {
    const matchData = existingMatch.data();
    // If the match was previously unmatched, reactivate it
    if (matchData.unmatched) {
      // Get fresh user profiles
      const user1Doc = await getDoc(doc(db, 'users', userId1));
      const user2Doc = await getDoc(doc(db, 'users', userId2));

      const userProfiles: { [key: string]: DocumentData } = {};
      if (user1Doc.exists()) userProfiles[userId1] = user1Doc.data();
      if (user2Doc.exists()) userProfiles[userId2] = user2Doc.data();

      // Reactivate the match
      await updateDoc(doc(db, 'matches', matchId), {
        unmatched: false,
        unmatchedAt: null,
        userProfiles,
        rematchedAt: serverTimestamp(),
        isSuperLike,
        superLikedBy: isSuperLike ? userId1 : null
      });
      return matchId;
    }
    return matchId; // Already matched (and active)
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
  callback: (matches: (Match & { unmatched: boolean; unmatchedAt?: Timestamp })[]) => void
): () => void {
  const matchesRef = collection(db, 'matches');
  const matchesQuery = query(matchesRef, where('users', 'array-contains', userId), orderBy('createdAt', 'desc'));

  return onSnapshot(matchesQuery, snapshot => {
    const unmatchedMatches = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(match => (match as any).unmatched === true && (match as any).lastMessage) as (Match & {
      unmatched: boolean;
      unmatchedAt?: Timestamp;
    })[];
    callback(unmatchedMatches);
  });
}

// Subscribe to total unread message count across all matches
export function subscribeToUnreadCount(userId: string, callback: (count: number) => void): () => void {
  const matchesRef = collection(db, 'matches');
  const matchesQuery = query(matchesRef, where('users', 'array-contains', userId));

  return onSnapshot(matchesQuery, async snapshot => {
    let totalUnread = 0;

    // For each match, count unread messages not sent by current user
    const countPromises = snapshot.docs.map(async matchDoc => {
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
    // Rate limit check
    const { allowed, resetIn } = checkRateLimit(senderId, 'message');
    if (!allowed) {
      const resetInSeconds = Math.ceil(resetIn / 1000);
      throw new Error(`Slow down! Please wait ${resetInSeconds} seconds before sending another message.`);
    }

    // Sanitize message text
    const sanitizedText = sanitizeMessage(text);
    if (!sanitizedText && !imageUrl) {
      throw new Error('Message cannot be empty');
    }

    // Sanitize reply text if present
    const sanitizedReplyTo = replyTo
      ? {
          ...replyTo,
          text: sanitizeMessage(replyTo.text)
        }
      : undefined;

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
      text: sanitizedText,
      timestamp: serverTimestamp(),
      read: false,
      type: imageUrl ? 'image' : 'text'
    };

    if (imageUrl) {
      messageData.imageUrl = imageUrl;
    }

    if (sanitizedReplyTo) {
      messageData.replyTo = sanitizedReplyTo;
    }

    await setDoc(messageDoc, messageData);

    // Get match to find the other user
    const matchDoc = await getDoc(doc(db, 'matches', matchId));
    const matchData = matchDoc.data();
    const otherUserId = matchData?.users?.find((id: string) => id !== senderId);

    // Update match with last message and increment unread count for other user
    const updateData: Record<string, unknown> = {
      lastMessage: imageUrl ? '📷 Photo' : sanitizedText,
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

// Edit a message
export async function editMessage(
  matchId: string,
  messageId: string,
  senderId: string,
  newText: string
): Promise<void> {
  try {
    const messageRef = doc(db, 'matches', matchId, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }
    
    const messageData = messageDoc.data();
    if (messageData.senderId !== senderId) {
      throw new Error('You can only edit your own messages');
    }
    
    const sanitizedText = sanitizeMessage(newText);
    if (!sanitizedText) {
      throw new Error('Message cannot be empty');
    }
    
    await updateDoc(messageRef, {
      text: sanitizedText,
      edited: true,
      editedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error editing message:', error);
    throw error;
  }
}

// Delete a message for everyone
export async function deleteMessageForEveryone(
  matchId: string,
  messageId: string,
  senderId: string
): Promise<void> {
  try {
    const messageRef = doc(db, 'matches', matchId, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }
    
    const messageData = messageDoc.data();
    if (messageData.senderId !== senderId) {
      throw new Error('You can only delete your own messages');
    }
    
    await updateDoc(messageRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
      text: 'This message was deleted',
      imageUrl: null
    });
  } catch (error) {
    console.error('Error deleting message:', error);
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

// Cancel a date request (can be cancelled by either party)
export async function cancelDateRequest(
  matchId: string,
  dateRequestId: string,
  cancelledByUserId: string
): Promise<void> {
  try {
    const dateRequestRef = doc(db, 'matches', matchId, 'dateRequests', dateRequestId);

    await updateDoc(dateRequestRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledBy: cancelledByUserId
    });

    // Update match with cancellation notice
    await updateDoc(doc(db, 'matches', matchId), {
      lastMessage: '🚫 Date cancelled',
      lastMessageTime: serverTimestamp()
    });
  } catch (error) {
    console.error('Error cancelling date request:', error);
    throw error;
  }
}

// Subscribe to date requests for a match
export function subscribeToDateRequests(matchId: string, callback: (dateRequests: DateRequest[]) => void): () => void {
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
      .map(
        doc =>
          ({
            id: doc.id,
            ...doc.data()
          } as Group)
      )
      .filter(
        group =>
          !group.members?.includes(currentUserId) && // Not a member
          group.creatorId !== currentUserId && // Not the creator
          !group.pendingMembers?.includes(currentUserId) // Not already pending
      )
      .slice(0, limitCount);
  } catch (error) {
    console.error('Error getting groups:', error);
    return [];
  }
}

// Join a group (public) or request to join (private)
export async function joinGroup(groupId: string, userId: string): Promise<'joined' | 'requested'> {
  try {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const groupData = groupDoc.data();
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();

    // Check if group is private
    if (groupData.isPrivate) {
      // Add to pending members
      await updateDoc(doc(db, 'groups', groupId), {
        pendingMembers: arrayUnion(userId),
        [`pendingMemberProfiles.${userId}`]: userData
      });
      return 'requested';
    } else {
      // Public group - join directly
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayUnion(userId),
        [`memberProfiles.${userId}`]: userData
      });
      return 'joined';
    }
  } catch (error) {
    console.error('Error joining group:', error);
    throw error;
  }
}

// Approve join request (creator only)
export async function approveJoinRequest(groupId: string, requesterId: string, approverId: string): Promise<void> {
  try {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const groupData = groupDoc.data();
    
    // Check if user is creator
    if (groupData.creatorId !== approverId) {
      throw new Error('Only the group creator can approve join requests');
    }
    
    // Check if requester is in pending list
    if (!groupData.pendingMembers?.includes(requesterId)) {
      throw new Error('User has not requested to join this group');
    }
    
    const requesterProfile = groupData.pendingMemberProfiles?.[requesterId];
    
    // Remove from pending and add to members
    const updatedPendingMembers = (groupData.pendingMembers || []).filter((id: string) => id !== requesterId);
    const updatedPendingProfiles = { ...groupData.pendingMemberProfiles };
    delete updatedPendingProfiles[requesterId];
    
    await updateDoc(doc(db, 'groups', groupId), {
      pendingMembers: updatedPendingMembers,
      pendingMemberProfiles: updatedPendingProfiles,
      members: arrayUnion(requesterId),
      [`memberProfiles.${requesterId}`]: requesterProfile
    });
  } catch (error) {
    console.error('Error approving join request:', error);
    throw error;
  }
}

// Decline join request (creator only)
export async function declineJoinRequest(groupId: string, requesterId: string, declinerId: string): Promise<void> {
  try {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const groupData = groupDoc.data();
    
    // Check if user is creator
    if (groupData.creatorId !== declinerId) {
      throw new Error('Only the group creator can decline join requests');
    }
    
    // Remove from pending
    const updatedPendingMembers = (groupData.pendingMembers || []).filter((id: string) => id !== requesterId);
    const updatedPendingProfiles = { ...groupData.pendingMemberProfiles };
    delete updatedPendingProfiles[requesterId];
    
    await updateDoc(doc(db, 'groups', groupId), {
      pendingMembers: updatedPendingMembers,
      pendingMemberProfiles: updatedPendingProfiles
    });
  } catch (error) {
    console.error('Error declining join request:', error);
    throw error;
  }
}

// Update group (creator only)
export async function updateGroup(
  groupId: string,
  creatorId: string,
  updates: {
    name?: string;
    description?: string;
    photo?: string;
    interests?: string[];
    activity?: string;
    location?: string;
    isPrivate?: boolean;
  }
): Promise<void> {
  try {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const groupData = groupDoc.data();
    
    // Check if user is creator
    if (groupData.creatorId !== creatorId) {
      throw new Error('Only the group creator can update the group');
    }
    
    // Sanitize updates
    const sanitizedUpdates: Record<string, any> = {};
    
    if (updates.name !== undefined) {
      sanitizedUpdates.name = sanitizeInput(updates.name, { maxLength: 100, allowNewlines: false });
    }
    if (updates.description !== undefined) {
      sanitizedUpdates.description = sanitizeBio(updates.description);
    }
    if (updates.photo !== undefined) {
      sanitizedUpdates.photo = updates.photo;
    }
    if (updates.interests !== undefined) {
      sanitizedUpdates.interests = sanitizeInterests(updates.interests);
    }
    if (updates.activity !== undefined) {
      sanitizedUpdates.activity = sanitizeInput(updates.activity, { maxLength: 100, allowNewlines: false });
    }
    if (updates.location !== undefined) {
      sanitizedUpdates.location = sanitizeInput(updates.location, { maxLength: 100, allowNewlines: false });
    }
    if (updates.isPrivate !== undefined) {
      sanitizedUpdates.isPrivate = updates.isPrivate;
    }
    
    await updateDoc(doc(db, 'groups', groupId), sanitizedUpdates);
  } catch (error) {
    console.error('Error updating group:', error);
    throw error;
  }
}

// Get groups created by user
export async function getMyCreatedGroups(userId: string): Promise<Group[]> {
  try {
    const groupsRef = collection(db, 'groups');
    const groupsQuery = query(groupsRef, where('creatorId', '==', userId));
    const groupsSnapshot = await getDocs(groupsQuery);

    return groupsSnapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data()
        } as Group)
    );
  } catch (error) {
    console.error('Error getting created groups:', error);
    return [];
  }
}

// Subscribe to groups created by user (for real-time updates)
export function subscribeToMyCreatedGroups(userId: string, callback: (groups: Group[]) => void): () => void {
  const groupsRef = collection(db, 'groups');
  const groupsQuery = query(groupsRef, where('creatorId', '==', userId));

  return onSnapshot(groupsQuery, snapshot => {
    const groups = snapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data()
        } as Group)
    );
    callback(groups);
  });
}

// Create a group
export async function createGroup(
  creatorId: string,
  groupData: Omit<Group, 'id' | 'creatorId' | 'members' | 'memberProfiles' | 'pendingMembers' | 'pendingMemberProfiles' | 'createdAt'>
): Promise<string> {
  try {
    // Rate limit check
    const { allowed, resetIn } = checkRateLimit(creatorId, 'groupCreate');
    if (!allowed) {
      const resetInMinutes = Math.ceil(resetIn / 60000);
      throw new Error(`You can only create a limited number of groups. Please wait ${resetInMinutes} minute(s).`);
    }

    // Sanitize group data
    const sanitizedGroupData = {
      ...groupData,
      name: sanitizeInput(groupData.name, { maxLength: 100, allowNewlines: false }),
      description: sanitizeBio(groupData.description),
      activity: sanitizeInput(groupData.activity, { maxLength: 100, allowNewlines: false }),
      location: groupData.location
        ? sanitizeInput(groupData.location, { maxLength: 100, allowNewlines: false })
        : undefined,
      interests: sanitizeInterests(groupData.interests),
      isPrivate: groupData.isPrivate || false
    };

    const userDoc = await getDoc(doc(db, 'users', creatorId));
    const userData = userDoc.data();

    const groupRef = doc(collection(db, 'groups'));
    await setDoc(groupRef, {
      ...sanitizedGroupData,
      creatorId,
      members: [creatorId],
      memberProfiles: { [creatorId]: userData },
      pendingMembers: [],
      pendingMemberProfiles: {},
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

    return groupsSnapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data()
        } as Group)
    );
  } catch (error) {
    console.error('Error getting user groups:', error);
    return [];
  }
}

// Subscribe to user's groups in real-time
export function subscribeToUserGroups(userId: string, callback: (groups: Group[]) => void): () => void {
  const groupsRef = collection(db, 'groups');
  const groupsQuery = query(groupsRef, where('members', 'array-contains', userId));

  return onSnapshot(groupsQuery, snapshot => {
    const groups = snapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data()
        } as Group)
    );
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
    const updatePromises = matchesSnapshot.docs.map(async matchDoc => {
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
  return onSnapshot(doc(db, 'matches', matchId), snapshot => {
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
export function subscribeToUserPresence(
  userId: string,
  callback: (isOnline: boolean, lastSeen?: Date) => void
): () => void {
  return onSnapshot(doc(db, 'users', userId), snapshot => {
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
        // Delete swipe records in both directions so users can like each other again
        const swipeId1 = `${users[0]}_${users[1]}`;
        const swipeId2 = `${users[1]}_${users[0]}`;

        await Promise.all([
          deleteDoc(doc(db, 'swipes', swipeId1)).catch(() => {}), // Ignore if doesn't exist
          deleteDoc(doc(db, 'swipes', swipeId2)).catch(() => {}), // Ignore if doesn't exist
          // Also delete any super like records
          deleteDoc(doc(db, 'superLikes', swipeId1)).catch(() => {}),
          deleteDoc(doc(db, 'superLikes', swipeId2)).catch(() => {})
        ]);
      }

      // Mark the match as unmatched instead of deleting
      // This preserves chat history but prevents new messages
      // Both users can now like each other again from discovery
      await updateDoc(doc(db, 'matches', matchId), {
        unmatched: true,
        unmatchedAt: serverTimestamp(),
        lastMessage: '🔓 Chat ended - match again to continue',
        lastMessageTime: serverTimestamp()
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
    const likesQuery = query(swipesRef, where('toUserId', '==', userId), where('direction', '==', 'right'));
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
    const superLikesQuery = query(superLikesRef, where('toUserId', '==', userId));
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
      .map(
        doc =>
          ({
            ...doc.data(),
            id: doc.id
          } as UserProfile & { id: string })
      )
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
export async function checkIfMatched(
  userId1: string,
  userId2: string
): Promise<{ isMatched: boolean; matchId?: string }> {
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
export async function checkSwipeStatus(
  fromUserId: string,
  toUserId: string
): Promise<'none' | 'left' | 'right' | 'superlike'> {
  try {
    // First check if there's an unmatched match - if so, treat as 'none' to allow re-swiping
    const matchId = [fromUserId, toUserId].sort().join('_');
    const matchDoc = await getDoc(doc(db, 'matches', matchId));
    
    if (matchDoc.exists() && matchDoc.data().unmatched) {
      return 'none'; // Allow re-swiping after unmatch
    }
    
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

      // Check if there's already a match
      const matchId = [userId, targetUserId].sort().join('_');
      const matchDoc = await getDoc(doc(db, 'matches', matchId));

      if (matchDoc.exists()) {
        const matchData = matchDoc.data();
        // If matched (active or unmatched), skip - don't show as pending
        // Unmatched users will appear in discovery again, not in pending
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

  return onSnapshot(swipesQuery, async snapshot => {
    const pendingRequests: (UserProfile & { swipedAt: Date })[] = [];

    for (const swipeDoc of snapshot.docs) {
      const swipeData = swipeDoc.data();
      const targetUserId = swipeData.toUserId;

      // Check if there's already a match (active or unmatched)
      const matchId = [userId, targetUserId].sort().join('_');
      const matchDoc = await getDoc(doc(db, 'matches', matchId));

      // If any match exists (active or unmatched), don't show as pending
      // Unmatched users appear in discovery, not pending
      if (matchDoc.exists()) {
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

      // Check if there's already a match (active or unmatched)
      const matchId = [userId, fromUserId].sort().join('_');
      const matchDoc = await getDoc(doc(db, 'matches', matchId));

      // If any match exists (active or unmatched), skip
      // Unmatched users will show in discovery, not as incoming requests
      if (matchDoc.exists()) {
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

  return onSnapshot(swipesQuery, async snapshot => {
    const incomingRequests: (UserProfile & { swipedAt: Date })[] = [];

    for (const swipeDoc of snapshot.docs) {
      const swipeData = swipeDoc.data();
      const fromUserId = swipeData.fromUserId;

      // Check if there's already a match (active or unmatched)
      const matchId = [userId, fromUserId].sort().join('_');
      const matchDoc = await getDoc(doc(db, 'matches', matchId));

      // If any match exists (active or unmatched), skip
      // Unmatched users will show in discovery, not as incoming requests
      if (matchDoc.exists()) {
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
export function subscribeToCall(callId: string, callback: (call: CallData | null) => void): () => void {
  const callRef = doc(db, 'calls', callId);
  return onSnapshot(callRef, snapshot => {
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

  return onSnapshot(q, snapshot => {
    snapshot.docChanges().forEach(change => {
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
export function subscribeToIncomingCalls(userId: string, callback: (call: CallData | null) => void): () => void {
  const callsRef = collection(db, 'calls');
  const q = query(
    callsRef,
    where('receiverId', '==', userId),
    where('status', '==', 'ringing'),
    orderBy('createdAt', 'desc'),
    limit(1)
  );

  return onSnapshot(q, snapshot => {
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
  edited?: boolean;
  deleted?: boolean;
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
    // Rate limit check (use same message limit)
    const { allowed, resetIn } = checkRateLimit(senderId, 'message');
    if (!allowed) {
      const resetInSeconds = Math.ceil(resetIn / 1000);
      throw new Error(`Slow down! Please wait ${resetInSeconds} seconds before sending another message.`);
    }

    // Sanitize message text
    const sanitizedText = sanitizeMessage(text);
    const sanitizedSenderName = sanitizeDisplayName(senderName);

    if (!sanitizedText && !imageUrl) {
      throw new Error('Message cannot be empty');
    }

    // Sanitize reply text if present
    const sanitizedReplyTo = replyTo
      ? {
          ...replyTo,
          text: sanitizeMessage(replyTo.text),
          senderName: sanitizeDisplayName(replyTo.senderName)
        }
      : undefined;

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
      senderName: sanitizedSenderName,
      senderPhoto,
      text: sanitizedText,
      timestamp: serverTimestamp(),
      type: imageUrl ? 'image' : 'text'
    };

    if (imageUrl) {
      messageData.imageUrl = imageUrl;
    }

    if (sanitizedReplyTo) {
      messageData.replyTo = sanitizedReplyTo;
    }

    await setDoc(messageDoc, messageData);

    // Update group with last message
    await updateDoc(doc(db, 'groups', groupId), {
      lastMessage: imageUrl ? '📷 Photo' : sanitizedText,
      lastMessageTime: serverTimestamp(),
      lastMessageSender: sanitizedSenderName
    });

    return messageDoc.id;
  } catch (error) {
    console.error('Error sending group message:', error);
    throw error;
  }
}

// Edit a group message
export async function editGroupMessage(
  groupId: string,
  messageId: string,
  senderId: string,
  newText: string
): Promise<void> {
  try {
    const messageRef = doc(db, 'groups', groupId, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }
    
    const messageData = messageDoc.data();
    if (messageData.senderId !== senderId) {
      throw new Error('You can only edit your own messages');
    }
    
    const sanitizedText = sanitizeMessage(newText);
    if (!sanitizedText) {
      throw new Error('Message cannot be empty');
    }
    
    await updateDoc(messageRef, {
      text: sanitizedText,
      edited: true,
      editedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error editing group message:', error);
    throw error;
  }
}

// Delete a group message for everyone
export async function deleteGroupMessageForEveryone(
  groupId: string,
  messageId: string,
  senderId: string
): Promise<void> {
  try {
    const messageRef = doc(db, 'groups', groupId, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }
    
    const messageData = messageDoc.data();
    if (messageData.senderId !== senderId) {
      throw new Error('You can only delete your own messages');
    }
    
    await updateDoc(messageRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
      text: 'This message was deleted',
      imageUrl: null
    });
  } catch (error) {
    console.error('Error deleting group message:', error);
    throw error;
  }
}

// Subscribe to group messages in real-time
export function subscribeToGroupMessages(groupId: string, callback: (messages: GroupMessage[]) => void): () => void {
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
    const initialCredits: Omit<UserCredits, 'lastFreeSuperLike' | 'lastSwipeCountReset'> & {
      lastFreeSuperLike: null;
      lastSwipeCountReset: null;
    } = {
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
export function subscribeToUserCredits(userId: string, callback: (credits: UserCredits) => void): () => void {
  const creditsRef = doc(db, 'userCredits', userId);

  return onSnapshot(creditsRef, async snapshot => {
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

  return onSnapshot(subRef, async snapshot => {
    if (!snapshot.exists()) {
      const sub = await initializeUserSubscription(userId);
      callback(sub);
    } else {
      callback(snapshot.data() as UserSubscription);
    }
  });
}

// Check if user can use a super like (has credits, daily free, or Pro)
export async function canUseSuperLike(userId: string): Promise<{ canUse: boolean; reason?: string }> {
  const [credits, subscription] = await Promise.all([getUserCredits(userId), getUserSubscription(userId)]);

  // Pro users use the Pro super like system (15/month, 1/day)
  if (subscription.isPremium) {
    const proCheck = await canUseProSuperLike(userId);
    if (proCheck.canUse) {
      return { canUse: true };
    }
    // If Pro but can't use Pro super like, check regular credits
    if (credits.superLikes > 0) {
      return { canUse: true };
    }
    return { canUse: false, reason: proCheck.reason };
  }

  // Check if user has super likes available
  if (credits.superLikes > 0) {
    return { canUse: true };
  }

  // Check if user can claim their daily free super like
  const now = new Date();
  const lastFree = credits.lastFreeSuperLike?.toDate();

  if (!lastFree || now.getTime() - lastFree.getTime() >= 24 * 60 * 60 * 1000) {
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
  const [credits, subscription] = await Promise.all([getUserCredits(userId), getUserSubscription(userId)]);

  // Pro users use the Pro super like system first
  if (subscription.isPremium) {
    const proUsed = await useProSuperLike(userId);
    if (proUsed) {
      return true;
    }
    // Fallback to regular credits if Pro super likes exhausted
    if (credits.superLikes > 0) {
      await updateDoc(creditsRef, {
        superLikes: increment(-1)
      });
      return true;
    }
    return false;
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

  if (!lastFree || now.getTime() - lastFree.getTime() >= 24 * 60 * 60 * 1000) {
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
export async function incrementSwipeCount(userId: string, swipeInterval: number = 10): Promise<{ showAd: boolean; swipeCount: number }> {
  const creditsRef = doc(db, 'userCredits', userId);
  const [credits, subscription] = await Promise.all([getUserCredits(userId), getUserSubscription(userId)]);

  // Premium or ad-free users don't see ads
  if (subscription.isPremium || subscription.isAdFree) {
    return { showAd: false, swipeCount: credits.swipeCount };
  }

  const newCount = credits.swipeCount + 1;
  const showAd = newCount % swipeInterval === 0;

  await updateDoc(creditsRef, {
    swipeCount: newCount
  });

  return { showAd, swipeCount: newCount };
}

// =====================================
// REDEEM CODES
// =====================================

// Redeem code types
export interface RedeemCode {
  code: string;
  type: 'pro' | 'superlikes';
  used: boolean;
  usedBy?: string;
  usedAt?: Timestamp;
  createdAt: Timestamp;
}

// Valid redeem codes (checked directly, no Firebase init needed)
export const VALID_REDEEM_CODES: { [code: string]: 'pro' | 'superlikes' } = {
  // Pro codes (random alphanumeric)
  X7K9M2P4Q1: 'pro',
  R3T8W5N6J2: 'pro',
  // Super likes codes (random alphanumeric)
  B4H7L9C1F6: 'superlikes',
  Y2V5Z8D3G7: 'superlikes',
  POLIS: 'superlikes' // Special code for 10 superlikes
};

// Validate and redeem a code
export async function redeemCode(
  userId: string,
  code: string
): Promise<{ success: boolean; type?: 'pro' | 'superlikes'; error?: string }> {
  const upperCode = code.trim().toUpperCase();

  // First check if it's a valid code from our list
  const codeType = VALID_REDEEM_CODES[upperCode];
  if (!codeType) {
    return { success: false, error: 'Invalid code' };
  }

  // Check if code was already used (in Firebase)
  const codeRef = doc(db, 'redeemCodes', upperCode);
  const codeDoc = await getDoc(codeRef);

  if (codeDoc.exists()) {
    const codeData = codeDoc.data() as RedeemCode;
    if (codeData.used) {
      return { success: false, error: 'This code has already been used' };
    }
  }

  // Mark code as used in Firebase
  await setDoc(codeRef, {
    code: upperCode,
    type: codeType,
    used: true,
    usedBy: userId,
    usedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  });

  // Apply the reward
  if (codeType === 'pro') {
    await purchasePremiumWithSuperLikes(userId);
    return { success: true, type: 'pro' };
  } else if (codeType === 'superlikes') {
    // All superlike codes (including POLIS) give 5 superlikes
    await addSuperLikes(userId, 5);
    return { success: true, type: 'superlikes' };
  }

  return { success: false, error: 'Unknown code type' };
}

// =====================================
// PRO SUPER LIKES (15/month, 1/day renewable)
// =====================================

// Purchase premium subscription with proper super likes (15/month, not unlimited)
export async function purchasePremiumWithSuperLikes(userId: string): Promise<void> {
  const subRef = doc(db, 'userSubscriptions', userId);
  const creditsRef = doc(db, 'userCredits', userId);

  await getUserSubscription(userId); // Ensure initialized
  await getUserCredits(userId); // Ensure initialized

  const now = new Date();
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month

  // Update subscription - NOT unlimited super likes anymore
  await updateDoc(subRef, {
    isPremium: true,
    premiumExpiresAt: Timestamp.fromDate(expiresAt),
    // Premium benefits - but NOT unlimitedSuperLikes
    unlimitedSuperLikes: false, // Changed to false!
    canSeeWhoLikedYou: true,
    unlimitedRewinds: true,
    priorityInDiscovery: true,
    advancedFilters: true,
    // Premium includes ad-free
    isAdFree: true,
    adFreeExpiresAt: Timestamp.fromDate(expiresAt),
    // Pro super likes tracking
    proSuperLikesRemaining: 15,
    proSuperLikesResetAt: Timestamp.fromDate(expiresAt),
    lastProSuperLikeUsed: null
  });

  // Also sync userCredits.superLikes to 15 so all UI shows same count
  await updateDoc(creditsRef, {
    superLikes: 15
  });
}

// Check if Pro user can use a super like (1 per day, 15 per month)
export async function canUseProSuperLike(
  userId: string
): Promise<{ canUse: boolean; reason?: string; remaining?: number }> {
  const subRef = doc(db, 'userSubscriptions', userId);
  const subDoc = await getDoc(subRef);

  if (!subDoc.exists()) {
    return { canUse: false, reason: 'No subscription found' };
  }

  const sub = subDoc.data();

  if (!sub.isPremium) {
    return { canUse: false, reason: 'Not a Pro user' };
  }

  const now = new Date();

  // Check if monthly reset is needed
  if (sub.proSuperLikesResetAt && sub.proSuperLikesResetAt.toDate() < now) {
    // Reset monthly super likes
    const newResetAt = new Date();
    newResetAt.setMonth(newResetAt.getMonth() + 1);
    await updateDoc(subRef, {
      proSuperLikesRemaining: 15,
      proSuperLikesResetAt: Timestamp.fromDate(newResetAt),
      lastProSuperLikeUsed: null
    });
    return { canUse: true, remaining: 15 };
  }

  // Check remaining super likes
  const remaining = sub.proSuperLikesRemaining ?? 15;
  if (remaining <= 0) {
    return { canUse: false, reason: 'No Pro super likes remaining this month', remaining: 0 };
  }

  // Check if already used one today (1 per day limit)
  if (sub.lastProSuperLikeUsed) {
    const lastUsed = sub.lastProSuperLikeUsed.toDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastUsed.setHours(0, 0, 0, 0);

    if (lastUsed.getTime() === today.getTime()) {
      return { canUse: false, reason: 'You can only use 1 Pro super like per day. Try again tomorrow!', remaining };
    }
  }

  return { canUse: true, remaining };
}

// Use a Pro super like
export async function useProSuperLike(userId: string): Promise<boolean> {
  const check = await canUseProSuperLike(userId);
  if (!check.canUse) {
    return false;
  }

  const subRef = doc(db, 'userSubscriptions', userId);
  const creditsRef = doc(db, 'userCredits', userId);

  // Update both subscription and credits to keep them in sync
  await updateDoc(subRef, {
    proSuperLikesRemaining: increment(-1),
    lastProSuperLikeUsed: serverTimestamp()
  });

  // Also decrement userCredits.superLikes to keep UI in sync
  await updateDoc(creditsRef, {
    superLikes: increment(-1)
  });

  return true;
}

// Purchase premium subscription (legacy - redirects to new function)
export async function purchasePremium(userId: string): Promise<void> {
  await purchasePremiumWithSuperLikes(userId);
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
