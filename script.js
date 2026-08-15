/* Shared portal navbar */
const navigation = document.getElementById("navigation");
const menuButton = document.getElementById("menuButton");

const isNewsPage = window.location.pathname.includes("/news/");
const root = isNewsPage ? "../" : "";
const currentPage = window.location.pathname.split("/").pop() || "index.html";

const primaryNav = [
    ["index.html", "Bosh sahifa", "index.html"],
    ["about.html", "Maktab haqida", "about.html"],
    ["education.html", "Ta'lim", "education.html"],
    ["admission.html", "Qabul", "admission.html"],
    ["news/index.html", "Yangiliklar", "news/index.html"],
    ["teachers.html", "O‘qituvchilar", "teachers.html"]
];

const moreNav = [
    ["announcements.html", "E'lonlar"],
    ["gallery.html", "Galereya"],
    ["alumni.html", "Bitiruvchilar"],
    ["calendar.html", "Kalendar"],
    ["statistics.html", "Statistika"],
    ["results.html", "Natijalar"],
    ["contact.html", "Kontakt"]
];

const normalizePage = (path) => path.replace(/^\.\//, "");

if (navigation) {
    const isActive = (target) => {
        if (target === "news/index.html") {
            return isNewsPage;
        }
        return normalizePage(target) === currentPage;
    };

    const primaryLinks = primaryNav.map(([target, label]) => `
        <a href="${root}${target}" class="nav-link${isActive(target) ? " active" : ""}">${label}</a>
    `).join("");

    const moreActive = moreNav.some(([target]) => normalizePage(target) === currentPage);

    const moreLinks = moreNav.map(([target, label]) => `
        <a href="${root}${target}" class="nav-more-link${normalizePage(target) === currentPage ? " active" : ""}">${label}</a>
    `).join("");

    navigation.innerHTML = `${primaryLinks}
        <div class="nav-more${moreActive ? " active" : ""}">
            <button type="button" class="nav-more-button" aria-expanded="false">Ko‘proq</button>
            <div class="nav-more-menu">${moreLinks}</div>
        </div>`;

    if (!document.getElementById("sharedNavbarStyles")) {
        const style = document.createElement("style");
        style.id = "sharedNavbarStyles";
        style.textContent = `
            .navigation { gap: 14px; flex: 1; justify-content: flex-end; min-width: 0; }
            .nav-link { font-size: 13px; white-space: nowrap; }
            .nav-more { position: relative; display: flex; align-items: center; }
            .nav-more-button { border: 0; background: transparent; color: var(--text); font: 600 13px Inter, sans-serif; padding: 31px 0; cursor: pointer; white-space: nowrap; }
            .nav-more-button::after { content: '⌄'; font-size: 12px; margin-left: 5px; color: var(--gold); }
            .nav-more.active .nav-more-button { color: var(--primary); }
            .nav-more-menu { position: absolute; right: 0; top: 100%; min-width: 210px; padding: 10px; background: #fff; border: 1px solid var(--border); box-shadow: 0 18px 40px rgba(18,43,68,.14); opacity: 0; visibility: hidden; transform: translateY(8px); transition: .2s ease; z-index: 20; }
            .nav-more:hover .nav-more-menu, .nav-more:focus-within .nav-more-menu, .nav-more.open .nav-more-menu { opacity: 1; visibility: visible; transform: translateY(0); }
            .nav-more-link { display: block; padding: 10px 12px; color: var(--text); font-size: 13px; font-weight: 600; border-radius: 6px; }
            .nav-more-link:hover, .nav-more-link.active { background: var(--light-blue); color: var(--primary); }
            .logo-icon { overflow: hidden; border: 0; background: #fff; }
            .logo-icon img { width: 46px; height: 46px; object-fit: contain; }
            .footer-logo .logo-icon { width: 50px; height: 50px; }
            @media (max-width: 1200px) {
                .navigation { gap: 10px; }
                .nav-link, .nav-more-button { font-size: 12px; }
            }
            @media (max-width: 980px) {
                .header-content { position: relative; }
                .navigation { position: absolute; left: 20px; right: 20px; top: 100%; display: none; flex-direction: column; align-items: stretch; gap: 0; background: #fff; border: 1px solid var(--border); box-shadow: 0 20px 40px rgba(18,43,68,.14); padding: 10px; }
                .navigation.show, .navigation.open { display: flex; }
                .nav-link { padding: 12px 14px; }
                .nav-more { display: block; }
                .nav-more-button { width: 100%; text-align: left; padding: 12px 14px; }
                .nav-more-menu { position: static; display: block; opacity: 1; visibility: visible; transform: none; box-shadow: none; border: 0; padding: 0 0 0 12px; min-width: 0; }
                .menu-button { display: flex; align-items: center; justify-content: center; }
            }
        `;
        document.head.appendChild(style);
    }

    const moreButton = navigation.querySelector(".nav-more-button");
    const more = navigation.querySelector(".nav-more");

    moreButton?.addEventListener("click", () => {
        const opened = more.classList.toggle("open");
        moreButton.setAttribute("aria-expanded", String(opened));
    });
}

if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
        navigation.classList.toggle("show");
        navigation.classList.toggle("open");
        menuButton.textContent = navigation.classList.contains("show") ? "✕" : "☰";
    });
}

navigation?.querySelectorAll(".nav-link, .nav-more-link").forEach((link) => {
    link.addEventListener("click", () => {
        navigation.classList.remove("show", "open");
        if (menuButton) menuButton.textContent = "☰";
    });
});

const counters = document.querySelectorAll(".counter");

const startCounter = (counter) => {
    const target = Number(counter.dataset.target);

    let current = 0;

    const increment = Math.max(1, Math.floor(target / 60));

    const updateCounter = () => {
        current += increment;

        if (current >= target) {
            counter.textContent = target;
            return;
        }

        counter.textContent = current;

        requestAnimationFrame(updateCounter);
    };

    updateCounter();
};

