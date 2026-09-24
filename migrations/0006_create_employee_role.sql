-- create_employee dengan pilihan peran (kasir/admin).
-- Jalankan sekali di Supabase SQL Editor. Menggantikan versi 3-argumen.

create extension if not exists pgcrypto with schema extensions;

drop function if exists public.create_employee(text, text, text);

create or replace function public.create_employee(
  p_email text,
  p_password text,
  p_name text,
  p_role text default 'kasir'
)
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

  if p_role not in ('admin', 'kasir') then
    raise exception 'Peran tidak valid: %', p_role;
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
  values (_uid, p_email, p_name, p_role)
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        role = excluded.role;

  return _uid;
end;
$$;

revoke all on function public.create_employee(text, text, text, text) from public;
grant execute on function public.create_employee(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';