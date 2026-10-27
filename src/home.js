(() => {
"use strict";
const S = window.__S;
const { esc } = S.ui;
const $ = (s, el = document) => el.querySelector(s);
const DAY = 864e5;
const d = (iso) => new Date(iso + "T12:00:00");
const fmt = (iso) => d(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const today = () => { const t = new Date(); t.setHours(12, 0, 0, 0); return t; };
const daysTo = (iso) => Math.round((d(iso) - today()) / DAY);

/* Dates from the move plan */
const TARGET = "2027-02-01";
const PHASES = [
  { id: "ready", name: "Get ready", to: "2026-11-21" },
  { id: "plan", name: "Plan the move", to: "2027-01-05" },
  { id: "drive", name: "Drive", to: "2027-01-15" },
  { id: "find", name: "Find a place", to: "2027-02-28" },
];

/* The step list. `auto` marks a step done from what she's filled in. */
const STEPS = [
  { id: "credit", phase: "ready", due: "2026-11-08", what: "Check your credit score", how: "Free at annualcreditreport.com or your bank app", auto: () => { const c = S.getGuide?.("renter").answers?.credit; return !!c && c !== "I'll check it"; } },
  { id: "parent", phase: "ready", due: "2026-11-08", what: "Ask a parent about being your guarantor" },
  { id: "budget", phase: "ready", due: "2026-11-08", what: "Work out your savings goal", guide: "budget", auto: () => !!S.getGuide?.("budget").done },
  { id: "pets", phase: "ready", due: "2026-11-15", what: "Make the pet résumé", guide: "pets", auto: () => !!S.getGuide?.("pets").done },
  { id: "renter", phase: "ready", due: "2026-11-15", what: "Make your renter profile", guide: "renter", auto: () => !!S.getGuide?.("renter").done },
  { id: "hc", phase: "ready", due: "2026-11-15", what: "Create a Housing Connect account", how: "housingconnect.nyc.gov", auto: () => S.getGuide?.("afford").answers?.hc === "Yes" },
  { id: "afford", phase: "ready", due: "2026-11-15", what: "Check affordable housing programs", guide: "afford", auto: () => !!S.getGuide?.("afford").done },
  { id: "guarantor", phase: "ready", due: "2026-11-21", what: "Get pre-approved by a guarantor service", how: "Only if a parent can't sign" },
  { id: "car", phase: "ready", due: "2026-11-21", what: "Decide if the car comes to NYC" },
  { id: "quotes", phase: "plan", due: "2026-11-30", what: "Get truck or container quotes" },
  { id: "book", phase: "plan", due: "2026-12-12", what: "Book the truck or container" },
  { id: "jobletter", phase: "plan", due: "2026-12-19", what: "Get a job letter from the restaurant" },
  { id: "vet", phase: "plan", due: "2027-01-02", what: "Vet visit before the drive" },
  { id: "drive", phase: "drive", due: "2027-01-15", what: "Drive to NYC with the pets" },
  { id: "apply", phase: "find", due: "2027-01-25", what: "Apply for apartments" },
  { id: "lease", phase: "find", due: "2027-02-01", what: "Sign your lease" },
  { id: "dmv", phase: "find", due: "2027-02-14", what: "Get a NY driver's license" },
  { id: "doglic", phase: "find", due: "2027-02-28", what: "Get the dog's NYC license" },
];
const isDone = (st) => !!(S.checklist?.done || {})[st.id] || !!st.auto?.();
const phaseNow = () => PHASES.find((p) => today() <= d(p.to)) || PHASES[PHASES.length - 1];

/* 30 encouraging notes, one per day, in order (same list as the daily email) */
const NOTES = [
  "You can do this.",
  "One step at a time.",
  "You've got this.",
  "Small steps still move you forward.",
  "Little by little, it's coming together.",
  "One thing today is enough.",
  "Keep going. You're closer than you think.",
  "Every step counts.",
  "You're doing great.",
  "Slow progress is still progress.",
  "You've done hard things before.",
  "Take it one day at a time.",
  "You're on your way.",
  "Breathe. There's a plan.",
  "Proud of you for showing up today.",
  "New York, here you come.",
  "You don't have to do it all today.",
  "Trust the process. It's working.",
  "Done is better than perfect.",
  "Your future place is out there.",
  "One box, one form, one step.",
  "You're braver than this feels.",
  "Rest counts too.",
  "It's okay to go slow.",
  "Every yes starts with trying.",
  "You belong in this city.",
  "Today's step is tomorrow's head start.",
  "Keep your eyes on February.",
  "You're building something good.",
  "Almost home."
];
function dailyNote() {
  const iso = new Date().toLocaleDateString("en-CA");
  const n = Math.round(Date.parse(iso + "T00:00:00Z") / DAY);
  return NOTES[n % NOTES.length];
}
function ring(frac, label) {
  const r = 18, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac || 0));
  return `<svg class="ring" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="${r}" class="trk"/>${f > 0 ? `<circle cx="22" cy="22" r="${r}" class="val" stroke-dasharray="${(f * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 22 22)"/>` : ""}</svg><span class="sr">${esc(label)}</span>`;
}

function renderHome() {
  const el = $("#homeEl"); if (!el || S.view !== "home") return;
  const now = phaseNow(), idx = PHASES.indexOf(now);
  const days = Math.max(0, daysTo(TARGET));
  const open = STEPS.filter((s) => !isDone(s)).sort((a, b) => a.due.localeCompare(b.due));
  const next = open[0];
  const doneN = STEPS.length - open.length;

  const rows = S.guideRows ? S.guideRows() : [];
  const gDone = rows.filter((r) => r.d.done).length;
  const budget = S.getGuide?.("budget");
  let savedFrac = null;
  if (budget?.done && S.budgetCalc) { const b = S.budgetCalc(budget.answers || {}); savedFrac = b.need ? (Number(budget.answers?.saved) || 0) / b.need : 0; }
  const all = [...S.listings.values()];
  const fresh = all.filter((l) => (l.listedAt || 0) >= Date.now() - 2 * DAY).length;

  el.innerHTML = `
    <div class="h-hello">
      <p>Hi${S.cfg?.().her ? " " + esc(S.cfg().her) : ""}</p>
      <div class="h-count"><b class="tnum">${days}</b><div class="h-side"><span>days until move-in</span><p class="h-msg">${esc(dailyNote())}</p></div></div>
    </div>

    <ol class="journey" aria-label="Where you are">
      ${PHASES.map((p, i) => `<li class="${i < idx ? "past" : i === idx ? "now" : ""}"${i === idx ? ' aria-current="step"' : ""}><i></i><span>${esc(p.name)}</span></li>`).join("")}
    </ol>

    ${next ? `<div class="h-next">
      <span class="h-lbl">Your next step</span>
      <h2>${esc(next.what)}</h2>
      ${next.how ? `<p>${esc(next.how)}</p>` : ""}
      <div class="btnrow">
        ${next.guide ? `<button class="btn primary" data-guide="${next.guide}">Start</button>` : `<button class="btn primary" data-done="${next.id}">Done</button>`}
      </div>
    </div>` : `<div class="h-next"><span class="h-lbl">All done</span><h2>Welcome to New York.</h2></div>`}
    <button class="h-all" id="allSteps"><span>View all steps</span><small class="tnum">${doneN} of ${STEPS.length} done</small><i aria-hidden="true">→</i></button>

    <div class="h-stats">
      <button data-go="guides">${ring(gDone / (rows.length || 4), `${gDone} of 4 guides done`)}<b class="tnum">${gDone}/${rows.length || 4}</b><span>Guides</span></button>
      <button data-go="budget">${ring(savedFrac, savedFrac == null ? "Savings not set up" : `${Math.round(savedFrac * 100)}% saved`)}<b class="tnum">${savedFrac == null ? "—" : Math.min(100, Math.round(savedFrac * 100)) + "%"}</b><span>Saved</span></button>
      <button data-go="search">${ring(all.length ? 1 : 0, `${all.length} apartments`)}<b class="tnum">${all.length}</b><span>${fresh ? `${fresh} new` : "Apartments"}</span></button>
    </div>`;

  el.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => {
    const g = b.dataset.go;
    if (g === "budget") S.openRunner("budget", S.getGuide("budget").done ? { finish: true } : {});
    else S.setView(g);
  }));
  el.querySelectorAll("[data-guide]").forEach((b) => (b.onclick = () => S.openRunner(b.dataset.guide)));
  el.querySelectorAll("[data-done]").forEach((b) => (b.onclick = () => toggleStep(b.dataset.done, true)));
  $("#allSteps", el)?.addEventListener("click", () => S.setView("steps"));
}

