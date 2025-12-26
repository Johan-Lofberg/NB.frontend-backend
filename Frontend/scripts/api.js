const BASE_URL = "http://localhost:3001";

async function readAny(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

export async function fetchShifts() {
  const res = await fetch(`${BASE_URL}/shifts`);
  const data = await readAny(res);
  if (!res.ok) throw new Error("Kunde inte hämta /shifts");
  return data;
}

export async function uploadExcel(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await readAny(res);
  if (!res.ok) throw new Error(typeof data === "string" ? data : "Upload misslyckades");
  return data;
}

export async function fetchLogsLatest() {
  const res = await fetch(`${BASE_URL}/logs/latest`);
  const data = await readAny(res);
  if (!res.ok) throw new Error("Kunde inte hämta /logs/latest");
  return data;
}

export async function fetchLogsErrors() {
  const res = await fetch(`${BASE_URL}/logs/errors`);
  const data = await readAny(res);
  if (!res.ok) throw new Error("Kunde inte hämta /logs/errors");
  return data;
}

export async function fetchLogs({ date, limit } = {}) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (limit) params.set("limit", String(limit));

  const url = `${BASE_URL}/logs${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url);
  const data = await readAny(res);
  if (!res.ok) throw new Error("Kunde inte hämta /logs");
  return data;
}
