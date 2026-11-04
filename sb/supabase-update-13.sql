-- CAT Lex Fexora: pembaruan 13. Vital Test Record menyimpan nama pengguna yang merekam soal,
-- untuk ditampilkan di bawah soal ("by <nama>"). Aman dijalankan ulang.
-- Jalankan sekali di Supabase > SQL Editor > New query > tempel seluruh isi > Run.

alter table public.cat_arsip add column if not exists nama text;

-- Nama akun Google perekam (nama lengkap; bila kosong, bagian depan email).
create or replace function public.cat_arsip_nama(u uuid) returns text
language sql stable security definer set search_path = public as $$
  select left(coalesce(nullif(x.raw_user_meta_data ->> 'full_name', ''), nullif(x.raw_user_meta_data ->> 'name', ''),
                       split_part(x.email, '@', 1), ''), 60)
    from auth.users x where x.id = u
$$;
revoke all on function public.cat_arsip_nama(uuid) from public, anon, authenticated;

-- Isi nama untuk rekaman yang sudah ada.
update public.cat_arsip set nama = public.cat_arsip_nama(oleh) where nama is null and oleh is not null;

create or replace function public.cat_arsip_rekam(p_id text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not (public.cat_is_owner() or public.cat_sudah_beli()) then raise exception 'akses ditolak'; end if;
  if p_id is null or p_id !~ '^Q[0-9]{3,6}$' then raise exception 'id soal tidak valid'; end if;
  insert into public.cat_arsip (id, t, oleh, aktif, nama) values (p_id, clock_timestamp(), auth.uid(), true, public.cat_arsip_nama(auth.uid()))
  on conflict (id) do update set t = clock_timestamp(), oleh = auth.uid(), aktif = true, nama = public.cat_arsip_nama(auth.uid())
    where public.cat_arsip.aktif = false;
  return true;
end $$;
revoke all on function public.cat_arsip_rekam(text) from public, anon;
grant execute on function public.cat_arsip_rekam(text) to authenticated;
