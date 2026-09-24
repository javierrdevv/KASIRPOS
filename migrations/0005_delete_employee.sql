-- Hapus akun karyawan permanen (auth.users + profiles).
-- Jalankan sekali di Supabase SQL Editor.

create or replace function public.delete_employee(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang bisa menghapus akun.';
  end if;
  if p_id = auth.uid() then
    raise exception 'Tidak bisa menghapus akun sendiri.';
  end if;
  if not exists (select 1 from public.profiles where id = p_id) then
    raise exception 'Akun tidak ditemukan.';
  end if;

  -- Alihkan riwayat ke admin yang menghapus agar FK tidak memblokir
  update public.orders set cashier_id = auth.uid() where cashier_id = p_id;
  update public.shifts set cashier_id = auth.uid() where cashier_id = p_id;
  update public.purchases set created_by = null where created_by = p_id;

  delete from auth.users where id = p_id;  -- cascade ke public.profiles
end;
$$;

revoke all on function public.delete_employee(uuid) from public;
grant execute on function public.delete_employee(uuid) to authenticated;