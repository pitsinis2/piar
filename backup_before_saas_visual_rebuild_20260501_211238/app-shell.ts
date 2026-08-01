type Role = "admin" | "worker";

const demoProjects = [
  {
    id: "0001",
    name: "Bathroom renovation",
    client: "Client 1",
    floor: "1st floor",
    area: "Bathroom",
    team: "Plumbers",
    color: "#d8664c",
    status: "Today",
  },
  {
    id: "0002",
    name: "Kitchen wiring",
    client: "Client 2",
    floor: "Ground floor",
    area: "Kitchen",
    team: "Electricians",
    color: "#0d7a73",
    status: "Tomorrow",
  },
];

const demoMessages = [
  { user: "Admin", text: "Please upload photos before closing the wall.", important: true },
  { user: "Worker", text: "Bathroom pipes are ready for inspection.", important: false },
];

export function renderAppShell(root: HTMLElement | null) {
  if (!root) return;

  const state = {
    isLoggedIn: false,
    role: "worker" as Role,
    selectedProjectId: demoProjects[0].id,
  };

  function selectedProject() {
    return demoProjects.find((project) => project.id === state.selectedProjectId) ?? demoProjects[0];
  }

  function render() {
    root.innerHTML = `
      <main class="app-shell">
        ${state.isLoggedIn ? renderWorkspace() : renderLogin()}
      </main>
    `;

    root.querySelector<HTMLFormElement>("[data-login-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      state.isLoggedIn = true;
      render();
    });

    root.querySelectorAll<HTMLButtonElement>("[data-role]").forEach((button) => {
      button.addEventListener("click", () => {
        state.role = button.dataset.role === "admin" ? "admin" : "worker";
        render();
      });
    });

    root.querySelectorAll<HTMLButtonElement>("[data-project]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedProjectId = button.dataset.project || demoProjects[0].id;
        render();
      });
    });

    root.querySelector<HTMLButtonElement>("[data-logout]")?.addEventListener("click", () => {
      state.isLoggedIn = false;
      render();
    });
  }

  function renderLogin() {
    return `
      <section class="login-layout">
        <div class="hero">
          <p class="eyebrow">Project Manager SaaS</p>
          <h1>Simple worksite control for service teams.</h1>
          <p>Workers open projects, select an area, upload photos/files/notes, and every company keeps a clean project archive.</p>
          <div class="hero-pills">
            <span>Magic-link login</span>
            <span>Google Drive archive</span>
            <span>Manual user licenses</span>
          </div>
        </div>

        <form class="login-card" data-login-form>
          <p class="eyebrow">First preview</p>
          <h2>Login with email</h2>
          <p class="muted">This is a frontend preview. Supabase magic-link login comes next.</p>
          <label>
            Email
            <input type="email" value="owner@example.com" aria-label="Email">
          </label>
          <button class="primary-btn" type="submit">Send magic link</button>
          <small>For now this button opens the demo workspace.</small>
        </form>
      </section>
    `;
  }

  function renderWorkspace() {
    const project = selectedProject();
    return `
      <header class="workspace-header">
        <div>
          <p class="eyebrow">Company workspace</p>
          <h1>${state.role === "admin" ? "Admin dashboard" : "Worker projects"}</h1>
        </div>
        <div class="header-actions">
          <button class="${state.role === "worker" ? "chip active" : "chip"}" data-role="worker" type="button">Worker view</button>
          <button class="${state.role === "admin" ? "chip active" : "chip"}" data-role="admin" type="button">Admin view</button>
          <button class="ghost-btn" data-logout type="button">Logout</button>
        </div>
      </header>

      ${state.role === "admin" ? renderAdmin(project) : renderWorker(project)}

      <nav class="bottom-tabs" aria-label="Mobile shortcuts">
        <a href="#projects">Projects</a>
        <a href="#upload">Upload</a>
        <a href="#chat">Chat</a>
        <a href="#drive">Drive</a>
      </nav>
    `;
  }

  function renderProjectList() {
    return `
      <section class="project-list" id="projects">
        <div class="section-title">
          <h2>Projects</h2>
          <span>${demoProjects.length} active</span>
        </div>
        ${demoProjects.map((project) => `
          <button class="${project.id === state.selectedProjectId ? "project-card selected" : "project-card"}" data-project="${project.id}" type="button" style="--project-color:${project.color}">
            <span class="project-number">${project.id}</span>
            <strong>${project.name}</strong>
            <small>${project.client} · ${project.floor} · ${project.area}</small>
            <em>${project.status}</em>
          </button>
        `).join("")}
      </section>
    `;
  }

  function renderWorker(project: typeof demoProjects[number]) {
    return `
      <div class="worker-layout">
        ${renderProjectList()}
        <section class="work-panel">
          <div class="project-strip" style="--project-color:${project.color}">
            <span class="project-number">${project.id}</span>
            <div>
              <h2>${project.name}</h2>
              <p>${project.floor} · ${project.area} · ${project.team}</p>
            </div>
          </div>

          <div class="action-grid" id="upload">
            <button type="button">Add photo</button>
            <button type="button">Add file</button>
            <button type="button">Add note</button>
          </div>

          ${renderChat()}
          ${renderDriveStatus()}
        </section>
      </div>
    `;
  }

  function renderAdmin(project: typeof demoProjects[number]) {
    return `
      <div class="admin-layout">
        ${renderProjectList()}
        <section class="work-panel">
          <div class="stats-grid">
            <article><strong>10</strong><span>License seats</span></article>
            <article><strong>6</strong><span>Active users</span></article>
            <article><strong>2</strong><span>Projects</span></article>
            <article><strong>Drive</strong><span>Not connected yet</span></article>
          </div>

          <section class="admin-card">
            <h2>Selected project</h2>
            <p><strong>${project.id} · ${project.name}</strong></p>
            <p>${project.client} · ${project.floor} · ${project.area}</p>
          </section>

          <section class="admin-card">
            <h2>Next setup steps</h2>
            <ol>
              <li>Connect Supabase magic-link login.</li>
              <li>Create company and license records.</li>
              <li>Connect Google Drive wizard.</li>
            </ol>
          </section>
        </section>
      </div>
    `;
  }

  function renderChat() {
    return `
      <section class="chat-card" id="chat">
        <div class="section-title">
          <h2>Project chat</h2>
          <span>Important messages can become notes</span>
        </div>
        ${demoMessages.map((message) => `
          <article class="${message.important ? "message important" : "message"}">
            <strong>${message.user}</strong>
            <p>${message.text}</p>
            ${message.important ? "<span>Important</span>" : ""}
          </article>
        `).join("")}
      </section>
    `;
  }

  function renderDriveStatus() {
    return `
      <section class="drive-card" id="drive">
        <div>
          <h2>Google Drive archive</h2>
          <p>Company root → Project folder → Floor → Area → Photos / Files / Notes</p>
        </div>
        <button type="button">Connect later</button>
      </section>
    `;
  }

  render();
}

