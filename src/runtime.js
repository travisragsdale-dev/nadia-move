/* Runtime: sign-in plus a small data layer on Supabase.
   It offers the same calls the app was written against (db, user, sample, downloads),
   so the rest of the code doesn't need to know where the data lives. */
(() => {
"use strict";
const CFG = window.MOVE_CONFIG || {};
// Read the sign-in link's tokens right away, before the app's page router replaces the #hash.
let hashTokens = null, hashError = null;
if (/access_token=|error_description=/.test(location.hash)) {
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.get("access_token") && p.get("refresh_token")) hashTokens = { access_token: p.get("access_token"), refresh_token: p.get("refresh_token") };
  else hashError = p.get("error_description") || "sign-in failed";
  history.replaceState(null, "", location.pathname + location.search + "#home");
}
const sb = window.supabase.createClient(CFG.url, CFG.key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "implicit" },
});
window.__sb = sb;

let member = null, authUser = null;
let readyResolve; const ready = new Promise((r) => (readyResolve = r));
const err = (code, message) => Object.assign(new Error(message || code), { code });

/* ---------- sign-in gate ---------- */
const gate = document.createElement("div");
gate.id = "gate";
gate.innerHTML = `<div class="gate-card">
  <span class="bullet" aria-hidden="true">M</span>
  <h1>NYC Move</h1>
  <div id="gStep1">
    <p>Sign in with your email. We'll send you a code.</p>
    <form id="gEmailForm"><label class="sr" for="gEmail">Email</label>
      <input id="gEmail" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required>
      <button class="btn primary" type="submit">Send code</button></form>
  </div>
  <div id="gStep2" hidden>
    <p id="gSent"></p>
    <form id="gCodeForm"><label class="sr" for="gCode">Code</label>
      <input id="gCode" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="8" placeholder="123456" required>
      <button class="btn primary" type="submit">Sign in</button></form>
    <button class="linkbtn" id="gBack" type="button">Use a different email</button>
  </div>
  <p class="gate-msg" id="gMsg" role="status"></p>
</div>`;
const showGate = (on) => { gate.hidden = !on; document.getElementById("app")?.toggleAttribute("inert", on); };
const gmsg = (t) => { gate.querySelector("#gMsg").textContent = t || ""; };
document.addEventListener("DOMContentLoaded", () => document.body.appendChild(gate));
if (document.body) document.body.appendChild(gate);

let pendingEmail = "";
gate.querySelector("#gEmailForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  pendingEmail = gate.querySelector("#gEmail").value.trim().toLowerCase();
  if (!pendingEmail) return;
  gmsg("Sending…");
  const { error } = await sb.auth.signInWithOtp({ email: pendingEmail, options: { emailRedirectTo: location.origin + location.pathname } });
  if (error) { gmsg(error.status === 429 ? "Too many tries. Wait a minute and try again." : "Couldn't send the code. Check the email and try again."); return; }
  gmsg("");
  gate.querySelector("#gSent").textContent = `We emailed a code to ${pendingEmail}. Enter it here.`;
  gate.querySelector("#gStep1").hidden = true; gate.querySelector("#gStep2").hidden = false;
  gate.querySelector("#gCode").focus();
});
gate.querySelector("#gCodeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = gate.querySelector("#gCode").value.replace(/\D/g, "");
  gmsg("Checking…");
  const { error } = await sb.auth.verifyOtp({ email: pendingEmail, token, type: "email" });
  if (error) gmsg("That code didn't work. Check it, or send a new one.");
});
gate.querySelector("#gBack").addEventListener("click", () => {
  gate.querySelector("#gStep1").hidden = false; gate.querySelector("#gStep2").hidden = true; gmsg("");
});
window.__signOut = async () => { await sb.auth.signOut(); location.reload(); };

