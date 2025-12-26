// scripts/ui.js

const MONTHS_SV = [
  "Januari","Februari","Mars","April","Maj","Juni",
  "Juli","Augusti","September","Oktober","November","December",
];

// Mappa olika möjliga weekday-format till svenska
const WEEKDAY_MAP = {
  Mon: "Mån", Tue: "Tis", Wed: "Ons", Thu: "Tor", Fri: "Fre", Sat: "Lör", Sun: "Sön",
  Mån: "Mån", Tis: "Tis", Ons: "Ons", Tor: "Tor", Fre: "Fre", Lör: "Lör", Sön: "Sön",
  Man: "Mån", Tisdag: "Tis", Onsdag: "Ons", Torsdag: "Tor", Fredag: "Fre", Lördag: "Lör", Söndag: "Sön",
};

export function monthsSv() {
  return MONTHS_SV.slice();
}

export function fillMonthSelect(selectEl) {
  selectEl.innerHTML = "";
  MONTHS_SV.forEach((m, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = m;
    selectEl.appendChild(opt);
  });
}

export function setStatus(el, message, type = "ok") {
  // type kan vara "ok" eller "error" (eller vad du vill)
  el.textContent = message;
  el.className = "status " + type;
}

export function setPre(el, data) {
  if (data === null || data === undefined || data === "") {
    el.textContent = "";
    return;
  }
  try {
    el.textContent = JSON.stringify(data, null, 2);
  } catch {
    el.textContent = String(data);
  }
}

/**
 * Gör tabellen "smart":
 * - grupperar alla shifts per datum
 * - om 2 personer har samma datum visas de tydligt tillsammans i "Namn"-kolumnen
 * - Tel-kolumnen visar en knapp per person (med numret synligt)
 * - Status 14d/1d blir tydliga badges
 */
export function renderScheduleTable({ tbodyEl, metaEl, shifts, year, monthIndex }) {
  const monthStr = String(monthIndex + 1).padStart(2, "0");
  const prefix = `${year}-${monthStr}-`;

  const inMonth = Array.isArray(shifts)
    ? shifts.filter(s => typeof s?.date === "string" && s.date.startsWith(prefix))
    : [];

  // --- Grupp: Map("YYYY-MM-DD" -> [shift, shift, ...]) ---
  const byDate = new Map();
  for (const s of inMonth) {
    if (!s?.date) continue;
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date).push(s);
  }

  // Sortera datum
  const dates = [...byDate.keys()].sort((a, b) => (a > b ? 1 : -1));

  tbodyEl.innerHTML = "";

  if (!dates.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td colspan="6" style="color:#6b7a99;">
        Inga pass hittades för ${MONTHS_SV[monthIndex]} ${year}.
      </td>
    `;
    tbodyEl.appendChild(tr);
    if (metaEl) metaEl.textContent = "";
    return;
  }

  for (const dateStr of dates) {
    const people = byDate.get(dateStr) || [];

    // Sortera inom dagen (så det ser konsekvent ut)
    people.sort((a, b) =>
      String(a?.lastName || "").localeCompare(String(b?.lastName || ""), "sv")
    );

    const dayNum = Number(dateStr.slice(8, 10));
    const wdRaw = String(people[0]?.weekday || "");
    const wd = WEEKDAY_MAP[wdRaw] || wdRaw || "—";

    // Status (om någon i gruppen har reminder-typen)
    const has14 = people.some(p =>
      Array.isArray(p?.reminders) && p.reminders.some(r => r.type === "two_weeks_before")
    );
    const has1 = people.some(p =>
      Array.isArray(p?.reminders) && p.reminders.some(r => r.type === "one_day_before")
    );

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <!-- Dag-kolumn: Ons överst / 7 underst -->
      <td>
        <div class="day day--stack">
          <span class="weekday">${escapeHtml(wd)}</span>
          <span class="date">${isFinite(dayNum) ? dayNum : ""}</span>
        </div>
      </td>

      <!-- Namn-kolumn: tydlig "tillsammans"-grupp -->
      <td class="name">
        <div class="pair" title="${escapeAttr(dateStr)}">
          ${people.map(p => {
            const fullName = `${p?.firstName || ""} ${p?.lastName || ""}`.trim() || "—";
            const berth = p?.berth ? `Plats ${escapeHtml(p.berth)}` : "";
            return `
              <div class="pair-item">
                <div class="pair-name">${escapeHtml(fullName)}</div>
                ${berth ? `<div class="pair-sub">${berth}</div>` : ``}
              </div>
            `;
          }).join("")}
        </div>
      </td>

      <!-- Tel-kolumn: en knapp per person -->
      <td>
        <div class="tel-stack">
          ${people.map(p => {
            const phone = String(p?.phone || "").trim();
            const label = phone ? formatPhoneLabel(phone) : "Saknar nr";
            return `
              <button
                class="tel-btn tel-btn--full"
                data-phone="${escapeAttr(phone)}"
                ${phone ? "" : "disabled"}
                title="${phone ? "Klicka för att kopiera" : "Inget telefonnummer"}"
              >
                ${escapeHtml(label)}
              </button>
            `;
          }).join("")}
        </div>
      </td>

      <!-- 14d / 1d -->
      <td>
        ${has14
          ? `<span class="status status--ok" title="Påminnelse 14 dagar innan">14d</span>`
          : `<span class="status status--muted" title="Ingen 14d-påminnelse">—</span>`
        }
      </td>

      <td>
        ${has1
          ? `<span class="status status--ok" title="Påminnelse 1 dag innan">1d</span>`
          : `<span class="status status--muted" title="Ingen 1d-påminnelse">—</span>`
        }
      </td>

      <td></td>
    `;

    tbodyEl.appendChild(tr);
  }

  if (metaEl) {
    metaEl.textContent =
      `Visar ${dates.length} datum för ${MONTHS_SV[monthIndex]} ${year}. ` +
      `(Om flera personer har samma datum visas de tillsammans.)`;
  }
}

/**
 * Kopplar Tel-knapparna:
 * - Klick = kopiera nummer
 * - Kort feedback på knappen
 */
export function wireTelButtons(containerEl) {
  containerEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button.tel-btn");
    if (!btn) return;

    const phone = (btn.getAttribute("data-phone") || "").trim();
    if (!phone || btn.disabled) return;

    const original = btn.textContent;

    try {
      await navigator.clipboard.writeText(phone);
      btn.textContent = "Kopierat ✅";
      setTimeout(() => (btn.textContent = original), 900);
    } catch {
      // fallback om clipboard blockas
      alert(phone);
    }
  });
}

/* =========================
   Helpers
========================= */

function formatPhoneLabel(phone) {
  // Visar nummer tydligt på knappen.
  // Enkel format för +46: +46 70 123 45 67 (inte perfekt för alla nummer, men tydligare direkt)
  const p = String(phone).trim();
  if (!p) return "Tel";

  if (!p.startsWith("+46")) return p;

  const rest = p.replace("+46", "").replace(/\D/g, "");
  const a = rest.slice(0, 2);
  const b = rest.slice(2, 5);
  const c = rest.slice(5, 7);
  const d = rest.slice(7, 9);

  return `+46 ${a} ${b} ${c} ${d}`.trim();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll('"', "&quot;");
}
