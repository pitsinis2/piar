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

  const state = {
    selectedProjectId: "0001",
    selectedAreaId: "info",
    search: "",
    modal: "",
    viewMode: "list",
    items: [],
  };

  function selectedProject() {
    return projects.find((project) => project.id === state.selectedProjectId) || projects[0];
  }

  function selectedArea() {
    return selectedProject().areas.find((area) => area.id === state.selectedAreaId) || selectedProject().areas[0];
  }

  function render() {
    const project = selectedProject();
    const area = selectedArea();
    document.getElementById("app").innerHTML = `
      <main class="saas-workspace">
        ${renderRail()}
        ${renderProjectRail()}
        <section class="project-workspace">
          ${renderHero(project)}
          ${renderAreaTabs(project)}
          <div class="project-content">
            ${renderTeams(project)}
            ${renderContent(project, area)}
          </div>
        </section>
        ${renderModal(project, area)}
      </main>
    `;
    bindEvents();
  }

  function renderRail() {
    return `
      <aside class="saas-sidebar">
        <div class="brand-pill">Pi.AR</div>
        <button class="rail-tab active" data-modal="projects">Projects</button>
        <button class="rail-tab" data-modal="planner">Planner</button>
        <button class="rail-tab" data-modal="team">Team</button>
        <button class="rail-tab" data-modal="settings">Settings</button>
      </aside>
    `;
  }

  function renderProjectRail() {
    const query = state.search.trim().toLowerCase();
    const list = projects.filter((project) => !query || project.name.toLowerCase().includes(query) || project.id.includes(query));
    return `
      <section class="project-rail">
        <label class="search-shell">
          <input data-search type="search" placeholder="Search project" value="${escapeHtml(state.search)}">
        </label>
        <section class="rail-panel">
          <div class="panel-title">
            <h2>Active Projects</h2>
            <button data-modal="new-project">+</button>
          </div>
          ${list.map(projectCard).join("")}
          <section class="mini-archive">
            <h3>Archived Projects</h3>
            <p>No archived projects yet.</p>
          </section>
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
        </div>
        <div class="hero-actions">
          <button data-modal="chat">Chat Room</button>
          <button data-modal="notifications">Bell</button>
        </div>
      </header>
    `;
  }

  function renderAreaTabs(project) {
    return `
      <nav class="area-tabs">
        ${project.areas.map((area) => `
          <button class="${area.id === state.selectedAreaId ? "active" : ""}" data-area="${area.id}">
            ${area.floor ? `${escapeHtml(area.name)} - ${escapeHtml(area.floor)}` : escapeHtml(area.name)}
          </button>
        `).join("")}
        <button data-modal="new-area">+</button>
        <button class="filter-btn" data-modal="filter">Filter</button>
      </nav>
    `;
  }

  function renderTeams(project) {
    return `
      <aside class="team-strip">
        <span>Teams</span>
        <button data-modal="team">+</button>
        ${project.teams.map((team) => `<button class="team-pill ${team.color}" data-modal="team">${escapeHtml(team.name)}</button>`).join("")}
      </aside>
    `;
  }

  function renderContent(project, area) {
    const inInfo = area.id === "info";
    return `
      <section class="content-grid ${state.viewMode === "grid" ? "grid-mode" : "list-mode"}">
        ${inInfo ? renderPlans(project) : ""}
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
      team: "Service Team",
      planner: "Planner",
      settings: "Settings",
      projects: "Projects",
      "project-menu": "Project options",
    };
    const title = titleMap[state.modal] || "Action";
    return `
      <div class="modal-backdrop">
        <section class="action-modal">
          <div class="modal-head">
            <p class="eyebrow">${escapeHtml(project.name)}</p>
            <button data-close type="button">x</button>
          </div>
          <h2>${title}</h2>
          ${modalBody(project, area)}
        </section>
      </div>
    `;
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
      return `
        <label>Floor<input value="${escapeHtml(area.floor || "All floors")}"></label>
        <label>Area<input value="${escapeHtml(area.name)}"></label>
        <button class="primary-action" data-close>Apply filter</button>
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
    if (state.modal === "new-area") {
      return `
        <label>Area name<input placeholder="Bathroom"></label>
        <label>Floor<input placeholder="1st floor"></label>
        <button class="primary-action" data-add-area>Create area</button>
      `;
    }
    return `<p>This section is connected as a preview. Real data comes with Supabase.</p><button class="primary-action" data-close>OK</button>`;
  }

  function bindEvents() {
    document.querySelectorAll("[data-project]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedProjectId = button.getAttribute("data-project");
        state.selectedAreaId = "info";
        render();
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
        state.modal = button.getAttribute("data-modal");
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
        render();
      });
    });
    document.querySelector("[data-search]")?.addEventListener("input", (event) => {
      state.search = event.target.value;
      render();
    });
    document.querySelector("[data-add-area]")?.addEventListener("click", () => {
      const project = selectedProject();
      const id = `area-${project.areas.length + 1}`;
      project.areas.push({ id, name: "New area", floor: "New floor" });
      state.selectedAreaId = id;
      state.modal = "";
      render();
    });
    document.querySelectorAll("[data-add-demo]").forEach((button) => {
      button.addEventListener("click", () => {
        const kind = button.getAttribute("data-add-demo");
        const area = selectedArea();
        const now = new Date();
        const stamp = now.toLocaleDateString("de-DE") + ", " + now.toLocaleTimeString("de-DE");
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

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  render();
})();
