/* Mangan Tamu: Kapampangan restaurant explorer
   Sections: data, state, helpers, lantern, dish explorer, filters,
   cards, ratings, dialog, favourites, init. */

/* ---------------- static content ---------------- */

const CATEGORIES = {
  grill: { label: "Grill and cured meats", color: "var(--c-grill)" },
  heritage: { label: "Fiesta classics", color: "var(--c-heritage)" },
  sweets: { label: "Sweets and kakanin", color: "var(--c-sweets)" },
  wild: { label: "Adventurous", color: "var(--c-wild)" },
  river: { label: "River and seafood", color: "var(--c-river)" },
};

const HEAT_LEVELS = [
  { value: "any", label: "Any heat" },
  { value: "0", label: "Not spicy" },
  { value: "1", label: "Mild" },
  { value: "2", label: "Spicy" },
  { value: "3", label: "Fiery" },
];

const RATING_FILTERS = [
  { value: "any", label: "Any rating" },
  { value: "4.5", label: "4.5 and up" },
  { value: "4", label: "4 and up" },
  { value: "3", label: "3 and up" },
];

const DISHES = [
  {
    name: "Sisig",
    term: "sisig",
    say: "SEE-sig",
    text: "Chopped pig's face and ears, grilled then seasoned with onion, chili and calamansi. It arrives on a hot plate, still sizzling, and was made famous in Angeles City.",
  },
  {
    name: "Bringhe",
    term: "bringhe",
    say: "BRING-heh",
    text: "Glutinous rice cooked with coconut milk and turmeric in a pot lined with banana leaf. Think of it as Pampanga's own take on paella, sticky and gold.",
  },
  {
    name: "Tibok-tibok",
    term: "tibok",
    say: "TEE-bok TEE-bok",
    text: "A carabao-milk pudding topped with toasted coconut curds. Tibok means heartbeat, which is what it does when you tap the plate.",
  },
  {
    name: "Morcon",
    term: "morcon",
    say: "mor-KON",
    text: "A beef roll stuffed with sausage, egg and pickles, then simmered in tomato sauce. It is a fixture of fiestas and Christmas tables.",
  },
  {
    name: "Pindang damulag",
    term: "pindang",
    say: "pin-DANG da-MOO-lag",
    text: "Carabao meat cured sweet and red, much like tocino. Pampanga is where tocino traditions run deepest, and this is the older cousin.",
  },
  {
    name: "Kamaru",
    term: "kamaru",
    say: "ka-ma-ROO",
    text: "Mole crickets cooked in vinegar, garlic and chili, like a tiny adobo. Crunchy, savory and a rite of passage for visitors.",
  },
  {
    name: "Betute",
    term: "betute",
    say: "beh-TOO-teh",
    text: "A frog stuffed with seasoned minced pork and fried until crisp. One of Pampanga's best-known adventurous dishes.",
  },
  {
    name: "Buro",
    term: "buro",
    say: "BOO-ro",
    text: "Rice fermented with fish or shrimp. It is sour and salty, and it is eaten with hot rice and fresh mustard greens.",
  },
];

/* ---------------- state ---------------- */

const state = {
  all: [],
  town: "",
  category: "",
  heat: "any",
  q: "",
  sort: "name",
  savedOnly: false,
  saved: new Set(),
  group: "",
  ratings: {}, // { restaurantId: { avg, count } } from /api/ratings/summary
  minRating: "any",
};

const $ = (id) => document.getElementById(id);
const els = {
  grid: $("grid"),
  empty: $("empty"),
  count: $("count"),
  townChips: $("townChips"),
  catChips: $("catChips"),
  heatChips: $("heatChips"),
  ratingChips: $("ratingChips"),
  search: $("search"),
  sort: $("sort"),
  savedToggle: $("savedToggle"),
  savedCount: $("savedCount"),
  sheet: $("sheet"),
  sheetBody: $("sheetBody"),
  toast: $("toast"),
};

/* ---------------- helpers ---------------- */

