import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { propertyId, redirectUri } = await req.json();

    if (!propertyId) {
      return new Response(
        JSON.stringify({ error: 'Property ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the Salesforce settings to get client_id
    const { data: settings, error: fetchError } = await supabase
      .from('salesforce_settings')
      .select('client_id, client_secret')
      .eq('property_id', propertyId)
      .single();

    if (fetchError || !settings) {
      return new Response(
        JSON.stringify({ error: 'Salesforce settings not found. Please save your credentials first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!settings.client_id || !settings.client_secret) {
      return new Response(
        JSON.stringify({ error: 'Client ID and Client Secret are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a state parameter for CSRF protection
    const state = btoa(JSON.stringify({ propertyId, timestamp: Date.now() }));

    // Build the Salesforce authorization URL
    const salesforceAuthUrl = new URL('https://login.salesforce.com/services/oauth2/authorize');
    salesforceAuthUrl.searchParams.set('response_type', 'code');
    salesforceAuthUrl.searchParams.set('client_id', settings.client_id);
    salesforceAuthUrl.searchParams.set('redirect_uri', redirectUri);
    salesforceAuthUrl.searchParams.set('state', state);
    salesforceAuthUrl.searchParams.set('scope', 'api refresh_token');

    return new Response(
      JSON.stringify({ 
        authUrl: salesforceAuthUrl.toString(),
        state 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error starting Salesforce OAuth:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to start OAuth flow' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
