-- ============================================================
-- Kasir POS - Skema Database v1
-- Jalankan di Supabase: Supabase Dashboard > SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Profil pengguna
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'kasir' check (role in ('admin','kasir')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- User pertama otomatis jadi admin, berikutnya jadi kasir
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _count int;
begin
  select count(*) into _count from public.profiles;
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    case when _count = 0 then 'admin' else 'kasir' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- Helper peran (dipakai oleh RLS policies di bawah)
-- ------------------------------------------------------------
create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.role from public.profiles p where p.id = auth.uid()) = 'admin', false)
$$;

-- ------------------------------------------------------------
-- Pengaturan toko
-- ------------------------------------------------------------
create table public.settings (
  key text primary key,
  value text not null default ''
);

insert into public.settings (key, value) values
  ('store_name', 'Toko Saya'),
  ('store_address', ''),
  ('store_phone', ''),
  ('receipt_footer', 'Terima kasih atas kunjungan Anda'),
  ('tax_rate', '0')
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- Kategori & produk
-- ------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  sku text unique,
  barcode text unique,
  price numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  stock numeric(12,2) not null default 0,
  unit text not null default 'pcs',
  low_stock numeric(12,2) not null default 5,
  active boolean not null default true,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_category on public.products(category_id);
create index idx_products_active on public.products(active);

-- ------------------------------------------------------------
-- Pelanggan & supplier
-- ------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (name, phone)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  address text not null default '',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Pembelian dari supplier
-- ------------------------------------------------------------
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  supplier_id uuid references public.suppliers(id) on delete set null,
  total numeric(12,2) not null default 0,
  note text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id),
  qty numeric(12,2) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index idx_purchases_supplier on public.purchases(supplier_id);
create index idx_purchase_items_product on public.purchase_items(product_id);

-- ------------------------------------------------------------
-- Shift kasir (buka/tutup kas)
-- ------------------------------------------------------------
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  cashier_id uuid not null references public.profiles(id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_balance numeric(12,2) not null default 0,
  closing_balance numeric(12,2),
  note text not null default ''
);

create index idx_shifts_cashier on public.shifts(cashier_id);

-- ------------------------------------------------------------
-- Order / transaksi
-- ------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  cashier_id uuid not null references public.profiles(id),
  shift_id uuid references public.shifts(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  note text not null default '',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  name text not null,
  price numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  qty numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method text not null check (method in ('cash','qris','transfer')),
  amount numeric(12,2) not null default 0,
  reference text not null default '',
  created_at timestamptz not null default now()
);