function esc(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

const SVG = {
  chili: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.500 3.500c1.200-.4 2.300.6 2 1.800-.9 5.200-4.200 12.300-12 15.400-2 .8-3.600-1.200-2.400-2.800 3.500-4.800 6.200-8.700 7.300-13.100.2-.9.800-1.400 1.500-1.300l2 .5.100-.5Z"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.200 7 13 7 13s7-7.800 7-13a7 7 0 0 0-7-7Zm0 9.500A2.500 2.500 0 1 1 12 6.500a2.500 2.500 0 0 1 0 5Z"/></svg>`,
  star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.800 2.900 5.900 6.500.9-4.700 4.600 1.100 6.500L12 17.600l-5.800 3.100 1.100-6.500L2.600 9.600l6.500-.9L12 2.800Z"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.500s-8-4.800-8-10.800A4.600 4.600 0 0 1 12 6.700a4.600 4.600 0 0 1 8 3c0 6-8 10.800-8 10.800Z"/></svg>`,
};

function heatMeter(level) {
  const label = ["Not spicy", "Mild heat", "Spicy", "Fiery"][level];
  let out = `<span class="meter" role="img" aria-label="${label}">`;
  for (let i = 1; i <= 3; i++) {
    out += SVG.chili.replace("<path", `<path class="${i <= level ? "on" : "off"}"`);
  }
  return out + "</span>";
}

function priceTag(level) {
  const label = ["", "Budget friendly", "Mid range", "Special occasion"][level];
  let out = `<span class="price" role="img" aria-label="${label}">`;
  for (let i = 1; i <= 3; i++) {
    out += `<span class="${i <= level ? "on" : "off"}">₱</span>`;
  }
  return out + "</span>";
}

function ratingLine(id) {
  const s = state.ratings[id];
  if (!s) return `<span class="rating rating--none">No ratings yet</span>`;
  return `<span class="rating" role="img" aria-label="Rated ${s.avg} out of 5 from ${s.count} ${s.count === 1 ? "rating" : "ratings"}">${SVG.star}<b>${s.avg.toFixed(1)}</b><span class="rating__n">(${s.count})</span></span>`;
}

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

function formatTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const hour12 = ((h + 11) % 12) + 1;
  const suffix = h >= 12 && h < 24 ? "pm" : "am";
  return `${hour12}${m ? ":" + String(m).padStart(2, "0") : ""} ${suffix}`;
}

function openStatus(r, now = new Date()) {
  const open = toMinutes(r.open);
  const close = toMinutes(r.close);
  const t = now.getHours() * 60 + now.getMinutes();
  const isOpen = close > open ? t >= open && t < close : t >= open || t < close;
  return isOpen
    ? { open: true, text: `Open, closes ${formatTime(r.close)}` }
    : { open: false, text: `Closed, opens ${formatTime(r.open)}` };
}

let toastTimer;
function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

/* ---------------- lantern (parul) ---------------- */

function starPoints(points, outer, inner, rotateDeg = 0) {
  const out = [];
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI * i) / points + (rotateDeg * Math.PI) / 180 - Math.PI / 2;
    out.push(`${(Math.cos(angle) * radius).toFixed(1)},${(Math.sin(angle) * radius).toFixed(1)}`);
  }
  return out.join(" ");
}

function buildLantern() {
  const svg = $("parulSvg");
  let markup = "";

  // layers drawn back to front; each flashes between two colours
  markup += `<polygon class="layer layer--1" points="${starPoints(16, 205, 120)}"/>`;
  markup += `<polygon class="layer layer--2" points="${starPoints(16, 160, 78, 11.25)}"/>`;
  markup += `<polygon class="layer layer--3" points="${starPoints(8, 115, 52)}"/>`;
  markup += `<polygon class="layer layer--4" points="${starPoints(8, 62, 30, 22.5)}"/>`;

  // a ring of bulbs that chase around the edge
  const bulbs = 32;
  for (let i = 0; i < bulbs; i++) {
    const a = (Math.PI * 2 * i) / bulbs;
    const x = (Math.cos(a) * 218).toFixed(1);
    const y = (Math.sin(a) * 218).toFixed(1);
    markup += `<circle class="bulb" cx="${x}" cy="${y}" r="5" style="animation-delay:${(i * 0.045).toFixed(2)}s"/>`;
  }
  svg.innerHTML = markup;
}

function cycleLights() {
  const hero = $("top");
  const next = (Number(hero.dataset.mode) + 1) % 3;
  hero.dataset.mode = next;
  try {
    localStorage.setItem("mt-lights", String(next));
  } catch (e) {
    /* storage can be blocked; the lantern still works */
  }
}

/* ---------------- dish explorer ---------------- */

