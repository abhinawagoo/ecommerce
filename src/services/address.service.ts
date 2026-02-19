import { createClient } from "@/lib/supabase/client";
import type { DbAddress } from "@/types/database";

export type AddressInput = Omit<DbAddress, "id" | "user_id" | "created_at" | "updated_at">;

export async function getAddresses(): Promise<DbAddress[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbAddress[];
}

export async function getDefaultAddress(): Promise<DbAddress | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("is_default", true)
    .single();

  if (error) return null;
  return data as DbAddress;
}

export async function addAddress(address: AddressInput): Promise<DbAddress> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("addresses")
    .insert({ ...address, user_id: session.user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DbAddress;
}

export async function updateAddress(id: string, address: Partial<AddressInput>): Promise<DbAddress> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("addresses")
    .update(address)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DbAddress;
}

export async function deleteAddress(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setDefaultAddress(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function lookupPincode(pincode: string): Promise<{ city: string; state: string } | null> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await res.json();
    if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
      const po = data[0].PostOffice[0];
      return { city: po.District, state: po.State };
    }
    return null;
  } catch {
    return null;
  }
}
