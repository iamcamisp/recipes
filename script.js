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
  // If on the index, re-render the recipe list
  if (typeof renderList === "function" && DATA) renderList();
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-lang-set]");
  if (t) setLang(t.dataset.langSet);
});

// Apply on load (everywhere)
setLang(getLang());

// ─── Index page ───────────────────────────────

let DATA = null;

async function load() {
  const grid = document.getElementById("grid");
  if (!grid) return;            // skip on non-index pages
  try {
    const res = await fetch(`recipes.json?v=${Date.now()}`);
    DATA = await res.json();
    renderList();
  } catch (err) {
    grid.innerHTML = `<p class="loading">Could not load recipes.</p>`;
    console.error(err);
  } finally {
    grid.setAttribute("aria-busy", "false");
  }
}

const EMPTY_MSG = { en: "No recipes yet.", pt: "Sem receitas ainda.", de: "Noch keine Rezepte." };

function renderList() {
  const grid = document.getElementById("grid");
  if (!grid || !DATA) return;
  const lang = getLang();
  const recipes = (DATA.recipes || [])
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
