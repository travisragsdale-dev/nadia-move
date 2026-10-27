(() => {
"use strict";
const GEO = window.GEO_DATA;
const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => (n == null || n === "" || isNaN(n)) ? "—" : "$" + Math.round(Number(n)).toLocaleString("en-US");
const store = {
  get(k, d) { try { const v = localStorage.getItem("nyc-move:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("nyc-move:" + k, JSON.stringify(v)); } catch {} },
};

/* ---------- shared state ---------- */
const S = window.__S = {
  db: null, user: null, sample: null, downloads: null,
  me: { id: null }, canWrite: true, live: false,
  listings: new Map(), picks: new Map(), guides: new Map(),
  settings: {},
  filters: Object.assign({ max: 2800, beds: "any", kind: "whole", dog: false, cat: false, noFee: false, aff: false, hidePassed: true }, store.get("filters", {})),
  view: "search", mode: store.get("mode", "map"), subway: store.get("subway", false), sort: store.get("sort", "new"),
  selected: null, picking: null, profiles: {},
};
/* Commute anchors (approximate coordinates from the street addresses) */
/* Names and places live in the private database (settings/main), never in this public code. */
const PLACES = [];
S.PLACES = PLACES;
S.cfg = () => S.settings || {};
const workName = () => S.cfg().workName || "work";
function applyProfile() {
  const c = S.cfg();
  PLACES.splice(0, PLACES.length, ...(Array.isArray(c.places) ? c.places : []));
  for (const p of PLACES) delete p._near;
  const t = c.her ? `${c.her}'s NYC Move` : "NYC Move";
  document.title = t; const h = document.getElementById("appTitle"); if (h) h.textContent = t;
}
S.applyProfile = applyProfile;

/* ---------- toast ---------- */
let toastT;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2600);
}
S.toast = toast;

/* ---------- subway helpers ---------- */
const LINE_COLORS = { "1": "#EE352E", "2": "#EE352E", "3": "#EE352E", "4": "#00933C", "5": "#00933C", "6": "#00933C", "7": "#B933AD", A: "#0039A6", C: "#0039A6", E: "#0039A6", B: "#FF6319", D: "#FF6319", F: "#FF6319", M: "#FF6319", G: "#6CBE45", J: "#996633", Z: "#996633", L: "#A7A9AC", N: "#FCCC0A", Q: "#FCCC0A", R: "#FCCC0A", W: "#FCCC0A", S: "#808183" };
function bullets(lines) {
  const ls = String(lines || "").includes(",") ? lines.split(",") : String(lines || "").split("");
  return `<span class="lines" aria-label="${esc(ls.join(" "))} trains">${ls.map((l) => `<span class="lb${"NQRW".includes(l) && l.length === 1 ? " dark" : ""}" style="background:${LINE_COLORS[l] || "#808183"}">${esc(l)}</span>`).join("")}</span>`;
}
function meters(a, b) {
  const R = 6371000, t = Math.PI / 180;
  const dLat = (b.lat - a.lat) * t, dLng = (b.lng - a.lng) * t;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function nearest(p) {
  let best = null, bd = Infinity;
  for (const s of GEO.stations) { const d = meters(p, { lat: s.y, lng: s.x }); if (d < bd) { bd = d; best = s; } }
  return { st: best, m: bd };
}
const commuteCache = new Map();
function commute(l) {
  if (l.lat == null) return null;
  const key = `${l.lat},${l.lng}`;
  if (commuteCache.has(key)) return commuteCache.get(key);
  const n = nearest(l);
  const walk = Math.max(1, Math.round((n.m * 1.25) / 80));
  const times = {};
  for (const p of PLACES) {
    const np = p._near || (p._near = nearest(p));
    const direct = Math.round((meters(l, p) * 1.25) / 80);
    const ride = (meters({ lat: n.st.y, lng: n.st.x }, { lat: np.st.y, lng: np.st.x }) * 1.35) / 420;
    times[p.id] = Math.min(direct, Math.round(walk + 6 + ride + (np.m * 1.25) / 80));
  }
  const wk = PLACES.filter((p) => p.work).map((p) => times[p.id]);
  const toWork = wk.length ? Math.min(...wk) : null;
  const c = { station: n.st, walk, toWork, times };
  commuteCache.set(key, c); return c;
}
S.commute = commute;

/* ---------- neighborhoods (approximate centers for placing hand-added listings) ---------- */
const HOODS = {
  "Ridgewood": [40.7043, -73.9055], "Bushwick": [40.6944, -73.9213], "East Williamsburg": [40.714, -73.9365], "Williamsburg": [40.7081, -73.9571],
  "Greenpoint": [40.7305, -73.9515], "Bed-Stuy": [40.6872, -73.9418], "Clinton Hill": [40.688, -73.965], "Fort Greene": [40.689, -73.974],
  "Crown Heights": [40.6694, -73.9422], "Prospect Lefferts Gardens": [40.659, -73.952], "Flatbush": [40.641, -73.959], "Kensington": [40.639, -73.973],
  "Windsor Terrace": [40.654, -73.979], "Sunset Park": [40.646, -74.01], "Cypress Hills": [40.683, -73.878], "Glendale": [40.702, -73.883],
  "Middle Village": [40.717, -73.881], "Maspeth": [40.723, -73.912], "Woodhaven": [40.69, -73.856], "Astoria": [40.764, -73.923],
  "Long Island City": [40.7447, -73.9485], "Sunnyside": [40.743, -73.92], "Woodside": [40.745, -73.903], "Jackson Heights": [40.7557, -73.8831],
  "Elmhurst": [40.736, -73.878], "Lower East Side": [40.715, -73.9843], "East Village": [40.7265, -73.9815], "Chinatown": [40.7158, -73.997],
  "Two Bridges": [40.711, -73.991], "Washington Heights": [40.8417, -73.9394], "Inwood": [40.8677, -73.9212], "Harlem": [40.8116, -73.9465], "East Harlem": [40.7957, -73.9389],
};
S.HOODS = HOODS;

/* ---------- listing normalization + filters ---------- */
/* Room in a shared place vs. a whole apartment (the daily pull sets d.shared; this is the fallback) */
const SHARED_RX = /\b(rooms? ((for|4) rent|available|in (a|an|my|our|shared))|private (bed)?room|shared (apartment|apt|house|home|unit|kitchen|bath(room)?)|room ?mates? (wanted|needed)|looking for (a )?room ?mate|housemates?|furnished room|bedroom available in|share (a|an|my|our) (apt|apartment|house|home)|co-?living)\b/i;
const NOT_SHARED_RX = /(great|perfect|ideal|good) for room ?mates|room ?mates? (welcome|friendly|ok)/i;
const guessShared = (t) => !!t && SHARED_RX.test(t) && !NOT_SHARED_RX.test(t.replace(SHARED_RX, ""));
function norm(id, d) {
  return {
    id, src: d.src || "manual", url: d.url || "", title: d.title || "", addr: d.addr || "", hood: d.hood || "",
    lat: typeof d.lat === "number" ? d.lat : null, lng: typeof d.lng === "number" ? d.lng : null,
    price: Number(d.price) || null, beds: d.beds ?? null, baths: d.baths ?? null,
    cats: d.cats ?? null, dogs: d.dogs ?? null, maxDog: d.maxDog ?? null, noFee: !!d.noFee,
    aff: !!d.aff, stab: !!d.stab, avail: d.avail || "", photo: d.photo || "", note: d.note || "", addedAt: d.addedAt || 0, addedBy: d.addedBy || null, listedAt: d.listedAt || d.addedAt || 0,
    shared: typeof d.shared === "boolean" ? d.shared : guessShared(`${d.title || ""} ${d.note || ""}`),
  };
}
const DOG_LB = 50; // overridden by settings.dogLb
const favsOf = (id) => Object.entries(S.picks.get(id)?.favs || {}).filter(([, v]) => v).map(([k]) => k);
const isFav = (id) => favsOf(id).length > 0;
const myFav = (id) => !!S.me.id && favsOf(id).includes(S.me.id);
const HEART = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.8 1.3-1.7 2.9-2.8 4.9-2.8 3.5 0 5.7 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z"/></svg>`;
function heartBtn(id, big) { const on = myFav(id), other = !on && isFav(id); return `<button class="heart${on ? " on" : ""}${other ? " other" : ""}${big ? " big" : ""}" data-fav="${esc(id)}" aria-pressed="${on}" aria-label="${on ? "Remove from favorites" : "Add to favorites"}">${HEART}</button>`; }
const statusOf = (id) => (S.picks.get(id)?.status) || "new";
function passes(l) {
  const f = S.filters;
  if (l.price && l.price > f.max) return false;
  if (f.beds === "0" && !(l.beds === 0 || l.beds === "0")) return false;
  if (f.beds === "1" && Number(l.beds) !== 1) return false;
  if (f.beds === "2" && !(Number(l.beds) >= 2)) return false;
  if (f.kind === "whole" && l.shared) return false;
  if (f.kind === "room" && !l.shared) return false;
  if (f.dog && l.dogs !== true) return false;
  if (f.dog && l.maxDog && Number(l.maxDog) < (S.cfg().dogLb || DOG_LB)) return false;
  if (f.cat && l.cats !== true) return false;
  if (f.noFee && !l.noFee) return false;
  if (f.aff && !(l.aff || l.stab)) return false;
  if (f.hidePassed && statusOf(l.id) === "passed") return false;
  if (f.favs && !isFav(l.id)) return false;
  return true;
}
function visible() { return [...S.listings.values()].filter(passes); }
function tier(p) { if (!p) return "ok"; if (p <= 2000) return "great"; if (p <= 2400) return "ok"; if (p <= 2800) return "mid"; return "over"; }
const bedsLabel = (b) => b == null || b === "" ? "" : (Number(b) === 0 ? "Studio" : `${b} BR`);
function petTags(l) {
  const t = [];
  if (l.dogs === true) t.push(`<span class="tag good">Dogs OK${l.maxDog ? ` (≤${esc(l.maxDog)} lb)` : ""}</span>`);
  else if (l.dogs === false) t.push(`<span class="tag warn">No dogs</span>`);
  if (l.cats === true) t.push(`<span class="tag good">Cats OK</span>`);
  else if (l.cats === false) t.push(`<span class="tag warn">No cats</span>`);
  if (l.dogs == null && l.cats == null) t.push(`<span class="tag">Pets: ask</span>`);
  return t.join("");
}
function extraTags(l) {
  let t = l.shared ? `<span class="tag warn">Room in shared apt</span>` : `<span class="tag">Whole apartment</span>`;
  if (l.noFee) t += `<span class="tag">No fee</span>`;
  if (l.aff) t += `<span class="tag acc">Income-restricted</span>`;
  if (l.stab) t += `<span class="tag acc">Rent-stabilized</span>`;
  return t;
}
S.ui = { bullets, bedsLabel, petTags, extraTags, esc, money };

/* ---------- map ---------- */
let map, pinLayer, stationLayer, lineLayer, hoodLayer, hoodLayer2, anchorLayer;
function initMap() {
  map = L.map("map", { zoomControl: false, preferCanvas: true, minZoom: 10, maxZoom: 17, maxBounds: [[40.45, -74.35], [40.98, -73.6]] })
    .setView([40.705, -73.945], 12);
  map.attributionControl.setPrefix(false);
  map.attributionControl.addAttribution("Subway: MTA GTFS · Boroughs: NYC DCP · Streets: © OpenStreetMap © CARTO");
  const isDark = () => { const t = document.documentElement.dataset.theme; return t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches); };
  let tiles = null;
  const setTiles = () => { tiles?.remove(); tiles = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${isDark() ? "dark_nolabels" : "light_nolabels"}/{z}/{x}/{y}{r}.png`, { subdomains: "abcd", maxZoom: 19 }).addTo(map); };
  setTiles();
  const css = getComputedStyle(document.documentElement);
  const landStyle = () => ({ stroke: false, fillColor: css.getPropertyValue("--land").trim(), fillOpacity: map.getZoom() >= 13 ? 0.45 : 0.8 });
  const boroFeatures = GEO.boros.map((b) => ({ type: "Feature", properties: { name: b.name }, geometry: { type: b.type, coordinates: b.coords } }));
  const boroLayer = L.geoJSON({ type: "FeatureCollection", features: boroFeatures }, { style: landStyle, interactive: false }).addTo(map);
  lineLayer = L.layerGroup();
  GEO.lines.forEach((ln) => L.polyline(ln.p.map(([x, y]) => [y, x]), { color: ln.c, weight: 2, opacity: 0.45, interactive: false }).addTo(lineLayer));
  stationLayer = L.layerGroup();
  GEO.stations.forEach((s) => {
    L.circleMarker([s.y, s.x], { radius: 3, color: "#fff", weight: 1, fillColor: "#333", fillOpacity: 1 })
      .bindTooltip(`${esc(s.n)} ${bullets(s.l)}`, { direction: "top", offset: [0, -4] }).addTo(stationLayer);
  });
  hoodLayer = L.layerGroup(); hoodLayer2 = L.layerGroup();
  const MAJOR = new Set(["Ridgewood", "Bushwick", "Williamsburg", "Greenpoint", "Bed-Stuy", "Crown Heights", "Flatbush", "Kensington", "Sunset Park", "Cypress Hills", "Glendale", "Maspeth", "Woodhaven", "Astoria", "Long Island City", "Jackson Heights", "Lower East Side", "Washington Heights", "Inwood", "Harlem"]);
  Object.entries(HOODS).forEach(([n, [la, lo]]) => L.marker([la, lo], { interactive: false, keyboard: false, icon: L.divIcon({ className: "hood", html: `<span>${esc(n)}</span>`, iconSize: [0, 0] }) }).addTo(MAJOR.has(n) ? hoodLayer : hoodLayer2));
  anchorLayer = L.layerGroup().addTo(map);
  pinLayer = L.layerGroup().addTo(map);
  const zoomLayers = () => { const z = map.getZoom(); (S.subway ? lineLayer.addTo(map) : lineLayer.remove()); (S.subway && z >= 13 ? stationLayer.addTo(map) : stationLayer.remove()); (z >= 12 ? hoodLayer.addTo(map) : hoodLayer.remove()); (z >= 14 ? hoodLayer2.addTo(map) : hoodLayer2.remove()); };
  const subBtn = $("#subwayBtn");
  const syncSub = () => { subBtn.setAttribute("aria-pressed", String(!!S.subway)); subBtn.classList.toggle("on", !!S.subway); };
  subBtn.onclick = () => { S.subway = !S.subway; store.set("subway", S.subway); syncSub(); zoomLayers(); };
  syncSub();
  let wasBig = map.getZoom() >= 14;
  map.on("zoomend", () => { zoomLayers(); boroLayer.setStyle(landStyle()); renderAnchors(); const big = map.getZoom() >= 14; if (big !== wasBig) { wasBig = big; renderPins(); } }); zoomLayers();
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { boroLayer.setStyle(landStyle()); setTiles(); });
  new MutationObserver(() => { boroLayer.setStyle(landStyle()); setTiles(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  map.on("click", onMapClick);
  renderAnchors();
}
function renderAnchors() {
  if (!anchorLayer) return;
  anchorLayer.clearLayers();
  const mk = (lat, lng, side, b, text, title) => L.marker([lat, lng], { keyboard: false, zIndexOffset: 1000, title, icon: L.divIcon({ className: `anchor a-${side}`, html: `<span><b>${b}</b>${esc(text)}</span>`, iconSize: [0, 0] }) }).addTo(anchorLayer);
  const work = PLACES.filter((p) => p.work);
  if (!work.length) { /* not set yet */ }
  else if (map.getZoom() < 15) mk(work.reduce((s, p) => s + p.lat, 0) / work.length, work.reduce((s, p) => s + p.lng, 0) / work.length, "r", esc(workName()[0].toUpperCase()), `${workName()}${work.length > 1 ? " ×" + work.length : ""}`, work.map((p) => p.label).join(" + "));
  else work.forEach((p) => mk(p.lat, p.lng, "r", esc(workName()[0].toUpperCase()), p.short, `${p.label}, ${p.addr}`));
  PLACES.filter((p) => !p.work).forEach((p) => mk(p.lat, p.lng, "r", esc((p.short || "?")[0].toUpperCase()), p.short, `${p.label}, ${p.addr}`));
}
function renderPins() {
  if (!pinLayer) return;
  pinLayer.clearLayers();
  for (const l of visible()) {
    if (l.lat == null) continue;
    const st = statusOf(l.id);
    const label = l.price ? (l.price >= 10000 ? "$" + Math.round(l.price / 1000) + "k" : "$" + (l.price / 1000).toFixed(1) + "k") : "?";
    const big = map.getZoom() >= 14 || S.selected === l.id;
    const m = L.marker([l.lat, l.lng], {
      title: `${l.price ? money(l.price) : "Price unknown"} ${l.hood || ""}`.trim(),
      icon: L.divIcon({ className: `${big ? "pin" : "dot"} t-${tier(l.price)} s-${st}${isFav(l.id) ? " fav" : ""}${S.selected === l.id ? " sel" : ""}`, html: `<span>${big ? label : ""}</span>`, iconSize: [0, 0] }),
      riseOnHover: true, zIndexOffset: st !== "new" ? 500 : 0,
    });
    m.on("click", (e) => { L.DomEvent.stopPropagation(e); openListing(l.id); });
    m.addTo(pinLayer);
  }
}

/* ---------- map picking (place a listing / set work) ---------- */
function startPick(kind, done) {
  S.picking = { kind, done };
  setView("search"); setMode("map");
  const b = document.createElement("div");
  b.className = "pickbanner"; b.id = "pickBanner";
  b.innerHTML = `<span>${kind === "work" ? "Tap the map where her restaurant is" : "Tap the map where the apartment is"}</span><button type="button">Cancel</button>`;
  b.querySelector("button").onclick = () => endPick(null);
  $("#view-search").appendChild(b);
}
function endPick(latlng) {
  const p = S.picking; S.picking = null; $("#pickBanner")?.remove();
  if (p) p.done(latlng);
}
function onMapClick(e) { if (S.picking) endPick(e.latlng); }
S.startPick = startPick;

/* ---------- views ---------- */
const VIEWS = ["home", "search", "shortlist", "guides", "steps"];
function setView(v) {
  S.view = v;
  for (const id of VIEWS) {
    $("#view-" + id).hidden = id !== v;
    $("#tab-" + id)?.setAttribute("aria-selected", String(id === v || (id === "home" && v === "steps")));
  }
  if (location.hash.slice(1) !== v) history.replaceState(null, "", "#" + v);
  if (v === "search" && map) setTimeout(() => { map.invalidateSize(); if (!S.mapShown) { S.mapShown = true; map.setView([40.705, -73.945], 12); } }, 0);
  if (v === "guides") S.renderGuides?.();
  if (v === "shortlist") renderShortlist();
  if (v === "home") S.renderHome?.();
  if (v === "steps") S.renderSteps?.();
  $("#view-" + v).scrollTop = 0;
}
S.setView = setView;
function setMode(m) {
  S.mode = m; store.set("mode", m);
  $("#modeMap").setAttribute("aria-pressed", String(m === "map"));
  $("#modeList").setAttribute("aria-pressed", String(m === "list"));
  $("#listView").hidden = m !== "list";
  $("#addBtn").hidden = m === "list" && false;
  if (m === "map" && map) setTimeout(() => map.invalidateSize(), 0);
  renderSearch();
}
document.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => setView(b.dataset.view)));
$("#modeMap").onclick = () => setMode("map");
$("#modeList").onclick = () => setMode("list");
$("#sortSel").value = S.sort;
$("#sortSel").onchange = (e) => { S.sort = e.target.value; store.set("sort", S.sort); renderList(); };
window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (VIEWS.includes(h) && h !== S.view) setView(h); });

/* ---------- search rendering ---------- */
function filterCount() {
  const f = S.filters; let n = 0;
  if (f.max < 2800) n++; if (f.beds !== "any") n++; if ((f.kind || "whole") !== "whole") n++; if (f.favs) n++; if (f.dog) n++; if (f.cat) n++; if (f.noFee) n++; if (f.aff) n++;
  return n;
}
function renderSearch() {
  const n = filterCount(); const fn = $("#filterN"); fn.hidden = !n; fn.textContent = n;
  renderPins(); renderList(); renderMapNote(); renderShortN();
  if (S.view === "home") S.renderHome?.();
}
S.renderSearch = renderSearch;
function renderMapNote() {
  const note = $("#mapNote");
  const total = S.listings.size, vis = visible().length;
  if (S.mode !== "map") { note.hidden = true; return; }
  if (total === 0) {
    note.hidden = false;
    note.innerHTML = `<h3>No listings yet</h3><p>Listings from StreetEasy and Craigslist will show up here every morning once the daily pull is connected. Until then, add any listing you find with <b>Add listing</b>.</p>`;
  } else if (vis === 0) {
    note.hidden = false;
    note.innerHTML = `<h3>Nothing matches these filters</h3><p>${total} listing${total === 1 ? "" : "s"} hidden. Try raising the max rent or turning off a filter.</p><div class="btnrow"><button class="btn" id="clearF">Clear filters</button></div>`;
    $("#clearF").onclick = () => { Object.assign(S.filters, { max: 2800, beds: "any", kind: "whole", dog: false, cat: false, noFee: false, aff: false }); store.set("filters", S.filters); renderSearch(); };
  } else note.hidden = true;
}
function listingCard(l, extra = "") {
  const c = commute(l);
  const st = statusOf(l.id);
  return `<div class="card lcard${l.photo ? " has-photo" : ""}" data-id="${esc(l.id)}" role="button" tabindex="0">
    ${l.photo ? `<img class="lthumb" src="${esc(l.photo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}
    <div class="lbody">
    <div class="lrow"><span class="price tnum">${l.price ? money(l.price) : "Price ?"}<small> /mo</small></span>
      <span class="lright">${st !== "new" ? `<span class="tag ${st === "passed" ? "" : "acc"}">${esc(STATUS_LABEL[st])}</span>` : ""}${heartBtn(l.id)}</span></div>
    <div class="meta">${esc([bedsLabel(l.beds), l.hood].filter(Boolean).join(" · ")) || "Details unknown"}${c ? ` · ${bullets(c.station.l)} ${c.walk} min walk${c.toWork != null ? ` · ≈${c.toWork} min to ${esc(workName())}` : ""}` : ""}</div>
    <div class="meta">${petTags(l)}${extraTags(l)}</div>${extra}</div></div>`;
}
S.listingCard = listingCard;
function renderList() {
  const el = $("#listEl"); if (!el) return;
  let ls = visible();
  const sorters = { new: (a, b) => (b.listedAt || 0) - (a.listedAt || 0), price: (a, b) => (a.price || 1e9) - (b.price || 1e9), work: (a, b) => (commute(a)?.toWork ?? 999) - (commute(b)?.toWork ?? 999) };
  ls.sort(sorters[S.sort] || sorters.new);
  $("#listCount").textContent = `${ls.length} of ${S.listings.size} listing${S.listings.size === 1 ? "" : "s"}`;
  if (!ls.length) {
    el.innerHTML = S.listings.size
      ? `<div class="empty"><h3>Nothing matches these filters</h3><p>Raise the max rent or turn off a filter to see more.</p></div>`
      : `<div class="empty"><h3>No listings yet</h3><p>Once the daily pull is connected, new StreetEasy and Craigslist listings land here each morning. For now, add any listing you find with Add listing.</p></div>`;
    return;
  }
  el.innerHTML = ls.map((l) => listingCard(l)).join("");
  el.querySelectorAll(".lcard").forEach((b) => (b.onclick = () => openListing(b.dataset.id)));
}

/* ---------- sheets ---------- */
function openSheet(html, { onClose, label } = {}) {
  closeSheet();
  const layer = $("#layer");
  layer.innerHTML = `<div class="backdrop"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label || "Details")}"><div class="grab"></div><div class="inner">${html}</div></div>`;
  const sheet = layer.querySelector(".sheet");
  layer.querySelector(".backdrop").onclick = () => closeSheet();
  sheet.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => closeSheet()));
  S._onClose = onClose;
  setTimeout(() => sheet.querySelector("[data-autofocus]")?.focus(), 30);
  return sheet;
}
function closeSheet() {
  const layer = $("#layer"); if (!layer.innerHTML) return;
  layer.innerHTML = ""; const f = S._onClose; S._onClose = null; f?.();
}
S.openSheet = openSheet; S.closeSheet = closeSheet;
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (S.picking) endPick(null); else closeSheet(); } });
const X = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
S.X = X;

