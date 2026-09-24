"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { formatIDR, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PackageX, RefreshCw, Search } from "lucide-react";
import { AdminGate } from "@/components/admin-gate";

type Movement = {
  id: string;
  product_id: string;
  delta: number;
  reason: string;
  ref_id: string | null;
  created_at: string;
  products: { name: string; unit: string } | null;
};

export default function StockPage() {
  const supabase = createClient();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("stock_movements")
      .select("*, products(name, unit)")
      .order("created_at", { ascending: false })
      .range(0, 199);
    setMovements(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = movements.filter(
    (m) => filter === "all" || m.reason === filter
  );

  const reasons = [...new Set(movements.map((m) => m.reason))];
  const reasonLabels: Record<string, string> = {
    sale: "Penjualan",
    purchase: "Pembelian",
    "void:cancelled": "Pembatalan",
    "void:pending": "Pembatalan",
  };

  const totalIn = movements
    .filter((m) => m.delta > 0)
    .reduce((a, m) => a + m.delta, 0);
  const totalOut = movements
    .filter((m) => m.delta < 0)
    .reduce((a, m) => a + Math.abs(m.delta), 0);

  return (
    <AdminGate>
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Riwayat Stok</h1>
          <p className="mt-1 text-sm text-slate-500">
            Masuk {totalIn} · Keluar {totalOut}
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Muat Ulang
        </Button>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Cari produk…"
            className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="all">Semua jenis</option>
          {reasons.map((r) => (
            <option key={r} value={r}>
              {reasonLabels[r] ?? r}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Memuat…</div>
        ) : movements.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-400">
            <PackageX className="h-8 w-8 text-slate-200" />
            Belum ada pergerakan stok.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-2.5">Waktu</th>
                  <th className="px-4 py-2.5">Produk</th>
                  <th className="px-4 py-2.5">Jenis</th>
                  <th className="px-4 py-2.5 text-right">Perubahan</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 text-slate-500">
                      {formatDateTime(m.created_at)}
                    </td>
                    <td className="px-4 py-2.5 font-medium">
                      {m.products?.name ?? "Produk dihapus"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        className={
                          m.delta > 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }
                      >
                        {reasonLabels[m.reason] ?? m.reason}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      <span className={m.delta > 0 ? "text-emerald-600" : "text-rose-600"}>
                        {m.delta > 0 ? "+" : ""}
                        {m.delta}
                      </span>{" "}
                      <span className="font-normal text-slate-400">
                        {m.products?.unit ?? ""}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </AdminGate>
  );
}