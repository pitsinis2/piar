// The two conditions, proved against real Supabase auth with a real password:
//   a deactivated member cannot sign in
//   a deleted member cannot sign in
// Uses a throwaway account created for the test; roupas and pitsinis are never
// touched. The active flag is toggled directly, which is exactly what the
// member-login function does when an org admin deactivates someone.
const { chromium } = require("playwright-core");
const { execFileSync } = require("child_process");

const BASE = "http://localhost:5173";
const ORG = "2120002104";
const USER = "zz-revocation-test";
const PIN = "471903";
const REPO = "C:/Users/pitsi/Documents/Programming/ProjectManagerWeb";

const results = [];
const ok = (n, c, d) => results.push({ n, c, d: d || "" });

// Via a file: passing SQL as an argument gets torn apart by shell quoting.
const fs = require("fs");
const os = require("os");
const path = require("path");
function sql(query) {
  const file = path.join(os.tmpdir(), `piar-check-${Date.now()}.sql`);
  fs.writeFileSync(file, query, "utf8");
  try {
    return execFileSync("npx", ["supabase", "db", "query", "--linked", "-f", file],
      { cwd: REPO, encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] });
  } finally {
    fs.unlinkSync(file);
  }
}

const tryLogin = () => `(async () => {
  try {
    await loginWithOrgCodeAndPin('${ORG}', '${USER}', '${PIN}');
    const who = currentUsername;
    await logout();
    return { signedIn: true, who };
  } catch (e) {
    return { signedIn: false, message: String(e && e.message || e) };
  }
})()`;

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE + "/?lang=el", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // ---- baseline: an active member gets in ----------------------------------
  const before = await page.evaluate(tryLogin());
  ok("An active member CAN sign in", before.signedIn === true,
     before.message || ("as " + before.who));

  // ---- condition 1: deactivated ---------------------------------------------
  sql(`update team_members set active = false where org_code = '${ORG}' and username = '${USER}';`);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const afterDisable = await page.evaluate(tryLogin());
  ok("A DEACTIVATED member CANNOT sign in", afterDisable.signedIn === false,
     afterDisable.signedIn ? "THEY GOT IN as " + afterDisable.who : afterDisable.message);
  ok("They are told the account is inactive, not that the PIN is wrong",
     /no longer active/i.test(afterDisable.message || ""), afterDisable.message || "");

  const leftNoSession = await page.evaluate(`(async () => {
    const { data } = await supabase.auth.getSession();
    return { hasSession: !!data.session, isLoggedIn: isLoggedIn };
  })()`);
  ok("The refused attempt leaves no signed-in session behind",
     leftNoSession.hasSession === false && leftNoSession.isLoggedIn === false,
     JSON.stringify(leftNoSession));

  // ---- reactivating restores access ----------------------------------------
  sql(`update team_members set active = true where org_code = '${ORG}' and username = '${USER}';`);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const afterEnable = await page.evaluate(tryLogin());
  ok("A REACTIVATED member can sign in again", afterEnable.signedIn === true,
     afterEnable.message || "");

  // ---- condition 2: deleted -------------------------------------------------
  sql(`delete from auth.users where email = '${USER}@${ORG}.internal';`);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const afterDelete = await page.evaluate(tryLogin());
  ok("A DELETED member CANNOT sign in", afterDelete.signedIn === false,
     afterDelete.signedIn ? "THEY GOT IN as " + afterDelete.who : afterDelete.message);

  // ---- the org itself is untouched -----------------------------------------
  const rows = sql(`select username, role, active from team_members where org_code = '${ORG}' order by username;`);
  ok("The test account is gone from the org", !rows.includes(USER), "");
  ok("The real accounts are still there",
     rows.includes("roupas") && rows.includes("pitsinis"), "");

  ok("No JavaScript errors during the run", errors.length === 0, errors.slice(0, 3).join(" | "));

  let pass = 0, fail = 0;
  console.log("\nACCESS REVOCATION");
  for (const r of results) {
    if (r.c) { pass++; console.log("  PASS  " + r.n + (r.d ? "  (" + r.d + ")" : "")); }
    else { fail++; console.log("  FAIL  " + r.n + (r.d ? "\n          " + r.d : "")); }
  }
  console.log("\n====================================================");
  console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total\n`);

  await browser.close();
  process.exit(fail ? 1 : 0);
})();
