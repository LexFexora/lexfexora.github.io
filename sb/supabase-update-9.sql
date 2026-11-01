-- CAT Lex Fexora: pembaruan 9 (harga Rp1.500.000 untuk akses 1 tahun). Aman dijalankan ulang.
-- Aturan akses Paket Prediksi:
--   * Pembelian baru: aktif 1 tahun sejak transfer dikonfirmasi, lalu bisa diperpanjang dengan membeli lagi.
--   * Pembelian lama (pesanan dibuat sebelum 1 Nov 2026 20.00 WIB): tetap selamanya, sesuai janji saat mereka membeli.
--   * Akses gratis dari pemilik: tidak kedaluwarsa, bisa dicabut kapan saja lewat tombol "Cabut paket".

create or replace function public.cat_beli_aktif(p_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cat_beli b where b.uid = p_uid and b.status = 'lunas' and (
    b.metode = 'gratis'
    or b.dibuat < timestamptz '2026-11-01 13:00:00+00'
    or coalesce(b.lunas_pada, b.dibuat) > now() - interval '1 year'))
$$;
revoke all on function public.cat_beli_aktif(uuid) from public, anon, authenticated;

create or replace function public.cat_sudah_beli() returns boolean
language sql stable security definer set search_path = public as $$
  select public.cat_beli_aktif(auth.uid())
$$;
revoke all on function public.cat_sudah_beli() from public, anon;
grant execute on function public.cat_sudah_beli() to authenticated;

-- Tanggal akses berakhir untuk akun yang sedang login (null = selamanya atau belum membeli).
create or replace function public.cat_akses_sampai() returns timestamptz
language sql stable security definer set search_path = public as $$
  select case when bool_or(b.metode = 'gratis' or b.dibuat < timestamptz '2026-11-01 13:00:00+00') then null
              else max(coalesce(b.lunas_pada, b.dibuat)) + interval '1 year' end
  from public.cat_beli b where b.uid = auth.uid() and b.status = 'lunas'
$$;
revoke all on function public.cat_akses_sampai() from public, anon;
grant execute on function public.cat_akses_sampai() to authenticated;

create or replace function public.cat_beli_transfer(p_nama text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.cat_beli; harga integer; rek text; wan text; u uuid := auth.uid(); kode integer;
begin
  if u is null then raise exception 'login'; end if;
  if public.cat_beli_aktif(u) then return jsonb_build_object('lunas', true); end if;
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

create or replace function public.cat_beri_gratis(p_uid text) returns boolean
language plpgsql security definer set search_path = public as $$
declare o text := 'GR-' || left(p_uid, 8) || '-' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint; e text;
begin
  if not public.cat_is_owner() then raise exception 'khusus pemilik'; end if;
  if public.cat_beli_aktif(p_uid::uuid) then return true; end if;
  select coalesce(data ->> 'email', '') into e from public.docs where path = 'izin/' || p_uid;
  insert into public.cat_beli (order_id, uid, email, nominal, metode) values (o, p_uid::uuid, coalesce(e, ''), 0, 'gratis');
  return public.cat_beli_lunas(o, null);
end $$;
revoke all on function public.cat_beri_gratis(text) from public, anon;
grant execute on function public.cat_beri_gratis(text) to authenticated;


-- Harga baru.
update public.cat_bayar set nominal = 1500000, harga = 'Rp1.500.000', diubah = now() where id = 'paket';
