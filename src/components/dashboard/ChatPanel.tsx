import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { Send, MoreVertical, User, Globe, Monitor, MapPin, Archive, UserPlus, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Conversation, Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockAgents } from '@/data/mockData';
import { useVideoChat } from '@/hooks/useVideoChat';
import { VideoCallModal } from '@/components/video/VideoCallModal';
import { useToast } from '@/hooks/use-toast';

interface ChatPanelProps {
  conversation: Conversation | null;
  onSendMessage: (content: string) => void;
  onCloseConversation: () => void;
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

const MessageBubble = ({ message, isAgent }: { message: Message; isAgent: boolean }) => (
  <div className={cn(
    "flex gap-2 message-enter",
    isAgent ? "flex-row-reverse" : "flex-row"
  )}>
    {!isAgent && (
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
          V
        </AvatarFallback>
      </Avatar>
    )}
    <div className={cn(
      "max-w-[70%] rounded-2xl px-4 py-2.5",
      isAgent 
        ? "bg-chat-user text-chat-user-foreground rounded-br-md" 
        : "bg-chat-visitor text-chat-visitor-foreground rounded-bl-md"
    )}>
      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
      <p className={cn(
        "text-xs mt-1",
        isAgent ? "text-chat-user-foreground/70" : "text-muted-foreground"
      )}>
        {formatMessageTime(new Date(message.timestamp))}
      </p>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8">
    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
      <MessageSquare className="h-10 w-10 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-medium text-foreground mb-2">Select a conversation</h3>
    <p className="text-sm text-muted-foreground max-w-xs">
      Choose a conversation from the list to start chatting with visitors
    </p>
  </div>
);

export const ChatPanel = ({ conversation, onSendMessage, onCloseConversation }: ChatPanelProps) => {
  const [message, setMessage] = useState('');
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const videoChat = useVideoChat({
    onCallRequest: () => {
      toast({
        title: "Calling visitor",
        description: "Waiting for visitor to accept...",
      });
    },
    onCallAccepted: () => {
      toast({
        title: "Call connected",
        description: "Video call is now active",
      });
    },
    onCallEnded: () => {
      toast({
        title: "Call ended",
        description: "The video call has ended",
      });
    },
  });

  const handleStartVideoCall = async () => {
    setIsVideoCallOpen(true);
    await videoChat.initiateCall();
  };

  const handleEndVideoCall = () => {
    videoChat.endCall();
    setIsVideoCallOpen(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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

  if (!conversation) {
    return <EmptyState />;
  }

  const { visitor, messages, status, assignedAgentId } = conversation;
  const visitorName = visitor.name || `Visitor ${visitor.sessionId.slice(-4)}`;
  const assignedAgent = assignedAgentId ? mockAgents.find(a => a.id === assignedAgentId) : null;

  return (
    <div className="flex h-full bg-gradient-subtle">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-border bg-card/90 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary">
                {visitorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{visitorName}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {visitor.currentPage || 'Browsing'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "capitalize",
                status === 'active' && "border-status-online text-status-online bg-status-online/10",
                status === 'pending' && "border-status-away text-status-away bg-status-away/10",
                status === 'closed' && "border-muted-foreground text-muted-foreground"
              )}
            >
              {status}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartVideoCall}
              disabled={status === 'closed'}
              className="gap-2"
            >
              <Video className="h-4 w-4" />
              Video Call
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign to agent
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onCloseConversation}
                  disabled={status === 'closed'}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Close conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background scrollbar-thin">
          {messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              isAgent={msg.senderType === 'agent'} 
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card/90 backdrop-blur-sm">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={status === 'closed' ? 'Conversation closed' : 'Type a message...'}
              disabled={status === 'closed'}
              className="flex-1 bg-background/50 focus:bg-background transition-colors"
            />
            <Button 
              onClick={handleSend} 
              disabled={!message.trim() || status === 'closed'}
              className="bg-primary hover:bg-primary/90 glow-primary transition-all hover:scale-105"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Visitor Info Sidebar */}
      <div className="w-72 border-l border-border bg-card/80 backdrop-blur-sm overflow-y-auto hidden lg:block">
        <div className="p-4 border-b border-border bg-gradient-card">
          <h4 className="font-semibold text-foreground mb-1">Visitor Details</h4>
          <p className="text-xs text-muted-foreground">
            Session started {formatDistanceToNow(new Date(visitor.createdAt), { addSuffix: true })}
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-3">
            {visitor.name && (
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm text-foreground">{visitor.name}</p>
                </div>
              </div>
            )}

            {visitor.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm text-foreground">{visitor.email}</p>
                </div>
              </div>
            )}

            {visitor.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm text-foreground">{visitor.location}</p>
                </div>
              </div>
            )}

            {visitor.currentPage && (
              <div className="flex items-start gap-3">
                <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Current Page</p>
                  <p className="text-sm text-foreground truncate">{visitor.currentPage}</p>
                </div>
              </div>
            )}

            {visitor.browserInfo && (
              <div className="flex items-start gap-3">
                <Monitor className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Browser</p>
                  <p className="text-sm text-foreground">{visitor.browserInfo}</p>
                </div>
              </div>
            )}
          </div>

          {assignedAgent && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Assigned Agent</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {assignedAgent.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{assignedAgent.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{assignedAgent.status}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Call Modal */}
      <VideoCallModal
        isOpen={isVideoCallOpen}
        onClose={() => setIsVideoCallOpen(false)}
        status={videoChat.status}
        isMuted={videoChat.isMuted}
        isVideoOff={videoChat.isVideoOff}
        error={videoChat.error}
        localVideoRef={videoChat.localVideoRef}
        remoteVideoRef={videoChat.remoteVideoRef}
        onEndCall={handleEndVideoCall}
        onToggleMute={videoChat.toggleMute}
        onToggleVideo={videoChat.toggleVideo}
        participantName={visitorName}
        isInitiator={true}
      />
    </div>
  );
};

import { MessageSquare, Mail } from 'lucide-react';