function buildDishes() {
  const tabs = $("dishTabs");
  tabs.innerHTML = DISHES.map(
    (d, i) =>
      `<button class="dishtab" role="tab" id="tab-${i}" aria-selected="${i === 0}" aria-controls="dishPanel" tabindex="${i === 0 ? 0 : -1}" data-i="${i}">${esc(d.name)}</button>`
  ).join("");

  const select = (i, focus) => {
    tabs.querySelectorAll(".dishtab").forEach((btn, idx) => {
      btn.setAttribute("aria-selected", idx === i);
      btn.tabIndex = idx === i ? 0 : -1;
      if (idx === i && focus) btn.focus();
    });
    const d = DISHES[i];
    const panel = $("dishPanel");
    panel.setAttribute("aria-labelledby", `tab-${i}`);
    const matches = state.all.filter((r) => matchesText(r, d.term)).length;
    panel.innerHTML = `
      <h3>${esc(d.name)}</h3>
      <p class="say">Say it: ${esc(d.say)}</p>
      <p class="desc">${esc(d.text)}</p>
      <button class="btn btn--gold" type="button" data-term="${esc(d.term)}">
        Find places serving ${esc(d.name.toLowerCase())}${matches ? ` (${matches})` : ""}
      </button>`;
    panel.classList.remove("swap");
    void panel.offsetWidth; // restart the little swap animation
    panel.classList.add("swap");
  };

  tabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".dishtab");
    if (btn) select(Number(btn.dataset.i), false);
  });
  tabs.addEventListener("keydown", (e) => {
    const current = Number(document.activeElement.dataset.i);
    if (Number.isNaN(current)) return;
    const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!move) return;
    e.preventDefault();
    select((current + move + DISHES.length) % DISHES.length, true);
  });

  $("dishPanel").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-term]");
    if (!btn) return;
    resetFilters(false);
    state.q = btn.dataset.term;
    els.search.value = state.q;
    render();
    $("results").scrollIntoView();
  });

  select(0, false);
}

/* ---------------- filters ---------------- */

function matchesText(r, needle) {
  const hay = [r.name, r.town, (CATEGORIES[r.category] || {}).label, r.signature, r.blurb, ...r.dishes.map((d) => d.name + " " + d.note)]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle.toLowerCase());
}

function chip(label, pressed, attrs = "", extra = "") {
  return `<button class="chip" type="button" aria-pressed="${pressed}" ${attrs}>${extra}${esc(label)}</button>`;
}

function buildChips() {
  const towns = [...new Set(state.all.map((r) => r.town))].sort();
  els.townChips.innerHTML =
    chip("All towns", state.town === "", 'data-town=""') +
    towns
      .map((t) => {
        const n = state.all.filter((r) => r.town === t).length;
        return chip(t, state.town === t, `data-town="${esc(t)}"`, "") .replace("</button>", ` <span class="n">${n}</span></button>`);
      })
      .join("");

  els.catChips.innerHTML =
    chip("All kinds", state.category === "", 'data-cat=""') +
    Object.entries(CATEGORIES)
      .map(([key, c]) =>
        chip(c.label, state.category === key, `data-cat="${key}"`, `<span class="dot" style="--dot:${c.color}"></span>`)
      )
      .join("");

  els.heatChips.innerHTML = HEAT_LEVELS.map((h) =>
    chip(h.label, state.heat === h.value, `data-heat="${h.value}"`)
  ).join("");

  els.ratingChips.innerHTML = RATING_FILTERS.map((f) =>
    chip(f.label, state.minRating === f.value, `data-rating="${f.value}"`)
  ).join("");
}

function setupFilterEvents() {
  els.townChips.addEventListener("click", (e) => {
    const b = e.target.closest("[data-town]");
    if (!b) return;
    state.town = b.dataset.town;
    buildChips();
    render();
  });
  els.catChips.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (!b) return;
    state.category = b.dataset.cat;
    buildChips();
    render();
  });
  els.heatChips.addEventListener("click", (e) => {
    const b = e.target.closest("[data-heat]");
    if (!b) return;
    state.heat = b.dataset.heat;
    buildChips();
    render();
  });

  els.ratingChips.addEventListener("click", (e) => {
    const b = e.target.closest("[data-rating]");
    if (!b) return;
    state.minRating = b.dataset.rating;
    buildChips();
    render();
  });

  let debounce;
  els.search.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.q = els.search.value.trim();
      render();
    }, 120);
  });
  els.sort.addEventListener("change", () => {
    state.sort = els.sort.value;
    render();
  });
  els.savedToggle.addEventListener("click", () => {
    state.savedOnly = !state.savedOnly;
    render();
  });
  $("clearBtn").addEventListener("click", () => resetFilters(true));
  $("surprise").addEventListener("click", surpriseMe);
}

