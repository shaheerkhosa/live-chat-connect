import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // This is "propertyId:codeVerifier"
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (error) {
      console.error("OAuth error:", error, errorDescription);
      return new Response(
        `<html><body><script>window.opener?.postMessage({type:'salesforce-oauth-error',error:'${error}'},'*');window.close();</script><p>Authentication failed: ${errorDescription || error}. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    if (!code || !state) {
      return new Response(
        `<html><body><script>window.opener?.postMessage({type:'salesforce-oauth-error',error:'missing_params'},'*');window.close();</script><p>Missing required parameters. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    // Parse state to get propertyId and codeVerifier
    const [propertyId, codeVerifier] = state.split(':');
    if (!propertyId || !codeVerifier) {
      return new Response(
        `<html><body><script>window.opener?.postMessage({type:'salesforce-oauth-error',error:'invalid_state'},'*');window.close();</script><p>Invalid state parameter. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the Salesforce settings to get client credentials
    const { data: settings, error: settingsError } = await supabase
      .from("salesforce_settings")
      .select("*")
      .eq("property_id", propertyId)
      .single();

    if (settingsError || !settings) {
      console.error("Error fetching settings:", settingsError);
      return new Response(
        `<html><body><script>window.opener?.postMessage({type:'salesforce-oauth-error',error:'settings_not_found'},'*');window.close();</script><p>Settings not found. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    const clientId = settings.client_id;
    const clientSecret = settings.client_secret;

    if (!clientId || !clientSecret) {
      return new Response(
        `<html><body><script>window.opener?.postMessage({type:'salesforce-oauth-error',error:'missing_credentials'},'*');window.close();</script><p>Missing OAuth credentials. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    // Exchange code for tokens
    const redirectUri = `${supabaseUrl}/functions/v1/salesforce-oauth-callback`;
    const tokenResponse = await fetch("https://login.salesforce.com/services/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error("Token exchange error:", tokenData);
      return new Response(
        `<html><body><script>window.opener?.postMessage({type:'salesforce-oauth-error',error:'${tokenData.error || 'token_error'}'},'*');window.close();</script><p>Token exchange failed: ${tokenData.error_description || tokenData.error}. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 7200) * 1000).toISOString();

    // Update the settings with tokens
    const { error: updateError } = await supabase
      .from("salesforce_settings")
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        instance_url: tokenData.instance_url,
        token_expires_at: expiresAt,
        enabled: true,
      })
      .eq("property_id", propertyId);

    if (updateError) {
      console.error("Error updating settings:", updateError);
      return new Response(
        `<html><body><script>window.opener?.postMessage({type:'salesforce-oauth-error',error:'update_failed'},'*');window.close();</script><p>Failed to save tokens. You can close this window.</p></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    console.log("Salesforce OAuth successful for property:", propertyId);

    return new Response(
      `<html><body><script>window.opener?.postMessage({type:'salesforce-oauth-success'},'*');window.close();</script><p>Connected to Salesforce successfully! You can close this window.</p></body></html>`,
      { headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      `<html><body><script>window.opener?.postMessage({type:'salesforce-oauth-error',error:'unexpected'},'*');window.close();</script><p>An unexpected error occurred. You can close this window.</p></body></html>`,
      { headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  }
});
