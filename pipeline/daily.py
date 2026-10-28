"""Daily listings pull for NYC Move (runs in GitHub Actions).

1. Runs the StreetEasy and Craigslist scrapers on Apify.
2. Cleans and merges the results into the private database (Supabase, coll "feed", one row per listing).
3. Retires listings older than 30 days unless someone saved them.
4. Writes a short daily note and emails a summary.

Environment (GitHub secrets): APIFY_TOKEN, SUPABASE_URL, SUPABASE_SECRET_KEY,
SMTP_USER + SMTP_PASS (optional, Gmail app password), SITE_URL.
Run with --dry-run to skip all writes and the email.
"""
import datetime, json, math, os, random, re, smtplib, sys, time, urllib.error, urllib.parse, urllib.request
from email.message import EmailMessage
from shapely.geometry import shape, Point

DRY = "--dry-run" in sys.argv
MAX_RENT, MIN_RENT, MAX_AGE_DAYS = 2800, 900, 30
HERE = os.path.dirname(os.path.abspath(__file__))
def ENV(k, d=None):
    v = os.environ.get(k)
    return v.strip() if isinstance(v, str) and v.strip() else d  # ignore stray spaces/newlines from pasted secrets
SB_URL = (ENV("SUPABASE_URL") or "").rstrip("/")
def _clean_key(v):
    """Pull just the key out of whatever was pasted (extra words, spaces or line breaks)."""
    m = re.search(r"sb_(?:secret|publishable)_[A-Za-z0-9_\-]+|eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+", v or "")
    return m.group(0) if m else re.sub(r"\s+", "", v or "")
SB_KEY = _clean_key(os.environ.get("SUPABASE_SECRET_KEY"))
SITE = ENV("SITE_URL") or ""
from zoneinfo import ZoneInfo
NY = ZoneInfo("America/New_York")

SE_INPUT = {"startUrls": [{"url": f"https://streeteasy.com/for-rent/{h}?sort_by=listed_desc"} for h in
            ["ridgewood", "bushwick", "bedford-stuyvesant", "kensington", "crown-heights", "glendale", "cypress-hills", "greenpoint"]],
            "maxItems": 120, "flattenDatasetItems": False}
SE_FIELDS = "id,urlPath,price,bedroomCount,fullBathroomCount,areaName,street,displayUnit,unit,geoPoint,onMarketAt,createdAt,availableAt,monthsFree,netEffectivePrice,description,images"
CL_INPUT = {"locations": ["newyork"], "category": "apa", "minPrice": 1200, "maxPrice": 2800, "catsOk": True, "dogsOk": True,
            "maxItems": 60, "sort": "date", "scrapeDetails": True}
CL_FIELDS = "postingId,url,title,body,price,bedrooms,bathrooms,latitude,longitude,postedAt,attributes,images"

HOODS = {"Ridgewood":[40.7043,-73.9055],"Bushwick":[40.6944,-73.9213],"East Williamsburg":[40.714,-73.9365],"Williamsburg":[40.7081,-73.9571],"Greenpoint":[40.7305,-73.9515],"Bed-Stuy":[40.6872,-73.9418],"Clinton Hill":[40.688,-73.965],"Fort Greene":[40.689,-73.974],"Crown Heights":[40.6694,-73.9422],"Prospect Lefferts Gardens":[40.659,-73.952],"Flatbush":[40.641,-73.959],"Kensington":[40.639,-73.973],"Windsor Terrace":[40.654,-73.979],"Sunset Park":[40.646,-74.01],"Cypress Hills":[40.683,-73.878],"Glendale":[40.702,-73.883],"Middle Village":[40.717,-73.881],"Maspeth":[40.723,-73.912],"Woodhaven":[40.69,-73.856],"Astoria":[40.764,-73.923],"Long Island City":[40.7447,-73.9485],"Sunnyside":[40.743,-73.92],"Woodside":[40.745,-73.903],"Jackson Heights":[40.7557,-73.8831],"Elmhurst":[40.736,-73.878],"Lower East Side":[40.715,-73.9843],"East Village":[40.7265,-73.9815],"Chinatown":[40.7158,-73.997],"Two Bridges":[40.711,-73.991],"Washington Heights":[40.8417,-73.9394],"Inwood":[40.8677,-73.9212],"Harlem":[40.8116,-73.9465],"East Harlem":[40.7957,-73.9389]}
NOTES = [
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
]

