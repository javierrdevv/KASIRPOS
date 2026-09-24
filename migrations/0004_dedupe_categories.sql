-- Pembersih kategori dobel + unique constraint
-- Jalankan di Supabase SQL Editor (sekali saja).

-- 1. Arahkan produk dari kategori duplikat ke kategori tertua per nama
update public.products pr
set category_id = keep.id
from (
  select c.name,
         (array_agg(c.id order by c.created_at asc, c.id asc))[1] as id,
         array_agg(c.id order by c.created_at asc, c.id asc) as all_ids
  from public.categories c
  group by c.name
) keep
where pr.category_id = any (keep.all_ids)
  and pr.category_id <> keep.id;

-- 2. Hapus kategori duplikat (sisakan 1 per nama, yang tertua)
delete from public.categories c
where exists (
  select 1 from public.categories c2
  where c2.name = c.name
    and (c2.created_at < c.created_at
      or (c2.created_at = c.created_at and c2.id < c.id))
);

-- 3. Cegah dobel di masa depan
alter table public.categories
  add constraint categories_name_key unique (name);