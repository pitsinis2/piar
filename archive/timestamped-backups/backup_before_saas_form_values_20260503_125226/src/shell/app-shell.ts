type ProjectArea = {
  id: string;
  name: string;
  floor: string;
};

type ServiceTeam = {
  name: string;
  color: string;
};

type Project = {
  id: string;
  name: string;
  address: string;
  client: string;
  manager: string;
  start: string;
  color: string;
  areas: ProjectArea[];
  teams: ServiceTeam[];
  archived?: boolean;
};

type DemoItem = {
  projectId: string;
  areaId: string;
  kind: string;
  badge: string;
  name: string;
  meta: string;
};

type DirectoryItem = {
  name: string;
  subtitle: string;
  details: string[];
  archived?: boolean;
};

type DirectorySection = {
  title: string;
  items: DirectoryItem[];
};

type TeamColorChoice = {
  name: string;
  value: string;
};

type TeamMemberChoice = {
  no: string;
  name: string;
  stars: string;
  position: string;
};

const projects: Project[] = [
  {
    id: "0003",
    name: "Ioanninon Polykatoikia Serafidi",
    address: "Ioannina center",
    client: "Giannis Ioannou",
    manager: "Alexandros Roupas",
    start: "2026-04-19",
    color: "#dff4f5",
    areas: [
      { id: "info", name: "Info", floor: "" },
      { id: "bathroom", name: "Bathroom", floor: "1st floor" },
      { id: "kitchen", name: "Kitchen", floor: "Ground floor" },
    ],
    teams: [
      { name: "Kalyteroi", color: "pink" },
      { name: "Astrapogianoi", color: "orange" },
    ],
  },
  {
    id: "0002",
    name: "pitsin",
    address: "1234567",
    client: "Client 1 Client 1 sur",
    manager: "Admin1 surname Admin",
    start: "2026-04-18",
    color: "#e9f5dc",
    areas: [
      { id: "info", name: "Info", floor: "" },
      { id: "balcony", name: "Balcony", floor: "2nd floor" },
      { id: "bathroom", name: "Bathroom", floor: "1st floor" },
    ],
    teams: [
      { name: "test3", color: "orange" },
      { name: "test2222", color: "green" },
    ],
  },
  {
    id: "0001",
    name: "test2",
    address: "1234567",
    client: "Client 1 Client 1 sur",
    manager: "Alexandros Roupas",
    start: "2026-04-10",
    color: "#fbe4ea",
    areas: [
      { id: "info", name: "Info", floor: "" },
      { id: "bathroom", name: "Bathroom", floor: "1st floor" },
      { id: "kitchen", name: "Kitchen", floor: "Ground floor" },
    ],
    teams: [
      { name: "Kalyteroi", color: "pink" },
      { name: "Astrapogianoi", color: "orange" },
    ],
  },
  {
    id: "0000",
    name: "Ergo 1",
    address: "456789",
    client: "Client 1 Client 1 sur",
    manager: "Alexandros Roupas",
    start: "2026-04-09",
    color: "#ffe8d8",
    areas: [
      { id: "info", name: "Info", floor: "" },
      { id: "external", name: "External balcony", floor: "3rd floor" },
    ],
    teams: [
      { name: "Prasini", color: "green" },
    ],
  },
];

const directoryData: Record<string, DirectorySection> = {
  planner: {
    title: "Planner",
    items: [
      { name: "CW 18 - This week", subtitle: "5-day / 7-day week", details: ["Selected week: 27 Apr - 3 May", "Unavailable days: Sundays", "Planned blocks: 3"] },
      { name: "Today", subtitle: "Jump to current date", details: ["Open work today", "Teams available: 2", "Conflicts: none"] },
      { name: "Unavailable days", subtitle: "Red unavailable dates", details: ["Repeated: Sunday", "Single days: 1 May", "Planning warns before using these dates"] },
    ],
  },
  team: {
    title: "Team Members",
    items: [
      { name: "Alexandros Roupas", subtitle: "#001 | Manager", details: ["Personal No: 001", "Email: admin@local.app", "Phone: 12345", "Experience: 1 star"] },
      { name: "Christina Roupa", subtitle: "#002 | Office", details: ["Personal No: 002", "Email: 1234@test.com", "Phone: 89987898", "Position: Office"] },
      { name: "Nikos Mastoropoulos", subtitle: "#003 | Operator", details: ["Personal No: 003", "Email: user@example.com", "Phone: 45678", "Position: Operator"] },
    ],
  },
  equipment: {
    title: "Equipment",
    items: [
      { name: "Electrical tools", subtitle: "0 active equipment", details: ["Category can be edited or deleted", "Tools become uncategorized if category is deleted"] },
      { name: "Machines", subtitle: "0 active equipment", details: ["Reusable equipment category", "Ready for future project assignment"] },
      { name: "Vehicles", subtitle: "0 active equipment", details: ["Company vehicles", "Availability will connect to planner later"] },
    ],
  },
  clients: {
    title: "Clients",
    items: [
      { name: "Client 1 Client 1 sur", subtitle: "2 active projects", details: ["Company: Client 1", "Email: No email", "Phone: No telephone", "Projects: Ergo 1, test2"] },
      { name: "Giannis Ioannou", subtitle: "1 active project", details: ["Company: Ioannou", "Email: 345678@ueueu.com", "Phone: 456789", "Projects: Ioanninon Polykatoikia Serafidi"] },
      { name: "Demo customer", subtitle: "No projects yet", details: ["Prepared client record", "Ready for first project"] },
    ],
  },
  settings: {
    title: "Settings",
    items: [
      { name: "Company", subtitle: "Drive, license, users", details: ["Company profile", "Timezone: Europe/Vienna", "Owner admin manages users"] },
      { name: "License", subtitle: "10 active seats", details: ["Active users count", "Inactive users do not count", "Manual license control for first customers"] },
      { name: "Google Drive", subtitle: "Not connected yet", details: ["Admin connects Drive once", "Create company root folder", "Sync changed items twice per day"] },
    ],
  },
  audit: {
    title: "Audit Log",
    items: [
      { name: "Project created", subtitle: "Today", details: ["Admin created Ioanninon project", "Folder will be created in Drive after sync"] },
      { name: "Area updated", subtitle: "Yesterday", details: ["Kitchen floor changed", "Area filters updated"] },
      { name: "File uploaded", subtitle: "Older", details: ["File_20260419 uploaded to Plans", "Uploaded by Alexandros Roupas"] },
    ],
  },
};

