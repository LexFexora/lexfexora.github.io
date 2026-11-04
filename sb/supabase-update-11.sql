-- CAT Lex Fexora: pembaruan 11 (Vital Test Record bersama). Aman dijalankan ulang.
-- Jalankan sekali di Supabase > SQL Editor > New query > tempel seluruh isi > Run.
--
-- Vital Test Record menjadi satu arsip bersama: soal yang direkam (🔖 Record) oleh pengguna mana pun
-- terlihat dan bisa dikerjakan semua pengguna yang disetujui. Urutan arsip = urutan waktu direkam,
-- dibagi per 50 soal di situs. Progres dan jawaban tiap pengguna tetap tersimpan di akun masing-masing.
-- Soal hanya bisa dikeluarkan dari arsip oleh orang yang merekamnya atau oleh pemilik.

create table if not exists public.cat_arsip (
  id     text primary key check (id ~ '^Q[0-9]{3,6}$'),
  t      timestamptz not null default clock_timestamp(),
  oleh   uuid,
  aktif  boolean not null default true
);
alter table public.cat_arsip enable row level security;
revoke all on public.cat_arsip from public, anon, authenticated;
grant select on public.cat_arsip to authenticated;

drop policy if exists cat_arsip_baca on public.cat_arsip;
create policy cat_arsip_baca on public.cat_arsip for select to authenticated
  using (public.cat_is_owner() or public.cat_approved());

-- Rekam soal ke arsip bersama. Soal yang sudah ada di arsip tidak berubah urutannya.
create or replace function public.cat_arsip_rekam(p_id text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not (public.cat_is_owner() or public.cat_approved()) then raise exception 'akses ditolak'; end if;
  if p_id is null or p_id !~ '^Q[0-9]{3,6}$' then raise exception 'id soal tidak valid'; end if;
  insert into public.cat_arsip (id, t, oleh, aktif) values (p_id, clock_timestamp(), auth.uid(), true)
  on conflict (id) do update set t = clock_timestamp(), oleh = auth.uid(), aktif = true
    where public.cat_arsip.aktif = false;
  return true;
end $$;

-- Keluarkan soal dari arsip bersama: hanya perekamnya atau pemilik.
create or replace function public.cat_arsip_hapus(p_id text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.cat_arsip set aktif = false
   where id = p_id and aktif and (oleh = auth.uid() or public.cat_is_owner());
  return found;
end $$;

revoke all on function public.cat_arsip_rekam(text), public.cat_arsip_hapus(text) from public, anon;
grant execute on function public.cat_arsip_rekam(text), public.cat_arsip_hapus(text) to authenticated;
