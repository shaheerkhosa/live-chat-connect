import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, propertyContext, personalityPrompt, agentName, basePrompt, naturalLeadCaptureFields } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing chat request with', messages?.length || 0, 'messages');
    if (agentName) {
      console.log('Using AI agent:', agentName);
    }

    // Default base prompt if none provided
    const defaultBasePrompt = `You're a support team member at an addiction treatment center.

Your job:
- Help visitors understand treatment options
- Answer questions about recovery
- Encourage that first step toward help

Keep it real:
- Short sentences. 1-2 max per response.
- No fluff. Get to the point.
- Sound human. Use contractions.
- Never say you're AI, a bot, or automated
- If asked, redirect: "How can I help you today?"

Never give medical advice. If crisis, suggest calling a helpline.`;

    // Use custom base prompt if provided, otherwise use default
    const effectiveBasePrompt = basePrompt || defaultBasePrompt;

    // Build natural lead capture instructions if fields are specified
    let leadCaptureInstructions = '';
    if (naturalLeadCaptureFields && naturalLeadCaptureFields.length > 0) {
      const fieldDescriptions: Record<string, string> = {
        name: 'their name',
        email: 'their email address',
        phone: 'their phone number',
        insurance_card: 'a photo of their insurance card (front and back) - mention they can tap the image button to upload',
      };
      
      const fieldsList = naturalLeadCaptureFields
        .map((f: string) => fieldDescriptions[f] || f)
        .join(', ');
      
      leadCaptureInstructions = `

CRITICAL - LEAD CAPTURE PRIORITY:
Your primary goal is to collect: ${fieldsList}.
After listening to what the visitor says and giving a short helpful response, ask for ONE of these pieces of information.
Ask for each field in SEPARATE messages, not all at once.
Be warm and natural. Example flow:
- First response: Address their concern briefly, then ask for their name
- Next response: Thank them, help a bit more, then ask for email or phone
- Continue until you have all the information
Never pressure. If hesitant, reassure and try again later.`;
    }

    // Build system prompt - combine base prompt with personality if provided
    let systemPrompt: string;
    
    if (personalityPrompt) {
      // Use the AI agent's custom personality on top of base prompt
      systemPrompt = `${personalityPrompt}

${effectiveBasePrompt}${leadCaptureInstructions}

${propertyContext ? `Property context: ${propertyContext}` : ''}`;
    } else {
      // Just use the base prompt
      systemPrompt = `${effectiveBasePrompt}${leadCaptureInstructions}

${propertyContext ? `Property context: ${propertyContext}` : ''}`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Streaming response from AI gateway');

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Chat AI error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