function resetFilters(redraw = true) {
  Object.assign(state, { town: "", category: "", heat: "any", minRating: "any", q: "", savedOnly: false });
  els.search.value = "";
  buildChips();
  if (redraw) render();
}

const avgOf = (id) => (state.ratings[id] ? state.ratings[id].avg : 0);

function getVisible() {
  let list = state.all.filter((r) => {
    if (state.town && r.town !== state.town) return false;
    if (state.category && r.category !== state.category) return false;
    if (state.heat !== "any" && r.heat !== Number(state.heat)) return false;
    if (state.minRating !== "any" && avgOf(r.id) < Number(state.minRating)) return false;
    if (state.savedOnly && !state.saved.has(r.id)) return false;
    if (state.q && !matchesText(r, state.q)) return false;
    return true;
  });
  const sorters = {
    name: (a, b) => a.name.localeCompare(b.name),
    "price-asc": (a, b) => a.price - b.price || a.name.localeCompare(b.name),
    "price-desc": (a, b) => b.price - a.price || a.name.localeCompare(b.name),
    heat: (a, b) => b.heat - a.heat || a.name.localeCompare(b.name),
    rating: (a, b) => avgOf(b.id) - avgOf(a.id) || a.name.localeCompare(b.name),
  };
  return list.sort(sorters[state.sort]);
}

/* ---------------- cards ---------------- */

function cardHTML(r) {
  const status = openStatus(r);
  const saved = state.saved.has(r.id);
  return `
    <article class="card" data-cat="${r.category}" data-id="${r.id}">
      <button class="heart" type="button" aria-pressed="${saved}" aria-label="Save ${esc(r.name)}" data-heart="${r.id}">${SVG.heart}</button>
      <p class="card__kind">${esc(CATEGORIES[r.category].label)}</p>
      <h3><button type="button" data-open="${r.id}">${esc(r.name)}</button></h3>
      <p class="card__town">${SVG.pin}${esc(r.town)}</p>
      <p class="card__sig">${esc(r.signature)}</p>
      <div class="card__foot">
        ${heatMeter(r.heat)}
        ${priceTag(r.price)}
        <span class="status ${status.open ? "is-open" : ""}">${esc(status.text)}</span>
      </div>
      <div class="card__rate">${ratingLine(r.id)}</div>
    </article>`;
}

function render() {
  const list = getVisible();
  const groupKey = { category: (r) => CATEGORIES[r.category].label, town: (r) => r.town }[state.group];
  let html = "";
  if (groupKey) {
    list.sort((a, b) => groupKey(a).localeCompare(groupKey(b))); // stable: keeps the chosen sort inside groups
    let last;
    for (const r of list) {
      if (groupKey(r) !== last) html += `<h3 class="group__title">${esc((last = groupKey(r)))}</h3>`;
      html += cardHTML(r);
    }
  } else html = list.map(cardHTML).join("");
  els.grid.innerHTML = html;
  els.empty.hidden = list.length > 0;

  const parts = [];
  if (state.town) parts.push(`in ${state.town}`);
  if (state.q) parts.push(`matching "${state.q}"`);
  els.count.textContent = `${list.length} ${list.length === 1 ? "place" : "places"}${parts.length ? " " + parts.join(", ") : ""}`;

  els.savedToggle.setAttribute("aria-pressed", state.savedOnly);
  els.savedCount.textContent = state.saved.size;
  $("surprise").disabled = list.length === 0;
}

els.grid.addEventListener("click", (e) => {
  const heart = e.target.closest("[data-heart]");
  if (heart) return toggleSaved(heart.dataset.heart);
  const open = e.target.closest("[data-open]");
  if (open) openSheet(open.dataset.open);
});

function surpriseMe() {
  const list = getVisible();
  if (!list.length) return;
  const pick = list[Math.floor(Math.random() * list.length)];
  openSheet(pick.id);
}

/* ---------------- favourites ---------------- */

