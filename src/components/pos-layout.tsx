"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import {
  Store,
  LayoutGrid,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Users,
  BarChart3,
  LogOut,
  Receipt,
  ShieldCheck,
} from "lucide-react";

type Role = "admin" | "kasir";

const NAV_ADMIN = [
  { href: "/", label: "POS", icon: ShoppingCart },
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/products", label: "Produk", icon: Package },
  { href: "/categories", label: "Kategori", icon: Boxes },
  { href: "/stock", label: "Stok", icon: BarChart3 },
  { href: "/purchases", label: "Pembelian", icon: Truck },
  { href: "/suppliers", label: "Supplier", icon: Truck },
  { href: "/customers", label: "Pelanggan", icon: Users },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
  { href: "/staff", label: "Staf", icon: Users },
  { href: "/settings", label: "Pengaturan", icon: Store },
];

const NAV_COMMON = [
  { href: "/", label: "POS", icon: ShoppingCart },
  { href: "/history", label: "Riwayat", icon: Receipt },
  { href: "/customers", label: "Pelanggan", icon: Users },
];

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150",
        active
          ? "bg-slate-800/70 text-emerald-100"
          : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
      )}
    >
      <span
        className={cn(
          "absolute left-0 h-5 w-1 rounded-full bg-emerald-400 transition-opacity",
          active ? "opacity-100" : "opacity-0"
        )}
      />
      <Icon className={cn("h-[18px] w-[18px]", active && "text-emerald-300")} />
      {label}
    </Link>
  );
}

export function PosLayout({
  children,
  role,
  name,
}: {
  children: React.ReactNode;
  role: Role;
  name: string;
}) {
  const router = useRouter();
  const [userName] = useState(name);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const items = role === "admin" ? NAV_ADMIN : NAV_COMMON;

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-950">
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-700/40 bg-slate-800 text-emerald-300">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight text-slate-100">
              Kasir POS
            </p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Kafe · Resto · Toko
            </p>
          </div>
        </div>

        <div className="mx-5 mb-4 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {items.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </nav>

        <div className="border-t border-slate-800/60 px-3 pb-4 pt-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600/90 text-xs font-bold text-white">
              {(userName || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-100">
                {userName || "Pengguna"}
              </p>
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <ShieldCheck className="h-3 w-3" />
                {role === "admin" ? "Admin" : "Kasir"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </aside>
      <main className="ml-64 flex-1">{children}</main>
    </div>
  );
}