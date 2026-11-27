#!/usr/bin/env python3
"""
99 Media & Tech (https://www.i99.sa/) — Automated SEO, GEO & Rendered-DOM Guard
Simulates Googlebot & Bingbot (raw HTML + post-JS Chromium DOM, Desktop & Mobile, AR & EN).
Exit code 0 = zero issues; exit code 1 = regressions detected.
"""
import argparse
import functools
import http.server
import json
import os
import socketserver
import sys
import threading
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
CANONICAL_HOST = "https://www.i99.sa"
INDEXNOW_KEY = "e99a4b7c2d8f10365e4c8a9b7d2f1990"

REQUIRED_BOTS = [
    "Googlebot",
    "Google-Extended",
    "Bingbot",
    "Applebot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "GPTBot",
    "PerplexityBot",
    "ClaudeBot",
    "Claude-Web",
]

CRITICAL_LIVE_ASSETS = [
    "/robots.txt",
    "/sitemap.xml",
    "/llms.txt",
    "/llms-full.txt",
    f"/{INDEXNOW_KEY}.txt",
    "/site.webmanifest",
    "/img/og-home.png",
    "/img/og-media.png",
    "/img/og-tech.png",
    "/assets/99-Profile-final.pdf?v=2026",
]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def start_local_server():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    port = httpd.server_address[1]
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd, f"http://127.0.0.1:{port}"


def check_static_files():
    issues = []
    # 1. robots.txt
    robots_path = ROOT / "robots.txt"
    if not robots_path.exists():
        issues.append("Missing robots.txt")
    else:
        robots = robots_path.read_text(encoding="utf-8")
        for bot in REQUIRED_BOTS:
            if bot not in robots:
                issues.append(f"robots.txt missing bot allow rule: {bot}")
        if f"{CANONICAL_HOST}/sitemap.xml" not in robots:
            issues.append("robots.txt missing Sitemap directive")
        if "llms-full.txt" not in robots:
            issues.append("robots.txt missing llms-full.txt reference")

    # 2. llms.txt & llms-full.txt
    for fname in ("llms.txt", "llms-full.txt"):
        p = ROOT / fname
        if not p.exists():
            issues.append(f"Missing {fname}")
        else:
            txt = p.read_text(encoding="utf-8")
            for token in ("99 للإعلام والتقنية", "Badr Al-Sharif", "EXOX", "PRCI", "FIRX"):
                if token not in txt:
                    issues.append(f"{fname} missing entity fact: {token}")

    # 3. IndexNow key file
    key_file = ROOT / f"{INDEXNOW_KEY}.txt"
    if not key_file.exists() or key_file.read_text(encoding="utf-8").strip() != INDEXNOW_KEY:
        issues.append(f"IndexNow key file missing or mismatched: {INDEXNOW_KEY}.txt")

    # 4. JSON config files
    for jf in ("vercel.json", "site.webmanifest"):
        try:
            json.loads((ROOT / jf).read_text(encoding="utf-8"))
        except Exception as e:
            issues.append(f"Invalid JSON in {jf}: {e}")

    # 5. sitemap.xml <-> repo HTML parity
    sitemap_path = ROOT / "sitemap.xml"
    sitemap_paths = []
    if not sitemap_path.exists():
        issues.append("Missing sitemap.xml")
    else:
        try:
            tree = ET.parse(sitemap_path)
            ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            locs = [el.text.strip() for el in tree.findall(".//sm:loc", ns) if el.text]
            for loc in locs:
                if not loc.startswith(CANONICAL_HOST):
                    issues.append(f"sitemap.xml non-canonical host: {loc}")
                    continue
                path = loc[len(CANONICAL_HOST):] or "/"
                sitemap_paths.append(path)
                rel = "index.html" if path == "/" else path.strip("/") + "/index.html"
                if not (ROOT / rel).exists():
                    issues.append(f"sitemap.xml points to missing file: {rel}")
        except Exception as e:
            issues.append(f"Invalid sitemap.xml: {e}")

    # Ensure every tracked public index.html is present in sitemap.xml
    import subprocess
    try:
        tracked = subprocess.check_output(
            ["git", "-C", str(ROOT), "ls-files", "*index.html", "index.html"],
            text=True,
        ).splitlines()
        html_rels = sorted(set(r.strip() for r in tracked if r.strip()))
    except Exception:
        html_rels = sorted(
            f.relative_to(ROOT).as_posix() for f in ROOT.rglob("index.html")
        )
    for rel in html_rels:
        if rel.startswith((".git/", "scripts/", "node_modules/")):
            continue
        url_path = "/" if rel == "index.html" else "/" + rel[: -len("index.html")]
        if url_path not in sitemap_paths:
            issues.append(f"HTML page not listed in sitemap.xml: {url_path}")

    return issues, sitemap_paths