# ---------------- http ----------------
def _http_once(method, url, body=None, headers=None, timeout=120):
    data = json.dumps(body).encode() if body is not None else None
    h = {"Content-Type": "application/json", **(headers or {})}
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read()
        return json.loads(raw) if raw else None

def http(method, url, body=None, headers=None, timeout=120):
    """Reads (GET) are retried on dropped connections or server hiccups; writes run once."""
    import http.client
    tries = 4 if method == "GET" else 1
    for i in range(tries):
        try:
            return _http_once(method, url, body, headers, timeout)
        except urllib.error.HTTPError as e:
            if e.code < 500 or i == tries - 1: raise
            err = e
        except (http.client.IncompleteRead, urllib.error.URLError, TimeoutError, ConnectionError, json.JSONDecodeError) as e:
            if i == tries - 1: raise
            err = e
        wait = (5, 15, 30)[i]
        print(f"retrying in {wait}s after: {type(err).__name__}")
        time.sleep(wait)

def sb(method, path, body=None, prefer=None):
    h = {"apikey": SB_KEY}
    if not SB_KEY.startswith("sb_"): h["Authorization"] = "Bearer " + SB_KEY  # legacy service_role JWT
    if prefer: h["Prefer"] = prefer
    return http(method, f"{SB_URL}/rest/v1/{path}", body, h)

def key_kind():
    if SB_KEY.startswith("sb_secret_"): return "secret key"
    if SB_KEY.startswith("sb_publishable_"): return "PUBLISHABLE key (wrong one: needs a secret key)"
    if SB_KEY.startswith("eyJ"): return "legacy JWT key"
    return "UNRECOGNISED value" if SB_KEY else "MISSING"

def check_supabase():
    """Fail fast, before the long scrape, if the database can't be reached."""
    print(f"Supabase key: {key_kind()}, {len(SB_KEY)} characters")
    try:
        sb("GET", "docs?select=id&limit=1")
        print("Supabase: connected")
    except urllib.error.HTTPError as e:
        print(f"Supabase: HTTP {e.code} {e.read()[:300]!r}"); sys.exit(1)
    except Exception as e:
        print(f"Supabase: {type(e).__name__}: {e}"); sys.exit(1)

def sb_all(coll):
    out = {}
    for start in range(0, 100000, 1000):
        rows = sb("GET", f"docs?coll=eq.{coll}&select=id,data&limit=1000&offset={start}") or []
        for r in rows: out[r["id"]] = r["data"]
        if len(rows) < 1000: break
    return out

def sb_put(coll, docs):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    rows = [{"coll": coll, "id": k, "data": v, "updated_at": now} for k, v in docs.items()]
    for i in range(0, len(rows), 100):
        if not DRY: sb("POST", "docs?on_conflict=coll,id", rows[i:i+100], "resolution=merge-duplicates,return=minimal")

def sb_delete(coll, ids):
    ids = list(ids)
    for i in range(0, len(ids), 80):
        q = ",".join(urllib.parse.quote(x, safe="") for x in ids[i:i+80])
        if not DRY: sb("DELETE", f"docs?coll=eq.{coll}&id=in.({q})", prefer="return=minimal")

# ---------------- apify ----------------
def apify(actor, inp, fields, charge, timeout):
    tok = ENV("APIFY_TOKEN")
    base = "https://api.apify.com/v2"
    run = http("POST", f"{base}/acts/{actor.replace('/', '~')}/runs?token={tok}&timeout={timeout}&maxTotalChargeUsd={charge}", inp)["data"]
    rid, t0 = run["id"], time.time()
    while run["status"] in ("READY", "RUNNING") and time.time() - t0 < timeout + 120:
        run = http("GET", f"{base}/actor-runs/{rid}?token={tok}&waitForFinish=60", timeout=90)["data"]
    if run["status"] not in ("SUCCEEDED", "TIMED-OUT", "ABORTED"):
        raise RuntimeError(f"{actor}: {run['status']}")
    items = http("GET", f"{base}/datasets/{run['defaultDatasetId']}/items?token={tok}&clean=true&limit=1000&fields={fields}", timeout=180)
    print(f"{actor}: {run['status']}, {len(items)} items")
    return items

# ---------------- cleaning ----------------
def km(a, b, c, d):
    t = math.pi/180; x = math.sin((c-a)*t/2)**2 + math.cos(a*t)*math.cos(c*t)*math.sin((d-b)*t/2)**2
    return 12742*math.asin(math.sqrt(x))

