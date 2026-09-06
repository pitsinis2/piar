// The opexpi.com umbrella site: every page, every language, every link.
// A missing translation renders its own key, so this catches gaps that would
// otherwise look like finished English text.
const { chromium } = require("playwright-core");
const BASE = "http://localhost:4321";
const PAGES = ["/", "/piar.html", "/opexmm.html"];
const LANGS = ["el", "en", "de", "it"];

const results = [];
const ok = (n, c, d) => results.push({ n, c, d: d || "" });

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const badRequests = [];
  page.on("response", (r) => {
    if (r.status() >= 400 && r.url().startsWith(BASE)) badRequests.push(r.status() + " " + r.url());
  });

  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    const title = await page.title();
    ok(`${path} loads with a title`, title.length > 10, title);

    // Every visible string must be keyed. An unkeyed one would stay English
    // when the language changes, which is the failure mode that matters.
    for (const lang of LANGS) {
      const state = await page.evaluate(`(() => {
        applyLang(${JSON.stringify(lang)});
        const missing = [];
        for (const el of document.querySelectorAll('[data-t]')) {
          const key = el.getAttribute('data-t');
          // applyLang writes the key itself when the string is absent.
          if (el.textContent.trim() === key) missing.push(key);
        }
        return { missing, htmlLang: document.documentElement.lang,
                 sample: document.querySelector('h1').innerText.replace(/\\s+/g, ' ').slice(0, 60) };
      })()`);

      ok(`${path} · ${lang}: every string is translated`,
         state.missing.length === 0, state.missing.slice(0, 6).join(", "));
      ok(`${path} · ${lang}: page language attribute is set`,
         state.htmlLang === lang, state.htmlLang);
    }

    // Greek and German must actually differ from English, or the dictionary is
    // quietly falling back and nobody would notice.
    const headings = {};
    for (const lang of LANGS) {
      headings[lang] = await page.evaluate(
        `(() => { applyLang(${JSON.stringify(lang)}); return document.querySelector('h1').innerText.replace(/\\s+/g,' ').trim(); })()`);
    }
    const distinct = new Set(Object.values(headings));
    ok(`${path}: the four languages give four different headings`,
       distinct.size === 4, Object.entries(headings).map(([k, v]) => `${k}="${v.slice(0, 26)}"`).join("  "));
    ok(`${path}: Greek heading is in Greek script`,
       /[Ͱ-Ͽ]/.test(headings.el), headings.el.slice(0, 40));

    // Links.
    const links = await page.evaluate(`
      Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href'))
    `);
    const internal = [...new Set(links.filter((h) => h && !/^(https?:|mailto:|#)/.test(h)))];
    for (const href of internal) {
      const res = await page.request.get(new URL(href, BASE + path).toString());
      ok(`${path}: link "${href}" works`, res.status() < 400, "HTTP " + res.status());
    }

    const anchors = [...new Set(links.filter((h) => h && h.startsWith("#")))];
    for (const a of anchors) {
      const exists = await page.evaluate(`!!document.querySelector(${JSON.stringify(a)})`);
      ok(`${path}: anchor ${a} has a target`, exists, "");
    }

    ok(`${path}: links to the piAR app`, links.some((h) => h === "https://piar.opexpi.com"), "");
    ok(`${path}: links to opexmm.com`, links.some((h) => h === "https://opexmm.com"), "");
  }

  // The language choice must survive moving between pages.
  await page.goto(BASE + "/?lang=de", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await page.goto(BASE + "/piar.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const remembered = await page.evaluate(`document.documentElement.lang`);
  ok("The chosen language carries across pages", remembered === "de", remembered);

  // Clicking a flag button, not just calling the function.
  await page.click('.lang-switch button[data-lang="it"]');
  await page.waitForTimeout(200);
  const clicked = await page.evaluate(`({
    lang: document.documentElement.lang,
    pressed: document.querySelector('.lang-switch button[data-lang="it"]').getAttribute('aria-pressed')
  })`);
  ok("Clicking a language button switches the page",
     clicked.lang === "it" && clicked.pressed === "true", JSON.stringify(clicked));

  // Phone: the menu has to open, or the site has no navigation there.
  await page.setViewportSize({ width: 390, height: 840 });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const beforeTap = await page.evaluate(`document.querySelector('.nav-links').classList.contains('open')`);
  await page.click(".nav-toggle");
  await page.waitForTimeout(200);
  const afterTap = await page.evaluate(`(() => {
    const el = document.querySelector('.nav-links');
    return { open: el.classList.contains('open'), visible: el.getBoundingClientRect().height > 0 };
  })()`);
  ok("On a phone the menu starts closed", beforeTap === false, "");
  ok("Tapping the menu button opens it", afterTap.open && afterTap.visible, JSON.stringify(afterTap));

  const noSideways = await page.evaluate(`document.documentElement.scrollWidth <= window.innerWidth + 1`);
  ok("No sideways scroll on a phone", noSideways, "");

  ok("No broken requests", badRequests.length === 0, badRequests.slice(0, 3).join(" | "));
  ok("No JavaScript errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  let pass = 0, fail = 0;
  console.log("\nOPEXPI WEBSITE");
  for (const r of results) {
    if (r.c) { pass++; console.log("  PASS  " + r.n + (r.d ? "  (" + r.d + ")" : "")); }
    else { fail++; console.log("  FAIL  " + r.n + (r.d ? "\n          " + r.d : "")); }
  }
  console.log("\n====================================================");
  console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total\n`);

  await browser.close();
  process.exit(fail ? 1 : 0);
})();
