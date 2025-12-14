import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types/chat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Globe, Clock, User } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

const ConversationItem = ({ conversation, isSelected, onClick }: ConversationItemProps) => {
  const { visitor, lastMessage, unreadCount, status } = conversation;
  const visitorName = visitor.name || `Visitor ${visitor.sessionId.slice(-4)}`;
  const initials = visitorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 border-b border-border/50 cursor-pointer transition-all duration-200",
        "hover:bg-accent/40 hover:border-l-2 hover:border-l-primary/30",
        isSelected && "bg-accent border-l-2 border-l-primary shadow-sm",
        unreadCount > 0 && !isSelected && "bg-primary/5"
      )}
    >
      <div className="flex gap-3">
        <div className="relative flex-shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarFallback className={cn(
              "text-sm font-medium",
              status === 'active' ? "bg-primary/10 text-primary" :
              status === 'pending' ? "bg-status-away/10 text-status-away" :
              "bg-muted text-muted-foreground"
            )}>
              {initials}
            </AvatarFallback>
          </Avatar>
          {status === 'active' && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-status-online rounded-full border-2 border-background" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className={cn(
              "text-sm truncate",
              unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/90"
            )}>
              {visitorName}
            </h4>
            <div className="flex items-center gap-2 flex-shrink-0">
              {unreadCount > 0 && (
                <Badge variant="default" className="bg-primary text-primary-foreground h-5 min-w-[20px] flex items-center justify-center">
                  {unreadCount}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {lastMessage && formatDistanceToNow(new Date(lastMessage.timestamp), { addSuffix: false })}
              </span>
            </div>
          </div>

          <p className={cn(
            "text-sm truncate mb-2",
            unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
          )}>
            {lastMessage?.senderType === 'agent' && (
              <span className="text-muted-foreground">You: </span>
            )}
            {lastMessage?.content || 'No messages yet'}
          </p>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {visitor.currentPage && (
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <span className="truncate max-w-[100px]">{visitor.currentPage}</span>
              </span>
            )}
            {visitor.location && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate max-w-[80px]">{visitor.location}</span>
              </span>
            )}
            {status === 'pending' && (
              <Badge variant="outline" className="text-status-away border-status-away/30 bg-status-away/10 text-xs py-0">
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ConversationList = ({ conversations, selectedId, onSelect }: ConversationListProps) => {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-1">No conversations</h3>
        <p className="text-sm text-muted-foreground">
          Conversations will appear here when visitors start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full scrollbar-thin">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isSelected={conversation.id === selectedId}
          onClick={() => onSelect(conversation)}
        />
      ))}
    </div>
  );
};

import { MessageSquare } from 'lucide-react';
