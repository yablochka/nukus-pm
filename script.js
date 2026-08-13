const menuButton = document.getElementById("menuButton");
const navigation = document.getElementById("navigation");
const navLinks = document.querySelectorAll(".nav-link");

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    navigation.classList.toggle("show");

    if (navigation.classList.contains("show")) {
        menuButton.textContent = "✕";
    } else {
        menuButton.textContent = "☰";
    }
  });
}


navLinks.forEach((link) => {
    link.addEventListener("click", () => {
        if (navigation && menuButton) {
            navigation.classList.remove("show");
            menuButton.textContent = "☰";
        }

        navLinks.forEach((item) => {
            item.classList.remove("active");
        });

        link.classList.add("active");
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
