-- CAT Lex Fexora: pembaruan 1 untuk Supabase. Jalankan sekali di SQL Editor (aman dijalankan ulang).
-- (a) Kolom col jadi kolom biasa yang diisi trigger, agar filter realtime bisa membacanya.
-- (b) Daftar email yang sudah disetujui di Firebase (pra-izin).
-- Saat akun dengan email ini pertama kali masuk ke Supabase, permintaan izinnya otomatis berstatus "disetujui".
-- Setelah ini, tempel perintah INSERT dari tombol "Salin daftar izin (SQL)" di situs utama.

do $$ begin
  alter table public.docs alter column col drop expression;
exception when others then null; end $$;
update public.docs set col = regexp_replace(path, '/[^/]+$', '') where col is distinct from regexp_replace(path, '/[^/]+$', '');

create table if not exists public.izin_pra (email text primary key);
alter table public.izin_pra enable row level security;
revoke all on public.izin_pra from anon, authenticated;

create or replace function public.cat_pra(e text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.izin_pra where email = lower(e))
$$;

create or replace function public.cat_before_write() returns trigger language plpgsql as $$
declare now_ms jsonb := jsonb_build_object('__ts', (extract(epoch from clock_timestamp()) * 1000)::bigint);
begin
  new.data := coalesce((select jsonb_object_agg(k, case when v = '"__now__"'::jsonb then now_ms else v end)
                        from jsonb_each(new.data) as e(k, v)), '{}'::jsonb);
  new.updated_at := now();
  new.col := regexp_replace(new.path, '/[^/]+$', '');
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

-- Aturan tambah dokumen: sama seperti supabase-schema.sql, kecuali izin pengguna lama boleh langsung "disetujui".
drop policy if exists cat_insert on public.docs;
create policy cat_insert on public.docs for insert to authenticated with check (
  case
    when public.cat_is_owner() and path !~ '^tryout/[^/]+/(chat|peserta)/' then true
    when path = 'izin/' || public.cat_uid() then
      (data ->> 'status' = 'menunggu'
       or (data ->> 'status' = 'disetujui' and public.cat_pra(auth.jwt() ->> 'email')))
      and public.cat_keys_only(data, array['email','nama','foto','status','diminta','terakhir','posisi'])
    when path = 'progres/' || public.cat_uid() then public.cat_approved() or public.cat_is_owner()
    when path ~ '^tryout/[^/]+/chat/[^/]+$' then
      public.cat_peserta(split_part(path, '/', 2))
      and data ->> 'uid' = public.cat_uid()
      and public.cat_keys_only(data, array['uid','nama','foto','teks','t'])
      and jsonb_typeof(data -> 'teks') = 'string'
      and char_length(data ->> 'teks') between 1 and 500
    when path ~ '^tryout/[^/]+/peserta/[^/]+$' then
      split_part(path, '/', 4) = public.cat_uid()
      and public.cat_keys_only(data, array['nama','foto','jawab','benar','dijawab','skor','dur','selesai','siap','t'])
      and jsonb_typeof(data -> 'skor') = 'number' and (data ->> 'skor')::numeric between 0 and 100
      and public.cat_tryout(split_part(path, '/', 2)) ->> 'status' in ('menunggu','siap','mulai')
    else false end);
