// Proves the real login request still reaches Supabase correctly after the
// buildMemberAuthEmail refactor. Uses a deliberately wrong PIN, so it can
// never sign anyone in or change anything: a "wrong credentials" answer is
// exactly the proof we want - the request shape, URL and email format are
// right, and only the password was rejected.
const { chromium } = require("playwright-core");
const BASE = "http://localhost:5173";
const ORG = "2120002104";        // the real org
const USER = "definitely-not-a-real-user";
const WRONG_PIN = "999999";

const results = [];
const ok = (n, c, d) => results.push({ n, c, d: d || "" });

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const authCalls = [];
  page.on("response", (r) => {
    if (r.url().includes("/auth/v1/token")) authCalls.push({ url: r.url(), status: r.status() });
  });

  await page.goto(BASE + "/?lang=el", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const attempt = await page.evaluate(`(async () => {
    try {
      await loginWithOrgCodeAndPin('${ORG}', '${USER}', '${WRONG_PIN}');
      return { threw: false, message: 'UNEXPECTED SUCCESS' };
    } catch (e) {
      return { threw: true, message: String(e && e.message || e) };
    }
  })()`);

  ok("A wrong PIN is rejected, not accepted", attempt.threw === true, attempt.message);
  ok("Rejected for bad credentials, not a broken request",
     /invalid login credentials|invalid_credentials/i.test(attempt.message),
     attempt.message);

  await page.waitForTimeout(300);
  ok("The login request reached Supabase auth", authCalls.length > 0,
     authCalls.map(c => c.status + " " + c.url.replace(/\?.*/, "")).join(" | "));
  ok("Supabase answered 400 (bad password), not 404 (wrong endpoint)",
     authCalls.length > 0 && authCalls.every(c => c.status !== 404),
     authCalls.map(c => c.status).join(","));

  const stillLoggedOut = await page.evaluate(`({ isLoggedIn: isLoggedIn, user: currentUsername })`);
  ok("The failed attempt left no session behind",
     stillLoggedOut.isLoggedIn === false, JSON.stringify(stillLoggedOut));

  let pass = 0, fail = 0;
  console.log("\nLIVE LOGIN PATH");
  for (const r of results) {
    if (r.c) { pass++; console.log("  PASS  " + r.n + (r.d ? "  (" + r.d + ")" : "")); }
    else { fail++; console.log("  FAIL  " + r.n + (r.d ? "\n          " + r.d : "")); }
  }
  console.log("\n====================================================");
  console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total\n`);

  await browser.close();
  process.exit(fail ? 1 : 0);
})();
