-- CAT Lex Fexora: pembaruan 15 (mode perbaikan ditegakkan di server). Aman dijalankan ulang.
-- Selama mode perbaikan AKTIF, akun yang disetujui tetapi BUKAN VVIP Akses dianggap belum disetujui oleh server:
-- tidak bisa memuat bank soal, menyimpan progres, atau memakai Vital Test Record, walaupun memakai tab lama
-- yang dibuka sebelum mode perbaikan dipasang. Pemilik dan akun VVIP (pembeli lunas aktif + paket gratis) tidak terpengaruh.
-- Status mode perbaikan dibaca dari baris cat_bayar id='perbaikan' (kolom harga = 'aktif' / 'nonaktif'),
-- yaitu baris yang sama yang diubah tombol "Mode perbaikan" di panel pemilik. Tanpa baris = aktif.
-- Jalankan sekali di Supabase > SQL Editor > New query > tempel seluruh isi > Run.

create or replace function public.cat_perbaikan() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.cat_bayar where id = 'perbaikan' and harga = 'nonaktif')
$$;
revoke all on function public.cat_perbaikan() from public, anon;
grant execute on function public.cat_perbaikan() to authenticated, service_role;

create or replace function public.cat_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.docs
                 where path = 'izin/' || auth.uid()::text and data ->> 'status' = 'disetujui')
     and (not public.cat_perbaikan() or public.cat_beli_aktif(auth.uid()))
$$;
revoke all on function public.cat_approved() from public, anon;
grant execute on function public.cat_approved() to authenticated, service_role;