/* ---------- picks (status, ratings, notes) ---------- */
const STATUS = ["new", "interested", "toured", "applied", "passed"];
const STATUS_LABEL = { new: "New", interested: "Interested", toured: "Toured", applied: "Applied", passed: "Passed" };
const chains = new Map();
function queueWrite(path, fn) {
  const prev = chains.get(path) || Promise.resolve();
  const next = prev.then(fn).catch((e) => { handleWriteError(e); });
  chains.set(path, next); return next;
}
function handleWriteError(e) {
  if (e?.code === "invalid_argument" && !S.wroteOK) { S.canWrite = false; toast("You can view this page, but changes won't save."); }
  else if (e?.code === "quota_exceeded") toast("The page's storage is full. Remove some passed listings.");
  else toast("That didn't save. Check your connection and try again.");
}
S.queueWrite = queueWrite;
function savePick(id, patch) {
  const cur = S.picks.get(id);
  const merged = deepMerge(structuredClone(cur || { status: "new", ratings: {}, notes: {} }), patch);
  S.picks.set(id, merged); renderSearch(); if (S.view === "shortlist") renderShortlist();
  if (!S.db) return;
  queueWrite("picks/" + id, async () => {
    const ref = S.db.doc("picks/" + id);
    if (cur) await ref.update(patch); else await ref.set(merged);
    S.wroteOK = true;
  });
}
function deepMerge(a, b) {
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object") deepMerge(a[k], v); else a[k] = v;
  }
  return a;
}
async function profilesFor(ids) {
  ids = [...new Set(ids.filter(Boolean))];
  if (!S.user || !ids.length) return {};
  try { return await S.user.profiles(ids); } catch { return {}; }
}

