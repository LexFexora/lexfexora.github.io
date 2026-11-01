// Supabase Edge Function "xendit-webhook": dipanggil Xendit saat tagihan dibayar.
// Matikan "Verify JWT" untuk fungsi ini (Xendit tidak mengirim token Supabase).
// Rahasia (Supabase > Edge Functions > Secrets):
//   XENDIT_SECRET_KEY      kunci rahasia Xendit
//   XENDIT_CALLBACK_TOKEN  "Verification token" dari Xendit (Settings > Webhooks)
// Pembayaran selalu dicek ulang langsung ke Xendit sebelum akses dibuka.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ok = (t = "ok", s = 200) => new Response(t, { status: s });
const LUNAS = ["PAID", "SETTLED"];

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok();
  const tok = Deno.env.get("XENDIT_CALLBACK_TOKEN"), key = Deno.env.get("XENDIT_SECRET_KEY");
  if (!tok || !key || req.headers.get("x-callback-token") !== tok) return ok("forbidden", 403);
  const b = await req.json().catch(() => null);
  if (!b?.id || !b?.external_id) return ok("bad request", 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  if (!LUNAS.includes(b.status)) {
    if (b.status === "EXPIRED") {
      await admin.from("cat_beli").update({ status: "kedaluwarsa" }).eq("order_id", b.external_id).eq("status", "menunggu");
    }
    return ok("ignored");
  }

  // Cek ulang ke Xendit: status, nomor pesanan, dan jumlah harus cocok.
  const r = await fetch("https://api.xendit.co/v2/invoices/" + encodeURIComponent(b.id), {
    headers: { Authorization: "Basic " + btoa(key + ":") },
  });
  const inv = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("xendit", r.status, inv);
    return ok("retry", 502); // Xendit akan mengirim ulang
  }
  if (!LUNAS.includes(inv.status) || inv.external_id !== b.external_id) return ok("ignored");

  const { data: o } = await admin.from("cat_beli").select("nominal").eq("order_id", inv.external_id).maybeSingle();
  if (!o) return ok("unknown order");
  if (Number(inv.paid_amount ?? inv.amount) < o.nominal) return ok("amount mismatch");

  const { error } = await admin.rpc("cat_beli_lunas", { p_order: inv.external_id, p_invoice: inv.id });
  if (error) {
    console.error("db", error);
    return ok("error", 500);
  }
  return ok();
});