function loadSaved() {
  try {
    const raw = JSON.parse(localStorage.getItem("mt-saved") || "[]");
    if (Array.isArray(raw)) raw.forEach((id) => state.saved.add(id));
  } catch (e) {
    /* ignore: storage unavailable or corrupted */
  }
}

function toggleSaved(id) {
  const r = state.all.find((x) => x.id === id);
  if (!r) return;
  if (state.saved.has(id)) {
    state.saved.delete(id);
    toast(`Removed ${r.name} from saved`);
  } else {
    state.saved.add(id);
    toast(`Saved ${r.name}`);
  }
  try {
    localStorage.setItem("mt-saved", JSON.stringify([...state.saved]));
  } catch (e) {
    /* still works for this visit */
  }
  render();
  // keep the dialog's save button in sync if it is open
  const dialogBtn = els.sheetBody.querySelector("[data-save]");
  if (dialogBtn && dialogBtn.dataset.save === id) {
    dialogBtn.setAttribute("aria-pressed", state.saved.has(id));
    dialogBtn.textContent = state.saved.has(id) ? "Saved" : "Save this place";
  }
  // return focus to the same heart after the grid redraws
  const again = els.grid.querySelector(`[data-heart="${id}"]`);
  if (again && document.activeElement === document.body && !els.sheet.open) again.focus();
}

/* ---------------- detail dialog ---------------- */

function openSheet(id) {
  const r = state.all.find((x) => x.id === id);
  if (!r) return;
  const status = openStatus(r);
  const saved = state.saved.has(id);

  els.sheetBody.innerHTML = `
    <div class="sheet__top" data-cat="${r.category}">
      <p class="sheet__kind">${esc(CATEGORIES[r.category].label)}</p>
      <h2 id="sheetName">${esc(r.name)}</h2>
      <p>${esc(r.town)}, Pampanga</p>
    </div>
    <div class="sheet__main">
      <p class="sheet__sig">${esc(r.signature)}</p>
      <p>${esc(r.blurb)}</p>
      <dl class="facts">
        <div><dt>Heat</dt><dd>${heatMeter(r.heat)}</dd></div>
        <div><dt>Price</dt><dd>${priceTag(r.price)}</dd></div>
        <div><dt>Hours</dt><dd>${formatTime(r.open)} to ${formatTime(r.close)}</dd></div>
        <div><dt>Rating</dt><dd>${ratingLine(r.id)}</dd></div>
        <div><dt>Right now</dt><dd><span class="status ${status.open ? "is-open" : ""}">${esc(status.text)}</span></dd></div>
      </dl>
      <div>
        <h3>What to order</h3>
        <ul class="menu">
          ${r.dishes.map((d) => `<li><strong>${esc(d.name)}</strong><span>${esc(d.note)}</span></li>`).join("")}
        </ul>
      </div>
      <div class="sheet__actions">
        <button class="btn btn--leaf btn--save" type="button" data-save="${r.id}" aria-pressed="${saved}">${saved ? "Saved" : "Save this place"}</button>
        <button class="btn btn--outline" type="button" data-share="${r.id}">Copy name and town</button>
        <button class="btn btn--outline" type="button" data-edit="${r.id}">Edit</button>
        <button class="btn btn--danger" type="button" data-del="${r.id}">Delete</button>
      </div>
    </div>`;

  if (!els.sheet.open) els.sheet.showModal();
  els.sheet.scrollTop = 0;
}

els.sheetBody.addEventListener("click", (e) => {
  const save = e.target.closest("[data-save]");
  if (save) return toggleSaved(save.dataset.save);
  const edit = e.target.closest("[data-edit]");
  if (edit) return openForm(state.all.find((x) => x.id === edit.dataset.edit));
  const del = e.target.closest("[data-del]");
  if (del) return deleteRestaurant(del.dataset.del);
  const share = e.target.closest("[data-share]");
  if (share) {
    const r = state.all.find((x) => x.id === share.dataset.share);
    const text = `${r.name}, ${r.town}, Pampanga`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => toast("Copied to clipboard"),
        () => toast(text)
      );
    } else {
      toast(text);
    }
  }
});

// click on the backdrop closes the dialog
els.sheet.addEventListener("click", (e) => {
  if (e.target === els.sheet) els.sheet.close();
});


/* ---------------- ratings ---------------- */

