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
    const { conversationId, visitorId, sessionId, senderType, content } = await req.json();

    if (!conversationId || !visitorId || !sessionId || !senderType || !content) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (senderType !== "visitor" && senderType !== "agent") {
      return new Response(JSON.stringify({ error: "Invalid senderType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate conversation belongs to visitor
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id,visitor_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr || !conv) {
      return new Response(JSON.stringify({ error: "Invalid conversationId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (conv.visitor_id !== visitorId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate session matches visitor
    const { data: visitor, error: visitorErr } = await supabase
      .from("visitors")
      .select("id,session_id")
      .eq("id", visitorId)
      .maybeSingle();

    if (visitorErr || !visitor) {
      return new Response(JSON.stringify({ error: "Invalid visitorId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (visitor.session_id !== sessionId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute next sequence_number
    const { data: maxSeq } = await supabase
      .from("messages")
      .select("sequence_number")
      .eq("conversation_id", conversationId)
      .order("sequence_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSeq = ((maxSeq?.sequence_number as number | undefined) || 0) + 1;

    const sender_id = senderType === "visitor" ? visitorId : "ai-bot";

    const { error: insertErr } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id,
      sender_type: senderType,
      content: String(content),
      sequence_number: nextSeq,
    });

    if (insertErr) {
      console.error("widget-save-message: insert failed", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, sequence_number: nextSeq }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("widget-save-message error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