function stepRow(st) {
  const done = isDone(st), auto = !!st.auto?.(), n = daysTo(st.due);
  const late = !done && n < 0;
  return `<label class="srow${done ? " done" : ""}"><input type="checkbox" data-step="${st.id}" ${done ? "checked" : ""} ${auto ? "disabled" : ""}>
    <span>${esc(st.what)}${st.how && !done ? `<em>${esc(st.how)}</em>` : ""}</span>${st.guide && !done ? `<button class="rd-fix" data-sguide="${st.guide}">Start</button>` : `<small class="${late ? "late" : ""}">${done ? "" : late ? "Late" : "by " + fmt(st.due)}</small>`}</label>`;
}
function renderSteps() {
  const el = $("#stepsEl"); if (!el || S.view !== "steps") return;
  const doneN = STEPS.filter(isDone).length;
  el.innerHTML = `
    <button class="backlink" id="stepsBack">← Home</button>
    <div class="s-head"><h2>All steps</h2><p>Do these in any order. Tick them off as you go.</p>
      <div class="meter${doneN === STEPS.length ? " full" : ""}" role="progressbar" aria-valuemin="0" aria-valuemax="${STEPS.length}" aria-valuenow="${doneN}"><i style="width:${Math.round((doneN / STEPS.length) * 100)}%"></i></div>
      <small class="muted tnum">${doneN} of ${STEPS.length} done</small></div>
    ${PHASES.map((p) => { const list = STEPS.filter((s) => s.phase === p.id); const n = list.filter(isDone).length;
      return `<div class="sgroup card"><div class="sg-head"><h3>${esc(p.name)}</h3><small class="muted tnum">${n}/${list.length}</small></div>${list.map(stepRow).join("")}</div>`; }).join("")}`;
  $("#stepsBack", el).onclick = () => S.setView("home");
  el.querySelectorAll("[data-step]").forEach((c) => (c.onchange = () => { toggleStep(c.dataset.step, c.checked, true); renderSteps(); }));
  el.querySelectorAll("[data-sguide]").forEach((b) => (b.onclick = (e) => { e.preventDefault(); S.openRunner(b.dataset.sguide); }));
}
S.renderSteps = renderSteps;
function toggleStep(id, on, quiet) {
  const cur = S.checklist || {};
  const next = { done: Object.assign({}, cur.done || {}, { [id]: on }), by: Object.assign({}, cur.by || {}, { [id]: on ? S.me.id || null : null }) };
  S.checklist = next;
  if (!quiet) renderHome();
  if (on) S.toast("Nice. One less thing.");
  if (!S.db) return;
  S.queueWrite("checklist/main", async () => { await S.db.doc("checklist/main").set(next); S.wroteOK = true; });
}
S.renderHome = renderHome;
const _rh = S.renderHome; S.renderHome = () => { _rh(); renderSteps(); };
renderHome();
})();