def check_live_assets():
    issues = []
    for asset in CRITICAL_LIVE_ASSETS:
        url = CANONICAL_HOST + asset
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"},
            )
            with urllib.request.urlopen(req, timeout=15) as r:
                if r.getcode() != 200:
                    issues.append(f"Live asset HTTP {r.getcode()}: {url}")
                r.read(64)
        except Exception as e:
            issues.append(f"Live asset failed: {url} -> {e}")
    return issues


def audit_pages(base_url, paths, is_live):
    issues = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for path in paths:
            url = base_url + path
            expected_canonical = CANONICAL_HOST + path
            page_issues = []

            ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="ar-SA")
            page = ctx.new_page()

            # Block external analytics/fonts only in local mode so CI stays fast & deterministic
            if not is_live:
                page.route(
                    "**/*",
                    lambda route: route.continue_()
                    if route.request.url.startswith(base_url)
                    else route.abort(),
                )

            console_errors = []
            failed_requests = []
            page.on("pageerror", lambda err: console_errors.append(f"pageerror: {err}"))
            page.on(
                "console",
                lambda msg: console_errors.append(f"console.error: {msg.text}")
                if msg.type == "error" and (is_live or "ERR_FAILED" not in msg.text)
                else None,
            )
            page.on(
                "response",
                lambda resp: failed_requests.append(f"{resp.status} {resp.url}")
                if resp.status >= 400 and resp.url.startswith(base_url)
                else None,
            )

            resp = page.goto(url, wait_until="load", timeout=30000)
            page.wait_for_timeout(500)

            if not resp or resp.status != 200:
                page_issues.append(f"HTTP {resp.status if resp else 0}")

            if resp and "noindex" in resp.headers.get("x-robots-tag", "").lower():
                page_issues.append("X-Robots-Tag contains noindex")

            data = page.evaluate("""() => {
                const title = document.title || "";
                const descEl = document.querySelector('meta[name="description"]');
                const desc = descEl ? (descEl.getAttribute('content') || "") : "";
                const robotsEl = document.querySelector('meta[name="robots"]');
                const robots = robotsEl ? (robotsEl.getAttribute('content') || "") : "";
                const canonEl = document.querySelector('link[rel="canonical"]');
                const canonical = canonEl ? (canonEl.getAttribute('href') || "") : "";
                const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || "";
                const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || "";
                const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || "";
                const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim());
                const imgs = Array.from(document.querySelectorAll('img')).map(i => ({
                    src: i.getAttribute('src'),
                    alt: i.getAttribute('alt'),
                    complete: i.complete,
                    naturalWidth: i.naturalWidth,
                    loading: i.getAttribute('loading')
                }));
                const lds = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => s.textContent);
                const hasLangToggle = Boolean(document.getElementById('lang-toggle'));
                const overflowX = document.documentElement.scrollWidth > window.innerWidth + 2;
                return { title, desc, robots, canonical, ogTitle, ogDesc, ogImg, h1s, imgs, lds, hasLangToggle, overflowX, lang: document.documentElement.lang, dir: document.documentElement.dir };
            }""")

            # Core SEO & GEO assertions (post-JS rendered DOM)
            if not (15 <= len(data["title"]) <= 65):
                page_issues.append(f"Rendered AR title length={len(data['title'])} (must be 15..65): {data['title']}")
            if not (60 <= len(data["desc"]) <= 158):
                page_issues.append(f"Rendered AR description length={len(data['desc'])} (must be 60..158)")
            if "noindex" in data["robots"].lower():
                page_issues.append(f"meta robots has noindex: {data['robots']}")
            if data["canonical"] != expected_canonical:
                page_issues.append(f"canonical={data['canonical']} != {expected_canonical}")
            if not (data["ogTitle"] and data["ogDesc"] and data["ogImg"]):
                page_issues.append("Missing OpenGraph metadata (og:title / og:description / og:image)")
            if len(data["h1s"]) != 1:
                page_issues.append(f"Expected exactly 1 H1, found {len(data['h1s'])}")
            if data["lang"] != "ar" or data["dir"] != "rtl":
                page_issues.append(f"Unexpected default lang/dir: {data['lang']}/{data['dir']}")

            empty_alts = [i["src"] for i in data["imgs"] if not (i["alt"] and i["alt"].strip())]
            if empty_alts:
                page_issues.append(f"Empty/missing alt on {len(empty_alts)} image(s): {empty_alts[:3]}")

            broken_imgs = [i["src"] for i in data["imgs"] if i["loading"] != "lazy" and i["complete"] and i["naturalWidth"] == 0]
            if broken_imgs:
                page_issues.append(f"Broken images (naturalWidth=0): {broken_imgs}")

            if not data["lds"]:
                page_issues.append("Missing JSON-LD structured data")
            for raw_ld in data["lds"]:
                try:
                    parsed = json.loads(raw_ld)
                    if "@context" not in parsed or ("@graph" not in parsed and "@type" not in parsed):
                        page_issues.append("JSON-LD missing @context or @graph/@type")
                except Exception as e:
                    page_issues.append(f"Invalid JSON-LD: {e}")

            if data["overflowX"]:
                page_issues.append("Desktop (1440px) horizontal overflow detected")
            if console_errors:
                page_issues.append(f"Console errors: {console_errors}")
            if failed_requests:
                page_issues.append(f"Failed local asset requests: {failed_requests}")

            # Verify EN toggle title/desc limits when present
            if data["hasLangToggle"]:
                page.click("#lang-toggle")
                page.wait_for_timeout(150)
                en_data = page.evaluate("""() => ({
                    title: document.title || "",
                    desc: document.querySelector('meta[name="description"]')?.getAttribute('content') || "",
                    lang: document.documentElement.lang,
                    dir: document.documentElement.dir
                })""")
                if not (15 <= len(en_data["title"]) <= 65):
                    page_issues.append(f"Rendered EN title length={len(en_data['title'])} (must be 15..65): {en_data['title']}")
                if not (60 <= len(en_data["desc"]) <= 158):
                    page_issues.append(f"Rendered EN description length={len(en_data['desc'])} (must be 60..158)")
                if en_data["lang"] != "en" or en_data["dir"] != "ltr":
                    page_issues.append(f"EN toggle failed lang/dir: {en_data['lang']}/{en_data['dir']}")
                # Toggle back to AR for mobile check
                page.click("#lang-toggle")
                page.wait_for_timeout(100)

            # Mobile viewport check (390x844)
            page.set_viewport_size({"width": 390, "height": 844})
            page.wait_for_timeout(200)
            if page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 2"):
                page_issues.append("Mobile (390px) horizontal overflow detected")

            ctx.close()
            status_tag = "PASS" if not page_issues else "FAIL"
            print(f"  [{status_tag}] {path:42s} | title={len(data['title']):2d} | desc={len(data['desc']):3d} | H1={len(data['h1s'])} | imgs={len(data['imgs']):2d}")
            for pi in page_issues:
                print(f"         -> {pi}")
                issues.append(f"{path}: {pi}")

        browser.close()
    return issues


