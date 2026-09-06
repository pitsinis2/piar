/* Four languages for opexpi.com: Greek, English, German, Italian.
   Every visible string is keyed, so a missing translation shows up as the key
   rather than silently falling back and looking finished. */

const LANGS = ["el", "en", "de", "it"];
const DEFAULT_LANG = "en";

const T = {
  /* ── shared chrome ─────────────────────────────────────────────── */
  "nav.products":  { en:"Products",  el:"Προϊόντα",       de:"Produkte",   it:"Prodotti" },
  "nav.approach":  { en:"Approach",  el:"Προσέγγιση",     de:"Ansatz",     it:"Approccio" },
  "nav.contact":   { en:"Contact",   el:"Επικοινωνία",    de:"Kontakt",    it:"Contatti" },
  "nav.menu":      { en:"Menu",      el:"Μενού",          de:"Menü",       it:"Menu" },

  "cta.openApp":   { en:"Open piAR",           el:"Άνοιγμα piAR",           de:"piAR öffnen",            it:"Apri piAR" },
  "cta.visitSite": { en:"Go to opexmm.com",    el:"Στο opexmm.com",         de:"Zu opexmm.com",          it:"Vai a opexmm.com" },
  "cta.learn":     { en:"Learn more",          el:"Μάθετε περισσότερα",     de:"Mehr erfahren",          it:"Scopri di più" },
  "cta.talk":      { en:"Talk to us",          el:"Μιλήστε μαζί μας",       de:"Sprechen Sie mit uns",   it:"Parliamone" },
  "cta.guide":     { en:"User guide (PDF)",    el:"Οδηγός χρήσης (PDF)",    de:"Handbuch (PDF)",         it:"Guida utente (PDF)" },
  "cta.back":      { en:"All products",        el:"Όλα τα προϊόντα",        de:"Alle Produkte",          it:"Tutti i prodotti" },

  /* ── home: hero ────────────────────────────────────────────────── */
  "home.eyebrow": {
    en:"Operational Excellence · Process Improvement",
    el:"Λειτουργική Αριστεία · Βελτίωση Διαδικασιών",
    de:"Operational Excellence · Prozessverbesserung",
    it:"Operational Excellence · Miglioramento dei Processi",
  },
  "home.h1a": { en:"The discipline of a large company.", el:"Η οργάνωση μιας μεγάλης εταιρείας.", de:"Die Disziplin eines Großkonzerns.", it:"Il rigore di una grande azienda." },
  "home.h1b": { en:"Tools a small one can actually use.", el:"Με εργαλεία που αντέχει μια μικρή.", de:"Werkzeuge, die ein kleines Unternehmen wirklich nutzt.", it:"Con strumenti che una piccola può davvero usare." },
  "home.lead": {
    en:"OpexPI builds operational software for small and medium companies. Not enterprise systems with the features removed — tools designed from the start for teams without an IT department, a consultant, or a six-figure budget.",
    el:"Η OpexPI φτιάχνει λογισμικό λειτουργίας για μικρές και μεσαίες επιχειρήσεις. Όχι εταιρικά συστήματα με λιγότερες λειτουργίες — εργαλεία σχεδιασμένα εξαρχής για ομάδες χωρίς τμήμα πληροφορικής, χωρίς σύμβουλο και χωρίς εξαψήφιο προϋπολογισμό.",
    de:"OpexPI entwickelt Betriebssoftware für kleine und mittlere Unternehmen. Keine Konzernsysteme mit weniger Funktionen — Werkzeuge, die von Anfang an für Teams ohne IT-Abteilung, ohne Berater und ohne sechsstelliges Budget gedacht sind.",
    it:"OpexPI sviluppa software operativo per piccole e medie imprese. Non sistemi aziendali con meno funzioni — strumenti pensati fin dall'inizio per team senza reparto IT, senza consulenti e senza budget a sei cifre.",
  },

  "home.stat1":  { en:"Products in use",     el:"Προϊόντα σε χρήση",     de:"Produkte im Einsatz",   it:"Prodotti in uso" },
  "home.stat2v": { en:"None",                el:"Καθόλου",               de:"Keine",                 it:"Nessuno" },
  "home.stat2":  { en:"IT department needed",el:"Ανάγκη για τμήμα IT",   de:"IT-Abteilung nötig",    it:"Reparto IT necessario" },
  "home.stat3v": { en:"Flat",                el:"Σταθερή",               de:"Pauschal",              it:"Fissa" },
  "home.stat3":  { en:"Pricing, no surprises",el:"Τιμολόγηση, χωρίς εκπλήξεις", de:"Preise ohne Überraschungen", it:"Prezzi senza sorprese" },
  "home.stat4v": { en:"4",                   el:"4",                     de:"4",                     it:"4" },
  "home.stat4":  { en:"Languages supported", el:"Γλώσσες",               de:"Sprachen",              it:"Lingue" },

  /* ── home: products ────────────────────────────────────────────── */
  "home.products.eyebrow": { en:"What we make", el:"Τι φτιάχνουμε", de:"Was wir bauen", it:"Cosa realizziamo" },
  "home.products.h2":      { en:"Two tools, one idea", el:"Δύο εργαλεία, μία ιδέα", de:"Zwei Werkzeuge, eine Idee", it:"Due strumenti, un'idea" },
  "home.products.sub": {
    en:"Each one replaces a wall of paper and a folder of spreadsheets in a specific part of the business.",
    el:"Καθένα αντικαθιστά έναν τοίχο από χαρτιά κι έναν φάκελο με υπολογιστικά φύλλα σε ένα συγκεκριμένο κομμάτι της δουλειάς.",
    de:"Jedes ersetzt einen Stapel Papier und einen Ordner voller Tabellen in einem bestimmten Teil des Betriebs.",
    it:"Ognuno sostituisce una parete di carta e una cartella di fogli di calcolo in una parte precisa dell'attività.",
  },

  "piar.tag":  { en:"Projects & field teams", el:"Έργα & συνεργεία", de:"Projekte & Außenteams", it:"Progetti & squadre" },
  "piar.name": { en:"piAR", el:"piAR", de:"piAR", it:"piAR" },
  "piar.short": {
    en:"Project management for service and construction teams. Projects, clients, crews, areas, tasks and site photos in one place — on the phone, on site, in your language.",
    el:"Διαχείριση έργων για συνεργεία υπηρεσιών και κατασκευών. Έργα, πελάτες, ομάδες, χώροι, εργασίες και φωτογραφίες σε ένα σημείο — στο κινητό, στο εργοτάξιο, στη γλώσσα σας.",
    de:"Projektmanagement für Service- und Bauteams. Projekte, Kunden, Trupps, Bereiche, Aufgaben und Baustellenfotos an einem Ort — auf dem Handy, vor Ort, in Ihrer Sprache.",
    it:"Gestione progetti per squadre di servizi e costruzioni. Progetti, clienti, squadre, aree, attività e foto di cantiere in un unico posto — sul telefono, in cantiere, nella tua lingua.",
  },
  "piar.p1": { en:"Projects, clients and service teams", el:"Έργα, πελάτες και συνεργεία", de:"Projekte, Kunden und Serviceteams", it:"Progetti, clienti e squadre" },
  "piar.p2": { en:"Weekly planner and daily work sheets", el:"Εβδομαδιαίο πρόγραμμα και ημερήσιες εργασίες", de:"Wochenplan und Tagesberichte", it:"Pianificatore settimanale e lavori giornalieri" },
  "piar.p3": { en:"Site photos straight from the phone", el:"Φωτογραφίες απευθείας από το κινητό", de:"Baustellenfotos direkt vom Handy", it:"Foto di cantiere direttamente dal telefono" },
  "piar.p4": { en:"Roles and permissions per person", el:"Ρόλοι και δικαιώματα ανά άτομο", de:"Rollen und Rechte pro Person", it:"Ruoli e permessi per persona" },

  "mm.tag":  { en:"Maintenance & assets", el:"Συντήρηση & εξοπλισμός", de:"Instandhaltung & Anlagen", it:"Manutenzione & impianti" },
  "mm.name": { en:"OpexMM", el:"OpexMM", de:"OpexMM", it:"OpexMM" },
  "mm.short": {
    en:"Maintenance management for facilities and plants. Machines, work orders, spare parts, suppliers and preventive schedules in one structured system.",
    el:"Διαχείριση συντήρησης για εγκαταστάσεις και μονάδες. Μηχανήματα, εντολές εργασίας, ανταλλακτικά, προμηθευτές και προληπτική συντήρηση σε ένα δομημένο σύστημα.",
    de:"Instandhaltungsmanagement für Gebäude und Anlagen. Maschinen, Arbeitsaufträge, Ersatzteile, Lieferanten und Wartungspläne in einem strukturierten System.",
    it:"Gestione della manutenzione per strutture e impianti. Macchine, ordini di lavoro, ricambi, fornitori e manutenzione preventiva in un unico sistema strutturato.",
  },
  "mm.p1": { en:"Machine registry and work orders", el:"Μητρώο μηχανημάτων και εντολές εργασίας", de:"Maschinenregister und Arbeitsaufträge", it:"Registro macchine e ordini di lavoro" },
  "mm.p2": { en:"Parts inventory and suppliers", el:"Απόθεμα ανταλλακτικών και προμηθευτές", de:"Ersatzteillager und Lieferanten", it:"Magazzino ricambi e fornitori" },
  "mm.p3": { en:"Preventive maintenance schedules", el:"Προγράμματα προληπτικής συντήρησης", de:"Vorbeugende Wartungspläne", it:"Piani di manutenzione preventiva" },
  "mm.p4": { en:"QR code cards on the machines", el:"Κάρτες QR πάνω στα μηχανήματα", de:"QR-Code-Karten an den Maschinen", it:"Schede QR sulle macchine" },

  /* ── home: approach ────────────────────────────────────────────── */
  "home.approach.eyebrow": { en:"How we work", el:"Πώς δουλεύουμε", de:"Wie wir arbeiten", it:"Come lavoriamo" },
  "home.approach.h2":      { en:"Built for the company you actually are", el:"Φτιαγμένα για την εταιρεία που πραγματικά είστε", de:"Gebaut für das Unternehmen, das Sie wirklich sind", it:"Costruiti per l'azienda che sei davvero" },
  "home.approach.sub": {
    en:"Operational excellence is usually sold as a programme: a consultant, a year, a budget. We think most of the value is in a handful of things being written down, visible to everyone, and impossible to lose.",
    el:"Η λειτουργική αριστεία συνήθως πωλείται ως πρόγραμμα: ένας σύμβουλος, ένας χρόνος, ένας προϋπολογισμός. Εμείς πιστεύουμε ότι η μεγαλύτερη αξία βρίσκεται στο να καταγράφονται λίγα πράγματα, να τα βλέπουν όλοι και να μη χάνονται ποτέ.",
    de:"Operational Excellence wird meist als Programm verkauft: ein Berater, ein Jahr, ein Budget. Wir glauben, der größte Nutzen liegt darin, dass ein paar Dinge festgehalten werden, für alle sichtbar sind und nicht verloren gehen können.",
    it:"L'operational excellence di solito si vende come programma: un consulente, un anno, un budget. Noi crediamo che gran parte del valore stia nell'avere poche cose scritte, visibili a tutti e impossibili da perdere.",
  },

  "home.a1.n": { en:"01", el:"01", de:"01", it:"01" },
  "home.a1.h": { en:"Small and medium first", el:"Πρώτα οι μικρομεσαίες", de:"Zuerst der Mittelstand", it:"Prima le PMI" },
  "home.a1.p": {
    en:"Not an enterprise product with a cheaper tier. Every screen assumes a team of five to fifty people who are busy doing the actual work.",
    el:"Δεν είναι εταιρικό προϊόν με φθηνότερο πακέτο. Κάθε οθόνη υποθέτει ομάδα πέντε έως πενήντα ατόμων που έχουν δουλειά να κάνουν.",
    de:"Kein Konzernprodukt mit günstigerem Tarif. Jede Ansicht geht von fünf bis fünfzig Leuten aus, die mit der eigentlichen Arbeit beschäftigt sind.",
    it:"Non un prodotto enterprise con un piano più economico. Ogni schermata presuppone un team da cinque a cinquanta persone impegnate nel lavoro vero.",
  },
  "home.a2.n": { en:"02", el:"02", de:"02", it:"02" },
  "home.a2.h": { en:"No IT department required", el:"Χωρίς τμήμα πληροφορικής", de:"Keine IT-Abteilung nötig", it:"Nessun reparto IT" },
  "home.a2.p": {
    en:"Nothing to install on a server, nothing to maintain. A browser and a phone are the whole requirement, and it keeps working when the signal does not.",
    el:"Τίποτα προς εγκατάσταση σε server, τίποτα προς συντήρηση. Ένας φυλλομετρητής κι ένα κινητό είναι όλη η απαίτηση, και συνεχίζει να δουλεύει όταν το σήμα δεν βοηθά.",
    de:"Nichts auf einem Server zu installieren, nichts zu warten. Ein Browser und ein Handy genügen — und es läuft weiter, wenn das Netz schwächelt.",
    it:"Niente da installare su un server, niente da mantenere. Bastano un browser e un telefono, e continua a funzionare anche quando il segnale no.",
  },
  "home.a3.n": { en:"03", el:"03", de:"03", it:"03" },
  "home.a3.h": { en:"In the language of the crew", el:"Στη γλώσσα του συνεργείου", de:"In der Sprache der Mannschaft", it:"Nella lingua della squadra" },
  "home.a3.p": {
    en:"Software people refuse to use is worse than paper. Our tools speak the language of the people holding the tools, not only the office.",
    el:"Λογισμικό που δεν το χρησιμοποιεί κανείς είναι χειρότερο από το χαρτί. Τα εργαλεία μας μιλούν τη γλώσσα αυτών που κάνουν τη δουλειά, όχι μόνο του γραφείου.",
    de:"Software, die niemand benutzt, ist schlechter als Papier. Unsere Werkzeuge sprechen die Sprache derer, die anpacken — nicht nur die des Büros.",
    it:"Un software che nessuno usa è peggio della carta. I nostri strumenti parlano la lingua di chi lavora sul campo, non solo dell'ufficio.",
  },
  "home.a4.n": { en:"04", el:"04", de:"04", it:"04" },
  "home.a4.h": { en:"Priced to be a decision, not a project", el:"Τιμή που είναι απόφαση, όχι έργο", de:"Ein Preis, der eine Entscheidung ist", it:"Un prezzo che è una decisione" },
  "home.a4.p": {
    en:"Flat and predictable, so adopting a tool is something a manager can decide on a Tuesday rather than something that needs a business case.",
    el:"Σταθερή και προβλέψιμη, ώστε η υιοθέτηση ενός εργαλείου να είναι απόφαση ενός υπευθύνου και όχι μελέτη σκοπιμότητας.",
    de:"Pauschal und planbar, damit die Einführung eine Entscheidung der Leitung ist und kein Business Case.",
    it:"Fisso e prevedibile, così adottare uno strumento è una decisione del responsabile, non un business case.",
  },

  /* ── home: contact ─────────────────────────────────────────────── */
  "home.contact.h2": { en:"Tell us what is on paper", el:"Πείτε μας τι είναι ακόμη στο χαρτί", de:"Sagen Sie uns, was noch auf Papier läuft", it:"Dicci cosa è ancora sulla carta" },
  "home.contact.p": {
    en:"If the answer is a folder, a whiteboard, or a spreadsheet somebody guards, that is usually where we can help. Write to us and we will tell you honestly whether one of our tools fits.",
    el:"Αν η απάντηση είναι ένας φάκελος, ένας πίνακας ή ένα υπολογιστικό φύλλο που το φυλάει κάποιος, συνήθως εκεί μπορούμε να βοηθήσουμε. Γράψτε μας και θα σας πούμε ειλικρινά αν ταιριάζει κάποιο εργαλείο μας.",
    de:"Wenn die Antwort ein Ordner, ein Whiteboard oder eine Tabelle ist, die jemand hütet, können wir dort meist helfen. Schreiben Sie uns — wir sagen Ihnen ehrlich, ob eines unserer Werkzeuge passt.",
    it:"Se la risposta è una cartella, una lavagna o un foglio di calcolo che qualcuno custodisce, di solito è lì che possiamo aiutare. Scrivici e ti diremo onestamente se uno dei nostri strumenti fa al caso tuo.",
  },

  /* ── piAR page ─────────────────────────────────────────────────── */
  "piarPage.eyebrow": { en:"Product · Projects and field teams", el:"Προϊόν · Έργα και συνεργεία", de:"Produkt · Projekte und Außenteams", it:"Prodotto · Progetti e squadre" },
  "piarPage.h1": { en:"Every project, every crew, every photo — in one place", el:"Κάθε έργο, κάθε συνεργείο, κάθε φωτογραφία — σε ένα σημείο", de:"Jedes Projekt, jeder Trupp, jedes Foto — an einem Ort", it:"Ogni progetto, ogni squadra, ogni foto — in un unico posto" },
  "piarPage.lead": {
    en:"piAR is built for companies that send people out to sites: installers, electricians, plumbers, renovation and maintenance crews. The office sees the plan, the crew sees their day, and the photos land where the job is.",
    el:"Το piAR φτιάχτηκε για εταιρείες που στέλνουν κόσμο σε χώρους έργου: εγκαταστάτες, ηλεκτρολόγους, υδραυλικούς, συνεργεία ανακαίνισης και συντήρησης. Το γραφείο βλέπει το πρόγραμμα, το συνεργείο βλέπει τη μέρα του, κι οι φωτογραφίες πάνε εκεί που ανήκει η δουλειά.",
    de:"piAR ist für Unternehmen gebaut, die Leute zu Einsatzorten schicken: Monteure, Elektriker, Installateure, Sanierungs- und Wartungstrupps. Das Büro sieht den Plan, der Trupp sieht seinen Tag, und die Fotos landen dort, wo die Arbeit ist.",
    it:"piAR è pensato per le aziende che mandano persone in cantiere: installatori, elettricisti, idraulici, squadre di ristrutturazione e manutenzione. L'ufficio vede il piano, la squadra vede la sua giornata e le foto finiscono dove sta il lavoro.",
  },
  "piarPage.who.h2": { en:"Who it is for", el:"Για ποιους είναι", de:"Für wen es ist", it:"Per chi è" },
  "piarPage.who.p": {
    en:"Service and construction companies of roughly five to fifty people, where the same questions come up every week: who is on which job today, what did we agree with this client, and where is the photo from that wall before we closed it up.",
    el:"Εταιρείες υπηρεσιών και κατασκευών περίπου πέντε έως πενήντα ατόμων, όπου κάθε εβδομάδα προκύπτουν τα ίδια ερωτήματα: ποιος είναι σε ποια δουλειά σήμερα, τι συμφωνήσαμε με αυτόν τον πελάτη και πού είναι η φωτογραφία από εκείνον τον τοίχο πριν τον κλείσουμε.",
    de:"Service- und Bauunternehmen mit etwa fünf bis fünfzig Mitarbeitern, in denen jede Woche dieselben Fragen auftauchen: Wer ist heute auf welcher Baustelle, was wurde mit diesem Kunden vereinbart, und wo ist das Foto von dieser Wand, bevor wir sie geschlossen haben.",
    it:"Aziende di servizi e costruzioni da cinque a cinquanta persone, dove ogni settimana tornano le stesse domande: chi è su quale lavoro oggi, cosa abbiamo concordato con questo cliente e dov'è la foto di quel muro prima di chiuderlo.",
  },
  "piarPage.f.h2": { en:"What is inside", el:"Τι περιλαμβάνει", de:"Was drin ist", it:"Cosa contiene" },
  "piarPage.f1.h": { en:"Projects and clients", el:"Έργα και πελάτες", de:"Projekte und Kunden", it:"Progetti e clienti" },
  "piarPage.f1.p": { en:"Each project carries its client, address, dates, manager and its own numbering — so nothing depends on remembering which folder it was in.", el:"Κάθε έργο έχει τον πελάτη του, τη διεύθυνση, τις ημερομηνίες, τον υπεύθυνο και δική του αρίθμηση — ώστε τίποτα να μην εξαρτάται από το ποιος θυμάται σε ποιον φάκελο ήταν.", de:"Jedes Projekt trägt seinen Kunden, die Adresse, Termine, den Verantwortlichen und eine eigene Nummer — nichts hängt davon ab, wer sich an den Ordner erinnert.", it:"Ogni progetto porta con sé cliente, indirizzo, date, responsabile e una propria numerazione — così nulla dipende da chi ricorda in quale cartella stava." },
  "piarPage.f2.h": { en:"Service teams and areas", el:"Συνεργεία και χώροι", de:"Serviceteams und Bereiche", it:"Squadre e aree" },
  "piarPage.f2.p": { en:"Split a job into the crews doing it and the rooms or zones they work in, so progress is visible per area rather than as one long list.", el:"Χωρίστε μια δουλειά στα συνεργεία που την κάνουν και στους χώρους όπου δουλεύουν, ώστε η πρόοδος να φαίνεται ανά χώρο κι όχι ως μία ατέλειωτη λίστα.", de:"Teilen Sie einen Auftrag in die ausführenden Trupps und die Räume oder Zonen auf, damit der Fortschritt pro Bereich sichtbar wird statt als eine lange Liste.", it:"Dividi un lavoro nelle squadre che lo eseguono e nelle stanze o zone in cui operano, così l'avanzamento è visibile per area invece che in un unico elenco." },
  "piarPage.f3.h": { en:"Planner and daily works", el:"Πρόγραμμα και ημερήσιες εργασίες", de:"Planer und Tagesarbeiten", it:"Pianificatore e lavori giornalieri" },
  "piarPage.f3.p": { en:"A week at a glance for the office, and a clear day for each person. Everyone sees their own jobs; managers see all of them.", el:"Μια εβδομάδα με μια ματιά για το γραφείο και μια καθαρή μέρα για κάθε άτομο. Ο καθένας βλέπει τις δικές του δουλειές, οι υπεύθυνοι τις βλέπουν όλες.", de:"Eine Woche auf einen Blick fürs Büro und ein klarer Tag für jede Person. Jeder sieht seine eigenen Aufträge, die Leitung alle.", it:"Una settimana a colpo d'occhio per l'ufficio e una giornata chiara per ciascuno. Ognuno vede i propri lavori, i responsabili li vedono tutti." },
  "piarPage.f4.h": { en:"Photos that survive", el:"Φωτογραφίες που δεν χάνονται", de:"Fotos, die bleiben", it:"Foto che restano" },
  "piarPage.f4.p": { en:"Taken on the phone, attached to the area they belong to, compressed automatically so a 30 MB photo does not fail on site.", el:"Τραβιούνται με το κινητό, μπαίνουν στον χώρο που ανήκουν και συμπιέζονται αυτόματα, ώστε μια φωτογραφία 30 MB να μην αποτυγχάνει στο εργοτάξιο.", de:"Mit dem Handy aufgenommen, dem passenden Bereich zugeordnet und automatisch komprimiert, damit ein 30-MB-Foto vor Ort nicht scheitert.", it:"Scattate col telefono, allegate all'area a cui appartengono e compresse in automatico, così una foto da 30 MB non fallisce in cantiere." },
  "piarPage.f5.h": { en:"Roles and permissions", el:"Ρόλοι και δικαιώματα", de:"Rollen und Rechte", it:"Ruoli e permessi" },
  "piarPage.f5.p": { en:"Admins, managers and crew each see what belongs to them. A worker opens their own projects, not the whole company.", el:"Διαχειριστές, υπεύθυνοι και τεχνίτες βλέπουν ό,τι τους αφορά. Ο τεχνίτης ανοίγει τα δικά του έργα, όχι όλη την εταιρεία.", de:"Admins, Leitung und Mannschaft sehen jeweils, was sie betrifft. Ein Monteur öffnet seine eigenen Projekte, nicht die ganze Firma.", it:"Amministratori, responsabili e squadre vedono ciascuno ciò che li riguarda. Un operaio apre i propri progetti, non tutta l'azienda." },
  "piarPage.f6.h": { en:"Equipment register", el:"Μητρώο εξοπλισμού", de:"Geräteverzeichnis", it:"Registro attrezzature" },
  "piarPage.f6.p": { en:"Tools, machines and vehicles grouped into your own categories, so you know what you own and where it went.", el:"Εργαλεία, μηχανήματα και οχήματα ομαδοποιημένα στις δικές σας κατηγορίες, ώστε να ξέρετε τι έχετε και πού πήγε.", de:"Werkzeuge, Maschinen und Fahrzeuge in eigenen Kategorien — Sie wissen, was Sie haben und wo es hin ist.", it:"Attrezzi, macchine e veicoli raggruppati nelle tue categorie, così sai cosa possiedi e dov'è finito." },
  "piarPage.cta.h2": { en:"Have a look inside", el:"Ρίξτε μια ματιά", de:"Schauen Sie hinein", it:"Dai un'occhiata" },
  "piarPage.cta.p": { en:"The app runs in the browser and installs on a phone like any other app. The user guide walks through the first hour.", el:"Η εφαρμογή τρέχει στον φυλλομετρητή και εγκαθίσταται στο κινητό σαν κανονική εφαρμογή. Ο οδηγός χρήσης καλύπτει την πρώτη ώρα.", de:"Die App läuft im Browser und lässt sich wie jede andere auf dem Handy installieren. Das Handbuch führt durch die erste Stunde.", it:"L'app funziona nel browser e si installa sul telefono come le altre. La guida accompagna la prima ora." },

  /* ── OpexMM page ───────────────────────────────────────────────── */
  "mmPage.eyebrow": { en:"Product · Maintenance and assets", el:"Προϊόν · Συντήρηση και εξοπλισμός", de:"Produkt · Instandhaltung und Anlagen", it:"Prodotto · Manutenzione e impianti" },
  "mmPage.h1": { en:"Maintenance that lives in a system, not in someone's head", el:"Συντήρηση που ζει σε σύστημα, όχι στο μυαλό κάποιου", de:"Instandhaltung, die im System lebt — nicht in jemandes Kopf", it:"Manutenzione che vive in un sistema, non nella testa di qualcuno" },
  "mmPage.lead": {
    en:"OpexMM is a maintenance management system for facility managers, plant managers and maintenance teams. Machines, work orders, spare parts, suppliers and schedules — structured, and readable by whoever is on shift.",
    el:"Το OpexMM είναι σύστημα διαχείρισης συντήρησης για υπευθύνους εγκαταστάσεων, μονάδων και συνεργεία συντήρησης. Μηχανήματα, εντολές εργασίας, ανταλλακτικά, προμηθευτές και προγράμματα — δομημένα και κατανοητά από όποιον έχει βάρδια.",
    de:"OpexMM ist ein Instandhaltungssystem für Facility- und Werksleiter sowie Wartungsteams. Maschinen, Arbeitsaufträge, Ersatzteile, Lieferanten und Pläne — strukturiert und lesbar für alle, die Schicht haben.",
    it:"OpexMM è un sistema di gestione della manutenzione per facility manager, responsabili di stabilimento e squadre di manutenzione. Macchine, ordini di lavoro, ricambi, fornitori e piani — strutturati e leggibili da chi è in turno.",
  },
  "mmPage.who.h2": { en:"Who it is for", el:"Για ποιους είναι", de:"Für wen es ist", it:"Per chi è" },
  "mmPage.who.p": {
    en:"Plants, workshops, hotels, buildings and any operation where machines need attention on a schedule and a breakdown costs more than the repair.",
    el:"Μονάδες, συνεργεία, ξενοδοχεία, κτίρια και κάθε λειτουργία όπου τα μηχανήματα θέλουν προγραμματισμένη φροντίδα και μια βλάβη κοστίζει περισσότερο από την επισκευή.",
    de:"Werke, Werkstätten, Hotels, Gebäude und jeder Betrieb, in dem Maschinen planmäßig Pflege brauchen und ein Ausfall mehr kostet als die Reparatur.",
    it:"Stabilimenti, officine, hotel, edifici e ogni realtà in cui le macchine richiedono cure programmate e un guasto costa più della riparazione.",
  },
  "mmPage.mods.h2": { en:"Modules", el:"Ενότητες", de:"Module", it:"Moduli" },
  "mmPage.cta.h2": { en:"OpexMM has its own site", el:"Το OpexMM έχει δικό του site", de:"OpexMM hat eine eigene Seite", it:"OpexMM ha un proprio sito" },
  "mmPage.cta.p": { en:"Pricing, the full feature list, the FAQ and a demo request all live there.", el:"Οι τιμές, η πλήρης λίστα λειτουργιών, οι συχνές ερωτήσεις και η αίτηση επίδειξης βρίσκονται εκεί.", de:"Preise, die vollständige Funktionsliste, FAQ und Demo-Anfrage finden Sie dort.", it:"Prezzi, elenco completo delle funzioni, FAQ e richiesta demo si trovano lì." },

  /* ── footer ────────────────────────────────────────────────────── */
  "footer.products": { en:"Products", el:"Προϊόντα", de:"Produkte", it:"Prodotti" },
  "footer.company":  { en:"Company",  el:"Εταιρεία", de:"Unternehmen", it:"Azienda" },
  "footer.tagline":  { en:"Operational excellence for companies without a department for it.", el:"Λειτουργική αριστεία για εταιρείες που δεν έχουν τμήμα γι' αυτό.", de:"Operational Excellence für Unternehmen ohne eigene Abteilung dafür.", it:"Operational excellence per aziende che non hanno un reparto dedicato." },
  "footer.rights":   { en:"All rights reserved.", el:"Με επιφύλαξη παντός δικαιώματος.", de:"Alle Rechte vorbehalten.", it:"Tutti i diritti riservati." },
  "footer.legal":    { en:"Legal", el:"Νομικά", de:"Rechtliches", it:"Note legali" },
  "footer.privacy":  { en:"Privacy Policy", el:"Πολιτική απορρήτου", de:"Datenschutz", it:"Informativa privacy" },
  "footer.terms":    { en:"Terms of Service", el:"Όροι χρήσης", de:"Nutzungsbedingungen", it:"Termini di servizio" },
  "footer.gdpr":     { en:"GDPR / Data Processing", el:"GDPR / Επεξεργασία δεδομένων", de:"DSGVO / Auftragsverarbeitung", it:"GDPR / Trattamento dati" },
  "footer.imprint":  { en:"Imprint", el:"Στοιχεία εταιρείας", de:"Impressum", it:"Note legali obbligatorie" },
  "footer.based":    { en:"Austria · EU-based and GDPR compliant", el:"Αυστρία · Έδρα στην ΕΕ, συμμόρφωση GDPR", de:"Österreich · Sitz in der EU, DSGVO-konform", it:"Austria · Sede nell'UE, conforme al GDPR" },
  "footer.hosted":   { en:"Data hosted in Frankfurt, Germany", el:"Τα δεδομένα φιλοξενούνται στη Φρανκφούρτη", de:"Daten gehostet in Frankfurt am Main", it:"Dati ospitati a Francoforte, Germania" },
};

