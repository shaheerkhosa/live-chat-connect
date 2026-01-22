import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAgentRequest {
  agentName: string;
  agentEmail: string;
  password: string;
  invitedBy: string;
  propertyIds?: string[];
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { agentName, agentEmail, password, invitedBy, propertyIds }: CreateAgentRequest = await req.json();

    // Validate inputs
    if (!agentName?.trim() || !agentEmail?.trim() || !password?.trim() || !invitedBy) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = agentEmail.trim().toLowerCase();
    const name = agentName.trim();

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some(u => u.email?.toLowerCase() === email);
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: "An account with this email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: name,
      },
    });

    if (createError || !newUser?.user) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError?.message || "Failed to create user account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newUser.user.id;

    // Create agent record (the trigger handle_agent_signup will handle role assignment)
    const { data: agentData, error: agentError } = await supabaseAdmin
      .from("agents")
      .insert({
        name,
        email,
        user_id: userId,
        invited_by: invitedBy,
        invitation_status: "accepted",
        status: "offline",
      })
      .select()
      .single();

    if (agentError) {
      console.error("Error creating agent record:", agentError);
      // Try to clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Failed to create agent record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The database trigger assigns 'client' role by default for new users
    // We need to update it to 'agent' instead
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: "agent" })
      .eq("user_id", userId);

    if (roleError) {
      console.error("Error updating to agent role:", roleError);
      // Try inserting if update fails (in case trigger didn't fire)
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "agent" });
    }

    // Delete any duplicate 'client' role that might have been created
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "client");

    // Assign properties if provided
    if (propertyIds && propertyIds.length > 0 && agentData) {
      const assignments = propertyIds.map((propertyId) => ({
        agent_id: agentData.id,
        property_id: propertyId,
      }));

      const { error: assignError } = await supabaseAdmin
        .from("property_agents")
        .insert(assignments);

      if (assignError) {
        console.error("Error assigning properties:", assignError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Agent account created successfully",
        agentId: agentData.id,
        userId: userId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in create-agent-account:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
