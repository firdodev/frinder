"use client";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Mail,
  Send,
  Heart,
  Shield,
  RefreshCw,
  Search,
  Ban,
  CheckCircle,
  XCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Activity,
  Crown,
  Bell,
  Download,
  UserPlus,
  Bug,
  Gift,
  TrendingUp,
  Image as ImageIcon,
  MessageSquare,
  ArrowLeft,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ADMIN_EMAILS = [
  "rikardo_balaj@universitetipolis.edu.al",
  "firdeus_kasaj@universitetipolis.edu.al"
];

interface UserData {
  id: string;
  name: string;
  email: string;
  gender?: string;
  photos?: string[];
  isEmailVerified?: boolean;
  isOnline?: boolean;
  lastSeen?: any;
  createdAt?: any;
  bio?: string;
  isBanned?: boolean;
  isPremium?: boolean;
}

interface DashboardStats {
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

interface MatchData {
  id: string;
  users: string[];
  userProfiles: { [key: string]: { name: string; photos?: string[] } };
  lastMessage?: string;
  lastMessageTime?: any;
  createdAt?: any;
}

interface MessageData {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  read: boolean;
  type?: string;
  imageUrl?: string;
}

// Metric Card
function MetricCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  trend,
  color = "primary"
}: { 
  title: string; 
  value: number | string; 
  subtitle?: string;
  icon: any; 
  trend?: number;
  color?: "primary" | "success" | "warning" | "danger";
}) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    success: "bg-green-500/10 text-green-500",
    warning: "bg-yellow-500/10 text-yellow-500",
    danger: "bg-red-500/10 text-red-500"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-4 border border-border"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-xl ${colors[color]}`}>
          <Icon size={18} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
            {trend >= 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground/70 mt-1">{subtitle}</div>}
    </motion.div>
  );
}

// Donut Progress
function DonutStat({ label, value, total, color }: { label: string; value: number; total: number; color: string; }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90">
          <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
          <motion.circle
            cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="4"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
          {percentage}%
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{value} of {total}</div>
      </div>
      </div>
  );
}

