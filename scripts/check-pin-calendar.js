// Checks the forced PIN change and the per-user calendar filtering.
// Seeds browser-local state only; never touches the cloud.
const { chromium } = require("playwright-core");
const BASE = "http://localhost:5173";

const results = [];
const ok = (n, c, d) => results.push({ n, c, d: d || "" });

// Three people: an admin, and two workers on different projects.
const SEED = `
  document.getElementById('login-modal')?.close();
  state.users = [];
  state.clients = [];
  state.projects = [];
  state.dailyWorks = [];
  state.plannerAssignments = [];

  const mk = (n, s, role) => createSystemUser({
    personalNumber: String(state.users.length + 1).padStart(3,'0'),
    name: n, surname: s, tel: '', email: '', username: n.toLowerCase(), role,
    qualification: 1, workmode: 'operator'
  });
  const admin  = mk('Admina','Adminou','admin');
  const alice  = mk('Alice','Alicou','user');
  const bob    = mk('Bob','Bobou','user');
  state.users.push(admin, alice, bob);
  for (const u of state.users) u.mustChangePin = false;
  state.currentUserId = admin.id;

  const mkProject = (id, name, num, memberId) => {
    const p = normalizeProject({
      id, name, projectNumber: num, clientId: null, address: '',
      startDate: '2026-08-01', endDate: '2027-12-31', lifecycle: 'active'
    }, state);
    p.folders = [{ id: 'team-' + id, name: 'Team ' + name, color: '#0d7a73',
      createdAt: new Date().toISOString(), memberIds: [memberId],
      archivedAt: null, items: [] }];
    state.projects.push(p);
    return p;
  };
  const pAlice = mkProject('pr-alice', 'Alice Project', '0001', alice.id);
  const pBob   = mkProject('pr-bob',   'Bob Project',   '0002', bob.id);

  // One daily work each, same day, so the board must differ per viewer.
  const day = '2026-09-07';
  state.dailyWorks.push(createDailyWork({
    id: 'dw-alice', title: 'ALICEWORK', date: day, startTime: '09:00', endTime: '10:00',
    memberIds: [alice.id], status: 'planned', createdByUserId: admin.id,
    createdAt: new Date().toISOString()
  }));
  state.dailyWorks.push(createDailyWork({
    id: 'dw-bob', title: 'BOBWORK', date: day, startTime: '11:00', endTime: '12:00',
    memberIds: [bob.id], status: 'planned', createdByUserId: admin.id,
    createdAt: new Date().toISOString()
  }));

  dailyWorksAnchorDate = day;
  plannerAnchorDate = day;
  window.__ids = { admin: admin.id, alice: alice.id, bob: bob.id };
  render();
  document.querySelector('main')?.style.removeProperty('display');
`;

