import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface DbProperty {
  id: string;
  user_id: string;
  name: string;
  domain: string;
  widget_color: string;
  greeting: string;
  offline_message: string;
  created_at: string;
  updated_at: string;
}

export interface DbVisitor {
  id: string;
  property_id: string;
  session_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  age: string | null;
  occupation: string | null;
  browser_info: string | null;
  location: string | null;
  current_page: string | null;
  created_at: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'agent' | 'visitor';
  content: string;
  read: boolean;
  created_at: string;
}

export interface DbConversation {
  id: string;
  property_id: string;
  visitor_id: string;
  assigned_agent_id: string | null;
  status: 'active' | 'closed' | 'pending';
  is_test: boolean;
  created_at: string;
  updated_at: string;
  visitor?: DbVisitor;
  messages?: DbMessage[];
  property?: DbProperty;
}

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [properties, setProperties] = useState<DbProperty[]>([]);

  // Avoid channel-name collisions when this hook is mounted in multiple places (e.g. sidebar + widget preview).
  const realtimeChannelSuffixRef = useRef<string>(
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  // Important: `loading` should represent BOTH properties + conversations.
  // Otherwise route guards may think there are "no properties" while the properties request is still in-flight.
  const [loading, setLoading] = useState(true);
  const [propertiesLoaded, setPropertiesLoaded] = useState(false);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);

  const fetchProperties = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
      setPropertiesLoaded(true);
      return;
    }

    setProperties(data || []);
    setPropertiesLoaded(true);
  }, [user]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        visitor:visitors(*),
        property:properties(*)
      `)
      .order('updated_at', { ascending: false });

    if (convError) {
      console.error('Error fetching conversations:', convError);
      setConversations([]);
      setConversationsLoaded(true);
      return;
    }

    // Fetch messages for each conversation
    const conversationsWithMessages = await Promise.all(
      (convData || []).map(async (conv) => {
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });

        return {
          ...conv,
          status: conv.status as 'active' | 'closed' | 'pending',
          messages: (messages || []).map((m) => ({
            ...m,
            sender_type: m.sender_type as 'agent' | 'visitor',
          })),
        };
      })
    );

    setConversations(conversationsWithMessages as DbConversation[]);
    setConversationsLoaded(true);
  }, [user]);

  const sendMessage = async (conversationId: string, content: string, senderId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        sender_type: 'agent',
        content,
        read: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return null;
    }

    // Update conversation status to active
    await supabase
      .from('conversations')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return data;
  };

  const markMessagesAsRead = async (conversationId: string) => {
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'visitor');
  };

  const closeConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from('conversations')
      .update({ status: 'closed' })
      .eq('id', conversationId);

    if (error) {
      console.error('Error closing conversation:', error);
      toast.error('Failed to close conversation');
      return false;
    }

    return true;
  };

  const createProperty = async (name: string, domain: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('properties')
      .insert({
        user_id: user.id,
        name,
        domain,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating property:', error);
      toast.error('Failed to create property');
      return null;
    }

    toast.success('Property created successfully');
    await fetchProperties();
    return data;
  };

  const deleteProperty = async (propertyId: string) => {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId);

    if (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
      return false;
    }

    toast.success('Property deleted successfully');
    await fetchProperties();
    return true;
  };

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setProperties([]);
      setLoading(false);
      setPropertiesLoaded(false);
      setConversationsLoaded(false);
      return;
    }

    // New session / mount: reset to a known loading state.
    setLoading(true);
    setPropertiesLoaded(false);
    setConversationsLoaded(false);

    fetchProperties();
    fetchConversations();
  }, [user, fetchProperties, fetchConversations]);

  useEffect(() => {
    if (propertiesLoaded && conversationsLoaded) {
      setLoading(false);
    }
  }, [propertiesLoaded, conversationsLoaded]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const messagesChannel = supabase
      .channel(`messages-realtime-${realtimeChannelSuffixRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    const conversationsChannel = supabase
      .channel(`conversations-realtime-${realtimeChannelSuffixRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    // Subscribe to visitor updates (for AI-extracted info)
    const visitorsChannel = supabase
      .channel(`visitors-realtime-${realtimeChannelSuffixRef.current}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'visitors' },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(visitorsChannel);
    };
  }, [user, fetchConversations]);

  return {
    conversations,
    properties,
    loading,
    sendMessage,
    markMessagesAsRead,
    closeConversation,
    createProperty,
    deleteProperty,
    refetch: fetchConversations,
  };
};
