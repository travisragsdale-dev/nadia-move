(() => {
"use strict";
const S = window.__S;
const { esc, money } = S.ui;
const $ = (s, el = document) => el.querySelector(s);
const num = (v) => (v === "" || v == null || isNaN(Number(v))) ? 0 : Number(v);
const has = (v) => !(v == null || v === "" || (Array.isArray(v) && !v.length));
const ICON = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 11 12 4l8 7v9H4v-9Z"/><path d="M10 20v-5h4v5"/></svg>`,
  paw: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="10" r="2"/><circle cx="10" cy="6" r="2"/><circle cx="14" cy="6" r="2"/><circle cx="18" cy="10" r="2"/><path d="M12 11c3 0 6 4 6 6.5 0 1.5-1.2 2.5-2.7 2.5-1.2 0-2.1-.6-3.3-.6s-2.1.6-3.3.6C7.2 20 6 19 6 17.5 6 15 9 11 12 11Z"/></svg>`,
  coin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M14.5 9.5c-.5-.9-1.4-1.3-2.5-1.3-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.4 5 4 0 1.1-1 1.9-2.5 1.9-1.1 0-2.1-.5-2.6-1.4M12 6.5v1.7M12 15.8v1.7"/></svg>`,
  key: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M16 7l2 2M14 9l2 2"/></svg>`,
};

/* ---------------- guide content ---------------- */
const BANDS = [[50, 47250], [60, 56700], [80, 75600], [100, 94500], [120, 113400]];
const GUIDES = [
  {
    id: "pets", title: "Pet résumé", icon: "paw", mins: 10,
    blurb: "A one-page intro to her dog and cat that shows landlords they'll be easy neighbors.",
    result: "Pet résumé PDF, with photos if she adds them",
    parts: [
      { title: "Your dog", qs: [
        { id: "dogName", type: "text", label: "What's your dog's name?", short: "Dog's name" },
        { id: "dogBreed", type: "text", label: "What breed is she or he?", short: "Breed", placeholder: "e.g. Labrador mix" },
        { id: "dogAge", type: "text", label: "How old?", short: "Age", placeholder: "e.g. 4 years" },
        { id: "dogWeight", type: "number", label: "About how much do they weigh?", short: "Weight (lb)", suffix: "lb", hint: "Many buildings set a dog weight limit, so landlords ask this first." },
        { id: "dogFixed", type: "yesno", label: "Spayed or neutered?", short: "Spayed / neutered" },
        { id: "dogTraits", type: "text", label: "Three words that describe them?", short: "Personality", placeholder: "gentle, quiet, friendly" },
        { id: "dogAlone", type: "choice", label: "How are they when left home alone?", short: "Home alone", options: ["Calm, mostly sleeps", "Crate-trained", "A little vocal at first, then settles", "Still working on it"] },
        { id: "dogTraining", type: "text", label: "Any training, or good-dog habits worth bragging about?", short: "Training", optional: true, placeholder: "e.g. house-trained, knows sit/stay, fine with elevators" },
      ] },
      { title: "Your cat", qs: [
        { id: "catName", type: "text", label: "What's your cat's name?", short: "Cat's name" },
        { id: "catAge", type: "text", label: "How old?", short: "Age" },
        { id: "catFixed", type: "yesno", label: "Spayed or neutered?", short: "Spayed / neutered" },
        { id: "catIndoor", type: "yesno", label: "Indoor-only?", short: "Indoor-only" },
        { id: "catTraits", type: "text", label: "Three words that describe them?", short: "Personality" },
      ] },
      { title: "Health & references", qs: [
        { id: "vaccines", type: "yesno", label: "Are both pets up to date on rabies and their other shots?", short: "Vaccines up to date", hint: "If you're not sure, the vet's office can email the records. That's also what landlords want to see." },
        { id: "vet", type: "text", label: "Which vet do they see? (clinic name and phone)", short: "Vet" },
        { id: "petRef", type: "text", label: "Anyone who can vouch for them? (a past landlord or neighbor, plus how to reach them)", short: "Reference", optional: true },
        { id: "insurance", type: "choice", label: "Renter's insurance with pet liability?", short: "Renter's insurance", options: ["I have it", "I'll get it before I sign", "Not sure what that is"], hint: "It covers you if a pet damages something or someone. Many landlords ask for it, and it's usually cheap." },
      ] },
    ],
  },
  {
    id: "renter", title: "Renter profile + letter", icon: "home", mins: 15,
    blurb: "Your background, job and references on one page, plus a short letter introducing you to landlords.",
    result: "Renter profile PDF and an intro letter written with Claude",
    parts: [
      { title: "About you", qs: [
        { id: "fullName", type: "text", label: "What's your full name, as it should appear on applications?", short: "Name" },
        { id: "phone", type: "tel", label: "Best phone number?", short: "Phone" },
        { id: "email", type: "email", label: "Email address?", short: "Email" },
        { id: "currentCity", type: "text", label: "Where are you living now?", short: "Currently living in", placeholder: "Minneapolis, MN" },
        { id: "moveIn", type: "choice", label: "When would you like to move in?", short: "Move-in", options: ["February 1", "February 15", "March 1", "Flexible"] },
        { id: "aboutMe", type: "long", label: "In two or three sentences, who are you?", short: "About me", hint: "What you do, what you love about NYC, what kind of neighbor you are. Rough is perfect, Claude can polish it later.", optional: true },
      ] },
      { title: "Work & income", qs: [
        { id: "restaurant", type: "text", label: "Which restaurant are you going back to?", short: "Employer" },
        { id: "role", type: "choice", label: "What will your role be?", short: "Role", options: ["Server", "Host", "Server and host", "Other"] },
        { id: "monthlyIncome", type: "money", label: "Roughly what do you make in a month there, including tips you report?", short: "Monthly income (est.)", hint: "A best guess is fine. Landlords will want pay stubs later." },
        { id: "modeling", type: "yesno", label: "Do you expect some modeling income too?", short: "Modeling income" },
        { id: "modelingMonthly", type: "money", label: "About how much per month, on average?", short: "Modeling / month", when: (a) => a.modeling === "Yes", optional: true },
        { id: "incomeDocs", type: "multi", label: "Which of these could you show a landlord?", short: "Income documents", options: ["Recent pay stubs", "Bank statements", "Last year's tax return / W-2", "A letter from the restaurant", "1099s from modeling"] },
      ] },
      { title: "History & approval", qs: [
        { id: "rentedBefore", type: "yesno", label: "Have you rented an apartment before?", short: "Rented before" },
        { id: "landlord", type: "text", label: "Who was your most recent landlord? (name and phone or email)", short: "Past landlord", when: (a) => a.rentedBefore === "Yes", optional: true },
        { id: "years", type: "choice", label: "How long have you been renting, all together?", short: "Years renting", options: ["Under a year", "1–2 years", "3–5 years", "More than 5 years"], when: (a) => a.rentedBefore === "Yes" },
        { id: "reference", type: "text", label: "One more reference? (a manager or someone who knows you, plus how to reach them)", short: "Reference", optional: true },
        { id: "credit", type: "choice", label: "Do you know your credit score range?", short: "Credit score", options: ["750 or above", "700–749", "650–699", "Below 650", "I'll check it"], hint: "It's free at annualcreditreport.com or in most bank apps. A rough range is all you need here." },
        { id: "guarantor", type: "choice", label: "How do you plan to get approved?", short: "Approval plan", options: ["A parent or relative as guarantor", "A guarantor service (Insurent / TheGuarantors)", "My own income", "Not sure yet"] },
      ] },
    ],
  },
  {
    id: "budget", title: "Budget & savings goal", icon: "coin", mins: 8,
    blurb: "See what you need saved for move-in, how much you have, and when you'll be ready.",
    result: "One-page budget sheet with a savings target date",
    parts: [
      { title: "Money coming in", qs: [
        { id: "takeHome", type: "money", label: "About how much do you take home in a month once you're back at the restaurant?", short: "Take-home / month", hint: "After taxes, including tips. A guess is fine." },
        { id: "extra", type: "money", label: "Any extra monthly income on average, like modeling?", short: "Extra / month", optional: true },
      ] },
      { title: "Money going out", qs: [
        { id: "phone", type: "money", label: "Phone bill per month?", short: "Phone" },
        { id: "car", type: "money", label: "Car costs per month? (payment, insurance, gas)", short: "Car", hint: "Put 0 if the car stays behind with nothing owed on it.", optional: true },
        { id: "petsCost", type: "money", label: "Pet costs per month? (food, litter, treats, average vet)", short: "Pets" },
        { id: "food", type: "money", label: "Groceries and eating out per month?", short: "Food" },
        { id: "other", type: "money", label: "Everything else per month? (subscriptions, loans, fun)", short: "Other", optional: true },
      ] },
      { title: "Savings", qs: [
        { id: "saved", type: "money", label: "How much do you have saved right now?", short: "Saved now", hint: "Just for you. It helps work out the gap." },
        { id: "monthlySave", type: "money", label: "How much could you set aside each month until move-in?", short: "Can save / month" },
        { id: "moving", type: "money", label: "What do you expect the move itself to cost?", short: "Moving cost", hint: "Truck or container plus gas and a hotel. If you don't know yet, $1,500 is a placeholder you can change later.", optional: true },
        { id: "rent", type: "choice", label: "What rent are you aiming for?", short: "Target rent", options: ["$1,800", "$2,000", "$2,200", "$2,400", "$2,600", "$2,800"] },
      ] },
    ],
  },
  {
    id: "afford", title: "Affordable housing check", icon: "key", mins: 6,
    blurb: "Find out which city programs fit your income and get a simple plan for applying.",
    result: "Your income bands, the programs you qualify for, and a step-by-step plan",
    parts: [
      { title: "Your household", qs: [
        { id: "size", type: "choice", label: "Who will live in the apartment?", short: "Household", options: ["Just me (and the pets)", "Me and one other person"] },
        { id: "income", type: "money", label: "About what will you earn in a year, before taxes?", short: "Yearly income (est.)", hint: "Wages + tips you report + modeling. Roughly your monthly income × 12 works." },
        { id: "incomeKinds", type: "multi", label: "Where does that money come from?", short: "Income types", options: ["Paycheck (W-2)", "Reported tips", "Freelance / modeling (1099)"] },
      ] },
      { title: "Getting set up", qs: [
        { id: "hc", type: "yesno", label: "Do you already have a NYC Housing Connect account?", short: "Housing Connect account" },
        { id: "docs", type: "multi", label: "Which documents could you pull together this week?", short: "Documents ready", options: ["Photo ID", "Last 3 pay stubs", "Last 2 months of bank statements", "Last year's tax return", "Letter from the restaurant"] },
        { id: "health", type: "choice", label: "Will the restaurant offer you health insurance?", short: "Health insurance through work", options: ["Yes", "No", "Not sure"] },
      ] },
    ],
  },
];
const byId = Object.fromEntries(GUIDES.map((g) => [g.id, g]));

/* ---------------- state + saving ---------------- */
const getDoc = (gid) => S.guides.get(gid) || { answers: {}, pos: null, done: false };
function flat(g, a) { const out = []; g.parts.forEach((p, pi) => p.qs.forEach((q) => { if (!q.when || q.when(a)) out.push({ q, p, pi }); })); return out; }
function progress(g, a) { const f = flat(g, a); const n = f.filter(({ q }) => has(a[q.id])).length; return { n, total: f.length }; }
let runner = null;
S.onGuidesSnapshot = (fresh) => {
  S.guides = fresh;
  if (S.view === "guides" && !runner) renderGuides();
  if (S.view === "home") S.renderHome?.();
};
function saveGuide(gid, patch) {
  const cur = getDoc(gid);
  const next = Object.assign({}, cur, patch, { updatedAt: Date.now(), by: S.me.id || null });
  S.guides.set(gid, next);
  if (!S.db) return Promise.resolve();
  return S.queueWrite("guides/" + gid, async () => { await S.db.doc("guides/" + gid).set(next); S.wroteOK = true; });
}

/* ---------------- hub ---------------- */
function renderGuides() {
  const el = $("#guidesEl"); if (!el) return;
  const rows = GUIDES.map((g) => { const d = getDoc(g.id); return { g, d, p: progress(g, d.answers || {}) }; });
  const inProgress = rows.filter((r) => !r.d.done && r.p.n > 0).sort((a, b) => (b.d.updatedAt || 0) - (a.d.updatedAt || 0))[0];
  const doneN = rows.filter((r) => r.d.done).length;
  const first = inProgress || rows.find((r) => !r.d.done);
  el.innerHTML = `
    <div class="hello"><h2>Hi${S.cfg?.().her ? " " + esc(S.cfg().her) : ""}.</h2>
      <p>Moving is a lot, so it's broken into small pieces here. Pick any guide, answer a few questions, and stop whenever you like. Everything saves as you go, and each guide ends with something finished.</p></div>
    ${first ? `<div class="resume"><div class="section-label">${inProgress ? "Pick up where you left off" : doneN ? "Next up" : "A good first one"}</div>
      <h3>${esc(first.g.title)}</h3>
      <div style="font-size:14.5px;opacity:.85">${inProgress ? `${first.p.n} of ${first.p.total} answered · about ${Math.max(2, Math.round(first.g.mins * (1 - first.p.n / first.p.total)))} min left` : `About ${first.g.mins} minutes · ${esc(first.g.result)}`}</div>
      <button class="btn primary" data-open="${first.g.id}">${inProgress ? "Continue" : "Start"}</button></div>`
      : `<div class="resume"><div class="section-label">All four done</div><h3>That's every guide finished.</h3><div style="font-size:14.5px;opacity:.85">Download your PDFs from each card below anytime.</div></div>`}
    <div class="guides">${rows.map(({ g, d, p }) => `
      <div class="gcard${d.done ? " done" : ""}">
        <div class="ghead"><div class="gicon">${ICON[g.icon]}</div><div><h3>${esc(g.title)}</h3><p>${esc(g.blurb)}</p></div></div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.n}" aria-label="${esc(g.title)} progress"><i style="width:${d.done ? 100 : Math.round((p.n / p.total) * 100)}%"></i></div>
        <div class="gfoot"><span>${d.done ? "Done ✓" : p.n ? `${p.n} of ${p.total} answered` : `About ${g.mins} min`}</span>
          <span class="btnrow">${d.done ? `<button class="btn" data-review="${g.id}">Open</button>` : `<button class="btn ${p.n ? "dark" : ""}" data-open="${g.id}">${p.n ? "Continue" : "Start"}</button>`}</span></div>
        <small class="muted">You'll get: ${esc(g.result)}</small>
      </div>`).join("")}</div>
    <div class="later card"><div class="section-label">More guides coming</div>
      <ul><li>Moving day plan (truck, pets on the road, the drive)</li><li>First month in NYC (license, dog license, setting up the apartment)</li></ul>
      <span>Just ask when you're ready for these.</span></div>
    <p class="muted" style="font-size:13px;margin:0">Answers are saved privately for the two of you${S.cfg?.().partner ? `, so ${esc(S.cfg().partner)} can help` : ""}. Only your two email addresses can sign in.</p>`;
  el.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => openRunner(b.dataset.open)));
  el.querySelectorAll("[data-review]").forEach((b) => (b.onclick = () => openRunner(b.dataset.review, { finish: true })));
}
S.renderGuides = renderGuides;
S.guideRows = () => GUIDES.map((g) => { const d = getDoc(g.id); return { g, d, p: progress(g, d.answers || {}) }; });
S.openRunner = (gid, o) => openRunner(gid, o);
S.budgetCalc = (a) => budgetCalc(a);
S.getGuide = (gid) => getDoc(gid);

/* ---------------- runner ---------------- */
function openRunner(gid, { finish = false, at = null } = {}) {
  const g = byId[gid]; const d = getDoc(gid);
  const answers = structuredClone(d.answers || {});
  const f = flat(g, answers);
  let i = 0;
  if (at) i = Math.max(0, f.findIndex((x) => x.q.id === at));
  else if (!finish) {
    const firstEmpty = f.findIndex((x) => !has(answers[x.q.id]));
    const posIdx = d.pos ? f.findIndex((x) => x.q.id === d.pos) : -1;
    i = posIdx >= 0 ? posIdx : (firstEmpty >= 0 ? firstEmpty : 0);
  }
  runner = { g, answers, i: finish ? f.length : i, extras: { photos: {} } };
  const host = document.createElement("div");
  host.className = "runner"; host.id = "runner"; host.setAttribute("role", "dialog"); host.setAttribute("aria-modal", "true"); host.setAttribute("aria-label", g.title);
  host.innerHTML = `<div class="rhead"><div class="row"><div><div class="t">${esc(g.title)}</div><div class="part" id="rPart"></div></div>
    <button class="btn" id="rClose">Save & close</button></div><div class="bar"><i id="rBar" style="width:0"></i></div></div>
    <div class="rbody"><div class="qwrap" id="rQ"></div></div>
    <div class="rfoot" id="rFoot"><button class="btn ghost" id="rBack">Back</button><span class="saved" id="rSaved"></span><button class="btn primary" id="rNext">Next</button></div>`;
  document.body.appendChild(host);
  $("#rClose").onclick = closeRunner;
  $("#rBack").onclick = () => { capture(); if (runner.i > 0) { runner.i--; persist(); drawQ(); } };
  $("#rNext").onclick = () => { capture(); runner.i++; persist(); drawQ(); };
  host.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && e.target.tagName === "INPUT") { e.preventDefault(); $("#rNext").click(); } });
  drawQ();
}
function closeRunner() {
  if (!runner) return; capture(); persist();
  $("#runner")?.remove(); runner = null; renderGuides(); if (S.view === "home") S.renderHome?.();
}
function current() { const f = flat(runner.g, runner.answers); return { f, item: f[runner.i] }; }
function capture() {
  const { item } = current(); if (!item) return;
  const q = item.q, box = $("#rQ");
  let v;
  if (q.type === "multi") v = [...box.querySelectorAll("input[type=checkbox]:checked")].map((x) => x.value);
  else if (q.type === "choice" || q.type === "yesno") v = box.querySelector("input[type=radio]:checked")?.value ?? "";
  else { const inp = box.querySelector("input,textarea"); v = inp ? inp.value.trim() : ""; if ((q.type === "money" || q.type === "number") && v !== "") v = Number(v); }
  runner.answers[q.id] = v;
}
let saveT;
function persist() {
  const { f } = current();
  const done = runner.i >= f.length;
  const pos = f[Math.min(runner.i, f.length - 1)]?.q.id || null;
  const was = getDoc(runner.g.id);
  const answers = structuredClone(runner.answers);
  const same = JSON.stringify(was.answers || {}) === JSON.stringify(answers) && was.pos === pos && (!!was.done === (done || !!was.done));
  if (same) return;
  saveGuide(runner.g.id, { answers, pos, done: done || !!was.done }).then(() => { const s = $("#rSaved"); if (s) { s.textContent = S.db ? "Saved" : "Not saving in this view"; clearTimeout(saveT); saveT = setTimeout(() => s && (s.textContent = ""), 1800); } });
}
function inputFor(q, v) {
  const id = "q_" + q.id;
  switch (q.type) {
    case "long": return `<textarea id="${id}" aria-label="${esc(q.label)}" placeholder="${esc(q.placeholder || "")}">${esc(v || "")}</textarea>`;
    case "money": return `<div class="money"><input id="${id}" type="number" inputmode="decimal" min="0" step="1" value="${esc(v ?? "")}" aria-label="${esc(q.label)}" placeholder="0"></div>`;
    case "number": return `<div style="display:flex;align-items:center;gap:10px"><input id="${id}" type="number" inputmode="decimal" min="0" value="${esc(v ?? "")}" aria-label="${esc(q.label)}" style="max-width:160px"><span class="muted">${esc(q.suffix || "")}</span></div>`;
    case "yesno": case "choice": {
      const opts = q.type === "yesno" ? ["Yes", "No"] : q.options;
      return `<div class="choices" role="radiogroup" aria-label="${esc(q.label)}">${opts.map((o, k) => `<label><input type="radio" name="${id}" id="${id}_${k}" value="${esc(o)}" ${v === o ? "checked" : ""}>${esc(o)}</label>`).join("")}</div>`;
    }
    case "multi": return `<div class="choices" role="group" aria-label="${esc(q.label)}">${q.options.map((o, k) => `<label><input type="checkbox" id="${id}_${k}" value="${esc(o)}" ${(v || []).includes(o) ? "checked" : ""}>${esc(o)}</label>`).join("")}</div><small class="muted">Pick all that apply.</small>`;
    default: return `<input id="${id}" type="${q.type === "email" ? "email" : q.type === "tel" ? "tel" : "text"}" value="${esc(v || "")}" placeholder="${esc(q.placeholder || "")}" aria-label="${esc(q.label)}" autocomplete="off">`;
  }
}
function drawQ() {
  const { f, item } = current();
  const total = f.length;
  $("#rBar").style.width = Math.round((Math.min(runner.i, total) / total) * 100) + "%";
  $("#rBack").disabled = runner.i === 0;
  if (!item) { drawFinish(); return; }
  const { q, p, pi } = item;
  $("#rPart").textContent = `Part ${pi + 1} of ${runner.g.parts.length} · ${p.title} · Question ${runner.i + 1} of ${total}`;
  $("#rFoot").hidden = false;
  $("#rNext").textContent = runner.i === total - 1 ? "Finish" : "Next";
  const v = runner.answers[q.id];
  $("#rQ").innerHTML = `<h2>${esc(q.label)}</h2>${q.hint ? `<p class="hint">${esc(q.hint)}</p>` : ""}${inputFor(q, v)}
    ${q.optional ? `<small class="muted">Optional. Skip it if you like.</small>` : `<small class="muted">Not sure? Skip it for now and come back later.</small>`}`;
  const first = $("#rQ").querySelector("input,textarea");
  if (first && !["radio", "checkbox"].includes(first.type)) setTimeout(() => first.focus(), 30);
  if (q.type === "yesno" || q.type === "choice") $("#rQ").querySelectorAll("input[type=radio]").forEach((r) => r.addEventListener("change", () => setTimeout(() => $("#rNext").click(), 180)));
}

/* ---------------- finish screens ---------------- */
function summaryHTML(g, a) {
  return g.parts.map((p) => {
    const rows = p.qs.filter((q) => !q.when || q.when(a)).map((q) => {
      const v = a[q.id]; const shown = !has(v) ? `<span class="muted">Skipped</span>` : esc(Array.isArray(v) ? v.join(", ") : (q.type === "money" ? money(v) : q.type === "number" ? `${v} ${q.suffix || ""}` : v));
      return `<div class="sumrow"><span class="k">${esc(q.short)}</span><button data-edit="${q.id}">Edit</button><span class="v">${shown}</span></div>`;
    }).join("");
    return `<div class="sumpart"><h3>${esc(p.title)}</h3>${rows}</div>`;
  }).join("");
}
function drawFinish() {
  const g = runner.g, a = runner.answers;
  $("#rPart").textContent = "All done. Here's what you made";
  $("#rFoot").hidden = true;
  const custom = FINISH[g.id](a);
  const left = progress(g, a); const skipped = left.total - left.n;
  $("#rQ").innerHTML = `<h2>${esc(FINISH_TITLE[g.id])}</h2>
    <p class="hint">${skipped ? `You skipped ${skipped} question${skipped > 1 ? "s" : ""}, and that's fine. Tap Edit on any answer to fill it in later.` : "Every question answered. Nice work."}</p>
    ${custom.html}
    <div class="btnrow"><button class="btn primary" id="mkPdf">Download PDF</button><button class="btn" id="fDone">Back to guides</button></div>
    <p class="muted" id="pdfMsg" style="margin:0;font-size:14px" role="status"></p>
    <div class="section-label" style="margin-top:8px">Your answers</div>
    <div class="summary">${summaryHTML(g, a)}</div>`;
  const box = $("#rQ");
  box.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => { const f = flat(g, a); runner.i = Math.max(0, f.findIndex((x) => x.q.id === b.dataset.edit)); drawQ(); }));
  $("#fDone").onclick = closeRunner;
  $("#mkPdf").onclick = () => makePdf(g.id, a, runner.extras);
  custom.wire?.(box);
}
const FINISH_TITLE = { pets: "Your pet résumé is ready", renter: "Your renter profile is ready", budget: "Here's your budget", afford: "Here's what you qualify for" };

function budgetCalc(a) {
  const income = num(a.takeHome) + num(a.extra);
  const bills = num(a.phone) + num(a.car) + num(a.petsCost) + num(a.food) + num(a.other);
  const rent = num(String(a.rent || "$2,000").replace(/[^0-9]/g, "")) || 2000;
  const moving = has(a.moving) ? num(a.moving) : 1500;
  const need = rent * 2 + moving + bills;
  const guarantor = Math.round(rent * 0.875);
  const gap = Math.max(0, need - num(a.saved));
  const months = num(a.monthlySave) > 0 ? Math.ceil(gap / num(a.monthlySave)) : null;
  const ready = months != null ? new Date(new Date().getFullYear(), new Date().getMonth() + months, 1) : null;
  return { income, bills, rent, moving, need, guarantor, gap, months, ready, left: income - rent - bills, share: income ? rent / income : null };
}
function affordCalc(a) {
  const inc = num(a.income);
  const solo = !a.size || String(a.size).startsWith("Just");
  return { inc, solo, bands: BANDS.map(([pct, max]) => ({ pct, max, ok: inc > 0 && inc <= max })), maxRent: inc ? Math.floor(inc / 36 / 25) * 25 : 0, fairFares: inc > 0 && inc <= 32000, essential: inc > 0 && inc <= 31920 };
}
const FINISH = {
  pets: () => ({
    html: `<div class="card"><div class="section-label">Optional: add photos</div><p class="muted" style="margin:0;font-size:14.5px">A friendly photo of each pet makes the résumé. Photos go into the PDF only; they aren't saved in the app.</p>
      <div class="grid2"><label class="photo-in"><span>Dog photo</span><input type="file" accept="image/*" id="phDog"></label><label class="photo-in"><span>Cat photo</span><input type="file" accept="image/*" id="phCat"></label></div></div>`,
    wire: (box) => {
      const load = (inp, key) => inp.addEventListener("change", () => { const file = inp.files?.[0]; if (!file) return; const r = new FileReader(); r.onload = () => (runner.extras.photos[key] = r.result); r.readAsDataURL(file); });
      load($("#phDog", box), "dog"); load($("#phCat", box), "cat");
    },
  }),
  renter: (a) => ({
    html: `<div class="card letterbox"><div class="section-label">Intro letter</div>
      <p class="muted" style="margin:0;font-size:14.5px">A short note you can paste into emails to landlords or attach to applications. ${S.sample ? "Claude can write a first draft from your answers. Then change anything you like." : "Write it here; it goes into your PDF."}</p>
      <textarea id="letter" aria-label="Intro letter" placeholder="Hi, I'm…">${esc(a.letter || "")}</textarea>
      <div class="btnrow">${S.sample ? `<button class="btn dark" id="writeLetter">${a.letter ? "Write a new draft" : "Write it with Claude"}</button><button class="btn ghost" id="stopLetter" hidden>Stop</button>` : ""}<span class="muted" id="letterMsg" style="align-self:center;font-size:14px"></span></div></div>`,
    wire: (box) => {
      const ta = $("#letter", box); let t;
      ta.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { runner.answers.letter = ta.value; persistLetter(); }, 800); });
      let ctl;
      $("#stopLetter", box)?.addEventListener("click", () => ctl?.abort());
      $("#writeLetter", box)?.addEventListener("click", async () => {
        const btn = $("#writeLetter", box), msg = $("#letterMsg", box), stop = $("#stopLetter", box);
        ctl = new AbortController(); btn.disabled = true; stop.hidden = false; msg.textContent = "Thinking…";
        const facts = RENTER_FACTS(runner.answers);
        try {
          const { text } = await S.sample(`Write a short, warm, confident intro letter (130 to 180 words) from a prospective tenant to a New York City landlord or broker. Plain text only: no subject line, no placeholders in brackets, no markdown. Start with "Hi," and sign off with her first name. Use ONLY the facts below and leave out anything not given. Mention her job, her move-in timing, that she has a well-behaved dog and cat if given, and how she'll qualify. Keep the tone natural and friendly, like a real person wrote it.

Facts:
${facts}`, { signal: ctl.signal, cache: false, onText: ({ text }) => { ta.value = text; msg.textContent = ""; } });
          ta.value = text.trim(); runner.answers.letter = ta.value; persistLetter(); msg.textContent = "Draft ready. Edit anything you like.";
          btn.textContent = "Write a new draft";
        } catch (e) {
          if (e?.text) ta.value = e.text;
          msg.textContent = e?.code === "cancelled" ? "Stopped." : e?.code === "not_granted" || e?.code === "sampling_disabled" ? "Claude isn't available here. You can write it yourself." : e?.code === "rate_limited" ? "Too many requests right now. Try again in a bit." : "That didn't work. Try again.";
        } finally { btn.disabled = false; stop.hidden = true; }
      });
    },
  }),
  budget: (a) => {
    const b = budgetCalc(a);
    const readyTxt = b.gap === 0 ? "You already have enough saved." : b.ready ? `At ${money(a.monthlySave)} a month, you're ready by <b>${b.ready.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</b>.` : "Add a monthly savings amount to get a target date.";
    return { html: `<div class="bigstats">
      <div class="stat"><b class="tnum">${money(b.need)}</b><span>to move in at ${money(b.rent)}/mo (first month, deposit, move, 1 month of bills)</span></div>
      <div class="stat"><b class="tnum">${money(b.gap)}</b><span>still to save (you have ${money(a.saved)})</span></div>
      <div class="stat"><b class="tnum">${money(b.left)}</b><span>left each month after rent and bills</span></div>
      <div class="stat"><b class="tnum">${b.share != null ? Math.round(b.share * 100) + "%" : "—"}</b><span>of take-home goes to rent</span></div></div>
      <div class="card"><div>${readyTxt}</div><small class="muted">If you use a guarantor service, add about ${money(b.guarantor)} (a one-time fee). If a parent is your guarantor, there's no fee.</small>
      ${b.left < 0 ? `<small style="color:var(--warn)">Rent plus bills is more than your monthly income at this rent. Try a lower target, or check the Affordable housing guide.</small>` : ""}</div>` };
  },
  afford: (a) => {
    const c = affordCalc(a);
    return { html: `${c.solo ? "" : `<div class="card"><small class="muted">These limits are for one person. Two-person limits are higher, so check each listing's table.</small></div>`}
      <div class="card" style="overflow-x:auto"><div class="section-label">Income bands (2026, one person)</div>
      <table class="bands"><thead><tr><th>Band</th><th>Max income</th><th>You</th></tr></thead><tbody>
      ${c.bands.map((b) => `<tr><td>${b.pct}% AMI</td><td class="tnum">${money(b.max)}</td><td class="${b.ok ? "yes" : "no"}">${c.inc ? (b.ok ? "Fits" : "Over") : "—"}</td></tr>`).join("")}</tbody></table>
      <small class="muted">Each listing also has a minimum income, usually about 3× the yearly rent. ${c.maxRent ? `At ${money(c.inc)} a year, that means rents up to about <b>${money(c.maxRent)}/mo</b>.` : ""}</small></div>
      <div class="card"><div class="section-label">Programs</div>
        <div>${c.fairFares ? "✓ Likely eligible for <b>Fair Fares</b>: half-price subway and bus." : "Fair Fares (half-price subway) is for incomes up to about $32,000, so it's probably not for you."}</div>
        <div>${a.health === "Yes" ? "Health insurance through work: covered." : c.essential ? "✓ Likely eligible for the <b>Essential Plan</b>: $0-premium health coverage." : "If work doesn't cover you, NY State of Health has subsidized plans."}</div></div>
      <div class="card"><div class="section-label">Your plan</div><ol class="steps">
        ${a.hc === "Yes" ? "" : `<li>Make a free <a href="https://housingconnect.nyc.gov" target="_blank" rel="noopener">Housing Connect</a> account (about 20 minutes).</li>`}
        <li>Once a week, check <a href="https://www.nyc.gov/site/hpd/services-and-information/find-affordable-housing-re-rentals.page" target="_blank" rel="noopener">HPD re-rentals</a>. They're first-come, first-served, so apply the same day.</li>
        <li>Apply to every Housing Connect lottery that fits your band. Each one is open about 3 weeks.</li>
        <li>Keep these in one folder on your phone: ${["Photo ID", "Last 3 pay stubs", "Last 2 months of bank statements", "Last year's tax return", "Letter from the restaurant"].map((d) => (a.docs || []).includes(d) ? `${esc(d)} ✓` : esc(d)).join(", ")}.</li>
        <li>Ask how tips are counted when you apply, and keep tip records.</li></ol></div>` };
  },
};
function RENTER_FACTS(a) {
  const pets = getDoc("pets").answers || {};
  const lines = [
    a.fullName && `Name: ${a.fullName}`, a.currentCity && `Moving from: ${a.currentCity}`, a.moveIn && `Move-in: ${a.moveIn}`,
    a.restaurant && `Job: ${a.role || "server"} at ${a.restaurant} in Lower Manhattan (she worked there before and is returning)`,
    a.modeling === "Yes" && "Also does some modeling work",
    a.aboutMe && `About her, in her words: ${a.aboutMe}`,
    (pets.dogName || pets.catName) && `Pets: ${[pets.dogName && `${pets.dogName}, a ${pets.dogWeight ? pets.dogWeight + " lb " : ""}${pets.dogBreed || "dog"}`, pets.catName && `${pets.catName}, a cat`].filter(Boolean).join(" and ")}`,
    a.guarantor && a.guarantor !== "Not sure yet" && `How she'll qualify: ${a.guarantor}`,
    a.rentedBefore === "Yes" && a.years && `Renting history: ${a.years}, references available`,
  ];
  return lines.filter(Boolean).map((l) => "- " + l).join("\n");
}
let letterT;
function persistLetter() { clearTimeout(letterT); letterT = setTimeout(() => saveGuide("renter", { answers: structuredClone(runner?.answers || getDoc("renter").answers) }), 200); }

/* ---------------- PDF ---------------- */
function pdfKit(title, subtitle) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = 612, H = 792, M = 56; let y = 0;
  const ORANGE = [92, 184, 124], INK = [19, 26, 21], GREY = [85, 99, 90], RULE = [209, 221, 212];
  const header = () => {
    doc.setFillColor(...ORANGE); doc.rect(0, 0, W, 8, "F");
    y = 72;
  };
  const ensure = (h) => { if (y + h > H - 64) { doc.addPage(); header(); } };
  header();
  doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.setTextColor(...INK); doc.text(title, M, y); y += 22;
  if (subtitle) { doc.setFont("helvetica", "normal"); doc.setFontSize(11.5); doc.setTextColor(...GREY); const ls = doc.splitTextToSize(subtitle, W - 2 * M); doc.text(ls, M, y); y += ls.length * 15; }
  y += 10;
  const k = {
    doc, get y() { return y; }, set y(v) { y = v; },
    h2(t) { ensure(40); y += 14; doc.setFillColor(...ORANGE); doc.rect(M, y - 8, 8, 8, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK); doc.text(t.toUpperCase(), M + 16, y); y += 8; doc.setDrawColor(...RULE); doc.setLineWidth(0.8); doc.line(M, y, W - M, y); y += 16; },
    kv(label, value) {
      if (!has(value)) return;
      const v = Array.isArray(value) ? value.join(", ") : String(value);
      doc.setFont("helvetica", "normal"); doc.setFontSize(11);
      const ls = doc.splitTextToSize(v, W - 2 * M - 170); ensure(ls.length * 15 + 4);
      doc.setTextColor(...GREY); doc.setFontSize(10); doc.text(label, M, y);
      doc.setTextColor(...INK); doc.setFontSize(11); doc.text(ls, M + 170, y); y += ls.length * 15 + 5;
    },
    para(t, size = 11.5) { doc.setFont("helvetica", "normal"); doc.setFontSize(size); doc.setTextColor(...INK); const ls = doc.splitTextToSize(String(t), W - 2 * M); for (const line of ls) { ensure(16); doc.text(line, M, y); y += size * 1.45; } y += 4; },
    stat(label, value) { ensure(44); doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(...INK); doc.text(value, M, y + 14); doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...GREY); doc.text(doc.splitTextToSize(label, W - 2 * M - 150), M + 150, y + 6); y += 34; },
    image(dataUrl, maxW, maxH, x = M) {
      try {
        const p = doc.getImageProperties(dataUrl); const r = Math.min(maxW / p.width, maxH / p.height);
        const w = p.width * r, h = p.height * r; ensure(h + 10); doc.addImage(dataUrl, x, y, w, h); return { w, h };
      } catch { return null; }
    },
    footer() {
      const n = doc.getNumberOfPages();
      for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...GREY); doc.text(`Prepared ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, M, H - 36); if (n > 1) doc.text(`${i} / ${n}`, W - M, H - 36, { align: "right" }); }
    },
  };
  return k;
}
async function makePdf(gid, a, extras) {
  const msg = $("#pdfMsg");
  if (!window.jspdf) { msg.textContent = "The PDF tool didn't load. Check your connection and reload."; return; }
  if (!S.downloads) { msg.textContent = "Downloads aren't available right now. Reload and try again."; return; }
  const name = (getDoc("renter").answers || {}).fullName || S.cfg?.().her || "Renter";
  let k, file;
  if (gid === "pets") {
    const dogTitle = [a.dogName, a.catName].filter(Boolean).join(" & ") || "My pets";
    k = pdfKit(`Meet ${dogTitle}`, `Pet résumé for ${name}'s rental application`);
    const two = extras.photos.dog && extras.photos.cat;
    if (extras.photos.dog || extras.photos.cat) {
      const top = k.y; let h1 = 0, h2 = 0;
      if (extras.photos.dog) h1 = k.image(extras.photos.dog, two ? 240 : 300, 200)?.h || 0;
      if (extras.photos.cat) { k.y = top; h2 = k.image(extras.photos.cat, two ? 240 : 300, 200, two ? 316 : 56)?.h || 0; }
      k.y = top + Math.max(h1, h2) + 16;
    }
    k.h2(a.dogName ? `${a.dogName} (dog)` : "Dog");
    k.kv("Breed", a.dogBreed); k.kv("Age", a.dogAge); k.kv("Weight", has(a.dogWeight) ? `${a.dogWeight} lb` : ""); k.kv("Spayed / neutered", a.dogFixed); k.kv("Personality", a.dogTraits); k.kv("Home alone", a.dogAlone); k.kv("Training", a.dogTraining);
    k.h2(a.catName ? `${a.catName} (cat)` : "Cat");
    k.kv("Age", a.catAge); k.kv("Spayed / neutered", a.catFixed); k.kv("Indoor-only", a.catIndoor); k.kv("Personality", a.catTraits);
    k.h2("Health & references");
    k.kv("Vaccines up to date", a.vaccines); k.kv("Vet", a.vet); k.kv("Reference", a.petRef);
    k.kv("Renter's insurance", a.insurance === "I have it" ? "Yes, with pet liability" : a.insurance === "I'll get it before I sign" ? "Will have it, with pet liability, before move-in" : "");
    file = `Pet resume - ${dogTitle}.pdf`;
  } else if (gid === "renter") {
    k = pdfKit(a.fullName || "Renter profile", [a.phone, a.email].filter(Boolean).join("  ·  ") || "Renter profile");
    k.h2("About me"); k.kv("Currently living in", a.currentCity); k.kv("Move-in", a.moveIn); if (a.aboutMe) k.para(a.aboutMe);
    k.h2("Work & income"); k.kv("Employer", a.restaurant ? `${a.restaurant}${a.role ? " (" + a.role + ")" : ""}` : ""); k.kv("Monthly income (est.)", has(a.monthlyIncome) ? money(a.monthlyIncome) : "");
    k.kv("Modeling income", a.modeling === "Yes" ? (has(a.modelingMonthly) ? `About ${money(a.modelingMonthly)} / month` : "Yes") : ""); k.kv("Documents available", a.incomeDocs);
    k.h2("Rental history & references"); k.kv("Renting for", a.years); k.kv("Past landlord", a.landlord); k.kv("Reference", a.reference); k.kv("Approval", a.guarantor && a.guarantor !== "Not sure yet" ? a.guarantor : "");
    const pets = getDoc("pets").answers || {};
    if (pets.dogName || pets.catName) { k.h2("Pets"); k.kv("Dog", pets.dogName ? `${pets.dogName}${pets.dogBreed ? ", " + pets.dogBreed : ""}${pets.dogWeight ? ", " + pets.dogWeight + " lb" : ""}` : ""); k.kv("Cat", pets.catName); k.kv("", "Pet résumé available on request."); }
    if (a.letter) { k.doc.addPage(); k.doc.setFillColor(92, 184, 124); k.doc.rect(0, 0, 612, 8, "F"); k.y = 80; k.para(a.letter, 12); }
    file = `Renter profile - ${a.fullName || S.cfg?.().her || "Renter"}.pdf`;
  } else if (gid === "budget") {
    const b = budgetCalc(a);
    k = pdfKit("Budget & savings goal", `${name} · moving to NYC · target rent ${money(b.rent)}/mo`);
    k.h2("The goal");
    k.stat("Needed to move in: first month, security deposit, the move, and one month of bills as a cushion", money(b.need));
    k.stat(`Saved so far`, money(a.saved)); k.stat("Still to save", money(b.gap));
    k.para(b.gap === 0 ? "Already there." : b.ready ? `Saving ${money(a.monthlySave)} a month, ready by ${b.ready.toLocaleDateString("en-US", { month: "long", year: "numeric" })}.` : "Set a monthly savings amount to get a target date.");
    k.para(`If using a guarantor service, add about ${money(b.guarantor)} (one-time). No fee if a parent is the guarantor.`, 10);
    k.h2("Each month in NYC");
    k.kv("Take-home", money(num(a.takeHome))); k.kv("Extra (modeling)", has(a.extra) ? money(a.extra) : ""); k.kv("Rent", money(b.rent));
    k.kv("Phone", money(num(a.phone))); k.kv("Car", has(a.car) ? money(a.car) : ""); k.kv("Pets", money(num(a.petsCost))); k.kv("Food", money(num(a.food))); k.kv("Other", has(a.other) ? money(a.other) : "");
    k.kv("Left over", money(b.left)); k.kv("Rent share of income", b.share != null ? Math.round(b.share * 100) + "%" : "");
    file = "Budget and savings goal.pdf";
  } else {
    const c = affordCalc(a);
    k = pdfKit("Affordable housing plan", `${name} · ${c.inc ? "about " + money(c.inc) + " a year" : "income to confirm"}`);
    k.h2("Income bands (2026, one person)");
    c.bands.forEach((b) => k.kv(`${b.pct}% AMI`, `${money(b.max)} max${c.inc ? (b.ok ? "  ·  fits" : "  ·  over") : ""}`));
    if (c.maxRent) k.para(`Most listings need income of about 3x the yearly rent, so rents up to about ${money(c.maxRent)}/mo.`, 10.5);
    k.h2("Programs");
    k.para(c.fairFares ? "Fair Fares: likely eligible (half-price subway and bus)." : "Fair Fares: probably over the income limit (about $32,000).");
    k.para(a.health === "Yes" ? "Health insurance: through work." : c.essential ? "Essential Plan: likely eligible ($0-premium health coverage)." : "Health insurance: check NY State of Health for subsidized plans.");
    k.h2("Steps");
    [a.hc === "Yes" ? null : "Make a Housing Connect account: housingconnect.nyc.gov", "Check HPD re-rentals weekly and apply the same day: nyc.gov/hpd (Find affordable housing re-rentals)", "Apply to every lottery that fits your band (each is open about 3 weeks)", "Keep ID, 3 pay stubs, 2 months of bank statements, last tax return and the restaurant letter in one folder", "Ask how tips are counted; keep tip records"].filter(Boolean).forEach((s, i) => k.para(`${i + 1}.  ${s}`));
    file = "Affordable housing plan.pdf";
  }
  k.footer();
  msg.textContent = "Preparing your PDF…";
  try {
    const r = await S.downloads.save({ filename: file, data: k.doc.output("blob") });
    msg.textContent = r.status === "saved" ? "Saved. Check your downloads." : "";
  } catch (e) {
    msg.textContent = e?.code === "declined" ? "Download canceled." : e?.code === "rate_limited" ? "One moment, then try again." : "Couldn't save the PDF here.";
  }
}

renderGuides();
})();