// Switching the acting user is what the developer preview does; it is the
// honest way to see the app exactly as that person would.
const actAs = (who) => `
  state.currentUserId = window.__ids['${who}'];
  currentView = 'daily-works'; render();
  (() => {
    const board = document.getElementById('daily-works-board');
    const text = board ? board.innerText : '';
    currentView = 'planner'; render();
    const planner = document.getElementById('planner-board');
    return { daily: text, planner: planner ? planner.innerText : '',
             role: getCurrentRole(),
             visibleProjects: getVisibleProjects(state, false).map(p => p.name) };
  })()
`;

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE + "/?lang=el", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.evaluate(SEED);
  await page.waitForTimeout(400);

  // ---- calendar filtering --------------------------------------------------
  const asAdmin = await page.evaluate(actAs("admin"));
  ok("Admin sees both daily works",
     asAdmin.daily.includes("ALICEWORK") && asAdmin.daily.includes("BOBWORK"),
     "role=" + asAdmin.role);
  ok("Admin sees both projects in the planner",
     asAdmin.planner.includes("Alice Project") && asAdmin.planner.includes("Bob Project"), "");

  const asAlice = await page.evaluate(actAs("alice"));
  ok("Worker sees her own daily work", asAlice.daily.includes("ALICEWORK"), "role=" + asAlice.role);
  ok("Worker does NOT see another person's daily work",
     !asAlice.daily.includes("BOBWORK"),
     asAlice.daily.includes("BOBWORK") ? "BOBWORK leaked into Alice's board" : "");
  ok("Worker sees only her own project in the planner",
     asAlice.planner.includes("Alice Project") && !asAlice.planner.includes("Bob Project"),
     "visible: " + asAlice.visibleProjects.join(", "));

  const asBob = await page.evaluate(actAs("bob"));
  ok("The other worker sees only his own daily work",
     asBob.daily.includes("BOBWORK") && !asBob.daily.includes("ALICEWORK"), "");
  ok("The other worker sees only his own project",
     asBob.planner.includes("Bob Project") && !asBob.planner.includes("Alice Project"),
     "visible: " + asBob.visibleProjects.join(", "));

  // ---- both calendars are reachable for a worker ---------------------------
  const reach = await page.evaluate(`(() => {
    state.currentUserId = window.__ids.alice;
    render();
    const out = {};
    for (const v of ['planner','daily-works']) {
      const btn = document.querySelector('#mobile-bottom-nav [data-view="' + v + '"]')
               || document.querySelector('.bookmark-nav [data-view="' + v + '"]');
      out[v] = { hasButton: !!btn, hidden: btn ? btn.classList.contains('hidden') : true };
      currentView = v; render();
      const view = document.getElementById(v + '-view');
      out[v].renders = !!view && !view.classList.contains('hidden');
    }
    return out;
  })()`);
  ok("Worker can reach the Planner", reach.planner.hasButton && !reach.planner.hidden && reach.planner.renders,
     JSON.stringify(reach.planner));
  ok("Worker can reach Daily Works", reach["daily-works"].hasButton && !reach["daily-works"].hidden && reach["daily-works"].renders,
     JSON.stringify(reach["daily-works"]));

  // ---- forced PIN change ---------------------------------------------------
  const pinGate = await page.evaluate(`(() => {
    // Same shape a real login leaves behind: the session names the account,
    // and state.currentUserId points at its workspace user.
    isLoggedIn = true;
    currentUsername = 'alice';
    state.currentUserId = window.__ids.alice;
    state.users.find(u => u.username === 'alice').mustChangePin = true;
    render();
    const modal = document.getElementById('pin-change-modal');
    return { open: !!modal && modal.open, needs: needsPinChange() };
  })()`);
  ok("Default-PIN account is blocked by the PIN modal", pinGate.open && pinGate.needs, JSON.stringify(pinGate));

  // Previewing another user must not hijack the gate: it would ask the wrong
  // person to change a PIN they do not own.
  const previewSafe = await page.evaluate(`(() => {
    const modal = document.getElementById('pin-change-modal');
    modal.close();
    // Signed in as the admin, previewing Alice, whose PIN still needs changing.
    currentUserId = null;
    currentUsername = 'admina';
    state.users.find(u => u.username === 'admina').mustChangePin = false;
    state.users.find(u => u.username === 'alice').mustChangePin = true;
    developerPreviewSourceUserId = state.users.find(u => u.username === 'admina').id;
    state.currentUserId = state.users.find(u => u.username === 'alice').id;
    const duringPreview = needsPinChange();
    // Back to normal: the admin is fine, so still no gate.
    developerPreviewSourceUserId = null;
    state.currentUserId = state.users.find(u => u.username === 'admina').id;
    const afterPreview = needsPinChange();
    // And when the signed-in admin is the one on the starting PIN, it fires.
    state.users.find(u => u.username === 'admina').mustChangePin = true;
    const ownAccount = needsPinChange();
    return { duringPreview, afterPreview, ownAccount };
  })()`);
  ok("Previewing another user does not trigger their PIN gate",
     previewSafe.duringPreview === false, JSON.stringify(previewSafe));
  ok("Gate stays off when the signed-in account is fine",
     previewSafe.afterPreview === false, JSON.stringify(previewSafe));
  ok("Gate fires for the signed-in account's own default PIN",
     previewSafe.ownAccount === true, JSON.stringify(previewSafe));

  await page.evaluate(`(() => {
    isLoggedIn = true;
    currentUsername = 'alice';
    state.currentUserId = window.__ids.alice;
    state.users.find(u => u.username === 'alice').mustChangePin = true;
    render();
  })()`);

  const cannotEscape = await page.evaluate(`(() => {
    const modal = document.getElementById('pin-change-modal');
    // Esc would normally close a <dialog>; the cancel handler must stop it.
    const ev = new Event('cancel', { cancelable: true });
    modal.dispatchEvent(ev);
    return { prevented: ev.defaultPrevented, stillOpen: modal.open };
  })()`);
  ok("Esc cannot dismiss the PIN modal", cannotEscape.prevented && cannotEscape.stillOpen,
     JSON.stringify(cannotEscape));

  const reopens = await page.evaluate(`(() => {
    const modal = document.getElementById('pin-change-modal');
    modal.close();
    render();  // any redraw must put the gate back
    return modal.open;
  })()`);
  ok("Closing the PIN modal reopens it on the next render", reopens === true, "open=" + reopens);

  // Weak PINs must be refused before any network call.
  const weak = await page.evaluate(`(() => {
    const out = {};
    for (const p of ['123456','000000','111111','234567','654321']) out[p] = isWeakPin(p);
    out['418902'] = isWeakPin('418902');
    return out;
  })()`);
  ok("Starting PIN 123456 is refused", weak["123456"] === true, "");
  ok("Repeated digits refused", weak["111111"] === true, "");
  ok("Simple runs refused (up and down)", weak["234567"] === true && weak["654321"] === true, "");
  ok("A normal PIN is accepted", weak["418902"] === false, "");

  const validation = await page.evaluate(`(async () => {
    document.getElementById('pin-change-new').value = '1234';
    document.getElementById('pin-change-confirm').value = '1234';
    await submitForcedPinChange();
    const short = document.getElementById('pin-change-error').textContent;
    document.getElementById('pin-change-new').value = '418902';
    document.getElementById('pin-change-confirm').value = '418903';
    await submitForcedPinChange();
    const mismatch = document.getElementById('pin-change-error').textContent;
    return { short, mismatch };
  })()`);
  ok("Short PIN is rejected with a message", !!validation.short, validation.short);
  ok("Mismatched confirmation is rejected with a message", !!validation.mismatch, validation.mismatch);
  ok("PIN messages are in Greek", /[Α-Ωα-ωίϊΐόάέύϋΰήώ]/.test(validation.short + validation.mismatch),
     validation.short + " / " + validation.mismatch);

  // ---- voluntary PIN change from the user menu -----------------------------
  // The login credential is a synthetic email; a change to how it is built
  // would break every sign-in, so pin it down.
  const authEmail = await page.evaluate(`({
    normal: buildMemberAuthEmail('giannis', '2120002104'),
    padded: buildMemberAuthEmail('  giannis  ', '  2120002104  '),
    upper:  buildMemberAuthEmail('giannis', 'ABC1234567')
  })`);
  ok("Login email is still built the same way",
     authEmail.normal === "giannis@2120002104.internal", authEmail.normal);
  ok("Login email trims and lowercases like before",
     authEmail.padded === "giannis@2120002104.internal" && authEmail.upper === "giannis@abc1234567.internal",
     authEmail.padded + " / " + authEmail.upper);

  const menuBtn = await page.evaluate(`(() => {
    isLoggedIn = false; updateAuthUI();
    const loggedOut = document.getElementById('change-pin-btn').style.display;
    isLoggedIn = true; currentUsername = 'alice';
    state.users.find(u => u.username === 'alice').mustChangePin = false;
    updateAuthUI();
    const loggedIn = document.getElementById('change-pin-btn').style.display;
    return { loggedOut, loggedIn };
  })()`);
  ok("Change-PIN button is hidden when logged out", menuBtn.loggedOut === "none", JSON.stringify(menuBtn));
  ok("Change-PIN button appears once signed in", menuBtn.loggedIn === "block", JSON.stringify(menuBtn));

  const voluntary = await page.evaluate(`(() => {
    document.getElementById('pin-change-modal').close();
    openVoluntaryPinChange();
    const modal = document.getElementById('pin-change-modal');
    return {
      open: modal.open,
      mode: pinChangeMode,
      currentShown: !document.getElementById('pin-change-current-row').hidden,
      cancelShown: !document.getElementById('pin-change-cancel').hidden,
      logoutShown: !document.getElementById('pin-change-logout').hidden,
      title: document.getElementById('pin-change-title').textContent,
      menuClosed: document.getElementById('access-menu').open === false
    };
  })()`);
  ok("Menu opens the PIN dialog in voluntary mode",
     voluntary.open && voluntary.mode === "voluntary", JSON.stringify(voluntary));
  ok("Voluntary mode asks for the current PIN", voluntary.currentShown === true, "");
  ok("Voluntary mode offers Cancel, not Log out",
     voluntary.cancelShown === true && voluntary.logoutShown === false, "");
  ok("Voluntary mode is titled for a change, in Greek",
     /Αλλαγή/.test(voluntary.title), voluntary.title);
  ok("Opening from the menu closes the menu", voluntary.menuClosed === true, "");

  const voluntarySurvives = await page.evaluate(`(() => {
    render();  // the forced gate must not close a dialog the user opened
    const modal = document.getElementById('pin-change-modal');
    return { stillOpen: modal.open, mode: pinChangeMode };
  })()`);
  ok("A render does not close the voluntary dialog",
     voluntarySurvives.stillOpen === true, JSON.stringify(voluntarySurvives));

  const voluntaryValidation = await page.evaluate(`(async () => {
    const set = (id, v) => { document.getElementById(id).value = v; };
    set('pin-change-current',''); set('pin-change-new','418902'); set('pin-change-confirm','418902');
    await submitForcedPinChange();
    const noCurrent = document.getElementById('pin-change-error').textContent;
    set('pin-change-current','418902'); set('pin-change-new','418902'); set('pin-change-confirm','418902');
    await submitForcedPinChange();
    const same = document.getElementById('pin-change-error').textContent;
    return { noCurrent, same };
  })()`);
  ok("Voluntary change requires the current PIN", !!voluntaryValidation.noCurrent, voluntaryValidation.noCurrent);
  ok("Voluntary change refuses reusing the same PIN", !!voluntaryValidation.same, voluntaryValidation.same);

  const escapable = await page.evaluate(`(() => {
    const modal = document.getElementById('pin-change-modal');
    const ev = new Event('cancel', { cancelable: true });
    modal.dispatchEvent(ev);
    return { prevented: ev.defaultPrevented, mode: pinChangeMode };
  })()`);
  ok("Esc CAN dismiss a voluntary change", escapable.prevented === false, JSON.stringify(escapable));

  const cancelled = await page.evaluate(`(() => {
    openVoluntaryPinChange();
    closeForcedPinChange();
    render();
    const modal = document.getElementById('pin-change-modal');
    return { open: modal.open, mode: pinChangeMode };
  })()`);
  ok("Cancelling closes it and it stays closed",
     cancelled.open === false && cancelled.mode === null, JSON.stringify(cancelled));

  // The blocking case must still block after all of the above.
  const forcedStillBlocks = await page.evaluate(`(() => {
    state.users.find(u => u.username === 'alice').mustChangePin = true;
    render();
    const modal = document.getElementById('pin-change-modal');
    const ev = new Event('cancel', { cancelable: true });
    modal.dispatchEvent(ev);
    return { open: modal.open, mode: pinChangeMode, prevented: ev.defaultPrevented,
             // Check what the user actually sees: the shared login styles give
             // labels a display value that can outrank the [hidden] attribute.
             currentHidden: document.getElementById('pin-change-current-row').getBoundingClientRect().height === 0,
             logoutVisible: document.getElementById('pin-change-logout').getBoundingClientRect().height > 0 };
  })()`);
  ok("Forced mode still blocks and refuses Esc",
     forcedStillBlocks.open && forcedStillBlocks.mode === "forced" && forcedStillBlocks.prevented,
     JSON.stringify(forcedStillBlocks));
  ok("Forced mode does not ask for the current PIN",
     forcedStillBlocks.currentHidden === true, JSON.stringify(forcedStillBlocks));
  ok("Forced mode offers Log out", forcedStillBlocks.logoutVisible === true, "");

  // ---- the guide links ------------------------------------------------------
  const guide = await page.evaluate(`(() => {
    const links = Array.from(document.querySelectorAll('[data-guide-link]'));
    return links.map(a => ({ id: a.id || a.className, href: a.getAttribute('href') }));
  })()`);
  ok("Two guide links: login screen and user menu", guide.length === 2, guide.map(g => g.id).join(" | "));
  const topBarGuide = await page.evaluate(`!!document.getElementById('user-guide-link')`);
  ok("Guide button removed from the top bar", topBarGuide === false, "");
  ok("All guide links are versioned and identical",
     guide.length > 0 && guide.every(g => g.href === guide[0].href && /\?v=/.test(g.href)),
     guide[0] ? guide[0].href : "");
  const guideRes = guide[0] ? await page.request.get(BASE + guide[0].href) : null;
  ok("The versioned guide URL is served", guideRes && guideRes.status() === 200,
     guideRes ? "HTTP " + guideRes.status() : "no link");

  // The default PIN must no longer be advertised anywhere on the login screen.
  const loginText = await page.evaluate(`
    (document.getElementById('login-modal')?.innerText || '')
  `);
  ok("Login screen no longer shows the default PIN", !/123456/.test(loginText),
     loginText.match(/.{0,30}123456.{0,20}/)?.[0] || "");

  ok("No JavaScript errors during the run", errors.length === 0, errors.slice(0, 3).join(" | "));

  let pass = 0, fail = 0;
  console.log("\nPIN GATE & CALENDAR SCOPE");
  for (const r of results) {
    if (r.c) { pass++; console.log("  PASS  " + r.n + (r.d ? "  (" + r.d + ")" : "")); }
    else { fail++; console.log("  FAIL  " + r.n + (r.d ? "\n          " + r.d : "")); }
  }
  console.log("\n====================================================");
  console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total\n`);

  await browser.close();
  process.exit(fail ? 1 : 0);
})();
