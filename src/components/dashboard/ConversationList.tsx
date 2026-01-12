import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types/chat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Globe, Clock, User, FlaskConical, Trash2, MessageSquare, X, Archive, CheckSquare } from 'lucide-react';
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
  onBulkClose?: (conversationIds: string[]) => Promise<boolean>;
  onBulkDelete?: (conversationIds: string[]) => Promise<boolean>;
  showBulkActions?: boolean;
}

interface ConversationItemProps {
  conversation: Conversation & { isTest?: boolean };
  isSelected: boolean;
  isChecked: boolean;
  selectionMode: boolean;
  onClick: () => void;
  onCheckChange: (checked: boolean) => void;
  showDelete?: boolean;
  onDelete?: (conversationId: string) => void;
}

const ConversationItem = ({ 
  conversation, 
  isSelected, 
  isChecked,
  selectionMode,
  onClick, 
  onCheckChange,
  showDelete, 
  onDelete 
}: ConversationItemProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { visitor, lastMessage, unreadCount, status } = conversation;
  const isTest = (conversation as any).isTest;
  const visitorName = visitor.name || (isTest ? 'Test Visitor' : `Visitor ${visitor.sessionId.slice(-4)}`);
  const initials = visitorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div
      onClick={(e) => {
        if (selectionMode) {
          e.preventDefault();
          onCheckChange(!isChecked);
        } else {
          onClick();
        }
      }}
      className={cn(
        "p-4 border-b border-border/50 cursor-pointer transition-all duration-200",
        "hover:bg-accent/40 hover:border-l-2 hover:border-l-primary/30",
        isSelected && !selectionMode && "bg-accent border-l-2 border-l-primary shadow-sm",
        isChecked && selectionMode && "bg-primary/10 border-l-2 border-l-primary",
        unreadCount > 0 && !isSelected && !isChecked && "bg-primary/5"
      )}
    >
      <div className="flex gap-3">
        {selectionMode && (
          <div className="flex items-center flex-shrink-0">
            <Checkbox 
              checked={isChecked} 
              onCheckedChange={onCheckChange}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
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
              {showDelete && onDelete && !selectionMode && (
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
              {unreadCount > 0 && !showDelete && !selectionMode && (
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

          {status === 'pending' && (
            <Badge variant="outline" className="text-status-away border-status-away/30 bg-status-away/10 text-xs py-0 w-fit">
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export const ConversationList = ({ 
  conversations, 
  selectedId, 
  onSelect, 
  showDelete, 
  onDelete,
  onBulkClose,
  onBulkDelete,
  showBulkActions = false
}: ConversationListProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkCloseDialog, setShowBulkCloseDialog] = useState(false);

  const handleCheckChange = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === conversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(conversations.map(c => c.id)));
    }
  };

  const handleBulkClose = async () => {
    if (onBulkClose && selectedIds.size > 0) {
      const success = await onBulkClose(Array.from(selectedIds));
      if (success) {
        setSelectedIds(new Set());
        setSelectionMode(false);
      }
    }
    setShowBulkCloseDialog(false);
  };

  const handleBulkDelete = async () => {
    if (onBulkDelete && selectedIds.size > 0) {
      const success = await onBulkDelete(Array.from(selectedIds));
      if (success) {
        setSelectedIds(new Set());
        setSelectionMode(false);
      }
    }
    setShowBulkDeleteDialog(false);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

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
    <div className="flex flex-col h-full">
      {/* Bulk Actions Toolbar */}
      {showBulkActions && (
        <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/30">
          {selectionMode ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={exitSelectionMode}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-8"
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                {selectedIds.size === conversations.length ? 'Deselect All' : 'Select All'}
              </Button>
              {selectedIds.size > 0 && (
                <>
                  <div className="h-4 w-px bg-border mx-1" />
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size} selected
                  </span>
                  <div className="flex-1" />
                  {onBulkClose && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkCloseDialog(true)}
                      className="h-8"
                    >
                      <Archive className="h-4 w-4 mr-1" />
                      Close
                    </Button>
                  )}
                  {onBulkDelete && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowBulkDeleteDialog(true)}
                      className="h-8"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </>
              )}
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectionMode(true)}
              className="h-8 text-muted-foreground"
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              Select
            </Button>
          )}
        </div>
      )}

      {/* Conversation List */}
      <div className="overflow-y-auto flex-1 scrollbar-thin">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isSelected={conversation.id === selectedId}
            isChecked={selectedIds.has(conversation.id)}
            selectionMode={selectionMode}
            onClick={() => onSelect(conversation)}
            onCheckChange={(checked) => handleCheckChange(conversation.id, checked)}
            showDelete={showDelete}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Bulk Close Confirmation */}
      <AlertDialog open={showBulkCloseDialog} onOpenChange={setShowBulkCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close {selectedIds.size} conversation{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              These conversations will be marked as closed and moved to the Closed tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkClose}>
              Close Conversations
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} conversation{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete these conversations and all their messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Conversations
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
