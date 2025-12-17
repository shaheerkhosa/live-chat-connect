import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  sender_type: 'agent' | 'visitor';
  created_at: string;
}

interface PropertySettings {
  ai_response_delay_min_ms: number;
  ai_response_delay_max_ms: number;
  typing_indicator_min_ms: number;
  typing_indicator_max_ms: number;
  max_ai_messages_before_escalation: number;
  escalation_keywords: string[];
  auto_escalation_enabled: boolean;
  require_email_before_chat: boolean;
  require_name_before_chat: boolean;
  proactive_message_enabled: boolean;
  proactive_message: string | null;
  proactive_message_delay_seconds: number;
  greeting: string | null;
}

interface WidgetChatConfig {
  propertyId: string;
  greeting?: string;
}

const DEFAULT_SETTINGS: PropertySettings = {
  ai_response_delay_min_ms: 1000,
  ai_response_delay_max_ms: 2500,
  typing_indicator_min_ms: 1500,
  typing_indicator_max_ms: 3000,
  max_ai_messages_before_escalation: 5,
  escalation_keywords: ['crisis', 'emergency', 'suicide', 'help me', 'urgent'],
  auto_escalation_enabled: true,
  require_email_before_chat: false,
  require_name_before_chat: false,
  proactive_message_enabled: false,
  proactive_message: null,
  proactive_message_delay_seconds: 30,
  greeting: null,
};

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

const randomInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

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
  const [settings, setSettings] = useState<PropertySettings>(DEFAULT_SETTINGS);
  const [isEscalated, setIsEscalated] = useState(false);
  const [requiresLeadCapture, setRequiresLeadCapture] = useState(false);
  const [visitorInfo, setVisitorInfo] = useState<{ name?: string; email?: string }>({});
  const [showProactiveMessage, setShowProactiveMessage] = useState(false);
  
  const aiMessageCountRef = useRef(0);
  const proactiveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch property settings
  const fetchSettings = useCallback(async () => {
    if (!propertyId || propertyId === 'demo') return;

    const { data, error } = await supabase
      .from('properties')
      .select(`
        ai_response_delay_min_ms,
        ai_response_delay_max_ms,
        typing_indicator_min_ms,
        typing_indicator_max_ms,
        max_ai_messages_before_escalation,
        escalation_keywords,
        auto_escalation_enabled,
        require_email_before_chat,
        require_name_before_chat,
        proactive_message_enabled,
        proactive_message,
        proactive_message_delay_seconds,
        greeting
      `)
      .eq('id', propertyId)
      .single();

    if (!error && data) {
      setSettings({
        ai_response_delay_min_ms: data.ai_response_delay_min_ms ?? DEFAULT_SETTINGS.ai_response_delay_min_ms,
        ai_response_delay_max_ms: data.ai_response_delay_max_ms ?? DEFAULT_SETTINGS.ai_response_delay_max_ms,
        typing_indicator_min_ms: data.typing_indicator_min_ms ?? DEFAULT_SETTINGS.typing_indicator_min_ms,
        typing_indicator_max_ms: data.typing_indicator_max_ms ?? DEFAULT_SETTINGS.typing_indicator_max_ms,
        max_ai_messages_before_escalation: data.max_ai_messages_before_escalation ?? DEFAULT_SETTINGS.max_ai_messages_before_escalation,
        escalation_keywords: data.escalation_keywords ?? DEFAULT_SETTINGS.escalation_keywords,
        auto_escalation_enabled: data.auto_escalation_enabled ?? DEFAULT_SETTINGS.auto_escalation_enabled,
        require_email_before_chat: data.require_email_before_chat ?? DEFAULT_SETTINGS.require_email_before_chat,
        require_name_before_chat: data.require_name_before_chat ?? DEFAULT_SETTINGS.require_name_before_chat,
        proactive_message_enabled: data.proactive_message_enabled ?? DEFAULT_SETTINGS.proactive_message_enabled,
        proactive_message: data.proactive_message,
        proactive_message_delay_seconds: data.proactive_message_delay_seconds ?? DEFAULT_SETTINGS.proactive_message_delay_seconds,
        greeting: data.greeting,
      });

      // Check if lead capture is required
      if (data.require_email_before_chat || data.require_name_before_chat) {
        setRequiresLeadCapture(true);
      }
    }
  }, [propertyId]);

  // Check for escalation keywords in message
  const checkForEscalationKeywords = useCallback((content: string): boolean => {
    if (!settings.auto_escalation_enabled) return false;
    const lowerContent = content.toLowerCase();
    return settings.escalation_keywords.some(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    );
  }, [settings.auto_escalation_enabled, settings.escalation_keywords]);

  // Trigger escalation
  const triggerEscalation = useCallback(async () => {
    if (isEscalated) return;
    
    setIsEscalated(true);
    
    // Track escalation event
    if (propertyId && propertyId !== 'demo' && !humanEscalationTracked) {
      setHumanEscalationTracked(true);
      trackAnalyticsEvent(propertyId, 'human_escalation');
    }

    // Update conversation status to active (for human agent)
    if (conversationId) {
      await supabase
        .from('conversations')
        .update({ status: 'active' })
        .eq('id', conversationId);
    }

    // Add escalation message
    setMessages(prev => [...prev, {
      id: `escalation-${Date.now()}`,
      content: "I'm connecting you with a human agent who can better assist you. Please hold on.",
      sender_type: 'agent',
      created_at: new Date().toISOString(),
    }]);
  }, [isEscalated, propertyId, humanEscalationTracked, conversationId]);

  // Start proactive message timer
  const startProactiveTimer = useCallback(() => {
    if (!settings.proactive_message_enabled || !settings.proactive_message) return;
    
    if (proactiveTimerRef.current) {
      clearTimeout(proactiveTimerRef.current);
    }

    proactiveTimerRef.current = setTimeout(() => {
      if (messages.length === 0 || (messages.length === 1 && messages[0].id === 'greeting')) {
        setShowProactiveMessage(true);
        setMessages(prev => [...prev, {
          id: 'proactive',
          content: settings.proactive_message!,
          sender_type: 'agent',
          created_at: new Date().toISOString(),
        }]);
      }
    }, settings.proactive_message_delay_seconds * 1000);
  }, [settings.proactive_message_enabled, settings.proactive_message, settings.proactive_message_delay_seconds, messages]);

  const initializeChat = useCallback(async () => {
    // Fetch settings first
    await fetchSettings();

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
      
      // If visitor already has name/email, don't require lead capture
      if (visitor.name || visitor.email) {
        setRequiresLeadCapture(false);
        setVisitorInfo({ name: visitor.name || undefined, email: visitor.email || undefined });
      }
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
      
      // Check if already escalated
      if (conversation.status === 'active' && conversation.assigned_agent_id) {
        setIsEscalated(true);
      }
      
      // Fetch existing messages
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      // Count AI messages
      aiMessageCountRef.current = (existingMessages || []).filter(
        m => m.sender_type === 'agent' && m.sender_id === 'ai-bot'
      ).length;

      setMessages((existingMessages || []).map(m => ({
        ...m,
        sender_type: m.sender_type as 'agent' | 'visitor',
      })));
    } else if (settings.greeting || greeting) {
      // Add greeting for new conversations
      setMessages([{
        id: 'greeting',
        content: settings.greeting || greeting || '',
        sender_type: 'agent',
        created_at: new Date().toISOString(),
      }]);
    }

    setLoading(false);
  }, [propertyId, greeting, fetchSettings, settings.greeting]);

  // Submit lead info
  const submitLeadInfo = async (name?: string, email?: string) => {
    setVisitorInfo({ name, email });
    setRequiresLeadCapture(false);

    if (visitorId && (name || email)) {
      await supabase
        .from('visitors')
        .update({ 
          name: name || null, 
          email: email || null 
        })
        .eq('id', visitorId);
    }
  };

  const sendMessage = async (content: string) => {
    // Clear proactive timer when user sends a message
    if (proactiveTimerRef.current) {
      clearTimeout(proactiveTimerRef.current);
      proactiveTimerRef.current = null;
    }

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

    // Check for escalation keywords
    if (checkForEscalationKeywords(content)) {
      await triggerEscalation();
      return;
    }

    // If already escalated, don't use AI
    if (isEscalated) {
      // Just save the message to DB
      if (conversationId && visitorId) {
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: visitorId,
            sender_type: 'visitor',
            content,
          });
      }
      return;
    }

    // Build conversation history for AI
    const conversationHistory = messages
      .filter(m => m.id !== 'greeting' && m.id !== 'proactive')
      .map(m => ({
        role: m.sender_type === 'visitor' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));
    
    conversationHistory.push({ role: 'user', content });

    // Apply typing indicator delay
    const typingDuration = randomInRange(
      settings.typing_indicator_min_ms,
      settings.typing_indicator_max_ms
    );
    
    setIsTyping(true);
    await sleep(typingDuration);

    // Apply response delay
    const responseDelay = randomInRange(
      settings.ai_response_delay_min_ms,
      settings.ai_response_delay_max_ms
    );
    await sleep(responseDelay);

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
      onDone: async () => {
        setIsTyping(false);
        
        // Increment AI message count
        aiMessageCountRef.current += 1;

        // Check if should auto-escalate based on message count
        if (
          settings.auto_escalation_enabled && 
          aiMessageCountRef.current >= settings.max_ai_messages_before_escalation
        ) {
          await triggerEscalation();
        }
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

  // Start proactive message timer when widget opens
  useEffect(() => {
    startProactiveTimer();
    return () => {
      if (proactiveTimerRef.current) {
        clearTimeout(proactiveTimerRef.current);
      }
    };
  }, [startProactiveTimer]);

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
            // Mark as escalated when human agent responds
            if (!isEscalated) {
              setIsEscalated(true);
            }

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
  }, [conversationId, humanEscalationTracked, propertyId, isEscalated]);

  return {
    messages,
    sendMessage,
    loading,
    isTyping,
    visitorId,
    conversationId,
    settings,
    isEscalated,
    requiresLeadCapture,
    submitLeadInfo,
    visitorInfo,
  };
};
