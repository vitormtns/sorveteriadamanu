import { createServerSupabaseClient } from "@/data/supabase/server";
import { redirect } from "next/navigation";

export async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : { supabase, user };
}

export async function getActiveOwnerProfile() {
  const authenticated = await getAuthenticatedUser();
  if (!authenticated) return null;
  const { data: profile } = await authenticated.supabase.from("profiles").select("id, name, role, active").eq("id", authenticated.user.id).maybeSingle();
  if (!profile || !profile.active || profile.role !== "owner") return null;
  return { ...authenticated, profile };
}

export async function requireActiveOwner() {
  const owner = await getActiveOwnerProfile();
  if (!owner) redirect("/login?erro=conta");
  return owner;
}
