export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export interface Product {
  id: string;
  name: string;
  category_id: string | null;
  sku: string | null;
  barcode: string | null;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  low_stock: number;
  active: boolean;
  image_url: string | null;
}

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  cost: number;
  unit: string;
  qty: number;
  stock: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  note: string;
}

export interface Order {
  id: string;
  code: string;
  customer_id: string | null;
  cashier_id: string;
  status: "pending" | "paid" | "cancelled";
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  note: string;
  paid_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  method: "cash" | "qris" | "transfer";
  amount: number;
  reference: string;
}

export interface Settings {
  store_name: string;
  store_address: string;
  store_phone: string;
  receipt_footer: string;
  tax_rate: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface Shift {
  id: string;
  cashier_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  closing_balance: number | null;
  note: string;
}