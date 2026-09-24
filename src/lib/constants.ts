export const CART_STORAGE_KEY = "kasirpos_cart";
export const SHIFT_STORAGE_KEY = "kasirpos_shift";
export const PRINTER_STORAGE_KEY = "kasirpos_printer";

export type PaymentMethod = "cash" | "qris" | "transfer";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Tunai",
  qris: "QRIS / E-Wallet",
  transfer: "Transfer Bank",
};

export function todayCode(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

function counterKey(): string {
  return `kasirpos_counter_${todayCode()}`;
}

export function nextOrderCode(): string {
  const snap = typeof window !== "undefined" ? window : undefined;
  const cur = snap ? Number(snap.sessionStorage.getItem(counterKey()) || "0") + 1 : 1;
  if (snap) snap.sessionStorage.setItem(counterKey(), String(cur));
  return `INV-${todayCode()}-${String(cur).padStart(4, "0")}`;
}

export function nextPurchaseCode(): string {
  const snap = typeof window !== "undefined" ? window : undefined;
  const cur = snap ? Number(snap.sessionStorage.getItem(counterKey()) || "0") + 1 : 1;
  if (snap) snap.sessionStorage.setItem(counterKey(), String(cur));
  return `PBL-${todayCode()}-${String(cur).padStart(4, "0")}`;
}

export function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}