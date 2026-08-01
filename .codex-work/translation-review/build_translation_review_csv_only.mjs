import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(process.cwd(), "..", "..");
const sourceCsv = path.join(projectRoot, "i18n", "translations.csv");
const outputDir = path.join(projectRoot, "outputs", "translation-review");
const outputCsv = path.join(outputDir, "ProjectManagerWeb_EL_translation_review.csv");

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

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function cleanText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

const greek = new Map(Object.entries({
  "Projects": "Έργα",
  "Planner": "Προγραμματισμός",
  "Daily Works": "Ημερήσιες εργασίες",
  "Team Members": "Μέλη ομάδας",
  "Equipment": "Εξοπλισμός",
  "Clients": "Πελάτες",
  "AI Assistant": "Βοηθός AI",
  "Settings": "Ρυθμίσεις",
  "Audit Log": "Ιστορικό ελέγχου",
  "Project Setup": "Ρύθμιση έργου",
  "Project name": "Όνομα έργου",
  "Project manager": "Υπεύθυνος έργου",
  "Client": "Πελάτης",
  "Project address is different from client": "Η διεύθυνση του έργου είναι διαφορετική από του πελάτη",
  "Project telephone is different from client": "Το τηλέφωνο του έργου είναι διαφορετικό από του πελάτη",
  "Project address": "Διεύθυνση έργου",
  "Project telephone": "Τηλέφωνο έργου",
  "Inherited from selected client": "Συμπληρώνεται από τον επιλεγμένο πελάτη",
  "Project site address": "Διεύθυνση εργοταξίου",
  "Project site telephone": "Τηλέφωνο εργοταξίου",
  "Save project": "Αποθήκευση έργου",
  "Start date": "Ημερομηνία έναρξης",
  "End date": "Ημερομηνία λήξης",
  "Workspace color": "Χρώμα χώρου εργασίας",
  "Workspace preview": "Προεπισκόπηση χώρου εργασίας",
  "Project status": "Κατάσταση έργου",
  "Search project": "Αναζήτηση έργου",
  "Active Projects": "Ενεργά έργα",
  "Completed Projects": "Ολοκληρωμένα έργα",
  "Archived Projects": "Αρχειοθετημένα έργα",
  "My Projects": "Τα έργα μου",
  "No active projects yet.": "Δεν υπάρχουν ακόμα ενεργά έργα.",
  "No completed projects yet.": "Δεν υπάρχουν ακόμα ολοκληρωμένα έργα.",
  "No archived projects yet.": "Δεν υπάρχουν ακόμα αρχειοθετημένα έργα.",
  "Create your first project": "Δημιουργία πρώτου έργου",
  "No project yet": "Δεν υπάρχει ακόμα έργο",
  "No project manager assigned": "Δεν έχει οριστεί υπεύθυνος έργου",
  "No client assigned": "Δεν έχει οριστεί πελάτης",
  "No address added": "Δεν έχει προστεθεί διεύθυνση",
  "No telephone added": "Δεν έχει προστεθεί τηλέφωνο",
  "Address": "Διεύθυνση",
  "Tel": "Τηλέφωνο",
  "Email": "Email",
  "Go": "Πλοήγηση",
  "Call": "Κλήση",
  "Deadline": "Προθεσμία",
  "Status": "Κατάσταση",
  "Start": "Έναρξη",
  "Manager": "Υπεύθυνος",
  "Project": "Έργο",
  "Area": "Περιοχή",
  "Areas": "Περιοχές",
  "Floor": "Όροφος",
  "Name": "Όνομα",
  "Icon": "Εικονίδιο",
  "Create areas": "Δημιουργία περιοχών",
  "Add row": "Προσθήκη γραμμής",
  "No icon": "Χωρίς εικονίδιο",
  "Bathroom": "Μπάνιο",
  "Kitchen": "Κουζίνα",
  "Plans": "Σχέδια",
  "Files": "Αρχεία",
  "Photos": "Φωτογραφίες",
  "Notes": "Σημειώσεις",
  "Tasks": "Εργασίες",
  "Chat": "Συνομιλία",
  "Voice": "Φωνή",
  "Filter": "Φίλτρο",
  "Show archived elements": "Εμφάνιση αρχειοθετημένων στοιχείων",
  "Show Archived": "Εμφάνιση αρχειοθετημένων",
  "Add": "Προσθήκη",
  "Save": "Αποθήκευση",
  "Cancel": "Ακύρωση",
  "Delete": "Διαγραφή",
  "Edit": "Επεξεργασία",
  "Archive": "Αρχειοθέτηση",
  "Restore": "Επαναφορά",
  "Close": "Κλείσιμο",
  "Search": "Αναζήτηση",
  "Expand": "Άνοιγμα",
  "Clear": "Καθαρισμός",
  "New": "Νέο",
  "Save changes": "Αποθήκευση αλλαγών",
  "Create": "Δημιουργία",
  "Message": "Μήνυμα",
  "Ask about this project...": "Ρωτήστε για αυτό το έργο...",
  "Voice settings": "Ρυθμίσεις φωνής",
  "Language": "Γλώσσα",
  "English": "Αγγλικά",
  "Greek": "Ελληνικά",
  "German": "Γερμανικά",
  "Italian": "Ιταλικά",
  "Wait before answer (seconds)": "Αναμονή πριν την απάντηση (δευτερόλεπτα)",
  "Play": "Αναπαραγωγή",
  "Pause": "Παύση",
  "Stop": "Διακοπή",
  "Send": "Αποστολή",
  "Like": "Μου αρέσει",
  "Dislike": "Δεν μου αρέσει",
  "Copy": "Αντιγραφή",
  "Export": "Εξαγωγή",
  "Today": "Σήμερα",
  "Week": "Εβδομάδα",
  "Day": "Ημέρα",
  "Month": "Μήνας",
  "User": "Χρήστης",
  "Date": "Ημερομηνία",
  "Action": "Ενέργεια",
  "Object": "Αντικείμενο"
}));

