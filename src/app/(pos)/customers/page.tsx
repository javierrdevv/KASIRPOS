"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Plus, Pencil, Trash2, Users, Phone, Search } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  phone: string;
  note: string;
  total_spent?: number;
  order_count?: number;
};

export default function CustomersPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("customers").select("*");
    const rows = (data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone ?? "",
      note: c.note ?? "",
      order_count: undefined,
    }));
    setCustomers(rows);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(values: { name: string; phone: string; note: string }) {
    setSaving(true);
    const { error } = editing
      ? await supabase.from("customers").update(values).eq("id", editing.id)
      : await supabase.from("customers").insert(values);
    setSaving(false);
    if (error) alert(error.message);
    setEditing(null);
    setCreating(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus pelanggan ini?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) alert(error.message);
    else load();
  }

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      ("phone" in c && (c.phone ?? "").toLowerCase().includes(q))
    );
  });

  const formValues = (c?: Customer) => ({
    name: c?.name ?? "",
    phone: c?.phone ?? "",
    note: c?.note ?? "",
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Pelanggan</h1>
          <p className="mt-1 text-sm text-slate-500">{customers.length} pelanggan terdaftar</p>
        </div>
        <Button variant="primary" onClick={() => { setEditing(null); setCreating(true); }}>
          <Plus className="h-4 w-4" /> Tambah Pelanggan
        </Button>
      </div>

      <div className="relative mt-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama / no. HP…"
          className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Memuat…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-400">
            <Users className="h-8 w-8 text-slate-200" />
            Belum ada pelanggan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-2.5">Nama</th>
                  <th className="px-4 py-2.5">No. HP</th>
                  <th className="px-4 py-2.5">Transaksi</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{c.name}</p>
                      {c.note && <p className="text-xs text-slate-400">{c.note}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> {c.phone || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {c.order_count ?? "-"} transaksi
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => { setEditing(c); setCreating(true); }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(c.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creating && (
        <CustomerForm
          initial={editing?.id ? formValues(editing) : undefined}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={save}
          saving={saving}
        />
      )}
    </div>
  );
}

function CustomerForm({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial?: { name: string; phone: string; note: string };
  onClose: () => void;
  onSave: (v: { name: string; phone: string; note: string }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "Edit Pelanggan" : "Tambah Pelanggan"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            variant="primary"
            disabled={saving || !name.trim()}
            onClick={() => onSave({ name, phone, note })}
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nama">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="No. HP">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Catatan">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        </Field>
      </div>
    </Modal>
  );
}