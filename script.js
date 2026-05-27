// Declared up here so setLang() can safely reference DATA before load() assigns it
let DATA = null;
let CATEGORY_FILTER = "all";

// Language state (shared with recipe pages)
const LANG_KEY = "recipe-lang";
function getLang() { return localStorage.getItem(LANG_KEY) || "en"; }
function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
  document.body.dataset.lang = lang;
  document.querySelectorAll(".lang-switch button").forEach((b) =>
    b.classList.toggle("active", b.dataset.langSet === lang)
  );
  // If on the index, re-render the recipe list and filter bar
  if (typeof renderList === "function" && DATA) {
    buildFilterBar();
    renderList();
  }
}

document.addEventListener("click", (e) => {
  const lang = e.target.closest("[data-lang-set]");
  if (lang) { setLang(lang.dataset.langSet); return; }
  const cat = e.target.closest("[data-cat]");
  if (cat) {
    CATEGORY_FILTER = cat.dataset.cat;
    buildFilterBar();
    renderList();
  }
});

// Apply on load (everywhere)
setLang(getLang());

// ─── Index page ───────────────────────────────

async function load() {
  const grid = document.getElementById("grid");
  if (!grid) return;            // skip on non-index pages
  try {
    const res = await fetch(`recipes.json?v=${Date.now()}`);
    DATA = await res.json();
    buildFilterBar();
    renderList();
  } catch (err) {
    grid.innerHTML = `<p class="loading">Could not load recipes.</p>`;
    console.error(err);
  } finally {
    grid.setAttribute("aria-busy", "false");
  }
}

const ALL_LABEL = { en: "All", pt: "Todas", de: "Alle" };

function categoryKey(cat) {
  if (!cat) return "";
  if (typeof cat === "string") return cat;
  return cat.en || cat.pt || cat.de || "";
}

function buildFilterBar() {
  const bar = document.getElementById("filter-bar");
  if (!bar || !DATA) return;
  const lang = getLang();
  // Collect unique categories in the order they first appear
  const seen = new Map();
  for (const r of DATA.recipes || []) {
    const key = categoryKey(r.category);
    if (key && !seen.has(key)) seen.set(key, r.category);
  }
  const all = `<button type="button" data-cat="all" class="${CATEGORY_FILTER === "all" ? "active" : ""}">${escape(ALL_LABEL[lang] || ALL_LABEL.en)}</button>`;
  const rest = Array.from(seen.entries()).map(([key, cat]) => {
    const label = pickLang(cat, lang);
    return `<button type="button" data-cat="${escapeAttr(key)}" class="${CATEGORY_FILTER === key ? "active" : ""}">${escape(label)}</button>`;
  });
  bar.innerHTML = [all, ...rest].join("");
}

const EMPTY_MSG = { en: "No recipes yet.", pt: "Sem receitas ainda.", de: "Noch keine Rezepte." };

function renderList() {
  const grid = document.getElementById("grid");
  if (!grid || !DATA) return;
  const lang = getLang();
  const recipes = (DATA.recipes || [])
    .filter((r) => CATEGORY_FILTER === "all" || categoryKey(r.category) === CATEGORY_FILTER)
    .slice()
    .sort((a, b) => pickLang(a.name, lang).localeCompare(pickLang(b.name, lang), lang));
  if (!recipes.length) {
    grid.innerHTML = `<p class="loading">${EMPTY_MSG[lang] || EMPTY_MSG.en}</p>`;
    return;
  }
  grid.innerHTML = recipes.map((r) => card(r, lang)).join("");
}

function pickLang(value, lang) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.en || value.pt || value.de || "";
}

function card(r, lang) {
  const href = `recipes/${escapeAttr(r.slug)}.html`;
  const name = pickLang(r.name, lang);
  const cat = pickLang(r.category, lang);
  const photo = r.image
    ? `<div class="photo"><img src="${escapeAttr(r.image)}" alt="${escapeAttr(name)}" loading="lazy" onerror="this.parentElement.classList.add('broken'); this.remove();" /></div>`
    : `<div class="photo broken"></div>`;
  const meta = [];
  if (cat) meta.push(cat);
  if (r.total_time) meta.push(r.total_time);
  return `
    <a class="recipe-card" href="${escapeAttr(href)}">
      ${photo}
      <div class="name">${escape(name)}</div>
      ${meta.length ? `<div class="meta">${meta.map(escape).join(" · ")}</div>` : ""}
    </a>
  `;
}

function escape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(s) { return escape(s); }

load();
