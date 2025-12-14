import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ConversationList } from '@/components/dashboard/ConversationList';
import { ChatPanel } from '@/components/dashboard/ChatPanel';
import { useConversations, DbConversation } from '@/hooks/useConversations';
import { Conversation, Message } from '@/types/chat';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';

type FilterStatus = 'all' | 'active' | 'pending' | 'closed';

// Convert DB conversation to UI conversation format
const toUiConversation = (dbConv: DbConversation): Conversation => ({
  id: dbConv.id,
  propertyId: dbConv.property_id,
  visitorId: dbConv.visitor_id,
  visitor: {
    id: dbConv.visitor?.id || '',
    sessionId: dbConv.visitor?.session_id || '',
    name: dbConv.visitor?.name || undefined,
    email: dbConv.visitor?.email || undefined,
    propertyId: dbConv.property_id,
    browserInfo: dbConv.visitor?.browser_info || undefined,
    location: dbConv.visitor?.location || undefined,
    currentPage: dbConv.visitor?.current_page || undefined,
    createdAt: new Date(dbConv.visitor?.created_at || dbConv.created_at),
  },
  assignedAgentId: dbConv.assigned_agent_id || undefined,
  status: dbConv.status,
  messages: (dbConv.messages || []).map(m => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    senderType: m.sender_type,
    content: m.content,
    timestamp: new Date(m.created_at),
    read: m.read,
  })),
  unreadCount: (dbConv.messages || []).filter(m => !m.read && m.sender_type === 'visitor').length,
  createdAt: new Date(dbConv.created_at),
  updatedAt: new Date(dbConv.updated_at),
});

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { conversations: dbConversations, properties, loading: dataLoading, sendMessage, markMessagesAsRead, closeConversation } = useConversations();
  
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const statusFilter = (searchParams.get('status') as FilterStatus) || 'all';
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');

  // Convert DB conversations to UI format
  const conversations = useMemo(() => 
    dbConversations.map(toUiConversation), 
    [dbConversations]
  );

  // Get selected conversation
  const selectedConversation = useMemo(() => 
    conversations.find(c => c.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      if (statusFilter !== 'all' && conv.status !== statusFilter) return false;
      if (propertyFilter !== 'all' && conv.propertyId !== propertyFilter) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const visitorName = conv.visitor.name?.toLowerCase() || '';
        const visitorEmail = conv.visitor.email?.toLowerCase() || '';
        const lastMessage = conv.lastMessage?.content.toLowerCase() || '';
        
        if (!visitorName.includes(query) && !visitorEmail.includes(query) && !lastMessage.includes(query)) {
          return false;
        }
      }
      
      return true;
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [conversations, statusFilter, propertyFilter, searchQuery]);

  // Add lastMessage to conversations
  const conversationsWithLastMessage = useMemo(() => 
    filteredConversations.map(conv => ({
      ...conv,
      lastMessage: conv.messages[conv.messages.length - 1],
    })),
    [filteredConversations]
  );

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    await markMessagesAsRead(conversation.id);
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation || !user) return;
    await sendMessage(selectedConversation.id, content, user.id);
  };

  const handleCloseConversation = async () => {
    if (!selectedConversation) return;
    await closeConversation(selectedConversation.id);
  };

  const getStatusTitle = () => {
    switch (statusFilter) {
      case 'active': return 'Active Conversations';
      case 'pending': return 'Pending Conversations';
      case 'closed': return 'Closed Conversations';
      default: return 'All Conversations';
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const loading = authLoading || dataLoading;

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      
      <div className="flex-1 flex min-w-0">
        {/* Conversation List */}
        <div className="w-80 border-r border-border flex flex-col bg-card">
          {/* Header */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{getStatusTitle()}</h2>
              {totalUnread > 0 && (
                <span className="text-sm text-primary font-medium">{totalUnread} unread</span>
              )}
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="pl-9"
              />
            </div>

            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map(prop => (
                  <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* List */}
          <ConversationList
            conversations={conversationsWithLastMessage}
            selectedId={selectedConversation?.id}
            onSelect={handleSelectConversation}
          />
        </div>

        {/* Chat Panel */}
        <div className="flex-1 min-w-0">
          <ChatPanel
            conversation={selectedConversation}
            onSendMessage={handleSendMessage}
            onCloseConversation={handleCloseConversation}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
