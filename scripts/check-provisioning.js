// Guards the account-provisioning rules: no weak defaults anywhere, no hidden
// second admin, and the panel's client-side rules matching the server's.
const fs = require("fs");
const ROOT = "C:/Users/pitsi/Documents/Programming/ProjectManagerWeb";
const FN = fs.readFileSync(ROOT + "/supabase/functions/admin-org/index.ts", "utf8");
const PANEL = fs.readFileSync(ROOT + "/saas-app/public/admin/index.html", "utf8");

// Only the createOrg block: createMemberLogin legitimately starts a new member
// on the shared 123456, which the forced-change gate then replaces on first login.
const CREATE_ORG = (() => {
  const start = FN.indexOf('if (action === "createOrg")');
  if (start < 0) return "";
  const end = FN.indexOf('if (action ===', start + 10);
  return FN.slice(start, end > 0 ? end : undefined);
})();

const results = [];
const ok = (n, c, d) => results.push({ n, c, d: d || "" });

// ---- no weak defaults ------------------------------------------------------
ok("Server no longer defaults the admin username to \"admin\"",
   !/body\.username\s*\|\|\s*["']admin["']/.test(FN), "");
ok("Server no longer defaults the org PIN to 123456",
   CREATE_ORG.length > 0 && !/body\.pin\s*\|\|\s*["']123456["']/.test(CREATE_ORG),
   CREATE_ORG.length ? "" : "could not isolate the createOrg block");
ok("Server requires an admin username",
   /if \(!username\) return json\(\{ error: "Admin username is required"/.test(FN), "");

ok("The hidden developer account is gone from createOrg",
   !/devUsername|devPin/.test(FN), "");
ok("createOrg creates exactly one auth account",
   (CREATE_ORG.match(/auth\.admin\.createUser/g) || []).length === 1,
   (CREATE_ORG.match(/auth\.admin\.createUser/g) || []).length + " createUser calls in createOrg");

ok("The panel form does not pre-fill a username",
   !/id="newOrgAdminUser"[^>]*value=/.test(PANEL), "");
ok("The panel form does not pre-fill a PIN",
   !/id="newOrgAdminPin"[^>]*value=/.test(PANEL), "");
ok("The panel no longer falls back to admin/123456",
   !/value\.trim\(\)\s*\|\|\s*["'](admin|123456)["']/.test(PANEL), "");

// ---- the two rule sets must agree -----------------------------------------
function extractReserved(src) {
  const m = src.match(/RESERVED_USERNAMES = new Set\(\[([\s\S]*?)\]\)/);
  if (!m) return null;
  return new Set(m[1].match(/"[a-z]+"/g).map((s) => s.replace(/"/g, "")));
}
const serverList = extractReserved(FN);
const panelList = extractReserved(PANEL);
ok("Both sides define a reserved-name list", !!serverList && !!panelList, "");
if (serverList && panelList) {
  const same = serverList.size === panelList.size && [...serverList].every((n) => panelList.has(n));
  ok("Panel and server reserve exactly the same names", same,
     `server ${serverList.size}, panel ${panelList.size}`);
  for (const name of ["admin", "developer", "root", "test", "demo", "user"]) {
    ok(`"${name}" is refused`, serverList.has(name), "");
  }
}

// ---- the format rule behaves ----------------------------------------------
function extractRegex(src) {
  const m = src.match(/if \(!\/(\^\[a-z0-9\][^/]*)\/\.test\(username\)\) return false/);
  return m ? new RegExp(m[1]) : null;
}
const re = extractRegex(FN);
ok("The username format rule is present", !!re, "");
if (re && serverList) {
  const allowed = (u) => re.test(u) && !serverList.has(u);
  const cases = [
    ["g.papadopoulos", true], ["roupas", true], ["a_b-c1", true],
    ["admin", false], ["developer", false], ["DEMO".toLowerCase(), false],
    ["ab", false],                    // too short
    ["x".repeat(31), false],          // too long
    ["-leading", false],              // must start alphanumeric
    ["has space", false], ["oops!", false],
  ];
  for (const [input, want] of cases) {
    ok(`"${input.length > 20 ? input.slice(0, 12) + "…" : input}" is ${want ? "allowed" : "refused"}`,
       allowed(input) === want, `got ${allowed(input)}`);
  }
}

// ---- deleting a login is safe ---------------------------------------------
ok("deleteLogin exists", /action === "deleteLogin"/.test(FN), "");
ok("deleteLogin refuses to remove the last admin",
   /only admin login for the organisation/.test(FN), "");
ok("deleteLogin removes the credential too, not just the row",
   /auth\.admin\.deleteUser/.test(FN), "");
ok("The panel asks before deleting a login",
   /deleteOrgLogin[\s\S]{0,400}confirm\(/.test(PANEL), "");

// ---- granting a login after the fact ---------------------------------------
const APP = fs.readFileSync(ROOT + "/saas-app/appback.js", "utf8");
const extra = [];
const ok2 = (n, c, d) => extra.push({ n, c, d: d || "" });

ok2("Deleting a login clears the workspace link, so it can be granted again",
   /clearWorkspaceAuthLink\(supabase, orgCode, username\)/.test(FN), "");
ok2("Creating a login writes the link back",
   /setWorkspaceAuthLink\(supabase, orgCode, username, authUser\.user\.id\)/.test(FN), "");
ok2("The panel offers a +Login button for users without one",
   /createLoginFor\(/.test(PANEL) && /hasLogin\(u, info\.logins\)/.test(PANEL), "");

// ---- the credentials email -------------------------------------------------
ok2("No old vercel address anywhere in the panel",
   !/piar-jet\.vercel\.app/.test(PANEL), "");
ok2("The app address is defined once", (PANEL.match(/const APP_URL = /g) || []).length === 1, "");
ok2("The app address points at the live domain",
   /const APP_URL = "https:\/\/piar\.opexpi\.com"/.test(PANEL), "");
ok2("The email no longer hardcodes the username \"admin\"",
   !/Όνομα χρήστη:\s*admin\n/.test(PANEL), "");
ok2("The email no longer hardcodes PIN 123456",
   !/Προσωρινό PIN:\s*123456\n/.test(PANEL), "");
ok2("The email takes the username from the org's real admin login",
   /currentOrgDetail\?\.logins/.test(PANEL), "");

// ---- last login ------------------------------------------------------------
ok2("A real sign-in records the last login",
   /workspaceUser\.lastLoginAt = new Date\(\)\.toISOString\(\)/.test(APP), "");
ok2("The sessions action exists", /action === "sessions"/.test(FN), "");
ok2("Sessions report duration", /minutes: Math\.max\(/.test(FN), "");
ok2("Sessions report where from", /lookupPlace\(ip\)/.test(FN), "");
ok2("Sessions report the device", /describeDevice\(s\.user_agent\)/.test(FN), "");
ok2("A slow location lookup cannot hang the panel",
   /AbortSignal\.timeout\(\d+\)/.test(FN), "");
ok2("Private addresses are not sent to the lookup service",
   /192\.168\.|127\.0\.0\.1/.test(FN), "");
ok2("The panel explains that duration and location are approximate",
   /keeps growing/.test(PANEL) && /can be off/.test(PANEL), "");

let pass = 0, fail = 0;
const report = (title, list) => {
  console.log("\n" + title);
  for (const r of list) {
    if (r.c) { pass++; console.log("  PASS  " + r.n + (r.d ? "  (" + r.d + ")" : "")); }
    else { fail++; console.log("  FAIL  " + r.n + (r.d ? "\n          " + r.d : "")); }
  }
};
report("ACCOUNT PROVISIONING", results);
report("LOGINS, EMAIL AND LOGIN ACTIVITY", extra);
console.log("\n====================================================");
console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total\n`);
process.exit(fail ? 1 : 0);
