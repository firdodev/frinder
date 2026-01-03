'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  Send,
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MoreVertical,
  Image as ImageIcon,
  Smile,
  Heart,
  Sparkles,
  Loader2,
  Check,
  CheckCheck,
  UserX,
  X,
  ZoomIn,
  Reply,
  CornerDownLeft,
  Users,
  Crown,
  LogOut,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToMatches,
  subscribeToUnmatchedConversations,
  subscribeToMessages,
  sendMessage,
  markMessagesAsRead,
  subscribeToUserPresence,
  unmatchUser,
  createCall,
  answerCall,
  endCall,
  addIceCandidate,
  subscribeToCall,
  subscribeToIceCandidates,
  subscribeToIncomingCalls,
  updateTypingStatus,
  subscribeToTypingStatus,
  subscribeToUserGroups,
  getGroupMembers,
  removeGroupMember,
  leaveGroup,
  subscribeToGroupMessages,
  sendGroupMessage,
  type Match as FirebaseMatch,
  type Message as FirebaseMessage,
  type CallData,
  type Group as FirebaseGroup,
  type GroupMessage as FirebaseGroupMessage
} from '@/lib/firebaseServices';
import { uploadMessageImage, compressImage } from '@/lib/storageService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  type: 'text' | 'image';
  imageUrl?: string;
  isRead: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
  };
}

interface Match {
  id: string;
  odMatchId: string;
  name: string;
  photo: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isOnline: boolean;
  isNewMatch?: boolean;
  isUnmatched?: boolean;
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 1000 * 60 * 60) {
    const minutes = Math.floor(diff / (1000 * 60));
    return minutes === 0 ? 'Just now' : `${minutes}m ago`;
  } else if (diff < 1000 * 60 * 60 * 24) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// WebRTC configuration
const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

// Voice Call Component
interface VoiceCallProps {
  callId: string | null;
  callData: CallData | null;
  isIncoming: boolean;
  currentUserId: string;
  matchName: string;
  matchPhoto: string;
  onClose: () => void;
}

