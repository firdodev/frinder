/**
 * Database Models - Centralized type definitions for all Firebase collections
 * 
 * This file contains all TypeScript interfaces that represent documents
 * stored in Firebase Firestore. Use these types throughout the application
 * for type safety and consistency.
 */

import { Timestamp } from 'firebase/firestore';

// =====================================
// COLLECTION NAMES (for consistency)
// =====================================

export const COLLECTIONS = {
  USERS: 'users',
  USERNAMES: 'usernames',
  MATCHES: 'matches',
  MESSAGES: 'messages', // Subcollection of matches
  SWIPES: 'swipes',
  SUPER_LIKES: 'superLikes',
  GROUPS: 'groups',
  GROUP_MESSAGES: 'messages', // Subcollection of groups
  CALLS: 'calls',
  ICE_CANDIDATES: 'iceCandidates', // Subcollection of calls
  PURCHASES: 'purchases',
  REDEEM_CODES: 'redeemCodes',
} as const;

// =====================================
// USER MODELS
// =====================================

/**
 * User Profile - Main user document in 'users' collection
 */
export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  firstName: string;
  displayName: string;
  bio: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  city: string;
  country: string;
  university?: string;
  photos: string[];
  interests: string[];
  lookingFor: 'people' | 'groups' | 'both';
  relationshipGoal: 'relationship' | 'casual' | 'friends';
  createdAt: Date | Timestamp;
  isProfileComplete: boolean;
  isEmailVerified: boolean;
  emailNotifications?: boolean;
  // Online status
  isOnline?: boolean;
  lastSeen?: Timestamp;
  // Admin/moderation
  isBanned?: boolean;
  isPremium?: boolean;
}

/**
 * Username document in 'usernames' collection
 * Used for fast username uniqueness lookups
 */
export interface UsernameDoc {
  uid: string;
  username: string;
  createdAt: Timestamp;
}

/**
 * User Credits - Stored in user document or separate collection
 */
export interface UserCredits {
  superLikes: number;
  lastFreeSuperLike: Timestamp | null;
  totalSuperLikesPurchased: number;
  swipeCount: number;
  lastSwipeCountReset: Timestamp | null;
}

/**
 * User Subscription - Premium membership status
 */
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

// =====================================
// MATCHING MODELS
// =====================================

/**
 * Swipe record in 'swipes' collection
 */
export interface Swipe {
  fromUserId: string;
  toUserId: string;
  direction: 'left' | 'right' | 'superlike';
  timestamp: Timestamp;
}

/**
 * Match document in 'matches' collection
 */
export interface Match {
  id: string;
  users: string[];
  userProfiles: Record<string, Partial<UserProfile>>;
  createdAt: Timestamp;
  lastMessage?: string;
  lastMessageTime?: Timestamp;
}

/**
 * Message document in 'matches/{matchId}/messages' subcollection
 */
export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  read: boolean;
  // Optional fields for different message types
  type?: 'text' | 'image' | 'gif';
  imageUrl?: string;
  gifUrl?: string;
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
  };
}

/**
 * Date Request - For scheduling dates within matches
 */
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

// =====================================
// GROUP MODELS
// =====================================

/**
 * Group document in 'groups' collection
 */
export interface Group {
  id: string;
  name: string;
  description: string;
  photo: string;
  creatorId: string;
  members: string[];
  memberProfiles: Record<string, Partial<UserProfile>>;
  interests: string[];
  activity: string;
  location?: string;
  isPrivate: boolean;
  pendingMembers?: string[];
  pendingMemberProfiles?: Record<string, Partial<UserProfile>>;
  createdAt: Timestamp;
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  lastMessageSender?: string;
}

/**
 * Group Message document in 'groups/{groupId}/messages' subcollection
 */
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

// =====================================
// CALL MODELS
// =====================================

/**
 * Call document in 'calls' collection
 */
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

/**
 * ICE Candidate in 'calls/{callId}/iceCandidates' subcollection
 */
export interface IceCandidate {
  id: string;
  candidate: RTCIceCandidateInit;
  fromUserId: string;
  timestamp: Timestamp;
}

// =====================================
// PURCHASE/PAYMENT MODELS
// =====================================

/**
 * Purchase record in 'purchases' collection
 */
export interface Purchase {
  id: string;
  userId: string;
  type: 'superlikes' | 'premium' | 'ad_free';
  amount: number;
  price: number;
  currency: string;
  provider: 'whop' | 'stripe' | 'redeem';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  checkoutId?: string;
  membershipId?: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

/**
 * Redeem code in 'redeemCodes' collection
 */
export interface RedeemCode {
  code: string;
  type: 'pro' | 'superlikes';
  used: boolean;
  usedBy?: string;
  usedAt?: Timestamp;
  createdAt: Timestamp;
}

// =====================================
// NOTIFICATION MODELS
// =====================================

/**
 * Notification document (if using a notifications collection)
 */
export interface Notification {
  id: string;
  userId: string;
  type: 'match' | 'message' | 'superlike' | 'group_invite' | 'date_request' | 'system';
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: Timestamp;
}

// =====================================
// ADMIN MODELS
// =====================================

/**
 * User data as displayed in admin panel
 */
export interface AdminUserData {
  id: string;
  username: string;
  firstName: string;
  email: string;
  gender?: string;
  photos?: string[];
  isEmailVerified?: boolean;
  isOnline?: boolean;
  lastSeen?: Timestamp;
  createdAt?: Timestamp;
  bio?: string;
  isBanned?: boolean;
  isPremium?: boolean;
}

/**
 * Admin dashboard statistics
 */
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  maleUsers: number;
  femaleUsers: number;
  otherGender: number;
  completeProfiles: number;
  incompleteProfiles: number;
  premiumUsers: number;
  bannedUsers: number;
  totalMatches: number;
  todaySignups: number;
  weeklySignups: number;
  avgPhotosPerUser: number;
}

// =====================================
// HELPER TYPES
// =====================================

/**
 * Generic document with Firestore ID
 */
export type WithId<T> = T & { id: string };

/**
 * Partial update type for any model
 */
export type PartialUpdate<T> = Partial<Omit<T, 'id' | 'createdAt'>>;

/**
 * Create input type (without auto-generated fields)
 */
export type CreateInput<T> = Omit<T, 'id' | 'createdAt'>;

/**
 * Timestamp or Date union type
 */
export type FirebaseDate = Date | Timestamp;

/**
 * Gender options
 */
export type Gender = 'male' | 'female' | 'other';

/**
 * Looking for options
 */
export type LookingFor = 'people' | 'groups' | 'both';

/**
 * Relationship goal options
 */
export type RelationshipGoal = 'relationship' | 'casual' | 'friends';

/**
 * Swipe direction options
 */
export type SwipeDirection = 'left' | 'right' | 'superlike';

/**
 * Call status options
 */
export type CallStatus = 'ringing' | 'ongoing' | 'ended' | 'missed' | 'declined';

/**
 * Date request status options
 */
export type DateRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

/**
 * Purchase status options
 */
export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/**
 * Message type options
 */
export type MessageType = 'text' | 'image' | 'gif';

/**
 * Notification type options
 */
export type NotificationType = 'match' | 'message' | 'superlike' | 'group_invite' | 'date_request' | 'system';