/* ── machinery ─────────────────────────────────────────────────── */

function pickLang() {
  const fromUrl = new URLSearchParams(location.search).get("lang");
  if (fromUrl && LANGS.includes(fromUrl)) return fromUrl;
  try {
    const saved = localStorage.getItem("opexpi.lang");
    if (saved && LANGS.includes(saved)) return saved;
  } catch (e) { /* storage unavailable */ }
  const browser = (navigator.language || "").slice(0, 2).toLowerCase();
  return LANGS.includes(browser) ? browser : DEFAULT_LANG;
}

function applyLang(lang) {
  document.documentElement.lang = lang;

  for (const el of document.querySelectorAll("[data-t]")) {
    const entry = T[el.getAttribute("data-t")];
    // A missing string shows its key, so a gap is obvious instead of silently
    // falling back to English and looking finished.
    el.textContent = entry ? (entry[lang] || entry[DEFAULT_LANG]) : el.getAttribute("data-t");
  }
  for (const el of document.querySelectorAll("[data-t-aria]")) {
    const entry = T[el.getAttribute("data-t-aria")];
    if (entry) el.setAttribute("aria-label", entry[lang] || entry[DEFAULT_LANG]);
  }
  for (const btn of document.querySelectorAll(".lang-switch button")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
  }
  try { localStorage.setItem("opexpi.lang", lang); } catch (e) { /* storage unavailable */ }
}

document.addEventListener("DOMContentLoaded", () => {
  applyLang(pickLang());

  for (const btn of document.querySelectorAll(".lang-switch button")) {
    btn.addEventListener("click", () => applyLang(btn.dataset.lang));
  }

  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
    // Tapping a link should close the menu behind it.
    links.addEventListener("click", (e) => {
      if (e.target.tagName === "A") links.classList.remove("open");
    });
  }

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});
