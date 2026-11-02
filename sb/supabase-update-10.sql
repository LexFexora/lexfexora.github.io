-- CAT Lex Fexora: pembaruan 10 (pengamanan akun pemilik dan database). Aman dijalankan ulang.
-- Jalankan sekali di Supabase > SQL Editor > New query > tempel seluruh isi > Run.
-- Seluruh isi berjalan sebagai satu transaksi: bila ada yang gagal, tidak ada yang berubah.
--
-- 1. Pemilik dikunci ke ID akun Google pemilik (bukan hanya alamat email). Akun lain yang entah bagaimana
--    memakai email yang sama (misalnya daftar lewat email/sandi) tetap tidak dianggap pemilik.
-- 2. Kode akses: maksimal 10 kali salah per akun per jam (mencegah tebak kode otomatis).
-- 3. Fungsi bantu tidak bisa dipanggil tanpa login, dan cat_pra tidak bisa dipakai mengecek email orang lain.
-- 4. Pengguna biasa tidak bisa memalsukan email di permintaan izin, dan ukuran tulisan dibatasi
--    (mencegah orang memenuhi kuota database gratis).

-- ---------- 1. Kunci pemilik ke ID akun ----------
create table if not exists public.cat_owner (uid uuid primary key);
alter table public.cat_owner enable row level security;
revoke all on public.cat_owner from public, anon, authenticated;

insert into public.cat_owner (uid)
  select u.id from auth.users u
  where lower(u.email) = 'febriankusumaa@gmail.com' and u.email_confirmed_at is not null
    and exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google')
on conflict do nothing;

do $$ begin
  if not exists (select 1 from public.cat_owner) then
    raise exception 'Akun Google pemilik belum ditemukan. Login dulu ke situs dengan febriankusumaa@gmail.com, lalu jalankan ulang.';
  end if;
end $$;

create or replace function public.cat_is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'febriankusumaa@gmail.com'
     and exists (select 1 from public.cat_owner where uid = auth.uid())
$$;

-- ---------- 2. Batas salah kode akses ----------
create table if not exists public.cat_coba (
  uid   uuid primary key,
  gagal int not null default 0,
  sejak timestamptz not null default now()
);
alter table public.cat_coba enable row level security;
revoke all on public.cat_coba from public, anon, authenticated;

create or replace function public.cat_klaim_kode(p_kode text) returns text
language plpgsql security definer set search_path = public as $$
declare u text := auth.uid()::text; e text := coalesce(auth.jwt() ->> 'email', ''); d jsonb; jenis text; jl text; o text; n int;
begin
  if u is null or p_kode is null or length(btrim(p_kode)) < 6 then return null; end if;
  select gagal into n from public.cat_coba where uid = u::uuid and sejak > now() - interval '1 hour';
  if coalesce(n, 0) >= 10 then return 'terlalu'; end if;
  select id into jenis from public.cat_kode where id in ('penuh', 'gratis') and kode = btrim(p_kode)
    order by (id = 'penuh') desc limit 1;
  if jenis is null then
    insert into public.cat_coba (uid, gagal, sejak) values (u::uuid, 1, now())
      on conflict (uid) do update set
        gagal = case when public.cat_coba.sejak > now() - interval '1 hour' then public.cat_coba.gagal + 1 else 1 end,
        sejak = case when public.cat_coba.sejak > now() - interval '1 hour' then public.cat_coba.sejak else now() end;
    return null;
  end if;
  delete from public.cat_coba where uid = u::uuid;
  select data into d from public.docs where path = 'izin/' || u;
  if d is not null and d ->> 'status' = 'ditolak' then return 'ditolak'; end if;
  jl := case when jenis = 'penuh' or coalesce(d ->> 'jalur', '') = 'penuh' then 'penuh' else 'gratis' end;
  if d is null or coalesce(d ->> 'status', '') <> 'disetujui' or (jl = 'penuh' and coalesce(d ->> 'jalur', '') <> 'penuh') then
    d := coalesce(d, jsonb_build_object('nama', '', 'foto', '', 'posisi', ''))
         || jsonb_build_object('email', e, 'status', 'disetujui', 'jalur', jl);
    delete from public.docs where path = 'izin/' || u;
    insert into public.docs (path, data) values ('izin/' || u, d);
  end if;
  if jenis = 'penuh' and not public.cat_beli_aktif(u::uuid) then
    o := 'KD-' || left(u, 8) || '-' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
    insert into public.cat_beli (order_id, uid, email, nominal, metode) values (o, u::uuid, e, 0, 'gratis');
    perform public.cat_beli_lunas(o, null);
  end if;
  return jenis;
