import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, Trash2 } from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ConversationList } from '@/components/dashboard/ConversationList';
import { ChatPanel } from '@/components/dashboard/ChatPanel';
import { useConversations, DbConversation } from '@/hooks/useConversations';
import { Conversation, Message } from '@/types/chat';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SidebarStateProvider, useSidebarState } from '@/hooks/useSidebarState';

type FilterStatus = 'all' | 'active' | 'closed';

// Convert DB conversation to UI conversation format
const toUiConversation = (dbConv: DbConversation): Conversation & { isTest?: boolean } => ({
  id: dbConv.id,
  propertyId: dbConv.property_id,
  visitorId: dbConv.visitor_id,
  visitor: {
    id: dbConv.visitor?.id || '',
    sessionId: dbConv.visitor?.session_id || '',
    name: dbConv.visitor?.name || undefined,
    email: dbConv.visitor?.email || undefined,
    phone: dbConv.visitor?.phone || undefined,
    age: dbConv.visitor?.age || undefined,
    occupation: dbConv.visitor?.occupation || undefined,
    propertyId: dbConv.property_id,
    browserInfo: dbConv.visitor?.browser_info || undefined,
    location: dbConv.visitor?.location || undefined,
    currentPage: dbConv.visitor?.current_page || undefined,
    createdAt: new Date(dbConv.visitor?.created_at || dbConv.created_at),
    addiction_history: dbConv.visitor?.addiction_history || undefined,
    drug_of_choice: dbConv.visitor?.drug_of_choice || undefined,
    treatment_interest: dbConv.visitor?.treatment_interest || undefined,
    insurance_info: dbConv.visitor?.insurance_info || undefined,
    urgency_level: dbConv.visitor?.urgency_level || undefined,
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
  isTest: dbConv.is_test || false,
});

const DashboardContent = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { conversations: dbConversations, properties, loading: dataLoading, sendMessage, markMessagesAsRead, closeConversation, closeConversations, deleteConversation, deleteConversations } = useConversations();
  const { setCollapsed } = useSidebarState();
  
  // Determine filter from path
  const statusFilter = useMemo((): FilterStatus => {
    if (location.pathname === '/dashboard/active') return 'active';
    if (location.pathname === '/dashboard/closed') return 'closed';
    return 'all';
  }, [location.pathname]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Redirect to onboarding if no properties - only after data has loaded
  // We need to ensure properties have been fetched (dataLoading was true then became false)
  const [propertiesChecked, setPropertiesChecked] = useState(false);
  
  useEffect(() => {
    // Only mark as checked once data loading completes
    if (!dataLoading && user) {
      setPropertiesChecked(true);
    }
  }, [dataLoading, user]);
  
  useEffect(() => {
    if (propertiesChecked && properties.length === 0) {
      navigate('/onboarding');
    }
  }, [propertiesChecked, properties.length, navigate]);
  
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
      // Filter by status based on path
      if (statusFilter === 'active' && conv.status === 'closed') return false;
      if (statusFilter === 'closed' && conv.status !== 'closed') return false;
      // 'all' shows everything
      
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
    setCollapsed(true); // Auto-collapse sidebar when selecting a conversation
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

  const handleDeleteConversation = async (conversationId: string) => {
    if (selectedConversationId === conversationId) {
      setSelectedConversationId(null);
    }
    await deleteConversation(conversationId);
  };

  const handleBulkClose = async (conversationIds: string[]) => {
    if (selectedConversationId && conversationIds.includes(selectedConversationId)) {
      setSelectedConversationId(null);
    }
    return await closeConversations(conversationIds);
  };

  const handleBulkDelete = async (conversationIds: string[]) => {
    if (selectedConversationId && conversationIds.includes(selectedConversationId)) {
      setSelectedConversationId(null);
    }
    return await deleteConversations(conversationIds);
  };

  const handleCreateTestConversation = async () => {
    if (!user || properties.length === 0) {
      toast.error('No properties available');
      return;
    }

    const propertyId = properties[0].id;
    const sessionId = `test-session-${Date.now()}`;

    try {
      // Create a test visitor
      const { data: visitor, error: visitorError } = await supabase
        .from('visitors')
        .insert({
          property_id: propertyId,
          session_id: sessionId,
          name: `Test Visitor ${Math.floor(Math.random() * 1000)}`,
          email: `visitor-${Date.now()}@test.local`,
          current_page: 'https://example.com/test-page',
          browser_info: 'Test Browser',
          location: 'Test Location',
        })
        .select()
        .single();

      if (visitorError) {
        toast.error('Failed to create visitor: ' + visitorError.message);
        return;
      }

      // Create a test conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          property_id: propertyId,
          visitor_id: visitor.id,
          status: 'pending',
        })
        .select()
        .single();

      if (convError) {
        toast.error('Failed to create conversation: ' + convError.message);
        return;
      }

      // Add some test messages
      const testMessages = [
        { sender_type: 'visitor', sender_id: visitor.id, content: 'Hello, I need help with something.' },
        { sender_type: 'visitor', sender_id: visitor.id, content: 'Is anyone available to chat?' },
      ];

      for (const msg of testMessages) {
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          ...msg,
        });
      }

      toast.success('Test conversation created! Refresh to see it.');
    } catch (error) {
      console.error('Error creating test conversation:', error);
      toast.error('Failed to create test conversation');
    }
  };

  const getStatusTitle = () => {
    switch (statusFilter) {
      case 'active': return 'Active Conversations';
      case 'closed': return 'Closed Conversations';
      default: return 'All Conversations';
    }
  };

  const isClosedView = statusFilter === 'closed';

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
    <div className="flex h-screen bg-gradient-subtle">
      <DashboardSidebar />
      
      <div className="flex-1 flex min-w-0">
        {/* Conversation List */}
        <div className="w-80 border-r border-border/50 flex flex-col glass">
          {/* Header */}
          <div className="p-4 border-b border-border/50 space-y-3 bg-transparent">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{getStatusTitle()}</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCreateTestConversation} className="text-xs h-7">
                  <Plus className="h-3 w-3 mr-1" />
                  Test
                </Button>
                {totalUnread > 0 && (
                  <span className="text-sm text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">{totalUnread} unread</span>
                )}
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="pl-9 bg-background/50 border-border/50 focus:bg-background transition-colors"
              />
            </div>

            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-full bg-background/50 border-border/50 hover:bg-background transition-colors">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
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
            showDelete={isClosedView}
            onDelete={handleDeleteConversation}
            onBulkClose={handleBulkClose}
            onBulkDelete={handleBulkDelete}
            showBulkActions={true}
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

const Dashboard = () => (
  <SidebarStateProvider>
    <DashboardContent />
  </SidebarStateProvider>
);

export default Dashboard;
