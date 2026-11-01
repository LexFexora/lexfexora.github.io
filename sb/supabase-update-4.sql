-- CAT Lex Fexora: pembaruan 4 (link pembayaran Paket Prediksi). Jalankan sekali di SQL Editor (aman dijalankan ulang).
-- Menyimpan link pembayaran (Payment Link dari Mayar/Xendit/Midtrans), harga, dan nomor WhatsApp pemilik.
-- Semua orang (termasuk yang belum login) boleh MEMBACA, karena halaman /beli/ bersifat publik. Hanya pemilik yang boleh mengubah.
-- Tidak ada kunci rahasia payment gateway yang disimpan di sini.

create table if not exists public.cat_bayar (
  id text primary key,
  url text not null default '',
  harga text not null default '',
  wa text not null default '',
  diubah timestamptz not null default now(),
  constraint cat_bayar_url_https check (url = '' or url ~ '^https://')
);
alter table public.cat_bayar enable row level security;
grant select on public.cat_bayar to anon, authenticated;
grant insert, update on public.cat_bayar to authenticated;

drop policy if exists cat_bayar_baca on public.cat_bayar;
create policy cat_bayar_baca on public.cat_bayar for select to anon, authenticated using (true);
drop policy if exists cat_bayar_tulis on public.cat_bayar;
create policy cat_bayar_tulis on public.cat_bayar for insert to authenticated with check (public.cat_is_owner());
drop policy if exists cat_bayar_ubah on public.cat_bayar;
create policy cat_bayar_ubah on public.cat_bayar for update to authenticated using (public.cat_is_owner()) with check (public.cat_is_owner());
