-- ============================================================
-- Kasir POS - Bagian 2 (jalankan SEKALI saja)
-- Tambahan: RPC buat akun staff + perbaiki profil hilang
-- ============================================================

-- 1) RPC: buat akun staff (admin) — user auth + profil sekaligus
create or replace function public.create_employee(p_email text, p_password text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
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
 extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p_name),
    now(), now(), now()
  );

 insert into public.profiles (id, email, name, role)
 values (_uid, p_email, p_name, 'kasir')
 on conflict (id) do nothing;

  return _uid;
end;
$$;

revoke all on function public.create_employee(text, text, text) from public;
grant execute on function public.create_employee(text, text, text) to authenticated;

-- 2) Isi profil untuk user yang sudah ada tapi belum punya profil
insert into public.profiles (id, email, name, role)
select id, email, coalesce(raw_user_meta_data->>'name',''), 'kasir'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- 3) User pertama dijadikan admin (ganti email sesuai punya kamu)
update public.profiles set role = 'admin' where email = 'nnandaa21.12@gmail.com';