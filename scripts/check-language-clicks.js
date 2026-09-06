// Clicking around must not drop the app back into English. Anything that
// redraws outside render() misses the language pass that render() ends with,
// which is what happened with the equipment categories.
//
// Everything seeded here is named in Greek, so any Latin word left on screen
// after a click is a genuine untranslated label rather than test data.
const { chromium } = require("playwright-core");
const BASE = "http://localhost:5173";

const results = [];
const ok = (n, c, d) => results.push({ n, c, d: d || "" });

const SEED = `
  document.getElementById('login-modal')?.close();
  isLoggedIn = true; currentRole = 'admin'; currentUsername = 'αφεντικό';
  setCurrentOrgCode('TESTORG01');
  state.users = []; state.clients = []; state.projects = []; state.dailyWorks = [];

  const mk = (n, s, role, user) => createSystemUser({
    personalNumber: String(state.users.length + 1).padStart(3,'0'),
    name: n, surname: s, tel: '2101234567', email: '', username: user, role,
    qualification: 2, workmode: 'operator'
  });
  const boss  = mk('Γιάννης','Παπαδόπουλος','admin','αφεντικό');
  const maria = mk('Μαρία','Ιωάννου','manager','μαρία');
  const nikos = mk('Νίκος','Δήμου','user','νίκος');
  state.users.push(boss, maria, nikos);
  for (const u of state.users) u.mustChangePin = false;
  state.currentUserId = boss.id;

  state.clients.push({ id:'c1', number:'001', initials:'ΕΠΑ', name:'Ελένη', surname:'Παπαδάκη',
    company:'Παπαδάκης ΑΕ', address:'Ερμού 15', tel:'2101234567', email:'',
    uid:'', createdAt:new Date().toISOString(), archivedAt:null });
  state.clients.push({ id:'c2', number:'002', initials:'ΚΛΕ', name:'Κώστας', surname:'Λέκκας',
    company:'Λέκκας ΟΕ', address:'Πατησίων 88', tel:'2109876543', email:'',
    uid:'', createdAt:new Date().toISOString(), archivedAt:null });

  const mkProject = (id, name, num, clientId) => {
    const p = normalizeProject({ id, name, projectNumber:num, clientId,
      address:'Ερμού 15', tel:'2101234567', startDate:'2026-08-01', endDate:'2027-12-31',
      projectManagerUserId: maria.id, lifecycle:'active' }, state);
    p.memberIds = [maria.id, nikos.id];
    p.folders = [{ id:'φ-'+id, name:'Υδραυλικοί', color:'#0d7a73',
      createdAt:new Date().toISOString(), memberIds:[nikos.id], archivedAt:null, items:[] }];
    p.areas = [{ id:'π-'+id, name:'Μπάνιο', floor:'1ος', iconKey:'bathroom', items:[],
      createdAt:new Date().toISOString(), archivedAt:null, completedAt:null }];
    state.projects.push(p);
    return p;
  };
  mkProject('pr1','Ανακαίνιση','0001','c1');
  mkProject('pr2','Συντήρηση','0002','c2');
  state.selectedProjectId = 'pr1';

  state.dailyWorks.push(createDailyWork({
    id:'dw1', title:'Εργασία', date:'2026-09-07', startTime:'09:00', endTime:'10:00',
    memberIds:[nikos.id], status:'planned', createdByUserId: boss.id,
    createdAt:new Date().toISOString()
  }));
  dailyWorksAnchorDate = '2026-09-07';
  plannerAnchorDate = '2026-09-07';
  render();
  document.querySelector('main')?.style.removeProperty('display');
`;

// Latin words left on screen, ignoring loanwords Greek uses as-is and the
// handful of proper nouns in the interface.
const SCAN = `(viewId) => {
  const root = document.getElementById(viewId + '-view');
  if (!root) return [];
  const found = new Set();
  const KEEP = /^(?:AI|EL|GB|GR|PPE|piAR|Email|PIN|CW|UID|Viber|OK|Go|Pi\\.AR)[\\s:.\\-]*$/i;
  const walk = (n) => { for (const c of n.childNodes) {
    if (c.nodeType === 3) {
      const t = c.nodeValue.trim();
      if (t && /[A-Za-z]{4}/.test(t) && !/[\\u0370-\\u03FF]/.test(t) && !KEEP.test(t)) {
        found.add(t.slice(0, 44));
      }
    } else if (c.nodeType === 1 && !['SCRIPT','STYLE'].includes(c.tagName)) walk(c);
  } };
  walk(root);
  return [...found];
}`;

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE + "/?lang=el", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.evaluate(SEED);
  await page.waitForTimeout(400);
  await page.evaluate(`window.__scan = ${SCAN}`);

  // Things a person actually clicks: list rows, cards, tabs, filters.
  // The real class names in this app, checked against the live DOM. Only
  // navigation-ish things: selecting a row, switching a tab, opening a card.
  // Nothing that deletes, archives or submits.
  const CLICKABLES = [
    ".directory-select-row",        // a member or client in the list
    ".client-project-shortcut",     // a project chip on a client
    ".equipment-category-card",     // category filters
    ".action-tab",                  // project sub-tabs
    ".workspace-tab",               // workspace tabs
    ".permission-expand-card summary, .member-card-section summary",
    ".tab-btn, [role='tab']",
  ];

  for (const view of ["teams", "clients", "projects", "equipment", "planner", "daily-works"]) {
    // Land on the view cleanly first.
    const baseline = await page.evaluate(`(() => {
      currentView = ${JSON.stringify(view)};
      render();
      return window.__scan(${JSON.stringify(view)});
    })()`);
    ok(`"${view}" is Greek when it opens`, baseline.length === 0, baseline.join(" | "));

    // Then click everything inside it and re-check after each click.
    const afterClicks = await page.evaluate(`(async () => {
      currentView = ${JSON.stringify(view)};
      render();
      const root = document.getElementById(${JSON.stringify(view)} + '-view');
      const seen = new Set();
      let clicked = 0;
      for (const sel of ${JSON.stringify(CLICKABLES)}) {
        const nodes = Array.from(root.querySelectorAll(sel)).slice(0, 4);
        for (const node of nodes) {
          try { node.click(); } catch (e) { continue; }
          clicked++;
          await new Promise(r => setTimeout(r, 60));
          for (const t of window.__scan(${JSON.stringify(view)})) seen.add(t);
        }
      }
      return { clicked, english: [...seen] };
    })()`);

    ok(`"${view}" stays Greek after clicking (${afterClicks.clicked} clicks)`,
       afterClicks.english.length === 0, afterClicks.english.join(" | "));
  }

  ok("No JavaScript errors during the run", errors.length === 0, errors.slice(0, 3).join(" | "));

  let pass = 0, fail = 0;
  console.log("\nLANGUAGE WHILE CLICKING");
  for (const r of results) {
    if (r.c) { pass++; console.log("  PASS  " + r.n + (r.d ? "  (" + r.d + ")" : "")); }
    else { fail++; console.log("  FAIL  " + r.n + (r.d ? "\n          " + r.d : "")); }
  }
  console.log("\n====================================================");
  console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total\n`);

  await browser.close();
  process.exit(fail ? 1 : 0);
})();