create index idx_orders_cashier on public.orders(cashier_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_created on public.orders(created_at desc);
create index idx_order_items_product on public.order_items(product_id);
create index idx_payments_order on public.payments(order_id);

-- ------------------------------------------------------------
-- Pergerakan stok
-- ------------------------------------------------------------
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  delta numeric(12,2) not null default 0,
  reason text not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create index idx_stock_movements_product on public.stock_movements(product_id);

-- Terapkan perubahan stok saat order dibayar / dibatalkan
create or replace function public.apply_order_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- dipicu hanya saat order berpindah ke/ dari status paid
  if NEW.status = 'paid' and (OLD.status is distinct from 'paid') then
    update public.products p
    set stock = stock - oi.qty, updated_at = now()
    from public.order_items oi
    where oi.order_id = NEW.id and oi.product_id = p.id;

    insert into public.stock_movements (product_id, delta, reason, ref_id)
    select oi.product_id, -oi.qty, 'sale', NEW.id
    from public.order_items oi
    where oi.order_id = NEW.id;
  end if;

  if NEW.status in ('pending','cancelled') and OLD.status = 'paid' then
    update public.products p
    set stock = stock + oi.qty, updated_at = now()
    from public.order_items oi
    where oi.order_id = NEW.id and oi.product_id = p.id;

    insert into public.stock_movements (product_id, delta, reason, ref_id)
    select oi.product_id, oi.qty, 'void:' || NEW.status, NEW.id
    from public.order_items oi
    where oi.order_id = NEW.id;
  end if;

  return new;
end;
$$;

create trigger on_order_status_change
  after update of status on public.orders
  for each row execute procedure public.apply_order_stock();

-- Pembelian menambah stok
create or replace function public.apply_purchase_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products p
  set stock = stock + NEW.qty,
      cost = case when NEW.unit_cost > 0 then NEW.unit_cost else p.cost end,
      updated_at = now()
  where p.id = NEW.product_id;

  insert into public.stock_movements (product_id, delta, reason, ref_id)
  values (NEW.product_id, NEW.qty, 'purchase', NEW.purchase_id);

  return new;
end;
$$;

create trigger on_purchase_item_insert
  after insert on public.purchase_items
  for each row execute procedure public.apply_purchase_stock();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.shifts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.stock_movements enable row level security;

create policy "profil: baca milik sendiri / admin baca semua"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "profil: admin edit semua, user edit sendiri"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

create policy "settings baca semua anggota"
  on public.settings for select
  using (auth.role() = 'authenticated');

create policy "settings hanya admin"
  on public.settings for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "kategori baca semua anggota"
  on public.categories for select
  using (auth.role() = 'authenticated');

create policy "kategori tulis admin"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "produk baca semua anggota"
  on public.products for select
  using (auth.role() = 'authenticated');

create policy "produk tulis admin"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "pelanggan baca semua anggota"
  on public.customers for select
  using (auth.role() = 'authenticated');

create policy "pelanggan tulis admin"
  on public.customers for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "pelanggan dibuat kasir saat checkout"
  on public.customers for insert
  with check (auth.role() = 'authenticated');

create policy "supplier baca semua anggota"
  on public.suppliers for select
  using (auth.role() = 'authenticated');

create policy "supplier tulis admin"
  on public.suppliers for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "pembelian baca semua anggota"
  on public.purchases for select
  using (auth.role() = 'authenticated');

create policy "pembelian tulis admin"
  on public.purchases for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "item pembelian baca semua anggota"
  on public.purchase_items for select
  using (auth.role() = 'authenticated');

create policy "item pembelian tulis admin"
  on public.purchase_items for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "shift baca semua anggota"
  on public.shifts for select
  using (auth.role() = 'authenticated');

create policy "shift tulis semua anggota"
  on public.shifts for all
  using (auth.uid() = cashier_id or public.is_admin())
  with check (auth.uid() = cashier_id or public.is_admin());

create policy "order baca semua anggota"
  on public.orders for select
  using (auth.role() = 'authenticated');

create policy "order dibuat kasir, dibatalkan kasir/admin"
  on public.orders for insert
  with check (auth.uid() = cashier_id or public.is_admin());

create policy "order update kasir/admin"
  on public.orders for update
  using (auth.uid() = cashier_id or public.is_admin());

create policy "item order baca semua anggota"
  on public.order_items for select
  using (auth.role() = 'authenticated');

create policy "item order tulis kasir"
  on public.order_items for insert
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and (auth.uid() = o.cashier_id or public.is_admin())
  ));

create policy "pembayaran baca semua anggota"
  on public.payments for select
  using (auth.role() = 'authenticated');

create policy "pembayaran tulis kasir"
  on public.payments for insert
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and (auth.uid() = o.cashier_id or public.is_admin())
  ));

create policy "stok baca semua anggota"
  on public.stock_movements for select
  using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- RPC: buat akun staff (admin) — sekaligus user auth + profil
-- ------------------------------------------------------------
create or replace function public.create_employee(p_email text, p_password text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang bisa membuat akun';
  end if;

  _uid := extensions.uuid_generate_v4();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at, last_sign_in_at
  ) values (
    '00000000-0000-0000-0000-000000000000'::uuid,
    _uid, 'authenticated', 'authenticated', p_email,
    crypt(p_password, gen_salt('bf')),
    now(), '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p_name),
    now(), now(), now()
  );

  insert into public.profiles (id, email, name, role)
  values (_uid, p_email, p_name, 'kasir');

  return _uid;
end;
$$;

revoke all on function public.create_employee(text, text, text) from public;
grant execute on function public.create_employee(text, text, text) to authenticated;