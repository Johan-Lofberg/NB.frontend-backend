import {
  fetchShifts,
  uploadExcel,
  fetchLogsLatest,
  fetchLogsErrors,
  fetchLogs,
} from "./api.js";

import {
  monthsSv,
  fillMonthSelect,
  renderScheduleTable,
  setStatus,
  setPre,
  wireTelButtons,
} from "./ui.js";

// ===== AUTH GUARD (behåll din nuvarande approach) =====
if (localStorage.getItem("logged_in") !== "true") {
  window.location.href = "index.html";
}

// ===== DOM =====
const sidebar = document.getElementById("sidebar");

const viewSchedule = document.getElementById("view-schedule");
const viewUpload = document.getElementById("view-upload");
const viewLogs = document.getElementById("view-logs");

const monthPrev = document.getElementById("month-prev");
const monthNext = document.getElementById("month-next");
const monthLabel = document.getElementById("month-label");
const monthSelect = document.getElementById("month-select");

const scheduleTbody = document.getElementById("schedule-tbody");
const scheduleMeta = document.getElementById("schedule-meta");

const uploadForm = document.getElementById("upload-form");
const fileInput = document.getElementById("file-input");
const uploadStatus = document.getElementById("upload-status");
const uploadResponse = document.getElementById("upload-response");

const logsLatestBtn = document.getElementById("logs-latest");
const logsErrorsBtn = document.getElementById("logs-errors");
const logsFilterBtn = document.getElementById("logs-filter");
const logsDate = document.getElementById("logs-date");
const logsLimit = document.getElementById("logs-limit");
const logsStatus = document.getElementById("logs-status");
const logsOutput = document.getElementById("logs-output");

const logoutBtn = document.getElementById("logout-btn");
const logoutArrow = document.getElementById("logout-arrow");

// ===== STATE =====
let shiftsCache = [];
let selectedYear = 2026; // backend läser in 2026 i din parsing
let selectedMonth = new Date().getMonth(); // 0-11

// ===== INIT UI =====
fillMonthSelect(monthSelect);
monthSelect.value = String(selectedMonth);

wireTelButtons(document.body);

// ===== NAV (views) =====
function setActiveView(view) {
  // hidden toggles
  viewSchedule.hidden = view !== "schedule";
  viewUpload.hidden = view !== "upload";
  viewLogs.hidden = view !== "logs";

  // sidebar active class
  [...sidebar.querySelectorAll("li[data-view]")].forEach(li => {
    li.classList.toggle("is-active", li.dataset.view === view);
  });

  // Load something when entering logs
  if (view === "logs") {
    loadLatestLogs();
  }
}

sidebar.addEventListener("click", (e) => {
  const li = e.target.closest("li[data-view]");
  if (!li) return;
  setActiveView(li.dataset.view);
});

// ===== MONTH =====
function syncMonthUI() {
  monthLabel.textContent = monthsSv()[selectedMonth];
  monthSelect.value = String(selectedMonth);
}

function clampMonth(dir) {
  selectedMonth += dir;
  if (selectedMonth < 0) {
    selectedMonth = 11;
    selectedYear -= 1;
  }
  if (selectedMonth > 11) {
    selectedMonth = 0;
    selectedYear += 1;
  }
}

monthPrev.addEventListener("click", () => {
  clampMonth(-1);
  syncMonthUI();
  renderSchedule();
});

monthNext.addEventListener("click", () => {
  clampMonth(1);
  syncMonthUI();
  renderSchedule();
});

monthSelect.addEventListener("change", () => {
  selectedMonth = Number(monthSelect.value);
  syncMonthUI();
  renderSchedule();
});

// ===== LOGOUT =====
function logout() {
  localStorage.removeItem("logged_in");
  window.location.href = "index.html";
}
logoutBtn.addEventListener("click", logout);
logoutArrow.addEventListener("click", logout);

// ===== DATA LOADERS =====
async function loadShifts() {
  try {
    shiftsCache = await fetchShifts();

    // Om det finns data: sätt year efter första shiftens år (stabilt)
    if (Array.isArray(shiftsCache) && shiftsCache.length && shiftsCache[0].date) {
      selectedYear = Number(String(shiftsCache[0].date).slice(0, 4)) || selectedYear;
    }

    renderSchedule();
  } catch (err) {
    scheduleTbody.innerHTML = `<tr><td colspan="6" style="color:#b42318;">Fel: ${err.message}</td></tr>`;
    scheduleMeta.textContent = "";
  }
}

function renderSchedule() {
  renderScheduleTable({
    tbodyEl: scheduleTbody,
    metaEl: scheduleMeta,
    shifts: shiftsCache,
    year: selectedYear,
    monthIndex: selectedMonth,
  });
}

// ===== UPLOAD =====
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!fileInput.files[0]) {
    setStatus(uploadStatus, "Välj en fil först.", "error");
    return;
  }

  setStatus(uploadStatus, "Laddar upp...", "ok");
  setPre(uploadResponse, null);

  try {
    const result = await uploadExcel(fileInput.files[0]);
    setStatus(uploadStatus, "Fil uppladdad och tolkad ✅", "ok");
    setPre(uploadResponse, result);

    // Efter upload: hämta om shifts så schemat uppdateras
    await loadShifts();
  } catch (err) {
    setStatus(uploadStatus, "Fel vid uppladdning: " + err.message, "error");
  }
});

// ===== LOGS =====
async function loadLatestLogs() {
  setStatus(logsStatus, "Hämtar senaste...", "ok");
  setPre(logsOutput, null);
  try {
    const data = await fetchLogsLatest();
    setStatus(logsStatus, "OK", "ok");
    setPre(logsOutput, data);
  } catch (err) {
    setStatus(logsStatus, "Fel: " + err.message, "error");
  }
}

logsLatestBtn.addEventListener("click", loadLatestLogs);

logsErrorsBtn.addEventListener("click", async () => {
  setStatus(logsStatus, "Hämtar fel-loggar...", "ok");
  setPre(logsOutput, null);
  try {
    const data = await fetchLogsErrors();
    setStatus(logsStatus, "OK", "ok");
    setPre(logsOutput, data);
  } catch (err) {
    setStatus(logsStatus, "Fel: " + err.message, "error");
  }
});

logsFilterBtn.addEventListener("click", async () => {
  const date = (logsDate.value || "").trim();
  const limit = Number(logsLimit.value) || 50;

  setStatus(logsStatus, "Filtrerar...", "ok");
  setPre(logsOutput, null);

  try {
    const data = await fetchLogs({ date: date || undefined, limit });
    setStatus(logsStatus, "OK", "ok");
    setPre(logsOutput, data);
  } catch (err) {
    setStatus(logsStatus, "Fel: " + err.message, "error");
  }
});

// ===== START =====
syncMonthUI();
setActiveView("schedule");
loadShifts();