/* ---------- favorites ---------- */
function toggleFav(id) {
  if (!S.me.id) { toast("Sign in to save favorites."); return; }
  const on = !myFav(id);
  savePick(id, { favs: { [S.me.id]: on } });
  toast(on ? "Added to favorites" : "Removed from favorites");
  document.querySelectorAll(`[data-fav="${CSS.escape(id)}"]`).forEach((b) => { b.classList.toggle("on", on); b.classList.remove("other"); b.setAttribute("aria-pressed", String(on)); });
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-fav]"); if (!b) return; e.preventDefault(); e.stopPropagation(); toggleFav(b.dataset.fav); }, true);
document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.classList?.contains("lcard")) { e.preventDefault(); e.target.click(); } });

/* ---------- listing detail ---------- */
async function openListing(id) {
  const l = S.listings.get(id); if (!l) return;
  S.selected = id; renderPins();
  const pick = S.picks.get(id) || { status: "new", ratings: {}, notes: {} };
  const c = commute(l);
  const ratingIds = Object.keys(pick.ratings || {});
  const notes = Object.entries(pick.notes || {}).map(([k, v]) => ({ k, ...v })).sort((a, b) => a.t - b.t);
  const ps = await profilesFor([...ratingIds, ...notes.map((n) => n.by), ...favsOf(id), S.me.id]);
  const name = (uid) => uid === S.me.id ? "You" : (ps[uid]?.name || "Someone");
  const avatar = (uid) => ps[uid]?.avatarUrl || "";
  const myRating = (pick.ratings || {})[S.me.id] || 0;
  const srcLabel = { streeteasy: "StreetEasy", craigslist: "Craigslist", manual: "Added by hand", hpd: "HPD re-rental" }[l.src] || l.src;
  const favNames = favsOf(id).map((u) => u === S.me.id ? "You" : (ps[u]?.name || "Someone"));
  const sheet = openSheet(`
    <button class="close sheet-x" data-close aria-label="Close listing">${X}</button>
    ${l.photo ? `<img class="lphoto" src="${esc(l.photo)}" alt="Photo of the listing" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}
    <div class="sheethead"><div>
      <div class="section-label">${esc(srcLabel)}${l.listedAt ? " · " + esc(new Date(l.listedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })) : ""}</div>
      <h2 class="tnum">${l.price ? money(l.price) + "/mo" : "Price unknown"}</h2>
      <div class="meta">${esc([bedsLabel(l.beds), l.baths ? l.baths + " bath" : "", l.hood].filter(Boolean).join(" · "))}</div>
      ${l.addr ? `<div class="muted" style="font-size:14.5px">${esc(l.addr)}</div>` : ""}
    </div><div class="headbtns">${heartBtn(id, true)}</div></div>
    ${favNames.length ? `<div class="favby">♥ Favorited by ${esc(favNames.join(" and "))}</div>` : ""}
    <div class="meta">${petTags(l)}${extraTags(l)}</div>
    ${c ? `<div class="commute"><div class="section-label">Getting around</div>
      <div>${bullets(c.station.l)} <span><b>${esc(c.station.n)}</b> · ${c.walk} min walk</span></div>
      <div class="trips">${PLACES.map((p) => `<div class="trip"><span>${esc(p.label)}</span><b class="tnum">≈${c.times[p.id]} min</b></div>`).join("")}</div>
      <small class="muted">Rough estimates from distance. Check exact trips in a maps app.</small></div>` : ""}
    ${S.readinessHTML ? S.readinessHTML(l) : ""}
    ${l.note ? `<div><div class="section-label">Note</div><p style="margin:6px 0 0">${esc(l.note)}</p></div>` : ""}
    <div class="btnrow">${l.url ? `<a class="btn dark" href="${esc(l.url)}" target="_blank" rel="noopener">Open listing ↗</a>` : ""}
      ${l.url ? `<button class="btn" id="copyLink">Copy link</button>` : ""}</div>
    <div><div class="section-label" style="margin-bottom:8px">Status</div>
      <div class="statusbar" id="statusBar">${STATUS.map((s) => `<button data-s="${s}" aria-pressed="${pick.status === s}">${STATUS_LABEL[s]}</button>`).join("")}</div></div>
    <div><div class="section-label" style="margin-bottom:6px">Your rating</div>
      <div class="stars" id="stars" role="group" aria-label="Your rating">${[1, 2, 3, 4, 5].map((n) => `<button data-n="${n}" class="${n <= myRating ? "on" : ""}" aria-label="${n} star${n > 1 ? "s" : ""}">★</button>`).join("")}</div>
      ${ratingIds.filter((u) => u !== S.me.id).length ? `<div class="raters" style="margin-top:8px">${ratingIds.filter((u) => u !== S.me.id).map((u) => `<div class="rater">${avatar(u) ? `<img alt="" src="${esc(avatar(u))}">` : ""}<span>${esc(name(u))}</span><span class="minis">${"★".repeat(pick.ratings[u])}</span></div>`).join("")}</div>` : ""}
    </div>
    <div><div class="section-label" style="margin-bottom:8px">Notes</div>
      <div class="notes">${notes.map((n) => `<div class="note">${avatar(n.by) ? `<img alt="" src="${esc(avatar(n.by))}">` : "<span></span>"}<div><div class="t">${esc(name(n.by))} · ${esc(new Date(n.t).toLocaleDateString("en-US", { month: "short", day: "numeric" }))}</div>${esc(n.text)}</div></div>`).join("") || `<span class="muted" style="font-size:14px">No notes yet.</span>`}</div>
      <form class="inline" id="noteForm" style="margin-top:10px"><input type="text" id="noteIn" placeholder="Add a note (e.g. asked about the dog)" aria-label="Add a note"><button class="btn" type="submit">Add</button></form>
    </div>
    ${l.src === "manual" && (l.addedBy === S.me.id || !l.addedBy) ? `<div><button class="btn ghost danger" id="delL">Remove this listing</button><div id="delConfirm"></div></div>` : ""}
  `, { label: "Listing", onClose: () => { S.selected = null; renderPins(); } });
  S.wireReadiness?.(sheet, l);
  sheet.querySelectorAll("#statusBar button").forEach((b) => (b.onclick = () => { savePick(id, { status: b.dataset.s }); sheet.querySelectorAll("#statusBar button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
  sheet.querySelectorAll("#stars button").forEach((b) => (b.onclick = () => {
    if (!S.me.id) { toast("Sign in to rate listings."); return; }
    const n = Number(b.dataset.n); savePick(id, { ratings: { [S.me.id]: n } });
    sheet.querySelectorAll("#stars button").forEach((x) => x.classList.toggle("on", Number(x.dataset.n) <= n));
  }));
  $("#noteForm", sheet).onsubmit = (e) => {
    e.preventDefault(); const v = $("#noteIn", sheet).value.trim(); if (!v) return;
    const nid = "n" + Date.now().toString(36);
    savePick(id, { notes: { [nid]: { by: S.me.id, t: Date.now(), text: v.slice(0, 1000) } } });
    openListing(id);
  };
  $("#copyLink", sheet)?.addEventListener("click", async () => { try { await navigator.clipboard.writeText(l.url); toast("Link copied"); } catch { toast(l.url); } });
  $("#delL", sheet)?.addEventListener("click", () => {
    $("#delConfirm", sheet).innerHTML = `<div class="btnrow" style="margin-top:8px"><span class="muted" style="align-self:center">Remove it for both of you?</span><button class="btn danger" id="delYes">Remove</button><button class="btn" id="delNo">Keep</button></div>`;
    $("#delNo", sheet).onclick = () => ($("#delConfirm", sheet).innerHTML = "");
    $("#delYes", sheet).onclick = () => {
      S.listings.delete(id); closeSheet(); renderSearch();
      if (S.db) { queueWrite("listings/" + id, () => S.db.doc("listings/" + id).delete()); queueWrite("picks/" + id, () => S.db.doc("picks/" + id).delete()); }
      toast("Listing removed");
    };
  });
}
S.openListing = openListing;

/* ---------- filters sheet ---------- */
$("#filterBtn").onclick = () => {
  const f = S.filters;
  const sheet = openSheet(`
    <div class="sheethead"><h2>Filters</h2><button class="close" data-close aria-label="Close">${X}</button></div>
    <div class="field"><span>Max rent</span><div class="range"><input type="range" id="fMax" min="1500" max="3500" step="50" value="${f.max}" aria-label="Max rent"><output id="fMaxO" class="tnum">${money(f.max)}</output></div>
      <small>Goal is $2,000. Solid green pins are $2,000 or less; green-outlined pins are up to $2,400.</small></div>
    <div class="field"><span>Size</span><div class="pills" role="radiogroup">${[["any", "Any"], ["0", "Studio"], ["1", "1 BR"], ["2", "2+ BR"]].map(([v, t]) => `<label><input type="radio" name="fBeds" value="${v}" ${f.beds === v ? "checked" : ""}><span>${t}</span></label>`).join("")}</div></div>
    <div class="field"><span>Type of place</span><div class="pills" role="radiogroup">${[["whole", "Whole apartment"], ["room", "Room in shared apt"], ["any", "Both"]].map(([v, t]) => `<label><input type="radio" name="fKind" value="${v}" ${(f.kind || "whole") === v ? "checked" : ""}><span>${t}</span></label>`).join("")}</div>
      <small>Rooms are spotted from the listing text, so a few may slip through. Check the listing to be sure.</small></div>
    <div class="field"><span>Must allow</span><div class="pills">
      <label><input type="checkbox" id="fDog" ${f.dog ? "checked" : ""}><span>Dogs</span></label>
      <label><input type="checkbox" id="fCat" ${f.cat ? "checked" : ""}><span>Cats</span></label></div>
      <small>Turning these on hides listings whose pet policy is unknown. "Dogs" also hides buildings with a dog weight limit under 50 lb.</small></div>
    <div class="field"><span>Other</span><div class="pills">
      <label><input type="checkbox" id="fFee" ${f.noFee ? "checked" : ""}><span>No fee only</span></label>
      <label><input type="checkbox" id="fAff" ${f.aff ? "checked" : ""}><span>Affordable / stabilized</span></label>
      <label><input type="checkbox" id="fPass" ${f.hidePassed ? "checked" : ""}><span>Hide passed</span></label>
      <label><input type="checkbox" id="fFav" ${f.favs ? "checked" : ""}><span>♥ Favorites only</span></label></div></div>
    <div class="btnrow"><button class="btn primary" data-close>Show results</button><button class="btn ghost" id="fReset">Reset</button></div>`, { label: "Filters" });
  const apply = () => {
    f.max = Number($("#fMax", sheet).value); $("#fMaxO", sheet).textContent = money(f.max);
    f.beds = sheet.querySelector("input[name=fBeds]:checked")?.value || "any";
    f.kind = sheet.querySelector("input[name=fKind]:checked")?.value || "whole";
    f.dog = $("#fDog", sheet).checked; f.cat = $("#fCat", sheet).checked; f.noFee = $("#fFee", sheet).checked; f.aff = $("#fAff", sheet).checked; f.hidePassed = $("#fPass", sheet).checked; f.favs = $("#fFav", sheet).checked;
    store.set("filters", f); renderSearch();
  };
  sheet.addEventListener("input", apply); sheet.addEventListener("change", apply);
  $("#fReset", sheet).onclick = () => { Object.assign(f, { max: 2800, beds: "any", kind: "whole", dog: false, cat: false, noFee: false, aff: false, hidePassed: true, favs: false }); store.set("filters", f); renderSearch(); $("#filterBtn").click(); };
};

/* ---------- add listing ---------- */
$("#addBtn").onclick = () => openAdd({});
function openAdd(draft) {
  const hoodOpts = Object.keys(HOODS).sort().map((h) => `<option ${draft.hood === h ? "selected" : ""}>${esc(h)}</option>`).join("");
  const yn = (name, v) => `<div class="pills">${[["yes", "Yes"], ["no", "No"], ["", "Not sure"]].map(([val, t]) => `<label><input type="radio" name="${name}" value="${val}" ${(v === true && val === "yes") || (v === false && val === "no") || (v == null && val === "") ? "checked" : ""}><span>${t}</span></label>`).join("")}</div>`;
  const sheet = openSheet(`
    <div class="sheethead"><div><h2>Add a listing</h2><p class="muted" style="margin:4px 0 0;font-size:14.5px">From StreetEasy, Zillow, Craigslist, Facebook, a friend… It shows up on the map for both of you.</p></div><button class="close" data-close aria-label="Close">${X}</button></div>
    ${S.sample ? `<details id="aiBox"><summary style="cursor:pointer;font-weight:700">Paste the listing text and let Claude fill this in</summary>
      <div class="field" style="margin-top:10px"><textarea id="aiText" placeholder="Paste the whole listing description here"></textarea>
      <div class="btnrow"><button class="btn dark" type="button" id="aiGo">Fill the form</button><span class="muted" id="aiMsg" style="align-self:center;font-size:14px"></span></div></div></details>` : ""}
    <form id="addForm" class="inner">
      <label class="field"><span>Link</span><input type="url" id="aUrl" placeholder="https://…" value="${esc(draft.url || "")}" data-autofocus></label>
      <div class="grid2">
        <label class="field"><span>Rent per month</span><div class="money"><input type="number" id="aPrice" inputmode="numeric" min="0" step="25" value="${esc(draft.price || "")}" required></div></label>
        <label class="field"><span>Size</span><select id="aBeds"><option value="0" ${draft.beds == 0 && draft.beds !== "" && draft.beds != null ? "selected" : ""}>Studio</option><option value="1" ${draft.beds == 1 ? "selected" : ""}>1 BR</option><option value="2" ${draft.beds == 2 ? "selected" : ""}>2 BR</option><option value="3" ${Number(draft.beds) >= 3 ? "selected" : ""}>3+ BR</option></select></label>
      </div>
      <label class="field"><span>Neighborhood</span><select id="aHood"><option value="">Choose…</option>${hoodOpts}</select></label>
      <label class="field"><span>Address or cross streets <small>(optional)</small></span><input type="text" id="aAddr" value="${esc(draft.addr || "")}"></label>
      <div class="field"><span>Exact spot on the map <small>(optional)</small></span><div class="btnrow"><button class="btn" type="button" id="aPick">${draft.lat ? "Spot picked ✓ · change" : "Pick on map"}</button></div></div>
      <div class="grid2"><div class="field"><span>Dogs allowed?</span>${yn("aDog", draft.dogs)}</div><div class="field"><span>Cats allowed?</span>${yn("aCat", draft.cats)}</div></div>
      <div class="field"><span>Other</span><div class="pills">
        <label><input type="checkbox" id="aFee" ${draft.noFee ? "checked" : ""}><span>No fee</span></label>
        <label><input type="checkbox" id="aAff" ${draft.aff ? "checked" : ""}><span>Income-restricted</span></label>
        <label><input type="checkbox" id="aStab" ${draft.stab ? "checked" : ""}><span>Rent-stabilized</span></label></div></div>
      <label class="field"><span>Note <small>(optional)</small></span><input type="text" id="aNote" value="${esc(draft.note || "")}" placeholder="e.g. 3rd floor walk-up, laundry in building"></label>
      <div class="btnrow"><button class="btn primary" type="submit">Add to map</button><button class="btn ghost" type="button" data-close>Cancel</button></div>
      <p class="muted" id="aErr" style="margin:0;font-size:14px" role="alert"></p>
    </form>`, { label: "Add a listing" });
  const read = () => {
    const v = (n) => sheet.querySelector(`input[name=${n}]:checked`)?.value;
    const tri = (x) => x === "yes" ? true : x === "no" ? false : null;
    return Object.assign(draft, {
      url: $("#aUrl", sheet).value.trim(), price: Number($("#aPrice", sheet).value) || null, beds: Number($("#aBeds", sheet).value),
      hood: $("#aHood", sheet).value, addr: $("#aAddr", sheet).value.trim(), dogs: tri(v("aDog")), cats: tri(v("aCat")),
      noFee: $("#aFee", sheet).checked, aff: $("#aAff", sheet).checked, stab: $("#aStab", sheet).checked, note: $("#aNote", sheet).value.trim(),
    });
  };
  $("#aPick", sheet).onclick = () => { read(); closeSheet(); startPick("listing", (ll) => { if (ll) { draft.lat = ll.lat; draft.lng = ll.lng; } openAdd(draft); }); };
  $("#aiGo", sheet)?.addEventListener("click", async () => {
    const txt = $("#aiText", sheet).value.trim(); if (!txt) return;
    const msg = $("#aiMsg", sheet); msg.textContent = "Reading it…"; $("#aiGo", sheet).disabled = true;
    try {
      const out = await S.sample.json(`Extract rental listing facts from the text below. Reply with only a JSON object with these keys (use null when the text doesn't say):
{"price": number (monthly rent in USD), "beds": number (0 for studio), "address": string, "neighborhood": one of ${JSON.stringify(Object.keys(HOODS))} or null, "dogs": true|false|null, "cats": true|false|null, "noFee": true|false, "incomeRestricted": true|false, "rentStabilized": true|false, "note": string (one short line of the most useful other detail, like floor, laundry, utilities)}

Listing text:
"""${txt.slice(0, 8000)}"""`, { modelTier: "quick" });
      read();
      if (out && typeof out === "object") {
        if (Number(out.price)) draft.price = Number(out.price);
        if (out.beds != null && !isNaN(out.beds)) draft.beds = Number(out.beds);
        if (out.address) draft.addr = String(out.address).slice(0, 200);
        if (out.neighborhood && HOODS[out.neighborhood]) draft.hood = out.neighborhood;
        if (typeof out.dogs === "boolean") draft.dogs = out.dogs;
        if (typeof out.cats === "boolean") draft.cats = out.cats;
        draft.noFee = !!out.noFee; draft.aff = !!out.incomeRestricted; draft.stab = !!out.rentStabilized;
        if (out.note) draft.note = String(out.note).slice(0, 300);
      }
      openAdd(draft); toast("Filled in. Check it over, then add it.");
    } catch (e) {
      msg.textContent = e?.code === "not_granted" || e?.code === "sampling_disabled" ? "Claude isn't available here. Fill it in by hand." : "Couldn't read that. Fill it in by hand or try again.";
      $("#aiGo", sheet).disabled = false;
      if (e?.code === "not_granted" || e?.code === "sampling_disabled") $("#aiBox", sheet).remove();
    }
  });
  $("#addForm", sheet).onsubmit = (e) => {
    e.preventDefault(); read();
    if (!draft.lat && !draft.hood) { $("#aErr", sheet).textContent = "Choose a neighborhood or pick the spot on the map so it can go on the map."; return; }
    let lat = draft.lat, lng = draft.lng;
    if (lat == null) { const [a, b] = HOODS[draft.hood]; lat = a + (Math.random() - 0.5) * 0.008; lng = b + (Math.random() - 0.5) * 0.01; }
    const doc = { src: "manual", url: draft.url, price: draft.price, beds: draft.beds, hood: draft.hood, addr: draft.addr, lat, lng, dogs: draft.dogs, cats: draft.cats, noFee: draft.noFee, aff: draft.aff, stab: draft.stab, note: draft.note, addedAt: Date.now(), listedAt: Date.now(), addedBy: S.me.id };
    const id = "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    S.listings.set(id, norm(id, doc)); closeSheet(); renderSearch();
    if (map) { S.mapShown = true; map.setView([lat, lng], Math.max(map.getZoom(), 14)); }
    if (S.db) queueWrite("listings/" + id, async () => { await S.db.doc("listings/" + id).set(doc); S.wroteOK = true; });
    toast(passes(S.listings.get(id)) ? "Added to the map" : "Added, but your filters are hiding it");
  };
}

/* ---------- shortlist ---------- */
function renderShortN() {
  const n = [...S.listings.keys()].filter((id) => isFav(id) || ["interested", "toured", "applied"].includes(statusOf(id))).length;
  const el = $("#shortN"); el.hidden = !n; el.textContent = n;
}
async function renderShortlist() {
  const el = $("#shortEl");
  const favItems = [...S.listings.values()].filter((l) => isFav(l.id));
  const groups = ["applied", "toured", "interested"].map((s) => ({ s, items: [...S.listings.values()].filter((l) => statusOf(l.id) === s) }));
  const passed = [...S.listings.values()].filter((l) => statusOf(l.id) === "passed");
  const allIds = []; groups.forEach((g) => g.items.forEach((l) => allIds.push(...Object.keys(S.picks.get(l.id)?.ratings || {}))));
  const ps = await profilesFor(allIds);
  const ratingLine = (l) => {
    const r = S.picks.get(l.id)?.ratings || {};
    const parts = Object.entries(r).map(([u, n]) => `<span class="rater">${ps[u]?.avatarUrl ? `<img alt="" src="${esc(ps[u].avatarUrl)}">` : ""}<span>${esc(u === S.me.id ? "You" : (ps[u]?.name || "Someone"))}</span><span class="minis">${"★".repeat(n)}</span></span>`);
    return parts.length ? `<div class="meta" style="gap:14px">${parts.join("")}</div>` : "";
  };
  const any = groups.some((g) => g.items.length) || favItems.length;
  el.innerHTML = `
    <div class="hello"><h2>Shortlist</h2><p>Places either of you marked Interested, Toured or Applied. Rate them separately to see where you agree.</p></div>
    ${any ? "" : `<div class="empty"><h3>Nothing saved yet</h3><p>Tap the heart on any listing to save it here. Statuses like Interested or Applied show up here too.</p><div class="btnrow"><button class="btn primary" id="goSearch">Go to search</button></div></div>`}
    ${favItems.length ? `<div class="group wrap" style="gap:10px"><h2>♥ Favorites <span class="tag">${favItems.length}</span></h2><div class="lst">${favItems.sort((a, b) => (a.price || 0) - (b.price || 0)).map((l) => listingCard(l)).join("")}</div></div>` : ""}
    ${groups.filter((g) => g.items.length).map((g) => `<div class="group wrap" style="gap:10px"><h2>${STATUS_LABEL[g.s]} <span class="tag">${g.items.length}</span></h2>
      <div class="lst">${g.items.sort((a, b) => (a.price || 0) - (b.price || 0)).map((l) => listingCard(l, ratingLine(l))).join("")}</div></div>`).join("")}
    ${passed.length ? `<details><summary class="muted" style="cursor:pointer">Passed (${passed.length})</summary><div class="lst" style="margin-top:10px">${passed.map((l) => listingCard(l)).join("")}</div></details>` : ""}`;
  el.querySelectorAll(".lcard").forEach((b) => (b.onclick = () => openListing(b.dataset.id)));
  $("#goSearch", el)?.addEventListener("click", () => setView("search"));
}

/* ---------- settings ---------- */
$("#settingsBtn").onclick = () => {
  const sheet = openSheet(`
    <div class="sheethead"><h2>Settings</h2><button class="close" data-close aria-label="Close">${X}</button></div>
    <div class="card"><div class="section-label">Commute times go to</div>
      ${PLACES.map((p) => `<div>${esc(p.label)} <span class="muted">· ${esc(p.addr)}</span></div>`).join("") || `<small class="muted">Not set yet.</small>`}</div>
    <div class="card"><div class="section-label">Daily listings pull</div>
      <div><b>${S.feedUpdated ? "Connected" : "Not connected yet"}</b></div>
      <small class="muted">${S.feedUpdated ? `StreetEasy + Craigslist, $2,800 or less. Last update: ${esc(new Date(S.feedUpdated).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}` : "New StreetEasy and Craigslist listings under $2,800 get added every morning."}</small></div>
    <div class="card"><div class="section-label">Map key</div>
      <div class="meta"><span class="tag k-great">≤ $2,000</span><span class="tag k-ok">≤ $2,400</span><span class="tag">≤ $2,800</span></div>
      <small class="muted">Zoom in to see prices and subway stations. Outlined pins are on the shortlist.</small></div>
    <div class="card"><div class="section-label">Signed in</div><div>${esc(S.me.email || S.me.name || "")}</div>
      <div class="btnrow"><button class="btn" id="signOut">Sign out</button></div></div>`, { label: "Settings" });
  $("#signOut", sheet)?.addEventListener("click", () => window.__signOut?.());
};

/* ---------- people ---------- */
async function renderWho() {
  if (!S.user) return;
  const ids = new Set([S.me.id]);
  S.picks.forEach((p) => Object.keys(p.ratings || {}).forEach((u) => ids.add(u)));
  S.guides.forEach((g) => g.by && ids.add(g.by));
  const ps = await profilesFor([...ids]);
  $("#who").innerHTML = [...ids].filter(Boolean).slice(0, 3).map((u) => ps[u] ? `<img src="${esc(ps[u].avatarUrl)}" alt="${esc(ps[u].name || "")}" title="${esc(u === S.me.id ? "You" : ps[u].name || "")}">` : "").join("");
}

/* ---------- boot ---------- */
initMap();
setMode(S.mode);
const start = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "home";
setView(start);
S.visible = visible; S.statusOf = statusOf;
S.renderAll = () => { renderSearch(); if (S.view === "home") S.renderHome?.(); if (S.view === "shortlist") renderShortlist(); if (S.view === "guides") S.renderGuides?.(); };

(async () => {
  if (!window.claude?.use) { $("#offline").hidden = false; S.renderGuides?.(); return; }
  const [db, user, sample, downloads] = await Promise.all(["db", "user", "sample", "downloads"].map((n) => window.claude.use(n).catch(() => null)));
  S.db = db; S.user = user; S.sample = sample; S.downloads = downloads;
  if (user) { S.me = await user.me(); const cw = await user.can("data.write"); if (cw === false) { S.canWrite = false; } }
  if (!db) { $("#offline").hidden = false; S.renderAll(); return; }
  S.live = true;
  let manual = new Map(), feed = new Map();
  const merge = () => { S.listings = new Map([...feed, ...manual]); commuteCache.clear(); renderSearch(); if (S.view === "shortlist") renderShortlist(); };
  db.collection("listings").onSnapshot((snap) => { manual = new Map(snap.docs.map((d) => [d.id, norm(d.id, d.data())])); merge(); }, () => toast("Lost connection to listings. Reload to reconnect."));
  db.collection("feed").onSnapshot((snap) => {
    feed = new Map();
    let last = 0;
    for (const d of snap.docs) { const v = d.data() || {}; last = Math.max(last, v.seenAt || 0); feed.set(d.id, norm(d.id, v)); }
    S.feedUpdated = last;
    merge();
  });
  db.collection("picks").onSnapshot((snap) => {
    S.picks = new Map(snap.docs.map((d) => [d.id, d.data()])); renderSearch(); renderWho();
    if (S.view === "shortlist") renderShortlist();
  });
  db.collection("guides").onSnapshot((snap) => {
    const fresh = new Map(snap.docs.map((d) => [d.id, d.data()]));
    S.onGuidesSnapshot ? S.onGuidesSnapshot(fresh) : (S.guides = fresh);
  });
  db.doc("daily/today").onSnapshot((d) => { S.daily = d.exists ? d.data() : null; if (S.view === "home") S.renderHome?.(); });
  db.doc("checklist/main").onSnapshot((d) => { S.checklist = d.exists ? Object.assign({}, d.data()) : {}; if (S.view === "home") S.renderHome?.(); });
  db.doc("settings/main").onSnapshot((d) => { S.settings = d.exists ? Object.assign({}, d.data()) : {}; applyProfile(); commuteCache.clear(); if (S.view === "home") S.renderHome?.(); if (S.view === "guides") S.renderGuides?.(); renderAnchors(); renderSearch(); });
  renderWho();
  S.renderGuides?.();
  if (!S.canWrite) toast("You can look around, but changes won't save for you.");
})();
})();
