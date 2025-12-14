import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  sender_type: 'agent' | 'visitor';
  created_at: string;
}

interface WidgetChatConfig {
  propertyId: string;
  greeting?: string;
}

const getOrCreateSessionId = (): string => {
  const key = 'chat_session_id';
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
};

const getBrowserInfo = (): string => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  const os = ua.includes('Windows') ? 'Windows' 
    : ua.includes('Mac') ? 'macOS' 
    : ua.includes('Linux') ? 'Linux' 
    : ua.includes('Android') ? 'Android' 
    : ua.includes('iOS') ? 'iOS' 
    : 'Unknown';
  
  return `${browser}, ${os}`;
};

export const useWidgetChat = ({ propertyId, greeting }: WidgetChatConfig) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  const initializeChat = useCallback(async () => {
    if (!propertyId || propertyId === 'demo') {
      setLoading(false);
      return;
    }

    const sessionId = getOrCreateSessionId();

    // Check for existing visitor
    let { data: visitor } = await supabase
      .from('visitors')
      .select('*')
      .eq('property_id', propertyId)
      .eq('session_id', sessionId)
      .maybeSingle();

    // Create visitor if doesn't exist
    if (!visitor) {
      const { data: newVisitor, error } = await supabase
        .from('visitors')
        .insert({
          property_id: propertyId,
          session_id: sessionId,
          browser_info: getBrowserInfo(),
          current_page: window.location.pathname,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating visitor:', error);
        setLoading(false);
        return;
      }
      visitor = newVisitor;
    } else {
      // Update current page
      await supabase
        .from('visitors')
        .update({ current_page: window.location.pathname })
        .eq('id', visitor.id);
    }

    setVisitorId(visitor.id);

    // Check for existing conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('property_id', propertyId)
      .eq('visitor_id', visitor.id)
      .neq('status', 'closed')
      .maybeSingle();

    if (conversation) {
      setConversationId(conversation.id);
      
      // Fetch existing messages
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      setMessages((existingMessages || []).map(m => ({
        ...m,
        sender_type: m.sender_type as 'agent' | 'visitor',
      })));
    }

    setLoading(false);
  }, [propertyId]);

  const sendMessage = async (content: string) => {
    if (!propertyId || propertyId === 'demo' || !visitorId) {
      // Demo mode - just add to local state
      const demoMsg: Message = {
        id: `msg-${Date.now()}`,
        content,
        sender_type: 'visitor',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, demoMsg]);
      
      // Simulate agent response
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const agentReply: Message = {
          id: `msg-${Date.now() + 1}`,
          content: "Thanks for your message! An agent will respond shortly.",
          sender_type: 'agent',
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, agentReply]);
      }, 1500);
      
      return;
    }

    let currentConversationId = conversationId;

    // Create conversation if doesn't exist
    if (!currentConversationId) {
      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert({
          property_id: propertyId,
          visitor_id: visitorId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return;
      }

      currentConversationId = newConversation.id;
      setConversationId(currentConversationId);
    }

    // Send message
    const { data: newMessage, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: currentConversationId,
        sender_id: visitorId,
        sender_type: 'visitor',
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    setMessages(prev => [...prev, { ...newMessage, sender_type: newMessage.sender_type as 'agent' | 'visitor' }]);
  };

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const rawMsg = payload.new as { id: string; content: string; sender_type: string; created_at: string };
          const newMsg: Message = {
            ...rawMsg,
            sender_type: rawMsg.sender_type as 'agent' | 'visitor',
          };
          // Only add if it's from agent (visitor messages are added immediately)
          if (newMsg.sender_type === 'agent') {
            setMessages(prev => {
              const exists = prev.some(m => m.id === newMsg.id);
              if (exists) return prev;
              return [...prev, newMsg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return {
    messages,
    sendMessage,
    loading,
    isTyping,
    visitorId,
    conversationId,
  };
};
