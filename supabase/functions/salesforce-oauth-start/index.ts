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
    const { propertyId } = await req.json();

    if (!propertyId) {
      return new Response(
        JSON.stringify({ error: 'Missing propertyId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('SALESFORCE_CLIENT_ID');
    if (!clientId) {
      console.error('SALESFORCE_CLIENT_ID not configured');
      return new Response(
        JSON.stringify({ error: 'Salesforce integration not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/salesforce-oauth-callback`;
    
    // Encode propertyId in state for the callback
    const state = btoa(JSON.stringify({ propertyId }));

    // Build Salesforce OAuth URL with required scopes
    // Using 'api' scope for API access to create leads
    const scopes = ['api', 'refresh_token'].join(' ');
    
    // Salesforce OAuth 2.0 authorization endpoint (production)
    const authUrl = new URL('https://login.salesforce.com/services/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);

    console.log('Generated Salesforce OAuth URL for property:', propertyId);

    return new Response(
      JSON.stringify({ url: authUrl.toString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Salesforce OAuth start error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate OAuth URL' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
