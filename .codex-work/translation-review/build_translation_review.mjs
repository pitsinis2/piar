import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const projectRoot = path.resolve(process.cwd(), "..", "..");
const sourceCsv = path.join(projectRoot, "i18n", "translations.csv");
const htmlFile = path.join(projectRoot, "saas-app", "index.html");
const jsFile = path.join(projectRoot, "saas-app", "appback.js");
const outputDir = path.join(projectRoot, "outputs", "translation-review");
const csvOut = path.join(outputDir, "ProjectManagerWeb_EL_translation_review.csv");
const xlsxOut = path.join(outputDir, "ProjectManagerWeb_EL_translation_review.xlsx");
const previewOut = path.join(outputDir, "ProjectManagerWeb_EL_translation_preview.png");

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
  const clean = String(value ?? "");
  return `"${clean.replace(/"/g, '""')}"`;
}

function toKey(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 70) || "text";
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

function looksTranslatable(text) {
  const value = cleanText(text);
  if (!value) return false;
  if (value.length > 260) return false;
  if (!/[A-Za-z]/.test(value)) return false;
  if (/^(#[\w-]+|\.[\w-]+|[a-z-]+:[\w-]+)$/.test(value)) return false;
  if (/^(click|change|input|submit|keydown|keyup|error|warning|success|info)$/i.test(value)) return false;
  if (/^(div|button|section|template|span|input|label|select|option)$/i.test(value)) return false;
  if (/^[a-z]+(?:[A-Z][a-z0-9]+)+$/.test(value)) return false;
  if (/[{};=<>]{2,}/.test(value)) return false;
  if (/https?:\/\//i.test(value)) return false;
  return true;
}

function uniquePush(map, entry) {
  const english = cleanText(entry.english);
  if (!looksTranslatable(english)) return;
  const key = entry.key || toKey(english);
  const id = `${key}::${english}`;
  if (map.has(id)) return;
  map.set(id, {
    key,
    section: entry.section || guessSection(english),
    source: entry.source || "Extracted",
    english,
  });
}

const exactGreek = new Map(Object.entries({
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
  "Bedroom": "Υπνοδωμάτιο",
  "Living room": "Σαλόνι",
  "Office": "Γραφείο",
  "Laundry": "Πλυσταριό",
  "Storage": "Αποθήκη",
  "Garage": "Γκαράζ",
  "Roof": "Στέγη",
  "Electrical": "Ηλεκτρολογικά",
  "Plumbing": "Υδραυλικά",
  "Heating / HVAC": "Θέρμανση / Κλιματισμός",
  "Painting": "Βαψίματα",
  "Flooring": "Δάπεδα",
  "Exterior": "Εξωτερικοί χώροι",
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
  "Collapse": "Σύμπτυξη",
  "Clear": "Καθαρισμός",
  "New": "Νέο",
  "Save changes": "Αποθήκευση αλλαγών",
  "Create": "Δημιουργία",
  "Create draft from text": "Δημιουργία πρόχειρου από κείμενο",
  "Read draft aloud": "Ανάγνωση πρόχειρου",
  "Save conversation": "Αποθήκευση συνομιλίας",
  "New chat": "Νέα συνομιλία",
  "Make resume": "Δημιουργία περίληψης",
  "Leave": "Έξοδος",
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
  "Send voice now": "Αποστολή φωνής τώρα",
  "Wait": "Αναμονή",
  "Like": "Μου αρέσει",
  "Dislike": "Δεν μου αρέσει",
  "Copy": "Αντιγραφή",
  "Export": "Εξαγωγή",
  "AI Assistant - minimized": "Βοηθός AI - ελαχιστοποιημένος",
  "AI Assistant Settings": "Ρυθμίσεις βοηθού AI",
  "Speech recognition is not available in this browser.": "Η αναγνώριση ομιλίας δεν είναι διαθέσιμη σε αυτό το πρόγραμμα περιήγησης.",
  "Microphone could not start. Please check browser permission.": "Το μικρόφωνο δεν μπόρεσε να ξεκινήσει. Ελέγξτε την άδεια του browser.",
  "There is no AI answer to read yet.": "Δεν υπάρχει ακόμα απάντηση AI για ανάγνωση.",
  "AI answer copied.": "Η απάντηση AI αντιγράφηκε.",
  "Could not copy this answer.": "Δεν ήταν δυνατή η αντιγραφή αυτής της απάντησης.",
  "Feedback saved: useful answer.": "Η αξιολόγηση αποθηκεύτηκε: χρήσιμη απάντηση.",
  "Feedback saved: answer needs improvement.": "Η αξιολόγηση αποθηκεύτηκε: η απάντηση χρειάζεται βελτίωση.",
  "AI conversation saved to project notes.": "Η συνομιλία AI αποθηκεύτηκε στις σημειώσεις του έργου.",
  "AI conversation saved in Drafts of conversation with AI.": "Η συνομιλία AI αποθηκεύτηκε στα πρόχειρα συνομιλιών με AI.",
  "Start a conversation first.": "Ξεκινήστε πρώτα μια συνομιλία.",
  "There is no conversation to save yet.": "Δεν υπάρχει ακόμα συνομιλία για αποθήκευση.",
  "Team Members": "Μέλη ομάδας",
  "Permissions": "Δικαιώματα",
  "Member Details": "Λεπτομέρειες μέλους",
  "Add member": "Προσθήκη μέλους",
  "New member": "Νέο μέλος",
  "First name": "Όνομα",
  "Last name": "Επώνυμο",
  "Role": "Ρόλος",
  "User type": "Τύπος χρήστη",
  "Phone": "Τηλέφωνο",
  "Position": "Θέση",
  "Experience": "Εμπειρία",
  "Equipment List": "Λίστα εξοπλισμού",
  "Equipment Details": "Λεπτομέρειες εξοπλισμού",
  "New Equipment": "Νέος εξοπλισμός",
  "Category": "Κατηγορία",
  "Serial number": "Σειριακός αριθμός",
  "Purchase date": "Ημερομηνία αγοράς",
  "Condition": "Κατάσταση",
  "Clients": "Πελάτες",
  "Client Details": "Λεπτομέρειες πελάτη",
  "Add client": "Προσθήκη πελάτη",
  "New client": "Νέος πελάτης",
  "Company": "Εταιρεία",
  "UID Number": "Αριθμός UID",
  "Responsible persons": "Υπεύθυνα πρόσωπα",
  "Theme": "Θέμα",
  "Drive Sync": "Συγχρονισμός Drive",
  "Notifications": "Ειδοποιήσεις",
  "No notifications.": "Δεν υπάρχουν ειδοποιήσεις.",
  "Audit Log": "Ιστορικό ελέγχου",
  "Action": "Ενέργεια",
  "Object": "Αντικείμενο",
  "User": "Χρήστης",
  "Date": "Ημερομηνία",
  "Today": "Σήμερα",
  "Week": "Εβδομάδα",
  "Day": "Ημέρα",
  "Month": "Μήνας",
  "Assign selected team": "Ανάθεση επιλεγμένης ομάδας",
  "New assignment": "Νέα ανάθεση",
  "Daily Works can have one or two assigned persons.": "Οι ημερήσιες εργασίες μπορούν να έχουν ένα ή δύο ανατεθειμένα άτομα.",
  "Please add a title and select one or two persons.": "Προσθέστε τίτλο και επιλέξτε ένα ή δύο άτομα.",
  "End time must be after start time.": "Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.",
  "Please choose a team, a project, and a date.": "Επιλέξτε ομάδα, έργο και ημερομηνία.",
  "End time must be later than start time.": "Η ώρα λήξης πρέπει να είναι αργότερα από την ώρα έναρξης.",
  "The selected project is not open on this date.": "Το επιλεγμένο έργο δεν είναι ανοιχτό σε αυτή την ημερομηνία.",
  "This team is already planned in another project during that time.": "Αυτή η ομάδα είναι ήδη προγραμματισμένη σε άλλο έργο εκείνη την ώρα.",
  "Add an address or Google Maps link first.": "Προσθέστε πρώτα διεύθυνση ή σύνδεσμο Google Maps.",
  "Project name, project manager, and client are required.": "Απαιτούνται όνομα έργου, υπεύθυνος έργου και πελάτης.",
  "Only admins or assigned managers can edit project setup.": "Μόνο οι διαχειριστές ή οι υπεύθυνοι έργου μπορούν να επεξεργαστούν τη ρύθμιση έργου.",
  "Only admins or assigned managers can change the project client.": "Μόνο οι διαχειριστές ή οι υπεύθυνοι έργου μπορούν να αλλάξουν τον πελάτη του έργου.",
  "Only admins or managers can create or edit clients.": "Μόνο οι διαχειριστές ή οι managers μπορούν να δημιουργούν ή να επεξεργάζονται πελάτες.",
  "You do not have permission to create projects.": "Δεν έχετε δικαίωμα να δημιουργείτε έργα.",
  "You do not have permission to edit this item.": "Δεν έχετε δικαίωμα να επεξεργαστείτε αυτό το στοιχείο.",
  "You have to add name, project manager, and client first before editing.": "Πρέπει πρώτα να προσθέσετε όνομα, υπεύθυνο έργου και πελάτη πριν την επεξεργασία."
}));

const termGreek = new Map(Object.entries({
  "project": "έργο",
  "projects": "έργα",
  "client": "πελάτης",
  "clients": "πελάτες",
  "manager": "υπεύθυνος",
  "address": "διεύθυνση",
  "telephone": "τηλέφωνο",
  "phone": "τηλέφωνο",
  "email": "email",
  "area": "περιοχή",
  "areas": "περιοχές",
  "floor": "όροφος",
  "team": "ομάδα",
  "teams": "ομάδες",
  "member": "μέλος",
  "members": "μέλη",
  "equipment": "εξοπλισμός",
  "note": "σημείωση",
  "notes": "σημειώσεις",
  "file": "αρχείο",
  "files": "αρχεία",
  "photo": "φωτογραφία",
  "photos": "φωτογραφίες",
  "task": "εργασία",
  "tasks": "εργασίες",
  "plan": "σχέδιο",
  "plans": "σχέδια",
  "assignment": "ανάθεση",
  "category": "κατηγορία",
  "status": "κατάσταση",
  "date": "ημερομηνία",
  "time": "ώρα",
  "title": "τίτλος",
  "description": "περιγραφή",
  "language": "γλώσσα",
  "settings": "ρυθμίσεις",
  "notification": "ειδοποίηση",
  "notifications": "ειδοποιήσεις",
  "message": "μήνυμα",
  "conversation": "συνομιλία",
  "draft": "πρόχειρο",
  "summary": "περίληψη",
  "material": "υλικό",
  "materials": "υλικά",
  "offer": "προσφορά",
  "archive": "αρχείο",
  "archived": "αρχειοθετημένο",
  "active": "ενεργό",
  "completed": "ολοκληρωμένο"
}));

function translateTerm(term) {
  const normalized = String(term || "").trim().toLowerCase();
  return termGreek.get(normalized) || term;
}

function suggestGreek(text) {
  const value = cleanText(text);
  if (!value) return "";
  if (/[Α-Ωα-ω]/.test(value)) return value;
  if (exactGreek.has(value)) return exactGreek.get(value);
  if (/^\+ /.test(value)) {
    return `+ ${suggestGreek(value.slice(2))}`;
  }
  let match = value.match(/^Add (.+)$/i);
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
  match = value.match(/^(.+) required\.?$/i);
  if (match) return `Απαιτείται: ${match[1]}`;
  match = value.match(/^Only admins(.+)$/i);
  if (match) return `Μόνο οι διαχειριστές${match[1]}`;
  match = value.match(/^You do not have permission to (.+)\.?$/i);
  if (match) return `Δεν έχετε δικαίωμα να ${match[1]}.`;
  match = value.match(/^You do not have access to (.+)\.?$/i);
  if (match) return `Δεν έχετε πρόσβαση για να ${match[1]}.`;
  if (/^[A-Z][A-Za-z /-]{1,32}$/.test(value)) {
    const words = value.split(/(\s+|\/|-)/).map((word) => {
      if (/^\s+$|^\/$|^-$/.test(word)) return word;
      return translateTerm(word);
    });
    const joined = words.join("");
    if (joined !== value) return joined;
  }
  return "";
}

function guessSection(text) {
  const value = String(text || "").toLowerCase();
  if (/ai|assistant|speech|voice|microphone|draft|conversation|transcript|chatgpt/.test(value)) return "AI Assistant";
  if (/daily work|assigned person|map|google maps/.test(value)) return "Daily Works";
  if (/planner|assignment|week|team is already planned/.test(value)) return "Planner";
  if (/client|customer|company|uid|responsible/.test(value)) return "Clients";
  if (/equipment|category|serial|condition/.test(value)) return "Equipment";
  if (/member|permission|role|admin|manager|user type/.test(value)) return "Team Members";
  if (/setting|theme|drive|sync|font|language/.test(value)) return "Settings";
  if (/audit|log|deleted|created|updated|restored|archived/.test(value)) return "Audit Log";
  if (/project|area|floor|note|file|photo|task|plan/.test(value)) return "Projects";
  return "General";
}

function extractHtmlStrings(text) {
  const withoutScripts = text.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const found = [];
  for (const attr of ["placeholder", "title", "aria-label", "value"]) {
    const regex = new RegExp(`${attr}="([^"]+)"`, "gi");
    for (const match of withoutScripts.matchAll(regex)) {
      found.push({ source: `HTML ${attr}`, english: match[1] });
    }
  }
  const textOnly = withoutScripts
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n");
  for (const piece of textOnly.split(/\n+/)) {
    const cleaned = cleanText(piece);
    if (cleaned) found.push({ source: "HTML text", english: cleaned });
  }
  return found;
}

function extractJsStrings(text) {
  const found = [];
  const regex = /(["'`])((?:\\.|(?!\1)[\s\S]){1,260})\1/g;
  for (const match of text.matchAll(regex)) {
    const raw = match[2]
      .replace(/\\n/g, " ")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/`/g, "");
    const cleaned = cleanText(raw);
    if (!cleaned || /^[a-z0-9_-]+$/i.test(cleaned)) continue;
    found.push({ source: "JS string", english: cleaned });
  }
  return found;
}

const rows = parseCsv(await fs.readFile(sourceCsv, "utf8"));
const header = rows.shift().map((value) => value.toLowerCase());
const keyIndex = header.indexOf("key");
const enIndex = header.indexOf("en");
const currentEntries = new Map();
for (const row of rows) {
  uniquePush(currentEntries, {
    key: row[keyIndex],
    english: row[enIndex],
    source: "Existing i18n CSV",
  });
}

const htmlText = await fs.readFile(htmlFile, "utf8");
const jsText = await fs.readFile(jsFile, "utf8");
for (const entry of extractHtmlStrings(htmlText)) uniquePush(currentEntries, entry);
for (const entry of extractJsStrings(jsText)) uniquePush(currentEntries, entry);

const allEntries = [...currentEntries.values()]
  .sort((a, b) => a.section.localeCompare(b.section) || a.english.localeCompare(b.english))
  .map((entry, index) => {
    const greek = suggestGreek(entry.english);
    return {
      id: index + 1,
      ...entry,
      greek,
      status: greek ? "Proposal" : "Needs Greek",
      correction: "",
      notes: greek ? "" : "Please review / add Greek wording",
    };
  });

const railRows = [
  ["Main rail", "Projects", "Έργα", "", "Main navigation"],
  ["Main rail", "Planner", "Προγραμματισμός", "", "Main navigation"],
  ["Main rail", "Daily Works", "Ημερήσιες εργασίες", "", "Main navigation"],
  ["Main rail", "Team Members", "Μέλη ομάδας", "", "Main navigation"],
  ["Main rail", "Equipment", "Εξοπλισμός", "", "Main navigation"],
  ["Main rail", "Clients", "Πελάτες", "", "Main navigation"],
  ["Main rail", "AI Assistant", "Βοηθός AI", "", "Main navigation"],
  ["Main rail", "Settings", "Ρυθμίσεις", "", "Main navigation"],
  ["Main rail", "Audit Log", "Ιστορικό ελέγχου", "", "Main navigation"],
  ["Project workspace", "Info", "Πληροφορίες", "", "Project first tab"],
  ["Project workspace", "Plans", "Σχέδια", "", "Project section"],
  ["Project workspace", "Files", "Αρχεία", "", "Project section"],
  ["Project workspace", "Tasks", "Εργασίες", "", "Project section"],
  ["Project workspace", "Pics", "Φωτογραφίες", "", "Project section"],
  ["Project workspace", "Chat", "Συνομιλία", "", "Project section"],
  ["Project setup", "Project address is different from client", "Η διεύθυνση του έργου είναι διαφορετική από του πελάτη", "", "New project contact logic"],
  ["Project setup", "Project telephone is different from client", "Το τηλέφωνο του έργου είναι διαφορετικό από του πελάτη", "", "New project contact logic"],
  ["Project header", "Go", "Πλοήγηση", "", "Google Maps action"],
  ["Project header", "Call", "Κλήση", "", "Phone action"],
  ["AI Assistant", "Voice settings", "Ρυθμίσεις φωνής", "", "AI control"],
  ["AI Assistant", "Wait before answer (seconds)", "Αναμονή πριν την απάντηση (δευτερόλεπτα)", "", "AI control"],
  ["AI Assistant", "Drafts of conversation with AI", "Πρόχειρες συνομιλίες με AI", "", "AI assistant rail section"]
];

function writeRows(sheet, startCell, matrix) {
  const rowCount = matrix.length;
  const colCount = matrix[0]?.length || 0;
  sheet.getRangeByIndexes(startCell.row, startCell.col, rowCount, colCount).values = matrix;
}

function colLetter(index) {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();

const instructions = workbook.worksheets.add("How to review");
instructions.showGridLines = false;
writeRows(instructions, { row: 0, col: 0 }, [
  ["ProjectManagerWeb Greek Translation Review"],
  ["Purpose", "Review the proposed Greek UI wording before we wire Greek language into the app."],
  ["How you use it", "Write your corrected Greek text in the 'Your correction' column. Leave it empty if the proposal is okay."],
  ["Status meaning", "Proposal = I suggested Greek. Needs Greek = please add/check Greek wording."],
  ["Next step", "After you check this workbook, give it back to me and I will build the language dictionary into the app."],
  ["Generated from", "saas-app/index.html, saas-app/appback.js, and i18n/translations.csv"]
]);
instructions.getRange("A1:F1").merge();
instructions.getRange("A1:F1").format = {
  fill: "#0B776C",
  font: { bold: true, color: "#FFFFFF", size: 16 },
};
instructions.getRange("A2:A6").format = { font: { bold: true }, fill: "#E8F7F5" };
instructions.getRange("A1:F6").format.wrapText = true;
instructions.getRange("A:A").format.columnWidth = 22;
instructions.getRange("B:F").format.columnWidth = 34;

const rail = workbook.worksheets.add("Rail and structure");
rail.showGridLines = false;
const railHeader = [["Section", "English", "Greek proposal", "Your correction", "Notes"]];
writeRows(rail, { row: 0, col: 0 }, railHeader.concat(railRows));
rail.freezePanes.freezeRows(1);
rail.getRange("A1:E1").format = {
  fill: "#0B776C",
  font: { bold: true, color: "#FFFFFF" },
};
rail.getRange(`A1:E${railRows.length + 1}`).format.borders = { preset: "all", style: "thin", color: "#DDEDEA" };
rail.getRange(`A2:E${railRows.length + 1}`).format.wrapText = true;
rail.getRange("A:A").format.columnWidth = 22;
rail.getRange("B:B").format.columnWidth = 34;
rail.getRange("C:D").format.columnWidth = 40;
rail.getRange("E:E").format.columnWidth = 30;

const ui = workbook.worksheets.add("All UI text");
ui.showGridLines = false;
const uiHeader = [["ID", "Section", "Key", "Source", "English", "Greek proposal", "Your correction", "Status", "Notes"]];
const uiRows = allEntries.map((entry) => [
  entry.id,
  entry.section,
  entry.key,
  entry.source,
  entry.english,
  entry.greek,
  entry.correction,
  entry.status,
  entry.notes,
]);
writeRows(ui, { row: 0, col: 0 }, uiHeader.concat(uiRows));
ui.freezePanes.freezeRows(1);
ui.freezePanes.freezeColumns(2);
const lastRow = uiRows.length + 1;
const lastCol = colLetter(uiHeader[0].length - 1);
ui.getRange(`A1:${lastCol}1`).format = {
  fill: "#0B776C",
  font: { bold: true, color: "#FFFFFF" },
};
ui.getRange(`A1:${lastCol}${lastRow}`).format.borders = { preset: "all", style: "thin", color: "#DDEDEA" };
ui.getRange(`A2:${lastCol}${lastRow}`).format.wrapText = true;
ui.getRange("A:A").format.columnWidth = 8;
ui.getRange("B:B").format.columnWidth = 18;
ui.getRange("C:C").format.columnWidth = 32;
ui.getRange("D:D").format.columnWidth = 18;
ui.getRange("E:F").format.columnWidth = 48;
ui.getRange("G:G").format.columnWidth = 48;
ui.getRange("H:H").format.columnWidth = 16;
ui.getRange("I:I").format.columnWidth = 30;
ui.getRange(`H2:H${lastRow}`).dataValidation = {
  rule: { type: "list", values: ["Proposal", "Needs Greek", "Approved", "Change requested", "Do not translate"] },
};

const csvRows = [
  ["ID", "Section", "Key", "Source", "English", "Greek proposal", "Your correction", "Status", "Notes"],
  ...uiRows,
];
await fs.writeFile(csvOut, csvRows.map((row) => row.map(csvEscape).join(",")).join("\r\n"), "utf8");

const preview = await workbook.render({
  sheetName: "Rail and structure",
  range: "A1:E23",
  scale: 1,
  format: "png",
});
await fs.writeFile(previewOut, new Uint8Array(await preview.arrayBuffer()));

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(xlsxOut);

console.log(JSON.stringify({
  xlsx: xlsxOut,
  csv: csvOut,
  preview: previewOut,
  rows: allEntries.length,
  needsGreek: allEntries.filter((entry) => entry.status === "Needs Greek").length,
  proposals: allEntries.filter((entry) => entry.status === "Proposal").length,
}, null, 2));