def main():
    parser = argparse.ArgumentParser(description="99 Media & Tech Automated SEO/GEO Guard")
    parser.add_argument("--live", action="store_true", help="Audit live production https://www.i99.sa instead of local files")
    args = parser.parse_args()

    all_issues = []

    print("=== 1) Static Files, Sitemap Parity & AI Discovery Checks ===")
    static_issues, sitemap_paths = check_static_files()
    all_issues.extend(static_issues)
    print(f"  Static issues: {len(static_issues)} | Sitemap routes discovered: {len(sitemap_paths)}")
    for si in static_issues:
        print(f"  -> {si}")

    if args.live:
        print("\n=== 2) Live Discovery & Static Assets (HTTP 200) ===")
        live_asset_issues = check_live_assets()
        all_issues.extend(live_asset_issues)
        print(f"  Live asset issues: {len(live_asset_issues)}")
        for ai in live_asset_issues:
            print(f"  -> {ai}")

        print(f"\n=== 3) Rendered-DOM Chromium Audit (LIVE: {CANONICAL_HOST}) ===")
        all_issues.extend(audit_pages(CANONICAL_HOST, sitemap_paths, is_live=True))
    else:
        httpd, local_base = start_local_server()
        try:
            print(f"\n=== 2) Rendered-DOM Chromium Audit (LOCAL: {local_base}) ===")
            all_issues.extend(audit_pages(local_base, sitemap_paths, is_live=False))
        finally:
            httpd.shutdown()

    print(f"\n=== GUARD RESULT: {'PASS (0 issues)' if not all_issues else f'FAIL ({len(all_issues)} issues)'} ===")
    sys.exit(0 if not all_issues else 1)


if __name__ == "__main__":
    main()
