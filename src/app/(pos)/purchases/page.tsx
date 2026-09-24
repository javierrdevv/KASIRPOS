"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { formatIDR, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus, Trash2, Search, Loader2 } from "lucide-react";
import { nextPurchaseCode } from "@/lib/constants";
import { AdminGate } from "@/components/admin-gate";

type Product = { id: string; name: string; unit: string; price: number; cost: number };
type Supplier = { id: string; name: string; phone: string; address: string };

export default function PurchasesPage() {
  const supabase = createClient();
  const [purchases, setPurchases] = useState<
    {
      id: string;
      code: string;
      note: string;
      total: number;
      created_at: string;
      suppliers: { name: string } | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("purchases")
      .select("*, suppliers(name)")
      .order("created_at", { ascending: false })
      .range(0, 99);
    setPurchases(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminGate>
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Pembelian</h1>
          <p className="mt-1 text-sm text-slate-500">Catatan pembelian dari supplier</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Transaksi Baru
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Memuat…</div>
        ) : purchases.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-400">
            <Truck className="h-8 w-8 text-slate-200" />
            Belum ada pembelian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-2.5">Kode</th>
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5">Supplier</th>
                  <th className="px-4 py-2.5">Catatan</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{p.code}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-2.5">{p.suppliers?.name ?? "-"}</td>
                    <td className="px-4 py-2.5 text-slate-500">{p.note || "-"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      {formatIDR(p.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && <PurchaseForm onClose={() => setShowForm(false)} onDone={load} />}
    </div>
    </AdminGate>
  );
}

function PurchaseForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const supabase = createClient();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<{ product_id: string; qty: string; unit_cost: string }[]>([
    { product_id: "", qty: "1", unit_cost: "" },
  ]);
  const [saving, setSaving] = useState(false);

  function addRow() {
    setItems((prev) => [...prev, { product_id: "", qty: "1", unit_cost: "" }]);
  }

  function updateItem(idx: number, patch: Partial<{ product_id: string; qty: string; unit_cost: string }>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  useEffect(() => {
    Promise.all([
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("products").select("*").order("name"),
    ]).then(([s, p]) => {
      setSuppliers(s.data ?? []);
      setProducts(p.data ?? []);
    });
  }, [supabase]);

  const itemRows = items;
  const total = items.reduce((acc, it) => {
    const cost = Number(it.unit_cost || 0);
    const qty = Number(it.qty || 0);
    return acc + cost * qty;
  }, 0);

  async function save() {
    if (items.length === 0 || !itemRows.some((i) => i.product_id)) {
      alert("Tambahkan minimal satu produk.");
      return;
    }
    setSaving(true);
    const code = nextPurchaseCode();
    const { data: purchase, error: perr } = await supabase
      .from("purchases")
      .insert({ code, supplier_id: supplierId || null, total, note })
      .select()
      .single();
    if (perr) {
      alert(perr.message);
      setSaving(false);
      return;
    }
    const rows = itemRows
      .filter((i) => i.product_id)
      .map((i) => ({
        purchase_id: purchase.id,
        product_id: i.product_id,
        qty: Number(i.qty || 0),
        unit_cost: Number(i.unit_cost || 0),
      }));
    const { error } = await supabase.from("purchase_items").insert(rows);
    setSaving(false);
    if (error) alert(error.message);
    else {
      onClose();
      onDone();
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Transaksi Pembelian Baru"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button variant="primary" disabled={saving} onClick={save}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan & Tambah Stok"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Supplier">
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Tanpa supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Kode transaksi">
            <Input value={nextPurchaseCode()} readOnly />
          </Field>
        </div>
        <Field label="Catatan">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={1} />
        </Field>

        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
                <th className="px-3 py-2">Produk</th>
                <th className="px-3 py-2 w-24">Qty</th>
                <th className="px-3 py-2 w-32">Harga beli</th>
                <th className="px-3 py-2 w-24 text-right">Subtotal</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {itemRows.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-50">
                  <td className="px-3 py-2">
                    <Select
                      value={row.product_id}
                      onChange={(e) =>
                        updateItem(idx, { product_id: e.target.value })
                      }
                    >
                      <option value="">Pilih produk…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={row.qty}
                      onChange={(e) => updateItem(idx, { qty: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={row.unit_cost}
                      placeholder="0"
                      onChange={(e) => updateItem(idx, { unit_cost: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatIDR(Number(row.unit_cost || 0) * Number(row.qty || 0))}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => removeItem(idx)}
                      className="p-1 text-slate-300 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="h-4 w-4" /> Tambah Baris
          </Button>
          <div className="text-right">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-lg font-bold text-emerald-600">{formatIDR(total)}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}