const STORAGE_KEY = document.body.dataset.storageKey || "project-manager-web-state-v3";
const IS_EMPTY_BOOTSTRAP = document.body.dataset.bootstrapMode === "empty";
const LANGUAGE_STORAGE_KEY = "project-manager-web-language";
const SUPPORTED_APP_LANGUAGES = ["en", "de", "el", "it"];
const CLEAR_STORAGE_KEYS = (document.body.dataset.clearStorageKeys || "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

const DRIVE_SYNC_TIME_STEP_MINUTES = 15;
const DRIVE_SYNC_DEFAULT_TIME_1 = "08:00";
const DRIVE_SYNC_DEFAULT_TIME_2 = "18:00";

function normalizeLanguageCode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SUPPORTED_APP_LANGUAGES.includes(normalized) ? normalized : "";
}

function normalizePersonalNumber(value) {
  const digits = String(value || "").replace(/\D+/g, "");
  if (!digits) return "";
  return digits.padStart(3, "0");
}

function getMemberPersonalNumber(member) {
  return normalizePersonalNumber(member?.personalNumber);
}

function getNextPersonalNumber(users = state.users || []) {
  const used = new Set((users || []).map((user) => getMemberPersonalNumber(user)).filter(Boolean));
  let next = 1;
  while (used.has(String(next).padStart(3, "0"))) next += 1;
  return String(next).padStart(3, "0");
}

function ensureUserPersonalNumbers(users = []) {
  const used = new Set();
  for (const user of users) {
    let personalNumber = normalizePersonalNumber(user?.personalNumber);
    if (!personalNumber || used.has(personalNumber)) {
      let next = 1;
      while (used.has(String(next).padStart(3, "0"))) next += 1;
      personalNumber = String(next).padStart(3, "0");
    }
    user.personalNumber = personalNumber;
    used.add(personalNumber);
  }
}

function normalizeFloorName(value) {
  return String(value || "").trim();
}

function normalizeFloorList(value) {
  const list = Array.isArray(value) ? value : [];
  const seen = new Set();
  const out = [];
  for (const entry of list) {
    const normalized = normalizeFloorName(entry);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function normalizeAreaQuickFilter(value) {
  return {
    floor: normalizeFloorName(value?.floor),
    query: String(value?.query || "").trim(),
  };
}

function getDefaultTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch (error) {
    return "UTC";
  }
}

function getAppTimezone() {
  try {
    const settings = normalizeDriveSyncSettings(state?.driveSyncSettings || {});
    return settings.timezone || getDefaultTimezone();
  } catch (error) {
    return getDefaultTimezone();
  }
}

function isValidTimezone(value) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch (error) {
    return false;
  }
}

function normalizeDriveSyncTime(value, fallback) {
  const raw = String(value || "").trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!match) return fallback;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallback;
  if (hours < 0 || hours > 23) return fallback;
  if (![0, 15, 30, 45].includes(minutes)) return fallback;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeDriveSyncSettings(value) {
  const timezone = String(value?.timezone || "").trim() || getDefaultTimezone();
  return {
    enabled: Boolean(value?.enabled),
    timezone,
    time1: normalizeDriveSyncTime(value?.time1, DRIVE_SYNC_DEFAULT_TIME_1),
    time2: normalizeDriveSyncTime(value?.time2, DRIVE_SYNC_DEFAULT_TIME_2),
  };
}

function normalizeDailyWorkDefaults(value) {
  return {
    memberIds: Array.isArray(value?.memberIds)
      ? [...new Set(value.memberIds.filter(Boolean))].slice(0, 2)
      : [],
  };
}

function buildDriveSyncTimeOptions() {
  const out = [];
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += DRIVE_SYNC_TIME_STEP_MINUTES) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
}

const DRIVE_SYNC_TIME_OPTIONS = buildDriveSyncTimeOptions();

function getLanguageFromUrl() {
  try {
    const url = new URL(window.location.href);
    return normalizeLanguageCode(url.searchParams.get("lang"));
  } catch (error) {
    return "";
  }
}

function syncLanguageInUrl(lang) {
  return "en";
}

function getStoredLanguage() {
  return "en";
}

const initialState = {
  clients: [],
  dailyWorks: [],
  equipmentCategories: [],
  equipmentItems: [],
  plannerAssignments: [],
  projects: [],
  rolePermissionDefaults: {},
  themeSettings: {},
  driveSyncSettings: {},
  dailyWorkDefaults: {},
  dailyWorkContacts: [],
  selectedProjectId: null,
  users: [],
  currentUserId: null,
  auditLog: [],
  userNotifications: [],
};

function clearRequestedStorageKeys() {
  for (const key of CLEAR_STORAGE_KEYS) {
    if (!key || key === STORAGE_KEY) continue;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // Ignore storage cleanup issues and continue with the current storage key.
    }
  }
}

function parseProjectNumberValue(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized || !/^\d+$/.test(normalized)) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatProjectNumberValue(value) {
  const parsed = parseProjectNumberValue(value);
  if (parsed == null) return "";
  return String(parsed).padStart(4, "0");
}

function ensureProjectNumbers(projects = []) {
  const savedProjects = projects.filter((project) => project && !project.isDraft);
  const used = new Set();
  let maxAssigned = -1;

  for (const project of savedProjects) {
    const parsed = parseProjectNumberValue(project.projectNumber);
    if (parsed == null || used.has(parsed)) {
      project.projectNumber = "";
      continue;
    }
    project.projectNumber = formatProjectNumberValue(parsed);
    used.add(parsed);
    if (parsed > maxAssigned) maxAssigned = parsed;
  }

  const missingProjects = savedProjects
    .map((project, index) => ({
      project,
      index,
      createdAt: Number.isFinite(Date.parse(project.createdAt || "")) ? Date.parse(project.createdAt || "") : Number.POSITIVE_INFINITY,
    }))
    .filter(({ project }) => !project.projectNumber)
    .sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
      return a.index - b.index;
    });

  let nextNumber = maxAssigned + 1;
  for (const entry of missingProjects) {
    while (used.has(nextNumber)) nextNumber += 1;
    entry.project.projectNumber = formatProjectNumberValue(nextNumber);
    used.add(nextNumber);
    maxAssigned = nextNumber;
    nextNumber = maxAssigned + 1;
  }
}

function getNextProjectNumber(projects = state.projects) {
  let maxAssigned = -1;
  for (const project of projects || []) {
    if (!project || project.isDraft) continue;
    const parsed = parseProjectNumberValue(project.projectNumber);
    if (parsed != null && parsed > maxAssigned) maxAssigned = parsed;
  }
  return formatProjectNumberValue(maxAssigned + 1);
}

function getProjectDisplayName(project, includeNumber = true) {
  const name = project?.name || "Untitled project";
  const number = formatProjectNumberValue(project?.projectNumber);
  return includeNumber && number ? `${number} - ${name}` : name;
}

const ROLE_LABELS = {
  admin: "Admin",
  developer: "Developer",
  manager: "Manager",
  user: "User",
};

const PERMISSION_DEFINITIONS = [
  { key: "createProject", label: "Create projects" },
  { key: "deleteProject", label: "Delete projects permanently" },
  { key: "archiveProject", label: "Archive projects" },
  { key: "createMembers", label: "Create members" },
  { key: "deleteMembers", label: "Delete members permanently" },
  { key: "createAdmin", label: "Create admins" },
  { key: "deleteAdmin", label: "Delete admins" },
  { key: "assignProjectManager", label: "Assign project manager" },
  { key: "manageProjectContent", label: "Edit project details, folders, notes, tasks" },
  { key: "manageAreasTeams", label: "Manage areas and service teams" },
  { key: "viewAllProjectTasks", label: "View all project tasks" },
  { key: "viewOwnAssignedTasks", label: "View own assigned tasks" },
  { key: "uploadFilesPhotos", label: "Upload files and photos" },
  { key: "changeRoles", label: "Change user roles" },
];

const DEFAULT_ROLE_PERMISSIONS = {
  admin: {
    createProject: true,
    deleteProject: true,
    archiveProject: true,
    createMembers: true,
    deleteMembers: true,
    createAdmin: true,
    deleteAdmin: true,
    assignProjectManager: true,
    manageProjectContent: true,
    manageAreasTeams: true,
    viewAllProjectTasks: true,
    viewOwnAssignedTasks: true,
    uploadFilesPhotos: true,
    changeRoles: true,
  },
  manager: {
    createProject: true,
    deleteProject: false,
    archiveProject: true,
    createMembers: false,
    deleteMembers: false,
    createAdmin: false,
    deleteAdmin: false,
    assignProjectManager: true,
    manageProjectContent: true,
    manageAreasTeams: true,
    viewAllProjectTasks: true,
    viewOwnAssignedTasks: true,
    uploadFilesPhotos: true,
    changeRoles: false,
  },
  user: {
    createProject: false,
    deleteProject: false,
    archiveProject: false,
    createMembers: false,
    deleteMembers: false,
    createAdmin: false,
    deleteAdmin: false,
    assignProjectManager: false,
    manageProjectContent: false,
    manageAreasTeams: false,
    viewAllProjectTasks: false,
    viewOwnAssignedTasks: true,
    uploadFilesPhotos: true,
    changeRoles: false,
  },
  developer: {
    createProject: true,
    deleteProject: true,
    archiveProject: true,
    createMembers: true,
    deleteMembers: true,
    createAdmin: true,
    deleteAdmin: true,
    assignProjectManager: true,
    manageProjectContent: true,
    manageAreasTeams: true,
    viewAllProjectTasks: true,
    viewOwnAssignedTasks: true,
    uploadFilesPhotos: true,
    changeRoles: true,
  },
};

function normalizeRolePermissionDefaults(value) {
  const next = {};
  for (const role of Object.keys(DEFAULT_ROLE_PERMISSIONS)) {
    next[role] = {
      ...DEFAULT_ROLE_PERMISSIONS[role],
      ...((value && typeof value === "object" && value[role]) || {}),
    };
  }
  return next;
}

const THEME_PALETTES = [
  { id: "sandstone", name: "Sandstone Calm", bg: "#f5efe5", panel: "rgba(255, 252, 247, 0.86)", panelStrong: "#fffdf8", railSurface: "rgba(239, 246, 244, 0.78)", workspaceSurface: "rgba(255, 252, 247, 0.86)", workspaceSoft: "rgba(255, 250, 242, 0.82)", workspaceFrame: "rgba(208, 146, 96, 0.5)", ink: "#1f2a2a", muted: "#61706d", line: "rgba(31, 42, 42, 0.12)", accent: "#0d7a73", accentStrong: "#0a5e59", accentSoft: "rgba(13, 122, 115, 0.12)", bodyBackground: "radial-gradient(circle at top left, rgba(225, 131, 82, 0.22), transparent 25%), radial-gradient(circle at top right, rgba(13, 122, 115, 0.18), transparent 30%), linear-gradient(180deg, #fcf6ed 0%, #f2ecdf 100%)" },
  { id: "fjord", name: "Fjord Mist", bg: "#edf4f7", panel: "rgba(248, 252, 255, 0.88)", panelStrong: "#ffffff", railSurface: "rgba(229, 241, 247, 0.82)", workspaceSurface: "rgba(241, 248, 251, 0.88)", workspaceSoft: "rgba(233, 244, 248, 0.84)", workspaceFrame: "rgba(102, 151, 173, 0.42)", ink: "#1e2c34", muted: "#60737d", line: "rgba(30, 44, 52, 0.12)", accent: "#2b7a9a", accentStrong: "#1f5a72", accentSoft: "rgba(43, 122, 154, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(121, 186, 214, 0.18), transparent 26%), radial-gradient(circle at top right, rgba(71, 122, 145, 0.12), transparent 28%), linear-gradient(180deg, #f6fbfd 0%, #e8f0f4 100%)" },
  { id: "ember", name: "Ember Paper", bg: "#f7efe8", panel: "rgba(255, 250, 245, 0.88)", panelStrong: "#fffefb", railSurface: "rgba(249, 236, 226, 0.8)", workspaceSurface: "rgba(255, 247, 240, 0.88)", workspaceSoft: "rgba(252, 239, 229, 0.84)", workspaceFrame: "rgba(198, 117, 82, 0.46)", ink: "#30231f", muted: "#7d6760", line: "rgba(48, 35, 31, 0.12)", accent: "#c76a3d", accentStrong: "#994b26", accentSoft: "rgba(199, 106, 61, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(225, 123, 72, 0.22), transparent 26%), radial-gradient(circle at top right, rgba(246, 193, 145, 0.14), transparent 30%), linear-gradient(180deg, #fff8f1 0%, #f1e3d7 100%)" },
  { id: "forest", name: "Forest Ledger", bg: "#eef4ee", panel: "rgba(249, 253, 248, 0.88)", panelStrong: "#ffffff", railSurface: "rgba(230, 241, 232, 0.82)", workspaceSurface: "rgba(243, 249, 242, 0.88)", workspaceSoft: "rgba(234, 243, 233, 0.84)", workspaceFrame: "rgba(89, 136, 97, 0.44)", ink: "#223026", muted: "#647568", line: "rgba(34, 48, 38, 0.12)", accent: "#4f8a5c", accentStrong: "#356640", accentSoft: "rgba(79, 138, 92, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(107, 172, 118, 0.18), transparent 26%), radial-gradient(circle at top right, rgba(74, 138, 92, 0.12), transparent 30%), linear-gradient(180deg, #f8fcf7 0%, #e5ede3 100%)" },
  { id: "orchid", name: "Orchid Ledger", bg: "#f4eef8", panel: "rgba(252, 249, 255, 0.88)", panelStrong: "#ffffff", railSurface: "rgba(240, 233, 248, 0.82)", workspaceSurface: "rgba(248, 243, 252, 0.88)", workspaceSoft: "rgba(241, 233, 247, 0.84)", workspaceFrame: "rgba(149, 112, 186, 0.42)", ink: "#2b2432", muted: "#73677e", line: "rgba(43, 36, 50, 0.12)", accent: "#8e63b9", accentStrong: "#6a4491", accentSoft: "rgba(142, 99, 185, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(178, 138, 219, 0.2), transparent 24%), radial-gradient(circle at top right, rgba(131, 100, 165, 0.14), transparent 30%), linear-gradient(180deg, #fcf8ff 0%, #ece3f4 100%)" },
  { id: "slate", name: "Slate Studio", bg: "#eef1f4", panel: "rgba(249, 251, 253, 0.88)", panelStrong: "#ffffff", railSurface: "rgba(232, 237, 242, 0.82)", workspaceSurface: "rgba(242, 246, 249, 0.88)", workspaceSoft: "rgba(233, 238, 243, 0.84)", workspaceFrame: "rgba(112, 132, 148, 0.42)", ink: "#22303a", muted: "#697883", line: "rgba(34, 48, 58, 0.12)", accent: "#4b708f", accentStrong: "#35546f", accentSoft: "rgba(75, 112, 143, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(117, 157, 189, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(72, 99, 122, 0.12), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #e3e8ed 100%)" },
  { id: "rose", name: "Rose Office", bg: "#f8eef1", panel: "rgba(255, 249, 251, 0.88)", panelStrong: "#fffefe", railSurface: "rgba(247, 232, 238, 0.82)", workspaceSurface: "rgba(252, 242, 246, 0.88)", workspaceSoft: "rgba(247, 232, 238, 0.84)", workspaceFrame: "rgba(192, 118, 144, 0.42)", ink: "#34252b", muted: "#7d6870", line: "rgba(52, 37, 43, 0.12)", accent: "#c06786", accentStrong: "#94465f", accentSoft: "rgba(192, 103, 134, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(226, 126, 160, 0.2), transparent 24%), radial-gradient(circle at top right, rgba(193, 124, 147, 0.12), transparent 30%), linear-gradient(180deg, #fff9fb 0%, #efe2e7 100%)" },
  { id: "midnight", name: "Midnight Paper", bg: "#edf0f7", panel: "rgba(249, 250, 255, 0.88)", panelStrong: "#ffffff", railSurface: "rgba(232, 236, 247, 0.82)", workspaceSurface: "rgba(241, 244, 252, 0.88)", workspaceSoft: "rgba(232, 237, 247, 0.84)", workspaceFrame: "rgba(94, 110, 170, 0.42)", ink: "#20273d", muted: "#65708f", line: "rgba(32, 39, 61, 0.12)", accent: "#4b62b3", accentStrong: "#31478b", accentSoft: "rgba(75, 98, 179, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(103, 128, 225, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(76, 92, 160, 0.12), transparent 30%), linear-gradient(180deg, #f8f9ff 0%, #e3e7f4 100%)" },
  { id: "cocoa", name: "Cocoa Grid", bg: "#f5f0eb", panel: "rgba(255, 251, 247, 0.88)", panelStrong: "#fffdfb", railSurface: "rgba(244, 235, 227, 0.82)", workspaceSurface: "rgba(252, 246, 240, 0.88)", workspaceSoft: "rgba(244, 236, 229, 0.84)", workspaceFrame: "rgba(161, 121, 92, 0.44)", ink: "#2d261f", muted: "#7b6a5b", line: "rgba(45, 38, 31, 0.12)", accent: "#9b6b47", accentStrong: "#744a2e", accentSoft: "rgba(155, 107, 71, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(194, 143, 99, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(151, 110, 74, 0.12), transparent 30%), linear-gradient(180deg, #fdf9f5 0%, #ebe1d8 100%)" },
  { id: "mint", name: "Mint Desk", bg: "#ebf5f1", panel: "rgba(247, 253, 250, 0.88)", panelStrong: "#ffffff", railSurface: "rgba(227, 244, 237, 0.82)", workspaceSurface: "rgba(239, 249, 245, 0.88)", workspaceSoft: "rgba(228, 243, 237, 0.84)", workspaceFrame: "rgba(92, 164, 139, 0.42)", ink: "#20322d", muted: "#5f7870", line: "rgba(32, 50, 45, 0.12)", accent: "#2fa57f", accentStrong: "#1f7c5f", accentSoft: "rgba(47, 165, 127, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(75, 192, 151, 0.2), transparent 24%), radial-gradient(circle at top right, rgba(40, 135, 104, 0.12), transparent 30%), linear-gradient(180deg, #f6fdfa 0%, #dfeee8 100%)" },
  { id: "amber", name: "Amber Draft", bg: "#f8f1e4", panel: "rgba(255, 252, 246, 0.88)", panelStrong: "#fffefb", railSurface: "rgba(247, 239, 219, 0.82)", workspaceSurface: "rgba(252, 247, 236, 0.88)", workspaceSoft: "rgba(246, 238, 216, 0.84)", workspaceFrame: "rgba(202, 162, 84, 0.42)", ink: "#332918", muted: "#7e6c48", line: "rgba(51, 41, 24, 0.12)", accent: "#d09a2f", accentStrong: "#9f731d", accentSoft: "rgba(208, 154, 47, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(235, 177, 60, 0.22), transparent 24%), radial-gradient(circle at top right, rgba(192, 145, 39, 0.12), transparent 30%), linear-gradient(180deg, #fffaf0 0%, #ece2cd 100%)" },
  { id: "lagoon", name: "Lagoon Work", bg: "#eaf5f6", panel: "rgba(246, 253, 253, 0.88)", panelStrong: "#ffffff", railSurface: "rgba(227, 243, 245, 0.82)", workspaceSurface: "rgba(237, 249, 250, 0.88)", workspaceSoft: "rgba(226, 241, 243, 0.84)", workspaceFrame: "rgba(78, 160, 168, 0.42)", ink: "#203236", muted: "#60797d", line: "rgba(32, 50, 54, 0.12)", accent: "#1f95a0", accentStrong: "#136f77", accentSoft: "rgba(31, 149, 160, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(83, 190, 199, 0.2), transparent 24%), radial-gradient(circle at top right, rgba(31, 128, 136, 0.12), transparent 30%), linear-gradient(180deg, #f5fdfe 0%, #dfecee 100%)" },
  { id: "charcoal", name: "Charcoal Ink", bg: "#f0f1f2", panel: "rgba(251, 252, 252, 0.88)", panelStrong: "#ffffff", railSurface: "rgba(235, 237, 238, 0.82)", workspaceSurface: "rgba(243, 245, 245, 0.88)", workspaceSoft: "rgba(233, 235, 236, 0.84)", workspaceFrame: "rgba(112, 119, 125, 0.42)", ink: "#21282c", muted: "#687276", line: "rgba(33, 40, 44, 0.12)", accent: "#4a5a64", accentStrong: "#334149", accentSoft: "rgba(74, 90, 100, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(120, 132, 141, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(76, 88, 96, 0.12), transparent 30%), linear-gradient(180deg, #fafbfb 0%, #e2e5e7 100%)" },
  { id: "berry", name: "Berry Ledger", bg: "#f7eef5", panel: "rgba(255, 249, 254, 0.88)", panelStrong: "#ffffff", railSurface: "rgba(246, 232, 243, 0.82)", workspaceSurface: "rgba(252, 242, 250, 0.88)", workspaceSoft: "rgba(245, 232, 243, 0.84)", workspaceFrame: "rgba(168, 100, 148, 0.42)", ink: "#332332", muted: "#7b6678", line: "rgba(51, 35, 50, 0.12)", accent: "#b24d93", accentStrong: "#8a356f", accentSoft: "rgba(178, 77, 147, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(210, 112, 180, 0.2), transparent 24%), radial-gradient(circle at top right, rgba(155, 87, 132, 0.12), transparent 30%), linear-gradient(180deg, #fff9fe 0%, #eedfea 100%)" },
  { id: "olive", name: "Olive Studio", bg: "#f1f4e8", panel: "rgba(252, 253, 247, 0.88)", panelStrong: "#ffffff", railSurface: "rgba(237, 242, 225, 0.82)", workspaceSurface: "rgba(246, 249, 238, 0.88)", workspaceSoft: "rgba(236, 241, 224, 0.84)", workspaceFrame: "rgba(141, 160, 84, 0.42)", ink: "#2b3120", muted: "#70785c", line: "rgba(43, 49, 32, 0.12)", accent: "#859b3a", accentStrong: "#617324", accentSoft: "rgba(133, 155, 58, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(177, 200, 89, 0.2), transparent 24%), radial-gradient(circle at top right, rgba(124, 148, 53, 0.12), transparent 30%), linear-gradient(180deg, #fafcf3 0%, #e6ead8 100%)" },
  { id: "coral", name: "Coral Board", bg: "#f9eeea", panel: "rgba(255, 249, 247, 0.88)", panelStrong: "#ffffff", railSurface: "rgba(248, 235, 231, 0.82)", workspaceSurface: "rgba(253, 243, 240, 0.88)", workspaceSoft: "rgba(247, 234, 229, 0.84)", workspaceFrame: "rgba(200, 117, 96, 0.42)", ink: "#342722", muted: "#816860", line: "rgba(52, 39, 34, 0.12)", accent: "#d16e55", accentStrong: "#a24f39", accentSoft: "rgba(209, 110, 85, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(235, 134, 109, 0.22), transparent 24%), radial-gradient(circle at top right, rgba(191, 110, 87, 0.12), transparent 30%), linear-gradient(180deg, #fff9f7 0%, #eedfd8 100%)" },
  { id: "denim", name: "Denim Notes", bg: "#edf1f8", panel: "rgba(249, 251, 255, 0.88)", panelStrong: "#ffffff", railSurface: "rgba(233, 238, 247, 0.82)", workspaceSurface: "rgba(241, 245, 252, 0.88)", workspaceSoft: "rgba(232, 237, 246, 0.84)", workspaceFrame: "rgba(92, 117, 176, 0.42)", ink: "#232b3b", muted: "#69728b", line: "rgba(35, 43, 59, 0.12)", accent: "#456ac2", accentStrong: "#2e4e96", accentSoft: "rgba(69, 106, 194, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(107, 141, 224, 0.2), transparent 24%), radial-gradient(circle at top right, rgba(67, 91, 157, 0.12), transparent 30%), linear-gradient(180deg, #f8faff 0%, #e0e6f2 100%)" },
  { id: "peach", name: "Peach Paper", bg: "#fbf0ea", panel: "rgba(255, 251, 248, 0.88)", panelStrong: "#fffefd", railSurface: "rgba(250, 239, 232, 0.82)", workspaceSurface: "rgba(254, 246, 241, 0.88)", workspaceSoft: "rgba(248, 236, 228, 0.84)", workspaceFrame: "rgba(216, 151, 113, 0.42)", ink: "#342a23", muted: "#826c5d", line: "rgba(52, 42, 35, 0.12)", accent: "#db8b5d", accentStrong: "#b0673d", accentSoft: "rgba(219, 139, 93, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(239, 170, 119, 0.2), transparent 24%), radial-gradient(circle at top right, rgba(204, 131, 83, 0.12), transparent 30%), linear-gradient(180deg, #fffaf6 0%, #f0e0d5 100%)" },
  { id: "pine", name: "Pine Ledger", bg: "#ebf2ee", panel: "rgba(248, 252, 249, 0.88)", panelStrong: "#ffffff", railSurface: "rgba(231, 240, 235, 0.82)", workspaceSurface: "rgba(240, 247, 242, 0.88)", workspaceSoft: "rgba(230, 239, 233, 0.84)", workspaceFrame: "rgba(77, 124, 103, 0.42)", ink: "#203028", muted: "#62756a", line: "rgba(32, 48, 40, 0.12)", accent: "#3d7a60", accentStrong: "#285844", accentSoft: "rgba(61, 122, 96, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(92, 157, 126, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(54, 105, 83, 0.12), transparent 30%), linear-gradient(180deg, #f6fbf8 0%, #dfe7e2 100%)" },
  { id: "plum", name: "Plum Draft", bg: "#f4eef4", panel: "rgba(252, 249, 252, 0.88)", panelStrong: "#ffffff", railSurface: "rgba(240, 232, 240, 0.82)", workspaceSurface: "rgba(248, 243, 248, 0.88)", workspaceSoft: "rgba(240, 232, 240, 0.84)", workspaceFrame: "rgba(138, 105, 145, 0.42)", ink: "#2e2530", muted: "#746676", line: "rgba(46, 37, 48, 0.12)", accent: "#8e5c98", accentStrong: "#68426f", accentSoft: "rgba(142, 92, 152, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(170, 125, 181, 0.2), transparent 24%), radial-gradient(circle at top right, rgba(123, 84, 132, 0.12), transparent 30%), linear-gradient(180deg, #fcf8fc 0%, #e8dfe8 100%)" },
  { id: "skyline", name: "Skyline Work", bg: "#eef6fb", panel: "rgba(249, 253, 255, 0.88)", panelStrong: "#ffffff", railSurface: "rgba(232, 244, 250, 0.82)", workspaceSurface: "rgba(241, 249, 253, 0.88)", workspaceSoft: "rgba(231, 242, 248, 0.84)", workspaceFrame: "rgba(93, 150, 197, 0.42)", ink: "#20313d", muted: "#627888", line: "rgba(32, 49, 61, 0.12)", accent: "#3c8cc5", accentStrong: "#276996", accentSoft: "rgba(60, 140, 197, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(108, 183, 224, 0.2), transparent 24%), radial-gradient(circle at top right, rgba(67, 134, 174, 0.12), transparent 30%), linear-gradient(180deg, #f7fcff 0%, #dfebf3 100%)" },
  { id: "graphite", name: "Graphite Calm", bg: "#f1f2f4", panel: "rgba(252, 252, 253, 0.88)", panelStrong: "#ffffff", railSurface: "rgba(236, 237, 240, 0.82)", workspaceSurface: "rgba(245, 246, 248, 0.88)", workspaceSoft: "rgba(234, 235, 238, 0.84)", workspaceFrame: "rgba(116, 121, 134, 0.42)", ink: "#242831", muted: "#6b717f", line: "rgba(36, 40, 49, 0.12)", accent: "#5e6678", accentStrong: "#434a58", accentSoft: "rgba(94, 102, 120, 0.14)", bodyBackground: "radial-gradient(circle at top left, rgba(132, 141, 160, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(84, 91, 108, 0.12), transparent 30%), linear-gradient(180deg, #fafbfd 0%, #e2e4e8 100%)" },
];

const FONT_OPTIONS = [
  { id: "arial", label: "Arial", value: "Arial, sans-serif" },
  { id: "segoe-ui", label: "Segoe UI", value: "\"Segoe UI\", sans-serif" },
  { id: "verdana", label: "Verdana", value: "Verdana, sans-serif" },
  { id: "tahoma", label: "Tahoma", value: "Tahoma, sans-serif" },
  { id: "trebuchet-ms", label: "Trebuchet MS", value: "\"Trebuchet MS\", sans-serif" },
  { id: "georgia", label: "Georgia", value: "Georgia, serif" },
  { id: "times-new-roman", label: "Times New Roman", value: "\"Times New Roman\", serif" },
  { id: "palatino", label: "Palatino Linotype", value: "\"Palatino Linotype\", serif" },
  { id: "courier-new", label: "Courier New", value: "\"Courier New\", monospace" },
  { id: "lucida-sans", label: "Lucida Sans", value: "\"Lucida Sans Unicode\", \"Lucida Sans\", sans-serif" },
];

const FONT_SIZE_OPTIONS = [
  { id: "very-small", label: "Very Small", value: "13px" },
  { id: "small", label: "Small", value: "14px" },
  { id: "medium", label: "Medium", value: "16px" },
  { id: "large", label: "Large", value: "18px" },
  { id: "very-large", label: "Very Large", value: "20px" },
];

function normalizeThemeSettings(value) {
  const paletteId = THEME_PALETTES.some((palette) => palette.id === value?.paletteId) ? value.paletteId : THEME_PALETTES[0].id;
  const fontId = FONT_OPTIONS.some((font) => font.id === value?.fontId) ? value.fontId : FONT_OPTIONS[0].id;
  const fontSizeId = FONT_SIZE_OPTIONS.some((size) => size.id === value?.fontSizeId) ? value.fontSizeId : FONT_SIZE_OPTIONS[2].id;
  return { paletteId, fontId, fontSizeId };
}

const PROJECT_ROLES = new Set(["admin", "manager"]);

const FOLDER_TAB_PALETTE = [
  "#dff4f2",
  "#e6f0ff",
  "#f8eadf",
  "#efe4fb",
  "#e3f4e8",
  "#fbe8ee",
];

const PRIMARY_TAB_COLORS = {
  "folders-hub": "#dff4f2",
  "open-tasks": "#fbe8ee",
};

const CONTENT_TAB_COLORS = {
  note: "#efe4fb",
  file: "#e6f0ff",
  photo: "#f8eadf",
  task: "#e3f4e8",
  chat: "#fde6f0",
};

const DEFAULT_SECTION_VIEW_MODES = {
  "details:plan": "boxes",
  "details:areas": "boxes",
  "details:tasks": "list",
  "details:teams": "boxes",
  "details:chat": "list",
  "members:directory": "boxes",
  "folder:note": "boxes",
  "folder:file": "boxes",
  "folder:photo": "list",
  "folder:task": "boxes",
};

const PROJECT_SURFACE_PRESETS = [
  { name: "Ivory", color: "#fffaf2" },
  { name: "Sand", color: "#f5ede0" },
  { name: "Stone", color: "#e8e1d7" },
  { name: "Fog", color: "#e9eef2" },
  { name: "Sky", color: "#dfeaf7" },
  { name: "Ice", color: "#dff4f2" },
  { name: "Sea", color: "#d7ecef" },
  { name: "Mint", color: "#dff0e3" },
  { name: "Sage", color: "#d8e6cf" },
  { name: "Lime", color: "#ecf3cf" },
  { name: "Sun", color: "#fff0bf" },
  { name: "Honey", color: "#fde0b8" },
  { name: "Peach", color: "#f9d4c0" },
  { name: "Rose", color: "#f4d2d8" },
  { name: "Blush", color: "#efdbe8" },
  { name: "Lilac", color: "#e5dcf4" },
  { name: "Lavender", color: "#dde1fb" },
  { name: "Blue", color: "#cfe0f7" },
  { name: "Teal", color: "#cfe7e4" },
  { name: "Clay", color: "#e7d0c0" },
];

const SERVICE_TEAM_COLOR_PRESETS = [
  { name: "Teal", color: "#0d7a73" },
  { name: "Blue", color: "#1c63d5" },
  { name: "Orange", color: "#d46a1f" },
  { name: "Red", color: "#c93b28" },
  { name: "Berry", color: "#b42864" },
  { name: "Violet", color: "#6f42d8" },
  { name: "Grass", color: "#3f8b2d" },
  { name: "Gold", color: "#b68a00" },
];

const AREA_ICON_PRESETS = [
  { key: "none", label: "No icon" },
  { key: "bathroom", label: "Bathroom" },
  { key: "kitchen", label: "Kitchen" },
  { key: "bedroom", label: "Bedroom" },
  { key: "livingroom", label: "Living Room" },
  { key: "balcony", label: "Balcony" },
  { key: "stairs", label: "Stairs" },
  { key: "door", label: "Door" },
  { key: "window", label: "Window" },
  { key: "garage", label: "Garage" },
  { key: "roof", label: "Roof" },
  { key: "electrical", label: "Electrical" },
  { key: "plumbing", label: "Plumbing" },
  { key: "heating", label: "Heating / HVAC" },
  { key: "painting", label: "Painting" },
  { key: "flooring", label: "Flooring" },
  { key: "storage", label: "Storage" },
  { key: "outside", label: "Exterior" },
  { key: "office", label: "Office" },
  { key: "laundry", label: "Laundry" },
];

const EQUIPMENT_ICON_PRESETS = [
  { key: "none", label: "No icon" },
  { key: "toolbox", label: "Toolbox" },
  { key: "wrench", label: "Wrench" },
  { key: "drill", label: "Drill" },
  { key: "helmet", label: "Helmet" },
  { key: "measure", label: "Measure" },
  { key: "ladder", label: "Ladder" },
  { key: "vehicle", label: "Vehicle" },
  { key: "machine", label: "Machine" },
];

const DEFAULT_EQUIPMENT_CATEGORY_NAMES = [
  "Plumbing tools",
  "Electrical tools",
  "Machines",
  "Measuring tools",
  "PPE",
  "Vehicles",
];

const DEFAULT_NAV_VIEW_ORDER = ["projects", "planner", "daily-works", "teams", "equipment", "clients", "theme", "audit"];
const MOBILE_PROJECT_BREAKPOINT = 760;
const PLANNER_DAY_START_HOUR = 6;
const PLANNER_DAY_END_HOUR = 22;
const PLANNER_DEFAULT_START_TIME = "08:00";
const PLANNER_DEFAULT_END_TIME = "16:00";

clearRequestedStorageKeys();
const demoMode = new URLSearchParams(window.location.search).get("demo") || "";
if (demoMode === "reset") {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // Continue even if the phone browser blocks storage.
  }
}
let state;
try {
  state = normalizeState(demoMode === "client" ? createClientPreviewState() : loadState());
  window.__pmDebugState = {
    demoMode,
    projects: state.projects?.length || 0,
    users: state.users?.length || 0,
    currentUserId: state.currentUserId || "",
  };
} catch (error) {
  window.__pmBootError = error?.stack || error?.message || String(error);
  console.error("Project Manager boot failed", error);
  state = normalizeState(loadState());
}
let cameraStream = null;
let recognition = null;
let currentSpeechSummaryItems = [];
let currentSpeechTranscriptBuffer = "";
let speechHasMagicReadyPhrase = false;
let currentView = "projects";
let selectedClientId = "";
let clientSearchQuery = "";
let clientSearchScope = "all";
let memberSearchQuery = "";
let memberRoleFilter = "all";
let memberSkillFilter = "all";
let memberWorkmodeFilter = "all";
let equipmentSearchQuery = "";
let serviceTeamExperienceFilter = "all";
let serviceTeamPositionFilter = "all";
let serviceTeamSelectedMemberIds = new Set();
let serviceTeamSelectedAreaIds = new Set();
let selectedPermissionMatrixUserIds = new Set();
let permissionMatrixUserFilterInitialized = false;
let projectSearchQuery = "";
let auditSearchQuery = "";
let isClientFormExpanded = false;
let isMemberFormExpanded = false;
let isEquipmentFormExpanded = false;
let isEquipmentCategoryFormExpanded = false;
let showArchivedMembers = false;
let showArchivedEquipment = false;
let selectedEquipmentCategoryFilterIds = new Set();
let expandedMemberId = "";
let expandedEquipmentId = "";
let editingClientId = null;
let editingMemberId = null;
let editingEquipmentId = null;
let editingEquipmentCategoryId = null;
let formValidationMessageLocked = false;
let selectedArchivedProjectIds = new Set();
let expandedTaskId = "";
let currentWorkspaceTab = "folders-hub";
let currentContentTab = "note";
let currentProjectDetailsTab = "plan";
let isProjectSetupExpanded = false;
let isProjectSetupDialogOpen = false;
let currentTeamsTab = "members";
let pendingAssetTarget = null;
let pendingPhotoUploadAreaIds = new Set();
let pendingPhotoUploadMode = "photo";
let pendingCameraAreaIds = new Set();
let pendingAreaTaskId = null;
let pendingProjectTaskMode = false;
let editingNoteId = null;
let pendingNoteImageDataUrl = "";
let pendingNoteImageName = "";
let noteStyleMode = "text";
let pendingFocusedItemId = "";
let editingAreaId = null;
let editingServiceTeamId = null;
let serviceTeamDialogInfoExpanded = true;
let areActiveProjectsExpanded = false;
let areCompletedProjectsExpanded = false;
let areArchivedProjectsExpanded = false;
let showArchivedWorkspaceItems = false;
let developerPreviewSourceUserId = null;
let showOtherTeamsForUser = false;
let showAssignedProjectsOnly = false;
let activeCardMenu = null;
let navigationHistory = [];
let navigationFuture = [];
let appConfirmResolver = null;
let plansAddResolver = null;
let mentionSuggestState = null;
let showArchivedClients = false;
let membersListPanelExpanded = true;
let membersDetailPanelExpanded = true;
let clientsListPanelExpanded = true;
let clientsDetailPanelExpanded = true;
let equipmentListPanelExpanded = true;
let equipmentDetailPanelExpanded = true;
let isProjectsRailCollapsed = false;
let activeProjectTeamInfoId = "";
let currentMobileProjectsPane = "list";
let plannerMode = "week";
let plannerSlotHours = 1;
let plannerAnchorDate = todayInputValue();
let dailyWorksAnchorDate = todayInputValue();
let editingDailyWorkId = "";
let dailyWorkSelectedMemberIds = new Set();
let draggedDailyWorkId = "";
let dailyWorkSuppressNextClick = false;
let selectedPlannerTeamId = "";
let editingPlannerAssignmentId = null;
let selectedProjectAreaId = "";
let currentAreaTeamScope = "all";
let wasMobileProjectViewport = typeof window !== "undefined"
  ? window.innerWidth <= MOBILE_PROJECT_BREAKPOINT
  : false;
let draggedNavView = "";
let areaBrowserAreaId = "";
let areaBrowserViewMode = "grid";
let areaBrowserSortFilter = "time";
let areaBrowserTeamFilter = "all";
let areaBrowserTypeFilter = "all";
let currentAppLanguage = getStoredLanguage();
const APP_TRANSLATIONS = (typeof window !== "undefined" && window.APP_TRANSLATIONS) ? window.APP_TRANSLATIONS : { de: {}, el: {}, it: {} };
const APP_TRANSLATIONS_NORMALIZED_CACHE = {};
const textNodeSourceMap = new WeakMap();
let imagePreviewGallery = [];
let imagePreviewIndex = 0;
const formSnapshots = new Map();
const PROJECT_DRAFT_LOCK_MESSAGE = "You have to add name, project manager, and client first before editing.";
const TRACKED_FORM_LABELS = {
  project: "Project setup",
  note: "Note",
  task: "Task",
  area: "Area",
  serviceTeam: "Service Team",
  photoUpload: "Photo upload",
  camera: "Camera photo",
  plannerAssignment: "Planner assignment",
  dailyWork: "Daily work",
  client: "Client",
  member: "Member",
  equipment: "Equipment",
  equipmentCategory: "Equipment category",
};

function createProjectFromHeader() {
  if (isProjectSetupDialogOpen) {
    closeProjectSetup();
    return;
  }
  if (!confirmDiscardAndMaybeDeleteDraft()) return;
  if (!requirePermission(hasPermission("createProject"), "You do not have permission to create projects.")) return;
  const newProject = createBlankProject();
  newProject.isDraft = true;
  if (state.currentUserId) newProject.memberIds.push(state.currentUserId);
  state.projects.unshift(newProject);
  selectProject(newProject.id, false, true);
  isProjectSetupDialogOpen = true;
  isProjectSetupExpanded = true;
  currentMobileProjectsPane = "list";
  persist();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function captureFormSnapshot(form) {
  if (!form) return "[]";
  const values = [];
  for (const field of Array.from(form.elements || [])) {
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) continue;
    const key = field.name || field.id;
    if (!key || field.disabled) continue;
    if ((field.type === "checkbox" || field.type === "radio") && !field.checked) continue;
    values.push([key, field.value]);
  }
  return JSON.stringify(values);
}

function captureTrackedFormSnapshot(key, form) {
  const baseSnapshot = captureFormSnapshot(form);
  if (key === "camera") {
    const values = [
      ["photoName", String(els.cameraPhotoName?.value || "").trim()],
      ["selectedAreaIds", [...pendingCameraAreaIds].sort().join("|")],
    ];
    return JSON.stringify(values);
  }
  if (key === "photoUpload") {
    const extraValues = [
      ["selectedAreaIds", [...pendingPhotoUploadAreaIds].sort().join("|")],
      ["mode", pendingPhotoUploadMode],
    ];
    return JSON.stringify([baseSnapshot, extraValues]);
  }
  if (key === "dailyWork") {
    const extraValues = [
      ["selectedMemberIds", [...dailyWorkSelectedMemberIds].sort().join("|")],
    ];
    return JSON.stringify([baseSnapshot, extraValues]);
  }
  if (key !== "serviceTeam") return baseSnapshot;
  const extraValues = [
    ["selectedMemberIds", [...serviceTeamSelectedMemberIds].sort().join("|")],
    ["selectedAreaIds", [...serviceTeamSelectedAreaIds].sort().join("|")],
    ["selectedColor", normalizeHexColor(els.serviceTeamColor?.value || "")],
  ];
  return JSON.stringify([baseSnapshot, extraValues]);
}

function rememberFormSnapshot(key, form) {
  if (!form) return;
  formSnapshots.set(key, captureTrackedFormSnapshot(key, form));
}

function getDirtyTrackedForms(keys = Object.keys(TRACKED_FORM_LABELS)) {
  return keys
    .map((key) => {
      const form = key === "project"
        ? els.projectForm
        : key === "note"
          ? els.noteForm
          : key === "task"
            ? els.taskForm
            : key === "area"
              ? els.areaForm
            : key === "serviceTeam"
              ? els.serviceTeamForm
              : key === "photoUpload"
                ? els.photoUploadOptionsForm
              : key === "camera"
                ? null
              : key === "plannerAssignment"
                ? els.plannerAssignmentForm
                : key === "dailyWork"
                  ? els.dailyWorkForm
              : key === "client"
                ? els.clientForm
              : key === "member"
                ? els.memberForm
              : key === "equipment"
                ? els.equipmentForm
                : key === "equipmentCategory"
                  ? els.equipmentCategoryForm
              : null;
      const isActive = key === "project"
        ? Boolean(isProjectSetupDialogOpen && !els.projectSetupPanel?.classList.contains("hidden"))
        : key === "note"
          ? Boolean(els.noteDialog?.open)
          : key === "task"
            ? Boolean(els.taskDialog?.open)
            : key === "area"
              ? Boolean(els.areaDialog?.open)
            : key === "serviceTeam"
              ? Boolean(els.serviceTeamDialog?.open)
              : key === "photoUpload"
                ? Boolean(els.photoUploadOptionsDialog?.open)
              : key === "camera"
                ? Boolean(els.cameraDialog?.open)
              : key === "plannerAssignment"
                ? Boolean(els.plannerAssignmentDialog?.open)
                : key === "dailyWork"
                  ? Boolean(els.dailyWorkDialog?.open)
              : key === "client"
                ? Boolean(isClientFormExpanded && !els.clientFormShell?.classList.contains("hidden"))
              : key === "member"
                ? Boolean(isMemberFormExpanded && !els.memberFormShell?.classList.contains("hidden"))
              : key === "equipment"
                ? Boolean(isEquipmentFormExpanded && !els.equipmentFormShell?.classList.contains("hidden"))
                : key === "equipmentCategory"
                  ? Boolean(isEquipmentCategoryFormExpanded && !els.equipmentCategoryFormShell?.classList.contains("hidden"))
              : false;
      if (!isActive) return null;
      const baseline = formSnapshots.get(key);
      if (baseline == null) return null;
      if (captureTrackedFormSnapshot(key, form) === baseline) return null;
      return { key, label: TRACKED_FORM_LABELS[key] };
    })
    .filter(Boolean);
}

function closeAppMessageDialog() {
  if (els.appMessageDialog?.open) els.appMessageDialog.close();
}

function showAppMessage(message, tone = "info", title = "") {
  if (!els.appMessageDialog || !els.appMessageForm || !els.appMessageBody) {
    window.alert(message);
    return;
  }
  const titles = {
    info: "Notice",
    success: "Done",
    warning: "Warning",
  };
  const eyebrows = {
    info: "Notice",
    success: "Success",
    warning: "Warning",
  };
  const resolvedTone = ["info", "success", "warning"].includes(tone) ? tone : "info";
  els.appMessageForm.dataset.tone = resolvedTone;
  if (els.appMessageEyebrow) els.appMessageEyebrow.textContent = eyebrows[resolvedTone];
  if (els.appMessageTitle) els.appMessageTitle.textContent = title || titles[resolvedTone];
  els.appMessageBody.textContent = message;
  if (!els.appMessageDialog.open) {
    els.appMessageDialog.showModal();
  }
}

function closeAppConfirmDialog(result = false) {
  if (els.appConfirmDialog?.open) els.appConfirmDialog.close();
  if (appConfirmResolver) {
    const resolve = appConfirmResolver;
    appConfirmResolver = null;
    resolve(result);
  }
}

function showAppConfirm(message, title = "Are you sure?", options = {}) {
  if (!els.appConfirmDialog || !els.appConfirmForm || !els.appConfirmBody) {
    return Promise.resolve(window.confirm(message));
  }
  const {
    eyebrow = "Confirm",
    confirmLabel = "Yes",
    cancelLabel = "No",
    tone = "warning",
  } = options;
  if (appConfirmResolver) {
    const resolve = appConfirmResolver;
    appConfirmResolver = null;
    resolve(false);
  }
  const resolvedTone = ["info", "success", "warning"].includes(tone) ? tone : "warning";
  els.appConfirmForm.dataset.tone = resolvedTone;
  if (els.appConfirmEyebrow) els.appConfirmEyebrow.textContent = eyebrow;
  if (els.appConfirmTitle) els.appConfirmTitle.textContent = title;
  if (els.appConfirmBody) els.appConfirmBody.textContent = message;
  if (els.appConfirmOkBtn) els.appConfirmOkBtn.textContent = confirmLabel;
  if (els.appConfirmCancelBtn) els.appConfirmCancelBtn.textContent = cancelLabel;
  if (!els.appConfirmDialog.open) {
    els.appConfirmDialog.showModal();
  }
  return new Promise((resolve) => {
    appConfirmResolver = resolve;
  });
}

function closePermissionMemberDialog() {
  if (els.permissionMemberDialog?.open) els.permissionMemberDialog.close();
}

function closeProjectTeamInfoDialog() {
  activeProjectTeamInfoId = "";
  if (els.projectTeamInfoDialog?.open) els.projectTeamInfoDialog.close();
}

function teamHasProtectedContent(project, team) {
  if (!project || !team) return false;
  const hasTeamItems = (team.items || []).some((item) => !item.archivedAt);
  const hasLinkedAreas = getAreasForTeam(project, team.id).length > 0;
  return hasTeamItems || hasLinkedAreas;
}

function openProjectTeamInfoDialog(projectOrTeamId, maybeTeamId = "") {
  const project = typeof projectOrTeamId === "object" && projectOrTeamId
    ? projectOrTeamId
    : getCurrentProject();
  const teamId = typeof projectOrTeamId === "string" ? projectOrTeamId : maybeTeamId;
  const team = project?.folders?.find((entry) => entry.id === teamId && !entry.archivedAt);
  if (!project || !team) return;
  activeProjectTeamInfoId = team.id;
  project.selectedTeamInfoId = team.id;
  persist();
  closeProjectTeamInfoDialog();
  openServiceTeamWorkspace(project, team.id);
}

function openPermissionMemberDialog(memberId) {
  const member = getUserById(memberId);
  if (!member || !els.permissionMemberDialog || !els.permissionMemberTitle || !els.permissionMemberBody) return;
  const isCurrentMember = member.id === state.currentUserId;
  const canEditRole = hasPermission("changeRoles") && !isCurrentMember;
  const memberProjects = getMemberProjectsForDirectory(member, null);
  const memberTasks = getMemberTasksForDirectory(member, null);
  const activeTaskCount = memberTasks.filter((task) => task.status !== "Done" && !task.archivedAt).length;
  const completedTaskCount = memberTasks.filter((task) => task.status === "Done" && !task.archivedAt).length;
  const qualificationBadge = renderQualificationBadge(member.qualification, { showEmpty: true });
  const workmodeBadge = renderMemberWorkmodeBadge(member.workmode, { showEmpty: true });
  const roleLabel = isPermissionEdited(member) ? `${ROLE_LABELS[member.role]} (edited)` : (ROLE_LABELS[member.role] || "User");
  const elevatedPermissions = PERMISSION_DEFINITIONS
    .filter((permission) => isPermissionElevated(member, permission.key))
    .map((permission) => permission.label);
  const scheduleMarkup = memberProjects.length
    ? memberProjects.map((project) => {
      const statusClass = project.archivedAt
        ? "status-pill-archived"
        : project.lifecycle === "completed"
          ? "status-pill-completed"
          : "status-pill-active";
      const statusLabel = project.archivedAt ? "Archived" : project.lifecycle === "completed" ? "Completed" : "Active";
      return `
        <div class="member-schedule-item">
          <div class="member-schedule-main">
            <strong>${escapeHtml(getProjectDisplayName(project))}</strong>
            <span class="muted">${escapeHtml(formatDateDisplay(project.startDate))}</span>
          </div>
          <div class="meta-row">
            <span class="meta-pill ${statusClass}">${statusLabel}</span>
            ${project.projectManagerUserId === member.id ? '<span class="meta-pill">Project manager</span>' : ""}
          </div>
        </div>
      `;
    }).join("")
    : `<p class="muted">No project schedule assigned yet.</p>`;

  els.permissionMemberTitle.textContent = getMemberDisplayName(member);
  els.permissionMemberBody.innerHTML = `
    <div class="member-detail-grid permission-member-detail-grid">
      <section class="member-detail-box">
        <span class="member-detail-label">Position / Experience</span>
        <div class="meta-row">
          <span class="meta-pill role-pill-${member.role}">${escapeHtml(roleLabel)}</span>
          <span class="meta-pill">Experience: ${qualificationBadge}</span>
          <span class="meta-pill">Position: ${workmodeBadge}</span>
          ${member.status === "archived" ? '<span class="meta-pill status-pill-archived">Inactive</span>' : ""}
        </div>
        <div class="permission-member-lines">
          <p><strong>Personal No:</strong> ${escapeHtml(getMemberPersonalNumber(member) || "-")}</p>
          <p><strong>Email:</strong> ${escapeHtml(member.email || "No email")}</p>
          <p><strong>Telephone:</strong> ${escapeHtml(member.tel || "No telephone")}</p>
          <p><strong>Projects:</strong> ${memberProjects.length}</p>
          <p><strong>Open tasks:</strong> ${activeTaskCount}</p>
          <p><strong>Done tasks:</strong> ${completedTaskCount}</p>
        </div>
      </section>
      <section class="member-detail-box">
        <span class="member-detail-label">Permission Level</span>
        <div class="permission-member-role-editor">
          <label>
            <span class="muted">Choose permission level</span>
            <select id="permission-member-role-select" ${canEditRole ? "" : "disabled"}>
              ${Object.entries(ROLE_LABELS).map(([value, label]) => `<option value="${value}" ${member.role === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
            </select>
          </label>
          <button id="permission-member-role-save-btn" class="secondary-btn" type="button" ${canEditRole ? "" : "disabled"}>Save level</button>
          ${isCurrentMember ? '<p class="muted">You cannot change your own role.</p>' : (canEditRole ? "" : '<p class="muted">You do not have permission to change roles.</p>')}
        </div>
      </section>
      <section class="member-detail-box">
        <span class="member-detail-label">Schedule</span>
        <div class="member-schedule-list">${scheduleMarkup}</div>
      </section>
      <section class="member-detail-box">
        <span class="member-detail-label">Elevated Permissions</span>
        ${elevatedPermissions.length
          ? `<div class="meta-row">${elevatedPermissions.map((label) => `<span class="meta-pill permission-elevated-pill">${escapeHtml(label)}</span>`).join("")}</div>`
          : `<p class="muted">No elevated permissions beyond the default role.</p>`}
      </section>
    </div>
  `;
  els.permissionMemberBody.querySelector("#permission-member-role-save-btn")?.addEventListener("click", () => {
    const nextRole = els.permissionMemberBody.querySelector("#permission-member-role-select")?.value || member.role;
    updateMemberRoleFromDialog(member.id, nextRole);
  });
  if (!els.permissionMemberDialog.open) {
    els.permissionMemberDialog.showModal();
  }
}

function updateMemberRoleFromDialog(memberId, nextRole) {
  if (!requirePermission(hasPermission("changeRoles"), "You do not have permission to change roles.")) return;
  const member = getUserById(memberId);
  const normalizedRole = String(nextRole || "").trim().toLowerCase();
  if (!member || !ROLE_LABELS[normalizedRole] || member.role === normalizedRole) return;
  if (member.id === state.currentUserId) {
    showAppMessage("You cannot change your own role.", "warning", "Permission");
    return;
  }
  if (normalizedRole === "admin" && !requirePermission(hasPermission("createAdmin"), "You do not have permission to promote someone to admin.")) return;
  if (member.role === "admin" && normalizedRole !== "admin" && !requirePermission(hasPermission("deleteAdmin"), "You do not have permission to remove admin rights.")) return;
  member.role = normalizedRole;
  logAudit("Member Role Updated", {
    objectType: "member",
    objectName: getMemberDisplayName(member),
  });
  persist();
  renderMembers();
  openPermissionMemberDialog(memberId);
}

function confirmDiscardUnsavedChanges(keys) {
  const dirtyForms = getDirtyTrackedForms(keys);
  if (!dirtyForms.length) return true;
  const labels = dirtyForms.map((entry) => entry.label);
  const summary = labels.length === 1
    ? labels[0]
    : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
  const shouldDiscard = window.confirm(`${summary} ${labels.length === 1 ? "has" : "have"} unsaved changes. Exit without saving?`);
  if (shouldDiscard) {
    showAppMessage(`${summary} ${labels.length === 1 ? "was" : "were"} not saved.`, "warning", "Not Saved");
  }
  return shouldDiscard;
}

function getSelectedDraftProject() {
  const selected = state.projects.find((project) => project.id === state.selectedProjectId) || null;
  return selected?.isDraft ? selected : null;
}

function discardDraftProject(projectId = state.selectedProjectId) {
  const draft = state.projects.find((project) => project.id === projectId);
  if (!draft?.isDraft) return;
  state.projects = state.projects.filter((project) => project.id !== projectId);
  state.selectedProjectId = ensureAccessibleSelectedProject(state);
  persist();
}

function confirmDiscardAndMaybeDeleteDraft(keys) {
  if (!confirmDiscardUnsavedChanges(keys)) return false;
  const draft = getSelectedDraftProject();
  if (draft) discardDraftProject(draft.id);
  return true;
}

function isDraftProjectLocked(project = getCurrentProject()) {
  if (!project?.isDraft) return false;
  return !(els.projectName?.value.trim() && els.projectManagerUser?.value && els.projectClientSelect?.value);
}

function showDraftProjectLockMessage() {
  showAppMessage(PROJECT_DRAFT_LOCK_MESSAGE, "warning", "Project Setup");
}

function requireDraftProjectUnlocked(project = getCurrentProject()) {
  if (!isDraftProjectLocked(project)) return true;
  showDraftProjectLockMessage();
  return false;
}

function refreshDraftProjectLockState() {
  const project = getCurrentProject();
  if (!project?.isDraft) return;
  updateProjectSaveButtonState(project);
  renderProjectSetupState();
  renderWorkspace();
}

function updateProjectSaveButtonState(project = getCurrentProject()) {
  if (!els.projectSaveBtn) return;
  if (!project) {
    els.projectSaveBtn.disabled = true;
    return;
  }
  els.projectSaveBtn.disabled = !canManageProject(project) || isDraftProjectLocked(project);
}

const els = {
  viewButtons: Array.from(document.querySelectorAll("[data-view]")),
  appShell: document.querySelector(".app-shell"),
  backButton: document.querySelector("#back-button"),
  workspaceBackButton: document.querySelector("#workspace-back-button"),
  currentUserSelect: document.querySelector("#current-user-select"),
  currentUserSummary: document.querySelector("#current-user-summary"),
  accessBanner: document.querySelector("#access-banner"),
  accessBannerTitle: document.querySelector("#access-banner-title"),
  accessBannerDescription: document.querySelector("#access-banner-description"),
  accessPreviewUser: document.querySelector("#access-preview-user"),
  developerPreviewLabel: document.querySelector("#developer-preview-label"),
  resetAccessPreviewBtn: document.querySelector("#reset-access-preview-btn"),
  accessMenu: document.querySelector("#access-menu"),
  sidebar: document.querySelector(".sidebar"),
  bookmarkNav: document.querySelector(".bookmark-nav"),
  userQuickNav: document.querySelector("#user-quick-nav"),
  userProjectsBtn: document.querySelector("#user-projects-btn"),
  userAssignedTasksBtn: document.querySelector("#user-assigned-tasks-btn"),
  projectsView: document.querySelector("#projects-view"),
  plannerView: document.querySelector("#planner-view"),
  dailyWorksView: document.querySelector("#daily-works-view"),
  projectsPageLayout: document.querySelector("#projects-page-layout"),
  projectsPageRail: document.querySelector("#projects-page-rail"),
  projectsWorkspaceColumn: document.querySelector("#projects-workspace-column"),
  projectRailBackBtn: document.querySelector("#project-rail-back-btn"),
  projectRailHomeBtn: document.querySelector("#project-rail-home-btn"),
  projectRailUndoBtn: document.querySelector("#project-rail-undo-btn"),
  projectRailRedoBtn: document.querySelector("#project-rail-redo-btn"),
  projectRailCollapseBtn: document.querySelector("#project-rail-collapse-btn"),
  teamsView: document.querySelector("#teams-view"),
  teamsMembersTabBtn: document.querySelector("#teams-members-tab-btn"),
  teamsPermissionsTabBtn: document.querySelector("#teams-permissions-tab-btn"),
  teamsMembersTabPanel: document.querySelector("#teams-members-tab-panel"),
  teamsPermissionsTabPanel: document.querySelector("#teams-permissions-tab-panel"),
  equipmentView: document.querySelector("#equipment-view"),
  clientsView: document.querySelector("#clients-view"),
  themeView: document.querySelector("#theme-view"),
  auditView: document.querySelector("#audit-view"),
  themePaletteList: document.querySelector("#theme-palette-list"),
  themeSettingsForm: document.querySelector("#theme-settings-form"),
  themeFontFamily: document.querySelector("#theme-font-family"),
  themeFontSize: document.querySelector("#theme-font-size"),
  themePreviewCard: document.querySelector("#theme-preview-card"),
  driveSyncForm: document.querySelector("#drive-sync-form"),
  driveSyncEnabled: document.querySelector("#drive-sync-enabled"),
  driveSyncTimezone: document.querySelector("#drive-sync-timezone"),
  driveSyncTime1: document.querySelector("#drive-sync-time1"),
  driveSyncTime2: document.querySelector("#drive-sync-time2"),
  driveSyncSaveBtn: document.querySelector("#drive-sync-save-btn"),
  mobileGlobalSearch: document.querySelector("#mobile-global-search"),
  mobileHeroToggleBtn: document.querySelector("#mobile-hero-toggle"),
  workspaceHero: document.querySelector("#workspace-hero"),
  plannerBoard: document.querySelector("#planner-board"),
  plannerRangeLabel: document.querySelector("#planner-range-label"),
  plannerSummary: document.querySelector("#planner-summary"),
  plannerSelectionBar: document.querySelector("#planner-selection-bar"),
  plannerPrevBtn: document.querySelector("#planner-prev-btn"),
  plannerTodayBtn: document.querySelector("#planner-today-btn"),
  plannerNextBtn: document.querySelector("#planner-next-btn"),
  plannerWeekBtn: document.querySelector("#planner-week-btn"),
  plannerDayBtn: document.querySelector("#planner-day-btn"),
  plannerHourlyBtn: document.querySelector("#planner-hourly-btn"),
  planner2hBtn: document.querySelector("#planner-2h-btn"),
  planner4hBtn: document.querySelector("#planner-4h-btn"),
  dailyWorksBoard: document.querySelector("#daily-works-board"),
  dailyWorkContactsList: document.querySelector("#daily-work-contacts-list"),
  dailyWorkContactsCount: document.querySelector("#daily-work-contacts-count"),
  dailyWorksWeekRange: document.querySelector("#daily-works-week-range"),
  dailyWorksPrevWeekBtn: document.querySelector("#daily-works-prev-week-btn"),
  dailyWorksTodayBtn: document.querySelector("#daily-works-today-btn"),
  dailyWorksNextWeekBtn: document.querySelector("#daily-works-next-week-btn"),
  dailyWorkDialog: document.querySelector("#daily-work-dialog"),
  dailyWorkForm: document.querySelector("#daily-work-form"),
  dailyWorkDialogTitle: document.querySelector("#daily-work-dialog-title"),
  dailyWorkTitle: document.querySelector("#daily-work-title"),
  dailyWorkDate: document.querySelector("#daily-work-date"),
  dailyWorkStart: document.querySelector("#daily-work-start"),
  dailyWorkEnd: document.querySelector("#daily-work-end"),
  dailyWorkLastName: document.querySelector("#daily-work-last-name"),
  dailyWorkFirstName: document.querySelector("#daily-work-first-name"),
  dailyWorkClient: document.querySelector("#daily-work-client"),
  dailyWorkAddress: document.querySelector("#daily-work-address"),
  dailyWorkPhone: document.querySelector("#daily-work-phone"),
  dailyWorkMapLink: document.querySelector("#daily-work-map-link"),
  dailyWorkMapOpenBtn: document.querySelector("#daily-work-map-open-btn"),
  dailyWorkWorkLink: document.querySelector("#daily-work-work-link"),
  dailyWorkContactSuggestions: document.querySelector("#daily-work-contact-suggestions"),
  dailyWorkAddressSuggestions: document.querySelector("#daily-work-address-suggestions"),
  dailyWorkContactShortcuts: document.querySelector("#daily-work-contact-shortcuts"),
  dailyWorkMemberLinks: document.querySelector("#daily-work-member-links"),
  dailyWorkNotes: document.querySelector("#daily-work-notes"),
  dailyWorkStatus: document.querySelector("#daily-work-status"),
  closeDailyWorkBtn: document.querySelector("#close-daily-work-btn"),
  cancelDailyWorkBtn: document.querySelector("#cancel-daily-work-btn"),
  deleteDailyWorkBtn: document.querySelector("#delete-daily-work-btn"),
  projectForm: document.querySelector("#project-form"),
  projectSetupPanel: document.querySelector(".project-setup-panel"),
  closeProjectSetupBtn: document.querySelector("#close-project-setup-btn"),
  projectSetupToggle: document.querySelector("#project-setup-toggle"),
  projectSetupAdvanced: document.querySelector("#project-setup-advanced"),
  projectSetupLock: document.querySelector("#project-setup-lock"),
  projectName: document.querySelector("#project-name"),
  projectManagerUser: document.querySelector("#project-manager-user"),
  projectStartDate: document.querySelector("#project-start-date"),
  projectEndDate: document.querySelector("#project-end-date"),
  projectSurfaceColor: document.querySelector("#project-surface-color"),
  projectSetupPreview: document.querySelector("#project-setup-preview"),
  projectColorPalette: document.querySelector("#project-color-palette"),
  projectLifecycle: document.querySelector("#project-lifecycle"),
  projectClientSelect: document.querySelector("#project-client-select"),
  projectSaveBtn: document.querySelector("#project-save-btn"),
  projectList: document.querySelector("#project-list"),
  completedProjectList: document.querySelector("#completed-project-list"),
  archivedProjectList: document.querySelector("#archived-project-list"),
  createProjectBtn: document.querySelector("#create-project-btn"),
  deleteArchivedProjectsBtn: document.querySelector("#delete-archived-projects-btn"),
  projectSearchForm: document.querySelector("#project-search-form"),
  projectSearchInput: document.querySelector("#project-search-input"),
  projectSearchClearBtn: document.querySelector("#project-search-clear-btn"),
  assignedProjectsFilterBtn: document.querySelector("#assigned-projects-filter-btn"),
  toggleActiveProjectsBtn: document.querySelector("#toggle-active-projects-btn"),
  toggleCompletedProjectsBtn: document.querySelector("#toggle-completed-projects-btn"),
  toggleArchivedProjectsBtn: document.querySelector("#toggle-archived-projects-btn"),
  clientForm: document.querySelector("#client-form"),
  clientFormTitle: document.querySelector("#client-form-title"),
  clientSaveBtn: document.querySelector("#client-save-btn"),
  clientName: document.querySelector("#client-name"),
  clientSurname: document.querySelector("#client-surname"),
  clientCompany: document.querySelector("#client-company"),
  clientUid: document.querySelector("#client-uid"),
  clientAddress: document.querySelector("#client-address"),
  clientEmail: document.querySelector("#client-email"),
  clientTel: document.querySelector("#client-tel"),
  toggleClientFormBtn: document.querySelector("#toggle-client-form-btn"),
  closeClientFormBtn: document.querySelector("#close-client-form-btn"),
  clientFormShell: document.querySelector("#client-form-shell"),
  clientSearchForm: document.querySelector("#client-search-form"),
  toggleArchivedClientsBtn: document.querySelector("#toggle-archived-clients-btn"),
  toggleClientsListPanelBtn: document.querySelector("#toggle-clients-list-panel-btn"),
  toggleClientsDetailPanelBtn: document.querySelector("#toggle-clients-detail-panel-btn"),
  clientSearchScope: document.querySelector("#client-search-scope"),
  clientSearchInput: document.querySelector("#client-search-input"),
  clientSearchBtn: document.querySelector("#client-search-btn"),
  clientSearchClearBtn: document.querySelector("#client-search-clear-btn"),
  auditSearchForm: document.querySelector("#audit-search-form"),
  auditSearchInput: document.querySelector("#audit-search-input"),
  auditSearchBtn: document.querySelector("#audit-search-btn"),
  auditSearchClearBtn: document.querySelector("#audit-search-clear-btn"),
  addResponsibleBtn: document.querySelector("#add-responsible-btn"),
  responsibleList: document.querySelector("#responsible-list"),
  clientList: document.querySelector("#client-list"),
  clientDetailCard: document.querySelector("#client-detail-card"),
  responsiblePersonTemplate: document.querySelector("#responsible-person-template"),
  memberForm: document.querySelector("#member-form"),
  memberPersonalNumber: document.querySelector("#member-personal-number"),
  memberName: document.querySelector("#member-name"),
  memberSurname: document.querySelector("#member-surname"),
  memberTel: document.querySelector("#member-tel"),
  memberEmail: document.querySelector("#member-email"),
  memberQualification: document.querySelector("#member-qualification"),
  memberWorkmode: document.querySelector("#member-workmode"),
  memberRole: document.querySelector("#member-role"),
  toggleMemberFormBtn: document.querySelector("#toggle-member-form-btn"),
  closeMemberFormBtn: document.querySelector("#close-member-form-btn"),
  memberFormShell: document.querySelector("#member-form-shell"),
  memberFormTitle: document.querySelector("#member-form-title"),
  toggleArchivedMembersBtn: document.querySelector("#toggle-archived-members-btn"),
  toggleMembersListPanelBtn: document.querySelector("#toggle-members-list-panel-btn"),
  toggleMembersDetailPanelBtn: document.querySelector("#toggle-members-detail-panel-btn"),
  memberSearchForm: document.querySelector("#member-search-form"),
  memberSearchInput: document.querySelector("#member-search-input"),
  memberRoleFilter: document.querySelector("#member-role-filter"),
  memberSkillFilter: document.querySelector("#member-skill-filter"),
  memberWorkmodeFilter: document.querySelector("#member-workmode-filter"),
  memberSearchBtn: document.querySelector("#member-search-btn"),
  memberSearchClearBtn: document.querySelector("#member-search-clear-btn"),
  memberViewToggle: document.querySelector("#member-view-toggle"),
  memberList: document.querySelector("#member-list"),
  memberDetailCard: document.querySelector("#member-detail-card"),
  permissionMatrix: document.querySelector("#permission-matrix"),
  toggleEquipmentFormBtn: document.querySelector("#toggle-equipment-form-btn"),
  closeEquipmentFormBtn: document.querySelector("#close-equipment-form-btn"),
  equipmentFormShell: document.querySelector("#equipment-form-shell"),
  equipmentFormTitle: document.querySelector("#equipment-form-title"),
  equipmentForm: document.querySelector("#equipment-form"),
  equipmentSaveBtn: document.querySelector("#equipment-save-btn"),
  equipmentName: document.querySelector("#equipment-name"),
  equipmentCategorySelect: document.querySelector("#equipment-category-select"),
  equipmentIcon: document.querySelector("#equipment-icon"),
  equipmentIconPalette: document.querySelector("#equipment-icon-palette"),
  equipmentReference: document.querySelector("#equipment-reference"),
  equipmentNotes: document.querySelector("#equipment-notes"),
  equipmentSearchForm: document.querySelector("#equipment-search-form"),
  equipmentSearchInput: document.querySelector("#equipment-search-input"),
  equipmentSearchBtn: document.querySelector("#equipment-search-btn"),
  equipmentSearchClearBtn: document.querySelector("#equipment-search-clear-btn"),
  toggleArchivedEquipmentBtn: document.querySelector("#toggle-archived-equipment-btn"),
  toggleEquipmentListPanelBtn: document.querySelector("#toggle-equipment-list-panel-btn"),
  toggleEquipmentDetailPanelBtn: document.querySelector("#toggle-equipment-detail-panel-btn"),
  equipmentList: document.querySelector("#equipment-list"),
  equipmentDetailCard: document.querySelector("#equipment-detail-card"),
  toggleEquipmentCategoryFormBtn: document.querySelector("#toggle-equipment-category-form-btn"),
  closeEquipmentCategoryFormBtn: document.querySelector("#close-equipment-category-form-btn"),
  equipmentCategoryFormShell: document.querySelector("#equipment-category-form-shell"),
  equipmentCategoryForm: document.querySelector("#equipment-category-form"),
  equipmentCategorySaveBtn: document.querySelector("#equipment-category-save-btn"),
  equipmentCategoryFormTitle: document.querySelector("#equipment-category-form-title"),
  equipmentCategoryName: document.querySelector("#equipment-category-name"),
  equipmentCategoryList: document.querySelector("#equipment-category-list"),
  foldersHubTab: document.querySelector("#folders-hub-tab"),
  workspaceTabbar: document.querySelector(".workspace-tabbar"),
  openTasksTab: document.querySelector("#open-tasks-tab"),
  folderTabList: document.querySelector("#folder-tab-list"),
  workspaceAreaFilterBtn: document.querySelector("#workspace-area-filter-btn"),
  workspaceShowArchivedAreasBtn: document.querySelector("#workspace-show-archived-areas-btn"),
  addFolderTabBtn: document.querySelector("#add-folder-tab-btn"),
  workspaceTabsShell: document.querySelector(".workspace-tabs-shell"),
  workspaceTabContent: document.querySelector("#workspace-tab-content"),
  workspaceLockOverlay: document.querySelector("#workspace-lock-overlay"),
  workspaceHero: document.querySelector("#workspace-hero"),
  workspaceTitle: document.querySelector("#workspace-title"),
  workspaceSubtitle: document.querySelector("#workspace-subtitle"),
  workspaceContext: document.querySelector("#workspace-context"),
  projectRoomChatBtn: document.querySelector("#project-room-chat-btn"),
  viberRoomBtn: document.querySelector("#viber-room-btn"),
  notificationsBtn: document.querySelector("#notifications-btn"),
  notificationsCount: document.querySelector("#notifications-count"),
  notificationsPanel: document.querySelector("#notifications-panel"),
  notificationsList: document.querySelector("#notifications-list"),
  projectMetaBar: document.querySelector("#project-meta-bar"),
  workspaceClientDropdown: document.querySelector("#workspace-client-dropdown"),
  folderActionBar: document.querySelector("#folder-action-bar"),
  sectionViewToggle: document.querySelector("#section-view-toggle"),
  viewBoxesBtn: document.querySelector("#view-boxes-btn"),
  viewListBtn: document.querySelector("#view-list-btn"),
  folderEmptyState: document.querySelector("#folder-empty-state"),
  folderDetail: document.querySelector("#folder-detail"),
  folderSummary: document.querySelector("#folder-summary"),
  folderItems: document.querySelector("#folder-items"),
  addNoteBtn: document.querySelector("#add-note-btn"),
  addFileBtn: document.querySelector("#add-file-btn"),
  addPhotoBtn: document.querySelector("#add-photo-btn"),
  addChatBtn: document.querySelector("#add-chat-btn"),
  takePhotoBtn: document.querySelector("#take-photo-btn"),
  addTaskBtn: document.querySelector("#add-task-btn"),
  toggleArchivedBtn: document.querySelector("#toggle-archived-btn"),
  contentAddBtn: document.querySelector("#content-add-btn"),
  mobileFab: document.querySelector("#mobile-fab"),
  projectTeamRail: document.querySelector("#project-team-rail"),
  projectTeamInfoBar: document.querySelector("#project-team-info-bar"),
  folderMain: document.querySelector("#folder-main"),
  actionSheet: document.querySelector("#action-sheet"),
  closeActionSheetBtn: document.querySelector("#close-action-sheet-btn"),
  sheetNoteBtn: document.querySelector("#sheet-note-btn"),
  sheetFileBtn: document.querySelector("#sheet-file-btn"),
  sheetPhotoBtn: document.querySelector("#sheet-photo-btn"),
  sheetCameraBtn: document.querySelector("#sheet-camera-btn"),
  sheetTaskBtn: document.querySelector("#sheet-task-btn"),
  fileInput: document.querySelector("#file-input"),
  photoInput: document.querySelector("#photo-input"),
  photoUploadOptionsDialog: document.querySelector("#photo-upload-options-dialog"),
  photoUploadOptionsForm: document.querySelector("#photo-upload-options-form"),
  photoUploadBaseName: document.querySelector("#photo-upload-base-name"),
  photoUploadAreaLinks: document.querySelector("#photo-upload-area-links"),
  closePhotoUploadOptionsBtn: document.querySelector("#close-photo-upload-options-btn"),
  cancelPhotoUploadOptionsBtn: document.querySelector("#cancel-photo-upload-options-btn"),
  plansAddDialog: document.querySelector("#plans-add-dialog"),
  plansAddTitle: document.querySelector("#plans-add-title"),
  plansAddBody: document.querySelector("#plans-add-body"),
  closePlansAddBtn: document.querySelector("#close-plans-add-btn"),
  plansAddNoteBtn: document.querySelector("#plans-add-note-btn"),
  plansAddFileBtn: document.querySelector("#plans-add-file-btn"),
  plansAddPhotoBtn: document.querySelector("#plans-add-photo-btn"),
  plansAddCameraBtn: document.querySelector("#plans-add-camera-btn"),
  viberRoomDialog: document.querySelector("#viber-room-dialog"),
  closeViberRoomBtn: document.querySelector("#close-viber-room-btn"),
  projectRoomMode: document.querySelector("#project-room-mode"),
  viberRoomStatus: document.querySelector("#viber-room-status"),
  viberRoomLink: document.querySelector("#viber-room-link"),
  viberRoomId: document.querySelector("#viber-room-id"),
  viberRoomMembers: document.querySelector("#viber-room-members"),
  openViberRoomLinkBtn: document.querySelector("#open-viber-room-link-btn"),
  saveViberRoomBtn: document.querySelector("#save-viber-room-btn"),
  noteDialog: document.querySelector("#note-dialog"),
  noteForm: document.querySelector("#note-form"),
  noteFormTitle: document.querySelector("#note-form-title"),
  noteStyleToggle: document.querySelector("#note-style-toggle"),
  noteStyleInput: document.querySelector("#note-style"),
  noteTitle: document.querySelector("#note-title"),
  noteContent: document.querySelector("#note-content"),
  noteMasterPlanVisible: document.querySelector("#note-master-plan-visible"),
  noteImage: document.querySelector("#note-image"),
  noteImagePreview: document.querySelector("#note-image-preview"),
  noteSaveBtn: document.querySelector("#note-save-btn"),
  closeNoteBtn: document.querySelector("#close-note-btn"),
  cancelNoteBtn: document.querySelector("#cancel-note-btn"),
  taskDialog: document.querySelector("#task-dialog"),
  taskForm: document.querySelector("#task-form"),
  taskTitle: document.querySelector("#task-title"),
  taskMemberLabel: document.querySelector("#task-member").closest("label"),
  taskMember: document.querySelector("#task-member"),
  taskAreaLabel: document.querySelector("#task-area-label"),
  taskArea: document.querySelector("#task-area"),
  taskDate: document.querySelector("#task-date"),
  taskStatus: document.querySelector("#task-status"),
  taskNotes: document.querySelector("#task-notes"),
  taskFolderLinks: document.querySelector("#task-folder-links"),
  taskPhotoLinks: document.querySelector("#task-photo-links"),
  closeTaskBtn: document.querySelector("#close-task-btn"),
  cancelTaskBtn: document.querySelector("#cancel-task-btn"),
  areaDialog: document.querySelector("#area-dialog"),
  areaForm: document.querySelector("#area-form"),
  areaName: document.querySelector("#area-name"),
  areaFloor: document.querySelector("#area-floor"),
  areaFloorAddBtn: document.querySelector("#area-floor-add-btn"),
  areaIcon: document.querySelector("#area-icon"),
  areaIconPalette: document.querySelector("#area-icon-palette"),
  closeAreaBtn: document.querySelector("#close-area-btn"),
  cancelAreaBtn: document.querySelector("#cancel-area-btn"),
  areaFilterDialog: document.querySelector("#area-filter-dialog"),
  closeAreaFilterBtn: document.querySelector("#close-area-filter-btn"),
  areaFilterFloor: document.querySelector("#area-filter-floor"),
  areaFilterQuery: document.querySelector("#area-filter-query"),
  applyAreaFilterBtn: document.querySelector("#apply-area-filter-btn"),
  clearAreaFilterBtn: document.querySelector("#clear-area-filter-btn"),
  serviceTeamDialog: document.querySelector("#service-team-dialog"),
  serviceTeamForm: document.querySelector("#service-team-form"),
  serviceTeamName: document.querySelector("#service-team-name"),
  serviceTeamColor: document.querySelector("#service-team-color"),
  serviceTeamColorPalette: document.querySelector("#service-team-color-palette"),
  serviceTeamExperienceFilter: document.querySelector("#service-team-experience-filter"),
  serviceTeamMemberLinks: document.querySelector("#service-team-member-links"),
  serviceTeamAreaLinks: document.querySelector("#service-team-area-links"),
  serviceTeamPositionFilter: document.querySelector("#service-team-position-filter"),
  closeServiceTeamBtn: document.querySelector("#close-service-team-btn"),
  cancelServiceTeamBtn: document.querySelector("#cancel-service-team-btn"),
  serviceTeamInfoToggle: document.querySelector("#service-team-info-toggle"),
  serviceTeamInfoPanel: document.querySelector("#service-team-info-panel"),
  serviceTeamCompactSummary: document.querySelector("#service-team-compact-summary"),
  serviceTeamAddNoteBtn: document.querySelector("#service-team-add-note-btn"),
  serviceTeamAddFileBtn: document.querySelector("#service-team-add-file-btn"),
  serviceTeamAddPhotoBtn: document.querySelector("#service-team-add-photo-btn"),
  serviceTeamAssetsSaveHint: document.querySelector("#service-team-assets-save-hint"),
  serviceTeamNotesEmpty: document.querySelector("#service-team-assets-notes-empty"),
  serviceTeamFilesEmpty: document.querySelector("#service-team-assets-files-empty"),
  serviceTeamPhotosEmpty: document.querySelector("#service-team-assets-photos-empty"),
  serviceTeamNotesGrid: document.querySelector("#service-team-assets-notes-grid"),
  serviceTeamFilesGrid: document.querySelector("#service-team-assets-files-grid"),
  serviceTeamPhotosGrid: document.querySelector("#service-team-assets-photos-grid"),
  projectTeamInfoDialog: document.querySelector("#project-team-info-dialog"),
  projectTeamInfoDialogTitle: document.querySelector("#project-team-info-dialog-title"),
  projectTeamInfoDialogBody: document.querySelector("#project-team-info-dialog-body"),
  closeProjectTeamInfoBtn: document.querySelector("#close-project-team-info-btn"),
  projectTeamInfoCloseBtn: document.querySelector("#project-team-info-close-btn"),
  projectTeamInfoOpenBtn: document.querySelector("#project-team-info-open-btn"),
  projectTeamInfoEditBtn: document.querySelector("#project-team-info-edit-btn"),
  projectTeamInfoDeleteBtn: document.querySelector("#project-team-info-delete-btn"),
  plannerAssignmentDialog: document.querySelector("#planner-assignment-dialog"),
  plannerAssignmentForm: document.querySelector("#planner-assignment-form"),
  plannerAssignmentTitle: document.querySelector("#planner-assignment-title"),
  plannerAssignmentTeam: document.querySelector("#planner-assignment-team"),
  plannerAssignmentProject: document.querySelector("#planner-assignment-project"),
  plannerAssignmentDate: document.querySelector("#planner-assignment-date"),
  plannerAssignmentStart: document.querySelector("#planner-assignment-start"),
  plannerAssignmentEnd: document.querySelector("#planner-assignment-end"),
  plannerAssignmentNotes: document.querySelector("#planner-assignment-notes"),
  plannerAssignmentDeleteBtn: document.querySelector("#planner-assignment-delete-btn"),
  closePlannerAssignmentBtn: document.querySelector("#close-planner-assignment-btn"),
  cancelPlannerAssignmentBtn: document.querySelector("#cancel-planner-assignment-btn"),
  speechAssistBox: document.querySelector("#speech-assist-box"),
  speechBtn: document.querySelector("#speech-btn"),
  speechStatus: document.querySelector("#speech-status"),
  speechTranscript: document.querySelector("#speech-transcript"),
  speechSummaryShell: document.querySelector("#speech-summary-shell"),
  speechSummaryList: document.querySelector("#speech-summary-list"),
  parseSpeechBtn: document.querySelector("#parse-speech-btn"),
  cameraDialog: document.querySelector("#camera-dialog"),
  cameraPhotoName: document.querySelector("#camera-photo-name"),
  cameraStream: document.querySelector("#camera-stream"),
  cameraCanvas: document.querySelector("#camera-canvas"),
  captureBtn: document.querySelector("#capture-btn"),
  cancelCameraBtn: document.querySelector("#cancel-camera-btn"),
  closeCameraBtn: document.querySelector("#close-camera-btn"),
  appMessageDialog: document.querySelector("#app-message-dialog"),
  appMessageForm: document.querySelector("#app-message-form"),
  appMessageEyebrow: document.querySelector("#app-message-eyebrow"),
  appMessageTitle: document.querySelector("#app-message-title"),
  appMessageBody: document.querySelector("#app-message-body"),
  closeAppMessageBtn: document.querySelector("#close-app-message-btn"),
  appMessageOkBtn: document.querySelector("#app-message-ok-btn"),
  appConfirmDialog: document.querySelector("#app-confirm-dialog"),
  appConfirmForm: document.querySelector("#app-confirm-form"),
  appConfirmEyebrow: document.querySelector("#app-confirm-eyebrow"),
  appConfirmTitle: document.querySelector("#app-confirm-title"),
  appConfirmBody: document.querySelector("#app-confirm-body"),
  closeAppConfirmBtn: document.querySelector("#close-app-confirm-btn"),
  appConfirmOkBtn: document.querySelector("#app-confirm-ok-btn"),
  appConfirmCancelBtn: document.querySelector("#app-confirm-cancel-btn"),
  permissionMemberDialog: document.querySelector("#permission-member-dialog"),
  permissionMemberTitle: document.querySelector("#permission-member-title"),
  permissionMemberBody: document.querySelector("#permission-member-body"),
  closePermissionMemberBtn: document.querySelector("#close-permission-member-btn"),
  permissionMemberOkBtn: document.querySelector("#permission-member-ok-btn"),
  areaBrowserDialog: document.querySelector("#area-browser-dialog"),
  areaBrowserTitle: document.querySelector("#area-browser-title"),
  areaBrowserMeta: document.querySelector("#area-browser-meta"),
  areaBrowserStats: document.querySelector("#area-browser-stats"),
  areaBrowserViewGridBtn: document.querySelector("#area-browser-view-grid-btn"),
  areaBrowserViewListBtn: document.querySelector("#area-browser-view-list-btn"),
  areaBrowserSortFilter: document.querySelector("#area-browser-sort-filter"),
  areaBrowserTeamFilter: document.querySelector("#area-browser-team-filter"),
  areaBrowserTypeFilter: document.querySelector("#area-browser-type-filter"),
  areaBrowserResultCount: document.querySelector("#area-browser-result-count"),
  areaBrowserResults: document.querySelector("#area-browser-results"),
  closeAreaBrowserBtn: document.querySelector("#close-area-browser-btn"),
  areaBrowserCloseBtn: document.querySelector("#area-browser-close-btn"),
  imagePreviewDialog: document.querySelector("#image-preview-dialog"),
  imagePreviewTitle: document.querySelector("#image-preview-title"),
  imagePreviewMeta: document.querySelector("#image-preview-meta"),
  imagePreviewImg: document.querySelector("#image-preview-img"),
  imagePreviewPrevBtn: document.querySelector("#image-preview-prev-btn"),
  imagePreviewNextBtn: document.querySelector("#image-preview-next-btn"),
  imagePreviewCounter: document.querySelector("#image-preview-counter"),
  closeImagePreviewBtn: document.querySelector("#close-image-preview-btn"),
  imagePreviewCloseBtn: document.querySelector("#image-preview-close-btn"),
  mentionSuggest: document.querySelector("#mention-suggest"),
  itemCardTemplate: document.querySelector("#item-card-template"),
  auditLogList: document.querySelector("#audit-log-list"),
};

function mountPopupShells() {
  [
    els.memberFormShell,
    els.clientFormShell,
    els.equipmentFormShell,
    els.equipmentCategoryFormShell,
  ].forEach((element) => {
    if (!element || element.dataset.popupMounted === "true") return;
    document.body.append(element);
    element.dataset.popupMounted = "true";
  });
}

function normalizeState(rawState) {
  const nextState = { ...structuredClone(initialState), ...rawState };
  nextState.users = Array.isArray(nextState.users) ? nextState.users.map(normalizeUser) : [];
  nextState.auditLog = Array.isArray(nextState.auditLog) ? nextState.auditLog : [];
  nextState.plannerAssignments = Array.isArray(nextState.plannerAssignments)
    ? nextState.plannerAssignments.map(normalizePlannerAssignment)
    : [];
  nextState.dailyWorks = Array.isArray(nextState.dailyWorks)
    ? nextState.dailyWorks.map(normalizeDailyWork)
    : [];
  nextState.clients = (nextState.clients || []).map((client) => ({
    ...client,
    archivedAt: client.archivedAt || null,
    archivedByUserId: client.archivedByUserId || null,
  }));
  nextState.equipmentCategories = Array.isArray(nextState.equipmentCategories)
    ? nextState.equipmentCategories.map(normalizeEquipmentCategory)
    : [];
  nextState.equipmentItems = Array.isArray(nextState.equipmentItems)
    ? nextState.equipmentItems.map(normalizeEquipmentItem)
    : [];
  nextState.userNotifications = Array.isArray(nextState.userNotifications)
    ? nextState.userNotifications.map(normalizeUserNotification)
    : [];
  nextState.dailyWorkContacts = Array.isArray(nextState.dailyWorkContacts)
    ? nextState.dailyWorkContacts.map(normalizeDailyWorkContact).filter((entry) => entry.lastName || entry.firstName || entry.client || entry.address || entry.phone || entry.mapLink || entry.workLink)
    : [];
  ensureEquipmentCategories(nextState);
  nextState.rolePermissionDefaults = normalizeRolePermissionDefaults(nextState.rolePermissionDefaults);
  nextState.themeSettings = normalizeThemeSettings(nextState.themeSettings);
  nextState.driveSyncSettings = normalizeDriveSyncSettings(nextState.driveSyncSettings);
  nextState.dailyWorkDefaults = normalizeDailyWorkDefaults(nextState.dailyWorkDefaults);
  const bootstrapAdmin = nextState.users.find((user) => (user.email || "").trim().toLowerCase() === "admin@local.app");
  if (bootstrapAdmin) bootstrapAdmin.role = "admin";

  if (!nextState.users.length && !IS_EMPTY_BOOTSTRAP) {
    nextState.users.push(createBootstrapAdminUser());
  }
  ensureUserPersonalNumbers(nextState.users);

  nextState.projects = (nextState.projects || []).map((project) => normalizeProject(project, nextState));
  ensureProjectNumbers(nextState.projects);
  nextState.currentUserId = ensureValidCurrentUser(nextState);
  nextState.selectedProjectId = ensureAccessibleSelectedProject(nextState);
  return nextState;
}

function normalizeProject(project, rootState) {
  const normalized = {
    ...createBlankProject(),
    ...project,
    archivedAt: project.archivedAt || null,
    archivedByUserId: project.archivedByUserId || null,
    projectManagerUserId: project.projectManagerUserId || "",
    projectNumber: formatProjectNumberValue(project.projectNumber),
    selectedTeamFilterIds: Array.isArray(project.selectedTeamFilterIds) ? project.selectedTeamFilterIds : [],
    selectedTeamFiltersInitialized: Boolean(project.selectedTeamFiltersInitialized),
    selectedTeamInfoId: project.selectedTeamInfoId || "",
    selectedChatChannelId: project.selectedChatChannelId || "",
    projectRoomMode: String(project.projectRoomMode || "chat"),
    viberRoomStatus: String(project.viberRoomStatus || "not_created"),
    viberRoomLink: String(project.viberRoomLink || ""),
    viberRoomId: String(project.viberRoomId || ""),
    teamInfoExpanded: Boolean(project.teamInfoExpanded),
    sectionViewModes: {
      ...DEFAULT_SECTION_VIEW_MODES,
      ...(project.sectionViewModes || {}),
    },
    floors: normalizeFloorList(project.floors),
    areaQuickFilter: normalizeAreaQuickFilter(project.areaQuickFilter),
  };

  const legacyMembers = Array.isArray(project.members) ? project.members : [];
  const assignedIds = new Set(Array.isArray(project.memberIds) ? project.memberIds : []);
  for (const member of legacyMembers) {
    const userId = ensureLegacyUser(rootState, member, "user");
    assignedIds.add(userId);
  }

  if (!normalized.projectManagerUserId && (project.managerName || project.managerEmail)) {
    normalized.projectManagerUserId = ensureLegacyUser(rootState, {
      name: project.managerName || "Project",
      surname: "Manager",
      tel: "",
      email: project.managerEmail || "",
    }, "manager");
  }

  if (normalized.projectManagerUserId) {
    assignedIds.add(normalized.projectManagerUserId);
  }

  normalized.memberIds = [...assignedIds];
  normalized.members = undefined;
  normalized.chatMessages = Array.isArray(project.chatMessages)
    ? project.chatMessages.map((message) => ({
        id: message?.id || crypto.randomUUID(),
        channelId: String(message?.channelId || "project:general"),
        text: String(message?.text || ""),
        createdAt: message?.createdAt || new Date().toISOString(),
        createdByUserId: message?.createdByUserId || "",
        importantAt: message?.importantAt || null,
        importantByUserId: message?.importantByUserId || null,
        importantNoteId: message?.importantNoteId || null,
        attachments: Array.isArray(message?.attachments)
          ? message.attachments.map((attachment) => ({
              id: attachment?.id || crypto.randomUUID(),
              name: String(attachment?.name || "Attachment"),
              mimeType: String(attachment?.mimeType || "application/octet-stream"),
              size: Number.isFinite(Number(attachment?.size)) ? Number(attachment.size) : 0,
              dataUrl: String(attachment?.dataUrl || ""),
              isImage: Boolean(attachment?.isImage),
            }))
          : [],
      }))
    : [];
  normalized.mentionNotifications = Array.isArray(project.mentionNotifications)
    ? project.mentionNotifications.map((entry) => ({
        id: entry?.id || crypto.randomUUID(),
        projectId: String(entry?.projectId || normalized.id || ""),
        fromUserId: String(entry?.fromUserId || ""),
        toUserId: String(entry?.toUserId || ""),
        itemType: String(entry?.itemType || "item"),
        itemId: String(entry?.itemId || ""),
        channelId: String(entry?.channelId || ""),
        messageId: String(entry?.messageId || ""),
        title: String(entry?.title || "Name mentioned"),
        body: String(entry?.body || ""),
        createdAt: entry?.createdAt || new Date().toISOString(),
        readAt: entry?.readAt || null,
      }))
    : [];
  normalized.detailsFolder = normalizeContainer(getProjectDetailsFolder(normalized));
  normalized.folders = (normalized.folders || []).map((folder) => normalizeContainer(folder));
  normalized.areas = (normalized.areas || []).map((area) => ({
    ...normalizeContainer(area),
    teamIds: Array.isArray(area.teamIds) ? area.teamIds : [],
    iconKey: normalizeAreaIconKey(area.iconKey),
    floor: normalizeFloorName(area.floor),
    completedAt: area.completedAt || null,
    completedByUserId: area.completedByUserId || null,
  }));
  if (!normalized.floors.length) {
    normalized.floors = normalizeFloorList((normalized.areas || []).map((area) => area.floor).filter(Boolean));
  } else {
    const derived = normalizeFloorList((normalized.areas || []).map((area) => area.floor).filter(Boolean));
    if (derived.length) normalized.floors = normalizeFloorList([...normalized.floors, ...derived]);
  }
  return normalized;
}

function normalizeUser(user) {
  return {
    ...createSystemUser(user),
    ...user,
    personalNumber: normalizePersonalNumber(user?.personalNumber),
    qualification: normalizeQualification(user?.qualification),
    workmode: normalizeMemberWorkmode(user?.workmode),
    pinCode: normalizePin(user?.pinCode),
    mustChangePin: user?.mustChangePin !== false,
    lastLoginAt: user?.lastLoginAt || null,
    permissionOverrides: { ...(user.permissionOverrides || {}) },
    navViewOrder: normalizeNavViewOrder(user?.navViewOrder),
  };
}

function normalizeUserNotification(entry) {
  return {
    id: entry?.id || crypto.randomUUID(),
    toUserId: String(entry?.toUserId || ""),
    fromUserId: String(entry?.fromUserId || ""),
    title: String(entry?.title || "Notification"),
    body: String(entry?.body || ""),
    createdAt: entry?.createdAt || new Date().toISOString(),
    readAt: entry?.readAt || null,
  };
}

function createEquipmentCategory({ id = crypto.randomUUID(), name, createdAt = new Date().toISOString() }) {
  return {
    id,
    name: (name || "").trim(),
    createdAt,
  };
}

function normalizeEquipmentCategory(category) {
  return createEquipmentCategory(category || {});
}

function createEquipmentItem({
  id = crypto.randomUUID(),
  name,
  categoryId,
  iconKey = "none",
  reference = "",
  notes = "",
  createdAt = new Date().toISOString(),
  createdByUserId = "",
  archivedAt = null,
  archivedByUserId = null,
}) {
  return {
    id,
    name: (name || "").trim(),
    categoryId: categoryId || "",
    iconKey: normalizeEquipmentIconKey(iconKey),
    reference: (reference || "").trim(),
    notes: notes || "",
    createdAt,
    createdByUserId,
    archivedAt,
    archivedByUserId,
  };
}

function normalizeEquipmentItem(item) {
  return createEquipmentItem({
    ...item,
    iconKey: item?.iconKey || "none",
    archivedAt: item?.archivedAt || null,
    archivedByUserId: item?.archivedByUserId || null,
  });
}

function ensureEquipmentCategories(rootState) {
  if (!rootState.equipmentCategories.length) {
    rootState.equipmentCategories = DEFAULT_EQUIPMENT_CATEGORY_NAMES.map((name) => createEquipmentCategory({ name }));
  }
}

function normalizeContainer(container) {
  return {
    ...container,
    archivedAt: container.archivedAt || null,
    archivedByUserId: container.archivedByUserId || null,
    items: (container.items || []).map((item) => ({
      ...item,
      archivedAt: item.archivedAt || null,
      archivedByUserId: item.archivedByUserId || null,
      showOnMasterPlan: Boolean(item.showOnMasterPlan),
      imageUrl: item.imageUrl || "",
      imageName: item.imageName || "",
      showOriginalName: Boolean(item.showOriginalName),
    })),
  };
}

function normalizeQualification(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(3, parsed));
}

function normalizeMemberWorkmode(value) {
  const normalized = String(value || "none").trim().toLowerCase();
  if (normalized === "office" || normalized === "operator") return normalized;
  return "none";
}

function normalizePin(value, fallback = "000000") {
  const digits = String(value || "").replace(/\D+/g, "");
  return digits.length === 6 ? digits : fallback;
}

function getMemberWorkmodeMeta(value) {
  const normalized = normalizeMemberWorkmode(value);
  if (normalized === "office") {
    return { label: "Office", icon: "&#128187;" };
  }
  if (normalized === "operator") {
    return { label: "Operator", icon: "&#128119;" };
  }
  return { label: "No position", icon: "" };
}

function getQualificationStars(value) {
  return "&#9733;".repeat(normalizeQualification(value));
}

function renderQualificationBadge(value, options = {}) {
  const level = normalizeQualification(value);
  if (!level) return options.showEmpty ? `<span class="member-qualification-badge empty">${escapeHtml(options.emptyLabel || "No experience")}</span>` : "";
  return `<span class="member-qualification-badge" title="Experience ${level} of 3">${getQualificationStars(level)}</span>`;
}

function renderMemberWorkmodeBadge(value, options = {}) {
  const meta = getMemberWorkmodeMeta(value);
  if (meta.label === "No position") {
    return options.showEmpty ? `<span class="member-workmode-badge empty">${escapeHtml(options.emptyLabel || "No position")}</span>` : "";
  }
  return `<span class="member-workmode-badge" title="${escapeHtml(meta.label)}"><span aria-hidden="true">${meta.icon}</span><span>${escapeHtml(meta.label)}</span></span>`;
}

function createSystemUser({ id = crypto.randomUUID(), personalNumber = "", name, surname, tel, email, role = "user", qualification = 0, workmode = "none", status = "active", createdAt = new Date().toISOString(), pinCode = "000000", mustChangePin = true, lastLoginAt = null }) {
  return {
    id,
    personalNumber: normalizePersonalNumber(personalNumber),
    name,
    surname,
    tel,
    email: (email || "").trim().toLowerCase(),
    role,
    qualification: normalizeQualification(qualification),
    workmode: normalizeMemberWorkmode(workmode),
    status,
    createdAt,
    pinCode: normalizePin(pinCode),
    mustChangePin: Boolean(mustChangePin),
    lastLoginAt,
    archivedAt: status === "archived" ? createdAt : null,
    permissionOverrides: {},
    navViewOrder: [...DEFAULT_NAV_VIEW_ORDER],
  };
}

function createBootstrapAdminUser() {
  return createSystemUser({
    name: "Admin",
    surname: "",
    tel: "",
    email: "admin@local.app",
    role: "admin",
    mustChangePin: false,
  });
}

function normalizeNavViewOrder(order) {
  const result = [];
  const seen = new Set();
  const source = Array.isArray(order) ? order : [];
  for (const entry of source) {
    const view = String(entry || "").trim();
    if (!DEFAULT_NAV_VIEW_ORDER.includes(view) || seen.has(view)) continue;
    seen.add(view);
    result.push(view);
  }
  for (const view of DEFAULT_NAV_VIEW_ORDER) {
    if (seen.has(view)) continue;
    result.push(view);
  }
  return result;
}

function ensureLegacyUser(rootState, member, fallbackRole = "user") {
  const email = (member.email || "").trim().toLowerCase();
  const existing = rootState.users.find((user) => (email && user.email === email) || (!email && user.name === member.name && user.surname === (member.surname || "")));
  if (existing) {
    if (fallbackRole === "manager" && existing.role === "user") existing.role = "manager";
    return existing.id;
  }
  const user = createSystemUser({
    name: member.name || "Unnamed",
    surname: member.surname || "",
    tel: member.tel || "",
    email,
    role: fallbackRole,
  });
  rootState.users.push(user);
  return user.id;
}

function ensureValidCurrentUser(rootState) {
  const activeUsers = getActiveUsers(rootState);
  if (!activeUsers.length) {
    if (IS_EMPTY_BOOTSTRAP) return null;
    const admin = createBootstrapAdminUser();
    rootState.users.push(admin);
    return admin.id;
  }
  if (activeUsers.some((user) => user.id === rootState.currentUserId)) return rootState.currentUserId;
  return activeUsers[0].id;
}

function ensureAccessibleSelectedProject(rootState) {
  const visible = getVisibleProjects(rootState, false);
  if (!visible.length) return rootState.projects[0]?.id || null;
  if (visible.some((project) => project.id === rootState.selectedProjectId)) return rootState.selectedProjectId;
  return visible[0].id;
}

function getActiveUsers(rootState = state) {
  return (rootState.users || []).filter((user) => user.status !== "archived");
}

function getCurrentUser() {
  return state.users.find((user) => user.id === state.currentUserId) || null;
}

function getUserById(userId) {
  return state.users.find((user) => user.id === userId) || null;
}

function getCurrentRole() {
  return getCurrentUser()?.role || "user";
}

function getCurrentNavViewOrder() {
  return normalizeNavViewOrder(getCurrentUser()?.navViewOrder);
}

function setCurrentNavViewOrder(order) {
  const user = getCurrentUser();
  if (!user) return;
  user.navViewOrder = normalizeNavViewOrder(order);
}

function isAdmin() {
  return getCurrentRole() === "admin";
}

function isDeveloper() {
  return getCurrentRole() === "developer";
}

function isManager() {
  return getCurrentRole() === "manager";
}

function canManageProject(project = getCurrentProject()) {
  if (!project) return false;
  if (!hasPermission("manageProjectContent")) return false;
  if (getCurrentRole() === "admin") return true;
  return isAssignedToProject(project, state.currentUserId);
}

function canWorkInProject(project = getCurrentProject()) {
  if (!project) return false;
  if (hasPermission("manageProjectContent") || hasPermission("uploadFilesPhotos") || hasPermission("viewOwnAssignedTasks")) {
    if (getCurrentRole() === "admin") return true;
  }
  return isAssignedToProject(project, state.currentUserId);
}

function canAccessTeamFolder(folder = getSelectedFolder(), project = getCurrentProject()) {
  if (!folder || !project) return false;
  if (getCurrentRole() === "admin" || canManageProject(project)) return true;
  return isUserInvolvedInTeam(folder);
}

function canManageUsers() {
  return hasPermission("createMembers") || hasPermission("deleteMembers") || hasPermission("changeRoles");
}

function canManageEquipment() {
  return isAdmin() || isDeveloper() || getCurrentRole() === "manager";
}

function canCreateEquipmentCategory() {
  return isAdmin();
}

function getEquipmentCategoryById(categoryId) {
  return state.equipmentCategories.find((category) => category.id === categoryId) || null;
}

function formatEquipmentCategoryName(categoryId) {
  return getEquipmentCategoryById(categoryId)?.name || "No category";
}

function getDefaultPermissionsForRole(role) {
  const roleDefaults = state?.rolePermissionDefaults?.[role] || DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.user;
  return { ...roleDefaults };
}

function getEffectivePermissions(user) {
  const defaults = getDefaultPermissionsForRole(user?.role || "user");
  return { ...defaults, ...(user?.permissionOverrides || {}) };
}

function isPermissionEdited(user) {
  const defaults = getDefaultPermissionsForRole(user?.role || "user");
  const overrides = user?.permissionOverrides || {};
  return Object.keys(overrides).some((key) => overrides[key] !== defaults[key]);
}

function isPermissionElevated(user, permissionKey) {
  const defaults = getDefaultPermissionsForRole(user?.role || "user");
  const effective = getEffectivePermissions(user);
  return !defaults[permissionKey] && Boolean(effective[permissionKey]);
}

function hasPermission(permissionKey, user = getCurrentUser()) {
  return Boolean(getEffectivePermissions(user)[permissionKey]);
}

function isAssignedToProject(project, userId) {
  return Boolean(project?.memberIds?.includes(userId));
}

function getVisibleProjects(rootState = state, includeArchived = false) {
  const currentUserId = rootState.currentUserId;
  const currentRole = (rootState.users.find((user) => user.id === currentUserId)?.role) || "user";
  return (rootState.projects || []).filter((project) => {
    if (project.isDraft) return false;
    if (!includeArchived && project.archivedAt) return false;
    if (currentRole === "admin") return true;
    if (currentRole === "developer") return true;
    if (currentRole === "manager") return true;
    if (currentRole === "user") return true;
    return project.memberIds?.includes(currentUserId);
  });
}

function isArchived(entity) {
  return Boolean(entity?.archivedAt);
}

function archiveEntity(entity) {
  entity.archivedAt = new Date().toISOString();
  entity.archivedByUserId = state.currentUserId;
}

function restoreEntity(entity) {
  entity.archivedAt = null;
  entity.archivedByUserId = null;
}

function requirePermission(condition, message) {
  if (condition) return true;
  showAppMessage(message, "warning", "Permission");
  return false;
}

function logAudit(action, details = {}) {
  state.auditLog.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userId: state.currentUserId,
    userRole: getCurrentRole(),
    action,
    ...details,
  });
}

function notifyUser(userId, { title = "Notification", body = "", fromUserId = state.currentUserId || "" } = {}) {
  if (!userId) return;
  if (!Array.isArray(state.userNotifications)) state.userNotifications = [];
  state.userNotifications.unshift(normalizeUserNotification({
    toUserId: userId,
    fromUserId,
    title,
    body,
  }));
}

mountPopupShells();
bindEvents();
applyAppLanguage();
renderProjectColorPalette();
renderServiceTeamColorPalette();
renderAreaIconPalette();
renderEquipmentIconPalette();
ensureProjectExists();
ensureResponsiblePersonRow();
render();

function bindEvents() {
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("click", onMobileShortcutNavClick);
  els.bookmarkNav?.addEventListener("click", (event) => {
    const button = event.target?.closest?.(".bookmark-link[data-view]");
    if (!button || !els.bookmarkNav.contains(button)) return;
    navigateToAppView(button.dataset.view || "projects");
  });
  window.addEventListener("beforeunload", onBeforeUnload);
  window.addEventListener("resize", onViewportResize);
  window.addEventListener("scroll", closeActiveCardMenu, true);
  els.backButton?.addEventListener("click", () => {
    goBack();
  });
  els.workspaceBackButton?.addEventListener("click", () => {
    goBack();
  });
  els.projectRailBackBtn?.addEventListener("click", () => {
    goBack();
  });
  els.projectRailHomeBtn?.addEventListener("click", () => {
    goHome();
  });
  els.projectRailUndoBtn?.addEventListener("click", () => {
    undoNavigation();
  });
  els.projectRailRedoBtn?.addEventListener("click", () => {
    goForward();
  });
  els.projectRailCollapseBtn?.addEventListener("click", () => {
    toggleProjectsRail();
  });
  for (const button of els.viewButtons) {
    button.addEventListener("dragstart", onNavButtonDragStart);
    button.addEventListener("dragover", onNavButtonDragOver);
    button.addEventListener("dragleave", onNavButtonDragLeave);
    button.addEventListener("drop", onNavButtonDrop);
    button.addEventListener("dragend", onNavButtonDragEnd);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      navigateToAppView(button.dataset.view || "projects");
    });
  }
  els.userProjectsBtn?.addEventListener("click", () => {
    if (!confirmDiscardAndMaybeDeleteDraft()) return;
    pushNavigationState();
    currentView = "projects";
    if (isMobileProjectViewport()) currentMobileProjectsPane = "list";
    setUserDefaultWorkspace(getCurrentProject());
    render();
  });
  els.plannerPrevBtn?.addEventListener("click", () => shiftPlannerPeriod(-1));
  els.plannerTodayBtn?.addEventListener("click", goToPlannerToday);
  els.plannerNextBtn?.addEventListener("click", () => shiftPlannerPeriod(1));
  els.plannerWeekBtn?.addEventListener("click", () => setPlannerMode("week"));
  els.plannerDayBtn?.addEventListener("click", () => setPlannerMode("day"));
  els.plannerHourlyBtn?.addEventListener("click", () => setPlannerSlotHours(1));
  els.planner2hBtn?.addEventListener("click", () => setPlannerSlotHours(2));
  els.planner4hBtn?.addEventListener("click", () => setPlannerSlotHours(4));
  els.plannerAssignmentForm?.addEventListener("submit", onPlannerAssignmentSave);
  els.closePlannerAssignmentBtn?.addEventListener("click", () => closePlannerAssignmentDialog());
  els.cancelPlannerAssignmentBtn?.addEventListener("click", () => closePlannerAssignmentDialog());
  els.plannerAssignmentDeleteBtn?.addEventListener("click", onPlannerAssignmentDelete);
  els.plannerAssignmentDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closePlannerAssignmentDialog();
  });
  els.dailyWorksPrevWeekBtn?.addEventListener("click", () => shiftDailyWorksWeek(-1));
  els.dailyWorksTodayBtn?.addEventListener("click", goToDailyWorksToday);
  els.dailyWorksNextWeekBtn?.addEventListener("click", () => shiftDailyWorksWeek(1));
  els.dailyWorkForm?.addEventListener("submit", onDailyWorkSave);
  els.dailyWorkLastName?.addEventListener("input", autofillDailyWorkContact);
  els.dailyWorkFirstName?.addEventListener("input", autofillDailyWorkContact);
  els.dailyWorkAddress?.addEventListener("input", autofillDailyWorkAddressContact);
  els.dailyWorkPhone?.addEventListener("input", autofillDailyWorkContact);
  els.dailyWorkMapLink?.addEventListener("input", renderDailyWorkFormShortcuts);
  els.dailyWorkMapOpenBtn?.addEventListener("click", openDailyWorkMapLink);
  els.closeDailyWorkBtn?.addEventListener("click", () => closeDailyWorkDialog());
  els.cancelDailyWorkBtn?.addEventListener("click", () => closeDailyWorkDialog());
  els.deleteDailyWorkBtn?.addEventListener("click", onDailyWorkDelete);
  els.dailyWorkDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDailyWorkDialog();
  });
  els.mobileGlobalSearch?.addEventListener("input", onMobileGlobalSearchInput);
  els.mobileHeroToggleBtn?.addEventListener("click", toggleMobileHeroHeader);
  els.currentUserSelect?.addEventListener("change", onCurrentUserChange);
  els.accessPreviewUser?.addEventListener("change", onAccessPreviewChange);
  els.resetAccessPreviewBtn?.addEventListener("click", resetAccessPreview);
  els.projectForm.addEventListener("submit", onProjectSave);
  els.projectName?.addEventListener("input", refreshDraftProjectLockState);
  els.projectManagerUser?.addEventListener("change", refreshDraftProjectLockState);
  els.projectClientSelect?.addEventListener("change", refreshDraftProjectLockState);
  els.viewBoxesBtn?.addEventListener("click", () => setSectionViewMode("boxes"));
  els.viewListBtn?.addEventListener("click", () => setSectionViewMode("list"));
  els.projectSurfaceColor?.addEventListener("input", () => {
    setProjectSurfaceColor(els.projectSurfaceColor.value || "#fffaf2");
  });
  els.projectSearchForm?.addEventListener("submit", onProjectSearchSubmit);
  els.projectSearchInput?.addEventListener("input", onProjectSearchInput);
  els.projectSearchClearBtn?.addEventListener("click", clearProjectSearch);
  els.projectSetupToggle?.addEventListener("click", toggleProjectSetup);
  els.closeProjectSetupBtn?.addEventListener("click", closeProjectSetup);
  els.themeFontFamily?.addEventListener("change", onThemeFontFamilyChange);
  els.themeFontSize?.addEventListener("change", onThemeFontSizeChange);
  els.driveSyncForm?.addEventListener("submit", onDriveSyncSettingsSave);
  els.assignedProjectsFilterBtn?.addEventListener("change", () => {
    showAssignedProjectsOnly = Boolean(els.assignedProjectsFilterBtn?.checked);
    renderProjects();
  });
  els.clientSearchForm?.addEventListener("submit", onClientSearchSubmit);
  els.clientSearchInput?.addEventListener("input", onClientSearchInput);
  els.clientSearchClearBtn?.addEventListener("click", clearClientSearch);
  els.toggleArchivedClientsBtn?.addEventListener("click", () => {
    showArchivedClients = !showArchivedClients;
    renderClients();
  });
  els.toggleClientsListPanelBtn?.addEventListener("click", () => {
    clientsListPanelExpanded = !clientsListPanelExpanded;
    applyDirectoryPanelCollapsedStates();
  });
  els.toggleClientsDetailPanelBtn?.addEventListener("click", () => {
    clientsDetailPanelExpanded = !clientsDetailPanelExpanded;
    applyDirectoryPanelCollapsedStates();
  });
  els.auditSearchForm?.addEventListener("submit", onAuditSearchSubmit);
  els.auditSearchInput?.addEventListener("input", onAuditSearchInput);
  els.auditSearchClearBtn?.addEventListener("click", clearAuditSearch);
  els.createProjectBtn?.addEventListener("click", createProjectFromHeader);
  els.deleteArchivedProjectsBtn?.addEventListener("click", deleteSelectedArchivedProjects);
  els.toggleActiveProjectsBtn?.addEventListener("click", () => {
    areActiveProjectsExpanded = !areActiveProjectsExpanded;
    renderProjects();
  });
  els.toggleCompletedProjectsBtn?.addEventListener("click", () => {
    areCompletedProjectsExpanded = !areCompletedProjectsExpanded;
    renderProjects();
  });
  els.toggleArchivedProjectsBtn?.addEventListener("click", () => {
    areArchivedProjectsExpanded = !areArchivedProjectsExpanded;
    renderProjects();
  });
  els.toggleClientFormBtn?.addEventListener("click", toggleClientForm);
  els.closeClientFormBtn?.addEventListener("click", () => closeClientForm());
  els.clientForm.addEventListener("submit", onClientSave);
  els.addResponsibleBtn.addEventListener("click", () => addResponsiblePersonRow());
  els.clientSearchScope?.addEventListener("change", onClientSearchScopeChange);
  els.workspaceClientDropdown?.addEventListener("change", onWorkspaceClientChange);
  els.toggleMemberFormBtn?.addEventListener("click", toggleMemberForm);
  els.closeMemberFormBtn?.addEventListener("click", () => closeMemberForm());
  els.teamsMembersTabBtn?.addEventListener("click", () => setTeamsTab("members"));
  els.teamsPermissionsTabBtn?.addEventListener("click", () => setTeamsTab("permissions"));
  els.toggleArchivedMembersBtn?.addEventListener("click", () => {
    showArchivedMembers = !showArchivedMembers;
    renderMembers();
  });
  els.toggleMembersListPanelBtn?.addEventListener("click", () => {
    membersListPanelExpanded = !membersListPanelExpanded;
    applyDirectoryPanelCollapsedStates();
  });
  els.toggleMembersDetailPanelBtn?.addEventListener("click", () => {
    membersDetailPanelExpanded = !membersDetailPanelExpanded;
    applyDirectoryPanelCollapsedStates();
  });
  els.memberSearchForm?.addEventListener("submit", onMemberSearchSubmit);
  els.memberSearchInput?.addEventListener("input", onMemberSearchInput);
  els.memberRoleFilter?.addEventListener("change", onMemberFilterChange);
  els.memberSkillFilter?.addEventListener("change", onMemberFilterChange);
  els.memberWorkmodeFilter?.addEventListener("change", onMemberFilterChange);
  els.memberSearchClearBtn?.addEventListener("click", clearMemberFilters);
  els.memberForm.addEventListener("submit", onMemberAdd);
  els.memberForm?.addEventListener("invalid", onMemberFormInvalid, true);
  // Removed: assigning existing users from the member panel.
  els.serviceTeamExperienceFilter?.addEventListener("change", onServiceTeamMemberFilterChange);
  els.serviceTeamPositionFilter?.addEventListener("change", onServiceTeamMemberFilterChange);
  els.serviceTeamName?.addEventListener("input", renderServiceTeamDialogSummary);
  els.serviceTeamInfoToggle?.addEventListener("click", toggleServiceTeamDialogInfo);
  els.serviceTeamAddNoteBtn?.addEventListener("click", () => onServiceTeamDialogAddAsset("note"));
  els.serviceTeamAddFileBtn?.addEventListener("click", () => onServiceTeamDialogAddAsset("file"));
  els.serviceTeamAddPhotoBtn?.addEventListener("click", () => onServiceTeamDialogAddAsset("photo"));
  els.toggleEquipmentFormBtn?.addEventListener("click", toggleEquipmentForm);
  els.closeEquipmentFormBtn?.addEventListener("click", () => closeEquipmentForm());
  els.toggleArchivedEquipmentBtn?.addEventListener("click", () => {
    showArchivedEquipment = !showArchivedEquipment;
    renderEquipment();
  });
  els.toggleEquipmentListPanelBtn?.addEventListener("click", () => {
    equipmentListPanelExpanded = !equipmentListPanelExpanded;
    applyDirectoryPanelCollapsedStates();
  });
  els.toggleEquipmentDetailPanelBtn?.addEventListener("click", () => {
    equipmentDetailPanelExpanded = !equipmentDetailPanelExpanded;
    applyDirectoryPanelCollapsedStates();
  });
  els.equipmentSearchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    equipmentSearchQuery = String(els.equipmentSearchInput?.value || "").trim();
    renderEquipment();
  });
  els.equipmentSearchInput?.addEventListener("input", () => {
    equipmentSearchQuery = String(els.equipmentSearchInput?.value || "").trim();
    renderEquipment();
  });
  els.equipmentSearchClearBtn?.addEventListener("click", () => {
    equipmentSearchQuery = "";
    if (els.equipmentSearchInput) els.equipmentSearchInput.value = "";
    renderEquipment();
  });
  els.equipmentForm?.addEventListener("submit", onEquipmentSave);
  els.toggleEquipmentCategoryFormBtn?.addEventListener("click", toggleEquipmentCategoryForm);
  els.closeEquipmentCategoryFormBtn?.addEventListener("click", () => closeEquipmentCategoryForm());
  els.equipmentCategoryForm?.addEventListener("submit", onEquipmentCategorySave);
  els.foldersHubTab.addEventListener("click", () => {
    pushNavigationState();
    currentWorkspaceTab = "folders-hub";
    currentProjectDetailsTab = "plan";
    selectedProjectAreaId = "";
    renderWorkspace();
  });
  els.openTasksTab?.addEventListener("click", () => {
    pushNavigationState();
    currentWorkspaceTab = "folders-hub";
    currentProjectDetailsTab = "tasks";
    renderWorkspace();
  });
  els.workspaceShowArchivedAreasBtn?.addEventListener("click", () => {
    const project = getCurrentProject();
    const archivedCount = (project?.areas || []).filter((area) => area.archivedAt).length;
    if (!archivedCount && !showArchivedWorkspaceItems) return;
    showArchivedWorkspaceItems = !showArchivedWorkspaceItems;
    renderWorkspace();
  });
  els.workspaceAreaFilterBtn?.addEventListener("click", () => openAreaFilterDialog());
  els.closeAreaFilterBtn?.addEventListener("click", () => closeAreaFilterDialog());
  els.applyAreaFilterBtn?.addEventListener("click", () => applyAreaFilterFromUi());
  els.clearAreaFilterBtn?.addEventListener("click", () => clearAreaFilterAndClose());
  els.workspaceTabbar?.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    els.workspaceTabbar.scrollLeft += event.deltaY;
  }, { passive: false });
  els.addNoteBtn.addEventListener("click", () => switchContentTab("note"));
  els.addFileBtn.addEventListener("click", () => switchContentTab("file"));
  els.addPhotoBtn.addEventListener("click", () => switchContentTab("photo"));
  els.addChatBtn?.addEventListener("click", () => switchContentTab("chat"));
  els.takePhotoBtn.addEventListener("click", onTakePhotoClick);
  els.addTaskBtn?.addEventListener("click", () => switchContentTab("task"));
  els.toggleArchivedBtn?.addEventListener("click", () => {
    showArchivedWorkspaceItems = !showArchivedWorkspaceItems;
    renderWorkspace();
  });
  els.contentAddBtn.addEventListener("click", onContentAdd);
  els.mobileFab.addEventListener("click", openActionSheet);
  els.closeActionSheetBtn.addEventListener("click", closeActionSheet);
  els.sheetNoteBtn.addEventListener("click", () => { closeActionSheet(); openNoteDialog(); });
  els.sheetFileBtn.addEventListener("click", () => { closeActionSheet(); onAddFileClick(); });
  els.sheetPhotoBtn.addEventListener("click", () => { closeActionSheet(); onAddPhotoClick(); });
  els.sheetCameraBtn.addEventListener("click", () => { closeActionSheet(); onTakePhotoClick(); });
  els.sheetTaskBtn.addEventListener("click", () => { closeActionSheet(); onCreateTaskClick(); });
  els.notificationsBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    els.notificationsPanel?.classList.toggle("hidden");
    renderNotificationsPanel();
  });
  els.projectRoomChatBtn?.addEventListener("click", openProjectRoomChatFromHeader);
  els.viberRoomBtn?.addEventListener("click", () => openViberRoomDialog());
  els.noteForm.addEventListener("submit", onNoteSave);
  els.noteImage?.addEventListener("change", onNoteImageChange);
  els.noteStyleToggle?.addEventListener("click", (event) => {
    const btn = event.target?.closest?.("button[data-style]");
    if (!btn) return;
    setNoteStyle(btn.dataset.style);
  });
  els.taskForm.addEventListener("submit", onTaskSave);
  els.areaForm?.addEventListener("submit", onAreaSave);
  els.serviceTeamForm?.addEventListener("submit", onServiceTeamSave);
  els.areaFloorAddBtn?.addEventListener("click", onAreaFloorAdd);
  els.closeNoteBtn.addEventListener("click", () => closeNoteDialog());
  els.cancelNoteBtn.addEventListener("click", () => closeNoteDialog());
  els.closeTaskBtn.addEventListener("click", () => closeTaskDialog());
  els.cancelTaskBtn.addEventListener("click", () => closeTaskDialog());
  els.closeAreaBtn?.addEventListener("click", () => closeAreaDialog());
  els.cancelAreaBtn?.addEventListener("click", () => closeAreaDialog());
  els.closeServiceTeamBtn?.addEventListener("click", () => closeServiceTeamDialog());
  els.cancelServiceTeamBtn?.addEventListener("click", () => closeServiceTeamDialog());
  els.closeProjectTeamInfoBtn?.addEventListener("click", closeProjectTeamInfoDialog);
  els.projectTeamInfoCloseBtn?.addEventListener("click", closeProjectTeamInfoDialog);
  els.fileInput.addEventListener("change", (event) => handleFileSelection(event, "file"));
  els.photoInput.addEventListener("change", (event) => handleFileSelection(event, "photo"));
  els.photoUploadOptionsForm?.addEventListener("submit", onPhotoUploadOptionsSubmit);
  els.closePhotoUploadOptionsBtn?.addEventListener("click", () => closePhotoUploadOptionsDialog());
  els.cancelPhotoUploadOptionsBtn?.addEventListener("click", () => closePhotoUploadOptionsDialog());
  els.closePlansAddBtn?.addEventListener("click", () => closePlansAddDialog(""));
  els.plansAddNoteBtn?.addEventListener("click", () => closePlansAddDialog("note"));
  els.plansAddFileBtn?.addEventListener("click", () => closePlansAddDialog("file"));
  els.plansAddPhotoBtn?.addEventListener("click", () => closePlansAddDialog("photo"));
  els.plansAddCameraBtn?.addEventListener("click", () => closePlansAddDialog("camera"));
  els.closeViberRoomBtn?.addEventListener("click", closeViberRoomDialog);
  els.openViberRoomLinkBtn?.addEventListener("click", openViberRoomLink);
  els.saveViberRoomBtn?.addEventListener("click", saveViberRoomSettings);
  els.speechBtn?.addEventListener("click", onSpeechStart);
  els.parseSpeechBtn?.addEventListener("click", onParseSpeech);
  els.captureBtn.addEventListener("click", onCapturePhoto);
  els.cancelCameraBtn.addEventListener("click", () => closeCameraDialog());
  els.closeCameraBtn.addEventListener("click", () => closeCameraDialog());
  els.cameraDialog.addEventListener("close", stopCameraStream);
  els.appMessageOkBtn?.addEventListener("click", closeAppMessageDialog);
  els.closeAppMessageBtn?.addEventListener("click", closeAppMessageDialog);
  els.appConfirmOkBtn?.addEventListener("click", () => closeAppConfirmDialog(true));
  els.appConfirmCancelBtn?.addEventListener("click", () => closeAppConfirmDialog(false));
  els.closeAppConfirmBtn?.addEventListener("click", () => closeAppConfirmDialog(false));
  els.permissionMemberOkBtn?.addEventListener("click", closePermissionMemberDialog);
  els.closePermissionMemberBtn?.addEventListener("click", closePermissionMemberDialog);
  els.closeAreaBrowserBtn?.addEventListener("click", closeAreaBrowserDialog);
  els.areaBrowserCloseBtn?.addEventListener("click", closeAreaBrowserDialog);
  els.areaBrowserViewGridBtn?.addEventListener("click", () => {
    areaBrowserViewMode = "grid";
    renderAreaBrowserDialog();
  });
  els.areaBrowserViewListBtn?.addEventListener("click", () => {
    areaBrowserViewMode = "list";
    renderAreaBrowserDialog();
  });
  els.areaBrowserSortFilter?.addEventListener("change", () => {
    areaBrowserSortFilter = els.areaBrowserSortFilter?.value || "time";
    renderAreaBrowserDialog();
  });
  els.areaBrowserTeamFilter?.addEventListener("change", () => {
    areaBrowserTeamFilter = els.areaBrowserTeamFilter?.value || "all";
    renderAreaBrowserDialog();
  });
  els.areaBrowserTypeFilter?.addEventListener("change", () => {
    areaBrowserTypeFilter = els.areaBrowserTypeFilter?.value || "all";
    renderAreaBrowserDialog();
  });
  els.closeImagePreviewBtn?.addEventListener("click", closeImagePreview);
  els.imagePreviewCloseBtn?.addEventListener("click", closeImagePreview);
  els.imagePreviewPrevBtn?.addEventListener("click", () => stepImagePreview(-1));
  els.imagePreviewNextBtn?.addEventListener("click", () => stepImagePreview(1));
  els.noteDialog?.addEventListener("cancel", onNoteDialogCancel);
  els.taskDialog?.addEventListener("cancel", onTaskDialogCancel);
  els.areaDialog?.addEventListener("cancel", onAreaDialogCancel);
  els.serviceTeamDialog?.addEventListener("cancel", onServiceTeamDialogCancel);
  els.photoUploadOptionsDialog?.addEventListener("cancel", onPhotoUploadOptionsDialogCancel);
  els.plansAddDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closePlansAddDialog("");
  });
  els.viberRoomDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeViberRoomDialog();
  });
  els.projectTeamInfoDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeProjectTeamInfoDialog();
  });
  els.areaBrowserDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeAreaBrowserDialog();
  });
  els.imagePreviewDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeImagePreview();
  });
  els.appMessageDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeAppMessageDialog();
  });
  els.appConfirmDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeAppConfirmDialog(false);
  });
  els.permissionMemberDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closePermissionMemberDialog();
  });
  els.projectSetupLock?.addEventListener("click", showDraftProjectLockMessage);
  els.workspaceLockOverlay?.addEventListener("click", showDraftProjectLockMessage);
  document.addEventListener("keydown", onGlobalDialogKeydown);
  attachMentionAutocomplete(els.noteTitle);
  attachMentionAutocomplete(els.noteContent);
  attachMentionAutocomplete(els.taskTitle);
  attachMentionAutocomplete(els.taskNotes);
}

function navigateToAppView(view) {
  if (!confirmDiscardAndMaybeDeleteDraft()) return;
  if (view === "audit" && !isAdmin()) {
    showAppMessage("Only admins can view the full audit log.", "warning", "Audit Log");
    return;
  }
  pushNavigationState();
  currentView = view || "projects";
  if (currentView === "projects" && isMobileProjectViewport()) {
    currentMobileProjectsPane = "list";
  }
  const mobileMoreMenu = document.querySelector("#mobile-more-menu");
  if (mobileMoreMenu instanceof HTMLDetailsElement) mobileMoreMenu.removeAttribute("open");
  render();
}

function onMobileShortcutNavClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const btn = target.closest(".mobile-bottom-btn[data-view], .mobile-more-item[data-view]");
  if (!(btn instanceof HTMLElement)) return;
  const view = btn.dataset.view;
  if (!view) return;

  // Mirror the sidebar behavior.
  if (!confirmDiscardAndMaybeDeleteDraft()) return;
  if (view === "audit" && !isAdmin()) {
    showAppMessage("Only admins can view the full audit log.", "warning", "Audit Log");
    return;
  }
  pushNavigationState();
  currentView = view;
  if (view === "projects" && isMobileProjectViewport()) currentMobileProjectsPane = "list";

  const mobileMoreMenu = document.querySelector("#mobile-more-menu");
  if (mobileMoreMenu instanceof HTMLDetailsElement) mobileMoreMenu.removeAttribute("open");

  event.preventDefault();
  event.stopPropagation();
  render();
}

function applyAppLanguage() {
  document.documentElement.lang = currentAppLanguage || "en";
  syncLanguageInUrl(currentAppLanguage || "en");
  applyLanguageToDocument();
}

function onAppLanguageChange() {
  currentAppLanguage = normalizeLanguageCode(els.appLanguageSelect?.value) || "en";
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentAppLanguage);
  } catch (error) {
    // keep working without localStorage permissions
  }
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", currentAppLanguage);
    window.location.assign(url.toString());
    return;
  } catch (error) {
    // fallback when URL API is unavailable
  }
  applyAppLanguage();
  render();
}

function decodeHtmlEntities(value) {
  if (value == null) return "";
  if (!String(value).includes("&")) return String(value);
  const shell = document.createElement("textarea");
  shell.innerHTML = String(value);
  return shell.value;
}

function normalizeI18nText(value) {
  return decodeHtmlEntities(String(value || "").replace(/\s+/g, " ").trim());
}

function getNormalizedLanguageMap(lang) {
  const targetLang = normalizeLanguageCode(lang) || "en";
  if (APP_TRANSLATIONS_NORMALIZED_CACHE[targetLang]) {
    return APP_TRANSLATIONS_NORMALIZED_CACHE[targetLang];
  }
  const sourceMap = APP_TRANSLATIONS?.[targetLang] || {};
  const normalizedMap = {};
  for (const [key, value] of Object.entries(sourceMap)) {
    const normalizedKey = normalizeI18nText(key).toLowerCase();
    if (!normalizedKey || !value) continue;
    normalizedMap[normalizedKey] = value;
  }
  APP_TRANSLATIONS_NORMALIZED_CACHE[targetLang] = normalizedMap;
  return normalizedMap;
}

function translateFromEnglishText(sourceText) {
  if (!sourceText || currentAppLanguage === "en") return sourceText;
  const langMap = APP_TRANSLATIONS?.[currentAppLanguage] || {};
  const direct = langMap[sourceText];
  if (direct) return direct;

  const normalized = normalizeI18nText(sourceText);
  if (normalized !== sourceText && langMap[normalized]) return langMap[normalized];

  const normalizedLower = normalized.toLowerCase();
  const normalizedMap = getNormalizedLanguageMap(currentAppLanguage);
  if (normalizedMap[normalizedLower]) return normalizedMap[normalizedLower];

  const withoutPunctuation = normalizedLower.replace(/[.:!?]+$/g, "").trim();
  if (withoutPunctuation && normalizedMap[withoutPunctuation]) return normalizedMap[withoutPunctuation];

  if (normalized.startsWith("+ ")) {
    const plusBase = normalized.slice(2).trim();
    const plusMatch = translateFromEnglishText(plusBase);
    if (plusMatch && plusMatch !== plusBase) return `+ ${plusMatch}`;
  }

  if (currentAppLanguage === "el") {
    const greekFallback = {
      "+ add photos": "+ Προσθήκη φωτογραφιών",
      "+ add note": "+ Προσθήκη σημείωσης",
      "+ upload": "+ Μεταφόρτωση",
      "+ client": "+ Πελάτης",
    };
    if (greekFallback[normalizedLower]) return greekFallback[normalizedLower];
  }
  return sourceText;
}

function applyLanguageToDocument(root = document.body) {
  if (!root) return;
  const translatableAttrs = ["placeholder", "title", "aria-label"];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode) {
    const parentTag = textNode.parentElement?.tagName || "";
    if (!["SCRIPT", "STYLE", "NOSCRIPT"].includes(parentTag)) {
      if (!textNodeSourceMap.has(textNode)) {
        textNodeSourceMap.set(textNode, textNode.nodeValue || "");
      }
      const source = textNodeSourceMap.get(textNode) || "";
      const translated = translateFromEnglishText(source);
      if (textNode.nodeValue !== translated) textNode.nodeValue = translated;
    }
    textNode = walker.nextNode();
  }

  root.querySelectorAll("*").forEach((element) => {
    for (const attr of translatableAttrs) {
      if (!element.hasAttribute(attr)) continue;
      const sourceAttrKey = `i18nSource${attr.replace(/-([a-z])/g, (_, m) => m.toUpperCase()).replace(/^([a-z])/, (_, m) => m.toUpperCase())}`;
      if (!element.dataset[sourceAttrKey]) {
        element.dataset[sourceAttrKey] = element.getAttribute(attr) || "";
      }
      const source = element.dataset[sourceAttrKey] || "";
      const translated = translateFromEnglishText(source);
      if (element.getAttribute(attr) !== translated) element.setAttribute(attr, translated);
    }
  });
}

function onDocumentClick(event) {
  const target = event.target;
  if (target instanceof Element && target.closest("#project-room-chat-btn")) {
    openProjectRoomChatFromHeader();
    return;
  }
  if (els.notificationsPanel && els.notificationsBtn) {
    if (!(target instanceof Node) || (!els.notificationsPanel.contains(target) && !els.notificationsBtn.contains(target))) {
      els.notificationsPanel.classList.add("hidden");
    }
  }
  if (els.mentionSuggest && target instanceof Node && !els.mentionSuggest.contains(target)) {
    hideMentionSuggest();
  }
  if (els.accessMenu?.open) {
    if (target instanceof Node && els.accessMenu.contains(target)) return;
    els.accessMenu.removeAttribute("open");
  }
  if (!(target instanceof Node)) return;
  if (activeCardMenu?.root?.contains(target)) return;
  closeActiveCardMenu();
}

function onBeforeUnload(event) {
  if (!getDirtyTrackedForms().length) return;
  event.preventDefault();
  event.returnValue = "";
}

function isMobileProjectViewport() {
  if (document.body.classList.contains("mobile-v2")) return true;
  return window.matchMedia
    ? window.matchMedia(`(max-width: ${MOBILE_PROJECT_BREAKPOINT}px)`).matches
    : window.innerWidth <= MOBILE_PROJECT_BREAKPOINT;
}

function getActiveMobileProjectsPane() {
  if (currentView !== "projects" || !isMobileProjectViewport()) return "split";
  return currentMobileProjectsPane === "detail" && getCurrentProject() ? "detail" : "list";
}

function onViewportResize() {
  closeActiveCardMenu();
  const isMobileViewport = isMobileProjectViewport();
  if (isMobileViewport === wasMobileProjectViewport) return;
  wasMobileProjectViewport = isMobileViewport;
  render();
}

function captureNavigationState() {
  return {
    currentView,
    currentWorkspaceTab,
    currentContentTab,
    currentProjectDetailsTab,
    currentMobileProjectsPane,
    plannerMode,
    plannerSlotHours,
    plannerAnchorDate,
    selectedPlannerTeamId,
    selectedProjectId: state.selectedProjectId,
    showOtherTeamsForUser,
    showAssignedProjectsOnly,
  };
}

function pushNavigationState(clearFuture = true) {
  const snapshot = captureNavigationState();
  const previous = navigationHistory[navigationHistory.length - 1];
  if (previous && JSON.stringify(previous) === JSON.stringify(snapshot)) return;
  navigationHistory.push(snapshot);
  if (navigationHistory.length > 80) navigationHistory.shift();
  if (clearFuture) navigationFuture = [];
}

function restoreNavigationState(snapshot) {
  if (!snapshot) return;
  currentView = snapshot.currentView || "projects";
  currentWorkspaceTab = snapshot.currentWorkspaceTab || "folders-hub";
  currentContentTab = snapshot.currentContentTab || "note";
  currentProjectDetailsTab = snapshot.currentProjectDetailsTab || "plan";
  currentMobileProjectsPane = snapshot.currentMobileProjectsPane === "detail" ? "detail" : "list";
  plannerMode = snapshot.plannerMode === "day" ? "day" : "week";
  plannerSlotHours = [1, 2, 4].includes(snapshot.plannerSlotHours) ? snapshot.plannerSlotHours : 1;
  plannerAnchorDate = snapshot.plannerAnchorDate || todayInputValue();
  selectedPlannerTeamId = snapshot.selectedPlannerTeamId || "";
  showOtherTeamsForUser = Boolean(snapshot.showOtherTeamsForUser);
  showAssignedProjectsOnly = Boolean(snapshot.showAssignedProjectsOnly);
  if (snapshot.selectedProjectId && state.projects.some((project) => project.id === snapshot.selectedProjectId)) {
    state.selectedProjectId = snapshot.selectedProjectId;
  }
  persist();
  render();
}

function goBack() {
  if (!confirmDiscardAndMaybeDeleteDraft()) return;
  const snapshot = navigationHistory.pop();
  if (snapshot) {
    const currentSnapshot = captureNavigationState();
    const nextForward = navigationFuture[navigationFuture.length - 1];
    if (!nextForward || JSON.stringify(nextForward) !== JSON.stringify(currentSnapshot)) {
      navigationFuture.push(currentSnapshot);
      if (navigationFuture.length > 80) navigationFuture.shift();
    }
    restoreNavigationState(snapshot);
    return;
  }
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function undoNavigation() {
  if (!confirmDiscardAndMaybeDeleteDraft()) return;
  const snapshot = navigationHistory.pop();
  if (!snapshot) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const currentSnapshot = captureNavigationState();
  const nextForward = navigationFuture[navigationFuture.length - 1];
  if (!nextForward || JSON.stringify(nextForward) !== JSON.stringify(currentSnapshot)) {
    navigationFuture.push(currentSnapshot);
    if (navigationFuture.length > 80) navigationFuture.shift();
  }
  restoreNavigationState(snapshot);
}

function ensureProjectExists() {
  if (!state.projects.length) {
    state.selectedProjectId = null;
    return;
  }
  if (!getCurrentProject()) selectProject(ensureAccessibleSelectedProject(state), false);
}

function createBlankProject() {
  return {
    id: crypto.randomUUID(),
    projectNumber: "",
    name: "",
    projectManagerUserId: "",
    startDate: todayInputValue(),
    endDate: "",
    lifecycle: "active",
    clientId: "",
    surfaceColor: "",
    memberIds: [],
    selectedTeamFilterIds: [],
    selectedTeamFiltersInitialized: false,
    selectedTeamInfoId: "",
    selectedChatChannelId: "",
    projectRoomMode: "chat",
    viberRoomStatus: "not_created",
    viberRoomLink: "",
    viberRoomId: "",
    teamInfoExpanded: false,
    detailsFolder: createBuiltInFolder("Project Details", PRIMARY_TAB_COLORS["folders-hub"]),
    folders: [],
    areas: [],
    floors: [],
    areaQuickFilter: { floor: "", query: "" },
    chatMessages: [],
    mentionNotifications: [],
    sectionViewModes: { ...DEFAULT_SECTION_VIEW_MODES },
    selectedFolderId: null,
    createdAt: new Date().toISOString(),
    isDraft: false,
    archivedAt: null,
    archivedByUserId: null,
  };
}

function createBuiltInFolder(name, tabColor = FOLDER_TAB_PALETTE[0]) {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    items: [],
    builtIn: true,
    tabColor,
    archivedAt: null,
    archivedByUserId: null,
  };
}

function getCurrentProject() {
  const selectedProject = state.projects.find((project) => project.id === state.selectedProjectId) || null;
  if (selectedProject) return selectedProject;
  const visibleProjects = getVisibleProjects(state, true);
  return visibleProjects[0] || null;
}

function getSelectedFolder() {
  const project = getCurrentProject();
  if (!project) return null;
  if (currentWorkspaceTab === "folders-hub") {
    return getProjectDetailsFolder(project);
  }
  const folder = project?.folders.find((entry) => entry.id === project.selectedFolderId) || null;
  if (folder?.archivedAt && !showArchivedWorkspaceItems) return null;
  return folder;
}

function getCurrentSectionViewKey() {
  if (currentView !== "projects") return null;
  if (currentWorkspaceTab === "folders-hub") {
    return `details:${currentProjectDetailsTab || "plan"}`;
  }
  if (currentWorkspaceTab.startsWith("folder:")) {
    return `folder:${currentContentTab || "note"}`;
  }
  if (currentWorkspaceTab === "open-tasks") {
    return "details:tasks";
  }
  return null;
}

function getSectionViewMode(project = getCurrentProject(), key = getCurrentSectionViewKey()) {
  if (!project || !key) return "boxes";
  project.sectionViewModes = {
    ...DEFAULT_SECTION_VIEW_MODES,
    ...(project.sectionViewModes || {}),
  };
  return project.sectionViewModes[key] || DEFAULT_SECTION_VIEW_MODES[key] || "boxes";
}

function setSectionViewMode(mode, project = getCurrentProject(), key = getCurrentSectionViewKey()) {
  if (!project || !key || !["boxes", "list"].includes(mode)) return;
  const currentMode = getSectionViewMode(project, key);
  if (currentMode === mode) return;
  project.sectionViewModes = {
    ...DEFAULT_SECTION_VIEW_MODES,
    ...(project.sectionViewModes || {}),
    [key]: mode,
  };
  persist();
  if (currentView === "teams" && key === "members:directory") {
    renderMembers();
    return;
  }
  renderWorkspace();
}

function getProjectDetailsFolder(project = getCurrentProject()) {
  if (!project) return null;
  if (!project.detailsFolder) {
    project.detailsFolder = createBuiltInFolder("Project Details", PRIMARY_TAB_COLORS["folders-hub"]);
  }
  return project.detailsFolder;
}

function ensureProjectFolderColors(project) {
  if (!project) return;
  const detailsFolder = getProjectDetailsFolder(project);
  if (!detailsFolder.tabColor) detailsFolder.tabColor = PRIMARY_TAB_COLORS["folders-hub"];
  if (!Array.isArray(project.memberIds)) project.memberIds = [];
  for (const [index, folder] of (project.folders || []).entries()) {
    const defaultColor = SERVICE_TEAM_COLOR_PRESETS[index % SERVICE_TEAM_COLOR_PRESETS.length]?.color || "#0d7a73";
    if (!folder.tabColor || FOLDER_TAB_PALETTE.includes(folder.tabColor)) folder.tabColor = defaultColor;
    if (!Array.isArray(folder.memberIds)) folder.memberIds = [];
  }
  if (!Array.isArray(project.areas)) project.areas = [];
  for (const area of project.areas) {
    if (!Array.isArray(area.teamIds)) area.teamIds = [];
  }
}

function pickNextFolderColor(project) {
  const usedCount = (project?.folders || []).length;
  return SERVICE_TEAM_COLOR_PRESETS[usedCount % SERVICE_TEAM_COLOR_PRESETS.length]?.color || "#0d7a73";
}

function getClientById(clientId) {
  return state.clients.find((client) => client.id === clientId) || null;
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function splitSearchTokens(value) {
  return normalizeSearchText(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function getClientSearchValues(client, scope = "all") {
  const responsiblePersons = client.responsiblePersons || [];
  const valueMap = {
    name: [
      formatClientName(client),
      client.name,
      client.surname,
    ],
    company: [client.company],
    uid: [client.uidNumber],
    address: [client.address],
    email: [client.email],
    tel: [client.tel],
    responsible: responsiblePersons.flatMap((person) => [
      `${person.name || ""} ${person.surname || ""}`.trim(),
      person.name,
      person.surname,
      person.email,
      person.tel,
    ]),
  };
  const scopedValues = scope === "all"
    ? Object.values(valueMap).flat()
    : (valueMap[scope] || []);
  return scopedValues.map((value) => normalizeSearchText(value)).filter(Boolean);
}

function clientMatchesSearch(client, query, scope = "all") {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const values = getClientSearchValues(client, scope);
  const tokens = values.flatMap((value) => [value, ...splitSearchTokens(value)]);
  return terms.every((term) => tokens.some((token) => token.startsWith(term)));
}

function onProjectSave(event) {
  event.preventDefault();
  const project = getCurrentProject();
  if (!project) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can edit project setup.")) return;
  const projectName = els.projectName.value.trim();
  const projectManagerUserId = els.projectManagerUser.value || "";
  const clientId = els.projectClientSelect.value || "";
  if (!projectName || !projectManagerUserId || !clientId) {
    showAppMessage("Project name, project manager, and client are required.", "warning", "Project Setup");
    return;
  }
  const previousName = project.name || "Untitled project";
  if (!project.projectNumber) {
    project.projectNumber = getNextProjectNumber(state.projects);
  }
  project.name = projectName;
  project.projectManagerUserId = projectManagerUserId;
  project.isDraft = false;
  if (!project.memberIds.includes(projectManagerUserId)) {
    project.memberIds.push(projectManagerUserId);
  }
  if (project.projectManagerUserId && !project.memberIds.includes(project.projectManagerUserId)) {
    project.memberIds.push(project.projectManagerUserId);
  }
  project.startDate = els.projectStartDate.value || todayInputValue();
  project.endDate = els.projectEndDate.value;
  project.surfaceColor = els.projectSurfaceColor.value || "#fffaf2";
  project.lifecycle = els.projectLifecycle.value;
  project.clientId = clientId;
  if (project.lifecycle === "completed" && !project.endDate) project.endDate = todayInputValue();
  if (project.lifecycle === "active") project.endDate = "";
  isProjectSetupDialogOpen = false;
  logAudit("Project Updated", {
    objectType: "project",
    objectName: project.name || previousName,
    projectId: project.id,
  });
  persist();
  render();
  showAppMessage(`Project "${project.name}" is successfully saved.`, "success", "Project Saved");
}

function onClientSave(event) {
  event.preventDefault();
  if (!requirePermission(PROJECT_ROLES.has(getCurrentRole()) || isAdmin(), "Only admins or managers can create or edit clients.")) return;
  const existingClient = editingClientId ? getClientById(editingClientId) : null;
  const responsiblePersons = collectResponsiblePersons();
  const clientDraft = {
    name: els.clientName.value.trim(),
    surname: els.clientSurname.value.trim(),
    company: els.clientCompany.value.trim(),
    uidNumber: els.clientUid.value.trim(),
    address: els.clientAddress.value.trim(),
    email: els.clientEmail.value.trim().toLowerCase(),
    tel: els.clientTel.value.trim(),
    responsiblePersons,
    archivedAt: null,
    archivedByUserId: null,
  };
  if (!clientDraft.name && !clientDraft.company) {
    showAppMessage("Client name or company is required.", "warning", "Client");
    return;
  }
  const project = getCurrentProject();
  let client = existingClient;
  if (client) {
    Object.assign(client, clientDraft);
  } else {
    client = {
      id: crypto.randomUUID(),
      ...clientDraft,
    };
    state.clients.unshift(client);
    if (project && !project.clientId) project.clientId = client.id;
  }
  selectedClientId = client.id;
  isClientFormExpanded = false;
  resetClientForm();
  logAudit(existingClient ? "Client Updated" : "Client Created", {
    objectType: "client",
    objectName: formatClientName(client),
    projectId: project?.id || "",
  });
  persist();
  render();
}

function addResponsiblePersonRow(person = { name: "", surname: "", tel: "", email: "" }) {
  const node = els.responsiblePersonTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('[data-field="name"]').value = person.name || "";
  node.querySelector('[data-field="surname"]').value = person.surname || "";
  node.querySelector('[data-field="tel"]').value = person.tel || "";
  node.querySelector('[data-field="email"]').value = person.email || "";
  node.querySelector(".remove-responsible-btn").addEventListener("click", () => {
    node.remove();
    ensureResponsiblePersonRow();
  });
  els.responsibleList.append(node);
}

function ensureResponsiblePersonRow() {
  if (!els.responsibleList.children.length) addResponsiblePersonRow();
}

function collectResponsiblePersons() {
  return Array.from(els.responsibleList.children)
    .map((card) => ({
      name: card.querySelector('[data-field="name"]').value.trim(),
      surname: card.querySelector('[data-field="surname"]').value.trim(),
      tel: card.querySelector('[data-field="tel"]').value.trim(),
      email: card.querySelector('[data-field="email"]').value.trim().toLowerCase(),
    }))
    .filter((person) => person.name || person.surname || person.tel || person.email);
}

function onCurrentUserChange() {
  const previousUserId = state.currentUserId;
  const nextUserId = els.currentUserSelect?.value || "";
  if (!confirmDiscardAndMaybeDeleteDraft()) {
    if (els.currentUserSelect) els.currentUserSelect.value = previousUserId || "";
    return;
  }
  const nextUser = getUserById(nextUserId);
  if (!authenticateLoginUser(nextUser)) {
    if (els.currentUserSelect) els.currentUserSelect.value = previousUserId || "";
    return;
  }
  developerPreviewSourceUserId = null;
  state.currentUserId = nextUserId;
  nextUser.lastLoginAt = new Date().toISOString();
  state.selectedProjectId = ensureAccessibleSelectedProject(state);
  showArchivedWorkspaceItems = false;
  if (isUserRole() && currentView !== "projects") currentView = "projects";
  else if (!isAdmin() && currentView === "audit") currentView = "projects";
  if (isUserRole() && currentWorkspaceTab !== "open-tasks") {
    setUserDefaultWorkspace(getCurrentProject());
  }
  logAudit("Session User Changed", {
    objectType: "session",
    objectName: getCurrentUser() ? `${getCurrentUser().name} ${getCurrentUser().surname}`.trim() : "Unknown",
  });
  persist();
  render();
}

function authenticateLoginUser(user) {
  if (!user) return false;
  const enteredPin = window.prompt(`PIN for ${getMemberDisplayName(user)}:`);
  if (enteredPin == null) return false;
  if (normalizePin(enteredPin, "") !== user.pinCode) {
    showAppMessage("Incorrect PIN.", "warning", "Login");
    return false;
  }
  if (!user.mustChangePin) return true;
  const nextPin = window.prompt("This is the first login after a reset. Enter a new 6-digit PIN:");
  if (nextPin == null) return false;
  const normalizedNextPin = normalizePin(nextPin, "");
  if (!normalizedNextPin || normalizedNextPin === "000000") {
    showAppMessage("Please choose a new 6-digit PIN that is not 000000.", "warning", "Login");
    return false;
  }
  const confirmPin = window.prompt("Confirm the new PIN:");
  if (normalizePin(confirmPin, "") !== normalizedNextPin) {
    showAppMessage("PIN confirmation did not match.", "warning", "Login");
    return false;
  }
  user.pinCode = normalizedNextPin;
  user.mustChangePin = false;
  notifyUser(user.id, {
    title: "PIN changed",
    body: "Your login PIN was changed successfully.",
    fromUserId: user.id,
  });
  return true;
}

function clearNavDragState() {
  draggedNavView = "";
  for (const button of els.viewButtons) {
    button.classList.remove("is-drop-target", "is-dragging");
  }
}

function onNavButtonDragStart(event) {
  const button = event.currentTarget;
  if (!(button instanceof HTMLButtonElement)) return;
  draggedNavView = button.dataset.view || "";
  button.classList.add("is-dragging");
  event.dataTransfer?.setData("text/plain", draggedNavView);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function onNavButtonDragOver(event) {
  if (!draggedNavView) return;
  const button = event.currentTarget;
  if (!(button instanceof HTMLButtonElement)) return;
  if (button.dataset.view === draggedNavView) return;
  event.preventDefault();
  button.classList.add("is-drop-target");
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

function onNavButtonDragLeave(event) {
  const button = event.currentTarget;
  if (!(button instanceof HTMLButtonElement)) return;
  button.classList.remove("is-drop-target");
}

function onNavButtonDrop(event) {
  const button = event.currentTarget;
  if (!(button instanceof HTMLButtonElement)) return;
  const targetView = button.dataset.view || "";
  if (!draggedNavView || !targetView || draggedNavView === targetView) {
    clearNavDragState();
    return;
  }
  event.preventDefault();
  const order = [...getCurrentNavViewOrder()];
  const fromIndex = order.indexOf(draggedNavView);
  const targetIndex = order.indexOf(targetView);
  if (fromIndex < 0 || targetIndex < 0) {
    clearNavDragState();
    return;
  }
  const [moved] = order.splice(fromIndex, 1);
  const rect = button.getBoundingClientRect();
  const insertAfter = event.clientY > rect.top + rect.height / 2;
  let nextIndex = order.indexOf(targetView);
  if (insertAfter) nextIndex += 1;
  order.splice(nextIndex, 0, moved);
  setCurrentNavViewOrder(order);
  persist();
  renderBookmarkNav();
  renderViews();
  clearNavDragState();
}

function onNavButtonDragEnd() {
  clearNavDragState();
}

function onAccessPreviewChange() {
  const previousUserId = state.currentUserId;
  if (!els.accessPreviewUser?.value) return;
  if (!isDeveloper()) return;
  if (!confirmDiscardAndMaybeDeleteDraft()) {
    els.accessPreviewUser.value = previousUserId || "";
    return;
  }
  if (!developerPreviewSourceUserId) developerPreviewSourceUserId = state.currentUserId;
  state.currentUserId = els.accessPreviewUser.value;
  state.selectedProjectId = ensureAccessibleSelectedProject(state);
  showArchivedWorkspaceItems = false;
  if (isUserRole() && currentView !== "projects") currentView = "projects";
  else if (!isAdmin() && currentView === "audit") currentView = "projects";
  if (isUserRole() && currentWorkspaceTab !== "open-tasks") {
    setUserDefaultWorkspace(getCurrentProject());
  }
  logAudit("Developer Preview Changed", {
    objectType: "session",
    objectName: getCurrentUser() ? getMemberDisplayName(getCurrentUser()) : "Unknown",
  });
  persist();
  render();
}

function resetAccessPreview() {
  if (!developerPreviewSourceUserId) return;
  if (!confirmDiscardAndMaybeDeleteDraft()) return;
  state.currentUserId = developerPreviewSourceUserId;
  developerPreviewSourceUserId = null;
  state.selectedProjectId = ensureAccessibleSelectedProject(state);
  showArchivedWorkspaceItems = false;
  logAudit("Developer Preview Reset", {
    objectType: "session",
    objectName: getCurrentUser() ? getMemberDisplayName(getCurrentUser()) : "Unknown",
  });
  persist();
  render();
}

function onWorkspaceClientChange() {
  const project = getCurrentProject();
  if (!project || !els.workspaceClientDropdown) return;
  if (!requireDraftProjectUnlocked(project)) {
    els.workspaceClientDropdown.value = project.clientId || "";
    return;
  }
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can change the project client.")) return;
  project.clientId = els.workspaceClientDropdown.value;
  logAudit("Project Client Updated", {
    objectType: "project",
    objectName: project.name || "Untitled project",
    projectId: project.id,
  });
  persist();
  render();
}

function onMemberAdd(event) {
  event.preventDefault();
  const isInitialSetup = IS_EMPTY_BOOTSTRAP && getActiveUsers().length === 0;
  const isEditingMember = Boolean(editingMemberId);
  const canSubmitMember = isEditingMember ? hasPermission("changeRoles") : (isInitialSetup || hasPermission("createMembers"));
  if (!requirePermission(canSubmitMember, isEditingMember ? "You do not have permission to edit members." : "You do not have permission to create members.")) return;
  const project = getCurrentProject();
  const editingMember = editingMemberId ? getUserById(editingMemberId) : null;
  if (isEditingMember && !editingMember) return;
  const name = els.memberName.value.trim();
  const surname = els.memberSurname.value.trim();
  const tel = els.memberTel.value.trim();
  const email = els.memberEmail.value.trim().toLowerCase();
  const qualification = normalizeQualification(els.memberQualification?.value);
  const workmode = normalizeMemberWorkmode(els.memberWorkmode?.value);
  const role = els.memberRole.value;
  if (isEditingMember && editingMember?.id === state.currentUserId && editingMember.role !== role) {
    showAppMessage("You cannot change your own role.", "warning", "Member");
    if (els.memberRole) els.memberRole.value = editingMember.role || "user";
    return;
  }
  if (role === "admin" && !isInitialSetup) {
    const needsAdminPromotion = !editingMember || editingMember.role !== "admin";
    if (needsAdminPromotion && !requirePermission(hasPermission("createAdmin"), "You do not have permission to create admins.")) return;
  }
  if (isEditingMember && editingMember?.role === "admin" && role !== "admin" && !requirePermission(hasPermission("deleteAdmin"), "You do not have permission to remove admins.")) return;
  if (!name || !surname || !tel || !email) {
    showAppMessage("Please fill in name, surname, telephone number, and email before adding the member.", "warning", "Member");
    return;
  }
  const duplicateUser = state.users.find((user) => user.email === email && user.id !== editingMemberId);
  if (duplicateUser) {
    showAppMessage("Another member already uses this email address.", "warning", "Member");
    return;
  }
  const existing = editingMember || state.users.find((user) => user.email === email);
  const user = existing || createSystemUser({ personalNumber: getNextPersonalNumber(), name, surname, tel, email, role, qualification, workmode });
  if (!existing) {
    state.users.push(user);
    user.pinCode = "000000";
    user.mustChangePin = true;
    notifyUser(user.id, {
      title: "Account created",
      body: "Your account was created. Use temporary PIN 000000 on first login, then choose a new PIN.",
    });
    logAudit("Member Created", {
      objectType: "member",
      objectName: `${user.name} ${user.surname}`.trim(),
      projectId: project?.id || "",
    });
  } else {
    if (existing.role !== role && !isInitialSetup && !requirePermission(hasPermission("changeRoles"), "You do not have permission to change roles.")) return;
    existing.name = name;
    existing.surname = surname;
    existing.tel = tel;
    existing.email = email;
    existing.qualification = qualification;
    existing.workmode = workmode;
    existing.role = role;
    notifyUser(existing.id, {
      title: "Profile updated",
      body: "Your member profile or user type was changed.",
    });
    logAudit("Member Updated", {
      objectType: "member",
      objectName: `${existing.name} ${existing.surname}`.trim(),
      projectId: project?.id || "",
    });
  }
  // New members should not be auto-assigned to the currently selected project.
  if (!state.currentUserId) {
    state.currentUserId = user.id;
  }
  isMemberFormExpanded = false;
  editingMemberId = null;
  expandedMemberId = user.id;
  resetMemberForm();
  persist();
  render();
}

function onMemberFormInvalid(event) {
  const field = event.target;
  if (!field || typeof field.scrollIntoView !== "function") return;
  event.preventDefault();
  field.scrollIntoView({ behavior: "smooth", block: "center" });
  try {
    field.focus({ preventScroll: true });
  } catch (error) {
    field.focus();
  }
  if (formValidationMessageLocked) return;
  formValidationMessageLocked = true;
  setTimeout(() => {
    formValidationMessageLocked = false;
  }, 0);
  const rawLabel = field.getAttribute?.("placeholder")
    || field.getAttribute?.("aria-label")
    || field.id?.replace(/^member-/, "").replace(/-/g, " ")
    || "all required fields";
  const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
  showAppMessage(`${label} is required before the member can be added.`, "warning", "Member");
}

// Removed: onAssignExistingUser

function onFolderAdd(event) {
  event.preventDefault();
  const project = getCurrentProject();
  if (!project) return;
  if (!requireDraftProjectUnlocked(project)) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can create Service Teams.")) return;
  const availableMembers = buildAvailableServiceTeamMembers(project);
  if (!availableMembers.length) {
    showAppMessage("Add at least one active member before creating a Service Team.", "warning", "Service Team");
    return;
  }
  openServiceTeamDialog();
}

function onAddFolderFromTabBar() {
  onFolderAdd({ preventDefault() {} });
}

function renderServiceTeamDialogSummary() {
  if (!els.serviceTeamCompactSummary) return;
  const rawName = els.serviceTeamName?.value || "";
  const trimmedName = rawName.trim();
  const name = trimmedName || (editingServiceTeamId ? "Unnamed team" : "New team");
  els.serviceTeamCompactSummary.textContent = name;
}

function setServiceTeamDialogInfoExpanded(expanded) {
  const next = Boolean(expanded);
  serviceTeamDialogInfoExpanded = next;
  els.serviceTeamForm?.classList.toggle("service-team-info-collapsed", !next);
  if (els.serviceTeamInfoToggle) {
    els.serviceTeamInfoToggle.classList.toggle("expanded", next);
    els.serviceTeamInfoToggle.setAttribute("aria-expanded", String(next));
    els.serviceTeamInfoToggle.setAttribute("aria-label", next ? "Collapse service team info" : "Expand service team info");
  }
}

function toggleServiceTeamDialogInfo() {
  setServiceTeamDialogInfoExpanded(!serviceTeamDialogInfoExpanded);
}

function onServiceTeamDialogAddAsset(kind) {
  const project = getCurrentProject();
  if (!project) return;
  if (!editingServiceTeamId) {
    showAppMessage("Save the Service Team first to add notes, files, or photos.", "info", "Service Team");
    return;
  }
  if (kind === "note") {
    onAddTeamNote(editingServiceTeamId);
    return;
  }
  if (kind === "file" || kind === "photo") {
    onAddTeamAsset(editingServiceTeamId, kind);
  }
}

function syncServiceTeamDialogAssetTheme(color) {
  const normalized = normalizeHexColor(color || els.serviceTeamColor?.value || "#0d7a73");
  const theme = buildTabTheme(normalized);
  const grids = [els.serviceTeamNotesGrid, els.serviceTeamFilesGrid, els.serviceTeamPhotosGrid].filter(Boolean);
  for (const grid of grids) {
    grid.style.setProperty("--card-soft", theme.soft);
    grid.style.setProperty("--card-border", theme.border);
    grid.style.setProperty("--card-shadow", theme.shadow);
  }
  els.serviceTeamForm?.style.setProperty("--service-team-color", normalized);
}

function renderServiceTeamDialogAssets() {
  if (!els.serviceTeamDialog?.open) return;
  const project = getCurrentProject();
  if (!project) return;

  const folder = editingServiceTeamId
    ? project.folders.find((entry) => entry.id === editingServiceTeamId && !entry.archivedAt)
    : null;
  const canAttach = Boolean(folder);

  if (els.serviceTeamAssetsSaveHint) els.serviceTeamAssetsSaveHint.classList.toggle("hidden", canAttach);
  if (els.serviceTeamAddNoteBtn) els.serviceTeamAddNoteBtn.disabled = !canAttach;
  if (els.serviceTeamAddFileBtn) els.serviceTeamAddFileBtn.disabled = !canAttach;
  if (els.serviceTeamAddPhotoBtn) els.serviceTeamAddPhotoBtn.disabled = !canAttach;

  if (!canAttach) {
    for (const empty of [els.serviceTeamNotesEmpty, els.serviceTeamFilesEmpty, els.serviceTeamPhotosEmpty].filter(Boolean)) {
      empty.classList.add("hidden");
    }
    for (const grid of [els.serviceTeamNotesGrid, els.serviceTeamFilesGrid, els.serviceTeamPhotosGrid].filter(Boolean)) {
      grid.innerHTML = "";
    }
    return;
  }

  syncServiceTeamDialogAssetTheme(els.serviceTeamColor?.value || folder.tabColor || "#0d7a73");

  const items = Array.isArray(folder.items) ? folder.items : [];
  const galleryEntries = buildGalleryEntriesFromItems(items, { locationLabel: folder.name || "Service Team" });
  const renderType = (type, emptyEl, gridEl) => {
    if (!gridEl || !emptyEl) return;
    const typed = items.filter((item) => item?.type === type && !item.archivedAt);
    gridEl.innerHTML = "";
    if (!typed.length) {
      emptyEl.classList.remove("hidden");
      return;
    }
    emptyEl.classList.add("hidden");
    for (const item of typed) {
      const card = els.itemCardTemplate?.content?.firstElementChild?.cloneNode(true);
      if (!(card instanceof HTMLElement)) continue;
      card.dataset.itemId = item.id;
      card.append(renderItem(item, { galleryEntries }));
      gridEl.append(card);
    }
  };

  renderType("note", els.serviceTeamNotesEmpty, els.serviceTeamNotesGrid);
  renderType("file", els.serviceTeamFilesEmpty, els.serviceTeamFilesGrid);
  renderType("photo", els.serviceTeamPhotosEmpty, els.serviceTeamPhotosGrid);
}

function renderServiceTeamDialogState() {
  if (!els.serviceTeamDialog?.open) return;
  setServiceTeamDialogInfoExpanded(serviceTeamDialogInfoExpanded);
  renderServiceTeamDialogSummary();
  renderServiceTeamDialogAssets();
}

function openServiceTeamDialog(teamId = null) {
  const project = getCurrentProject();
  if (!project) return;
  editingServiceTeamId = teamId;
  const team = project.folders.find((entry) => entry.id === teamId);
  els.serviceTeamName.value = team?.name || "";
  setServiceTeamColor(team?.tabColor || pickNextFolderColor(project));
  serviceTeamSelectedMemberIds = new Set(team?.memberIds || []);
  serviceTeamSelectedAreaIds = new Set(team ? getAreasForTeam(project, team.id).map((area) => area.id) : []);
  serviceTeamExperienceFilter = "all";
  serviceTeamPositionFilter = "all";
  if (els.serviceTeamExperienceFilter) els.serviceTeamExperienceFilter.value = "all";
  if (els.serviceTeamPositionFilter) els.serviceTeamPositionFilter.value = "all";
  renderServiceTeamMemberOptions(project);
  renderServiceTeamAreaOptions(project);
  serviceTeamDialogInfoExpanded = true;
  setServiceTeamDialogInfoExpanded(serviceTeamDialogInfoExpanded);
  els.serviceTeamDialog?.showModal();
  renderServiceTeamDialogState();
  rememberFormSnapshot("serviceTeam", els.serviceTeamForm);
}

function closeServiceTeamDialog(forceClose = false) {
  if (!forceClose && !confirmDiscardUnsavedChanges(["serviceTeam"])) return;
  editingServiceTeamId = null;
  serviceTeamSelectedMemberIds = new Set();
  serviceTeamSelectedAreaIds = new Set();
  serviceTeamExperienceFilter = "all";
  serviceTeamPositionFilter = "all";
  els.serviceTeamForm?.reset();
  setServiceTeamColor(SERVICE_TEAM_COLOR_PRESETS[0]?.color || "#0d7a73");
  els.serviceTeamMemberLinks.innerHTML = "";
  if (els.serviceTeamAreaLinks) els.serviceTeamAreaLinks.innerHTML = "";
  if (els.serviceTeamExperienceFilter) els.serviceTeamExperienceFilter.value = "all";
  if (els.serviceTeamPositionFilter) els.serviceTeamPositionFilter.value = "all";
  serviceTeamDialogInfoExpanded = true;
  setServiceTeamDialogInfoExpanded(serviceTeamDialogInfoExpanded);
  rememberFormSnapshot("serviceTeam", els.serviceTeamForm);
  if (els.serviceTeamDialog?.open) els.serviceTeamDialog.close();
}

function onServiceTeamSave(event) {
  event.preventDefault();
  const project = getCurrentProject();
  if (!project) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can save Service Teams.")) return;
  const name = els.serviceTeamName.value.trim();
  const color = normalizeHexColor(els.serviceTeamColor?.value || pickNextFolderColor(project));
  const memberIds = [...serviceTeamSelectedMemberIds];
  const areaIds = [...serviceTeamSelectedAreaIds];
  if (!name || !memberIds.length) {
    showAppMessage("Please choose a Service Team name and at least one team member.", "warning", "Service Team");
    return;
  }
  let savedTeamId = editingServiceTeamId;
  if (editingServiceTeamId) {
    const existing = project.folders.find((entry) => entry.id === editingServiceTeamId);
    if (!existing) return;
    existing.name = name;
    existing.tabColor = color;
    existing.memberIds = memberIds;
    logAudit("Service Team Updated", { objectType: "service-team", objectName: name, projectId: project.id });
  } else {
    const folder = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      items: [],
      tabColor: color,
      memberIds,
      archivedAt: null,
      archivedByUserId: null,
    };
    savedTeamId = folder.id;
    project.folders.unshift(folder);
    if (project.selectedTeamFiltersInitialized) {
      project.selectedTeamFilterIds = [...new Set([...(project.selectedTeamFilterIds || []), folder.id])];
    }
    project.selectedTeamInfoId = folder.id;
    project.selectedFolderId = null;
    currentWorkspaceTab = "folders-hub";
    logAudit("Service Team Created", { objectType: "service-team", objectName: name, projectId: project.id });
  }
  for (const memberId of memberIds) {
    if (!project.memberIds.includes(memberId)) project.memberIds.push(memberId);
  }
  syncServiceTeamAreaAssignments(project, savedTeamId, areaIds);
  closeServiceTeamDialog(true);
  persist();
  render();
}

function getProjectAreaQuickFilter(project) {
  if (!project) return normalizeAreaQuickFilter(null);
  return normalizeAreaQuickFilter(project.areaQuickFilter);
}

function setProjectAreaQuickFilter(project, nextFilter) {
  if (!project) return;
  project.areaQuickFilter = normalizeAreaQuickFilter(nextFilter);
}

function isAreaQuickFilterActive(filter) {
  return Boolean(filter?.floor || filter?.query);
}

function areaMatchesQuickFilter(area, filter) {
  if (!filter) return true;
  const areaFloor = normalizeFloorName(area?.floor);
  if (filter.floor === "__none__") {
    if (areaFloor) return false;
  } else if (filter.floor) {
    if (areaFloor.toLowerCase() !== filter.floor.toLowerCase()) return false;
  }
  const query = String(filter.query || "").trim().toLowerCase();
  if (!query) return true;
  const haystack = `${String(area?.name || "")} ${areaFloor}`.toLowerCase();
  return haystack.includes(query);
}

function populateAreaFloorOptions(project, selectedFloor = "") {
  if (!els.areaFloor) return;
  const floors = normalizeFloorList(project?.floors);
  const normalizedSelected = normalizeFloorName(selectedFloor);
  els.areaFloor.innerHTML = ['<option value="">(No floor)</option>']
    .concat(floors.map((floor) => `<option value="${escapeHtml(floor)}">${escapeHtml(floor)}</option>`))
    .join("");
  const match = floors.find((floor) => floor.toLowerCase() === normalizedSelected.toLowerCase());
  els.areaFloor.value = match || "";
}

function onAreaFloorAdd() {
  const project = getCurrentProject();
  if (!project) return;
  const name = normalizeFloorName(window.prompt("New floor name", "") || "");
  if (!name) return;
  project.floors = normalizeFloorList([...(project.floors || []), name]);
  populateAreaFloorOptions(project, name);
  rememberFormSnapshot("area", els.areaForm);
}

function populateAreaFilterFloorOptions(project) {
  if (!els.areaFilterFloor) return;
  const floors = normalizeFloorList(project?.floors);
  els.areaFilterFloor.innerHTML = ['<option value="">All floors</option>', '<option value="__none__">(No floor)</option>']
    .concat(floors.map((floor) => `<option value="${escapeHtml(floor)}">${escapeHtml(floor)}</option>`))
    .join("");
}

function openAreaFilterDialog() {
  const project = getCurrentProject();
  if (!project || !els.areaFilterDialog) return;
  populateAreaFilterFloorOptions(project);
  const filter = getProjectAreaQuickFilter(project);
  if (els.areaFilterFloor) els.areaFilterFloor.value = filter.floor || "";
  if (els.areaFilterQuery) els.areaFilterQuery.value = filter.query || "";
  els.areaFilterDialog.showModal();
}

function closeAreaFilterDialog() {
  if (!els.areaFilterDialog?.open) return;
  els.areaFilterDialog.close();
}

function applyAreaFilterFromUi() {
  const project = getCurrentProject();
  if (!project) return;
  const nextFilter = normalizeAreaQuickFilter({
    floor: String(els.areaFilterFloor?.value || "").trim(),
    query: String(els.areaFilterQuery?.value || "").trim(),
  });
  setProjectAreaQuickFilter(project, nextFilter);
  renderWorkspace();
  closeAreaFilterDialog();
}

function clearAreaFilterAndClose() {
  const project = getCurrentProject();
  if (!project) return;
  setProjectAreaQuickFilter(project, { floor: "", query: "" });
  renderWorkspace();
  closeAreaFilterDialog();
}

function openAreaDialog(areaId = null) {
  const project = getCurrentProject();
  if (!project) return;
  editingAreaId = areaId;
  const area = project.areas.find((entry) => entry.id === areaId);
  els.areaName.value = area?.name || "";
  populateAreaFloorOptions(project, area?.floor || "");
  setAreaIcon(area?.iconKey || "none");
  els.areaDialog?.showModal();
  rememberFormSnapshot("area", els.areaForm);
}

function closeAreaDialog(forceClose = false) {
  if (!forceClose && !confirmDiscardUnsavedChanges(["area"])) return;
  editingAreaId = null;
  els.areaForm?.reset();
  setAreaIcon("none");
  if (els.areaFloor) els.areaFloor.innerHTML = "";
  rememberFormSnapshot("area", els.areaForm);
  if (els.areaDialog?.open) els.areaDialog.close();
}

function onAreaSave(event) {
  event.preventDefault();
  const project = getCurrentProject();
  if (!project) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can save Areas.")) return;
  const name = els.areaName.value.trim();
  const iconKey = normalizeAreaIconKey(els.areaIcon?.value || "none");
  const floor = normalizeFloorName(els.areaFloor?.value || "");
  if (!name) {
    showAppMessage("Please add an Area name.", "warning", "Area");
    return;
  }
  if (floor && !normalizeFloorList(project.floors).some((entry) => entry.toLowerCase() === floor.toLowerCase())) {
    project.floors = normalizeFloorList([...(project.floors || []), floor]);
  }
  if (editingAreaId) {
    const existing = project.areas.find((entry) => entry.id === editingAreaId);
    if (!existing) return;
    existing.name = name;
    existing.iconKey = iconKey;
    existing.floor = floor;
    selectedProjectAreaId = existing.id;
    logAudit("Area Updated", { objectType: "area", objectName: name, projectId: project.id });
  } else {
    const newArea = {
      id: crypto.randomUUID(),
      name,
      iconKey,
      floor,
      createdAt: new Date().toISOString(),
      items: [],
      teamIds: [],
      completedAt: null,
      completedByUserId: null,
      archivedAt: null,
      archivedByUserId: null,
    };
    project.areas.unshift(newArea);
    selectedProjectAreaId = newArea.id;
    logAudit("Area Created", { objectType: "area", objectName: name, projectId: project.id });
  }
  currentWorkspaceTab = "folders-hub";
  currentProjectDetailsTab = "areas";
  closeAreaDialog(true);
  persist();
  render();
}

function onAreaAdd() {
  const project = getCurrentProject();
  if (!project) return;
  if (!requireDraftProjectUnlocked(project)) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can create Areas.")) return;
  openAreaDialog();
}

function connectServiceTeamToArea(teamId, areaId) {
  const project = getCurrentProject();
  const area = project?.areas?.find((entry) => entry.id === areaId);
  if (!project || !area) return;
  if (!requireDraftProjectUnlocked(project)) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can connect Service Teams to Areas.")) return;
  if (!area.teamIds.includes(teamId)) area.teamIds.push(teamId);
  logAudit("Service Team Linked To Area", {
    objectType: "area-link",
    objectName: area.name,
    projectId: project.id,
  });
  persist();
  render();
}

function disconnectServiceTeamFromArea(teamId, areaId) {
  const project = getCurrentProject();
  const area = project?.areas?.find((entry) => entry.id === areaId);
  const team = project?.folders?.find((folder) => folder.id === teamId);
  if (!project || !area || !team) return;
  if (!requireDraftProjectUnlocked(project)) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can disconnect Service Teams from Areas.")) return;
  if (!window.confirm("Are you sure?")) return;
  area.teamIds = (area.teamIds || []).filter((id) => id !== teamId);
  logAudit("Service Team Disconnected From Area", {
    objectType: "area-link",
    objectName: area.name,
    projectId: project.id,
  });
  persist();
  render();
}

function syncServiceTeamAreaAssignments(project, teamId, selectedAreaIds = []) {
  if (!project || !teamId) return;
  const selected = new Set(selectedAreaIds);
  for (const area of project.areas || []) {
    if (!Array.isArray(area.teamIds)) area.teamIds = [];
    const isSelected = selected.has(area.id);
    const isLinked = area.teamIds.includes(teamId);
    if (isSelected && !isLinked) area.teamIds.push(teamId);
    if (!isSelected && isLinked) area.teamIds = area.teamIds.filter((id) => id !== teamId);
  }
}

function linkServiceTeamToItem(teamId, itemId) {
  const project = getCurrentProject();
  const team = project?.folders?.find((folder) => folder.id === teamId && !folder.archivedAt);
  const location = findItemLocation(itemId);
  if (!project || !team || !location) return;
  if (!requireDraftProjectUnlocked(project)) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can connect Service Teams to items.")) return;
  location.item.linkedFolderIds = Array.isArray(location.item.linkedFolderIds) ? location.item.linkedFolderIds : [];
  if (location.item.linkedFolderIds.includes(teamId)) return;
  location.item.linkedFolderIds.push(teamId);
  if (Array.isArray(location.parent?.teamIds) && !location.parent.teamIds.includes(teamId)) {
    location.parent.teamIds.push(teamId);
  }
  logAudit("Service Team Linked To Item", {
    objectType: location.item.type,
    objectName: location.item.title || "Untitled item",
    projectId: project.id,
  });
  persist();
  render();
}

function disconnectServiceTeamFromItem(teamId, itemId) {
  const project = getCurrentProject();
  const team = project?.folders?.find((folder) => folder.id === teamId && !folder.archivedAt);
  const location = findItemLocation(itemId);
  if (!project || !team || !location) return;
  if (!requireDraftProjectUnlocked(project)) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can disconnect Service Teams from items.")) return;
  if (!window.confirm("Are you sure?")) return;
  location.item.linkedFolderIds = (location.item.linkedFolderIds || []).filter((id) => id !== teamId);
  logAudit("Service Team Disconnected From Item", {
    objectType: location.item.type,
    objectName: location.item.title || "Untitled item",
    projectId: project.id,
  });
  persist();
  render();
}

function disconnectPhotoFromItem(photoId, itemId) {
  const project = getCurrentProject();
  const photo = collectProjectPhotos(project).find((entry) => entry.id === photoId);
  const location = findItemLocation(itemId);
  if (!project || !photo || !location) return;
  if (!requireDraftProjectUnlocked(project)) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can disconnect pictures from items.")) return;
  if (!window.confirm("Are you sure?")) return;
  location.item.linkedPhotoIds = (location.item.linkedPhotoIds || []).filter((id) => id !== photoId);
  logAudit("Picture Disconnected From Item", {
    objectType: location.item.type,
    objectName: location.item.title || "Untitled item",
    projectId: project.id,
  });
  persist();
  render();
}

function attachServiceTeamDropTarget(element, project, onDrop) {
  if (!element || !project || !canManageProject(project)) return;
  element.classList.add("team-drop-target");
  element.addEventListener("dragover", (event) => {
    event.preventDefault();
    element.classList.add("drag-over");
  });
  element.addEventListener("dragleave", () => element.classList.remove("drag-over"));
  element.addEventListener("drop", (event) => {
    event.preventDefault();
    element.classList.remove("drag-over");
    const teamId = event.dataTransfer?.getData("text/service-team-id");
    if (teamId) onDrop(teamId);
  });
}

function getDroppedAssetType(file) {
  return String(file?.type || "").toLowerCase().startsWith("image/") ? "photo" : "file";
}

function dragEventHasFiles(event) {
  const transfer = event?.dataTransfer;
  if (!transfer) return false;
  if (transfer.files?.length) return true;
  if (Array.from(transfer.types || []).includes("Files")) return true;
  return Array.from(transfer.items || []).some((item) => item.kind === "file");
}

function canUploadToTarget(target, kind, project = getCurrentProject()) {
  if (!project || !target) return false;
  if (kind === "folder") return canAccessTeamFolder(target, project) && canWorkInProject(project);
  return canWorkInProject(project);
}

async function appendDroppedAssets(target, kind, files) {
  const project = getCurrentProject();
  if (!project || !target || !files.length) return;
  if (!requireDraftProjectUnlocked(project)) return;
  if (!requirePermission(canUploadToTarget(target, kind, project), "You do not have access to upload files or pictures here.")) return;
  const dateStamp = formatDateStamp(new Date());
  const counters = new Map();
  const prepared = [];
  for (const file of files) {
    const type = getDroppedAssetType(file);
    const baseName = getDefaultAssetBaseName(file, type);
    const counterKey = `${type}:${baseName}`;
    const index = counters.get(counterKey) || 0;
    counters.set(counterKey, index + 1);
    prepared.push(await toStoredAsset(file, type, baseName, index, dateStamp));
  }
  for (const asset of prepared.reverse()) target.items.unshift(asset);
  for (const asset of prepared) {
    logAudit(asset.type === "photo" ? "Photo Uploaded" : "File Uploaded", {
      objectType: asset.type,
      objectName: asset.title,
      projectId: project.id,
    });
  }
  persist();
  render();
}

function attachAssetDropTarget(element, resolveTarget, options = {}) {
  if (!element) return;
  const kind = options.kind || "plan";
  const label = options.label || "Drop files or pics here";
  const previousCleanup = element._assetDropCleanup;
  if (typeof previousCleanup === "function") previousCleanup();
  element.classList.add("asset-drop-target");
  element.dataset.dropLabel = label;

  const eventOptions = { capture: true };
  const onDragOver = (event) => {
    if (!dragEventHasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    element.classList.add("drag-files-over");
  };
  const onDragLeave = (event) => {
    if (event?.relatedTarget && element.contains(event.relatedTarget)) return;
    element.classList.remove("drag-files-over");
  };
  const onDrop = async (event) => {
    const files = Array.from(event.dataTransfer?.files || []);
    if (!files.length) return;
    event.preventDefault();
    event.stopPropagation();
    element.classList.remove("drag-files-over");
    const target = typeof resolveTarget === "function" ? resolveTarget() : resolveTarget;
    await appendDroppedAssets(target, kind, files);
  };

  element.addEventListener("dragenter", onDragOver, eventOptions);
  element.addEventListener("dragover", onDragOver, eventOptions);
  element.addEventListener("dragleave", onDragLeave, eventOptions);
  element.addEventListener("drop", onDrop, eventOptions);
  element._assetDropCleanup = () => {
    element.removeEventListener("dragenter", onDragOver, eventOptions);
    element.removeEventListener("dragover", onDragOver, eventOptions);
    element.removeEventListener("dragleave", onDragLeave, eventOptions);
    element.removeEventListener("drop", onDrop, eventOptions);
    element.classList.remove("drag-files-over");
  };
}

function getAreasForTeam(project, teamId) {
  return (project?.areas || []).filter((area) => (area.teamIds || []).includes(teamId));
}

function getSelectedProjectTeamInfoId(project = getCurrentProject()) {
  if (!project) return "";
  const activeTeamIds = new Set(getAllActiveProjectTeams(project).map((team) => team.id));
  const folder = getSelectedFolder();
  if (currentWorkspaceTab.startsWith("folder:") && folder && activeTeamIds.has(folder.id)) {
    project.selectedTeamInfoId = folder.id;
    return folder.id;
  }
  if (project.selectedTeamInfoId && activeTeamIds.has(project.selectedTeamInfoId)) {
    return project.selectedTeamInfoId;
  }
  const firstActiveTeamId = getAllActiveProjectTeams(project)[0]?.id || "";
  if (firstActiveTeamId) {
    project.selectedTeamInfoId = firstActiveTeamId;
    return firstActiveTeamId;
  }
  return "";
}

function selectProjectTeamInfo(teamId) {
  const project = getCurrentProject();
  if (!project) return;
  project.selectedTeamInfoId = teamId;
  if (currentView === "projects") {
    currentWorkspaceTab = "folders-hub";
    if (!["plan", "areas", "tasks", "teams", "chat"].includes(currentProjectDetailsTab)) {
      currentProjectDetailsTab = "plan";
    }
  }
  persist();
  renderWorkspace();
}

function toggleProjectTeamInfoExpanded() {
  const project = getCurrentProject();
  if (!project) return;
  project.teamInfoExpanded = !project.teamInfoExpanded;
  persist();
  renderWorkspace();
}

function itemRelatesToTeam(item, teamId, project = getCurrentProject(), contextTeamId = "") {
  if (!project || !teamId) return false;
  if (contextTeamId && contextTeamId === teamId) return true;
  if ((item.linkedFolderIds || []).includes(teamId)) return true;
  if (item.assigneeId === teamId) return true;
  return getTeamIdsForUser(project, item.createdByUserId).includes(teamId);
}

function collectItemsForTeam(project, teamId) {
  if (!project || !teamId) return [];
  const containers = [
    { id: getProjectDetailsFolder(project)?.id, items: getProjectDetailsFolder(project)?.items || [] },
    ...(project.folders || []).filter((folder) => !folder.archivedAt).map((folder) => ({ id: folder.id, items: folder.items || [] })),
    ...(project.areas || []).filter((area) => !area.archivedAt).map((area) => ({ id: "", items: area.items || [] })),
  ];
  return containers.flatMap((container) => (container.items || [])
    .filter((item) => !item.archivedAt && itemRelatesToTeam(item, teamId, project, container.id))
    .map((item) => ({ ...item })));
}

function onAddAreaAsset(areaId, type) {
  const project = getCurrentProject();
  const area = project?.areas?.find((entry) => entry.id === areaId);
  if (!area) return;
  if (!requireDraftProjectUnlocked(project)) return;
  if (!requirePermission(canWorkInProject(project), "You do not have access to add files or photos in this project.")) return;
  pendingAssetTarget = { kind: "area", id: area.id };
  if (type === "file") {
    onAddFileClick();
    return;
  }
  onAddPhotoClick();
}

function onAddAreaComment(areaId) {
  const project = getCurrentProject();
  const area = project?.areas?.find((entry) => entry.id === areaId && !entry.archivedAt) || null;
  if (!area) return;
  if (!requireDraftProjectUnlocked(project)) return;
  if (!requirePermission(canWorkInProject(project), "You do not have access to add comments in this area.")) return;
  pendingAssetTarget = { kind: "area", id: area.id };
  openNoteDialog();
}

function onAddTeamAsset(folderId, type) {
  const project = getCurrentProject();
  const folder = project?.folders?.find((entry) => entry.id === folderId && !entry.archivedAt) || null;
  if (!folder) return;
  if (!requireDraftProjectUnlocked(project)) return;
  if (!requirePermission(canAccessTeamFolder(folder, project) && canWorkInProject(project), "You do not have access to add files or photos in this service team.")) return;
  pendingAssetTarget = { kind: "folder", id: folder.id };
  if (type === "file") {
    onAddFileClick();
    return;
  }
  onAddPhotoClick();
}

function onAddTeamNote(folderId) {
  const project = getCurrentProject();
  const folder = project?.folders?.find((entry) => entry.id === folderId && !entry.archivedAt) || null;
  if (!folder) return;
  if (!requireDraftProjectUnlocked(project)) return;
  if (!requirePermission(canAccessTeamFolder(folder, project) && canWorkInProject(project), "You do not have access to add notes in this service team.")) return;
  pendingAssetTarget = { kind: "folder", id: folder.id };
  openNoteDialog();
}

function onAddAreaTask(areaId) {
  const project = getCurrentProject();
  const area = project?.areas?.find((entry) => entry.id === areaId);
  if (!area) return;
  if (!requireDraftProjectUnlocked(project)) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can create tasks for areas.")) return;
  pendingAreaTaskId = area.id;
  pendingProjectTaskMode = false;
  populateMemberOptions();
  populateTaskLinks();
  resetSpeechAssist();
  els.taskDate.value = todayInputValue();
  els.taskStatus.value = "Open";
  els.taskDialog.showModal();
}

function getAssetTarget() {
  if (pendingAssetTarget) return resolveAssetTarget();
  const folder = getSelectedFolder();
  if (!folder) return null;
  return folder;
}

function isInfoPlansTarget(target, project = getCurrentProject()) {
  if (!target || !project) return false;
  const detailsFolder = getProjectDetailsFolder(project);
  return Boolean(detailsFolder && target.id === detailsFolder.id);
}

function resolveAssetTarget() {
  const project = getCurrentProject();
  if (!pendingAssetTarget) return getSelectedFolder();
  if (pendingAssetTarget.kind === "area") {
    return project?.areas?.find((area) => area.id === pendingAssetTarget.id) || null;
  }
  if (pendingAssetTarget.kind === "folder") {
    return getAllProjectFolders(project).find((folder) => folder.id === pendingAssetTarget.id) || null;
  }
  return null;
}

function getNoteTarget() {
  return pendingAssetTarget ? resolveAssetTarget() : getSelectedFolder();
}

function renderNoteImagePreview() {
  if (!els.noteImagePreview) return;
  if (!pendingNoteImageDataUrl) {
    els.noteImagePreview.innerHTML = "";
    els.noteImagePreview.classList.add("hidden");
    return;
  }
  els.noteImagePreview.innerHTML = `
    <div class="note-image-preview-card">
      <img src="${pendingNoteImageDataUrl}" alt="${escapeHtml(pendingNoteImageName || "Comment picture")}">
      <div class="muted">${escapeHtml(pendingNoteImageName || "Comment picture")}</div>
    </div>
  `;
  els.noteImagePreview.classList.remove("hidden");
}

async function onNoteImageChange() {
  const file = els.noteImage?.files?.[0];
  if (!file) {
    pendingNoteImageDataUrl = "";
    pendingNoteImageName = "";
    renderNoteImagePreview();
    return;
  }
  pendingNoteImageDataUrl = await readAsDataUrl(file);
  pendingNoteImageName = file.name || "Comment picture";
  renderNoteImagePreview();
}

function openNoteDialog(noteId = null) {
  const target = noteId ? (resolveAssetTarget() || getSelectedFolder()) : getNoteTarget();
  if (!target) return;
  if (!requireDraftProjectUnlocked()) return;
  if (isInfoPlansTarget(target) && !requirePermission(canManageProject(), "Only admins or assigned project managers can edit Plans.")) return;
  if (!requirePermission(canWorkInProject(), "You do not have access to add notes here.")) return;
  const isPlans = isInfoPlansTarget(target);
  editingNoteId = noteId;
  const note = noteId ? findItemLocation(noteId)?.item : null;
  els.noteForm?.reset();
  if (els.noteFormTitle) els.noteFormTitle.textContent = note ? "Edit note" : "Create note";
  if (els.noteSaveBtn) els.noteSaveBtn.textContent = note ? "Save changes" : "Save note";
  if (els.noteTitle) els.noteTitle.value = note?.title || "";
  if (els.noteMasterPlanVisible) {
    els.noteMasterPlanVisible.checked = Boolean(note?.showOnMasterPlan);
    const row = els.noteMasterPlanVisible.closest("label");
    row?.classList.toggle("hidden", isPlans);
    els.noteMasterPlanVisible.disabled = isPlans;
    if (isPlans) els.noteMasterPlanVisible.checked = false;
  }
  const noteStyle = note?.noteStyle || (Array.isArray(note?.checklist) ? "checklist" : "text");
  setNoteStyle(noteStyle);
  if (els.noteContent) {
    if (noteStyle === "checklist") {
      const list = Array.isArray(note?.checklist) ? note.checklist : parseChecklistText(note?.content || "");
      els.noteContent.value = checklistToText(list);
    } else {
      els.noteContent.value = note?.content || "";
    }
  }
  pendingNoteImageDataUrl = note?.imageUrl || "";
  pendingNoteImageName = note?.imageName || "";
  if (els.noteImage) els.noteImage.value = "";
  renderNoteImagePreview();
  els.noteDialog.showModal();
  rememberFormSnapshot("note", els.noteForm);
}

function switchContentTab(tabName) {
  if (!requireDraftProjectUnlocked()) return;
  if (currentWorkspaceTab === "folders-hub") {
    const projectDetailsTabMap = {
      note: "plan",
      file: "areas",
      task: "tasks",
      photo: "teams",
      chat: "chat",
      plan: "plan",
      areas: "areas",
      tasks: "tasks",
      teams: "teams",
      chat: "chat",
    };
    currentProjectDetailsTab = projectDetailsTabMap[tabName] || "plan";
  } else {
    const folderTabMap = {
      note: "note",
      file: "file",
      task: "note",
      photo: "photo",
      plan: "note",
      areas: "file",
      tasks: "note",
      teams: "photo",
    };
    currentContentTab = folderTabMap[tabName] || "note";
  }
  renderWorkspace();
}

function onContentAdd() {
  if (!requireDraftProjectUnlocked()) return;
  if (currentContentTab === "note") {
    openNoteDialog();
    return;
  }
  if (currentContentTab === "file") {
    onAddFileClick();
    return;
  }
  if (currentContentTab === "photo") {
    onAddPhotoClick();
    return;
  }
  onCreateTaskClick();
}

function onAddFileClick() {
  const target = getAssetTarget();
  if (!target) return;
  if (!requireDraftProjectUnlocked()) return;
  if (isInfoPlansTarget(target) && !requirePermission(canManageProject(), "Only admins or assigned project managers can edit Plans.")) return;
  if (!requirePermission(canWorkInProject(), "You do not have access to upload files here.")) return;
  const baseName = window.prompt("Give the file group a name first. Leave empty to use the default name.");
  if (baseName === null) {
    pendingAssetTarget = null;
    return;
  }
  if (!pendingAssetTarget) pendingAssetTarget = { kind: "folder", id: target.id };
  els.fileInput.dataset.baseName = baseName.trim();
  els.fileInput.value = "";
  els.fileInput.click();
}

async function onAddPhotoClick() {
  const target = getAssetTarget();
  if (!target) return;
  if (!requireDraftProjectUnlocked()) return;
  if (isInfoPlansTarget(target) && !requirePermission(canManageProject(), "Only admins or assigned project managers can edit Plans.")) return;
  if (!requirePermission(canWorkInProject(), "You do not have access to add photos here.")) return;
  if (!pendingAssetTarget) pendingAssetTarget = { kind: "folder", id: target.id };
  const choice = await openPlansAddDialog({ title: "Add Picture", body: "Choose action." });
  if (choice === "photo") {
    // For area uploads, we already know the target area: skip the extra options dialog.
    if (pendingAssetTarget?.kind === "area" && pendingAssetTarget.id && els.photoInput) {
      els.photoInput.dataset.baseName = "";
      els.photoInput.dataset.areaIds = JSON.stringify([pendingAssetTarget.id]);
      els.photoInput.value = "";
      els.photoInput.click();
      return;
    }
    return openPhotoUploadOptionsDialog();
  }
  if (choice === "camera") return onTakePhotoClick();
  if (choice === "note") return openNoteDialog();
  if (choice === "file") return onAddFileClick();
  pendingAssetTarget = null;
}

async function onAddPlansItemClick() {
  const project = getCurrentProject();
  if (!project) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned project managers can edit Plans.")) return;
  const detailsFolder = getProjectDetailsFolder(project);
  if (detailsFolder) pendingAssetTarget = { kind: "folder", id: detailsFolder.id };
  const choice = await openPlansAddDialog({ title: "Plans", body: "Choose what you want to add." });
  if (choice === "note") {
    openNoteDialog();
    return;
  }
  if (choice === "file") {
    onAddFileClick();
    return;
  }
  if (choice === "photo") return openPhotoUploadOptionsDialog();
  if (choice === "camera") return onTakePhotoClick();
}

function openPlansAddDialog(options = {}) {
  if (!els.plansAddDialog) return Promise.resolve("");
  if (els.plansAddTitle) els.plansAddTitle.textContent = options.title || "Quick Add";
  if (els.plansAddBody) els.plansAddBody.textContent = options.body || "Choose what you want to add.";
  if (plansAddResolver) {
    const resolve = plansAddResolver;
    plansAddResolver = null;
    resolve("");
  }
  if (!els.plansAddDialog.open) els.plansAddDialog.showModal();
  return new Promise((resolve) => {
    plansAddResolver = resolve;
  });
}

function closePlansAddDialog(choice = "") {
  if (els.plansAddDialog?.open) els.plansAddDialog.close();
  if (plansAddResolver) {
    const resolve = plansAddResolver;
    plansAddResolver = null;
    resolve(choice);
  }
}

function setNoteStyle(nextStyle) {
  const style = nextStyle === "checklist" ? "checklist" : "text";
  noteStyleMode = style;
  if (els.noteStyleInput) els.noteStyleInput.value = style;
  if (els.noteStyleToggle) {
    for (const btn of els.noteStyleToggle.querySelectorAll("button[data-style]")) {
      const isActive = btn.dataset.style === style;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    }
  }
  if (els.noteContent) {
    els.noteContent.placeholder = style === "checklist"
      ? "One item per line. Use [ ] or [x] if you want."
      : "Write like OneNote...";
  }
}

function parseChecklistText(rawText) {
  return String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const lowered = line.toLowerCase();
      const isDone = lowered.startsWith("[x]") || lowered.startsWith("- [x]") || lowered.startsWith("* [x]");
      const cleaned = line
        .replace(/^\s*[-*]\s*/u, "")
        .replace(/^\s*\[(x| )\]\s*/iu, "")
        .trim();
      return { text: cleaned, done: isDone };
    })
    .filter((entry) => entry.text);
}

function checklistToText(checklist) {
  const list = Array.isArray(checklist) ? checklist : [];
  return list.map((entry) => `${entry.done ? "[x]" : "[ ]"} ${entry.text || ""}`.trim()).join("\n");
}

function renderPhotoUploadAreaOptions() {
  if (!els.photoUploadAreaLinks) return;
  const project = getCurrentProject();
  const areas = (project?.areas || []).filter((area) => !area.archivedAt);
  els.photoUploadAreaLinks.innerHTML = "";
  if (!areas.length) {
    els.photoUploadAreaLinks.innerHTML = `<p class="muted service-team-member-list-empty">No active areas available yet.</p>`;
    return;
  }
  for (const area of areas) {
    const label = createCheckRow(
      "photo-upload-area-link",
      area.id,
      area.name || "Unnamed area",
      "Connect uploaded photos with this project area."
    );
    const checkbox = label.querySelector("input");
    if (checkbox) {
      checkbox.checked = pendingPhotoUploadAreaIds.has(area.id);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          pendingPhotoUploadAreaIds = new Set([area.id]);
          for (const peer of els.photoUploadAreaLinks.querySelectorAll("input[type='checkbox']")) {
            if (peer !== checkbox) peer.checked = false;
          }
        } else {
          pendingPhotoUploadAreaIds.delete(area.id);
        }
      });
    }
    els.photoUploadAreaLinks.append(label);
  }
}

function openPhotoUploadOptionsDialog(mode = "photo") {
  if (!els.photoUploadOptionsDialog) return;
  pendingPhotoUploadMode = mode === "camera" ? "camera" : "photo";
  pendingPhotoUploadAreaIds = new Set();
  if (pendingAssetTarget?.kind === "area" && pendingAssetTarget.id) {
    pendingPhotoUploadAreaIds = new Set([pendingAssetTarget.id]);
  }
  if (els.photoUploadBaseName) els.photoUploadBaseName.value = "";
  renderPhotoUploadAreaOptions();
  els.photoUploadOptionsDialog.showModal();
  rememberFormSnapshot("photoUpload", els.photoUploadOptionsForm);
}

function closePhotoUploadOptionsDialog(forceClose = false) {
  if (!forceClose && !confirmDiscardUnsavedChanges(["photoUpload"])) return;
  pendingPhotoUploadAreaIds = new Set();
  pendingPhotoUploadMode = "photo";
  if (els.photoUploadOptionsForm) els.photoUploadOptionsForm.reset();
  if (els.photoUploadOptionsDialog?.open) els.photoUploadOptionsDialog.close();
}

function onPhotoUploadOptionsSubmit(event) {
  event.preventDefault();
  if (!els.photoInput) return;
  const baseName = (els.photoUploadBaseName?.value || "").trim();
  const selectedAreaId = [...pendingPhotoUploadAreaIds][0] || "";
  if (!baseName && !selectedAreaId) {
    showAppMessage("Please give a name or select one area before continuing.", "warning", "Photo Upload");
    return;
  }
  if (pendingPhotoUploadMode === "camera") {
    pendingCameraAreaIds = new Set(selectedAreaId ? [selectedAreaId] : []);
    closePhotoUploadOptionsDialog(true);
    openCameraDialog(baseName);
    return;
  }
  els.photoInput.dataset.baseName = baseName;
  els.photoInput.dataset.areaIds = JSON.stringify(selectedAreaId ? [selectedAreaId] : []);
  els.photoInput.value = "";
  closePhotoUploadOptionsDialog(true);
  els.photoInput.click();
}

function onCreateTaskClick() {
  const project = getCurrentProject();
  pendingAreaTaskId = null;
  pendingProjectTaskMode = currentWorkspaceTab === "folders-hub";
  if (!pendingProjectTaskMode && !getSelectedFolder()) return;
  if (!requireDraftProjectUnlocked(project)) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can create tasks.")) return;
  const availableAssignees = pendingProjectTaskMode
    ? (project?.folders || []).filter((folder) => !folder.archivedAt)
    : buildAssignableMembers(project);
  if (!availableAssignees.length) {
    showAppMessage(pendingProjectTaskMode
      ? "Add at least one Service Team before assigning a task."
      : "Add at least one team member or project manager before assigning a task.", "warning", "Task");
    return;
  }
  populateMemberOptions();
  populateTaskLinks();
  resetSpeechAssist();
  els.taskDate.value = todayInputValue();
  els.taskStatus.value = "Open";
  els.taskDialog.showModal();
  rememberFormSnapshot("task", els.taskForm);
}

async function onTakePhotoClick() {
  const target = getAssetTarget();
  if (!target) return;
  if (!requireDraftProjectUnlocked()) return;
  if (!requirePermission(canWorkInProject(), "You do not have access to use the project camera upload here.")) return;
  if (!pendingAssetTarget) pendingAssetTarget = { kind: "folder", id: target.id };
  openPhotoUploadOptionsDialog("camera");
}

async function openCameraDialog(baseName = "") {
  if (!els.cameraDialog) return;
  els.cameraPhotoName.value = baseName || "";
  els.cameraDialog.showModal();
  rememberFormSnapshot("camera", null);
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    els.cameraStream.srcObject = cameraStream;
  } catch (error) {
    closeCameraDialog(true);
    showAppMessage("Camera access was not available on this device/browser.", "warning", "Camera");
  }
}

async function onNoteSave(event) {
  event.preventDefault();
  const target = editingNoteId ? (resolveAssetTarget() || getSelectedFolder()) : getNoteTarget();
  if (!target) return;
  if (!requirePermission(canWorkInProject(), "You do not have access to save notes here.")) return;
  const title = els.noteTitle.value.trim();
  const rawContent = els.noteContent.value.trim();
  const style = els.noteStyleInput?.value || noteStyleMode || "text";
  const isPlans = isInfoPlansTarget(target);
  const showOnMasterPlan = isPlans ? false : Boolean(els.noteMasterPlanVisible?.checked);
  const checklist = style === "checklist" ? parseChecklistText(rawContent) : [];
  const content = style === "checklist"
    ? checklist.map((entry) => entry.text).join("\n")
    : rawContent;
  const selectedFile = els.noteImage?.files?.[0];
  if (selectedFile) {
    pendingNoteImageDataUrl = await readAsDataUrl(selectedFile);
    pendingNoteImageName = selectedFile.name || "Comment picture";
  }
  if (editingNoteId) {
    const existing = findItemLocation(editingNoteId)?.item;
    if (!existing) return;
    existing.title = title;
    existing.content = content;
    existing.showOnMasterPlan = showOnMasterPlan;
    existing.noteStyle = style;
    if (style === "checklist") existing.checklist = checklist;
    else delete existing.checklist;
    existing.imageUrl = pendingNoteImageDataUrl || "";
    existing.imageName = pendingNoteImageName || "";
    logAudit("Note Updated", {
      objectType: "note",
      objectName: existing.title || "Untitled note",
      projectId: getCurrentProject()?.id || "",
    });
    createMentionNotifications(getCurrentProject(), `${title}\n${content}`, {
      itemType: "note",
      itemId: existing.id,
    });
  } else {
    const note = {
      id: crypto.randomUUID(),
      type: "note",
      title,
      content,
      showOnMasterPlan,
      noteStyle: style,
      checklist: style === "checklist" ? checklist : undefined,
      imageUrl: pendingNoteImageDataUrl || "",
      imageName: pendingNoteImageName || "",
      createdAt: new Date().toISOString(),
      createdByUserId: state.currentUserId,
      archivedAt: null,
      archivedByUserId: null,
    };
    target.items.unshift(note);
    logAudit("Note Created", {
      objectType: "note",
      objectName: note.title || "Untitled note",
      projectId: getCurrentProject()?.id || "",
    });
    createMentionNotifications(getCurrentProject(), `${title}\n${content}`, {
      itemType: "note",
      itemId: note.id,
    });
  }
  closeNoteDialog(true);
  persist();
  render();
}

function toggleClientForm() {
  if (isClientFormExpanded) {
    closeClientForm();
    return;
  }
  isClientFormExpanded = true;
  resetClientForm();
  renderClientFormState();
}

function closeClientForm(forceClose = false) {
  if (!forceClose && !confirmDiscardUnsavedChanges(["client"])) return;
  isClientFormExpanded = false;
  editingClientId = null;
  resetClientForm();
  renderClientFormState();
}

function toggleMemberForm() {
  if (isMemberFormExpanded) {
    closeMemberForm();
    return;
  }
  isMemberFormExpanded = true;
  editingMemberId = null;
  resetMemberForm();
  renderMemberFormState();
}

function closeMemberForm(forceClose = false) {
  if (!forceClose && !confirmDiscardUnsavedChanges(["member"])) return;
  isMemberFormExpanded = false;
  editingMemberId = null;
  resetMemberForm();
  renderMemberFormState();
}

function resetMemberForm() {
  editingMemberId = null;
  els.memberForm?.reset();
  if (els.memberPersonalNumber) els.memberPersonalNumber.value = getNextPersonalNumber();
  if (IS_EMPTY_BOOTSTRAP && !getActiveUsers().length && els.memberRole) {
    els.memberRole.value = "admin";
  }
  rememberFormSnapshot("member", els.memberForm);
}

function populateMemberForm(member) {
  if (!member) return;
  editingMemberId = member.id;
  if (els.memberPersonalNumber) els.memberPersonalNumber.value = getMemberPersonalNumber(member);
  if (els.memberName) els.memberName.value = member.name || "";
  if (els.memberSurname) els.memberSurname.value = member.surname || "";
  if (els.memberTel) els.memberTel.value = member.tel || "";
  if (els.memberEmail) els.memberEmail.value = member.email || "";
  if (els.memberQualification) els.memberQualification.value = String(normalizeQualification(member.qualification));
  if (els.memberWorkmode) els.memberWorkmode.value = normalizeMemberWorkmode(member.workmode);
  if (els.memberRole) els.memberRole.value = member.role || "user";
  rememberFormSnapshot("member", els.memberForm);
}

function renderClientFormState() {
  const canCreateClients = PROJECT_ROLES.has(getCurrentRole()) || isAdmin();
  els.toggleClientFormBtn?.classList.toggle("hidden", !canCreateClients);
  els.clientFormShell?.classList.toggle("hidden", !canCreateClients || !isClientFormExpanded);
  els.clientFormShell?.classList.toggle("popup-shell-open", Boolean(canCreateClients && isClientFormExpanded));
  els.clientFormShell?.classList.toggle("form-shell-create", Boolean(isClientFormExpanded && !editingClientId));
  els.clientFormShell?.classList.toggle("form-shell-edit", Boolean(isClientFormExpanded && editingClientId));
  if (els.toggleClientFormBtn) {
    els.toggleClientFormBtn.textContent = "+";
    els.toggleClientFormBtn.title = isClientFormExpanded ? "Close client popup" : "Add client";
    els.toggleClientFormBtn.setAttribute("aria-label", isClientFormExpanded ? "Close client popup" : "Add new client");
    els.toggleClientFormBtn.classList.toggle("active", isClientFormExpanded);
  }
  if (els.clientFormTitle) {
    els.clientFormTitle.textContent = editingClientId ? "Edit Client" : "New Client";
  }
  if (els.clientSaveBtn) {
    els.clientSaveBtn.textContent = editingClientId ? "Save changes" : "Save client";
  }
}

function renderMemberFormState() {
  const project = getCurrentProject();
  const initialSetupMode = IS_EMPTY_BOOTSTRAP && getActiveUsers().length === 0;
  const canCreateMembers = initialSetupMode || hasPermission("createMembers");
  const canEditMembers = hasPermission("changeRoles");
  const memberFormAllowed = canCreateMembers || (Boolean(editingMemberId) && canEditMembers);
  els.toggleMemberFormBtn?.classList.toggle("hidden", !canCreateMembers || currentTeamsTab !== "members");
  els.memberFormShell?.classList.toggle("hidden", !memberFormAllowed || !isMemberFormExpanded);
  els.memberFormShell?.classList.toggle("popup-shell-open", Boolean(memberFormAllowed && isMemberFormExpanded));
  els.memberFormShell?.classList.toggle("form-shell-create", Boolean(memberFormAllowed && isMemberFormExpanded && !editingMemberId));
  els.memberFormShell?.classList.toggle("form-shell-edit", Boolean(memberFormAllowed && isMemberFormExpanded && editingMemberId));
  if (els.toggleMemberFormBtn) {
    els.toggleMemberFormBtn.textContent = "+";
    const addMode = !editingMemberId;
    els.toggleMemberFormBtn.title = isMemberFormExpanded && addMode ? "Close member form" : "Add member";
    els.toggleMemberFormBtn.setAttribute("aria-label", isMemberFormExpanded && addMode ? "Close member form" : "Add new member");
    els.toggleMemberFormBtn.classList.toggle("active", isMemberFormExpanded && addMode);
  }
  if (els.memberFormTitle) {
    const editingMember = editingMemberId ? getUserById(editingMemberId) : null;
    els.memberFormTitle.textContent = editingMember
      ? `Edit Member - ${getMemberDisplayName(editingMember)}`
      : "New Member";
  }
  if (els.memberForm) {
    const submitBtn = els.memberForm.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.disabled = !(editingMemberId ? canEditMembers : canCreateMembers);
      submitBtn.textContent = editingMemberId ? "Save changes" : "Add";
    }
  }
  if (els.memberRole) {
    els.memberRole.disabled = !(initialSetupMode || canEditMembers);
  }
  // Removed: "assign existing user" shortcut.
}

function populateEquipmentCategoryOptions(selectedId = "") {
  if (!els.equipmentCategorySelect) return;
  const categories = [...state.equipmentCategories].sort((a, b) => a.name.localeCompare(b.name));
  els.equipmentCategorySelect.innerHTML = ['<option value="">No category</option>']
    .concat(categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`))
    .join("");
  const resolvedSelectedId = categories.some((category) => category.id === selectedId) ? selectedId : "";
  els.equipmentCategorySelect.value = resolvedSelectedId;
}

function resetEquipmentForm() {
  editingEquipmentId = null;
  els.equipmentForm?.reset();
  populateEquipmentCategoryOptions("");
  setEquipmentIcon("none");
  rememberFormSnapshot("equipment", els.equipmentForm);
}

function closeEquipmentCreateForm(forceClose = false) {
  if (!isEquipmentFormExpanded || editingEquipmentId) return;
  if (!forceClose && !confirmDiscardUnsavedChanges(["equipment"])) return;
  isEquipmentFormExpanded = false;
  resetEquipmentForm();
}

function populateEquipmentForm(item) {
  if (!item) return;
  editingEquipmentId = item.id;
  if (els.equipmentName) els.equipmentName.value = item.name || "";
  populateEquipmentCategoryOptions(item.categoryId || "");
  setEquipmentIcon(item.iconKey || "none");
  if (els.equipmentReference) els.equipmentReference.value = item.reference || "";
  if (els.equipmentNotes) els.equipmentNotes.value = item.notes || "";
  rememberFormSnapshot("equipment", els.equipmentForm);
}

function toggleEquipmentForm() {
  if (isEquipmentFormExpanded) {
    closeEquipmentForm();
    return;
  }
  isEquipmentFormExpanded = true;
  resetEquipmentForm();
  renderEquipmentFormState();
}

function closeEquipmentForm(forceClose = false) {
  if (!forceClose && !confirmDiscardUnsavedChanges(["equipment"])) return;
  isEquipmentFormExpanded = false;
  editingEquipmentId = null;
  resetEquipmentForm();
  renderEquipmentFormState();
}

function toggleEquipmentCategoryForm() {
  if (!canCreateEquipmentCategory()) return;
  if (isEquipmentCategoryFormExpanded) {
    closeEquipmentCategoryForm();
    return;
  }
  isEquipmentCategoryFormExpanded = true;
  els.equipmentCategoryForm?.reset();
  editingEquipmentCategoryId = null;
  rememberFormSnapshot("equipmentCategory", els.equipmentCategoryForm);
  renderEquipmentCategoryFormState();
}

function closeEquipmentCategoryForm(forceClose = false) {
  if (!forceClose && !confirmDiscardUnsavedChanges(["equipmentCategory"])) return;
  isEquipmentCategoryFormExpanded = false;
  editingEquipmentCategoryId = null;
  els.equipmentCategoryForm?.reset();
  rememberFormSnapshot("equipmentCategory", els.equipmentCategoryForm);
  renderEquipmentCategoryFormState();
}

function renderEquipmentFormState() {
  const canEditEquipment = canManageEquipment();
  els.toggleEquipmentFormBtn?.classList.toggle("hidden", !canEditEquipment);
  els.equipmentFormShell?.classList.toggle("hidden", !canEditEquipment || !isEquipmentFormExpanded);
  els.equipmentFormShell?.classList.toggle("popup-shell-open", Boolean(canEditEquipment && isEquipmentFormExpanded));
  if (els.toggleEquipmentFormBtn) {
    els.toggleEquipmentFormBtn.textContent = "+";
    els.toggleEquipmentFormBtn.title = isEquipmentFormExpanded ? "Close equipment form" : "Add equipment";
    els.toggleEquipmentFormBtn.setAttribute("aria-label", isEquipmentFormExpanded ? "Close equipment form" : "Add new equipment");
    els.toggleEquipmentFormBtn.classList.toggle("active", isEquipmentFormExpanded);
  }
  if (els.equipmentFormTitle) {
    els.equipmentFormTitle.textContent = editingEquipmentId ? "Edit Equipment" : "New Equipment";
  }
  if (els.equipmentSaveBtn) {
    els.equipmentSaveBtn.textContent = editingEquipmentId ? "Save changes" : "Save equipment";
    els.equipmentSaveBtn.disabled = !canEditEquipment;
  }
  populateEquipmentCategoryOptions(els.equipmentCategorySelect?.value || "");
  syncEquipmentIconPaletteSelection(els.equipmentIcon?.value || "none");
}

function renderEquipmentCategoryFormState() {
  const canEditCategories = canCreateEquipmentCategory();
  els.toggleEquipmentCategoryFormBtn?.classList.toggle("hidden", !canEditCategories);
  els.equipmentCategoryFormShell?.classList.toggle("hidden", !canEditCategories || !isEquipmentCategoryFormExpanded);
  els.equipmentCategoryFormShell?.classList.toggle("popup-shell-open", Boolean(canEditCategories && isEquipmentCategoryFormExpanded));
  if (els.toggleEquipmentCategoryFormBtn) {
    els.toggleEquipmentCategoryFormBtn.textContent = "+";
    els.toggleEquipmentCategoryFormBtn.title = isEquipmentCategoryFormExpanded ? "Close category form" : "Add category";
    els.toggleEquipmentCategoryFormBtn.setAttribute("aria-label", isEquipmentCategoryFormExpanded ? "Close category form" : "Add new category");
    els.toggleEquipmentCategoryFormBtn.classList.toggle("active", isEquipmentCategoryFormExpanded);
  }
  if (els.equipmentCategoryFormTitle) {
    els.equipmentCategoryFormTitle.textContent = editingEquipmentCategoryId ? "Edit Category" : "New Category";
  }
  if (els.equipmentCategorySaveBtn) {
    els.equipmentCategorySaveBtn.textContent = editingEquipmentCategoryId ? "Save changes" : "Save category";
    els.equipmentCategorySaveBtn.disabled = !canEditCategories;
  }
}

function setEquipmentCategoryFilters(categoryIds = []) {
  const normalizedIds = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
  selectedEquipmentCategoryFilterIds = new Set(
    normalizedIds.filter((categoryId) => categoryId && getEquipmentCategoryById(categoryId))
  );
}

function setEquipmentCategoryFilter(categoryId = "") {
  setEquipmentCategoryFilters(categoryId ? [categoryId] : []);
  renderEquipment();
}

function toggleEquipmentCategoryFilter(categoryId) {
  if (!categoryId || !getEquipmentCategoryById(categoryId)) return;
  const next = new Set(selectedEquipmentCategoryFilterIds);
  if (next.has(categoryId)) {
    next.delete(categoryId);
  } else {
    next.add(categoryId);
  }
  selectedEquipmentCategoryFilterIds = next;
  renderEquipment();
}

function onEquipmentSave(event) {
  event.preventDefault();
  if (!requirePermission(canManageEquipment(), "Only admins, managers, or developers can save equipment.")) return;
  const name = els.equipmentName?.value.trim() || "";
  const categoryId = els.equipmentCategorySelect?.value || "";
  const iconKey = normalizeEquipmentIconKey(els.equipmentIcon?.value || "none");
  const reference = els.equipmentReference?.value.trim() || "";
  const notes = els.equipmentNotes?.value.trim() || "";
  if (!name) {
    showAppMessage("Please add an equipment name.", "warning", "Equipment");
    return;
  }
  const existing = editingEquipmentId
    ? state.equipmentItems.find((item) => item.id === editingEquipmentId)
    : null;
  const item = existing || createEquipmentItem({ name, categoryId, iconKey, reference, notes, createdByUserId: state.currentUserId || "" });
  item.name = name;
  item.categoryId = categoryId;
  item.iconKey = iconKey;
  item.reference = reference;
  item.notes = notes;
  if (!existing) state.equipmentItems.unshift(item);
  setEquipmentCategoryFilters(item.categoryId ? [item.categoryId] : []);
  expandedEquipmentId = item.id;
  isEquipmentFormExpanded = false;
  editingEquipmentId = null;
  logAudit(existing ? "Equipment Updated" : "Equipment Created", {
    objectType: "equipment",
    objectName: item.name,
  });
  persist();
  render();
}

function onEquipmentCategorySave(event) {
  event.preventDefault();
  if (!requirePermission(canCreateEquipmentCategory(), "Only admins can create or edit equipment categories.")) return;
  const name = els.equipmentCategoryName?.value.trim() || "";
  if (!name) {
    showAppMessage("Please enter a category name.", "warning", "Equipment Category");
    return;
  }
  const exists = state.equipmentCategories.some((category) => category.id !== editingEquipmentCategoryId && category.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    showAppMessage("This equipment category already exists.", "warning", "Equipment Category");
    return;
  }
  const existing = editingEquipmentCategoryId
    ? state.equipmentCategories.find((category) => category.id === editingEquipmentCategoryId)
    : null;
  const category = existing || createEquipmentCategory({ name });
  category.name = name;
  if (!existing) state.equipmentCategories.push(category);
  setEquipmentCategoryFilters([category.id]);
  isEquipmentCategoryFormExpanded = false;
  editingEquipmentCategoryId = null;
  logAudit(existing ? "Equipment Category Updated" : "Equipment Category Created", {
    objectType: "equipment-category",
    objectName: category.name,
  });
  persist();
  render();
  if (els.equipmentCategorySelect) els.equipmentCategorySelect.value = category.id;
}

function editEquipmentCategory(categoryId) {
  if (!requirePermission(canCreateEquipmentCategory(), "Only admins can edit equipment categories.")) return;
  const category = getEquipmentCategoryById(categoryId);
  if (!category) return;
  setEquipmentCategoryFilters([category.id]);
  editingEquipmentCategoryId = category.id;
  isEquipmentCategoryFormExpanded = true;
  if (els.equipmentCategoryName) els.equipmentCategoryName.value = category.name || "";
  rememberFormSnapshot("equipmentCategory", els.equipmentCategoryForm);
  renderEquipmentCategoryFormState();
}

async function deleteEquipmentCategory(categoryId) {
  if (!requirePermission(isAdmin(), "Only admins can delete equipment categories.")) return;
  const category = getEquipmentCategoryById(categoryId);
  if (!category) return;
  const confirmed = await showAppConfirm(
    `Delete category "${category.name}"?\n\nAll equipment inside will move to "No category".`,
    "Delete Category",
    {
      eyebrow: "Equipment",
      confirmLabel: "Yes",
      cancelLabel: "No",
      tone: "warning",
    }
  );
  if (!confirmed) return;

  for (const item of state.equipmentItems) {
    if (item.categoryId === categoryId) item.categoryId = "";
  }
  state.equipmentCategories = state.equipmentCategories.filter((entry) => entry.id !== categoryId);
  selectedEquipmentCategoryFilterIds.delete(categoryId);
  if (editingEquipmentCategoryId === categoryId) {
    editingEquipmentCategoryId = null;
    isEquipmentCategoryFormExpanded = false;
  }
  logAudit("Equipment Category Deleted", {
    objectType: "equipment-category",
    objectName: category.name,
  });
  persist();
  render();
}

function onClientSearchSubmit(event) {
  event.preventDefault();
  clientSearchQuery = els.clientSearchInput?.value.trim() || "";
  renderClients();
}

function memberMatchesFilters(member) {
  const roleMatches = memberRoleFilter === "all" || member.role === memberRoleFilter;
  const skillMatches = memberMatchesExperienceFilter(member, memberSkillFilter);
  const workmodeMatches = memberMatchesPositionFilter(member, memberWorkmodeFilter);
  const search = memberSearchQuery.trim().toLowerCase();
  if (!roleMatches || !skillMatches || !workmodeMatches) return false;
  if (!search) return true;
  const workmodeMeta = getMemberWorkmodeMeta(member.workmode);
  const projects = getMemberProjectsForDirectory(member, getCurrentProject()).map((entry) => getProjectDisplayName(entry)).join(" ");
  const haystack = [
    member.name,
    member.surname,
    getMemberDisplayName(member),
    getMemberPersonalNumber(member),
    member.email,
    member.tel,
    ROLE_LABELS[member.role] || "",
    workmodeMeta.label,
    getQualificationStars(member.qualification).replace(/&[#a-z0-9;]+/gi, " "),
    projects,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(search);
}

function onMemberSearchSubmit(event) {
  event.preventDefault();
  memberSearchQuery = els.memberSearchInput?.value.trim() || "";
  renderMembers();
}

function onMemberSearchInput() {
  memberSearchQuery = els.memberSearchInput?.value.trim() || "";
  renderMembers();
}

function onMemberFilterChange() {
  memberRoleFilter = els.memberRoleFilter?.value || "all";
  memberSkillFilter = els.memberSkillFilter?.value || "all";
  memberWorkmodeFilter = els.memberWorkmodeFilter?.value || "all";
  renderMembers();
}

function onServiceTeamMemberFilterChange() {
  serviceTeamExperienceFilter = els.serviceTeamExperienceFilter?.value || "all";
  serviceTeamPositionFilter = els.serviceTeamPositionFilter?.value || "all";
  renderServiceTeamMemberOptions();
}

function clearMemberFilters() {
  memberSearchQuery = "";
  memberRoleFilter = "all";
  memberSkillFilter = "all";
  memberWorkmodeFilter = "all";
  if (els.memberSearchInput) els.memberSearchInput.value = "";
  if (els.memberRoleFilter) els.memberRoleFilter.value = "all";
  if (els.memberSkillFilter) els.memberSkillFilter.value = "all";
  if (els.memberWorkmodeFilter) els.memberWorkmodeFilter.value = "all";
  renderMembers();
}

function setTeamsTab(tabName) {
  currentTeamsTab = tabName === "permissions" ? "permissions" : "members";
  renderTeamsTabState();
}

function renderTeamsTabState() {
  const membersTabActive = currentTeamsTab !== "permissions";
  els.teamsMembersTabBtn?.classList.toggle("active", membersTabActive);
  els.teamsPermissionsTabBtn?.classList.toggle("active", !membersTabActive);
  els.teamsMembersTabPanel?.classList.toggle("hidden", !membersTabActive);
  els.teamsPermissionsTabPanel?.classList.toggle("hidden", membersTabActive);
}

function onClientSearchInput() {
  clientSearchQuery = els.clientSearchInput?.value.trim() || "";
  renderClients();
}

function onClientSearchScopeChange() {
  clientSearchScope = els.clientSearchScope?.value || "all";
  renderClients();
}

function clearClientSearch() {
  clientSearchQuery = "";
  if (els.clientSearchInput) els.clientSearchInput.value = "";
  clientSearchScope = "all";
  if (els.clientSearchScope) els.clientSearchScope.value = "all";
  renderClients();
}

function onProjectSearchSubmit(event) {
  event.preventDefault();
  projectSearchQuery = els.projectSearchInput?.value.trim() || "";
  renderProjects();
}

function onProjectSearchInput() {
  projectSearchQuery = els.projectSearchInput?.value.trim() || "";
  renderProjects();
}

function clearProjectSearch() {
  projectSearchQuery = "";
  if (els.projectSearchInput) els.projectSearchInput.value = "";
  renderProjects();
}

function onAuditSearchSubmit(event) {
  event.preventDefault();
  auditSearchQuery = els.auditSearchInput?.value.trim() || "";
  renderAuditLog();
}

function onAuditSearchInput() {
  auditSearchQuery = els.auditSearchInput?.value.trim() || "";
  renderAuditLog();
}

function clearAuditSearch() {
  auditSearchQuery = "";
  if (els.auditSearchInput) els.auditSearchInput.value = "";
  renderAuditLog();
}

function auditEntryMatchesSearch(entry, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const actor = getUserById(entry.userId);
  const values = [
    entry.action,
    entry.objectType,
    entry.objectName,
    entry.projectName,
    entry.projectId,
    entry.reason,
    actor ? getMemberDisplayName(actor) : "",
    ROLE_LABELS[entry.userRole] || entry.userRole,
    new Date(entry.timestamp).toLocaleString(),
  ]
    .map((value) => normalizeSearchText(value))
    .filter(Boolean);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const tokens = values.flatMap((value) => [value, ...splitSearchTokens(value)]);
  return terms.every((term) => tokens.some((token) => token.includes(term)));
}

function resetClientForm() {
  editingClientId = null;
  els.clientForm?.reset();
  if (els.responsibleList) {
    els.responsibleList.innerHTML = "";
  }
  ensureResponsiblePersonRow();
  rememberFormSnapshot("client", els.clientForm);
}

function populateClientForm(client) {
  if (!client) return;
  editingClientId = client.id;
  if (els.clientName) els.clientName.value = client.name || "";
  if (els.clientSurname) els.clientSurname.value = client.surname || "";
  if (els.clientCompany) els.clientCompany.value = client.company || "";
  if (els.clientUid) els.clientUid.value = client.uidNumber || "";
  if (els.clientAddress) els.clientAddress.value = client.address || "";
  if (els.clientEmail) els.clientEmail.value = client.email || "";
  if (els.clientTel) els.clientTel.value = client.tel || "";
  if (els.responsibleList) {
    els.responsibleList.innerHTML = "";
    for (const person of client.responsiblePersons || []) {
      addResponsiblePersonRow(person);
    }
  }
  ensureResponsiblePersonRow();
  rememberFormSnapshot("client", els.clientForm);
}

function onTaskSave(event) {
  event.preventDefault();
  const project = getCurrentProject();
  const folder = getSelectedFolder();
  const area = pendingAreaTaskId
    ? project?.areas?.find((entry) => entry.id === pendingAreaTaskId)
    : (pendingProjectTaskMode && els.taskArea?.value
      ? project?.areas?.find((entry) => entry.id === els.taskArea.value)
      : null);
  const member = buildAssignableMembers(project).find((entry) => entry.id === els.taskMember.value);
  const team = (project?.folders || []).find((entry) => entry.id === els.taskMember.value);
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can create tasks.")) return;
  const targetFolder = pendingProjectTaskMode ? team : folder;
  if ((!targetFolder && !area) || (!member && !team) || !els.taskDate.value) {
    showAppMessage(pendingAreaTaskId || pendingProjectTaskMode
      ? "Please choose a Service Team and a due date for the task."
      : "Please choose a member and a due date for the task.", "warning", "Task");
    return;
  }
  const taskItem = {
    id: crypto.randomUUID(),
    type: "task",
    title: els.taskTitle.value.trim(),
    assigneeId: pendingAreaTaskId ? team.id : member.id,
    assigneeName: pendingAreaTaskId ? team.name : member.name,
    dueDate: els.taskDate.value,
    notes: els.taskNotes.value.trim(),
    status: els.taskStatus.value,
    linkedFolderIds: getCheckedValues("task-folder-link"),
    linkedPhotoIds: getCheckedValues("task-photo-link"),
    linkedAreaId: area?.id || "",
    linkedAreaName: area?.name || "",
    createdAt: new Date().toISOString(),
    createdByUserId: state.currentUserId,
    archivedAt: null,
    archivedByUserId: null,
  };
  if (area) {
    area.items.unshift(taskItem);
    if (team && !area.teamIds.includes(team.id)) area.teamIds.push(team.id);
  } else {
    targetFolder.items.unshift(taskItem);
  }
  createMentionNotifications(project, `${taskItem.title}\n${taskItem.notes}`, {
    itemType: "task",
    itemId: taskItem.id,
  });
  if (member?.id && member.id !== state.currentUserId) {
    notifyUser(member.id, {
      title: "Task assigned",
      body: `You were assigned to "${taskItem.title || "Untitled task"}".`,
    });
  }
  logAudit("Task Created", {
    objectType: "task",
    objectName: taskItem.title || "Untitled task",
    projectId: project?.id || "",
  });
  closeTaskDialog(true);
  pendingAreaTaskId = null;
  pendingProjectTaskMode = false;
  persist();
  render();
  showAppMessage("New task is created.", "success", "Task Saved");
}

async function handleFileSelection(event, type) {
  const target = resolveAssetTarget();
  const files = Array.from(event.target.files || []);
  const baseName = String(event.target.dataset.baseName || "").trim();
  const selectedAreaIds = (() => {
    try {
      const parsed = JSON.parse(String(event.target.dataset.areaIds || "[]"));
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (error) {
      return [];
    }
  })();
  if (!target || !files.length) {
    delete event.target.dataset.baseName;
    delete event.target.dataset.areaIds;
    event.target.value = "";
    pendingAssetTarget = null;
    return;
  }
  if (!requirePermission(canWorkInProject(), "You do not have access to upload files here.")) return;
  const uploadFiles = type === "photo"
    ? files.filter((file) => String(file.type || "").toLowerCase().startsWith("image/"))
    : files;
  if (!uploadFiles.length) {
    showAppMessage("No image files were found in the selected location.", "warning", "Upload Pictures");
    delete event.target.dataset.baseName;
    delete event.target.dataset.areaIds;
    event.target.value = "";
    pendingAssetTarget = null;
    return;
  }
  const dateStamp = formatDateStamp(new Date());
  const prepared = await Promise.all(uploadFiles.map((file, index) => toStoredAsset(file, type, baseName || getDefaultAssetBaseName(file, type), index, dateStamp)));
  if (type === "photo" && selectedAreaIds.length) {
    for (const asset of prepared) {
      asset.linkedAreaIds = [...selectedAreaIds];
    }
  }
  for (const asset of prepared.reverse()) target.items.unshift(asset);
  for (const asset of prepared) {
    logAudit(type === "photo" ? "Photo Uploaded" : "File Uploaded", {
      objectType: type,
      objectName: asset.title,
      projectId: getCurrentProject()?.id || "",
    });
  }
  delete event.target.dataset.baseName;
  delete event.target.dataset.areaIds;
  event.target.value = "";
  pendingAssetTarget = null;
  pendingPhotoUploadAreaIds = new Set();
  persist();
  render();
}

function onSpeechStart() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showAppMessage("Speech recognition is not supported in this browser.", "warning", "Speech");
    return;
  }
  if (recognition) {
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.stop();
  }
  recognition = new SpeechRecognition();
  recognition.lang = els.speechBtn?.dataset.lang || "el-GR";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  currentSpeechTranscriptBuffer = "";
  speechHasMagicReadyPhrase = false;
  if (els.speechTranscript) els.speechTranscript.value = "";
  renderSpeechSummary([]);
  setSpeechButtonState(true);
  setSpeechAssistState("listening");
  recognition.onresult = (event) => {
    const transcript = buildRecognitionTranscript(event.results);
    const cleanedTranscript = stripSpeechReadyPhrase(transcript);
    currentSpeechTranscriptBuffer = cleanedTranscript;
    if (els.speechTranscript) els.speechTranscript.value = cleanedTranscript;
    renderSpeechSummary(cleanedTranscript ? buildSpeechSummary(cleanedTranscript) : []);
    if (containsSpeechReadyPhrase(transcript)) {
      speechHasMagicReadyPhrase = true;
      setSpeechButtonState(false);
      setSpeechAssistState("ready");
      recognition.stop();
      return;
    }
    setSpeechAssistState("listening");
  };
  recognition.onerror = () => {
    setSpeechButtonState(false);
    setSpeechAssistState(currentSpeechTranscriptBuffer ? "missing" : "idle");
  };
  recognition.onend = () => {
    setSpeechButtonState(false);
    setSpeechAssistState(speechHasMagicReadyPhrase ? "ready" : (currentSpeechTranscriptBuffer ? "missing" : "idle"));
    recognition = null;
  };
  recognition.start();
}

function onParseSpeech() {
  const rawTranscript = els.speechTranscript.value.trim();
  const transcript = stripSpeechReadyPhrase(rawTranscript);
  if (!transcript) return;
  const hasMagicReadyPhrase = speechHasMagicReadyPhrase || containsSpeechReadyPhrase(rawTranscript);
  if (!hasMagicReadyPhrase) {
    setSpeechAssistState("missing");
    showAppMessage(`Finish your speech by saying "${getSpeechMagicPhrase()}".`, "warning", "Speech");
    return;
  }
  if (els.speechTranscript) els.speechTranscript.value = transcript;
  const parsed = parseSpeechTranscript(transcript);
  const summaryItems = buildSpeechSummary(transcript);
  renderSpeechSummary(summaryItems);
  if (parsed.title) els.taskTitle.value = parsed.title;
  if (parsed.assigneeId) els.taskMember.value = parsed.assigneeId;
  if (parsed.dueDate) els.taskDate.value = parsed.dueDate;
  const summaryAdded = mergeSpeechSummaryIntoTaskNotes(summaryItems);
  const messageParts = [];
  if (summaryAdded) messageParts.push("I added a bullet summary to Notes.");
  if (!parsed.assigneeId || !parsed.dueDate) {
    const missing = [];
    if (!parsed.assigneeId) missing.push("member");
    if (!parsed.dueDate) missing.push("due date");
    messageParts.push(`I filled what I could. Please confirm the ${missing.join(" and ")} manually.`);
  }
  if (messageParts.length) {
    showAppMessage(messageParts.join(" "), !parsed.assigneeId || !parsed.dueDate ? "info" : "success", "Speech Parsed");
  }
}

async function onCapturePhoto() {
  const folder = resolveAssetTarget() || getSelectedFolder();
  const rawName = els.cameraPhotoName.value.trim();
  if (!folder) return;
  if (!requirePermission(canWorkInProject(), "You do not have access to save camera photos here.")) return;
  if (!rawName) {
    showAppMessage("Please name the picture before taking it.", "warning", "Take Photo");
    return;
  }
  const video = els.cameraStream;
  const canvas = els.cameraCanvas;
  const context = canvas.getContext("2d");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const previewUrl = canvas.toDataURL("image/jpeg", 0.92);
  const shouldSave = window.confirm("Are you happy with the picture? Save Y/N?");
  if (!shouldSave) return;
  const selectedAreaIds = [...pendingCameraAreaIds];
  const capturedPhoto = {
    id: crypto.randomUUID(),
    type: "photo",
    title: createSequencedName(sanitizeName(rawName), 0, formatDateStamp(new Date())),
    mimeType: "image/jpeg",
    previewUrl,
    createdAt: new Date().toISOString(),
    createdByUserId: state.currentUserId,
    source: "camera",
    archivedAt: null,
    archivedByUserId: null,
  };
  if (selectedAreaIds.length) capturedPhoto.linkedAreaIds = selectedAreaIds;
  folder.items.unshift(capturedPhoto);
  logAudit("Photo Captured", {
    objectType: "photo",
    objectName: rawName,
    projectId: getCurrentProject()?.id || "",
  });
  closeCameraDialog(true);
  persist();
  render();
}

function populateMemberOptions() {
  const project = getCurrentProject();
  els.taskMember.innerHTML = "";
  const options = pendingAreaTaskId || pendingProjectTaskMode
    ? (project?.folders || []).filter((folder) => !folder.archivedAt)
    : buildAssignableMembers(project);
  if (els.taskMemberLabel) {
    els.taskMemberLabel.firstChild.textContent = pendingAreaTaskId || pendingProjectTaskMode
      ? "Assigned Service Team"
      : "Assigned member";
  }
  for (const member of options) {
    const option = document.createElement("option");
    option.value = member.id;
    option.textContent = pendingAreaTaskId || pendingProjectTaskMode
      ? getMemberDisplayName(member)
      : `${getMemberDisplayName(member)} (${member.email})`;
    els.taskMember.append(option);
  }
  if (els.taskAreaLabel && els.taskArea) {
    const activeAreas = (project?.areas || []).filter((area) => !area.archivedAt);
    els.taskAreaLabel.classList.toggle("hidden", !pendingProjectTaskMode);
    els.taskArea.innerHTML = `<option value="">Project wide</option>${activeAreas
      .map((area) => `<option value="${area.id}">${escapeHtml(area.name)}</option>`)
      .join("")}`;
    els.taskArea.value = "";
  }
}

function buildAssignableMembers(project = getCurrentProject()) {
  const projectUsers = getProjectUsers(project).filter((user) => user.status !== "archived");
  const projectManager = getUserById(project?.projectManagerUserId);
  const ordered = projectManager
    ? [projectManager, ...projectUsers.filter((user) => user.id !== projectManager.id)]
    : projectUsers;
  return ordered;
}

function buildAvailableServiceTeamMembers(project = getCurrentProject()) {
  const projectUsers = getProjectUsers(project).filter((user) => user.status !== "archived");
  const projectManager = getUserById(project?.projectManagerUserId);
  const otherUsers = getActiveUsers().filter((user) => !projectUsers.some((entry) => entry.id === user.id));
  return [projectManager, ...projectUsers, ...otherUsers]
    .filter(Boolean)
    .filter((user, index, list) => list.findIndex((entry) => entry.id === user.id) === index);
}

function memberMatchesExperienceFilter(member, filterValue) {
  if (filterValue === "all") return true;
  const normalizedQualification = normalizeQualification(member.qualification);
  return filterValue === "0"
    ? normalizedQualification === 0
    : normalizedQualification >= Number.parseInt(filterValue, 10);
}

function memberMatchesPositionFilter(member, filterValue) {
  return filterValue === "all" || normalizeMemberWorkmode(member.workmode) === filterValue;
}

function renderServiceTeamMemberOptions(project = getCurrentProject()) {
  if (!project || !els.serviceTeamMemberLinks) return;
  const visibleMembers = buildAvailableServiceTeamMembers(project).filter((member) => (
    memberMatchesExperienceFilter(member, serviceTeamExperienceFilter)
    && memberMatchesPositionFilter(member, serviceTeamPositionFilter)
  ));
  els.serviceTeamMemberLinks.innerHTML = "";
  if (!visibleMembers.length) {
    els.serviceTeamMemberLinks.innerHTML = `<p class="muted service-team-member-list-empty">No members match the current Position / Experience filters.</p>`;
    return;
  }
  for (const member of visibleMembers) {
    const personalNumber = getMemberPersonalNumber(member) || "-";
    const starMarkup = getQualificationStars(member.qualification);
    const label = createCheckRow(
      "service-team-member-link",
      member.id,
      getMemberCompactName(member),
      `#${personalNumber}`,
      { metaHtml: starMarkup ? `<span class="member-stars-compact" aria-label="Experience">${starMarkup}</span>` : "" }
    );
    const checkbox = label.querySelector("input");
    if (checkbox) {
      checkbox.checked = serviceTeamSelectedMemberIds.has(member.id);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) serviceTeamSelectedMemberIds.add(member.id);
        else serviceTeamSelectedMemberIds.delete(member.id);
        renderServiceTeamDialogSummary();
      });
    }
    els.serviceTeamMemberLinks.append(label);
  }
}

function renderServiceTeamAreaOptions(project = getCurrentProject()) {
  if (!project || !els.serviceTeamAreaLinks) return;
  const visibleAreas = (project.areas || []).filter((area) => !area.archivedAt);
  els.serviceTeamAreaLinks.innerHTML = "";
  if (!visibleAreas.length) {
    els.serviceTeamAreaLinks.innerHTML = `<p class="muted service-team-area-list-empty">No areas yet. Add areas first to assign this Service Team.</p>`;
    return;
  }
  for (const area of visibleAreas) {
    const floor = normalizeFloorName(area.floor);
    const label = createCheckRow(
      "service-team-area-link",
      area.id,
      floor ? `${area.name} - ${floor}` : area.name,
      floor ? `Floor: ${floor}` : "No floor"
    );
    const checkbox = label.querySelector("input");
    if (checkbox) {
      checkbox.checked = serviceTeamSelectedAreaIds.has(area.id);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) serviceTeamSelectedAreaIds.add(area.id);
        else serviceTeamSelectedAreaIds.delete(area.id);
      });
    }
    els.serviceTeamAreaLinks.append(label);
  }
}

function getMemberDisplayName(member) {
  return [member?.name, member?.surname].filter(Boolean).join(" ") || member?.email || "";
}

function getMemberCompactName(member) {
  const surname = String(member?.surname || "").trim();
  const name = String(member?.name || "").trim();
  const initial = name ? `${name[0].toUpperCase()}.` : "";
  if (surname && initial) return `${surname} ${initial}`;
  return surname || name || member?.email || "";
}

function createTickFilter(labelText, checked, onChange, disabled = false) {
  const label = document.createElement("label");
  label.className = `tick-filter${disabled ? " is-disabled" : ""}`;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.disabled = disabled;
  input.addEventListener("change", () => onChange(input.checked));
  const text = document.createElement("span");
  text.textContent = labelText;
  label.append(input, text);
  return label;
}

function getProjectUsers(project = getCurrentProject()) {
  const memberIds = new Set(project?.memberIds || []);
  for (const team of (project?.folders || [])) {
    for (const userId of (team.memberIds || [])) memberIds.add(userId);
  }
  if (project?.projectManagerUserId) memberIds.add(project.projectManagerUserId);
  return [...memberIds].map((userId) => getUserById(userId)).filter(Boolean);
}

function normalizeMentionToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

function getMentionAliasesForUser(user) {
  const emailLocal = String(user?.email || "").split("@")[0] || "";
  const first = normalizeMentionToken(user?.name || "");
  const last = normalizeMentionToken(user?.surname || "");
  const full = normalizeMentionToken(`${user?.name || ""}${user?.surname || ""}`);
  const dotted = normalizeMentionToken(`${user?.name || ""}.${user?.surname || ""}`);
  const aliases = [first, last, full, dotted, normalizeMentionToken(emailLocal)].filter(Boolean);
  return [...new Set(aliases)];
}

function getProjectMentionCandidates(project = getCurrentProject()) {
  return getProjectUsers(project).map((user) => ({
    id: user.id,
    handle: getMentionAliasesForUser(user)[0] || "user",
    aliases: getMentionAliasesForUser(user),
    label: getMemberDisplayName(user) || user.email || "Member",
  }));
}

function extractMentionUserIdsFromText(text, project = getCurrentProject()) {
  const source = String(text || "");
  const candidates = getProjectMentionCandidates(project);
  const handleToUserId = new Map();
  for (const entry of candidates) {
    for (const alias of entry.aliases || []) {
      if (!handleToUserId.has(alias)) handleToUserId.set(alias, entry.id);
    }
  }
  const ids = new Set();
  const matches = source.matchAll(/@([a-zA-Z0-9._-]+)/g);
  for (const match of matches) {
    const handle = String(match?.[1] || "").toLowerCase();
    const userId = handleToUserId.get(handle);
    if (userId) ids.add(userId);
  }
  const loweredSource = source.toLowerCase();
  for (const user of getProjectUsers(project)) {
    const nameParts = [user.name, user.surname].map((part) => String(part || "").trim()).filter(Boolean);
    const displayName = getMemberDisplayName(user).toLowerCase();
    if (displayName && loweredSource.includes(displayName)) ids.add(user.id);
    for (const part of nameParts) {
      if (part.length >= 3 && new RegExp(`\\b${escapeRegExp(part.toLowerCase())}\\b`, "i").test(source)) {
        ids.add(user.id);
      }
    }
  }
  return [...ids];
}

function createMentionNotifications(project, text, context = {}) {
  if (!project) return;
  const mentionedUserIds = extractMentionUserIdsFromText(text, project)
    .filter((userId) => userId && userId !== state.currentUserId);
  if (!mentionedUserIds.length) return;
  if (!Array.isArray(project.mentionNotifications)) project.mentionNotifications = [];
  for (const userId of mentionedUserIds) {
    project.mentionNotifications.unshift({
      id: crypto.randomUUID(),
      projectId: project.id,
      fromUserId: state.currentUserId || "",
      toUserId: userId,
      itemType: context.itemType || "item",
      itemId: context.itemId || "",
      channelId: context.channelId || "",
      messageId: context.messageId || "",
      title: "Name mentioned",
      body: String(text || "").trim().slice(0, 160),
      createdAt: new Date().toISOString(),
      readAt: null,
    });
  }
}

function getCurrentUserNotifications(project = getCurrentProject()) {
  const currentUserId = state.currentUserId || "";
  const projectNotifications = (project?.mentionNotifications || [])
    .filter((entry) => entry.toUserId === currentUserId)
    .map((entry) => ({ ...entry, scope: "project" }));
  const accountNotifications = (state.userNotifications || [])
    .filter((entry) => entry.toUserId === currentUserId)
    .map((entry) => ({ ...entry, scope: "account", itemType: "account" }));
  return [...accountNotifications, ...projectNotifications]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

function renderNotificationsPanel(project = getCurrentProject()) {
  if (!els.notificationsList || !els.notificationsCount) return;
  const notifications = getCurrentUserNotifications(project);
  const unreadCount = notifications.filter((entry) => !entry.readAt).length;
  els.notificationsCount.textContent = String(unreadCount);
  els.notificationsCount.classList.toggle("hidden", unreadCount <= 0);
  if (!notifications.length) {
    els.notificationsList.innerHTML = `<p class="muted">No notifications.</p>`;
    return;
  }
  els.notificationsList.innerHTML = "";
  for (const entry of notifications.slice(0, 40)) {
    const actor = getUserById(entry.fromUserId);
    const row = document.createElement("button");
    row.type = "button";
    row.className = `notification-entry${entry.readAt ? "" : " unread"}`;
    const title = entry.scope === "account" ? entry.title : "Name mentioned";
    const body = entry.scope === "account"
      ? entry.body
      : `${getMemberDisplayName(actor) || "A user"} mentioned your name in this project.`;
    row.innerHTML = `
      <strong>${escapeHtml(title)}</strong>
      <span class="muted">${escapeHtml(body)}</span>
      <span class="muted">${escapeHtml(new Date(entry.createdAt).toLocaleString())}</span>
    `;
    row.addEventListener("click", () => openMentionNotification(entry.id));
    els.notificationsList.append(row);
  }
}

function openProjectRoomChatFromHeader() {
  const project = getCurrentProject();
  if (!project) return;
  currentView = "projects";
  state.selectedProjectId = project.id;
  currentWorkspaceTab = "folders-hub";
  currentProjectDetailsTab = "chat";
  selectedProjectAreaId = "";
  ensureValidProjectChatChannel(project);
  persist();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function isValidInternationalPhone(value) {
  return /^\+[1-9]\d{6,15}$/.test(String(value || "").replace(/\s+/g, ""));
}

function renderViberRoomButton(project = getCurrentProject()) {
  if (!els.viberRoomBtn || !els.projectRoomChatBtn) return;
  if (!project) {
    els.viberRoomBtn.classList.add("hidden");
    els.projectRoomChatBtn.classList.add("hidden");
    return;
  }
  const mode = String(project.projectRoomMode || "chat");
  els.projectRoomChatBtn.classList.toggle("hidden", mode !== "chat");
  els.viberRoomBtn.classList.toggle("hidden", mode !== "viber");
  const status = String(project.viberRoomStatus || "not_created");
  const labelMap = {
    not_created: "Viber Room",
    creating: "Viber Creating",
    active: "Open Viber",
    failed: "Viber Failed",
  };
  els.viberRoomBtn.textContent = labelMap[status] || "Viber Room";
  els.viberRoomBtn.classList.toggle("archived-visible-state", status === "active");
}

function openViberRoomDialog() {
  const project = getCurrentProject();
  if (!project) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can configure project Viber room.")) return;
  if (!els.viberRoomDialog) return;
  if (els.projectRoomMode) els.projectRoomMode.value = String(project.projectRoomMode || "chat");
  if (els.viberRoomStatus) els.viberRoomStatus.value = String(project.viberRoomStatus || "not_created");
  if (els.viberRoomLink) els.viberRoomLink.value = String(project.viberRoomLink || "");
  if (els.viberRoomId) {
    els.viberRoomId.value = String(project.viberRoomId || (`VIBER-${String(project.projectNumber || project.id).slice(-8)}`));
  }
  if (els.viberRoomMembers) {
    const members = getProjectUsers(project).filter((user) => user.status !== "archived");
    els.viberRoomMembers.innerHTML = members.length
      ? members.map((member) => {
          const phoneOk = isValidInternationalPhone(member.tel || "");
          return `
            <label class="check-row">
              <input type="checkbox" disabled ${phoneOk ? "checked" : ""}>
              <span class="check-row-copy">
                <span class="check-row-titleline"><strong>${escapeHtml(getMemberDisplayName(member) || member.email || "Member")}</strong></span>
                <span class="muted">${phoneOk ? `Phone ready: ${escapeHtml(member.tel || "")}` : "Phone missing or invalid (+43... format)"}</span>
              </span>
            </label>
          `;
        }).join("")
      : `<p class="muted service-team-member-list-empty">No project members assigned yet.</p>`;
  }
  els.viberRoomDialog.showModal();
}

function closeViberRoomDialog() {
  if (els.viberRoomDialog?.open) els.viberRoomDialog.close();
}

function openViberRoomLink() {
  const link = String(els.viberRoomLink?.value || getCurrentProject()?.viberRoomLink || "").trim();
  if (!link) {
    showAppMessage("No Viber room link saved yet.", "warning", "Viber Room");
    return;
  }
  window.open(link, "_blank", "noopener,noreferrer");
}

function saveViberRoomSettings() {
  const project = getCurrentProject();
  if (!project) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can configure project Viber room.")) return;
  project.projectRoomMode = String(els.projectRoomMode?.value || "chat");
  project.viberRoomStatus = String(els.viberRoomStatus?.value || "not_created");
  project.viberRoomLink = String(els.viberRoomLink?.value || "").trim();
  project.viberRoomId = String(els.viberRoomId?.value || "").trim();
  logAudit("Project Viber Room Updated", {
    objectType: "project",
    objectName: getProjectDisplayName(project),
    projectId: project.id,
    projectName: project.name || "Untitled project",
  });
  persist();
  renderViberRoomButton(project);
  closeViberRoomDialog();
  showAppMessage("Viber room settings saved for this project.", "success", "Viber Room");
}

function openMentionNotification(notificationId) {
  const accountNotification = (state.userNotifications || []).find((entry) => entry.id === notificationId);
  if (accountNotification) {
    accountNotification.readAt = accountNotification.readAt || new Date().toISOString();
    els.notificationsPanel?.classList.add("hidden");
    persist();
    renderNotificationsPanel();
    return;
  }
  const project = getCurrentProject();
  const notification = (project?.mentionNotifications || []).find((entry) => entry.id === notificationId);
  if (!project || !notification) return;
  notification.readAt = notification.readAt || new Date().toISOString();
  els.notificationsPanel?.classList.add("hidden");
  if (notification.itemType === "chat" && notification.channelId) {
    currentWorkspaceTab = "folders-hub";
    currentProjectDetailsTab = "chat";
    selectProjectChatChannel(notification.channelId, project);
    persist();
    renderWorkspace();
    requestAnimationFrame(() => {
      const node = document.querySelector(`.project-chat-message[data-message-id="${notification.messageId}"]`);
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return;
  }
  const location = findItemLocation(notification.itemId);
  if (!location) {
    persist();
    renderWorkspace();
    return;
  }
  const detailsFolder = getProjectDetailsFolder(project);
  if (location.parent?.id === detailsFolder?.id) {
    currentWorkspaceTab = "folders-hub";
    currentProjectDetailsTab = "plan";
  } else if ((project.areas || []).some((area) => area.id === location.parent?.id)) {
    currentWorkspaceTab = "folders-hub";
    currentProjectDetailsTab = "areas";
    selectedProjectAreaId = location.parent.id;
  } else {
    currentWorkspaceTab = `folder:${location.parent?.id || ""}`;
    project.selectedFolderId = location.parent?.id || null;
    if (["note", "file", "photo", "task"].includes(location.item.type)) currentContentTab = location.item.type;
  }
  persist();
  renderWorkspace();
  requestAnimationFrame(() => {
    const card = document.querySelector(`.item-card[data-item-id="${notification.itemId}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function hideMentionSuggest() {
  mentionSuggestState = null;
  els.mentionSuggest?.classList.add("hidden");
  if (els.mentionSuggest) {
    els.mentionSuggest.innerHTML = "";
    if (els.mentionSuggest.open) els.mentionSuggest.close();
  }
}

function attachMentionAutocomplete(field, projectProvider = () => getCurrentProject()) {
  return;
}

function updateMentionSuggest(field, projectProvider = () => getCurrentProject()) {
  hideMentionSuggest();
}

function insertMentionIntoField(field, handle) {
  return;
}

function formatFileSize(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(value >= 10 * 1024 ? 0 : 1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function getMemberInitials(member) {
  const parts = [member?.name, member?.surname].filter(Boolean);
  const initials = parts.map((part) => String(part).trim().charAt(0).toUpperCase()).join("").slice(0, 2);
  return initials || String(member?.email || "?").trim().charAt(0).toUpperCase() || "?";
}

function buildDirectChatChannelId(userAId, userBId) {
  const ids = [userAId, userBId].filter(Boolean).sort();
  return ids.length === 2 ? `direct:${ids.join(":")}` : "";
}

function getVisibleProjectChatUsers(project = getCurrentProject()) {
  if (!project) return [];
  const selectedTeamIds = new Set(getProjectTeamFilterIds(project));
  const visibleUsers = getProjectUsers(project).filter((user) => user.status !== "archived");
  if (!selectedTeamIds.size) return visibleUsers;
  return visibleUsers.filter((user) => {
    if (user.id === project.projectManagerUserId || user.id === state.currentUserId) return true;
    return getTeamIdsForUser(project, user.id).some((teamId) => selectedTeamIds.has(teamId));
  });
}

function getProjectChatChannels(project = getCurrentProject()) {
  if (!project) return [];
  const currentUserId = state.currentUserId || "";
  const visibleUsers = getVisibleProjectChatUsers(project);
  const visibleTeams = getAllActiveProjectTeams(project).filter((team) => teamMatchesSelectedTeams(team, project));
  const channels = [
    {
      id: "project:general",
      type: "project",
      title: "Project Room",
      subtitle: `${visibleUsers.length} member(s)`,
      memberIds: visibleUsers.map((user) => user.id),
      color: PRIMARY_TAB_COLORS["folders-hub"],
    },
    ...visibleTeams.map((team) => ({
      id: `team:${team.id}`,
      type: "team",
      teamId: team.id,
      title: team.name,
      subtitle: `${(team.memberIds || []).length} member(s)`,
      memberIds: (team.memberIds || []).filter((memberId) => visibleUsers.some((user) => user.id === memberId)),
      color: team.tabColor || CONTENT_TAB_COLORS.chat,
    })),
  ];

  if (currentUserId) {
    for (const user of visibleUsers) {
      if (user.id === currentUserId) continue;
      const channelId = buildDirectChatChannelId(currentUserId, user.id);
      if (!channelId) continue;
      channels.push({
        id: channelId,
        type: "direct",
        userId: user.id,
        title: getMemberDisplayName(user),
        subtitle: ROLE_LABELS[user.role] || "Member",
        memberIds: [currentUserId, user.id],
        color: CONTENT_TAB_COLORS.chat,
      });
    }
  }

  return channels.filter((channel, index, list) => list.findIndex((entry) => entry.id === channel.id) === index);
}

function ensureValidProjectChatChannel(project = getCurrentProject()) {
  const channels = getProjectChatChannels(project);
  if (!channels.length) {
    if (project) project.selectedChatChannelId = "";
    return { channels, channel: null };
  }
  const selected = channels.find((entry) => entry.id === project?.selectedChatChannelId) || channels[0];
  if (project) project.selectedChatChannelId = selected.id;
  return { channels, channel: selected };
}

function selectProjectChatChannel(channelId, project = getCurrentProject()) {
  if (!project) return;
  const channels = getProjectChatChannels(project);
  if (!channels.some((entry) => entry.id === channelId)) return;
  project.selectedChatChannelId = channelId;
  persist();
  renderWorkspace();
}

function getProjectChatMessages(project = getCurrentProject(), channelId = "") {
  return (project?.chatMessages || [])
    .filter((message) => !channelId || message.channelId === channelId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function createChatAttachmentFromFile(file) {
  const dataUrl = await readAsDataUrl(file);
  return {
    id: crypto.randomUUID(),
    name: file?.name || "Attachment",
    mimeType: file?.type || "application/octet-stream",
    size: Number(file?.size) || 0,
    dataUrl,
    isImage: String(file?.type || "").toLowerCase().startsWith("image/"),
  };
}

function buildChatAttachmentGalleryEntries(messages = [], channelTitle = "") {
  const entries = [];
  for (const message of messages) {
    const sender = getUserById(message.createdByUserId);
    const senderLabel = sender ? getMemberDisplayName(sender) : "Team member";
    const createdLabel = message.createdAt ? new Date(message.createdAt).toLocaleString() : "";
    for (const attachment of message.attachments || []) {
      if (!attachment.isImage || !attachment.dataUrl) continue;
      entries.push({
        key: `chat:${message.id}:${attachment.id}`,
        src: attachment.dataUrl,
        title: attachment.name || "Chat image",
        meta: [channelTitle, senderLabel, createdLabel].filter(Boolean).join(" | "),
      });
    }
  }
  return entries;
}

function isUserRole() {
  return getCurrentRole() === "user";
}

function setUserDefaultWorkspace(project = getCurrentProject()) {
  if (!project || !isUserRole()) return;
  currentWorkspaceTab = "folders-hub";
  currentContentTab = "note";
  currentProjectDetailsTab = "plan";
}

function isUserInvolvedInTeam(team) {
  return Boolean(team?.memberIds?.includes(state.currentUserId));
}

function getAllActiveProjectTeams(project = getCurrentProject()) {
  return (project?.folders || []).filter((team) => !team.archivedAt);
}

function getProjectTeamFilterIds(project = getCurrentProject()) {
  if (!project) return [];
  const activeTeamIds = getAllActiveProjectTeams(project).map((team) => team.id);
  const validTeamIds = new Set(activeTeamIds);
  project.selectedTeamFilterIds = (project.selectedTeamFilterIds || []).filter((teamId) => validTeamIds.has(teamId));
  if (!project.selectedTeamFiltersInitialized) {
    project.selectedTeamFilterIds = [...activeTeamIds];
    project.selectedTeamFiltersInitialized = true;
  }
  return project.selectedTeamFilterIds;
}

function hasProjectTeamFilters(project = getCurrentProject()) {
  return getProjectTeamFilterIds(project).length > 0;
}

function getTeamIdsForUser(project, userId) {
  return getAllActiveProjectTeams(project)
    .filter((team) => (team.memberIds || []).includes(userId))
    .map((team) => team.id);
}

function itemMatchesSelectedTeams(item, project = getCurrentProject(), contextTeamId = "") {
  const selectedTeamIds = getProjectTeamFilterIds(project);
  if (!selectedTeamIds.length) return true;
  const creatorTeamIds = getTeamIdsForUser(project, item.createdByUserId);
  const hasTeamRelation = Boolean(
    contextTeamId
    || (item.linkedFolderIds || []).length
    || item.assigneeId
    || creatorTeamIds.length
  );
  if (!hasTeamRelation) return true;
  if (contextTeamId && selectedTeamIds.includes(contextTeamId)) return true;
  if ((item.linkedFolderIds || []).some((teamId) => selectedTeamIds.includes(teamId))) return true;
  if (item.assigneeId && selectedTeamIds.includes(item.assigneeId)) return true;
  return creatorTeamIds.some((teamId) => selectedTeamIds.includes(teamId));
}

function areaMatchesSelectedTeams(area, project = getCurrentProject()) {
  const selectedTeamIds = getProjectTeamFilterIds(project);
  if (!selectedTeamIds.length) return true;
  const hasLinkedTeams = Boolean((area.teamIds || []).length);
  const hasTeamRelatedItems = (area.items || []).some((item) => {
    const creatorTeamIds = getTeamIdsForUser(project, item.createdByUserId);
    return Boolean((item.linkedFolderIds || []).length || item.assigneeId || creatorTeamIds.length);
  });
  if (!hasLinkedTeams && !hasTeamRelatedItems) return true;
  if ((area.teamIds || []).some((teamId) => selectedTeamIds.includes(teamId))) return true;
  return (area.items || []).some((item) => itemMatchesSelectedTeams(item, project));
}

function teamMatchesSelectedTeams(team, project = getCurrentProject()) {
  const selectedTeamIds = getProjectTeamFilterIds(project);
  if (!selectedTeamIds.length) return true;
  return selectedTeamIds.includes(team.id);
}

function toggleProjectTeamFilter(teamId, checked, project = getCurrentProject()) {
  if (!project) return;
  const nextIds = new Set(getProjectTeamFilterIds(project));
  if (checked) nextIds.add(teamId);
  else nextIds.delete(teamId);
  project.selectedTeamFilterIds = [...nextIds];
  persist();
  renderWorkspace();
}

function getVisibleServiceTeams(project = getCurrentProject()) {
  const teams = (project?.folders || []).filter((team) => !team.archivedAt);
  if (!isUserRole() || showOtherTeamsForUser) return teams;
  return teams.filter((team) => isUserInvolvedInTeam(team));
}

function getHiddenServiceTeams(project = getCurrentProject()) {
  const teams = (project?.folders || []).filter((team) => !team.archivedAt);
  if (!isUserRole()) return [];
  return teams.filter((team) => !isUserInvolvedInTeam(team));
}

function getUserTeamIdsForProject(project = getCurrentProject()) {
  return (project?.folders || [])
    .filter((team) => !team.archivedAt && isUserInvolvedInTeam(team))
    .map((team) => team.id);
}

function populateTaskLinks() {
  const project = getCurrentProject();
  const selectedFolder = getSelectedFolder();
  els.taskFolderLinks.innerHTML = "";
  els.taskPhotoLinks.innerHTML = "";
  const otherFolders = getAllProjectFolders(project).filter((folder) => folder.id !== selectedFolder?.id && !folder.archivedAt);
  if (!otherFolders.length) {
    els.taskFolderLinks.innerHTML = `<p class="muted">No other Service Team entries available.</p>`;
  } else {
    for (const folder of otherFolders) els.taskFolderLinks.append(createCheckRow("task-folder-link", folder.id, folder.name, `${folder.items.length} items`));
  }
  const photos = collectProjectPhotos(project).filter((photo) => !photo.archivedAt);
  if (!photos.length) {
    els.taskPhotoLinks.innerHTML = `<p class="muted">No pictures available yet.</p>`;
  } else {
    for (const photo of photos) els.taskPhotoLinks.append(createCheckRow("task-photo-link", photo.id, photo.title, photo.folderName));
  }
}

function createCheckRow(name, value, title, subtitle, options = {}) {
  const label = document.createElement("label");
  label.className = "check-row";
  const metaHtml = options.metaHtml || "";
  label.innerHTML = `
    <input type="checkbox" name="${name}" value="${value}">
    <div class="check-row-copy">
      <div class="check-row-titleline">
        <strong>${escapeHtml(title)}</strong>
        ${metaHtml}
      </div>
      <div class="muted">${escapeHtml(subtitle || "")}</div>
    </div>
  `;
  return label;
}

function collectProjectPhotos(project) {
  const photos = [];
  for (const folder of getAllProjectFolders(project)) {
    for (const item of folder.items) {
      if (item.type === "photo") photos.push({ ...item, folderName: folder.name });
    }
  }
  for (const area of project?.areas || []) {
    for (const item of area.items || []) {
      if (item.type === "photo") photos.push({ ...item, folderName: area.name });
    }
  }
  return photos;
}

function getAllProjectFolders(project = getCurrentProject()) {
  if (!project) return [];
  return [getProjectDetailsFolder(project), ...(project.folders || [])].filter(Boolean);
}

function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((entry) => entry.value);
}

function render() {
  closeActiveCardMenu();
  const project = getCurrentProject();
  if (project) ensureProjectFolderColors(project);
  if (!selectedClientId && state.clients.length) {
    selectedClientId = state.clients[0].id;
  }
  applyThemeSettings();
  populateCurrentUserSelect();
  renderAccessBanner();
  renderBookmarkNav();
  renderThemeSettings();
  renderDriveSyncSettings();
  populateProjectManagerSelect(project);
  if (project) {
    setProjectSurfaceColor(project.surfaceColor || "#fffaf2");
    hydrateProjectForm(project);
    populateClientSelects(project.clientId);
    updateProjectSaveButtonState(project);
    if (els.projectName) els.projectName.disabled = !canManageProject(project);
    if (els.projectManagerUser) els.projectManagerUser.disabled = !canManageProject(project);
    if (els.projectClientSelect) els.projectClientSelect.disabled = !canManageProject(project);
    rememberFormSnapshot("project", els.projectForm);
  } else {
    setProjectSurfaceColor("#fffaf2");
    populateClientSelects("");
    els.projectForm?.reset();
    updateProjectSaveButtonState(null);
    if (els.projectName) els.projectName.disabled = true;
    if (els.projectManagerUser) els.projectManagerUser.disabled = !getActiveUsers().length;
    if (els.projectClientSelect) els.projectClientSelect.disabled = true;
    rememberFormSnapshot("project", els.projectForm);
  }
  renderViews();
  renderProjectRailControls();
  renderProjects();
  renderPlanner();
  renderDailyWorks();
  renderClients();
  renderMembers();
  renderEquipment();
  renderAuditLog();
  if (project) {
    renderWorkspace();
  } else {
    renderEmptyWorkspace();
  }
  renderAreaBrowserDialog();
  renderImagePreviewState();
  renderProjectSetupState();
  renderMobileProjectsLayout();
  renderServiceTeamDialogState();
  applyPendingItemFocus();
  applyLanguageToDocument();
}

function applyPendingItemFocus() {
  if (!pendingFocusedItemId) return;
  const itemId = pendingFocusedItemId;
  pendingFocusedItemId = "";
  requestAnimationFrame(() => {
    const target = document.querySelector(`[data-item-id="${itemId}"]`);
    if (!(target instanceof HTMLElement)) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("item-focus-flash");
    window.setTimeout(() => target.classList.remove("item-focus-flash"), 1800);
  });
}

function renderEmptyWorkspace() {
  els.workspaceTitle.textContent = "Create your first project";
  els.workspaceSubtitle.textContent = "Start with Team Members, create the first admin or manager, then add the first project.";
  if (els.workspaceContext) els.workspaceContext.textContent = "Project and client details will appear here.";
  els.projectMetaBar.innerHTML = `<span class="meta-pill">Empty start</span>`;
  renderViberRoomButton(null);
  els.projectTeamInfoBar?.classList.add("hidden");
  if (els.projectTeamInfoBar) els.projectTeamInfoBar.innerHTML = "";
  els.workspaceTabsShell?.classList.remove("draft-locked");
  els.workspaceTabsShell?.classList.remove("archived-visible-state");
  els.workspaceLockOverlay?.classList.add("hidden");
  els.folderActionBar?.classList.remove("archived-visible-state");
  els.sectionViewToggle?.classList.add("hidden");
  els.folderDetail?.classList.remove("archived-visible-state");
  els.folderSummary?.classList.remove("archived-visible-state");
  els.toggleArchivedBtn?.classList.remove("archived-visible-state");
  els.folderTabList.innerHTML = "";
  els.foldersHubTab.classList.add("active");
  els.addFolderTabBtn?.classList.add("hidden");
  els.folderActionBar.classList.add("hidden");
  els.folderSummary.classList.add("hidden");
  els.folderDetail.classList.add("hidden");
  els.notificationsPanel?.classList.add("hidden");
  if (els.notificationsCount) {
    els.notificationsCount.textContent = "0";
    els.notificationsCount.classList.add("hidden");
  }
  if (els.notificationsList) els.notificationsList.innerHTML = `<p class="muted">No notifications.</p>`;
  els.folderEmptyState.classList.remove("hidden");
  els.folderEmptyState.innerHTML = `<h3>No project yet</h3><p>Create the first user in Team Members, then add a project from the Active Projects panel.</p>`;
}

function toggleProjectSetup() {
  isProjectSetupExpanded = !isProjectSetupExpanded;
  renderProjectSetupState();
}

function closeProjectSetup() {
  const project = getCurrentProject();
  const shouldClose = project?.isDraft
    ? confirmDiscardAndMaybeDeleteDraft(["project"])
    : confirmDiscardUnsavedChanges(["project"]);
  if (!shouldClose) return;
  isProjectSetupDialogOpen = false;
  render();
}

function renderProjectSetupState() {
  const shouldHideSetup = Boolean(getCurrentUser()) && getCurrentRole() === "user";
  const canEditProject = canManageProject(getCurrentProject());
  const draftLocked = isDraftProjectLocked();
  els.projectSetupPanel?.classList.toggle("hidden", shouldHideSetup || !isProjectSetupDialogOpen);
  els.projectSetupPanel?.classList.toggle("popup-shell-open", Boolean(!shouldHideSetup && isProjectSetupDialogOpen));
  els.projectSetupAdvanced?.classList.toggle("hidden", shouldHideSetup || !isProjectSetupDialogOpen || !isProjectSetupExpanded);
  els.projectSetupAdvanced?.classList.toggle("draft-locked", draftLocked);
  els.projectSetupLock?.classList.toggle("hidden", shouldHideSetup || !isProjectSetupDialogOpen || !isProjectSetupExpanded || !draftLocked);
  els.projectSetupAdvanced?.querySelectorAll("input, select, textarea, button").forEach((field) => {
    if (field === els.projectSetupLock) return;
    field.disabled = !canEditProject || draftLocked;
  });
  if (els.projectSetupToggle) {
    els.projectSetupToggle.classList.toggle("expanded", isProjectSetupExpanded);
    els.projectSetupToggle.setAttribute("aria-expanded", String(isProjectSetupExpanded));
    els.projectSetupToggle.setAttribute("aria-label", isProjectSetupExpanded ? "Collapse project setup" : "Expand project setup");
  }
  if (els.createProjectBtn) {
    els.createProjectBtn.textContent = "+";
    els.createProjectBtn.title = isProjectSetupDialogOpen ? "Close project popup" : "Add project";
    els.createProjectBtn.setAttribute("aria-label", isProjectSetupDialogOpen ? "Close project popup" : "Add new project");
    els.createProjectBtn.classList.toggle("active", isProjectSetupDialogOpen);
  }
}

function renderViews() {
  if (currentView !== "equipment") {
    isEquipmentFormExpanded = false;
    resetEquipmentForm();
  }
  const userMode = isUserRole() && Boolean(getCurrentUser());
  const views = {
    projects: els.projectsView,
    planner: els.plannerView,
    "daily-works": els.dailyWorksView,
    teams: els.teamsView,
    equipment: els.equipmentView,
    clients: els.clientsView,
    theme: els.themeView,
    audit: els.auditView,
  };

  for (const [name, element] of Object.entries(views)) {
    element.classList.toggle("hidden", name !== currentView);
    element.classList.toggle("active", name === currentView);
  }

  for (const button of els.viewButtons) {
    const isAuditButton = button.dataset.view === "audit";
    button.classList.toggle("active", button.dataset.view === currentView);
    button.disabled = isAuditButton && !isAdmin();
  }

  els.sidebar?.classList.toggle("hidden", userMode);
  els.userQuickNav?.classList.toggle("hidden", !userMode);
  els.userProjectsBtn?.classList.toggle("active", userMode && currentView === "projects");
  els.userAssignedTasksBtn?.classList.remove("active");
  els.projectsPageRail?.classList.remove("hidden");
  els.projectsWorkspaceColumn?.classList.remove("user-assigned-tasks-mode");

  els.appShell?.classList.remove("view-projects", "view-planner", "view-daily-works", "view-teams", "view-equipment", "view-clients", "view-theme", "view-audit");
  els.appShell?.classList.add(`view-${currentView}`);
  els.appShell?.classList.toggle("user-mode", userMode);
  syncMobileGlobalSearchUi();
  syncMobileBottomNav();
}

function syncMobileBottomNav() {
  const bottomButtons = Array.from(document.querySelectorAll(".mobile-bottom-btn[data-view]"));
  if (!bottomButtons.length) return;
  for (const btn of bottomButtons) {
    btn.classList.toggle("active", btn.dataset.view === currentView);
  }
}

function renderProjectRailControls() {
  const showProjectsRail = currentView === "projects";
  const allowCollapsedRail = showProjectsRail && !isMobileProjectViewport() && isProjectsRailCollapsed;
  els.projectsPageLayout?.classList.toggle("projects-rail-collapsed", allowCollapsedRail);
  els.projectsPageRail?.classList.toggle("is-collapsed", allowCollapsedRail);
  els.projectRailBackBtn && (els.projectRailBackBtn.disabled = false);
  els.projectRailUndoBtn && (els.projectRailUndoBtn.disabled = navigationHistory.length === 0);
  els.projectRailRedoBtn && (els.projectRailRedoBtn.disabled = navigationFuture.length === 0);
  els.projectRailHomeBtn && (els.projectRailHomeBtn.disabled = false);
  if (els.projectRailCollapseBtn) {
    els.projectRailCollapseBtn.classList.toggle("collapsed", isProjectsRailCollapsed);
    els.projectRailCollapseBtn.setAttribute("aria-expanded", String(!isProjectsRailCollapsed));
    els.projectRailCollapseBtn.setAttribute("aria-label", isProjectsRailCollapsed ? "Expand project panels" : "Reduce project panels");
    els.projectRailCollapseBtn.title = isProjectsRailCollapsed ? "Expand project panels" : "Reduce project panels";
  }
}

function renderMobileProjectsLayout() {
  const isMobileLayout = currentView === "projects" && isMobileProjectViewport();
  const pane = getActiveMobileProjectsPane();
  els.projectsPageLayout?.classList.toggle("mobile-projects-mode", isMobileLayout);
  els.projectsPageLayout?.classList.toggle("mobile-projects-list", isMobileLayout && pane === "list");
  els.projectsPageLayout?.classList.toggle("mobile-projects-detail", isMobileLayout && pane === "detail");
  els.workspaceBackButton?.classList.toggle("hidden", !(isMobileLayout && pane === "detail"));
}

function renderBookmarkNav() {
  if (!els.bookmarkNav) return;
  const buttonsByView = new Map(els.viewButtons.map((button) => [button.dataset.view, button]));
  for (const view of getCurrentNavViewOrder()) {
    const button = buttonsByView.get(view);
    if (!button) continue;
    button.draggable = true;
    button.classList.remove("is-drop-target", "is-dragging");
    els.bookmarkNav.append(button);
  }
}

function getThemePaletteById(id) {
  return THEME_PALETTES.find((palette) => palette.id === id) || THEME_PALETTES[0];
}

function getThemeFontById(id) {
  return FONT_OPTIONS.find((font) => font.id === id) || FONT_OPTIONS[0];
}

function getThemeFontSizeById(id) {
  return FONT_SIZE_OPTIONS.find((size) => size.id === id) || FONT_SIZE_OPTIONS[2];
}

function applyThemeSettings() {
  const settings = normalizeThemeSettings(state.themeSettings);
  state.themeSettings = settings;
  const palette = getThemePaletteById(settings.paletteId);
  const font = getThemeFontById(settings.fontId);
  const fontSize = getThemeFontSizeById(settings.fontSizeId);
  const root = document.documentElement;
  root.style.setProperty("--bg", palette.bg);
  root.style.setProperty("--panel", palette.panel);
  root.style.setProperty("--panel-strong", palette.panelStrong);
  root.style.setProperty("--rail-surface", palette.railSurface);
  root.style.setProperty("--rail-line", palette.line);
  root.style.setProperty("--workspace-surface", palette.workspaceSurface);
  root.style.setProperty("--workspace-soft", palette.workspaceSoft);
  root.style.setProperty("--workspace-frame", palette.workspaceFrame);
  root.style.setProperty("--project-nav-surface", palette.workspaceSurface);
  root.style.setProperty("--project-nav-soft", palette.workspaceSoft);
  root.style.setProperty("--project-nav-frame", palette.workspaceFrame);
  root.style.setProperty("--project-nav-card", "rgba(255, 255, 255, 0.16)");
  root.style.setProperty("--project-nav-card-strong", "rgba(255, 255, 255, 0.26)");
  root.style.setProperty("--project-setup-surface", palette.workspaceSurface);
  root.style.setProperty("--project-setup-soft", palette.workspaceSoft);
  root.style.setProperty("--project-setup-frame", palette.workspaceFrame);
  root.style.setProperty("--project-setup-card", palette.panelStrong);
  root.style.setProperty("--ink", palette.ink);
  root.style.setProperty("--muted", palette.muted);
  root.style.setProperty("--line", palette.line);
  root.style.setProperty("--accent", palette.accent);
  root.style.setProperty("--accent-strong", palette.accentStrong);
  root.style.setProperty("--accent-soft", palette.accentSoft);
  root.style.setProperty("--app-font-family", font.value);
  root.style.setProperty("--app-font-size", fontSize.value);
  document.body.style.background = palette.bodyBackground;
}

function renderThemeSettings() {
  if (els.themeFontFamily) {
    els.themeFontFamily.innerHTML = FONT_OPTIONS.map((font) => `<option value="${font.id}">${escapeHtml(font.label)}</option>`).join("");
  }
  if (els.themeFontSize) {
    els.themeFontSize.innerHTML = FONT_SIZE_OPTIONS.map((size) => `<option value="${size.id}">${escapeHtml(size.label)}</option>`).join("");
  }
  const settings = normalizeThemeSettings(state.themeSettings);
  if (els.themeFontFamily) els.themeFontFamily.value = settings.fontId;
  if (els.themeFontSize) els.themeFontSize.value = settings.fontSizeId;
  if (els.themePaletteList) {
    els.themePaletteList.innerHTML = "";
    for (const palette of THEME_PALETTES) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `theme-palette-card${palette.id === settings.paletteId ? " active" : ""}`;
      button.innerHTML = `
        <div class="theme-palette-swatch">
          <span style="background:${palette.bg}"></span>
          <span style="background:${palette.panelStrong}"></span>
          <span style="background:${palette.accent}"></span>
          <span style="background:${palette.workspaceSoft}"></span>
        </div>
        <strong>${escapeHtml(palette.name)}</strong>
      `;
      button.addEventListener("click", () => updateThemeSettings({ paletteId: palette.id }));
      els.themePaletteList.append(button);
    }
  }
  if (els.themePreviewCard) {
    const palette = getThemePaletteById(settings.paletteId);
    const font = getThemeFontById(settings.fontId);
    const fontSize = getThemeFontSizeById(settings.fontSizeId);
    els.themePreviewCard.style.setProperty("border-color", palette.workspaceFrame);
    els.themePreviewCard.style.setProperty("background", `linear-gradient(180deg, ${palette.panelStrong} 0%, ${palette.panel} 100%)`);
    const pills = els.themePreviewCard.querySelectorAll(".meta-pill");
    if (pills[0]) pills[0].textContent = palette.name;
    if (pills[1]) pills[1].textContent = font.label;
    if (pills[2]) pills[2].textContent = fontSize.label;
  }
}

function renderDriveSyncSettings() {
  if (!els.driveSyncForm) return;
  const settings = normalizeDriveSyncSettings(state.driveSyncSettings);
  state.driveSyncSettings = settings;

  if (els.driveSyncTime1 && els.driveSyncTime1.options.length === 0) {
    els.driveSyncTime1.innerHTML = DRIVE_SYNC_TIME_OPTIONS.map((time) => `<option value="${time}">${time}</option>`).join("");
  }
  if (els.driveSyncTime2 && els.driveSyncTime2.options.length === 0) {
    els.driveSyncTime2.innerHTML = DRIVE_SYNC_TIME_OPTIONS.map((time) => `<option value="${time}">${time}</option>`).join("");
  }

  if (els.driveSyncEnabled) els.driveSyncEnabled.checked = settings.enabled;
  if (els.driveSyncTimezone) {
    els.driveSyncTimezone.placeholder = getDefaultTimezone();
    els.driveSyncTimezone.value = settings.timezone;
  }
  if (els.driveSyncTime1) els.driveSyncTime1.value = settings.time1;
  if (els.driveSyncTime2) els.driveSyncTime2.value = settings.time2;
}

function onDriveSyncSettingsSave(event) {
  event.preventDefault();
  const timezone = String(els.driveSyncTimezone?.value || "").trim() || getDefaultTimezone();
  if (!isValidTimezone(timezone)) {
    showAppMessage("Please enter a valid timezone, for example Europe/Vienna.", "warning", "Settings");
    return;
  }
  state.driveSyncSettings = normalizeDriveSyncSettings({
    enabled: Boolean(els.driveSyncEnabled?.checked),
    timezone,
    time1: els.driveSyncTime1?.value,
    time2: els.driveSyncTime2?.value,
  });
  plannerAnchorDate = todayInputValue();
  dailyWorksAnchorDate = todayInputValue();
  persist();
  showAppMessage("Timezone and Drive sync settings saved.", "success", "Settings");
  renderDriveSyncSettings();
  render();
}

function updateThemeSettings(partial) {
  state.themeSettings = normalizeThemeSettings({ ...state.themeSettings, ...partial });
  applyThemeSettings();
  persist();
  renderThemeSettings();
}

function onThemeFontFamilyChange() {
  if (!els.themeFontFamily) return;
  updateThemeSettings({ fontId: els.themeFontFamily.value });
}

function onThemeFontSizeChange() {
  if (!els.themeFontSize) return;
  updateThemeSettings({ fontSizeId: els.themeFontSize.value });
}

function getMobileSearchBindingForView(view) {
  switch (view) {
    case "projects":
      return { input: els.projectSearchInput, placeholder: "Search projects" };
    case "clients":
      return { input: els.clientSearchInput, placeholder: "Search clients" };
    case "teams":
      return { input: els.memberSearchInput, placeholder: "Search team members" };
    case "equipment":
      return { input: els.equipmentSearchInput, placeholder: "Search equipment" };
    case "audit":
      return { input: els.auditSearchInput, placeholder: "Search audit log" };
    default:
      return { input: null, placeholder: "Search" };
  }
}

function syncMobileGlobalSearchUi() {
  if (!els.mobileGlobalSearch) return;
  const binding = getMobileSearchBindingForView(currentView);
  els.mobileGlobalSearch.placeholder = binding.placeholder || "Search";
  const targetValue = String(binding.input?.value || "").trim();
  if (els.mobileGlobalSearch.value !== targetValue) els.mobileGlobalSearch.value = targetValue;
  els.mobileGlobalSearch.disabled = !binding.input;
}

function onMobileGlobalSearchInput() {
  if (!els.mobileGlobalSearch) return;
  const binding = getMobileSearchBindingForView(currentView);
  if (!binding.input) return;
  binding.input.value = els.mobileGlobalSearch.value;
  binding.input.dispatchEvent(new Event("input", { bubbles: true }));
}

function toggleMobileHeroHeader() {
  if (!els.workspaceHero) return;
  els.workspaceHero.classList.toggle("is-expanded");
}

function hydrateProjectForm(project) {
  els.projectName.value = project.name;
  els.projectStartDate.value = project.startDate;
  els.projectEndDate.value = project.endDate;
  setProjectSurfaceColor(project.surfaceColor || "#fffaf2");
  els.projectLifecycle.value = project.lifecycle || "active";
  if (els.projectManagerUser) els.projectManagerUser.value = project.projectManagerUserId || "";
}

function populateClientSelects(selectedClientId) {
  const options = ['<option value="">Select client</option>']
    .concat(state.clients.filter((client) => !client.archivedAt).map((client) => `<option value="${client.id}">${escapeHtml(formatClientName(client))}</option>`))
    .join("");
  els.projectClientSelect.innerHTML = options;
  if (els.workspaceClientDropdown) els.workspaceClientDropdown.innerHTML = options;
  els.projectClientSelect.value = selectedClientId || "";
  if (els.workspaceClientDropdown) els.workspaceClientDropdown.value = selectedClientId || "";
}

function populateCurrentUserSelect() {
  const options = getActiveUsers().map((user) => `<option value="${user.id}">${escapeHtml(getMemberDisplayName(user))} (${ROLE_LABELS[user.role]})</option>`).join("");
  els.currentUserSelect.innerHTML = options;
  els.currentUserSelect.value = state.currentUserId || "";
  const user = getCurrentUser();
  const visibleProjects = getVisibleProjects(state, false).length;
  els.currentUserSummary.textContent = user
    ? `${ROLE_LABELS[user.role]} � ${visibleProjects} visible project${visibleProjects === 1 ? "" : "s"}`
    : "No active user selected";
}

function renderAccessBanner() {
  const currentUser = getCurrentUser();
  const visibleProjects = getVisibleProjects(state, false).length;
  const project = getCurrentProject();
  const canManage = canManageProject(project);
  const canWork = canWorkInProject(project);
  const previewSource = developerPreviewSourceUserId ? getUserById(developerPreviewSourceUserId) : null;
  const isDeveloperPreviewMode = Boolean(developerPreviewSourceUserId);

  if (!currentUser) {
    els.accessBannerTitle.textContent = "No active user";
    els.accessBannerDescription.textContent = "Create or select a user to inspect access.";
    return;
  }

  const previewOptions = getActiveUsers()
    .map((user) => `<option value="${user.id}">${escapeHtml(getMemberDisplayName(user))} (${ROLE_LABELS[user.role]})</option>`)
    .join("");
  els.accessPreviewUser.innerHTML = previewOptions;
  els.accessPreviewUser.value = state.currentUserId || "";

  els.accessBannerTitle.textContent = isDeveloperPreviewMode
    ? `Developer preview: ${getMemberDisplayName(currentUser)}`
    : `${ROLE_LABELS[currentUser.role]} access: ${getMemberDisplayName(currentUser)}`;

  const projectAccessText = project
    ? canManage
      ? `can manage "${project.name || "Untitled project"}"`
      : canWork
        ? `can work inside "${project.name || "Untitled project"}"`
        : `cannot open "${project.name || "Untitled project"}"`
    : "has no visible project selected";

  els.accessBannerDescription.textContent = isDeveloperPreviewMode
    ? `Previewing exactly what this user can see. ${projectAccessText}. Visible projects: ${visibleProjects}.${previewSource ? ` Original developer: ${getMemberDisplayName(previewSource)}.` : ""}`
    : `${ROLE_LABELS[currentUser.role]} sees ${visibleProjects} visible project${visibleProjects === 1 ? "" : "s"} and ${projectAccessText}.`;

  const developerCanPreview = isDeveloper() || isDeveloperPreviewMode;
  els.developerPreviewLabel?.classList.toggle("hidden", !developerCanPreview);
  els.accessPreviewUser.disabled = !developerCanPreview;
  els.resetAccessPreviewBtn.classList.toggle("hidden", !isDeveloperPreviewMode);
  els.resetAccessPreviewBtn.disabled = !isDeveloperPreviewMode;
}

function populateProjectManagerSelect(project) {
  if (!els.projectManagerUser) return;
  const managerOptions = ['<option value="">No project manager assigned</option>']
    .concat(getActiveUsers().filter((user) => user.role === "admin" || user.role === "manager").map((user) => `<option value="${user.id}">${escapeHtml(getMemberDisplayName(user))} (${ROLE_LABELS[user.role]})</option>`))
    .join("");
  els.projectManagerUser.innerHTML = managerOptions;
  els.projectManagerUser.value = project?.projectManagerUserId || "";
}

function renderProjects() {
  const visibleProjects = getVisibleProjects(state, false);
  const baseProjects = showAssignedProjectsOnly
    ? visibleProjects.filter((project) => isAssignedToProject(project, state.currentUserId))
    : visibleProjects;
  const searchActive = Boolean(projectSearchQuery);
  const filteredProjects = baseProjects.filter((project) => projectMatchesSearch(project, projectSearchQuery));
  const allActiveProjects = filteredProjects.filter((project) => project.lifecycle !== "completed");
  const completedProjects = getCurrentRole() === "user"
    ? []
    : visibleProjects
      .filter((project) => project.lifecycle === "completed")
      .filter((project) => projectMatchesSearch(project, projectSearchQuery));
  const archivedProjects = getCurrentRole() === "user"
    ? []
    : getVisibleProjects(state, true)
      .filter((project) => project.archivedAt)
      .filter((project) => projectMatchesSearch(project, projectSearchQuery));
  const mobileListMode = getActiveMobileProjectsPane() === "list";
  syncArchivedProjectSelection(archivedProjects);
  if (els.projectSearchInput && els.projectSearchInput.value !== projectSearchQuery) {
    els.projectSearchInput.value = projectSearchQuery;
  }
  els.projectSearchClearBtn?.classList.toggle("hidden", !projectSearchQuery);
  renderProjectBucket(
    els.projectList,
    allActiveProjects,
    searchActive ? `No active projects match "${projectSearchQuery}".` : "No active projects yet.",
    searchActive || areActiveProjectsExpanded,
    els.toggleActiveProjectsBtn,
    allActiveProjects.length
  );
  if (els.createProjectBtn) {
    const canCreateProject = hasPermission("createProject");
    els.createProjectBtn.classList.toggle("hidden", !canCreateProject);
    els.createProjectBtn.disabled = !canCreateProject;
  }
  if (els.assignedProjectsFilterBtn) {
    els.assignedProjectsFilterBtn.checked = showAssignedProjectsOnly;
  }
  renderProjectBucket(
    els.completedProjectList,
    completedProjects,
    searchActive ? `No completed projects match "${projectSearchQuery}".` : "No completed projects yet.",
    searchActive || areCompletedProjectsExpanded,
    els.toggleCompletedProjectsBtn,
    completedProjects.length
  );
  renderProjectBucket(
    els.archivedProjectList,
    archivedProjects,
    searchActive ? `No archived projects match "${projectSearchQuery}".` : "No archived projects yet.",
    searchActive || areArchivedProjectsExpanded,
    els.toggleArchivedProjectsBtn,
    archivedProjects.length,
    {
      selectable: isAdmin(),
      selectedIds: selectedArchivedProjectIds,
      onToggleSelect: (projectId, checked) => toggleArchivedProjectSelection(projectId, checked),
    }
  );
  if (searchActive) {
    els.toggleActiveProjectsBtn?.classList.add("hidden");
    els.toggleCompletedProjectsBtn?.classList.add("hidden");
    els.toggleArchivedProjectsBtn?.classList.add("hidden");
  }
  if (els.deleteArchivedProjectsBtn) {
    const canBatchDelete = isAdmin() && archivedProjects.length > 0;
    els.deleteArchivedProjectsBtn.classList.toggle("hidden", !canBatchDelete);
    els.deleteArchivedProjectsBtn.disabled = selectedArchivedProjectIds.size === 0;
    els.deleteArchivedProjectsBtn.textContent = selectedArchivedProjectIds.size > 0
      ? `Delete Selected (${selectedArchivedProjectIds.size})`
      : "Delete Selected";
  }
  els.completedProjectList.closest(".project-list-panel")?.classList.toggle("hidden", getCurrentRole() === "user");
  els.archivedProjectList.closest(".project-list-panel")?.classList.toggle("hidden", getCurrentRole() === "user");
  els.completedProjectList.closest(".project-list-panel")?.classList.toggle("mobile-empty-secondary", mobileListMode && !searchActive && completedProjects.length === 0);
  els.archivedProjectList.closest(".project-list-panel")?.classList.toggle("mobile-empty-secondary", mobileListMode && !searchActive && archivedProjects.length === 0);
}

function collectProjectSearchValues(project) {
  const client = getClientById(project.clientId);
  const manager = getUserById(project.projectManagerUserId);
  const projectUsers = getProjectUsers(project);
  const detailsFolder = getProjectDetailsFolder(project);
  const allProjectItems = [
    ...(detailsFolder?.items || []),
    ...(project.folders || []).flatMap((folder) => folder.items || []),
    ...(project.areas || []).flatMap((area) => area.items || []),
  ];

  const clientValues = client
    ? [
        formatClientName(client),
        client.name,
        client.surname,
        client.company,
        client.uidNumber,
        client.address,
        client.email,
        client.tel,
        ...(client.responsiblePersons || []).flatMap((person) => [
          `${person.name || ""} ${person.surname || ""}`.trim(),
          person.name,
          person.surname,
          person.email,
          person.tel,
        ]),
      ]
    : [];

  const managerValues = manager
    ? [
        getMemberDisplayName(manager),
        manager.name,
        manager.surname,
        getMemberPersonalNumber(manager),
        manager.email,
        manager.tel,
      ]
    : [];

  const memberValues = projectUsers.flatMap((user) => [
    getMemberDisplayName(user),
    user.name,
    user.surname,
    getMemberPersonalNumber(user),
    user.email,
    user.tel,
    ROLE_LABELS[user.role] || user.role,
  ]);

  const areaValues = (project.areas || []).flatMap((area) => {
    const linkedTeams = (area.teamIds || [])
      .map((teamId) => project.folders?.find((team) => team.id === teamId))
      .filter(Boolean);
    return [
      area.name,
      ...linkedTeams.map((team) => team.name),
    ];
  });

  const teamValues = (project.folders || []).flatMap((team) => {
    const linkedAreas = getAreasForTeam(project, team.id);
    const teamMembers = (team.memberIds || [])
      .map((userId) => getUserById(userId))
      .filter(Boolean);
    return [
      team.name,
      ...linkedAreas.map((area) => area.name),
      ...teamMembers.flatMap((member) => [
        getMemberDisplayName(member),
        getMemberPersonalNumber(member),
        member.email,
        member.tel,
      ]),
    ];
  });

  const itemValues = allProjectItems.flatMap((item) => [
    item.title,
    item.content,
    item.notes,
    item.originalName,
    item.mimeType,
    item.source,
    item.status,
    item.assigneeName,
    item.folderName,
    item.linkedAreaName,
    item.dueDate,
    item.shortcutAreaName,
  ]);

  return [
    project.projectNumber,
    project.name,
    project.lifecycle,
    project.startDate,
    project.endDate,
    project.surfaceColor,
    ...clientValues,
    ...managerValues,
    ...memberValues,
    ...areaValues,
    ...teamValues,
    ...itemValues,
  ]
    .map((value) => normalizeSearchText(value))
    .filter(Boolean);
}

function projectMatchesSearch(project, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const values = collectProjectSearchValues(project);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const tokens = values.flatMap((value) => [value, ...splitSearchTokens(value)]);
  return terms.every((term) => tokens.some((token) => token.includes(term)));
}

function closeActiveCardMenu() {
  if (!activeCardMenu) return;
  activeCardMenu.root.classList.remove("open");
  activeCardMenu.panel.remove();
  activeCardMenu = null;
}

function positionCardMenu(trigger, panel, actionCount) {
  const rect = trigger.getBoundingClientRect();
  const panelWidth = 156;
  const estimatedHeight = Math.max(actionCount * 42 + 12, 56);
  const showBelow = window.innerHeight - rect.bottom >= estimatedHeight || rect.top < estimatedHeight + 16;
  const top = showBelow
    ? rect.bottom + 6
    : rect.top - estimatedHeight - 6;
  const left = Math.min(
    Math.max(8, rect.right - panelWidth),
    window.innerWidth - panelWidth - 8
  );
  panel.style.top = `${Math.max(8, top)}px`;
  panel.style.left = `${left}px`;
}

function createCardMenu(actions) {
  if (!actions.length) return null;
  const menu = document.createElement("div");
  menu.className = "card-menu";
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "card-menu-trigger";
  trigger.textContent = "...";
  trigger.setAttribute("aria-label", "Open menu");
  trigger.setAttribute("title", "More");
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const isSameMenu = activeCardMenu?.root === menu;
    closeActiveCardMenu();
    if (isSameMenu) return;
    const panel = document.createElement("div");
    panel.className = "card-menu-panel";
    panel.addEventListener("click", (panelEvent) => {
      panelEvent.stopPropagation();
    });
    for (const action of actions) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `card-menu-action${action.destructive ? " destructive" : ""}`;
      button.textContent = action.label;
      button.addEventListener("click", (buttonEvent) => {
        buttonEvent.preventDefault();
        buttonEvent.stopPropagation();
        closeActiveCardMenu();
        action.onClick();
      });
      panel.append(button);
    }
    document.body.append(panel);
    positionCardMenu(trigger, panel, actions.length);
    menu.classList.add("open");
    activeCardMenu = { root: menu, panel, trigger, actionCount: actions.length };
  });
  menu.append(trigger);
  return menu;
}

function attachCardMenu(card, actions) {
  if (!actions?.length) return;
  card.classList.add("menu-host");
  card.append(createCardMenu(actions));
}

function renderProjectBucket(target, projects, emptyText, expanded, toggleButton, totalCount = projects.length, options = {}) {
  const previewCount = 5;
  const {
    selectable = false,
    selectedIds = new Set(),
    onToggleSelect = null,
  } = options;
  target.innerHTML = "";
  target.classList.toggle("compact", totalCount > previewCount && !expanded);
  if (toggleButton) {
    toggleButton.classList.toggle("hidden", totalCount <= previewCount);
    toggleButton.disabled = totalCount <= previewCount;
    if (toggleButton.classList.contains("panel-expand-toggle")) {
      toggleButton.classList.toggle("expanded", expanded);
      toggleButton.setAttribute("aria-expanded", String(expanded));
      const sectionName = toggleButton.id === "toggle-archived-projects-btn"
        ? "archived projects"
        : toggleButton.id === "toggle-completed-projects-btn"
          ? "completed projects"
          : "projects";
      toggleButton.setAttribute("aria-label", `${expanded ? "Collapse" : "Expand"} ${sectionName}`);
    } else {
      toggleButton.textContent = expanded ? "Collapse" : "Expand";
    }
  }
  if (!projects.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = emptyText;
    target.append(empty);
    return;
  }
  for (const project of projects) {
    const client = getClientById(project.clientId);
    const tile = document.createElement("article");
    tile.className = `project-tile${project.id === state.selectedProjectId ? " active" : ""}${selectable ? " selectable-project-tile" : ""}${selectedIds.has(project.id) ? " selected-for-delete" : ""}`;
    const theme = buildProjectTheme(project.surfaceColor);
    tile.style.setProperty("--project-frame", theme.frame);
    tile.style.setProperty("--project-soft", theme.soft);
    const projectNumber = formatProjectNumberValue(project.projectNumber);
    tile.innerHTML = `<div class="project-meta"><strong>${projectNumber ? `<span class="project-number-badge">${escapeHtml(projectNumber)}</span>` : ""}${escapeHtml(project.name || "Untitled project")}</strong><span class="muted">Client: ${escapeHtml(client ? formatClientName(client) : "Not assigned")}</span><span class="muted">Start: ${escapeHtml(formatDateDisplay(project.startDate))}</span></div>`;
    if (selectable) {
      const selectLabel = document.createElement("label");
      selectLabel.className = "project-select-check";
      selectLabel.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selectedIds.has(project.id);
      checkbox.setAttribute("aria-label", `Select ${project.name || "project"} for delete`);
      checkbox.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      checkbox.addEventListener("change", (event) => {
        event.stopPropagation();
        onToggleSelect?.(project.id, checkbox.checked);
      });
      selectLabel.append(checkbox);
      tile.append(selectLabel);
    }
    tile.setAttribute("role", "button");
    tile.setAttribute("tabindex", "0");
    tile.addEventListener("click", () => {
      selectProject(project.id);
    });
    tile.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectProject(project.id);
    });
    const actions = [];
    if (canManageProject(project)) {
      actions.push({
        label: "Edit",
        onClick: () => {
          selectProject(project.id, false);
          currentView = "projects";
          isProjectSetupDialogOpen = true;
          isProjectSetupExpanded = true;
          if (isMobileProjectViewport()) currentMobileProjectsPane = "list";
          persist();
          render();
        },
      });
    }
      if (!project.archivedAt && hasPermission("archiveProject") && canWorkInProject(project)) {
        actions.push({
          label: "Archive",
          destructive: true,
          onClick: () => archiveProject(project.id),
        });
      }
        if (project.archivedAt && hasPermission("archiveProject")) {
          actions.push({
            label: "Unarchive",
            onClick: () => restoreProject(project.id),
          });
          if (hasPermission("deleteProject")) {
            actions.push({
              label: "Delete",
              destructive: true,
              onClick: () => permanentlyDeleteProject(project.id),
            });
          }
      }
    attachCardMenu(tile, actions);
    target.append(tile);
  }
}

function setDirectoryDetailEmpty(target, message) {
  if (!target) return;
  target.innerHTML = `<div class="directory-detail-empty">${escapeHtml(message)}</div>`;
}

function syncPanelToggleButton(button, expanded, collapseLabel, expandLabel) {
  if (!button) return;
  button.classList.toggle("expanded", expanded);
  button.setAttribute("aria-expanded", String(expanded));
  button.setAttribute("aria-label", expanded ? collapseLabel : expandLabel);
}

function applyDirectoryPanelCollapsedStates() {
  const membersPanel = document.querySelector(".member-directory-panel");
  membersPanel?.querySelector("#member-search-form")?.classList.toggle("hidden", !membersListPanelExpanded);
  membersPanel?.querySelector("#member-form-shell")?.classList.toggle("hidden", !membersListPanelExpanded || !isMemberFormExpanded);
  membersPanel?.querySelector("#member-list")?.classList.toggle("hidden", !membersListPanelExpanded);
  document.querySelector(".member-detail-panel #member-detail-card")?.classList.toggle("hidden", !membersDetailPanelExpanded);
  syncPanelToggleButton(els.toggleMembersListPanelBtn, membersListPanelExpanded, "Collapse members list", "Expand members list");
  syncPanelToggleButton(els.toggleMembersDetailPanelBtn, membersDetailPanelExpanded, "Collapse member details", "Expand member details");

  const clientsPanel = document.querySelector(".client-directory-panel");
  clientsPanel?.querySelector("#client-search-form")?.classList.toggle("hidden", !clientsListPanelExpanded);
  clientsPanel?.querySelector("#client-form-shell")?.classList.toggle("hidden", !clientsListPanelExpanded || !isClientFormExpanded);
  clientsPanel?.querySelector("#client-list")?.classList.toggle("hidden", !clientsListPanelExpanded);
  document.querySelector(".client-detail-panel #client-detail-card")?.classList.toggle("hidden", !clientsDetailPanelExpanded);
  syncPanelToggleButton(els.toggleClientsListPanelBtn, clientsListPanelExpanded, "Collapse clients list", "Expand clients list");
  syncPanelToggleButton(els.toggleClientsDetailPanelBtn, clientsDetailPanelExpanded, "Collapse client details", "Expand client details");

  const equipmentPanel = document.querySelector(".equipment-directory-panel");
  equipmentPanel?.querySelector(".equipment-categories-inline")?.classList.toggle("hidden", !equipmentListPanelExpanded);
  equipmentPanel?.querySelector("#equipment-form-shell")?.classList.toggle("hidden", !equipmentListPanelExpanded || !isEquipmentFormExpanded);
  equipmentPanel?.querySelector("#equipment-list")?.classList.toggle("hidden", !equipmentListPanelExpanded);
  document.querySelector(".equipment-detail-panel #equipment-detail-card")?.classList.toggle("hidden", !equipmentDetailPanelExpanded);
  syncPanelToggleButton(els.toggleEquipmentListPanelBtn, equipmentListPanelExpanded, "Collapse equipment list", "Expand equipment list");
  syncPanelToggleButton(els.toggleEquipmentDetailPanelBtn, equipmentDetailPanelExpanded, "Collapse equipment details", "Expand equipment details");
}

function renderClientDetail(client) {
  if (!els.clientDetailCard) return;
  if (!client) {
    setDirectoryDetailEmpty(els.clientDetailCard, "Select a client on the left to open the details.");
    return;
  }
  const linkedProjects = state.projects
    .filter((project) => project.clientId === client.id && !project.archivedAt)
    .sort((a, b) => {
      const aCompleted = a.lifecycle === "completed" ? 1 : 0;
      const bCompleted = b.lifecycle === "completed" ? 1 : 0;
      if (aCompleted !== bCompleted) return aCompleted - bCompleted;
      return (a.name || "").localeCompare(b.name || "");
    });
  const responsiblePersons = client.responsiblePersons || [];
  els.clientDetailCard.innerHTML = `
    <div class="directory-detail-header">
      <div class="directory-detail-title-group">
        <div class="directory-detail-title-row">
          <h4>${escapeHtml(formatClientName(client))}</h4>
        </div>
        <p class="directory-detail-subtitle">${escapeHtml(client.company || client.address || "No company or address yet.")}</p>
      </div>
      <div class="directory-detail-actions" id="client-detail-actions"></div>
    </div>
    <div class="directory-detail-meta">
      <span class="meta-pill">Company: ${escapeHtml(client.company || "-")}</span>
      <span class="meta-pill">UID: ${escapeHtml(client.uidNumber || "-")}</span>
      <span class="meta-pill">Email: ${escapeHtml(client.email || "-")}</span>
      <span class="meta-pill">Tel: ${escapeHtml(client.tel || "-")}</span>
    </div>
    <div class="directory-detail-grid">
      <section class="directory-detail-section">
        <h5>Address</h5>
        <p>${escapeHtml(client.address || "No address yet.")}</p>
      </section>
      <section class="directory-detail-section">
        <h5>Responsible Persons</h5>
        <div class="directory-detail-list">
          ${responsiblePersons.length
            ? responsiblePersons.map((person) => `
              <div class="directory-detail-list-item">
                <strong>${escapeHtml([person.name, person.surname].filter(Boolean).join(" ") || "Unnamed person")}</strong>
                <span class="muted">${escapeHtml(person.email || person.tel || "No contact details")}</span>
              </div>
            `).join("")
            : `<p class="muted">No responsible persons yet.</p>`}
        </div>
      </section>
      <section class="directory-detail-section full-width">
        <h5>Projects</h5>
        <div class="client-project-list">
          ${linkedProjects.length
            ? linkedProjects.map((project) => {
              const isCompleted = project.lifecycle === "completed";
              const statusClass = isCompleted ? "client-project-status-completed" : "client-project-status-active";
              const statusIcon = isCompleted ? "&#10003;" : "&#9679;";
              const statusLabel = isCompleted ? "Completed" : "Active";
              const secondaryDate = isCompleted
                ? `Finished: ${formatDateDisplay(project.endDate || project.startDate)}`
                : `Start: ${formatDateDisplay(project.startDate)}`;
              return `
                <button class="client-project-shortcut" type="button" data-project-id="${escapeHtml(project.id)}">
                  <span class="client-project-shortcut-main">
                    <strong>${escapeHtml(getProjectDisplayName(project))}</strong>
                    <span class="muted">${escapeHtml(secondaryDate)}</span>
                  </span>
                  <span class="client-project-status ${statusClass}">
                    <span aria-hidden="true">${statusIcon}</span>
                    ${statusLabel}
                  </span>
                </button>
              `;
            }).join("")
            : `<p class="muted">No projects linked to this client yet.</p>`}
        </div>
      </section>
    </div>
  `;
  const actionsHost = els.clientDetailCard.querySelector("#client-detail-actions");
  const project = getCurrentProject();
  if (project && canManageProject(project)) {
    const assignBtn = document.createElement("button");
    assignBtn.type = "button";
    assignBtn.className = "ghost-btn";
    assignBtn.textContent = project.clientId === client.id ? "Assigned to project" : "Assign to current project";
    assignBtn.disabled = project.clientId === client.id;
    assignBtn.addEventListener("click", () => {
      project.clientId = client.id;
      selectedClientId = client.id;
      logAudit("Client Linked To Project", {
        objectType: "client",
        objectName: formatClientName(client),
        projectId: project.id,
      });
      persist();
      render();
    });
    actionsHost?.append(assignBtn);
  }
  if (PROJECT_ROLES.has(getCurrentRole()) || isAdmin()) {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "secondary-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editClient(client.id));
    actionsHost?.append(editBtn);
  }
  if (isAdmin()) {
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "ghost-btn destructive-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => permanentlyDeleteClient(client.id));
    actionsHost?.append(deleteBtn);
  }
  for (const shortcut of els.clientDetailCard.querySelectorAll(".client-project-shortcut")) {
    shortcut.addEventListener("click", (event) => {
      event.preventDefault();
      const { projectId } = shortcut.dataset;
      if (!projectId) return;
      currentView = "projects";
      if (state.selectedProjectId === projectId) {
        persist();
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      selectProject(projectId);
    });
  }
}

function renderClients() {
  els.clientList.innerHTML = "";
  renderClientFormState();
  const activeClients = state.clients.filter((client) => !client.archivedAt);
  const archivedClients = state.clients.filter((client) => client.archivedAt);
  if (els.toggleArchivedClientsBtn) {
    els.toggleArchivedClientsBtn.classList.toggle("hidden", !archivedClients.length && !showArchivedClients);
    els.toggleArchivedClientsBtn.classList.toggle("archived-visible-state", showArchivedClients);
    els.toggleArchivedClientsBtn.textContent = showArchivedClients ? "Hide Archived" : "Show Archived";
  }
  if (els.clientSearchInput && els.clientSearchInput.value !== clientSearchQuery) {
    els.clientSearchInput.value = clientSearchQuery;
  }
  if (els.clientSearchScope && els.clientSearchScope.value !== clientSearchScope) {
    els.clientSearchScope.value = clientSearchScope;
  }
  els.clientSearchClearBtn?.classList.toggle("hidden", !clientSearchQuery && clientSearchScope === "all");
  if (!activeClients.length) {
    els.clientList.innerHTML = `<p class="muted">No clients yet.</p>`;
    setDirectoryDetailEmpty(els.clientDetailCard, "No clients yet. Add the first client on the left.");
    applyDirectoryPanelCollapsedStates();
    return;
  }
  const pool = showArchivedClients ? [...activeClients, ...archivedClients] : activeClients;
  const visibleClients = pool.filter((client) => clientMatchesSearch(client, clientSearchQuery, clientSearchScope));
  if (!visibleClients.length) {
    els.clientList.innerHTML = `<p class="muted">No clients match "${escapeHtml(clientSearchQuery)}".</p>`;
    setDirectoryDetailEmpty(els.clientDetailCard, `No client matches "${clientSearchQuery}".`);
    applyDirectoryPanelCollapsedStates();
    return;
  }
  if (!selectedClientId || !visibleClients.some((client) => client.id === selectedClientId)) {
    selectedClientId = visibleClients[0].id;
  }
  const list = document.createElement("div");
  list.className = "directory-select-list";
  let archivedHeaderInserted = false;
  for (const client of visibleClients) {
    if (client.archivedAt && !archivedHeaderInserted) {
      const archivedHeader = document.createElement("div");
      archivedHeader.className = "dashboard-subheader archived-visible-label member-archive-divider";
      archivedHeader.textContent = "Archived Clients";
      list.append(archivedHeader);
      archivedHeaderInserted = true;
    }
    const row = document.createElement("button");
    row.type = "button";
    row.className = `directory-select-row${client.id === selectedClientId ? " is-selected" : ""}${client.archivedAt ? " archived-item-card" : ""}`;
    row.innerHTML = `
      <div class="directory-select-top">
        <div class="directory-select-title-group">
          <div class="directory-select-title-row">
            <strong>${escapeHtml(formatClientName(client))}</strong>
          </div>
          <div class="directory-select-subtitle">${escapeHtml(client.company || client.address || "No company or address")}</div>
        </div>
        ${client.email ? `<span class="meta-pill directory-select-status">Email</span>` : ""}
      </div>
      <div class="directory-select-meta">
        <span class="directory-select-meta-item"><span class="directory-select-meta-legend">Company:</span><span class="directory-select-meta-value">${escapeHtml(client.company || "No company")}</span></span>
        <span class="directory-select-meta-item"><span class="directory-select-meta-legend">Email:</span><span class="directory-select-meta-value">${escapeHtml(client.email || "No email")}</span></span>
        <span class="directory-select-meta-item"><span class="directory-select-meta-legend">Telephone:</span><span class="directory-select-meta-value">${escapeHtml(client.tel || "No telephone")}</span></span>
      </div>
    `;
    row.addEventListener("click", () => {
      if (selectedClientId === client.id) return;
      selectedClientId = client.id;
      renderClients();
    });
    list.append(row);
  }
  els.clientList.append(list);
  renderClientDetail(visibleClients.find((client) => client.id === selectedClientId) || null);
  applyDirectoryPanelCollapsedStates();
}

function renderEquipmentCategories() {
  if (!els.equipmentCategoryList) return;
  els.equipmentCategoryList.innerHTML = "";
  renderEquipmentCategoryFormState();
  selectedEquipmentCategoryFilterIds = new Set(
    [...selectedEquipmentCategoryFilterIds].filter((categoryId) => getEquipmentCategoryById(categoryId))
  );
  if (!selectedEquipmentCategoryFilterIds.size && state.equipmentCategories.length === 1) {
    setEquipmentCategoryFilters([]);
  }
  const categories = [...state.equipmentCategories].sort((a, b) => a.name.localeCompare(b.name));
  const activeItems = state.equipmentItems.filter((item) => !item.archivedAt);
  const archivedItems = state.equipmentItems.filter((item) => item.archivedAt);

  const allCard = document.createElement("article");
  allCard.className = `equipment-category-card filter-all-card${!selectedEquipmentCategoryFilterIds.size ? " active" : ""}`;
  allCard.innerHTML = `
    <div class="equipment-category-card-main">
      <strong>All categories</strong>
      <span class="muted">${activeItems.length} active equipment</span>
    </div>
    <div class="meta-row equipment-category-card-pills">
      <span class="meta-pill">Active: ${activeItems.length}</span>
      ${archivedItems.length ? `<span class="meta-pill status-pill-archived">Archived: ${archivedItems.length}</span>` : ""}
    </div>
  `;
  allCard.addEventListener("click", () => {
    closeEquipmentCreateForm();
    setEquipmentCategoryFilter("");
  });
  els.equipmentCategoryList.append(allCard);

  if (!categories.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No equipment categories yet.";
    els.equipmentCategoryList.append(empty);
    return;
  }
  for (const category of categories) {
    const activeCount = state.equipmentItems.filter((item) => item.categoryId === category.id && !item.archivedAt).length;
    const archivedCount = state.equipmentItems.filter((item) => item.categoryId === category.id && item.archivedAt).length;
    const card = document.createElement("article");
    card.className = `equipment-category-card${selectedEquipmentCategoryFilterIds.has(category.id) ? " active" : ""}`;
    card.innerHTML = `
      <div class="equipment-category-card-main">
        <strong>${escapeHtml(category.name)}</strong>
        <span class="muted">${activeCount} active equipment</span>
      </div>
      <div class="meta-row equipment-category-card-pills">
        <span class="meta-pill">Active: ${activeCount}</span>
        ${archivedCount ? `<span class="meta-pill status-pill-archived">Archived: ${archivedCount}</span>` : ""}
      </div>
    `;
    card.addEventListener("click", (event) => {
      if (event.target.closest(".card-menu")) return;
      closeEquipmentCreateForm();
      toggleEquipmentCategoryFilter(category.id);
    });
    if (canCreateEquipmentCategory()) {
      const actions = [
        {
          label: "Edit",
          onClick: () => editEquipmentCategory(category.id),
        },
      ];
      if (isAdmin()) {
        actions.push({
          label: "Delete",
          destructive: true,
          onClick: () => deleteEquipmentCategory(category.id),
        });
      }
      attachCardMenu(card, actions);
    }
    els.equipmentCategoryList.append(card);
  }
}

function renderEquipmentDetail(item) {
  if (!els.equipmentDetailCard) return;
  if (!item) {
    setDirectoryDetailEmpty(els.equipmentDetailCard, "Select equipment on the left to open the details.");
    return;
  }
  const categoryName = formatEquipmentCategoryName(item.categoryId);
  const creator = getUserById(item.createdByUserId);
  els.equipmentDetailCard.innerHTML = `
    <div class="directory-detail-header">
      <div class="directory-detail-title-group">
        <div class="directory-detail-title-row">
          ${buildEquipmentIconMarkup(item.iconKey, item.name, "equipment-detail-icon")}
          <h4>${escapeHtml(item.name)}</h4>
          ${item.archivedAt ? '<span class="meta-pill status-pill-archived">Archived</span>' : ""}
        </div>
        <p class="directory-detail-subtitle">${escapeHtml(categoryName)}</p>
      </div>
      <div class="directory-detail-actions" id="equipment-detail-actions"></div>
    </div>
    <div class="directory-detail-meta">
      <span class="meta-pill">Category: ${escapeHtml(categoryName)}</span>
      ${item.reference ? `<span class="meta-pill">Ref: ${escapeHtml(item.reference)}</span>` : ""}
      <span class="meta-pill">Created: ${escapeHtml(formatDateDisplay(item.createdAt))}</span>
      ${creator ? `<span class="meta-pill">By: ${escapeHtml(getMemberDisplayName(creator))}</span>` : ""}
    </div>
    <div class="directory-detail-grid">
      <section class="directory-detail-section full-width">
        <h5>Notes</h5>
        <p>${escapeHtml(item.notes || "No notes yet.")}</p>
      </section>
    </div>
  `;
  const actionsHost = els.equipmentDetailCard.querySelector("#equipment-detail-actions");
  if (!item.archivedAt && canManageEquipment()) {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "secondary-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editEquipment(item.id));
    actionsHost?.append(editBtn);

    const archiveBtn = document.createElement("button");
    archiveBtn.type = "button";
    archiveBtn.className = "ghost-btn destructive-btn";
    archiveBtn.textContent = "Archive";
    archiveBtn.addEventListener("click", () => archiveEquipment(item.id));
    actionsHost?.append(archiveBtn);
  }
  if (item.archivedAt && canManageEquipment()) {
    const restoreBtn = document.createElement("button");
    restoreBtn.type = "button";
    restoreBtn.className = "secondary-btn";
    restoreBtn.textContent = "Restore";
    restoreBtn.addEventListener("click", () => restoreEquipment(item.id));
    actionsHost?.append(restoreBtn);
  }
  if (item.archivedAt && isAdmin()) {
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "ghost-btn destructive-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => permanentlyDeleteEquipment(item.id));
    actionsHost?.append(deleteBtn);
  }
}

function renderEquipment() {
  if (!els.equipmentList) return;
  renderEquipmentFormState();
  renderEquipmentCategories();
  els.equipmentList.innerHTML = "";
  if (els.equipmentSearchInput && els.equipmentSearchInput.value !== equipmentSearchQuery) {
    els.equipmentSearchInput.value = equipmentSearchQuery;
  }
  els.equipmentSearchClearBtn?.classList.toggle("hidden", !equipmentSearchQuery);
  const activeItems = state.equipmentItems.filter((item) => !item.archivedAt);
  const archivedItems = state.equipmentItems.filter((item) => item.archivedAt);
  if (els.toggleArchivedEquipmentBtn) {
    els.toggleArchivedEquipmentBtn.classList.toggle("hidden", !archivedItems.length && !showArchivedEquipment);
    els.toggleArchivedEquipmentBtn.classList.toggle("archived-visible-state", showArchivedEquipment);
    els.toggleArchivedEquipmentBtn.textContent = showArchivedEquipment ? "Hide Archived" : "Show Archived";
  }
  const visibleItems = showArchivedEquipment ? [...activeItems, ...archivedItems] : activeItems;
  const categoryFiltered = selectedEquipmentCategoryFilterIds.size
    ? visibleItems.filter((item) => selectedEquipmentCategoryFilterIds.has(item.categoryId))
    : visibleItems;
  const filteredItems = equipmentSearchQuery
    ? categoryFiltered.filter((item) => {
        const term = equipmentSearchQuery.toLowerCase();
        return [item.name, item.reference, item.notes].filter(Boolean).join(" ").toLowerCase().includes(term);
      })
    : categoryFiltered;
  if (expandedEquipmentId && !filteredItems.some((item) => item.id === expandedEquipmentId)) {
    expandedEquipmentId = "";
  }
  if (!visibleItems.length) {
    els.equipmentList.innerHTML = `<p class="muted">No equipment yet.</p>`;
    setDirectoryDetailEmpty(els.equipmentDetailCard, "No equipment yet. Add the first item on the left.");
    applyDirectoryPanelCollapsedStates();
    return;
  }
  if (!filteredItems.length) {
    const emptyText = equipmentSearchQuery
      ? `No equipment matches "${escapeHtml(equipmentSearchQuery)}".`
      : (() => {
          const categoryNames = selectedEquipmentCategoryFilterIds.size
            ? [...selectedEquipmentCategoryFilterIds].map((categoryId) => formatEquipmentCategoryName(categoryId)).join(", ")
            : "this category";
          return `No equipment in ${escapeHtml(categoryNames)}.`;
        })();
    els.equipmentList.innerHTML = `<p class="muted">${emptyText}</p>`;
    setDirectoryDetailEmpty(els.equipmentDetailCard, equipmentSearchQuery
      ? `No equipment matches "${equipmentSearchQuery}".`
      : "No equipment is available for the selected category.");
    applyDirectoryPanelCollapsedStates();
    return;
  }
  if (!expandedEquipmentId && filteredItems.length) {
    expandedEquipmentId = filteredItems[0].id;
  }
  const list = document.createElement("div");
  list.className = "directory-select-list equipment-select-list";
  let archivedHeaderInserted = false;
  for (const item of filteredItems) {
    if (item.archivedAt && !archivedHeaderInserted) {
      const archivedHeader = document.createElement("div");
      archivedHeader.className = "dashboard-subheader archived-visible-label member-archive-divider";
      archivedHeader.textContent = "Archived Equipment";
      list.append(archivedHeader);
      archivedHeaderInserted = true;
    }
    const row = document.createElement("button");
    row.type = "button";
    row.className = `directory-select-row equipment-select-card${item.id === expandedEquipmentId ? " is-selected" : ""}${item.archivedAt ? " archived-item-card" : ""}`;
    const categoryName = formatEquipmentCategoryName(item.categoryId);
    row.innerHTML = `
      <div class="directory-select-top">
        <div class="directory-select-title-group">
          <div class="directory-select-title-row">
            ${buildEquipmentIconMarkup(item.iconKey, item.name)}
            <strong>${escapeHtml(item.name)}</strong>
          </div>
          <div class="directory-select-subtitle">${escapeHtml(categoryName)}</div>
        </div>
        ${item.archivedAt ? '<span class="meta-pill status-pill-archived directory-select-status">Archived</span>' : ""}
      </div>
      <div class="directory-select-meta">
        <span class="directory-select-meta-item"><span class="directory-select-meta-legend">Reference:</span><span class="directory-select-meta-value">${escapeHtml(item.reference || "No reference")}</span></span>
        <span class="directory-select-meta-item"><span class="directory-select-meta-legend">Created:</span><span class="directory-select-meta-value">${escapeHtml(formatDateDisplay(item.createdAt))}</span></span>
      </div>
    `;
    row.addEventListener("click", () => {
      if (expandedEquipmentId === item.id) return;
      closeEquipmentCreateForm();
      expandedEquipmentId = item.id;
      renderEquipment();
    });
    list.append(row);
  }
  els.equipmentList.append(list);
  renderEquipmentDetail(filteredItems.find((item) => item.id === expandedEquipmentId) || null);
  applyDirectoryPanelCollapsedStates();
}

function syncArchivedProjectSelection(projects) {
  const validIds = new Set((projects || []).map((project) => project.id));
  selectedArchivedProjectIds = new Set(
    [...selectedArchivedProjectIds].filter((projectId) => validIds.has(projectId))
  );
}

function toggleArchivedProjectSelection(projectId, checked) {
  if (!isAdmin()) return;
  if (checked) selectedArchivedProjectIds.add(projectId);
  else selectedArchivedProjectIds.delete(projectId);
  renderProjects();
}

function getScopedMembers(project = getCurrentProject()) {
  // Members are global. Project assignment is managed separately (project.memberIds).
  return state.users;
}

function getMemberProjectsForDirectory(member, project = getCurrentProject()) {
  const sourceProjects = project ? [project] : state.projects;
  return sourceProjects
    .filter((entry) => entry.memberIds?.includes(member.id))
    .filter((entry) => showArchivedMembers || !entry.archivedAt)
    .sort((a, b) => {
      if (a.archivedAt && !b.archivedAt) return 1;
      if (!a.archivedAt && b.archivedAt) return -1;
      if (a.lifecycle === "completed" && b.lifecycle !== "completed") return 1;
      if (a.lifecycle !== "completed" && b.lifecycle === "completed") return -1;
      return (a.name || "").localeCompare(b.name || "");
    });
}

function getMemberTasksForDirectory(member, project = getCurrentProject()) {
  const sourceProjects = project ? [project] : state.projects.filter((entry) => !entry.archivedAt || showArchivedMembers);
  return sourceProjects.flatMap((entry) => collectProjectItems(entry, "task", true)
    .filter((task) => task.assigneeId === member.id)
    .map((task) => ({ ...task, projectId: entry.id, projectName: getProjectDisplayName(entry), projectArchivedAt: entry.archivedAt })));
}

function renderMemberDetail(member, project = getCurrentProject()) {
  if (!els.memberDetailCard) return;
  if (!member) {
    setDirectoryDetailEmpty(els.memberDetailCard, "Select a member on the left to open the details.");
    return;
  }
  const roleLabel = isPermissionEdited(member) ? `${ROLE_LABELS[member.role]} (edited)` : ROLE_LABELS[member.role];
  const memberProjects = getMemberProjectsForDirectory(member, project);
  const memberTasks = getMemberTasksForDirectory(member, project);
  const activeTaskCount = memberTasks.filter((task) => task.status !== "Done" && !task.archivedAt).length;
  const completedTaskCount = memberTasks.filter((task) => task.status === "Done" && !task.archivedAt).length;
  const qualificationBadge = renderQualificationBadge(member.qualification, { showEmpty: true });
  const workmodeBadge = renderMemberWorkmodeBadge(member.workmode, { showEmpty: true });
  const recentTasksMarkup = memberTasks.length
    ? memberTasks.slice(0, 6).map((task) => `
      <div class="directory-detail-list-item">
        <strong>${escapeHtml(task.title || "Untitled task")}</strong>
        <span class="muted">${escapeHtml(task.projectName)} • ${escapeHtml(task.status || "Open")}</span>
      </div>
    `).join("")
    : `<p class="muted">No assigned tasks yet.</p>`;
  const scheduleMarkup = memberProjects.length
    ? memberProjects.map((entry) => {
      const statusClass = entry.archivedAt
        ? "status-pill-archived"
        : entry.lifecycle === "completed"
          ? "status-pill-completed"
          : "status-pill-active";
      const statusLabel = entry.archivedAt ? "Archived" : entry.lifecycle === "completed" ? "Completed" : "Active";
      return `
        <div class="directory-detail-list-item">
          <strong>${escapeHtml(getProjectDisplayName(entry))}</strong>
          <span class="muted">${escapeHtml(formatDateDisplay(entry.startDate))}</span>
          <div class="meta-row">
            <span class="meta-pill ${statusClass}">${statusLabel}</span>
            ${entry.projectManagerUserId === member.id ? '<span class="meta-pill">Project manager</span>' : ""}
          </div>
        </div>
      `;
    }).join("")
    : `<p class="muted">No project schedule assigned yet.</p>`;
  const personalNumber = getMemberPersonalNumber(member) || "-";
  els.memberDetailCard.innerHTML = `
    <div class="directory-detail-header">
      <div class="directory-detail-title-group">
        <div class="directory-detail-title-row">
          <h4>${escapeHtml(getMemberDisplayName(member))}</h4>
          ${qualificationBadge}
          ${workmodeBadge}
          <span class="meta-pill role-pill-${member.role}">${escapeHtml(roleLabel)}</span>
          ${member.status === "archived" ? '<span class="meta-pill status-pill-archived">Inactive</span>' : ""}
        </div>
        <p class="directory-detail-subtitle">Personal No: ${escapeHtml(personalNumber)} | ${escapeHtml(member.email || "No email")} | ${escapeHtml(member.tel || "No telephone")}</p>
      </div>
      <div class="directory-detail-actions" id="member-detail-actions"></div>
    </div>
    <div class="directory-detail-meta member-detail-summary">
      <span class="meta-pill">Personal No: ${escapeHtml(personalNumber)}</span>
      <span class="meta-pill">Email: ${escapeHtml(member.email || "No email")}</span>
      <span class="meta-pill">Telephone: ${escapeHtml(member.tel || "No telephone")}</span>
      <span class="meta-pill">Created: ${escapeHtml(formatDateDisplay(member.createdAt))}</span>
      <span class="meta-pill">Last login: ${escapeHtml(member.lastLoginAt ? formatDateDisplay(member.lastLoginAt.slice(0, 10)) : "Never")}</span>
      ${member.mustChangePin ? '<span class="meta-pill status-pill-archived">PIN change required</span>' : ""}
    </div>
  `;
  const actionsHost = els.memberDetailCard.querySelector("#member-detail-actions");
  const isCurrentMember = member.id === state.currentUserId;
  if (member.status === "archived") {
    if (hasPermission("deleteMembers")) {
      const restoreBtn = document.createElement("button");
      restoreBtn.type = "button";
      restoreBtn.className = "secondary-btn";
      restoreBtn.textContent = "Restore";
      restoreBtn.addEventListener("click", () => restoreMember(member.id));
      actionsHost?.append(restoreBtn);

      if (!isCurrentMember && (member.role !== "admin" || hasPermission("deleteAdmin"))) {
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "ghost-btn destructive-btn";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => permanentlyDeleteMember(member.id));
        actionsHost?.append(deleteBtn);
      }
    }
  } else if (hasPermission("changeRoles") || hasPermission("deleteMembers")) {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "secondary-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editMember(member.id));
    actionsHost?.append(editBtn);

    if (isAdmin() && !isCurrentMember) {
      const resetPinBtn = document.createElement("button");
      resetPinBtn.type = "button";
      resetPinBtn.className = "ghost-btn";
      resetPinBtn.textContent = "Reset PIN";
      resetPinBtn.addEventListener("click", () => resetMemberPin(member.id));
      actionsHost?.append(resetPinBtn);
    }

    if (!isCurrentMember && hasPermission("deleteMembers") && (member.role !== "admin" || hasPermission("deleteAdmin"))) {
      const deactivateBtn = document.createElement("button");
      deactivateBtn.type = "button";
      deactivateBtn.className = "ghost-btn destructive-btn";
      deactivateBtn.textContent = "Deactivate";
      deactivateBtn.addEventListener("click", () => archiveMember(member.id));
      actionsHost?.append(deactivateBtn);
    }
  }
}

function renderMembers() {
  const project = getCurrentProject();
  const initialSetupMode = IS_EMPTY_BOOTSTRAP && getActiveUsers().length === 0;
  els.memberList.innerHTML = "";
  els.memberList.classList.remove("list-view");
  renderTeamsTabState();
  renderMemberFormState();
  if (els.memberSearchInput && els.memberSearchInput.value !== memberSearchQuery) {
    els.memberSearchInput.value = memberSearchQuery;
  }
  if (els.memberRoleFilter && els.memberRoleFilter.value !== memberRoleFilter) {
    els.memberRoleFilter.value = memberRoleFilter;
  }
  if (els.memberSkillFilter && els.memberSkillFilter.value !== memberSkillFilter) {
    els.memberSkillFilter.value = memberSkillFilter;
  }
  if (els.memberWorkmodeFilter && els.memberWorkmodeFilter.value !== memberWorkmodeFilter) {
    els.memberWorkmodeFilter.value = memberWorkmodeFilter;
  }
  els.memberSearchClearBtn?.classList.toggle("hidden", !memberSearchQuery && memberRoleFilter === "all" && memberSkillFilter === "all" && memberWorkmodeFilter === "all");
  if (initialSetupMode) {
    els.memberRole.value = "admin";
  }
  const scopedMembers = getScopedMembers(project);
  const activeMembers = scopedMembers.filter((user) => user.status !== "archived");
  const archivedMembers = scopedMembers.filter((user) => user.status === "archived");
  if (els.toggleArchivedMembersBtn) {
    els.toggleArchivedMembersBtn.classList.toggle("hidden", !archivedMembers.length && !showArchivedMembers);
    els.toggleArchivedMembersBtn.classList.toggle("archived-visible-state", showArchivedMembers);
    els.toggleArchivedMembersBtn.textContent = showArchivedMembers ? "Hide Archived" : "Show Archived";
  }
  const visibleMembers = (showArchivedMembers ? [...activeMembers, ...archivedMembers] : activeMembers)
    .filter((member) => memberMatchesFilters(member));
  if (expandedMemberId && !visibleMembers.some((member) => member.id === expandedMemberId)) {
    expandedMemberId = "";
  }
  if (!visibleMembers.length) {
    const emptyMessage = initialSetupMode
      ? "No users yet. Create the first admin or manager here."
      : (memberSearchQuery || memberRoleFilter !== "all" || memberSkillFilter !== "all" || memberWorkmodeFilter !== "all")
        ? "No members match the current filters."
        : "No members yet.";
    els.memberList.innerHTML = `<p class="muted">${emptyMessage}</p>`;
    setDirectoryDetailEmpty(
      els.memberDetailCard,
      initialSetupMode
        ? "No users yet. Create the first admin or manager on the left."
        : (memberSearchQuery || memberRoleFilter !== "all" || memberSkillFilter !== "all" || memberWorkmodeFilter !== "all")
          ? "No member matches the current filters."
          : "No members available."
    );
    renderPermissionMatrix();
    applyDirectoryPanelCollapsedStates();
    return;
  }
  if (!expandedMemberId && visibleMembers.length) {
    expandedMemberId = visibleMembers[0].id;
  }
  const list = document.createElement("div");
  list.className = "directory-select-list";
  let archivedHeaderInserted = false;
  for (const member of visibleMembers) {
    if (member.status === "archived" && !archivedHeaderInserted) {
      const archivedHeader = document.createElement("div");
      archivedHeader.className = "dashboard-subheader archived-visible-label member-archive-divider";
      archivedHeader.textContent = "Archived Members";
      list.append(archivedHeader);
      archivedHeaderInserted = true;
    }
    const row = document.createElement("button");
    row.type = "button";
    row.className = `directory-select-row${expandedMemberId === member.id ? " is-selected" : ""}${member.status === "archived" ? " archived-item-card" : ""}`;
    const roleLabel = isPermissionEdited(member) ? `${ROLE_LABELS[member.role]} (edited)` : ROLE_LABELS[member.role];
    const personalNumber = getMemberPersonalNumber(member) || "-";
    const qualificationBadge = renderQualificationBadge(member.qualification);
    const workmodeBadge = renderMemberWorkmodeBadge(member.workmode);
    row.innerHTML = `
      <div class="directory-select-top">
        <div class="directory-select-title-group">
          <div class="directory-select-title-row">
            <strong>${escapeHtml(getMemberDisplayName(member))}</strong>
            ${qualificationBadge}
            ${workmodeBadge}
          </div>
          <div class="directory-select-subtitle">Personal No: ${escapeHtml(personalNumber)} | ${escapeHtml(member.email || "No email")}</div>
        </div>
        <span class="meta-pill role-pill-${member.role} directory-select-status">${escapeHtml(roleLabel)}</span>
      </div>
      <div class="directory-select-meta">
        <span class="directory-select-meta-item"><span class="directory-select-meta-legend">Personal No:</span><span class="directory-select-meta-value">${escapeHtml(personalNumber)}</span></span>
        <span class="directory-select-meta-item"><span class="directory-select-meta-legend">Role:</span><span class="directory-select-meta-value">${escapeHtml(roleLabel)}</span></span>
        <span class="directory-select-meta-item"><span class="directory-select-meta-legend">Telephone:</span><span class="directory-select-meta-value">${escapeHtml(member.tel || "No telephone")}</span></span>
        ${member.status === "archived" ? `<span class="directory-select-meta-item"><span class="directory-select-meta-legend">Status:</span><span class="directory-select-meta-value">Inactive</span></span>` : ""}
      </div>
    `;
    row.addEventListener("click", () => {
      if (expandedMemberId === member.id) return;
      expandedMemberId = member.id;
      renderMembers();
    });
    list.append(row);
  }
  els.memberList.append(list);
  renderMemberDetail(visibleMembers.find((member) => member.id === expandedMemberId) || null, project);
  renderPermissionMatrix();
  applyDirectoryPanelCollapsedStates();
}

function renderPermissionMatrix() {
  if (!els.permissionMatrix) return;
  const allActiveUsers = getActiveUsers();
  if (!permissionMatrixUserFilterInitialized) {
    selectedPermissionMatrixUserIds = new Set(allActiveUsers.map((user) => user.id));
    permissionMatrixUserFilterInitialized = true;
  }
  const activeUsers = allActiveUsers.filter((user) => selectedPermissionMatrixUserIds.has(user.id));
  const canEditMatrix = isAdmin();
  const filters = renderPermissionMatrixUserFilters(allActiveUsers);
  if (!activeUsers.length) {
    els.permissionMatrix.innerHTML = "";
    els.permissionMatrix.append(renderRolePermissionDefaultsEditor(canEditMatrix));
    els.permissionMatrix.append(renderUserPermissionMatrixEditor({
      canEditMatrix,
      filters,
      emptyMessage: "No selected members in the permission matrix."
    }));
    return;
  }
  const helper = document.createElement("p");
  helper.className = "muted permission-matrix-helper";
  helper.textContent = canEditMatrix
    ? "Choose the user type in the first row, then define the permissions below. Your own column stays locked."
    : "Admins can choose a user type first and then define the permissions below.";
  const table = document.createElement("table");
  table.className = "permission-matrix-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const corner = document.createElement("th");
  corner.className = "permission-action-col";
  corner.textContent = "Permission";
  headRow.append(corner);
  for (const user of activeUsers) {
    const isCurrentUser = user.id === state.currentUserId;
    const th = document.createElement("th");
    th.className = `permission-user-col${isPermissionEdited(user) ? " edited" : ""}`;
    const roleLabel = isPermissionEdited(user)
      ? `${ROLE_LABELS[user.role] || "User"} (edited)`
      : (ROLE_LABELS[user.role] || "User");
    th.innerHTML = `
      <button class="permission-user-button" type="button">
        <strong>${escapeHtml(getMemberDisplayName(user))}</strong>
        <span class="muted">${escapeHtml(roleLabel)}</span>
      </button>
      ${isCurrentUser ? '<p class="muted permission-self-lock">Your own permissions are locked.</p>' : ""}
    `;
    th.querySelector(".permission-user-button")?.addEventListener("click", () => {
      openPermissionMemberDialog(user.id);
    });
    th.querySelector(".permission-role-select")?.addEventListener("change", (event) => {
      updateUserRoleFromMatrix(user.id, event.target.value);
    });
    headRow.append(th);
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  const roleRow = document.createElement("tr");
  const roleActionCell = document.createElement("th");
  roleActionCell.className = "permission-action-col";
  roleActionCell.textContent = "User type";
  roleRow.append(roleActionCell);
  for (const user of activeUsers) {
    const isCurrentUser = user.id === state.currentUserId;
    const cell = document.createElement("td");
    cell.className = "permission-cell permission-role-cell";
    cell.innerHTML = `
      <label class="permission-role-picker">
        <select class="permission-role-select" ${canEditMatrix && !isCurrentUser ? "" : "disabled"}>
          ${Object.entries(ROLE_LABELS).map(([value, label]) => `<option value="${value}" ${user.role === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
        </select>
      </label>
    `;
    cell.querySelector(".permission-role-select")?.addEventListener("change", (event) => {
      updateUserRoleFromMatrix(user.id, event.target.value);
    });
    roleRow.append(cell);
  }
  tbody.append(roleRow);
  for (const permission of PERMISSION_DEFINITIONS) {
    const row = document.createElement("tr");
    const actionCell = document.createElement("th");
    actionCell.className = "permission-action-col";
    actionCell.textContent = permission.label;
    row.append(actionCell);
    for (const user of activeUsers) {
      const isCurrentUser = user.id === state.currentUserId;
      const cell = document.createElement("td");
      const effective = getEffectivePermissions(user);
      const checked = Boolean(effective[permission.key]);
      const elevated = isPermissionElevated(user, permission.key);
      cell.className = `permission-cell${elevated ? " elevated" : ""}`;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = checked;
      checkbox.disabled = !canEditMatrix || isCurrentUser;
      checkbox.addEventListener("change", () => {
        updateUserPermission(user.id, permission.key, checkbox.checked);
      });
      cell.append(checkbox);
      row.append(cell);
    }
    tbody.append(row);
  }
  table.append(tbody);
  els.permissionMatrix.innerHTML = "";
  els.permissionMatrix.append(renderRolePermissionDefaultsEditor(canEditMatrix));
  els.permissionMatrix.append(renderUserPermissionMatrixEditor({
    canEditMatrix,
    filters,
    helper,
    table
  }));
}

function renderPermissionMatrixUserFilters(users) {
  const wrapper = document.createElement("div");
  wrapper.className = "permission-matrix-user-filters";
  const title = document.createElement("p");
  title.className = "muted permission-matrix-filter-title";
  title.textContent = "Show users in matrix";
  wrapper.append(title);

  const list = document.createElement("div");
  list.className = "permission-matrix-user-filter-list";
  for (const user of users) {
    const label = document.createElement("label");
    label.className = "tick-filter";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = selectedPermissionMatrixUserIds.has(user.id);
    input.addEventListener("change", () => togglePermissionMatrixUser(user.id, input.checked));
    const text = document.createElement("span");
    text.textContent = getMemberDisplayName(user);
    label.append(input, text);
    list.append(label);
  }
  wrapper.append(list);
  return wrapper;
}

function togglePermissionMatrixUser(userId, checked) {
  if (checked) selectedPermissionMatrixUserIds.add(userId);
  else selectedPermissionMatrixUserIds.delete(userId);
  renderPermissionMatrix();
}

function renderRolePermissionDefaultsEditor(canEditMatrix = isAdmin()) {
  const details = document.createElement("details");
  details.className = "permission-expand-card permission-role-defaults";
  details.open = true;

  const summary = document.createElement("summary");
  summary.className = "permission-expand-summary permission-role-defaults-summary";
  summary.textContent = "Role Permission Templates";
  details.append(summary);

  const helper = document.createElement("p");
  helper.className = "muted permission-role-defaults-helper";
  helper.textContent = canEditMatrix
    ? "Expand to edit the default permissions for each role. Your current role template stays locked."
    : "Only admins can edit the default permissions for each role.";
  details.append(helper);

  const table = document.createElement("table");
  table.className = "permission-matrix-table permission-role-defaults-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const corner = document.createElement("th");
  corner.className = "permission-action-col";
  corner.textContent = "Permission";
  headRow.append(corner);

  const currentRole = getCurrentRole();
  for (const [roleKey, roleLabel] of Object.entries(ROLE_LABELS)) {
    const th = document.createElement("th");
    const roleLocked = roleKey === currentRole;
    th.className = `permission-user-col${roleLocked ? " permission-role-locked" : ""}`;
    th.innerHTML = `
      <div class="permission-role-heading">
        <strong>${escapeHtml(roleLabel)}</strong>
        ${roleLocked ? '<span class="muted permission-self-lock">Current role locked</span>' : ""}
      </div>
    `;
    headRow.append(th);
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  for (const permission of PERMISSION_DEFINITIONS) {
    const row = document.createElement("tr");
    const actionCell = document.createElement("th");
    actionCell.className = "permission-action-col";
    actionCell.textContent = permission.label;
    row.append(actionCell);

    for (const roleKey of Object.keys(ROLE_LABELS)) {
      const roleLocked = roleKey === currentRole;
      const cell = document.createElement("td");
      cell.className = `permission-cell${roleLocked ? " permission-role-locked" : ""}`;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(getDefaultPermissionsForRole(roleKey)[permission.key]);
      checkbox.disabled = !canEditMatrix || roleLocked;
      checkbox.addEventListener("change", () => {
        updateRoleDefaultPermission(roleKey, permission.key, checkbox.checked);
      });
      cell.append(checkbox);
      row.append(cell);
    }

    tbody.append(row);
  }
  table.append(tbody);
  details.append(table);
  return details;
}

function renderUserPermissionMatrixEditor({
  canEditMatrix = isAdmin(),
  filters,
  helper,
  table,
  emptyMessage = ""
} = {}) {
  const details = document.createElement("details");
  details.className = "permission-expand-card permission-user-matrix-card";
  details.open = true;

  const summary = document.createElement("summary");
  summary.className = "permission-expand-summary permission-user-matrix-summary";
  summary.textContent = "Member Permission Matrix";
  details.append(summary);

  if (filters) details.append(filters);
  if (helper) details.append(helper);

  if (table) {
    details.append(table);
  } else if (emptyMessage) {
    const emptyState = document.createElement("p");
    emptyState.className = "muted permission-matrix-empty";
    emptyState.textContent = emptyMessage;
    details.append(emptyState);
  }

  return details;
}

function updateUserPermission(userId, permissionKey, checked) {
  if (!isAdmin()) return;
  const user = getUserById(userId);
  if (!user) return;
  if (user.id === state.currentUserId) {
    showAppMessage("You cannot change your own permissions.", "warning", "Permission Matrix");
    renderMembers();
    return;
  }
  const defaults = getDefaultPermissionsForRole(user.role || "user");
  user.permissionOverrides = { ...(user.permissionOverrides || {}) };
  if (checked === Boolean(defaults[permissionKey])) {
    delete user.permissionOverrides[permissionKey];
  } else {
    user.permissionOverrides[permissionKey] = checked;
  }
  logAudit("Member Permission Updated", {
    objectType: "member-permission",
    objectName: `${getMemberDisplayName(user)} � ${permissionKey}`,
  });
  persist();
  renderMembers();
}

function updateUserRoleFromMatrix(userId, nextRole) {
  if (!isAdmin()) return;
  const user = getUserById(userId);
  const normalizedRole = String(nextRole || "").trim().toLowerCase();
  if (!user || !ROLE_LABELS[normalizedRole] || user.role === normalizedRole) return;
  if (user.id === state.currentUserId) {
    showAppMessage("You cannot change your own user type.", "warning", "Permission Matrix");
    renderMembers();
    return;
  }
  user.role = normalizedRole;
  user.permissionOverrides = {};
  logAudit("Member Role Updated", {
    objectType: "member",
    objectName: `${getMemberDisplayName(user)} -> ${ROLE_LABELS[normalizedRole]}`,
  });
  persist();
  renderMembers();
}

function updateRoleDefaultPermission(roleKey, permissionKey, checked) {
  if (!isAdmin()) return;
  if (roleKey === getCurrentRole()) {
    showAppMessage("You cannot change the permissions for your current role.", "warning", "Role Permissions");
    renderMembers();
    return;
  }
  if (!ROLE_LABELS[roleKey]) return;
  state.rolePermissionDefaults = normalizeRolePermissionDefaults(state.rolePermissionDefaults);
  state.rolePermissionDefaults[roleKey][permissionKey] = Boolean(checked);
  logAudit("Role Permission Template Updated", {
    objectType: "role-permission",
    objectName: `${ROLE_LABELS[roleKey]} -> ${permissionKey}`,
  });
  persist();
  renderMembers();
}

// Removed: populateAssignableUserSelect

function renderAuditLog() {
  if (!els.auditLogList) return;
  if (els.auditSearchInput && els.auditSearchInput.value !== auditSearchQuery) {
    els.auditSearchInput.value = auditSearchQuery;
  }
  els.auditSearchClearBtn?.classList.toggle("hidden", !auditSearchQuery);
  if (!isAdmin()) {
    els.auditLogList.innerHTML = `<p class="muted">Only admins can view the audit log.</p>`;
    return;
  }
  if (!state.auditLog.length) {
    els.auditLogList.innerHTML = `<p class="muted">No audit entries yet.</p>`;
    return;
  }
  const visibleEntries = state.auditLog.filter((entry) => auditEntryMatchesSearch(entry, auditSearchQuery));
  if (!visibleEntries.length) {
    els.auditLogList.innerHTML = `<p class="muted">No audit entries match "${escapeHtml(auditSearchQuery)}".</p>`;
    return;
  }
  els.auditLogList.innerHTML = "";
  for (const entry of visibleEntries) {
    const actor = getUserById(entry.userId);
    const card = document.createElement("article");
    card.className = "audit-entry";
    card.innerHTML = `
      <div class="audit-entry-header">
        <strong>${escapeHtml(entry.action)}</strong>
        <span class="meta-pill">${escapeHtml(new Date(entry.timestamp).toLocaleString())}</span>
      </div>
      <div class="meta-row">
        <span class="meta-pill">${escapeHtml(actor ? getMemberDisplayName(actor) : "Unknown user")}</span>
        <span class="meta-pill role-pill-${entry.userRole}">${escapeHtml(ROLE_LABELS[entry.userRole] || entry.userRole)}</span>
        ${entry.projectName ? `<span class="meta-pill">Project: ${escapeHtml(entry.projectName)}</span>` : entry.projectId ? `<span class="meta-pill">Project ID: ${escapeHtml(entry.projectId)}</span>` : ""}
      </div>
      <p>${escapeHtml(entry.objectType || "record")}: ${escapeHtml(entry.objectName || "-")}${entry.reason ? ` | Reason: ${escapeHtml(entry.reason)}` : ""}</p>
    `;
    els.auditLogList.append(card);
  }
}

function createPlannerAssignment({
  id = crypto.randomUUID(),
  teamId = "",
  projectId = "",
  date = todayInputValue(),
  startTime = PLANNER_DEFAULT_START_TIME,
  endTime = PLANNER_DEFAULT_END_TIME,
  notes = "",
  createdAt = new Date().toISOString(),
  createdByUserId = "",
}) {
  return {
    id,
    teamId,
    projectId,
    date,
    startTime: normalizePlannerTimeValue(startTime, PLANNER_DEFAULT_START_TIME),
    endTime: normalizePlannerTimeValue(endTime, PLANNER_DEFAULT_END_TIME),
    notes: String(notes || "").trim(),
    createdAt,
    createdByUserId,
  };
}

function normalizePlannerAssignment(entry) {
  const normalized = createPlannerAssignment({
    ...entry,
    createdByUserId: entry?.createdByUserId || "",
  });
  if (timeStringToMinutes(normalized.endTime) <= timeStringToMinutes(normalized.startTime)) {
    normalized.endTime = addMinutesToTimeString(normalized.startTime, 60);
  }
  return normalized;
}

function createDailyWork({
  id = crypto.randomUUID(),
  title = "",
  date = todayInputValue(),
  startTime = PLANNER_DEFAULT_START_TIME,
  endTime = addMinutesToTimeString(PLANNER_DEFAULT_START_TIME, 60),
  memberIds = [],
  lastName = "",
  firstName = "",
  client = "",
  address = "",
  phone = "",
  mapLink = "",
  workLink = "",
  notes = "",
  status = "planned",
  createdAt = new Date().toISOString(),
  createdByUserId = "",
}) {
  return {
    id,
    title: String(title || "").trim(),
    date: parseIsoDateValue(date) ? date : todayInputValue(),
    startTime: normalizePlannerTimeValue(startTime, PLANNER_DEFAULT_START_TIME),
    endTime: normalizePlannerTimeValue(endTime, addMinutesToTimeString(PLANNER_DEFAULT_START_TIME, 60)),
    memberIds: Array.isArray(memberIds) ? [...new Set(memberIds.filter(Boolean))].slice(0, 2) : [],
    lastName: String(lastName || "").trim(),
    firstName: String(firstName || "").trim(),
    client: String(client || "").trim(),
    address: String(address || "").trim(),
    phone: normalizePhoneValue(phone),
    mapLink: normalizeUrlValue(mapLink),
    workLink: normalizeUrlValue(workLink),
    notes: String(notes || "").trim(),
    status: ["planned", "done", "cancelled"].includes(status) ? status : "planned",
    createdAt,
    createdByUserId,
  };
}

function normalizePhoneValue(value) {
  return String(value || "").trim();
}

function normalizeUrlValue(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function normalizeDailyWorkContact(contact = {}) {
  const legacyName = String(contact.client || "").trim();
  const parsedLegacy = splitDailyWorkContactName(legacyName);
  return {
    id: contact.id || crypto.randomUUID(),
    lastName: String(contact.lastName || parsedLegacy.lastName || "").trim(),
    firstName: String(contact.firstName || parsedLegacy.firstName || "").trim(),
    client: String(contact.client || "").trim(),
    address: String(contact.address || "").trim(),
    phone: normalizePhoneValue(contact.phone),
    mapLink: normalizeUrlValue(contact.mapLink),
    workLink: normalizeUrlValue(contact.workLink),
    updatedAt: contact.updatedAt || new Date().toISOString(),
  };
}

function splitDailyWorkContactName(value) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { lastName: parts[0] || "", firstName: "" };
  return { lastName: parts[0], firstName: parts.slice(1).join(" ") };
}

function getDailyWorkContactDisplayName(contact = {}) {
  return [contact.lastName, contact.firstName].filter(Boolean).join(" ") || contact.client || "Unnamed contact";
}

function getDailyWorkContactSuggestionValue(contact = {}) {
  return [
    getDailyWorkContactDisplayName(contact),
    contact.phone,
    contact.address,
  ].filter(Boolean).join(" | ");
}

function normalizeContactKey(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePhoneKey(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function normalizeDailyWork(entry) {
  const normalized = createDailyWork({
    ...entry,
    createdByUserId: entry?.createdByUserId || "",
  });
  if (timeStringToMinutes(normalized.endTime) <= timeStringToMinutes(normalized.startTime)) {
    normalized.endTime = addMinutesToTimeString(normalized.startTime, 60);
  }
  return normalized;
}

function normalizePlannerTimeValue(value, fallback = PLANNER_DEFAULT_START_TIME) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallback;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseIsoDateValue(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function toIsoDateValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return todayInputValue();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function addDaysToIsoDate(value, days) {
  const base = parseIsoDateValue(value) || parseIsoDateValue(todayInputValue()) || new Date();
  base.setDate(base.getDate() + days);
  return toIsoDateValue(base);
}

function getStartOfIsoWeek(value) {
  const base = parseIsoDateValue(value) || parseIsoDateValue(todayInputValue()) || new Date();
  const offset = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - offset);
  return toIsoDateValue(base);
}

function formatPlannerDate(value, options = {}) {
  const date = parseIsoDateValue(value);
  if (!date) return value || "";
  return date.toLocaleDateString(undefined, { timeZone: getAppTimezone(), ...options });
}

function timeStringToMinutes(value) {
  const normalized = normalizePlannerTimeValue(value, "00:00");
  const [hours, minutes] = normalized.split(":").map((entry) => Number.parseInt(entry, 10));
  return (hours * 60) + minutes;
}

function minutesToTimeString(value) {
  const totalMinutes = Math.max(0, Math.min(24 * 60, Number.isFinite(value) ? value : 0));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addMinutesToTimeString(value, minutes) {
  return minutesToTimeString(timeStringToMinutes(value) + minutes);
}

function doPlannerTimesOverlap(startA, endA, startB, endB) {
  const aStart = timeStringToMinutes(startA);
  const aEnd = timeStringToMinutes(endA);
  const bStart = timeStringToMinutes(startB);
  const bEnd = timeStringToMinutes(endB);
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

function getPlannerVisibleProjects(rootState = state) {
  return getVisibleProjects(rootState, false)
    .filter((project) => !project.archivedAt && project.lifecycle !== "completed");
}

function getPlannerProjectById(projectId, rootState = state) {
  return (rootState.projects || []).find((project) => project.id === projectId) || null;
}

function isProjectOpenOnDate(project, dateValue) {
  if (!project || project.archivedAt || project.lifecycle === "completed") return false;
  const startDate = project.startDate || todayInputValue();
  if (dateValue < startDate) return false;
  if (project.endDate && dateValue > project.endDate) return false;
  return true;
}

function getPlannerTeamRecords(rootState = state) {
  const records = [];
  for (const project of getPlannerVisibleProjects(rootState)) {
    for (const team of (project.folders || [])) {
      if (team.archivedAt) continue;
      records.push({
        id: team.id,
        name: team.name || "Unnamed team",
        color: normalizeHexColor(team.tabColor || pickNextFolderColor(project)),
        memberCount: Array.isArray(team.memberIds) ? team.memberIds.length : 0,
        projectId: project.id,
        projectName: getProjectDisplayName(project, false),
        project,
        team,
      });
    }
  }
  return records.sort((a, b) => {
    const byName = (a.name || "").localeCompare(b.name || "");
    if (byName) return byName;
    return (a.projectName || "").localeCompare(b.projectName || "");
  });
}

function getPlannerTeamRecord(teamId, rootState = state) {
  return getPlannerTeamRecords(rootState).find((record) => record.id === teamId) || null;
}

function getPlannerAssignments() {
  return (state.plannerAssignments || []).filter((assignment) => (
    Boolean(getPlannerProjectById(assignment.projectId))
    && Boolean(getPlannerTeamRecord(assignment.teamId))
  ));
}

function getPlannerAssignmentsForDate(dateValue) {
  return getPlannerAssignments()
    .filter((assignment) => assignment.date === dateValue)
    .sort((a, b) => {
      const byStart = timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime);
      if (byStart) return byStart;
      return a.teamId.localeCompare(b.teamId);
    });
}

function getPlannerAssignmentsForProjectDate(projectId, dateValue) {
  return getPlannerAssignmentsForDate(dateValue).filter((assignment) => assignment.projectId === projectId);
}

function isPlannerTeamFreeOnDate(teamId, dateValue, excludeAssignmentId = "") {
  return !getPlannerAssignmentsForDate(dateValue).some((assignment) => assignment.teamId === teamId && assignment.id !== excludeAssignmentId);
}

function isPlannerTeamWindowAvailable(teamId, dateValue, startTime, endTime, excludeAssignmentId = "") {
  return !getPlannerAssignmentsForDate(dateValue).some((assignment) => (
    assignment.id !== excludeAssignmentId
    && assignment.teamId === teamId
    && doPlannerTimesOverlap(assignment.startTime, assignment.endTime, startTime, endTime)
  ));
}

function canManagePlannerProject(projectId) {
  const project = getPlannerProjectById(projectId);
  return Boolean(project) && (isAdmin() || isDeveloper() || canManageProject(project));
}

function setPlannerMode(mode) {
  if (!["week", "day"].includes(mode)) return;
  if (plannerMode === mode) return;
  plannerMode = mode;
  render();
}

function setPlannerSlotHours(hours) {
  if (![1, 2, 4].includes(hours)) return;
  plannerSlotHours = hours;
  if (plannerMode !== "day") plannerMode = "day";
  render();
}

function shiftPlannerPeriod(direction) {
  const step = plannerMode === "week" ? 7 : 1;
  plannerAnchorDate = addDaysToIsoDate(plannerAnchorDate, direction * step);
  render();
}

function goToPlannerToday() {
  plannerAnchorDate = todayInputValue();
  render();
}

function getDailyWorksWeekDates(anchorDate = dailyWorksAnchorDate) {
  const start = getStartOfIsoWeek(anchorDate || todayInputValue());
  return Array.from({ length: 7 }, (_, index) => addDaysToIsoDate(start, index));
}

function shiftDailyWorksWeek(direction) {
  dailyWorksAnchorDate = addDaysToIsoDate(dailyWorksAnchorDate || todayInputValue(), direction * 7);
  render();
}

function goToDailyWorksToday() {
  dailyWorksAnchorDate = todayInputValue();
  render();
}

function getDailyWorksForDate(dateValue) {
  return (state.dailyWorks || [])
    .filter((work) => work.date === dateValue)
    .sort((a, b) => {
      const byStart = timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime);
      if (byStart) return byStart;
      return (a.title || "").localeCompare(b.title || "");
    });
}

function getDailyWorkStatusLabel(status) {
  if (status === "done") return "Done";
  if (status === "cancelled") return "Cancelled";
  return "Planned";
}

function renderDailyWorkMemberOptions() {
  if (!els.dailyWorkMemberLinks) return;
  els.dailyWorkMemberLinks.innerHTML = "";
  const users = getActiveUsers().filter((user) => user.role !== "developer");
  if (!users.length) {
    els.dailyWorkMemberLinks.innerHTML = `<p class="muted service-team-member-list-empty">No active members yet.</p>`;
    return;
  }
  for (const member of users) {
    const label = createCheckRow(
      "daily-work-member-link",
      member.id,
      getMemberCompactName(member) || getMemberDisplayName(member),
      `#${getMemberPersonalNumber(member) || "-"}`
    );
    const checkbox = label.querySelector("input");
    if (checkbox) {
      checkbox.checked = dailyWorkSelectedMemberIds.has(member.id);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked && dailyWorkSelectedMemberIds.size >= 2 && !dailyWorkSelectedMemberIds.has(member.id)) {
          checkbox.checked = false;
          showAppMessage("Daily Works can have one or two assigned persons.", "warning", "Daily Works");
          return;
        }
        if (checkbox.checked) dailyWorkSelectedMemberIds.add(member.id);
        else dailyWorkSelectedMemberIds.delete(member.id);
      });
    }
    els.dailyWorkMemberLinks.append(label);
  }
}

function findDailyWorkContactMatch({ lastName = "", firstName = "", client = "", address = "", phone = "", suggestion = "" } = {}) {
  const lastNameKey = normalizeContactKey(lastName);
  const firstNameKey = normalizeContactKey(firstName);
  const clientKey = normalizeContactKey(client);
  const addressKey = normalizeContactKey(address);
  const phoneKey = normalizePhoneKey(phone);
  const suggestionKey = normalizeContactKey(suggestion);
  return (state.dailyWorkContacts || []).find((contact) => (
    (suggestionKey && normalizeContactKey(getDailyWorkContactSuggestionValue(contact)) === suggestionKey)
    || (phoneKey && normalizePhoneKey(contact.phone) === phoneKey)
    || (lastNameKey && normalizeContactKey(contact.lastName) === lastNameKey && (!firstNameKey || normalizeContactKey(contact.firstName) === firstNameKey))
    || (firstNameKey && normalizeContactKey(contact.firstName) === firstNameKey && !lastNameKey)
    || (clientKey && normalizeContactKey(contact.client) === clientKey)
    || (addressKey && normalizeContactKey(contact.address) === addressKey)
  )) || null;
}

function applyDailyWorkContact(contact, overwrite = false) {
  if (!contact) return;
  if (els.dailyWorkLastName && (overwrite || !els.dailyWorkLastName.value)) els.dailyWorkLastName.value = contact.lastName || "";
  if (els.dailyWorkFirstName && (overwrite || !els.dailyWorkFirstName.value)) els.dailyWorkFirstName.value = contact.firstName || "";
  if (els.dailyWorkClient && (overwrite || !els.dailyWorkClient.value)) els.dailyWorkClient.value = contact.client || "";
  if (els.dailyWorkAddress && (overwrite || !els.dailyWorkAddress.value)) els.dailyWorkAddress.value = contact.address || "";
  if (els.dailyWorkPhone && (overwrite || !els.dailyWorkPhone.value)) els.dailyWorkPhone.value = contact.phone || "";
  if (els.dailyWorkMapLink && (overwrite || !els.dailyWorkMapLink.value)) els.dailyWorkMapLink.value = contact.mapLink || "";
  if (els.dailyWorkWorkLink && (overwrite || !els.dailyWorkWorkLink.value)) els.dailyWorkWorkLink.value = contact.workLink || "";
  if (els.dailyWorkAddress && !els.dailyWorkMapLink?.value) syncDailyWorkMapLinkFromAddress();
  renderDailyWorkFormShortcuts();
}

function autofillDailyWorkContact() {
  const suggestion = [els.dailyWorkLastName?.value, els.dailyWorkFirstName?.value, els.dailyWorkPhone?.value].find((value) => String(value || "").includes(" | ")) || "";
  const contact = findDailyWorkContactMatch({
    lastName: els.dailyWorkLastName?.value || "",
    firstName: els.dailyWorkFirstName?.value || "",
    phone: els.dailyWorkPhone?.value || "",
    suggestion,
  });
  applyDailyWorkContact(contact, Boolean(suggestion));
  renderDailyWorkFormShortcuts();
}

function autofillDailyWorkAddressContact() {
  const contact = findDailyWorkContactMatch({
    address: els.dailyWorkAddress?.value || "",
  });
  applyDailyWorkContact(contact, false);
  syncDailyWorkMapLinkFromAddress();
  renderDailyWorkFormShortcuts();
}

function upsertDailyWorkContactFromWork(work) {
  const draft = normalizeDailyWorkContact({
    lastName: work.lastName,
    firstName: work.firstName,
    client: work.client,
    address: work.address,
    phone: work.phone,
    mapLink: work.mapLink,
    workLink: work.workLink,
  });
  if (!draft.lastName && !draft.firstName && !draft.client && !draft.address && !draft.phone && !draft.mapLink && !draft.workLink) return;
  if (!Array.isArray(state.dailyWorkContacts)) state.dailyWorkContacts = [];
  const existing = findDailyWorkContactMatch(draft);
  if (existing) {
    existing.lastName = draft.lastName || existing.lastName;
    existing.firstName = draft.firstName || existing.firstName;
    existing.client = draft.client || existing.client;
    existing.address = draft.address || existing.address;
    existing.phone = draft.phone || existing.phone;
    existing.mapLink = draft.mapLink || existing.mapLink;
    existing.workLink = draft.workLink || existing.workLink;
    existing.updatedAt = new Date().toISOString();
  } else {
    state.dailyWorkContacts.unshift(draft);
  }
}

function openDailyWorkForContact(contactId) {
  const contact = (state.dailyWorkContacts || []).find((entry) => entry.id === contactId);
  if (!contact) return;
  openDailyWorkDialog("", {
    date: dailyWorksAnchorDate || todayInputValue(),
    lastName: contact.lastName,
    firstName: contact.firstName,
    client: contact.client,
    address: contact.address,
    phone: contact.phone,
    mapLink: contact.mapLink,
    workLink: contact.workLink,
  });
}

function editDailyWorkContact(contactId) {
  const contact = (state.dailyWorkContacts || []).find((entry) => entry.id === contactId);
  if (!contact) return;
  const lastName = window.prompt("Last Name", contact.lastName || "");
  if (lastName == null) return;
  const firstName = window.prompt("Name", contact.firstName || "");
  if (firstName == null) return;
  const client = window.prompt("Client / note", contact.client || "");
  if (client == null) return;
  const address = window.prompt("Address", contact.address || "");
  if (address == null) return;
  const phone = window.prompt("Telephone", contact.phone || "");
  if (phone == null) return;
  const mapLink = window.prompt("Google Maps link", contact.mapLink || "");
  if (mapLink == null) return;
  const workLink = window.prompt("Work request link", contact.workLink || "");
  if (workLink == null) return;
  Object.assign(contact, normalizeDailyWorkContact({
    ...contact,
    lastName,
    firstName,
    client,
    address,
    phone,
    mapLink,
    workLink,
    updatedAt: new Date().toISOString(),
  }));
  persist();
  renderDailyWorkContacts();
}

async function deleteDailyWorkContact(contactId) {
  const contact = (state.dailyWorkContacts || []).find((entry) => entry.id === contactId);
  if (!contact) return;
  const confirmed = await showAppConfirm(`Delete contact "${getDailyWorkContactDisplayName(contact)}"? Existing Daily Works will stay unchanged.`, "Delete Contact", {
    okText: "Delete",
    tone: "warning",
  });
  if (!confirmed) return;
  state.dailyWorkContacts = (state.dailyWorkContacts || []).filter((entry) => entry.id !== contactId);
  persist();
  renderDailyWorkContacts();
}

function renderDailyWorkContactSuggestions() {
  if (!els.dailyWorkContactSuggestions) return;
  els.dailyWorkContactSuggestions.innerHTML = (state.dailyWorkContacts || [])
    .map((contact) => `<option value="${escapeHtml(getDailyWorkContactSuggestionValue(contact))}"></option>`)
    .join("");
  if (els.dailyWorkAddressSuggestions) {
    const addresses = [...new Set((state.dailyWorkContacts || []).map((contact) => contact.address).filter(Boolean))];
    els.dailyWorkAddressSuggestions.innerHTML = addresses
      .map((address) => `<option value="${escapeHtml(address)}"></option>`)
      .join("");
  }
}

function renderDailyWorkFormShortcuts() {
  if (!els.dailyWorkContactShortcuts) return;
  const phone = normalizePhoneValue(els.dailyWorkPhone?.value || "");
  const mapLink = normalizeUrlValue(els.dailyWorkMapLink?.value || "");
  els.dailyWorkContactShortcuts.classList.toggle("hidden", !phone);
  els.dailyWorkContactShortcuts.innerHTML = `
    ${phone ? `<span class="meta-pill">${escapeHtml(phone)}</span><a class="ghost-btn" href="tel:${escapeHtml(phone)}">Call</a>` : ""}
  `;
  if (els.dailyWorkMapOpenBtn) {
    els.dailyWorkMapOpenBtn.disabled = !mapLink;
  }
}

function buildGoogleMapsSearchLink(address) {
  const query = String(address || "").trim();
  if (!query) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function isAutoDailyWorkMapLink(value) {
  const link = String(value || "").trim();
  return !link || /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/i.test(link);
}

function syncDailyWorkMapLinkFromAddress() {
  if (!els.dailyWorkAddress || !els.dailyWorkMapLink) return;
  const currentLink = els.dailyWorkMapLink.value || "";
  if (!isAutoDailyWorkMapLink(currentLink)) return;
  els.dailyWorkMapLink.value = buildGoogleMapsSearchLink(els.dailyWorkAddress.value);
  renderDailyWorkFormShortcuts();
}

function openDailyWorkMapLink() {
  const mapLink = normalizeUrlValue(els.dailyWorkMapLink?.value || "");
  if (!mapLink) {
    showAppMessage("Add a Google Maps link first.", "warning", "Daily Works");
    return;
  }
  window.open(mapLink, "_blank", "noopener,noreferrer");
}

function openDailyWorkDialog(workId = "", preset = {}) {
  if (!requirePermission(hasPermission("manageProjectContent"), "You do not have permission to plan daily works.")) return;
  const existing = (state.dailyWorks || []).find((work) => work.id === workId) || null;
  const activeMemberIds = new Set(getActiveUsers().map((user) => user.id));
  const rememberedMemberIds = normalizeDailyWorkDefaults(state.dailyWorkDefaults)
    .memberIds
    .filter((id) => activeMemberIds.has(id));
  editingDailyWorkId = existing?.id || "";
  const draft = existing || createDailyWork({
    date: preset.date || dailyWorksAnchorDate || todayInputValue(),
    startTime: preset.startTime || PLANNER_DEFAULT_START_TIME,
    endTime: preset.endTime || addMinutesToTimeString(preset.startTime || PLANNER_DEFAULT_START_TIME, 60),
    memberIds: Array.isArray(preset.memberIds) ? preset.memberIds : rememberedMemberIds,
    lastName: preset.lastName || "",
    firstName: preset.firstName || "",
    client: preset.client || "",
    address: preset.address || "",
    phone: preset.phone || "",
    mapLink: preset.mapLink || "",
    workLink: preset.workLink || "",
    createdByUserId: state.currentUserId || "",
  });
  if (els.dailyWorkDialogTitle) els.dailyWorkDialogTitle.textContent = existing ? "Edit daily work" : "Add daily work";
  if (els.dailyWorkTitle) els.dailyWorkTitle.value = draft.title || "";
  if (els.dailyWorkDate) els.dailyWorkDate.value = draft.date || todayInputValue();
  if (els.dailyWorkStart) els.dailyWorkStart.value = draft.startTime || PLANNER_DEFAULT_START_TIME;
  if (els.dailyWorkEnd) els.dailyWorkEnd.value = draft.endTime || addMinutesToTimeString(PLANNER_DEFAULT_START_TIME, 60);
  if (els.dailyWorkLastName) els.dailyWorkLastName.value = draft.lastName || "";
  if (els.dailyWorkFirstName) els.dailyWorkFirstName.value = draft.firstName || "";
  if (els.dailyWorkClient) els.dailyWorkClient.value = draft.client || "";
  if (els.dailyWorkAddress) els.dailyWorkAddress.value = draft.address || "";
  if (els.dailyWorkPhone) els.dailyWorkPhone.value = draft.phone || "";
  if (els.dailyWorkMapLink) els.dailyWorkMapLink.value = draft.mapLink || "";
  if (els.dailyWorkWorkLink) els.dailyWorkWorkLink.value = draft.workLink || "";
  if (els.dailyWorkNotes) els.dailyWorkNotes.value = draft.notes || "";
  if (els.dailyWorkStatus) els.dailyWorkStatus.value = draft.status || "planned";
  dailyWorkSelectedMemberIds = new Set(draft.memberIds || []);
  renderDailyWorkContactSuggestions();
  renderDailyWorkFormShortcuts();
  renderDailyWorkMemberOptions();
  els.deleteDailyWorkBtn?.classList.toggle("hidden", !existing);
  els.dailyWorkDialog?.showModal();
  rememberFormSnapshot("dailyWork", els.dailyWorkForm);
}

function closeDailyWorkDialog(forceClose = false) {
  if (!forceClose && !confirmDiscardUnsavedChanges(["dailyWork"])) return;
  editingDailyWorkId = "";
  dailyWorkSelectedMemberIds = new Set();
  els.dailyWorkForm?.reset();
  if (els.dailyWorkMemberLinks) els.dailyWorkMemberLinks.innerHTML = "";
  rememberFormSnapshot("dailyWork", els.dailyWorkForm);
  if (els.dailyWorkDialog?.open) els.dailyWorkDialog.close();
}

function getDailyWorkConflictMessages(draft) {
  const messages = [];
  const selectedMembers = draft.memberIds || [];
  for (const memberId of selectedMembers) {
    const memberName = getMemberDisplayName(getUserById(memberId)) || "This person";
    for (const work of state.dailyWorks || []) {
      if (work.id === draft.id || work.date !== draft.date || !(work.memberIds || []).includes(memberId)) continue;
      if (!doPlannerTimesOverlap(work.startTime, work.endTime, draft.startTime, draft.endTime)) continue;
      messages.push(`Attention: ${memberName} is already planned in Daily Work "${work.title || "Untitled"}" (${work.startTime}-${work.endTime}).`);
    }
    for (const assignment of getPlannerAssignmentsForDate(draft.date)) {
      if (!doPlannerTimesOverlap(assignment.startTime, assignment.endTime, draft.startTime, draft.endTime)) continue;
      const teamRecord = getPlannerTeamRecord(assignment.teamId);
      if (!teamRecord?.team?.memberIds?.includes(memberId)) continue;
      messages.push(`Attention: ${memberName} is involved in the team "${teamRecord.name}" and in the project "${teamRecord.projectName}".`);
    }
  }
  return [...new Set(messages)];
}

function onDailyWorkSave(event) {
  event.preventDefault();
  if (!requirePermission(hasPermission("manageProjectContent"), "You do not have permission to save daily works.")) return;
  const title = String(els.dailyWorkTitle?.value || "").trim();
  const memberIds = [...dailyWorkSelectedMemberIds];
  if (!title || !memberIds.length) {
    showAppMessage("Please add a title and select one or two persons.", "warning", "Daily Works");
    return;
  }
  const draft = createDailyWork({
    id: editingDailyWorkId || crypto.randomUUID(),
    title,
    date: els.dailyWorkDate?.value || todayInputValue(),
    startTime: els.dailyWorkStart?.value || PLANNER_DEFAULT_START_TIME,
    endTime: els.dailyWorkEnd?.value || addMinutesToTimeString(PLANNER_DEFAULT_START_TIME, 60),
    memberIds,
    lastName: els.dailyWorkLastName?.value || "",
    firstName: els.dailyWorkFirstName?.value || "",
    client: els.dailyWorkClient?.value || "",
    address: els.dailyWorkAddress?.value || "",
    phone: els.dailyWorkPhone?.value || "",
    mapLink: els.dailyWorkMapLink?.value || "",
    workLink: els.dailyWorkWorkLink?.value || "",
    notes: els.dailyWorkNotes?.value || "",
    status: els.dailyWorkStatus?.value || "planned",
    createdAt: editingDailyWorkId
      ? (state.dailyWorks || []).find((work) => work.id === editingDailyWorkId)?.createdAt || new Date().toISOString()
      : new Date().toISOString(),
    createdByUserId: editingDailyWorkId
      ? (state.dailyWorks || []).find((work) => work.id === editingDailyWorkId)?.createdByUserId || state.currentUserId || ""
      : state.currentUserId || "",
  });
  if (timeStringToMinutes(draft.endTime) <= timeStringToMinutes(draft.startTime)) {
    showAppMessage("End time must be after start time.", "warning", "Daily Works");
    return;
  }
  const conflicts = getDailyWorkConflictMessages(draft);
  if (conflicts.length && !window.confirm(`${conflicts.join("\n")}\n\nContinue anyway?`)) return;
  const existingIndex = (state.dailyWorks || []).findIndex((work) => work.id === editingDailyWorkId);
  if (existingIndex >= 0) {
    state.dailyWorks[existingIndex] = draft;
    logAudit("Daily Work Updated", { objectType: "daily-work", objectName: draft.title });
  } else {
    state.dailyWorks.unshift(draft);
    logAudit("Daily Work Created", { objectType: "daily-work", objectName: draft.title });
  }
  state.dailyWorkDefaults = normalizeDailyWorkDefaults({ memberIds: draft.memberIds });
  upsertDailyWorkContactFromWork(draft);
  for (const memberId of draft.memberIds || []) {
    if (memberId === state.currentUserId) continue;
    notifyUser(memberId, {
      title: "Daily Work assigned",
      body: `You were assigned to "${draft.title || "Daily Work"}" on ${draft.date} (${draft.startTime}-${draft.endTime}).`,
    });
  }
  dailyWorksAnchorDate = draft.date;
  closeDailyWorkDialog(true);
  persist();
  render();
}

async function onDailyWorkDelete() {
  if (!editingDailyWorkId) return;
  const work = (state.dailyWorks || []).find((entry) => entry.id === editingDailyWorkId);
  if (!work) return;
  const confirmed = await showAppConfirm(`Delete Daily Work "${work.title || "Untitled"}"?`, "Delete Daily Work", {
    okText: "Delete",
    tone: "danger",
  });
  if (!confirmed) return;
  state.dailyWorks = (state.dailyWorks || []).filter((entry) => entry.id !== editingDailyWorkId);
  logAudit("Daily Work Deleted", { objectType: "daily-work", objectName: work.title || "Untitled" });
  closeDailyWorkDialog(true);
  persist();
  render();
}

function getDailyWorkDropStartTime(event, timeline) {
  const rect = timeline.getBoundingClientRect();
  const dayMinutes = (PLANNER_DAY_END_HOUR - PLANNER_DAY_START_HOUR) * 60;
  const ratio = Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height)));
  const rawMinutes = (PLANNER_DAY_START_HOUR * 60) + (ratio * dayMinutes);
  const snappedMinutes = Math.round(rawMinutes / 15) * 15;
  return Math.max(PLANNER_DAY_START_HOUR * 60, Math.min(PLANNER_DAY_END_HOUR * 60, snappedMinutes));
}

function moveDailyWorkToSlot(workId, dateValue, startMinutes) {
  const work = (state.dailyWorks || []).find((entry) => entry.id === workId);
  if (!work || !dateValue) return;
  const duration = Math.max(15, timeStringToMinutes(work.endTime) - timeStringToMinutes(work.startTime));
  const latestStart = (PLANNER_DAY_END_HOUR * 60) - duration;
  const nextStartMinutes = Math.max(PLANNER_DAY_START_HOUR * 60, Math.min(latestStart, startMinutes));
  const previous = { date: work.date, startTime: work.startTime, endTime: work.endTime };

  work.date = dateValue;
  work.startTime = minutesToTimeString(nextStartMinutes);
  work.endTime = minutesToTimeString(nextStartMinutes + duration);

  const conflicts = getDailyWorkConflictMessages(work);
  if (conflicts.length && !window.confirm(`${conflicts.join("\n")}\n\nMove anyway?`)) {
    work.date = previous.date;
    work.startTime = previous.startTime;
    work.endTime = previous.endTime;
    renderDailyWorks();
    return;
  }

  dailyWorksAnchorDate = dateValue;
  logAudit("Daily Work Moved", { objectType: "daily-work", objectName: work.title || "Untitled" });
  persist();
  renderDailyWorks();
}

function buildDailyWorkCard(work) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `daily-work-card status-${work.status || "planned"}`;
  card.draggable = true;
  card.dataset.dailyWorkId = work.id;
  const startMinutes = Math.max(PLANNER_DAY_START_HOUR * 60, timeStringToMinutes(work.startTime));
  const endMinutes = Math.min(PLANNER_DAY_END_HOUR * 60, timeStringToMinutes(work.endTime));
  const dayMinutes = (PLANNER_DAY_END_HOUR - PLANNER_DAY_START_HOUR) * 60;
  const top = ((startMinutes - (PLANNER_DAY_START_HOUR * 60)) / dayMinutes) * 100;
  const height = Math.max(7, ((endMinutes - startMinutes) / dayMinutes) * 100);
  const members = (work.memberIds || [])
    .map((id) => getUserById(id))
    .filter(Boolean);
  card.style.top = `${top}%`;
  card.style.height = `${height}%`;
  const contactName = [work.lastName, work.firstName].filter(Boolean).join(" ") || work.client || "";
  const phoneLink = work.phone ? `<span class="daily-work-phone-inline">${escapeHtml(work.phone)}</span><a href="tel:${escapeHtml(work.phone)}" class="daily-work-contact-link">Call</a>` : "";
  const mapLink = work.mapLink ? `<a href="${escapeHtml(work.mapLink)}" target="_blank" rel="noopener noreferrer" class="daily-work-contact-link">Go to</a>` : "";
  const workLink = work.workLink ? `<a href="${escapeHtml(work.workLink)}" target="_blank" rel="noopener noreferrer" class="daily-work-contact-link">Work link</a>` : "";
  card.innerHTML = `
    <strong>${escapeHtml(work.title || "Daily work")}</strong>
    <span>${escapeHtml(work.startTime)} - ${escapeHtml(work.endTime)}</span>
    <small>${members.map((member) => escapeHtml(getMemberCompactName(member) || getMemberDisplayName(member))).join(", ") || "No person"}</small>
    ${contactName || work.address ? `<small>${escapeHtml([contactName, work.address].filter(Boolean).join(" | "))}</small>` : ""}
    ${phoneLink || mapLink || workLink ? `<span class="daily-work-contact-actions">${phoneLink}${mapLink}${workLink}</span>` : ""}
  `;
  card.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (event) => event.stopPropagation());
    link.addEventListener("dragstart", (event) => event.preventDefault());
  });
  card.addEventListener("dragstart", (event) => {
    draggedDailyWorkId = work.id;
    card.classList.add("is-dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", work.id);
    }
  });
  card.addEventListener("dragend", () => {
    draggedDailyWorkId = "";
    dailyWorkSuppressNextClick = true;
    card.classList.remove("is-dragging");
    document.querySelectorAll(".daily-work-timeline.drop-target").forEach((target) => target.classList.remove("drop-target"));
    window.setTimeout(() => {
      dailyWorkSuppressNextClick = false;
    }, 0);
  });
  card.addEventListener("click", () => {
    if (dailyWorkSuppressNextClick) return;
    openDailyWorkDialog(work.id);
  });
  return card;
}

function renderDailyWorks() {
  if (!els.dailyWorksBoard) return;
  if (!dailyWorksAnchorDate) dailyWorksAnchorDate = todayInputValue();
  const dates = getDailyWorksWeekDates(dailyWorksAnchorDate);
  if (els.dailyWorksWeekRange) {
    els.dailyWorksWeekRange.textContent = `${formatPlannerDate(dates[0], { day: "numeric", month: "short", year: "numeric" })} - ${formatPlannerDate(dates[dates.length - 1], { day: "numeric", month: "short", year: "numeric" })}`;
  }
  els.dailyWorksBoard.innerHTML = "";
  const hourRuler = document.createElement("aside");
  hourRuler.className = "daily-works-hour-ruler";
  for (let hour = PLANNER_DAY_START_HOUR; hour <= PLANNER_DAY_END_HOUR; hour += 1) {
    const label = document.createElement("span");
    label.textContent = `${String(hour).padStart(2, "0")}:00`;
    hourRuler.append(label);
  }
  els.dailyWorksBoard.append(hourRuler);
  for (const dateValue of dates) {
    const day = parseIsoDateValue(dateValue);
    const column = document.createElement("section");
    column.className = "daily-work-day-column";
    if ([0, 6].includes(day?.getDay())) column.classList.add("weekend");
    const header = document.createElement("div");
    header.className = "daily-work-day-header";
    header.innerHTML = `
      <div>
        <span>${escapeHtml(formatPlannerDate(dateValue, { weekday: "short" }).toUpperCase())}</span>
        <strong>${escapeHtml(formatPlannerDate(dateValue, { day: "numeric", month: "short" }))}</strong>
      </div>
    `;
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "icon-btn daily-work-add-btn";
    addBtn.textContent = "+";
    addBtn.setAttribute("aria-label", `Add daily work on ${formatPlannerDate(dateValue)}`);
    addBtn.addEventListener("click", () => openDailyWorkDialog("", { date: dateValue }));
    header.append(addBtn);
    column.append(header);

    const timeline = document.createElement("div");
    timeline.className = "daily-work-timeline";
    timeline.dataset.date = dateValue;
    timeline.addEventListener("dragover", (event) => {
      if (!draggedDailyWorkId) return;
      event.preventDefault();
      timeline.classList.add("drop-target");
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    });
    timeline.addEventListener("dragleave", () => {
      timeline.classList.remove("drop-target");
    });
    timeline.addEventListener("drop", (event) => {
      if (!draggedDailyWorkId) return;
      event.preventDefault();
      timeline.classList.remove("drop-target");
      moveDailyWorkToSlot(draggedDailyWorkId, dateValue, getDailyWorkDropStartTime(event, timeline));
    });
    for (let hour = PLANNER_DAY_START_HOUR; hour < PLANNER_DAY_END_HOUR; hour += 1) {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "daily-work-hour-slot";
      slot.title = `Add work at ${String(hour).padStart(2, "0")}:00`;
      slot.addEventListener("click", () => openDailyWorkDialog("", {
        date: dateValue,
        startTime: `${String(hour).padStart(2, "0")}:00`,
        endTime: `${String(Math.min(hour + 1, 23)).padStart(2, "0")}:00`,
      }));
      timeline.append(slot);
    }
    const works = getDailyWorksForDate(dateValue);
    for (const work of works) timeline.append(buildDailyWorkCard(work));
    if (!works.length) {
      const empty = document.createElement("p");
      empty.className = "daily-work-empty muted";
      empty.textContent = "No daily works";
      timeline.append(empty);
    }
    column.append(timeline);
    els.dailyWorksBoard.append(column);
  }
  renderDailyWorkContacts();
}

function renderDailyWorkContacts() {
  if (!els.dailyWorkContactsList) return;
  const contacts = [...(state.dailyWorkContacts || [])]
    .filter((contact) => contact.lastName || contact.firstName || contact.client || contact.address || contact.phone || contact.mapLink || contact.workLink)
    .sort((a, b) => {
      const byLastName = (a.lastName || "").localeCompare(b.lastName || "");
      if (byLastName) return byLastName;
      return (a.firstName || a.client || a.address || "").localeCompare(b.firstName || b.client || b.address || "");
    });
  if (els.dailyWorkContactsCount) els.dailyWorkContactsCount.textContent = String(contacts.length);
  renderDailyWorkContactSuggestions();
  if (!contacts.length) {
    els.dailyWorkContactsList.innerHTML = `<p class="muted">No saved Daily Work contacts yet. Save a Daily Work with client, address, phone, or map link to add one.</p>`;
    return;
  }
  els.dailyWorkContactsList.innerHTML = `
    <div class="daily-work-contact-table-head">
      <span>Last Name</span>
      <span>Name</span>
      <span>Address</span>
      <span>Tel Number</span>
      <span>Work link</span>
      <span>Actions</span>
    </div>
  `;
  for (const contact of contacts) {
    const row = document.createElement("article");
    row.className = "daily-work-contact-card";
    row.innerHTML = `
      <strong>${escapeHtml(contact.lastName || "-")}</strong>
      <span>${escapeHtml(contact.firstName || "-")}</span>
      <span class="muted">${escapeHtml(contact.address || "-")}</span>
      <span>${contact.phone ? `<a href="tel:${escapeHtml(contact.phone)}">${escapeHtml(contact.phone)}</a>` : "-"}</span>
      <span>${contact.workLink ? `<a href="${escapeHtml(contact.workLink)}" target="_blank" rel="noopener noreferrer">Open</a>` : "-"}</span>
      <div class="daily-work-contact-actions">
        ${contact.phone ? `<a href="tel:${escapeHtml(contact.phone)}" class="ghost-btn">Call</a>` : ""}
        ${contact.mapLink ? `<a href="${escapeHtml(contact.mapLink)}" target="_blank" rel="noopener noreferrer" class="ghost-btn">Go to</a>` : ""}
        <button class="ghost-btn" type="button" data-action="use">Use</button>
        <button class="secondary-btn" type="button" data-action="edit">Edit</button>
        <button class="ghost-btn destructive-btn" type="button" data-action="delete">Delete</button>
      </div>
    `;
    row.querySelector('[data-action="use"]')?.addEventListener("click", () => openDailyWorkForContact(contact.id));
    row.querySelector('[data-action="edit"]')?.addEventListener("click", () => editDailyWorkContact(contact.id));
    row.querySelector('[data-action="delete"]')?.addEventListener("click", () => deleteDailyWorkContact(contact.id));
    els.dailyWorkContactsList.append(row);
  }
}

function selectPlannerTeam(teamId) {
  selectedPlannerTeamId = selectedPlannerTeamId === teamId ? "" : teamId;
  renderPlanner();
}

function populatePlannerAssignmentFormOptions(selectedTeamId = "", selectedProjectId = "") {
  if (els.plannerAssignmentTeam) {
    const teamOptions = ['<option value="">Select team</option>']
      .concat(getPlannerTeamRecords().map((record) => (
        `<option value="${record.id}">${escapeHtml(record.name)} - ${escapeHtml(record.projectName)}</option>`
      )))
      .join("");
    els.plannerAssignmentTeam.innerHTML = teamOptions;
    els.plannerAssignmentTeam.value = selectedTeamId || "";
  }
  if (els.plannerAssignmentProject) {
    const projectOptions = ['<option value="">Select project</option>']
      .concat(getPlannerVisibleProjects().map((project) => (
        `<option value="${project.id}">${escapeHtml(getProjectDisplayName(project))}</option>`
      )))
      .join("");
    els.plannerAssignmentProject.innerHTML = projectOptions;
    els.plannerAssignmentProject.value = selectedProjectId || "";
  }
}

function openPlannerAssignmentDialog(assignmentId = null, preset = {}) {
  if (!els.plannerAssignmentDialog) return;
  const existing = getPlannerAssignments().find((assignment) => assignment.id === assignmentId) || null;
  const draft = existing || createPlannerAssignment({
    teamId: preset.teamId || selectedPlannerTeamId || "",
    projectId: preset.projectId || "",
    date: preset.date || plannerAnchorDate || todayInputValue(),
    startTime: preset.startTime || PLANNER_DEFAULT_START_TIME,
    endTime: preset.endTime || PLANNER_DEFAULT_END_TIME,
    notes: preset.notes || "",
    createdByUserId: state.currentUserId || "",
  });
  editingPlannerAssignmentId = existing?.id || null;
  populatePlannerAssignmentFormOptions(draft.teamId, draft.projectId);
  if (els.plannerAssignmentTitle) {
    els.plannerAssignmentTitle.textContent = existing ? "Edit Assignment" : "Schedule Team";
  }
  if (els.plannerAssignmentTeam) els.plannerAssignmentTeam.value = draft.teamId || "";
  if (els.plannerAssignmentProject) els.plannerAssignmentProject.value = draft.projectId || "";
  if (els.plannerAssignmentDate) els.plannerAssignmentDate.value = draft.date || todayInputValue();
  if (els.plannerAssignmentStart) {
    els.plannerAssignmentStart.value = draft.startTime || PLANNER_DEFAULT_START_TIME;
    els.plannerAssignmentStart.min = `${String(PLANNER_DAY_START_HOUR).padStart(2, "0")}:00`;
    els.plannerAssignmentStart.max = `${String(PLANNER_DAY_END_HOUR).padStart(2, "0")}:00`;
  }
  if (els.plannerAssignmentEnd) {
    els.plannerAssignmentEnd.value = draft.endTime || PLANNER_DEFAULT_END_TIME;
    els.plannerAssignmentEnd.min = `${String(PLANNER_DAY_START_HOUR).padStart(2, "0")}:00`;
    els.plannerAssignmentEnd.max = `${String(PLANNER_DAY_END_HOUR).padStart(2, "0")}:00`;
  }
  if (els.plannerAssignmentNotes) els.plannerAssignmentNotes.value = draft.notes || "";
  els.plannerAssignmentDeleteBtn?.classList.toggle("hidden", !existing);
  els.plannerAssignmentDialog.showModal();
  rememberFormSnapshot("plannerAssignment", els.plannerAssignmentForm);
}

function closePlannerAssignmentDialog(forceClose = false) {
  if (!forceClose && !confirmDiscardUnsavedChanges(["plannerAssignment"])) return;
  editingPlannerAssignmentId = null;
  els.plannerAssignmentForm?.reset();
  els.plannerAssignmentDeleteBtn?.classList.add("hidden");
  if (els.plannerAssignmentDialog?.open) els.plannerAssignmentDialog.close();
}

function onPlannerAssignmentSave(event) {
  event.preventDefault();
  const teamId = els.plannerAssignmentTeam?.value || "";
  const projectId = els.plannerAssignmentProject?.value || "";
  const dateValue = els.plannerAssignmentDate?.value || "";
  const startTime = normalizePlannerTimeValue(els.plannerAssignmentStart?.value, PLANNER_DEFAULT_START_TIME);
  const endTime = normalizePlannerTimeValue(els.plannerAssignmentEnd?.value, PLANNER_DEFAULT_END_TIME);
  const notes = String(els.plannerAssignmentNotes?.value || "").trim();
  const teamRecord = getPlannerTeamRecord(teamId);
  const project = getPlannerProjectById(projectId);

  if (!teamRecord || !project || !dateValue) {
    showAppMessage("Please choose a team, a project, and a date.", "warning", "Planner");
    return;
  }
  if (!canManagePlannerProject(project.id)) {
    showAppMessage("Only admins, developers, or assigned managers can change this planner entry.", "warning", "Planner");
    return;
  }
  if (timeStringToMinutes(endTime) <= timeStringToMinutes(startTime)) {
    showAppMessage("End time must be later than start time.", "warning", "Planner");
    return;
  }
  if (!isProjectOpenOnDate(project, dateValue)) {
    showAppMessage("The selected project is not open on this date.", "warning", "Planner");
    return;
  }
  if (!isPlannerTeamWindowAvailable(teamId, dateValue, startTime, endTime, editingPlannerAssignmentId || "")) {
    showAppMessage("This team is already planned in another project during that time.", "warning", "Planner");
    return;
  }

  if (editingPlannerAssignmentId) {
    const existing = state.plannerAssignments.find((assignment) => assignment.id === editingPlannerAssignmentId);
    if (!existing) return;
    existing.teamId = teamId;
    existing.projectId = projectId;
    existing.date = dateValue;
    existing.startTime = startTime;
    existing.endTime = endTime;
    existing.notes = notes;
    logAudit("Planner Assignment Updated", {
      objectType: "planner",
      objectName: `${teamRecord.name} -> ${project.name || "Untitled project"}`,
      projectId: project.id,
      projectName: project.name || "Untitled project",
    });
  } else {
    state.plannerAssignments.unshift(createPlannerAssignment({
      teamId,
      projectId,
      date: dateValue,
      startTime,
      endTime,
      notes,
      createdByUserId: state.currentUserId || "",
    }));
    logAudit("Planner Assignment Created", {
      objectType: "planner",
      objectName: `${teamRecord.name} -> ${project.name || "Untitled project"}`,
      projectId: project.id,
      projectName: project.name || "Untitled project",
    });
  }

  for (const memberId of teamRecord.team?.memberIds || []) {
    if (memberId === state.currentUserId) continue;
    notifyUser(memberId, {
      title: "Planner assignment",
      body: `${teamRecord.name} was scheduled for ${project.name || "Untitled project"} on ${dateValue} (${startTime}-${endTime}).`,
    });
  }

  selectedPlannerTeamId = "";
  closePlannerAssignmentDialog(true);
  persist();
  render();
}

function onPlannerAssignmentDelete() {
  if (!editingPlannerAssignmentId) return;
  const existing = state.plannerAssignments.find((assignment) => assignment.id === editingPlannerAssignmentId);
  if (!existing) return;
  if (!canManagePlannerProject(existing.projectId)) {
    showAppMessage("Only admins, developers, or assigned managers can delete this planner entry.", "warning", "Planner");
    return;
  }
  if (!window.confirm("Delete this planner assignment?")) return;
  const teamRecord = getPlannerTeamRecord(existing.teamId);
  const project = getPlannerProjectById(existing.projectId);
  state.plannerAssignments = state.plannerAssignments.filter((assignment) => assignment.id !== existing.id);
  logAudit("Planner Assignment Deleted", {
    objectType: "planner",
    objectName: `${teamRecord?.name || "Team"} -> ${project?.name || "Untitled project"}`,
    projectId: project?.id || "",
    projectName: project?.name || "Untitled project",
  });
  closePlannerAssignmentDialog(true);
  persist();
  render();
}

function buildPlannerAssignmentButton(assignment) {
  const teamRecord = getPlannerTeamRecord(assignment.teamId);
  if (!teamRecord) return document.createElement("div");
  const theme = buildTabTheme(teamRecord.color);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "planner-assignment-pill";
  button.style.setProperty("--planner-assignment-bg", theme.muted);
  button.style.setProperty("--planner-assignment-border", theme.border);
  button.style.setProperty("--planner-assignment-shadow", theme.shadow);
  button.style.setProperty("--planner-assignment-accent", teamRecord.color);
  button.innerHTML = `
    <strong>${escapeHtml(teamRecord.name)}</strong>
    <span>${escapeHtml(assignment.startTime)} - ${escapeHtml(assignment.endTime)}</span>
    ${assignment.notes ? `<small>${escapeHtml(assignment.notes)}</small>` : ""}
  `;
  button.addEventListener("click", () => {
    if (!canManagePlannerProject(assignment.projectId)) {
      showAppMessage("Only admins, developers, or assigned managers can edit this planner entry.", "warning", "Planner");
      return;
    }
    openPlannerAssignmentDialog(assignment.id);
  });
  return button;
}

function buildPlannerTeamChip(record) {
  const theme = buildTabTheme(record.color);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "planner-team-chip";
  button.classList.toggle("selected", selectedPlannerTeamId === record.id);
  button.style.setProperty("--planner-chip-bg", theme.muted);
  button.style.setProperty("--planner-chip-border", theme.border);
  button.style.setProperty("--planner-chip-shadow", theme.shadow);
  button.style.setProperty("--planner-chip-accent", record.color);
  button.innerHTML = `
    <span class="planner-team-chip-swatch" aria-hidden="true"></span>
    <span class="planner-team-chip-copy">
      <strong>${escapeHtml(record.name)}</strong>
      <small>${escapeHtml(record.projectName)} · ${record.memberCount} member${record.memberCount === 1 ? "" : "s"}</small>
    </span>
  `;
  button.addEventListener("click", () => selectPlannerTeam(record.id));
  return button;
}

function renderPlannerSelectionBar() {
  if (!els.plannerSelectionBar) return;
  const selectedRecord = selectedPlannerTeamId ? getPlannerTeamRecord(selectedPlannerTeamId) : null;
  if (!selectedRecord) {
    els.plannerSelectionBar.classList.add("hidden");
    els.plannerSelectionBar.innerHTML = "";
    return;
  }
  const theme = buildTabTheme(selectedRecord.color);
  els.plannerSelectionBar.classList.remove("hidden");
  els.plannerSelectionBar.innerHTML = `
    <span class="planner-selection-pill" style="--planner-selection-bg:${theme.muted}; --planner-selection-border:${theme.border}; --planner-selection-shadow:${theme.shadow}; --planner-selection-accent:${selectedRecord.color};">
      Selected team: <strong>${escapeHtml(selectedRecord.name)}</strong>
      <span>${escapeHtml(selectedRecord.projectName)}</span>
    </span>
    <button id="planner-selection-clear-btn" class="ghost-btn" type="button">Clear</button>
    <button id="planner-selection-new-btn" class="secondary-btn" type="button">New assignment</button>
  `;
  document.querySelector("#planner-selection-clear-btn")?.addEventListener("click", () => {
    selectedPlannerTeamId = "";
    renderPlanner();
  });
  document.querySelector("#planner-selection-new-btn")?.addEventListener("click", () => {
    openPlannerAssignmentDialog(null, {
      teamId: selectedRecord.id,
      date: plannerAnchorDate,
      startTime: plannerMode === "day" ? minutesToTimeString(PLANNER_DAY_START_HOUR * 60) : PLANNER_DEFAULT_START_TIME,
      endTime: plannerMode === "day" ? addMinutesToTimeString(minutesToTimeString(PLANNER_DAY_START_HOUR * 60), plannerSlotHours * 60) : PLANNER_DEFAULT_END_TIME,
    });
  });
}

function buildPlannerPoolPanel(dateValue, teamRecords, options = {}) {
  const section = document.createElement("section");
  section.className = `planner-pool-panel${options.horizontal ? " horizontal" : ""}`;
  const availableTeams = teamRecords.filter((record) => isPlannerTeamFreeOnDate(record.id, dateValue));
  const header = document.createElement("div");
  header.className = "planner-panel-header";
  header.innerHTML = `
    <div>
      <h4>${escapeHtml(options.title || "Available Teams")}</h4>
      <p class="muted">${availableTeams.length} free team${availableTeams.length === 1 ? "" : "s"} on ${escapeHtml(formatPlannerDate(dateValue, { weekday: "long", day: "numeric", month: "short" }))}</p>
    </div>
  `;
  section.append(header);
  if (!availableTeams.length) {
    section.append(createProjectDetailsEmptyState("No free teams", "All teams are already planned on this date."));
    return section;
  }
  const list = document.createElement("div");
  list.className = `planner-team-chip-list${options.horizontal ? " horizontal" : ""}`;
  for (const record of availableTeams) {
    list.append(buildPlannerTeamChip(record));
  }
  section.append(list);
  return section;
}

function buildPlannerWeekProjectCard(project, dateValue) {
  const card = document.createElement("article");
  card.className = "planner-project-card";
  const theme = buildProjectTheme(project.surfaceColor || "#fffaf2");
  card.style.setProperty("--planner-project-surface", theme.surface);
  card.style.setProperty("--planner-project-soft", theme.soft);
  card.style.setProperty("--planner-project-frame", theme.frame);
  card.style.setProperty("--planner-project-card", theme.card);
  const assignments = getPlannerAssignmentsForProjectDate(project.id, dateValue);
  const body = document.createElement("div");
  body.className = "planner-project-card-body";
  if (assignments.length) {
    const list = document.createElement("div");
    list.className = "planner-assignment-list";
    for (const assignment of assignments) {
      list.append(buildPlannerAssignmentButton(assignment));
    }
    body.append(list);
  } else {
    body.append(createProjectDetailsEmptyState("No teams planned", "Pick a free team and assign it to this project."));
  }
  const footer = document.createElement("div");
  footer.className = "planner-project-card-footer";
  if (canManagePlannerProject(project.id)) {
    const assignBtn = document.createElement("button");
    assignBtn.type = "button";
    assignBtn.className = selectedPlannerTeamId ? "secondary-btn" : "ghost-btn";
    assignBtn.textContent = selectedPlannerTeamId ? "Assign selected team" : "New assignment";
    assignBtn.addEventListener("click", () => openPlannerAssignmentDialog(null, {
      teamId: selectedPlannerTeamId || "",
      projectId: project.id,
      date: dateValue,
      startTime: PLANNER_DEFAULT_START_TIME,
      endTime: PLANNER_DEFAULT_END_TIME,
    }));
    footer.append(assignBtn);
  }
  card.innerHTML = `
    <div class="planner-project-card-header">
      <div>
        <strong>${escapeHtml(getProjectDisplayName(project))}</strong>
        <span>${escapeHtml(formatPlannerDate(project.startDate || dateValue, { day: "numeric", month: "short" }))}${project.endDate ? ` - ${escapeHtml(formatPlannerDate(project.endDate, { day: "numeric", month: "short" }))}` : ""}</span>
      </div>
      <span class="meta-pill">${assignments.length} planned</span>
    </div>
  `;
  card.append(body, footer);
  return card;
}

function buildPlannerWeekBoard(dates, teamRecords) {
  const board = document.createElement("div");
  board.className = "planner-week-board";
  for (const dateValue of dates) {
    const dayColumn = document.createElement("section");
    dayColumn.className = "planner-day-column";
    const openProjects = getPlannerVisibleProjects().filter((project) => isProjectOpenOnDate(project, dateValue));
    const header = document.createElement("header");
    header.className = "planner-day-column-header";
    header.innerHTML = `
      <span>${escapeHtml(formatPlannerDate(dateValue, { weekday: "short" }))}</span>
      <strong>${escapeHtml(formatPlannerDate(dateValue, { day: "numeric", month: "short" }))}</strong>
    `;
    dayColumn.append(header);
    dayColumn.append(buildPlannerPoolPanel(dateValue, teamRecords));
    const projectStack = document.createElement("div");
    projectStack.className = "planner-project-stack";
    if (!openProjects.length) {
      projectStack.append(createProjectDetailsEmptyState("No open projects", "There are no active projects for this day."));
    } else {
      for (const project of openProjects) {
        projectStack.append(buildPlannerWeekProjectCard(project, dateValue));
      }
    }
    dayColumn.append(projectStack);
    board.append(dayColumn);
  }
  return board;
}

function buildPlannerAssignmentLaneLayout(assignments) {
  const laneEndTimes = [];
  const entries = [];
  for (const assignment of assignments) {
    const startMinutes = timeStringToMinutes(assignment.startTime);
    const endMinutes = timeStringToMinutes(assignment.endTime);
    let laneIndex = laneEndTimes.findIndex((laneEnd) => laneEnd <= startMinutes);
    if (laneIndex === -1) {
      laneIndex = laneEndTimes.length;
      laneEndTimes.push(endMinutes);
    } else {
      laneEndTimes[laneIndex] = endMinutes;
    }
    entries.push({ assignment, laneIndex });
  }
  return {
    laneCount: Math.max(1, laneEndTimes.length),
    entries,
  };
}

function buildPlannerDayProjectRow(project, dateValue, slotMinutes, slotCount) {
  const row = document.createElement("article");
  row.className = "planner-day-project-row";
  const theme = buildProjectTheme(project.surfaceColor || "#fffaf2");
  row.style.setProperty("--planner-project-surface", theme.surface);
  row.style.setProperty("--planner-project-soft", theme.soft);
  row.style.setProperty("--planner-project-frame", theme.frame);
  row.style.setProperty("--planner-project-card", theme.card);

  const header = document.createElement("div");
  header.className = "planner-day-project-label";
  header.innerHTML = `
    <strong>${escapeHtml(getProjectDisplayName(project))}</strong>
    <span>${escapeHtml(formatPlannerDate(project.startDate || dateValue, { day: "numeric", month: "short" }))}${project.endDate ? ` - ${escapeHtml(formatPlannerDate(project.endDate, { day: "numeric", month: "short" }))}` : ""}</span>
  `;
  if (canManagePlannerProject(project.id)) {
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "ghost-btn";
    addBtn.textContent = "New";
    addBtn.addEventListener("click", () => openPlannerAssignmentDialog(null, {
      teamId: selectedPlannerTeamId || "",
      projectId: project.id,
      date: dateValue,
      startTime: PLANNER_DEFAULT_START_TIME,
      endTime: PLANNER_DEFAULT_END_TIME,
    }));
    header.append(addBtn);
  }

  const assignments = getPlannerAssignmentsForProjectDate(project.id, dateValue);
  const layout = buildPlannerAssignmentLaneLayout(assignments);
  const timeline = document.createElement("div");
  timeline.className = "planner-day-track-shell";

  const slotGrid = document.createElement("div");
  slotGrid.className = "planner-day-slot-grid";
  slotGrid.style.gridTemplateColumns = `repeat(${slotCount}, minmax(72px, 1fr))`;
  slotGrid.style.gridTemplateRows = `repeat(${layout.laneCount}, minmax(58px, auto))`;
  for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
    const startMinutes = (PLANNER_DAY_START_HOUR * 60) + (slotIndex * slotMinutes);
    const startTime = minutesToTimeString(startMinutes);
    const endTime = addMinutesToTimeString(startTime, slotMinutes);
    const slotBtn = document.createElement("button");
    slotBtn.type = "button";
    slotBtn.className = "planner-day-slot";
    slotBtn.style.gridColumn = `${slotIndex + 1}`;
    slotBtn.style.gridRow = `1 / span ${layout.laneCount}`;
    slotBtn.title = canManagePlannerProject(project.id)
      ? `Add assignment at ${startTime}`
      : "No planner access for this project";
    slotBtn.disabled = !canManagePlannerProject(project.id);
    slotBtn.addEventListener("click", () => openPlannerAssignmentDialog(null, {
      teamId: selectedPlannerTeamId || "",
      projectId: project.id,
      date: dateValue,
      startTime,
      endTime,
    }));
    slotGrid.append(slotBtn);
  }

  const assignmentLayer = document.createElement("div");
  assignmentLayer.className = "planner-day-assignment-layer";
  assignmentLayer.style.gridTemplateColumns = `repeat(${slotCount}, minmax(72px, 1fr))`;
  assignmentLayer.style.gridTemplateRows = `repeat(${layout.laneCount}, minmax(58px, auto))`;
  for (const entry of layout.entries) {
    const startMinutes = Math.max(PLANNER_DAY_START_HOUR * 60, timeStringToMinutes(entry.assignment.startTime));
    const endMinutes = Math.min(PLANNER_DAY_END_HOUR * 60, timeStringToMinutes(entry.assignment.endTime));
    const columnStart = Math.max(1, Math.floor((startMinutes - (PLANNER_DAY_START_HOUR * 60)) / slotMinutes) + 1);
    const columnEnd = Math.max(columnStart + 1, Math.ceil((endMinutes - (PLANNER_DAY_START_HOUR * 60)) / slotMinutes) + 1);
    const block = buildPlannerAssignmentButton(entry.assignment);
    block.classList.add("planner-assignment-block");
    block.style.gridColumn = `${columnStart} / ${Math.min(slotCount + 1, columnEnd)}`;
    block.style.gridRow = `${entry.laneIndex + 1}`;
    assignmentLayer.append(block);
  }

  timeline.append(slotGrid, assignmentLayer);
  row.append(header, timeline);
  return row;
}

function buildPlannerDayBoard(dateValue, teamRecords) {
  const board = document.createElement("div");
  board.className = "planner-day-board";
  board.append(buildPlannerPoolPanel(dateValue, teamRecords, {
    title: "Available Teams",
    horizontal: true,
  }));

  const projects = getPlannerVisibleProjects().filter((project) => isProjectOpenOnDate(project, dateValue));
  if (!projects.length) {
    board.append(createProjectDetailsEmptyState("No open projects", "There are no active projects for this date."));
    return board;
  }

  const slotMinutes = plannerSlotHours * 60;
  const slotCount = Math.max(1, ((PLANNER_DAY_END_HOUR - PLANNER_DAY_START_HOUR) * 60) / slotMinutes);
  const ruler = document.createElement("div");
  ruler.className = "planner-day-ruler";
  const rulerLabel = document.createElement("div");
  rulerLabel.className = "planner-day-ruler-label";
  rulerLabel.textContent = "Projects";
  const rulerSlots = document.createElement("div");
  rulerSlots.className = "planner-day-ruler-slots";
  rulerSlots.style.gridTemplateColumns = `repeat(${slotCount}, minmax(72px, 1fr))`;
  for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
    const label = document.createElement("span");
    label.textContent = minutesToTimeString((PLANNER_DAY_START_HOUR * 60) + (slotIndex * slotMinutes));
    rulerSlots.append(label);
  }
  ruler.append(rulerLabel, rulerSlots);
  board.append(ruler);

  const rows = document.createElement("div");
  rows.className = "planner-day-row-list";
  for (const project of projects) {
    rows.append(buildPlannerDayProjectRow(project, dateValue, slotMinutes, slotCount));
  }
  board.append(rows);
  return board;
}

function renderPlanner() {
  if (!els.plannerBoard) return;
  if (selectedPlannerTeamId && !getPlannerTeamRecord(selectedPlannerTeamId)) {
    selectedPlannerTeamId = "";
  }
  if (![1, 2, 4].includes(plannerSlotHours)) plannerSlotHours = 1;
  if (!plannerAnchorDate) plannerAnchorDate = todayInputValue();

  els.plannerWeekBtn?.classList.toggle("active", plannerMode === "week");
  els.plannerDayBtn?.classList.toggle("active", plannerMode === "day");
  els.plannerHourlyBtn?.classList.toggle("active", plannerMode === "day" && plannerSlotHours === 1);
  els.planner2hBtn?.classList.toggle("active", plannerMode === "day" && plannerSlotHours === 2);
  els.planner4hBtn?.classList.toggle("active", plannerMode === "day" && plannerSlotHours === 4);
  if (els.plannerHourlyBtn) els.plannerHourlyBtn.disabled = plannerMode !== "day";
  if (els.planner2hBtn) els.planner2hBtn.disabled = plannerMode !== "day";
  if (els.planner4hBtn) els.planner4hBtn.disabled = plannerMode !== "day";

  const teamRecords = getPlannerTeamRecords();
  const activeDates = plannerMode === "week"
    ? Array.from({ length: 7 }, (_, index) => addDaysToIsoDate(getStartOfIsoWeek(plannerAnchorDate), index))
    : [plannerAnchorDate];
  const openProjectIds = new Set();
  for (const dateValue of activeDates) {
    for (const project of getPlannerVisibleProjects()) {
      if (isProjectOpenOnDate(project, dateValue)) openProjectIds.add(project.id);
    }
  }
  const periodAssignments = getPlannerAssignments().filter((assignment) => activeDates.includes(assignment.date));
  if (els.plannerRangeLabel) {
    if (plannerMode === "week") {
      els.plannerRangeLabel.textContent = `${formatPlannerDate(activeDates[0], { day: "numeric", month: "short", year: "numeric" })} - ${formatPlannerDate(activeDates[activeDates.length - 1], { day: "numeric", month: "short", year: "numeric" })}`;
    } else {
      els.plannerRangeLabel.textContent = formatPlannerDate(plannerAnchorDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
  }
  if (els.plannerSummary) {
    const suffix = plannerMode === "week"
      ? "Click a free team, then use a project card to create an assignment."
      : "Click a free team, then click a time slot to place it on the calendar.";
    els.plannerSummary.textContent = `${teamRecords.length} teams, ${openProjectIds.size} open projects, ${periodAssignments.length} assignment${periodAssignments.length === 1 ? "" : "s"} in this ${plannerMode}. ${suffix}`;
  }

  renderPlannerSelectionBar();
  els.plannerBoard.innerHTML = "";

  if (!teamRecords.length) {
    els.plannerBoard.append(createProjectDetailsEmptyState("No teams available", "Create at least one Service Team inside a project to start planning."));
    return;
  }

  if (!openProjectIds.size) {
    els.plannerBoard.append(createProjectDetailsEmptyState("No open projects", "Add project dates or activate a project so it appears in the planner."));
    return;
  }

  const board = plannerMode === "week"
    ? buildPlannerWeekBoard(activeDates, teamRecords)
    : buildPlannerDayBoard(plannerAnchorDate, teamRecords);
  els.plannerBoard.append(board);
}

function renderWorkspace() {
  const project = getCurrentProject();
  if (!project) return;
  const draftLocked = isDraftProjectLocked(project);
  ensureProjectFolderColors(project);
  if (currentWorkspaceTab === "open-tasks") {
    currentWorkspaceTab = "folders-hub";
    currentProjectDetailsTab = "tasks";
  }
  els.workspaceClientDropdown?.classList.remove("hidden");
  els.foldersHubTab.classList.remove("hidden");
  els.openTasksTab?.classList.add("hidden");
  els.addFolderTabBtn?.classList.remove("hidden");
  if (isUserRole() && !showOtherTeamsForUser && currentWorkspaceTab.startsWith("folder:")) {
    const currentFolder = project.folders.find((folder) => `folder:${folder.id}` === currentWorkspaceTab);
    if (currentFolder && !isUserInvolvedInTeam(currentFolder)) {
      currentWorkspaceTab = "folders-hub";
      project.selectedFolderId = null;
    }
  }
  const folder = getSelectedFolder();
  els.workspaceTabsShell?.classList.toggle("draft-locked", draftLocked);
  els.workspaceLockOverlay?.classList.toggle("hidden", !draftLocked);
  els.workspaceTitle.textContent = project?.name || "Untitled project";
  const projectDetailsActive = currentView === "projects" && currentWorkspaceTab === "folders-hub";
  const canViewTasks = canManageProject(project)
    || hasPermission("viewAllProjectTasks")
    || hasPermission("viewOwnAssignedTasks")
    || canWorkInProject(project);
  if (projectDetailsActive && !["plan", "areas", "tasks", "teams", "chat"].includes(currentProjectDetailsTab)) {
    currentProjectDetailsTab = "plan";
  }
  if (projectDetailsActive && currentProjectDetailsTab === "areas") {
    if (selectedProjectAreaId && !(project.areas || []).some((area) => area.id === selectedProjectAreaId && (showArchivedWorkspaceItems || !area.archivedAt))) {
      selectedProjectAreaId = "";
    }
  }
  if (!projectDetailsActive && !["note", "file", "photo"].includes(currentContentTab)) {
    currentContentTab = "note";
  }
  const hasFolder = Boolean(folder) && currentView === "projects" && currentWorkspaceTab.startsWith("folder:");
  const canAccessCurrentFolder = !hasFolder || canAccessTeamFolder(folder, project);
  const canUseActions = !project.archivedAt
    && currentView === "projects"
    && (
      projectDetailsActive
        ? canWorkInProject(project)
        : (Boolean(folder) && canAccessCurrentFolder)
    );
  const canUseProjectDetailsTabs = currentView === "projects" && projectDetailsActive;
  const canUseUserTabs = canUseActions || canUseProjectDetailsTabs;
  const canUseProjectDetailsActions = canUseProjectDetailsTabs && (canWorkInProject(project) || canViewTasks);
  els.addNoteBtn.disabled = projectDetailsActive ? false : !canUseUserTabs;
  els.addFileBtn.disabled = projectDetailsActive ? false : !canUseUserTabs;
  els.addPhotoBtn.disabled = projectDetailsActive ? false : !canUseUserTabs;
  if (els.addChatBtn) {
    els.addChatBtn.disabled = !canUseProjectDetailsTabs;
  }
  els.takePhotoBtn.disabled = !canUseActions;
  if (els.addTaskBtn) {
    els.addTaskBtn.disabled = projectDetailsActive ? !canViewTasks : true;
  }
  els.contentAddBtn.disabled = !(projectDetailsActive ? canUseProjectDetailsActions : canUseActions);
  els.folderActionBar.classList.add("hidden");
  els.mobileFab.disabled = !canUseActions;
  els.mobileFab.classList.toggle("hidden", !canUseActions);
  els.toggleArchivedBtn.classList.add("hidden");
  els.takePhotoBtn.classList.add("hidden");
  els.toggleArchivedBtn.textContent = showArchivedWorkspaceItems ? "Hide Archived" : "Show Archived";
  els.toggleArchivedBtn.disabled = !canManageProject(project) && !isAdmin();
  const canSwitchSectionView = currentView === "projects" && (projectDetailsActive || hasFolder);
  const showGlobalSectionViewToggle = currentView === "projects" && hasFolder;
  const sectionViewMode = canSwitchSectionView ? getSectionViewMode(project) : "boxes";
  els.sectionViewToggle?.classList.add("hidden");
  els.viewBoxesBtn?.classList.toggle("active", sectionViewMode === "boxes");
  els.viewListBtn?.classList.toggle("active", sectionViewMode === "list");
  els.toggleArchivedBtn.classList.toggle("archived-visible-state", showArchivedWorkspaceItems);
  applyActiveWorkspaceTheme(project);
  renderContentTabs(project);
  renderProjectMeta(project);
  renderViberRoomButton(project);
  renderNotificationsPanel(project);
  renderWorkspaceTabs(project);
  const showProjectTeamRail = renderProjectTeamRail(project);
  renderProjectTeamInfoBar(project);
  els.folderDetail.classList.toggle("with-team-rail", showProjectTeamRail);
  els.folderSummary.classList.add("hidden");

  if (currentWorkspaceTab === "folders-hub") {
    renderFoldersHub(project);
    return;
  }

  if (!folder) {
    els.folderEmptyState.classList.remove("hidden");
    els.folderDetail.classList.add("hidden");
    return;
  }
  els.folderEmptyState.classList.add("hidden");
  els.folderDetail.classList.remove("hidden");
  els.folderSummary.innerHTML = "";
  els.folderSummary.classList.add("hidden");
  if (!canAccessCurrentFolder) {
    els.folderItems.classList.remove("project-details-layout", "project-details-layout-no-shortcuts", "project-details-tab-layout");
    els.folderItems.innerHTML = `<section class="empty-state"><h3>Team files are limited</h3><p>Only members of this service team, managers, and admins can open the team notes, files, and pics here.</p></section>`;
    return;
  }
  renderItemsForCurrentContentTab(folder.items, folder.name);
}

function renderContentTabs(project) {
  const projectDetailsActive = currentWorkspaceTab === "folders-hub";
  const contentToneMap = {
    note: "tone-note",
    file: "tone-file",
    photo: "tone-photo",
    task: "tone-task",
    chat: "tone-chat",
    plan: "tone-note",
    areas: "tone-file",
    tasks: "tone-task",
    teams: "tone-photo",
    chat: "tone-chat",
  };

  els.folderDetail.classList.remove("tone-note", "tone-file", "tone-photo", "tone-task", "tone-chat", "tone-project-details", "tone-open-tasks");
  els.workspaceTabsShell?.classList.remove(
    "tone-note",
    "tone-file",
    "tone-photo",
    "tone-task",
    "tone-chat",
    "tone-project-details",
    "tone-open-tasks"
  );

  if (projectDetailsActive) {
    const projectDetailsButtons = [
      { key: "plan", button: els.addNoteBtn, color: CONTENT_TAB_COLORS.note, label: "Plan" },
      { key: "areas", button: els.addFileBtn, color: CONTENT_TAB_COLORS.file, label: "Areas" },
      { key: "tasks", button: els.addTaskBtn, color: CONTENT_TAB_COLORS.task, label: "Tasks" },
      { key: "teams", button: els.addPhotoBtn, color: CONTENT_TAB_COLORS.photo, label: "Teams" },
      { key: "chat", button: els.addChatBtn, color: CONTENT_TAB_COLORS.chat, label: "Chat" },
    ];
    for (const entry of projectDetailsButtons) {
      if (!entry.button) continue;
      entry.button.classList.remove("hidden");
      entry.button.classList.toggle("action-tab-details-team", entry.key === "teams");
      entry.button.textContent = entry.label;
      entry.button.classList.toggle("active", currentProjectDetailsTab === entry.key);
      applyTabTheme(entry.button, buildTabTheme(entry.color), "subtab");
    }
    els.folderDetail.classList.add(contentToneMap[currentProjectDetailsTab] || "tone-project-details");
    els.workspaceTabsShell?.classList.add(contentToneMap[currentProjectDetailsTab] || "tone-project-details");
  } else {
    const folderButtons = [
      { key: "note", button: els.addNoteBtn, color: CONTENT_TAB_COLORS.note, label: "Note" },
      { key: "file", button: els.addFileBtn, color: CONTENT_TAB_COLORS.file, label: "Files" },
      { key: "photo", button: els.addPhotoBtn, color: CONTENT_TAB_COLORS.photo, label: "Pics" },
    ];
    els.addTaskBtn?.classList.add("hidden");
    els.addChatBtn?.classList.add("hidden");
    for (const entry of folderButtons) {
      entry.button.classList.remove("hidden");
      entry.button.classList.remove("action-tab-details-team");
      entry.button.textContent = entry.label;
      entry.button.classList.toggle("active", currentContentTab === entry.key);
      applyTabTheme(entry.button, buildTabTheme(entry.color), "subtab");
    }
    els.folderDetail.classList.add(contentToneMap[currentContentTab] || "tone-note");
    els.workspaceTabsShell?.classList.add(contentToneMap[currentContentTab] || "tone-note");
  }
  els.folderActionBar?.classList.add("hidden");
  els.folderDetail?.classList.toggle("bottom-tab-content-mode", !projectDetailsActive);
  els.folderEmptyState?.classList.toggle("bottom-tab-content-mode", !projectDetailsActive);
  els.contentAddBtn.classList.add("hidden");
}

function renderWorkspaceTabs(project) {
  els.folderTabList.innerHTML = "";
  const quickFilter = getProjectAreaQuickFilter(project);
  let areas = (project?.areas || []).filter((area) => showArchivedWorkspaceItems || !area.archivedAt);
  if (isAreaQuickFilterActive(quickFilter)) {
    areas = areas.filter((area) => areaMatchesQuickFilter(area, quickFilter));
  }
  if (selectedProjectAreaId && !areas.some((area) => area.id === selectedProjectAreaId)) {
    selectedProjectAreaId = "";
  }
  els.foldersHubTab.classList.toggle("active", currentWorkspaceTab === "folders-hub" && !selectedProjectAreaId);
  els.openTasksTab?.classList.toggle("active", false);
  els.folderTabList.classList.remove("hidden");

  for (const area of areas) {
    const tab = createProjectDetailsAreaTab(project, area);
    tab.classList.toggle("archived-item-card", Boolean(area.archivedAt));
    tab.classList.toggle(
      "active",
      currentWorkspaceTab === "folders-hub" && selectedProjectAreaId === area.id
    );
    els.folderTabList.append(tab);
  }

  if (canManageProject(project)) {
    const addAreaTab = document.createElement("button");
    addAreaTab.type = "button";
    addAreaTab.className = "workspace-tab add-tab";
    addAreaTab.textContent = "+";
    addAreaTab.title = "Add area";
    addAreaTab.setAttribute("aria-label", "Add area");
    addAreaTab.addEventListener("click", onAreaAdd);
    els.folderTabList.append(addAreaTab);
  }

  if (els.workspaceShowArchivedAreasBtn) {
    const showToggle = currentView === "projects" && Boolean(project);
    const archivedCount = (project?.areas || []).filter((area) => area.archivedAt).length;
    els.workspaceShowArchivedAreasBtn.classList.toggle("hidden", !showToggle);
    els.workspaceShowArchivedAreasBtn.disabled = archivedCount === 0 && !showArchivedWorkspaceItems;
    els.workspaceShowArchivedAreasBtn.textContent = showArchivedWorkspaceItems ? "Hide archived elements" : "Show archived elements";
  }
  if (els.workspaceAreaFilterBtn) {
    const showToggle = currentView === "projects" && Boolean(project);
    els.workspaceAreaFilterBtn.classList.toggle("hidden", !showToggle);
    els.workspaceAreaFilterBtn.classList.toggle("active", isAreaQuickFilterActive(quickFilter));
    els.workspaceAreaFilterBtn.textContent = isAreaQuickFilterActive(quickFilter) ? "Filter (on)" : "Filter";
  }
  applyTabTheme(els.foldersHubTab, buildTabTheme(PRIMARY_TAB_COLORS["folders-hub"]), "tab");
  if (els.openTasksTab) {
    applyTabTheme(els.openTasksTab, buildTabTheme(PRIMARY_TAB_COLORS["open-tasks"]), "tab");
  }
}

function renderProjectTeamRail(project) {
  if (!els.projectTeamRail) return;
  els.projectTeamRail.innerHTML = "";
  const shouldShow = currentView === "projects" && Boolean(project) && currentWorkspaceTab === "folders-hub";
  if (!shouldShow || !project) {
    els.projectTeamRail.classList.add("hidden");
    return false;
  }

  const canManage = canManageProject(project);
  const teams = getAllActiveProjectTeams(project);
  const selectedTeamIds = new Set(getProjectTeamFilterIds(project));
  const activeTeamId = getSelectedProjectTeamInfoId(project);

  const header = document.createElement("div");
  header.className = "project-team-rail-header";
  header.innerHTML = `
    <strong>Teams</strong>
    ${canManage ? '<button class="project-team-rail-add" type="button" aria-label="Add team">+</button>' : ""}
  `;
  els.projectTeamRail.append(header);
  header.querySelector(".project-team-rail-add")?.addEventListener("click", onAddFolderFromTabBar);

  const list = document.createElement("div");
  list.className = "project-team-rail-list";

  if (!teams.length) {
    const empty = document.createElement("p");
    empty.className = "project-team-rail-empty";
    empty.textContent = "No teams yet.";
    list.append(empty);
    els.projectTeamRail.append(list);
    els.projectTeamRail.classList.remove("hidden");
    return true;
  }

  for (const team of teams) {
    const isSelected = selectedTeamIds.has(team.id);
    const isActive = activeTeamId === team.id;
    const theme = buildTabTheme(team.tabColor || pickNextFolderColor(project));
    const entry = document.createElement("div");
    entry.className = `project-team-rail-item${isSelected ? " filtered" : ""}${isActive ? " active" : ""}`;
    entry.style.setProperty("--team-rail-bg", theme.soft);
    entry.style.setProperty("--team-rail-shadow", theme.shadow);
    entry.style.setProperty("--team-rail-strong", team.tabColor || pickNextFolderColor(project));

    if (canManage) {
      entry.draggable = true;
      entry.classList.add("draggable-tab");
      entry.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("text/service-team-id", team.id);
        event.dataTransfer.effectAllowed = "move";
      });
    }

    const filterLabel = document.createElement("label");
    filterLabel.className = "project-team-rail-check";
    filterLabel.title = "Filter by this team";
    filterLabel.addEventListener("click", (event) => event.stopPropagation());

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isSelected;
    checkbox.setAttribute("aria-label", `Filter ${team.name}`);
    checkbox.addEventListener("change", () => toggleProjectTeamFilter(team.id, checkbox.checked, project));
    filterLabel.append(checkbox);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-team-rail-button";
    button.textContent = team.name;
    button.title = team.name;
    button.addEventListener("click", () => {
      selectProjectTeamInfo(team.id);
      openServiceTeamDialog(team.id);
    });

    entry.append(filterLabel, button);
    list.append(entry);
  }

  els.projectTeamRail.append(list);
  els.projectTeamRail.classList.remove("hidden");
  return true;
}

function renderProjectTeamInfoBar(project) {
  if (!els.projectTeamInfoBar) return;
  els.projectTeamInfoBar.innerHTML = "";
  els.projectTeamInfoBar.classList.add("hidden");
}

function openServiceTeamWorkspace(project, folderId) {
  if (!project) return;
  pushNavigationState();
  project.selectedTeamInfoId = folderId;
  project.selectedFolderId = folderId;
  if (isMobileProjectViewport()) currentMobileProjectsPane = "detail";
  currentWorkspaceTab = `folder:${folderId}`;
  if (!["note", "file", "photo"].includes(currentContentTab)) currentContentTab = "note";
  persist();
  renderWorkspace();
}

function createProjectDetailsTeamTab(project, folder) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "workspace-tab project-details-team-tab";
  button.textContent = folder.name;
  if (canManageProject(project)) {
    button.draggable = true;
    button.classList.add("draggable-tab");
    button.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData("text/service-team-id", folder.id);
      event.dataTransfer.effectAllowed = "move";
    });
  }
  applyTabTheme(button, buildTabTheme(folder.tabColor || pickNextFolderColor(project)), "tab");
  button.addEventListener("click", () => openServiceTeamDialog(folder.id));
  return button;
}

function createProjectDetailsAreaTab(project, area) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "workspace-tab project-details-area-tab";
  const floorSuffix = normalizeFloorName(area?.floor) ? ` - ${normalizeFloorName(area.floor)}` : "";
  button.textContent = `${area.name || "Area"}${floorSuffix}`;
  applyTabTheme(button, buildTabTheme(CONTENT_TAB_COLORS.file), "tab");
  button.addEventListener("click", () => {
    currentWorkspaceTab = "folders-hub";
    currentProjectDetailsTab = "areas";
    selectedProjectAreaId = area.id;
    renderWorkspace();
  });
  return button;
}

function renderFoldersHub(project) {
  const detailsFolder = getProjectDetailsFolder(project);
  els.folderEmptyState.classList.add("hidden");
  els.folderDetail.classList.remove("hidden");
  renderProjectDetailsDashboard(project, detailsFolder);
}

function renderOpenTasks(project) {
  els.folderItems.classList.remove("project-details-layout", "project-details-layout-no-shortcuts", "project-details-tab-layout");
  const tasks = collectProjectItems(project, "task", false).filter((task) => showArchivedWorkspaceItems || !task.archivedAt);
  els.folderEmptyState.classList.add("hidden");
  els.folderDetail.classList.remove("hidden");
  els.folderItems.innerHTML = "";
  if (!tasks.length) {
    els.folderItems.innerHTML = `<section class="empty-state"><h3>No active tasks</h3><p>Create a task inside a Service Team tab to see it here.</p></section>`;
    return;
  }
  els.folderItems.append(createTaskCardGrid(project, tasks));
}

function renderItemsForCurrentContentTab(items, areaName) {
  els.folderItems.classList.remove("project-details-layout", "project-details-layout-no-shortcuts", "project-details-tab-layout");
  applyCollectionViewMode(els.folderItems, getSectionViewMode(getCurrentProject(), `folder:${currentContentTab}`));
  let sourceItems = items;
  const selectedFolder = getSelectedFolder();
  const project = getCurrentProject();
  if (currentContentTab === "task" && selectedFolder && project) {
    const areaTasks = (project.areas || [])
      .filter((area) => showArchivedWorkspaceItems || !area.archivedAt)
      .flatMap((area) => (area.items || [])
        .filter((item) => item.type === "task" && item.assigneeId === selectedFolder.id)
        .map((item) => ({
          ...item,
          linkedAreaId: item.linkedAreaId || area.id,
          linkedAreaName: item.linkedAreaName || area.name,
        })));
    sourceItems = [...items, ...areaTasks];
  }

  const filteredItems = sourceItems.filter((item) => {
    if (!showArchivedWorkspaceItems && item.archivedAt) return false;
    if (currentContentTab === "note") return item.type === "note";
    if (currentContentTab === "file") return item.type === "file";
    if (currentContentTab === "photo") return item.type === "photo";
    return item.type === "task" && item.status !== "Done";
  });

  els.folderItems.innerHTML = "";
  if (!filteredItems.length) {
    return;
  }

  if (currentContentTab === "task") {
    const project = getCurrentProject();
    const viewMode = getSectionViewMode(project, `folder:${currentContentTab}`);
    if (viewMode === "list") {
      els.folderItems.append(createTaskListView(project, filteredItems));
      return;
    }
    els.folderItems.append(createTaskCardGrid(project, filteredItems));
    return;
  }

  const galleryEntries = buildGalleryEntriesFromItems(filteredItems);
  for (const item of filteredItems) {
    const card = els.itemCardTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.itemId = item.id;
    applyCardTheme(card, getCurrentProject());
    if (item.archivedAt) card.classList.add("archived-item-card");
    attachCardMenu(card, buildItemMenuActions(item.id));
    attachServiceTeamDropTarget(card, getCurrentProject(), (teamId) => linkServiceTeamToItem(teamId, item.id));
    card.append(renderItem(item, { galleryEntries }));
    els.folderItems.append(card);
  }
}

function renderProjectDetailsDashboard(project, detailsFolder) {
  const canManage = canManageProject(project);
  const canWork = canWorkInProject(project);
  const areaFilter = getSelectedAreaFilter(project);
  const canViewTasks = canManage
    || hasPermission("viewAllProjectTasks")
    || hasPermission("viewOwnAssignedTasks")
    || canWork;
  els.folderItems.classList.remove("project-details-layout", "project-details-layout-no-shortcuts", "list-view");
  els.folderItems.classList.add("project-details-tab-layout");
  els.folderItems.innerHTML = "";
  if (currentProjectDetailsTab === "plan") {
    els.folderItems.append(buildProjectDetailsPlanLayout(project, detailsFolder, canManage, null));
    return;
  }
  if (currentProjectDetailsTab === "areas") {
    els.folderItems.append(buildProjectAreaWorkspaceSection(project, canWork));
    return;
  }
  if (currentProjectDetailsTab === "tasks") {
    els.folderItems.append(buildProjectDetailsTasksSection(project, canManage, canViewTasks, areaFilter));
    return;
  }
  if (currentProjectDetailsTab === "teams") {
    els.folderItems.append(buildProjectDetailsTeamsSection(project, canManage, areaFilter));
    return;
  }
  if (currentProjectDetailsTab === "chat") {
    els.folderItems.append(buildProjectDetailsChatSection(project));
    return;
  }
  els.folderItems.append(buildProjectDetailsPlanLayout(project, detailsFolder, canWork, areaFilter));
}

function applyCollectionViewMode(element, viewMode) {
  element?.classList.toggle("list-view", viewMode === "list");
}

function createProjectDetailsPanel(title) {
  const section = document.createElement("section");
  section.className = "dashboard-section project-details-panel";
  const header = document.createElement("div");
  header.className = "dashboard-section-header";
  const heading = document.createElement("h3");
  heading.textContent = title;
  header.append(heading);
  section.append(header);
  return { section, header };
}

function appendDashboardSectionControls(header, controls = []) {
  const validControls = controls.filter(Boolean);
  if (!validControls.length) return;
  const actionGroup = document.createElement("div");
  actionGroup.className = "dashboard-section-actions";
  for (const control of validControls) {
    actionGroup.append(control);
  }
  header.append(actionGroup);
}

function createSectionViewToggleControl(project, key) {
  const viewMode = getSectionViewMode(project, key);
  const toggle = document.createElement("div");
  toggle.className = "segmented-toggle inline-section-view-toggle";
  toggle.setAttribute("aria-label", "Section view");

  const boxesButton = document.createElement("button");
  boxesButton.type = "button";
  boxesButton.className = `segmented-toggle-btn${viewMode === "boxes" ? " active" : ""}`;
  boxesButton.setAttribute("aria-label", "Box view");
  boxesButton.title = "Box view";
  boxesButton.innerHTML = `<span class="toggle-icon toggle-icon-grid" aria-hidden="true"></span>`;
  boxesButton.addEventListener("click", () => setSectionViewMode("boxes", project, key));

  const listButton = document.createElement("button");
  listButton.type = "button";
  listButton.className = `segmented-toggle-btn${viewMode === "list" ? " active" : ""}`;
  listButton.setAttribute("aria-label", "List view");
  listButton.title = "List view";
  listButton.innerHTML = `<span class="toggle-icon toggle-icon-list" aria-hidden="true"></span>`;
  listButton.addEventListener("click", () => setSectionViewMode("list", project, key));

  toggle.append(boxesButton, listButton);
  return toggle;
}

function createPlansViewToggleControl(project, key = "details:plan") {
  const viewMode = getSectionViewMode(project, key);
  const toggle = document.createElement("div");
  toggle.className = "segmented-toggle inline-section-view-toggle";
  toggle.setAttribute("aria-label", "Plans view");

  const tilesButton = document.createElement("button");
  tilesButton.type = "button";
  tilesButton.className = `segmented-toggle-btn${viewMode === "boxes" ? " active" : ""}`;
  tilesButton.setAttribute("aria-label", "Tile view");
  tilesButton.title = "Tile view";
  tilesButton.innerHTML = `<span class="toggle-icon toggle-icon-grid" aria-hidden="true"></span>`;
  tilesButton.addEventListener("click", () => setSectionViewMode("boxes", project, key));

  const listButton = document.createElement("button");
  listButton.type = "button";
  listButton.className = `segmented-toggle-btn${viewMode === "list" ? " active" : ""}`;
  listButton.setAttribute("aria-label", "List view");
  listButton.title = "List view";
  listButton.innerHTML = `<span class="toggle-icon toggle-icon-list" aria-hidden="true"></span>`;
  listButton.addEventListener("click", () => setSectionViewMode("list", project, key));

  toggle.append(tilesButton, listButton);
  return toggle;
}

function createProjectDetailsEmptyState(title, description) {
  const empty = document.createElement("section");
  empty.className = "empty-state";
  empty.innerHTML = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p>`;
  return empty;
}

function createProjectDetailsItemGrid(project, items) {
  const grid = document.createElement("div");
  grid.className = "item-grid";
  const galleryEntries = buildGalleryEntriesFromItems(items);
  for (const item of items) {
    const card = els.itemCardTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.itemId = item.id;
    applyCardTheme(card, project);
    if (item.archivedAt) card.classList.add("archived-item-card");
    attachCardMenu(card, buildItemMenuActions(item.id));
    attachServiceTeamDropTarget(card, project, (teamId) => linkServiceTeamToItem(teamId, item.id));
    card.append(renderItem(item, { galleryEntries }));
    grid.append(card);
  }
  return grid;
}

function isTaskExpanded(taskId) {
  return expandedTaskId === taskId;
}

function setExpandedTask(taskId) {
  expandedTaskId = expandedTaskId === taskId ? "" : taskId;
  syncExpandedTaskElements();
}

function syncExpandedTaskElements(scope = document) {
  const taskElements = scope.querySelectorAll("[data-task-expandable='true']");
  for (const element of taskElements) {
    const expanded = isTaskExpanded(element.dataset.taskId || "");
    element.classList.toggle("expanded", expanded);
    element.querySelector(".task-entry-summary")?.setAttribute("aria-expanded", expanded ? "true" : "false");
    const details = element.querySelector(".task-entry-details");
    if (details) details.hidden = !expanded;
  }
}

function createInlineTaskMenu(taskId) {
  const menu = createCardMenu(buildItemMenuActions(taskId));
  if (!menu) return null;
  menu.classList.add("inline-card-menu");
  return menu;
}

function getTaskAssigneeLabel(task) {
  return task.assigneeName || task.folderName || "Not assigned";
}

function getTaskLocationLabel(task) {
  return task.linkedAreaName || "Project";
}

function getTaskDueLabel(task) {
  return task.dueDate || "No date";
}

function getTaskStatusLabel(task) {
  return task.status || "Open";
}

function getTaskSnippet(task) {
  const notes = String(task.notes || "").trim();
  if (notes) return notes.length > 120 ? `${notes.slice(0, 117)}...` : notes;
  return [getTaskLocationLabel(task), getTaskDueLabel(task)].filter(Boolean).join(" | ");
}

function createTaskDetails(task) {
  const detail = document.createElement("div");
  detail.className = "task-entry-details";
  const linkedFolders = resolveLinkedFolders(task.linkedFolderIds || []);
  const linkedPhotos = resolveLinkedPhotos(task.linkedPhotoIds || []);
  const archiveBadge = task.archivedAt
    ? `<span class="meta-pill status-pill-archived">Archived</span>`
    : "";
  detail.innerHTML = `
    <div class="task-entry-details-grid">
      <section class="task-entry-detail-block">
        <span class="task-entry-detail-label">Details</span>
        <p>${escapeHtml(task.notes || "No extra notes.")}</p>
      </section>
      <section class="task-entry-detail-block">
        <span class="task-entry-detail-label">Task Info</span>
        <div class="meta-row">
          ${archiveBadge}
          <span class="meta-pill status-pill-${escapeHtml(getTaskStatusLabel(task).toLowerCase())}">${escapeHtml(getTaskStatusLabel(task))}</span>
          <span class="meta-pill">Assigned: ${escapeHtml(getTaskAssigneeLabel(task))}</span>
          <span class="meta-pill">Area: ${escapeHtml(getTaskLocationLabel(task))}</span>
          <span class="meta-pill">Due: ${escapeHtml(getTaskDueLabel(task))}</span>
          <span class="meta-pill">${escapeHtml(new Date(task.createdAt).toLocaleString())}</span>
        </div>
      </section>
    </div>
  `;
  if (linkedFolders.length) {
    const linkedTeams = document.createElement("section");
    linkedTeams.className = "task-entry-detail-block";
    linkedTeams.innerHTML = `
      <span class="task-entry-detail-label">Linked Teams</span>
      <div class="meta-row">${linkedFolders.map((folder) => buildTeamPillMarkup(folder, "Team", canManageProject(getCurrentProject()) ? {
        disconnectAction: "item-team",
        itemId: task.id,
        teamId: folder.id,
      } : {})).join("")}</div>
    `;
    detail.append(linkedTeams);
  }
  if (linkedPhotos.length) {
    const linkedPhotoSection = document.createElement("section");
    linkedPhotoSection.className = "task-entry-detail-block";
    linkedPhotoSection.innerHTML = `
      <span class="task-entry-detail-label">Linked Pictures</span>
      <div class="progress-strip task-entry-photo-strip">
        ${linkedPhotos.slice(0, 4).map((photo) => `<img src="${photo.previewUrl}" alt="${escapeHtml(photo.title)}">`).join("")}
      </div>
      <div class="meta-row"><span class="meta-pill">${linkedPhotos.length} picture(s)</span></div>
      <div class="meta-row">${linkedPhotos.map((photo) => buildPhotoConnectionPillMarkup(photo, canManageProject(getCurrentProject()) ? {
        disconnectAction: "item-photo",
        itemId: task.id,
        photoId: photo.id,
      } : {})).join("")}</div>
    `;
    detail.append(linkedPhotoSection);
  }
  bindConnectionActionButtons(detail);
  return detail;
}

function createExpandableTaskElement(project, task, variant = "card") {
  const entry = document.createElement("article");
  entry.className = `item-card task-entry task-entry-${variant}`;
  if (variant === "card") entry.classList.add("compact-card");
  applyCardTheme(entry, project);
  if (task.archivedAt) entry.classList.add("archived-item-card");
  entry.dataset.taskExpandable = "true";
  entry.dataset.taskId = task.id;
  attachServiceTeamDropTarget(entry, project, (teamId) => linkServiceTeamToItem(teamId, task.id));

  const summary = document.createElement("div");
  summary.className = `task-entry-summary task-entry-summary-${variant}`;
  summary.tabIndex = 0;
  summary.setAttribute("role", "button");
  summary.setAttribute("aria-expanded", isTaskExpanded(task.id) ? "true" : "false");
  const toggleExpanded = (event) => {
    if (event.target instanceof Element && event.target.closest(".card-menu")) return;
    setExpandedTask(task.id);
  };
  summary.addEventListener("click", toggleExpanded);
  summary.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleExpanded(event);
  });

  const primary = document.createElement("div");
  primary.className = "task-entry-primary";
  primary.innerHTML = `
    <span class="task-entry-chevron" aria-hidden="true"></span>
    <div class="task-entry-copy">
      <strong class="task-entry-title">${escapeHtml(task.title || "Untitled task")}</strong>
      <span class="task-entry-snippet">${escapeHtml(getTaskSnippet(task))}</span>
    </div>
  `;
  const menu = createInlineTaskMenu(task.id);
  if (menu) primary.append(menu);
  summary.append(primary);

  if (variant === "list") {
    const team = document.createElement("span");
    team.className = "task-entry-col";
    team.textContent = getTaskAssigneeLabel(task);
    const area = document.createElement("span");
    area.className = "task-entry-col";
    area.textContent = getTaskLocationLabel(task);
    const due = document.createElement("span");
    due.className = "task-entry-col";
    due.textContent = getTaskDueLabel(task);
    const status = document.createElement("span");
    status.className = "task-entry-status";
    status.innerHTML = `<span class="meta-pill status-pill-${escapeHtml(getTaskStatusLabel(task).toLowerCase())}">${escapeHtml(getTaskStatusLabel(task))}</span>`;
    summary.append(team, area, due, status);
  } else {
    const meta = document.createElement("div");
    meta.className = "task-entry-card-meta";
    meta.innerHTML = `
      <span class="meta-pill">Assigned: ${escapeHtml(getTaskAssigneeLabel(task))}</span>
      <span class="meta-pill">Area: ${escapeHtml(getTaskLocationLabel(task))}</span>
      <span class="meta-pill">Due: ${escapeHtml(getTaskDueLabel(task))}</span>
      <span class="meta-pill status-pill-${escapeHtml(getTaskStatusLabel(task).toLowerCase())}">${escapeHtml(getTaskStatusLabel(task))}</span>
    `;
    summary.append(meta);
  }

  const details = createTaskDetails(task);
  details.hidden = !isTaskExpanded(task.id);
  entry.append(summary, details);
  entry.classList.toggle("expanded", isTaskExpanded(task.id));
  return entry;
}

function createTaskListView(project, tasks) {
  const list = document.createElement("div");
  list.className = "task-mail-list";
  for (const task of tasks) {
    list.append(createExpandableTaskElement(project, task, "list"));
  }
  return list;
}

function createTaskCardGrid(project, tasks) {
  const grid = document.createElement("div");
  grid.className = "dashboard-grid";
  for (const task of tasks) {
    grid.append(createExpandableTaskElement(project, task, "card"));
  }
  return grid;
}

function getFilteredAreaItems(area, project) {
  return (area.items || []).filter((item) => {
    if (!showArchivedWorkspaceItems && item.archivedAt) return false;
    return itemMatchesSelectedTeams(item, project);
  });
}

function getAreaById(areaId, project = getCurrentProject()) {
  return project?.areas?.find((area) => area.id === areaId) || null;
}

function getSelectedAreaFilter(project = getCurrentProject()) {
  if (!project || !selectedProjectAreaId) return null;
  const area = getAreaById(selectedProjectAreaId, project);
  if (!area) return null;
  if (area.archivedAt && !showArchivedWorkspaceItems) return null;
  return area;
}

function buildGalleryEntryKey(item) {
  if (!item?.id) return "";
  if (item.type === "photo" && item.previewUrl) return `photo:${item.id}`;
  if (item.type === "file" && String(item.mimeType || "").toLowerCase().startsWith("image/") && item.objectUrl) return `file:${item.id}`;
  if (item.type === "note" && item.imageUrl) return `note:${item.id}`;
  return "";
}

function buildGalleryEntriesFromItems(items = [], options = {}) {
  const locationLabel = options.locationLabel || "";
  const entries = [];
  for (const item of items) {
    if (!item) continue;
    const createdLabel = item.createdAt ? new Date(item.createdAt).toLocaleString() : "";
    if (item.type === "photo" && item.previewUrl) {
      entries.push({
        key: `photo:${item.id}`,
        src: item.previewUrl,
        title: item.title || "Photo",
        meta: [locationLabel, item.source || "upload", createdLabel].filter(Boolean).join(" | "),
      });
      continue;
    }
    if (item.type === "file" && String(item.mimeType || "").toLowerCase().startsWith("image/") && item.objectUrl) {
      entries.push({
        key: `file:${item.id}`,
        src: item.objectUrl,
        title: item.originalName || item.title || "Image file",
        meta: [locationLabel, item.mimeType || "image", createdLabel].filter(Boolean).join(" | "),
      });
      continue;
    }
    if (item.type === "note" && item.imageUrl) {
      entries.push({
        key: `note:${item.id}`,
        src: item.imageUrl,
        title: item.imageName || item.title || "Comment image",
        meta: [locationLabel, "Comment", createdLabel].filter(Boolean).join(" | "),
      });
    }
  }
  return entries;
}

function renderImagePreviewState() {
  if (!els.imagePreviewDialog) return;
  if (!imagePreviewGallery.length) {
    if (els.imagePreviewTitle) els.imagePreviewTitle.textContent = "Image preview";
    if (els.imagePreviewMeta) els.imagePreviewMeta.textContent = "";
    if (els.imagePreviewCounter) els.imagePreviewCounter.textContent = "0 / 0";
    if (els.imagePreviewImg) {
      els.imagePreviewImg.removeAttribute("src");
      els.imagePreviewImg.alt = "Preview image";
    }
    if (els.imagePreviewPrevBtn) els.imagePreviewPrevBtn.disabled = true;
    if (els.imagePreviewNextBtn) els.imagePreviewNextBtn.disabled = true;
    return;
  }

  const safeIndex = Math.max(0, Math.min(imagePreviewIndex, imagePreviewGallery.length - 1));
  imagePreviewIndex = safeIndex;
  const entry = imagePreviewGallery[safeIndex];
  if (els.imagePreviewTitle) els.imagePreviewTitle.textContent = entry.title || "Image preview";
  if (els.imagePreviewMeta) els.imagePreviewMeta.textContent = entry.meta || "";
  if (els.imagePreviewCounter) els.imagePreviewCounter.textContent = `${safeIndex + 1} / ${imagePreviewGallery.length}`;
  if (els.imagePreviewImg) {
    els.imagePreviewImg.src = entry.src;
    els.imagePreviewImg.alt = entry.title || "Preview image";
  }
  const shouldDisableNav = imagePreviewGallery.length <= 1;
  if (els.imagePreviewPrevBtn) els.imagePreviewPrevBtn.disabled = shouldDisableNav;
  if (els.imagePreviewNextBtn) els.imagePreviewNextBtn.disabled = shouldDisableNav;
}

function openImagePreview(galleryEntries, startIndex = 0) {
  if (!els.imagePreviewDialog || !Array.isArray(galleryEntries) || !galleryEntries.length) return;
  imagePreviewGallery = galleryEntries;
  imagePreviewIndex = startIndex;
  renderImagePreviewState();
  if (!els.imagePreviewDialog.open) els.imagePreviewDialog.showModal();
}

function closeImagePreview() {
  imagePreviewGallery = [];
  imagePreviewIndex = 0;
  renderImagePreviewState();
  if (els.imagePreviewDialog?.open) els.imagePreviewDialog.close();
}

function stepImagePreview(step) {
  if (imagePreviewGallery.length <= 1) return;
  imagePreviewIndex = (imagePreviewIndex + step + imagePreviewGallery.length) % imagePreviewGallery.length;
  renderImagePreviewState();
}

function openImagePreviewForItem(item, galleryEntries) {
  const galleryKey = buildGalleryEntryKey(item);
  if (!galleryKey || !galleryEntries?.length) return;
  const index = galleryEntries.findIndex((entry) => entry.key === galleryKey);
  if (index < 0) return;
  openImagePreview(galleryEntries, index);
}

function createAreaBrowserItemCard(project, item, galleryEntries) {
  const card = els.itemCardTemplate.content.firstElementChild.cloneNode(true);
  card.dataset.itemId = item.id;
  applyCardTheme(card, project);
  if (item.archivedAt) card.classList.add("archived-item-card");
  card.append(renderItem(item, { galleryEntries }));
  return card;
}

function collectAreaBrowserItems(project, area) {
  if (!project || !area) return [];
  const rows = [];
  const pushRow = (item, sourceTeamId = "", sourceTeamName = "") => {
    if (!item || item.archivedAt) return;
    if (!["photo", "file", "note"].includes(item.type)) return;
    rows.push({
      ...item,
      sourceTeamId,
      sourceTeamName,
      linkedAreaIds: [...new Set([...(item.linkedAreaIds || []), area.id])],
      linkedAreaName: item.linkedAreaName || area.name || "",
    });
  };

  for (const item of area.items || []) {
    pushRow(item, "", "");
  }

  for (const team of (project.folders || []).filter((entry) => !entry.archivedAt)) {
    for (const item of team.items || []) {
      const linkedAreaIds = item.linkedAreaIds || [];
      const isLinked = linkedAreaIds.includes(area.id) || item.linkedAreaId === area.id;
      if (!isLinked) continue;
      pushRow(item, team.id, team.name || "Unnamed team");
    }
  }

  const unique = new Map();
  for (const row of rows) {
    if (!unique.has(row.id)) unique.set(row.id, row);
  }
  return [...unique.values()];
}

function sortAreaBrowserItems(items) {
  const sorted = [...items];
  if (areaBrowserSortFilter === "team") {
    sorted.sort((left, right) => {
      const leftTeam = String(left.sourceTeamName || "").toLocaleLowerCase();
      const rightTeam = String(right.sourceTeamName || "").toLocaleLowerCase();
      if (leftTeam !== rightTeam) return leftTeam.localeCompare(rightTeam);
      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    });
    return sorted;
  }
  sorted.sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  return sorted;
}

function renderAreaBrowserDialog() {
  if (!els.areaBrowserDialog || !areaBrowserAreaId) return;
  const project = getCurrentProject();
  const area = getAreaById(areaBrowserAreaId, project);
  if (!project || !area) {
    closeAreaBrowserDialog();
    return;
  }

  const items = collectAreaBrowserItems(project, area);
  const photos = items.filter((item) => item.type === "photo");
  const files = items.filter((item) => item.type === "file");
  const notes = items.filter((item) => item.type === "note");
  const previewGallery = buildGalleryEntriesFromItems(items, { locationLabel: area.name });
  const linkedTeams = (area.teamIds || [])
    .map((teamId) => project.folders.find((team) => team.id === teamId && !team.archivedAt))
    .filter(Boolean);

  if (els.areaBrowserTitle) {
    const floorSuffix = normalizeFloorName(area?.floor) ? ` - ${normalizeFloorName(area.floor)}` : "";
    els.areaBrowserTitle.textContent = `${area.name || "Area"}${floorSuffix}`;
  }
  if (els.areaBrowserMeta) {
    els.areaBrowserMeta.textContent = linkedTeams.length
      ? `Linked teams: ${linkedTeams.map((team) => team.name).join(", ")}`
      : "No linked team yet.";
  }
  if (els.areaBrowserSortFilter) els.areaBrowserSortFilter.value = areaBrowserSortFilter;
  if (els.areaBrowserTypeFilter) els.areaBrowserTypeFilter.value = areaBrowserTypeFilter;
  if (els.areaBrowserViewGridBtn) els.areaBrowserViewGridBtn.classList.toggle("active", areaBrowserViewMode === "grid");
  if (els.areaBrowserViewListBtn) els.areaBrowserViewListBtn.classList.toggle("active", areaBrowserViewMode === "list");
  if (els.areaBrowserTeamFilter) {
    const activeTeams = (project.folders || []).filter((team) => !team.archivedAt);
    const options = [`<option value="all">All teams</option>`];
    for (const team of activeTeams) {
      options.push(`<option value="${escapeHtml(team.id)}">${escapeHtml(team.name || "Unnamed team")}</option>`);
    }
    els.areaBrowserTeamFilter.innerHTML = options.join("");
    const hasSelected = areaBrowserTeamFilter === "all" || activeTeams.some((team) => team.id === areaBrowserTeamFilter);
    if (!hasSelected) areaBrowserTeamFilter = "all";
    els.areaBrowserTeamFilter.value = areaBrowserTeamFilter;
  }
  if (els.areaBrowserStats) {
    const openTasks = (area.items || []).filter((item) => item.type === "task" && item.status !== "Done" && !item.archivedAt).length;
    els.areaBrowserStats.innerHTML = `
      <article class="area-browser-stat-card">
        <strong>${photos.length}</strong>
        <span>Pictures</span>
      </article>
      <article class="area-browser-stat-card">
        <strong>${files.length}</strong>
        <span>Files</span>
      </article>
      <article class="area-browser-stat-card">
        <strong>${openTasks}</strong>
        <span>Open tasks</span>
      </article>
    `;
  }

  let filteredItems = items.filter((item) => showArchivedWorkspaceItems || !item.archivedAt);
  if (areaBrowserTypeFilter !== "all") {
    filteredItems = filteredItems.filter((item) => item.type === areaBrowserTypeFilter);
  }
  if (areaBrowserTeamFilter !== "all") {
    filteredItems = filteredItems.filter((item) => item.sourceTeamId === areaBrowserTeamFilter);
  }
  filteredItems = sortAreaBrowserItems(filteredItems);

  if (els.areaBrowserResultCount) {
    const teamLabel = areaBrowserTeamFilter === "all" ? "all teams" : "selected team";
    els.areaBrowserResultCount.textContent = `${filteredItems.length} result(s) - ${teamLabel}`;
  }

  if (els.areaBrowserResults) {
    els.areaBrowserResults.classList.toggle("list-view", areaBrowserViewMode === "list");
    els.areaBrowserResults.innerHTML = "";
    if (filteredItems.length) {
      for (const item of filteredItems) {
        els.areaBrowserResults.append(createAreaBrowserItemCard(project, item, previewGallery));
      }
    } else {
      els.areaBrowserResults.innerHTML = `<section class="empty-state"><h3>No matching uploads</h3><p>Try another team/type filter or upload new area items.</p></section>`;
    }
  }
}

function openAreaBrowser(areaId) {
  if (!els.areaBrowserDialog) return;
  const area = getAreaById(areaId);
  if (!area) return;
  selectedProjectAreaId = area.id;
  areaBrowserAreaId = area.id;
  renderAreaBrowserDialog();
  if (!els.areaBrowserDialog.open) els.areaBrowserDialog.showModal();
}

function closeAreaBrowserDialog() {
  areaBrowserAreaId = "";
  if (els.areaBrowserDialog?.open) els.areaBrowserDialog.close();
}

function onGlobalDialogKeydown(event) {
  if (!els.imagePreviewDialog?.open) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    stepImagePreview(-1);
    return;
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    stepImagePreview(1);
  }
}

function collectMasterPlanComments(project, detailsFolder = getProjectDetailsFolder(project)) {
  if (!project) return [];
  const comments = [];
  const pushComments = (items, sourceType, sourceId, sourceLabel, skipItemTeamFilter = false) => {
    for (const item of items || []) {
      if (item.type !== "note" || !item.showOnMasterPlan) continue;
      if (!showArchivedWorkspaceItems && item.archivedAt) continue;
      if (!skipItemTeamFilter && !itemMatchesSelectedTeams(item, project)) continue;
      comments.push({
        ...item,
        sourceType,
        sourceId,
        sourceLabel,
      });
    }
  };
  pushComments(detailsFolder?.items || [], "plan", detailsFolder?.id || "", "Plan Information");
  for (const area of project.areas || []) {
    if (area.archivedAt && !showArchivedWorkspaceItems) continue;
    if (!areaMatchesSelectedTeams(area, project)) continue;
    pushComments(area.items || [], "area", area.id, area.name, true);
  }
  for (const folder of (project.folders || []).filter((entry) => showArchivedWorkspaceItems || !entry.archivedAt)) {
    pushComments(folder.items || [], "team", folder.id, folder.name);
  }
  return comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function jumpToCollectedComment(project, comment) {
  if (!project || !comment) return;
  if (!confirmDiscardAndMaybeDeleteDraft()) return;
  pushNavigationState();
  currentView = "projects";
  if (isMobileProjectViewport()) currentMobileProjectsPane = "detail";
  if (comment.sourceType === "area") {
    currentWorkspaceTab = "folders-hub";
    currentProjectDetailsTab = "areas";
  } else if (comment.sourceType === "team") {
    currentWorkspaceTab = `folder:${comment.sourceId}`;
    project.selectedFolderId = comment.sourceId;
    currentContentTab = "note";
  } else {
    currentWorkspaceTab = "folders-hub";
    currentProjectDetailsTab = "plan";
  }
  pendingFocusedItemId = comment.id;
  persist();
  render();
}

function buildCollectedCommentEntry(comment, project) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "collected-comment-entry";
  button.dataset.itemId = comment.id;
  const sourceLabel = comment.sourceType === "area"
    ? `Area: ${comment.sourceLabel}`
    : comment.sourceType === "team"
      ? `Team: ${comment.sourceLabel}`
      : comment.sourceLabel;
  const snippet = String(comment.content || "").trim();
  button.innerHTML = `
    <div class="collected-comment-copy">
      <strong>${escapeHtml(comment.title || "Untitled comment")}</strong>
      <span class="muted">${escapeHtml(sourceLabel)} • ${escapeHtml(new Date(comment.createdAt).toLocaleString())}</span>
      ${snippet ? `<p>${escapeHtml(snippet.length > 180 ? `${snippet.slice(0, 177)}...` : snippet)}</p>` : '<p class="muted">No text yet.</p>'}
    </div>
    ${comment.imageUrl ? `<div class="collected-comment-thumb"><img src="${comment.imageUrl}" alt="${escapeHtml(comment.imageName || comment.title || "Comment image")}"></div>` : ""}
  `;
  button.addEventListener("click", () => jumpToCollectedComment(project, comment));
  return button;
}

function buildAreaCommentPreview(areaNotes, galleryEntries = []) {
  const wrap = document.createElement("div");
  wrap.className = "area-comment-list";
  if (!areaNotes.length) {
    wrap.innerHTML = `<p class="muted">No comments yet.</p>`;
    return wrap;
  }
  for (const note of areaNotes) {
    const preview = document.createElement("article");
    preview.className = "area-comment-preview";
    preview.dataset.itemId = note.id;
    preview.innerHTML = `
      <div class="area-comment-preview-copy">
        <strong>${escapeHtml(note.title || "Untitled comment")}</strong>
        <p>${escapeHtml((note.content || "").trim() || "No text yet.")}</p>
      </div>
      <div class="meta-row">
        ${note.showOnMasterPlan ? '<span class="meta-pill">Master plan</span>' : ""}
        <span class="meta-pill">${escapeHtml(new Date(note.createdAt).toLocaleString())}</span>
      </div>
      ${note.imageUrl ? `<button class="area-comment-preview-thumb image-open-trigger" type="button" aria-label="Open ${escapeHtml(note.imageName || note.title || "Comment image")}"><img src="${note.imageUrl}" alt="${escapeHtml(note.imageName || note.title || "Comment image")}"></button>` : ""}
    `;
    preview.querySelector(".image-open-trigger")?.addEventListener("click", () => openImagePreviewForItem(note, galleryEntries));
    wrap.append(preview);
  }
  return wrap;
}

function buildProjectDetailsPlanLayoutLegacy(project, detailsFolder, canWork, areaFilter = null) {
  const layout = document.createElement("div");
  layout.className = "project-plan-grid";
  const viewMode = getSectionViewMode(project, "details:plan");
  const sourceFolder = detailsFolder;
  const infoItems = (sourceFolder?.items || []).filter((item) => item.type === "note" && (showArchivedWorkspaceItems || !item.archivedAt) && itemMatchesSelectedTeams(item, project));
  const fileItems = (sourceFolder?.items || []).filter((item) => item.type === "file" && (showArchivedWorkspaceItems || !item.archivedAt) && itemMatchesSelectedTeams(item, project));
  const photoItems = (sourceFolder?.items || []).filter((item) => item.type === "photo" && (showArchivedWorkspaceItems || !item.archivedAt) && itemMatchesSelectedTeams(item, project));
  const collectedComments = areaFilter
    ? infoItems.filter((item) => item.showOnMasterPlan)
    : collectMasterPlanComments(project, detailsFolder);
  const planItems = [...infoItems, ...fileItems, ...photoItems]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const plansPanel = createProjectDetailsPanel("Plans");
  plansPanel.section.classList.add("project-comments-panel");
  const plansControls = [createPlansViewToggleControl(project, "details:plan")];
  if (canManageProject(project)) {
    const addPlanBtn = document.createElement("button");
    addPlanBtn.type = "button";
    addPlanBtn.className = "secondary-btn add-plus-btn";
    addPlanBtn.textContent = "+";
    addPlanBtn.title = "Add to Plans";
    addPlanBtn.addEventListener("click", onAddPlansItemClick);
    plansControls.push(addPlanBtn);
  }
  appendDashboardSectionControls(plansPanel.header, plansControls);
  plansPanel.section.append(planItems.length
    ? (() => {
        const grid = createProjectDetailsItemGrid(project, planItems);
        applyCollectionViewMode(grid, viewMode);
        return grid;
      })()
    : createProjectDetailsEmptyState("No plans yet", "Store contracts, drawings, notes, and pictures for this project here."));
  if (canManageProject(project)) {
    attachAssetDropTarget(plansPanel.section, () => sourceFolder, {
      kind: "plan",
      label: "Drop files or pics into plans",
    });
  }

  const infoPanel = createProjectDetailsPanel("General Information");
  const infoControls = [createSectionViewToggleControl(project, "details:plan")];
  if (canWork) {
    const addInfoBtn = document.createElement("button");
    addInfoBtn.type = "button";
    addInfoBtn.className = "secondary-btn";
    addInfoBtn.textContent = "+";
    addInfoBtn.addEventListener("click", areaFilter ? () => onAddAreaComment(areaFilter.id) : openNoteDialog);
    infoControls.push(addInfoBtn);
  }
  appendDashboardSectionControls(infoPanel.header, infoControls);
  infoPanel.section.append(infoItems.length
    ? (() => {
        const grid = createProjectDetailsItemGrid(project, infoItems);
        applyCollectionViewMode(grid, viewMode);
        return grid;
      })()
    : createProjectDetailsEmptyState("No general information yet", "Add project information, instructions, or notes here."));
  if (canWork) {
    attachAssetDropTarget(infoPanel.section, () => detailsFolder, {
      kind: "plan",
      label: areaFilter ? "Drop files or pics into area information" : "Drop files or pics into general information",
    });
  }

  const filePanel = createProjectDetailsPanel("General Files");
  const fileControls = [createSectionViewToggleControl(project, "details:plan")];
  if (canWork) {
    const addFileBtn = document.createElement("button");
    addFileBtn.type = "button";
    addFileBtn.className = "secondary-btn";
    addFileBtn.textContent = "+";
    addFileBtn.addEventListener("click", areaFilter ? () => onAddAreaAsset(areaFilter.id, "file") : onAddFileClick);
    fileControls.push(addFileBtn);
  }
  appendDashboardSectionControls(filePanel.header, fileControls);
  filePanel.section.append(fileItems.length
    ? (() => {
        const grid = createProjectDetailsItemGrid(project, fileItems);
        applyCollectionViewMode(grid, viewMode);
        return grid;
      })()
    : createProjectDetailsEmptyState("No general files yet", "Upload project plans, PDFs, contracts, or reference files here."));
  if (canWork) {
    attachAssetDropTarget(filePanel.section, () => detailsFolder, {
      kind: "plan",
      label: areaFilter ? "Drop files or pics into area files" : "Drop files or pics into general files",
    });
  }

  const photoPanel = createProjectDetailsPanel("General Photos");
  const photoControls = [createSectionViewToggleControl(project, "details:plan")];
  if (canWork) {
    const addPhotoBtn = document.createElement("button");
    addPhotoBtn.type = "button";
    addPhotoBtn.className = "secondary-btn";
    addPhotoBtn.textContent = "+";
    addPhotoBtn.addEventListener("click", areaFilter ? () => onAddAreaAsset(areaFilter.id, "photo") : onAddPhotoClick);
    photoControls.push(addPhotoBtn);
  }
  appendDashboardSectionControls(photoPanel.header, photoControls);
  photoPanel.section.append(photoItems.length
    ? (() => {
        const grid = createProjectDetailsItemGrid(project, photoItems);
        applyCollectionViewMode(grid, viewMode);
        return grid;
      })()
    : createProjectDetailsEmptyState("No general photos yet", "Upload project or contract-related pictures here."));
  if (canWork) {
    attachAssetDropTarget(photoPanel.section, () => sourceFolder, {
      kind: areaFilter ? "area" : "plan",
      label: areaFilter ? "Drop pictures into area photos" : "Drop pictures into general photos",
    });
  }

  const commentsPanel = createProjectDetailsPanel("Collected Comments");
  commentsPanel.section.classList.add("project-comments-panel");
  commentsPanel.section.append(collectedComments.length
    ? (() => {
        const list = document.createElement("div");
        list.className = "collected-comment-list";
        for (const comment of collectedComments) {
          list.append(buildCollectedCommentEntry(comment, project));
        }
        return list;
      })()
    : createProjectDetailsEmptyState("No collected comments yet", "Mark a comment with “visible on the master plan” to collect it here."));

  layout.append(plansPanel.section);
  return layout;
  layout.append(infoPanel.section, filePanel.section);
  layout.append(photoPanel.section);
  layout.append(commentsPanel.section);
  return layout;
}

function buildProjectDetailsPlanLayout(project, detailsFolder, canWork, areaFilter = null) {
  const layout = document.createElement("div");
  layout.className = "project-plan-grid";
  const viewMode = getSectionViewMode(project, "details:plan");
  const sourceFolder = detailsFolder;
  const canManageInfo = canManageProject(project);

  const planItems = (sourceFolder?.items || [])
    .filter((item) => (showArchivedWorkspaceItems || !item.archivedAt) && itemMatchesSelectedTeams(item, project))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const plansPanel = createProjectDetailsPanel("Plans");
  plansPanel.section.classList.add("project-comments-panel", "plans-pinned-section");
  const plansControls = [createPlansViewToggleControl(project, "details:plan")];
  if (canManageInfo) {
    const addPlanBtn = document.createElement("button");
    addPlanBtn.type = "button";
    addPlanBtn.className = "secondary-btn add-plus-btn";
    addPlanBtn.textContent = "+";
    addPlanBtn.title = "Add to Plans";
    addPlanBtn.addEventListener("click", onAddPlansItemClick);
    plansControls.push(addPlanBtn);
  }
  appendDashboardSectionControls(plansPanel.header, plansControls);
  plansPanel.section.append(planItems.length
    ? (() => {
        const grid = createProjectDetailsItemGrid(project, planItems);
        applyCollectionViewMode(grid, viewMode);
        return grid;
      })()
    : createProjectDetailsEmptyState("No plans yet", "Store contracts, drawings, notes, and pictures for this project here."));
  if (canManageInfo) {
    attachAssetDropTarget(plansPanel.section, () => sourceFolder, {
      kind: "plan",
      label: "Drop files or pics into plans",
    });
  }

  const summaryMap = new Map();
  const summarySources = [
    ...(project.areas || []).filter((area) => showArchivedWorkspaceItems || !area.archivedAt).flatMap((area) => area.items || []),
    ...(project.folders || []).filter((team) => showArchivedWorkspaceItems || !team.archivedAt).flatMap((team) => team.items || []),
  ];
  for (const item of summarySources) {
    if (!item?.id) continue;
    if (!showArchivedWorkspaceItems && item.archivedAt) continue;
    if (!summaryMap.has(item.id)) summaryMap.set(item.id, item);
  }
  const summaryItems = [...summaryMap.values()];
  const summaryNotes = summaryItems.filter((item) => item.type === "note")
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const summaryFiles = summaryItems.filter((item) => item.type === "file")
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const summaryPhotos = summaryItems.filter((item) => item.type === "photo")
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const createSummaryPanel = (title, items, emptyText, onAdd) => {
    const panel = createProjectDetailsPanel(title);
    const controls = [createSectionViewToggleControl(project, "details:plan")];
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "secondary-btn add-plus-btn";
    addBtn.textContent = "+";
    addBtn.title = `Add ${title}`;
    addBtn.disabled = !canWork;
    addBtn.addEventListener("click", onAdd);
    controls.push(addBtn);
    appendDashboardSectionControls(panel.header, controls);
    panel.section.append(items.length
      ? (() => {
          const grid = createProjectDetailsItemGrid(project, items);
          applyCollectionViewMode(grid, viewMode);
          return grid;
        })()
      : createProjectDetailsEmptyState(`No ${title.toLowerCase()} yet`, emptyText));
    return panel.section;
  };

  layout.append(plansPanel.section);
  layout.append(
    createSummaryPanel("Notes", summaryNotes, "No notes from teams or areas yet.", openNoteDialog),
    createSummaryPanel("Files", summaryFiles, "No files from teams or areas yet.", onAddFileClick),
    createSummaryPanel("Photos", summaryPhotos, "No photos from teams or areas yet.", onAddPhotoClick)
  );
  return layout;
}

function itemMatchesAreaTeamScope(item, project, area) {
  if (currentAreaTeamScope !== "mine") return true;
  const myTeamIds = new Set(getTeamIdsForUser(project, state.currentUserId));
  if (!myTeamIds.size) return false;
  for (const teamId of myTeamIds) {
    if (itemRelatesToTeam(item, teamId, project, area.id)) return true;
  }
  return false;
}

function collectAreaWorkspaceItems(project, area) {
  const directAreaItems = area?.items || [];
  const linkedTeamItems = (project?.folders || [])
    .filter((team) => showArchivedWorkspaceItems || !team.archivedAt)
    .flatMap((team) => (team.items || [])
      .filter((item) => item.linkedAreaId === area.id || (item.linkedAreaIds || []).includes(area.id)));
  const deduped = new Map();
  for (const item of [...directAreaItems, ...linkedTeamItems]) {
    if (!item?.id) continue;
    if (!deduped.has(item.id)) deduped.set(item.id, item);
  }
  return [...deduped.values()];
}

function createAreaTeamScopeControl(project) {
  const shell = document.createElement("div");
  shell.className = "segmented-toggle inline-section-view-toggle area-scope-toggle";
  shell.setAttribute("aria-label", "Area team filter");
  const mineBtn = document.createElement("button");
  mineBtn.type = "button";
  mineBtn.className = `segmented-toggle-btn${currentAreaTeamScope === "mine" ? " active" : ""}`;
  mineBtn.textContent = "My team";
  mineBtn.addEventListener("click", () => {
    currentAreaTeamScope = "mine";
    renderWorkspace();
  });
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = `segmented-toggle-btn${currentAreaTeamScope === "all" ? " active" : ""}`;
  allBtn.textContent = "All teams";
  allBtn.addEventListener("click", () => {
    currentAreaTeamScope = "all";
    renderWorkspace();
  });
  shell.append(mineBtn, allBtn);
  return shell;
}

function buildProjectAreaWorkspaceSection(project, canWork) {
  const area = (project.areas || []).find((entry) => entry.id === selectedProjectAreaId && (showArchivedWorkspaceItems || !entry.archivedAt)) || null;
  if (!area) return createProjectDetailsEmptyState("No area selected", "Select an area tab to open Notes, Files, and Photos.");
  const wrapper = document.createElement("div");
  wrapper.className = "project-plan-grid";
  if (area.archivedAt) wrapper.classList.add("archived-area-workspace");
  const viewMode = getSectionViewMode(project, "details:areas");
  const canManage = canManageProject(project);
  const areaItems = collectAreaWorkspaceItems(project, area)
    .filter((item) => (showArchivedWorkspaceItems || !item.archivedAt))
    .filter((item) => (area.archivedAt && showArchivedWorkspaceItems) ? true : itemMatchesAreaTeamScope(item, project, area));
  const notes = areaItems.filter((item) => item.type === "note");
  const files = areaItems.filter((item) => item.type === "file");
  const photos = areaItems.filter((item) => item.type === "photo");
  const linkedTeams = (area.teamIds || [])
    .map((id) => project.folders.find((team) => team.id === id && !team.archivedAt))
    .filter(Boolean);

  const headerPanel = createProjectDetailsPanel(area.name || "Area");
  headerPanel.section.classList.add("project-comments-panel", "area-workspace-header");
  const headerTitle = headerPanel.header.querySelector("h3");
  if (headerTitle) headerTitle.innerHTML = renderAreaTitleMarkup(area);
  const headerControls = [createAreaTeamScopeControl(project)];
  if (canManage) {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "ghost-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editArea(area.id));
    headerControls.push(editBtn);

    const archiveBtn = document.createElement("button");
    archiveBtn.type = "button";
    archiveBtn.className = "ghost-btn";
    archiveBtn.textContent = "Archive";
    archiveBtn.addEventListener("click", () => archiveArea(area.id));
    headerControls.push(archiveBtn);
  }
  if (isAdmin()) {
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "ghost-btn destructive-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteArea(area.id));
    headerControls.push(deleteBtn);
  }
  appendDashboardSectionControls(headerPanel.header, headerControls);
  const teamRow = document.createElement("div");
  teamRow.className = "meta-row";
  teamRow.innerHTML = linkedTeams.length
    ? linkedTeams.map((team) => buildTeamPillMarkup(team, "Team", canManage ? {
      disconnectAction: "area-team",
      areaId: area.id,
      teamId: team.id,
    } : {})).join("")
    : `<span class="meta-pill">${canManage ? "Drag a team here" : "No team linked yet"}</span>`;
  headerPanel.section.append(teamRow);
  if (canManage) {
    attachServiceTeamDropTarget(headerPanel.section, project, (teamId) => connectServiceTeamToArea(teamId, area.id));
  }
  bindConnectionActionButtons(headerPanel.section);
  wrapper.append(headerPanel.section);

  const makePanel = (title, items, onAdd, dropLabel) => {
    const panel = createProjectDetailsPanel(title);
    const controls = [createSectionViewToggleControl(project, "details:areas")];
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "secondary-btn add-plus-btn";
    addBtn.textContent = "+";
    addBtn.title = `Add ${title}`;
    addBtn.disabled = !canWork;
    addBtn.addEventListener("click", onAdd);
    controls.push(addBtn);
    appendDashboardSectionControls(panel.header, controls);
    panel.section.append(items.length
      ? (() => {
          const grid = createProjectDetailsItemGrid(project, items);
          applyCollectionViewMode(grid, viewMode);
          return grid;
        })()
      : createProjectDetailsEmptyState(`No ${title.toLowerCase()} yet`, `Add ${title.toLowerCase()} for this area.`));
    if (canWork) {
      attachAssetDropTarget(panel.section, () => area, { kind: "area", label: dropLabel });
    }
    return panel.section;
  };

  wrapper.append(
    makePanel("Notes", notes, () => onAddAreaComment(area.id), "Drop files or pics into area notes"),
    makePanel("Files", files, () => onAddAreaAsset(area.id, "file"), "Drop files into area files"),
    makePanel("Photos", photos, () => onAddAreaAsset(area.id, "photo"), "Drop pics into area photos")
  );
  return wrapper;
}

function buildProjectDetailsAreasSection(project, canManage, canWork, areaFilter = null) {
  const { section, header } = createProjectDetailsPanel("Areas");
  const viewMode = getSectionViewMode(project, "details:areas");
  const controls = [createSectionViewToggleControl(project, "details:areas")];
  const canToggleCompletion = canWorkInProject(project);
  const quickFilter = getProjectAreaQuickFilter(project);
  let activeAreas = (project.areas || [])
    .filter((area) => !area.archivedAt && areaMatchesSelectedTeams(area, project))
    .sort((left, right) => {
      if (left.id === selectedProjectAreaId) return -1;
      if (right.id === selectedProjectAreaId) return 1;
      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    });
  if (areaFilter) activeAreas = activeAreas.filter((area) => area.id === areaFilter.id);
  if (!areaFilter && isAreaQuickFilterActive(quickFilter)) {
    activeAreas = activeAreas.filter((area) => areaMatchesQuickFilter(area, quickFilter));
  }
  let archivedAreas = (project.areas || []).filter((area) => area.archivedAt && areaMatchesSelectedTeams(area, project));
  if (isAreaQuickFilterActive(quickFilter)) {
    archivedAreas = archivedAreas.filter((area) => areaMatchesQuickFilter(area, quickFilter));
  }
  appendDashboardSectionControls(header, controls);

  const helper = document.createElement("p");
  helper.className = "muted section-intro";
  helper.textContent = canManage
    ? "Drag a team from the left rail onto an area to connect the work."
    : "Check which teams are linked to each area and follow progress through files and pictures.";
  section.append(helper);

  const areasList = document.createElement("div");
  areasList.className = "dashboard-grid";
  applyCollectionViewMode(areasList, viewMode);
  if (!activeAreas.length) {
    areasList.append(createProjectDetailsEmptyState("No areas yet", "Create an area to connect work, files, and progress pictures."));
  } else {
    for (const area of activeAreas) {
      const card = document.createElement("article");
      card.className = "item-card compact-card";
      if (area.id === selectedProjectAreaId) card.classList.add("active-area-card");
      applyCardTheme(card, project);
      card.classList.toggle("completed-area-card", Boolean(area.completedAt));
      if (canWork) {
        attachAssetDropTarget(card, () => area, {
          kind: "area",
          label: "Drop files or pics into this area",
        });
      }
      if (canManage) {
        card.classList.add("drop-area-card");
        attachServiceTeamDropTarget(card, project, (teamId) => connectServiceTeamToArea(teamId, area.id));
      }

      const areaItems = getFilteredAreaItems(area, project);
      const areaNotes = areaItems.filter((item) => item.type === "note");
      const areaFiles = areaItems.filter((item) => item.type === "file");
      const areaPhotos = areaItems.filter((item) => item.type === "photo");
      const areaGalleryEntries = buildGalleryEntriesFromItems([...areaPhotos, ...areaFiles, ...areaNotes], { locationLabel: area.name });
      const linkedTeams = (area.teamIds || [])
        .map((id) => project.folders.find((team) => team.id === id))
        .filter(Boolean);
      const linkedTeamMarkup = linkedTeams.length
        ? linkedTeams.map((team) => buildTeamPillMarkup(team, "Team", canManage ? {
          disconnectAction: "area-team",
          areaId: area.id,
          teamId: team.id,
        } : {})).join("")
        : `<span class="meta-pill">${canManage ? "Drop a Service Team here" : "No linked team"}</span>`;
      const progressStrip = areaPhotos.length
        ? `<div class="progress-strip">${areaPhotos.slice(0, 3).map((photo) => `<button class="progress-strip-preview-btn" type="button" data-gallery-key="photo:${escapeHtml(photo.id)}" aria-label="Open ${escapeHtml(photo.title)}"><img src="${photo.previewUrl}" alt="${escapeHtml(photo.title)}"></button>`).join("")}</div>`
        : "";
      const completedLabel = area.completedAt
        ? `<span class="area-complete-badge"><span class="area-complete-badge-icon">&#10003;</span>Completed</span>`
        : "";
      const completeToggleLabel = area.completedAt ? "Reopen Works" : "Set Completed";

      card.innerHTML = `
        <div class="area-card-top">
          <h4><button class="area-open-btn" type="button" aria-label="Open area ${escapeHtml(area.name)}">${renderAreaTitleMarkup(area)}</button></h4>
          <div class="area-card-status">
            ${completedLabel}
            ${canToggleCompletion ? `<button class="ghost-btn area-complete-toggle-btn" type="button">${completeToggleLabel}</button>` : ""}
          </div>
        </div>
        <p>${areaNotes.length} note(s), ${areaFiles.length} file(s), ${areaPhotos.length} pic(s)</p>
        <div class="meta-row">${linkedTeamMarkup}</div>
        ${progressStrip}
        <div class="area-comments-slot"></div>
        ${canWork ? `<div class="meta-row"><button class="ghost-btn area-comment-btn" type="button">Add Comment</button><button class="ghost-btn area-file-btn" type="button">Add File</button><button class="ghost-btn area-photo-btn" type="button">Add Pics</button></div>` : ""}
        ${canManage ? `<div class="meta-row"><button class="ghost-btn area-edit-btn" type="button">Edit</button><button class="ghost-btn area-archive-btn" type="button">Archive</button><button class="ghost-btn area-delete-btn" type="button">Delete</button></div>` : ""}
      `;
      card.querySelector(".area-complete-toggle-btn")?.addEventListener("click", () => {
        if (area.completedAt) {
          reopenAreaWork(area.id);
          return;
        }
        setAreaCompleted(area.id);
      });
      card.querySelector(".area-open-btn")?.addEventListener("click", () => openAreaBrowser(area.id));
      card.querySelectorAll(".progress-strip-preview-btn").forEach((button) => {
        button.addEventListener("click", () => {
          const galleryKey = button.dataset.galleryKey || "";
          const index = areaGalleryEntries.findIndex((entry) => entry.key === galleryKey);
          if (index >= 0) openImagePreview(areaGalleryEntries, index);
        });
      });
      card.querySelector(".area-comments-slot")?.append(buildAreaCommentPreview(areaNotes, areaGalleryEntries));
      card.querySelector(".area-comment-btn")?.addEventListener("click", () => onAddAreaComment(area.id));
      card.querySelector(".area-file-btn")?.addEventListener("click", () => onAddAreaAsset(area.id, "file"));
      card.querySelector(".area-photo-btn")?.addEventListener("click", () => onAddAreaAsset(area.id, "photo"));
      card.querySelector(".area-edit-btn")?.addEventListener("click", () => editArea(area.id));
      card.querySelector(".area-archive-btn")?.addEventListener("click", () => archiveArea(area.id));
      card.querySelector(".area-delete-btn")?.addEventListener("click", () => deleteArea(area.id));
      bindConnectionActionButtons(card);
      if (canManage) {
        attachCardMenu(card, [
          { label: "Edit", onClick: () => editArea(area.id) },
          { label: area.completedAt ? "Reopen Works" : "Set Completed", onClick: () => area.completedAt ? reopenAreaWork(area.id) : setAreaCompleted(area.id) },
          { label: "Archive", destructive: true, onClick: () => archiveArea(area.id) },
          { label: "Delete", destructive: true, onClick: () => deleteArea(area.id) },
        ]);
      }
      areasList.append(card);
    }
  }
  section.append(areasList);

  if (showArchivedWorkspaceItems && archivedAreas.length) {
    const archivedHeader = document.createElement("div");
    archivedHeader.className = "dashboard-subheader archived-visible-label";
    archivedHeader.textContent = "Archived Areas";
    section.append(archivedHeader);
    const archivedGrid = document.createElement("div");
    archivedGrid.className = "dashboard-grid";
    applyCollectionViewMode(archivedGrid, viewMode);
    for (const area of archivedAreas) {
      const card = document.createElement("article");
      card.className = "item-card compact-card archived-item-card";
      applyCardTheme(card, project);
      card.innerHTML = `<h4><button class="area-open-btn" type="button" aria-label="Open area ${escapeHtml(area.name)}">${renderAreaTitleMarkup(area)}</button></h4><div class="meta-row"><span class="meta-pill status-pill-archived">Archived</span></div>`;
      card.querySelector(".area-open-btn")?.addEventListener("click", () => openAreaBrowser(area.id));
      attachCardMenu(card, isAdmin() ? [
        { label: "Restore", onClick: () => restoreArea(area.id) },
        { label: "Delete", destructive: true, onClick: () => permanentlyDeleteArea(area.id) },
      ] : []);
      archivedGrid.append(card);
    }
    section.append(archivedGrid);
  }

  return section;
}

function buildProjectDetailsTasksSection(project, canManage, canViewTasks, areaFilter = null) {
  const { section, header } = createProjectDetailsPanel("Tasks");
  const viewMode = getSectionViewMode(project, "details:tasks");
  const controls = [createSectionViewToggleControl(project, "details:tasks")];
  if (canManage) {
    const createTaskBtn = document.createElement("button");
    createTaskBtn.type = "button";
    createTaskBtn.className = "secondary-btn";
    createTaskBtn.textContent = "Create Task";
    createTaskBtn.addEventListener("click", onCreateTaskClick);
    controls.push(createTaskBtn);
  }
  appendDashboardSectionControls(header, controls);

  if (!canViewTasks) {
    section.append(createProjectDetailsEmptyState("Tasks are limited", "You do not have permission to see project tasks."));
    return section;
  }

  const tasks = collectProjectItems(project, "task", true)
    .filter((task) => (showArchivedWorkspaceItems || !task.archivedAt) && itemMatchesSelectedTeams(task, project))
    .filter((task) => !areaFilter || task.linkedAreaId === areaFilter.id || (task.linkedAreaIds || []).includes(areaFilter.id))
    .sort((a, b) => {
      if (a.archivedAt && !b.archivedAt) return 1;
      if (!a.archivedAt && b.archivedAt) return -1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  if (!tasks.length) {
    section.append(createProjectDetailsEmptyState("No tasks yet", "Create tasks with what, team, area, and due date."));
    return section;
  }

  if (viewMode === "boxes") {
    section.append(createTaskCardGrid(project, tasks));
    return section;
  }
  section.append(createTaskListView(project, tasks));
  return section;
}

function buildProjectDetailsTeamsSection(project, canManage, areaFilter = null) {
  const { section, header } = createProjectDetailsPanel("Teams");
  const viewMode = getSectionViewMode(project, "details:teams");
  appendDashboardSectionControls(header, [createSectionViewToggleControl(project, "details:teams")]);

  const helper = document.createElement("p");
  helper.className = "muted section-intro";
  helper.textContent = canManage
    ? "Use the + button in the left Teams rail to create a new team. Open a team here to see members, linked areas, files, and progress."
    : "Open a team to see members, linked areas, files, and progress.";
  section.append(helper);

  const teams = getAllActiveProjectTeams(project)
    .filter((team) => teamMatchesSelectedTeams(team, project))
    .filter((team) => {
      if (!areaFilter) return true;
      const linkedToArea = (areaFilter.teamIds || []).includes(team.id);
      const hasAreaUploads = (team.items || []).some((item) => (item.linkedAreaIds || []).includes(areaFilter.id));
      return linkedToArea || hasAreaUploads;
    });
  const archivedTeams = (project.folders || []).filter((team) => team.archivedAt && teamMatchesSelectedTeams(team, project));
  const teamGrid = document.createElement("div");
  teamGrid.className = "dashboard-grid";
  applyCollectionViewMode(teamGrid, viewMode);
  if (!teams.length) {
    teamGrid.append(createProjectDetailsEmptyState("No teams yet", "Add a service team to connect people, areas, files, and progress."));
  } else {
    for (const team of teams) {
      const card = document.createElement("article");
      card.className = "item-card compact-card team-overview-card";
      const theme = buildTabTheme(team.tabColor || pickNextFolderColor(project));
      card.style.setProperty("--team-card-soft", theme.soft);
      card.style.setProperty("--team-card-muted", theme.muted);
      card.style.setProperty("--team-card-border", theme.border);
      card.style.setProperty("--team-card-shadow", theme.shadow);
      card.style.setProperty("--team-card-accent", team.tabColor || pickNextFolderColor(project));
      const members = (team.memberIds || [])
        .map((id) => getProjectUsers(project).find((member) => member.id === id))
        .filter(Boolean);
      const linkedAreas = getAreasForTeam(project, team.id);
      const taskCount = team.items.filter((item) => item.type === "task" && !item.archivedAt && item.status !== "Done").length;
      const files = team.items.filter((item) => item.type === "file" && !item.archivedAt);
      const photos = team.items.filter((item) => item.type === "photo" && !item.archivedAt);
      const canSeeUploads = canAccessTeamFolder(team, project);
      const canAddToTeam = canSeeUploads && canWorkInProject(project);
      const previewFiles = files.slice(0, 3).map((item) => `<span class="meta-pill">${escapeHtml(item.title)}</span>`).join("");
      const previewPhotos = photos.slice(0, 3).map((item) => `<img src="${item.previewUrl}" alt="${escapeHtml(item.title)}">`).join("");
      card.innerHTML = `
        <div class="team-overview-header">
          <span class="team-overview-swatch" aria-hidden="true"></span>
          <h4>${escapeHtml(team.name)}</h4>
        </div>
        <div class="meta-row">${members.map((member) => `<span class="meta-pill">${escapeHtml(getMemberDisplayName(member))}</span>`).join("") || `<span class="meta-pill">No member assigned</span>`}</div>
        <div class="meta-row">${linkedAreas.map((area) => buildAreaConnectionPillMarkup(area, canManage ? {
          disconnectAction: "area-team",
          areaId: area.id,
          teamId: team.id,
        } : {})).join("") || `<span class="meta-pill">No area linked</span>`}</div>
        <div class="meta-row">
          <span class="meta-pill">Tasks: ${taskCount}</span>
          <span class="meta-pill">Files: ${files.length}</span>
          <span class="meta-pill">Pics: ${photos.length}</span>
        </div>
        ${canSeeUploads
          ? `${previewFiles ? `<div class="meta-row">${previewFiles}</div>` : ""}${previewPhotos ? `<div class="progress-strip">${previewPhotos}</div>` : `<p class="muted">No team picture updates yet.</p>`}`
          : `<p class="muted">Files and picture previews are only visible to team members, managers, and admins.</p>`}
        <div class="meta-row">
          ${canAddToTeam ? `<button class="ghost-btn team-note-btn" type="button">Add Note</button><button class="ghost-btn team-file-btn" type="button">Add File</button><button class="ghost-btn team-photo-btn" type="button">Add Pics</button>` : ""}
          <button class="ghost-btn open-team-btn" type="button">Open Team</button>
        </div>
      `;
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      const openDetails = () => openServiceTeamWorkspace(project, team.id);
      card.addEventListener("click", (event) => {
        if (event.target.closest("button, input, label, details, summary")) return;
        openDetails();
      });
      card.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (event.target !== card) return;
        event.preventDefault();
        openDetails();
      });
      card.querySelector(".team-note-btn")?.addEventListener("click", () => onAddTeamNote(team.id));
      card.querySelector(".team-file-btn")?.addEventListener("click", () => onAddTeamAsset(team.id, "file"));
      card.querySelector(".team-photo-btn")?.addEventListener("click", () => onAddTeamAsset(team.id, "photo"));
      card.querySelector(".open-team-btn")?.addEventListener("click", openDetails);
      if (canAddToTeam) {
        attachAssetDropTarget(card, () => team, {
          kind: "folder",
          label: "Drop files or pics into this team",
        });
      }
      bindConnectionActionButtons(card);
      if (canManage) {
        attachCardMenu(card, [
          { label: "Edit", onClick: () => editServiceTeam(team.id) },
          { label: "Archive", destructive: true, onClick: () => archiveFolder(team.id) },
        ]);
      }
      teamGrid.append(card);
    }
  }
  section.append(teamGrid);

  if (showArchivedWorkspaceItems && archivedTeams.length) {
    const archivedHeader = document.createElement("div");
    archivedHeader.className = "dashboard-subheader archived-visible-label";
    archivedHeader.textContent = "Archived Teams";
    section.append(archivedHeader);
    const archivedGrid = document.createElement("div");
    archivedGrid.className = "dashboard-grid";
    applyCollectionViewMode(archivedGrid, viewMode);
    for (const team of archivedTeams) {
      const card = document.createElement("article");
      card.className = "item-card compact-card archived-item-card";
      applyCardTheme(card, project);
      card.innerHTML = `<h4>${escapeHtml(team.name)}</h4><div class="meta-row"><span class="meta-pill status-pill-archived">Archived</span></div>`;
      attachCardMenu(card, isAdmin()
        ? [
          { label: "Restore", onClick: () => restoreFolder(team.id) },
          ...(teamHasProtectedContent(project, team)
            ? []
            : [{ label: "Delete", destructive: true, onClick: () => permanentlyDeleteFolder(team.id) }]),
        ]
        : []);
      archivedGrid.append(card);
    }
    section.append(archivedGrid);
  }

  return section;
}

function startProjectChatCall(channel, mode = "audio") {
  if (!channel) return;
  if (channel.type !== "direct") {
    showAppMessage(
      mode === "video"
        ? "Real live video calls for a whole project or team need backend/WebRTC integration. The chat workspace is ready for that next step."
        : "Real live team calls need backend/WebRTC integration. The chat workspace is ready for that next step.",
      "info",
      mode === "video" ? "Video Call" : "Team Call"
    );
    return;
  }

  const member = getUserById(channel.userId);
  if (mode === "audio" && member?.tel) {
    window.location.href = `tel:${member.tel}`;
    return;
  }

  showAppMessage(
    mode === "video"
      ? `A real in-app video call with ${getMemberDisplayName(member)} needs backend/WebRTC integration.`
      : member?.tel
        ? `Your browser could not open the phone app for ${getMemberDisplayName(member)}.`
        : `${getMemberDisplayName(member)} does not have a phone number yet.`,
    "info",
    mode === "video" ? "Video Call" : "Call"
  );
}

function openProjectChatEmail(channel) {
  if (!channel || channel.type !== "direct") return;
  const member = getUserById(channel.userId);
  if (!member?.email) {
    showAppMessage(`${getMemberDisplayName(member)} does not have an email address yet.`, "warning", "Email");
    return;
  }
  window.location.href = `mailto:${member.email}`;
}

function createProjectChatMessageElement(message, galleryEntries, channelTitle = "") {
  const article = document.createElement("article");
  const isOwnMessage = message.createdByUserId === state.currentUserId;
  const sender = getUserById(message.createdByUserId);
  const senderName = isOwnMessage ? "You" : getMemberDisplayName(sender) || "Team member";
  const project = getCurrentProject();
  const canMarkImportant = Boolean(project && canManageProject(project));
  const importantBadge = message.importantNoteId ? '<span class="meta-pill status-pill-active">Important</span>' : "";
  article.className = `project-chat-message${isOwnMessage ? " own" : ""}`;
  article.dataset.messageId = message.id || "";
  article.innerHTML = `
    <div class="project-chat-message-avatar">${escapeHtml(getMemberInitials(sender || getCurrentUser()))}</div>
    <div class="project-chat-message-bubble">
      <div class="project-chat-message-meta">
        <strong>${escapeHtml(senderName)}</strong>
        <span>${escapeHtml(new Date(message.createdAt).toLocaleString())}</span>
        ${importantBadge}
        ${canMarkImportant ? `<button class="ghost-btn chat-important-btn" type="button">${message.importantNoteId ? "Added to Notes" : "Mark Important"}</button>` : ""}
      </div>
      ${message.text ? `<p class="project-chat-message-text">${escapeHtml(message.text)}</p>` : ""}
      <div class="project-chat-message-attachments"></div>
    </div>
  `;
  article.querySelector(".chat-important-btn")?.addEventListener("click", () => markChatMessageAsImportant(message.id, channelTitle));

  const attachmentsShell = article.querySelector(".project-chat-message-attachments");
  const singleMessageGallery = buildChatAttachmentGalleryEntries([message], channelTitle);
  if (attachmentsShell && (message.attachments || []).length) {
    for (const attachment of message.attachments || []) {
      if (attachment.isImage) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chat-attachment-thumb";
        button.setAttribute("aria-label", `Open ${attachment.name}`);
        button.innerHTML = `<img src="${attachment.dataUrl}" alt="${escapeHtml(attachment.name)}"><span>${escapeHtml(attachment.name)}</span>`;
        button.addEventListener("click", () => {
          const key = `chat:${message.id}:${attachment.id}`;
          const index = galleryEntries.findIndex((entry) => entry.key === key);
          if (index >= 0) openImagePreview(galleryEntries, index);
          else if (singleMessageGallery.length) openImagePreview(singleMessageGallery, 0);
        });
        attachmentsShell.append(button);
        continue;
      }

      const link = document.createElement("a");
      link.className = "chat-attachment-file";
      link.href = attachment.dataUrl;
      link.download = attachment.name || "attachment";
      link.innerHTML = `
        <span class="chat-attachment-file-name">${escapeHtml(attachment.name || "Attachment")}</span>
        <span class="chat-attachment-file-meta">${escapeHtml(formatFileSize(attachment.size || 0))}</span>
      `;
      attachmentsShell.append(link);
    }
  } else {
    attachmentsShell?.remove();
  }
  return article;
}

function markChatMessageAsImportant(messageId, channelTitle = "") {
  const project = getCurrentProject();
  if (!project) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can mark chat messages as important.")) return;
  const message = (project.chatMessages || []).find((entry) => entry.id === messageId);
  if (!message) return;
  if (message.importantNoteId) {
    showAppMessage("This message is already copied into Notes.", "info", "Chat");
    return;
  }
  const sender = getUserById(message.createdByUserId);
  const senderName = getMemberDisplayName(sender) || "Team member";
  const detailsFolder = getProjectDetailsFolder(project);
  if (!detailsFolder) return;
  const previewText = String(message.text || "").trim();
  const titleSuffix = previewText ? `: ${previewText.slice(0, 46)}` : "";
  const note = {
    id: crypto.randomUUID(),
    type: "note",
    title: `Note from chat${titleSuffix}`,
    content: [
      `Source: ${channelTitle || "Project chat"}`,
      `From: ${senderName}`,
      `Time: ${new Date(message.createdAt).toLocaleString()}`,
      previewText ? `Message: ${previewText}` : "Message: (attachment only)",
    ].join("\n"),
    showOnMasterPlan: false,
    imageUrl: "",
    imageName: "",
    createdAt: new Date().toISOString(),
    createdByUserId: state.currentUserId || "",
    archivedAt: null,
    archivedByUserId: null,
  };
  detailsFolder.items.unshift(note);
  message.importantAt = new Date().toISOString();
  message.importantByUserId = state.currentUserId || "";
  message.importantNoteId = note.id;
  logAudit("Chat Message Marked Important", {
    objectType: "chat",
    objectName: senderName,
    projectId: project.id,
    projectName: project.name || "Untitled project",
  });
  persist();
  renderWorkspace();
}

function buildProjectDetailsChatSection(project) {
  const { section, header } = createProjectDetailsPanel("Chat");
  const canSend = canWorkInProject(project) || canManageProject(project);
  const { channels, channel } = ensureValidProjectChatChannel(project);
  const messages = getProjectChatMessages(project, channel?.id || "");
  const galleryEntries = buildChatAttachmentGalleryEntries(messages, channel?.title || "Project chat");

  const helper = document.createElement("p");
  helper.className = "muted section-intro";
  helper.textContent = "Open a project room, team room, or direct member chat. Attach pictures or files directly in the conversation.";
  section.append(helper);

  const headerActions = [];
  if (channel?.type === "direct") {
    const callBtn = document.createElement("button");
    callBtn.type = "button";
    callBtn.className = "secondary-btn";
    callBtn.textContent = "Call";
    callBtn.addEventListener("click", () => startProjectChatCall(channel, "audio"));
    headerActions.push(callBtn);

    const videoBtn = document.createElement("button");
    videoBtn.type = "button";
    videoBtn.className = "secondary-btn";
    videoBtn.textContent = "Video";
    videoBtn.addEventListener("click", () => startProjectChatCall(channel, "video"));
    headerActions.push(videoBtn);

    const emailBtn = document.createElement("button");
    emailBtn.type = "button";
    emailBtn.className = "ghost-btn";
    emailBtn.textContent = "Email";
    emailBtn.addEventListener("click", () => openProjectChatEmail(channel));
    headerActions.push(emailBtn);
  } else if (channel) {
    const teamCallBtn = document.createElement("button");
    teamCallBtn.type = "button";
    teamCallBtn.className = "secondary-btn";
    teamCallBtn.textContent = channel.type === "project" ? "Project Call" : "Team Call";
    teamCallBtn.addEventListener("click", () => startProjectChatCall(channel, "audio"));
    headerActions.push(teamCallBtn);
  }
  appendDashboardSectionControls(header, headerActions);

  const layout = document.createElement("div");
  layout.className = "project-chat-layout";

  const rail = document.createElement("aside");
  rail.className = "project-chat-rail";
  if (!channels.length) {
    rail.innerHTML = `<section class="empty-state"><h3>No chat channels yet</h3><p>Add team members or service teams to this project to start chatting.</p></section>`;
  } else {
    for (const entry of channels) {
      const theme = buildTabTheme(entry.color || CONTENT_TAB_COLORS.chat);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `project-chat-channel-btn${channel?.id === entry.id ? " active" : ""}`;
      button.style.setProperty("--chat-channel-soft", theme.soft);
      button.style.setProperty("--chat-channel-border", theme.border);
      button.style.setProperty("--chat-channel-active", theme.active);
      button.style.setProperty("--chat-channel-shadow", theme.shadow);
      button.innerHTML = `
        <span class="project-chat-channel-label">${escapeHtml(entry.title)}</span>
        <span class="project-chat-channel-meta">${escapeHtml(entry.subtitle || "")}</span>
      `;
      button.addEventListener("click", () => selectProjectChatChannel(entry.id, project));
      rail.append(button);
    }
  }

  const pane = document.createElement("section");
  pane.className = "project-chat-pane";
  if (!channel) {
    pane.innerHTML = `<section class="empty-state"><h3>No conversation selected</h3><p>Select a project room, team room, or member chat on the left.</p></section>`;
    layout.append(rail, pane);
    section.append(layout);
    return section;
  }

  const channelMembers = (channel.memberIds || [])
    .map((userId) => getUserById(userId))
    .filter(Boolean);
  const chatHeader = document.createElement("div");
  chatHeader.className = "project-chat-pane-header";
  chatHeader.innerHTML = `
    <div>
      <h4>${escapeHtml(channel.title)}</h4>
      <p class="muted">${escapeHtml(channel.subtitle || "")}</p>
    </div>
    <div class="meta-row">${channelMembers.map((member) => `<span class="meta-pill">${escapeHtml(getMemberDisplayName(member))}</span>`).join("") || '<span class="meta-pill">No member linked</span>'}</div>
  `;

  const messageList = document.createElement("div");
  messageList.className = "project-chat-message-list";
  if (!messages.length) {
    messageList.innerHTML = `<section class="empty-state"><h3>No messages yet</h3><p>Start the conversation with your project team here.</p></section>`;
  } else {
    for (const message of messages) {
      messageList.append(createProjectChatMessageElement(message, galleryEntries, channel.title));
    }
  }

  const composer = document.createElement("form");
  composer.className = "project-chat-composer";
  composer.innerHTML = `
    <textarea class="project-chat-input" rows="4" placeholder="Write a message to ${escapeHtml(channel.title)}"></textarea>
    <input class="project-chat-file-input" type="file" multiple hidden>
    <div class="project-chat-draft-preview hidden"></div>
    <div class="project-chat-composer-actions">
      <button class="ghost-btn project-chat-attach-btn" type="button">Add Pics / Files</button>
      <span class="muted project-chat-composer-note">${canSend ? "Messages are saved in this project." : "You can read messages, but you cannot send in this project."}</span>
      <button class="primary-btn project-chat-send-btn" type="submit" ${canSend ? "" : "disabled"}>Send</button>
    </div>
  `;

  const textarea = composer.querySelector(".project-chat-input");
  attachMentionAutocomplete(textarea, () => project);
  const fileInput = composer.querySelector(".project-chat-file-input");
  const attachBtn = composer.querySelector(".project-chat-attach-btn");
  const draftPreview = composer.querySelector(".project-chat-draft-preview");

  const renderDraftPreview = () => {
    const files = Array.from(fileInput?.files || []);
    if (!draftPreview) return;
    if (!files.length) {
      draftPreview.innerHTML = "";
      draftPreview.classList.add("hidden");
      return;
    }
    draftPreview.classList.remove("hidden");
    draftPreview.innerHTML = files.map((file) => `
      <div class="project-chat-draft-chip">
        <strong>${escapeHtml(file.name || "Attachment")}</strong>
        <span>${escapeHtml(formatFileSize(file.size || 0))}</span>
      </div>
    `).join("");
  };

  attachBtn?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", renderDraftPreview);
  composer.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canSend || !project || !channel) return;
    const text = String(textarea?.value || "").trim();
    const files = Array.from(fileInput?.files || []);
    if (!text && !files.length) {
      showAppMessage("Write a message or attach at least one file.", "warning", "Chat");
      return;
    }

    const attachments = await Promise.all(files.map((file) => createChatAttachmentFromFile(file)));
    project.chatMessages.push({
      id: crypto.randomUUID(),
      channelId: channel.id,
      text,
      attachments,
      createdAt: new Date().toISOString(),
      createdByUserId: state.currentUserId || "",
      importantAt: null,
      importantByUserId: null,
      importantNoteId: null,
    });
    const createdMessage = project.chatMessages[project.chatMessages.length - 1];
    createMentionNotifications(project, text, {
      itemType: "chat",
      itemId: createdMessage.id,
      channelId: channel.id,
      messageId: createdMessage.id,
    });
    persist();
    renderWorkspace();
    requestAnimationFrame(() => {
      const items = document.querySelectorAll(".project-chat-message");
      items[items.length - 1]?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  });

  pane.append(chatHeader, messageList, composer);
  layout.append(rail, pane);
  section.append(layout);
  if (messages.length) {
    requestAnimationFrame(() => {
      messageList.scrollTop = messageList.scrollHeight;
    });
  }
  return section;
}

function renderServiceTeamSummary(project, folder) {
  const memberNames = (folder.memberIds || [])
    .map((id) => getMemberDisplayName(buildAssignableMembers(project).find((member) => member.id === id)))
    .filter(Boolean);
  const linkedAreas = getAreasForTeam(project, folder.id);
  const hiddenTeams = getHiddenServiceTeams(project);
  const counts = {
    note: folder.items.filter((item) => item.type === "note" && !item.archivedAt).length,
    file: folder.items.filter((item) => item.type === "file" && !item.archivedAt).length,
    photo: folder.items.filter((item) => item.type === "photo" && !item.archivedAt).length,
    task: folder.items.filter((item) => item.type === "task" && item.status !== "Done" && !item.archivedAt).length,
  };
  els.folderSummary.innerHTML = `
    <article class="summary-card">
      <strong>${memberNames.length}</strong>
      <span>Team members</span>
      <div class="meta-row">${memberNames.map((name) => `<span class="meta-pill">${escapeHtml(name)}</span>`).join("") || `<span class="meta-pill">No member</span>`}</div>
      <button class="summary-shortcut-btn" type="button" data-summary-target="teams"><span aria-hidden="true">↓</span> Team details</button>
    </article>
    <article class="summary-card">
      <strong>${linkedAreas.length}</strong>
      <span>Connected Areas</span>
      <div class="meta-row">${linkedAreas.map((area) => buildAreaConnectionPillMarkup(area, canManageProject(project) ? {
        disconnectAction: "area-team",
        areaId: area.id,
        teamId: folder.id,
      } : {})).join("") || `<span class="meta-pill">No area</span>`}</div>
      <button class="summary-shortcut-btn" type="button" data-summary-target="areas"><span aria-hidden="true">↓</span> Areas</button>
    </article>
    <article class="summary-card">
      <strong>${counts.task}</strong>
      <span>Active tasks</span>
      <button class="summary-shortcut-btn" type="button" data-summary-target="tasks"><span aria-hidden="true">↓</span> Active tasks</button>
    </article>
    <article class="summary-card">
      <strong>${counts.file + counts.photo}</strong>
      <span>Files and pics</span>
      <button class="summary-shortcut-btn" type="button" data-summary-target="uploads"><span aria-hidden="true">↓</span> Uploads</button>
    </article>
  `;
  bindConnectionActionButtons(els.folderSummary);
  for (const button of els.folderSummary.querySelectorAll(".summary-shortcut-btn")) {
    button.addEventListener("click", () => openServiceTeamSummaryShortcut(project, folder, button.dataset.summaryTarget || "teams", counts));
  }
  els.folderSummary.classList.remove("hidden");
}

function openServiceTeamSummaryShortcut(project, folder, target, counts = null) {
  if (!project || !folder) return;
  if (!confirmDiscardAndMaybeDeleteDraft()) return;
  pushNavigationState();
  currentView = "projects";
  if (isMobileProjectViewport()) currentMobileProjectsPane = "detail";

  if (target === "uploads") {
    currentWorkspaceTab = `folder:${folder.id}`;
    currentContentTab = (counts?.file || !counts?.photo) ? "file" : "photo";
  } else {
    currentWorkspaceTab = "folders-hub";
    currentProjectDetailsTab = target === "areas"
      ? "areas"
      : target === "tasks"
        ? "tasks"
        : "teams";
  }

  persist();
  render();
  els.workspaceTabContent?.scrollTo({ top: 0, behavior: "smooth" });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goForward() {
  if (!confirmDiscardAndMaybeDeleteDraft()) return;
  const snapshot = navigationFuture.pop();
  if (!snapshot) return;
  const currentSnapshot = captureNavigationState();
  const previous = navigationHistory[navigationHistory.length - 1];
  if (!previous || JSON.stringify(previous) !== JSON.stringify(currentSnapshot)) {
    navigationHistory.push(currentSnapshot);
    if (navigationHistory.length > 80) navigationHistory.shift();
  }
  restoreNavigationState(snapshot);
}

function goHome() {
  if (!confirmDiscardAndMaybeDeleteDraft()) return;
  if (
    currentView === "projects"
    && currentWorkspaceTab === "folders-hub"
    && currentProjectDetailsTab === "plan"
    && (!isMobileProjectViewport() || getActiveMobileProjectsPane() === "list")
  ) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  pushNavigationState();
  currentView = "projects";
  if (isMobileProjectViewport()) currentMobileProjectsPane = "list";
  currentWorkspaceTab = "folders-hub";
  currentProjectDetailsTab = "plan";
  currentContentTab = "note";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleProjectsRail() {
  isProjectsRailCollapsed = !isProjectsRailCollapsed;
  renderProjectRailControls();
}

function collectProjectDetailItems(project, detailsFolder) {
  const detailItems = [...(detailsFolder?.items || [])];
  if (currentContentTab !== "file" && currentContentTab !== "photo") return detailItems;
  for (const area of project.areas || []) {
    if (area.archivedAt && !showArchivedWorkspaceItems) continue;
    for (const item of area.items || []) {
      if (item.type !== currentContentTab) continue;
      detailItems.push({
        ...item,
        shortcut: true,
        shortcutAreaName: area.name,
      });
    }
  }
  return detailItems;
}

function collectProjectItems(project, type, includeDone) {
  const items = [];
  for (const folder of getAllProjectFolders(project)) {
    if (folder.archivedAt && !showArchivedWorkspaceItems) continue;
    for (const item of folder.items) {
      if (item.type !== type) continue;
      if (!showArchivedWorkspaceItems && item.archivedAt) continue;
      if (type === "task" && !includeDone && item.status === "Done") continue;
      items.push({ ...item, folderId: folder.id, folderName: folder.name });
    }
  }
  for (const area of project?.areas || []) {
    if (area.archivedAt && !showArchivedWorkspaceItems) continue;
    for (const item of area.items || []) {
      if (item.type !== type) continue;
      if (!showArchivedWorkspaceItems && item.archivedAt) continue;
      if (type === "task" && !includeDone && item.status === "Done") continue;
      items.push({ ...item, linkedAreaId: item.linkedAreaId || area.id, linkedAreaName: item.linkedAreaName || area.name });
    }
  }
  return items;
}

function collectAssignedTasksForUser() {
  const tasks = [];
  const project = getCurrentProject();
  if (!project) return tasks;
  const userTeamIds = new Set(getUserTeamIdsForProject(project));
  const projectTasks = collectProjectItems(project, "task", false)
    .filter((task) => !task.archivedAt && (task.assigneeId === state.currentUserId || userTeamIds.has(task.assigneeId)))
    .map((task) => ({ ...task, projectId: project.id, projectName: project.name || "Untitled project" }));
  tasks.push(...projectTasks);
  return tasks.sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function renderAssignedTasksOverview() {
  const tasks = collectAssignedTasksForUser();
  const project = getCurrentProject();
  els.folderEmptyState.classList.add("hidden");
  els.folderDetail.classList.remove("hidden");
  els.folderSummary.classList.add("hidden");
  els.folderItems.innerHTML = "";
  els.workspaceTitle.textContent = project?.name || "Project Tasks";
  els.workspaceSubtitle.textContent = "Tasks for the currently selected project";
  if (els.workspaceContext) els.workspaceContext.textContent = "Quick task overview for the current project.";
  els.projectMetaBar.innerHTML = `<span class="meta-pill">Project tasks: ${tasks.length}</span>`;
  if (!tasks.length) {
    els.folderItems.innerHTML = `<section class="empty-state"><h3>No assigned tasks</h3><p>You have no open tasks assigned right now.</p></section>`;
    return;
  }
  for (const task of tasks) {
    const card = els.itemCardTemplate.content.firstElementChild.cloneNode(true);
    const sourceProject = state.projects.find((project) => project.id === task.projectId) || getCurrentProject();
    applyCardTheme(card, sourceProject);
    card.innerHTML = `
      <span class="item-type">Task</span>
      <h3>${escapeHtml(task.title || "Untitled task")}</h3>
      <div class="meta-row">
        <span class="meta-pill">Project: ${escapeHtml(task.projectName)}</span>
        <span class="meta-pill status-pill-${(task.status || "open").toLowerCase()}">${escapeHtml(task.status || "Open")}</span>
      </div>
      <p>${escapeHtml(task.notes || "No extra notes.")}</p>
      <div class="meta-row">
        <span class="meta-pill">Due: ${escapeHtml(task.dueDate || "No date")}</span>
        ${task.linkedAreaName ? `<span class="meta-pill">Area: ${escapeHtml(task.linkedAreaName)}</span>` : ""}
      </div>
    `;
    els.folderItems.append(card);
  }
}

function renderProjectMeta(project) {
  const client = getClientById(project.clientId);
  const address = client?.address?.trim() || "No address added";
  const tel = client?.tel?.trim() || "No telephone added";
  const email = client?.email?.trim() || "";
  const clientName = client ? formatClientName(client) : "No client assigned";
  const manager = getUserById(project.projectManagerUserId);
  const managerName = manager ? getMemberDisplayName(manager) : "No project manager";
  const startDate = formatDateDisplay(project.startDate || "");
  const contextLine = [
    client?.company?.trim() || "",
    clientName !== client?.company?.trim() ? clientName : "",
    `Project manager: ${managerName}`,
  ].filter(Boolean).join(" | ");
  els.workspaceTitle.textContent = getProjectDisplayName(project);
  els.workspaceSubtitle.textContent = address;
  if (els.workspaceContext) els.workspaceContext.textContent = contextLine || "Project context";
  els.projectMetaBar.innerHTML = `
    <span class="meta-pill">Project: ${escapeHtml(formatProjectNumberValue(project.projectNumber) || "----")}</span>
    <span class="meta-pill">Client: ${escapeHtml(clientName)}</span>
    <span class="meta-pill">Manager: ${escapeHtml(managerName)}</span>
    <span class="meta-pill">Start: ${escapeHtml(startDate || "-")}</span>
    <span class="meta-pill">Tel: ${escapeHtml(tel)}</span>
    ${email ? `<span class="meta-pill">Email: ${escapeHtml(email)}</span>` : ""}
    <span class="meta-pill">Status: ${escapeHtml(project.lifecycle || "active")}</span>
  `;
  return project;
}

function renderItem(item, options = {}) {
  const wrapper = document.createElement("div");
  applyItemBadgeTheme(wrapper);
  const project = getCurrentProject();
  const dateLabel = new Date(item.createdAt).toLocaleString();
  const archiveBadge = item.archivedAt ? `<span class="meta-pill status-pill-archived">Archived</span>` : "";
  const linkedFolders = resolveLinkedFolders(item.linkedFolderIds || []);
  const linkedPhotos = resolveLinkedPhotos(item.linkedPhotoIds || []);
  const linkedAreas = resolveLinkedAreas(item.linkedAreaIds || []);
  const galleryEntries = Array.isArray(options.galleryEntries) ? options.galleryEntries : [];
  const uploader = getUserById(item.createdByUserId || "");
  const uploaderName = getMemberDisplayName(uploader) || "Unknown user";
  const uploaderTeamNames = getTeamIdsForUser(project, item.createdByUserId || "")
    .map((teamId) => project?.folders?.find((folder) => folder.id === teamId && !folder.archivedAt)?.name || "")
    .filter(Boolean);
  const resolvedAreaNames = new Set(linkedAreas.map((area) => area.name).filter(Boolean));
  if (item.linkedAreaName) resolvedAreaNames.add(item.linkedAreaName);
  if (item.shortcutAreaName) resolvedAreaNames.add(item.shortcutAreaName);
  if (!resolvedAreaNames.size) {
    const location = findItemLocation(item.id);
    if (location?.parent && (project?.areas || []).some((area) => area.id === location.parent.id)) {
      resolvedAreaNames.add(location.parent.name || "Area");
    }
  }
  const buildUploadMetaMarkup = () => {
    const pills = [`<span class="meta-pill">Uploaded by: ${escapeHtml(uploaderName)}</span>`];
    if (resolvedAreaNames.size) {
      pills.push(...[...resolvedAreaNames].map((name) => `<span class="meta-pill">Area: ${escapeHtml(name)}</span>`));
    }
    if (uploaderTeamNames.length) {
      pills.push(...uploaderTeamNames.map((name) => `<span class="meta-pill">Team: ${escapeHtml(name)}</span>`));
    }
    return pills.join("");
  };
  const appendLinkedFolderLine = () => {
    if (!linkedFolders.length) return;
    const line = document.createElement("div");
    line.className = "meta-row";
    line.innerHTML = linkedFolders.map((folder) => buildTeamPillMarkup(folder, "Service Team", canManageProject(getCurrentProject()) ? {
      disconnectAction: "item-team",
      itemId: item.id,
      teamId: folder.id,
    } : {})).join("");
    wrapper.append(line);
  };
  const appendLinkedAreaLine = () => {
    if (!linkedAreas.length) return;
    const areaNamesAlreadyShown = new Set([...resolvedAreaNames]
      .map((name) => String(name || "").trim().toLowerCase())
      .filter(Boolean));
    const areasToShow = linkedAreas.filter((area) => {
      const key = String(area?.name || "").trim().toLowerCase();
      if (!key) return true;
      return !areaNamesAlreadyShown.has(key);
    });
    if (!areasToShow.length) return;
    const line = document.createElement("div");
    line.className = "meta-row";
    line.innerHTML = areasToShow.map((area) => buildAreaConnectionPillMarkup(area)).join("");
    wrapper.append(line);
  };
  if (item.type === "note") {
    const canToggleChecklist = canManageProject(getCurrentProject()) || item.createdByUserId === state.currentUserId;
    const isChecklist = item.noteStyle === "checklist" || Array.isArray(item.checklist);
    if (isChecklist && !Array.isArray(item.checklist)) {
      item.checklist = parseChecklistText(item.content || "");
    }
    const bodyMarkup = isChecklist
      ? `<ul class="note-checklist">${(item.checklist || []).map((entry, index) => `
          <li class="note-check-item${entry?.done ? " is-done" : ""}">
            <button class="note-check-toggle" type="button" data-index="${index}" ${canToggleChecklist ? "" : "disabled"} aria-label="Toggle checklist item"></button>
            <span class="note-check-text">${escapeHtml(entry?.text || "")}</span>
          </li>
        `).join("")}</ul>`
      : `<p>${escapeHtml(item.content || "No text yet.")}</p>`;
    wrapper.innerHTML = `
      <span class="item-type">Note</span>
      <h3>${escapeHtml(item.title)}</h3>
      ${bodyMarkup}
      ${item.imageUrl ? `<button class="note-item-image image-open-trigger" type="button" aria-label="Open ${escapeHtml(item.imageName || item.title || "Comment image")}"><img src="${item.imageUrl}" alt="${escapeHtml(item.imageName || item.title || "Comment image")}"></button>` : ""}
      <div class="meta-row">${archiveBadge}${item.showOnMasterPlan ? '<span class="meta-pill">Master plan</span>' : ""}<span class="meta-pill">${escapeHtml(dateLabel)}</span></div>
    `;
    wrapper.querySelector(".image-open-trigger")?.addEventListener("click", () => openImagePreviewForItem(item, galleryEntries));
    if (isChecklist) {
      wrapper.querySelectorAll(".note-check-toggle").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (!canToggleChecklist) return;
          const index = Number(btn.dataset.index);
          const location = findItemLocation(item.id);
          if (!location) return;
          const list = Array.isArray(location.item.checklist)
            ? location.item.checklist
            : (location.item.checklist = parseChecklistText(location.item.content || ""));
          if (!list[index]) return;
          list[index].done = !list[index].done;
          location.item.noteStyle = "checklist";
          location.item.content = list.map((entry) => entry.text).join("\n");
          persist();
          render();
        });
      });
    }
    appendLinkedFolderLine();
    appendLinkedAreaLine();
    bindConnectionActionButtons(wrapper);
    return wrapper;
  }
  if (item.type === "file") {
    const isImageFile = String(item.mimeType || "").toLowerCase().startsWith("image/");
    const visibleName = item.title || "Untitled file";
    wrapper.classList.toggle("file-item-content", true);
    wrapper.classList.toggle("file-item-with-preview", isImageFile);
    wrapper.innerHTML = `
      <div class="file-item-main">
        <span class="item-type">File</span>
        <h3><a class="file-link file-title-link" href="${item.objectUrl}" download="${escapeHtml(item.originalName)}">${escapeHtml(visibleName)}</a></h3>
        ${item.showOriginalName ? `<div class="file-original-name">${escapeHtml(item.originalName)}</div>` : ""}
        <div class="meta-row">${archiveBadge}${item.shortcut ? `<span class="meta-pill">Shortcut: ${escapeHtml(item.shortcutAreaName || "")}</span>` : ""}<span class="meta-pill">${escapeHtml(item.mimeType || "file")}</span><span class="meta-pill">${escapeHtml(dateLabel)}</span></div>
        <div class="meta-row">${buildUploadMetaMarkup()}</div>
      </div>
      ${isImageFile ? `
        <button class="file-thumb-preview image-open-trigger" type="button" title="Open image preview" aria-label="Open ${escapeHtml(item.originalName || item.title || "Image preview")}">
          <img src="${item.objectUrl}" alt="${escapeHtml(item.originalName || item.title || "Image preview")}">
        </button>
      ` : ""}
    `;
    wrapper.querySelector(".image-open-trigger")?.addEventListener("click", () => openImagePreviewForItem(item, galleryEntries));
    appendLinkedFolderLine();
    appendLinkedAreaLine();
    bindConnectionActionButtons(wrapper);
    return wrapper;
  }
  if (item.type === "photo") {
    wrapper.classList.add("photo-item-content");
    wrapper.innerHTML = `
      <h3>${escapeHtml(item.title)}</h3>
      <button class="photo-item-preview image-open-trigger" type="button" aria-label="Open ${escapeHtml(item.title)}">
        <img src="${item.previewUrl}" alt="${escapeHtml(item.title)}">
        <span class="photo-item-preview-icon" aria-hidden="true"></span>
      </button>
      <div class="meta-row">${archiveBadge}${item.shortcut ? `<span class="meta-pill">Shortcut: ${escapeHtml(item.shortcutAreaName || "")}</span>` : ""}<span class="meta-pill">${escapeHtml(dateLabel)}</span>${buildUploadMetaMarkup()}</div>
    `;
    wrapper.querySelector(".image-open-trigger")?.addEventListener("click", () => openImagePreviewForItem(item, galleryEntries));
    appendLinkedFolderLine();
    appendLinkedAreaLine();
    bindConnectionActionButtons(wrapper);
    return wrapper;
  }
  wrapper.innerHTML = `<span class="item-type">Task</span><h3>${escapeHtml(item.title)}</h3><div class="meta-row">${archiveBadge}<span class="meta-pill status-pill-${item.status.toLowerCase()}">${escapeHtml(item.status)}</span><span class="meta-pill">Assigned: ${escapeHtml(item.assigneeName)}</span><span class="meta-pill">Due: ${escapeHtml(item.dueDate)}</span></div><p>${escapeHtml(item.notes || "No extra notes.")}</p>`;
  if (item.linkedAreaName) {
    const areaLine = document.createElement("div");
    areaLine.className = "meta-row";
    areaLine.innerHTML = `<span class="meta-pill">Area: ${escapeHtml(item.linkedAreaName)}</span>`;
    wrapper.append(areaLine);
  }
  if (linkedFolders.length) {
    appendLinkedFolderLine();
  }
  if (linkedPhotos.length) {
    const line = document.createElement("div");
    line.className = "meta-row";
    line.innerHTML = linkedPhotos.map((photo) => buildPhotoConnectionPillMarkup(photo, canManageProject(getCurrentProject()) ? {
      disconnectAction: "item-photo",
      itemId: item.id,
      photoId: photo.id,
    } : {})).join("");
    wrapper.append(line);
  }
  bindConnectionActionButtons(wrapper);
  return wrapper;
}
function resolveLinkedFolders(folderIds) {
  const project = getCurrentProject();
  return folderIds.map((id) => project?.folders.find((folder) => folder.id === id)).filter(Boolean);
}

function resolveLinkedAreas(areaIds) {
  const project = getCurrentProject();
  return areaIds.map((id) => project?.areas?.find((area) => area.id === id)).filter(Boolean);
}

function resolveLinkedPhotos(photoIds) {
  return collectProjectPhotos(getCurrentProject()).filter((photo) => photoIds.includes(photo.id));
}

function editMember(memberId) {
  if (!requirePermission(hasPermission("changeRoles"), "You do not have permission to edit members.")) return;
  const member = getUserById(memberId);
  if (!member) return;
  isMemberFormExpanded = true;
  populateMemberForm(member);
  renderMemberFormState();
}

function resetMemberPin(memberId) {
  if (!requirePermission(isAdmin(), "Only admins can reset login PINs.")) return;
  const member = getUserById(memberId);
  if (!member || member.id === state.currentUserId) return;
  member.pinCode = "000000";
  member.mustChangePin = true;
  notifyUser(member.id, {
    title: "PIN reset",
    body: "An admin reset your login PIN. Use 000000 once, then choose a new PIN.",
  });
  logAudit("Member PIN Reset", {
    objectType: "member",
    objectName: getMemberDisplayName(member),
  });
  persist();
  renderMembers();
  renderNotificationsPanel();
  showAppMessage(`Temporary PIN for ${getMemberDisplayName(member)} is 000000. They must change it at next login.`, "success", "PIN Reset");
}

function editClient(clientId) {
  if (!requirePermission(PROJECT_ROLES.has(getCurrentRole()) || isAdmin(), "Only admins or managers can edit clients.")) return;
  const client = getClientById(clientId);
  if (!client) return;
  selectedClientId = client.id;
  isClientFormExpanded = true;
  populateClientForm(client);
  renderClientFormState();
}

function editEquipment(equipmentId) {
  if (!requirePermission(canManageEquipment(), "Only admins, managers, or developers can edit equipment.")) return;
  const item = state.equipmentItems.find((entry) => entry.id === equipmentId);
  if (!item) return;
  expandedEquipmentId = item.id;
  isEquipmentFormExpanded = true;
  populateEquipmentForm(item);
  renderEquipmentFormState();
}

function editServiceTeam(teamId) {
  if (!requirePermission(canManageProject(), "Only admins or assigned managers can edit Service Teams.")) return;
  openServiceTeamDialog(teamId);
}

function editArea(areaId) {
  if (!areaId) {
    showAppMessage("Info cannot be edited as an area. It belongs to the project.", "warning", "Area");
    return;
  }
  const project = getCurrentProject();
  const area = project?.areas?.find((entry) => entry.id === areaId);
  if (!area) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can edit Areas.")) return;
  openAreaDialog(area.id);
}

function findItemLocation(itemId) {
  const project = getCurrentProject();
  if (!project) return null;
  for (const folder of getAllProjectFolders(project)) {
    const index = folder.items.findIndex((item) => item.id === itemId);
    if (index >= 0) return { container: folder.items, item: folder.items[index], parent: folder };
  }
  for (const area of project.areas || []) {
    const index = area.items.findIndex((item) => item.id === itemId);
    if (index >= 0) return { container: area.items, item: area.items[index], parent: area };
  }
  return null;
}

function editItem(itemId) {
  const location = findItemLocation(itemId);
  if (!location) return;
  const project = getCurrentProject();
  const { item, parent } = location;
  const detailsFolder = getProjectDetailsFolder(project);
  const isPlanItem = Boolean(detailsFolder && parent?.id === detailsFolder.id);
  const canEditItem = item.type === "task"
    ? (canManageProject(project) || item.assigneeId === state.currentUserId)
    : (canManageProject(project) || item.createdByUserId === state.currentUserId);
  if (isPlanItem && !requirePermission(canManageProject(project), "Only admins or assigned project managers can edit Plans.")) return;
  if (!requirePermission(canEditItem, "You do not have permission to edit this item.")) return;
  if (item.type === "note") {
    const detailsFolder = getProjectDetailsFolder(project);
    pendingAssetTarget = detailsFolder?.id === parent.id
      ? { kind: "folder", id: parent.id }
      : (project?.areas || []).some((area) => area.id === parent.id)
        ? { kind: "area", id: parent.id }
        : { kind: "folder", id: parent.id };
    openNoteDialog(itemId);
    return;
  }
  const title = window.prompt("Edit title", item.title || "");
  if (!title) return;
  item.title = title.trim();
  if (item.type === "task") {
    const notes = window.prompt("Edit task notes", item.notes || "");
    if (notes === null) return;
    item.notes = notes;
    if (!canManageProject(project)) {
      const status = window.prompt("Update task status: Open, Started, Paused, or Done", item.status || "Open");
      if (status) item.status = status;
    }
  }
  logAudit("Item Updated", {
    objectType: item.type,
    objectName: item.title,
    projectId: project?.id || "",
  });
  persist();
  render();
}

function buildItemMenuActions(itemId) {
  const location = findItemLocation(itemId);
  if (!location) return [];
  const { item, parent } = location;
  const project = getCurrentProject();
  const actions = [];
  const detailsFolder = getProjectDetailsFolder(project);
  const isPlanItem = Boolean(detailsFolder && parent?.id === detailsFolder.id);
  const canEditItem = item.type === "task"
    ? (canManageProject(project) || item.assigneeId === state.currentUserId)
    : (canManageProject(project) || item.createdByUserId === state.currentUserId);
  const canArchiveItem = item.type === "task"
    ? (canManageProject(project) || item.assigneeId === state.currentUserId)
    : (canManageProject(project) || item.createdByUserId === state.currentUserId);
  if (isPlanItem ? canManageProject(project) : canEditItem) {
    actions.push({
      label: item.type === "task" && !canManageProject(project) ? "Update" : "Edit",
      onClick: () => editItem(itemId),
    });
    if (item.type === "file") {
      actions.push({
        label: item.showOriginalName ? "Hide original file name" : "Show original file name",
        onClick: () => toggleItemOriginalName(itemId),
      });
    }
  }
  if (!item.archivedAt && (isPlanItem ? canManageProject(project) : canArchiveItem)) {
    actions.push({
      label: "Archive",
      destructive: true,
      onClick: () => archiveItem(itemId),
    });
  }
  const canDeleteOwnItem = !isPlanItem
    && item.createdByUserId === state.currentUserId;
  const canDeleteItem = isAdmin() || canDeleteOwnItem;
  if (canDeleteItem) {
    actions.push({ label: "Delete", destructive: true, onClick: () => permanentlyDeleteItem(itemId) });
  }
  if (item.archivedAt && (isPlanItem ? canManageProject(project) : isAdmin())) {
    actions.push({ label: "Restore", onClick: () => restoreItem(itemId) });
  }
  return actions;
}

function toggleItemOriginalName(itemId) {
  const location = findItemLocation(itemId);
  if (!location || location.item.type !== "file") return;
  const project = getCurrentProject();
  const canEditItem = canManageProject(project) || location.item.createdByUserId === state.currentUserId;
  if (!requirePermission(canEditItem, "You do not have permission to change this file display.")) return;
  location.item.showOriginalName = !location.item.showOriginalName;
  persist();
  render();
}

function archiveProject(projectId) {
  const project = state.projects.find((entry) => entry.id === projectId);
  if (!project) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can archive projects.")) return;
  if (!window.confirm("Archive this project?")) return;
  archiveEntity(project);
  logAudit("Project Archived", { objectType: "project", objectName: project.name || "Untitled project", projectId: project.id, projectName: project.name || "Untitled project" });
  state.selectedProjectId = ensureAccessibleSelectedProject(state);
  persist();
  render();
}

function restoreProject(projectId) {
  if (!requirePermission(isAdmin(), "Only admins can restore archived projects.")) return;
  const project = state.projects.find((entry) => entry.id === projectId);
  if (!project) return;
  restoreEntity(project);
  selectedArchivedProjectIds.delete(projectId);
  logAudit("Project Restored", { objectType: "project", objectName: project.name || "Untitled project", projectId: project.id, projectName: project.name || "Untitled project" });
  state.selectedProjectId = project.id;
  persist();
  render();
}

function permanentlyDeleteProjects(projectIds, reason = "") {
  const idSet = new Set(projectIds);
  const deletedProjects = state.projects.filter((entry) => idSet.has(entry.id));
  if (!deletedProjects.length) return;
  state.projects = state.projects.filter((entry) => !idSet.has(entry.id));
  for (const project of deletedProjects) {
    logAudit("Project Permanently Deleted", {
      objectType: "project",
      objectName: project.name || "Untitled project",
      projectId: project.id,
      projectName: project.name || "Untitled project",
      ...(reason ? { reason } : {}),
    });
  }
  selectedArchivedProjectIds = new Set(
    [...selectedArchivedProjectIds].filter((projectId) => !idSet.has(projectId))
  );
  state.selectedProjectId = ensureAccessibleSelectedProject(state);
  persist();
  render();
}

async function permanentlyDeleteProject(projectId) {
  if (!requirePermission(isAdmin(), "Only admins can permanently delete projects.")) return;
  const project = state.projects.find((entry) => entry.id === projectId);
  if (!project) return;
  const confirmed = await showAppConfirm(`Permanently delete "${project.name || "this project"}"?`, "Delete Project", {
    eyebrow: "Permanent Delete",
    confirmLabel: "Yes",
    cancelLabel: "No",
    tone: "warning",
  });
  if (!confirmed) return;
  permanentlyDeleteProjects([projectId]);
}

async function deleteSelectedArchivedProjects() {
  if (!requirePermission(isAdmin(), "Only admins can permanently delete archived projects.")) return;
  const selectedIds = [...selectedArchivedProjectIds];
  if (!selectedIds.length) return;
  const label = selectedIds.length === 1 ? "this archived project" : `${selectedIds.length} archived projects`;
  const confirmed = await showAppConfirm(`Permanently delete ${label}?`, "Delete Archived Projects", {
    eyebrow: "Permanent Delete",
    confirmLabel: "Yes",
    cancelLabel: "No",
    tone: "warning",
  });
  if (!confirmed) return;
  permanentlyDeleteProjects(selectedIds);
}

function archiveClient(clientId) {
  if (!requirePermission(canManageUsers(), "Only admins can archive clients.")) return;
  const client = getClientById(clientId);
  if (!client) return;
  if (!window.confirm("Archive this client?")) return;
  archiveEntity(client);
  logAudit("Client Archived", { objectType: "client", objectName: formatClientName(client) });
  persist();
  render();
}

async function permanentlyDeleteClient(clientId) {
  if (!requirePermission(isAdmin(), "Only admins can permanently delete clients.")) return;
  const client = getClientById(clientId);
  if (!client) return;
  const confirmed = await showAppConfirm(`Permanently delete client "${formatClientName(client)}"?`, "Delete Client", {
    eyebrow: "Permanent Delete",
    confirmLabel: "Yes",
    cancelLabel: "No",
    tone: "warning",
  });
  if (!confirmed) return;
  state.clients = state.clients.filter((entry) => entry.id !== clientId);
  for (const project of state.projects) {
    if (project.clientId === clientId) {
      project.clientId = "";
    }
  }
  if (selectedClientId === clientId) selectedClientId = "";
  if (editingClientId === clientId) {
    editingClientId = null;
    isClientFormExpanded = false;
  }
  logAudit("Client Permanently Deleted", {
    objectType: "client",
    objectName: formatClientName(client),
  });
  persist();
  render();
}

function archiveEquipment(equipmentId) {
  if (!requirePermission(canManageEquipment(), "Only admins, managers, or developers can archive equipment.")) return;
  const item = state.equipmentItems.find((entry) => entry.id === equipmentId);
  if (!item) return;
  if (!window.confirm("Archive this equipment?")) return;
  archiveEntity(item);
  logAudit("Equipment Archived", { objectType: "equipment", objectName: item.name });
  persist();
  render();
}

function restoreEquipment(equipmentId) {
  if (!requirePermission(canManageEquipment(), "Only admins, managers, or developers can restore equipment.")) return;
  const item = state.equipmentItems.find((entry) => entry.id === equipmentId);
  if (!item) return;
  restoreEntity(item);
  logAudit("Equipment Restored", { objectType: "equipment", objectName: item.name });
  persist();
  render();
}

async function permanentlyDeleteEquipment(equipmentId) {
  if (!requirePermission(isAdmin(), "Only admins can permanently delete equipment.")) return;
  const item = state.equipmentItems.find((entry) => entry.id === equipmentId);
  if (!item) return;
  const confirmed = await showAppConfirm(`Permanently delete equipment "${item.name}"?`, "Delete Equipment", {
    eyebrow: "Permanent Delete",
    confirmLabel: "Yes",
    cancelLabel: "No",
    tone: "warning",
  });
  if (!confirmed) return;
  state.equipmentItems = state.equipmentItems.filter((entry) => entry.id !== equipmentId);
  logAudit("Equipment Permanently Deleted", {
    objectType: "equipment",
    objectName: item.name,
  });
  persist();
  render();
}

function archiveMember(memberId) {
  const member = getUserById(memberId);
  const needsAdminDeleteRight = member?.role === "admin";
  if (!requirePermission(hasPermission("deleteMembers") && (!needsAdminDeleteRight || hasPermission("deleteAdmin")), "You do not have permission to deactivate this member.")) return;
  if (!member) return;
  if (member.id === state.currentUserId) {
    showAppMessage("You cannot deactivate your own account.", "warning", "Member");
    return;
  }
  if (!window.confirm("Deactivate this member?")) return;
  member.status = "archived";
  archiveEntity(member);
  logAudit("Member Deactivated", { objectType: "member", objectName: getMemberDisplayName(member) });
  state.currentUserId = ensureValidCurrentUser(state);
  state.selectedProjectId = ensureAccessibleSelectedProject(state);
  persist();
  render();
}

function restoreMember(memberId) {
  if (!requirePermission(hasPermission("deleteMembers"), "You do not have permission to restore members.")) return;
  const member = getUserById(memberId);
  if (!member) return;
  member.status = "active";
  restoreEntity(member);
  logAudit("Member Restored", { objectType: "member", objectName: getMemberDisplayName(member) });
  persist();
  render();
}

async function permanentlyDeleteMember(memberId) {
  const member = getUserById(memberId);
  const needsAdminDeleteRight = member?.role === "admin";
  if (!requirePermission(hasPermission("deleteMembers") && (!needsAdminDeleteRight || hasPermission("deleteAdmin")), "You do not have permission to permanently delete this member.")) return;
  if (!member) return;
  if (member.id === state.currentUserId) {
    showAppMessage("You cannot permanently delete your own account.", "warning", "Member");
    return;
  }
  const confirmed = await showAppConfirm(`Permanently delete member "${getMemberDisplayName(member)}"?`, "Delete Member", {
    eyebrow: "Permanent Delete",
    confirmLabel: "Yes",
    cancelLabel: "No",
    tone: "warning",
  });
  if (!confirmed) return;
  state.users = state.users.filter((user) => user.id !== memberId);
  for (const project of state.projects) {
    project.memberIds = (project.memberIds || []).filter((id) => id !== memberId);
    if (project.projectManagerUserId === memberId) project.projectManagerUserId = "";
  }
  logAudit("Member Permanently Deleted", { objectType: "member", objectName: getMemberDisplayName(member) });
  state.currentUserId = ensureValidCurrentUser(state);
  state.selectedProjectId = ensureAccessibleSelectedProject(state);
  persist();
  render();
}

function archiveFolder(folderId) {
  const project = getCurrentProject();
  const folder = project?.folders.find((entry) => entry.id === folderId);
  if (!project || !folder) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can archive Service Teams.")) return;
  if (!window.confirm("Archive this Service Team?")) return;
  archiveEntity(folder);
  if (project.selectedTeamInfoId === folderId) {
    project.selectedTeamInfoId = "";
  }
  if (project.selectedFolderId === folderId) {
    project.selectedFolderId = project.folders.find((entry) => !entry.archivedAt && entry.id !== folderId)?.id || null;
    currentWorkspaceTab = "folders-hub";
  }
  logAudit("Service Team Archived", { objectType: "service-team", objectName: folder.name, projectId: project.id, projectName: project.name || "Untitled project" });
  persist();
  render();
}

function restoreFolder(folderId) {
  if (!requirePermission(isAdmin(), "Only admins can restore archived Service Teams.")) return;
  const project = getCurrentProject();
  const folder = project?.folders.find((entry) => entry.id === folderId);
  if (!project || !folder) return;
  restoreEntity(folder);
  logAudit("Service Team Restored", { objectType: "service-team", objectName: folder.name, projectId: project.id, projectName: project.name || "Untitled project" });
  persist();
  render();
}

async function permanentlyDeleteFolder(folderId) {
  if (!requirePermission(isAdmin(), "Only admins can permanently delete Service Teams.")) return;
  const project = getCurrentProject();
  const folder = project?.folders.find((entry) => entry.id === folderId);
  if (!project || !folder) return;
  if (teamHasProtectedContent(project, folder)) {
    showAppMessage("This team already has saved content. You cannot delete it permanently, but you can make it inactive.", "warning", "Service Team");
    return;
  }
  const confirmed = await showAppConfirm(`Permanently delete Service Team "${folder.name}"?`, "Delete Service Team", {
    eyebrow: "Permanent Delete",
    confirmLabel: "Yes",
    cancelLabel: "No",
    tone: "warning",
  });
  if (!confirmed) return;
  project.folders = project.folders.filter((entry) => entry.id !== folderId);
  if (project.selectedTeamInfoId === folderId) {
    project.selectedTeamInfoId = "";
  }
  if (project.selectedFolderId === folderId) {
    project.selectedFolderId = project.folders.find((entry) => !entry.archivedAt)?.id || null;
    currentWorkspaceTab = "folders-hub";
  }
  for (const existingFolder of project.folders) {
    for (const item of existingFolder.items) {
      if (item.type === "task") item.linkedFolderIds = (item.linkedFolderIds || []).filter((id) => id !== folderId);
    }
  }
  logAudit("Service Team Permanently Deleted", { objectType: "service-team", objectName: folder.name, projectId: project.id });
  persist();
  render();
}

function archiveArea(areaId) {
  if (!areaId) {
    showAppMessage("Info cannot be archived. Only an admin can delete the full project.", "warning", "Area");
    return;
  }
  const project = getCurrentProject();
  const area = project?.areas.find((entry) => entry.id === areaId);
  if (!project || !area) return;
  if (!requirePermission(canManageProject(project), "Only admins or assigned managers can archive Areas.")) return;
  if (!window.confirm("Archive this Area?")) return;
  archiveEntity(area);
  logAudit("Area Archived", { objectType: "area", objectName: area.name, projectId: project.id, projectName: project.name || "Untitled project" });
  persist();
  render();
}

async function deleteArea(areaId) {
  if (!areaId) {
    showAppMessage("Info cannot be deleted as an area. Only an admin can delete the full project.", "warning", "Area");
    return;
  }
  const project = getCurrentProject();
  const area = project?.areas.find((entry) => entry.id === areaId);
  if (!project || !area) return;
  if (!requirePermission(isAdmin(), "Only admins can permanently delete Areas.")) return;
  const confirmed = await showAppConfirm(`Delete Area "${area.name}"?`, "Delete Area", {
    eyebrow: "Permanent Delete",
    confirmLabel: "Yes",
    cancelLabel: "No",
    tone: "warning",
  });
  if (!confirmed) return;
  project.areas = (project.areas || []).filter((entry) => entry.id !== areaId);
  if (selectedProjectAreaId === areaId) {
    selectedProjectAreaId = project.areas.find((entry) => !entry.archivedAt)?.id || "";
  }
  logAudit("Area Permanently Deleted", { objectType: "area", objectName: area.name, projectId: project.id });
  persist();
  render();
}

function restoreArea(areaId) {
  const project = getCurrentProject();
  if (!requirePermission(isAdmin() || canManageProject(project), "Only admins or assigned managers can restore archived Areas.")) return;
  const area = project?.areas.find((entry) => entry.id === areaId);
  if (!project || !area) return;
  restoreEntity(area);
  logAudit("Area Restored", { objectType: "area", objectName: area.name, projectId: project.id, projectName: project.name || "Untitled project" });
  persist();
  render();
}

function setAreaCompleted(areaId) {
  const project = getCurrentProject();
  const area = project?.areas.find((entry) => entry.id === areaId);
  if (!project || !area) return;
  if (!requirePermission(canWorkInProject(project), "You do not have permission to complete this area.")) return;
  if (area.completedAt) return;
  area.completedAt = new Date().toISOString();
  area.completedByUserId = state.currentUserId || "";
  logAudit("Area Completed", { objectType: "area", objectName: area.name, projectId: project.id });
  persist();
  render();
}

function reopenAreaWork(areaId) {
  const project = getCurrentProject();
  const area = project?.areas.find((entry) => entry.id === areaId);
  if (!project || !area) return;
  if (!requirePermission(canWorkInProject(project), "You do not have permission to reopen this area.")) return;
  if (!area.completedAt) return;
  area.completedAt = null;
  area.completedByUserId = null;
  logAudit("Area Reopened", { objectType: "area", objectName: area.name, projectId: project.id });
  persist();
  render();
}

async function permanentlyDeleteArea(areaId) {
  if (!areaId) {
    showAppMessage("Info cannot be permanently deleted as an area. Only full project deletion removes it.", "warning", "Area");
    return;
  }
  if (!requirePermission(isAdmin(), "Only admins can permanently delete Areas.")) return;
  const project = getCurrentProject();
  const area = project?.areas.find((entry) => entry.id === areaId);
  if (!project || !area) return;
  const confirmed = await showAppConfirm(`Permanently delete Area "${area.name}"?`, "Delete Area", {
    eyebrow: "Permanent Delete",
    confirmLabel: "Yes",
    cancelLabel: "No",
    tone: "warning",
  });
  if (!confirmed) return;
  project.areas = project.areas.filter((entry) => entry.id !== areaId);
  logAudit("Area Permanently Deleted", { objectType: "area", objectName: area.name, projectId: project.id });
  persist();
  render();
}

function archiveItem(itemId) {
  const location = findItemLocation(itemId);
  if (!location) return;
  const project = getCurrentProject();
  const detailsFolder = getProjectDetailsFolder(project);
  const isPlanItem = Boolean(detailsFolder && location.parent?.id === detailsFolder.id);
  const allowed = location.item.type === "task"
    ? (canManageProject(project) || location.item.assigneeId === state.currentUserId)
    : (canManageProject(project) || location.item.createdByUserId === state.currentUserId);
  const archiveAllowed = isPlanItem ? canManageProject(project) : allowed;
  if (!requirePermission(archiveAllowed, "You do not have permission to archive this item.")) return;
  if (!window.confirm("Archive this item?")) return;
  archiveEntity(location.item);
  if (expandedTaskId === itemId) expandedTaskId = "";
  logAudit("Item Archived", { objectType: location.item.type, objectName: location.item.title, projectId: project?.id || "", projectName: project?.name || "Untitled project" });
  persist();
  render();
}

function restoreItem(itemId) {
  const location = findItemLocation(itemId);
  if (!location) return;
  const project = getCurrentProject();
  const detailsFolder = getProjectDetailsFolder(project);
  const isPlanItem = Boolean(detailsFolder && location.parent?.id === detailsFolder.id);
  const canRestore = isPlanItem
    ? (isAdmin() || canManageProject(project))
    : isAdmin();
  if (!requirePermission(canRestore, isPlanItem
    ? "Only admins or assigned managers can restore archived plan items."
    : "Only admins can restore archived items.")) return;
  restoreEntity(location.item);
  logAudit("Item Restored", { objectType: location.item.type, objectName: location.item.title, projectId: getCurrentProject()?.id || "" });
  persist();
  render();
}

async function permanentlyDeleteItem(itemId) {
  const location = findItemLocation(itemId);
  if (!location) return;
  const project = getCurrentProject();
  const detailsFolder = getProjectDetailsFolder(project);
  const isPlanItem = Boolean(detailsFolder && location.parent?.id === detailsFolder.id);
  const canDeleteOwnItem = !isPlanItem
    && location.item.createdByUserId === state.currentUserId;
  const canDeleteItem = isAdmin() || canDeleteOwnItem;
  if (!requirePermission(canDeleteItem, "You can delete only items you created. Other deletes are admin-only.")) return;
  const confirmed = await showAppConfirm(`Permanently delete "${location.item.title || "this item"}"?`, "Delete Item", {
    eyebrow: "Permanent Delete",
    confirmLabel: "Yes",
    cancelLabel: "No",
    tone: "warning",
  });
  if (!confirmed) return;
  location.container.splice(location.container.findIndex((item) => item.id === itemId), 1);
  if (expandedTaskId === itemId) expandedTaskId = "";
  logAudit("Item Permanently Deleted", { objectType: location.item.type, objectName: location.item.title, projectId: getCurrentProject()?.id || "" });
  persist();
  render();
}

function applyProjectSurface(color) {
  const theme = buildProjectTheme(color);
  document.documentElement.style.setProperty("--project-nav-surface", theme.surface);
  document.documentElement.style.setProperty("--project-nav-soft", theme.soft);
  document.documentElement.style.setProperty("--project-nav-frame", theme.frame);
  document.documentElement.style.setProperty("--project-nav-card", theme.card);
  document.documentElement.style.setProperty("--project-nav-card-strong", theme.cardStrong);
  document.documentElement.style.setProperty("--project-setup-surface", theme.surface);
  document.documentElement.style.setProperty("--project-setup-soft", theme.soft);
  document.documentElement.style.setProperty("--project-setup-frame", theme.frame);
  document.documentElement.style.setProperty("--project-setup-card", theme.cardStrong);
  document.documentElement.style.setProperty("--project-panel-soft", theme.soft);
  document.documentElement.style.setProperty("--project-panel-frame", theme.panelBorder);
  document.documentElement.style.setProperty("--project-panel-shadow", theme.panelShadow);
  document.documentElement.style.setProperty("--project-panel-glow", theme.panelGlow);
  document.documentElement.style.setProperty("--project-panel-inset", theme.panelInset);
  document.documentElement.style.setProperty("--project-nested-soft", theme.nestedSoft);
  document.documentElement.style.setProperty("--project-nested-shadow", theme.nestedShadow);
}

function normalizeHexColor(color) {
  return (color || "#fffaf2").trim().toLowerCase();
}

function syncProjectColorPaletteSelection(color) {
  const normalized = normalizeHexColor(color);
  els.projectColorPalette?.querySelectorAll(".project-color-swatch").forEach((button) => {
    button.classList.toggle("active", normalizeHexColor(button.dataset.color) === normalized);
  });
}

function setProjectSurfaceColor(color) {
  const nextColor = normalizeHexColor(color);
  if (els.projectSurfaceColor && els.projectSurfaceColor.value.toLowerCase() !== nextColor) {
    els.projectSurfaceColor.value = nextColor;
  }
  applyProjectSurface(nextColor);
  syncProjectColorPaletteSelection(nextColor);
}

function renderProjectColorPalette() {
  if (!els.projectColorPalette) return;
  els.projectColorPalette.innerHTML = "";
  for (const preset of PROJECT_SURFACE_PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-color-swatch";
    button.dataset.color = preset.color;
    button.title = preset.name;
    button.setAttribute("aria-label", preset.name);
    button.style.setProperty("--swatch-color", preset.color);
    button.addEventListener("click", () => {
      if (button.disabled) return;
      setProjectSurfaceColor(preset.color);
    });
    els.projectColorPalette.append(button);
  }
  syncProjectColorPaletteSelection(els.projectSurfaceColor?.value || "#fffaf2");
}

function syncServiceTeamColorPaletteSelection(color) {
  const normalized = normalizeHexColor(color);
  els.serviceTeamColorPalette?.querySelectorAll(".service-team-color-swatch").forEach((button) => {
    button.classList.toggle("active", normalizeHexColor(button.dataset.color) === normalized);
  });
}

function setServiceTeamColor(color) {
  const nextColor = normalizeHexColor(color || SERVICE_TEAM_COLOR_PRESETS[0]?.color || "#0d7a73");
  if (els.serviceTeamColor && normalizeHexColor(els.serviceTeamColor.value || nextColor) !== nextColor) {
    els.serviceTeamColor.value = nextColor;
  }
  syncServiceTeamColorPaletteSelection(nextColor);
  syncServiceTeamDialogAssetTheme(nextColor);
}

function renderServiceTeamColorPalette() {
  if (!els.serviceTeamColorPalette) return;
  els.serviceTeamColorPalette.innerHTML = "";
  for (const preset of SERVICE_TEAM_COLOR_PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-color-swatch service-team-color-swatch";
    button.dataset.color = preset.color;
    button.title = preset.name;
    button.setAttribute("aria-label", preset.name);
    button.style.setProperty("--swatch-color", preset.color);
    button.addEventListener("click", () => setServiceTeamColor(preset.color));
    els.serviceTeamColorPalette.append(button);
  }
  setServiceTeamColor(els.serviceTeamColor?.value || SERVICE_TEAM_COLOR_PRESETS[0]?.color || "#0d7a73");
}

function normalizeAreaIconKey(iconKey) {
  const normalized = String(iconKey || "none").trim().toLowerCase();
  return AREA_ICON_PRESETS.some((entry) => entry.key === normalized) ? normalized : "none";
}

function syncAreaIconPaletteSelection(iconKey) {
  const normalized = normalizeAreaIconKey(iconKey);
  els.areaIconPalette?.querySelectorAll(".area-icon-option").forEach((button) => {
    button.classList.toggle("active", button.dataset.iconKey === normalized);
  });
}

function setAreaIcon(iconKey) {
  const normalized = normalizeAreaIconKey(iconKey);
  if (els.areaIcon && els.areaIcon.value !== normalized) {
    els.areaIcon.value = normalized;
  }
  syncAreaIconPaletteSelection(normalized);
}

function getAreaIconSvg(iconKey) {
  const normalized = normalizeAreaIconKey(iconKey);
  if (normalized === "bathroom") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z"/>
        <path d="M7 12V8a2 2 0 0 1 2-2"/>
        <path d="M9 6a1.5 1.5 0 1 0-3 0v6"/>
        <path d="M8 19v2"/>
        <path d="M16 19v2"/>
      </svg>
    `;
  }
  if (normalized === "kitchen") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 10h14v4a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5v-4Z"/>
        <path d="M9 8V6h6v2"/>
        <path d="M3 10h18"/>
        <path d="M20 11.5h1"/>
      </svg>
    `;
  }
  if (normalized === "bedroom") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h16v6H4z"/><path d="M6 12V9h5v3"/><path d="M13 12V10h5v2"/><path d="M4 18v2"/><path d="M20 18v2"/></svg>`;
  }
  if (normalized === "livingroom") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h16v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M7 12V9h10v3"/><path d="M8 19v2"/><path d="M16 19v2"/></svg>`;
  }
  if (normalized === "balcony") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 8h18"/><path d="M5 8v11"/><path d="M9 8v11"/><path d="M13 8v11"/><path d="M17 8v11"/><path d="M3 19h18"/></svg>`;
  }
  if (normalized === "stairs") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 18h4v-4h4v-4h4V6h4"/></svg>`;
  }
  if (normalized === "door") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 4h10v16H6z"/><path d="M12 12h.01"/></svg>`;
  }
  if (normalized === "window") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 4v16"/><path d="M4 12h16"/></svg>`;
  }
  if (normalized === "garage") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M8 20v-6h8v6"/></svg>`;
  }
  if (normalized === "roof") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3 12 9-8 9 8"/><path d="M6 11v9h12v-9"/></svg>`;
  }
  if (normalized === "electrical") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13 2 6 13h5l-1 9 8-12h-5z"/></svg>`;
  }
  if (normalized === "plumbing") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 5v6a3 3 0 0 0 3 3h4"/><path d="M14 14v5"/><path d="M10 5h4"/><path d="M13 19h2"/></svg>`;
  }
  if (normalized === "heating") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 7h12v10H6z"/><path d="M9 9v6"/><path d="M12 9v6"/><path d="M15 9v6"/></svg>`;
  }
  if (normalized === "painting") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 8h11l3 3v5H7l-3-3z"/><path d="M18 11h2"/><path d="M6 16v4"/></svg>`;
  }
  if (normalized === "flooring") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16v12H4z"/><path d="M4 10h16"/><path d="M4 14h16"/><path d="M10 6v12"/><path d="M14 6v12"/></svg>`;
  }
  if (normalized === "storage") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16v12H4z"/><path d="M4 11h16"/><path d="M9 7v12"/><path d="M15 7v12"/></svg>`;
  }
  if (normalized === "outside") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 17h16"/><path d="M6 17V9l6-4 6 4v8"/><path d="M12 5v12"/></svg>`;
  }
  if (normalized === "office") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>`;
  }
  if (normalized === "laundry") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="4" width="14" height="16" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 7h.01"/><path d="M11 7h.01"/></svg>`;
  }
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="6"/>
    </svg>
  `;
}

function buildAreaIconMarkup(iconKey, label = "") {
  const normalized = normalizeAreaIconKey(iconKey);
  if (normalized === "none") return "";
  return `<span class="area-icon-badge" aria-label="${escapeHtml(label || normalized)}">${getAreaIconSvg(normalized)}</span>`;
}

function renderAreaTitleMarkup(area) {
  const floorSuffix = normalizeFloorName(area?.floor) ? ` - ${normalizeFloorName(area.floor)}` : "";
  return `
    <span class="area-title-row">
      ${buildAreaIconMarkup(area.iconKey, area.name)}
      <span>${escapeHtml(`${area.name || "Area"}${floorSuffix}`)}</span>
      ${area.completedAt ? '<span class="area-complete-inline-tick" aria-label="Completed">&#10003;</span>' : ""}
    </span>
  `;
}

function renderAreaIconPalette() {
  if (!els.areaIconPalette) return;
  els.areaIconPalette.innerHTML = "";
  for (const preset of AREA_ICON_PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "area-icon-option";
    button.dataset.iconKey = preset.key;
    button.setAttribute("aria-label", preset.label);
    button.innerHTML = `
      <span class="area-icon-option-visual${preset.key === "none" ? " is-none" : ""}">
        ${preset.key === "none" ? '<span class="area-icon-option-none">No icon</span>' : getAreaIconSvg(preset.key)}
      </span>
      <span class="area-icon-option-label">${escapeHtml(preset.label)}</span>
    `;
    button.addEventListener("click", () => setAreaIcon(preset.key));
    els.areaIconPalette.append(button);
  }
  setAreaIcon(els.areaIcon?.value || "none");
}

function normalizeEquipmentIconKey(iconKey) {
  const normalized = String(iconKey || "none").trim().toLowerCase();
  return EQUIPMENT_ICON_PRESETS.some((entry) => entry.key === normalized) ? normalized : "none";
}

function syncEquipmentIconPaletteSelection(iconKey) {
  const normalized = normalizeEquipmentIconKey(iconKey);
  els.equipmentIconPalette?.querySelectorAll(".equipment-icon-option").forEach((button) => {
    button.classList.toggle("active", button.dataset.iconKey === normalized);
  });
}

function setEquipmentIcon(iconKey) {
  const normalized = normalizeEquipmentIconKey(iconKey);
  if (els.equipmentIcon && els.equipmentIcon.value !== normalized) {
    els.equipmentIcon.value = normalized;
  }
  syncEquipmentIconPaletteSelection(normalized);
}

function getEquipmentIconSvg(iconKey) {
  const normalized = normalizeEquipmentIconKey(iconKey);
  if (normalized === "toolbox") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 9h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z"/>
        <path d="M9 9V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
        <path d="M4 13h16"/>
      </svg>
    `;
  }
  if (normalized === "wrench") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M14 6a4 4 0 0 0 4.5 5.6l-7.9 7.9a2 2 0 1 1-2.8-2.8l7.9-7.9A4 4 0 0 0 14 6Z"/>
        <path d="M14 6l4 4"/>
      </svg>
    `;
  }
  if (normalized === "drill") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 10h9a4 4 0 0 1 4 4v1H8a4 4 0 0 1-4-4v-1Z"/>
        <path d="M17 11h3l1 1-1 1h-3"/>
        <path d="M10 15v4"/>
        <path d="M8 19h4"/>
      </svg>
    `;
  }
  if (normalized === "helmet") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 14a7 7 0 0 1 14 0"/>
        <path d="M4 14h16"/>
        <path d="M8 14v2"/>
        <path d="M16 14v2"/>
      </svg>
    `;
  }
  if (normalized === "measure") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="4" y="7" width="16" height="10" rx="2"/>
        <path d="M8 10v4"/>
        <path d="M11 10v2"/>
        <path d="M14 10v4"/>
        <path d="M17 10v2"/>
      </svg>
    `;
  }
  if (normalized === "ladder") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M8 5 6 19"/>
        <path d="M16 5l2 14"/>
        <path d="M9 8h6"/>
        <path d="M8.5 12h7"/>
        <path d="M8 16h8"/>
      </svg>
    `;
  }
  if (normalized === "vehicle") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 12h13l3 3v3H4v-6Z"/>
        <path d="M7 18a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/>
        <path d="M17 18a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/>
        <path d="M14 12V9h3l3 3"/>
      </svg>
    `;
  }
  if (normalized === "machine") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="4" y="8" width="11" height="8" rx="2"/>
        <path d="M15 10h3l2 2v2h-5"/>
        <path d="M7 16v2"/>
        <path d="M12 16v2"/>
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="6"/>
    </svg>
  `;
}

function buildEquipmentIconMarkup(iconKey, label = "", extraClass = "") {
  const normalized = normalizeEquipmentIconKey(iconKey);
  if (normalized === "none") return "";
  const classes = ["equipment-icon-badge", extraClass].filter(Boolean).join(" ");
  return `<span class="${classes}" aria-label="${escapeHtml(label || normalized)}">${getEquipmentIconSvg(normalized)}</span>`;
}

function renderEquipmentIconPalette() {
  if (!els.equipmentIconPalette) return;
  els.equipmentIconPalette.innerHTML = "";
  for (const preset of EQUIPMENT_ICON_PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "equipment-icon-option";
    button.dataset.iconKey = preset.key;
    button.setAttribute("aria-label", preset.label);
    button.innerHTML = `
      <span class="equipment-icon-option-visual${preset.key === "none" ? " is-none" : ""}">
        ${preset.key === "none" ? '<span class="equipment-icon-option-none">No icon</span>' : getEquipmentIconSvg(preset.key)}
      </span>
      <span class="equipment-icon-option-label">${escapeHtml(preset.label)}</span>
    `;
    button.addEventListener("click", () => setEquipmentIcon(preset.key));
    els.equipmentIconPalette.append(button);
  }
  setEquipmentIcon(els.equipmentIcon?.value || "none");
}

function buildProjectTheme(color) {
  const rgb = hexToRgb(color || "#fffaf2");
  return {
    surface: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.34)`,
    soft: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.72)`,
    frame: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.92)`,
    card: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
    cardStrong: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
    panelGlow: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`,
    panelBorder: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`,
    panelShadow: `0 16px 34px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`,
    panelInset: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`,
    nestedSoft: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
    nestedShadow: `0 10px 22px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
  };
}

function buildTabTheme(color) {
  const rgb = hexToRgb(color || "#dff4f2");
  return {
    soft: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.42)`,
    muted: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`,
    active: `linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.52) 100%)`,
    border: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.72)`,
    shadow: `0 8px 18px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`,
    badge: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.34)`,
  };
}

function buildTeamPillMarkup(team, prefix = "Team", options = {}) {
  if (!team) return "";
  const theme = buildTabTheme(team.tabColor || pickNextFolderColor(getCurrentProject()));
  const disconnectButton = options.disconnectAction
    ? `<button type="button" class="connection-remove-btn" data-disconnect-action="${escapeHtml(options.disconnectAction)}" data-team-id="${escapeHtml(options.teamId || team.id)}"${options.areaId ? ` data-area-id="${escapeHtml(options.areaId)}"` : ""}${options.itemId ? ` data-item-id="${escapeHtml(options.itemId)}"` : ""} aria-label="Disconnect ${escapeHtml(team.name)}">&times;</button>`
    : "";
  return `<span class="meta-pill team-color-pill connection-pill" style="--team-pill-bg:${theme.muted}; --team-pill-border:${theme.border}; --team-pill-shadow:${theme.shadow}; --team-pill-text:${team.tabColor || "#0d7a73"};">${escapeHtml(prefix)}: ${escapeHtml(team.name)}${disconnectButton}</span>`;
}

function buildAreaConnectionPillMarkup(area, options = {}) {
  if (!area) return "";
  const disconnectButton = options.disconnectAction
    ? `<button type="button" class="connection-remove-btn" data-disconnect-action="${escapeHtml(options.disconnectAction)}" data-area-id="${escapeHtml(options.areaId || area.id)}"${options.teamId ? ` data-team-id="${escapeHtml(options.teamId)}"` : ""} aria-label="Disconnect ${escapeHtml(area.name)}">&times;</button>`
    : "";
  return `<span class="meta-pill connection-pill">Area: ${escapeHtml(area.name)}${disconnectButton}</span>`;
}

function buildPhotoConnectionPillMarkup(photo, options = {}) {
  if (!photo) return "";
  const disconnectButton = options.disconnectAction
    ? `<button type="button" class="connection-remove-btn" data-disconnect-action="${escapeHtml(options.disconnectAction)}" data-photo-id="${escapeHtml(options.photoId || photo.id)}"${options.itemId ? ` data-item-id="${escapeHtml(options.itemId)}"` : ""} aria-label="Disconnect ${escapeHtml(photo.title)}">&times;</button>`
    : "";
  return `<span class="meta-pill connection-pill">Photo: ${escapeHtml(photo.title)}${disconnectButton}</span>`;
}

function bindConnectionActionButtons(scope) {
  if (!scope) return;
  for (const button of scope.querySelectorAll("[data-disconnect-action]")) {
    if (button.dataset.boundDisconnect === "true") continue;
    button.dataset.boundDisconnect = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const action = button.dataset.disconnectAction || "";
      if (action === "area-team") {
        disconnectServiceTeamFromArea(button.dataset.teamId || "", button.dataset.areaId || "");
        return;
      }
      if (action === "item-team") {
        disconnectServiceTeamFromItem(button.dataset.teamId || "", button.dataset.itemId || "");
        return;
      }
      if (action === "item-photo") {
        disconnectPhotoFromItem(button.dataset.photoId || "", button.dataset.itemId || "");
      }
    });
  }
}

function getActiveWorkspaceTabColor(project = getCurrentProject()) {
  if (!project) return PRIMARY_TAB_COLORS["folders-hub"];
  if (currentWorkspaceTab === "folders-hub") {
    const detailsTone = {
      plan: CONTENT_TAB_COLORS.note,
      areas: CONTENT_TAB_COLORS.file,
      tasks: CONTENT_TAB_COLORS.task,
      teams: CONTENT_TAB_COLORS.photo,
      chat: CONTENT_TAB_COLORS.chat,
    };
    return detailsTone[currentProjectDetailsTab] || PRIMARY_TAB_COLORS["folders-hub"];
  }
  if (currentWorkspaceTab === "open-tasks") return PRIMARY_TAB_COLORS["open-tasks"];
  const activeFolder = project.folders.find((folder) => `folder:${folder.id}` === currentWorkspaceTab);
  return activeFolder?.tabColor || FOLDER_TAB_PALETTE[0];
}

function applyTabTheme(element, theme, prefix) {
  if (!element || !theme) return;
  element.style.setProperty(`--${prefix}-bg`, theme.muted);
  element.style.setProperty(`--${prefix}-active-bg`, theme.active);
  element.style.setProperty(`--${prefix}-border`, theme.border);
  element.style.setProperty(`--${prefix}-shadow`, theme.shadow);
}

function applyActiveWorkspaceTheme(project = getCurrentProject()) {
  const theme = buildTabTheme(getActiveWorkspaceTabColor(project));
  els.folderDetail?.style.setProperty("--active-tab-soft", theme.soft);
  els.folderDetail?.style.setProperty("--active-tab-border", theme.border);
  els.folderDetail?.style.setProperty("--active-tab-shadow", theme.shadow);
}

function applyCardTheme(card, project = getCurrentProject()) {
  if (!card) return;
  const theme = buildTabTheme(getActiveWorkspaceTabColor(project));
  card.style.setProperty("--card-soft", theme.soft);
  card.style.setProperty("--card-border", theme.border);
  card.style.setProperty("--card-shadow", theme.shadow);
}

function applyItemBadgeTheme(wrapper) {
  const activeKey = currentWorkspaceTab === "folders-hub"
    ? ({ plan: "note", areas: "file", tasks: "task", teams: "photo", chat: "chat" }[currentProjectDetailsTab] || "note")
    : currentContentTab;
  const theme = buildTabTheme(CONTENT_TAB_COLORS[activeKey] || CONTENT_TAB_COLORS.note);
  wrapper.style.setProperty("--item-badge-bg", theme.badge);
  wrapper.style.setProperty("--item-badge-border", theme.border);
}

function hexToRgb(hex) {
  const clean = (hex || "#fffaf2").replace("#", "");
  const normalized = clean.length === 3
    ? clean.split("").map((char) => char + char).join("")
    : clean.padEnd(6, "0");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function formatClientName(client) {
  return [client.name, client.surname].filter(Boolean).join(" ") || client.company || "Unnamed client";
}

function formatDateDisplay(value) {
  if (!value) return "-";
  return value;
}

function createClientPreviewState() {
  const now = new Date().toISOString();
  const admin = createSystemUser({
    id: "demo-user-admin",
    personalNumber: "001",
    name: "Alexandros",
    surname: "Roupas",
    tel: "12345",
    email: "admin@local.app",
    role: "admin",
    qualification: 3,
    workmode: "office",
    mustChangePin: false,
    createdAt: now,
  });
  const plumber = createSystemUser({
    id: "demo-user-plumber",
    personalNumber: "002",
    name: "Fotis",
    surname: "Pitsinis",
    tel: "456789",
    email: "fotis@example.com",
    role: "user",
    qualification: 2,
    workmode: "operator",
    mustChangePin: false,
    createdAt: now,
  });
  const electrician = createSystemUser({
    id: "demo-user-electric",
    personalNumber: "003",
    name: "Nikos",
    surname: "Mastoropoulos",
    tel: "89987898",
    email: "nikos@example.com",
    role: "user",
    qualification: 3,
    workmode: "operator",
    mustChangePin: false,
    createdAt: now,
  });

  const client = {
    id: "demo-client-1",
    name: "Giannis",
    surname: "Ioannou",
    company: "Ioannou Construction",
    uidNumber: "123456",
    address: "Athens, Demo Street 12",
    email: "client@example.com",
    tel: "456789",
    responsiblePersons: [],
    archivedAt: null,
    archivedByUserId: null,
  };

  const project = createBlankProject();
  Object.assign(project, {
    id: "demo-project-1",
    projectNumber: "0001",
    name: "Bathroom renovation",
    projectManagerUserId: admin.id,
    startDate: todayInputValue(),
    clientId: client.id,
    surfaceColor: "#f8dce3",
    memberIds: [admin.id, plumber.id, electrician.id],
    selectedTeamFiltersInitialized: true,
    selectedTeamFilterIds: ["demo-team-plumbers", "demo-team-electric"],
    floors: ["1st floor", "Ground floor"],
    createdAt: now,
  });

  const detailsFolder = createBuiltInFolder("Project Details", PRIMARY_TAB_COLORS["folders-hub"]);
  detailsFolder.id = "demo-project-details";
  detailsFolder.items = [
    {
      id: "demo-plan-file",
      type: "file",
      title: "Contract_20260605",
      mimeType: "application/pdf",
      createdAt: now,
      createdByUserId: admin.id,
      archivedAt: null,
      archivedByUserId: null,
      showOriginalName: false,
    },
    {
      id: "demo-plan-note",
      type: "note",
      title: "Note from chat: inspection",
      text: "Please upload photos before closing the wall.",
      createdAt: now,
      createdByUserId: admin.id,
      showOnMasterPlan: true,
      archivedAt: null,
      archivedByUserId: null,
      showOriginalName: false,
    },
  ];
  project.detailsFolder = detailsFolder;

  project.folders = [
    {
      id: "demo-team-plumbers",
      name: "Plumbers",
      createdAt: now,
      items: [],
      tabColor: "#c33272",
      archivedAt: null,
      archivedByUserId: null,
      memberIds: [plumber.id],
    },
    {
      id: "demo-team-electric",
      name: "Electricians",
      createdAt: now,
      items: [],
      tabColor: "#d96b1f",
      archivedAt: null,
      archivedByUserId: null,
      memberIds: [electrician.id],
    },
  ];

  project.areas = [
    {
      id: "demo-area-bath",
      name: "Bathroom",
      floor: "1st floor",
      iconKey: "bath",
      teamIds: ["demo-team-plumbers"],
      createdAt: now,
      archivedAt: null,
      archivedByUserId: null,
      completedAt: null,
      completedByUserId: null,
      items: [
        {
          id: "demo-area-note",
          type: "note",
          title: "Pipes are ready",
          text: "Bathroom pipes are ready for inspection.",
          createdAt: now,
          createdByUserId: plumber.id,
          teamId: "demo-team-plumbers",
          showOnMasterPlan: false,
          archivedAt: null,
          archivedByUserId: null,
          showOriginalName: false,
        },
      ],
    },
    {
      id: "demo-area-kitchen",
      name: "Kitchen",
      floor: "Ground floor",
      iconKey: "kitchen",
      teamIds: ["demo-team-electric"],
      createdAt: now,
      archivedAt: null,
      archivedByUserId: null,
      completedAt: null,
      completedByUserId: null,
      items: [],
    },
  ];

  project.chatMessages = [
    {
      id: "demo-chat-1",
      channelId: "project:general",
      text: "Please upload photos before closing the wall.",
      createdAt: now,
      createdByUserId: admin.id,
      importantAt: now,
      importantByUserId: admin.id,
      importantNoteId: "demo-plan-note",
      attachments: [],
    },
  ];

  return {
    ...structuredClone(initialState),
    clients: [client],
    users: [admin, plumber, electrician],
    currentUserId: admin.id,
    selectedProjectId: project.id,
    projects: [project],
    equipmentCategories: DEFAULT_EQUIPMENT_CATEGORY_NAMES.map((name, index) => createEquipmentCategory({ id: `demo-equipment-category-${index + 1}`, name, createdAt: now })),
    equipmentItems: [
      createEquipmentItem({ id: "demo-equipment-1", name: "Pipe cutter", categoryId: "demo-equipment-category-2", iconKey: "plumbing", createdAt: now, createdByUserId: admin.id }),
      createEquipmentItem({ id: "demo-equipment-2", name: "Voltage tester", categoryId: "demo-equipment-category-1", iconKey: "electrical", createdAt: now, createdByUserId: admin.id }),
    ],
    plannerAssignments: [
      {
        id: "demo-planner-1",
        projectId: project.id,
        startDate: todayInputValue(),
        endDate: todayInputValue(),
        teamIds: ["demo-team-plumbers"],
        createdAt: now,
      },
    ],
    dailyWorks: [
      {
        id: "demo-daily-1",
        title: "Small repair visit",
        date: todayInputValue(),
        startTime: "09:00",
        endTime: "11:00",
        memberIds: [plumber.id],
        client: "Ioannou Construction",
        address: "Athens, Demo Street 12",
        notes: "Check sink connection.",
        status: "planned",
        createdAt: now,
        createdByUserId: admin.id,
      },
    ],
    auditLog: [
      { id: "demo-audit-1", action: "Client Demo Loaded", createdAt: now, userId: admin.id, details: { objectType: "demo" } },
    ],
  };
}

function persist() {
  const persistedState = structuredClone(state);
  persistedState.projects = (persistedState.projects || []).filter((project) => !project.isDraft);
  if (!persistedState.projects.some((project) => project.id === persistedState.selectedProjectId)) {
    persistedState.selectedProjectId = ensureAccessibleSelectedProject(persistedState);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
}

function loadState() {
  try {
    const wantsClientDemo = new URLSearchParams(window.location.search).get("demo") === "client";
    const rawV3 = localStorage.getItem(STORAGE_KEY);
    if (rawV3) {
      const parsed = { ...structuredClone(initialState), ...JSON.parse(rawV3) };
      if (wantsClientDemo && !(parsed.projects || []).length) return createClientPreviewState();
      return parsed;
    }
    if (wantsClientDemo) return createClientPreviewState();
    const rawV2 = localStorage.getItem("project-manager-web-state-v2");
    if (rawV2) {
      const old = JSON.parse(rawV2);
      return {
        clients: [],
        projects: (old.projects || []).map((project) => ({ ...createBlankProject(), ...project, startDate: project.startDate || todayInputValue(), endDate: project.endDate || "", lifecycle: project.lifecycle || "active", clientId: project.clientId || "", surfaceColor: project.surfaceColor || "#fffaf2" })),
        selectedProjectId: old.selectedProjectId || old.projects?.[0]?.id || null,
      };
    }
    const rawV1 = localStorage.getItem("project-manager-web-state-v1");
    if (!rawV1) return structuredClone(initialState);
    const oldState = JSON.parse(rawV1);
    const migrated = createBlankProject();
    migrated.name = oldState.project?.name || "";
    migrated.managerName = oldState.project?.managerName || "";
    migrated.managerEmail = oldState.project?.managerEmail || "";
    migrated.members = oldState.members || [];
    migrated.folders = oldState.folders || [];
    migrated.selectedFolderId = oldState.selectedFolderId || migrated.folders[0]?.id || null;
    return { clients: [], projects: [migrated], selectedProjectId: migrated.id };
  } catch (error) {
    return structuredClone(initialState);
  }
}

function formatDateStamp(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("");
}

function createSequencedName(baseName, index, dateStamp) {
  if (index === 0) return `${baseName}_${dateStamp}`;
  return `${baseName}${index + 1}_${dateStamp}`;
}

function getDefaultAssetBaseName(file, type) {
  const isImage = String(file?.type || "").toLowerCase().startsWith("image/");
  if (type === "photo" || isImage) return "Foto";
  return "File";
}

async function toStoredAsset(file, type, baseName, index, dateStamp) {
  const dataUrl = await readAsDataUrl(file);
  const normalizedName = createSequencedName(baseName, index, dateStamp);
  if (type === "photo") {
    return { id: crypto.randomUUID(), type: "photo", title: normalizedName, previewUrl: dataUrl, mimeType: file.type, originalName: file.name, createdAt: new Date().toISOString(), createdByUserId: state.currentUserId, source: "upload", archivedAt: null, archivedByUserId: null, showOriginalName: false };
  }
  return { id: crypto.randomUUID(), type: "file", title: normalizedName, objectUrl: dataUrl, mimeType: file.type, originalName: file.name, createdAt: new Date().toISOString(), createdByUserId: state.currentUserId, archivedAt: null, archivedByUserId: null, showOriginalName: false };
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function sanitizeName(value) {
  return value.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "") || "Item";
}

const SPEECH_SUMMARY_STOPWORDS = new Set([
  "και",
  "να",
  "θα",
  "στο",
  "στη",
  "στην",
  "στον",
  "του",
  "της",
  "των",
  "τον",
  "την",
  "το",
  "τα",
  "με",
  "σε",
  "για",
  "απο",
  "από",
  "πως",
  "οτι",
  "ότι",
  "που",
  "μια",
  "ενα",
  "ένα",
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
]);

function escapeRegExp(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSpeechMagicPhrase() {
  return els.speechBtn?.dataset.readyPhrase || "Ready over";
}

function normalizeSpeechValue(value) {
  return String(value ?? "")
    .toLocaleLowerCase("el-GR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ς/g, "σ");
}

function normalizeSpeechCommandValue(value) {
  return normalizeSpeechValue(value)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSpeechReadyPhraseVariants() {
  return [
    normalizeSpeechCommandValue(getSpeechMagicPhrase()),
    "ready over",
    "readyover",
    "ρεντι οβερ",
    "ρεντιοβερ",
    "ρεντυ οβερ",
    "ρεντυοβερ",
    "ρεντη οβερ",
    "ρεντηοβερ",
  ].filter(Boolean);
}

function containsSpeechReadyPhrase(value) {
  const normalized = normalizeSpeechCommandValue(value);
  if (!normalized) return false;
  const collapsed = normalized.replace(/\s+/g, "");
  return getSpeechReadyPhraseVariants().some((variant) => {
    const normalizedVariant = normalizeSpeechCommandValue(variant);
    if (!normalizedVariant) return false;
    return normalized.includes(normalizedVariant) || collapsed.includes(normalizedVariant.replace(/\s+/g, ""));
  });
}

function stripSpeechReadyPhrase(value) {
  let cleaned = String(value ?? "");
  const patterns = [
    /\bready\s*over\b/giu,
    /\breadyover\b/giu,
    /(ρ[εέ]ντ[ιίηήυύ])\s*([οό]βερ|over)\b/giu,
  ];
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, " ");
  }
  return cleaned
    .replace(/\s{2,}/g, " ")
    .replace(/\s([,.;:!?])/g, "$1")
    .replace(/^[,.;:\s-]+|[,.;:\s-]+$/g, "")
    .trim();
}

function getSpeechButtonLabel(state = "idle") {
  const button = els.speechBtn;
  if (!button) {
    return state === "listening" ? "Listening..." : "Start listening";
  }
  return state === "listening"
    ? button.dataset.listeningLabel || "Listening..."
    : button.dataset.idleLabel || "Start listening";
}

function setSpeechButtonState(isListening) {
  if (!els.speechBtn) return;
  els.speechBtn.textContent = getSpeechButtonLabel(isListening ? "listening" : "idle");
}

function setSpeechAssistState(state = "idle") {
  const phrase = getSpeechMagicPhrase();
  if (els.speechAssistBox) {
    els.speechAssistBox.classList.toggle("speech-box-listening", state === "listening");
    els.speechAssistBox.classList.toggle("speech-box-ready", state === "ready");
    els.speechAssistBox.classList.toggle("speech-box-missing", state === "missing");
  }
  if (els.speechStatus) {
    const labels = {
      idle: `Magic word: "${phrase}". Say it when your speech is ready.`,
      listening: `Listening now. Finish with "${phrase}".`,
      ready: `"${phrase}" detected. Your speech is ready.`,
      missing: `Speech stopped before "${phrase}". Please say the magic word at the end.`,
    };
    els.speechStatus.textContent = labels[state] || labels.idle;
  }
  if (els.parseSpeechBtn) {
    const hasTranscript = Boolean((els.speechTranscript?.value || "").trim());
    els.parseSpeechBtn.disabled = !(state === "ready" && hasTranscript);
  }
}

function buildRecognitionTranscript(results) {
  const finalParts = [];
  const interimParts = [];
  for (const result of Array.from(results || [])) {
    const transcript = result?.[0]?.transcript?.trim();
    if (!transcript) continue;
    if (result.isFinal) finalParts.push(transcript);
    else interimParts.push(transcript);
  }
  return [...finalParts, ...interimParts].join(" ").trim();
}

function renderSpeechSummary(items = []) {
  currentSpeechSummaryItems = (items || []).filter(Boolean);
  if (!els.speechSummaryList || !els.speechSummaryShell) return;
  els.speechSummaryList.innerHTML = currentSpeechSummaryItems
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  els.speechSummaryShell.classList.toggle("hidden", !currentSpeechSummaryItems.length);
}

function formatSpeechSummaryForNotes(items = currentSpeechSummaryItems) {
  const lines = (items || []).filter(Boolean);
  if (!lines.length) return "";
  return lines.map((line) => `- ${line}`).join("\n");
}

function mergeSpeechSummaryIntoTaskNotes(items = currentSpeechSummaryItems) {
  if (!els.taskNotes) return false;
  const summaryText = formatSpeechSummaryForNotes(items);
  if (!summaryText) return false;
  const currentNotes = els.taskNotes.value.trim();
  if (currentNotes.includes(summaryText)) return false;
  els.taskNotes.value = currentNotes ? `${currentNotes}\n\n${summaryText}` : summaryText;
  return true;
}

function resetSpeechAssist() {
  if (recognition) {
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.stop();
    recognition = null;
  }
  currentSpeechTranscriptBuffer = "";
  speechHasMagicReadyPhrase = false;
  if (els.speechTranscript) els.speechTranscript.value = "";
  renderSpeechSummary([]);
  setSpeechButtonState(false);
  setSpeechAssistState("idle");
}

function splitSpeechTranscriptIntoSegments(transcript) {
  const normalizedText = String(transcript ?? "")
    .replace(/\r/g, " ")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalizedText) return [];

  const sentenceSegments = normalizedText
    .split(/(?<=[.!?;])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (sentenceSegments.length > 1) return sentenceSegments;
  if (normalizedText.length < 120) return sentenceSegments;

  const clauseSegments = normalizedText
    .split(/\s*,\s*|\s+(?:και|κι|μετα|μετά|επισης|επίσης|υστερα|ύστερα|ομως|όμως|αλλα|αλλά)\s+/iu)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 12);

  return clauseSegments.length ? clauseSegments : sentenceSegments;
}

function cleanSpeechSummarySegment(segment) {
  let cleaned = String(segment ?? "")
    .replace(/^[\s,.;:!?\-]+|[\s,.;:!?\-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  cleaned = cleaned.replace(
    /^(λοιπον|λοιπόν|ενταξει|εντάξει|βασικα|βασικά|δηλαδη|δηλαδή|ξερεις|ξέρεις|οποτε|οπότε)\b[\s,:-]*/iu,
    ""
  ).trim();

  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function tokenizeSpeechSummarySegment(segment) {
  return normalizeSpeechValue(segment)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token && !SPEECH_SUMMARY_STOPWORDS.has(token) && token.length > 2);
}

function buildSpeechSummary(transcript, maxItems = 4) {
  const cleanedSegments = [];
  const seenSegments = new Set();

  for (const segment of splitSpeechTranscriptIntoSegments(transcript)) {
    const cleaned = cleanSpeechSummarySegment(segment);
    if (!cleaned) continue;
    const normalized = normalizeSpeechValue(cleaned);
    if (seenSegments.has(normalized)) continue;
    seenSegments.add(normalized);
    cleanedSegments.push(cleaned);
  }

  if (!cleanedSegments.length) return [];
  if (cleanedSegments.length <= maxItems && cleanedSegments.join(" ").length < 260) {
    return cleanedSegments;
  }

  const tokenScores = new Map();
  for (const segment of cleanedSegments) {
    for (const token of tokenizeSpeechSummarySegment(segment)) {
      tokenScores.set(token, (tokenScores.get(token) || 0) + 1);
    }
  }

  return cleanedSegments
    .map((segment, index) => {
      const tokens = tokenizeSpeechSummarySegment(segment);
      let score = tokens.reduce((sum, token) => sum + (tokenScores.get(token) || 0), 0);
      if (tokens.length >= 5 && tokens.length <= 18) score += 2;
      if (/(πρεπει|πρέπει|χρειαζεται|χρειάζεται|σημαντικο|σημαντικό|αποφασιστηκε|αποφασίστηκε|προτεινε|πρότεινε|θα|να)/iu.test(segment)) {
        score += 1.5;
      }
      return { index, segment, score };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.min(maxItems, cleanedSegments.length))
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.segment);
}

function parseSpeechTranscript(transcript) {
  const project = getCurrentProject();
  const normalized = normalizeSpeechValue(transcript);
  const result = { title: transcript, assigneeId: "", dueDate: "" };
  for (const member of buildAssignableMembers(project)) {
    const memberPattern = new RegExp(escapeRegExp(member.name), "i");
    if (memberPattern.test(transcript) || normalized.includes(normalizeSpeechValue(member.name))) {
      result.assigneeId = member.id;
      result.title = result.title.replace(memberPattern, "").trim();
      break;
    }
  }
  const isoMatch = transcript.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    result.dueDate = isoMatch[1];
    result.title = result.title.replace(isoMatch[1], "").trim();
  }
  const localMatch = transcript.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/);
  if (!result.dueDate && localMatch) {
    const [, day, month, year] = localMatch;
    result.dueDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    result.title = result.title.replace(localMatch[0], "").trim();
  }
  if (!result.dueDate && /\bday after tomorrow\b/i.test(transcript)) {
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    result.dueDate = dayAfterTomorrow.toISOString().slice(0, 10);
    result.title = result.title.replace(/\bday after tomorrow\b/ig, "").trim();
  }
  if (!result.dueDate && /(μεθαυριο|μεθαύριο)/iu.test(transcript)) {
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    result.dueDate = dayAfterTomorrow.toISOString().slice(0, 10);
    result.title = result.title.replace(/(μεθαυριο|μεθαύριο)/giu, "").trim();
  }
  if (!result.dueDate && (normalized.includes("tomorrow") || /(αυριο|αύριο)/iu.test(transcript))) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    result.dueDate = tomorrow.toISOString().slice(0, 10);
    result.title = result.title.replace(/tomorrow/ig, "").replace(/(αυριο|αύριο)/giu, "").trim();
  }
  if (!result.dueDate && (normalized.includes("today") || /(σημερα|σήμερα)/iu.test(transcript))) {
    result.dueDate = new Date().toISOString().slice(0, 10);
    result.title = result.title.replace(/today/ig, "").replace(/(σημερα|σήμερα)/giu, "").trim();
  }
  result.title = result.title
    .replace(/\bby\b/ig, "")
    .replace(/\bfor\b/ig, "")
    .replace(/\buntil\b/ig, "")
    .replace(/(^|[\s,.;:!?-])(μεχρι|μέχρι|για|ως|τον|την|το|στον|στη|στην|στο)(?=$|[\s,.;:!?-])/giu, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,.;:\s-]+|[,.;:\s-]+$/g, "")
    .trim();
  if (!result.title) {
    result.title = buildSpeechSummary(transcript, 1)[0] || transcript;
  }
  return result;
}

function todayInputValue() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: getAppTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function closeCameraDialog(forceClose = false) {
  if (!forceClose && !confirmDiscardUnsavedChanges(["camera"])) return;
  stopCameraStream();
  pendingAssetTarget = null;
  pendingCameraAreaIds = new Set();
  if (els.cameraDialog.open) els.cameraDialog.close();
}

function openActionSheet() {
  if (!getSelectedFolder()) return;
  els.actionSheet.showModal();
}

function closeActionSheet() {
  if (els.actionSheet.open) els.actionSheet.close();
}

function closeNoteDialog(forceClose = false) {
  if (!forceClose && !confirmDiscardUnsavedChanges(["note"])) return;
  editingNoteId = null;
  els.noteForm.reset();
  if (els.noteFormTitle) els.noteFormTitle.textContent = "Create note";
  if (els.noteSaveBtn) els.noteSaveBtn.textContent = "Save note";
  if (els.noteMasterPlanVisible) els.noteMasterPlanVisible.checked = false;
  if (els.noteMasterPlanVisible) {
    const row = els.noteMasterPlanVisible.closest("label");
    row?.classList.remove("hidden");
    els.noteMasterPlanVisible.disabled = false;
  }
  setNoteStyle("text");
  if (els.noteImage) els.noteImage.value = "";
  pendingNoteImageDataUrl = "";
  pendingNoteImageName = "";
  renderNoteImagePreview();
  pendingAssetTarget = null;
  rememberFormSnapshot("note", els.noteForm);
  if (els.noteDialog.open) els.noteDialog.close();
}

function closeTaskDialog(forceClose = false) {
  if (!forceClose && !confirmDiscardUnsavedChanges(["task"])) return;
  els.taskForm.reset();
  resetSpeechAssist();
  els.taskFolderLinks.innerHTML = "";
  els.taskPhotoLinks.innerHTML = "";
  pendingAreaTaskId = null;
  pendingProjectTaskMode = false;
  if (els.taskMemberLabel) {
    els.taskMemberLabel.firstChild.textContent = "Assigned member";
  }
  els.taskAreaLabel?.classList.add("hidden");
  if (els.taskArea) els.taskArea.innerHTML = "";
  rememberFormSnapshot("task", els.taskForm);
  if (els.taskDialog.open) els.taskDialog.close();
}

function onNoteDialogCancel(event) {
  event.preventDefault();
  if (!confirmDiscardUnsavedChanges(["note"])) return;
  closeNoteDialog(true);
}

function onTaskDialogCancel(event) {
  event.preventDefault();
  if (!confirmDiscardUnsavedChanges(["task"])) return;
  closeTaskDialog(true);
}

function onAreaDialogCancel(event) {
  event.preventDefault();
  if (!confirmDiscardUnsavedChanges(["area"])) return;
  closeAreaDialog(true);
}

function onServiceTeamDialogCancel(event) {
  event.preventDefault();
  if (!confirmDiscardUnsavedChanges(["serviceTeam"])) return;
  closeServiceTeamDialog(true);
}

function onPhotoUploadOptionsDialogCancel(event) {
  event.preventDefault();
  closePhotoUploadOptionsDialog();
}

function stopCameraStream() {
  if (!cameraStream) return;
  for (const track of cameraStream.getTracks()) track.stop();
  cameraStream = null;
  els.cameraStream.srcObject = null;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function selectProject(projectId, rerender = true, skipUnsavedCheck = false) {
  const selected = state.projects.find((project) => project.id === projectId);
  if (!selected) return;
  if (state.selectedProjectId === projectId) {
    if (rerender && currentView === "projects" && isMobileProjectViewport() && currentMobileProjectsPane !== "detail") {
      pushNavigationState();
      currentMobileProjectsPane = "detail";
      persist();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return;
  }
  if (!skipUnsavedCheck && !confirmDiscardAndMaybeDeleteDraft()) return;
  pushNavigationState();
  state.selectedProjectId = projectId;
  showOtherTeamsForUser = false;
  showAssignedProjectsOnly = false;
  showArchivedWorkspaceItems = false;
  selectedProjectAreaId = "";
  currentAreaTeamScope = "all";
  if (currentView === "projects" && isMobileProjectViewport()) currentMobileProjectsPane = "detail";
  currentWorkspaceTab = "folders-hub";
  currentProjectDetailsTab = "plan";
  currentContentTab = "note";
  closeAreaBrowserDialog();
  closeImagePreview();
  if (isUserRole()) {
    setUserDefaultWorkspace(selected);
  }
  if (rerender) {
    persist();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
