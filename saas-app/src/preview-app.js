(function () {
  const projects = [
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

  const directoryData = {
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

  const teamColors = [
    { name: "Teal", value: "#23978f" },
    { name: "Blue", value: "#2f76d2" },
    { name: "Orange", value: "#e67e2f" },
    { name: "Red", value: "#d94f3f" },
    { name: "Pink", value: "#c43878" },
    { name: "Purple", value: "#704bd6" },
    { name: "Green", value: "#509b42" },
    { name: "Gold", value: "#c79a10" },
  ];

  const teamColorPresets = {
    teal: "#23978f",
    blue: "#2f76d2",
    orange: "#e67e2f",
    red: "#d94f3f",
    pink: "#c43878",
    purple: "#704bd6",
    green: "#509b42",
    gold: "#c79a10",
  };

  const teamMemberPool = [
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

  const cleanMemberLabels = {
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

  function memberDisplay(member) {
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
    editingTeamIndex: null,
    editingProjectId: null,
    editingDirectorySection: null,
    editingDirectoryIndex: null,
    items: [],
    plannerEntries: [],
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
        if (directoryData[key] && Array.isArray(value.items)) {
          directoryData[key].items = value.items;
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

  function selectedProject() {
    return projects.find((project) => project.id === state.selectedProjectId) || projects[0];
  }

  function selectedArea() {
    return selectedProject().areas.find((area) => area.id === state.selectedAreaId) || selectedProject().areas[0];
  }

  function filteredProjectAreas(project) {
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
    document.getElementById("app").innerHTML = `
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

  function directorySubtitle(section, index) {
    const subtitles = {
      planner: ["5-day / 7-day week", "Jump to current date", "Red unavailable dates"],
      team: ["#001 | Manager", "#002 | Office", "#003 | Operator"],
      equipment: ["0 active equipment", "0 active equipment", "0 active equipment"],
      clients: ["2 active projects", "1 active project", "No projects yet"],
      settings: ["Drive, license, users", "10 active seats", "Not connected yet"],
      audit: ["Today", "Yesterday", "Older"],
    };
    return subtitles[section]?.[index] || "Preview item";
  }

  function addModalForSection(section) {
    const map = {
      planner: "new-planner-entry",
      team: "new-member",
      equipment: "new-equipment",
      clients: "new-client",
      settings: "new-setting",
      audit: "audit-info",
    };
    return map[section] || section;
  }

  function renderProjectWorkspace(project, area) {
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
    if (state.currentSection === "team") return renderMemberWorkspace(section, selected);
    return `
      <section class="project-workspace directory-workspace">
        <header class="project-hero-card">
          <div>
            <h1>${escapeHtml(section.title)}</h1>
            <p>${escapeHtml(selected?.name || "No item selected")}</p>
            <p>${escapeHtml(selected?.subtitle || "Select one item from the left list.")}</p>
          </div>
          <div class="hero-actions">
            <button data-modal="edit-directory">Edit</button>
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

  function renderMemberWorkspace(section, selected) {
    const details = selected?.details || [];
    const personalNo = parseDetail(details, "Personal No") || selected?.subtitle?.match(/#(\d+)/)?.[1] || "No personal number";
    const email = parseDetail(details, "Email") || "No email";
    const phone = parseDetail(details, "Phone") || parseDetail(details, "Telephone") || "No telephone";
    const position = parseDetail(details, "Position") || selected?.subtitle?.split("|")?.[1]?.trim() || "No position";
    const experience = parseDetail(details, "Experience") || "No experience";
    const userType = parseDetail(details, "User type") || "User";
    const created = parseDetail(details, "Created") || "Preview record";

    return `
      <section class="project-workspace directory-workspace">
        <header class="project-hero-card member-hero-card">
          <div>
            <h1>${escapeHtml(selected?.name || "No member selected")}</h1>
            <p>Personal No: ${escapeHtml(personalNo)} | ${escapeHtml(email)} | ${escapeHtml(phone)}</p>
          </div>
          <div class="hero-actions">
            <button data-modal="edit-directory">Edit</button>
            <button data-archive-directory>Archive</button>
          </div>
        </header>
        <section class="member-profile-grid">
          <article class="content-card member-profile-card">
            <h2>Person Information</h2>
            <div class="profile-field-grid">
              <p><span>Personal No</span><strong>${escapeHtml(personalNo)}</strong></p>
              <p><span>Name</span><strong>${escapeHtml(selected?.name || "-")}</strong></p>
              <p><span>Email</span><strong>${escapeHtml(email)}</strong></p>
              <p><span>Telephone</span><strong>${escapeHtml(phone)}</strong></p>
              <p><span>Position</span><strong>${escapeHtml(position)}</strong></p>
              <p><span>Experience</span><strong>${escapeHtml(experience)}</strong></p>
              <p><span>User type</span><strong>${escapeHtml(userType)}</strong></p>
              <p><span>Created</span><strong>${escapeHtml(created)}</strong></p>
            </div>
          </article>
          <article class="content-card member-profile-card">
            <h2>Company Access</h2>
            <div class="detail-list">
              <p>Member belongs to the company workspace, not to one project.</p>
              <p>Project visibility will come from project/team assignment later.</p>
              <p>Inactive users will not count against the paid license seats.</p>
            </div>
          </article>
        </section>
      </section>
    `;
  }

  function renderPlannerWorkspace() {
    const days = [
      { key: "2026-05-04", label: "Mon", date: "04-May" },
      { key: "2026-05-05", label: "Tue", date: "05-May" },
      { key: "2026-05-06", label: "Wed", date: "06-May" },
      { key: "2026-05-07", label: "Thu", date: "07-May" },
      { key: "2026-05-08", label: "Fri", date: "08-May" },
    ];
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
          ${days.map((day, index) => `
            <article class="planner-day" data-drop-day="${day.label}">
              <strong>${day.label}</strong>
              <span>${day.date}</span>
              <button data-modal="new-planner-entry">+</button>
              ${renderPlannerCardsForDay(day.key)}
              ${index < 2 ? `<p class="planner-card" draggable="true" data-planner-card="${index === 0 ? "0001" : "0003"}">${index === 0 ? "0001 - test2" : "0003 - Ioanninon"}<br><small>${index === 0 ? "Kalyteroi" : "Astrapogianoi"}</small></p>` : ""}
              ${!state.plannerEntries.some((entry) => isDateInRange(day.key, entry.start, entry.end)) && index >= 2 ? `<em>No projects</em>` : ""}
            </article>
          `).join("")}
        </section>
      </section>
    `;
  }

  function renderPlannerCardsForDay(dayKey) {
    return state.plannerEntries
      .filter((entry) => isDateInRange(dayKey, entry.start, entry.end))
      .map((entry) => {
        const project = projects.find((candidate) => candidate.id === entry.projectId) || projects[0];
        return `
          <p class="planner-card" draggable="true" data-planner-card="${escapeHtml(entry.id)}" style="--card-color:${project.color}">
            ${escapeHtml(project.id)} - ${escapeHtml(project.name)}
            <br><small>${escapeHtml(entry.teams.join(", ") || "No team")}</small>
          </p>
        `;
      })
      .join("");
  }

  function isDateInRange(date, start, end) {
    return date >= start && date <= end;
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

  function projectCard(project) {
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

  function renderHero(project) {
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

  function renderAreaTabs(project) {
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

  function renderTeams(project) {
    return `
      <aside class="team-strip">
        <span>Teams</span>
        <button data-modal="service-team" data-new-team>+</button>
        ${project.teams
          .map(
            (team, index) =>
              `<button class="team-pill ${team.color}" data-team-index="${index}" data-modal="service-team">${escapeHtml(team.name)}</button>`
          )
          .join("")}
      </aside>
    `;
  }

  function renderContent(project, area) {
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

  function renderBox(title, badge, name, meta, modal) {
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

  function renderCreatedItems(kind, areaId) {
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

  function renderModal(project, area) {
    if (!state.modal) return "";
    const titleMap = {
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
      "edit-directory": "Edit",
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
    const styleAttr = modalInlineStyle();
    const eyebrow = modalEyebrow(project);
    return `
      <div class="modal-backdrop">
        <section class="action-modal ${modalClass()}" ${styleAttr ? `style="${styleAttr}"` : ""}>
          <div class="modal-head">
            <p class="eyebrow">${escapeHtml(eyebrow)}</p>
            <button data-close type="button">x</button>
          </div>
          ${["service-team", "new-project", "edit-project", "new-member", "new-equipment", "new-client", "new-planner-entry", "new-setting", "edit-directory"].includes(state.modal) ? "" : `<h2>${title}</h2>`}
          ${modalBody(project, area)}
        </section>
      </div>
    `;
  }

  function modalEyebrow(project) {
    // Company-level sections (team members, clients, equipment, settings, audit) must not show the selected project name.
    const companyTitle = "Company workspace";
    const companyModals = new Set([
      "new-member",
      "new-client",
      "new-equipment",
      "new-setting",
      "audit-info",
      "planner",
      "new-planner-entry",
      "team",
      "clients",
      "equipment",
      "settings",
      "audit",
      "edit-directory",
    ]);

    if (companyModals.has(state.modal)) return companyTitle;
    if (directoryData[state.modal]) return companyTitle;
    if (state.currentSection && state.currentSection !== "projects") return companyTitle;
    return project?.name || companyTitle;
  }

  function modalInlineStyle() {
    if (state.modal === "service-team") {
      const project = selectedProject();
      const team = typeof state.editingTeamIndex === "number" ? project.teams[state.editingTeamIndex] : null;
      const color = team?.colorHex || (team?.color ? teamColorPresets[team.color] : "") || "#e67e2f";
      return `--modal-accent:${color}`;
    }
    if (state.modal === "new-project" || state.modal === "edit-project") {
      const project = state.modal === "edit-project" ? selectedProject() : null;
      const base = project?.color || teamColors[0]?.value || "#d8664c";
      return `--modal-accent:${base}`;
    }
    if (["new-member", "new-client", "new-equipment", "new-setting", "edit-directory"].includes(state.modal)) {
      const map = {
        team: "#79bd91",
        clients: "#0d7a73",
        equipment: "#df7724",
        settings: "#0d7a73",
        audit: "#0d7a73",
      };
      const key = state.modal === "edit-directory" ? state.editingDirectorySection : state.currentSection;
      return `--modal-accent:${map[key] || "#0d7a73"}`;
    }
    return "";
  }

  function modalClass() {
    if (state.modal === "service-team") return "team-editor-modal";
    if (state.modal === "new-project" || state.modal === "edit-project") return "project-editor-modal";
    if (["new-member", "new-equipment", "new-client", "new-planner-entry", "new-setting", "edit-directory"].includes(state.modal)) return "member-editor-modal";
    return "";
  }

  function modalBody(project, area) {
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
    if (state.modal === "edit-project") {
      return renderProjectForm(selectedProject());
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
      return renderSettingForm();
    }
    if (state.modal === "audit-info") {
      return `<p>The audit log is created automatically by system actions. It is not added manually.</p><button class="primary-action" data-close>OK</button>`;
    }
    if (state.modal === "new-area") {
      const floors = [...new Set(selectedProject().areas.map((entry) => entry.floor).filter(Boolean))];
      return `
        <div class="compact-modal-title">
          <h2>Add area</h2>
          <p>Create a new area and connect it to a floor.</p>
        </div>
        <section class="form-panel">
          <div class="form-row two">
            <label>Area name<input data-area-name placeholder="Bathroom"></label>
            <label>Floor
              <select data-area-floor-select>
                <option value="">Select floor</option>
                ${floors.map((floor) => `<option value="${escapeHtml(floor)}">${escapeHtml(floor)}</option>`).join("")}
                <option value="__new__">+ New floor</option>
              </select>
            </label>
          </div>
          <label class="new-floor-row hidden">New floor name<input data-area-floor-new placeholder="1st floor"></label>
        </section>
        <div class="modal-footer">
          <button data-close>Cancel</button>
          <button class="primary-action" data-add-area>Create area</button>
        </div>
      `;
    }
    if (state.modal === "edit-directory") {
      const key = state.editingDirectorySection || state.currentSection;
      const section = directoryData[key];
      const item = section?.items[state.editingDirectoryIndex] || section?.items[state.selectedDirectoryIndex];
      if (key === "team") return renderMemberForm(item);
      if (key === "clients") return renderClientForm(item);
      if (key === "equipment") return renderEquipmentForm(item);
      if (key === "settings") return renderSettingForm(item);
      return `
        <div class="compact-modal-title">
          <h2>Edit</h2>
          <p>Select an item from the left list first.</p>
        </div>
        <div class="modal-footer"><button class="primary-action" data-close>OK</button></div>
      `;
    }
    if (state.modal === "project-menu") {
      return `
        <div class="choice-row">
          <button data-modal="edit-project">Edit project</button>
          <button class="danger-action" data-archive-project>Archive project</button>
          <button data-close>Cancel</button>
        </div>
      `;
    }
    if (directoryData[state.modal]) {
      return `
        <div class="compact-modal-title">
          <h2>${escapeHtml(directoryData[state.modal].title)}</h2>
          <p>This section uses its dedicated add/edit form in the preview.</p>
        </div>
        <div class="modal-footer"><button class="primary-action" data-close>OK</button></div>
      `;
    }
    return `<p>This section is connected as a preview. Real data comes with Supabase.</p><button class="primary-action" data-close>OK</button>`;
  }

  function renderServiceTeamForm() {
    const project = selectedProject();
    const editingIndex = typeof state.editingTeamIndex === "number" ? state.editingTeamIndex : null;
    const editingTeam = editingIndex !== null ? project.teams[editingIndex] : null;
    const presetColor = editingTeam?.colorHex || (editingTeam?.color ? teamColorPresets[editingTeam.color] : "") || "";
    return `
      <div class="team-modal-title">
        <button class="collapse-cue" type="button">&#8963;</button>
        <div>
          <h2>Service Team</h2>
          <h3>${editingTeam ? escapeHtml(editingTeam.name) : "New team"}</h3>
        </div>
      </div>
      <label>Service Team name<input data-team-name placeholder="Team name" value="${editingTeam ? escapeHtml(editingTeam.name) : ""}"></label>
      <section class="form-panel">
        <h3>Team Color</h3>
        <p>Choose a strong color for this team.</p>
        <div class="color-grid">
          ${teamColors.map((color, index) => `
            <label class="color-choice" title="${color.name}">
              <input type="radio" name="team-color" value="${color.value}" ${(presetColor ? presetColor === color.value : index === 2) ? "checked" : ""}>
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
        ${editingTeam ? `<button class="danger-action" data-delete-team>Delete</button>` : `<span></span>`}
        <button class="primary-action" data-save-team>${editingTeam ? "Save changes" : "Save"}</button>
      </div>
    `;
  }

  function parseDetail(details, prefix) {
    const row = (details || []).find((entry) => String(entry).toLowerCase().startsWith(prefix.toLowerCase()));
    if (!row) return "";
    const parts = String(row).split(":");
    return parts.length > 1 ? parts.slice(1).join(":").trim() : "";
  }

  function renderMemberForm(existing) {
    const isEdit = Boolean(existing);
    const nextNo = String(directoryData.team.items.length + 1).padStart(3, "0");
    const fullName = existing?.name || "";
    const [firstName = "", ...rest] = fullName.split(" ");
    const surname = rest.join(" ").trim();
    const no = isEdit ? (parseDetail(existing.details, "Personal No") || existing.subtitle?.match(/#(\d+)/)?.[1] || nextNo) : nextNo;
    const phone = isEdit ? (parseDetail(existing.details, "Phone") || parseDetail(existing.details, "Telephone") || "") : "";
    const email = isEdit ? (parseDetail(existing.details, "Email") || "") : "";
    const positionFromSubtitle = existing?.subtitle?.split("|")?.[1]?.trim() || "";
    const position = isEdit ? (parseDetail(existing.details, "Position") || positionFromSubtitle) : "";
    const experience = isEdit ? (parseDetail(existing.details, "Experience") || "No experience") : "No experience";
    const userType = isEdit ? (parseDetail(existing.details, "User type") || "User") : "User";
    return `
      <div class="compact-modal-title">
        <h2>${isEdit ? `Edit Member` : `New Member`}</h2>
        <p>Create a person for the company. This is not a Service Team.</p>
      </div>
      <section class="form-panel member-form-panel">
        <div class="form-row four">
          <label>Personal No<input data-member-no value="${escapeHtml(no)}"></label>
          <label>Name<input data-member-name placeholder="Name" value="${escapeHtml(firstName)}"></label>
          <label>Surname<input data-member-surname placeholder="Surname" value="${escapeHtml(surname)}"></label>
          <label>Telephone<input data-member-phone placeholder="Telephone number" value="${escapeHtml(phone)}"></label>
        </div>
        <div class="form-row four">
          <label>Email<input data-member-email placeholder="Email" value="${escapeHtml(email)}"></label>
          <label>Experience<select data-member-experience>
            <option ${experience === "No experience" ? "selected" : ""}>No experience</option>
            <option ${experience === "1 star" ? "selected" : ""}>1 star</option>
            <option ${experience === "2 stars" ? "selected" : ""}>2 stars</option>
            <option ${experience === "3 stars" ? "selected" : ""}>3 stars</option>
          </select></label>
          <label>Position<select data-member-position>
            <option ${!position ? "selected" : ""}>No position</option>
            <option ${position === "Office" ? "selected" : ""}>Office</option>
            <option ${position === "Operator" ? "selected" : ""}>Operator</option>
            <option ${position === "Manager" ? "selected" : ""}>Manager</option>
          </select></label>
          <label>User type<select data-member-role>
            <option ${userType === "User" ? "selected" : ""}>User</option>
            <option ${userType === "Admin" ? "selected" : ""}>Admin</option>
          </select></label>
        </div>
      </section>
      <div class="modal-footer">
        <button data-close>Cancel</button>
        <button class="primary-action" data-save-member>${isEdit ? "Save changes" : "Add"}</button>
      </div>
    `;
  }

  function renderEquipmentForm(existing) {
    const isEdit = Boolean(existing);
    const name = existing?.name || "";
    const category = existing?.subtitle || "No category";
    const detail = (existing?.details || []).find((entry) => String(entry).toLowerCase().startsWith("category:"))
      ? ""
      : (existing?.details || [])[0] || "";
    return `
      <div class="compact-modal-title">
        <h2>${isEdit ? "Edit Equipment" : "New Equipment"}</h2>
        <p>Add a reusable tool, machine, vehicle, or PPE item.</p>
      </div>
      <section class="form-panel">
        <div class="form-row three">
          <label>Equipment name<input data-equipment-name placeholder="Hammer drill" value="${escapeHtml(name)}"></label>
          <label>Category<select data-equipment-category>
            <option ${category === "Electrical tools" ? "selected" : ""}>Electrical tools</option>
            <option ${category === "Machines" ? "selected" : ""}>Machines</option>
            <option ${category === "Vehicles" ? "selected" : ""}>Vehicles</option>
            <option ${category === "No category" ? "selected" : ""}>No category</option>
          </select></label>
          <label>Internal No<input placeholder="EQ-001"></label>
        </div>
        <label>Notes<input data-equipment-detail placeholder="Short equipment information" value="${escapeHtml(detail)}"></label>
      </section>
      <div class="modal-footer"><button data-close>Cancel</button><button class="primary-action" data-save-equipment>${isEdit ? "Save changes" : "Add equipment"}</button></div>
    `;
  }

  function renderClientForm(existing) {
    const isEdit = Boolean(existing);
    const name = existing?.name || "";
    const company = parseDetail(existing?.details, "Company") || "";
    const phone = parseDetail(existing?.details, "Phone") || parseDetail(existing?.details, "Telephone") || "";
    const email = parseDetail(existing?.details, "Email") || "";
    const address = parseDetail(existing?.details, "Address") || "";
    return `
      <div class="compact-modal-title">
        <h2>${isEdit ? "Edit Client" : "New Client"}</h2>
        <p>Create the customer record first, then connect projects.</p>
      </div>
      <section class="form-panel">
        <div class="form-row three">
          <label>Client name<input data-client-name placeholder="Client name" value="${escapeHtml(name)}"></label>
          <label>Company<input data-client-company placeholder="Company" value="${escapeHtml(company)}"></label>
          <label>Telephone<input data-client-phone placeholder="Telephone" value="${escapeHtml(phone)}"></label>
        </div>
        <div class="form-row">
          <label>Email<input data-client-email placeholder="Email" value="${escapeHtml(email)}"></label>
          <label>Address<input data-client-address placeholder="Address" value="${escapeHtml(address)}"></label>
        </div>
      </section>
      <div class="modal-footer"><button data-close>Cancel</button><button class="primary-action" data-save-client>${isEdit ? "Save changes" : "Add client"}</button></div>
    `;
  }

  function renderSettingForm(existing) {
    const isEdit = Boolean(existing);
    const title = existing?.name || "Company";
    const subtitle = existing?.subtitle || "Drive, license, users";
    const timezone = parseDetail(existing?.details, "Timezone") || "Europe/Vienna";
    const seats = parseDetail(existing?.details, "Active seats") || parseDetail(existing?.details, "License") || "10";
    const drive = parseDetail(existing?.details, "Google Drive") || (title === "Google Drive" ? subtitle : "Not connected yet");
    return `
      <div class="compact-modal-title">
        <h2>${isEdit ? "Edit Setting" : "Company Setting"}</h2>
        <p>Company-wide configuration for the future online version.</p>
      </div>
      <section class="form-panel">
        <div class="form-row two">
          <label>Setting name<input data-setting-name placeholder="Company" value="${escapeHtml(title)}"></label>
          <label>Status<input data-setting-status placeholder="Drive, license, users" value="${escapeHtml(subtitle)}"></label>
        </div>
        <div class="form-row three">
          <label>Timezone<select data-setting-timezone>
            <option ${timezone === "Europe/Vienna" ? "selected" : ""}>Europe/Vienna</option>
            <option ${timezone === "Europe/Berlin" ? "selected" : ""}>Europe/Berlin</option>
            <option ${timezone === "Europe/Athens" ? "selected" : ""}>Europe/Athens</option>
          </select></label>
          <label>Active seats<input data-setting-seats type="number" min="1" value="${escapeHtml(seats.replace(/\D+/g, "") || "10")}"></label>
          <label>Google Drive<input data-setting-drive placeholder="Not connected yet" value="${escapeHtml(drive)}"></label>
        </div>
      </section>
      <div class="modal-footer">
        <button data-close>Cancel</button>
        <button class="primary-action" data-save-setting>${isEdit ? "Save changes" : "Save setting"}</button>
      </div>
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
          <label>Start date<input data-planner-start type="date" value="2026-05-04"></label>
          <label>End date<input data-planner-end type="date" value="2026-05-04"></label>
          <label>Project<select data-planner-project>${projects.filter((project) => !project.archived).map((project) => `<option value="${project.id}">${project.id} - ${escapeHtml(project.name)}</option>`).join("")}</select></label>
        </div>
        <div class="member-select-grid small">
          ${selectedProject().teams.map((team, index) => `
            <label class="member-select-card ${index === 0 ? "selected" : ""}">
              <input data-planner-team type="checkbox" value="${escapeHtml(team.name)}" ${index === 0 ? "checked" : ""}>
              <strong>${escapeHtml(team.name)}</strong>
              <small>Available team</small>
            </label>
          `).join("") || `<p>No service teams in selected project yet.</p>`}
        </div>
      </section>
      <div class="modal-footer"><button data-close>Cancel</button><button class="primary-action" data-save-planner>Add to planner</button></div>
    `;
  }

  function renderProjectForm(project) {
    const isEdit = Boolean(project);
    const floors = project ? [...new Set(project.areas.map((entry) => entry.floor).filter(Boolean))] : [];
    return `
      <div class="team-modal-title">
        <button class="collapse-cue project-cue" type="button">+</button>
        <div>
          <h2>Project</h2>
          <h3>${isEdit ? `${escapeHtml(project.id)} - ${escapeHtml(project.name)}` : "New project"}</h3>
        </div>
      </div>
      <section class="form-panel">
        <div class="form-row three">
          <label>Project number<input data-project-number placeholder="0004" value="${isEdit ? escapeHtml(project.id) : ""}" ${isEdit ? "disabled" : ""}></label>
          <label>Project name<input data-project-name placeholder="Bathroom renovation" value="${isEdit ? escapeHtml(project.name) : ""}"></label>
          <label>Start date<input data-project-start type="date" value="${isEdit ? escapeHtml(project.start) : "2026-05-03"}"></label>
        </div>
        <label>Address<input data-project-address placeholder="Street, city" value="${isEdit ? escapeHtml(project.address) : ""}"></label>
        <div class="form-row">
          <label>Client<input data-project-client placeholder="Client name" value="${isEdit ? escapeHtml(project.client) : ""}"></label>
          <label>Project manager<input data-project-manager placeholder="Manager" value="${isEdit ? escapeHtml(project.manager) : ""}"></label>
        </div>
      </section>
      <section class="form-panel">
        <h3>Project Color</h3>
        <p>This color appears in the project list and planner.</p>
        <div class="color-grid">
          ${teamColors.map((color, index) => `
            <label class="color-choice" title="${color.name}">
              <input type="radio" name="project-color" value="${color.value}" ${(isEdit ? project.color === color.value : index === 0) ? "checked" : ""}>
              <span style="--choice:${color.value}"></span>
            </label>
          `).join("")}
        </div>
      </section>
      <section class="form-panel">
        <h3>${isEdit ? "Add area" : "First area"}</h3>
        <p>${isEdit ? "Add another area to the project." : "Add floors and areas now, or create them later inside the project."}</p>
        <div class="form-row two">
          <label>Area name<input data-project-first-area placeholder="Bathroom"></label>
          <label>Floor
            <select data-project-first-floor-select>
              <option value="">Select floor</option>
              ${floors.map((floor) => `<option value="${escapeHtml(floor)}">${escapeHtml(floor)}</option>`).join("")}
              <option value="__new__">+ New floor</option>
            </select>
          </label>
        </div>
        <label class="project-new-floor-row hidden">New floor name<input data-project-first-floor-new placeholder="1st floor"></label>
      </section>
      <div class="modal-footer">
        <button data-close>Cancel</button>
        <button class="primary-action" data-add-project>${isEdit ? "Save changes" : "Save project"}</button>
      </div>
    `;
  }

  function bindEvents() {
    document.querySelectorAll("[data-project]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedProjectId = button.getAttribute("data-project");
        state.selectedAreaId = "info";
        render();
      });
    });
    document.querySelectorAll("[data-section]").forEach((button) => {
      button.addEventListener("click", () => {
        state.currentSection = button.getAttribute("data-section") || "projects";
        state.modal = "";
        state.search = "";
        state.selectedDirectoryIndex = 0;
        render();
      });
    });
    document.querySelectorAll("[data-directory-index]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedDirectoryIndex = Number(button.getAttribute("data-directory-index")) || 0;
        render();
      });
    });
    document.querySelectorAll("[data-toggle-rail]").forEach((button) => {
      button.addEventListener("click", () => {
        state.sideCollapsed = !state.sideCollapsed;
        render();
      });
    });
    document.querySelector("[data-archive-directory]")?.addEventListener("click", () => {
      const section = directoryData[state.currentSection];
      const item = section?.items[state.selectedDirectoryIndex];
      if (!item) return;
      if (confirm(`Archive ${item.name}?`)) {
        item.archived = true;
        state.selectedDirectoryIndex = 0;
        render();
      }
    });
    document.querySelectorAll("[data-restore-directory]").forEach((button) => {
      button.addEventListener("click", () => {
        const section = directoryData[state.currentSection];
        const item = section?.items[Number(button.getAttribute("data-restore-directory")) || 0];
        if (!item) return;
        item.archived = false;
        state.selectedDirectoryIndex = section.items.indexOf(item);
        render();
      });
    });
    document.querySelector("[data-archive-project]")?.addEventListener("click", () => {
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
    document.querySelectorAll("[data-restore-project]").forEach((button) => {
      button.addEventListener("click", () => {
        const project = projects.find((candidate) => candidate.id === button.getAttribute("data-restore-project"));
        if (!project) return;
        project.archived = false;
        state.selectedProjectId = project.id;
        state.selectedAreaId = "info";
        render();
      });
    });
    document.querySelectorAll("[data-planner-card]").forEach((card) => {
      card.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("text/plain", card.getAttribute("data-planner-card") || "");
      });
    });
    document.querySelectorAll("[data-drop-day]").forEach((day) => {
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
        const card = document.querySelector(`[data-planner-card="${id}"]`);
        if (card) day.appendChild(card);
      });
    });
    document.querySelectorAll("[data-area]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedAreaId = button.getAttribute("data-area");
        render();
      });
    });
    document.querySelectorAll("[data-modal]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const modal = button.getAttribute("data-modal");
        if (modal === "service-team") {
          const idxRaw = button.getAttribute("data-team-index");
          state.editingTeamIndex = idxRaw != null ? Number(idxRaw) : null;
          if (button.hasAttribute("data-new-team")) state.editingTeamIndex = null;
        }
        if (modal === "new-project") state.editingProjectId = null;
        if (modal === "edit-project") state.editingProjectId = state.selectedProjectId;
        if (modal === "edit-directory") {
          state.editingDirectorySection = state.currentSection;
          state.editingDirectoryIndex = state.selectedDirectoryIndex;
        }
        state.modal = modal;
        render();
      });
    });
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        state.viewMode = button.getAttribute("data-view") || "list";
        render();
      });
    });
    document.querySelectorAll("[data-close]").forEach((button) => {
      button.addEventListener("click", () => {
        state.modal = "";
        state.editingProjectId = null;
        state.editingTeamIndex = null;
        state.editingDirectorySection = null;
        state.editingDirectoryIndex = null;
        render();
      });
    });
    document.querySelector("[data-apply-filter]")?.addEventListener("click", () => {
      state.floorFilter = document.querySelector("[data-floor-filter]")?.value || "";
      state.areaFilter = document.querySelector("[data-area-filter]")?.value || "";
      const visibleAreas = filteredProjectAreas(selectedProject());
      if (!visibleAreas.some((area) => area.id === state.selectedAreaId)) {
        state.selectedAreaId = visibleAreas[0]?.id || "info";
      }
      state.modal = "";
      render();
    });
    document.querySelector("[data-reset-filter]")?.addEventListener("click", () => {
      state.floorFilter = "";
      state.areaFilter = "";
      state.modal = "";
      render();
    });
    document.querySelector("[data-search]")?.addEventListener("input", (event) => {
      state.search = event.target.value;
      render();
    });
    document.querySelector("[data-area-floor-select]")?.addEventListener("change", (event) => {
      const row = document.querySelector(".new-floor-row");
      if (!row) return;
      if (event.target.value === "__new__") row.classList.remove("hidden");
      else row.classList.add("hidden");
    });
    document.querySelector("[data-project-first-floor-select]")?.addEventListener("change", (event) => {
      const row = document.querySelector(".project-new-floor-row");
      if (!row) return;
      if (event.target.value === "__new__") row.classList.remove("hidden");
      else row.classList.add("hidden");
    });

    // Live color preview in modals (service team + project).
    document.querySelectorAll("input[name='team-color']").forEach((input) => {
      input.addEventListener("change", () => {
        const modal = document.querySelector(".action-modal");
        const colorValue = document.querySelector("input[name='team-color']:checked")?.value || "#e67e2f";
        modal?.style?.setProperty("--modal-accent", colorValue);
      });
    });
    document.querySelectorAll("input[name='project-color']").forEach((input) => {
      input.addEventListener("change", () => {
        const modal = document.querySelector(".action-modal");
        const colorValue = document.querySelector("input[name='project-color']:checked")?.value || "#d8664c";
        modal?.style?.setProperty("--modal-accent", colorValue);
      });
    });
    document.querySelector("[data-add-area]")?.addEventListener("click", () => {
      const project = selectedProject();
      const areaName = document.querySelector("[data-area-name]")?.value?.trim() || "New area";
      const floorSelect = document.querySelector("[data-area-floor-select]")?.value || "";
      const floorNew = document.querySelector("[data-area-floor-new]")?.value?.trim() || "";
      const areaFloor = (floorSelect === "__new__" ? floorNew : floorSelect) || "No floor";
      const id = `area-${project.areas.length + 1}`;
      project.areas.push({ id, name: areaName, floor: areaFloor });
      state.selectedAreaId = id;
      state.modal = "";
      render();
    });
    document.querySelector("[data-save-team]")?.addEventListener("click", () => {
      const project = selectedProject();
      const name = document.querySelector("[data-team-name]")?.value?.trim() || "New team";
      const colorValue = document.querySelector("input[name='team-color']:checked")?.value || "#e67e2f";
      const payload = {
        name,
        color: colorNameFromValue(colorValue),
        colorHex: colorValue,
      };

      if (typeof state.editingTeamIndex === "number" && project.teams[state.editingTeamIndex]) {
        project.teams[state.editingTeamIndex] = { ...project.teams[state.editingTeamIndex], ...payload };
      } else {
        project.teams.push(payload);
      }
      state.modal = "";
      render();
    });
    document.querySelector("[data-delete-team]")?.addEventListener("click", () => {
      const project = selectedProject();
      if (typeof state.editingTeamIndex === "number" && project.teams[state.editingTeamIndex]) {
        if (!confirm("Delete this Service Team?")) return;
        project.teams.splice(state.editingTeamIndex, 1);
      }
      state.modal = "";
      state.editingTeamIndex = null;
      render();
    });
    document.querySelector("[data-save-member]")?.addEventListener("click", () => {
      const no = document.querySelector("[data-member-no]")?.value || String(directoryData.team.items.length + 1).padStart(3, "0");
      const name = document.querySelector("[data-member-name]")?.value || "New";
      const surname = document.querySelector("[data-member-surname]")?.value || "Member";
      const phone = document.querySelector("[data-member-phone]")?.value || "No telephone";
      const email = document.querySelector("[data-member-email]")?.value || "No email";
      const position = document.querySelector("[data-member-position]")?.value || "No position";
      const experience = document.querySelector("[data-member-experience]")?.value || "No experience";
      const userType = document.querySelector("[data-member-role]")?.value || "User";
      const payload = {
        name: `${name} ${surname}`,
        subtitle: `#${no} | ${position}`,
        details: [
          `Personal No: ${no}`,
          `Email: ${email}`,
          `Phone: ${phone}`,
          `Position: ${position}`,
          `Experience: ${experience}`,
          `User type: ${userType}`,
          `Created: ${new Date().toISOString()}`,
        ],
      };
      if (state.modal === "edit-directory" && state.editingDirectorySection === "team" && typeof state.editingDirectoryIndex === "number") {
        directoryData.team.items[state.editingDirectoryIndex] = { ...directoryData.team.items[state.editingDirectoryIndex], ...payload };
        state.selectedDirectoryIndex = state.editingDirectoryIndex;
      } else {
        directoryData.team.items.push(payload);
        state.currentSection = "team";
        state.selectedDirectoryIndex = directoryData.team.items.length - 1;
      }
      state.modal = "";
      state.editingDirectorySection = null;
      state.editingDirectoryIndex = null;
      render();
    });
    document.querySelector("[data-save-equipment]")?.addEventListener("click", () => {
      const name = document.querySelector("[data-equipment-name]")?.value || "New equipment";
      const category = document.querySelector("[data-equipment-category]")?.value || "No category";
      const detail = document.querySelector("[data-equipment-detail]")?.value || "No details yet";
      const payload = { name, subtitle: category, details: [`Category: ${category}`, detail] };
      if (state.modal === "edit-directory" && state.editingDirectorySection === "equipment" && typeof state.editingDirectoryIndex === "number") {
        directoryData.equipment.items[state.editingDirectoryIndex] = { ...directoryData.equipment.items[state.editingDirectoryIndex], ...payload };
        state.selectedDirectoryIndex = state.editingDirectoryIndex;
      } else {
        directoryData.equipment.items.push(payload);
        state.currentSection = "equipment";
        state.selectedDirectoryIndex = directoryData.equipment.items.length - 1;
      }
      state.modal = "";
      state.editingDirectorySection = null;
      state.editingDirectoryIndex = null;
      render();
    });
    document.querySelector("[data-save-client]")?.addEventListener("click", () => {
      const name = document.querySelector("[data-client-name]")?.value || "New client";
      const company = document.querySelector("[data-client-company]")?.value || "No company";
      const phone = document.querySelector("[data-client-phone]")?.value || "No telephone";
      const email = document.querySelector("[data-client-email]")?.value || "No email";
      const address = document.querySelector("[data-client-address]")?.value || "No address";
      const payload = { name, subtitle: company, details: [`Company: ${company}`, `Email: ${email}`, `Phone: ${phone}`, `Address: ${address}`] };
      if (state.modal === "edit-directory" && state.editingDirectorySection === "clients" && typeof state.editingDirectoryIndex === "number") {
        directoryData.clients.items[state.editingDirectoryIndex] = { ...directoryData.clients.items[state.editingDirectoryIndex], ...payload };
        state.selectedDirectoryIndex = state.editingDirectoryIndex;
      } else {
        directoryData.clients.items.push(payload);
        state.currentSection = "clients";
        state.selectedDirectoryIndex = directoryData.clients.items.length - 1;
      }
      state.modal = "";
      state.editingDirectorySection = null;
      state.editingDirectoryIndex = null;
      render();
    });
    document.querySelector("[data-save-setting]")?.addEventListener("click", () => {
      const name = document.querySelector("[data-setting-name]")?.value || "Company";
      const status = document.querySelector("[data-setting-status]")?.value || "Company setting";
      const timezone = document.querySelector("[data-setting-timezone]")?.value || "Europe/Vienna";
      const seats = document.querySelector("[data-setting-seats]")?.value || "10";
      const drive = document.querySelector("[data-setting-drive]")?.value || "Not connected yet";
      const payload = {
        name,
        subtitle: status,
        details: [`Timezone: ${timezone}`, `Active seats: ${seats}`, `Google Drive: ${drive}`],
      };
      if (state.modal === "edit-directory" && state.editingDirectorySection === "settings" && typeof state.editingDirectoryIndex === "number") {
        directoryData.settings.items[state.editingDirectoryIndex] = { ...directoryData.settings.items[state.editingDirectoryIndex], ...payload };
        state.selectedDirectoryIndex = state.editingDirectoryIndex;
      } else {
        directoryData.settings.items.push(payload);
        state.currentSection = "settings";
        state.selectedDirectoryIndex = directoryData.settings.items.length - 1;
      }
      state.modal = "";
      state.editingDirectorySection = null;
      state.editingDirectoryIndex = null;
      render();
    });
    document.querySelector("[data-save-planner]")?.addEventListener("click", () => {
      const start = document.querySelector("[data-planner-start]")?.value || "2026-05-04";
      const endRaw = document.querySelector("[data-planner-end]")?.value || start;
      const projectId = document.querySelector("[data-planner-project]")?.value || selectedProject().id;
      const teams = [...document.querySelectorAll("[data-planner-team]:checked")].map((input) => input.value);
      const end = endRaw < start ? start : endRaw;
      state.plannerEntries.push({
        id: `plan-${Date.now()}`,
        projectId,
        start,
        end,
        teams,
      });
      state.currentSection = "planner";
      state.modal = "";
      render();
    });
    document.querySelector("[data-add-project]")?.addEventListener("click", () => {
      const id = document.querySelector("[data-project-number]")?.value || String(projects.length).padStart(4, "0");
      const name = document.querySelector("[data-project-name]")?.value || "New project";
      const start = document.querySelector("[data-project-start]")?.value || "2026-05-03";
      const address = document.querySelector("[data-project-address]")?.value || "New address";
      const client = document.querySelector("[data-project-client]")?.value || "New client";
      const manager = document.querySelector("[data-project-manager]")?.value || "Company admin";
      const firstArea = document.querySelector("[data-project-first-area]")?.value || "";
      const firstFloorSelect = document.querySelector("[data-project-first-floor-select]")?.value || "";
      const firstFloorNew = document.querySelector("[data-project-first-floor-new]")?.value?.trim() || "";
      const firstFloor = (firstFloorSelect === "__new__" ? firstFloorNew : firstFloorSelect) || "";
      const colorValue = document.querySelector("input[name='project-color']:checked")?.value || "#dff4f5";

      const editing = typeof state.editingProjectId === "string" ? projects.find((p) => p.id === state.editingProjectId) : null;
      if (editing) {
        editing.name = name;
        editing.start = start;
        editing.address = address;
        editing.client = client;
        editing.manager = manager;
        editing.color = colorValue;
        if (firstArea.trim()) {
          editing.areas.push({ id: `area-${editing.areas.length}`, name: firstArea.trim(), floor: firstFloor.trim() || "No floor" });
        }
        state.selectedProjectId = editing.id;
      } else {
        const areas = [{ id: "info", name: "Info", floor: "" }];
        if (firstArea.trim()) {
          areas.push({ id: "area-1", name: firstArea.trim(), floor: firstFloor.trim() || "No floor" });
        }
        projects.unshift({
          id,
          name,
          address,
          client,
          manager,
          start,
          color: colorValue,
          areas,
          teams: [],
        });
        state.selectedProjectId = id;
      }
      state.selectedAreaId = "info";
      state.modal = "";
      state.editingProjectId = null;
      render();
    });
    document.querySelectorAll("[data-add-demo]").forEach((button) => {
      button.addEventListener("click", () => {
        const kind = button.getAttribute("data-add-demo");
        const area = selectedArea();
        const project = selectedProject();
        const now = new Date();
        const stamp = now.toLocaleDateString("de-DE") + ", " + now.toLocaleTimeString("de-DE");
        const label = kind === "photo" ? "PHOTO" : kind === "note" ? "NOTE" : "FILE";
        const namePrefix = kind === "photo" ? "Photo" : kind === "note" ? "Note" : kind === "plan" ? "Plan" : "File";
        const activeTeam = project.teams[0]?.name || "No team";
        const areaLabel = kind === "plan" ? "Project info" : area.name;
        const floorLabel = kind === "plan" ? "" : (area.floor ? ` | ${area.floor}` : "");
        state.items.push({
          projectId: state.selectedProjectId,
          areaId: kind === "plan" ? "info" : area.id,
          kind,
          badge: label,
          name: `${namePrefix}_${String(state.items.length + 1).padStart(3, "0")}`,
          meta: `${areaLabel}${floorLabel} | ${stamp} | Team: ${activeTeam} | User: Demo`,
        });
        state.modal = "";
        render();
      });
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function colorNameFromValue(value) {
    const color = teamColors.find((entry) => entry.value === value)?.name.toLowerCase();
    // Keep exact names when we have matching CSS classes; otherwise fallback.
    if (!color) return "orange";
    if (["teal", "blue", "orange", "red", "pink", "purple", "green", "gold"].includes(color)) return color;
    return "orange";
  }

  loadPreviewState();
  render();
})();
