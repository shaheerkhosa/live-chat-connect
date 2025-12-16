import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { property_id, url, page_title, event_type } = await req.json();

    // Validate required fields
    if (!property_id || !url || !event_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: property_id, url, event_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate event_type
    if (!['chat_open', 'human_escalation'].includes(event_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid event_type. Must be chat_open or human_escalation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for insert
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Insert the analytics event
    const { data, error } = await supabase
      .from('page_analytics_events')
      .insert({
        property_id,
        url,
        page_title: page_title || null,
        event_type,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting analytics event:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to track event', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Tracked ${event_type} event for URL: ${url}`);

    return new Response(
      JSON.stringify({ success: true, event_id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
