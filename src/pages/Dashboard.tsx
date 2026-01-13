import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, MoreHorizontal, MoreVertical, Video, UserPlus, Archive } from 'lucide-react';
import gsap from 'gsap';
import { cn } from '@/lib/utils';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ConversationList } from '@/components/dashboard/ConversationList';
import { ChatPanel } from '@/components/dashboard/ChatPanel';
import { useConversations, DbConversation } from '@/hooks/useConversations';
import { Conversation, Message } from '@/types/chat';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  const [filterOpen, setFilterOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
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
    <div ref={containerRef} className="flex h-screen bg-gradient-subtle overflow-hidden">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Unified Header - Black spanning all sections */}
        <div className="flex shrink-0 bg-sidebar text-sidebar-foreground">
          {/* Conversation List Header */}
          <div className="w-80 px-4 py-3 border-r border-sidebar-border shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-sidebar-foreground">{getStatusTitle()}</h2>
              <div className="flex items-center gap-1">
                {totalUnread > 0 && (
                  <span className="text-xs text-sidebar-primary font-medium bg-sidebar-primary/20 px-2 py-0.5 rounded-full mr-1">
                    {totalUnread}
                  </span>
                )}
                
                {/* Filter Popover */}
                <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-8 w-8 ${propertyFilter !== 'all' ? 'text-sidebar-primary' : 'text-sidebar-foreground/60'} hover:bg-sidebar-accent`}
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">Filter by property</p>
                      <button
                        onClick={() => { setPropertyFilter('all'); setFilterOpen(false); }}
                        className={`w-full text-left px-2 py-1.5 text-sm rounded-lg transition-colors ${
                          propertyFilter === 'all' 
                            ? 'bg-primary/10 text-primary font-medium' 
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        All Properties
                      </button>
                      {properties.map(prop => (
                        <button
                          key={prop.id}
                          onClick={() => { setPropertyFilter(prop.id); setFilterOpen(false); }}
                          className={`w-full text-left px-2 py-1.5 text-sm rounded-lg transition-colors ${
                            propertyFilter === prop.id 
                              ? 'bg-primary/10 text-primary font-medium' 
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          {prop.name}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* More Options Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/60 hover:bg-sidebar-accent">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCreateTestConversation}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Test Conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Chat Panel Header */}
          <div className="flex-1 px-4 py-3 border-r border-sidebar-border flex items-center justify-between min-w-0">
            {selectedConversation ? (
              <>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs">
                      {(selectedConversation.visitor.name || `Visitor ${selectedConversation.visitor.sessionId.slice(-4)}`).split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sidebar-foreground truncate text-sm">
                      {selectedConversation.visitor.name || `Visitor ${selectedConversation.visitor.sessionId.slice(-4)}`}
                    </h3>
                    <p className="text-xs text-sidebar-foreground/60 truncate">
                      {selectedConversation.visitor.currentPage || 'Browsing'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(
                    "capitalize text-xs border-sidebar-border",
                    selectedConversation.status === 'active' && "border-status-online text-status-online bg-status-online/10",
                    selectedConversation.status === 'pending' && "border-status-away text-status-away bg-status-away/10",
                    selectedConversation.status === 'closed' && "border-sidebar-foreground/50 text-sidebar-foreground/50"
                  )}>
                    {selectedConversation.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/60 hover:bg-sidebar-accent">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem disabled={selectedConversation.status === 'closed'}>
                        <Video className="h-4 w-4 mr-2" />
                        Start Video Call
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign to Agent
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleCloseConversation} 
                        disabled={selectedConversation.status === 'closed'} 
                        className="text-destructive focus:text-destructive"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Close Conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <span className="text-sidebar-foreground/50 text-sm">Select a conversation</span>
            )}
          </div>

          {/* Visitor Details Header */}
          <div className="w-64 px-4 py-3 hidden lg:flex items-center shrink-0">
            <h4 className="font-medium text-sm text-sidebar-foreground">Visitor Details</h4>
          </div>
        </div>

        {/* Main Content Row - Wrapped in glass container */}
        <div className="flex flex-1 min-h-0 overflow-hidden p-2">
          <div className="flex flex-1 min-h-0 overflow-hidden rounded-2xl border border-border/30 bg-background/50 backdrop-blur-sm">
            {/* Conversation List Column */}
            <div ref={listRef} className="w-80 border-r border-border/30 flex flex-col shrink-0">
              {/* Search - White/light background */}
              <div className="px-4 py-3 border-b border-border/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="pl-9 bg-muted/50 border-border/30 text-foreground placeholder:text-muted-foreground focus:bg-background transition-colors rounded-xl"
                  />
                </div>
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
