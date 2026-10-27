"""Builds index.html from src/. Run: python3 scripts/build.py"""
import os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(R, p)).read()
CONFIG = {"url": "https://vvwecchcqgdrxgyznhgl.supabase.co", "key": "sb_publishable_5y51gWnCH4VVpmuPHoUUVw_KeZg9rNn", "ai": False}

head = rd("src/head.html").replace("<style>{{LEAFLET_CSS}}</style>",
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">').rstrip()
assert head.endswith("</style>")
head = head[:-len("</style>")] + rd("src/home.css") + rd("src/ready.css") + rd("src/gate.css") + "</style>\n"
import json
out = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#edf3ee" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0e1410" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="manifest" href="manifest.webmanifest">
{head}
</head>
<body>
{rd("src/body.html")}
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script>window.MOVE_CONFIG = {json.dumps(CONFIG)};</script>
<script src="data/geo.js"></script>
<script>
{rd("src/runtime.js")}
</script>
<script>
{rd("src/app.js")}
</script>
<script>
{rd("src/guides.js")}
</script>
<script>
{rd("src/ready.js")}
</script>
<script>
{rd("src/details.js")}
</script>
<script>
{rd("src/home.js")}
</script>
</body>
</html>
"""
os.makedirs(os.path.join(R, "_site"), exist_ok=True)
open(os.path.join(R, "_site", "index.html"), "w").write(out)
import shutil
for f in ("icon.svg", "icon-180.png", "icon-512.png", "manifest.webmanifest"): shutil.copy(os.path.join(R, f), os.path.join(R, "_site", f))
os.makedirs(os.path.join(R, "_site", "data"), exist_ok=True); shutil.copy(os.path.join(R, "data", "geo.js"), os.path.join(R, "_site", "data", "geo.js"))
print("_site/index.html", len(out))