const terms = new Map(Object.entries({
  project: "έργο",
  projects: "έργα",
  client: "πελάτης",
  clients: "πελάτες",
  manager: "υπεύθυνος",
  address: "διεύθυνση",
  telephone: "τηλέφωνο",
  phone: "τηλέφωνο",
  area: "περιοχή",
  areas: "περιοχές",
  floor: "όροφος",
  team: "ομάδα",
  teams: "ομάδες",
  member: "μέλος",
  members: "μέλη",
  equipment: "εξοπλισμός",
  note: "σημείωση",
  notes: "σημειώσεις",
  file: "αρχείο",
  files: "αρχεία",
  photo: "φωτογραφία",
  photos: "φωτογραφίες",
  task: "εργασία",
  tasks: "εργασίες",
  settings: "ρυθμίσεις",
  category: "κατηγορία"
}));

function translateTerm(text) {
  return terms.get(String(text || "").trim().toLowerCase()) || text;
}

function suggest(text) {
  const value = cleanText(text);
  if (!value) return "";
  if (/[Α-Ωα-ω]/.test(value)) return value;
  if (greek.has(value)) return greek.get(value);
  let match = value.match(/^\+ (.+)$/);
  if (match) return `+ ${suggest(match[1]) || translateTerm(match[1])}`;
  match = value.match(/^Add (.+)$/i);
  if (match) return `Προσθήκη ${translateTerm(match[1])}`;
  match = value.match(/^New (.+)$/i);
  if (match) return `Νέο ${translateTerm(match[1])}`;
  match = value.match(/^Edit (.+)$/i);
  if (match) return `Επεξεργασία ${translateTerm(match[1])}`;
  match = value.match(/^Delete (.+)$/i);
  if (match) return `Διαγραφή ${translateTerm(match[1])}`;
  match = value.match(/^Save (.+)$/i);
  if (match) return `Αποθήκευση ${translateTerm(match[1])}`;
  match = value.match(/^Search (.+)$/i);
  if (match) return `Αναζήτηση ${translateTerm(match[1])}`;
  match = value.match(/^No (.+) yet\.?$/i);
  if (match) return `Δεν υπάρχουν ακόμα ${translateTerm(match[1])}.`;
  match = value.match(/^You do not have permission to (.+)\.?$/i);
  if (match) return `Δεν έχετε δικαίωμα να ${match[1]}.`;
  match = value.match(/^You do not have access to (.+)\.?$/i);
  if (match) return `Δεν έχετε πρόσβαση για να ${match[1]}.`;
  return "";
}

