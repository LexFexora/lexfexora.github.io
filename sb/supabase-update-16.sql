-- CAT Lex Fexora: pembaruan 16 (fitur penjualan dihapus). Aman dijalankan ulang.
-- Jalankan sekali di Supabase > SQL Editor > New query > tempel seluruh isi > Run.
-- Tidak ada lagi pembelian dari situs: transfer bank dan tagihan Xendit dimatikan di server.
-- Akun VVIP yang sudah ada (pembeli lunas dan paket gratis) TIDAK berubah. Tombol "Beri VVIP Akses" tetap jalan.

-- Pembeli tidak bisa lagi membuat pesanan transfer, dan tombol konfirmasi transfer dihapus.
drop function if exists public.cat_beli_transfer(text);
drop function if exists public.cat_beli_konfirmasi(text, boolean);

-- Pesanan yang masih menunggu dibatalkan (bukan pembeli lunas, jadi tidak memengaruhi VVIP).
update public.cat_beli set status = 'batal' where status = 'menunggu';

-- Harga, rekening, dan nomor WhatsApp penjualan dikosongkan. Baris 'perbaikan' (mode perbaikan) tidak disentuh.
update public.cat_bayar set nominal = 0, harga = '', url = '', rekening = '', wa = '', diubah = now() where id = 'paket';

notify pgrst, 'reload schema';
