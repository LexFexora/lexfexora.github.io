-- CAT Lex Fexora: pembaruan 18 (VVIP Leaderboard menampilkan semua akun VVIP). Aman dijalankan ulang.
-- Jalankan sekali di Supabase > SQL Editor > New query > tempel seluruh isi > Run (setelah pembaruan 17).
-- Semua akun VVIP aktif langsung tampil di papan walau belum menjawab soal (skor 0).
-- Skor tetap hanya dari jawaban benar selama berstatus VVIP (tabel cat_vip_skor, pembaruan 17).

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

-- Hasil yang diharapkan: jumlah akun VVIP aktif yang akan tampil di papan (tanpa pemilik).
select count(distinct b.uid) as akun_vvip from public.cat_beli b
 where b.status = 'lunas' and public.cat_beli_aktif(b.uid)
   and not exists (select 1 from public.cat_owner o where o.uid = b.uid);
