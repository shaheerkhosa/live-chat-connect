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

const getPageInfo = () => ({
  url: window.location.href,
  pageTitle: document.title,
});

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`;
const TRACK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-page-analytics`;

const trackAnalyticsEvent = async (
  propertyId: string,
  eventType: 'chat_open' | 'human_escalation'
) => {
  const { url, pageTitle } = getPageInfo();
  try {
    await fetch(TRACK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        property_id: propertyId,
        url,
        page_title: pageTitle,
        event_type: eventType,
      }),
    });
  } catch (error) {
    console.error('Failed to track analytics event:', error);
  }
};

async function streamAIResponse({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: { role: 'user' | 'assistant'; content: string }[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages }),
    });

    if (!resp.ok) {
      const error = await resp.json();
      onError(error.error || 'Failed to get AI response');
      return;
    }

    if (!resp.body) {
      onError('No response body');
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split('\n')) {
        if (!raw) continue;
        if (raw.endsWith('\r')) raw = raw.slice(0, -1);
        if (raw.startsWith(':') || raw.trim() === '') continue;
        if (!raw.startsWith('data: ')) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (error) {
    console.error('Stream error:', error);
    onError('Connection error. Please try again.');
  }
}

export const useWidgetChat = ({ propertyId, greeting }: WidgetChatConfig) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [chatOpenTracked, setChatOpenTracked] = useState(false);
  const [humanEscalationTracked, setHumanEscalationTracked] = useState(false);

  const initializeChat = useCallback(async () => {
    if (!propertyId || propertyId === 'demo') {
      // Add greeting message in demo mode
      if (greeting) {
        setMessages([{
          id: 'greeting',
          content: greeting,
          sender_type: 'agent',
          created_at: new Date().toISOString(),
        }]);
      }
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
    } else if (greeting) {
      // Add greeting for new conversations
      setMessages([{
        id: 'greeting',
        content: greeting,
        sender_type: 'agent',
        created_at: new Date().toISOString(),
      }]);
    }

    setLoading(false);
  }, [propertyId, greeting]);

  const sendMessage = async (content: string) => {
    const visitorMessage: Message = {
      id: `msg-${Date.now()}`,
      content,
      sender_type: 'visitor',
      created_at: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, visitorMessage]);

    // Track chat_open event on first message
    if (!chatOpenTracked && propertyId && propertyId !== 'demo') {
      setChatOpenTracked(true);
      trackAnalyticsEvent(propertyId, 'chat_open');
    }

    // Build conversation history for AI
    const conversationHistory = messages
      .filter(m => m.id !== 'greeting')
      .map(m => ({
        role: m.sender_type === 'visitor' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));
    
    conversationHistory.push({ role: 'user', content });

    // Show typing indicator
    setIsTyping(true);

    // Create placeholder for AI response
    const aiMessageId = `ai-${Date.now()}`;
    let aiContent = '';

    // Stream AI response
    await streamAIResponse({
      messages: conversationHistory,
      onDelta: (delta) => {
        aiContent += delta;
        setMessages(prev => {
          const existing = prev.find(m => m.id === aiMessageId);
          if (existing) {
            return prev.map(m => m.id === aiMessageId ? { ...m, content: aiContent } : m);
          } else {
            return [...prev, {
              id: aiMessageId,
              content: aiContent,
              sender_type: 'agent' as const,
              created_at: new Date().toISOString(),
            }];
          }
        });
      },
      onDone: () => {
        setIsTyping(false);
      },
      onError: (error) => {
        setIsTyping(false);
        console.error('AI Error:', error);
        // Add error message
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          content: "I'm having trouble connecting right now. Please try again in a moment, or speak directly with our team.",
          sender_type: 'agent',
          created_at: new Date().toISOString(),
        }]);
      },
    });

    // If connected to a real property, also save to database
    if (propertyId && propertyId !== 'demo' && visitorId) {
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

        if (!error && newConversation) {
          currentConversationId = newConversation.id;
          setConversationId(currentConversationId);
        }
      }

      if (currentConversationId) {
        // Save visitor message
        await supabase
          .from('messages')
          .insert({
            conversation_id: currentConversationId,
            sender_id: visitorId,
            sender_type: 'visitor',
            content,
          });

        // Save AI response
        if (aiContent) {
          await supabase
            .from('messages')
            .insert({
              conversation_id: currentConversationId,
              sender_id: 'ai-bot',
              sender_type: 'agent',
              content: aiContent,
            });
        }
      }
    }
  };

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // Subscribe to realtime messages (for human agent responses)
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
          const rawMsg = payload.new as { id: string; content: string; sender_type: string; sender_id: string; created_at: string };
          // Only add agent messages that aren't from AI (human agent override)
          if (rawMsg.sender_type === 'agent' && rawMsg.sender_id !== 'ai-bot') {
            // Track human escalation event (only once per conversation)
            if (!humanEscalationTracked && propertyId && propertyId !== 'demo') {
              setHumanEscalationTracked(true);
              trackAnalyticsEvent(propertyId, 'human_escalation');
            }

            const newMsg: Message = {
              id: rawMsg.id,
              content: rawMsg.content,
              sender_type: 'agent',
              created_at: rawMsg.created_at,
            };
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
  }, [conversationId, humanEscalationTracked, propertyId]);

  return {
    messages,
    sendMessage,
    loading,
    isTyping,
    visitorId,
    conversationId,
  };
};
