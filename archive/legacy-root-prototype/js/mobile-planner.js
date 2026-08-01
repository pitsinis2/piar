// Extracted from index_v2_mobile.html on 2026-05-01.
(function () {
      const shell = document.getElementById("planner-static-mini-calendar");
      const title = document.getElementById("planner-static-mini-calendar-title");
      const days = document.getElementById("planner-static-mini-calendar-days");
      const prevBtn = document.getElementById("planner-static-mini-prev-btn");
      const nextBtn = document.getElementById("planner-static-mini-next-btn");
      const selectedWeekRange = document.getElementById("planner-static-selected-week-range");
      const selectedWeekDays = document.getElementById("planner-static-selected-week-days");
      const weekToggle = document.getElementById("planner-static-week-toggle");
      const unavailableBtn = document.getElementById("planner-static-unavailable-btn");
      const unavailableDialog = document.getElementById("planner-static-unavailable-dialog");
      const unavailableClose = document.getElementById("planner-static-unavailable-close");
      const unavailableDone = document.getElementById("planner-static-unavailable-done");
      const unavailTitle = document.getElementById("planner-static-unavail-title");
      const unavailPrev = document.getElementById("planner-static-unavail-prev");
      const unavailNext = document.getElementById("planner-static-unavail-next");
      const unavailDays = document.getElementById("planner-static-unavail-days");
      const unavailWeekdays = document.getElementById("planner-static-unavail-weekdays");
      const undoBtn = document.getElementById("planner-static-undo-btn");
      const redoBtn = document.getElementById("planner-static-redo-btn");
      const prevWeekBtn = document.getElementById("planner-static-prev-week-btn");
      const todayBtn = document.getElementById("planner-static-today-btn");
      const nextWeekBtn = document.getElementById("planner-static-next-week-btn");
      const projectDialog = document.getElementById("planner-static-project-dialog");
      const projectDialogTitle = document.getElementById("planner-static-project-dialog-title");
      const projectDialogClose = document.getElementById("planner-static-project-dialog-close");
      const projectDialogCancel = document.getElementById("planner-static-project-dialog-cancel");
      const projectDialogDelete = document.getElementById("planner-static-project-dialog-delete");
      const projectDialogSave = document.getElementById("planner-static-project-dialog-save");
      const startDateInput = document.getElementById("planner-static-start-date");
      const endDateInput = document.getElementById("planner-static-end-date");
      const projectList = document.getElementById("planner-static-project-list");
      const teamList = document.getElementById("planner-static-team-list");
      if (!shell || !title || !days || !prevBtn || !nextBtn || !selectedWeekRange || !selectedWeekDays) return;

      const STATE_STORAGE_KEY = "project-manager-web-state-v3";
      const PLANNER_ASSIGNMENTS_KEY = "planner-static-assignments-v1";
      const PLANNER_UNAVAILABLE_KEY = "planner-static-unavailable-v2";
      let activeMonth = new Date(2026, 3, 1, 12, 0, 0, 0);
      let selectedDate = new Date(2026, 3, 18, 12, 0, 0, 0);
      let weekDayCount = 7;
      let pendingDateIso = "";
      let pendingSelectedProjectId = "";
      let pendingEditAssignmentId = "";
      let dragAssignmentId = "";
      let assignments = loadAssignments();
      let unavailableMonth = new Date(activeMonth);
      let unavailableState = loadUnavailableState();
      const historyPast = [];
      const historyFuture = [];

      function toIsoDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
      }

      function parseIsoDate(value) {
        if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
        const parts = value.split("-").map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
      }

      function sanitizeHtml(value) {
        return String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function formatCardDate(iso) {
        const date = parseIsoDate(iso);
        if (!date) return iso || "";
        return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      }

      function loadUnavailableState() {
        try {
          const rawV2 = localStorage.getItem(PLANNER_UNAVAILABLE_KEY);
          const rawV1 = localStorage.getItem("planner-static-unavailable-v1");
          const raw = rawV2 || rawV1;
          const data = raw ? JSON.parse(raw) : null;
          const dateOverrides = data && typeof data.dateOverrides === "object" && data.dateOverrides ? data.dateOverrides : (data && data.dates ? data.dates : {});
          const weekdays = data && typeof data.weekdays === "object" && data.weekdays ? data.weekdays : {};
          const weeks = data && typeof data.weeks === "object" && data.weeks ? data.weeks : {};
          // Normalize overrides to booleans only.
          Object.keys(dateOverrides || {}).forEach(function (key) {
            if (dateOverrides[key] !== true && dateOverrides[key] !== false) delete dateOverrides[key];
          });
          return { dateOverrides: dateOverrides || {}, weekdays: weekdays || {}, weeks: weeks || {} };
        } catch (error) {
          return { dateOverrides: {}, weekdays: {}, weeks: {} };
        }
      }

      function saveUnavailableState() {
        localStorage.setItem(PLANNER_UNAVAILABLE_KEY, JSON.stringify(unavailableState));
      }

      function getIsoWeekKey(date) {
        const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const day = utc.getUTCDay() || 7;
        utc.setUTCDate(utc.getUTCDate() + 4 - day);
        const weekYear = utc.getUTCFullYear();
        const yearStart = new Date(Date.UTC(weekYear, 0, 1));
        const weekNo = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
        return weekYear + "-" + String(weekNo).padStart(2, "0");
      }

      function isUnavailableIso(iso) {
        const date = parseIsoDate(iso);
        if (!date) return false;
        if (unavailableState.dateOverrides && (unavailableState.dateOverrides[iso] === true || unavailableState.dateOverrides[iso] === false)) {
          return unavailableState.dateOverrides[iso] === true;
        }
        const weekKey = getIsoWeekKey(date);
        if (unavailableState.weeks && unavailableState.weeks[weekKey]) return true;
        const day = String(date.getDay()); // 0=Sun ... 6=Sat
        return !!(unavailableState.weekdays && unavailableState.weekdays[day]);
      }

      function nextIsoDay(iso, deltaDays) {
        const date = parseIsoDate(iso);
        if (!date) return iso;
        date.setDate(date.getDate() + deltaDays);
        return toIsoDate(date);
      }

      function confirmIfUnavailable(iso) {
        if (!isUnavailableIso(iso)) return true;
        return window.confirm("You are about to plan in a day that is unavailable. Continue?");
      }

      function isPastIso(iso) {
        const date = parseIsoDate(iso);
        if (!date) return false;
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        return date < today;
      }

      function ensureNotPast(iso) {
        if (!isPastIso(iso)) return true;
        window.alert("The past days are already planned you cannot unplanned them.");
        return false;
      }

      function isAssignmentLocked(assignment) {
        if (!assignment) return false;
        // Lock anything that starts in the past: visible but immutable.
        return isPastIso(assignment.startDate);
      }

      function loadAssignments() {
        try {
          const raw = localStorage.getItem(PLANNER_ASSIGNMENTS_KEY);
          const data = raw ? JSON.parse(raw) : [];
          return Array.isArray(data) ? data : [];
        } catch (error) {
          return [];
        }
      }

      function saveAssignments() {
        localStorage.setItem(PLANNER_ASSIGNMENTS_KEY, JSON.stringify(assignments));
      }

      function updateHistoryButtons() {
        if (undoBtn) undoBtn.disabled = historyPast.length <= 1;
        if (redoBtn) redoBtn.disabled = historyFuture.length === 0;
      }

      function recordHistorySnapshot() {
        historyPast.push(JSON.stringify(assignments));
        historyFuture.length = 0;
        updateHistoryButtons();
      }

      function restoreAssignmentsFromSnapshot(snapshot) {
        try {
          const data = JSON.parse(snapshot || "[]");
          assignments = Array.isArray(data) ? data : [];
          saveAssignments();
          renderSelectedWeek();
        } catch (error) {
          // ignore
        }
        updateHistoryButtons();
      }

      function shiftSelectedDateByDays(daysDelta) {
        const next = new Date(selectedDate);
        next.setDate(next.getDate() + daysDelta);
        next.setHours(12, 0, 0, 0);
        selectedDate = next;
        activeMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12, 0, 0, 0);
        renderMonth();
      }

      function loadPlannerState() {
        try {
          const raw = localStorage.getItem(STATE_STORAGE_KEY);
          return raw ? JSON.parse(raw) : null;
        } catch (error) {
          return null;
        }
      }

      function getUserDisplayName(user) {
        if (!user) return "Unknown";
        const name = String(user.name || "").trim();
        const surname = String(user.surname || "").trim();
        const full = (name + " " + surname).trim();
        return full || String(user.email || "").trim() || "Unknown";
      }

      function buildPeopleIndex(appState) {
        const users = Array.isArray(appState && appState.users) ? appState.users : [];
        const projects = Array.isArray(appState && appState.projects) ? appState.projects : [];
        const userNameById = new Map();
        users.forEach(function (user) {
          if (!user || !user.id) return;
          userNameById.set(user.id, getUserDisplayName(user));
        });
        const projectById = new Map();
        projects.forEach(function (project) {
          if (!project || !project.id) return;
          const folders = Array.isArray(project.folders) ? project.folders : [];
          const folderById = new Map();
          folders.forEach(function (folder) {
            if (!folder || !folder.id) return;
            folderById.set(folder.id, {
              id: folder.id,
              name: folder.name || "Team",
              memberIds: Array.isArray(folder.memberIds) ? folder.memberIds : []
            });
          });
          projectById.set(project.id, { id: project.id, name: project.name || "Project", folderById: folderById });
        });
        return { userNameById: userNameById, projectById: projectById };
      }

      function warnPeopleDoubleBooked(projectId, teamIds, startIso, endIso, ignoreAssignmentId) {
        const appState = loadPlannerState();
        if (!appState) return;
        const index = buildPeopleIndex(appState);
        const project = index.projectById.get(projectId);
        if (!project) return;
        const start = parseIsoDate(startIso);
        const end = parseIsoDate(endIso);
        if (!start || !end) return;
        const warnings = [];
        const seen = new Set();

        const loopDate = new Date(start);
        while (loopDate <= end) {
          const dayIso = toIsoDate(loopDate);

          const personToTeamName = new Map();
          const personToTeamNames = new Map();
          const selectedTeams = (teamIds || []).map(function (teamId) { return project.folderById.get(teamId); }).filter(Boolean);
          selectedTeams.forEach(function (team) {
            team.memberIds.forEach(function (personId) {
              if (!personId) return;
              if (!personToTeamName.has(personId)) personToTeamName.set(personId, team.name);
              const list = personToTeamNames.get(personId) || [];
              list.push(team.name);
              personToTeamNames.set(personId, list);
            });
          });

          // Same person selected in more than one team (same day).
          personToTeamNames.forEach(function (teamNames, personId) {
            if (!Array.isArray(teamNames) || teamNames.length <= 1) return;
            const key = "multi-team|" + dayIso + "|" + personId;
            if (seen.has(key)) return;
            seen.add(key);
            const name = index.userNameById.get(personId) || "Unknown person";
            warnings.push("Attention: " + name + " is involved in the team " + teamNames[0] + " and in the team " + teamNames[1] + ".");
          });

          const newPeople = new Set(personToTeamName.keys());
          if (!newPeople.size) {
            loopDate.setDate(loopDate.getDate() + 1);
            continue;
          }

          // Check other planner assignments that overlap this day.
          assignments.forEach(function (assignment) {
            if (!assignment || assignment.id === ignoreAssignmentId) return;
            if (assignment.startDate > dayIso || assignment.endDate < dayIso) return;
            const otherProject = index.projectById.get(assignment.projectId);
            if (!otherProject) return;
            const otherTeamIds = Array.isArray(assignment.teamIds) ? assignment.teamIds : [];
            otherTeamIds.forEach(function (otherTeamId) {
              const otherTeam = otherProject.folderById.get(otherTeamId);
              if (!otherTeam) return;
              otherTeam.memberIds.forEach(function (personId) {
                if (!newPeople.has(personId)) return;
                const key = "other|" + dayIso + "|" + personId + "|" + assignment.id;
                if (seen.has(key)) return;
                seen.add(key);
                const name = index.userNameById.get(personId) || "Unknown person";
                const teamName = personToTeamName.get(personId) || "Team";
                warnings.push("Attention: " + name + " is involved in the team (" + teamName + ") and in the Project (" + (assignment.projectName || otherProject.name || "Project") + ").");
              });
            });
          });

          loopDate.setDate(loopDate.getDate() + 1);
        }

        if (warnings.length) {
          window.alert(warnings.join("\\n"));
        }
      }

      function getActiveProjects() {
        const appState = loadPlannerState();
        const projects = Array.isArray(appState && appState.projects) ? appState.projects : [];
        return projects
          .filter(function (project) {
            return project && !project.archivedAt && String(project.lifecycle || "active") === "active";
          })
          .map(function (project) {
            return {
              id: project.id || "",
              name: project.name || "Unnamed project",
              color: project.surfaceColor || project.color || project.tabColor || "#0d7a73",
              teams: (Array.isArray(project.folders) ? project.folders : [])
                .filter(function (team) { return team && !team.archivedAt; })
                .map(function (team) {
                  return {
                    id: team.id || "",
                    name: team.name || "Unnamed team",
                    color: team.tabColor || "#0d7a73"
                  };
                })
            };
          });
      }

      function closeProjectDialog() {
        if (!projectDialog) return;
        pendingEditAssignmentId = "";
        if (projectDialog.open && typeof projectDialog.close === "function") {
          projectDialog.close();
          return;
        }
        projectDialog.removeAttribute("open");
      }

      function renderTeamsForProject(project, selectedTeamIds) {
        if (!teamList) return;
        if (!project || !project.teams || !project.teams.length) {
          teamList.innerHTML = '<p class="muted">No teams available for this project.</p>';
          return;
        }
        teamList.innerHTML = project.teams.map(function (team) {
          const isChecked = selectedTeamIds.includes(team.id) ? " checked" : "";
          return ''
            + '<label class="planner-static-team-option" style="--team-color:' + sanitizeHtml(team.color) + ';">'
            + '<input type="checkbox" value="' + sanitizeHtml(team.id) + '"' + isChecked + '>'
            + '<span class="planner-static-team-color" style="background:' + sanitizeHtml(team.color) + ';"></span>'
            + '<span>' + sanitizeHtml(team.name) + '</span>'
            + '</label>';
        }).join("");
      }

      function renderProjectsList(activeProjects, selectedProjectId, selectedTeamIds) {
        if (!projectList || !teamList) return;
        if (!activeProjects.length) {
          projectList.innerHTML = '<p class="muted">No active projects available.</p>';
          teamList.innerHTML = '<p class="muted">Select a project to view teams.</p>';
          return;
        }
        projectList.innerHTML = activeProjects.map(function (project) {
          const checked = selectedProjectId && project.id === selectedProjectId ? " checked" : "";
          return ''
            + '<label class="planner-static-project-option" style="--project-color:' + sanitizeHtml(project.color) + ';">'
            + '<input type="radio" name="planner-static-project" value="' + sanitizeHtml(project.id) + '"' + checked + '>'
            + '<span class="planner-static-project-color" style="background:' + sanitizeHtml(project.color) + ';"></span>'
            + '<strong>' + sanitizeHtml(project.name) + '</strong>'
            + '</label>';
        }).join("");

        const initialProject = activeProjects.find(function (project) {
          return project.id === selectedProjectId;
        });
        if (initialProject) {
          renderTeamsForProject(initialProject, selectedTeamIds || []);
        } else {
          teamList.innerHTML = '<p class="muted">Select a project to view teams.</p>';
        }

        projectList.querySelectorAll('input[name="planner-static-project"]').forEach(function (radio) {
          radio.addEventListener("change", function () {
            pendingSelectedProjectId = radio.value;
            const selectedProject = activeProjects.find(function (project) { return project.id === radio.value; });
            renderTeamsForProject(selectedProject, []);
          });
        });
      }

      function openProjectDialogForDate(dateIso, editAssignment) {
        if (!projectDialog || !projectList || !teamList || !startDateInput || !endDateInput || !projectDialogSave) return;
        // Allow opening past assignments for viewing, but block creating new plans in the past.
        if (!editAssignment && !ensureNotPast(dateIso)) return;
        if (!confirmIfUnavailable(dateIso)) return;
        pendingDateIso = dateIso;
        pendingEditAssignmentId = editAssignment && editAssignment.id ? editAssignment.id : "";
        pendingSelectedProjectId = editAssignment && editAssignment.projectId ? editAssignment.projectId : "";
        startDateInput.value = editAssignment && editAssignment.startDate ? editAssignment.startDate : dateIso;
        endDateInput.value = editAssignment && editAssignment.endDate ? editAssignment.endDate : dateIso;

        const locked = isAssignmentLocked(editAssignment);
        if (projectDialogTitle) {
          projectDialogTitle.textContent = pendingEditAssignmentId
            ? (locked ? "Planned (read-only) " + (editAssignment.startDate || dateIso) : "Edit assignment for " + dateIso)
            : "Select project for " + dateIso;
        }
        projectDialogSave.textContent = pendingEditAssignmentId ? "Save and add to calendar" : "Add to calendar";
        if (projectDialogDelete) {
          projectDialogDelete.classList.toggle("hidden", !pendingEditAssignmentId);
        }
        projectDialogSave.disabled = locked;
        if (projectDialogDelete) projectDialogDelete.disabled = locked;
        startDateInput.disabled = locked;
        endDateInput.disabled = locked;
        projectList.classList.toggle("planner-static-readonly", locked);
        teamList.classList.toggle("planner-static-readonly", locked);

        const activeProjects = getActiveProjects();
        const preselectedTeamIds = editAssignment && Array.isArray(editAssignment.teamIds) ? editAssignment.teamIds : [];
        renderProjectsList(activeProjects, pendingSelectedProjectId, preselectedTeamIds);

        // In readonly mode, disable all inputs inside the lists.
        if (locked) {
          projectList.querySelectorAll("input, button, select, textarea").forEach(function (el) { el.disabled = true; });
          teamList.querySelectorAll("input, button, select, textarea").forEach(function (el) { el.disabled = true; });
        }

        if (typeof projectDialog.showModal === "function") {
          if (!projectDialog.open) projectDialog.showModal();
        } else {
          projectDialog.setAttribute("open", "open");
        }
      }

      function collectSelectedTeamIds() {
        if (!teamList) return [];
        return Array.from(teamList.querySelectorAll('input[type="checkbox"]:checked'))
          .map(function (checkbox) { return checkbox.value; });
      }

      function addPlannerAssignment() {
        if (pendingEditAssignmentId) {
          const existing = assignments.find(function (entry) { return entry && entry.id === pendingEditAssignmentId; });
          if (isAssignmentLocked(existing)) {
            window.alert("The past days are already planned you cannot unplanned them.");
            return;
          }
        }
        const activeProjects = getActiveProjects();
        const selectedProject = activeProjects.find(function (project) {
          return project.id === pendingSelectedProjectId;
        });
        if (!selectedProject) {
          window.alert("Select a project first.");
          return;
        }
        const selectedTeamIds = collectSelectedTeamIds();
        const selectedTeams = selectedProject.teams
          .filter(function (team) { return selectedTeamIds.includes(team.id); })
          .map(function (team) {
            return { id: team.id, name: team.name, color: team.color || "#0d7a73" };
          });
        const startIso = startDateInput && startDateInput.value ? startDateInput.value : pendingDateIso;
        const endIso = endDateInput && endDateInput.value ? endDateInput.value : startIso;
        if (!ensureNotPast(startIso)) return;
        if (!confirmIfUnavailable(startIso)) return;
        const start = parseIsoDate(startIso);
        const end = parseIsoDate(endIso);
        if (!start || !end) {
          window.alert("Select valid start and end dates.");
          return;
        }
        const finalStart = start <= end ? start : end;
        const finalEnd = start <= end ? end : start;
        const conflictingTeamNames = new Set();
        const editingAssignmentId = pendingEditAssignmentId;
        const loopDate = new Date(finalStart);
        while (loopDate <= finalEnd) {
          const dayIso = toIsoDate(loopDate);
          const usedTeamIds = new Set();
          assignments.forEach(function (assignment) {
            if (editingAssignmentId && assignment.id === editingAssignmentId) return;
            if (!assignment || assignment.projectId !== selectedProject.id) return;
            if (assignment.startDate <= dayIso && assignment.endDate >= dayIso) {
              const existingTeamIds = Array.isArray(assignment.teamIds) ? assignment.teamIds : [];
              existingTeamIds.forEach(function (teamId) { usedTeamIds.add(teamId); });
            }
          });
          selectedTeams.forEach(function (team) {
            if (usedTeamIds.has(team.id)) conflictingTeamNames.add(team.name);
          });
          loopDate.setDate(loopDate.getDate() + 1);
        }
        if (conflictingTeamNames.size) {
          window.alert("These teams are already assigned for this project in the selected day range: " + Array.from(conflictingTeamNames).join(", "));
          return;
        }
        warnPeopleDoubleBooked(selectedProject.id, selectedTeamIds, toIsoDate(finalStart), toIsoDate(finalEnd), editingAssignmentId || "");
        recordHistorySnapshot();
        const assignmentPayload = {
          id: editingAssignmentId || ("plan-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7)),
          projectId: selectedProject.id,
          projectName: selectedProject.name,
          projectColor: selectedProject.color,
          startDate: toIsoDate(finalStart),
          endDate: toIsoDate(finalEnd),
          teamIds: selectedTeamIds,
          teamNames: selectedTeams.map(function (team) { return team.name; }),
          teamItems: selectedTeams
        };
        if (editingAssignmentId) {
          assignments = assignments.map(function (assignment) {
            return assignment && assignment.id === editingAssignmentId ? assignmentPayload : assignment;
          });
        } else {
          assignments.push(assignmentPayload);
        }
        saveAssignments();
        closeProjectDialog();
        renderSelectedWeek();
      }

      function deletePlannerAssignment(assignmentId, withConfirm) {
        if (!assignmentId) return;
        const existing = assignments.find(function (entry) { return entry && entry.id === assignmentId; });
        if (isAssignmentLocked(existing)) {
          window.alert("The past days are already planned you cannot unplanned them.");
          return;
        }
        if (withConfirm && !window.confirm("Delete this assignment?")) return;
        recordHistorySnapshot();
        assignments = assignments.filter(function (assignment) {
          return !assignment || assignment.id !== assignmentId;
        });
        saveAssignments();
        closeProjectDialog();
        renderSelectedWeek();
      }

      function moveAssignmentToDate(assignmentId, targetStartIso) {
        const assignment = assignments.find(function (entry) {
          return entry && entry.id === assignmentId;
        });
        if (!assignment) return;
        if (isAssignmentLocked(assignment)) {
          window.alert("The past days are already planned you cannot unplanned them.");
          return;
        }
        const currentStart = parseIsoDate(assignment.startDate);
        const currentEnd = parseIsoDate(assignment.endDate);
        const targetStart = parseIsoDate(targetStartIso);
        if (!currentStart || !currentEnd || !targetStart) return;

        const durationDays = Math.round((currentEnd - currentStart) / 86400000);
        const targetEnd = new Date(targetStart);
        targetEnd.setDate(targetEnd.getDate() + durationDays);
        const nextStartIso = toIsoDate(targetStart);
        const nextEndIso = toIsoDate(targetEnd);
        if (!ensureNotPast(nextStartIso)) return;

        const teamIds = Array.isArray(assignment.teamIds) ? assignment.teamIds : [];
        const conflictingTeamNames = new Set();
        const loopDate = new Date(targetStart);
        while (loopDate <= targetEnd) {
          const dayIso = toIsoDate(loopDate);
          const usedTeamIds = new Set();
          assignments.forEach(function (entry) {
            if (!entry || entry.id === assignment.id || entry.projectId !== assignment.projectId) return;
            if (entry.startDate <= dayIso && entry.endDate >= dayIso) {
              const existingTeamIds = Array.isArray(entry.teamIds) ? entry.teamIds : [];
              existingTeamIds.forEach(function (teamId) { usedTeamIds.add(teamId); });
            }
          });
          teamIds.forEach(function (teamId) {
            if (usedTeamIds.has(teamId)) conflictingTeamNames.add(teamId);
          });
          loopDate.setDate(loopDate.getDate() + 1);
        }
        if (conflictingTeamNames.size) {
          window.alert("Move blocked: team conflict in target day range.");
          return;
        }

        warnPeopleDoubleBooked(assignment.projectId, teamIds, nextStartIso, nextEndIso, assignment.id);
        recordHistorySnapshot();
        assignments = assignments.map(function (entry) {
          if (!entry || entry.id !== assignment.id) return entry;
          return Object.assign({}, entry, {
            startDate: nextStartIso,
            endDate: nextEndIso
          });
        });
        saveAssignments();
        renderSelectedWeek();
      }

      function getIsoWeek(date) {
        const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const day = utc.getUTCDay() || 7;
        utc.setUTCDate(utc.getUTCDate() + 4 - day);
        const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
        return Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
      }

      function getWeekStart(date) {
        const monday = new Date(date);
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        return monday;
      }

      function renderSelectedWeek() {
        const weekStart = getWeekStart(selectedDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + (weekDayCount - 1));
        const weekStartIso = toIsoDate(weekStart);
        const weekEndIso = toIsoDate(weekEnd);
        const cw = getIsoWeek(weekStart);
        selectedWeekRange.textContent = "CW " + cw + " - "
          + weekStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          + " - "
          + weekEnd.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

        // Build stable "lanes" so multi-day projects stay on the same row across the week.
        const relevantAssignments = assignments
          .filter(function (assignment) {
            return assignment && assignment.startDate <= weekEndIso && assignment.endDate >= weekStartIso;
          })
          .map(function (assignment) {
            const start = parseIsoDate(assignment.startDate);
            const end = parseIsoDate(assignment.endDate);
            return Object.assign({}, assignment, {
              _start: start,
              _end: end,
              _startIso: assignment.startDate,
              _endIso: assignment.endDate
            });
          })
          .filter(function (assignment) { return assignment._start && assignment._end; })
          .sort(function (a, b) {
            // Stable ordering for lane assignment: earlier start first, longer duration first.
            if (a._startIso !== b._startIso) return String(a._startIso).localeCompare(String(b._startIso));
            const aDur = Math.round((a._end - a._start) / 86400000);
            const bDur = Math.round((b._end - b._start) / 86400000);
            if (bDur !== aDur) return bDur - aDur;
            return String(a.projectName || "").localeCompare(String(b.projectName || ""));
          });

        const laneEnds = [];
        const assignmentLane = new Map();
        relevantAssignments.forEach(function (assignment) {
          let laneIndex = -1;
          for (let i = 0; i < laneEnds.length; i += 1) {
            // Inclusive ranges: next start must be after the current lane end.
            if (assignment._start > laneEnds[i]) {
              laneIndex = i;
              break;
            }
          }
          if (laneIndex === -1) {
            laneIndex = laneEnds.length;
            laneEnds.push(assignment._end);
          } else {
            laneEnds[laneIndex] = assignment._end;
          }
          assignmentLane.set(assignment.id, laneIndex);
        });
        const laneCount = laneEnds.length;

        const dayParts = [];
        for (let i = 0; i < weekDayCount; i += 1) {
          const day = new Date(weekStart);
          day.setDate(day.getDate() + i);
          const dayIso = toIsoDate(day);
          const dayUnavailable = isUnavailableIso(dayIso);
          const dayPast = isPastIso(dayIso);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const classes = ["planner-static-week-day", isWeekend ? "weekend" : "", dayUnavailable ? "unavailable" : "", dayPast ? "past" : ""].filter(Boolean).join(" ");

          const entriesToday = relevantAssignments.filter(function (assignment) {
            return assignment._startIso <= dayIso && assignment._endIso >= dayIso && !isUnavailableIso(dayIso);
          });

          const laneSlots = new Array(laneCount).fill(null);
          entriesToday.forEach(function (entry) {
            const laneIndex = assignmentLane.get(entry.id);
            if (laneIndex === undefined || laneIndex === null) return;
            laneSlots[laneIndex] = entry;
          });

          const entryHtml = entriesToday.length ? laneSlots.map(function (entry) {
            if (!entry) return '<div class="planner-static-assignment-placeholder" aria-hidden="true"></div>';
            const teamItems = Array.isArray(entry.teamItems) ? entry.teamItems : [];
            const fallbackTeamNames = Array.isArray(entry.teamNames) ? entry.teamNames : [];
            const teamPills = (teamItems.length
              ? teamItems.map(function (team) {
                return {
                  name: team && team.name ? team.name : "Team",
                  color: team && team.color ? team.color : "#9aa7b6"
                };
              })
              : fallbackTeamNames.map(function (name) {
                return { name: name || "Team", color: "#9aa7b6" };
              })
            );
            const teamDisplay = teamPills.length ? teamPills.slice(0, 2) : [{ name: "No team", color: "#9aa7b6" }];
            const moreCount = teamPills.length > 2 ? (teamPills.length - 2) : 0;
            const teamHtml = teamDisplay.map(function (team) {
              return ''
                + '<span class="planner-static-team-pill">'
                + '<i class="planner-static-team-bullet" style="background:' + sanitizeHtml(team.color) + ';"></i>'
                + '<span class="planner-static-team-name">' + sanitizeHtml(team.name) + '</span>'
                + '</span>';
            }).join("") + (moreCount ? (
              '<span class="planner-static-team-pill more">'
              + '<i class="planner-static-team-bullet" style="background:#9aa7b6;"></i>'
              + '<span class="planner-static-team-name">+' + moreCount + '</span>'
              + '</span>'
            ) : "");
            const dateText = entry.startDate === entry.endDate
              ? formatCardDate(entry.startDate)
              : (formatCardDate(entry.startDate) + " - " + formatCardDate(entry.endDate));

            const continuesPrev = dayIso !== weekStartIso && entry.startDate < dayIso;
            const continuesNext = dayIso !== weekEndIso && entry.endDate > dayIso;
            const prevWorking = !isUnavailableIso(nextIsoDay(dayIso, -1));
            const nextWorking = !isUnavailableIso(nextIsoDay(dayIso, 1));
            const continuationClass = [
              (continuesPrev && prevWorking) ? "continues-prev" : "",
              (continuesNext && nextWorking) ? "continues-next" : ""
            ].filter(Boolean).join(" ");
            return ''
              + '<article class="planner-static-assignment-card ' + continuationClass + '" style="--conn-color:' + sanitizeHtml(entry.projectColor || "#0d7a73") + ';" draggable="true" data-assignment-id="' + sanitizeHtml(entry.id || "") + '">'
              + '<span class="planner-static-assignment-color" style="background:' + sanitizeHtml(entry.projectColor || "#0d7a73") + ';"></span>'
              + '<div class="planner-static-assignment-copy">'
              + '<div class="planner-static-assignment-line">'
              + '<div class="planner-static-assignment-top">'
              + '<strong>' + sanitizeHtml(entry.projectName) + '</strong>'
              + '<small>' + sanitizeHtml(dateText) + '</small>'
              + '</div>'
              + '<div class="planner-static-assignment-teams">' + teamHtml + '</div>'
              + '</div>'
              + '</div>'
              + '</article>';
          }).join("") : '<p class="planner-static-assignment-empty">No projects</p>';
          dayParts.push(
            '<div class="' + classes + '">'
            + '<div class="planner-static-week-day-head">'
            + '<div class="planner-static-week-day-heading-copy">'
            + '<span>' + day.toLocaleDateString("en-GB", { weekday: "short" }) + '</span>'
            + '<strong>' + String(day.getDate()).padStart(2, "0") + '-' + day.toLocaleDateString("en-GB", { month: "short" }) + '</strong>'
            + '</div>'
            + '<button type="button" class="planner-static-day-add-btn" data-day="' + dayIso + '">+</button>'
            + '</div>'
            + '<div class="planner-static-week-day-body" data-day="' + dayIso + '">' + entryHtml + '</div>'
            + '</div>'
          );
        }
        selectedWeekDays.innerHTML = dayParts.join("");
        selectedWeekDays.querySelectorAll(".planner-static-assignment-card").forEach(function (card) {
          card.addEventListener("click", function (event) {
            if (event.target && event.target.closest && event.target.closest(".planner-static-day-add-btn")) return;
            const assignmentId = card.dataset.assignmentId || "";
            const assignment = assignments.find(function (entry) { return entry && entry.id === assignmentId; });
            if (!assignment) return;
            openProjectDialogForDate(assignment.startDate || toIsoDate(selectedDate), assignment);
          });
          card.addEventListener("dragstart", function (event) {
            const assignmentId = card.dataset.assignmentId || "";
            const assignment = assignments.find(function (entry) { return entry && entry.id === assignmentId; });
            if (isAssignmentLocked(assignment)) {
              event.preventDefault();
              return;
            }
            dragAssignmentId = assignmentId;
            card.classList.add("is-dragging");
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", assignmentId);
            }
          });
          card.addEventListener("dragend", function () {
            dragAssignmentId = "";
            card.classList.remove("is-dragging");
            selectedWeekDays.querySelectorAll(".planner-static-week-day-body.drop-hover").forEach(function (body) {
              body.classList.remove("drop-hover");
            });
          });
        });
        selectedWeekDays.querySelectorAll(".planner-static-week-day-body").forEach(function (body) {
          body.addEventListener("dragover", function (event) {
            if (!dragAssignmentId) return;
            event.preventDefault();
            body.classList.add("drop-hover");
          });
          body.addEventListener("dragleave", function () {
            body.classList.remove("drop-hover");
          });
          body.addEventListener("drop", function (event) {
            if (!dragAssignmentId) return;
            event.preventDefault();
            body.classList.remove("drop-hover");
            const targetIso = body.dataset.day || "";
            if (!targetIso) return;
            if (!confirmIfUnavailable(targetIso)) return;
            moveAssignmentToDate(dragAssignmentId, targetIso);
          });
        });
        selectedWeekDays.querySelectorAll(".planner-static-day-add-btn").forEach(function (button) {
          button.addEventListener("click", function () {
            const iso = button.dataset.day || toIsoDate(selectedDate);
            if (!ensureNotPast(iso)) return;
            openProjectDialogForDate(iso);
          });
        });
        if (weekToggle) {
          weekToggle.textContent = weekDayCount === 7 ? "7 days week" : "5 days week";
        }
      }

      function renderMonth() {
        title.textContent = activeMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
        const monthStart = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1, 12, 0, 0, 0);
        const gridStart = new Date(monthStart);
        gridStart.setDate(gridStart.getDate() - ((gridStart.getDay() + 6) % 7));
        const parts = [];

        for (let row = 0; row < 6; row += 1) {
          const rowStart = new Date(gridStart);
          rowStart.setDate(rowStart.getDate() + (row * 7));
          parts.push('<span class="planner-mini-weekno">' + getIsoWeek(rowStart) + '</span>');
          for (let col = 0; col < 7; col += 1) {
            const day = new Date(rowStart);
            day.setDate(day.getDate() + col);
            const classNames = ["planner-mini-day"];
            if (day.getMonth() !== activeMonth.getMonth()) classNames.push("outside");
            const iso = toIsoDate(day);
            if (isUnavailableIso(iso)) classNames.push("unavailable");
            if (
              day.getFullYear() === selectedDate.getFullYear()
              && day.getMonth() === selectedDate.getMonth()
              && day.getDate() === selectedDate.getDate()
            ) classNames.push("selected");
            parts.push('<button type="button" class="' + classNames.join(" ") + '" data-year="' + day.getFullYear() + '" data-month="' + day.getMonth() + '" data-day="' + day.getDate() + '">' + day.getDate() + '</button>');
          }
        }

        days.innerHTML = parts.join("");
        days.querySelectorAll(".planner-mini-day").forEach(function (button) {
          button.addEventListener("click", function () {
            selectedDate = new Date(
              Number(button.dataset.year),
              Number(button.dataset.month),
              Number(button.dataset.day),
              12, 0, 0, 0
            );
            activeMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12, 0, 0, 0);
            renderMonth();
          });
        });
        renderSelectedWeek();
      }

      function renderUnavailablePicker() {
        if (!unavailTitle || !unavailDays) return;
        unavailTitle.textContent = unavailableMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
        const monthStart = new Date(unavailableMonth.getFullYear(), unavailableMonth.getMonth(), 1, 12, 0, 0, 0);
        const gridStart = new Date(monthStart);
        gridStart.setDate(gridStart.getDate() - ((gridStart.getDay() + 6) % 7));
        const parts = [];
        for (let row = 0; row < 6; row += 1) {
          const rowStart = new Date(gridStart);
          rowStart.setDate(rowStart.getDate() + (row * 7));
          const weekKey = getIsoWeekKey(rowStart);
          const weekActive = !!(unavailableState.weeks && unavailableState.weeks[weekKey]);
          parts.push('<button type="button" class="planner-mini-weekno planner-unavail-weekno' + (weekActive ? " active" : "") + '" data-week="' + weekKey + '">' + getIsoWeek(rowStart) + '</button>');
          for (let col = 0; col < 7; col += 1) {
            const day = new Date(rowStart);
            day.setDate(day.getDate() + col);
            const iso = toIsoDate(day);
            const classNames = ["planner-mini-day"];
            if (day.getMonth() !== unavailableMonth.getMonth()) classNames.push("outside");
            if (isUnavailableIso(iso)) classNames.push("unavailable");
            if (unavailableState.dateOverrides && unavailableState.dateOverrides[iso] === false) classNames.push("override-working");
            parts.push('<button type="button" class="' + classNames.join(" ") + '" data-iso="' + iso + '">' + day.getDate() + '</button>');
          }
        }
        unavailDays.innerHTML = parts.join("");
        unavailDays.querySelectorAll(".planner-unavail-weekno").forEach(function (btn) {
          btn.addEventListener("click", function () {
            const weekKey = btn.dataset.week || "";
            if (!weekKey) return;
            if (!unavailableState.weeks) unavailableState.weeks = {};
            unavailableState.weeks[weekKey] = !unavailableState.weeks[weekKey];
            if (!unavailableState.weeks[weekKey]) delete unavailableState.weeks[weekKey];
            saveUnavailableState();
            renderMonth();
            renderUnavailablePicker();
          });
        });
        unavailDays.querySelectorAll(".planner-mini-day").forEach(function (btn) {
          btn.addEventListener("click", function () {
            const iso = btn.dataset.iso || "";
            if (!iso) return;
            if (!unavailableState.dateOverrides) unavailableState.dateOverrides = {};
            const isDateOverride = unavailableState.dateOverrides[iso] === true || unavailableState.dateOverrides[iso] === false;
            const currentlyUnavailable = isUnavailableIso(iso);
            if (!isDateOverride) {
              // First click sets an override that flips the current state.
              unavailableState.dateOverrides[iso] = !currentlyUnavailable;
            } else {
              // Second click removes the override and returns to weekday/week rule.
              delete unavailableState.dateOverrides[iso];
            }
            saveUnavailableState();
            renderMonth();
            renderUnavailablePicker();
          });
        });
        if (unavailWeekdays) {
          unavailWeekdays.querySelectorAll(".planner-unavail-wday").forEach(function (btn) {
            const wday = btn.dataset.wday;
            const active = !!(unavailableState.weekdays && unavailableState.weekdays[String(wday)]);
          btn.classList.toggle("active", active);
        });
      }
      }

      function openUnavailableDialog() {
        if (!unavailableDialog) return;
        unavailableMonth = new Date(activeMonth);
        renderUnavailablePicker();
        if (typeof unavailableDialog.showModal === "function") {
          if (!unavailableDialog.open) unavailableDialog.showModal();
        } else {
          unavailableDialog.setAttribute("open", "open");
        }
      }

      function closeUnavailableDialog() {
        if (!unavailableDialog) return;
        if (unavailableDialog.open && typeof unavailableDialog.close === "function") {
          unavailableDialog.close();
          return;
        }
        unavailableDialog.removeAttribute("open");
      }

      prevBtn.addEventListener("click", function () {
        activeMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1, 12, 0, 0, 0);
        renderMonth();
      });

      nextBtn.addEventListener("click", function () {
        activeMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1, 12, 0, 0, 0);
        renderMonth();
      });

      if (weekToggle) {
        weekToggle.addEventListener("click", function () {
          weekDayCount = weekDayCount === 7 ? 5 : 7;
          renderSelectedWeek();
        });
      }

      if (unavailableBtn) unavailableBtn.addEventListener("click", openUnavailableDialog);
      if (unavailableClose) unavailableClose.addEventListener("click", closeUnavailableDialog);
      if (unavailableDone) unavailableDone.addEventListener("click", closeUnavailableDialog);
      if (unavailPrev) {
        unavailPrev.addEventListener("click", function () {
          unavailableMonth = new Date(unavailableMonth.getFullYear(), unavailableMonth.getMonth() - 1, 1, 12, 0, 0, 0);
          renderUnavailablePicker();
        });
      }
      if (unavailNext) {
        unavailNext.addEventListener("click", function () {
          unavailableMonth = new Date(unavailableMonth.getFullYear(), unavailableMonth.getMonth() + 1, 1, 12, 0, 0, 0);
          renderUnavailablePicker();
        });
      }
      if (unavailWeekdays) {
        unavailWeekdays.querySelectorAll(".planner-unavail-wday").forEach(function (btn) {
          btn.addEventListener("click", function () {
            const wday = btn.dataset.wday;
            if (!unavailableState.weekdays) unavailableState.weekdays = {};
            const key = String(wday);
            unavailableState.weekdays[key] = !unavailableState.weekdays[key];
            if (!unavailableState.weekdays[key]) delete unavailableState.weekdays[key];
            saveUnavailableState();
            renderMonth();
            renderUnavailablePicker();
          });
        });
      }

      if (projectDialogClose) projectDialogClose.addEventListener("click", closeProjectDialog);
      if (projectDialogCancel) projectDialogCancel.addEventListener("click", closeProjectDialog);
      if (projectDialogSave) projectDialogSave.addEventListener("click", addPlannerAssignment);
      if (projectDialogDelete) {
        projectDialogDelete.addEventListener("click", function () {
          if (!pendingEditAssignmentId) return;
          deletePlannerAssignment(pendingEditAssignmentId, true);
        });
      }
      if (projectDialog) {
        projectDialog.addEventListener("cancel", function (event) {
          event.preventDefault();
          closeProjectDialog();
        });
        projectDialog.addEventListener("click", function (event) {
          if (event.target === projectDialog) closeProjectDialog();
        });
      }

      if (undoBtn) {
        undoBtn.addEventListener("click", function () {
          if (historyPast.length <= 1) return;
          const current = historyPast.pop();
          historyFuture.push(current);
          restoreAssignmentsFromSnapshot(historyPast[historyPast.length - 1]);
        });
      }

      if (redoBtn) {
        redoBtn.addEventListener("click", function () {
          if (!historyFuture.length) return;
          const next = historyFuture.pop();
          historyPast.push(next);
          restoreAssignmentsFromSnapshot(next);
        });
      }

      if (prevWeekBtn) prevWeekBtn.addEventListener("click", function () { shiftSelectedDateByDays(-7); });
      if (nextWeekBtn) nextWeekBtn.addEventListener("click", function () { shiftSelectedDateByDays(7); });
      if (todayBtn) {
        todayBtn.addEventListener("click", function () {
          selectedDate = new Date();
          selectedDate.setHours(12, 0, 0, 0);
          activeMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12, 0, 0, 0);
          renderMonth();
        });
      }

      // Initialize history with current state.
      recordHistorySnapshot();
      renderMonth();
    })();

