const BASE_URL = "http://localhost:3001";

const uploadForm = document.getElementById("upload-form");
const fileInput = document.getElementById("file-input");
const uploadStatus = document.getElementById("upload-status");
const uploadResponse = document.getElementById("upload-response");

const apiStatus = document.getElementById("api-status");
const apiResponse = document.getElementById("api-response");

if (localStorage.getItem("logged_in") !== "true") {
  window.location.href = "index.html";
}

function setStatus(element, message, type = "ok") {
  element.textContent = message;
  element.className = "status " + type;
}

function setResponse(element, data) {
  if (data === null || data === undefined || data === "") {
    element.textContent = "";
    return;
  }
  try {
    element.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    element.textContent = String(data);
  }
}

// ===== Upload Excel (POST /upload, med FormData) =====
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!fileInput.files[0]) {
      setStatus(uploadStatus, "Välj en fil först.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    setStatus(uploadStatus, "Laddar upp...", "ok");
    setResponse(uploadResponse, null);

    try {
      const res = await fetch(BASE_URL + "/upload", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (!res.ok) {
        setStatus(
          uploadStatus,
          "Fel vid uppladdning (" + res.status + ")",
          "error"
        );
      } else {
        setStatus(uploadStatus, "Fil uppladdad och tolkad ✅", "ok");
      }
      setResponse(uploadResponse, data);
    } catch (err) {
      setStatus(uploadStatus, "Nätverksfel: " + err.message, "error");
    }
  });
}

// ===== Helper: GET =====
async function callGet(path) {
  setStatus(apiStatus, "Hämtar " + path + "...", "ok");
  setResponse(apiResponse, null);

  try {
    const res = await fetch(BASE_URL + path);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!res.ok) {
      setStatus(apiStatus, "Fel (" + res.status + ") på " + path, "error");
    } else {
      setStatus(apiStatus, "OK: " + path, "ok");
    }
    setResponse(apiResponse, data);
  } catch (err) {
    setStatus(apiStatus, "Nätverksfel: " + err.message, "error");
  }
}

// ===== Helper: POST (JSON) =====
async function callPost(path, body = {}) {
  setStatus(apiStatus, "Kör " + path + "...", "ok");
  setResponse(apiResponse, null);

  try {
    const res = await fetch(BASE_URL + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!res.ok) {
      setStatus(apiStatus, "Fel (" + res.status + ") på " + path, "error");
    } else {
      setStatus(apiStatus, "OK: " + path, "ok");
    }
    setResponse(apiResponse, data);
  } catch (err) {
    setStatus(apiStatus, "Nätverksfel: " + err.message, "error");
  }
}

// ===== Knappar (anropas från index.html via onclick) =====
function testRoot() {
  callGet("/");
}

function getShifts() {
  callGet("/shifts");
}

function getReminders() {
  callGet("/reminders");
}

function runTodaysReminders() {
  // Backend: app.post("/run-todays-reminders", ...)
  callPost("/run-todays-reminders");
}

function getLatestLogs() {
  callGet("/logs/latest");
}

function getErrorLogs() {
  callGet("/logs/errors");
}

function logout() {
  localStorage.removeItem("logged_in");
  window.location.href = "index.html";
}
