"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Plus, Pencil, Trash2, Boxes } from "lucide-react";
import { AdminGate } from "@/components/admin-gate";

export default function CategoriesPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name, sort_order")
      .order("sort_order")
      .order("name");
    setCategories(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = editing
      ? await supabase
          .from("categories")
          .update({ name: name.trim() })
          .eq("id", editing.id)
      : await supabase.from("categories").insert({ name: name.trim(), sort_order: 0 });
    setSaving(false);
    if (error) alert(error.message);
    setShowForm(false);
    setEditing(null);
    setName("");
    load();
  }

  async function remove(c: Category) {
    if (!confirm(`Hapus kategori "${c.name}"? Produk tetap tersimpan tanpa kategori.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) alert(error.message);
    else load();
  }

  return (
    <AdminGate>
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Kategori</h1>
          <p className="mt-1 text-sm text-slate-500">{categories.length} kategori</p>
        </div>
        <Button variant="primary" onClick={() => { setEditing(null); setName(""); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Tambah Kategori
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {loading ? (
          <p className="text-sm text-slate-400">Memuat…</p>
        ) : categories.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-400">
            <Boxes className="h-8 w-8 text-slate-200" />
            Belum ada kategori.
          </div>
        ) : (
          categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-slate-400">Urutan {c.sort_order}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditing(c); setName(c.name); setShowForm(true); }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(c)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Edit Kategori" : "Tambah Kategori"}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Batal
            </Button>
            <Button variant="primary" disabled={saving || !name.trim()} onClick={save}>
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </>
        }
      >
        <Field label="Nama kategori">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
      </Modal>
    </div>
    </AdminGate>
  );
}