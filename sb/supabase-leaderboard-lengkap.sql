-- CAT Lex Fexora: Leaderboard LENGKAP = pembaruan 17 + 18 dalam satu kali Run. Aman dijalankan ulang.

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


-- CAT Lex Fexora: pembaruan 18 (Leaderboard: semua akun VVIP tampil + skor awal dari riwayat lama). Aman dijalankan ulang.
-- Jalankan sekali di Supabase > SQL Editor > New query > tempel seluruh isi > Run (setelah pembaruan 17).
-- 1. Skor awal: riwayat progres/<uid> akun VVIP aktif (b = pernah dijawab benar, c = pernah dikerjakan)
--    disalin ke cat_vip_skor, termasuk jawaban dari sebelum akun menjadi VVIP (pilihan Gonthx, 15 Nov 2026).
--    Menjalankan ulang tidak menggandakan skor: satu soal tetap satu baris.
-- 2. Semua akun VVIP aktif tampil di papan, termasuk yang belum menjawab (skor 0).
-- Jawaban baru tetap hanya dicatat selama akun berstatus VVIP (cat_vip_catat, pembaruan 17).

insert into public.cat_vip_skor (uid, id, benar, t, tb)
select v.uid, k.id, bool_or(k.benar), now(), case when bool_or(k.benar) then now() end
  from (select distinct b.uid from public.cat_beli b
         where b.status = 'lunas' and public.cat_beli_aktif(b.uid)
           and not exists (select 1 from public.cat_owner o where o.uid = b.uid)) v
  join public.docs g on g.path = 'progres/' || v.uid::text
  cross join lateral (
    select e.key as id, true as benar from jsonb_each(case when jsonb_typeof(g.data -> 'b') = 'object' then g.data -> 'b' else '{}'::jsonb end) e
     where e.value not in ('0'::jsonb, 'false'::jsonb, 'null'::jsonb)
    union all
    select e.key, false from jsonb_each(case when jsonb_typeof(g.data -> 'c') = 'object' then g.data -> 'c' else '{}'::jsonb end) e
     where e.value not in ('0'::jsonb, 'false'::jsonb, 'null'::jsonb)
  ) k
 where k.id ~ '^Q[0-9]{3,6}$'
 group by v.uid, k.id
on conflict (uid, id) do update
  set benar = public.cat_vip_skor.benar or excluded.benar,
      tb = coalesce(public.cat_vip_skor.tb, excluded.tb);

create or replace function public.cat_peringkat()
returns table (nama text, foto text, benar integer, dikerjakan integer, terakhir timestamptz, saya boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.cat_is_owner() or public.cat_sudah_beli()) then raise exception 'akses ditolak'; end if;
  return query
  with v as (
    select distinct b.uid from public.cat_beli b
     where b.status = 'lunas' and public.cat_beli_aktif(b.uid)
       and not exists (select 1 from public.cat_owner o where o.uid = b.uid)
  ), s as (
    select k.uid, count(*) filter (where k.benar)::int as benar, count(*)::int as dikerjakan,
           max(greatest(k.t, coalesce(k.tb, k.t))) as terakhir
      from public.cat_vip_skor k group by k.uid
  )
  select left(coalesce(nullif(btrim(i.data ->> 'nama'), ''),
                       nullif(u.raw_user_meta_data ->> 'full_name', ''),
                       nullif(u.raw_user_meta_data ->> 'name', ''),
                       'VVIP user'), 60)::text,
         (case when coalesce(i.data ->> 'foto', '') ~ '^https://' then left(i.data ->> 'foto', 500)
               when coalesce(u.raw_user_meta_data ->> 'avatar_url', '') ~ '^https://' then left(u.raw_user_meta_data ->> 'avatar_url', 500)
               else '' end)::text,
         coalesce(s.benar, 0), coalesce(s.dikerjakan, 0), s.terakhir, (v.uid = auth.uid())
    from v
    join public.docs i on i.path = 'izin/' || v.uid::text and i.data ->> 'status' = 'disetujui'
    left join s on s.uid = v.uid
    left join auth.users u on u.id = v.uid;
end $$;
revoke all on function public.cat_peringkat() from public, anon;
grant execute on function public.cat_peringkat() to authenticated;

notify pgrst, 'reload schema';

-- Hasil yang diharapkan: jumlah akun VVIP aktif di papan (tanpa pemilik) dan jumlah soal benar yang sudah tercatat.
select (select count(distinct b.uid) from public.cat_beli b
         where b.status = 'lunas' and public.cat_beli_aktif(b.uid)
           and not exists (select 1 from public.cat_owner o where o.uid = b.uid)) as akun_vvip,
       (select count(*) from public.cat_vip_skor where benar) as soal_benar_tercatat;
