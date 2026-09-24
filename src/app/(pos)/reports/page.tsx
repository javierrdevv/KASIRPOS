"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { formatIDR, formatDate } from "@/lib/format";
import { PAYMENT_LABELS } from "@/lib/constants";
import type { PaymentMethod } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Field, Select, Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { TrendingUp, Download, Loader2 } from "lucide-react";
import { AdminGate } from "@/components/admin-gate";

export default function ReportsPage() {
  const supabase = createClient();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [orders, setOrders] = useState<
    {
      id: string;
      code: string;
      status: string;
      subtotal: number;
      discount: number;
      tax: number;
      total: number;
      created_at: string;
      cashier_id: string;
      profiles: { name: string | null }[] | null;
    }[]
  >([]);
  const [payments, setPayments] = useState<
    { method: string; amount: number }[]
  >([]);
  const [cashiers, setCashiers] = useState<
    { id: string; name: string; role: string }[]
  >([]);
  const [cashierFilter, setCashierFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const start = `${from}T00:00:00`;
    const end = `${to}T23:59:59`;

    const [oRes, pRes, cRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, code, status, subtotal, discount, tax, total, created_at, cashier_id, profiles(name)")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at"),
      supabase
        .from("payments")
        .select("method, amount, created_at, order_id")
        .gte("created_at", start)
        .lte("created_at", end),
      supabase.from("profiles").select("id, name, role").order("name"),
    ]);
    setOrders(oRes.data ?? []);
    setPayments(pRes.data ?? []);
    setCashiers(cRes.data ?? []);
    setLoading(false);
  }, [supabase, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const byCashier = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number }>();
    for (const o of orders) {
      if (o.status !== "paid") continue;
      const cid = o.cashier_id;
      const cur = map.get(cid) ?? {
        name: (o.profiles?.[0]?.name ?? "-") + " (Kasir)",
        count: 0,
        total: 0,
      };
      cur.count += 1;
      cur.total += Number(o.total);
      map.set(cid, cur);
    }
    return [...map.values()];
  }, [orders]);

  const paidOrders = orders.filter((o) => o.status === "paid");
  const gross = paidOrders.reduce((a, o) => a + Number(o.subtotal), 0);
  const discount = paidOrders.reduce((a, o) => a + Number(o.discount), 0);
  const tax = paidOrders.reduce((a, o) => a + Number(o.tax), 0);
  const total = paidOrders.reduce((a, o) => a + Number(o.total), 0);

  const cashTotal = payments
    .filter((p) => p.method === "cash")
    .reduce((a, p) => a + Number(p.amount), 0);
  const qrisTotal = payments
    .filter((p) => p.method === "qris")
    .reduce((a, p) => a + Number(p.amount), 0);
  const transferTotal = payments
    .filter((p) => p.method === "transfer")
    .reduce((a, p) => a + Number(p.amount), 0);

  const byDay = (() => {
    const map = new Map<string, { date: string; count: number; total: number }>();
    for (const o of paidOrders) {
      const d = o.created_at.slice(0, 10);
      const cur = map.get(d) ?? { date: d, count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(o.total);
      map.set(d, cur);
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  })();

  function exportCsv() {
    const rows = [
      ["Kode", "Waktu", "Kasir", "Subtotal", "Diskon", "Pajak", "Total", "Status"],
      ...orders.map((o) => [
        o.code,
        o.created_at,
        o.profiles?.[0]?.name ?? "",
        String(o.subtotal),
        String(o.discount),
        String(o.tax),
        String(o.total),
        o.status,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminGate>
    <div className="p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Laporan Penjualan</h1>
          <p className="mt-1 text-sm text-slate-500">Rekap sesuai rentang tanggal</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={orders.length === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <Field label="Dari">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Sampai">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Kasir">
          <Select value={cashierFilter} onChange={(e) => setCashierFilter(e.target.value)}>
            <option value="all">Semua</option>
            {cashiers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Button variant="default" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Terapkan"}
        </Button>
      </div>

      {loading ? (
        <div className="mt-6 p-10 text-center text-sm text-slate-400">Memuat…</div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Summary label="Total Penjualan" value={formatIDR(total)} accent="bg-emerald-50 text-emerald-600" />
            <Summary label="Diskon diberikan" value={`-${formatIDR(discount)}`} accent="bg-amber-50 text-amber-600" />
            <Summary label="Pajak" value={formatIDR(tax)} accent="bg-blue-50 text-blue-600" />
            <Summary label="Jumlah transaksi" value={String(paidOrders.length)} accent="bg-violet-50 text-violet-600" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold">Metode Pembayaran</h2>
              <div className="flex flex-col gap-2">
                <MethodRow label="Tunai" value={formatIDR(cashTotal)} />
                <MethodRow label="QRIS / E-Wallet" value={formatIDR(qrisTotal)} />
                <MethodRow label="Transfer Bank" value={formatIDR(transferTotal)} />
              </div>
              <p className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3 text-sm text-slate-400">
                <TrendingUp className="h-4 w-4" /> Total pembayaran: {formatIDR(cashTotal + qrisTotal + transferTotal)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold">Rekap per Kasir</h2>
              <div className="flex flex-col gap-2">
                {byCashier.length === 0 ? (
                  <p className="text-sm text-slate-400">Tidak ada data.</p>
                ) : (
                  byCashier.map((c) => (
                    <div key={c.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-slate-400">{c.count} transaksi</p>
                      </div>
                      <p className="text-sm font-semibold">{formatIDR(c.total)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold">Penjualan per Hari</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                    <th className="py-2">Tanggal</th>
                    <th className="py-2 text-center">Transaksi</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {byDay.map((d) => (
                    <tr key={d.date} className="border-b border-slate-50 last:border-0">
                      <td className="py-2">{formatDate(d.date)}</td>
                      <td className="py-2 text-center">{d.count}</td>
                      <td className="py-2 text-right font-medium">{formatIDR(d.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
    </AdminGate>
  );
}

function Summary({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function MethodRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-sm">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}