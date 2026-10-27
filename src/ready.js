(() => {
"use strict";
/* Per-listing readiness: what she would need to apply for this specific apartment. */
const S = window.__S;
const { esc, money } = S.ui;
const DAY = 864e5;
const DOG_LB = 50;
const num = (v) => (v === "" || v == null || isNaN(Number(v))) ? 0 : Number(v);
const g = (id) => S.getGuide ? S.getGuide(id) : { answers: {} };
const stepDone = (id) => !!(S.checklist?.done || {})[id];

function items(l) {
  const rent = l.price || 0;
  const renter = g("renter").answers || {}, budget = g("budget"), pets = g("pets");
  const out = [];

  // 1. Upfront cash
  const plan = renter.guarantor || "";
  const service = plan.startsWith("A guarantor service");
  const fee = service ? Math.round(rent * 0.875) : 0;
  const need = rent * 2 + 20 + fee;
  const savedKnown = budget.done || budget.answers?.saved !== undefined && budget.answers?.saved !== "";
  const saved = num(budget.answers?.saved);
  out.push({
    key: "cash", ok: savedKnown && saved >= need, label: "Move-in cash",
    detail: savedKnown ? `${money(saved)} of ${money(need)}` : `${money(need)} needed`,
    sub: `First month + deposit${fee ? " + guarantor fee" : ""}`,
    bar: savedKnown ? Math.min(1, need ? saved / need : 0) : null,
    fix: savedKnown ? null : { guide: "budget", text: "Add your savings" },
  });

  // 2. Income or guarantor
  const yearly = num(renter.monthlyIncome) * 12 + (renter.modeling === "Yes" ? num(renter.modelingMonthly) * 12 : 0) || num(g("afford").answers?.income);
  const need40 = rent * 40, need80 = rent * 80;
  let inc;
  if (yearly && yearly >= need40) inc = { ok: true, detail: "Your income covers it" };
  else if (plan.startsWith("A parent")) inc = { ok: stepDone("parent"), detail: stepDone("parent") ? "Parent guarantor" : `Parent needs ~${money(need80)}/yr`, fix: stepDone("parent") ? null : { step: "parent", text: "Mark as asked" } };
  else if (service) inc = { ok: stepDone("guarantor"), detail: stepDone("guarantor") ? "Guarantor service approved" : `Service fee ~${money(fee)}`, fix: stepDone("guarantor") ? null : { step: "guarantor", text: "Mark pre-approved" } };
  else inc = { ok: false, detail: yearly ? `Needs ${money(need40)}/yr or a guarantor` : "Pick how you'll qualify", fix: { guide: "renter", text: "Renter profile" } };
  out.push(Object.assign({ key: "income", label: "Income or guarantor", sub: `Landlords look for ${money(need40)}/yr (40× rent)` }, inc));

  // 3. Paperwork
  out.push({ key: "profile", ok: !!g("renter").done, label: "Renter profile PDF", fix: g("renter").done ? null : { guide: "renter", text: "Finish it" } });
  out.push({ key: "letter", ok: !!renter.letter, label: "Intro letter", fix: renter.letter ? null : { guide: "renter", text: "Write it" } });
  out.push({ key: "petres", ok: !!pets.done, label: "Pet résumé PDF", fix: pets.done ? null : { guide: "pets", text: "Finish it" } });
  const docs = renter.incomeDocs || [];
  out.push({ key: "docs", ok: docs.length >= 2, label: "Pay stubs + bank statements", detail: docs.length ? `${docs.length} ready` : "", fix: docs.length >= 2 ? null : { guide: "renter", text: "Check off" } });
  out.push({ key: "job", ok: stepDone("jobletter"), label: "Job letter from the restaurant", fix: stepDone("jobletter") ? null : { step: "jobletter", text: "Mark as done" } });

  // 4. The dog
  let dog;
  if (l.dogs === false) dog = { ok: false, bad: true, detail: "No dogs here" };
  else if (l.dogs === true && l.maxDog && l.maxDog < (S.cfg?.().dogLb || DOG_LB)) dog = { ok: false, bad: true, detail: `Dogs up to ${l.maxDog} lb only` };
  else if (l.dogs === true) dog = { ok: true, detail: l.maxDog ? `Up to ${l.maxDog} lb` : "Dogs allowed" };
  else dog = { ok: false, ask: true, detail: `Ask about a ${S.cfg?.().dogLb || DOG_LB} lb dog` };
  out.push(Object.assign({ key: "dog", label: `Allows a ${S.cfg?.().dogLb || DOG_LB} lb dog` }, dog));
  return out;
}

function timing(l) {
  const bits = [];
  if (l.listedAt) {
    const days = Math.max(0, Math.floor((Date.now() - l.listedAt) / DAY));
    const note = days <= 7 ? "New. Places like this go fast, so apply within a day or two." : days <= 30 ? "A normal amount of time on the market." : "Up a while. You may be able to negotiate.";
    bits.push(`<div class="rd-time"><b>${days === 0 ? "Listed today" : `Listed ${days} day${days === 1 ? "" : "s"} ago`}</b><span>${note}</span></div>`);
  }
  if (l.avail) {
    const a = new Date(l.avail + (l.avail.length === 10 ? "T12:00:00" : ""));
    if (!isNaN(a)) {
      const fits = a >= new Date("2027-01-20T00:00:00") && a <= new Date("2027-03-01T23:59:59");
      bits.push(`<div class="rd-time"><b>Available ${a.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</b><span>${fits ? "Lines up with a Feb move-in." : a < new Date("2027-01-20T00:00:00") ? "Earlier than she needs. Ask if the start date can move." : "Later than her Feb 28 deadline."}</span></div>`);
    }
  }
  return bits.join("");
}

function readinessHTML(l) {
  if (!l.price) return "";
  const its = items(l);
  const blockers = its.filter((i) => i.bad);
  const ok = its.filter((i) => i.ok).length, total = its.length;
  const r = 20, c = 2 * Math.PI * r, f = ok / total;
  return `<div class="rd" id="rd">
    <div class="rd-head">
      <svg class="rd-ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="${r}" class="trk"/>${f > 0 ? `<circle cx="24" cy="24" r="${r}" class="val" stroke-dasharray="${(f * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 24 24)"/>` : ""}<text x="24" y="28" text-anchor="middle">${ok}/${total}</text></svg>
      <div><div class="section-label">What she'd need for this one</div>
      <h3>${blockers.length ? "This one won't work for the dog" : ok === total ? "Ready to apply" : `${total - ok} thing${total - ok === 1 ? "" : "s"} left`}</h3></div>
    </div>
    ${timing(l)}
    <ul class="rd-list">${its.map((i) => `<li class="${i.ok ? "ok" : i.bad ? "bad" : i.ask ? "ask" : ""}">
      <span class="rd-mark" aria-label="${i.ok ? "Done" : i.bad ? "Problem" : "Not yet"}">${i.ok ? "✓" : i.bad ? "✕" : i.ask ? "?" : ""}</span>
      <div class="rd-txt"><span>${esc(i.label)}</span>${i.detail ? `<small>${esc(i.detail)}</small>` : ""}${i.bar != null ? `<div class="meter${i.bar >= 1 ? " full" : ""}"><i style="width:${Math.round(i.bar * 100)}%"></i></div>` : ""}${i.sub && !i.ok ? `<small class="muted">${esc(i.sub)}</small>` : ""}</div>
      ${i.fix ? `<button class="rd-fix" ${i.fix.guide ? `data-rguide="${i.fix.guide}"` : `data-rstep="${i.fix.step}"`}>${esc(i.fix.text)}</button>` : ""}
    </li>`).join("")}</ul>
  </div>`;
}

function wireReadiness(sheet, l) {
  sheet.querySelectorAll("[data-rguide]").forEach((b) => (b.onclick = () => { S.closeSheet(); S.openRunner(b.dataset.rguide); }));
  sheet.querySelectorAll("[data-rstep]").forEach((b) => (b.onclick = () => {
    const cur = S.checklist || {}; const id = b.dataset.rstep;
    const next = { done: Object.assign({}, cur.done || {}, { [id]: true }), by: Object.assign({}, cur.by || {}, { [id]: S.me.id || null }) };
    S.checklist = next;
    const box = sheet.querySelector("#rd"); if (box) { box.outerHTML = readinessHTML(l); wireReadiness(sheet, l); }
    S.toast("Nice. One less thing.");
    if (S.db) S.queueWrite("checklist/main", async () => { await S.db.doc("checklist/main").set(next); S.wroteOK = true; });
  }));
}
S.readinessHTML = readinessHTML;
S.wireReadiness = wireReadiness;
S.readyCount = (l) => { const its = items(l); return { ok: its.filter((i) => i.ok).length, total: its.length, bad: its.some((i) => i.bad) }; };
})();
