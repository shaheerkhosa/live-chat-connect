import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { Send, MoreVertical, User, Globe, Monitor, MapPin, Archive, UserPlus, Video, Phone, Briefcase, Calendar, Mail, ChevronRight, ChevronLeft, MessageSquare, Heart, Pill, Building, Shield, AlertTriangle, Bot, BotOff } from 'lucide-react';
import gsap from 'gsap';
import { cn } from '@/lib/utils';
import { Conversation, Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { mockAgents } from '@/data/mockData';
import { useVideoChat } from '@/hooks/useVideoChat';
import { VideoCallModal } from '@/components/video/VideoCallModal';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatPanelProps {
  conversation: Conversation | null;
  onSendMessage: (content: string) => void;
  onCloseConversation: () => void;
  isAIEnabled?: boolean;
  onToggleAI?: () => void;
}
const formatMessageTime = (date: Date) => {
  if (isToday(date)) {
    return format(date, 'h:mm a');
  }
  if (isYesterday(date)) {
    return `Yesterday ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d, h:mm a');
};
const MessageBubble = ({
  message,
  isAgent
}: {
  message: Message;
  isAgent: boolean;
}) => <div className={cn("flex gap-2 message-enter", isAgent ? "flex-row-reverse" : "flex-row")}>
    {!isAgent && <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
          V
        </AvatarFallback>
      </Avatar>}
    <div className={cn("max-w-[70%] rounded-3xl px-4 py-2.5", isAgent ? "bg-chat-user text-chat-user-foreground rounded-br-xl" : "bg-chat-visitor text-chat-visitor-foreground rounded-bl-xl")}>
      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
      <p className={cn("text-xs mt-1", isAgent ? "text-chat-user-foreground/70" : "text-muted-foreground")}>
        {formatMessageTime(new Date(message.timestamp))}
      </p>
    </div>
  </div>;
const EmptyState = () => {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
    );
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">Select a conversation</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Choose a conversation from the list to start chatting with visitors
      </p>
    </div>
  );
};

// Compact visitor info item with expandable tooltip
const InfoItem = ({
  icon: Icon,
  label,
  value
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const isTruncated = value.length > 20;
  return <div className="flex items-start gap-2 py-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
      <span className="text-xs text-muted-foreground min-w-[50px]">{label}:</span>
      <span className={cn("text-xs text-foreground", isTruncated && "cursor-pointer hover:text-primary", expanded ? "whitespace-pre-wrap break-words" : "truncate")} onClick={() => isTruncated && setExpanded(!expanded)} title={isTruncated ? expanded ? "Click to collapse" : "Click to expand" : undefined}>
        {value}
      </span>
    </div>;
};

// Collapsible visitor info sidebar
const VisitorInfoSidebar = ({
  visitor,
  assignedAgent
}: {
  visitor: any;
  assignedAgent: any;
}) => {
  const [isOpen, setIsOpen] = useState(true);

  // Check if we have any treatment-specific info
  const hasTreatmentInfo = visitor.addiction_history || visitor.drug_of_choice || visitor.treatment_interest || visitor.insurance_info || visitor.urgency_level;

  // Determine urgency badge color
  const getUrgencyBadge = (urgency: string) => {
    const urgencyLower = urgency.toLowerCase();
    if (urgencyLower.includes('crisis') || urgencyLower.includes('immediate')) {
      return <Badge variant="destructive" className="text-xs">{urgency}</Badge>;
    }
    if (urgencyLower.includes('ready') || urgencyLower.includes('start')) {
      return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">{urgency}</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">{urgency}</Badge>;
  };
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sidebarRef.current) return;
    gsap.fromTo(
      sidebarRef.current,
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' }
    );
  }, []);

  return (
    <div ref={sidebarRef} className={cn("border-l border-border/30 hidden lg:flex flex-col transition-all duration-200 bg-card w-64")}>
      <div className="flex-1 overflow-y-auto">

        {/* Personal Info Section */}
        <div className="p-3 space-y-1">
          {visitor.name && <InfoItem icon={User} label="Name" value={visitor.name} />}
          {visitor.email && <InfoItem icon={Mail} label="Email" value={visitor.email} />}
          {visitor.phone && <InfoItem icon={Phone} label="Phone" value={visitor.phone} />}
          {visitor.age && <InfoItem icon={Calendar} label="Age" value={visitor.age} />}
          {visitor.occupation && <InfoItem icon={Briefcase} label="Work" value={visitor.occupation} />}
        </div>

        {/* Treatment Details Section */}
        {hasTreatmentInfo && (
          <div className="p-3 border-t border-border/30 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Heart className="h-3 w-3" />
              Treatment Details
            </p>
            {visitor.drug_of_choice && <InfoItem icon={Pill} label="Substance" value={visitor.drug_of_choice} />}
            {visitor.addiction_history && <InfoItem icon={Calendar} label="History" value={visitor.addiction_history} />}
            {visitor.treatment_interest && <InfoItem icon={Building} label="Seeking" value={visitor.treatment_interest} />}
            {visitor.insurance_info && <InfoItem icon={Shield} label="Insurance" value={visitor.insurance_info} />}
            {visitor.urgency_level && (
              <div className="flex items-center gap-2 py-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground min-w-[50px]">Urgency:</span>
                {getUrgencyBadge(visitor.urgency_level)}
              </div>
            )}
          </div>
        )}

        {/* Session Info Section */}
        <div className="p-3 border-t border-border/30 space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">Session Info</p>
          {visitor.location && <InfoItem icon={MapPin} label="Location" value={visitor.location} />}
          {visitor.currentPage && <InfoItem icon={Globe} label="Page" value={visitor.currentPage} />}
          {visitor.browserInfo && <InfoItem icon={Monitor} label="Browser" value={visitor.browserInfo} />}
        </div>

        {assignedAgent && (
          <div className="p-3 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-2">Assigned Agent</p>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {assignedAgent.name.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-medium text-foreground">{assignedAgent.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{assignedAgent.status}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export const ChatPanel = ({
  conversation,
  onSendMessage,
  onCloseConversation,
  isAIEnabled = true,
  onToggleAI
}: ChatPanelProps) => {
  const [message, setMessage] = useState('');
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    toast
  } = useToast();
  const videoChat = useVideoChat({
    onCallRequest: () => {
      toast({
        title: "Calling visitor",
        description: "Waiting for visitor to accept..."
      });
    },
    onCallAccepted: () => {
      toast({
        title: "Call connected",
        description: "Video call is now active"
      });
    },
    onCallEnded: () => {
      toast({
        title: "Call ended",
        description: "The video call has ended"
      });
    }
  });
  const handleStartVideoCall = async () => {
    setIsVideoCallOpen(true);
    await videoChat.initiateCall();
  };
  const handleEndVideoCall = () => {
    videoChat.endCall();
    setIsVideoCallOpen(false);
  };
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Track if user is near bottom (within 100px)
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  };

  useEffect(() => {
    const messageCount = conversation?.messages?.length ?? 0;
    const isNewMessage = messageCount > prevMessageCountRef.current;
    prevMessageCountRef.current = messageCount;

    // Only auto-scroll if user is near bottom OR it's a new message they just sent
    if (isNearBottomRef.current || isNewMessage) {
      scrollToBottom();
    }
  }, [conversation?.messages]);
  useEffect(() => {
    if (conversation) {
      inputRef.current?.focus();
    }
  }, [conversation?.id]);
  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  const chatAreaRef = useRef<HTMLDivElement>(null);
  
  useLayoutEffect(() => {
    if (!chatAreaRef.current || !conversation) return;
    gsap.fromTo(
      chatAreaRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: 'power2.out' }
    );
  }, [conversation?.id]);

  if (!conversation) {
    return <EmptyState />;
  }
  const {
    visitor,
    messages,
    status,
    assignedAgentId
  } = conversation;
  const visitorName = visitor.name || `Visitor ${visitor.sessionId.slice(-4)}`;
  const assignedAgent = assignedAgentId ? mockAgents.find(a => a.id === assignedAgentId) : null;

  return <div className="flex h-full bg-gradient-subtle">
      {/* Chat Area */}
      <div ref={chatAreaRef} className="flex-1 flex flex-col min-w-0">
        
        {/* AI Toggle Header */}
        {onToggleAI && (
          <div className="px-4 py-2 border-b border-border/30 flex items-center justify-between bg-background/50">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">AI Assistant</span>
              <Badge variant={isAIEnabled ? "default" : "secondary"} className="text-xs">
                {isAIEnabled ? "Active" : "Paused"}
              </Badge>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isAIEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={onToggleAI}
                    className="gap-2"
                  >
                    {isAIEnabled ? (
                      <>
                        <Bot className="h-4 w-4" />
                        AI On
                      </>
                    ) : (
                      <>
                        <BotOff className="h-4 w-4" />
                        AI Off
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isAIEnabled ? "Click to disable AI responses" : "Click to enable AI responses"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Messages */}
        <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background scrollbar-thin">
          {messages.map(msg => <MessageBubble key={msg.id} message={msg} isAgent={msg.senderType === 'agent'} />)}
        </div>

        {/* Input - Rounder styling */}
        <div className="p-4 border-t border-border/30 glass-subtle rounded-b-2xl">
          {/* AI Mode Warning Banner */}
          {isAIEnabled && status !== 'closed' && (
            <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/20">
                <Bot className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">AI is handling this conversation</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80">Turn off AI mode to respond manually</p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Input 
              ref={inputRef} 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              onKeyDown={handleKeyDown} 
              placeholder={
                status === 'closed' 
                  ? 'Conversation closed' 
                  : isAIEnabled 
                    ? 'AI mode is active — disable to reply' 
                    : 'Type a message...'
              } 
              disabled={status === 'closed' || isAIEnabled} 
              className={cn(
                "flex-1 transition-colors rounded-xl",
                isAIEnabled 
                  ? "bg-muted/50 cursor-not-allowed opacity-60" 
                  : "bg-background/50 focus:bg-background"
              )} 
            />
            <Button 
              onClick={handleSend} 
              disabled={!message.trim() || status === 'closed' || isAIEnabled} 
              className={cn(
                "transition-all rounded-xl",
                isAIEnabled
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90 glow-primary hover:scale-105"
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Visitor Info Sidebar - Collapsible on large screens */}
      <VisitorInfoSidebar visitor={visitor} assignedAgent={assignedAgent} />

      {/* Video Call Modal */}
      <VideoCallModal isOpen={isVideoCallOpen} onClose={() => setIsVideoCallOpen(false)} status={videoChat.status} isMuted={videoChat.isMuted} isVideoOff={videoChat.isVideoOff} error={videoChat.error} localVideoRef={videoChat.localVideoRef} remoteVideoRef={videoChat.remoteVideoRef} onEndCall={handleEndVideoCall} onToggleMute={videoChat.toggleMute} onToggleVideo={videoChat.toggleVideo} participantName={visitorName} isInitiator={true} />
    </div>;
};