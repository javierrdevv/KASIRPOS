"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import {
  formatIDR,
  nextOrderCode,
  PAYMENT_LABELS,
  type PaymentMethod,
  CART_STORAGE_KEY,
} from "@/lib/constants";
import type { CartItem, Category, Customer, Product, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

type OrdersWithItems = {
  id: string;
  code: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  change?: number;
  paidCash?: number;
  items: CartItem[];
  cashier?: string;
};
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { renderReceipt, printThermal, type ReceiptOrder } from "@/lib/receipt";
import { useRouter } from "next/navigation";
import {
  Search,
  Trash2,
  Minus,
  Plus,
  ShoppingCart,
  UserRound,
  Printer,
  X,
  Loader2,
  CheckCircle2,
  BadgePercent,
  Coffee,
} from "lucide-react";

export default function PosPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [qrReference, setQrReference] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [lastOrder, setLastOrder] = useState<OrdersWithItems | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const userNameRef = useRef<string>("");
  const userIdRef = useRef<string>("");

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        userNameRef.current = data.user?.user_metadata?.name ?? "";
        userIdRef.current = data.user?.id ?? "";
      });
  }, []);

  const load = useCallback(async () => {
    const [catRes, prodRes, settingRes] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order").order("name"),
      supabase.from("products").select("*").eq("active", true).order("name"),
      supabase.from("settings").select("*"),
    ]);
    if (catRes.error) console.error(catRes.error);
    if (prodRes.error) console.error(prodRes.error);
    if (!catRes.error) setCategories(catRes.data ?? []);
    if (!prodRes.error) setProducts(prodRes.data ?? []);
    if (!settingRes.error && settingRes.data) {
      const s: Settings = {
        store_name: "",
        store_address: "",
        store_phone: "",
        receipt_footer: "",
        tax_rate: 0,
      };
      for (const row of settingRes.data) {
        (s as unknown as Record<string, string | number>)[row.key] =
          row.key === "tax_rate" ? Number(row.value) : row.value;
      }
      setSettings(s);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch {}
    }
  }, [load]);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const catOk = activeCat === "all" || p.category_id === activeCat;
      const q = search.toLowerCase();
      const searchOk =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.barcode?.toLowerCase() ?? "").includes(q);
      return catOk && searchOk;
    });
  }, [products, activeCat, search]);

  const subtotal = useMemo(
    () => cart.reduce((acc, i) => acc + i.price * i.qty, 0),
    [cart]
  );
  const tax = settings ? (subtotal - discount) * (settings.tax_rate / 100) : 0;
  const total = subtotal - discount + tax;
  const itemCount = cart.reduce((acc, i) => acc + i.qty, 0);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        const stockLeft = product.stock - existing.qty;
        if (stockLeft <= 0) return prev;
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      if (product.stock <= 0) return prev;
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          cost: product.cost,
          unit: product.unit,
          qty: 1,
          stock: product.stock,
        },
      ];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product_id === productId
            ? { ...i, qty: Math.min(Math.max(i.qty + delta, 0), i.stock) }
            : i
        )
        .filter((i) => i.qty > 0)
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  }

  function clearCart() {
    setCart([]);
    setCustomer(null);
    setDiscount(0);
    setOrderNote("");
  }

  const handleBarcode = useCallback(() => {
    if (!searchRef.current) return;
    const value = searchRef.current.value.trim();
    if (!value) return;
    const product = products.find(
      (p) =>
        p.barcode?.toLowerCase() === value.toLowerCase() ||
        p.sku?.toLowerCase() === value.toLowerCase()
    );
    if (product) {
      addToCart(product);
      searchRef.current.value = "";
      searchRef.current.focus();
    }
  }, [products, searchRef]); // eslint-disable-line react-hooks/exhaustive-deps

  async function openPay() {
    if (cart.length === 0) return;
    try {
      const { data } = await supabase.from("customers").select("*").limit(20);
      setCustomers(data ?? []);
    } catch {}
    setShowCart(false);
    setShowPayModal(true);
  }

  async function payNow() {
    if (cart.length === 0 || !settings) return;
    setPaying(true);
    try {
      const code = nextOrderCode();

      const customerId: string | null = customer?.id ?? null;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          code,
          customer_id: customerId,
          cashier_id: userIdRef.current,
          status: "paid",
          subtotal,
          discount,
          tax,
          total,
          note: orderNote,
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (orderError) throw new Error(orderError.message);

      await supabase.from("order_items").insert(
        cart.map((i) => ({
          order_id: order.id,
          product_id: i.product_id,
          name: i.name,
          price: i.price,
          cost: i.cost,
          qty: i.qty,
          discount: 0,
        }))
      );

      const change = payMethod === "cash" ? Math.max(Number(cashReceived || 0) - total, 0) : 0;
      await supabase.from("payments").insert({
        order_id: order.id,
        method: payMethod,
        amount: total,
        reference: payMethod === "qris" || payMethod === "transfer" ? qrReference : "",
      });

      setLastOrder({
        ...order,
        items: cart,
        cashier: userNameRef.current,
        change,
        paidCash: payMethod === "cash" ? Number(cashReceived || 0) : 0,
        paidAt: new Date().toISOString(),
      });
    setShowPayModal(false);
    setShowCart(false);
    setShowReceiptModal(true);
      if (settings) {
        const receipt = renderReceipt(
          {
            code: order.code,
            createdAt: new Date().toLocaleString("id-ID"),
            items: cart.map((i) => ({
              name: i.name,
              price: i.price,
              qty: i.qty,
              unit: i.unit,
            })),
            subtotal,
            discount,
            tax,
            total,
            change,
            paidCash: payMethod === "cash" ? Number(cashReceived || 0) : 0,
            method: payMethod,
            customer: customer?.name,
            cashier: userNameRef.current,
          },
          settings
        );
        printThermal(receipt);
      }
    } catch (e) {
      alert((e as Error).message ?? "Terjadi kesalahan");
      setPaying(false);
    }
  }

  // global barcode input focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key.length === 1) {
        searchRef.current?.focus();
        onKey; // keep typing
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cashChange =
    payMethod === "cash" ? Math.max(Number(cashReceived || 0) - total, 0) : 0;

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* left: products */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari produk / scan barcode…"
                className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <span className="hidden text-xs text-slate-400 md:block">
              {filtered.length} produk
            </span>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <CategoryPill
              active={activeCat === "all"}
              onClick={() => setActiveCat("all")}
              label="Semua"
            />
            {categories.map((c) => (
              <CategoryPill
                key={c.id}
                active={activeCat === c.id}
                onClick={() => setActiveCat(c.id)}
                label={c.name}
              />
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 content-start grid-cols-2 gap-3 overflow-y-auto p-3 sm:grid-cols-3 sm:p-5 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={() => addToCart(p)} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-20 text-center text-sm text-slate-400">
              Tidak ada produk ditemukan
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400">Total</p>
            <p className="truncate text-lg font-bold text-emerald-600">
              {formatIDR(total)}
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCart(true)}
            disabled={cart.length === 0}
          >
            <ShoppingCart className="h-4 w-4" />
            Keranjang ({itemCount})
          </Button>
        </div>
      </div>

      {/* right: cart */}
      {showCart && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setShowCart(false)}
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-full max-w-sm shrink-0 flex-col border-l border-slate-200 bg-white transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
          showCart ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-slate-500" />
            <span className="text-sm font-semibold">
              Keranjang{" "}
              <span className="text-slate-400">({itemCount})</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Kosongkan
              </button>
            )}
            <button
              onClick={() => setShowCart(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
              aria-label="Tutup keranjang"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-slate-400">
              <ShoppingCart className="h-10 w-10 text-slate-200" />
              <p>Klik produk untuk menambah</p>
              <p className="text-xs text-slate-300">atau scan barcode</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {cart.map((i) => (
                <div
                  key={i.product_id}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.name}</p>
                    <p className="text-sm text-slate-500">
                      {formatIDR(i.price)}
                      <span className="text-slate-300"> × {i.qty}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(i.product_id, -1)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{i.qty}</span>
                    <button
                      onClick={() => updateQty(i.product_id, +1)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="w-20 text-right text-sm font-semibold">
                    {formatIDR(i.price * i.qty)}
                  </div>
                  <button
                    onClick={() => removeItem(i.product_id)}
                    className="text-slate-300 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-4 py-3">
          <button
            onClick={() => setShowCustomerModal(true)}
            className="mb-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-500 hover:border-emerald-400 hover:text-emerald-600"
          >
            <UserRound className="h-4 w-4" />
            {customer ? customer.name : "Pilih pelanggan"}
          </button>

          <div className="flex flex-col gap-1.5">
            <SummaryRow label="Subtotal" value={formatIDR(subtotal)} />
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm text-slate-500">Diskon</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Math.max(Number(e.target.value), 0))}
                className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-sm outline-none focus:border-emerald-500"
              />
            </div>
            {tax > 0 && (
              <SummaryRow label={`PPN (${settings?.tax_rate}%)`} value={formatIDR(tax)} />
            )}
            <div className="my-1 flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
              <span className="text-base font-bold">Total</span>
              <span className="text-xl font-bold text-emerald-600">{formatIDR(total)}</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={clearCart}>
              Batal
            </Button>
            <Button variant="primary" onClick={openPay} disabled={cart.length === 0}>
              Bayar
            </Button>
          </div>
        </div>
      </div>

      {/* customer modal */}
      <Modal
        open={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        title="Pilih Pelanggan"
      >
        <CustomerPicker
          customers={customers}
          onPick={(c) => {
            setCustomer(c);
            setShowCustomerModal(false);
          }}
          onClear={() => {
            setCustomer(null);
            setShowCustomerModal(false);
          }}
        />
      </Modal>

      {/* payment modal */}
      <Modal
        open={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Pembayaran"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowPayModal(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={payNow} disabled={paying}>
              {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Selesaikan Transaksi"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Total yang harus dibayar</p>
            <p className="text-3xl font-bold text-emerald-600">{formatIDR(total)}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setPayMethod(m)}
                className={cn(
                  "rounded-lg border px-2 py-3 text-center text-xs font-medium transition-colors",
                  payMethod === m
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                )}
              >
                {PAYMENT_LABELS[m]}
              </button>
            ))}
          </div>

          {payMethod === "cash" && (
            <Field label="Uang diterima" hint="Untuk menghitung kembalian">
              <Input
                type="number"
                inputMode="numeric"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </Field>
          )}
          {payMethod === "cash" && Number(cashReceived) > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
              <span className="text-sm text-emerald-700">Kembalian</span>
              <span className="text-lg font-bold text-emerald-700">
                {formatIDR(cashChange)}
              </span>
            </div>
          )}
          {(payMethod === "qris" || payMethod === "transfer") && (
            <Field label="Referensi / nama" hint="Nomor transaksi atau nama pengirim">
              <Input
                value={qrReference}
                onChange={(e) => setQrReference(e.target.value)}
                placeholder="mis. QRIS-8471 / BCA 123456"
              />
            </Field>
          )}

          <Field label="Catatan">
            <Textarea
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="Catatan untuk struk (opsional)"
              rows={2}
            />
          </Field>
        </div>
      </Modal>

      {/* receipt modal */}
      {lastOrder && (
        <Modal
          open={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            clearCart();
            router.refresh();
          }}
          title="Transaksi Berhasil"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-medium">Pembayaran diterima</p>
            </div>
            <div className="w-full max-w-xs rounded-lg border border-slate-100 bg-white p-4 font-mono text-xs shadow-sm">
              <div className="text-center">
                <p className="font-bold">{settings?.store_name}</p>
                {settings?.store_address && <p>{settings.store_address}</p>}
                <p className="mt-1">No: {lastOrder.code}</p>
                <p>{new Date().toLocaleString("id-ID")}</p>
              </div>
              <div className="my-2 border-t border-dashed border-slate-200" />
              {lastOrder.items.map((i) => (
                <div key={i.product_id} className="mb-1">
                  <p>{i.name}</p>
                  <p className="flex justify-between">
                    <span>
                      {i.qty} {i.unit} x {formatIDR(i.price)}
                    </span>
                    <span>{formatIDR(i.price * i.qty)}</span>
                  </p>
                </div>
              ))}
              <div className="my-2 border-t border-dashed border-slate-200" />
              <div className="flex justify-between"><span>Subtotal</span><span>{formatIDR(lastOrder.subtotal)}</span></div>
              {lastOrder.discount > 0 && (
                <div className="flex justify-between"><span>Diskon</span><span>-{formatIDR(lastOrder.discount)}</span></div>
              )}
              {lastOrder.tax > 0 && (
                <div className="flex justify-between"><span>Pajak</span><span>{formatIDR(lastOrder.tax)}</span></div>
              )}
              <div className="flex justify-between font-bold"><span>Total</span><span>{formatIDR(lastOrder.total)}</span></div>
              {payMethod === "cash" && Number(cashReceived) > 0 && (
                <>
                  <div className="flex justify-between"><span>Tunai</span><span>{formatIDR(lastOrder.paidCash ?? 0)}</span></div>
                  <div className="flex justify-between"><span>Kembali</span><span>{formatIDR(lastOrder.change ?? 0)}</span></div>
                </>
              )}
              {settings?.receipt_footer && (
                <p className="mt-2 text-center">{settings.receipt_footer}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => printThermal(renderReceipt({
                code: lastOrder.code,
                createdAt: new Date().toLocaleString("id-ID"),
                items: lastOrder.items.map((i) => ({
                  name: i.name,
                  price: i.price,
                  qty: i.qty,
                  unit: i.unit,
                })),
                subtotal: lastOrder.subtotal,
                discount: lastOrder.discount,
                tax: lastOrder.tax,
                total: lastOrder.total,
                change: lastOrder.change,
                paidCash: lastOrder.paidCash,
                method: payMethod,
                customer: customer?.name,
                cashier: userNameRef.current,
              }, settings!))} variant="primary">
                <Printer className="h-4 w-4" /> Cetak Ulang
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReceiptModal(false);
                  clearCart();
                  router.refresh();
                }}
              >
                Selesai
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CategoryPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      )}
    >
      {label}
    </button>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const low = product.stock <= product.low_stock && product.stock > 0;
  return (
    <button
      onClick={onAdd}
      className={cn(
        "flex flex-col rounded-xl border bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
        product.stock <= 0
          ? "border-slate-100 opacity-60"
          : "border-slate-200 hover:border-emerald-300"
      )}
    >
<div className="mb-2 flex h-20 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-50">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="h-20 w-full object-cover"
            />
) : (
            <Coffee className="h-7 w-7 text-slate-300" />
          )}
        </div>
      <p className="line-clamp-2 text-sm font-medium leading-tight">{product.name}</p>
      <p className="mt-1 text-sm font-bold text-emerald-600">{formatIDR(product.price)}</p>
      <p className={cn("text-xs", low ? "text-amber-600" : "text-slate-400")}>
        {product.stock <= 0
          ? "Stok habis"
          : `Stok: ${product.stock} ${product.unit}`}
      </p>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function CustomerPicker({
  customers,
  onPick,
  onClear,
}: {
  customers: Customer[];
  onPick: (c: Customer) => void;
  onClear: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function createCustomer() {
    if (!name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("customers")
      .insert({ name: name.trim(), phone: phone.trim(), note: "" })
      .select()
      .single();
    setSaving(false);
    if (!error && data) onPick(data);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Field label="Nama">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama pelanggan" />
        </Field>
        <Field label="No. HP">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx" />
        </Field>
        <Button variant="primary" onClick={createCustomer} disabled={saving || !name.trim()}>
          Buat pelanggan baru
        </Button>
      </div>
      {customers.length > 0 && (
        <>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Pelanggan tersimpan
          </p>
          <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => onPick(c)}
                className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-left hover:border-emerald-300"
              >
                <UserRound className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.phone || "-"}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      <Button variant="ghost" onClick={onClear}>
        Tanpa pelanggan (walk-in)
      </Button>
    </div>
  );
}