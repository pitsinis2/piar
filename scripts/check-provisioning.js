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

let pass = 0, fail = 0;
console.log("\nACCOUNT PROVISIONING");
for (const r of results) {
  if (r.c) { pass++; console.log("  PASS  " + r.n + (r.d ? "  (" + r.d + ")" : "")); }
  else { fail++; console.log("  FAIL  " + r.n + (r.d ? "\n          " + r.d : "")); }
}
console.log("\n====================================================");
console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total\n`);
process.exit(fail ? 1 : 0);
