-- CAT Lex Fexora: pembaruan 8 (akses Paket Prediksi gratis dari pemilik). Aman dijalankan ulang.
create or replace function public.cat_beri_gratis(p_uid text) returns boolean
language plpgsql security definer set search_path = public as $$
declare o text := 'GR-' || left(p_uid, 8) || '-' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint; e text;
begin
  if not public.cat_is_owner() then raise exception 'khusus pemilik'; end if;
  if exists (select 1 from public.cat_beli where uid = p_uid::uuid and status = 'lunas') then return true; end if;
  select coalesce(data ->> 'email', '') into e from public.docs where path = 'izin/' || p_uid;
  insert into public.cat_beli (order_id, uid, email, nominal, metode) values (o, p_uid::uuid, coalesce(e, ''), 0, 'gratis');
  return public.cat_beli_lunas(o, null);
end $$;
revoke all on function public.cat_beri_gratis(text) from public, anon;
grant execute on function public.cat_beri_gratis(text) to authenticated;

create or replace function public.cat_cabut_gratis(p_uid text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.cat_is_owner() then raise exception 'khusus pemilik'; end if;
  delete from public.cat_beli where uid = p_uid::uuid and metode = 'gratis';
  return found;
end $$;
revoke all on function public.cat_cabut_gratis(text) from public, anon;
grant execute on function public.cat_cabut_gratis(text) to authenticated;
