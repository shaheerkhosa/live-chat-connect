import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('Salesforce OAuth callback received:', { code: !!code, state: !!state, error });

    if (error) {
      console.error('Salesforce OAuth error:', error, errorDescription);
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'salesforce-oauth-error', error: '${errorDescription || error}' }, '*'); window.close();</script><p>Error: ${errorDescription || error}. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: 'Missing code or state parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode state to get propertyId
    let propertyId: string;
    try {
      const stateData = JSON.parse(atob(state));
      propertyId = stateData.propertyId;
    } catch (e) {
      console.error('Failed to decode state:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid state parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get credentials from backend secrets
    const clientId = Deno.env.get('SALESFORCE_CLIENT_ID');
    const clientSecret = Deno.env.get('SALESFORCE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('Missing Salesforce credentials in backend secrets');
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'salesforce-oauth-error', error: 'Integration not configured' }, '*'); window.close();</script><p>Error: Salesforce integration not configured. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get the redirect URI (should match what was used in the authorization request)
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/salesforce-oauth-callback`;

    // Exchange code for access token
    const tokenResponse = await fetch('https://login.salesforce.com/services/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Salesforce token response:', { 
      hasAccessToken: !!tokenData.access_token, 
      instanceUrl: tokenData.instance_url 
    });

    if (tokenData.error) {
      console.error('Salesforce token exchange failed:', tokenData.error, tokenData.error_description);
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'salesforce-oauth-error', error: '${tokenData.error_description || tokenData.error}' }, '*'); window.close();</script><p>Error: ${tokenData.error_description || tokenData.error}. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    // Calculate token expiration (Salesforce tokens typically last 2 hours)
    const expiresAt = new Date(Date.now() + (tokenData.issued_at ? 7200000 : 7200000)).toISOString();

    // Upsert the Salesforce settings with the access token and instance info
    const { error: upsertError } = await supabase
      .from('salesforce_settings')
      .upsert({
        property_id: propertyId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        instance_url: tokenData.instance_url,
        token_expires_at: expiresAt,
        enabled: true,
      }, { onConflict: 'property_id' });

    if (upsertError) {
      console.error('Failed to save Salesforce settings:', upsertError);
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'salesforce-oauth-error', error: 'Failed to save' }, '*'); window.close();</script><p>Error: Failed to save. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    console.log('Salesforce OAuth completed successfully for property:', propertyId);

    // Return success HTML that closes the popup and notifies the parent
    return new Response(
      `<html><body><script>window.opener?.postMessage({ type: 'salesforce-oauth-success', instanceUrl: '${tokenData.instance_url || 'Salesforce'}' }, '*'); window.close();</script><p>Connected successfully! You can close this window.</p></body></html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('Salesforce OAuth callback error:', error);
    return new Response(
      `<html><body><script>window.opener?.postMessage({ type: 'salesforce-oauth-error', error: 'Server error' }, '*'); window.close();</script><p>Server error. You can close this window.</p></body></html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );
  }
});
