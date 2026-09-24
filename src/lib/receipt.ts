import type { Settings } from "@/lib/types";
import { formatIDR } from "@/lib/format";

export type ReceiptOrder = {
  code: string;
  createdAt: string;
  items: { name: string; price: number; qty: number; unit: string }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  change?: number;
  paidCash?: number;
  method: string;
  customer?: string;
  cashier?: string;
};

function dotted(a: string, b: string, width = 32): string {
  const fill = Math.max(1, width - a.length - b.length);
  return a + " ".repeat(fill) + b;
}

export function renderReceipt(order: ReceiptOrder, settings: Settings): string {
  const L: string[] = [];
  const w = 42;

  const center = (s: string) => {
    const pad = Math.max(0, Math.floor((w - s.length) / 2));
    return " ".repeat(pad) + s;
  };
  const line = () => L.push("-".repeat(w));

  line();
  L.push(center(settings.store_name || "TOKO"));
  if (settings.store_address) L.push(center(settings.store_address));
  if (settings.store_phone) L.push(center(`Telp: ${settings.store_phone}`));
  line();
  L.push(`No: ${order.code}`);
  L.push(`Tgl: ${order.createdAt}`);
  if (order.cashier) L.push(`Kasir: ${order.cashier}`);
  if (order.customer) L.push(`Plg: ${order.customer}`);
  line();

  for (const it of order.items) {
    L.push(it.name);
    L.push(`  ${it.qty} ${it.unit || ""} x ${formatIDR(it.price)} ${formatIDR(it.price * it.qty)}`.trimEnd());
  }
  line();

  L.push(dotted("Subtotal", formatIDR(order.subtotal)));
  if (order.discount > 0) L.push(dotted("Diskon", `-${formatIDR(order.discount)}`));
  if (order.tax > 0) L.push(dotted("Pajak", formatIDR(order.tax)));
  L.push(dotted("TOTAL", formatIDR(order.total)));

  if (order.method === "cash") {
    L.push("");
    L.push(dotted("Tunai", formatIDR(order.paidCash ?? 0)));
    L.push(dotted("Kembali", formatIDR(order.change ?? 0)));
  } else {
    L.push(`Bayar: ${order.method.toUpperCase()}`);
  }
  if (settings.receipt_footer) {
    line();
    L.push(center(settings.receipt_footer));
  }
  line();
  return L.join("\n");
}

export function printThermal(text: string, copies = 1) {
  const win = window.open("", "_blank", "width=400,height=600");
  if (!win) return;
  win.document.write(
    `<html><head><title>Struk</title><style>
      @page { size: 80mm auto; margin: 0; }
      body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 4mm; }
      pre { margin: 0; white-space: pre-wrap; }
    </style></head><body>${`<pre>${text}</pre>`.repeat(copies)}<script>window.onload=function(){window.print();window.close();}<\/script></body></html>`
  );
  win.document.close();
}