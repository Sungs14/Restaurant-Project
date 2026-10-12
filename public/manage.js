/* Mangan Tamu: manage restaurants (add, edit, delete) */

const CATEGORIES = {
  grill: { label: "Grill and cured meats", color: "var(--c-grill)" },
  heritage: { label: "Fiesta classics", color: "var(--c-heritage)" },
  sweets: { label: "Sweets and kakanin", color: "var(--c-sweets)" },
  wild: { label: "Adventurous", color: "var(--c-wild)" },
  river: { label: "River and seafood", color: "var(--c-river)" },
};

const $ = (id) => document.getElementById(id);
const state = { all: [] };

function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

let toastTimer;
function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

function matchesText(r, needle) {
  const hay = [r.name, r.town, (CATEGORIES[r.category] || {}).label, r.signature, r.blurb, ...r.dishes.map((d) => d.name + " " + d.note)]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle.toLowerCase());
}

/* ---------------- scores ---------------- */

const gradeFor = (s) => (s >= 18 ? "A" : s >= 15 ? "B" : "C");
const totalOf = (r) => (r.scores || []).reduce((a, x) => a + x.score, 0);

// "18, 20, 19" -> [{date, grade, score}, ...]; keeps the old date for scores that already existed
function parseScores(text, old = []) {
  const nums = text.split(/[,\s]+/).filter(Boolean).map(Number);
  if (nums.some((n) => !Number.isFinite(n) || n < 0 || n > 20)) throw new Error("Scores must be numbers from 0 to 20, separated by commas");
  const today = new Date().toISOString().slice(0, 10);
  return nums.map((score, i) => ({ date: (old[i] && old[i].date) || today, grade: gradeFor(score), score }));
}

function updateScoreHint() {
  let nums = [];
  try { nums = parseScores($("fScores").value); } catch (e) { return ($("scoreHint").textContent = e.message); }
  const total = nums.reduce((a, x) => a + x.score, 0);
  $("scoreHint").textContent = nums.length
    ? `Total ${total} from ${nums.length} scores. ${total > 90 ? "Above 90, so it appears in Best quality." : "Needs more than 90 to appear in Best quality."}`
    : "No scores yet, so it won't appear in Best quality.";
}

/* ---------------- manage table ---------------- */

function renderManage() {
  const sel = $("mTown");
  const cur = sel.value;
  const towns = [...new Set(state.all.map((r) => r.town))].sort();
  sel.innerHTML = '<option value="">All towns</option>' + towns.map((t) => `<option>${esc(t)}</option>`).join("");
  sel.value = towns.includes(cur) ? cur : "";
  const q = $("mSearch").value.trim();
  const rows = state.all
    .filter((r) => (!sel.value || r.town === sel.value) && (!q || matchesText(r, q)))
    .sort((a, b) => a.name.localeCompare(b.name));
  $("manageBody").innerHTML =
    rows
      .map(
        (r) => `<tr>
          <td><strong>${esc(r.name)}</strong></td>
          <td>${esc(r.town)}</td>
          <td>${esc(CATEGORIES[r.category].label)}</td>
          <td>${esc(r.signature || "")}</td>
          <td>${esc(r.open)} to ${esc(r.close)}</td>
          <td>${(r.scores || []).length ? totalOf(r) : "No scores"}</td>
          <td class="manage__actions">
            <button class="btn btn--outline" type="button" data-edit="${r.id}" aria-label="Edit ${esc(r.name)}">Edit</button>
            <button class="btn btn--danger" type="button" data-del="${r.id}" aria-label="Delete ${esc(r.name)}">Delete</button>
          </td></tr>`
      )
      .join("") || '<tr><td colspan="7">No restaurants found.</td></tr>';
  $("manageCount").textContent = `${rows.length} of ${state.all.length} restaurants`;
}

/* ---------------- add / edit / delete ---------------- */

async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data && data.error) || "Request failed. Is the server running?");
  return data;
}

