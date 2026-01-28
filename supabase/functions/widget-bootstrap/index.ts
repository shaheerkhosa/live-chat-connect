import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      propertyId,
      sessionId,
      currentPage,
      browserInfo,
      gclid,
      greeting,
    } = await req.json();

    if (!propertyId || !sessionId) {
      return new Response(JSON.stringify({ error: "propertyId and sessionId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate property exists
    const { data: property, error: propErr } = await supabase
      .from("properties")
      .select("id,greeting")
      .eq("id", propertyId)
      .maybeSingle();

    if (propErr || !property) {
      return new Response(JSON.stringify({ error: "Invalid propertyId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find or create visitor
    let visitorId: string;
    let visitorInfo: { name?: string; email?: string } = {};

    const { data: existingVisitor, error: visitorFindErr } = await supabase
      .from("visitors")
      .select("id,name,email")
      .eq("property_id", propertyId)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (visitorFindErr) {
      console.error("widget-bootstrap: visitor lookup error", visitorFindErr);
    }

    if (existingVisitor?.id) {
      visitorId = existingVisitor.id;
      if (existingVisitor.name) visitorInfo.name = existingVisitor.name;
      if (existingVisitor.email) visitorInfo.email = existingVisitor.email;

      // Best-effort update of the latest page
      await supabase
        .from("visitors")
        .update({
          current_page: currentPage ?? null,
          browser_info: browserInfo ?? null,
        })
        .eq("id", visitorId);
    } else {
      const { data: newVisitor, error: createErr } = await supabase
        .from("visitors")
        .insert({
          property_id: propertyId,
          session_id: sessionId,
          current_page: currentPage ?? null,
          browser_info: browserInfo ?? null,
          gclid: gclid ?? null,
        })
        .select("id")
        .single();

      if (createErr || !newVisitor?.id) {
        console.error("widget-bootstrap: failed to create visitor", createErr);
        return new Response(JSON.stringify({ error: "Failed to create visitor" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      visitorId = newVisitor.id;
    }

    // Find or create conversation
    let conversationId: string;
    const { data: existingConv, error: convFindErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("property_id", propertyId)
      .eq("visitor_id", visitorId)
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convFindErr) {
      console.error("widget-bootstrap: conversation lookup error", convFindErr);
    }

    if (existingConv?.id) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv, error: convCreateErr } = await supabase
        .from("conversations")
        .insert({
          property_id: propertyId,
          visitor_id: visitorId,
          status: "pending",
        })
        .select("id")
        .single();

      if (convCreateErr || !newConv?.id) {
        console.error("widget-bootstrap: failed to create conversation", convCreateErr);
        return new Response(JSON.stringify({ error: "Failed to create conversation" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      conversationId = newConv.id;
    }

    // Ensure greeting exists as the first message (best-effort)
    const greetingText = (greeting ?? property.greeting ?? "").toString();
    if (greetingText.trim()) {
      const { data: anyMsg } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .limit(1);

      if (!anyMsg || anyMsg.length === 0) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: "ai-bot",
          sender_type: "agent",
          content: greetingText,
          sequence_number: 1,
        });
      }
    }

    return new Response(JSON.stringify({ visitorId, conversationId, visitorInfo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("widget-bootstrap error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
