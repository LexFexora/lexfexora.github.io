-- CAT Lex Fexora: pembaruan 6 (beli akses lewat TRANSFER BANK langsung ke rekening pemilik, tanpa payment gateway).
-- Jalankan sekali di SQL Editor setelah supabase-update-4.sql dan supabase-update-5.sql (aman dijalankan ulang).
-- Alur: pembeli login -> klik Buy -> melihat nominal unik (harga + 3 digit) dan rekening pemilik -> transfer
--       -> isi nama pengirim dan ketuk "I have transferred" -> pemilik cek mutasi di aplikasi bank -> ketuk Confirm
--       -> akun pembeli disetujui dan Paket Prediksi langsung terbuka.

alter table public.cat_bayar add column if not exists rekening text not null default '';
alter table public.cat_beli add column if not exists metode text not null default 'xendit';
alter table public.cat_beli add column if not exists pengirim text not null default '';
alter table public.cat_beli add column if not exists dikirim_pada timestamptz;

-- Pembeli: ambil (atau buat) pesanan transfer yang masih menunggu. Bila p_nama diisi, pesanan ditandai "sudah transfer".
create or replace function public.cat_beli_transfer(p_nama text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.cat_beli; harga integer; rek text; wan text; u uuid := auth.uid(); kode integer;
begin
  if u is null then raise exception 'login'; end if;
  if exists (select 1 from public.cat_beli where uid = u and status = 'lunas') then return jsonb_build_object('lunas', true); end if;
  select nominal, rekening, wa into harga, rek, wan from public.cat_bayar where id = 'paket';
  if coalesce(harga, 0) < 10000 or coalesce(rek, '') = '' then raise exception 'belum_aktif'; end if;
  select * into b from public.cat_beli where uid = u and metode = 'transfer' and status = 'menunggu' order by dibuat desc limit 1;
  if not found or b.nominal not between harga + 1 and harga + 999 then
    if found then update public.cat_beli set status = 'batal' where order_id = b.order_id; end if;
    -- Harga + 3 digit unik (1-999) agar transfer mudah dicocokkan di mutasi rekening.
    select g into kode from generate_series(1, 999) g
      where not exists (select 1 from public.cat_beli where metode = 'transfer' and status = 'menunggu' and nominal = harga + g)
      order by random() limit 1;
    insert into public.cat_beli (order_id, uid, email, nominal, metode)
      values ('TF-' || left(u::text, 8) || '-' || (extract(epoch from now()) * 1000)::bigint, u, coalesce(auth.jwt() ->> 'email', ''),
              harga + coalesce(kode, 0), 'transfer')
      returning * into b;
  end if;
  if p_nama is not null and btrim(p_nama) <> '' then
    update public.cat_beli set pengirim = left(btrim(p_nama), 80), dikirim_pada = now() where order_id = b.order_id returning * into b;
  end if;
  return jsonb_build_object('order', b.order_id, 'nominal', b.nominal, 'rekening', rek, 'wa', wan, 'pengirim', b.pengirim, 'dikirim', b.dikirim_pada is not null);
end $$;
revoke all on function public.cat_beli_transfer(text) from public, anon;
grant execute on function public.cat_beli_transfer(text) to authenticated;

-- Pemilik: konfirmasi atau tolak transfer.
create or replace function public.cat_beli_konfirmasi(p_order text, p_terima boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.cat_is_owner() then raise exception 'khusus pemilik'; end if;
  if p_terima then return public.cat_beli_lunas(p_order, null); end if;
  update public.cat_beli set status = 'ditolak' where order_id = p_order and status = 'menunggu';
  return found;
end $$;
revoke all on function public.cat_beli_konfirmasi(text, boolean) from public, anon;
grant execute on function public.cat_beli_konfirmasi(text, boolean) to authenticated;
