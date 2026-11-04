-- CAT Lex Fexora: pembaruan 12. Vital Test Record hanya untuk akun yang bisa membuka Prediction Packages
-- dan Category Packages (pemilik dan pembeli aktif). Aman dijalankan ulang.
-- Jalankan sekali di Supabase > SQL Editor > New query > tempel seluruh isi > Run.

drop policy if exists cat_arsip_baca on public.cat_arsip;
create policy cat_arsip_baca on public.cat_arsip for select to authenticated
  using (public.cat_is_owner() or public.cat_sudah_beli());

create or replace function public.cat_arsip_rekam(p_id text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not (public.cat_is_owner() or public.cat_sudah_beli()) then raise exception 'akses ditolak'; end if;
  if p_id is null or p_id !~ '^Q[0-9]{3,6}$' then raise exception 'id soal tidak valid'; end if;
  insert into public.cat_arsip (id, t, oleh, aktif) values (p_id, clock_timestamp(), auth.uid(), true)
  on conflict (id) do update set t = clock_timestamp(), oleh = auth.uid(), aktif = true
    where public.cat_arsip.aktif = false;
  return true;
end $$;

create or replace function public.cat_arsip_hapus(p_id text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not (public.cat_is_owner() or public.cat_sudah_beli()) then return false; end if;
  update public.cat_arsip set aktif = false
   where id = p_id and aktif and (oleh = auth.uid() or public.cat_is_owner());
  return found;
end $$;

revoke all on function public.cat_arsip_rekam(text), public.cat_arsip_hapus(text) from public, anon;
grant execute on function public.cat_arsip_rekam(text), public.cat_arsip_hapus(text) to authenticated;
