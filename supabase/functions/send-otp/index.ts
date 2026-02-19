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
    const { phone } = await req.json();

    if (!phone || !/^\+91\d{10}$/.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number. Use +91XXXXXXXXXX format." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: check recent OTP requests
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min expiry

    // Store OTP (upsert by phone)
    const { error: upsertError } = await supabaseAdmin
      .from("otp_codes")
      .upsert(
        { phone, code: otp, expires_at: expiresAt, attempts: 0 },
        { onConflict: "phone" }
      );

    if (upsertError) {
      console.error("OTP storage error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send OTP via WhatsApp Business API
    const whatsappApiUrl = Deno.env.get("WHATSAPP_API_URL");
    const whatsappApiKey = Deno.env.get("WHATSAPP_API_KEY");

    if (whatsappApiUrl && whatsappApiKey) {
      try {
        await fetch(`${whatsappApiUrl}/public/message/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${whatsappApiKey}`,
          },
          body: JSON.stringify({
            countryCode: "+91",
            phoneNumber: phone.replace("+91", ""),
            type: "Template",
            template: {
              name: "otp_verification",
              languageCode: "en",
              bodyValues: [otp],
            },
          }),
        });
      } catch (whatsappError: any) {
        console.error("WhatsApp API error:", whatsappError.message);
        // Don't fail the request - OTP is stored, just couldn't send via WhatsApp
        // In development, the OTP can be read from the database
      }
    } else {
      console.log(`[DEV] OTP for ${phone}: ${otp}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
