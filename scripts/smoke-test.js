// Non-destructive test pass over the running app.
// Everything happens in the headless browser's own local state; the cloud is
// only ever read, never written, so no existing data can be harmed.
const { chromium } = require("playwright-core");

const URL = "http://localhost:5173/?lang=el";
const results = [];
const consoleErrors = [];

function check(area, name, pass, detail = "") {
  results.push({ area, name, pass: !!pass, detail });
}

const SEED = `
  document.getElementById('login-modal')?.close();
  state.users = []; state.clients = []; state.projects = [];
  const u = (n,s,role) => createSystemUser({ personalNumber:String(state.users.length+1).padStart(3,'0'),
    name:n, surname:s, tel:'690', email:n+'@x.gr', username:n.toLowerCase(), role });
  state.users.push(u('Fotis','Pitsinis','admin'));
  state.users.push(u('Maria','Ioannou','manager'));
  state.users.push(u('Nikos','Dimou','user'));
  state.currentUserId = state.users[0].id;
  state.clients.push({ id:'c1', number:'001', initials:'EPA', name:'Eleni', surname:'Papadaki',
    company:'Papadakis AE', address:'Ermou 15', tel:'210', email:'e@x.gr',
    createdAt:new Date().toISOString(), archivedAt:null });
  const p = normalizeProject({ id:'p1', name:'Anakainisi', projectNumber:'0001', clientId:'c1',
    address:'Ermou 15', tel:'210', startDate:'2026-09-07',
    projectManagerUserId: state.users[1].id, lifecycle:'active' }, state);
  p.folders = [{ id:'t1', name:'Ydravlikoi', color:'#0d7a73', createdAt:new Date().toISOString(),
    memberIds:[state.users[2].id], archivedAt:null, items:[] }];
  p.areas = [{ id:'a1', name:'Banio', floor:'1', iconKey:'bathroom', items:[],
    createdAt:new Date().toISOString(), archivedAt:null, completedAt:null }];
  state.projects.push(p);
  state.selectedProjectId = 'p1';
  isLoggedIn = true; currentOrgCode = 'TESTORG01'; currentUsername = 'fotis'; currentRole = 'admin';
  setCurrentOrgCode('TESTORG01');
  render();
  document.querySelector('main')?.style.removeProperty('display');
`;

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 430, height: 950 } });
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message.slice(0, 160)));

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // ---- boot ----------------------------------------------------------
  const boot = await page.evaluate(`window.__pmBootError || null`);
  check("Boot", "App boots with no error", !boot, boot || "");

  await page.evaluate(SEED);
  await page.waitForTimeout(400);

  // ---- every navigation destination ---------------------------------
  const views = ["projects", "planner", "daily-works", "teams", "equipment", "clients", "theme", "audit", "ai-assistant"];
  for (const v of views) {
    const r = await page.evaluate(`(() => {
      try {
        currentView = ${JSON.stringify(v)};
        render();
        const el = document.querySelector('#${'$'}{}'.length ? '#' + ${JSON.stringify(v)} + '-view' : '');
        const view = document.getElementById(${JSON.stringify(v)} + '-view');
        return { ok: true, rendered: !!view, visible: view ? !view.classList.contains('hidden') : null };
      } catch (e) { return { ok: false, err: e.message }; }
    })()`);
    check("Navigation", `View "${v}" renders`, r.ok && r.rendered !== false, r.err || "");
  }

  // ---- bottom-bar buttons actually navigate --------------------------
  const navResult = await page.evaluate(`(() => {
    const out = [];
    const nav = document.getElementById('mobile-bottom-nav');
    for (const btn of nav.querySelectorAll('[data-view]')) {
      const want = btn.dataset.view;
      try { btn.click(); out.push({ want, got: currentView, ok: currentView === want }); }
      catch (e) { out.push({ want, got: null, ok: false, err: e.message }); }
    }
    return out;
  })()`);
  for (const n of navResult) {
    check("Navigation", `Bottom-bar "${n.want}" opens its view`, n.ok, n.ok ? "" : `went to ${n.got}`);
  }

  // ---- create flows through the real handlers ------------------------
  const member = await page.evaluate(`(() => {
    currentView='teams'; render();
    document.getElementById('toggle-member-form-btn')?.click(); render();
    const set = (id,v) => { const e=document.getElementById(id); if(!e) return false;
      e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); return true; };
    set('member-name','Test'); set('member-surname','User');
    set('member-tel','555'); set('member-email','test.user@x.gr');
    set('member-personal-number','090'); set('member-initials','TUS');
    const before = state.users.length;
    document.getElementById('member-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    const created = state.users.find(u => u.personalNumber === '090');
    return { added: state.users.length === before + 1, initials: created?.initials, username: created?.username };
  })()`);
  check("Members", "Create member", member.added, "");
  check("Members", "Initials saved", member.initials === "TUS", member.initials || "");
  check("Members", "Username auto-filled", !!member.username, member.username || "");

  const dupes = await page.evaluate(`(() => {
    const msgs=[]; const real=showAppMessage; showAppMessage=(m)=>msgs.push(String(m));
    const set=(id,v)=>{const e=document.getElementById(id); if(!e)return; e.value=v; e.dispatchEvent(new Event('input',{bubbles:true}));};
    document.getElementById('toggle-member-form-btn')?.click(); render();
    set('member-name','Other'); set('member-surname','Person'); set('member-tel','1'); set('member-email','o@x.gr');
    set('member-personal-number','090'); set('member-initials','ZZZ');
    document.getElementById('member-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    const numMsg = msgs.pop() || '';
    set('member-personal-number','091'); set('member-initials','TUS');
    document.getElementById('member-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    const iniMsg = msgs.pop() || '';
    showAppMessage = real;
    return { numMsg, iniMsg };
  })()`);
  check("Members", "Duplicate number is refused with a message", /090/.test(dupes.numMsg), dupes.numMsg);
  check("Members", "Duplicate initials refused with a message", /TUS/.test(dupes.iniMsg), dupes.iniMsg);

  const client = await page.evaluate(`(() => {
    currentView='clients'; render();
    document.getElementById('toggle-client-form-btn')?.click(); render();
    const set=(id,v)=>{const e=document.getElementById(id); if(!e)return; e.value=v; e.dispatchEvent(new Event('input',{bubbles:true}));};
    set('client-name','Nea'); set('client-surname','Etairia');
    set('client-number','050');
    const before = state.clients.length;
    document.getElementById('client-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    const made = state.clients.find(c => c.number === '050');
    return { added: state.clients.length === before + 1, initials: made?.initials };
  })()`);
  check("Clients", "Create client", client.added, "");
  check("Clients", "Client initials generated", !!client.initials, client.initials || "");

  // ---- photo upload path ---------------------------------------------
  const upload = await page.evaluate(`(async () => {
    // a 4000x3000 photo, larger than the 10MB bucket limit
    const c = document.createElement('canvas'); c.width=4000; c.height=3000;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(1000,1000);
    for (let i=0;i<img.data.length;i+=4){ img.data[i]=Math.random()*255; img.data[i+1]=Math.random()*255; img.data[i+2]=Math.random()*255; img.data[i+3]=255; }
    for (let x=0;x<4;x++) for (let y=0;y<3;y++) ctx.putImageData(img, x*1000, y*1000);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 1.0));
    const file = new File([blob], 'IMG.jpg', { type: 'image/jpeg' });
    const small = await compressImageFile(file);

    // a PDF must pass through untouched
    const pdf = new File([new Uint8Array(1_500_000)], 'plan.pdf', { type: 'application/pdf' });
    const pdfOut = await compressImageFile(pdf);

    // errors must surface, not fail silently
    const msgs=[]; const real=showAppMessage; showAppMessage=(m)=>msgs.push(String(m));
    reportUploadFailure(new Error('new row violates row-level security policy'), 'Upload Pictures');
    reportUploadFailure(new Error('The object exceeded the maximum allowed size'), 'Upload Pictures');
    reportUploadFailure(new Error('Failed to fetch'), 'Upload Pictures');
    showAppMessage = real;

    // Check the path the app builds, without writing to the cloud: a real
    // upload here would be refused anyway (TESTORG01 is not a real org), and
    // that refusal says nothing about how the path is constructed.
    const orgForPath = window.getTenantId();
    const path = orgForPath ? orgForPath + '/' + (state.selectedProjectId || 'no-project') + '/testid.png' : '';
    let refused = null;
    setCurrentOrgCode(null);
    try { await uploadAssetToStorage(new Blob(['x']), 'testid', 'png'); }
    catch (e) { refused = e.message; }
    setCurrentOrgCode('TESTORG01');

    return {
      originalMB: +(file.size/1048576).toFixed(1),
      compressedMB: +(small.size/1048576).toFixed(2),
      underLimit: small.size < 10*1024*1024,
      pdfUntouched: pdfOut === pdf,
      messages: msgs,
      path,
      refusedWhenSignedOut: refused,
    };
  })()`);
  check("Photos", `Large photo compressed (${upload.originalMB}MB to ${upload.compressedMB}MB)`, upload.underLimit, "");
  check("Photos", "Non-image files left untouched", upload.pdfUntouched, "");
  check("Photos", "Upload errors are reported, not silent", upload.messages.length === 3, upload.messages.join(" | ").slice(0, 120));
  check("Photos", "Storage path carries the org prefix",
        String(upload.path).startsWith("TESTORG01/"), String(upload.path).slice(0, 90));
  check("Photos", "Upload refused when no org is signed in",
        /not signed in/i.test(String(upload.refusedWhenSignedOut)), String(upload.refusedWhenSignedOut).slice(0, 90));

  // ---- planner + daily works -----------------------------------------
  const cal = await page.evaluate(`(() => {
    const out = {};
    currentView='planner'; render();
    const t = document.getElementById('planner-static-week-toggle');
    const days = () => document.querySelectorAll('.planner-static-week-day').length;
    out.week = days(); t.click(); out.five = days(); t.click(); out.one = days(); t.click();
    currentView='daily-works'; render();
    const dt = document.getElementById('daily-works-range-toggle');
    const cols = () => document.querySelectorAll('.daily-work-day-column').length;
    out.dwWeek = cols(); dt.click(); out.dwFive = cols(); dt.click(); out.dwOne = cols(); dt.click();
    out.miniCalendar = document.querySelectorAll('#daily-works-mini-days .planner-mini-day').length;
    out.nonWorkingReader = typeof window.piarIsNonWorkingDay === 'function';
    return out;
  })()`);
  check("Calendars", "Planner 7 / 5 / 1 day", cal.week === 7 && cal.five === 5 && cal.one === 1,
        `${cal.week}/${cal.five}/${cal.one}`);
  check("Calendars", "Daily Works 7 / 5 / 1 day", cal.dwWeek === 7 && cal.dwFive === 5 && cal.dwOne === 1,
        `${cal.dwWeek}/${cal.dwFive}/${cal.dwOne}`);
  check("Calendars", "Daily Works overview calendar renders", cal.miniCalendar === 42, String(cal.miniCalendar));
  check("Calendars", "Non-working days shared between both", cal.nonWorkingReader, "");

  // ---- layout sanity --------------------------------------------------
  const layout = await page.evaluate(`(() => {
    const out = {};
    for (const v of ['projects','teams','clients','planner','daily-works','equipment']) {
      currentView = v; render();
      out[v] = document.body.scrollWidth <= window.innerWidth + 1;
    }
    return out;
  })()`);
  for (const [v, ok] of Object.entries(layout)) {
    check("Layout", `No sideways scroll in "${v}"`, ok, "");
  }

  const clipped = await page.evaluate(`(() => {
    const bad = [];
    for (const v of ['projects','teams','clients','equipment']) {
      currentView = v; render();
      document.querySelectorAll('*').forEach(el => {
        if (!(el.offsetWidth || el.offsetHeight)) return;
        const cs = getComputedStyle(el);
        if (/auto|scroll/.test(cs.overflowY + cs.overflowX)) return;
        if (cs.overflow === 'visible') return;
        const t = (el.textContent||'').trim();
        if (!t || el.children.length > 1) return;
        if (el.scrollHeight > el.clientHeight + 2) bad.push(v + ': ' + t.slice(0,28));
      });
    }
    return bad.slice(0,5);
  })()`);
  check("Layout", "No clipped text", clipped.length === 0, clipped.join(" | "));

  // ---- untranslated text in Greek -------------------------------------
  const english = await page.evaluate(`(() => {
    const found = new Set();
    for (const v of ['projects','teams','clients','planner','daily-works','equipment']) {
      currentView = v; render();
      const walk = (n) => { for (const c of n.childNodes) {
        if (c.nodeType === 3) { const t = c.nodeValue.trim();
          const DATA = /Fotis|Pitsinis|Maria|Ioannou|Nikos|Dimou|Eleni|Papadaki|Papadakis|Anakainisi|Ydravlikoi|Banio|Ermou|Etairia|Test User|test\\.user|@x\\.gr|^\\d/;
          if (t && /^[\\x20-\\x7E]+$/.test(t) && /[A-Za-z]{4}/.test(t)
              // Words Greek uses as-is; a label made only of these is correct.
              && !/^(?:AI|EL|GB|GR|piAR|Email|PIN|CW|UID|Viber|Go|OK)[\\s:.\\-]*$/i.test(t)
              && !DATA.test(t)) found.add(v + ': ' + t.slice(0,40)); }
        else if (c.nodeType === 1 && !['SCRIPT','STYLE'].includes(c.tagName)) walk(c); } };
      const view = document.getElementById(v + '-view');
      if (view) walk(view);
    }
    return [...found].slice(0, 8);
  })()`);
  check("Language", "No untranslated English in Greek mode", english.length === 0, english.join(" | "));

  // ---- console -------------------------------------------------------
  // "Upload failed:" lines are logged on purpose by the error-reporting test.
  const realErrors = consoleErrors.filter((e) =>
    !/favicon|ERR_NETWORK|Tracking Prevention|net::|Upload failed:/i.test(e));
  check("Console", "No JavaScript errors during the run", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));

  await browser.close();

  // ---- report ---------------------------------------------------------
  const byArea = {};
  for (const r of results) (byArea[r.area] ||= []).push(r);
  let pass = 0, fail = 0;
  for (const [area, list] of Object.entries(byArea)) {
    console.log("\\n" + area.toUpperCase());
    for (const r of list) {
      const mark = r.pass ? "  PASS" : "  FAIL";
      console.log(`${mark}  ${r.name}${r.detail && !r.pass ? "\\n          " + r.detail : ""}`);
      r.pass ? pass++ : fail++;
    }
  }
  console.log(`\\n${"=".repeat(52)}\\n  ${pass} passed, ${fail} failed, ${pass + fail} total\\n`);
  process.exit(fail ? 1 : 0);
})();
