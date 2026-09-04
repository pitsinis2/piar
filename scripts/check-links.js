// Cross-checks every link and every PDF/asset the app points at, by actually
// fetching each one against the dev server. Read-only: it navigates and reads,
// it never submits anything.
const { chromium } = require("playwright-core");
const BASE = "http://localhost:5173";

const results = [];
const ok = (n, c, d) => results.push({ n, c, d: d || "" });

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 430, height: 950 } });

  const failedRequests = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failedRequests.push(r.status() + " " + r.url());
  });

  await page.goto(BASE + "/?lang=el", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // ---- every asset the page itself pulls in --------------------------------
  ok("No 4xx/5xx on any asset the page loads", failedRequests.length === 0,
     failedRequests.slice(0, 6).join(" | "));

  // ---- collect every href in the document ---------------------------------
  const hrefs = await page.evaluate(`
    Array.from(document.querySelectorAll('a[href]'))
      .map(a => ({ href: a.getAttribute('href'), abs: a.href, text: (a.textContent||'').trim().slice(0,30) }))
      .filter(l => l.href && !l.href.startsWith('#') && !l.href.startsWith('javascript:'))
  `);

  const internal = hrefs.filter((l) => l.abs.startsWith(BASE));
  const external = hrefs.filter((l) => !l.abs.startsWith(BASE));

  for (const l of internal) {
    const res = await page.request.get(l.abs);
    ok(`Link "${l.text || l.href}" -> ${l.href}`, res.status() < 400,
       "HTTP " + res.status());
  }
  for (const l of external) {
    ok(`External link "${l.text || l.href}" (not fetched)`, true, l.abs);
  }

  // ---- the PDF guide specifically -----------------------------------------
  const pdf = await page.request.get(BASE + "/piAR-Odigos-Xrisis.pdf");
  ok("Guide PDF is served", pdf.status() === 200, "HTTP " + pdf.status());
  if (pdf.status() === 200) {
    const body = await pdf.body();
    const isPdf = body.slice(0, 5).toString() === "%PDF-";
    ok("Guide PDF is a real PDF", isPdf, isPdf ? (body.length / 1048576).toFixed(2) + " MB" : "bad header");
  }

  // ---- the two visible entry points to it ---------------------------------
  const topGuide = await page.evaluate(`(() => {
    const a = document.getElementById('user-guide-link');
    if (!a) return null;
    const r = a.getBoundingClientRect();
    return { href: a.getAttribute('href'), visible: r.width > 0 && r.height > 0,
             label: (a.textContent||'').trim() };
  })()`);
  ok("Top-bar guide button exists and is visible",
     !!topGuide && topGuide.visible, topGuide ? topGuide.label : "missing");

  const loginGuide = await page.evaluate(`(() => {
    const d = document.getElementById('login-modal');
    if (d && !d.open) d.showModal();
    const a = document.querySelector('.login-guide-link');
    if (!a) return null;
    const r = a.getBoundingClientRect();
    return { href: a.getAttribute('href'), visible: r.width > 0 && r.height > 0,
             label: (a.textContent||'').trim() };
  })()`);
  ok("Login-screen guide link exists and is visible",
     !!loginGuide && loginGuide.visible, loginGuide ? loginGuide.label : "missing");
  ok("Login guide link is translated to Greek",
     !!loginGuide && /οδηγ/i.test(loginGuide.label), loginGuide ? loginGuide.label : "");

  // ---- PWA plumbing: manifest, icons, service worker ----------------------
  const manifestHref = await page.evaluate(`
    document.querySelector('link[rel="manifest"]')?.getAttribute('href') || null
  `);
  ok("Manifest is linked", !!manifestHref, manifestHref || "missing");
  if (manifestHref) {
    const mres = await page.request.get(BASE + manifestHref.replace(/^\./, ""));
    ok("Manifest is served", mres.status() === 200, "HTTP " + mres.status());
    if (mres.status() === 200) {
      let m = null;
      try { m = JSON.parse(await mres.text()); } catch (e) {}
      ok("Manifest parses as JSON", !!m, m ? "" : "parse error");
      if (m && Array.isArray(m.icons)) {
        for (const icon of m.icons) {
          const u = BASE + "/" + String(icon.src).replace(/^\.?\//, "");
          const ires = await page.request.get(u);
          ok(`Manifest icon ${icon.sizes || icon.src} is served`,
             ires.status() === 200, "HTTP " + ires.status());
        }
      }
    }
  }

  // ---- every <img> and icon the page references ---------------------------
  const imgs = await page.evaluate(`
    Array.from(document.querySelectorAll('img[src], link[rel*="icon"][href]'))
      .map(e => e.tagName === 'IMG' ? e.src : e.href)
      .filter(u => u && !u.startsWith('data:'))
  `);
  const uniqueImgs = Array.from(new Set(imgs));
  for (const u of uniqueImgs) {
    if (!u.startsWith(BASE)) continue;
    const r = await page.request.get(u);
    ok(`Image/icon ${u.replace(BASE, "")} is served`, r.status() === 200, "HTTP " + r.status());
  }

  // ---- the admin panel, which lives on its own page -----------------------
  // Ask for index.html by name: Vite's dev SPA fallback answers a bare
  // directory path with the main app. Vercel resolves the directory itself.
  const admin = await page.request.get(BASE + "/admin/index.html");
  ok("Admin panel page is served", admin.status() === 200, "HTTP " + admin.status());
  if (admin.status() === 200) {
    const html = await admin.text();
    ok("Admin panel no longer carries a hardcoded token",
       !/ADMIN_TOKEN\s*=\s*["'][A-Za-z0-9_\-]{12,}["']/.test(html),
       "");
    ok("Admin panel has a login form", /signInWithPassword/.test(html), "");
    ok("Admin panel has forgot-password", /resetPasswordForEmail/.test(html), "");
  }

  // ---- report --------------------------------------------------------------
  let pass = 0, fail = 0;
  console.log("\nLINKS & ASSETS");
  for (const r of results) {
    if (r.c) { pass++; console.log("  PASS  " + r.n + (r.d ? "  (" + r.d + ")" : "")); }
    else { fail++; console.log("  FAIL  " + r.n + (r.d ? "\n          " + r.d : "")); }
  }
  console.log("\n====================================================");
  console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total\n`);

  await browser.close();
  process.exit(fail ? 1 : 0);
})();
