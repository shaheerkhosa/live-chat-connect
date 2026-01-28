import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  sender_type: 'agent' | 'visitor';
  created_at: string;
  sequence_number?: number;
  agent_name?: string;
  agent_avatar?: string | null;
}

export interface AIAgent {
  id: string;
  name: string;
  avatar_url: string | null;
  personality_prompt: string | null;
}

interface PropertySettings {
  ai_response_delay_min_ms: number;
  ai_response_delay_max_ms: number;
  typing_indicator_min_ms: number;
  typing_indicator_max_ms: number;
  smart_typing_enabled: boolean;
  typing_wpm: number;
  max_ai_messages_before_escalation: number;
  escalation_keywords: string[];
  auto_escalation_enabled: boolean;
  require_email_before_chat: boolean;
  require_name_before_chat: boolean;
  require_phone_before_chat: boolean;
  require_insurance_card_before_chat: boolean;
  natural_lead_capture_enabled: boolean;
  proactive_message_enabled: boolean;
  proactive_message: string | null;
  proactive_message_delay_seconds: number;
  greeting: string | null;
  ai_base_prompt: string | null;
}

interface WidgetChatConfig {
  propertyId: string;
  greeting?: string;
  isPreview?: boolean;
}

const DEFAULT_SETTINGS: PropertySettings = {
  ai_response_delay_min_ms: 1000,
  ai_response_delay_max_ms: 2500,
  typing_indicator_min_ms: 1500,
  typing_indicator_max_ms: 3000,
  smart_typing_enabled: true,
  typing_wpm: 90,
  max_ai_messages_before_escalation: 5,
  escalation_keywords: ['crisis', 'emergency', 'suicide', 'help me', 'urgent'],
  auto_escalation_enabled: true,
  require_email_before_chat: false,
  require_name_before_chat: false,
  require_phone_before_chat: false,
  require_insurance_card_before_chat: false,
  natural_lead_capture_enabled: true,
  proactive_message_enabled: false,
  proactive_message: null,
  proactive_message_delay_seconds: 30,
  greeting: null,
  ai_base_prompt: null,
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

const getParentPageUrl = (): string | null => {
  // When running inside an iframe, document.referrer is usually the host page URL.
  const ref = document.referrer;
  if (!ref) return null;

  // Avoid self-reporting the embed URL.
  if (ref.includes('/widget-embed/')) return null;
  return ref;
};

const getEffectivePageUrl = (): string => {
  return getParentPageUrl() ?? window.location.href;
};

const getEffectivePagePath = (): string => {
  const parentUrl = getParentPageUrl();
  if (!parentUrl) return window.location.pathname;

  try {
    const u = new URL(parentUrl);
    // Keep query params for attribution/debugging.
    return `${u.pathname}${u.search}`;
  } catch {
    return parentUrl;
  }
};

const getPageInfo = () => {
  const url = getEffectivePageUrl();
  const pageTitle = url === window.location.href ? document.title : null;
  return { url, pageTitle };
};

// Extract GCLID and other tracking parameters from URL
const getTrackingParams = () => {
  const parentUrl = getParentPageUrl();
  const params = parentUrl
    ? (() => {
        try {
          return new URL(parentUrl).searchParams;
        } catch {
          return new URLSearchParams();
        }
      })()
    : new URLSearchParams(window.location.search);

  return {
    gclid: params.get('gclid') || null, // Google Click ID
  };
};

const randomInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`;
const TRACK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-page-analytics`;
const EXTRACT_INFO_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-visitor-info`;
const LOCATION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-visitor-location`;
const UPDATE_VISITOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-visitor`;
const AI_AGENTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-property-ai-agents`;

// Secure visitor update through edge function
const updateVisitorSecure = async (
  visitorId: string,
  sessionId: string,
  updates: Record<string, unknown>
) => {
  try {
    const response = await fetch(UPDATE_VISITOR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ visitorId, sessionId, updates }),
    });
    
    if (!response.ok) {
      console.error('Failed to update visitor:', await response.text());
    }
  } catch (error) {
    console.error('Error updating visitor:', error);
  }
};

