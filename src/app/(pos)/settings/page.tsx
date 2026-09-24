"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Store, Printer, Loader2 } from "lucide-react";
import { AdminGate } from "@/components/admin-gate";

type SettingsMap = Record<string, string>;

export default function SettingsPage() {
  const supabase = createClient();
  const [form, setForm] = useState<SettingsMap>({
    store_name: "",
    store_address: "",
    store_phone: "",
    receipt_footer: "",
    tax_rate: "0",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("settings").select("key, value");
    if (data) {
      const map: SettingsMap = { ...form };
      for (const row of data) map[row.key] = row.value;
      setForm(map);
    }
    setLoading(false);
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    const rows = Object.entries(form).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) alert(error.message);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <AdminGate>
      <div className="max-w-2xl p-4 sm:p-6">
      <h1 className="text-xl font-bold">Pengaturan</h1>
      <p className="mt-1 text-sm text-slate-500">Profil toko yang tampil di struk</p>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
        {loading ? (
          <p className="text-sm text-slate-400">Memuat…</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="mb-2 flex items-center gap-2">
              <Store className="h-5 w-5 text-slate-400" />
              <h2 className="text-sm font-semibold">Profil Toko</h2>
            </div>
            <Field label="Nama toko">
              <Input
                value={form.store_name}
                onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))}
              />
            </Field>
            <Field label="Alamat">
              <Textarea
                value={form.store_address}
                onChange={(e) => setForm((f) => ({ ...f, store_address: e.target.value }))}
                rows={2}
              />
            </Field>
            <Field label="No. telepon">
              <Input
                value={form.store_phone}
                onChange={(e) => setForm((f) => ({ ...f, store_phone: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pajak (PPN %)" hint="0 jika tidak ada">
                <Input
                  type="number"
                  value={form.tax_rate}
                  onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))}
                />
              </Field>
            </div>
            <div className="my-2 flex items-center gap-2 border-t border-slate-100 pt-4">
              <Printer className="h-5 w-5 text-slate-400" />
              <h2 className="text-sm font-semibold">Struk</h2>
            </div>
            <Field label="Teks penutup struk">
              <Textarea
                value={form.receipt_footer}
                onChange={(e) => setForm((f) => ({ ...f, receipt_footer: e.target.value }))}
                rows={2}
              />
            </Field>
            <div className="flex justify-end gap-2">
              {saved && <p className="self-center text-sm text-emerald-600">Tersimpan ✓</p>}
              <Button variant="primary" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </AdminGate>
  );
}