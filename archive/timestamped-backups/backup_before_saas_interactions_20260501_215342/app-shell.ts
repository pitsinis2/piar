export function renderAppShell(root: HTMLElement | null) {
  if (!root) return;

  root.innerHTML = `
    <main class="saas-workspace">
      <aside class="saas-sidebar">
        <div class="brand-pill">Pi.AR</div>
        <button class="rail-tab active">Projects</button>
        <button class="rail-tab">Planner</button>
        <button class="rail-tab">Team</button>
        <button class="rail-tab">Settings</button>
      </aside>

      <section class="project-rail">
        <label class="search-shell">
          <input type="search" placeholder="Search project">
        </label>

        <section class="rail-panel">
          <div class="panel-title">
            <h2>Active Projects</h2>
            <button>+</button>
          </div>
          ${projectCards()}
        </section>
      </section>

      <section class="project-workspace">
        <header class="project-hero-card">
          <div>
            <h1>0001 - test2</h1>
            <p>1234567</p>
            <p>Client 1 | Client 1 sur | Project manager: Alexandros Roupas</p>
          </div>
          <div class="hero-actions">
            <button>Chat Room</button>
            <button>Bell</button>
          </div>
        </header>

        <nav class="area-tabs">
          <button class="active">Info</button>
          <button>Bathroom</button>
          <button>Kitchen</button>
          <button>+</button>
          <button class="filter-btn">Filter</button>
        </nav>

        <div class="project-content">
          <aside class="team-strip">
            <span>Teams</span>
            <button>+</button>
            <button class="team-pill pink">Kalyteroi</button>
            <button class="team-pill orange">Astrapogianoi</button>
          </aside>

          <section class="content-grid">
            <section class="content-card plans-card">
              <div class="card-head">
                <h2>Plans</h2>
                <div>
                  <button>Grid</button>
                  <button>List</button>
                  <button>+</button>
                </div>
              </div>
              <article class="file-item">
                <span>FILE</span>
                <h3>File_20260419</h3>
                <p>application/pdf · 19.4.2026, 18:57:07 · Uploaded by: Alexandros Roupas</p>
              </article>
            </section>

            <section class="content-card">
              <div class="card-head">
                <h2>Notes</h2>
                <button>+</button>
              </div>
              <article class="file-item">
                <span>NOTE</span>
                <h3>h kouzina metaferthike</h3>
                <p>Master plan · 19.4.2026, 19:02:27</p>
              </article>
            </section>

            <section class="content-card">
              <div class="card-head">
                <h2>Files</h2>
                <button>+</button>
              </div>
              <div class="empty-state">
                <h3>No files yet</h3>
                <p>No files from teams or areas yet.</p>
              </div>
            </section>

            <section class="content-card">
              <div class="card-head">
                <h2>Photos</h2>
                <button>+</button>
              </div>
              <div class="empty-state">
                <h3>No photos yet</h3>
                <p>Photos uploaded by workers will appear here.</p>
              </div>
            </section>
          </section>
        </div>
      </section>
    </main>
  `;
}

function projectCards() {
  const projects = [
    ["0003", "Ioanninon Polykatoikia Serafidi", "Client: Giannis Ioannou", "2026-04-19", "#dff4f5"],
    ["0002", "pitsin", "Client: Client 1 Client 1 sur", "2026-04-18", "#e9f5dc"],
    ["0001", "test2", "Client: Client 1 Client 1 sur", "2026-04-10", "#fbe4ea"],
    ["0000", "Ergo 1", "Client: Client 1 Client 1 sur", "2026-04-09", "#ffe8d8"],
  ];

  return projects.map(([id, name, client, start, color]) => `
    <button class="project-card-old" style="--card-color:${color}" type="button">
      <span>${id}</span>
      <strong>${name}</strong>
      <small>${client}</small>
      <small>Start: ${start}</small>
      <b>...</b>
    </button>
  `).join("");
}
