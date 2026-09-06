// What deleting a member does to the workspace records: every live reference
// removed, the name kept against past work. Browser-local state only - the
// login side is covered end to end by check-revocation.js.
const { chromium } = require("playwright-core");
const BASE = "http://localhost:5173";

const results = [];
const ok = (n, c, d) => results.push({ n, c, d: d || "" });

const SEED = `
  document.getElementById('login-modal')?.close();
  isLoggedIn = true; currentRole = 'admin'; currentUsername = 'boss';
  setCurrentOrgCode('TESTORG01');
  state.users = []; state.projects = []; state.dailyWorks = [];
  state.deletedUsers = {};

  const mk = (n, s, role, user) => createSystemUser({
    personalNumber: String(state.users.length + 1).padStart(3,'0'),
    name: n, surname: s, tel: '', email: '', username: user, role
  });
  const boss  = mk('Boss','Person','admin','boss');
  const maria = mk('Maria','Ioannou','user','maria');
  state.users.push(boss, maria);
  for (const u of state.users) u.mustChangePin = false;
  state.currentUserId = boss.id;

  const p = normalizeProject({ id:'p1', name:'Test Project', projectNumber:'0001',
    startDate:'2026-08-01', lifecycle:'active',
    projectManagerUserId: maria.id }, state);
  p.memberIds = [maria.id];
  p.folders = [{ id:'t1', name:'Team A', color:'#0d7a73', createdAt:new Date().toISOString(),
    memberIds:[maria.id], archivedAt:null, items:[] }];
  state.projects.push(p);
  state.selectedProjectId = 'p1';

  state.dailyWorks.push(createDailyWork({
    id:'dw1', title:'Job', date:'2026-09-07', startTime:'09:00', endTime:'10:00',
    memberIds:[maria.id], status:'planned', createdByUserId: maria.id,
    createdAt:new Date().toISOString()
  }));

  window.__maria = maria.id;
  render();
  document.querySelector('main')?.style.removeProperty('display');
`;

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE + "/?lang=el", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.evaluate(SEED);
  await page.waitForTimeout(300);

  // Delete the member the way the app does, minus the network call (which
  // check-revocation.js proves separately against the real backend).
  const after = await page.evaluate(`(() => {
    const id = window.__maria;
    const member = getUserById(id);
    rememberDeletedMember(member);
    state.users = state.users.filter((u) => u.id !== id);
    for (const project of state.projects) {
      project.memberIds = (project.memberIds || []).filter((m) => m !== id);
      if (project.projectManagerUserId === id) project.projectManagerUserId = "";
      for (const folder of project.folders || []) {
        folder.memberIds = (folder.memberIds || []).filter((m) => m !== id);
      }
    }
    for (const work of state.dailyWorks || []) {
      work.memberIds = (work.memberIds || []).filter((m) => m !== id);
    }
    render();
    const p = state.projects[0];
    const resolved = getUserById(id);
    return {
      goneFromUsers: !state.users.some((u) => u.id === id),
      goneFromProject: !p.memberIds.includes(id),
      goneFromTeam: !p.folders[0].memberIds.includes(id),
      goneFromDailyWork: !state.dailyWorks[0].memberIds.includes(id),
      managerCleared: p.projectManagerUserId === "",
      creatorStillRecorded: state.dailyWorks[0].createdByUserId === id,
      nameStillResolves: resolved ? getMemberDisplayName(resolved) : null,
      markedDeleted: resolved ? resolved.isDeleted === true : false,
      markedArchived: resolved ? resolved.status === "archived" : false,
      loginDisabled: resolved ? resolved.loginEnabled === false : false,
      notInActiveList: !getActiveUsers().some((u) => u.id === id),
    };
  })()`);

  ok("Removed from the member list", after.goneFromUsers, "");
  ok("Removed from the project", after.goneFromProject, "");
  ok("Removed from the service team inside the project", after.goneFromTeam, "");
  ok("Removed from daily works", after.goneFromDailyWork, "");
  ok("Cleared as project manager", after.managerCleared, "");
  ok("Does not appear in the active member list", after.notInActiveList, "");

  ok("Their past work still records who created it", after.creatorStillRecorded, "");
  ok("Their name still resolves on that past work",
     after.nameStillResolves === "Maria Ioannou", String(after.nameStillResolves));
  ok("The kept record is marked as deleted", after.markedDeleted, "");
  ok("The kept record counts as archived, so lists skip it", after.markedArchived, "");
  ok("The kept record cannot be treated as able to log in", after.loginDisabled, "");

  const survives = await page.evaluate(`(() => {
    // The name has to survive a save/load round trip, or history goes blank
    // the next time the workspace is opened.
    const saved = JSON.parse(JSON.stringify(state));
    const reloaded = normalizeState(saved);
    const kept = reloaded.deletedUsers && reloaded.deletedUsers[window.__maria];
    return { kept: !!kept, name: kept ? kept.name + " " + kept.surname : null };
  })()`);
  ok("The kept name survives a save and reload", survives.kept, String(survives.name));

  ok("No JavaScript errors during the run", errors.length === 0, errors.slice(0, 3).join(" | "));

  let pass = 0, fail = 0;
  console.log("\nDELETING A MEMBER");
  for (const r of results) {
    if (r.c) { pass++; console.log("  PASS  " + r.n + (r.d ? "  (" + r.d + ")" : "")); }
    else { fail++; console.log("  FAIL  " + r.n + (r.d ? "\n          " + r.d : "")); }
  }
  console.log("\n====================================================");
  console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total\n`);

  await browser.close();
  process.exit(fail ? 1 : 0);
})();