end $$;
revoke all on function public.cat_klaim_kode(text) from public, anon;
grant execute on function public.cat_klaim_kode(text) to authenticated;

-- ---------- 3. Fungsi bantu: hanya untuk akun yang login ----------
create or replace function public.cat_pra(e text) returns boolean
language sql stable security definer set search_path = public as $$
  select lower(coalesce(e, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
     and exists (select 1 from public.izin_pra where email = lower(e))
$$;

do $$ declare f text; begin
  foreach f in array array[
    'public.cat_is_owner()', 'public.cat_uid()', 'public.cat_approved()', 'public.cat_pra(text)',
    'public.cat_peserta(text)', 'public.cat_tryout(text)',
    'public.doc_set(text, jsonb, boolean)', 'public.doc_update(text, jsonb)'] loop
    execute 'revoke all on function ' || f || ' from public, anon';
    execute 'grant execute on function ' || f || ' to authenticated, service_role';
  end loop;
end $$;

-- ---------- 4. Trigger tulis: email asli, batas ukuran ----------
create or replace function public.cat_before_write() returns trigger language plpgsql as $$
declare now_ms jsonb := jsonb_build_object('__ts', (extract(epoch from clock_timestamp()) * 1000)::bigint);
begin
  new.data := coalesce((select jsonb_object_agg(k, case when v = '"__now__"'::jsonb then now_ms else v end)
                        from jsonb_each(new.data) as e(k, v)), '{}'::jsonb);
  new.updated_at := now();
  new.col := regexp_replace(new.path, '/[^/]+$', '');
  if not public.cat_is_owner() and auth.uid() is not null then
    -- Batas ukuran satu dokumen untuk pengguna biasa (progres latihan normal jauh di bawah ini).
    if octet_length(new.data::text) > 2000000 then
      raise exception 'dokumen terlalu besar';
    end if;
    -- Permintaan izin selalu memakai email asli akun yang login, nama dan foto dipotong wajar.
    if tg_op = 'INSERT' and new.path = 'izin/' || auth.uid()::text then
      new.data := new.data || jsonb_build_object(
        'email', coalesce(auth.jwt() ->> 'email', ''),
        'nama', left(coalesce(new.data ->> 'nama', ''), 80),
        'foto', case when coalesce(new.data ->> 'foto', '') ~ '^https://' then left(new.data ->> 'foto', 500) else '' end,
        'posisi', left(coalesce(new.data ->> 'posisi', ''), 300));
    end if;
  end if;
  -- Pengguna lama (email ada di izin_pra) langsung disetujui saat pertama kali meminta izin.
  if tg_op = 'INSERT' and new.path = 'izin/' || public.cat_uid() and new.data ->> 'status' = 'menunggu'
     and public.cat_pra(auth.jwt() ->> 'email') then
    new.data := jsonb_set(new.data, '{status}', '"disetujui"');
  end if;
  if tg_op = 'UPDATE' and not public.cat_is_owner() then
    if new.path ~ '^izin/[^/]+$'
       and (new.data - 'terakhir' - 'posisi') is distinct from (old.data - 'terakhir' - 'posisi') then
      raise exception 'izin: hanya terakhir dan posisi yang boleh diubah';
    end if;
    if new.path ~ '^tryout/[^/]+$'
       and (new.data - 'idx' - 'idxMulai' - 'master') is distinct from (old.data - 'idx' - 'idxMulai' - 'master') then
      raise exception 'tryout: peserta hanya boleh mengubah idx, idxMulai, master';
    end if;
  end if;
  return new;
end $$;

notify pgrst, 'reload schema';

-- Hasil yang diharapkan: satu baris berisi email pemilik.
select u.email as pemilik_terkunci from public.cat_owner o join auth.users u on u.id = o.uid;
