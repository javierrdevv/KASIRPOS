import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireRole(roles: ("admin" | "kasir")[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "kasir";
  if (!roles.includes(role)) redirect("/");

  return { supabase, user, role };
}