const teamColors: TeamColorChoice[] = [
  { name: "Teal", value: "#23978f" },
  { name: "Blue", value: "#2f76d2" },
  { name: "Orange", value: "#e67e2f" },
  { name: "Red", value: "#d94f3f" },
  { name: "Pink", value: "#c43878" },
  { name: "Purple", value: "#704bd6" },
  { name: "Green", value: "#509b42" },
  { name: "Gold", value: "#c79a10" },
];

const teamMemberPool: TeamMemberChoice[] = [
  { no: "004", name: "Roupas G.", stars: "★★", position: "Office" },
  { no: "001", name: "Roupas A.", stars: "★", position: "Manager" },
  { no: "007", name: "Σχεδονμαστορακos Θ.", stars: "★★", position: "Operator" },
  { no: "006", name: "Βοηθοπουλος N.", stars: "★", position: "Operator" },
  { no: "005", name: "Mastorakso T.", stars: "★★★", position: "Operator" },
  { no: "009", name: "Mastoropoulos N.", stars: "★★★", position: "Operator" },
  { no: "002", name: "Roupa C.", stars: "★", position: "Office" },
  { no: "003", name: "memeeee M.", stars: "", position: "Operator" },
  { no: "008", name: "Theofanou E.", stars: "★", position: "Office" },
];