async function loadRatings() {
  try {
    const [summary, top] = await Promise.all([
      request("GET", "/api/ratings/summary"),
      request("GET", "/api/ratings/top?limit=10"),
    ]);
    state.ratings = summary;
    renderTop(top);
  } catch (e) {
    renderTop([]); // ratings are optional: the page still works without them
  }
}

function renderTop(top) {
  const rows = top
    .map((t) => ({ ...t, r: state.all.find((x) => x.id === t.id) }))
    .filter((t) => t.r)
    .slice(0, 5);
  $("topList").innerHTML = rows.length
    ? rows
        .map(
          (t, i) => `
      <li>
        <button type="button" data-open-top="${esc(t.id)}">
          <span class="top__rank">${i + 1}</span>
          <span class="top__name">${esc(t.r.name)}<small>${esc(t.r.town)}</small></span>
          <span class="rating">${SVG.star}<b>${t.avg.toFixed(1)}</b><span class="rating__n">(${t.count})</span></span>
        </button>
      </li>`
        )
        .join("")
    : `<li class="top__empty">No ratings available yet.</li>`;
}

$("topList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-open-top]");
  if (b) openSheet(b.dataset.openTop);
});

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
  if (state.town && !state.all.some((r) => r.town === state.town)) state.town = "";
  if (state.category && !state.all.some((r) => r.category === state.category)) state.category = "";
  buildChips();
  render();
  loadRatings().then(render); // new restaurants get default ratings; deleted ones lose theirs
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
  }
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
  state.saved.delete(id);
  try { localStorage.setItem("mt-saved", JSON.stringify([...state.saved])); } catch (e) { /* ignore */ }
  els.sheet.close();
  refreshAfterChange();
  toast(`Deleted ${r.name}`);
}

function setupFormEvents() {
  $("fCategory").innerHTML = Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("");
  $("addBtn").addEventListener("click", () => openForm(null));
  $("group").addEventListener("change", (e) => {
    state.group = e.target.value;
    render();
  });
  $("restForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const dishes = $("fDishes").value.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [name, ...note] = l.split("|");
      return { name: name.trim(), note: note.join("|").trim() };
    });
    const body = {
      name: $("fName").value.trim(), town: $("fTown").value.trim(), category: $("fCategory").value,
      signature: $("fSignature").value.trim(), blurb: $("fBlurb").value.trim(),
      heat: Number($("fHeat").value), price: Number($("fPrice").value),
      open: $("fOpen").value, close: $("fClose").value, dishes,
    };
    $("formSubmit").disabled = true;
    try {
      const saved = editingId
        ? await request("PUT", `/api/restaurants/${encodeURIComponent(editingId)}`, body)
        : await request("POST", "/api/restaurants", body);
      state.all = editingId ? state.all.map((x) => (x.id === editingId ? saved : x)) : [...state.all, saved];
      $("formDialog").close();
      refreshAfterChange();
      if (els.sheet.open) openSheet(saved.id);
      toast(editingId ? `Updated ${saved.name}` : `Added ${saved.name}`);
    } catch (err) {
      $("formError").textContent = err.message;
    } finally {
      $("formSubmit").disabled = false;
    }
  });
}

/* ---------------- data + init ---------------- */

async function loadRestaurants() {
  // Prefer the API; fall back to the static file so the page also
  // works under a plain static server such as Live Server.
  for (const url of ["/api/restaurants", "data/restaurants.json"]) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) && data.length) return data;
    } catch (e) {
      /* try the next source */
    }
  }
  throw new Error("No restaurant data available");
}

async function init() {
  buildLantern();
  try {
    const mode = localStorage.getItem("mt-lights");
    if (mode) $("top").dataset.mode = mode;
  } catch (e) {
    /* default lights */
  }
  $("parul").addEventListener("click", cycleLights);
  $("lightsBtn").addEventListener("click", cycleLights);

  loadSaved();
  setupFilterEvents();
  setupFormEvents();

  try {
    state.all = await loadRestaurants();
  } catch (e) {
    els.grid.innerHTML = "";
    els.count.textContent = "";
    els.empty.hidden = false;
    els.empty.querySelector("h3").textContent = "The restaurant list did not load";
    els.empty.querySelector("p").textContent =
      "Start the server with npm start, or serve this folder from a local web server, then reload.";
    els.empty.querySelector("button").hidden = true;
    return;
  }

  await loadRatings();
  buildChips();
  buildDishes();
  render();
}

init();