// Action Button
function ActionButton({ label, icon: Icon, onClick, loading, variant = "default" }: { 
  label: string; icon: any; onClick: () => void; loading?: boolean;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variants = {
    default: "bg-primary hover:bg-primary/90 text-primary-foreground",
    success: "bg-green-500 hover:bg-green-600 text-white",
    warning: "bg-yellow-500 hover:bg-yellow-600 text-white",
    danger: "bg-red-500 hover:bg-red-600 text-white"
  };

  return (
    <Button onClick={onClick} disabled={loading} className={`${variants[variant]} w-full justify-start gap-3 h-12 rounded-xl font-medium`}>
      {loading ? <RefreshCw className="animate-spin" size={18} /> : <Icon size={18} />}
      {label}
    </Button>
  );
}

// User Row
function UserRow({ user, onBan, onDelete, loading }: { user: UserData; onBan: () => void; onDelete: () => void; loading: boolean; }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <Avatar className="w-10 h-10">
          <AvatarImage src={user.photos?.[0]} />
          <AvatarFallback className="bg-primary/20 text-primary font-semibold">{user.name?.[0] || '?'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">{user.name || 'Unknown'}</span>
            {user.isPremium && <Crown size={14} className="text-yellow-500 shrink-0" />}
            {user.isBanned && <Ban size={14} className="text-red-500 shrink-0" />}
          </div>
          <span className="text-xs text-muted-foreground truncate block">{user.email}</span>
        </div>
        <div className="flex items-center gap-2">
          {user.isOnline && <div className="w-2 h-2 rounded-full bg-green-500" />}
          {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Gender', value: user.gender || '-' },
                  { label: 'Photos', value: user.photos?.length || 0 },
                  { label: 'Email', value: user.isEmailVerified ? '✓ Verified' : 'Unverified' },
                  { label: 'Joined', value: user.createdAt?.toDate?.().toLocaleDateString() || '-' }
                ].map(item => (
                  <div key={item.label} className="bg-muted/50 rounded-xl p-2 text-center">
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                    <div className="text-sm font-medium text-foreground capitalize">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={(e) => { e.stopPropagation(); onBan(); }} disabled={loading} variant="outline" size="sm"
                  className={`flex-1 rounded-xl ${user.isBanned ? 'text-green-500 border-green-500' : 'text-red-500 border-red-500'}`}>
                  {loading ? <RefreshCw className="animate-spin mr-2" size={14} /> : null}
                  {user.isBanned ? 'Unban' : 'Ban'}
                </Button>
                <Button onClick={(e) => { e.stopPropagation(); onDelete(); }} disabled={loading} variant="outline" size="sm" className="rounded-xl text-red-500 border-red-500">
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Chat Conversation View
function ChatConversation({ 
  match, 
  messages, 
  onBack 
}: { 
  match: MatchData; 
  messages: MessageData[]; 
  onBack: () => void;
}) {
  const users = Object.values(match.userProfiles);
  const user1 = users[0];
  const user2 = users[1];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-card rounded-t-2xl">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl shrink-0">
          <ChevronLeft size={20} />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex -space-x-2">
            <Avatar className="w-8 h-8 border-2 border-background">
              <AvatarImage src={user1?.photos?.[0]} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">{user1?.name?.[0] || '?'}</AvatarFallback>
            </Avatar>
            <Avatar className="w-8 h-8 border-2 border-background">
              <AvatarImage src={user2?.photos?.[0]} />
              <AvatarFallback className="bg-pink-500/20 text-pink-500 text-xs">{user2?.name?.[0] || '?'}</AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {user1?.name || 'User 1'} & {user2?.name || 'User 2'}
            </div>
            <div className="text-xs text-muted-foreground">{messages.length} messages</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No messages yet
          </div>
        ) : (
          messages.map((msg, idx) => {
            const sender = match.userProfiles[msg.senderId];
            const isFirstUser = match.users[0] === msg.senderId;
            
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`flex gap-2 ${isFirstUser ? '' : 'flex-row-reverse'}`}
              >
                <Avatar className="w-6 h-6 shrink-0">
                  <AvatarImage src={sender?.photos?.[0]} />
                  <AvatarFallback className={`text-xs ${isFirstUser ? 'bg-primary/20 text-primary' : 'bg-pink-500/20 text-pink-500'}`}>
                    {sender?.name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[75%] ${isFirstUser ? '' : 'text-right'}`}>
                  <div className={`inline-block rounded-2xl px-3 py-2 text-sm ${
                    isFirstUser 
                      ? 'bg-card border border-border text-foreground' 
                      : 'bg-primary text-primary-foreground'
                  }`}>
                    {msg.type === 'image' && msg.imageUrl ? (
                      <img src={msg.imageUrl} alt="Image" className="max-w-full rounded-lg max-h-48 object-cover" />
                    ) : (
                      msg.text
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 px-1">
                    {msg.timestamp?.toDate?.().toLocaleString() || ''}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-card rounded-b-2xl">
        <div className="text-xs text-muted-foreground text-center">
          View only mode • Admin cannot send messages
        </div>
      </div>
    </div>
  );
}

// Chat List Item
function ChatListItem({ 
  match, 
  onClick 
}: { 
  match: MatchData; 
  onClick: () => void;
}) {
  const users = Object.values(match.userProfiles);
  const user1 = users[0];
  const user2 = users[1];

  return (
    <div 
      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border last:border-0"
      onClick={onClick}
    >
      <div className="flex -space-x-2 shrink-0">
        <Avatar className="w-10 h-10 border-2 border-background">
          <AvatarImage src={user1?.photos?.[0]} />
          <AvatarFallback className="bg-primary/20 text-primary">{user1?.name?.[0] || '?'}</AvatarFallback>
        </Avatar>
        <Avatar className="w-10 h-10 border-2 border-background">
          <AvatarImage src={user2?.photos?.[0]} />
          <AvatarFallback className="bg-pink-500/20 text-pink-500">{user2?.name?.[0] || '?'}</AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground truncate">
          {user1?.name || 'User 1'} & {user2?.name || 'User 2'}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {match.lastMessage || 'No messages yet'}
        </div>
      </div>
      <div className="text-xs text-muted-foreground shrink-0">
        {match.lastMessageTime?.toDate?.().toLocaleDateString() || match.createdAt?.toDate?.().toLocaleDateString() || ''}
      </div>
    </div>
  );
}

export default function AdminPanelTab() {
    // Remove unused/deleted accounts (no matches and no profile pictures)
    const [fullScreenLoading, setFullScreenLoading] = useState(false);
    const handleRemoveUnusedAccounts = async () => {
      if (!window.confirm('Remove all unused, orphaned, and unlinked accounts from Firestore and Auth, and clean up all references? This cannot be undone.')) return;
      setFullScreenLoading(true);
      setActionLoading('remove-unused');
      try {
        const res = await fetch('/api/admin-full-cleanup', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          fetchStats();
          alert('Cleanup complete! Deleted UIDs: ' + (data.deletedUids?.length || 0));
        } else {
          alert('Cleanup failed: ' + (data.error || 'Unknown error'));
        }
      } catch (error) {
        alert('Error removing unused accounts.');
        console.error(error);
      }
      setActionLoading(null);
      setFullScreenLoading(false);
    };
    // Full screen loading overlay
    function FullScreenLoader() {
      return (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(255,255,255,0.85)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{textAlign:'center'}}>
            <svg width="60" height="60" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="20" fill="none" stroke="#ed8c00" strokeWidth="5" strokeDasharray="31.4 31.4" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" from="0 25 25" to="360 25 25"/>
              </circle>
            </svg>
            <div style={{marginTop:16,fontWeight:'bold',color:'#ed8c00',fontSize:18}}>Cleaning up users...</div>
          </div>
        </div>
      );
    }
  const { user, loading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [fetchingStats, setFetchingStats] = useState(true);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'users' | 'chats' | 'email'>('dashboard');
  const [actionResults, setActionResults] = useState<{ [key: string]: { loading: boolean; result?: string } }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<'all' | 'banned' | 'premium'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Chat state
  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<MessageData[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Email form state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!loading) {
      setAuthorized(!!(user && user.email && ADMIN_EMAILS.includes(user.email)));
    }
  }, [user, loading]);

    const fetchStats = async () => {
      setFetchingStats(true);
    try {
      const [usersSnap, matchesSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "matches"))
      ]);
      
      const now = Date.now();
      const THIRTY_MINUTES = 30 * 60 * 1000;
      const ONE_DAY = 24 * 60 * 60 * 1000;
      const ONE_WEEK = 7 * ONE_DAY;
      
      let totalUsers = 0, activeUsers = 0, verifiedUsers = 0;
      let maleUsers = 0, femaleUsers = 0, otherGender = 0;
      let completeProfiles = 0, incompleteProfiles = 0;
      let premiumUsers = 0, bannedUsers = 0;
      let todaySignups = 0, weeklySignups = 0, totalPhotos = 0;
      
      const usersList: UserData[] = [];
      const matchesList: MatchData[] = [];

      usersSnap.forEach(docSnap => {
        totalUsers++;
        const data = docSnap.data();
        
        usersList.push({
          id: docSnap.id,
          name: data.name,
          email: data.email,
          gender: data.gender,
          photos: data.photos,
          isEmailVerified: data.isEmailVerified,
          isOnline: data.isOnline,
          lastSeen: data.lastSeen,
          createdAt: data.createdAt,
          bio: data.bio,
          isBanned: data.isBanned,
          isPremium: data.isPremium
        });

        if (data.lastSeen?.toDate) {
          if (now - data.lastSeen.toDate().getTime() <= THIRTY_MINUTES) activeUsers++;
        }
        if (data.isEmailVerified) verifiedUsers++;
        if (data.gender === 'male') maleUsers++;
        else if (data.gender === 'female') femaleUsers++;
        else if (data.gender) otherGender++;

        const hasPhotos = data.photos && data.photos.length >= 3;
        const hasBio = data.bio && data.bio.length > 10;
        if (hasPhotos && hasBio) completeProfiles++;
        else incompleteProfiles++;

        totalPhotos += data.photos?.length || 0;
        if (data.isPremium) premiumUsers++;
        if (data.isBanned) bannedUsers++;

        if (data.createdAt?.toDate) {
          const createdAt = data.createdAt.toDate().getTime();
          if (now - createdAt <= ONE_DAY) todaySignups++;
          if (now - createdAt <= ONE_WEEK) weeklySignups++;
        }
      });

      matchesSnap.forEach(docSnap => {
        const data = docSnap.data();
        matchesList.push({
          id: docSnap.id,
          users: data.users,
          userProfiles: data.userProfiles,
          lastMessage: data.lastMessage,
          lastMessageTime: data.lastMessageTime,
          createdAt: data.createdAt
        });
      });

      // Sort matches by last message time
      matchesList.sort((a, b) => {
        const timeA = a.lastMessageTime?.toDate?.().getTime() || a.createdAt?.toDate?.().getTime() || 0;
        const timeB = b.lastMessageTime?.toDate?.().getTime() || b.createdAt?.toDate?.().getTime() || 0;
        return timeB - timeA;
      });

      setUsers(usersList);
      setMatches(matchesList);
      setStats({
        totalUsers, activeUsers, verifiedUsers, maleUsers, femaleUsers, otherGender,
        completeProfiles, incompleteProfiles, premiumUsers, bannedUsers,
        totalMatches: matchesSnap.size, todaySignups, weeklySignups,
        avgPhotosPerUser: totalUsers > 0 ? Number((totalPhotos / totalUsers).toFixed(1)) : 0
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
      setFetchingStats(false);
    };

  const fetchMessages = async (matchId: string) => {
    setLoadingMessages(true);
    try {
      const messagesQuery = query(
        collection(db, "matches", matchId, "messages"),
        orderBy("timestamp", "asc")
      );
      const messagesSnap = await getDocs(messagesQuery);
      const messagesList: MessageData[] = [];
      
      messagesSnap.forEach(docSnap => {
        const data = docSnap.data();
        messagesList.push({
          id: docSnap.id,
          senderId: data.senderId,
          text: data.text,
          timestamp: data.timestamp,
          read: data.read,
          type: data.type,
          imageUrl: data.imageUrl
        });
      });
      
      setSelectedMessages(messagesList);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
    setLoadingMessages(false);
  };

  const handleSelectMatch = async (match: MatchData) => {
    setSelectedMatch(match);
    await fetchMessages(match.id);
  };

  useEffect(() => {
    if (authorized) fetchStats();
  }, [authorized]);

  const handleQuickAction = async (action: string) => {
    setActionResults(prev => ({ ...prev, [action]: { loading: true } }));
    try {
      let res;
      if (action === 'thank') {
        res = await fetch("/api/broadcast-special-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "thank" }) });
      } else if (action === 'bug') {
        res = await fetch("/api/broadcast-special-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "bug" }) });
      } else if (action === 'remind') {
        res = await fetch("/api/remind-incomplete-profiles", { method: "POST" });
      }
      const data = await res?.json();
      setActionResults(prev => ({ ...prev, [action]: { loading: false, result: res?.ok ? `✓ Sent to ${data.sent || 0} users` : (data.error || 'Failed') } }));
    } catch {
      setActionResults(prev => ({ ...prev, [action]: { loading: false, result: 'Error occurred' } }));
    }
    setTimeout(() => setActionResults(prev => ({ ...prev, [action]: { loading: false } })), 4000);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingEmail(true);
    setEmailResult(null);
    try {
      const res = await fetch("/api/broadcast-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: emailSubject, message: emailMessage })
      });
      const data = await res.json();
      if (res.ok) {
        setEmailResult({ success: true, message: `Sent to ${data.sent} users` });
        setEmailSubject("");
        setEmailMessage("");
      } else {
        setEmailResult({ success: false, message: data.error || "Failed" });
      }
    } catch {
      setEmailResult({ success: false, message: "Failed to send" });
    }
    setSendingEmail(false);
  };

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    setActionLoading(userId);
    try {
      await updateDoc(doc(db, "users", userId), { isBanned: !isBanned });
      fetchStats();
    } catch (error) {
      console.error("Error:", error);
    }
    setActionLoading(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Delete this user permanently?")) return;
    setActionLoading(userId);
    try {
      await deleteDoc(doc(db, "users", userId));
      fetchStats();
    } catch (error) {
      console.error("Error:", error);
    }
    setActionLoading(null);
  };

  const exportCSV = () => {
    const csv = users.map(u => `"${u.name || ''}","${u.email}","${u.gender || ''}",${u.photos?.length || 0}`).join('\n');
    const blob = new Blob([`Name,Email,Gender,Photos\n${csv}`], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'frinder-users.csv';
    a.click();
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    if (userFilter === 'banned') return matchesSearch && u.isBanned;
    if (userFilter === 'premium') return matchesSearch && u.isPremium;
    return matchesSearch;
  });

  const filteredMatches = matches.filter(m => {
    // Only show matches that have messages
    if (!m.lastMessage) return false;
    if (!chatSearchQuery) return true;
    const names = Object.values(m.userProfiles).map(p => p.name?.toLowerCase() || '');
    return names.some(n => n.includes(chatSearchQuery.toLowerCase()));
  });

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <Shield className="text-red-500" size={32} />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have admin privileges.</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-2 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Admin</h1>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchStats} disabled={fetchingStats} className="rounded-xl">
            <RefreshCw className={`text-muted-foreground ${fetchingStats ? 'animate-spin' : ''}`} size={18} />
          </Button>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Home' },
            { id: 'users', label: 'Users' },
            { id: 'chats', label: 'Chats' },
            { id: 'email', label: 'Email' }
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeSection === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => { setActiveSection(tab.id as any); if (tab.id !== 'chats') setSelectedMatch(null); }}
              className={`rounded-xl flex-1 text-xs sm:text-sm ${activeSection === tab.id ? '' : 'text-muted-foreground'}`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {fetchingStats && !stats ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="animate-spin text-primary" size={24} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* DASHBOARD */}
            {activeSection === 'dashboard' && stats && (
              <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard title="Total Users" value={stats.totalUsers} icon={Users} color="primary" />
                  <MetricCard title="Active Now" value={stats.activeUsers} icon={Activity} color="success" subtitle="Last 30 min" />
                  <MetricCard title="New Today" value={stats.todaySignups} icon={UserPlus} color="primary" trend={stats.weeklySignups > 0 ? Math.round((stats.todaySignups / stats.weeklySignups) * 100) : 0} />
                  <MetricCard title="Matches" value={stats.totalMatches} icon={Heart} color="danger" />
                </div>

                <div className="bg-card rounded-2xl p-4 border border-border">
                  <h3 className="font-semibold text-foreground mb-4">User Breakdown</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <DonutStat label="Male" value={stats.maleUsers} total={stats.totalUsers} color="text-blue-500" />
                    <DonutStat label="Female" value={stats.femaleUsers} total={stats.totalUsers} color="text-pink-500" />
                    <DonutStat label="Verified" value={stats.verifiedUsers} total={stats.totalUsers} color="text-green-500" />
                    <DonutStat label="Complete" value={stats.completeProfiles} total={stats.totalUsers} color="text-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-card rounded-2xl p-3 border border-border text-center">
                    <Crown className="mx-auto text-yellow-500 mb-1" size={20} />
                    <div className="text-lg font-bold text-foreground">{stats.premiumUsers}</div>
                    <div className="text-xs text-muted-foreground">Premium</div>
                  </div>
                  <div className="bg-card rounded-2xl p-3 border border-border text-center">
                    <Ban className="mx-auto text-red-500 mb-1" size={20} />
                    <div className="text-lg font-bold text-foreground">{stats.bannedUsers}</div>
                    <div className="text-xs text-muted-foreground">Banned</div>
                  </div>
                  <div className="bg-card rounded-2xl p-3 border border-border text-center">
                    <ImageIcon className="mx-auto text-primary mb-1" size={20} />
                    <div className="text-lg font-bold text-foreground">{stats.avgPhotosPerUser}</div>
                    <div className="text-xs text-muted-foreground">Avg Photos</div>
                  </div>
                </div>

                <div className="bg-card rounded-2xl p-4 border border-border">
                  <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <ActionButton label="Thank Users" icon={Gift} variant="success" onClick={() => handleQuickAction('thank')} loading={actionResults.thank?.loading} />
                    <ActionButton label="Ask for Bugs" icon={Bug} variant="warning" onClick={() => handleQuickAction('bug')} loading={actionResults.bug?.loading} />
                    <ActionButton label="Remind Profiles" icon={Bell} variant="default" onClick={() => handleQuickAction('remind')} loading={actionResults.remind?.loading} />
                    <ActionButton label="Export CSV" icon={Download} variant="default" onClick={exportCSV} />
                  </div>
                  {Object.entries(actionResults).map(([key, val]) => val.result && (
                    <motion.div key={key} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-2 bg-muted rounded-xl text-sm text-muted-foreground">{val.result}</motion.div>
                  ))}
                </div>

                <div className="bg-card rounded-2xl p-4 border border-border">
                  <h3 className="font-semibold text-foreground mb-3">Recent Signups</h3>
                  <div className="space-y-2">
                    {users.filter(u => u.createdAt?.toDate).sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()).slice(0, 5).map(user => (
                      <div key={user.id} className="flex items-center gap-3 p-2 rounded-xl bg-muted/50">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.photos?.[0]} />
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">{user.name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{user.name || 'New User'}</div>
                          <div className="text-xs text-muted-foreground">{user.createdAt?.toDate?.().toLocaleDateString()}</div>
                        </div>
                        {user.isPremium && <Crown size={14} className="text-yellow-500" />}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* USERS */}
            {activeSection === 'users' && (
              <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {fullScreenLoading && <FullScreenLoader />}
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 rounded-xl bg-card" />
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleRemoveUnusedAccounts}
                    disabled={actionLoading === 'remove-unused'}
                    className="rounded-xl whitespace-nowrap"
                  >
                    {actionLoading === 'remove-unused' ? 'Removing...' : 'Remove Unused Accounts'}
                  </Button>
                </div>

                <div className="flex gap-2">
                  {(['all', 'premium', 'banned'] as const).map(f => (
                    <Button key={f} variant={userFilter === f ? "default" : "outline"} size="sm" onClick={() => setUserFilter(f)} className="rounded-xl capitalize">{f}</Button>
                  ))}
                </div>

                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="max-h-[60vh] overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">No users found</div>
                    ) : (
                      filteredUsers.slice(0, 50).map(user => (
                        <UserRow key={user.id} user={user} onBan={() => handleBanUser(user.id, user.isBanned || false)} onDelete={() => handleDeleteUser(user.id)} loading={actionLoading === user.id} />
                      ))
                    )}
                  </div>
                </div>

                <p className="text-center text-xs text-muted-foreground">Showing {Math.min(filteredUsers.length, 50)} of {filteredUsers.length} users</p>
              </motion.div>
            )}

            {/* CHATS */}
            {activeSection === 'chats' && (
              <motion.div key="chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                {selectedMatch ? (
                  loadingMessages ? (
                    <div className="flex items-center justify-center h-48">
                      <RefreshCw className="animate-spin text-primary" size={24} />
                    </div>
                  ) : (
                    <div className="bg-card rounded-2xl border border-border h-[70vh] flex flex-col">
                      <ChatConversation 
                        match={selectedMatch} 
                        messages={selectedMessages} 
                        onBack={() => setSelectedMatch(null)} 
                      />
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                      <Input 
                        placeholder="Search conversations..." 
                        value={chatSearchQuery} 
                        onChange={e => setChatSearchQuery(e.target.value)} 
                        className="pl-9 rounded-xl bg-card" 
                      />
                    </div>

                    <div className="bg-card rounded-2xl border border-border overflow-hidden">
                      <div className="p-3 border-b border-border">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <MessageSquare size={16} className="text-primary" />
                          All Conversations ({filteredMatches.length})
                        </div>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto">
                        {filteredMatches.length === 0 ? (
                          <div className="p-8 text-center text-muted-foreground">No conversations found</div>
                        ) : (
                          filteredMatches.map(match => (
                            <ChatListItem key={match.id} match={match} onClick={() => handleSelectMatch(match)} />
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* EMAIL */}
            {activeSection === 'email' && (
              <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="bg-card rounded-2xl p-4 border border-border">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Mail size={18} className="text-primary" />
                    Broadcast Email
                  </h3>
                  <form onSubmit={handleSendEmail} className="space-y-3">
                    <Input placeholder="Subject" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="rounded-xl bg-background" required />
                    <Textarea placeholder="Message..." value={emailMessage} onChange={e => setEmailMessage(e.target.value)} className="rounded-xl bg-background min-h-[100px] resize-none" required />
                    <Button type="submit" disabled={sendingEmail} className="w-full rounded-xl">
                      {sendingEmail ? <><RefreshCw className="animate-spin mr-2" size={16} />Sending...</> : <><Send size={16} className="mr-2" />Send to All Users</>}
                    </Button>
                    {emailResult && (
                      <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${emailResult.success ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {emailResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        {emailResult.message}
                      </div>
                    )}
                  </form>
                </div>

                <div className="bg-card rounded-2xl p-4 border border-border">
                  <h3 className="font-semibold text-foreground mb-3">Quick Templates</h3>
                  <div className="space-y-2">
                    <ActionButton label="Thank Users" icon={Gift} variant="success" onClick={() => handleQuickAction('thank')} loading={actionResults.thank?.loading} />
                    <ActionButton label="Report Bugs" icon={Bug} variant="warning" onClick={() => handleQuickAction('bug')} loading={actionResults.bug?.loading} />
                    <ActionButton label="Complete Profile Reminder" icon={Bell} variant="default" onClick={() => handleQuickAction('remind')} loading={actionResults.remind?.loading} />
                  </div>
                  {Object.entries(actionResults).map(([key, val]) => val.result && (
                    <motion.div key={key} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-2 bg-muted rounded-xl text-sm text-muted-foreground">{val.result}</motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
      </div>
  );
}
