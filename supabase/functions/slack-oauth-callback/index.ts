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

    console.log('Slack OAuth callback received:', { code: !!code, state: !!state, error });

    if (error) {
      console.error('Slack OAuth error:', error);
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'slack-oauth-error', error: '${error}' }, '*'); window.close();</script><p>Error: ${error}. You can close this window.</p></body></html>`,
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

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get the Slack settings for this property to retrieve client_id and client_secret
    const { data: settings, error: settingsError } = await supabase
      .from('slack_notification_settings')
      .select('id, client_id, client_secret')
      .eq('property_id', propertyId)
      .single();

    if (settingsError || !settings) {
      console.error('Failed to get Slack settings:', settingsError);
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'slack-oauth-error', error: 'Settings not found' }, '*'); window.close();</script><p>Error: Settings not found. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    if (!settings.client_id || !settings.client_secret) {
      console.error('Missing client credentials');
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'slack-oauth-error', error: 'Missing OAuth credentials' }, '*'); window.close();</script><p>Error: Missing OAuth credentials. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    // Get the redirect URI (should match what was used in the authorization request)
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/slack-oauth-callback`;

    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: settings.client_id,
        client_secret: settings.client_secret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Slack token response:', { ok: tokenData.ok, team: tokenData.team?.name });

    if (!tokenData.ok) {
      console.error('Slack token exchange failed:', tokenData.error);
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'slack-oauth-error', error: '${tokenData.error}' }, '*'); window.close();</script><p>Error: ${tokenData.error}. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    // Update the Slack settings with the access token and team info
    const { error: updateError } = await supabase
      .from('slack_notification_settings')
      .update({
        access_token: tokenData.access_token,
        team_id: tokenData.team?.id,
        team_name: tokenData.team?.name,
        bot_user_id: tokenData.bot_user_id,
        incoming_webhook_url: tokenData.incoming_webhook?.url,
        incoming_webhook_channel: tokenData.incoming_webhook?.channel,
      })
      .eq('id', settings.id);

    if (updateError) {
      console.error('Failed to update Slack settings:', updateError);
      return new Response(
        `<html><body><script>window.opener?.postMessage({ type: 'slack-oauth-error', error: 'Failed to save' }, '*'); window.close();</script><p>Error: Failed to save. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    console.log('Slack OAuth completed successfully for property:', propertyId);

    // Return success HTML that closes the popup and notifies the parent
    return new Response(
      `<html><body><script>window.opener?.postMessage({ type: 'slack-oauth-success', team: '${tokenData.team?.name || 'Slack'}' }, '*'); window.close();</script><p>Connected successfully! You can close this window.</p></body></html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('Slack OAuth callback error:', error);
    return new Response(
      `<html><body><script>window.opener?.postMessage({ type: 'slack-oauth-error', error: 'Server error' }, '*'); window.close();</script><p>Server error. You can close this window.</p></body></html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );
  }
});
