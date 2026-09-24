import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-800",
    pending: "bg-warm-100 text-warm-700",
    cancelled: "bg-slate-100 text-slate-500",
    active: "bg-emerald-100 text-emerald-800",
    inactive: "bg-slate-100 text-slate-500",
    open: "bg-emerald-100 text-emerald-800",
    closed: "bg-slate-100 text-slate-500",
  };
  const labels: Record<string, string> = {
    paid: "Lunas",
    pending: "Belum Bayar",
    cancelled: "Batal",
    active: "Aktif",
    inactive: "Nonaktif",
    open: "Buka",
    closed: "Tutup",
  };
  return <Badge className={styles[status]}>{labels[status] ?? status}</Badge>;
}