from shapely.validation import make_valid
BOROS = [(b["name"], make_valid(shape({"type": b["type"], "coordinates": b["coords"]}))) for b in json.loads(open(os.path.join(HERE, "..", "data", "geo.js")).read().split("=", 1)[1].rstrip().rstrip(";"))["boros"]]
def place(lat, lng):
    pt = Point(lng, lat)
    boro = None
    for n, g in BOROS:
        try:
            if g.contains(pt): boro = n; break
        except Exception:
            if g.buffer(0).contains(pt): boro = n; break
    if not boro or boro == "Staten Island": return None, None
    best = min(HOODS.items(), key=lambda kv: km(lat, lng, *kv[1]))
    return boro, (best[0] if km(lat, lng, *best[1]) < 1.6 else boro)

def pets_from_text(t):
    t = (t or "").lower(); dogs = cats = None
    if re.search(r"\bno pets\b|pets not allowed|no animals", t): return False, False, None
    if re.search(r"pets? (allowed|welcome|friendly|ok)|pet[- ]friendly|dogs? (allowed|welcome|ok|friendly)", t): dogs = cats = True
    if re.search(r"cats? (only|ok|allowed|welcome)", t): cats = True
    if re.search(r"cats? only|no dogs", t): dogs = False
    m = re.search(r"(?:dogs?|pets?)[^.]{0,40}?(?:under|up to|max(?:imum)?|less than)\s*(\d{2,3})\s*(?:lb|lbs|pounds)", t)
    return dogs, cats, (int(m.group(1)) if m else None)

SHARED_RX = re.compile(r"\b(rooms? ((for|4) rent|available|in (a|an|my|our|shared))|private (bed)?room|shared (apartment|apt|house|home|unit|kitchen|bath(room)?)|room ?mates? (wanted|needed)|looking for (a )?room ?mate|housemates?|furnished room|bedroom available in|share (a|an|my|our) (apt|apartment|house|home)|co-?living)\b", re.I)
NOT_SHARED_RX = re.compile(r"(great|perfect|ideal|good) for room ?mates|room ?mates? (welcome|friendly|ok)", re.I)
def is_shared(t):
    """A room in someone's place rather than a whole apartment."""
    return bool(t) and bool(SHARED_RX.search(t)) and not NOT_SHARED_RX.search(SHARED_RX.sub("", t))

def flags(t):
    t = (t or "").lower()
    return {"noFee": bool(re.search(r"\bno[- ]fee\b|no broker fee", t)),
            "aff": bool(re.search(r"income[- ]restricted|\bami\b|affordable housing|housing connect", t)),
            "stab": bool(re.search(r"rent[- ]stabili[sz]ed", t))}

def iso_ms(s):
    if not s: return None
    try: return int(datetime.datetime.fromisoformat(str(s).replace("Z", "+00:00")).timestamp()*1000)
    except Exception: return None

def g(r, k):
    if k in r: return r[k]
    cur = r
    for part in k.split("."):
        if not isinstance(cur, dict) or part not in cur: return None
        cur = cur[part]
    return cur

def first_image(imgs):
    for x in imgs or []:
        if isinstance(x, str) and x.startswith("http"): return x
        if isinstance(x, dict):
            for k in ("url", "src", "large", "medium", "full"):
                v = x.get(k)
                if isinstance(v, str) and v.startswith("http"): return v
    return None

def from_se(r):
    lat, lng, price = g(r, "geoPoint.latitude"), g(r, "geoPoint.longitude"), r.get("price") or g(r, "pricing.price")
    if not (lat and lng and price): return None
    boro, hood = place(lat, lng)
    if not boro: return None
    desc = r.get("description") or ""
    dogs, cats, maxDog = pets_from_text(desc); f = flags(desc)
    u = str(r.get("displayUnit") or r.get("unit") or "").strip().lstrip("#")
    addr = " ".join(x for x in [r.get("street"), ("#" + u if u else "")] if x)
    path = r.get("urlPath") or ""
    return "se" + str(r.get("id") or r.get("listingId")), {
        "src": "streeteasy", "url": ("https://streeteasy.com" + path) if path.startswith("/") else path, "price": int(price),
        "beds": r.get("bedroomCount"), "baths": r.get("fullBathroomCount"), "hood": hood if hood != boro else (r.get("areaName") or boro),
        "addr": addr, "lat": round(lat, 6), "lng": round(lng, 6), "dogs": dogs, "cats": cats, "maxDog": maxDog,
        "noFee": f["noFee"], "aff": f["aff"], "stab": f["stab"],
        "note": ("%s months free · net $%s" % (r.get("monthsFree"), r.get("netEffectivePrice"))) if r.get("monthsFree") else "",
        "shared": is_shared(desc),
        "listedAt": iso_ms(r.get("onMarketAt") or r.get("createdAt")), "avail": str(r.get("availableAt"))[:10] if r.get("availableAt") else None,
        "photo": first_image(r.get("images"))}