export function renderAppShell(root: HTMLElement | null) {
  if (!root) return;

const cleanMemberLabels: Record<string, Pick<TeamMemberChoice, "name" | "stars">> = {
  "001": { name: "Roupas A.", stars: "*" },
  "002": { name: "Roupa C.", stars: "*" },
  "003": { name: "memeeee M.", stars: "" },
  "004": { name: "Roupas G.", stars: "**" },
  "005": { name: "Mastorakso T.", stars: "***" },
  "006": { name: "Voithopoulos N.", stars: "*" },
  "007": { name: "Schedonmastorakos T.", stars: "**" },
  "008": { name: "Theofanou E.", stars: "*" },
  "009": { name: "Mastoropoulos N.", stars: "***" },
};

function memberDisplay(member: TeamMemberChoice) {
  return cleanMemberLabels[member.no] || member;
}

  const state = {
    currentSection: "projects",
    selectedProjectId: "0003",
    selectedAreaId: "info",
    selectedDirectoryIndex: 0,
    search: "",
    modal: "",
    viewMode: "list",
    sideCollapsed: false,
    floorFilter: "",
    areaFilter: "",
    items: [] as DemoItem[],
  };

  const previewStorageKey = "project-manager-saas-preview-v1";

  function loadPreviewState() {
    try {
      const saved = JSON.parse(localStorage.getItem(previewStorageKey) || "null");
      if (!saved) return;
      if (Array.isArray(saved.projects)) {
        projects.splice(0, projects.length, ...saved.projects);
      }
      Object.entries(saved.directoryData || {}).forEach(([key, value]) => {
        const section = directoryData[key];
        const typedValue = value as { items?: DirectoryItem[] };
        if (section && Array.isArray(typedValue.items)) {
          section.items = typedValue.items;
        }
      });
      if (saved.state) {
        Object.assign(state, saved.state, { modal: "", search: "" });
      }
      if (Array.isArray(saved.items)) {
        state.items = saved.items;
      }
    } catch (error) {
      console.warn("Preview state could not be loaded.", error);
    }
  }

  function savePreviewState() {
    try {
      const directorySnapshot = Object.fromEntries(
        Object.entries(directoryData).map(([key, value]) => [key, { items: value.items }]),
      );
      localStorage.setItem(previewStorageKey, JSON.stringify({
        projects,
        directoryData: directorySnapshot,
        items: state.items,
        state: { ...state, modal: "", search: "" },
      }));
    } catch (error) {
      console.warn("Preview state could not be saved.", error);
    }
  }

  const selectedProject = () => projects.find((project) => project.id === state.selectedProjectId) || projects[0];
  const selectedArea = () => selectedProject().areas.find((area) => area.id === state.selectedAreaId) || selectedProject().areas[0];

  function filteredProjectAreas(project: Project) {
    const areaQuery = state.areaFilter.trim().toLowerCase();
    return project.areas.filter((area) => {
      if (area.id === "info") return true;
      const floorMatch = !state.floorFilter || area.floor === state.floorFilter;
      const areaMatch = !areaQuery || area.name.toLowerCase().includes(areaQuery);
      return floorMatch && areaMatch;
    });
  }

  function render() {
    savePreviewState();
    const project = selectedProject();
    const area = selectedArea();
    root!.innerHTML = `
      <main class="saas-workspace">
        ${renderRail()}
        ${state.sideCollapsed ? renderCollapsedPanel() : renderSidePanel()}
        ${state.currentSection === "projects" ? renderProjectWorkspace(project, area) : renderDirectoryWorkspace()}
        ${renderModal(project, area)}
      </main>
    `;
    bindEvents();
  }

  function renderRail() {
    return `
      <aside class="saas-sidebar">
        <div class="brand-pill">Pi.AR</div>
        <button class="rail-tab ${state.currentSection === "projects" ? "active" : ""}" data-section="projects">Projects</button>
        <button class="rail-tab ${state.currentSection === "planner" ? "active" : ""}" data-section="planner">Planner</button>
        <button class="rail-tab ${state.currentSection === "team" ? "active" : ""}" data-section="team">Team Members</button>
        <button class="rail-tab ${state.currentSection === "equipment" ? "active" : ""}" data-section="equipment">Equipment</button>
        <button class="rail-tab ${state.currentSection === "clients" ? "active" : ""}" data-section="clients">Clients</button>
        <button class="rail-tab ${state.currentSection === "settings" ? "active" : ""}" data-section="settings">Settings</button>
        <button class="rail-tab ${state.currentSection === "audit" ? "active" : ""}" data-section="audit">Audit Log</button>
      </aside>
    `;
  }

  function renderCollapsedPanel() {
    return `
      <section class="project-rail collapsed-panel">
        <button class="expand-rail" data-toggle-rail title="Show list">&#8250;</button>
      </section>
    `;
  }

  function renderSidePanel() {
    if (state.currentSection === "projects") return renderProjectRail();
    const section = directoryData[state.currentSection] || { title: "Section", items: [] };
    const query = state.search.trim().toLowerCase();
    const items = section.items.filter((item) => !item.archived && (!query || item.name.toLowerCase().includes(query) || item.subtitle.toLowerCase().includes(query)));
    return `
      <section class="project-rail directory-rail">
        <button class="collapse-rail" data-toggle-rail title="Hide list">&#8249;</button>
        <label class="search-shell">
          <input data-search type="search" placeholder="Search ${escapeHtml(section.title)}" value="${escapeHtml(state.search)}">
        </label>
        <section class="rail-panel">
          <div class="panel-title">
            <h2>${escapeHtml(section.title)}</h2>
            <button data-modal="${addModalForSection(state.currentSection)}">+</button>
          </div>
          ${items.map((item) => `
            <button class="directory-card ${section.items.indexOf(item) === state.selectedDirectoryIndex ? "selected" : ""}" type="button" data-directory-index="${section.items.indexOf(item)}">
              <strong>${escapeHtml(item.name)}</strong>
              <small>${escapeHtml(item.subtitle)}</small>
            </button>
          `).join("")}
          <section class="mini-archive">
            <h3>Archived elements</h3>
            ${section.items.some((item) => item.archived) ? section.items.filter((item) => item.archived).map((item) => `
              <button class="archive-row" data-restore-directory="${section.items.indexOf(item)}">
                <strong>${escapeHtml(item.name)}</strong>
                <small>Archived from ${escapeHtml(section.title)} | click to restore</small>
              </button>
            `).join("") : `<p>Archived ${escapeHtml(section.title.toLowerCase())} will appear here.</p>`}
          </section>
        </section>
      </section>
    `;
  }

  function directorySubtitle(section: string, index: number) {
    const subtitles: Record<string, string[]> = {
      planner: ["5-day / 7-day week", "Jump to current date", "Red unavailable dates"],
      team: ["#001 | Manager", "#002 | Office", "#003 | Operator"],
      equipment: ["0 active equipment", "0 active equipment", "0 active equipment"],
      clients: ["2 active projects", "1 active project", "No projects yet"],
      settings: ["Drive, license, users", "10 active seats", "Not connected yet"],
      audit: ["Today", "Yesterday", "Older"],
    };
    return subtitles[section]?.[index] || "Preview item";
  }

  function addModalForSection(section: string) {
    const map: Record<string, string> = {
      planner: "new-planner-entry",
      team: "new-member",
      equipment: "new-equipment",
      clients: "new-client",
      settings: "new-setting",
      audit: "audit-info",
    };
    return map[section] || section;
  }

  function renderProjectWorkspace(project: Project, area: ProjectArea) {
    return `
      <section class="project-workspace">
        ${renderHero(project)}
        ${renderAreaTabs(project)}
        <div class="project-content">
          ${renderTeams(project)}
          ${renderContent(project, area)}
        </div>
      </section>
    `;
  }

  function renderDirectoryWorkspace() {
    if (state.currentSection === "planner") return renderPlannerWorkspace();
    const section = directoryData[state.currentSection] || { title: "Workspace", items: [] };
    const selected = section.items[state.selectedDirectoryIndex] || section.items[0];
    return `
      <section class="project-workspace directory-workspace">
        <header class="project-hero-card">
          <div>
            <h1>${escapeHtml(section.title)}</h1>
            <p>${escapeHtml(selected?.name || "No item selected")}</p>
            <p>${escapeHtml(selected?.subtitle || "Select one item from the left list.")}</p>
          </div>
          <div class="hero-actions">
            <button data-modal="${state.currentSection}">Edit</button>
            <button data-archive-directory>Archive</button>
          </div>
        </header>
        <section class="directory-detail-grid">
          <article class="content-card">
            <h2>Details</h2>
            <div class="detail-list">
              ${(selected?.details || []).map((detail) => `<p>${escapeHtml(detail)}</p>`).join("")}
            </div>
          </article>
          <article class="content-card">
            <h2>Related projects</h2>
            ${projects.slice(0, 2).map((project) => `
              <button class="related-project" data-section="projects" data-project="${project.id}">
                <strong>${project.id} - ${escapeHtml(project.name)}</strong>
                <small>${escapeHtml(project.client)} | Start: ${project.start}</small>
              </button>
            `).join("")}
          </article>
        </section>
      </section>
    `;
  }

  function renderPlannerWorkspace() {
    return `
      <section class="project-workspace directory-workspace">
        <header class="project-hero-card">
          <div>
            <h1>Planner</h1>
            <p>Team scheduling preview</p>
            <p>Calendar logic will come back here, cleaner than the prototype.</p>
          </div>
          <div class="hero-actions">
            <button data-modal="planner">Today</button>
            <button data-modal="planner">5 / 7 days</button>
          </div>
        </header>
        <section class="planner-preview-grid">
          ${["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, index) => `
            <article class="planner-day" data-drop-day="${day}">
              <strong>${day}</strong>
              <span>${13 + index}-Apr</span>
              <button data-modal="new-planner-entry">+</button>
              ${index < 2 ? `<p class="planner-card" draggable="true" data-planner-card="${index === 0 ? "0001" : "0003"}">${index === 0 ? "0001 - test2" : "0003 - Ioanninon"}<br><small>${index === 0 ? "Kalyteroi" : "Astrapogianoi"}</small></p>` : `<em>No projects</em>`}
            </article>
          `).join("")}
        </section>
      </section>
    `;
  }

  function renderProjectRail() {
    const query = state.search.trim().toLowerCase();
    const list = projects.filter((project) => !project.archived && (!query || project.name.toLowerCase().includes(query) || project.id.includes(query)));
    const archived = projects.filter((project) => project.archived);
    return `
      <section class="project-rail">
        <button class="collapse-rail" data-toggle-rail title="Hide list">&#8249;</button>
        <label class="search-shell">
          <input data-search type="search" placeholder="Search project" value="${escapeHtml(state.search)}">
        </label>
        <section class="rail-panel">
          <div class="panel-title">
            <h2>Active Projects</h2>
            <button data-modal="new-project">+</button>
          </div>
          <label class="my-projects-check">
            <input type="checkbox">
            <span>My Projects</span>
          </label>
          ${list.map(projectCard).join("")}
        </section>
        <section class="mini-archive">
          <h3>Completed Projects</h3>
          <p>No completed projects yet.</p>
        </section>
        <section class="mini-archive">
          <h3>Archived Projects</h3>
          ${archived.length ? archived.map((project) => `
            <button class="archive-row" data-restore-project="${project.id}">
              <strong>${project.id} - ${escapeHtml(project.name)}</strong>
              <small>Archived from Projects | click to restore</small>
            </button>
          `).join("") : `<p>No archived projects yet.</p>`}
        </section>
      </section>
    `;
  }

  function projectCard(project: Project) {
    return `
      <button class="project-card-old ${project.id === state.selectedProjectId ? "selected" : ""}" data-project="${project.id}" style="--card-color:${project.color}" type="button">
        <span>${project.id}</span>
        <strong>${escapeHtml(project.name)}</strong>
        <small>Client: ${escapeHtml(project.client)}</small>
        <small>Start: ${project.start}</small>
        <b data-modal="project-menu">...</b>
      </button>
    `;
  }

  function renderHero(project: Project) {
    return `
      <header class="project-hero-card" style="--project-surface:${project.color}">
        <div>
          <h1>${project.id} - ${escapeHtml(project.name)}</h1>
          <p>${escapeHtml(project.address)}</p>
          <p>${escapeHtml(project.client)} | Project manager: ${escapeHtml(project.manager)}</p>
          <div class="meta-pills">
            <span>Project: ${project.id}</span>
            <span>Client: ${escapeHtml(project.client)}</span>
            <span>Manager: ${escapeHtml(project.manager)}</span>
            <span>Start: ${project.start}</span>
            <span>Status: active</span>
          </div>
        </div>
        <div class="hero-actions">
          <button data-modal="chat">Chat Room</button>
          <button class="icon-action" data-modal="notifications">&#128276;</button>
        </div>
      </header>
    `;
  }

  function renderAreaTabs(project: Project) {
    const areas = filteredProjectAreas(project);
    const floors = [...new Set(project.areas.map((area) => area.floor).filter(Boolean))];
    return `
      <nav class="area-tabs">
        ${areas.map((area) => `
          <button class="${area.id === state.selectedAreaId ? "active" : ""}" data-area="${area.id}">
            ${area.floor ? `${escapeHtml(area.name)} ${escapeHtml(area.floor)}` : escapeHtml(area.name)}
          </button>
        `).join("")}
        <button data-modal="new-area">+</button>
        <button class="filter-btn ${state.floorFilter || state.areaFilter ? "active" : ""}" data-modal="filter">Filter</button>
        ${state.floorFilter || state.areaFilter ? `<span class="active-filter">Showing ${areas.length - 1}/${project.areas.length - 1} areas${state.floorFilter ? ` | ${escapeHtml(state.floorFilter)}` : ""}</span>` : ""}
        <span class="floor-count">${floors.length} floors</span>
      </nav>
    `;
  }

  function renderTeams(project: Project) {
    return `
      <aside class="team-strip">
        <span>Teams</span>
        <button data-modal="service-team">+</button>
        ${project.teams.map((team) => `<button class="team-pill ${team.color}" data-modal="service-team">${escapeHtml(team.name)}</button>`).join("")}
      </aside>
    `;
  }

  function renderContent(project: Project, area: ProjectArea) {
    const inInfo = area.id === "info";
    return `
      <section class="content-grid ${state.viewMode === "grid" ? "grid-mode" : "list-mode"}">
        ${inInfo ? renderPlans() : ""}
        ${renderBox("Notes", "NOTE", inInfo ? "h kouzina metaferthike" : `${area.name} inspection note`, inInfo ? "Master plan | 19.4.2026, 19:02:27" : `${area.floor} | ${project.teams[0]?.name || "No team"}`, "note")}
        ${renderBox("Files", "FILE", inInfo ? "Contract_20260419" : `${area.name}_document`, inInfo ? "application/pdf | Project info" : "application/pdf | Uploaded by team", "file")}
        ${renderBox("Photos", "PHOTO", inInfo ? "Summary photo list" : `${area.name}_photo_001`, inInfo ? "All areas | All teams" : `${area.floor} | Uploaded by worker`, "photo")}
      </section>
    `;
  }

  function renderPlans() {
    return `
      <section class="content-card plans-card">
        <div class="card-head">
          <h2>Plans</h2>
          <div>
            <button data-view="grid">Grid</button>
            <button data-view="list">List</button>
            <button data-modal="plan">+</button>
          </div>
        </div>
        <article class="file-item">
          <span>FILE</span>
          <h3>File_20260419</h3>
          <p>application/pdf | 19.4.2026, 18:57:07 | Uploaded by: Alexandros Roupas</p>
        </article>
        ${renderCreatedItems("plan", "info")}
      </section>
    `;
  }

  function renderBox(title: string, badge: string, name: string, meta: string, modal: string) {
    return `
      <section class="content-card">
        <div class="card-head">
          <h2>${title}</h2>
          <button data-modal="${modal}">+</button>
        </div>
        <article class="file-item">
          <span>${badge}</span>
          <h3>${escapeHtml(name)}</h3>
          <p>${escapeHtml(meta)}</p>
        </article>
        ${renderCreatedItems(modal, selectedArea().id)}
      </section>
    `;
  }

  function renderCreatedItems(kind: string, areaId: string) {
    return state.items
      .filter((item) => item.projectId === state.selectedProjectId && item.areaId === areaId && item.kind === kind)
      .map((item) => `
        <article class="file-item created-item">
          <span>${escapeHtml(item.badge)}</span>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.meta)}</p>
        </article>
      `)
      .join("");
  }

  function renderModal(project: Project, area: ProjectArea) {
    if (!state.modal) return "";
    const titleMap: Record<string, string> = {
      chat: "Project chat",
      notifications: "Notifications",
      filter: "Filter floors and areas",
      note: "Add note",
      file: "Add file",
      photo: "Add photo",
      plan: "Add to Plans",
      "new-area": "Add area",
      "new-project": "Add project",
      "service-team": "Service Team",
      "new-member": "New Member",
      "new-equipment": "New Equipment",
      "new-client": "New Client",
      "new-planner-entry": "New Planner Entry",
      "new-setting": "New Setting",
      "audit-info": "Audit Log",
      team: "Team Members",
      planner: "Planner",
      settings: "Settings",
      equipment: "Equipment",
      clients: "Clients",
      audit: "Audit Log",
      projects: "Projects",
      "project-menu": "Project options",
    };
    const title = titleMap[state.modal] || "Action";
    return `
      <div class="modal-backdrop">
        <section class="action-modal ${modalClass()}">
          <div class="modal-head">
            <p class="eyebrow">${escapeHtml(project.name)}</p>
            <button data-close type="button">x</button>
          </div>
          ${["service-team", "new-project", "new-member", "new-equipment", "new-client", "new-planner-entry"].includes(state.modal) ? "" : `<h2>${title}</h2>`}
          ${modalBody(project, area)}
        </section>
      </div>
    `;
  }

  function modalClass() {
    if (state.modal === "service-team") return "team-editor-modal";
    if (state.modal === "new-project") return "project-editor-modal";
    if (["new-member", "new-equipment", "new-client", "new-planner-entry"].includes(state.modal)) return "member-editor-modal";
    return "";
  }

  function modalBody(project: Project, area: ProjectArea) {
    if (state.modal === "chat") {
      return `
        <div class="chat-lines">
          <article><strong>Admin</strong><p>Please upload photos before closing the wall.</p><span>Important</span></article>
          <article><strong>Worker</strong><p>${escapeHtml(area.name)} is ready for inspection.</p></article>
        </div>
        <div class="modal-actions"><input placeholder="Write message"><button>Send</button></div>
      `;
    }
    if (state.modal === "notifications") {
      return `<p>Admin mentioned you in ${escapeHtml(project.name)}.</p><button class="primary-action" data-close>Open mention</button>`;
    }
    if (state.modal === "filter") {
      const floors = [...new Set(project.areas.map((entry) => entry.floor).filter(Boolean))];
      return `
        <label>Floor
          <select data-floor-filter>
            <option value="">All floors</option>
            ${floors.map((floor) => `<option value="${escapeHtml(floor)}" ${state.floorFilter === floor ? "selected" : ""}>${escapeHtml(floor)}</option>`).join("")}
          </select>
        </label>
        <label>Area text<input data-area-filter value="${escapeHtml(state.areaFilter)}" placeholder="Bathroom, kitchen, balcony..."></label>
        <div class="choice-row">
          <button class="primary-action" data-apply-filter>Apply filter</button>
          <button data-reset-filter>Clear filter</button>
        </div>
      `;
    }
    if (["note", "file", "photo", "plan"].includes(state.modal)) {
      return `
        <p>Selected area: <strong>${escapeHtml(area.name)}</strong></p>
        <div class="choice-row">
          <button class="primary-action" data-add-demo="${state.modal}">Select file</button>
          <button data-add-demo="${state.modal}">Take picture</button>
          <button data-add-demo="${state.modal}">Add text</button>
        </div>
      `;
    }
    if (state.modal === "service-team") {
      return renderServiceTeamForm();
    }
    if (state.modal === "new-project") {
      return renderProjectForm();
    }
    if (state.modal === "new-member") {
      return renderMemberForm();
    }
    if (state.modal === "new-equipment") {
      return renderEquipmentForm();
    }
    if (state.modal === "new-client") {
      return renderClientForm();
    }
    if (state.modal === "new-planner-entry") {
      return renderPlannerEntryForm();
    }
    if (state.modal === "new-setting") {
      return `<p>Settings are edited from the selected settings detail. This add button is intentionally simple for now.</p><button class="primary-action" data-close>OK</button>`;
    }
    if (state.modal === "audit-info") {
      return `<p>The audit log is created automatically by system actions. It is not added manually.</p><button class="primary-action" data-close>OK</button>`;
    }
    if (state.modal === "new-area") {
      return `
        <label>Area name<input placeholder="Bathroom"></label>
        <label>Floor<input placeholder="1st floor"></label>
        <button class="primary-action" data-add-area>Create area</button>
      `;
    }
    if (state.modal === "project-menu") {
      return `
        <div class="choice-row">
          <button data-modal="new-project">Edit project</button>
          <button class="danger-action" data-archive-project>Archive project</button>
          <button data-close>Cancel</button>
        </div>
      `;
    }
    if (directoryData[state.modal]) {
      return `
        <label>Name<input data-new-directory-name placeholder="New ${escapeHtml(directoryData[state.modal].title)} item"></label>
        <label>Details<input data-new-directory-detail placeholder="Short information"></label>
        <button class="primary-action" data-add-directory="${state.modal}">Save</button>
      `;
    }
    return `<p>This section is connected as a preview. Real data comes with Supabase.</p><button class="primary-action" data-close>OK</button>`;
  }

  function renderServiceTeamForm() {
    return `
      <div class="team-modal-title">
        <button class="collapse-cue" type="button">&#8963;</button>
        <div>
          <h2>Service Team</h2>
          <h3>New team</h3>
        </div>
      </div>
      <label>Service Team name<input data-team-name placeholder="Team name"></label>
      <section class="form-panel">
        <h3>Team Color</h3>
        <p>Choose a strong color for this team.</p>
        <div class="color-grid">
          ${teamColors.map((color, index) => `
            <label class="color-choice" title="${color.name}">
              <input type="radio" name="team-color" value="${color.value}" ${index === 2 ? "checked" : ""}>
              <span style="--choice:${color.value}"></span>
            </label>
          `).join("")}
        </div>
      </section>
      <section class="form-panel">
        <h3>Team Members</h3>
        <p>Select one or more members. Use Position and Experience to filter the list.</p>
        <div class="form-row">
          <select><option>All positions</option><option>Office</option><option>Operator</option></select>
          <select><option>All experience</option><option>1 star</option><option>2 stars</option><option>3 stars</option></select>
        </div>
        <div class="member-select-grid">
          ${teamMemberPool.map((member, index) => `
            <label class="member-select-card ${index === 4 ? "selected" : ""}">
              <input type="checkbox" ${index === 4 ? "checked" : ""}>
              <strong>${escapeHtml(memberDisplay(member).name)} <span>${memberDisplay(member).stars}</span></strong>
              <small>#${member.no} | ${escapeHtml(member.position)}</small>
            </label>
          `).join("")}
        </div>
      </section>
      <div class="attached-sections-title">
        <strong>Photos, Files, Notes</strong>
        <span>Save the Service Team first to add notes, files, or photos.</span>
      </div>
      <section class="attached-section-grid">
        <article><strong>Photos</strong><p>Site snapshots and proof photos.</p><button disabled>+ Add photos</button></article>
        <article><strong>Files</strong><p>Upload PDFs, docs, and reference images.</p><button disabled>+ Upload</button></article>
        <article><strong>Notes</strong><p>Quick comments tied to this Service Team.</p><button disabled>+ Add note</button></article>
      </section>
      <div class="modal-footer">
        <button data-close>Cancel</button>
        <button class="primary-action" data-save-team>Save</button>
      </div>
    `;
  }

  function renderMemberForm() {
    const nextNo = String(directoryData.team.items.length + 1).padStart(3, "0");
    return `
      <div class="compact-modal-title">
        <h2>New Member</h2>
        <p>Create a person for the company. This is not a Service Team.</p>
      </div>
      <section class="form-panel member-form-panel">
        <div class="form-row four">
          <label>Personal No<input data-member-no value="${nextNo}"></label>
          <label>Name<input data-member-name placeholder="Name"></label>
          <label>Surname<input data-member-surname placeholder="Surname"></label>
          <label>Telephone<input data-member-phone placeholder="Telephone number"></label>
        </div>
        <div class="form-row four">
          <label>Email<input data-member-email placeholder="Email"></label>
          <label>Experience<select data-member-experience><option>No experience</option><option>★</option><option>★★</option><option>★★★</option></select></label>
          <label>Position<select data-member-position><option>No position</option><option>Office</option><option>Operator</option><option>Manager</option></select></label>
          <label>User type<select data-member-role><option>User</option><option>Admin</option></select></label>
        </div>
      </section>
      <div class="modal-footer">
        <button data-close>Cancel</button>
        <button class="primary-action" data-save-member>Add</button>
      </div>
    `;
  }

  function renderEquipmentForm() {
    return `
      <div class="compact-modal-title">
        <h2>New Equipment</h2>
        <p>Add a reusable tool, machine, vehicle, or PPE item.</p>
      </div>
      <section class="form-panel">
        <div class="form-row three">
          <label>Equipment name<input data-equipment-name placeholder="Hammer drill"></label>
          <label>Category<select data-equipment-category><option>Electrical tools</option><option>Machines</option><option>Vehicles</option><option>No category</option></select></label>
          <label>Internal No<input placeholder="EQ-001"></label>
        </div>
        <label>Notes<input data-equipment-detail placeholder="Short equipment information"></label>
      </section>
      <div class="modal-footer"><button data-close>Cancel</button><button class="primary-action" data-save-equipment>Add equipment</button></div>
    `;
  }

  function renderClientForm() {
    return `
      <div class="compact-modal-title">
        <h2>New Client</h2>
        <p>Create the customer record first, then connect projects.</p>
      </div>
      <section class="form-panel">
        <div class="form-row three">
          <label>Client name<input data-client-name placeholder="Client name"></label>
          <label>Company<input data-client-company placeholder="Company"></label>
          <label>Telephone<input data-client-phone placeholder="Telephone"></label>
        </div>
        <div class="form-row">
          <label>Email<input data-client-email placeholder="Email"></label>
          <label>Address<input data-client-address placeholder="Address"></label>
        </div>
      </section>
      <div class="modal-footer"><button data-close>Cancel</button><button class="primary-action" data-save-client>Add client</button></div>
    `;
  }

  function renderPlannerEntryForm() {
    return `
      <div class="compact-modal-title">
        <h2>New Planner Entry</h2>
        <p>Select project, dates, and available teams.</p>
      </div>
      <section class="form-panel">
        <div class="form-row three">
          <label>Start date<input type="date" value="2026-05-03"></label>
          <label>End date<input type="date" value="2026-05-03"></label>
          <label>Project<select>${projects.map((project) => `<option>${project.id} - ${escapeHtml(project.name)}</option>`).join("")}</select></label>
        </div>
        <div class="member-select-grid small">
          ${selectedProject().teams.map((team, index) => `
            <label class="member-select-card ${index === 0 ? "selected" : ""}">
              <input type="checkbox" ${index === 0 ? "checked" : ""}>
              <strong>${escapeHtml(team.name)}</strong>
              <small>Available team</small>
            </label>
          `).join("") || `<p>No service teams in selected project yet.</p>`}
        </div>
      </section>
      <div class="modal-footer"><button data-close>Cancel</button><button class="primary-action" data-close>Add to planner</button></div>
    `;
  }

  function renderProjectForm() {
    return `
      <div class="team-modal-title">
        <button class="collapse-cue project-cue" type="button">+</button>
        <div>
          <h2>Project</h2>
          <h3>New project</h3>
        </div>
      </div>
      <section class="form-panel">
        <div class="form-row three">
          <label>Project number<input data-project-number placeholder="0004"></label>
          <label>Project name<input data-project-name placeholder="Bathroom renovation"></label>
          <label>Start date<input type="date" value="2026-05-03"></label>
        </div>
        <label>Address<input placeholder="Street, city"></label>
        <div class="form-row">
          <label>Client<input placeholder="Client name"></label>
          <label>Project manager<input placeholder="Manager"></label>
        </div>
      </section>
      <section class="form-panel">
        <h3>Project Color</h3>
        <p>This color appears in the project list and planner.</p>
        <div class="color-grid">
          ${teamColors.map((color, index) => `
            <label class="color-choice" title="${color.name}">
              <input type="radio" name="project-color" value="${color.value}" ${index === 0 ? "checked" : ""}>
              <span style="--choice:${color.value}"></span>
            </label>
          `).join("")}
        </div>
      </section>
      <section class="form-panel">
        <h3>First areas</h3>
        <p>Add floors and areas now, or create them later inside the project.</p>
        <div class="form-row">
          <label>Area name<input placeholder="Bathroom"></label>
          <label>Floor<input placeholder="1st floor"></label>
        </div>
      </section>
      <div class="modal-footer">
        <button data-close>Cancel</button>
        <button class="primary-action" data-add-project>Save project</button>
      </div>
    `;
  }

  function bindEvents() {
    root!.querySelectorAll<HTMLElement>("[data-project]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedProjectId = button.getAttribute("data-project") || projects[0].id;
        state.selectedAreaId = "info";
        render();
      });
    });
    root!.querySelectorAll<HTMLElement>("[data-section]").forEach((button) => {
      button.addEventListener("click", () => {
        state.currentSection = button.getAttribute("data-section") || "projects";
        state.modal = "";
        state.search = "";
        state.selectedDirectoryIndex = 0;
        render();
      });
    });
    root!.querySelectorAll<HTMLElement>("[data-directory-index]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedDirectoryIndex = Number(button.getAttribute("data-directory-index")) || 0;
        render();
      });
    });
    root!.querySelectorAll<HTMLElement>("[data-toggle-rail]").forEach((button) => {
      button.addEventListener("click", () => {
        state.sideCollapsed = !state.sideCollapsed;
        render();
      });
    });
    root!.querySelector<HTMLElement>("[data-archive-directory]")?.addEventListener("click", () => {
      const section = directoryData[state.currentSection];
      const item = section?.items[state.selectedDirectoryIndex];
      if (!item) return;
      if (confirm(`Archive ${item.name}?`)) {
        item.archived = true;
        state.selectedDirectoryIndex = 0;
        render();
      }
    });
    root!.querySelectorAll<HTMLElement>("[data-restore-directory]").forEach((button) => {
      button.addEventListener("click", () => {
        const section = directoryData[state.currentSection];
        const item = section?.items[Number(button.getAttribute("data-restore-directory")) || 0];
        if (!item) return;
        item.archived = false;
        state.selectedDirectoryIndex = section.items.indexOf(item);
        render();
      });
    });
    root!.querySelector<HTMLElement>("[data-archive-project]")?.addEventListener("click", () => {
      const project = selectedProject();
      if (confirm(`Archive project ${project.id} - ${project.name}?`)) {
        project.archived = true;
        const nextProject = projects.find((candidate) => !candidate.archived) || projects[0];
        state.selectedProjectId = nextProject.id;
        state.selectedAreaId = "info";
        state.modal = "";
        render();
      }
    });
    root!.querySelectorAll<HTMLElement>("[data-restore-project]").forEach((button) => {
      button.addEventListener("click", () => {
        const project = projects.find((candidate) => candidate.id === button.getAttribute("data-restore-project"));
        if (!project) return;
        project.archived = false;
        state.selectedProjectId = project.id;
        state.selectedAreaId = "info";
        render();
      });
    });
    root!.querySelectorAll<HTMLElement>("[data-planner-card]").forEach((card) => {
      card.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("text/plain", card.getAttribute("data-planner-card") || "");
      });
    });
    root!.querySelectorAll<HTMLElement>("[data-drop-day]").forEach((day) => {
      day.addEventListener("dragover", (event) => {
        event.preventDefault();
        day.classList.add("drag-over");
      });
      day.addEventListener("dragleave", () => {
        day.classList.remove("drag-over");
      });
      day.addEventListener("drop", (event) => {
        event.preventDefault();
        day.classList.remove("drag-over");
        const id = event.dataTransfer?.getData("text/plain") || "";
        const card = root!.querySelector<HTMLElement>(`[data-planner-card="${id}"]`);
        if (card) day.appendChild(card);
      });
    });
    root!.querySelectorAll<HTMLElement>("[data-area]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedAreaId = button.getAttribute("data-area") || "info";
        render();
      });
    });
    root!.querySelectorAll<HTMLElement>("[data-modal]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        state.modal = button.getAttribute("data-modal") || "";
        render();
      });
    });
    root!.querySelectorAll<HTMLElement>("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        state.viewMode = button.getAttribute("data-view") || "list";
        render();
      });
    });
    root!.querySelectorAll<HTMLElement>("[data-close]").forEach((button) => {
      button.addEventListener("click", () => {
        state.modal = "";
        render();
      });
    });
    root!.querySelector<HTMLElement>("[data-apply-filter]")?.addEventListener("click", () => {
      state.floorFilter = root!.querySelector<HTMLSelectElement>("[data-floor-filter]")?.value || "";
      state.areaFilter = root!.querySelector<HTMLInputElement>("[data-area-filter]")?.value || "";
      const visibleAreas = filteredProjectAreas(selectedProject());
      if (!visibleAreas.some((area) => area.id === state.selectedAreaId)) {
        state.selectedAreaId = visibleAreas[0]?.id || "info";
      }
      state.modal = "";
      render();
    });
    root!.querySelector<HTMLElement>("[data-reset-filter]")?.addEventListener("click", () => {
      state.floorFilter = "";
      state.areaFilter = "";
      state.modal = "";
      render();
    });
    root!.querySelector<HTMLInputElement>("[data-search]")?.addEventListener("input", (event) => {
      state.search = event.currentTarget.value;
      render();
    });
    root!.querySelector<HTMLElement>("[data-add-area]")?.addEventListener("click", () => {
      const project = selectedProject();
      const id = `area-${project.areas.length + 1}`;
      project.areas.push({ id, name: "New area", floor: "New floor" });
      state.selectedAreaId = id;
      state.modal = "";
      render();
    });
    root!.querySelector<HTMLElement>("[data-save-team]")?.addEventListener("click", () => {
      const name = root!.querySelector<HTMLInputElement>("[data-team-name]")?.value || "New team";
      const colorValue = root!.querySelector<HTMLInputElement>("input[name='team-color']:checked")?.value || "#e67e2f";
      const project = selectedProject();
      project.teams.push({ name, color: colorNameFromValue(colorValue) });
      state.modal = "";
      render();
    });
    root!.querySelector<HTMLElement>("[data-save-member]")?.addEventListener("click", () => {
      const no = root!.querySelector<HTMLInputElement>("[data-member-no]")?.value || String(directoryData.team.items.length + 1).padStart(3, "0");
      const name = root!.querySelector<HTMLInputElement>("[data-member-name]")?.value || "New";
      const surname = root!.querySelector<HTMLInputElement>("[data-member-surname]")?.value || "Member";
      const phone = root!.querySelector<HTMLInputElement>("[data-member-phone]")?.value || "No telephone";
      const email = root!.querySelector<HTMLInputElement>("[data-member-email]")?.value || "No email";
      const position = root!.querySelector<HTMLSelectElement>("[data-member-position]")?.value || "No position";
      directoryData.team.items.push({
        name: `${name} ${surname}`,
        subtitle: `#${no} | ${position}`,
        details: [`Personal No: ${no}`, `Email: ${email}`, `Phone: ${phone}`, `Position: ${position}`],
      });
      state.currentSection = "team";
      state.selectedDirectoryIndex = directoryData.team.items.length - 1;
      state.modal = "";
      render();
    });
    root!.querySelector<HTMLElement>("[data-save-equipment]")?.addEventListener("click", () => {
      const name = root!.querySelector<HTMLInputElement>("[data-equipment-name]")?.value || "New equipment";
      const category = root!.querySelector<HTMLSelectElement>("[data-equipment-category]")?.value || "No category";
      const detail = root!.querySelector<HTMLInputElement>("[data-equipment-detail]")?.value || "No details yet";
      directoryData.equipment.items.push({ name, subtitle: category, details: [`Category: ${category}`, detail] });
      state.currentSection = "equipment";
      state.selectedDirectoryIndex = directoryData.equipment.items.length - 1;
      state.modal = "";
      render();
    });
    root!.querySelector<HTMLElement>("[data-save-client]")?.addEventListener("click", () => {
      const name = root!.querySelector<HTMLInputElement>("[data-client-name]")?.value || "New client";
      const company = root!.querySelector<HTMLInputElement>("[data-client-company]")?.value || "No company";
      const phone = root!.querySelector<HTMLInputElement>("[data-client-phone]")?.value || "No telephone";
      const email = root!.querySelector<HTMLInputElement>("[data-client-email]")?.value || "No email";
      directoryData.clients.items.push({ name, subtitle: "No projects yet", details: [`Company: ${company}`, `Email: ${email}`, `Phone: ${phone}`] });
      state.currentSection = "clients";
      state.selectedDirectoryIndex = directoryData.clients.items.length - 1;
      state.modal = "";
      render();
    });
    root!.querySelector<HTMLElement>("[data-add-project]")?.addEventListener("click", () => {
      const id = root!.querySelector<HTMLInputElement>("[data-project-number]")?.value || String(projects.length).padStart(4, "0");
      const name = root!.querySelector<HTMLInputElement>("[data-project-name]")?.value || "New project";
      const colorValue = root!.querySelector<HTMLInputElement>("input[name='project-color']:checked")?.value || "#dff4f5";
      projects.unshift({
        id,
        name,
        address: "New address",
        client: "New client",
        manager: "Company admin",
        start: "2026-05-03",
        color: colorValue,
        areas: [{ id: "info", name: "Info", floor: "" }],
        teams: [],
      });
      state.selectedProjectId = id;
      state.selectedAreaId = "info";
      state.modal = "";
      render();
    });
    root!.querySelector<HTMLElement>("[data-add-directory]")?.addEventListener("click", (event) => {
      const trigger = event.currentTarget as HTMLElement;
      const sectionKey = trigger.getAttribute("data-add-directory") || "";
      const section = directoryData[sectionKey];
      if (!section) return;
      const name = root!.querySelector<HTMLInputElement>("[data-new-directory-name]")?.value || `New ${section.title}`;
      const detail = root!.querySelector<HTMLInputElement>("[data-new-directory-detail]")?.value || "Created in preview";
      section.items.push({
        name,
        subtitle: "New preview item",
        details: [detail, "This will be saved in the database later"],
      });
      state.selectedDirectoryIndex = section.items.length - 1;
      state.modal = "";
      render();
    });
    root!.querySelectorAll<HTMLElement>("[data-add-demo]").forEach((button) => {
      button.addEventListener("click", () => {
        const kind = button.getAttribute("data-add-demo") || "file";
        const area = selectedArea();
        const now = new Date();
        const stamp = `${now.toLocaleDateString("de-DE")}, ${now.toLocaleTimeString("de-DE")}`;
        const label = kind === "photo" ? "PHOTO" : kind === "note" ? "NOTE" : "FILE";
        const namePrefix = kind === "photo" ? "Photo" : kind === "note" ? "Note" : kind === "plan" ? "Plan" : "File";
        state.items.push({
          projectId: state.selectedProjectId,
          areaId: kind === "plan" ? "info" : area.id,
          kind,
          badge: label,
          name: `${namePrefix}_${String(state.items.length + 1).padStart(3, "0")}`,
          meta: `${area.name} | ${stamp} | Uploaded by: demo user`,
        });
        state.modal = "";
        render();
      });
    });
  }

  loadPreviewState();
  render();
}

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function colorNameFromValue(value: string) {
  const color = teamColors.find((entry) => entry.value === value)?.name.toLowerCase();
  if (color === "teal" || color === "blue" || color === "red" || color === "purple" || color === "gold") return "green";
  return color || "orange";
}
