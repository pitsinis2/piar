import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(process.cwd(), "..", "..");
const inputCsv = path.join(projectRoot, "outputs", "translation-review", "ProjectManagerWeb_EL_translation_review.csv");
const outputCsv = path.join(projectRoot, "outputs", "translation-review", "ProjectManagerWeb_EL_translation_review_EXCEL.csv");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((value) => String(value || "").trim()));
}

function excelEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

const rows = parseCsv(await fs.readFile(inputCsv, "utf8"));
const content = rows.map((row) => row.map(excelEscape).join(";")).join("\r\n");
await fs.writeFile(outputCsv, `\uFEFF${content}`, "utf8");

console.log(JSON.stringify({
  outputCsv,
  rows: rows.length - 1,
  separator: "semicolon",
  encoding: "UTF-8 BOM",
}, null, 2));
