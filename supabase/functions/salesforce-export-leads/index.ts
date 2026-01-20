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
    const { propertyId, visitorIds } = await req.json();

    if (!propertyId || !visitorIds || visitorIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Property ID and visitor IDs are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch Salesforce settings
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
        JSON.stringify({ error: "Salesforce not connected. Please connect your account first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch visitors
    const { data: visitors, error: visitorsError } = await supabase
      .from("visitors")
      .select("*")
      .in("id", visitorIds);

    if (visitorsError || !visitors || visitors.length === 0) {
      return new Response(
        JSON.stringify({ error: "No visitors found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get field mappings
    const fieldMappings = settings.field_mappings || {};
    
    let accessToken = settings.access_token;
    let exported = 0;
    const errors: string[] = [];

    // Export each visitor as a Lead
    for (const visitor of visitors) {
      const leadData: Record<string, string> = {};

      // Map visitor fields to Salesforce Lead fields
      for (const [sfField, visitorField] of Object.entries(fieldMappings)) {
        const value = visitor[visitorField as keyof typeof visitor];
        if (value !== null && value !== undefined) {
          leadData[sfField] = String(value);
        }
      }

      // Ensure required fields have values
      if (!leadData.LastName) {
        leadData.LastName = visitor.name || visitor.email?.split('@')[0] || 'Unknown';
      }
      if (!leadData.Company) {
        leadData.Company = '[Not Provided]';
      }

      // Add lead source
      leadData.LeadSource = 'Website Chat';

      try {
        let response = await fetch(
          `${settings.instance_url}/services/data/v59.0/sobjects/Lead`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(leadData),
          }
        );

        // Handle token refresh if needed
        if (response.status === 401 && settings.refresh_token) {
          const newToken = await refreshAccessToken(supabase, settings);
          if (newToken) {
            accessToken = newToken;
            response = await fetch(
              `${settings.instance_url}/services/data/v59.0/sobjects/Lead`,
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(leadData),
              }
            );
          }
        }

        if (response.ok) {
          const result = await response.json();
          
          // Find or create a conversation for this visitor to record the export
          const { data: conversation } = await supabase
            .from("conversations")
            .select("id")
            .eq("visitor_id", visitor.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (conversation) {
            await supabase
              .from("salesforce_exports")
              .insert({
                conversation_id: conversation.id,
                salesforce_lead_id: result.id,
                export_type: "manual",
              });
          }

          exported++;
        } else {
          const errorData = await response.json();
          console.error("Salesforce error:", errorData);
          errors.push(`Failed to export ${visitor.name || visitor.email || visitor.id}`);
        }
      } catch (err) {
        console.error("Export error:", err);
        errors.push(`Error exporting ${visitor.name || visitor.email || visitor.id}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        exported, 
        total: visitors.length,
        errors: errors.length > 0 ? errors : undefined 
      }),
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

    await supabase
      .from("salesforce_settings")
      .update({
        access_token: tokenData.access_token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    return tokenData.access_token;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}
