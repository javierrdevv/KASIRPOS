"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import type { Category, Product } from "@/lib/types";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, Search, Package } from "lucide-react";
import { AdminGate } from "@/components/admin-gate";

export default function ProductsPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ data: products }, { data: categories }] = await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("categories").select("*").order("sort_order").order("name"),
    ]);
    setProducts(products ?? []);
    setCategories(categories ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q);
  });

  async function save(values: Partial<Product>) {
    setSaving(true);
    const payload = {
      name: values.name,
      category_id: values.category_id || null,
      sku: values.sku || null,
      barcode: values.barcode || null,
      price: Number(values.price),
      cost: Number(values.cost),
      stock: Number(values.stock),
      unit: values.unit || "pcs",
      low_stock: Number(values.low_stock),
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setEditing(null);
    setCreating(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus produk ini?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) alert(error.message);
    else load();
  }

  const formValues = (p: Partial<Product>) => ({
    name: p.name ?? "",
    category_id: p.category_id ?? "",
    sku: p.sku ?? "",
    barcode: p.barcode ?? "",
    price: String(p.price ?? ""),
    cost: String(p.cost ?? ""),
    stock: String(p.stock ?? ""),
    unit: p.unit ?? "pcs",
    low_stock: String(p.low_stock ?? "5"),
  });

  return (
    <AdminGate>
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Produk</h1>
          <p className="mt-1 text-sm text-slate-500">
            {products.length} produk terdaftar
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Tambah Produk
        </Button>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk / SKU…"
            className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Memuat…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-400">
            <Package className="h-8 w-8 text-slate-200" />
            Belum ada produk. Tambahkan produk pertama Anda.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
                <th className="px-4 py-2.5">Produk</th>
                <th className="px-4 py-2.5">SKU/Barcode</th>
                <th className="px-4 py-2.5 text-right">Harga</th>
                <th className="px-4 py-2.5 text-right">Stok</th>
                <th className="px-4 py-2.5">Kategori</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="h-9 w-9 object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center text-slate-300">
                    <Package className="h-4 w-4" />
                  </div>
                )}
              </div>
              {p.name}
            </div>
          </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                    {p.sku || "-"} / {p.barcode || "-"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    {formatIDR(p.price)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right",
                      p.stock <= p.low_stock ? "font-semibold text-amber-600" : ""
                    )}
                  >
                    {p.stock} {p.unit}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {categories.find((c) => c.id === p.category_id)?.name ?? "-"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      className={
                        p.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }
                    >
                      {p.active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditing(p)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(p.id)}
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
        )}
      </div>

      {(creating || editing) && (
        <ProductForm
          initial={editing?.id ? { ...editing, sku: editing.sku ?? "" } : undefined}
          categories={categories}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={save}
          saving={saving}
        />
      )}
    </div>
    </AdminGate>
  );
}

function ProductForm({
  initial,
  categories,
  onClose,
  onSave,
  saving,
}: {
  initial?: Partial<Product> & { sku?: string };
  categories: Category[];
  onClose: () => void;
  onSave: (p: Partial<Product>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(() => {
    const base = {
      name: initial?.name ?? "",
      category_id: initial?.category_id ?? "",
      sku: initial?.sku ?? "",
      barcode: initial?.barcode ?? "",
      image_url: initial?.image_url ?? "",
      price: initial?.price ?? "",
      cost: initial?.cost ?? "",
      stock: initial?.stock ?? "",
      unit: initial?.unit ?? "pcs",
      low_stock: initial?.low_stock ?? "5",
    };
    return base;
  });

  function set(key: string, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "Edit Produk" : "Tambah Produk"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="primary"
            disabled={saving || !form.name}
            onClick={() =>
              onSave({
                ...form,
                price: Number(form.price || 0),
                cost: Number(form.cost || 0),
                stock: Number(form.stock || 0),
                low_stock: Number(form.low_stock || 0),
              })
            }
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nama produk">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategori">
            <Select value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
              <option value="">Tanpa kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Satuan">
            <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU">
            <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} />
          </Field>
          <Field label="Barcode">
            <Input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} />
          </Field>
        </div>
        <Field label="Gambar (URL)" hint="Kosongkan untuk memakai ikon default">
          <Input
            value={form.image_url || ""}
            onChange={(e) => set("image_url", e.target.value)}
            placeholder="https://…"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Harga jual (Rp)">
            <Input
              type="number"
              inputMode="numeric"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
            />
          </Field>
          <Field label="Harga beli (Rp)">
            <Input
              type="number"
              inputMode="numeric"
              value={form.cost}
              onChange={(e) => set("cost", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stok awal">
            <Input
              type="number"
              value={form.stock}
              onChange={(e) => set("stock", e.target.value)}
            />
          </Field>
          <Field label="Batas stok menipis">
            <Input
              type="number"
              value={form.low_stock}
              onChange={(e) => set("low_stock", e.target.value)}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}