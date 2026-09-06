// Developer is meant to be the top role. This compares it against admin gate
// by gate, so "absolute power" is measured rather than assumed.
const { chromium } = require("playwright-core");
const BASE = "http://localhost:5173";

const results = [];
const ok = (n, c, d) => results.push({ n, c, d: d || "" });

const SEED = `
  document.getElementById('login-modal')?.close();
  isLoggedIn = true; currentUsername = 'dev'; setCurrentOrgCode('TESTORG01');
  state.users = []; state.projects = [];

  const mk = (n, role, user) => createSystemUser({
    personalNumber: String(state.users.length + 1).padStart(3,'0'),
    name: n, surname: 'X', tel: '', email: '', username: user, role
  });
  const admin = mk('Ada','admin','ada');
  const dev   = mk('Dev','developer','dev');
  const worker= mk('Wes','user','wes');
  state.users.push(admin, dev, worker);
  for (const u of state.users) u.mustChangePin = false;

  const p = normalizeProject({ id:'p1', name:'P', projectNumber:'0001',
    startDate:'2026-08-01', lifecycle:'active' }, state);
  p.folders = [{ id:'t1', name:'T', color:'#0d7a73', createdAt:new Date().toISOString(),
    memberIds:[], archivedAt:null, items:[] }];
  p.memberIds = [];
  state.projects.push(p);
  state.selectedProjectId = 'p1';
  window.__ids = { admin: admin.id, dev: dev.id, worker: worker.id };
  render();
`;

// The gates that decide what a role can do. Measured for each user in turn.
const probe = (who) => `(() => {
  state.currentUserId = window.__ids['${who}'];
  const project = getCurrentProject();
  project.selectedFolderId = 't1';
  return {
    role: getCurrentRole(),
    isAdmin: isAdmin(),
    canManageProject: canManageProject(project),
    canWorkInProject: canWorkInProject(project),
    canAccessTeamFolder: canAccessTeamFolder(project.folders[0], project),
    canManageEquipment: canManageEquipment(),
    canCreateEquipmentCategory: canCreateEquipmentCategory(),
    canManageUsers: canManageUsers(),
    deleteMembers: hasPermission('deleteMembers'),
    deleteAdmin: hasPermission('deleteAdmin'),
    changeRoles: hasPermission('changeRoles'),
  };
})()`;

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE + "/?lang=el", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.evaluate(SEED);
  await page.waitForTimeout(300);

  const asAdmin = await page.evaluate(probe("admin"));
  const asDev = await page.evaluate(probe("dev"));
  const asWorker = await page.evaluate(probe("worker"));

  ok("Roles are what the test set up",
     asAdmin.role === "admin" && asDev.role === "developer" && asWorker.role === "user",
     `${asAdmin.role} / ${asDev.role} / ${asWorker.role}`);

  // Gate by gate: a developer must never have less than an admin.
  const gates = Object.keys(asAdmin).filter((k) => k !== "role");
  const weaker = gates.filter((g) => asAdmin[g] === true && asDev[g] !== true);
  ok("A developer can do everything an admin can",
     weaker.length === 0,
     weaker.length ? "developer lacks: " + weaker.join(", ") : `${gates.length} gates compared`);

  ok("A developer counts as admin", asDev.isAdmin === true, "");
  ok("Developer can manage a project they are not assigned to",
     asDev.canManageProject === true, "");
  ok("Developer can open a team folder they are not in",
     asDev.canAccessTeamFolder === true, "");
  ok("Developer can delete members, including admins",
     asDev.deleteMembers === true && asDev.deleteAdmin === true, "");
  ok("Developer can change roles", asDev.changeRoles === true, "");

  // The point of the change is not "everyone is admin now".
  ok("A plain user is still NOT admin", asWorker.isAdmin === false, "");
  ok("A plain user still cannot delete members", asWorker.deleteMembers !== true, "");
  ok("A plain user cannot manage a project they are not on",
     asWorker.canManageProject !== true, "");

  // Developer preview stays developer-only, so the two roles remain distinct.
  const distinct = await page.evaluate(`(() => {
    state.currentUserId = window.__ids.admin;
    const adminIsDeveloper = isDeveloper();
    state.currentUserId = window.__ids.dev;
    const devIsDeveloper = isDeveloper();
    return { adminIsDeveloper, devIsDeveloper };
  })()`);
  ok("An admin is still not a developer", distinct.adminIsDeveloper === false, "");
  ok("A developer still is one", distinct.devIsDeveloper === true, "");

  ok("No JavaScript errors during the run", errors.length === 0, errors.slice(0, 3).join(" | "));

  let pass = 0, fail = 0;
  console.log("\nDEVELOPER ROLE");
  for (const r of results) {
    if (r.c) { pass++; console.log("  PASS  " + r.n + (r.d ? "  (" + r.d + ")" : "")); }
    else { fail++; console.log("  FAIL  " + r.n + (r.d ? "\n          " + r.d : "")); }
  }
  console.log("\n====================================================");
  console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total\n`);

  await browser.close();
  process.exit(fail ? 1 : 0);
})();
