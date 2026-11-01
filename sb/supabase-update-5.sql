-- CAT Lex Fexora: pembaruan 5 (pembelian otomatis Paket Prediksi lewat Xendit). Jalankan sekali di SQL Editor (aman dijalankan ulang).
-- Jalankan supabase-update-4.sql lebih dulu.
-- Alur: pembeli login -> Edge Function "beli-akses" membuat tagihan Xendit (VA/QRIS) -> pembeli bayar
--       -> Xendit memanggil Edge Function "xendit-webhook" -> cat_beli_lunas() menandai lunas dan menyetujui akun
--       -> situs langsung membuka Paket Prediksi untuk akun itu (tanpa kode akses).

-- Harga dalam rupiah (angka), diisi pemilik dari situs.
alter table public.cat_bayar add column if not exists nominal integer not null default 0;

create table if not exists public.cat_beli (
  order_id    text primary key,
  uid         uuid not null,
  email       text not null default '',
  nominal     integer not null,
  status      text not null default 'menunggu',   -- menunggu | lunas | kedaluwarsa
  invoice_id  text,
  invoice_url text,
  dibuat      timestamptz not null default now(),
  lunas_pada  timestamptz
);
create index if not exists cat_beli_uid_idx on public.cat_beli (uid);
alter table public.cat_beli enable row level security;
revoke all on public.cat_beli from anon, authenticated;
grant select on public.cat_beli to authenticated;
-- Pembeli hanya melihat pesanannya sendiri; pemilik melihat semua. Tidak ada yang boleh menulis dari situs.
drop policy if exists cat_beli_baca on public.cat_beli;
create policy cat_beli_baca on public.cat_beli for select to authenticated
  using (uid = auth.uid() or public.cat_is_owner());

-- Apakah akun yang sedang login sudah membeli akses?
create or replace function public.cat_sudah_beli() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cat_beli where uid = auth.uid() and status = 'lunas')
$$;
revoke all on function public.cat_sudah_beli() from public, anon;
grant execute on function public.cat_sudah_beli() to authenticated;

-- Dipanggil HANYA oleh Edge Function xendit-webhook (service role) setelah pembayaran dicek ulang ke Xendit.
-- Menandai lunas dan menyetujui akun pembeli. Izin ditulis ulang (hapus + tambah) karena trigger
-- cat_before_write menolak perubahan status izin oleh selain pemilik.
create or replace function public.cat_beli_lunas(p_order text, p_invoice text) returns boolean
language plpgsql security definer set search_path = public as $$
declare b public.cat_beli; d jsonb; ts jsonb := jsonb_build_object('__ts', (extract(epoch from clock_timestamp()) * 1000)::bigint);
begin
  update public.cat_beli set status = 'lunas', lunas_pada = coalesce(lunas_pada, now()), invoice_id = coalesce(p_invoice, invoice_id)
    where order_id = p_order returning * into b;
  if not found then return false; end if;
  select data into d from public.docs where path = 'izin/' || b.uid::text;
  if d is null then
    d := jsonb_build_object('email', b.email, 'nama', '', 'foto', '', 'status', 'disetujui', 'diminta', ts, 'terakhir', ts, 'posisi', '');
    insert into public.docs (path, data) values ('izin/' || b.uid::text, d);
  elsif coalesce(d ->> 'status', '') <> 'disetujui' then
    delete from public.docs where path = 'izin/' || b.uid::text;
    insert into public.docs (path, data) values ('izin/' || b.uid::text, jsonb_set(d, '{status}', '"disetujui"'));
  end if;
  return true;
end $$;
revoke all on function public.cat_beli_lunas(text, text) from public, anon, authenticated;
grant execute on function public.cat_beli_lunas(text, text) to service_role;
