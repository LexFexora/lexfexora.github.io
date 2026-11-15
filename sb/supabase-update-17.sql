-- CAT Lex Fexora: pembaruan 17 (VVIP Leaderboard). Aman dijalankan ulang.
-- Jalankan sekali di Supabase > SQL Editor > New query > tempel seluruh isi > Run.
--
-- Papan peringkat pengerjaan soal antar akun VVIP, tampil di beranda di bawah Vital Test Record.
-- * Yang dihitung hanya jawaban yang diberikan SELAMA akun berstatus VVIP aktif (public.cat_sudah_beli()).
--   Setiap kali akun VVIP mengklik opsi jawaban, situs memanggil cat_vip_catat(); server sendiri yang mengecek
--   status VVIP saat itu. Jawaban dari masa sebelum VVIP, atau setelah VVIP berakhir, tidak tercatat.
-- * Benar = jumlah soal berbeda yang dijawab benar selama VVIP (mengulang soal yang sama tidak menambah angka).
--   Dikerjakan = jumlah soal berbeda yang dijawab selama VVIP.
-- * Hitungan dimulai sejak file ini dijalankan (riwayat lama tidak punya catatan waktu, jadi tidak ikut).
-- * Hanya akun VVIP aktif dan pemilik yang bisa membaca papan; akun pemilik tidak ikut diperingkat.
-- * Yang dikirim ke situs hanya nama, foto profil Google, dan angka. Email dan ID akun tidak dikirim;
--   kolom "saya" menandai baris akun yang sedang login.

create table if not exists public.cat_vip_skor (
  uid    uuid not null,
  id     text not null check (id ~ '^Q[0-9]{3,6}$'),
  benar  boolean not null default false,
  t      timestamptz not null default now(),   -- pertama kali dijawab selama VVIP
  tb     timestamptz,                          -- pertama kali dijawab benar selama VVIP
  primary key (uid, id)
);
alter table public.cat_vip_skor enable row level security;
revoke all on public.cat_vip_skor from public, anon, authenticated;

-- Dipanggil situs setiap kali akun menjawab soal. Diam-diam diabaikan bila akun bukan VVIP aktif atau pemilik.
create or replace function public.cat_vip_catat(p_id text, p_benar boolean) returns boolean
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid();
begin
  if u is null or p_id is null or p_id !~ '^Q[0-9]{3,6}$' then return false; end if;
  if public.cat_is_owner() or not public.cat_sudah_beli() then return false; end if;
  -- Batas wajar per akun (bank soal sekitar 5.200 soal) agar tabel tidak bisa dibanjiri.
  if not exists (select 1 from public.cat_vip_skor where uid = u and id = p_id)
     and (select count(*) from public.cat_vip_skor where uid = u) >= 12000 then return false; end if;
  insert into public.cat_vip_skor (uid, id, benar, t, tb)
    values (u, p_id, coalesce(p_benar, false), now(), case when p_benar then now() end)
  on conflict (uid, id) do update
    set benar = public.cat_vip_skor.benar or excluded.benar,
        tb = coalesce(public.cat_vip_skor.tb, excluded.tb);
  return true;
end $$;
revoke all on function public.cat_vip_catat(text, boolean) from public, anon;
grant execute on function public.cat_vip_catat(text, boolean) to authenticated;

create or replace function public.cat_peringkat()
returns table (nama text, foto text, benar integer, dikerjakan integer, terakhir timestamptz, saya boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.cat_is_owner() or public.cat_sudah_beli()) then raise exception 'akses ditolak'; end if;
  return query
  with s as (
    select k.uid, count(*) filter (where k.benar)::int as benar, count(*)::int as dikerjakan,
           max(greatest(k.t, coalesce(k.tb, k.t))) as terakhir
      from public.cat_vip_skor k group by k.uid
  )
  select left(coalesce(nullif(btrim(i.data ->> 'nama'), ''),
                       nullif(u.raw_user_meta_data ->> 'full_name', ''),
                       nullif(u.raw_user_meta_data ->> 'name', ''),
                       'VVIP user'), 60)::text,
         (case when coalesce(i.data ->> 'foto', '') ~ '^https://' then left(i.data ->> 'foto', 500) else '' end)::text,
         s.benar, s.dikerjakan, s.terakhir, (s.uid = auth.uid())
    from s
    join public.docs i on i.path = 'izin/' || s.uid::text and i.data ->> 'status' = 'disetujui'
    left join auth.users u on u.id = s.uid
   where public.cat_beli_aktif(s.uid)
     and not exists (select 1 from public.cat_owner o where o.uid = s.uid);
end $$;
revoke all on function public.cat_peringkat() from public, anon;
grant execute on function public.cat_peringkat() to authenticated;

-- Versi awal pembaruan ini (bila sempat terpasang) memakai fungsi bantu yang tidak diperlukan lagi.
drop function if exists public.cat_jumlah_kunci(jsonb);

notify pgrst, 'reload schema';

-- Hasil yang diharapkan: satu baris "siap" berisi 0 (belum ada jawaban VVIP yang tercatat).
select count(*) as siap from public.cat_vip_skor;
