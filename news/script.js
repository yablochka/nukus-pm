const API_BASE_URL = "https://nukusps.uz/api/news";
const NEWS_COLLECTION_URL = API_BASE_URL;

const sharedScript = document.createElement("script");
sharedScript.src = "../script.js";
document.head.appendChild(sharedScript);

function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("uz-UZ", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function getMainImage(news) {
    return news.images?.find(image => image.is_main) || news.images?.[0] || null;
}

function getImageUrl(image) {
    if (!image) return "";
    if (image.url?.startsWith("http")) return image.url;
    return `${API_BASE_URL}${image.url}`;
}

function escapeNewsHtml(value = "") {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
}

async function fetchNews() {
    const response = await fetch(NEWS_COLLECTION_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Yangiliklarni yuklashda xatolik yuz berdi.");
    return response.json();
}

function renderNewsCards(newsList) {
    const grid = document.querySelector(".news-grid");
    if (!grid) return;
    grid.innerHTML = "";
    if (!newsList.length) {
        grid.innerHTML = `<div class="news-empty">Hozircha yangiliklar mavjud emas.</div>`;
        return;
    }
    newsList.forEach(news => {
        const imageUrl = getImageUrl(getMainImage(news));
        const card = document.createElement("article");
        card.className = "news-card";
        card.innerHTML = `
            <div class="news-image" ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ""}></div>
            <div class="news-content">
                <div class="news-date">${escapeNewsHtml(formatDate(news.date))}</div>
                <h3>${escapeNewsHtml(news.title)}</h3>
                <p>${escapeNewsHtml(news.short_description)}</p>
                <a href="detail.html?id=${encodeURIComponent(news.id)}" class="news-link">Batafsil o‘qish →</a>
            </div>`;
        grid.appendChild(card);
    });
}

async function renderNewsIndex() {
    if (!document.querySelector(".news-page .news-grid")) return;
    const grid = document.querySelector(".news-page .news-grid");
    try {
        grid.innerHTML = `<div class="news-empty">Yangiliklar yuklanmoqda...</div>`;
        renderNewsCards(await fetchNews());
    } catch (error) {
        console.error(error);
        grid.innerHTML = `<div class="news-empty">Yangiliklarni yuklab bo‘lmadi. Iltimos, keyinroq urinib ko‘ring.</div>`;
    }
}

function renderArticleParagraphs(content) {
    const article = document.querySelector(".article-content");
    if (!article) return;
    article.innerHTML = "";
    const paragraphs = String(content || "").split(/\r?\n\s*\r?\n/).map(text => text.trim()).filter(Boolean);
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

function renderArticleGallery(images, title) {
    const gallery = document.querySelector(".article-gallery");
    if (!gallery) return;

    gallery.innerHTML = "";
    const validImages = Array.isArray(images) ? images.filter(Boolean) : [];

    if (!validImages.length) {
        gallery.style.display = "none";
        return;
    }

    validImages.forEach((image, index) => {
        const imageUrl = getImageUrl(image);
        if (!imageUrl) return;

        const figure = document.createElement("figure");
        figure.className = `article-gallery-item${image.is_main ? " is-main" : ""}`;

        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = `${title || "Yangilik rasmi"} — ${index + 1}`;
        img.loading = index === 0 ? "eager" : "lazy";

        figure.appendChild(img);
        gallery.appendChild(figure);
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
        const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("Yangilik topilmadi.");

        const news = await response.json();
        const title = document.querySelector(".detail-hero-content h1");
        const date = document.querySelector(".detail-meta span:first-child");
        const category = document.querySelector(".detail-hero-content .news-category");

        if (title) title.textContent = news.title || "";
        if (date) {
            date.innerHTML = `<i class="fa-regular fa-calendar"></i> ${escapeNewsHtml(formatDate(news.date))}`;
        }
        if (category) category.remove();

        renderArticleGallery(news.images, news.title);
        renderArticleParagraphs(news.content);
        document.title = `${news.title || "Yangilik"} — Nukus Prezident maktabi`;
    } catch (error) {
        console.error(error);
        const title = document.querySelector(".detail-hero-content h1");
        const article = document.querySelector(".article-content");
        if (title) title.textContent = "Yangilik topilmadi";
        if (article) article.innerHTML = `<p>Ushbu yangilikni yuklab bo‘lmadi yoki u mavjud emas.</p><p><a href="index.html">← Yangiliklarga qaytish</a></p>`;
    }
}

renderNewsIndex();
renderNewsDetail();
