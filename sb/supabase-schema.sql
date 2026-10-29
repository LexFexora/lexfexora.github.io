-- CAT Lex Fexora: skema Supabase (pengganti Firestore).
-- Setiap dokumen Firestore disimpan sebagai satu baris "docs" dengan path yang sama
-- (izin/{uid}, progres/{uid}, bank/{doc}, tryout/{id}, tryout/{id}/peserta/{uid}, tryout/{id}/chat/{msg}),
-- sehingga kode situs hampir tidak berubah. Aturan keamanan = RLS + trigger di bawah, setara firestore.rules.
-- Jalankan sekali di Supabase: SQL Editor > New query > tempel seluruh isi file ini > Run.

create table if not exists public.docs (
  path text primary key check (path ~ '^[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*$'),
  col  text generated always as (regexp_replace(path, '/[^/]+$', '')) stored,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists docs_col_idx on public.docs (col);
alter table public.docs replica identity full;
alter table public.docs enable row level security;

-- ---------- Fungsi bantu (security definer agar tidak memicu RLS berulang) ----------
create or replace function public.cat_uid() returns text language sql stable as $$ select auth.uid()::text $$;

create or replace function public.cat_is_owner() returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'febriankusumaa@gmail.com'
$$;

create or replace function public.cat_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.docs
                 where path = 'izin/' || auth.uid()::text and data ->> 'status' = 'disetujui')
$$;

create or replace function public.cat_peserta(tid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.docs where path = 'tryout/' || tid || '/peserta/' || auth.uid()::text)
$$;

create or replace function public.cat_tryout(tid text) returns jsonb
language sql stable security definer set search_path = public as $$
  select data from public.docs where path = 'tryout/' || tid
$$;

-- Hanya kunci yang diizinkan (setara keys().hasOnly([...])).
create or replace function public.cat_keys_only(d jsonb, allowed text[]) returns boolean
language sql immutable as $$ select not exists (select 1 from jsonb_object_keys(d) k where k <> all(allowed)) $$;

-- Gabung dalam (setara set(..., {merge:true}) di Firestore).
create or replace function public.cat_deep_merge(a jsonb, b jsonb) returns jsonb language plpgsql immutable as $$
declare k text; v jsonb; r jsonb := coalesce(a, '{}'::jsonb);
begin
  if jsonb_typeof(a) is distinct from 'object' or jsonb_typeof(b) is distinct from 'object' then return b; end if;
  for k, v in select * from jsonb_each(b) loop
    if jsonb_typeof(v) = 'object' and jsonb_typeof(r -> k) = 'object' and not (v ? '__ts')
      then r := jsonb_set(r, array[k], public.cat_deep_merge(r -> k, v));
      else r := jsonb_set(r, array[k], v);
    end if;
  end loop;
  return r;
end $$;

-- ---------- Trigger: waktu server + batas kolom yang boleh diubah selain pemilik ----------
create or replace function public.cat_before_write() returns trigger language plpgsql as $$
declare now_ms jsonb := jsonb_build_object('__ts', (extract(epoch from clock_timestamp()) * 1000)::bigint);
begin
  -- serverTimestamp(): nilai "__now__" di tingkat atas diganti waktu server.
  new.data := coalesce((select jsonb_object_agg(k, case when v = '"__now__"'::jsonb then now_ms else v end)
                        from jsonb_each(new.data) as e(k, v)), '{}'::jsonb);
  new.updated_at := now();
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
drop trigger if exists cat_before_write on public.docs;
create trigger cat_before_write before insert or update on public.docs
  for each row execute function public.cat_before_write();

-- ---------- RLS ----------
drop policy if exists cat_select on public.docs;
drop policy if exists cat_insert on public.docs;
drop policy if exists cat_update on public.docs;
drop policy if exists cat_delete on public.docs;

create policy cat_select on public.docs for select to authenticated using (
  case split_part(path, '/', 1)
    when 'izin'    then public.cat_is_owner() or split_part(path, '/', 2) = public.cat_uid()
    when 'progres' then split_part(path, '/', 2) = public.cat_uid() and (public.cat_is_owner() or public.cat_approved())
    when 'bank'    then public.cat_is_owner() or public.cat_approved()
    when 'tryout'  then true
    else false end);

create policy cat_insert on public.docs for insert to authenticated with check (
  case
    when public.cat_is_owner() and path !~ '^tryout/[^/]+/(chat|peserta)/' then true
    when path = 'izin/' || public.cat_uid() then
      data ->> 'status' = 'menunggu'
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

create policy cat_update on public.docs for update to authenticated
  using (
    case
      when public.cat_is_owner() and path !~ '^tryout/[^/]+/peserta/' then true
      when path = 'izin/' || public.cat_uid() then true
      when path = 'progres/' || public.cat_uid() then public.cat_approved() or public.cat_is_owner()
      when path ~ '^tryout/[^/]+$' then
        public.cat_peserta(split_part(path, '/', 2)) and data ->> 'mode' = 'sinkron'
      when path ~ '^tryout/[^/]+/peserta/[^/]+$' then
        split_part(path, '/', 4) = public.cat_uid() and coalesce(data ->> 'selesai', 'false') <> 'true'
      else false end)
  with check (
    case
      when public.cat_is_owner() and path !~ '^tryout/[^/]+/peserta/' then true
      when path = 'izin/' || public.cat_uid() then true
      when path = 'progres/' || public.cat_uid() then true
      when path ~ '^tryout/[^/]+$' then data ->> 'mode' = 'sinkron'
      when path ~ '^tryout/[^/]+/peserta/[^/]+$' then
        split_part(path, '/', 4) = public.cat_uid()
        and public.cat_keys_only(data, array['nama','foto','jawab','benar','dijawab','skor','dur','selesai','siap','t'])
        and jsonb_typeof(data -> 'skor') = 'number' and (data ->> 'skor')::numeric between 0 and 100
        and public.cat_tryout(split_part(path, '/', 2)) ->> 'status' in ('menunggu','siap','mulai')
      else false end);

create policy cat_delete on public.docs for delete to authenticated using (
  public.cat_is_owner() or path = 'progres/' || public.cat_uid());

-- ---------- RPC: set(merge) dan update() ala Firestore ----------
create or replace function public.doc_set(p_path text, p_data jsonb, p_merge boolean default false) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if p_merge and exists (select 1 from public.docs where path = p_path) then
    update public.docs set data = public.cat_deep_merge(data, p_data) where path = p_path;
  else
    insert into public.docs (path, data) values (p_path, p_data)
      on conflict (path) do update set data = excluded.data;
  end if;
end $$;

create or replace function public.doc_update(p_path text, p_patch jsonb) returns void
language plpgsql security invoker set search_path = public as $$
begin
  update public.docs set data = data || p_patch where path = p_path;
  if not found then raise exception 'not-found: %', p_path; end if;
end $$;

grant execute on function public.doc_set(text, jsonb, boolean), public.doc_update(text, jsonb) to authenticated;
grant select, insert, update, delete on public.docs to authenticated;

-- ---------- Realtime ----------
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;
