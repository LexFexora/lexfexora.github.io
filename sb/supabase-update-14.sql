-- CAT Lex Fexora: pembaruan 14. Pemilik boleh MEMBACA progres/<uid> semua pengguna,
-- agar tombol "Skor" di panel Disetujui menampilkan riwayat pengguna (bukan "Belum ada soal").
-- Pengguna lain tetap hanya bisa membaca progres miliknya sendiri. Tidak ada perubahan izin tulis.
-- Isinya sama dengan pembaruan 2; aman dijalankan ulang walau pembaruan 2 sudah pernah dijalankan.
-- Jalankan sekali di Supabase > SQL Editor > New query > tempel seluruh isi > Run.

drop policy if exists cat_select on public.docs;
create policy cat_select on public.docs for select to authenticated using (
  case split_part(path, '/', 1)
    when 'izin'    then public.cat_is_owner() or split_part(path, '/', 2) = public.cat_uid()
    when 'progres' then public.cat_is_owner() or (split_part(path, '/', 2) = public.cat_uid() and public.cat_approved())
    when 'bank'    then public.cat_is_owner() or public.cat_approved()
    when 'tryout'  then true
    else false end);

-- Hasil yang diharapkan: jumlah dokumen progres (semua pengguna) terlihat oleh pemilik di panel Skor.
select count(*) as jumlah_progres from public.docs where col = 'progres';
