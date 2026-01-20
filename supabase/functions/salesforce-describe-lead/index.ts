import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { propertyId } = await req.json();

    if (!propertyId) {
      return new Response(
        JSON.stringify({ error: "Property ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch Salesforce settings for this property
    const { data: settings, error: settingsError } = await supabase
      .from("salesforce_settings")
      .select("*")
      .eq("property_id", propertyId)
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: "Salesforce settings not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!settings.instance_url || !settings.access_token) {
      return new Response(
        JSON.stringify({ error: "Salesforce not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Salesforce Lead describe API
    const describeUrl = `${settings.instance_url}/services/data/v59.0/sobjects/Lead/describe`;
    
    const sfResponse = await fetch(describeUrl, {
      headers: {
        "Authorization": `Bearer ${settings.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!sfResponse.ok) {
      // Token might be expired, try to refresh
      if (sfResponse.status === 401 && settings.refresh_token) {
        const refreshed = await refreshAccessToken(supabase, settings);
        if (refreshed) {
          // Retry with new token
          const retryResponse = await fetch(describeUrl, {
            headers: {
              "Authorization": `Bearer ${refreshed.access_token}`,
              "Content-Type": "application/json",
            },
          });

          if (retryResponse.ok) {
            const data = await retryResponse.json();
            return new Response(
              JSON.stringify({ fields: extractLeadFields(data) }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      const errorText = await sfResponse.text();
      console.error("Salesforce API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch Lead fields from Salesforce" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await sfResponse.json();
    const fields = extractLeadFields(data);

    return new Response(
      JSON.stringify({ fields }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractLeadFields(describeData: any) {
  return describeData.fields
    .filter((field: any) => field.createable && !field.deprecatedAndHidden)
    .map((field: any) => ({
      name: field.name,
      label: field.label,
      type: field.type,
      required: !field.nillable && !field.defaultedOnCreate,
    }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label));
}

async function refreshAccessToken(supabase: any, settings: any) {
  try {
    const tokenUrl = "https://login.salesforce.com/services/oauth2/token";
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: settings.client_id,
      client_secret: settings.client_secret,
      refresh_token: settings.refresh_token,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      console.error("Token refresh failed");
      return null;
    }

    const tokenData = await response.json();

    // Update stored tokens
    await supabase
      .from("salesforce_settings")
      .update({
        access_token: tokenData.access_token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    return tokenData;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}