const fetchVisitorLocation = async (visitorId: string) => {
  try {
    await fetch(LOCATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ visitorId }),
    });
  } catch (error) {
    console.error('Failed to fetch visitor location:', error);
  }
};

const extractVisitorInfo = async (
  visitorId: string,
  conversationHistory: { role: string; content: string }[]
) => {
  if (!visitorId || conversationHistory.length < 2) return;
  
  try {
    await fetch(EXTRACT_INFO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        visitorId,
        conversationHistory,
      }),
    });
  } catch (error) {
    console.error('Failed to extract visitor info:', error);
  }
};
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
  personalityPrompt,
  agentName,
  basePrompt,
  naturalLeadCaptureFields,
}: {
  messages: { role: 'user' | 'assistant'; content: string }[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  personalityPrompt?: string | null;
  agentName?: string;
  basePrompt?: string | null;
  naturalLeadCaptureFields?: string[];
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, personalityPrompt, agentName, basePrompt, naturalLeadCaptureFields }),
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

export const useWidgetChat = ({ propertyId, greeting, isPreview = false }: WidgetChatConfig) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [chatOpenTracked, setChatOpenTracked] = useState(false);
  const [humanEscalationTracked, setHumanEscalationTracked] = useState(false);
  const [settings, setSettings] = useState<PropertySettings>(DEFAULT_SETTINGS);
  const [isEscalated, setIsEscalated] = useState(false); // Escalation triggered (conversation visible to agents)
  const [humanHasTakenOver, setHumanHasTakenOver] = useState(false); // Human agent has actually responded
  const [requiresLeadCapture, setRequiresLeadCapture] = useState(false);
  const [visitorInfo, setVisitorInfo] = useState<{ name?: string; email?: string }>({});
  const [showProactiveMessage, setShowProactiveMessage] = useState(false);
  const [aiAgents, setAiAgents] = useState<AIAgent[]>([]);
  const [currentAiAgent, setCurrentAiAgent] = useState<AIAgent | null>(null);
  
  const aiMessageCountRef = useRef(0);
  const proactiveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aiAgentIndexRef = useRef(0);
  const visitorIdRef = useRef<string | null>(null); // Ref to track current visitor ID for extraction

  // Fetch AI agents for this property via edge function (works without auth)
  const fetchAiAgents = useCallback(async (): Promise<AIAgent[]> => {
    if (!propertyId || propertyId === 'demo') {
      setAiAgents([]);
      setCurrentAiAgent(null);
      return [];
    }

    try {
      const response = await fetch(AI_AGENTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ propertyId }),
      });

      if (!response.ok) {
        console.error('Failed to fetch AI agents:', response.status);
        setAiAgents([]);
        setCurrentAiAgent(null);
        return [];
      }

      const data = await response.json();
      const agents: AIAgent[] = data.agents || [];

      if (agents.length > 0) {
        setAiAgents(agents);
        setCurrentAiAgent(agents[0]);
      } else {
        setAiAgents([]);
        setCurrentAiAgent(null);
      }
      return agents;
    } catch (error) {
      console.error('Error fetching AI agents:', error);
      setAiAgents([]);
      setCurrentAiAgent(null);
      return [];
    }
  }, [propertyId]);

  // Cycle to next AI agent
  const cycleToNextAgent = useCallback(() => {
    if (aiAgents.length <= 1) return;
    
    aiAgentIndexRef.current = (aiAgentIndexRef.current + 1) % aiAgents.length;
    setCurrentAiAgent(aiAgents[aiAgentIndexRef.current]);
  }, [aiAgents]);

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
        smart_typing_enabled,
        typing_wpm,
        max_ai_messages_before_escalation,
        escalation_keywords,
        auto_escalation_enabled,
        require_email_before_chat,
        require_name_before_chat,
        require_phone_before_chat,
        require_insurance_card_before_chat,
        natural_lead_capture_enabled,
        proactive_message_enabled,
        proactive_message,
        proactive_message_delay_seconds,
        greeting,
        ai_base_prompt
      `)
      .eq('id', propertyId)
      .single();

    if (!error && data) {
      setSettings({
        ai_response_delay_min_ms: data.ai_response_delay_min_ms ?? DEFAULT_SETTINGS.ai_response_delay_min_ms,
        ai_response_delay_max_ms: data.ai_response_delay_max_ms ?? DEFAULT_SETTINGS.ai_response_delay_max_ms,
        typing_indicator_min_ms: data.typing_indicator_min_ms ?? DEFAULT_SETTINGS.typing_indicator_min_ms,
        typing_indicator_max_ms: data.typing_indicator_max_ms ?? DEFAULT_SETTINGS.typing_indicator_max_ms,
        smart_typing_enabled: data.smart_typing_enabled ?? DEFAULT_SETTINGS.smart_typing_enabled,
        typing_wpm: data.typing_wpm ?? DEFAULT_SETTINGS.typing_wpm,
        max_ai_messages_before_escalation: data.max_ai_messages_before_escalation ?? DEFAULT_SETTINGS.max_ai_messages_before_escalation,
        escalation_keywords: data.escalation_keywords ?? DEFAULT_SETTINGS.escalation_keywords,
        auto_escalation_enabled: data.auto_escalation_enabled ?? DEFAULT_SETTINGS.auto_escalation_enabled,
        require_email_before_chat: data.require_email_before_chat ?? DEFAULT_SETTINGS.require_email_before_chat,
        require_name_before_chat: data.require_name_before_chat ?? DEFAULT_SETTINGS.require_name_before_chat,
        require_phone_before_chat: data.require_phone_before_chat ?? DEFAULT_SETTINGS.require_phone_before_chat,
        require_insurance_card_before_chat: data.require_insurance_card_before_chat ?? DEFAULT_SETTINGS.require_insurance_card_before_chat,
        natural_lead_capture_enabled: data.natural_lead_capture_enabled ?? DEFAULT_SETTINGS.natural_lead_capture_enabled,
        proactive_message_enabled: data.proactive_message_enabled ?? DEFAULT_SETTINGS.proactive_message_enabled,
        proactive_message: data.proactive_message,
        proactive_message_delay_seconds: data.proactive_message_delay_seconds ?? DEFAULT_SETTINGS.proactive_message_delay_seconds,
        greeting: data.greeting,
        ai_base_prompt: data.ai_base_prompt ?? null,
      });

      // Check if lead capture is required - only if NOT using natural lead capture
      const naturalEnabled = data.natural_lead_capture_enabled ?? true;
      if (!naturalEnabled && (data.require_email_before_chat || data.require_name_before_chat)) {
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

  // Trigger escalation - silently escalate without announcing to visitor
  const triggerEscalation = useCallback(async () => {
    if (isEscalated) return;
    
    setIsEscalated(true);
    
    // Track escalation event
    if (propertyId && propertyId !== 'demo' && !humanEscalationTracked) {
      setHumanEscalationTracked(true);
      trackAnalyticsEvent(propertyId, 'human_escalation');
    }

    // For preview mode, create a real test conversation in the database
    if (isPreview && propertyId && propertyId !== 'demo') {
      try {
        // Create a test visitor
        const testSessionId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const { data: testVisitor, error: visitorError } = await supabase
          .from('visitors')
          .insert({
            property_id: propertyId,
            session_id: testSessionId,
            browser_info: 'Test Widget Preview',
            current_page: '/widget-preview',
          })
          .select()
          .single();

        if (!visitorError && testVisitor) {
          // Fetch geolocation for test visitor (non-blocking)
          fetchVisitorLocation(testVisitor.id);
        }

        if (visitorError || !testVisitor) {
          console.error('Error creating test visitor:', visitorError);
        } else {
          // Create a test conversation marked with is_test = true
          const { data: testConversation, error: convError } = await supabase
            .from('conversations')
            .insert({
              property_id: propertyId,
              visitor_id: testVisitor.id,
              status: 'active',
              is_test: true,
            })
            .select()
            .single();

          if (convError || !testConversation) {
            console.error('Error creating test conversation:', convError);
          } else {
            // Include all messages including the greeting with sequence numbers
            const allMessages = messages.filter(m => m.content.trim() !== '');
            const messagesToSave = allMessages.map((m, index) => ({
              conversation_id: testConversation.id,
              sender_id: m.sender_type === 'visitor' ? testVisitor.id : 'ai-bot',
              sender_type: m.sender_type,
              content: m.content,
              sequence_number: index + 1,
            }));

            if (messagesToSave.length > 0) {
              await supabase.from('messages').insert(messagesToSave);
            }

            setConversationId(testConversation.id);
            setVisitorId(testVisitor.id);
            visitorIdRef.current = testVisitor.id; // Update ref immediately for extraction

            // Trigger extraction for test conversations too
            const conversationHistory = allMessages.map(m => ({
              role: m.sender_type === 'visitor' ? 'user' : 'assistant',
              content: m.content,
            }));
            if (conversationHistory.length >= 2) {
              extractVisitorInfo(testVisitor.id, conversationHistory);
            }
          }
        }
      } catch (error) {
        console.error('Error creating test conversation:', error);
      }
    } else if (conversationId) {
      // Update existing conversation status to active (for human agent)
      await supabase
        .from('conversations')
        .update({ status: 'active' })
        .eq('id', conversationId);

      // Save the greeting if it exists and hasn't been saved yet
      const greetingMsg = messages.find(m => m.id === 'greeting');
      if (greetingMsg && visitorId) {
        // Check if greeting is already in DB
        const { data: existingMsgs } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', conversationId)
          .limit(1);
        
        // If no messages yet, add the greeting first with sequence_number 1
        if (!existingMsgs || existingMsgs.length === 0) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: 'ai-bot',
            sender_type: 'agent',
            content: greetingMsg.content,
            sequence_number: 1,
          });
        }
      }
    }

    // NO announcement message - AI will keep chatting until human takes over
    // The conversation is now in 'active' status so human agents can see and respond
  }, [isEscalated, propertyId, humanEscalationTracked, conversationId, isPreview, messages, visitorId]);

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
    // OPTIMIZATION: Fetch settings and AI agents in parallel - they're independent
    const [, fetchedAgents] = await Promise.all([
      fetchSettings(),
      fetchAiAgents(),
    ]);

    // OPTIMIZATION: Show greeting immediately for fast perceived load time
    const greetingAgent = fetchedAgents.length > 0 ? fetchedAgents[0] : null;
    const greetingContent = greeting || settings.greeting || '';
    
    if (greetingContent) {
      setMessages([{
        id: 'greeting',
        content: greetingContent,
        sender_type: 'agent',
        created_at: new Date().toISOString(),
        agent_name: greetingAgent?.name,
        agent_avatar: greetingAgent?.avatar_url,
      }]);
    }
    
    // For preview/demo mode, we're done - don't create DB records
    if (!propertyId || propertyId === 'demo' || isPreview) {
      setLoading(false);
      return;
    }

    // Mark loading as done early - the greeting is visible
    setLoading(false);

    // OPTIMIZATION: Background persistence - don't block UI
    const sessionId = getOrCreateSessionId();

    try {
      // Check for existing visitor
      let { data: visitor } = await supabase
        .from('visitors')
        .select('*')
        .eq('property_id', propertyId)
        .eq('session_id', sessionId)
        .maybeSingle();

      // Create visitor if doesn't exist
      if (!visitor) {
        const trackingParams = getTrackingParams();
        const { data: newVisitor, error } = await supabase
          .from('visitors')
          .insert({
            property_id: propertyId,
            session_id: sessionId,
            browser_info: getBrowserInfo(),
            current_page: getEffectivePagePath(),
            gclid: trackingParams.gclid,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating visitor:', error);
          return;
        }
        visitor = newVisitor;
        
        // Fire-and-forget geolocation fetch
        fetchVisitorLocation(visitor.id).catch(() => {});
      } else {
        // Fire-and-forget page update
        updateVisitorSecure(visitor.id, sessionId, { current_page: getEffectivePagePath() });
        
        // If visitor already has name/email, don't require lead capture
        if (visitor.name || visitor.email) {
          setRequiresLeadCapture(false);
          setVisitorInfo({ name: visitor.name || undefined, email: visitor.email || undefined });
        }
      }

      setVisitorId(visitor.id);
      visitorIdRef.current = visitor.id;

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
        
        if (conversation.status === 'active' && conversation.assigned_agent_id) {
          setIsEscalated(true);
        }
        
        // Fetch existing messages
        const { data: existingMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('sequence_number', { ascending: true });

        aiMessageCountRef.current = (existingMessages || []).filter(
          m => m.sender_type === 'agent' && m.sender_id === 'ai-bot'
        ).length;

        if (existingMessages && existingMessages.length > 0) {
          setMessages(existingMessages.map(m => ({
            ...m,
            sender_type: m.sender_type as 'agent' | 'visitor',
          })));
        }
      } else {
        // Create a conversation for real embeds so chats show up in the portal
        const { data: newConversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            property_id: propertyId,
            visitor_id: visitor.id,
            status: 'pending',
          })
          .select()
          .single();

        if (convError) {
          console.error('Error creating conversation:', convError);
        } else if (newConversation) {
          setConversationId(newConversation.id);

          // Save the greeting as the first message (fire-and-forget)
          if (greetingContent.trim()) {
            supabase.from('messages').insert({
              conversation_id: newConversation.id,
              sender_id: 'ai-bot',
              sender_type: 'agent',
              content: greetingContent,
              sequence_number: 1,
            }).then(({ error }) => {
              if (error) console.error('Error saving greeting message:', error);
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in background initialization:', error);
    }
  }, [propertyId, greeting, fetchSettings, fetchAiAgents, settings.greeting, isPreview]);

  // Submit lead info
  const submitLeadInfo = async (name?: string, email?: string) => {
    setVisitorInfo({ name, email });
    setRequiresLeadCapture(false);

    // Use ref to get the most current visitor ID (state may be stale in preview mode)
    const currentVisitorId = visitorIdRef.current || visitorId;
    if (currentVisitorId && (name || email)) {
      const sessionId = getOrCreateSessionId();
      await updateVisitorSecure(currentVisitorId, sessionId, { 
        name: name || null, 
        email: email || null 
      });
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

    // Ensure we have a persisted conversation for real embeds before we do anything else.
    // This prevents the "AI responds but nothing shows in the portal" issue.
    if (!isPreview && propertyId && propertyId !== 'demo') {
      // If visitor hasn't been established yet, try to initialize now.
      if (!visitorIdRef.current && !visitorId) {
        try {
          await initializeChat();
        } catch (e) {
          console.error('Failed to initialize chat before persisting message:', e);
        }
      }

      const currentVisitorIdForDb = visitorIdRef.current || visitorId;
      if (currentVisitorIdForDb) {
        let currentConversationId = conversationId;
        if (!currentConversationId) {
          const { data: newConversation, error: convError } = await supabase
            .from('conversations')
            .insert({
              property_id: propertyId,
              visitor_id: currentVisitorIdForDb,
              status: 'pending',
            })
            .select()
            .single();

          if (convError) {
            console.error('Error creating conversation (sendMessage):', convError);
          } else if (newConversation) {
            currentConversationId = newConversation.id;
            setConversationId(currentConversationId);
          }
        }
      }
    }

    // Track chat_open event on first message
    if (!chatOpenTracked && propertyId && propertyId !== 'demo') {
      setChatOpenTracked(true);
      trackAnalyticsEvent(propertyId, 'chat_open');
    }

    // Check for escalation keywords - trigger escalation but continue AI response
    if (checkForEscalationKeywords(content)) {
      await triggerEscalation();
      // Don't return - let AI continue responding until human takes over
    }

    // Only stop AI if human has actually taken over (not just escalated)
    if (humanHasTakenOver) {
      // Just save the message to DB - human agent is handling
      if (conversationId && visitorId) {
        // Get next sequence number
        const { data: maxSeqData } = await supabase
          .from('messages')
          .select('sequence_number')
          .eq('conversation_id', conversationId)
          .order('sequence_number', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        const nextSeq = (maxSeqData?.sequence_number || 0) + 1;
        
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: visitorId,
            sender_type: 'visitor',
            content,
            sequence_number: nextSeq,
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

    // Apply response delay BEFORE showing typing indicator
    // This simulates the agent "reading" the message before they start typing
    const responseDelay = randomInRange(
      settings.ai_response_delay_min_ms,
      settings.ai_response_delay_max_ms
    );
    await sleep(responseDelay);

    // Now show typing indicator
    setIsTyping(true);
    const typingStartTime = Date.now();

    // Create placeholder for AI response
    const aiMessageId = `ai-${Date.now()}`;
    let aiContent = '';

    // Store current agent for this message (before cycling)
    const respondingAgent = currentAiAgent;

    // Calculate typing time based on word count using configured WPM
    const calculateTypingTimeMs = (text: string): number => {
      const wordCount = text.trim().split(/\s+/).length;
      const wordsPerSecond = settings.typing_wpm / 60;
      return Math.ceil((wordCount / wordsPerSecond) * 1000);
    };

    // Build natural lead capture fields list
    const naturalLeadCaptureFields: string[] = [];
    if (settings.natural_lead_capture_enabled) {
      if (settings.require_name_before_chat) naturalLeadCaptureFields.push('name');
      if (settings.require_email_before_chat) naturalLeadCaptureFields.push('email');
      if (settings.require_phone_before_chat) naturalLeadCaptureFields.push('phone');
      if (settings.require_insurance_card_before_chat) naturalLeadCaptureFields.push('insurance_card');
    }

    if (settings.smart_typing_enabled) {
      // Smart typing: buffer the response, then reveal after calculated time
      await streamAIResponse({
        messages: conversationHistory,
        personalityPrompt: respondingAgent?.personality_prompt,
        agentName: respondingAgent?.name,
        basePrompt: settings.ai_base_prompt,
        naturalLeadCaptureFields: naturalLeadCaptureFields.length > 0 ? naturalLeadCaptureFields : undefined,
        onDelta: (delta) => {
          aiContent += delta;
          // Don't update UI yet - just buffer
        },
        onDone: async () => {
          // Calculate how long it would take to type this response
          const calculatedTypingTime = calculateTypingTimeMs(aiContent);
          const minTypingTime = randomInRange(
            settings.typing_indicator_min_ms,
            settings.typing_indicator_max_ms
          );
          
          // Use the longer of calculated time or minimum time
          const targetTypingTime = Math.max(calculatedTypingTime, minTypingTime);
          
          // Calculate how long we've already been showing the typing indicator
          const elapsedTime = Date.now() - typingStartTime;
          const remainingTime = targetTypingTime - elapsedTime;
          
          // Wait remaining time if any
          if (remainingTime > 0) {
            await sleep(remainingTime);
          }
          
          // Now reveal the full response
          setMessages(prev => [...prev, {
            id: aiMessageId,
            content: aiContent,
            sender_type: 'agent' as const,
            created_at: new Date().toISOString(),
            agent_name: respondingAgent?.name,
            agent_avatar: respondingAgent?.avatar_url,
          }]);
          
          setIsTyping(false);
          
          // Increment AI message count
          aiMessageCountRef.current += 1;

          // Cycle to next AI agent for next response
          cycleToNextAgent();

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
          setMessages(prev => [...prev, {
            id: `error-${Date.now()}`,
            content: "I'm having trouble connecting right now. Please try again in a moment, or speak directly with our team.",
            sender_type: 'agent',
            created_at: new Date().toISOString(),
          }]);
        },
      });
    } else {
      // Standard mode: wait fixed duration then stream
      const typingDuration = randomInRange(
        settings.typing_indicator_min_ms,
        settings.typing_indicator_max_ms
      );
      await sleep(typingDuration);

      // Stream AI response with current AI agent's personality
      await streamAIResponse({
        messages: conversationHistory,
        personalityPrompt: respondingAgent?.personality_prompt,
        agentName: respondingAgent?.name,
        basePrompt: settings.ai_base_prompt,
        naturalLeadCaptureFields: naturalLeadCaptureFields.length > 0 ? naturalLeadCaptureFields : undefined,
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
                agent_name: respondingAgent?.name,
                agent_avatar: respondingAgent?.avatar_url,
              }];
            }
          });
        },
        onDone: async () => {
          setIsTyping(false);
          
          // Increment AI message count
          aiMessageCountRef.current += 1;

          // Cycle to next AI agent for next response
          cycleToNextAgent();

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
          setMessages(prev => [...prev, {
            id: `error-${Date.now()}`,
            content: "I'm having trouble connecting right now. Please try again in a moment, or speak directly with our team.",
            sender_type: 'agent',
            created_at: new Date().toISOString(),
          }]);
        },
      });
    }

    // Extract visitor info in background after each AI response (works in all modes)
    // This allows us to capture details as they're shared naturally in conversation
    // Use ref to get the most current visitor ID (state may be stale in preview mode)
    const currentVisitorId = visitorIdRef.current || visitorId;
    if (currentVisitorId && conversationHistory.length >= 2) {
      extractVisitorInfo(currentVisitorId, conversationHistory);
    }

    // Save to database if:
    // - Connected to a real property (not demo)
    // - Either NOT in preview mode, OR we're in preview mode but escalation has already happened (test conversation created)
    const shouldSaveToDb = propertyId && propertyId !== 'demo' && (!isPreview || (isPreview && conversationId && visitorId));
    const currentVisitorIdForDb = visitorIdRef.current || visitorId;
    
    if (shouldSaveToDb && currentVisitorIdForDb) {
      let currentConversationId = conversationId;

      // Create conversation if doesn't exist (only for non-preview mode)
        if (!currentConversationId && !isPreview) {
        const { data: newConversation, error } = await supabase
          .from('conversations')
          .insert({
            property_id: propertyId,
            visitor_id: currentVisitorIdForDb,
            status: 'pending',
          })
          .select()
          .single();

          if (error) {
            console.error('Error creating conversation:', error);
          }

          if (!error && newConversation) {
          currentConversationId = newConversation.id;
          setConversationId(currentConversationId);
        }
      }

        if (currentConversationId) {
        // Get next sequence number for this conversation
        const { data: maxSeqData } = await supabase
          .from('messages')
          .select('sequence_number')
          .eq('conversation_id', currentConversationId)
          .order('sequence_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        let nextSeq = (maxSeqData?.sequence_number || 0) + 1;

        // Save visitor message
         const { error: msgErr } = await supabase
          .from('messages')
          .insert({
            conversation_id: currentConversationId,
            sender_id: currentVisitorIdForDb,
            sender_type: 'visitor',
            content,
            sequence_number: nextSeq,
          });
         if (msgErr) console.error('Error saving visitor message:', msgErr);

        // Save AI response with next sequence number
          if (aiContent) {
          const { error: aiMsgErr } = await supabase
            .from('messages')
            .insert({
              conversation_id: currentConversationId,
              sender_id: 'ai-bot',
              sender_type: 'agent',
              content: aiContent,
              sequence_number: nextSeq + 1,
            });
          if (aiMsgErr) console.error('Error saving AI message:', aiMsgErr);
        }

        // Also trigger extraction after saving new messages in preview mode
        if (isPreview && conversationHistory.length >= 2) {
          extractVisitorInfo(currentVisitorIdForDb, [...conversationHistory, { role: 'assistant', content: aiContent }]);
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
            // Mark human has taken over - AI should stop responding
            if (!humanHasTakenOver) {
              setHumanHasTakenOver(true);
            }
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
  }, [conversationId, humanEscalationTracked, propertyId, isEscalated, humanHasTakenOver]);

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
    currentAiAgent,
    aiAgents,
  };
};