if ("IntersectionObserver" in window) {
    const counterObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    startCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.5
        }
    );

    counters.forEach((counter) => {
        counterObserver.observe(counter);
    });
}

const resultForm = document.getElementById("resultForm");
const applicationId = document.getElementById("applicationId");
const formMessage = document.getElementById("formMessage");

if (resultForm && applicationId && formMessage) {
  resultForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const value = applicationId.value.trim();

    if (!value) {
        formMessage.textContent =
            "Ariza yoki ruxsatnoma raqamini kiriting.";

        return;
    }

    formMessage.textContent =
        `"${value}" raqamli natija backend ulangandan keyin ko‘rsatiladi.`;
  });
}

const sheetStatus = document.getElementById("sheetStatus");
const sheetStatsGrid = document.getElementById("sheetStatsGrid");
const sheetResultsBody = document.getElementById("sheetResultsBody");

const googleSheetConfig = {
    id: "1H61o__fVhkTjwFBAh7cf3AMC9AFo5JEN1y_agPzveoI",
    gid: "540117896"
};

const fallbackSheetResults = [
    {
        year: "2020-2021",
        name: "Babaniyazov Nizamatdin Miratdin o'g'li",
        ielts: "7.5",
        sat: "-"
    },
    {
        year: "2020-2021",
        name: "Bobojonova Firdavs Ravshanbek qizi",
        ielts: "7",
        sat: "-"
    },
    {
        year: "2022-2023",
        name: "Ktaybekova Zulfiya Laziz qizi",
        ielts: "8.5",
        sat: "-"
    }
];

const parseCsvLine = (line) => {
    const values = [];
    let value = "";
    let insideQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const character = line[index];
        const nextCharacter = line[index + 1];

        if (character === '"' && insideQuotes && nextCharacter === '"') {
            value += '"';
            index += 1;
        } else if (character === '"') {
            insideQuotes = !insideQuotes;
        } else if (character === "," && !insideQuotes) {
            values.push(value.trim());
            value = "";
        } else {
            value += character;
        }
    }

    values.push(value.trim());

    return values;
};

const parseSheetResults = (csv) => {
    const rows = csv
        .split(/\r?\n/)
        .map(parseCsvLine)
        .filter((row) => row.some(Boolean));

    let currentYear = "";

    return rows.reduce((results, row) => {
        const firstCell = row[0] || "";
        const secondCell = row[1] || "";
        const thirdCell = row[2] || "";
        const fourthCell = row[3] || "";
        const yearMatch = firstCell.match(/20\d{2}\s*-\s*20\d{2}/);

        if (yearMatch) {
            currentYear = yearMatch[0].replace(/\s+/g, "");
            return results;
        }

        if (!/^\d+$/.test(firstCell) || !secondCell || secondCell === "F.I.Sh") {
            return results;
        }

        results.push({
            year: currentYear || "-",
            name: secondCell,
            ielts: thirdCell || "-",
            sat: fourthCell || "-"
        });

        return results;
    }, []);
};

const getNumericScores = (results, key) => results
    .map((result) => Number(String(result[key]).replace(",", ".")))
    .filter((score) => Number.isFinite(score) && score > 0);

const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const renderSheetStats = (results) => {
    const ieltsScores = getNumericScores(results, "ielts");
    const satScores = getNumericScores(results, "sat");
    const years = new Set(results.map((result) => result.year).filter(Boolean));
    const averageIelts = ieltsScores.length
        ? (ieltsScores.reduce((sum, score) => sum + score, 0) / ieltsScores.length).toFixed(2)
        : "-";
    const maxIelts = ieltsScores.length ? Math.max(...ieltsScores).toFixed(1) : "-";
    const maxSat = satScores.length ? Math.max(...satScores) : "-";

    sheetStatsGrid.innerHTML = [
        [results.length, "Jami bitiruvchilar"],
        [averageIelts, "O‘rtacha IELTS"],
        [maxIelts, "Eng yuqori IELTS"],
        [maxSat, "Eng yuqori SAT"],
        [years.size, "O‘quv yillari"]
    ].map(([value, label]) => `
        <article class="sheet-stat-card">
          <strong>${value}</strong>
          <span>${label}</span>
        </article>
    `).join("");
};

const renderSheetResults = (results) => {
    sheetResultsBody.innerHTML = results.map((result) => `
        <tr>
          <td>${escapeHtml(result.year)}</td>
          <td>${escapeHtml(result.name)}</td>
          <td>${escapeHtml(result.ielts)}</td>
          <td>${escapeHtml(result.sat)}</td>
        </tr>
    `).join("");

    renderSheetStats(results);
};

const loadSheetResults = async () => {
    if (!sheetStatus || !sheetStatsGrid || !sheetResultsBody) {
        return;
    }

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${googleSheetConfig.id}/gviz/tq?tqx=out:csv&gid=${googleSheetConfig.gid}`;

    try {
        const response = await fetch(sheetUrl);

        if (!response.ok) {
            throw new Error("Google Sheet javob bermadi.");
        }

        const csv = await response.text();
        const results = parseSheetResults(csv);

        if (!results.length) {
            throw new Error("Google Sheet ichidan mos natijalar topilmadi.");
        }

        renderSheetResults(results);
        sheetStatus.textContent = `${results.length} ta natija Google Sheet’dan yuklandi.`;
    } catch (error) {
        renderSheetResults(fallbackSheetResults);
        sheetStatus.textContent =
            "Google Sheet hozir yuklanmadi. Namuna ma’lumotlar ko‘rsatilmoqda.";
    }
};

loadSheetResults();