async function onSession(session) {
  if (!session?.user) { showGate(true); return; }
  if (authUser?.id === session.user.id) return;
  authUser = session.user;
  const { data, error } = await sb.rpc("claim_member");
  if (error || !data) {
    showGate(true);
    gate.querySelector("#gStep1").hidden = false; gate.querySelector("#gStep2").hidden = true;
    gmsg(`${authUser.email} isn't on the list for this page.`);
    await sb.auth.signOut(); authUser = null; return;
  }
  member = data;
  showGate(false);
  readyResolve();
}
sb.auth.onAuthStateChange((_evt, session) => { setTimeout(() => onSession(session), 0); });
(async () => {
  if (hashTokens) {
    const { error } = await sb.auth.setSession(hashTokens);
    if (error) { showGate(true); gmsg("That sign-in link didn't work. Send a new one."); }
  } else if (hashError) {
    showGate(true);
    gmsg(/expired|invalid/i.test(hashError) ? "That link expired or was already used. Send a new one." : "Sign-in didn't work. Send a new link.");
  }
  const { data } = await sb.auth.getSession();
  onSession(data.session);
})();

/* ---------- db ---------- */
const cols = new Map(); // coll -> { rows: Map(id -> data), loaded: Promise, subs: Set(fn) }
const docSubs = new Map(); // "coll/id" -> Set(fn)
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const split = (path) => { const i = path.indexOf("/"); return [path.slice(0, i), path.slice(i + 1)]; };
const docSnap = (id, data) => ({ id, exists: data != null, data: () => clone(data) ?? undefined });

function col(coll) {
  let c = cols.get(coll);
  if (!c) {
    c = { rows: new Map(), subs: new Set(), timer: 0 };
    c.loaded = (async () => {
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from("docs").select("id,data").eq("coll", coll).range(from, from + 999);
        if (error) throw err("unavailable", error.message);
        for (const r of data) c.rows.set(r.id, r.data);
        if (data.length < 1000) break;
      }
    })();
    cols.set(coll, c);
  }
  return c;
}
function notify(coll, id) {
  const c = cols.get(coll); if (!c) return;
  clearTimeout(c.timer);
  c.timer = setTimeout(() => {
    const snap = { docs: [...c.rows].map(([i, d]) => docSnap(i, d)) };
    c.subs.forEach((fn) => { try { fn(snap); } catch (e) { console.error(e); } });
  }, 60);
  const ds = docSubs.get(coll + "/" + id);
  if (ds) { const d = c.rows.get(id); ds.forEach((fn) => { try { fn(docSnap(id, d)); } catch (e) { console.error(e); } }); }
}
let channel = null;
function live() {
  if (channel) return;
  channel = sb.channel("docs-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "docs" }, (p) => {
      if (p.eventType === "DELETE") {
        const { coll, id } = p.old || {}; const c = cols.get(coll); if (!c) return;
        c.rows.delete(id); notify(coll, id);
      } else {
        const { coll, id, data } = p.new || {}; const c = cols.get(coll); if (!c) return;
        c.rows.set(id, data); notify(coll, id);
      }
    })
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { channel = null; setTimeout(live, 4000); }
    });
}
// Catch up after the phone wakes or the tab comes back.
document.addEventListener("visibilitychange", async () => {
  if (document.hidden || !member) return;
  for (const [coll, c] of cols) {
    const { data, error } = await sb.from("docs").select("id,data").eq("coll", coll).limit(5000);
    if (error) continue;
    const seen = new Set();
    for (const r of data) { seen.add(r.id); c.rows.set(r.id, r.data); }
    for (const id of [...c.rows.keys()]) if (!seen.has(id)) c.rows.delete(id);
    notify(coll, "");
  }
});

