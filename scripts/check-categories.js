// Equipment categories: create, filter, delete via the x, and the language
// holding through all of it. Browser-local state only; the cloud is untouched.
const { chromium } = require("playwright-core");
const BASE = "http://localhost:5173";

const results = [];
const ok = (n, c, d) => results.push({ n, c, d: d || "" });

const SEED = `
  document.getElementById('login-modal')?.close();
  isLoggedIn = true; currentRole = 'admin'; currentUsername = 'fotis';
  setCurrentOrgCode('TESTORG01');
  state.users = [createSystemUser({ name:'Fotis', surname:'P', role:'admin', username:'fotis' })];
  state.currentUserId = state.users[0].id;
  // Not testing the PIN gate here; a fresh user defaults to needing a change,
  // and its blocking dialog would swallow the delete confirmation.
  for (const u of state.users) u.mustChangePin = false;
  currentView = 'equipment'; render();
  document.querySelector('main')?.style.removeProperty('display');
`;

const names = `Array.from(document.querySelectorAll('#equipment-category-list strong')).map(s => s.textContent)`;

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE + "/?lang=el", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.evaluate(SEED);
  await page.waitForTimeout(300);

  // ---- language survives filtering -----------------------------------------
  const lang = await page.evaluate(`(() => {
    const before = ${names};
    const cards = () => document.querySelectorAll('#equipment-category-list .equipment-category-card');
    cards()[1].click();
    const afterOne = ${names};
    cards()[2].click();
    const afterTwo = ${names};
    cards()[0].click();   // back to "all"
    const afterAll = ${names};
    return { before, afterOne, afterTwo, afterAll };
  })()`);
  const greek = (arr) => arr.every((n) => /[Α-Ωα-ωΆ-Ώά-ώ]/.test(n));
  ok("Category names start in Greek", greek(lang.before), lang.before.join(", "));
  ok("Clicking a category keeps them Greek", greek(lang.afterOne), lang.afterOne.join(", "));
  ok("Clicking a second one keeps them Greek", greek(lang.afterTwo), lang.afterTwo.join(", "));
  ok("Clearing the filter keeps them Greek", greek(lang.afterAll), lang.afterAll.join(", "));

  // ---- creating a category through the real form ---------------------------
  const created = await page.evaluate(`(() => {
    const toggle = document.getElementById('toggle-equipment-category-form-btn');
    const reachable = !!toggle && toggle.offsetParent !== null;
    toggle.click();
    const input = document.getElementById('equipment-category-name');
    const formShown = !!input && input.offsetParent !== null;
    input.value = 'Δοκιμαστική';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const before = state.equipmentCategories.length;
    document.getElementById('equipment-category-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return {
      reachable, formShown,
      added: state.equipmentCategories.length === before + 1,
      exists: state.equipmentCategories.some(c => c.name === 'Δοκιμαστική'),
      onScreen: ${names}.includes('Δοκιμαστική')
    };
  })()`);
  ok("The new-category button is reachable", created.reachable, "");
  ok("It opens the category form", created.formShown, "");
  ok("Submitting creates the category", created.added && created.exists, JSON.stringify(created));
  ok("The new category shows in the list", created.onScreen, "");

  // ---- an item in that category, then delete the category ------------------
  const setup = await page.evaluate(`(() => {
    const cat = state.equipmentCategories.find(c => c.name === 'Δοκιμαστική');
    state.equipmentItems.push(createEquipmentItem({
      name: 'ΤΕΣΤ-ΕΡΓΑΛΕΙΟ', categoryId: cat.id, reference: 'R1'
    }));
    renderEquipment();
    return { itemCount: state.equipmentItems.length, categoryId: cat.id,
             itemCategory: state.equipmentItems[0].categoryId };
  })()`);
  ok("An item sits in the new category", setup.itemCategory === setup.categoryId, JSON.stringify(setup));

  const hasX = await page.evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('#equipment-category-list .equipment-category-card'));
    const target = cards.find(c => c.querySelector('strong')?.textContent === 'Δοκιμαστική');
    const x = target?.querySelector('.equipment-category-delete');
    if (!x) return { found: false };
    const r = x.getBoundingClientRect();
    const cardRect = target.getBoundingClientRect();
    return {
      found: true, label: x.getAttribute('aria-label'),
      visible: r.width > 0 && r.height > 0,
      tapTarget: Math.round(r.width) + 'x' + Math.round(r.height),
      inCorner: r.top - cardRect.top < 16 && cardRect.right - r.right < 16,
      // The Edit menu lives in the same corner; they must not sit on top of
      // each other or one of them is unclickable.
      overlapsCardMenu: (() => {
        const m = target.querySelector('.card-menu');
        if (!m) return false;
        const mr = m.getBoundingClientRect();
        return !(mr.right <= r.left || r.right <= mr.left || mr.bottom <= r.top || r.bottom <= mr.top);
      })()
    };
  })()`);
  ok("Every category has an x to delete it", hasX.found && hasX.visible, JSON.stringify(hasX));
  ok("The x sits in the corner", hasX.inCorner === true, JSON.stringify(hasX));
  ok("The x is a real tap target", hasX.tapTarget === "26x26", hasX.tapTarget || "");
  ok("The x is labelled in Greek", /Διαγραφή/.test(hasX.label || ""), hasX.label || "");
  ok("The x does not sit on top of the Edit menu", hasX.overlapsCardMenu === false,
     JSON.stringify(hasX));

  // Clicking the x must not also toggle the filter underneath it.
  const filterUntouched = await page.evaluate(`(() => {
    const before = selectedEquipmentCategoryFilterIds.size;
    const cards = Array.from(document.querySelectorAll('#equipment-category-list .equipment-category-card'));
    const target = cards.find(c => c.querySelector('strong')?.textContent === 'Δοκιμαστική');
    target.querySelector('.equipment-category-delete').click();
    return { before, after: selectedEquipmentCategoryFilterIds.size };
  })()`);
  ok("Clicking the x does not also filter by that category",
     filterUntouched.before === filterUntouched.after, JSON.stringify(filterUntouched));

  // Confirm the deletion in the app's own dialog.
  await page.waitForTimeout(300);
  const confirmed = await page.evaluate(`(() => {
    const dialog = document.querySelector('dialog[open]');
    if (!dialog) return { dialogShown: false };
    const text = dialog.innerText;
    const yes = Array.from(dialog.querySelectorAll('button'))
      .find(b => /ναι|yes/i.test(b.textContent.trim()));
    if (yes) yes.click();
    return { dialogShown: true, text: text.slice(0, 160), clicked: !!yes };
  })()`);
  ok("Deleting asks for confirmation first", confirmed.dialogShown && confirmed.clicked,
     confirmed.text || "no dialog");

  await page.waitForTimeout(400);
  const afterDelete = await page.evaluate(`(() => {
    const item = state.equipmentItems.find(i => i.name === 'ΤΕΣΤ-ΕΡΓΑΛΕΙΟ');
    return {
      categoryGone: !state.equipmentCategories.some(c => c.name === 'Δοκιμαστική'),
      itemKept: !!item,
      itemCategory: item ? item.categoryId : null,
      names: ${names}
    };
  })()`);
  ok("The category is gone after confirming", afterDelete.categoryGone, "");
  ok("Its equipment is NOT deleted with it", afterDelete.itemKept, "");
  ok("That equipment moves to no category", afterDelete.itemCategory === "",
     "categoryId=" + JSON.stringify(afterDelete.itemCategory));
  ok("The list is still Greek after deleting", greek(afterDelete.names), afterDelete.names.join(", "));

  // ---- no English left anywhere in the view --------------------------------
  const english = await page.evaluate(`(() => {
    const found = new Set();
    const walk = (n) => { for (const c of n.childNodes) {
      if (c.nodeType === 3) { const t = c.nodeValue.trim();
        if (t && /[A-Za-z]{4}/.test(t) && !/[\\u0370-\\u03FF]/.test(t)
            && !/^(?:AI|EL|PIN|UID|Email|PPE)[\\s:.\\-]*$/i.test(t)
            && !/^(?:R1|TEST)/.test(t)) found.add(t.slice(0, 40)); }
      else if (c.nodeType === 1 && !['SCRIPT','STYLE'].includes(c.tagName)) walk(c); } };
    walk(document.getElementById('equipment-view'));
    return [...found];
  })()`);
  ok("No untranslated English left in the equipment view", english.length === 0, english.join(" | "));

  ok("No JavaScript errors during the run", errors.length === 0, errors.slice(0, 3).join(" | "));

  let pass = 0, fail = 0;
  console.log("\nEQUIPMENT CATEGORIES");
  for (const r of results) {
    if (r.c) { pass++; console.log("  PASS  " + r.n + (r.d ? "  (" + r.d + ")" : "")); }
    else { fail++; console.log("  FAIL  " + r.n + (r.d ? "\n          " + r.d : "")); }
  }
  console.log("\n====================================================");
  console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total\n`);

  await browser.close();
  process.exit(fail ? 1 : 0);
})();
