-- Seed data: kategori + produk dummy (kopi, teh, makanan, camilan) + foto
-- Jalankan di Supabase SQL Editor. Aman diulang (idempotent).
-- Produk yang sudah ada akan diperbarui gambar/kolomnya berdasar SKU.

insert into public.categories (name, sort_order) values
 ('Kopi', 1),
 ('Non-Kopi', 2),
 ('Makanan', 3),
 ('Camilan', 4)
on conflict do nothing;

insert into public.products (name, category_id, sku, barcode, price, cost, stock, unit, low_stock, image_url)
select p.name, c.id, p.sku, p.barcode, p.price, p.cost, p.stock, p.unit, p.low_stock, p.image_url
from (
 values
 ('Espresso', 'Kopi', 'KOP-001', '8990001', 18000, 10000, 200, 'cup', 30,
  'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&h=400&fit=crop&auto=format'),
 ('Cappuccino', 'Kopi', 'KOP-002', '8990002', 25000, 14000, 150, 'cup', 30,
  'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=400&fit=crop&auto=format'),
 ('Americano', 'Kopi', 'KOP-003', '8990003', 20000, 11000, 180, 'cup', 30,
  'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop&auto=format'),
 ('Cafe Latte', 'Kopi', 'KOP-004', '8990004', 26000, 15000, 140, 'cup', 30,
  'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&h=400&fit=crop&auto=format'),
 ('Caramel Macchiato', 'Kopi', 'KOP-005', '8990005', 32000, 18000, 100, 'cup', 30,
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop&auto=format'),
 ('Kopi Susu Gula Aren', 'Kopi', 'KOP-006', '8990006', 22000, 12000, 200, 'cup', 30,
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop&auto=format'),
 ('Teh Tarik', 'Non-Kopi', 'TH-001', '8991001', 15000, 7000, 120, 'cup', 20,
  'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop&auto=format'),
 ('Matcha Latte', 'Non-Kopi', 'TH-002', '8991002', 30000, 17000, 90, 'cup', 20,
  'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400&h=400&fit=crop&auto=format'),
 ('Chocolate', 'Non-Kopi', 'TH-003', '8991003', 25000, 14000, 110, 'cup', 20,
  'https://images.unsplash.com/photo-1511381939415-e44015466834?w=400&h=400&fit=crop&auto=format'),
 ('Lemon Tea', 'Non-Kopi', 'TH-004', '8991004', 18000, 8000, 100, 'gelas', 20,
  'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=400&h=400&fit=crop&auto=format'),
 ('Air Mineral', 'Non-Kopi', 'TH-005', '8991005', 5000, 3000, 400, 'botol', 50,
  'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop&auto=format'),
 ('Nasi Goreng', 'Makanan', 'MKN-001', '8992001', 28000, 15000, 50, 'porsi', 10,
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=400&fit=crop&auto=format'),
 ('Mie Goreng', 'Makanan', 'MKN-002', '8992002', 25000, 13000, 45, 'porsi', 10,
  'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=400&fit=crop&auto=format'),
 ('Kentang Goreng', 'Makanan', 'MKN-003', '8992003', 18000, 9000, 60, 'porsi', 15,
  'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=400&fit=crop&auto=format'),
 ('Roti Bakar Coklat', 'Makanan', 'MKN-004', '8992004', 15000, 7000, 35, 'porsi', 10,
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop&auto=format'),
 ('Pisang Goreng', 'Camilan', 'CNL-001', '8993001', 10000, 5000, 40, 'porsi', 10,
  'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=400&fit=crop&auto=format'),
 ('Tahu Crispy', 'Camilan', 'CNL-002', '8993002', 12000, 6000, 40, 'porsi', 10,
  'https://images.unsplash.com/photo-1541529086526-db283c563270?w=400&h=400&fit=crop&auto=format'),
 ('Keripik Singkong', 'Camilan', 'CNL-003', '8993003', 8000, 4000, 70, 'pcs', 15,
  'https://images.unsplash.com/photo-1600959907709-e125f05f74d6?w=400&h=400&fit=crop&auto=format')
) as p(name, cat, sku, barcode, price, cost, stock, unit, low_stock, image_url)
join public.categories c on c.name = p.cat
where not exists (select 1 from public.products x where x.sku = p.sku);

-- Perbarui gambar untuk produk yang sudah ada (jika seed sebelumnya tanpa gambar)
update public.products pr set image_url = u.image_url
from (
 values
 ('KOP-001', 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&h=400&fit=crop&auto=format'),
 ('KOP-002', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=400&fit=crop&auto=format'),
 ('KOP-003', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop&auto=format'),
 ('KOP-004', 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&h=400&fit=crop&auto=format'),
 ('KOP-005', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop&auto=format'),
 ('KOP-006', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop&auto=format'),
 ('TH-001', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop&auto=format'),
 ('TH-002', 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400&h=400&fit=crop&auto=format'),
 ('TH-003', 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=400&h=400&fit=crop&auto=format'),
 ('TH-004', 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=400&h=400&fit=crop&auto=format'),
 ('TH-005', 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop&auto=format'),
 ('MKN-001', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=400&fit=crop&auto=format'),
 ('MKN-002', 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=400&fit=crop&auto=format'),
 ('MKN-003', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=400&fit=crop&auto=format'),
 ('MKN-004', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop&auto=format'),
 ('CNL-001', 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=400&fit=crop&auto=format'),
 ('CNL-002', 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=400&h=400&fit=crop&auto=format'),
 ('CNL-003', 'https://images.unsplash.com/photo-1600959907709-e125f05f74d6?w=400&h=400&fit=crop&auto=format')
) as u(sku, image_url)
where pr.sku = u.sku;