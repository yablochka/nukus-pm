/* Shared public-site navigation + existing counters/results integration. Dashboard is not affected. */
const navigation = document.getElementById("navigation");
const menuButton = document.getElementById("menuButton");

const path = window.location.pathname.replace(/\\/g, "/");
const isNewsPage = path.includes("/news/");
const root = isNewsPage ? "../" : "";
const currentPage = path.split("/").pop() || "index.html";

const navGroups = [
  { label: "Maktab", links: [["about.html", "Maktab haqida"], ["education.html", "Ta'lim"], ["teachers.html", "O‘qituvchilar"], ["calendar.html", "Akademik kalendar"]] },
  { label: "Natijalar", links: [["results.html", "Qabul natijalari"], ["statistics.html", "Akademik natijalar"]] },
  { label: "Yangiliklar", links: [["news/index.html", "Barcha yangiliklar"], ["gallery.html", "Fotogalereya"], ["announcements.html", "E'lonlar"], ["alumni.html", "Bitiruvchilar"]] }
];
const directNav = [["admission.html", "Qabul"], ["teachers.html", "O‘qituvchilar"], ["statistics.html", "Statistika"]];
const normalizePage = (target) => target.replace(/^\.\//, "");
const isTargetActive = (target) => target === "news/index.html" ? isNewsPage : normalizePage(target) === currentPage;
const groupIsActive = (group) => group.links.some(([target]) => isTargetActive(target));

if (navigation) {
  const groupMarkup = navGroups.map((group) => {
    const links = group.links.map(([target, label]) => `<a href="${root}${target}" class="nav-dropdown-link${isTargetActive(target) ? " active" : ""}">${label}</a>`).join("");
    return `<div class="nav-dropdown${groupIsActive(group) ? " active" : ""}"><button type="button" class="nav-dropdown-button" aria-expanded="false">${group.label}</button><div class="nav-dropdown-menu">${links}</div></div>`;
  }).join("");
  const directMarkup = directNav.map(([target, label]) => `<a href="${root}${target}" class="nav-link${isTargetActive(target) ? " active" : ""}">${label}</a>`).join("");
  navigation.innerHTML = `${groupMarkup}${directMarkup}`;
  navigation.querySelectorAll(".nav-dropdown-button").forEach((button) => button.addEventListener("click", () => {
    const dropdown = button.closest(".nav-dropdown");
    const opened = dropdown.classList.toggle("open");
    button.setAttribute("aria-expanded", String(opened));
    navigation.querySelectorAll(".nav-dropdown").forEach((other) => { if (other !== dropdown) other.classList.remove("open"); });
  }));
}
if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    navigation.classList.toggle("show");
    navigation.classList.toggle("open");
    menuButton.textContent = navigation.classList.contains("show") ? "✕" : "☰";
  });
}
navigation?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  navigation.classList.remove("show", "open");
  if (menuButton) menuButton.textContent = "☰";
}));

const counters = document.querySelectorAll(".counter");
const startCounter = (counter) => {
  const target = Number(counter.dataset.target); let current = 0;
  const increment = Math.max(1, Math.floor(target / 60));
  const update = () => { current += increment; if (current >= target) { counter.textContent = target; return; } counter.textContent = current; requestAnimationFrame(update); };
  update();
};
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries, instance) => entries.forEach((entry) => { if (entry.isIntersecting) { startCounter(entry.target); instance.unobserve(entry.target); } }), { threshold: 0.5 });
  counters.forEach((counter) => observer.observe(counter));
}

const resultForm = document.getElementById("resultForm");
const applicationId = document.getElementById("applicationId");
const formMessage = document.getElementById("formMessage");
if (resultForm && applicationId && formMessage) resultForm.addEventListener("submit", (event) => {
  event.preventDefault(); const value = applicationId.value.trim();
  formMessage.textContent = value ? `"${value}" raqamli natija backend ulangandan keyin ko‘rsatiladi.` : "Ariza yoki ruxsatnoma raqamini kiriting.";
});

