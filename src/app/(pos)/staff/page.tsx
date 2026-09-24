"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, UserCircle, Loader2 } from "lucide-react";
import { AdminGate } from "@/components/admin-gate";

type Profile = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "kasir";
  active: boolean;
};

export default function StaffPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, name, role, active")
      .order("name");
    setProfiles(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function createUser() {
    if (!email.trim() || !password) return;
    setSaving(true);
    const { data, error } = await supabase.rpc("create_employee", {
      p_email: email.trim(),
      p_password: password,
      p_name: name.trim() || email.split("@")[0],
    });
    setSaving(false);
    if (error) {
      alert(error.message);
    } else {
      setEmail("");
      setPassword("");
      setName("");
      load();
      router.refresh();
    }
  }

  async function removeUser(p: Profile) {
    if (
      !confirm(
        `Hapus akun ${p.name || p.email}? Akun akan dihapus permanen.`
      )
    )
      return;

    const { error } = await supabase.rpc("delete_employee", { p_id: p.id });

    if (!error) {
      load();
      return;
    }

    // RPC belum ada (migrasi 0005 belum dijalankan) → fallback nonaktifkan
    const rpcMissing =
      error.code === "PGRST202" ||
      /could not find the function|does not exist/i.test(error.message);

    if (!rpcMissing) {
      alert(error.message);
      return;
    }

    if (
      !confirm(
        "Fitur hapus permanen belum aktif. Nonaktifkan akun ini sebagai gantinya?"
      )
    )
      return;

    const { error: e2 } = await supabase
      .from("profiles")
      .update({ active: false })
      .eq("id", p.id);
    if (e2) {
      alert(e2.message);
      return;
    }
    load();
    if (p.id === (await supabase.auth.getUser()).data.user?.id) {
      router.replace("/login");
    }
  }

  async function activateUser(p: Profile) {
    const { error } = await supabase
      .from("profiles")
      .update({ active: true })
      .eq("id", p.id);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  }

  return (
    <AdminGate>
    <div className="p-6">
      <h1 className="text-xl font-bold">Staf & Pengguna</h1>
      <p className="mt-1 text-sm text-slate-500">Akun kasir dan admin</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-slate-400" />
            <h2 className="text-sm font-semibold">Tambah Staf</h2>
          </div>
          <div className="flex flex-col gap-3">
            <Field label="Nama">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kasir" />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kasir@tokosaya.com"
              />
            </Field>
            <Field label="Kata sandi sementara">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 karakter"
              />
            </Field>
            <Button variant="primary" onClick={createUser} disabled={saving || !email.trim() || password.length < 6}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buat Akun"}
            </Button>
            <p className="text-xs text-slate-400">
              Akun baru otomatis berperan kasir. Menghapus akun akan menonaktifkannya sehingga tidak bisa login lagi.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-400" />
            <h2 className="text-sm font-semibold">Daftar Staf ({profiles.length})</h2>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Memuat…</p>
          ) : (
            <div className="flex flex-col gap-2">
              {profiles.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name || "-"}</p>
                    <p className="truncate text-xs text-slate-400">{p.email}</p>
                  </div>
              <div className="flex items-center gap-2">
                <Badge className={p.role === "admin" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}>
                  {p.role === "admin" ? "Admin" : "Kasir"}
                </Badge>
                {!p.active && (
                  <Badge className="bg-red-100 text-red-700">Nonaktif</Badge>
                )}
                {!p.active && (
                  <button
                    onClick={() => activateUser(p)}
                    className="text-xs font-medium text-slate-400 underline hover:text-emerald-600"
                  >
                    Aktifkan
                  </button>
                )}
                <button
                  onClick={() => removeUser(p)}
                  className="text-xs font-medium text-slate-400 underline hover:text-red-500"
                >
                  Hapus
                </button>
              </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </AdminGate>
  );
}