function VoiceCall({ callId, callData, isIncoming, currentUserId, matchName, matchPhoto, onClose }: VoiceCallProps) {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connecting' | 'ongoing' | 'ended'>('ringing');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize WebRTC for outgoing call
  const initializeOutgoingCall = useCallback(async () => {
    if (!callId) return;

    try {
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      // Create peer connection
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // Add local stream tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && callId) {
          addIceCandidate(callId, event.candidate.toJSON(), currentUserId);
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      // Connection state changes
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setCallStatus('ongoing');
          callStartTimeRef.current = Date.now();
          durationIntervalRef.current = setInterval(() => {
            if (callStartTimeRef.current) {
              setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
            }
          }, 1000);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          handleEndCall();
        }
      };

      // Create and set local offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      setCallStatus('connecting');
    } catch (error) {
      console.error('Error initializing call:', error);
      toast.error('Could not access microphone');
      handleEndCall();
    }
  }, [callId, currentUserId]);

  // Initialize WebRTC for incoming call
  const initializeIncomingCall = useCallback(async () => {
    if (!callId || !callData?.offer) return;

    try {
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      // Create peer connection
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // Add local stream tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && callId) {
          addIceCandidate(callId, event.candidate.toJSON(), currentUserId);
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      // Connection state changes
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setCallStatus('ongoing');
          callStartTimeRef.current = Date.now();
          durationIntervalRef.current = setInterval(() => {
            if (callStartTimeRef.current) {
              setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
            }
          }, 1000);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          handleEndCall();
        }
      };

      // Set remote description and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer to Firebase
      await answerCall(callId, answer);
      setCallStatus('connecting');
    } catch (error) {
      console.error('Error answering call:', error);
      toast.error('Could not access microphone');
      handleEndCall();
    }
  }, [callId, callData, currentUserId]);

  // Handle incoming answer (for caller)
  useEffect(() => {
    if (!isIncoming && callData?.answer && peerConnectionRef.current && 
        peerConnectionRef.current.signalingState === 'have-local-offer') {
      peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(callData.answer));
    }
  }, [callData?.answer, isIncoming]);

  // Subscribe to ICE candidates
  useEffect(() => {
    if (!callId) return;

    const unsubscribe = subscribeToIceCandidates(callId, currentUserId, (iceCandidate) => {
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(iceCandidate.candidate));
      }
    });

    return () => unsubscribe();
  }, [callId, currentUserId]);

  // Monitor call status changes
  useEffect(() => {
    if (callData?.status === 'ended' || callData?.status === 'declined' || callData?.status === 'missed') {
      handleEndCall();
    }
  }, [callData?.status]);

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle speaker (on mobile this would switch audio output)
  const toggleSpeaker = () => {
    setIsSpeaker(!isSpeaker);
    // Note: Web Audio API doesn't directly support speaker switching
    // This is a visual toggle for now
  };

  // Answer incoming call
  const handleAnswer = () => {
    initializeIncomingCall();
  };

  // Decline incoming call
  const handleDecline = async () => {
    if (callId) {
      await endCall(callId, 'declined');
    }
    handleEndCall();
  };

  // End call
  const handleEndCall = async () => {
    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Update Firebase
    if (callId && callStatus !== 'ended') {
      await endCall(callId);
    }

    setCallStatus('ended');
    onClose();
  };

  return (
    <motion.div
      className='fixed inset-0 z-50 bg-black flex flex-col items-center justify-center'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Hidden audio element for remote audio */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Background pattern */}
      <div className='absolute inset-0 opacity-10'>
        <div className='absolute inset-0' style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #ed8c00 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Call UI */}
      <div className='relative z-10 flex flex-col items-center'>
        {/* Avatar with pulse animation during ringing/connecting */}
        <motion.div
          className='relative mb-6'
          animate={callStatus === 'ringing' || callStatus === 'connecting' ? {
            scale: [1, 1.05, 1],
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {(callStatus === 'ringing' || callStatus === 'connecting') && (
            <>
              <motion.div
                className='absolute inset-0 rounded-full bg-frinder-orange'
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ margin: -20 }}
              />
              <motion.div
                className='absolute inset-0 rounded-full bg-frinder-orange'
                animate={{ scale: [1, 1.3], opacity: [0.3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                style={{ margin: -10 }}
              />
            </>
          )}
          <Avatar className='w-32 h-32 border-4 border-frinder-orange'>
            <AvatarImage src={matchPhoto} alt={matchName} />
            <AvatarFallback className='bg-frinder-orange text-white text-4xl'>{matchName[0]}</AvatarFallback>
          </Avatar>
        </motion.div>

        {/* Name */}
        <h2 className='text-2xl font-bold text-white mb-2'>{matchName}</h2>

        {/* Call status */}
        <div className='flex items-center gap-2 mb-8'>
          {callStatus === 'ringing' && isIncoming && (
            <>
              <PhoneIncoming className='w-5 h-5 text-green-400 animate-pulse' />
              <span className='text-white/70'>Incoming call...</span>
            </>
          )}
          {callStatus === 'ringing' && !isIncoming && (
            <>
              <PhoneOutgoing className='w-5 h-5 text-frinder-orange animate-pulse' />
              <span className='text-white/70'>Calling...</span>
            </>
          )}
          {callStatus === 'connecting' && (
            <>
              <Loader2 className='w-5 h-5 text-frinder-orange animate-spin' />
              <span className='text-white/70'>Connecting...</span>
            </>
          )}
          {callStatus === 'ongoing' && (
            <>
              <span className='w-2 h-2 rounded-full bg-green-500 animate-pulse' />
              <span className='text-white/70'>{formatDuration(callDuration)}</span>
            </>
          )}
        </div>

        {/* Call controls */}
        <div className='flex items-center gap-6'>
          {/* Incoming call controls */}
          {callStatus === 'ringing' && isIncoming && (
            <>
              <motion.button
                onClick={handleDecline}
                className='w-16 h-16 rounded-full bg-red-500 flex items-center justify-center'
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <PhoneOff className='w-7 h-7 text-white' />
              </motion.button>
              <motion.button
                onClick={handleAnswer}
                className='w-16 h-16 rounded-full bg-green-500 flex items-center justify-center'
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Phone className='w-7 h-7 text-white' />
              </motion.button>
            </>
          )}

          {/* Outgoing call controls (while ringing) */}
          {callStatus === 'ringing' && !isIncoming && (
            <motion.button
              onClick={handleEndCall}
              className='w-16 h-16 rounded-full bg-red-500 flex items-center justify-center'
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <PhoneOff className='w-7 h-7 text-white' />
            </motion.button>
          )}

          {/* Ongoing call controls */}
          {(callStatus === 'ongoing' || callStatus === 'connecting') && (
            <>
              <motion.button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isMuted ? 'bg-red-500' : 'bg-white/20'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {isMuted ? (
                  <MicOff className='w-6 h-6 text-white' />
                ) : (
                  <Mic className='w-6 h-6 text-white' />
                )}
              </motion.button>
              
              <motion.button
                onClick={handleEndCall}
                className='w-16 h-16 rounded-full bg-red-500 flex items-center justify-center'
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <PhoneOff className='w-7 h-7 text-white' />
              </motion.button>

              <motion.button
                onClick={toggleSpeaker}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isSpeaker ? 'bg-frinder-orange' : 'bg-white/20'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {isSpeaker ? (
                  <Volume2 className='w-6 h-6 text-white' />
                ) : (
                  <VolumeX className='w-6 h-6 text-white' />
                )}
              </motion.button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Swipeable message bubble component
interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  matchName: string;
  onReply: () => void;
  onViewImage: () => void;
  swipeDirection: number;
  onScrollToMessage?: (messageId: string) => void;
}

function MessageBubble({ message, isOwn, matchName, onReply, onViewImage, swipeDirection, onScrollToMessage }: MessageBubbleProps) {
  const x = useMotionValue(0);
  const [showReplyIndicator, setShowReplyIndicator] = useState(false);
  
  // Calculate opacity for reply indicator based on swipe distance
  const replyIndicatorOpacity = useTransform(
    x,
    isOwn ? [-60, -30, 0] : [0, 30, 60],
    isOwn ? [1, 0.5, 0] : [0, 0.5, 1]
  );

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    const offset = info.offset.x;
    
    // Trigger reply if swiped past threshold
    if ((isOwn && offset < -threshold) || (!isOwn && offset > threshold)) {
      onReply();
    }
    
    // Reset indicator
    setShowReplyIndicator(false);
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 30;
    const offset = info.offset.x;
    setShowReplyIndicator((isOwn && offset < -threshold) || (!isOwn && offset > threshold));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} relative group px-2 overflow-x-hidden`}
    >
      {/* Reply indicator for non-own messages (left side) */}
      {!isOwn && (
        <motion.div
          style={{ opacity: replyIndicatorOpacity }}
          className='absolute left-2 top-1/2 -translate-y-1/2 -translate-x-6 pointer-events-none'
        >
          <Reply className='w-5 h-5 text-frinder-orange' />
        </motion.div>
      )}
      
      {/* Desktop reply button - appears on hover */}
      <button
        onClick={onReply}
        className={`hidden sm:flex absolute top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted dark:bg-gray-800 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/80 dark:hover:bg-gray-700 z-10 ${
          isOwn ? 'right-[calc(100%-8px)]' : 'left-[calc(100%-8px)]'
        }`}
      >
        <Reply className='w-4 h-4 text-muted-foreground' />
      </button>

      {/* Swipeable container */}
      <motion.div
        drag='x'
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        dragSnapToOrigin={true}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className='max-w-[80%] sm:max-w-[75%] touch-pan-y'
      >
        {/* Reply preview if this message is replying to another - clickable to scroll */}
        {message.replyTo && (
          <div 
            onClick={() => message.replyTo?.id && onScrollToMessage?.(message.replyTo.id)}
            className={`mb-1 px-2 py-1 rounded-lg text-xs overflow-hidden cursor-pointer transition-opacity hover:opacity-80 active:opacity-60 ${
              isOwn 
                ? 'bg-frinder-burnt/30 border-l-2 border-white/50' 
                : 'bg-muted/50 dark:bg-gray-800/50 border-l-2 border-frinder-orange'
            }`}
          >
            <span className='font-medium text-[10px] block truncate'>
              {message.replyTo.senderId === (isOwn ? 'You' : matchName) ? 'You' : matchName}
            </span>
            <span className='opacity-70 line-clamp-1 break-all'>{message.replyTo.text}</span>
          </div>
        )}
        
        <div
          className={`rounded-2xl overflow-hidden ${
            isOwn
              ? 'bg-frinder-orange text-white rounded-br-sm'
              : 'bg-muted dark:bg-gray-900 text-foreground dark:text-white rounded-bl-sm'
          } ${message.type === 'image' ? 'p-1' : 'px-3 sm:px-4 py-2'}`}
        >
          {/* Image message */}
          {message.type === 'image' && message.imageUrl && (
            <div 
              className='cursor-pointer relative group/image'
              onClick={onViewImage}
            >
              <img 
                src={message.imageUrl} 
                alt='Shared image' 
                className='rounded-xl max-w-full max-h-64 object-cover'
              />
              <div className='absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-colors rounded-xl flex items-center justify-center opacity-0 group-hover/image:opacity-100'>
                <ZoomIn className='w-8 h-8 text-white drop-shadow-lg' />
              </div>
            </div>
          )}
          
          {/* Text message */}
          {message.type === 'text' && message.text && (
            <p className='text-sm sm:text-base'>{message.text}</p>
          )}
          
          <div
            className={`flex items-center gap-1 justify-end mt-1 ${
              message.type === 'image' ? 'px-2 pb-1' : ''
            } ${
              isOwn ? 'text-white/70' : 'text-muted-foreground'
            }`}
          >
            <span className='text-[10px] sm:text-xs'>
              {formatTime(message.timestamp)}
            </span>
            {isOwn && (
              message.isRead ? (
                <CheckCheck className='w-3.5 h-3.5 text-blue-300' />
              ) : (
                <Check className='w-3.5 h-3.5' />
              )
            )}
          </div>
        </div>
      </motion.div>

      {/* Reply indicator for own messages (right side) */}
      {isOwn && (
        <motion.div
          style={{ opacity: replyIndicatorOpacity }}
          className='absolute right-2 top-1/2 -translate-y-1/2 translate-x-6 pointer-events-none'
        >
          <Reply className='w-5 h-5 text-frinder-orange' />
        </motion.div>
      )}
    </motion.div>
  );
}

interface ChatViewProps {
  match: Match;
  currentUserId: string;
  currentUserName: string;
  currentUserPhoto: string;
  onBack: () => void;
  onUnmatch: (matchId: string) => void;
}

function ChatView({ match, currentUserId, currentUserName, currentUserPhoto, onBack, onUnmatch }: ChatViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(match.isOnline);
  const [lastSeen, setLastSeen] = useState<Date | undefined>();
  const [showMenu, setShowMenu] = useState(false);
  const [showUnmatchDialog, setShowUnmatchDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  // Typing indicator state
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Voice call state
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [activeCallData, setActiveCallData] = useState<CallData | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Subscribe to other user's typing status
  useEffect(() => {
    if (!match.id || !match.odMatchId || match.isUnmatched) return;
    
    const unsubscribe = subscribeToTypingStatus(match.id, match.odMatchId, (isTyping) => {
      setIsOtherUserTyping(isTyping);
    });

    return () => unsubscribe();
  }, [match.id, match.odMatchId, match.isUnmatched]);

  // Handle typing indicator - update when user types
  const handleTyping = useCallback(() => {
    if (match.isUnmatched) return;
    
    // Update typing status
    updateTypingStatus(match.id, currentUserId, true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to clear typing status after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(match.id, currentUserId, false);
    }, 3000);
  }, [match.id, match.isUnmatched, currentUserId]);

  // Cleanup typing status on unmount or when leaving chat
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (match.id && currentUserId) {
        updateTypingStatus(match.id, currentUserId, false);
      }
    };
  }, [match.id, currentUserId]);

  // Subscribe to active call state
  useEffect(() => {
    if (!activeCallId) return;
    
    const unsubscribe = subscribeToCall(activeCallId, (callData) => {
      setActiveCallData(callData);
      if (callData?.status === 'ended' || callData?.status === 'declined' || callData?.status === 'missed') {
        setShowVoiceCall(false);
        setActiveCallId(null);
        setActiveCallData(null);
      }
    });

    return () => unsubscribe();
  }, [activeCallId]);

  // Initiate a voice call
  const initiateCall = async () => {
    try {
      // Get audio stream first to ensure permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      // Create peer connection and offer
      const pc = new RTCPeerConnection(rtcConfig);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Stop stream temporarily (will be recreated in VoiceCall component)
      stream.getTracks().forEach(track => track.stop());
      pc.close();

      // Create call in Firebase
      const callId = await createCall(
        currentUserId,
        currentUserName,
        currentUserPhoto,
        match.odMatchId,
        match.name,
        match.photo,
        match.id,
        offer
      );

      setActiveCallId(callId);
      setIsIncomingCall(false);
      setShowVoiceCall(true);
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error('Could not start call. Please check microphone permissions.');
    }
  };

  // Scroll to a specific message
  const scrollToMessage = (messageId: string) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the message briefly
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 1500);
    }
  };

  // Subscribe to other user's online status
  useEffect(() => {
    if (!match.odMatchId) return;
    
    const unsubscribe = subscribeToUserPresence(match.odMatchId, (online, seen) => {
      setIsOnline(online);
      setLastSeen(seen);
    });

    return () => unsubscribe();
  }, [match.odMatchId]);

  // Subscribe to messages for this match
  useEffect(() => {
    if (!match.id) return;

    setLoading(true);
    const unsubscribe = subscribeToMessages(match.id, (firebaseMessages: FirebaseMessage[]) => {
      const mappedMessages: Message[] = firebaseMessages.map(m => ({
        id: m.id,
        senderId: m.senderId,
        text: m.text,
        timestamp: m.timestamp instanceof Date ? m.timestamp : m.timestamp.toDate(),
        type: (m as any).type === 'image' ? 'image' : 'text',
        imageUrl: (m as any).imageUrl,
        isRead: m.read,
        replyTo: (m as any).replyTo
      }));
      setMessages(mappedMessages);
      setLoading(false);

      // Mark messages as read
      const unreadMessages = firebaseMessages.filter(m => !m.read && m.senderId !== currentUserId);
      if (unreadMessages.length > 0) {
        markMessagesAsRead(match.id, currentUserId);
      }
    });

    return () => unsubscribe();
  }, [match.id, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedImage) || sending || uploadingImage) return;

    try {
      setSending(true);
      
      // Prepare reply data if replying
      const replyData = replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.type === 'image' ? '📷 Photo' : replyingTo.text,
        senderId: replyingTo.senderId
      } : undefined;
      
      if (selectedImage) {
        // Send image message
        setUploadingImage(true);
        const compressedImage = await compressImage(selectedImage, 800, 0.7);
        const imageUrl = await uploadMessageImage(match.id, currentUserId, compressedImage);
        await sendMessage(match.id, currentUserId, '', imageUrl, replyData);
        clearSelectedImage();
      } else {
        // Send text message
        await sendMessage(match.id, currentUserId, newMessage.trim(), undefined, replyData);
        setNewMessage('');
      }
      
      // Clear reply state
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
      setUploadingImage(false);
    }
  };

  // Handle reply to a message
  const handleReply = useCallback((message: Message) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  }, []);

  // Cancel reply
  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleUnmatch = async () => {
    try {
      await unmatchUser(match.id);
      toast.success('Successfully unmatched');
      onUnmatch(match.id);
      onBack();
    } catch (error) {
      toast.error('Failed to unmatch');
    }
    setShowUnmatchDialog(false);
  };

  const getStatusText = () => {
    if (isOnline) return 'Online';
    if (lastSeen) {
      const diff = Date.now() - lastSeen.getTime();
      if (diff < 60000) return 'Last seen just now';
      if (diff < 3600000) return `Last seen ${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `Last seen ${Math.floor(diff / 3600000)}h ago`;
      return `Last seen ${lastSeen.toLocaleDateString()}`;
    }
    return 'Offline';
  };

  return (
    <div className='h-full flex flex-col bg-background dark:bg-black'>
      {/* Voice Call UI */}
      <AnimatePresence>
        {showVoiceCall && (
          <VoiceCall
            callId={activeCallId}
            callData={activeCallData}
            isIncoming={isIncomingCall}
            currentUserId={currentUserId}
            matchName={match.name}
            matchPhoto={match.photo}
            onClose={() => {
              setShowVoiceCall(false);
              setActiveCallId(null);
              setActiveCallData(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Unmatch Dialog */}
      <Dialog open={showUnmatchDialog} onOpenChange={setShowUnmatchDialog}>
        <DialogContent className='dark:bg-black dark:border-gray-800'>
          <DialogHeader>
            <DialogTitle className='dark:text-white'>Unmatch {match.name}?</DialogTitle>
            <DialogDescription>
              This will remove your match and all messages. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className='flex gap-3 mt-4'>
            <Button variant='outline' onClick={() => setShowUnmatchDialog(false)} className='flex-1'>
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleUnmatch} className='flex-1'>
              Unmatch
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat header */}
      <div className='px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 border-b bg-white dark:bg-black dark:border-gray-800'>
        <button onClick={onBack} className='p-1 hover:bg-muted dark:hover:bg-gray-800 rounded-full'>
          <ChevronLeft className='w-5 h-5 sm:w-6 sm:h-6 dark:text-white' />
        </button>
        <div className='relative'>
          <Avatar className={`w-9 h-9 sm:w-10 sm:h-10 ${match.isUnmatched ? 'grayscale' : ''}`}>
            <AvatarImage src={match.photo} alt={match.name} />
            <AvatarFallback className={match.isUnmatched ? 'bg-gray-400 text-white' : 'bg-frinder-orange text-white'}>{match.name[0]}</AvatarFallback>
          </Avatar>
          {isOnline && !match.isUnmatched && (
            <span className='absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 border-2 border-white dark:border-black' />
          )}
        </div>
        <div className='flex-1'>
          <div className='flex items-center gap-2'>
            <h3 className='font-semibold text-sm sm:text-base dark:text-white'>{match.name}</h3>
            {match.isUnmatched && (
              <Badge variant='outline' className='text-[10px] border-gray-300 dark:border-gray-700 text-gray-500'>
                Unmatched
              </Badge>
            )}
          </div>
          <p className={`text-[10px] sm:text-xs ${match.isUnmatched ? 'text-gray-400' : isOnline ? 'text-green-500' : 'text-muted-foreground'}`}>
            {match.isUnmatched ? 'Chat disabled' : getStatusText()}
          </p>
        </div>
        {!match.isUnmatched && (
        <div className='flex items-center gap-1 sm:gap-2'>
          <button 
            onClick={initiateCall}
            className='p-1.5 sm:p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-full hover:text-frinder-orange transition-colors'
          >
            <Phone className='w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground' />
          </button>
          <div className='relative'>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className='p-1.5 sm:p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-full'
            >
              <MoreVertical className='w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground' />
            </button>
            {showMenu && (
              <div className='absolute right-0 top-full mt-1 bg-white dark:bg-black rounded-lg shadow-lg border dark:border-gray-800 py-1 min-w-[150px] z-50'>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowUnmatchDialog(true);
                  }}
                  className='w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2'
                >
                  <UserX className='w-4 h-4' />
                  Unmatch
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Messages */}
      <div className='flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-3 sm:space-y-4'>
        {loading ? (
          <div className='flex items-center justify-center h-full'>
            <Loader2 className='w-8 h-8 animate-spin text-[#ed8c00]' />
          </div>
        ) : (
          <>
            {/* Match notification */}
            <div className='flex flex-col items-center py-4 sm:py-6'>
              <div className='relative mb-3 sm:mb-4'>
                <Avatar className='w-20 h-20 sm:w-24 sm:h-24 border-4 border-[#ed8c00]'>
                  <AvatarImage src={match.photo} alt={match.name} />
                  <AvatarFallback className='bg-[#ed8c00] text-white text-xl sm:text-2xl'>{match.name[0]}</AvatarFallback>
                </Avatar>
                <div className='absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#ed8c00] px-2.5 sm:px-3 py-1 rounded-full'>
                  <Heart className='w-3 h-3 sm:w-4 sm:h-4 text-white' fill='white' />
                </div>
              </div>
              <h3 className='font-bold text-base sm:text-lg mb-1 dark:text-white'>You matched with {match.name}!</h3>
              <p className='text-xs sm:text-sm text-muted-foreground text-center'>Say hi and start the conversation</p>
            </div>

            {/* Message bubbles */}
            {messages.map(message => {
              const isOwn = message.senderId === currentUserId;
              const swipeDirection = isOwn ? -1 : 1; // Swipe left for own, right for others
              
              return (
                <div 
                  key={message.id} 
                  ref={(el) => { messageRefs.current[message.id] = el; }}
                  className={`transition-all duration-300 ${highlightedMessageId === message.id ? 'bg-frinder-orange/20 rounded-xl -mx-2 px-2 py-1' : ''}`}
                >
                  <MessageBubble
                    message={message}
                    isOwn={isOwn}
                    matchName={match.name}
                    onReply={() => handleReply(message)}
                    onViewImage={() => setViewingImage(message.imageUrl!)}
                    swipeDirection={swipeDirection}
                    onScrollToMessage={scrollToMessage}
                  />
                </div>
              );
            })}
            
            {/* Typing Indicator */}
            <AnimatePresence>
              {isOtherUserTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className='flex items-center gap-2 mb-2'
                >
                  <Avatar className='w-6 h-6'>
                    <AvatarImage src={match.photo} alt={match.name} />
                    <AvatarFallback className='bg-frinder-orange text-white text-xs'>
                      {match.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className='bg-muted dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-2.5'>
                    <div className='flex items-center gap-1'>
                      <motion.span
                        className='w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500'
                        animate={{ 
                          y: [0, -4, 0],
                          opacity: [0.5, 1, 0.5]
                        }}
                        transition={{ 
                          duration: 0.8, 
                          repeat: Infinity,
                          delay: 0 
                        }}
                      />
                      <motion.span
                        className='w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500'
                        animate={{ 
                          y: [0, -4, 0],
                          opacity: [0.5, 1, 0.5]
                        }}
                        transition={{ 
                          duration: 0.8, 
                          repeat: Infinity,
                          delay: 0.2 
                        }}
                      />
                      <motion.span
                        className='w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500'
                        animate={{ 
                          y: [0, -4, 0],
                          opacity: [0.5, 1, 0.5]
                        }}
                        transition={{ 
                          duration: 0.8, 
                          repeat: Infinity,
                          delay: 0.4 
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4'
            onClick={() => setViewingImage(null)}
          >
            <button
              onClick={() => setViewingImage(null)}
              className='absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors'
            >
              <X className='w-6 h-6' />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={viewingImage}
              alt='Full size image'
              className='max-w-full max-h-full object-contain rounded-lg'
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input or Unmatched Notice */}
      {match.isUnmatched ? (
        <div className='p-3 sm:p-4 border-t bg-gray-100 dark:bg-gray-900 dark:border-gray-800 safe-bottom'>
          <div className='flex items-center justify-center gap-2 py-2 text-gray-500 dark:text-gray-400'>
            <UserX className='w-4 h-4' />
            <span className='text-sm'>This conversation has ended. You can no longer send messages.</span>
          </div>
        </div>
      ) : (
      <div className='p-3 sm:p-4 border-t bg-white dark:bg-black dark:border-gray-800 safe-bottom'>
        {/* Reply Preview */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className='mb-3'
            >
              <div className='flex items-center gap-2 px-3 py-2 bg-muted dark:bg-gray-900 rounded-lg border-l-4 border-frinder-orange'>
                <CornerDownLeft className='w-4 h-4 text-frinder-orange shrink-0' />
                <div className='flex-1 min-w-0'>
                  <span className='text-xs font-medium text-frinder-orange block'>
                    Replying to {replyingTo.senderId === currentUserId ? 'yourself' : match.name}
                  </span>
                  <span className='text-sm text-muted-foreground line-clamp-1'>
                    {replyingTo.type === 'image' ? '📷 Photo' : replyingTo.text}
                  </span>
                </div>
                <button
                  onClick={cancelReply}
                  className='w-6 h-6 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors'
                >
                  <X className='w-4 h-4 text-muted-foreground' />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image Preview */}
        <AnimatePresence>
          {imagePreview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className='mb-3 relative'
            >
              <div className='relative inline-block'>
                <img 
                  src={imagePreview} 
                  alt='Preview' 
                  className='h-24 rounded-lg object-cover'
                />
                <button
                  onClick={clearSelectedImage}
                  className='absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors'
                >
                  <X className='w-4 h-4' />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden file input */}
        <input
          ref={imageInputRef}
          type='file'
          accept='image/*'
          onChange={handleImageSelect}
          className='hidden'
        />

        <div className='flex items-center gap-1 sm:gap-2'>
          <button 
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadingImage}
            className='p-1.5 sm:p-2 hover:bg-muted dark:hover:bg-gray-900 rounded-full transition-colors'
          >
            {uploadingImage ? (
              <Loader2 className='w-5 h-5 sm:w-6 sm:h-6 text-frinder-orange animate-spin' />
            ) : (
              <ImageIcon className='w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground hover:text-frinder-orange transition-colors' />
            )}
          </button>
          <button className='p-1.5 sm:p-2 hover:bg-muted dark:hover:bg-gray-900 rounded-full'>
            <Smile className='w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground' />
          </button>
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={e => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={replyingTo ? `Reply to ${replyingTo.senderId === currentUserId ? 'yourself' : match.name}...` : selectedImage ? 'Add a caption...' : 'Type a message...'}
            className='flex-1 rounded-full text-sm dark:bg-gray-900 dark:border-gray-800 dark:text-white'
            disabled={sending || uploadingImage}
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={(!newMessage.trim() && !selectedImage) || sending || uploadingImage}
            className='w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-frinder-orange flex items-center justify-center disabled:opacity-50'
          >
            {sending || uploadingImage ? (
              <Loader2 className='w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin' />
            ) : (
              <Send className='w-4 h-4 sm:w-5 sm:h-5 text-white' />
            )}
          </motion.button>
        </div>
      </div>
      )}
    </div>
  );
}

// Group Chat View Props
interface GroupChatViewProps {
  group: FirebaseGroup;
  currentUserId: string;
  currentUserName: string;
  currentUserPhoto: string;
  onBack: () => void;
  onManageMembers: () => void;
}

// Group Chat View Component - Similar to ChatView but with member avatars like WhatsApp groups
function GroupChatView({ group, currentUserId, currentUserName, currentUserPhoto, onBack, onManageMembers }: GroupChatViewProps) {
  const [messages, setMessages] = useState<FirebaseGroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<FirebaseGroupMessage | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to group messages
  useEffect(() => {
    const unsubscribe = subscribeToGroupMessages(group.id, (msgs) => {
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [group.id]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedImage) || sending) return;

    setSending(true);

    try {
      let imageUrl: string | undefined;

      if (selectedImage) {
        setUploadingImage(true);
        const compressed = await compressImage(selectedImage);
        imageUrl = await uploadMessageImage(group.id, currentUserId, compressed);
        setSelectedImage(null);
        setUploadingImage(false);
      }

      await sendGroupMessage(
        group.id,
        currentUserId,
        currentUserName,
        currentUserPhoto,
        newMessage.trim() || (imageUrl ? '📷 Photo' : ''),
        imageUrl,
        replyingTo ? {
          id: replyingTo.id,
          text: replyingTo.text,
          senderId: replyingTo.senderId,
          senderName: replyingTo.senderName
        } : undefined
      );

      setNewMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending group message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleSwipeToReply = (message: FirebaseGroupMessage) => {
    setReplyingTo(message);
  };

  return (
    <div className='flex flex-col h-full bg-white dark:bg-black'>
      {/* Header */}
      <div className='flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-b dark:border-gray-800'>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className='p-1.5 sm:p-2 -ml-1 sm:-ml-2 rounded-full hover:bg-muted dark:hover:bg-gray-800'
        >
          <ChevronLeft className='w-5 h-5 sm:w-6 sm:h-6 dark:text-white' />
        </motion.button>

        <div className='relative'>
          <Avatar className='w-10 h-10 sm:w-12 sm:h-12'>
            <AvatarImage src={group.photo} alt={group.name} />
            <AvatarFallback className='bg-frinder-orange text-white'>
              <Users className='w-5 h-5' />
            </AvatarFallback>
          </Avatar>
        </div>

        <div className='flex-1 min-w-0'>
          <h2 className='font-semibold text-sm sm:text-base dark:text-white truncate'>{group.name}</h2>
          <p className='text-xs text-muted-foreground truncate'>
            {group.members?.length || 1} members
          </p>
        </div>

        <div className='relative'>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowMenu(!showMenu)}
            className='p-1.5 sm:p-2 rounded-full hover:bg-muted dark:hover:bg-gray-800'
          >
            <MoreVertical className='w-4 h-4 sm:w-5 sm:h-5 dark:text-white' />
          </motion.button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className='absolute right-0 top-full mt-1 bg-white dark:bg-black rounded-lg shadow-lg border dark:border-gray-800 py-1 min-w-[150px] z-50'
              >
                <button
                  onClick={() => { onManageMembers(); setShowMenu(false); }}
                  className='w-full px-4 py-2 text-left text-sm hover:bg-muted dark:hover:bg-gray-800 dark:text-white flex items-center gap-2'
                >
                  <Users className='w-4 h-4' />
                  View Members
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages Area */}
      <div className='flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4'>
        <AnimatePresence>
          {messages.map((message, index) => {
            const isOwn = message.senderId === currentUserId;
            const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.senderId !== message.senderId);
            const showName = !isOwn && showAvatar;

            return (
              <GroupMessageBubble
                key={message.id}
                message={message}
                isOwn={isOwn}
                showAvatar={showAvatar}
                showName={showName}
                onSwipeReply={() => handleSwipeToReply(message)}
                onImageClick={(url) => setPreviewImage(url)}
              />
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4'
            onClick={() => setPreviewImage(null)}
          >
            <motion.button
              className='absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30'
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className='w-6 h-6 text-white' />
            </motion.button>
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={previewImage}
              alt='Preview'
              className='max-w-full max-h-full object-contain rounded-lg'
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply Preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className='px-3 sm:px-4 py-2 border-t dark:border-gray-800 bg-muted/50 dark:bg-gray-900/50'
          >
            <div className='flex items-center gap-2'>
              <Reply className='w-4 h-4 text-frinder-orange' />
              <div className='flex-1 min-w-0'>
                <p className='text-xs font-medium text-frinder-orange'>{replyingTo.senderName}</p>
                <p className='text-xs text-muted-foreground truncate'>{replyingTo.text}</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className='p-1'>
                <X className='w-4 h-4 text-muted-foreground' />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Image Preview */}
      {selectedImage && (
        <div className='px-3 sm:px-4 py-2 border-t dark:border-gray-800'>
          <div className='relative inline-block'>
            <img
              src={URL.createObjectURL(selectedImage)}
              alt='Selected'
              className='h-20 rounded-lg object-cover'
            />
            <button
              onClick={() => setSelectedImage(null)}
              className='absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center'
            >
              <X className='w-4 h-4 text-white' />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className='p-3 sm:p-4 border-t dark:border-gray-800'>
        <div className='flex items-center gap-2'>
          <input
            type='file'
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept='image/*'
            className='hidden'
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => fileInputRef.current?.click()}
            className='p-2 rounded-full hover:bg-muted dark:hover:bg-gray-800'
            disabled={uploadingImage}
          >
            <ImageIcon className='w-5 h-5 text-muted-foreground' />
          </motion.button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder='Message group...'
            className='flex-1 rounded-full text-sm dark:bg-gray-900 dark:border-gray-800 dark:text-white'
            disabled={sending || uploadingImage}
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={(!newMessage.trim() && !selectedImage) || sending || uploadingImage}
            className='w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-frinder-orange flex items-center justify-center disabled:opacity-50'
          >
            {sending || uploadingImage ? (
              <Loader2 className='w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin' />
            ) : (
              <Send className='w-4 h-4 sm:w-5 sm:h-5 text-white' />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// Group Message Bubble Component - WhatsApp-style with small avatars
interface GroupMessageBubbleProps {
  message: FirebaseGroupMessage;
  isOwn: boolean;
  showAvatar: boolean;
  showName: boolean;
  onSwipeReply: () => void;
  onImageClick: (url: string) => void;
}

function GroupMessageBubble({ message, isOwn, showAvatar, showName, onSwipeReply, onImageClick }: GroupMessageBubbleProps) {
  const x = useMotionValue(0);
  const replyOpacity = useTransform(x, [0, 50], [0, 1]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 50) {
      onSwipeReply();
    }
  };

  const timestamp = message.timestamp?.toDate ? message.timestamp.toDate() : new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      {/* Reply indicator */}
      {!isOwn && (
        <motion.div style={{ opacity: replyOpacity }} className='flex-shrink-0'>
          <CornerDownLeft className='w-4 h-4 text-frinder-orange' />
        </motion.div>
      )}

      {/* Avatar for other users - WhatsApp style */}
      {!isOwn && (
        <div className='flex-shrink-0 w-7 h-7'>
          {showAvatar && (
            <Avatar className='w-7 h-7'>
              <AvatarImage src={message.senderPhoto} alt={message.senderName} />
              <AvatarFallback className='bg-frinder-orange text-white text-xs'>
                {message.senderName?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <motion.div
        drag='x'
        dragConstraints={{ left: 0, right: isOwn ? 0 : 80 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`max-w-[75%] ${isOwn ? 'order-1' : ''}`}
      >
        {/* Sender name for group messages */}
        {showName && (
          <p className='text-xs font-medium text-frinder-orange mb-1 ml-1'>
            {message.senderName}
          </p>
        )}

        <div
          className={`rounded-2xl px-3 py-2 ${
            isOwn
              ? 'bg-frinder-orange text-white rounded-br-md'
              : 'bg-muted dark:bg-gray-800 rounded-bl-md'
          }`}
        >
          {/* Reply preview */}
          {message.replyTo && (
            <div
              className={`mb-2 p-2 rounded-lg text-xs ${
                isOwn ? 'bg-white/20' : 'bg-black/5 dark:bg-white/10'
              }`}
            >
              <p className={`font-medium ${isOwn ? 'text-white/80' : 'text-frinder-orange'}`}>
                {message.replyTo.senderName}
              </p>
              <p className={isOwn ? 'text-white/70' : 'text-muted-foreground'}>
                {message.replyTo.text}
              </p>
            </div>
          )}

          {/* Image */}
          {message.type === 'image' && message.imageUrl && (
            <div className='mb-2 -mx-1 -mt-1'>
              <img
                src={message.imageUrl}
                alt='Shared'
                className='rounded-lg max-w-full cursor-pointer'
                onClick={() => onImageClick(message.imageUrl!)}
              />
            </div>
          )}

          {/* Text */}
          {message.text && message.text !== '📷 Photo' && (
            <p className={`text-sm ${isOwn ? 'text-white' : 'dark:text-white'}`}>
              {message.text}
            </p>
          )}

          {/* Timestamp */}
          <p
            className={`text-[10px] mt-1 ${
              isOwn ? 'text-white/70' : 'text-muted-foreground'
            }`}
          >
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </motion.div>

      {/* Reply indicator for own messages */}
      {isOwn && (
        <motion.div style={{ opacity: replyOpacity }} className='flex-shrink-0 order-0'>
          <CornerDownLeft className='w-4 h-4 text-frinder-orange' />
        </motion.div>
      )}
    </motion.div>
  );
}

export default function Messages() {
  const { user, userProfile } = useAuth();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  // Groups state
  const [userGroups, setUserGroups] = useState<FirebaseGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<FirebaseGroup | null>(null);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [showGroupMembersDialog, setShowGroupMembersDialog] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  // Incoming call state
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [showIncomingCall, setShowIncomingCall] = useState(false);

  // Subscribe to user's groups
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToUserGroups(user.uid, (groups) => {
      setUserGroups(groups);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Load group members when viewing group
  const handleViewGroupMembers = async (group: FirebaseGroup) => {
    setSelectedGroup(group);
    const members = await getGroupMembers(group.id);
    setGroupMembers(members);
    setShowGroupMembersDialog(true);
  };

  // Handle opening a group chat
  const handleOpenGroupChat = (group: FirebaseGroup) => {
    setSelectedGroup(group);
    setShowGroupChat(true);
    setSelectedMatch(null); // Close any open match chat
  };

  // Handle closing group chat
  const handleCloseGroupChat = () => {
    setShowGroupChat(false);
    setSelectedGroup(null);
  };

  // Handle removing a member (admin only)
  const handleRemoveMember = async (memberId: string) => {
    if (!selectedGroup || !user?.uid) return;
    setRemovingMember(memberId);
    try {
      await removeGroupMember(selectedGroup.id, memberId, user.uid);
      setGroupMembers(prev => prev.filter(m => m.uid !== memberId));
    } catch (error: any) {
      console.error('Error removing member:', error);
    } finally {
      setRemovingMember(null);
    }
  };

  // Handle leaving a group
  const handleLeaveGroup = async (groupId: string) => {
    if (!user?.uid) return;
    try {
      await leaveGroup(groupId, user.uid);
    } catch (error: any) {
      console.error('Error leaving group:', error);
    }
  };

  // Subscribe to incoming calls
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToIncomingCalls(user.uid, (call) => {
      if (call && call.status === 'ringing') {
        setIncomingCall(call);
        setShowIncomingCall(true);
      } else {
        setIncomingCall(null);
        setShowIncomingCall(false);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Handle answering incoming call
  const handleAnswerIncomingCall = () => {
    if (incomingCall) {
      // Find the match for this call
      const callMatch = matches.find(m => m.id === incomingCall.matchId);
      if (callMatch) {
        setSelectedMatch(callMatch);
      }
      setShowIncomingCall(false);
    }
  };

  // Handle declining incoming call
  const handleDeclineIncomingCall = async () => {
    if (incomingCall) {
      await endCall(incomingCall.id, 'declined');
      setIncomingCall(null);
      setShowIncomingCall(false);
    }
  };

  // Subscribe to matches from Firebase
  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    const unsubscribe = subscribeToMatches(user.uid, (firebaseMatches: FirebaseMatch[]) => {
      const mappedMatches: Match[] = firebaseMatches.map(m => {
        // Find the other user in the match
        const otherUserIndex = m.users[0] === user.uid ? 1 : 0;
        const otherUserId = m.users[otherUserIndex];
        const otherUserProfile = m.userProfiles?.[otherUserId];
        const otherUserName = otherUserProfile?.displayName || 'Unknown';
        const otherUserPhoto = otherUserProfile?.photos?.[0] || '';

        return {
          id: m.id,
          odMatchId: otherUserId,
          name: otherUserName,
          photo: otherUserPhoto,
          lastMessage: m.lastMessage,
          lastMessageTime: m.lastMessageTime instanceof Date ? m.lastMessageTime : m.lastMessageTime?.toDate(),
          unreadCount: (m as any).unreadCount?.[user.uid] || 0,
          isOnline: false,
          isNewMatch: !m.lastMessage,
          isUnmatched: false
        };
      });

      // Sort by last message time
      mappedMatches.sort((a, b) => {
        if (a.isNewMatch && !b.isNewMatch) return -1;
        if (!a.isNewMatch && b.isNewMatch) return 1;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      });

      setMatches(prev => {
        // Keep unmatched conversations and merge with active matches
        const unmatchedConvos = prev.filter(m => m.isUnmatched);
        return [...mappedMatches, ...unmatchedConvos];
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Subscribe to unmatched conversations
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToUnmatchedConversations(user.uid, (unmatchedMatches) => {
      const mappedUnmatched: Match[] = unmatchedMatches.map(m => {
        const otherUserIndex = m.users[0] === user.uid ? 1 : 0;
        const otherUserId = m.users[otherUserIndex];
        const otherUserProfile = m.userProfiles?.[otherUserId];
        const otherUserName = otherUserProfile?.displayName || 'Unknown';
        const otherUserPhoto = otherUserProfile?.photos?.[0] || '';

        return {
          id: m.id,
          odMatchId: otherUserId,
          name: otherUserName,
          photo: otherUserPhoto,
          lastMessage: m.lastMessage,
          lastMessageTime: m.lastMessageTime instanceof Date ? m.lastMessageTime : m.lastMessageTime?.toDate(),
          unreadCount: 0,
          isOnline: false,
          isNewMatch: false,
          isUnmatched: true
        };
      });

      setMatches(prev => {
        // Keep active matches and update unmatched conversations
        const activeMatches = prev.filter(m => !m.isUnmatched);
        return [...activeMatches, ...mappedUnmatched];
      });
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleUnmatch = (matchId: string) => {
    setMatches(prev => prev.filter(m => m.id !== matchId));
  };

  if (!user) {
    return (
      <div className='h-full flex items-center justify-center'>
        <p className='text-muted-foreground'>Please sign in to view messages</p>
      </div>
    );
  }

  if (selectedMatch) {
    return (
      <ChatView 
        match={selectedMatch} 
        currentUserId={user.uid}
        currentUserName={userProfile?.displayName || user.displayName || 'You'}
        currentUserPhoto={userProfile?.photos?.[0] || user.photoURL || '/placeholder-avatar.png'}
        onBack={() => setSelectedMatch(null)} 
        onUnmatch={handleUnmatch}
      />
    );
  }

  if (showGroupChat && selectedGroup) {
    return (
      <GroupChatView
        group={selectedGroup}
        currentUserId={user.uid}
        currentUserName={userProfile?.displayName || user.displayName || 'You'}
        currentUserPhoto={userProfile?.photos?.[0] || user.photoURL || '/placeholder-avatar.png'}
        onBack={handleCloseGroupChat}
        onManageMembers={() => handleViewGroupMembers(selectedGroup)}
      />
    );
  }

  // Get new matches, conversations, and unmatched conversations
  const newMatches = matches.filter(m => m.isNewMatch && !m.isUnmatched);
  const conversations = matches.filter(m => !m.isNewMatch && m.lastMessage && !m.isUnmatched);
  const unmatchedConversations = matches.filter(m => m.isUnmatched);

  if (loading) {
    return (
      <div className='h-full flex items-center justify-center dark:bg-black'>
        <div className='text-center'>
          <Loader2 className='w-10 h-10 sm:w-12 sm:h-12 animate-spin text-frinder-orange mx-auto mb-3 sm:mb-4' />
          <p className='text-muted-foreground text-sm sm:text-base'>Loading your matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col dark:bg-black'>
      {/* Incoming Call UI */}
      <AnimatePresence>
        {showIncomingCall && incomingCall && (
          <motion.div
            className='fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Pulse rings */}
            <motion.div
              className='absolute w-40 h-40 rounded-full border-2 border-frinder-orange'
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className='absolute w-40 h-40 rounded-full border-2 border-frinder-orange'
              animate={{ scale: [1, 1.3], opacity: [0.3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />

            {/* Caller avatar */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Avatar className='w-32 h-32 border-4 border-frinder-orange mb-6'>
                <AvatarImage src={incomingCall.callerPhoto} alt={incomingCall.callerName} />
                <AvatarFallback className='bg-frinder-orange text-white text-4xl'>{incomingCall.callerName[0]}</AvatarFallback>
              </Avatar>
            </motion.div>

            <h2 className='text-2xl font-bold text-white mb-2'>{incomingCall.callerName}</h2>
            <div className='flex items-center gap-2 mb-8'>
              <PhoneIncoming className='w-5 h-5 text-green-400 animate-pulse' />
              <span className='text-white/70'>Incoming voice call...</span>
            </div>

            {/* Answer/Decline buttons */}
            <div className='flex items-center gap-8'>
              <motion.button
                onClick={handleDeclineIncomingCall}
                className='w-16 h-16 rounded-full bg-red-500 flex items-center justify-center'
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <PhoneOff className='w-7 h-7 text-white' />
              </motion.button>
              <motion.button
                onClick={handleAnswerIncomingCall}
                className='w-16 h-16 rounded-full bg-green-500 flex items-center justify-center'
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Phone className='w-7 h-7 text-white' />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className='px-3 sm:px-4 pt-3 sm:pt-4 pb-2'>
        <h1 className='text-xl sm:text-2xl font-bold dark:text-white'>Messages</h1>
      </div>

      <div className='flex-1 overflow-y-auto'>
        {/* New matches */}
        {newMatches.length > 0 && (
          <div className='px-3 sm:px-4 py-3 sm:py-4'>
            <h2 className='text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3 flex items-center gap-2'>
              <Sparkles className='w-3 h-3 sm:w-4 sm:h-4 text-frinder-orange' />
              New Matches
            </h2>
            <div className='flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-3 sm:-mx-4 px-3 sm:px-4'>
              {newMatches.map(match => (
                <motion.button
                  key={match.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedMatch(match)}
                  className='flex flex-col items-center gap-1.5 sm:gap-2 min-w-[60px] sm:min-w-[72px]'
                >
                  <div className='relative'>
                    <Avatar className='w-14 h-14 sm:w-16 sm:h-16 border-2 border-[#ed8c00] animate-pulse-glow'>
                      <AvatarImage src={match.photo} alt={match.name} />
                      <AvatarFallback className='bg-[#ed8c00] text-white'>{match.name[0]}</AvatarFallback>
                    </Avatar>
                    {match.isOnline && (
                      <span className='absolute bottom-1 right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-900' />
                    )}
                  </div>
                  <span className='text-xs sm:text-sm font-medium dark:text-white'>{match.name}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Conversations */}
        {conversations.length > 0 && (
          <div className='px-3 sm:px-4'>
            <h2 className='text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3'>Messages</h2>
            <div className='space-y-1.5 sm:space-y-2'>
              <AnimatePresence>
                {conversations.map(match => (
                  <motion.button
                    key={match.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => setSelectedMatch(match)}
                    className='w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl hover:bg-muted dark:hover:bg-gray-800 transition-colors'
                  >
                    <div className='relative'>
                      <Avatar className='w-12 h-12 sm:w-14 sm:h-14'>
                        <AvatarImage src={match.photo} alt={match.name} />
                        <AvatarFallback className='bg-frinder-orange text-white'>{match.name[0]}</AvatarFallback>
                      </Avatar>
                      {match.isOnline && (
                        <span className='absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500 border-2 border-white dark:border-gray-900' />
                      )}
                    </div>
                    <div className='flex-1 text-left min-w-0'>
                      <div className='flex items-center justify-between mb-0.5 sm:mb-1'>
                        <h3 className='font-semibold text-sm sm:text-base dark:text-white'>{match.name}</h3>
                        <span className='text-[10px] sm:text-xs text-muted-foreground'>
                          {match.lastMessageTime && formatTime(match.lastMessageTime)}
                        </span>
                      </div>
                      <p
                        className={`text-xs sm:text-sm truncate ${
                          match.unreadCount > 0 ? 'text-foreground dark:text-white font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        {match.lastMessage}
                      </p>
                    </div>
                    {match.unreadCount > 0 && <Badge className='bg-frinder-orange text-white text-[10px] sm:text-xs'>{match.unreadCount}</Badge>}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Unmatched Conversations - Chat history with disabled messaging */}
        {unmatchedConversations.length > 0 && (
          <div className='px-3 sm:px-4 mt-4'>
            <h2 className='text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3 flex items-center gap-2'>
              <UserX className='w-3 h-3' />
              Past Conversations
            </h2>
            <div className='space-y-1.5 sm:space-y-2'>
              <AnimatePresence>
                {unmatchedConversations.map(match => (
                  <motion.button
                    key={match.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => setSelectedMatch(match)}
                    className='w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl hover:bg-muted dark:hover:bg-gray-800 transition-colors opacity-60'
                  >
                    <div className='relative'>
                      <Avatar className='w-12 h-12 sm:w-14 sm:h-14 grayscale'>
                        <AvatarImage src={match.photo} alt={match.name} />
                        <AvatarFallback className='bg-gray-400 text-white'>{match.name[0]}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className='flex-1 text-left min-w-0'>
                      <div className='flex items-center justify-between mb-0.5 sm:mb-1'>
                        <h3 className='font-semibold text-sm sm:text-base dark:text-white'>{match.name}</h3>
                        <Badge variant='outline' className='text-[10px] border-gray-300 dark:border-gray-700 text-gray-500'>
                          Unmatched
                        </Badge>
                      </div>
                      <p className='text-xs sm:text-sm truncate text-muted-foreground'>
                        {match.lastMessage}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* User's Groups */}
        {userGroups.length > 0 && (
          <div className='px-3 sm:px-4 mt-4'>
            <h2 className='text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3 flex items-center gap-2'>
              <Users className='w-3 h-3 text-frinder-orange' />
              Your Groups
            </h2>
            <div className='space-y-1.5 sm:space-y-2'>
              <AnimatePresence>
                {userGroups.map(group => (
                  <motion.button
                    key={group.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => handleOpenGroupChat(group)}
                    className='w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-muted/50 dark:bg-gray-800/50 hover:bg-muted dark:hover:bg-gray-700/50 transition-colors text-left'
                  >
                    <div className='relative'>
                      <Avatar className='w-12 h-12 sm:w-14 sm:h-14'>
                        <AvatarImage src={group.photo} alt={group.name} />
                        <AvatarFallback className='bg-frinder-orange text-white'>
                          <Users className='w-5 h-5' />
                        </AvatarFallback>
                      </Avatar>
                      {group.creatorId === user?.uid && (
                        <div className='absolute -top-1 -right-1 w-5 h-5 bg-frinder-gold rounded-full flex items-center justify-center'>
                          <Crown className='w-3 h-3 text-white' />
                        </div>
                      )}
                    </div>
                    <div className='flex-1 text-left min-w-0'>
                      <div className='flex items-center gap-2 mb-0.5 sm:mb-1'>
                        <h3 className='font-semibold text-sm sm:text-base dark:text-white truncate'>{group.name}</h3>
                        <Badge variant='outline' className='text-[10px] shrink-0'>
                          {group.members?.length || 1} members
                        </Badge>
                      </div>
                      <p className='text-xs sm:text-sm truncate text-muted-foreground'>
                        {group.activity || group.description}
                      </p>
                    </div>
                    <div className='flex items-center gap-1' onClick={(e) => e.stopPropagation()}>
                      {/* Admin can view/manage members */}
                      {group.creatorId === user?.uid && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleViewGroupMembers(group); }}
                          className='p-2 rounded-full hover:bg-muted dark:hover:bg-gray-700 transition-colors'
                          title='Manage members'
                        >
                          <Users className='w-4 h-4 text-frinder-orange' />
                        </button>
                      )}
                      {/* Non-admin can leave */}
                      {group.creatorId !== user?.uid && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLeaveGroup(group.id); }}
                          className='p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950 transition-colors'
                          title='Leave group'
                        >
                          <LogOut className='w-4 h-4 text-red-500' />
                        </button>
                      )}
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Group Members Dialog (Admin Only) */}
        <Dialog open={showGroupMembersDialog} onOpenChange={setShowGroupMembersDialog}>
          <DialogContent className='dark:bg-gray-950 dark:border-gray-800 max-w-md'>
            <DialogHeader>
              <DialogTitle className='dark:text-white flex items-center gap-2'>
                <Users className='w-5 h-5 text-frinder-orange' />
                {selectedGroup?.name} - Members
              </DialogTitle>
              <DialogDescription>
                Manage group members. As admin, you can remove members from the group.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-2 max-h-[400px] overflow-y-auto'>
              {groupMembers.map(member => (
                <div 
                  key={member.uid}
                  className='flex items-center gap-3 p-3 rounded-lg bg-muted/50 dark:bg-gray-800/50'
                >
                  <Avatar className='w-10 h-10'>
                    <AvatarImage src={member.photos?.[0]} alt={member.displayName} />
                    <AvatarFallback className='bg-frinder-orange text-white'>
                      {member.displayName?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium dark:text-white truncate'>{member.displayName}</span>
                      {member.uid === selectedGroup?.creatorId && (
                        <Badge className='bg-frinder-gold text-white text-[10px]'>
                          <Crown className='w-2.5 h-2.5 mr-1' />
                          Admin
                        </Badge>
                      )}
                    </div>
                    {member.city && (
                      <span className='text-xs text-muted-foreground'>{member.city}</span>
                    )}
                  </div>
                  {member.uid !== selectedGroup?.creatorId && member.uid !== user?.uid && (
                    <button
                      onClick={() => handleRemoveMember(member.uid)}
                      disabled={removingMember === member.uid}
                      className='p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50'
                      title='Remove member'
                    >
                      {removingMember === member.uid ? (
                        <Loader2 className='w-4 h-4 animate-spin text-red-500' />
                      ) : (
                        <Trash2 className='w-4 h-4 text-red-500' />
                      )}
                    </button>
                  )}
                </div>
              ))}
              {groupMembers.length === 0 && (
                <div className='text-center py-8 text-muted-foreground'>
                  <Users className='w-10 h-10 mx-auto mb-2 opacity-50' />
                  <p>No members found</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Empty state */}
        {matches.length === 0 && (
          <div className='flex flex-col items-center justify-center h-full text-center px-6 sm:px-8'>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className='w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#ed8c00]/10 flex items-center justify-center mb-4 sm:mb-6'
            >
              <Heart className='w-10 h-10 sm:w-12 sm:h-12 text-[#ed8c00]' />
            </motion.div>
            <h2 className='text-xl sm:text-2xl font-bold mb-2 dark:text-white'>No matches yet</h2>
            <p className='text-muted-foreground text-sm sm:text-base'>Start swiping to find your match!</p>
          </div>
        )}
      </div>
    </div>
  );
}