function guessSection(text) {
  const value = String(text || "").toLowerCase();
  if (/ai|assistant|speech|voice|microphone|draft|conversation|transcript/.test(value)) return "AI Assistant";
  if (/daily work|assigned person|map|google maps/.test(value)) return "Daily Works";
  if (/planner|assignment|week|team is already planned/.test(value)) return "Planner";
  if (/client|company|uid|responsible/.test(value)) return "Clients";
  if (/equipment|category|serial|condition/.test(value)) return "Equipment";
  if (/member|permission|role|admin|manager|user type/.test(value)) return "Team Members";
  if (/setting|theme|drive|sync|font|language/.test(value)) return "Settings";
  if (/audit|log|deleted|created|updated|restored|archived/.test(value)) return "Audit Log";
  if (/project|area|floor|note|file|photo|task|plan/.test(value)) return "Projects";
  return "General";
}

await fs.mkdir(outputDir, { recursive: true });
const parsed = parseCsv(await fs.readFile(sourceCsv, "utf8"));
const header = parsed.shift().map((value) => value.toLowerCase());
const keyIndex = header.indexOf("key");
const enIndex = header.indexOf("en");

const manualStructure = [
  ["rail.projects", "Main rail", "Projects"],
  ["rail.planner", "Main rail", "Planner"],
  ["rail.daily_works", "Main rail", "Daily Works"],
  ["rail.team_members", "Main rail", "Team Members"],
  ["rail.equipment", "Main rail", "Equipment"],
  ["rail.clients", "Main rail", "Clients"],
  ["rail.ai_assistant", "Main rail", "AI Assistant"],
  ["rail.settings", "Main rail", "Settings"],
  ["rail.audit_log", "Main rail", "Audit Log"],
  ["workspace.info", "Project workspace", "Info"],
  ["workspace.plans", "Project workspace", "Plans"],
  ["workspace.files", "Project workspace", "Files"],
  ["workspace.tasks", "Project workspace", "Tasks"],
  ["workspace.pics", "Project workspace", "Pics"],
  ["workspace.chat", "Project workspace", "Chat"]
];

const seen = new Set();
const output = [[
  "ID",
  "Section",
  "Key",
  "English",
  "Greek proposal",
  "Your correction",
  "Status",
  "Notes"
]];

let id = 1;
function addRow(key, section, english, notes = "") {
  const clean = cleanText(english);
  if (!clean || !/[A-Za-z]/.test(clean)) return;
  const signature = `${key}::${clean}`;
  if (seen.has(signature)) return;
  seen.add(signature);
  const proposal = suggest(clean);
  output.push([
    id,
    section || guessSection(clean),
    key,
    clean,
    proposal,
    "",
    proposal ? "Proposal" : "Needs Greek",
    notes || (proposal ? "" : "Please add/check Greek wording")
  ]);
  id += 1;
}

for (const [key, section, english] of manualStructure) {
  addRow(key, section, english, "Basic structure / rail");
}

for (const row of parsed) {
  addRow(row[keyIndex], guessSection(row[enIndex]), row[enIndex]);
}

await fs.writeFile(outputCsv, output.map((row) => row.map(csvEscape).join(",")).join("\r\n"), "utf8");
console.log(JSON.stringify({
  outputCsv,
  rows: output.length - 1,
  proposals: output.filter((row, index) => index && row[6] === "Proposal").length,
  needsGreek: output.filter((row, index) => index && row[6] === "Needs Greek").length
}, null, 2));
