"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { formatIDR, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Truck, Plus, Pencil, Trash2, Phone } from "lucide-react";
import { AdminGate } from "@/components/admin-gate";

type Supplier = { id: string; name: string; phone: string; address: string };

export default function SuppliersPage() {
  const supabase = createClient();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(values: { name: string; phone: string; address: string }) {
    setSaving(true);
    const { error } = editing
      ? await supabase.from("suppliers").update(values).eq("id", editing.id)
      : await supabase.from("suppliers").insert(values);
    setSaving(false);
    if (error) alert(error.message);
    setEditing(null);
    setCreating(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus supplier ini?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) alert(error.message);
    else load();
  }

  return (
    <AdminGate>
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Supplier</h1>
          <p className="mt-1 text-sm text-slate-500">{suppliers.length} supplier</p>
        </div>
        <Button variant="primary" onClick={() => { setEditing(null); setCreating(true); }}>
          <Plus className="h-4 w-4" /> Tambah Supplier
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-sm text-slate-400">Memuat…</p>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-400">
            <Truck className="h-8 w-8 text-slate-200" />
            Belum ada supplier.
          </div>
        ) : (
          suppliers.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{s.name}</p>
                  {s.phone && (
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                      <Phone className="h-3.5 w-3.5" /> {s.phone}
                    </p>
                  )}
                  {s.address && (
                    <p className="mt-1 text-xs text-slate-400">{s.address}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditing(s); setCreating(true); }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {creating && (
        <SupplierForm
          initial={editing?.id ? { name: editing.name, phone: editing.phone, address: editing.address } : undefined}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={save}
          saving={saving}
        />
      )}
    </div>
    </AdminGate>
  );
}

function SupplierForm({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial?: { name: string; phone: string; address: string };
  onClose: () => void;
  onSave: (v: { name: string; phone: string; address: string }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "Edit Supplier" : "Tambah Supplier"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button variant="primary" disabled={saving || !name.trim()} onClick={() => onSave({ name, phone, address })}>
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nama supplier">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="No. HP">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Alamat">
          <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />
        </Field>
      </div>
    </Modal>
  );
}