function refreshAfterChange() {
  renderManage();
}

let editingId = null;
function openForm(r) {
  editingId = r ? r.id : null;
  $("formTitle").textContent = r ? "Edit restaurant" : "Add a restaurant";
  $("restForm").reset();
  $("formError").textContent = "";
  if (r) {
    $("fName").value = r.name;
    $("fTown").value = r.town;
    $("fCategory").value = r.category;
    $("fSignature").value = r.signature || "";
    $("fBlurb").value = r.blurb || "";
    $("fHeat").value = r.heat;
    $("fPrice").value = r.price;
    $("fOpen").value = r.open;
    $("fClose").value = r.close;
    $("fDishes").value = r.dishes.map((d) => `${d.name} | ${d.note}`).join("\n");
    $("fScores").value = (r.scores || []).map((s) => s.score).join(", ");
  }
  updateScoreHint();
  $("formDialog").showModal();
  $("fName").focus();
}

async function deleteRestaurant(id) {
  const r = state.all.find((x) => x.id === id);
  if (!r || !confirm(`Delete ${r.name}? This cannot be undone.`)) return;
  try {
    await request("DELETE", `/api/restaurants/${encodeURIComponent(id)}`);
  } catch (err) {
    return toast(err.message);
  }
  state.all = state.all.filter((x) => x.id !== id);
  try {
    // keep the public page's saved list in step
    const saved = JSON.parse(localStorage.getItem("mt-saved") || "[]").filter((x) => x !== id);
    localStorage.setItem("mt-saved", JSON.stringify(saved));
  } catch (e) { /* ignore */ }
  refreshAfterChange();
  toast(`Deleted ${r.name}`);
}

function setupFormEvents() {
  $("fCategory").innerHTML = Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("");
  $("addBtn").addEventListener("click", () => openForm(null));
  $("mSearch").addEventListener("input", renderManage);
  $("mTown").addEventListener("change", renderManage);
  $("manageBody").addEventListener("click", (e) => {
    const edit = e.target.closest("[data-edit]");
    if (edit) return openForm(state.all.find((x) => x.id === edit.dataset.edit));
    const del = e.target.closest("[data-del]");
    if (del) deleteRestaurant(del.dataset.del);
  });
  $("fScores").addEventListener("input", updateScoreHint);
  $("restForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    let scores;
    try {
      const old = (state.all.find((x) => x.id === editingId) || {}).scores;
      scores = parseScores($("fScores").value, old);
    } catch (err) {
      return ($("formError").textContent = err.message);
    }
    const dishes = $("fDishes").value.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [name, ...note] = l.split("|");
      return { name: name.trim(), note: note.join("|").trim() };
    });
    const body = {
      name: $("fName").value.trim(), town: $("fTown").value.trim(), category: $("fCategory").value,
      signature: $("fSignature").value.trim(), blurb: $("fBlurb").value.trim(),
      heat: Number($("fHeat").value), price: Number($("fPrice").value),
      open: $("fOpen").value, close: $("fClose").value, dishes, scores,
    };
    $("formSubmit").disabled = true;
    try {
      const saved = editingId
        ? await request("PUT", `/api/restaurants/${encodeURIComponent(editingId)}`, body)
        : await request("POST", "/api/restaurants", body);
      state.all = editingId ? state.all.map((x) => (x.id === editingId ? saved : x)) : [...state.all, saved];
      $("formDialog").close();
      refreshAfterChange();
          toast(editingId ? `Updated ${saved.name}` : `Added ${saved.name}`);
    } catch (err) {
      $("formError").textContent = err.message;
    } finally {
      $("formSubmit").disabled = false;
    }
  });
}


(async function init() {
  setupFormEvents();
  try {
    state.all = await request("GET", "/api/restaurants");
  } catch (err) {
    $("manageBody").innerHTML = '<tr><td colspan="7">Could not load restaurants. Start the server with npm start and open this page from http://localhost:3000.</td></tr>';
    return;
  }
  renderManage();
})();
