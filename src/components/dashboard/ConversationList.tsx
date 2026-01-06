import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types/chat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, Clock, User, FlaskConical, Trash2, MessageSquare } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
  showDelete?: boolean;
  onDelete?: (conversationId: string) => void;
}

interface ConversationItemProps {
  conversation: Conversation & { isTest?: boolean };
  isSelected: boolean;
  onClick: () => void;
  showDelete?: boolean;
  onDelete?: (conversationId: string) => void;
}

const ConversationItem = ({ conversation, isSelected, onClick, showDelete, onDelete }: ConversationItemProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { visitor, lastMessage, unreadCount, status } = conversation;
  const isTest = (conversation as any).isTest;
  const visitorName = isTest ? 'Test Visitor' : (visitor.name || `Visitor ${visitor.sessionId.slice(-4)}`);
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
              isTest ? "bg-amber-500/10 text-amber-600" :
              status === 'active' ? "bg-primary/10 text-primary" :
              status === 'pending' ? "bg-status-away/10 text-status-away" :
              "bg-muted text-muted-foreground"
            )}>
              {isTest ? <FlaskConical className="h-4 w-4" /> : initials}
            </AvatarFallback>
          </Avatar>
          {status === 'active' && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-status-online rounded-full border-2 border-background" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className={cn(
                "text-sm truncate",
                unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/90"
              )}>
                {visitorName}
              </h4>
              {isTest && (
                <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 text-xs py-0 flex-shrink-0">
                  <FlaskConical className="h-3 w-3 mr-1" />
                  Test
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {showDelete && onDelete && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this conversation and all its messages. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(conversation.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              {unreadCount > 0 && !showDelete && (
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

export const ConversationList = ({ conversations, selectedId, onSelect, showDelete, onDelete }: ConversationListProps) => {
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
          showDelete={showDelete}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
