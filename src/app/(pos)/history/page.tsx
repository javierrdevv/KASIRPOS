"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { formatIDR, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { Receipt, Search, Undo2, Loader2 } from "lucide-react";

type OrderRow = {
  id: string;
  code: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  note: string;
  created_at: string;
  cashier_id: string;
  profiles: { name: string } | null;
};

type OrderDetail = OrderRow & {
  order_items: { id: string; name: string; qty: number; price: number }[];
  payments: { id: string; method: string; amount: number }[];
};

export default function HistoryPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [voiding, setVoiding] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, profiles(name)")
      .order("created_at", { ascending: false })
      .range(0, 99);
    setOrders(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(orderId: string) {
    const { data: order } = await supabase
      .from("orders")
      .select("*, order_items(*), payments(*), profiles(name)")
      .eq("id", orderId)
      .single();
    setDetail(order);
  }

  async function voidOrder() {
    if (!detail || !confirm(`Batalkan transaksi ${detail.code}? Stok otomatis dikembalikan.`)) return;
    setVoiding(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", detail.id);
    setVoiding(false);
    if (!error) {
      setDetail(null);
      load();
    }
  }

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchQ = !q || o.code.toLowerCase().includes(q);
    const matchS = status === "all" || o.status === status;
    return matchQ && matchS;
  });

  return (
      <div className="p-4 sm:p-6">
      <h1 className="text-xl font-bold">Riwayat Transaksi</h1>
      <p className="mt-1 text-sm text-slate-500">
        {orders.filter((o) => o.status === "paid").length} transaksi berhasil
      </p>

      <div className="mt-5 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode transaksi…"
            className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="all">Semua status</option>
          <option value="paid">Lunas</option>
          <option value="pending">Belum bayar</option>
          <option value="cancelled">Batal</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Memuat…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-400">
            <Receipt className="h-8 w-8 text-slate-200" />
            Belum ada transaksi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-2.5">Kode</th>
                  <th className="px-4 py-2.5">Waktu</th>
                  <th className="px-4 py-2.5">Kasir</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Detail</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{o.code}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatDateTime(o.created_at)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{o.profiles?.name ?? "-"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{formatIDR(o.total)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openDetail(o.id)}>
                        Lihat
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.code ?? "Detail"}
        size="lg"
      >
        {detail && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between rounded-lg bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs text-slate-500">Kasir</p>
                <p className="text-sm font-medium">{detail.profiles?.name ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Waktu</p>
                <p className="text-sm font-medium">{formatDateTime(detail.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Status</p>
                <StatusBadge status={detail.status} />
              </div>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Harga</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(detail.order_items ?? []).map((i: { id: string; name: string; qty: number; price: number }) => (
                  <tr key={i.id} className="border-b border-slate-50">
                    <td className="py-2">{i.name}</td>
                    <td className="py-2 text-center">{i.qty}</td>
                    <td className="py-2 text-right">{formatIDR(i.price)}</td>
                    <td className="py-2 text-right font-medium">
                      {formatIDR(Number(i.price) * Number(i.qty))}
                    </td>
                  </tr>
                ))}
              </tbody>
        </table>
        </div>

        <div className="flex flex-col items-end gap-1 text-sm">
              <span>Subtotal: <b>{formatIDR(detail.subtotal)}</b></span>
              {detail.discount > 0 && (
                <span>Diskon: <b>-{formatIDR(detail.discount)}</b></span>
              )}
              {detail.tax > 0 && <span>Pajak: <b>{formatIDR(detail.tax)}</b></span>}
              <span className="text-lg font-bold">
                Total: {formatIDR(detail.total)}
              </span>
            </div>

            {(detail.payments ?? []).length > 0 && (
              <div className="rounded-lg border border-slate-100 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Pembayaran
                </p>
                {detail.payments.map((p: { id: string; method: string; amount: number }) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span>{p.method}</span>
                    <span className="font-medium">{formatIDR(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {detail.status === "paid" && (
              <><br /><div className="flex justify-end">
                <Button variant="danger" onClick={voidOrder} disabled={voiding}>
                  {voiding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                  Batalkan Transaksi
                </Button>
              </div></>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}