def from_cl(r):
    lat, lng, price = r.get("latitude") or g(r, "geo.lat"), r.get("longitude") or g(r, "geo.lng"), r.get("price")
    if not (lat and lng and price): return None
    boro, hood = place(lat, lng)
    if not boro: return None
    body = (r.get("title") or "") + " " + (r.get("body") or ""); f = flags(body)
    _, _, maxDog = pets_from_text(body)
    fee = str(g(r, "attributes.broker_fee_explained") or "").lower()
    return "cl" + str(r.get("postingId") or r.get("id")), {
        "src": "craigslist", "url": r.get("url") or "", "title": (r.get("title") or "")[:140], "price": int(price),
        "beds": r.get("bedrooms"), "baths": r.get("bathrooms"), "hood": hood, "addr": "", "lat": round(lat, 6), "lng": round(lng, 6),
        "dogs": True if g(r, "attributes.pets_dog") else None, "cats": True if g(r, "attributes.pets_cat") else None, "maxDog": maxDog,
        "noFee": f["noFee"] or "no fee" in fee, "aff": f["aff"], "stab": f["stab"],
        "note": " · ".join(x for x in [(r.get("title") or "")[:90], g(r, "attributes.laundry") or ""] if x),
        "shared": is_shared(body),
        "listedAt": iso_ms(r.get("postedAt")), "avail": (str(g(r, "attributes.movein_date") or "")[:10] or None),
        "photo": first_image(r.get("images"))}

# ---------------- note + email ----------------
def daily_note(today):
    """Same note the app shows: 30 lines, one per day, in order."""
    n = round(datetime.datetime.strptime(today, "%Y-%m-%d").replace(tzinfo=datetime.timezone.utc).timestamp() / 86400)
    return NOTES[n % len(NOTES)]

def fmt_beds(b):
    if b is None: return ""
    return "studio" if float(b) == 0 else f"{int(b) if float(b).is_integer() else b} BR"

def send_email(to, subject, lines, picks):
    user, pw = ENV("SMTP_USER"), (ENV("SMTP_PASS") or "").replace(" ", "")
    if not (user and pw and to): print("email: skipped (not set up)"); return
    msg = EmailMessage(); msg["Subject"] = subject; msg["From"] = f"NYC Move <{user}>"; msg["To"] = ", ".join(to)
    text = "\n".join(lines + [""] + [f"${p['price']:,} {fmt_beds(p.get('beds'))} in {p.get('hood','')}: {p.get('url','')}" for p in picks] + ["", SITE])
    msg.set_content(text)
    rows = "".join(f'<tr><td style="padding:6px 12px 6px 0"><b>${p["price"]:,}</b></td><td style="padding:6px 12px 6px 0">{fmt_beds(p.get("beds"))}</td>'
                   f'<td style="padding:6px 0"><a href="{p.get("url","")}" style="color:#1f6d3c">{p.get("hood","")}</a></td></tr>' for p in picks)
    html = (f'<div style="font-family:Arial,sans-serif;font-size:15px;color:#131a15">'
            + "".join(f"<p>{l}</p>" for l in lines)
            + (f'<table style="border-collapse:collapse">{rows}</table>' if picks else "")
            + (f'<p><a href="{SITE}" style="display:inline-block;background:#6fc58c;color:#0b2a16;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:bold">Open the map</a></p>' if SITE else "")
            + "</div>")
    msg.add_alternative(html, subtype="html")
    if DRY: print("email (dry run):", subject, to); return
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
        s.login(user, pw); s.send_message(msg)
    print("email: sent to", len(to))

