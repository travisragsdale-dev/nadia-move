// Edge Function "claude": lets signed-in members use Claude (intro letter, "fill the form").
// Needs the secret ANTHROPIC_API_KEY (Edge Functions → Secrets). Optional: CLAUDE_MODEL, CLAUDE_QUICK_MODEL.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "Claude isn't set up yet" }, 503);

  // Only signed-in members may call this.
  const auth = req.headers.get("Authorization") || "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: ok, error } = await sb.rpc("is_member");
  if (error || ok !== true) return json({ error: "not allowed" }, 403);

  let body: { prompt?: string; quick?: boolean; json?: boolean };
  try { body = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  const prompt = String(body.prompt || "").slice(0, 12000);
  if (!prompt) return json({ error: "empty" }, 400);

  const model = body.quick
    ? Deno.env.get("CLAUDE_QUICK_MODEL") || "claude-haiku-4-5"
    : Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-4-5";

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
  });
  if (r.status === 429) return json({ error: "rate limited" }, 429);
  if (!r.ok) return json({ error: "Claude error " + r.status }, 502);
  const out = await r.json();
  const text = (out.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  return json({ text });
});
