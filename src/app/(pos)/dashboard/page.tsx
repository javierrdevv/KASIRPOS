"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { formatIDR, formatDate } from "@/lib/format";
import { TrendingUp, ShoppingBag, Wallet, PackageOpen } from "lucide-react";

export default function DashboardPage() {
  const supabase = createClient();
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [todayCash, setTodayCash] = useState(0);
  const [todayNonCash, setTodayNonCash] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [recent, setRecent] = useState<
    {
      id: string;
      code: string;
      total: number;
      status: string;
      created_at: string;
      profiles: { name: string | null }[] | null;
    }[]
  >([]);

  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    supabase
      .from("orders")
      .select("total, created_at")
      .eq("status", "paid")
      .gte("created_at", start.toISOString())
      .then(({ data }) => {
        const total = data?.reduce((a, o) => a + Number(o.total), 0) ?? 0;
        setTodayTotal(total);
      });

    supabase
      .from("orders")
      .select("id")
      .eq("status", "paid")
      .gte("created_at", start.toISOString())
      .then(({ data }) => {
        setTodayOrders(data?.length ?? 0);
      });

    supabase
      .from("payments")
      .select("method, amount, created_at")
      .gte("created_at", start.toISOString())
      .then(({ data }) => {
        const cash =
          data?.filter((p) => p.method === "cash").reduce((a, p) => a + Number(p.amount), 0) ?? 0;
        const nonCash =
          data?.filter((p) => p.method !== "cash").reduce((a, p) => a + Number(p.amount), 0) ?? 0;
        setTodayCash(cash);
        setTodayNonCash(nonCash);
      });

    supabase
      .from("products")
      .select("id, name, stock, low_stock, unit")
      .filter("stock", "lte", "low_stock")
      .then(({ data }) => {
        setLowStock(data?.length ?? 0);
      });

    supabase
      .from("orders")
      .select("id, code, total, status, created_at, cashier_id, profiles(name)")
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setRecent(data ?? []));
  }, [supabase]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Rekap ringkas hari ini</p>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon="total"
          label="Penjualan Hari Ini"
          value={formatIDR(todayTotal)}
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon="orders"
          label="Transaksi Hari Ini"
          value={String(todayOrders)}
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon="cash"
          label="Tunai"
          value={formatIDR(todayCash)}
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon="low"
          label="Stok Menipis"
          value={String(lowStock)}
          accent="bg-rose-50 text-rose-600"
        />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">Transaksi Terakhir</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
              <th className="pb-2">Kode</th>
              <th className="pb-2">Waktu</th>
              <th className="pb-2">Kasir</th>
              <th className="pb-2 text-right">Total</th>
              <th className="pb-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((o) => (
              <tr key={o.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2 font-mono text-xs text-slate-600">{o.code}</td>
                <td className="py-2 text-slate-500">{formatDate(o.created_at)}</td>
                <td className="py-2 text-slate-600">{o.profiles?.[0]?.name ?? "-"}</td>
                <td className="py-2 text-right font-medium">{formatIDR(o.total)}</td>
                <td className="py-2 text-right">
                  <span
                    className={
                      o.status === "paid"
                        ? "text-emerald-600"
                        : o.status === "cancelled"
                          ? "text-slate-400"
                          : "text-amber-600"
                    }
                  >
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent: string;
}) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    total: TrendingUp,
    orders: ShoppingBag,
    cash: Wallet,
    low: PackageOpen,
  };
  const Icon = icons[icon];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}