# ---------------- main ----------------
def main():
    check_supabase()
    now = int(time.time() * 1000)
    problems = []
    raw = {}
    jobs = (("streeteasy", "memo23/apify-streeteasy-cheerio", SE_INPUT, SE_FIELDS, 1, 1200),
            ("craigslist", "lentic_clockss/craigslist-housing-scraper", CL_INPUT, CL_FIELDS, 0.5, 900))
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(2) as ex:  # both scrapers run at the same time
        futs = {name: ex.submit(apify, actor, inp, fields, charge, tmo) for name, actor, inp, fields, charge, tmo in jobs}
    for name, f in futs.items():
        try: raw[name] = f.result()
        except Exception as e: problems.append(f"{name} scraper failed"); print(name, "failed:", e); raw[name] = []

    feed = sb_all("feed")
    picks = sb_all("picks")
    keep = {k for k, p in picks.items() if any((p.get("favs") or {}).values()) or p.get("status") not in (None, "new")}
    new_ids, changed = [], {}
    for name, fn in (("streeteasy", from_se), ("craigslist", from_cl)):
        for r in raw[name]:
            x = fn(r)
            if not x: continue
            k, v = x
            if not (MIN_RENT <= v["price"] <= MAX_RENT): continue
            v = {kk: vv for kk, vv in v.items() if vv is not None}
            old = feed.get(k)
            if old:
                v["addedAt"] = old.get("addedAt", now); v["listedAt"] = old.get("listedAt", v.get("listedAt", now))
                if old.get("photo") and not v.get("photo"): v["photo"] = old["photo"]
            else:
                v["addedAt"] = now; v["listedAt"] = v.get("listedAt") or now; new_ids.append(k)
            v["seenAt"] = now
            feed[k] = v; changed[k] = v

    # Craigslist cross-posts of StreetEasy listings
    se = [v for k, v in feed.items() if k.startswith("se")]
    near = lambda a, b: abs(a["lat"]-b["lat"]) < 0.0008 and abs(a["lng"]-b["lng"]) < 0.001 and a["price"] == b["price"]
    dup = {k for k, v in feed.items() if k.startswith("cl") and k not in keep and any(near(v, w) for w in se)}
    seen_posts = {}
    for k in sorted(k for k in feed if k.startswith("cl")):  # same Craigslist ad posted several times: keep one
        v = feed[k]; sig = ((v.get("title") or "").strip().lower(), v.get("price"), v.get("beds"))
        if sig[0] and sig in seen_posts and k not in keep: dup.add(k)
        else: seen_posts.setdefault(sig, k)
    cutoff = now - MAX_AGE_DAYS * 86400000
    old = {k for k, v in feed.items() if k not in keep and max(v.get("listedAt") or 0, v.get("seenAt") or 0) < cutoff}
    gone = dup | old
    new_ids = [k for k in new_ids if k not in gone]
    changed = {k: v for k, v in changed.items() if k not in gone}

    sb_put("feed", changed)
    sb_delete("feed", gone)
    total = len(feed) - len(gone)
    new = [dict(feed[k], id=k) for k in new_ids]
    under = sum(1 for n in new if n["price"] <= 2000)
    print(json.dumps({"new": len(new), "under2000": under, "updated": len(changed), "removed": len(gone), "total": total, "problems": problems}))

    today = datetime.datetime.now(NY).strftime("%Y-%m-%d")
    note = daily_note(today)
    sb_put("daily", {"today": {"date": today, "text": note}})
    sb_put("ops", {"pipeline": {"lastRun": now, "new": len(new), "total": total, "problems": problems}})

    best = sorted([n for n in new if n.get("dogs") is not False], key=lambda n: n["price"])[:5]
    if new:
        subject = f"{len(new)} new apartment{'s' if len(new) != 1 else ''} on the map" + (f" ({under} under $2,000)" if under else "")
        lines = [f"{len(new)} new listings today, {under} of them $2,000 or less. {total} on the map in all."]
        if best: lines.append("The cheapest new ones that may take a dog:")
    else:
        subject, lines = "No new apartments today", [f"No new listings today. {total} are on the map."]
    if problems: lines.append("Heads up: " + "; ".join(problems) + ".")
    lines.append(f"Today's note: {note}")
    try:
        members = sb("GET", "members?select=email") or []
        settings = (sb("GET", "docs?coll=eq.settings&id=eq.main&select=data") or [{}])
        to = (settings[0].get("data") or {}).get("alertEmails") if settings else None
        to = to or [m["email"] for m in members]
        send_email(to, subject, lines, best)
    except Exception as e:
        print("email failed:", e)
    if len(problems) == 2: sys.exit(1)

if __name__ == "__main__":
    main()
