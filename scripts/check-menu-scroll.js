// The user menu used to run off the bottom of the screen with no way to reach
// Logout: scrolling over it scrolled the page behind instead. Driven with real
// wheel input, so the browser routes it the way a finger or trackpad would.
const { chromium } = require("playwright-core");
const BASE = "http://localhost:5173";

const results = [];
const ok = (n, c, d) => results.push({ n, c, d: d || "" });

const SEED = `
  document.getElementById('login-modal')?.close();
  isLoggedIn = true; currentRole = 'admin'; currentUsername = 'fotis';
  setCurrentOrgCode('2120002104');
  state.users = [createSystemUser({ name:'fotis', surname:'pitsinis', role:'admin', username:'fotis' })];
  state.users[0].mustChangePin = false;
  state.currentUserId = state.users[0].id;
  render(); updateAuthUI();
  document.querySelector('main')?.style.removeProperty('display');
  document.getElementById('access-menu').open = true;
`;

const probe = `(() => {
  const panel = document.querySelector('.access-menu-panel');
  const logout = document.getElementById('logout-btn');
  const pr = panel.getBoundingClientRect(), lr = logout.getBoundingClientRect();
  return {
    panelScroll: Math.round(panel.scrollTop),
    pageScroll: Math.round(window.scrollY),
    scrollHeight: panel.scrollHeight, clientHeight: panel.clientHeight,
    panelBottom: Math.round(pr.bottom), viewportH: window.innerHeight,
    bottomNav: parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--piar-bottom-nav-h')) || 0,
    logoutOnScreen: lr.top >= 0 && lr.bottom <= window.innerHeight,
    logoutInsidePanel: lr.top >= pr.top - 1 && lr.bottom <= pr.bottom + 1
  };
})()`;

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  // Phone-sized, where the menu is taller than the screen.
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE + "/?lang=el", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.evaluate(SEED);
  await page.waitForTimeout(400);

  const before = await page.evaluate(probe);
  ok("The menu is taller than the screen, so it must scroll",
     before.scrollHeight > before.clientHeight,
     `content ${before.scrollHeight} > box ${before.clientHeight}`);
  ok("The menu stops above the bottom nav bar",
     before.panelBottom <= before.viewportH - before.bottomNav + 1,
     `panel ends ${before.panelBottom}, bar starts ${before.viewportH - before.bottomNav}`);
  ok("Logout starts out of reach", before.logoutOnScreen === false, "");

  // A real wheel over the panel: this is the gesture that used to move the
  // page behind instead of the menu.
  await page.mouse.move(270, 500);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(300);
  const after = await page.evaluate(probe);

  ok("Scrolling over the menu scrolls the menu", after.panelScroll > 0,
     "panel scrollTop " + after.panelScroll);
  ok("The page behind does NOT scroll instead", after.pageScroll === 0,
     "page scrollY " + after.pageScroll);
  ok("Logout is reachable after scrolling",
     after.logoutOnScreen && after.logoutInsidePanel, JSON.stringify(after));

  // Keep scrolling past the end: it must not start dragging the page.
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(300);
  const past = await page.evaluate(probe);
  ok("Over-scrolling at the bottom does not chain to the page",
     past.pageScroll === 0, "page scrollY " + past.pageScroll);

  // And it must actually be clickable, not just visible.
  const clicked = await page.evaluate(`(() => {
    const logout = document.getElementById('logout-btn');
    const r = logout.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { hitId: hit ? (hit.id || hit.tagName) : null, isLogout: hit === logout || logout.contains(hit) };
  })()`);
  ok("Nothing is covering the Logout button", clicked.isLogout === true, JSON.stringify(clicked));

  // A window tall enough for the whole menu: it must not grow a pointless
  // scrollbar. (At 900px the menu genuinely does not fit, so it scrolls there
  // and that is correct.)
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.evaluate(`document.getElementById('access-menu').open = true;`);
  await page.waitForTimeout(300);
  const desktop = await page.evaluate(probe);
  ok("On a window tall enough for it, the menu does not scroll at all",
     desktop.scrollHeight <= desktop.clientHeight + 1,
     `content ${desktop.scrollHeight}, box ${desktop.clientHeight}`);
  ok("Logout is visible without scrolling there", desktop.logoutOnScreen === true,
     JSON.stringify(desktop));

  ok("No JavaScript errors during the run", errors.length === 0, errors.slice(0, 3).join(" | "));

  let pass = 0, fail = 0;
  console.log("\nUSER MENU SCROLLING");
  for (const r of results) {
    if (r.c) { pass++; console.log("  PASS  " + r.n + (r.d ? "  (" + r.d + ")" : "")); }
    else { fail++; console.log("  FAIL  " + r.n + (r.d ? "\n          " + r.d : "")); }
  }
  console.log("\n====================================================");
  console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total\n`);

  await browser.close();
  process.exit(fail ? 1 : 0);
})();