const writeErr = (error) => {
  if (!error) return;
  if (error.code === "42501" || /row-level security/i.test(error.message || "")) throw err("invalid_argument", error.message);
  throw err("unavailable", error.message);
};
function docRef(path) {
  const [coll, id] = split(path);
  const c = () => col(coll);
  return {
    id,
    async get() { await c().loaded; return docSnap(id, c().rows.get(id)); },
    async set(data) {
      const { error } = await sb.from("docs").upsert({ coll, id, data, updated_at: new Date().toISOString(), updated_by: authUser?.id });
      writeErr(error); c().rows.set(id, clone(data)); notify(coll, id);
    },
    async update(patch) {
      const { data, error } = await sb.rpc("doc_merge", { p_coll: coll, p_id: id, p_patch: patch });
      writeErr(error); if (data) { c().rows.set(id, data); notify(coll, id); }
    },
    async delete() {
      const { error } = await sb.from("docs").delete().eq("coll", coll).eq("id", id);
      writeErr(error); c().rows.delete(id); notify(coll, id);
    },
    onSnapshot(fn, onErr) {
      const key = coll + "/" + id;
      if (!docSubs.has(key)) docSubs.set(key, new Set());
      docSubs.get(key).add(fn); live();
      c().loaded.then(() => fn(docSnap(id, c().rows.get(id)))).catch((e) => onErr?.(e));
      return () => docSubs.get(key).delete(fn);
    },
  };
}
const db = {
  doc: docRef,
  collection(coll) {
    return {
      doc: (id) => docRef(coll + "/" + id),
      async get() { const c = col(coll); await c.loaded; return { docs: [...c.rows].map(([i, d]) => docSnap(i, d)) }; },
      onSnapshot(fn, onErr) {
        const c = col(coll); c.subs.add(fn); live();
        c.loaded.then(() => fn({ docs: [...c.rows].map(([i, d]) => docSnap(i, d)) })).catch((e) => onErr?.(e));
        return () => c.subs.delete(fn);
      },
    };
  },
};

/* ---------- people ---------- */
const COLORS = ["#34995c", "#2f7fb6", "#b65a2f", "#8a4fb3"];
const avatar = (name, i) => {
  const ch = (name || "?").trim().charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="${COLORS[i % COLORS.length]}"/><text x="20" y="26" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#fff" text-anchor="middle">${ch}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
};
let membersP = null;
const members = () => (membersP ||= sb.from("members").select("user_id,name,email").then(({ data }) => data || []));
const user = {
  async me() { return { id: authUser.id, name: member?.name || authUser.email, email: authUser.email, avatarUrl: avatar(member?.name || authUser.email, 0) }; },
  async profiles(ids) {
    const list = await members(); const out = {};
    list.forEach((m, i) => { if (m.user_id && ids.includes(m.user_id)) out[m.user_id] = { name: m.name || m.email, avatarUrl: avatar(m.name || m.email, i) }; });
    return out;
  },
  async can() { return true; },
};

/* ---------- Claude (through a private server function) ---------- */
async function ask(prompt, opts = {}, json = false) {
  if (opts.signal?.aborted) throw err("cancelled");
  const call = sb.functions.invoke("claude", { body: { prompt, quick: opts.modelTier === "quick", json } });
  const aborted = new Promise((_, rej) => opts.signal?.addEventListener("abort", () => rej(err("cancelled")), { once: true }));
  const { data, error } = await Promise.race([call, aborted]);
  if (error) {
    const status = error.context?.status;
    throw err(status === 429 ? "rate_limited" : status === 503 ? "sampling_disabled" : "failed", error.message);
  }
  return data;
}
const sample = async (prompt, opts = {}) => {
  const { text } = await ask(prompt, opts);
  opts.onText?.({ text });
  return { text };
};
sample.json = async (prompt, opts = {}) => {
  const { text } = await ask(prompt, opts, true);
  const m = String(text || "").match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
};

/* ---------- downloads ---------- */
const downloads = {
  async save({ filename, data }) {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename || "download";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return { status: "saved" };
  },
};

// Claude features (intro letter, "fill the form") stay hidden unless MOVE_CONFIG.ai is true.
const mods = CFG.ai ? { db, user, sample, downloads } : { db, user, downloads };
window.claude = { use: async (name) => { await ready; if (!mods[name]) throw err("not_granted"); return mods[name]; } };
})();
