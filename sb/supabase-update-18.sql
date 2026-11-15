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
