import { createClient } from "@/lib/supabase/client";
import type { DbUser } from "@/types/database";

export interface AuthSession {
  user: DbUser | null;
  isAuthenticated: boolean;
}

export async function sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  const { error } = await supabase.functions.invoke("send-otp", {
    body: { phone },
  });

  if (error) {
    return { success: false, message: error.message || "Failed to send OTP" };
  }
  return { success: true, message: "OTP sent successfully" };
}

export async function verifyOtp(
  phone: string,
  otp: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("verify-otp", {
    body: { phone, otp },
  });

  if (error) {
    return { success: false, message: error.message || "Invalid OTP" };
  }

  // Set the session from the returned tokens
  if (data?.access_token && data?.refresh_token) {
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
  }

  return { success: true, message: "Verified successfully" };
}

export async function getSession(): Promise<AuthSession> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { user: null, isAuthenticated: false };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.user.id)
    .single();

  return {
    user: profile as DbUser | null,
    isAuthenticated: true,
  };
}

export async function logout(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export function onAuthStateChange(callback: (session: AuthSession) => void) {
  const supabase = createClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event) => {
    if (event === "SIGNED_OUT") {
      callback({ user: null, isAuthenticated: false });
    } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      const session = await getSession();
      callback(session);
    }
  });

  return subscription;
}
