"""Mirror spacetypegenerator.com to local for offline modification.
Downloads HTML pages, local JS/CSS/images, then extracts loadFont/loadImage
paths from JS and fetches those assets too.
"""
import os, re, urllib.request, urllib.parse, sys

BASE = "https://spacetypegenerator.com"
OUT = r"C:\Users\Administrator\stg_cn\site"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

SEEDS = [
    "/", "/cylinder",
    "/field", "/stripes", "/coil", "/flag", "/morisawa", "/cascade",
    "/ribbon", "/layers", "/danger", "/string", "/badge", "/clutter",
    "/construct", "/snap", "/flash", "/pow", "/crash", "/crashclock",
    "/vessel", "/shine", "/boost", "/boxsquad",
]

visited = set()      # full URLs fetched
html_pages = []      # local paths of html files

def fetch(url):
    """GET a url, return bytes or None."""
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read()
    except Exception as e:
        print("  FAIL", url, e)
        return None

def local_path(url):
    """Map a full URL to a local file path."""
    parsed = urllib.parse.urlparse(url)
    path = parsed.path
    if path.endswith("/") or path == "":
        path += "index.html"
    # strip query for file naming
    if parsed.query:
        path += "_" + parsed.query.replace("&", "_").replace("=", "-")
    if not os.path.splitext(path)[1]:
        path += ".html"
    local = os.path.join(OUT, path.lstrip("/"))
    return local.replace("/", os.sep)

def save(url):
    if url in visited:
        return None
    visited.add(url)
    data = fetch(url)
    if data is None:
        return None
    local = local_path(url)
    os.makedirs(os.path.dirname(local), exist_ok=True)
    with open(local, "wb") as f:
        f.write(data)
    return data

def extract_refs(html, page_url):
    """Find same-domain src/href refs in html."""
    refs = set()
    for m in re.findall(r'(?:src|href)="([^"]+)"', html.decode("utf-8", "ignore")):
        if not m or m.startswith("#") or m.startswith("mailto:"):
            continue
        if m.startswith("//"):
            m = "https:" + m
        full = urllib.parse.urljoin(page_url, m)
        if full.startswith(BASE):
            refs.add(full)
    return refs

# Phase 1: crawl HTML pages + inline resources
queue = [urllib.parse.urljoin(BASE, s) for s in SEEDS]
while queue:
    url = queue.pop(0)
    if url in visited:
        continue
    print("GET", url)
    data = save(url)
    if data is None:
        continue
    html_pages.append(local_path(url))
    for ref in extract_refs(data, url):
        if ref not in visited:
            queue.append(ref)

print(f"\nPhase 1 done: {len(visited)} urls, {len(html_pages)} html pages")

# Phase 2: extract loadFont/loadImage/preload assets from all JS
asset_urls = set()
for root, dirs, files in os.walk(OUT):
    for fn in files:
        if fn.endswith(".js"):
            p = os.path.join(root, fn)
            try:
                text = open(p, "r", encoding="utf-8", errors="ignore").read()
            except Exception:
                continue
            for m in re.findall(r"(?:loadFont|loadImage|loadModel)\s*\(\s*['\"]([^'\"]+)['\"]", text):
                # Browser asset paths resolve from the root HTML page, not from
                # the directory containing the JavaScript file.
                full = urllib.parse.urljoin(BASE + "/", m)
                if full.startswith(BASE):
                    asset_urls.add(full)

print(f"Found {len(asset_urls)} assets referenced by load*")
for u in sorted(asset_urls):
    print("ASSET", u)
    save(u)

print(f"\nDONE. Total {len(visited)} urls mirrored to {OUT}")
