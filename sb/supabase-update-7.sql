-- CAT Lex Fexora: pembaruan 7. Tombol "Hapus" di panel izin juga menghapus email dari daftar pra-izin (izin_pra),
-- agar akun yang dihapus tidak otomatis disetujui lagi saat login berikutnya.
create or replace function public.cat_izin_hapus(p_uid text) returns boolean
language plpgsql security definer set search_path = public as $$
declare e text;
begin
  if not public.cat_is_owner() then raise exception 'khusus pemilik'; end if;
  select lower(data ->> 'email') into e from public.docs where path = 'izin/' || p_uid;
  if e is not null then delete from public.izin_pra where email = e; end if;
  delete from public.docs where path = 'izin/' || p_uid;
  return true;
end $$;
revoke all on function public.cat_izin_hapus(text) from public, anon;
grant execute on function public.cat_izin_hapus(text) to authenticated;
