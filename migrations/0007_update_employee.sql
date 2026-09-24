-- update_employee: admin dapat mengubah nama, email, kata sandi, dan peran akun.
-- Jalankan sekali di Supabase SQL Editor.

create or replace function public.update_employee(
  p_id uuid,
  p_name text default null,
  p_email text default null,
  p_password text default null,
  p_role text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang bisa mengubah akun.';
  end if;

  if not exists (select 1 from public.profiles where id = p_id) then
    raise exception 'Akun tidak ditemukan.';
  end if;

  if p_role is not null and p_role not in ('admin', 'kasir') then
    raise exception 'Peran tidak valid: %', p_role;
  end if;

  -- Pengaman: jangan sampai tidak ada admin aktif tersisa
  if p_role = 'kasir'
     and exists (select 1 from public.profiles where id = p_id and role = 'admin') then
    if p_id = auth.uid() then
      raise exception 'Tidak bisa menurunkan peran akun sendiri.';
    end if;
    if (select count(*) from public.profiles where role = 'admin' and active) <= 1 then
      raise exception 'Minimal harus ada satu admin aktif.';
    end if;
  end if;

  update auth.users
     set email = coalesce(p_email, email),
         encrypted_password = case
           when p_password is not null and length(p_password) > 0
             then extensions.crypt(p_password, extensions.gen_salt('bf'))
           else encrypted_password
         end,
         email_confirmed_at = case
           when p_email is not null and p_email <> email then now()
           else email_confirmed_at
         end,
         updated_at = now()
   where id = p_id;

  update public.profiles
     set name = coalesce(p_name, name),
         email = coalesce(p_email, email),
         role = coalesce(p_role, role)
   where id = p_id;
end;
$$;

revoke all on function public.update_employee(uuid, text, text, text, text) from public;
grant execute on function public.update_employee(uuid, text, text, text, text) to authenticated;

-- Muat ulang schema cache PostgREST agar RPC langsung dikenali
notify pgrst, 'reload schema';