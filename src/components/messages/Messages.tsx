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
  CornerDownLeft
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToMatches,
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
  type Match as FirebaseMatch,
  type Message as FirebaseMessage,
  type CallData
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
  // Voice call state
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [activeCallData, setActiveCallData] = useState<CallData | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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
          <Avatar className='w-9 h-9 sm:w-10 sm:h-10'>
            <AvatarImage src={match.photo} alt={match.name} />
            <AvatarFallback className='bg-[#ed8c00] text-white'>{match.name[0]}</AvatarFallback>
          </Avatar>
          {isOnline && (
            <span className='absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 border-2 border-white dark:border-black' />
          )}
        </div>
        <div className='flex-1'>
          <h3 className='font-semibold text-sm sm:text-base dark:text-white'>{match.name}</h3>
          <p className={`text-[10px] sm:text-xs ${isOnline ? 'text-green-500' : 'text-muted-foreground'}`}>
            {getStatusText()}
          </p>
        </div>
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

      {/* Input */}
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
            onChange={e => setNewMessage(e.target.value)}
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
    </div>
  );
}

export default function Messages() {
  const { user, userProfile } = useAuth();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  // Incoming call state
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [showIncomingCall, setShowIncomingCall] = useState(false);

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
          isOnline: false, // Would need presence system for this
          isNewMatch: !m.lastMessage
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

      setMatches(mappedMatches);
      setLoading(false);
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

  // Get new matches and conversations
  const newMatches = matches.filter(m => m.isNewMatch);
  const conversations = matches.filter(m => !m.isNewMatch && m.lastMessage);

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
                        <AvatarFallback className='bg-[#ed8c00] text-white'>{match.name[0]}</AvatarFallback>
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
                    {match.unreadCount > 0 && <Badge className='bg-[#ed8c00] text-white text-[10px] sm:text-xs'>{match.unreadCount}</Badge>}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

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
