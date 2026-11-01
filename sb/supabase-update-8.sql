-- CAT Lex Fexora: pembaruan 8. Situs hanya untuk pemilik dan pembeli yang sudah lunas.
-- Akun berstatus "disetujui" yang belum membeli tidak bisa lagi membaca bank soal (dicek di server, bukan hanya di tampilan).
create or replace function public.cat_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.docs
                 where path = 'izin/' || auth.uid()::text and data ->> 'status' = 'disetujui')
     and exists (select 1 from public.cat_beli where uid = auth.uid() and status = 'lunas')
$$;
