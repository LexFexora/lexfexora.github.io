-- CAT Lex Fexora: Leaderboard LENGKAP (pembaruan 17 + 18 dalam satu kali Run). Aman dijalankan ulang.
-- Jalankan sekali di Supabase > SQL Editor > New query > tempel seluruh isi > Run.
--
-- Papan Leaderboard di beranda: peringkat antar akun VVIP menurut jumlah soal berbeda yang dijawab benar.
-- * Skor awal diisi dari riwayat lama progres/<uid> (b = pernah benar, c = pernah dikerjakan), termasuk jawaban
--   dari sebelum akun menjadi VVIP (pilihan Gonthx, 15 Nov 2026). Menjalankan ulang tidak menggandakan skor.
-- * Jawaban baru dicatat lewat cat_vip_catat() hanya selama akun berstatus VVIP aktif. Satu soal dihitung sekali.
-- * Semua akun VVIP aktif dan akun pemilik tampil, termasuk yang belum menjawab (skor 0).
-- * Hanya akun VVIP aktif dan pemilik yang bisa membaca papan. Email dan ID akun tidak dikirim ke situs.
-- * Versi ini berdiri sendiri: status VVIP dihitung langsung dari tabel cat_beli (fungsi cat_vip_aktif di bawah),
--   dengan aturan yang sama seperti tanda VVIP di situs, dan semua ID dibandingkan sebagai teks
--   agar jalan apa pun tipe kolom uid di database.

-- ---------- Status VVIP aktif ----------
create or replace function public.cat_vip_aktif(p_uid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cat_beli b
                  where b.uid::text = p_uid and b.status = 'lunas' and (
                    b.metode = 'gratis'
                    or b.dibuat < timestamptz '2026-11-01 13:00:00+00'
                    or coalesce(b.lunas_pada, b.dibuat) > now() - interval '1 year'))
$$;
revoke all on function public.cat_vip_aktif(text) from public, anon, authenticated;

create or replace function public.cat_vip_pemilik(p_uid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from auth.users x
                  where x.id::text = p_uid and lower(x.email) = 'febriankusumaa@gmail.com')
$$;
revoke all on function public.cat_vip_pemilik(text) from public, anon, authenticated;

-- ---------- Tabel skor ----------
create table if not exists public.cat_vip_skor (
  uid    text not null,
  id     text not null check (id ~ '^Q[0-9]{3,6}$'),
  benar  boolean not null default false,
  t      timestamptz not null default now(),
  tb     timestamptz,
  primary key (uid, id)
);
-- Bila tabel sempat dibuat oleh versi sebelumnya (kolom uid bertipe uuid), ubah ke teks.
alter table public.cat_vip_skor alter column uid type text using uid::text;
alter table public.cat_vip_skor enable row level security;
revoke all on public.cat_vip_skor from public, anon, authenticated;

-- ---------- Catat jawaban (dipanggil situs setiap kali akun VVIP menjawab) ----------
create or replace function public.cat_vip_catat(p_id text, p_benar boolean) returns boolean
language plpgsql security definer set search_path = public as $$
declare u text := auth.uid()::text;
begin
  if u is null or p_id is null or p_id !~ '^Q[0-9]{3,6}$' then return false; end if;
  if not (public.cat_vip_pemilik(u) or public.cat_vip_aktif(u)) then return false; end if;
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

-- ---------- Papan peringkat ----------
drop function if exists public.cat_peringkat();
create function public.cat_peringkat()
returns table (nama text, foto text, benar integer, dikerjakan integer, terakhir timestamptz, saya boolean)
language plpgsql stable security definer set search_path = public as $$
declare me text := auth.uid()::text;
begin
  if me is null or not (public.cat_vip_pemilik(me) or public.cat_vip_aktif(me)) then raise exception 'akses ditolak'; end if;
  return query
  with v as (
    select distinct b.uid::text as uid from public.cat_beli b where public.cat_vip_aktif(b.uid::text)
    union
    select x.id::text from auth.users x where public.cat_vip_pemilik(x.id::text)
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
         coalesce(s.benar, 0), coalesce(s.dikerjakan, 0), s.terakhir, (v.uid = me)
    from v
    left join public.docs i on i.path = 'izin/' || v.uid
    left join s on s.uid = v.uid
    left join auth.users u on u.id::text = v.uid
   where coalesce(i.data ->> 'status', '') = 'disetujui' or public.cat_vip_pemilik(v.uid);
end $$;
revoke all on function public.cat_peringkat() from public, anon;
grant execute on function public.cat_peringkat() to authenticated;

-- ---------- Skor awal dari riwayat lama ----------
insert into public.cat_vip_skor (uid, id, benar, t, tb)
select v.uid, k.id, bool_or(k.benar), now(), case when bool_or(k.benar) then now() end
  from (select distinct b.uid::text as uid from public.cat_beli b where public.cat_vip_aktif(b.uid::text)
        union
        select x.id::text from auth.users x where public.cat_vip_pemilik(x.id::text)) v
  join public.docs g on g.path = 'progres/' || v.uid
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

notify pgrst, 'reload schema';

-- Hasil yang diharapkan: jumlah akun di papan (VVIP aktif + pemilik) dan jumlah soal benar yang tercatat.
select (select count(*) from (select b.uid::text from public.cat_beli b where public.cat_vip_aktif(b.uid::text)
          union select x.id::text from auth.users x where public.cat_vip_pemilik(x.id::text)) a) as akun_di_papan,
       (select count(*) from public.cat_vip_skor where benar) as soal_benar_tercatat;
