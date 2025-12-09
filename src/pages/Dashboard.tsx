import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, BarChart3 } from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ConversationList } from '@/components/dashboard/ConversationList';
import { ChatPanel } from '@/components/dashboard/ChatPanel';
import { BlogAnalytics } from '@/components/dashboard/BlogAnalytics';
import { mockConversations, mockProperties } from '@/data/mockData';
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
import { ScrollArea } from '@/components/ui/scroll-area';

type FilterStatus = 'all' | 'active' | 'pending' | 'closed';

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const statusFilter = (searchParams.get('status') as FilterStatus) || 'all';
  
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');

  const filteredConversations = conversations.filter(conv => {
    // Status filter
    if (statusFilter !== 'all' && conv.status !== statusFilter) return false;
    
    // Property filter
    if (propertyFilter !== 'all' && conv.propertyId !== propertyFilter) return false;
    
    // Search filter
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

  const handleSelectConversation = (conversation: Conversation) => {
    // Mark messages as read
    const updated = conversations.map(conv => 
      conv.id === conversation.id 
        ? { 
            ...conv, 
            unreadCount: 0,
            messages: conv.messages.map(m => ({ ...m, read: true }))
          } 
        : conv
    );
    setConversations(updated);
    setSelectedConversation(updated.find(c => c.id === conversation.id) || null);
  };

  const handleSendMessage = (content: string) => {
    if (!selectedConversation) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId: selectedConversation.id,
      senderId: 'agent-1',
      senderType: 'agent',
      content,
      timestamp: new Date(),
      read: true,
    };

    const updated = conversations.map(conv => 
      conv.id === selectedConversation.id 
        ? { 
            ...conv, 
            messages: [...conv.messages, newMessage],
            lastMessage: newMessage,
            updatedAt: new Date(),
            status: 'active' as const,
          } 
        : conv
    );

    setConversations(updated);
    setSelectedConversation(updated.find(c => c.id === selectedConversation.id) || null);
  };

  const handleCloseConversation = () => {
    if (!selectedConversation) return;

    const updated = conversations.map(conv => 
      conv.id === selectedConversation.id 
        ? { ...conv, status: 'closed' as const } 
        : conv
    );

    setConversations(updated);
    setSelectedConversation(updated.find(c => c.id === selectedConversation.id) || null);
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
                {mockProperties.map(prop => (
                  <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* List */}
          <ConversationList
            conversations={filteredConversations}
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

        {/* Analytics Sidebar */}
        <div className="w-80 border-l border-border bg-card hidden xl:block">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Lead Analytics
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Track blog performance & lead sources
            </p>
          </div>
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-4">
              <BlogAnalytics />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
