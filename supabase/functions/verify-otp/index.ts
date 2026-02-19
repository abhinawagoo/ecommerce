// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ error: "Phone and OTP are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch stored OTP
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .single();

    if (fetchError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "No OTP found for this number. Request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max attempts
    if (otpRecord.attempts >= 5) {
      await supabaseAdmin.from("otp_codes").delete().eq("phone", phone);
      return new Response(
        JSON.stringify({ error: "Too many attempts. Request a new OTP." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabaseAdmin.from("otp_codes").delete().eq("phone", phone);
      return new Response(
        JSON.stringify({ error: "OTP expired. Request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment attempts
    await supabaseAdmin
      .from("otp_codes")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("phone", phone);

    // Verify OTP
    if (otpRecord.code !== otp) {
      return new Response(
        JSON.stringify({ error: "Invalid OTP" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // OTP is valid - clean up
    await supabaseAdmin.from("otp_codes").delete().eq("phone", phone);

    // Check if user exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.phone === phone
    );

    let userId: string;
    let accessToken: string;
    let refreshToken: string;

    if (existingUser) {
      // Generate session for existing user
      const { data: sessionData, error: sessionError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: `${phone.replace("+", "")}@phone.auth`,
        });

      if (sessionError) {
        // Fallback: sign in with password
        const { data: signInData, error: signInError } =
          await supabaseAdmin.auth.signInWithPassword({
            phone,
            password: `otp_verified_${phone}`,
          });

        if (signInError) throw signInError;
        userId = signInData.user!.id;
        accessToken = signInData.session!.access_token;
        refreshToken = signInData.session!.refresh_token;
      } else {
        userId = existingUser.id;
        accessToken = sessionData.properties?.access_token ?? "";
        refreshToken = sessionData.properties?.refresh_token ?? "";
      }
    } else {
      // Create new user
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          phone,
          phone_confirm: true,
          password: `otp_verified_${phone}`,
          user_metadata: { phone },
        });

      if (createError) throw createError;
      userId = newUser.user!.id;

      // Create profile in public.users table
      await supabaseAdmin.from("users").insert({
        id: userId,
        phone,
        role: "customer",
      });

      // Sign in to get tokens
      const { data: signInData, error: signInError } =
        await supabaseAdmin.auth.signInWithPassword({
          phone,
          password: `otp_verified_${phone}`,
        });

      if (signInError) throw signInError;
      accessToken = signInData.session!.access_token;
      refreshToken = signInData.session!.refresh_token;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Verify OTP error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
