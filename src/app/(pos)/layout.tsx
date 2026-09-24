import { createClient } from "@/lib/supabase/server";
import { PosLayout } from "@/components/pos-layout";
import { redirect } from "next/navigation";

export default async function PosLayoutRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name, active")
    .eq("id", user.id)
    .single();

  if (profile && profile.active === false) {
    await supabase.auth.signOut();
    redirect("/login?inactive=1");
  }

  const role = (profile?.role ?? "kasir") as "admin" | "kasir";
  const name = profile?.name ?? user.email?.split("@")[0] ?? "";

  return (
    <PosLayout role={role} name={name}>
      {children}
    </PosLayout>
  );
}