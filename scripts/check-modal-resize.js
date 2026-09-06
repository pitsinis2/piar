// The Organization Details window can be dragged bigger from its corner, and
// remembers the size. Driven with a real mouse drag, since CSS resize only
// responds to trusted input.
const { chromium } = require("playwright-core");
const BASE = "http://localhost:5173/admin/index.html";

const results = [];
const ok = (n, c, d) => results.push({ n, c, d: d || "" });

const box = `(() => {
  const b = document.getElementById('editOrgBox');
  const r = b.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height),
           right: Math.round(r.right), bottom: Math.round(r.bottom) };
})()`;

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const open = `document.getElementById('editOrgModal').removeAttribute('hidden'); restoreModalSize('editOrgBox');`;
  await page.evaluate(open);
  await page.waitForTimeout(300);

  const style = await page.evaluate(`(() => {
    const cs = getComputedStyle(document.getElementById('editOrgBox'));
    return { resize: cs.resize, overflow: cs.overflow, minWidth: cs.minWidth, maxWidth: cs.maxWidth };
  })()`);
  ok("The window is resizable", style.resize === "both", "resize: " + style.resize);
  ok("It can scroll its own content", style.overflow === "auto", "overflow: " + style.overflow);
  ok("It cannot be dragged uselessly small", style.minWidth === "340px", style.minWidth);
  ok("It cannot be dragged off the screen",
     parseInt(style.maxWidth) <= 1400, style.maxWidth);

  const before = await page.evaluate(box);

  // Drag the bottom-right grip out.
  await page.mouse.move(before.right - 4, before.bottom - 4);
  await page.mouse.down();
  await page.mouse.move(before.right + 240, before.bottom + 120, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  const after = await page.evaluate(box);
  ok("Dragging the corner makes it wider",
     after.w > before.w + 100, `${before.w} -> ${after.w}`);
  ok("Dragging the corner makes it taller",
     after.h > before.h + 50, `${before.h} -> ${after.h}`);

  // Drag it back in: it must shrink too, not only grow.
  await page.mouse.move(after.right - 4, after.bottom - 4);
  await page.mouse.down();
  await page.mouse.move(after.right - 200, after.bottom - 100, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const shrunk = await page.evaluate(box);
  ok("It can be dragged smaller again", shrunk.w < after.w, `${after.w} -> ${shrunk.w}`);

  // Close, reopen: the size should come back.
  await page.evaluate(`closeEditOrg()`);
  await page.waitForTimeout(200);
  await page.evaluate(open);
  await page.waitForTimeout(400);
  const reopened = await page.evaluate(box);
  ok("The size is remembered when it is reopened",
     Math.abs(reopened.w - shrunk.w) <= 8 && Math.abs(reopened.h - shrunk.h) <= 8,
     `${shrunk.w}x${shrunk.h} -> ${reopened.w}x${reopened.h}`);

  // And after a full reload, since that is the point of remembering it.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.evaluate(open);
  await page.waitForTimeout(400);
  const afterReload = await page.evaluate(box);
  ok("The size survives a page reload",
     Math.abs(afterReload.w - shrunk.w) <= 8,
     `${shrunk.w} -> ${afterReload.w}`);

  // A remembered size larger than the screen must not push it off-screen.
  await page.evaluate(`localStorage.setItem('piar.admin.modalSize.editOrgBox', JSON.stringify({ w: 5000, h: 5000 }))`);
  await page.evaluate(`closeEditOrg()`);
  await page.evaluate(open);
  await page.waitForTimeout(300);
  const clamped = await page.evaluate(box);
  ok("A stored size bigger than the screen is clamped",
     clamped.w <= 1400 && clamped.h <= 950, `${clamped.w}x${clamped.h} in 1400x950`);

  // Phone: dragging is pointless there, so it should fill instead.
  await page.setViewportSize({ width: 390, height: 840 });
  await page.waitForTimeout(300);
  const onPhone = await page.evaluate(`(() => {
    const cs = getComputedStyle(document.getElementById('editOrgBox'));
    const r = document.getElementById('editOrgBox').getBoundingClientRect();
    return { resize: cs.resize, w: Math.round(r.width), viewport: window.innerWidth };
  })()`);
  ok("On a phone it is not resizable", onPhone.resize === "none", onPhone.resize);
  ok("On a phone it fits the screen", onPhone.w <= onPhone.viewport,
     `${onPhone.w} in ${onPhone.viewport}`);

  ok("No JavaScript errors during the run", errors.length === 0, errors.slice(0, 3).join(" | "));

  let pass = 0, fail = 0;
  console.log("\nRESIZABLE ORG WINDOW");
  for (const r of results) {
    if (r.c) { pass++; console.log("  PASS  " + r.n + (r.d ? "  (" + r.d + ")" : "")); }
    else { fail++; console.log("  FAIL  " + r.n + (r.d ? "\n          " + r.d : "")); }
  }
  console.log("\n====================================================");
  console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total\n`);

  await browser.close();
  process.exit(fail ? 1 : 0);
})();
