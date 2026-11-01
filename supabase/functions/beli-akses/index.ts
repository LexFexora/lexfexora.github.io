// Supabase Edge Function "beli-akses": membuat tagihan Xendit (Virtual Account / QRIS) untuk akun yang sedang login.
// Rahasia (diatur di Supabase > Edge Functions > Secrets, JANGAN ditaruh di situs):
//   XENDIT_SECRET_KEY  kunci rahasia Xendit (Settings > API Keys), mulai dengan xnd_production_ atau xnd_development_
// SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY disediakan otomatis oleh Supabase.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SITUS = "https://lexfexora.github.io/";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const key = Deno.env.get("XENDIT_SECRET_KEY");
  if (!key) return json({ error: "belum_aktif" }, 503);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: au, error: ue } = await admin.auth.getUser(jwt);
  const user = au?.user;
  if (ue || !user) return json({ error: "login" }, 401);

  // Sudah lunas: tidak perlu bayar lagi.
  const { data: sudah } = await admin.from("cat_beli").select("order_id").eq("uid", user.id).eq("status", "lunas").limit(1);
  if (sudah?.length) return json({ lunas: true });

  const { data: cfg } = await admin.from("cat_bayar").select("nominal").eq("id", "paket").maybeSingle();
  const nominal = Math.floor(Number(cfg?.nominal) || 0);
  if (nominal < 10000) return json({ error: "belum_aktif" }, 503);

  // Tagihan yang belum dibayar (kurang dari 23 jam, harga sama) dipakai ulang agar tidak menumpuk.
  const batas = new Date(Date.now() - 23 * 3600e3).toISOString();
  const { data: lama } = await admin.from("cat_beli").select("invoice_url")
    .eq("uid", user.id).eq("status", "menunggu").eq("nominal", nominal).gt("dibuat", batas)
    .order("dibuat", { ascending: false }).limit(1);
  if (lama?.[0]?.invoice_url) return json({ url: lama[0].invoice_url });

  const order = `LF-${user.id.slice(0, 8)}-${Date.now()}`;
  const r = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(key + ":"), "Content-Type": "application/json" },
    body: JSON.stringify({
      external_id: order,
      amount: nominal,
      currency: "IDR",
      payer_email: user.email || undefined,
      description: "Akses Prediction Packages - CAT Lex Fexora",
      invoice_duration: 86400,
      success_redirect_url: SITUS + "?bayar=ok",
      failure_redirect_url: SITUS + "?bayar=gagal",
    }),
  });
  const inv = await r.json().catch(() => ({}));
  if (!r.ok || !inv.invoice_url) {
    console.error("xendit", r.status, inv);
    return json({ error: "gateway" }, 502);
  }
  const { error: ie } = await admin.from("cat_beli").insert({
    order_id: order, uid: user.id, email: user.email || "", nominal, invoice_id: inv.id, invoice_url: inv.invoice_url,
  });
  if (ie) {
    console.error("db", ie);
    return json({ error: "db" }, 500);
  }
  return json({ url: inv.invoice_url });
});
