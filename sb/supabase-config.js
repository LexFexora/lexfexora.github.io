// Konfigurasi Supabase proyek "lexfexora". Kunci publishable memang publik; keamanan diatur oleh RLS (supabase-schema.sql).
window.SUPABASE_CONFIG = {
  url: "https://rtizfrtzkllqyjnjzggh.supabase.co",
  key: "sb_publishable_OEQVpof7oIhAs7U8-sdfPg_scRFhKhH"
};
// Dibaca halaman lama sebagai tanda situs sudah dikonfigurasi.
window.FIREBASE_CONFIG = { apiKey: "supabase" };
// Email Google pemilik: harus sama dengan email di supabase-schema.sql.
window.OWNER_EMAIL = "febriankusumaa@gmail.com";
// Firebase lama: hanya dipakai tombol "Pulihkan riwayat lama" untuk menyalin progres pengguna.
window.FIREBASE_LAMA = {
  apiKey: "AIzaSyCaSFcNSQ47Vc2O80mZtylHokYUW4HprRs",
  authDomain: "lexfexora.firebaseapp.com",
  projectId: "lexfexora",
  appId: "1:824846551547:web:a8518b2a025770aadda35e"
};
