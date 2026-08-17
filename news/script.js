const API_BASE_URL = "https://nukusps.uz";

// Keep the shared site navigation/header/footer behavior.
const sharedScript = document.createElement("script");
sharedScript.src = "../script.js";
document.head.appendChild(sharedScript);

function formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) return dateString;

    return new Intl.DateTimeFormat("uz-UZ", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(date);
}

function getMainImage(news) {
    return news.images?.find(image => image.is_main) || news.images?.[0] || null;
}

function getImageUrl(image) {
    if (!image) return "";
    if (image.url?.startsWith("http")) return image.url;
    return `${API_BASE_URL}${image.url}`;
}

function escapeHtml(value = "") {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
}

async function fetchNews() {
    const response = await fetch(`${API_BASE_URL}/news`, {
        headers: {
            Accept: "application/json"
        }
    });

    if (!response.ok) {
        throw new Error("Yangiliklarni yuklashda xatolik yuz berdi.");
    }

    return response.json();
}

function renderNewsCards(newsList) {
    const grid = document.querySelector(".news-grid");
    if (!grid) return;

    grid.innerHTML = "";

    if (!newsList.length) {
        grid.innerHTML = `
            <div class="news-empty">
                Hozircha yangiliklar mavjud emas.
            </div>
        `;
        return;
    }

    newsList.forEach(news => {
        const mainImage = getMainImage(news);
        const imageUrl = getImageUrl(mainImage);

        const card = document.createElement("article");
        card.className = "news-card";

        card.innerHTML = `
            <div class="news-image" ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ""}>
            </div>

            <div class="news-content">
                <div class="news-date">${escapeHtml(formatDate(news.date))}</div>

                <h3>${escapeHtml(news.title)}</h3>

                <p>${escapeHtml(news.short_description)}</p>

                <a href="detail.html?id=${encodeURIComponent(news.id)}" class="news-link">
                    Batafsil o‘qish →
                </a>
            </div>
        `;

        grid.appendChild(card);
    });
}

async function renderNewsIndex() {
    if (!document.querySelector(".news-page .news-grid")) return;

    const grid = document.querySelector(".news-page .news-grid");

    try {
        grid.innerHTML = `
            <div class="news-empty">Yangiliklar yuklanmoqda...</div>
        `;

        const newsList = await fetchNews();
        renderNewsCards(newsList);
    } catch (error) {
        console.error(error);
        grid.innerHTML = `
            <div class="news-empty">
                Yangiliklarni yuklab bo‘lmadi. Iltimos, keyinroq urinib ko‘ring.
            </div>
        `;
    }
}

function renderArticleParagraphs(content) {
    const article = document.querySelector(".article-content");
    if (!article) return;

    article.innerHTML = "";

    const paragraphs = String(content || "")
        .split(/\r?\n\s*\r?\n/)
        .map(text => text.trim())
        .filter(Boolean);

    if (!paragraphs.length) {
        article.innerHTML = "<p>Yangilik matni mavjud emas.</p>";
        return;
    }

    paragraphs.forEach((text, index) => {
        const p = document.createElement("p");
        p.textContent = text;
        if (index === 0) p.className = "lead";
        article.appendChild(p);
    });
}

async function renderNewsDetail() {
    const articleSection = document.querySelector(".article-section");
    if (!articleSection) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        window.location.href = "index.html";
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/news/${encodeURIComponent(id)}`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Yangilik topilmadi.");
        }

        const news = await response.json();
        const mainImage = getMainImage(news);
        const imageUrl = getImageUrl(mainImage);

        const title = document.querySelector(".detail-hero-content h1");
        const date = document.querySelector(".detail-meta span:first-child");
        const cover = document.querySelector(".article-cover");
        const category = document.querySelector(".detail-hero-content .news-category");

        if (title) title.textContent = news.title || "";

        if (date) {
            date.innerHTML = `
                <i class="fa-regular fa-calendar"></i>
                ${escapeHtml(formatDate(news.date))}
            `;
        }

        if (cover) {
            if (imageUrl) {
                cover.src = imageUrl;
                cover.alt = news.title || "Yangilik rasmi";
                cover.style.display = "block";
            } else {
                cover.style.display = "none";
            }
        }

        // Category is not stored in the current API, so don't show a fake value.
        if (category) category.remove();

        renderArticleParagraphs(news.content);

        document.title = `${news.title || "Yangilik"} — Nukus Prezident maktabi`;
    } catch (error) {
        console.error(error);

        const title = document.querySelector(".detail-hero-content h1");
        const article = document.querySelector(".article-content");

        if (title) title.textContent = "Yangilik topilmadi";
        if (article) {
            article.innerHTML = `
                <p>Ushbu yangilikni yuklab bo‘lmadi yoki u mavjud emas.</p>
                <p><a href="index.html">← Yangiliklarga qaytish</a></p>
            `;
        }
    }
}

renderNewsIndex();
renderNewsDetail();