const sheetStatus = document.getElementById("sheetStatus");
const sheetStatsGrid = document.getElementById("sheetStatsGrid");
const sheetResultsBody = document.getElementById("sheetResultsBody");
const googleSheetConfig = { id: "1H61o__fVhkTjwFBAh7cf3AMC9AFo5JEN1y_agPzveoI", gid: "540117896" };
const fallbackSheetResults = [
  { year: "2020-2021", name: "Babaniyazov Nizamatdin Miratdin o‘g‘li", ielts: "7.5", sat: "-" },
  { year: "2020-2021", name: "Bobojonova Firdavs Ravshanbek qizi", ielts: "7", sat: "-" },
  { year: "2022-2023", name: "Ktaybekova Zulfiya Laziz qizi", ielts: "8.5", sat: "-" }
];
const parseCsvLine = (line) => {
  const values = []; let value = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index], next = line[index + 1];
    if (character === '"' && quoted && next === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { values.push(value.trim()); value = ""; }
    else value += character;
  }
  values.push(value.trim()); return values;
};
const parseSheetResults = (csv) => {
  const rows = csv.split(/\r?\n/).map(parseCsvLine).filter((row) => row.some(Boolean)); let currentYear = "";
  return rows.reduce((results, row) => {
    const [first = "", second = "", third = "", fourth = ""] = row; const yearMatch = first.match(/20\d{2}\s*-\s*20\d{2}/);
    if (yearMatch) { currentYear = yearMatch[0].replace(/\s+/g, ""); return results; }
    if (!/^\d+$/.test(first) || !second || second === "F.I.Sh") return results;
    results.push({ year: currentYear || "-", name: second, ielts: third || "-", sat: fourth || "-" }); return results;
  }, []);
};
const getNumericScores = (results, key) => results.map((result) => Number(String(result[key]).replace(",", "."))).filter((score) => Number.isFinite(score) && score > 0);
const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const renderSheetStats = (results) => {
  if (!sheetStatsGrid) return; const ielts = getNumericScores(results, "ielts"); const sat = getNumericScores(results, "sat"); const years = new Set(results.map((result) => result.year).filter(Boolean));
  const average = ielts.length ? (ielts.reduce((sum, score) => sum + score, 0) / ielts.length).toFixed(2) : "-";
  const maxIelts = ielts.length ? Math.max(...ielts).toFixed(1) : "-"; const maxSat = sat.length ? Math.max(...sat) : "-";
  sheetStatsGrid.innerHTML = [[results.length, "Jami bitiruvchilar"], [average, "O‘rtacha IELTS"], [maxIelts, "Eng yuqori IELTS"], [maxSat, "Eng yuqori SAT"], [years.size, "O‘quv yillari"]].map(([value, label]) => `<article class="sheet-stat-card"><strong>${value}</strong><span>${label}</span></article>`).join("");
};
const renderSheetResults = (results) => { if (!sheetResultsBody) return; sheetResultsBody.innerHTML = results.map((result) => `<tr><td>${escapeHtml(result.year)}</td><td>${escapeHtml(result.name)}</td><td>${escapeHtml(result.ielts)}</td><td>${escapeHtml(result.sat)}</td></tr>`).join(""); renderSheetStats(results); };
const loadSheetResults = async () => {
  if (!sheetStatus || !sheetStatsGrid || !sheetResultsBody) return;
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${googleSheetConfig.id}/gviz/tq?tqx=out:csv&gid=${googleSheetConfig.gid}`;
  try { const response = await fetch(sheetUrl); if (!response.ok) throw new Error(); const results = parseSheetResults(await response.text()); if (!results.length) throw new Error(); renderSheetResults(results); sheetStatus.textContent = `${results.length} ta natija Google Sheet’dan yuklandi.`; }
  catch (error) { renderSheetResults(fallbackSheetResults); sheetStatus.textContent = "Google Sheet hozir yuklanmadi. Namuna ma’lumotlar ko‘rsatilmoqda."; }
};
loadSheetResults();

/* Accessibility + utility icon polish — public pages only. */
(() => {
  if (document.body?.classList.contains("dashboard-body") || document.getElementById("accessibilityPanel")) return;
  const host = document.querySelector(".languages");
  if (!host) return;

  const style = document.createElement("style");
  style.textContent = `
    .languages::before{display:none!important}
    .languages{display:flex!important;align-items:center!important;gap:6px!important}
    .site-social-links{display:flex;align-items:center;gap:6px}
    .utility-icon,.accessibility-toggle{width:40px!important;height:40px!important;min-width:40px!important;padding:0!important;border:0!important;border-radius:8px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;background:rgba(255,255,255,.10)!important;color:#fff!important;box-shadow:none!important;transform:none!important;transition:background .18s ease,transform .18s ease!important;text-decoration:none!important;cursor:pointer!important}
    .utility-icon:hover,.accessibility-toggle:hover,.accessibility-toggle[aria-expanded="true"]{background:rgba(255,255,255,.18)!important;transform:translateY(-1px)!important}
    .utility-icon i,.accessibility-toggle i{font-size:15px!important;line-height:1!important}
    .header .logo{width:96px!important;height:96px!important;top:-32px!important}
    .header .logo-icon{width:96px!important;height:96px!important;padding:0!important;border:0!important;border-radius:50%!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}
    .header .logo-icon img{width:100%!important;height:100%!important;object-fit:contain!important;filter:none!important}
    .footer .logo-icon{background:transparent!important;border:0!important;box-shadow:none!important}
    .footer .logo-icon img{filter:none!important}
    @media(max-width:980px){.site-social-links{gap:5px}.utility-icon,.accessibility-toggle{width:38px!important;height:38px!important;min-width:38px!important}.header .logo{width:88px!important;height:88px!important;top:-28px!important}.header .logo-icon{width:88px!important;height:88px!important}}
    @media(max-width:620px){.site-social-links{display:none}.utility-icon,.accessibility-toggle{width:38px!important;height:38px!important;min-width:38px!important}.header .logo{width:78px!important;height:78px!important;top:-22px!important}.header .logo-icon{width:78px!important;height:78px!important}}
  `;
  document.head.appendChild(style);

  const social = document.createElement("div");
  social.className = "site-social-links";
  social.setAttribute("aria-label", "Ijtimoiy tarmoqlar");
  social.innerHTML = `
    <a class="utility-icon" href="#" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
    <a class="utility-icon" href="#" aria-label="Telegram"><i class="fa-brands fa-telegram"></i></a>
    <a class="utility-icon" href="#" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
    <a class="utility-icon" href="#" aria-label="YouTube"><i class="fa-brands fa-youtube"></i></a>`;
  host.prepend(social);

  const searchButton = document.createElement("button");
  searchButton.type = "button";
  searchButton.className = "utility-icon utility-search";
  searchButton.setAttribute("aria-label", "Qidiruv");
  searchButton.innerHTML = '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>';
  host.insertBefore(searchButton, host.querySelector(".language"));

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "accessibility-toggle";
  toggle.setAttribute("aria-label", "Maxsus imkoniyatlar");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = '<i class="fa-solid fa-eye" aria-hidden="true"></i>';
  host.insertBefore(toggle, host.querySelector(".language"));

  const panel = document.createElement("aside");
  panel.id = "accessibilityPanel";
  panel.className = "accessibility-panel";
  panel.setAttribute("aria-label", "Maxsus imkoniyatlar");
  panel.innerHTML = `
    <div class="accessibility-panel-header">
      <strong class="accessibility-panel-title">Maxsus imkoniyatlar</strong>
      <button type="button" class="accessibility-close" aria-label="Yopish">×</button>
    </div>
    <div class="accessibility-control">
      <span class="accessibility-label">Matn hajmi</span>
      <div class="accessibility-font-controls">
        <button type="button" data-size="small">A−</button>
        <button type="button" data-size="normal" class="active">A</button>
        <button type="button" data-size="large">A+</button>
      </div>
    </div>
    <div class="accessibility-control">
      <button type="button" class="accessibility-action" data-action="contrast"><i class="fa-solid fa-circle-half-stroke"></i><span>Yuqori kontrast</span></button>
      <button type="button" class="accessibility-action" data-action="reset"><i class="fa-solid fa-rotate-left"></i><span>Standart holat</span></button>
    </div>`;
  document.body.appendChild(panel);

  const rootEl = document.documentElement;
  const storedSize = localStorage.getItem("nukus-a11y-size") || "normal";
  const storedContrast = localStorage.getItem("nukus-a11y-contrast") === "1";
  const applySize = (size) => {
    rootEl.classList.remove("a11y-large", "a11y-xlarge");
    if (size === "large") rootEl.classList.add("a11y-large");
    if (size === "xlarge") rootEl.classList.add("a11y-xlarge");
    panel.querySelectorAll("[data-size]").forEach((button) => button.classList.toggle("active", button.dataset.size === size || (size === "xlarge" && button.dataset.size === "large")));
    localStorage.setItem("nukus-a11y-size", size);
  };
  const applyContrast = (enabled) => {
    document.body.classList.toggle("a11y-contrast", enabled);
    panel.querySelector('[data-action="contrast"]')?.classList.toggle("active", enabled);
    localStorage.setItem("nukus-a11y-contrast", enabled ? "1" : "0");
  };
  applySize(storedSize); applyContrast(storedContrast);
  toggle.addEventListener("click", () => { const open = panel.classList.toggle("open"); toggle.setAttribute("aria-expanded", String(open)); });
  panel.querySelector(".accessibility-close")?.addEventListener("click", () => { panel.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); });
  panel.querySelectorAll("[data-size]").forEach((button) => button.addEventListener("click", () => applySize(button.dataset.size)));
  panel.querySelector('[data-action="contrast"]')?.addEventListener("click", () => applyContrast(!document.body.classList.contains("a11y-contrast")));
  panel.querySelector('[data-action="reset"]')?.addEventListener("click", () => { applySize("normal"); applyContrast(false); });
  document.addEventListener("click", (event) => { if (!panel.contains(event.target) && !toggle.contains(event.target)) { panel.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); } });
})();