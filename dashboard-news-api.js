(() => {
  const API_BASE_URL = window.NEWS_API_BASE_URL || "https://nukuspm.uz/api";

  const form = document.getElementById("newsForm");
  const imageInput = document.getElementById("newsImages");
  const imageGrid = document.getElementById("newsImagesGrid");
  const dropzone = document.getElementById("imageDropzone");
  const chooseImages = document.getElementById("chooseImages");
  const imageCount = document.getElementById("imageCount");
  const tableBody = document.getElementById("newsTableBody");
  const saveButton = document.getElementById("saveNewsButton");
  const cancelEditButton = document.getElementById("cancelEditButton");
  const editingId = document.getElementById("editingNewsId");
  const formTitle = document.getElementById("formTitle");
  const formEyebrow = document.getElementById("formEyebrow");
  const formModeBadge = document.getElementById("formModeBadge");
  const featuredCard = document.getElementById("featuredNewsCard");

  if (!form || !imageInput || !imageGrid || !tableBody) return;

  let newsItems = [];
  let activeFilter = "all";
  let selectedFiles = [];
  let remoteImages = [];
  let mainImageIndex = 0;
  let isSaving = false;
  let dragIndex = null;

  const status = document.createElement("p");
  status.className = "news-api-status";
  status.setAttribute("role", "status");
  form.querySelector(".form-actions")?.before(status);

  chooseImages?.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", event => {
    addFiles(Array.from(event.target.files || []));
    imageInput.value = "";
  });

  ["dragenter", "dragover"].forEach(type => {
    dropzone?.addEventListener(type, event => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach(type => {
    dropzone?.addEventListener(type, event => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
    });
  });

  dropzone?.addEventListener("drop", event => {
    addFiles(Array.from(event.dataTransfer?.files || []).filter(file => file.type.startsWith("image/")));
  });

  imageGrid.addEventListener("click", event => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;

    const action = actionButton.dataset.action;
    const index = Number(actionButton.dataset.index);
    if (Number.isNaN(index)) return;

    if (action === "remove") {
      const [removed] = selectedFiles.splice(index - remoteImages.length, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      mainImageIndex = Math.max(0, Math.min(mainImageIndex, remoteImages.length + selectedFiles.length - 1));
      renderImages();
    }

    if (action === "main") {
      mainImageIndex = index;
      renderImages();
    }
  });

  imageGrid.addEventListener("dragstart", event => {
    const card = event.target.closest(".news-image-item");
    if (!card) return;
    dragIndex = Number(card.dataset.index);
    card.classList.add("is-sorting");
  });

  imageGrid.addEventListener("dragend", event => {
    const card = event.target.closest(".news-image-item");
    card?.classList.remove("is-sorting");
    dragIndex = null;
    imageGrid.querySelectorAll(".news-image-item").forEach(item => item.classList.remove("drag-over"));
  });

  imageGrid.addEventListener("dragover", event => {
    event.preventDefault();
    const card = event.target.closest(".news-image-item");
    if (card) card.classList.add("drag-over");
  });

  imageGrid.addEventListener("dragleave", event => {
    event.target.closest(".news-image-item")?.classList.remove("drag-over");
  });

  imageGrid.addEventListener("drop", event => {
    event.preventDefault();
    const target = event.target.closest(".news-image-item");
    if (!target || dragIndex === null) return;

    const to = Number(target.dataset.index);
    if (Number.isNaN(to) || to === dragIndex) return;

    const allImages = getDisplayImages();
    const [moved] = allImages.splice(dragIndex, 1);
    allImages.splice(to, 0, moved);

    remoteImages = allImages.filter(item => item.type === "remote");
    selectedFiles = allImages.filter(item => item.type === "file").map(item => item.fileData);
    mainImageIndex = Math.max(0, allImages.findIndex(item => item.wasMain));
    renderImages();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (isSaving) return;
    const id = editingId.value.trim();
    await saveNews(id || null);
  });

  cancelEditButton?.addEventListener("click", () => resetForm());

  document.querySelectorAll(".filter-button[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter || "all";
      document.querySelectorAll(".filter-button[data-filter]").forEach(item => item.classList.toggle("active", item === button));
      renderNewsTable();
    });
  });

  loadNews();

  async function loadNews() {
    tableBody.innerHTML = '<tr><td colspan="6">Yangiliklar yuklanmoqda...</td></tr>';

    try {
      const response = await fetch(`${API_BASE_URL}/news`, { headers: { Accept: "application/json" } });
      const result = await parseResponse(response);
      if (!response.ok) throw new Error(getApiError(result, "Yangiliklarni yuklashda xatolik yuz berdi."));

      newsItems = normalizeList(result);
      renderNewsTable();
      updateStats();
      renderFeatured();
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="6">${escapeHtml(error.message || "API bilan bog‘lanib bo‘lmadi.")}</td></tr>`;
      setStatus(error.message || "Yangiliklarni yuklashda xatolik.", true);
    }
  }

  async function saveNews(id) {
    const title = document.getElementById("newsTitle")?.value.trim();
    const newsDate = document.getElementById("newsDate")?.value;
    const shortDescription = document.getElementById("newsShortDescription")?.value.trim();
    const content = document.getElementById("newsContent")?.value.trim();

    if (!title || !newsDate || !shortDescription || !content) {
      setStatus("Barcha matn maydonlarini to‘ldiring.", true);
      return;
    }

    if (!id && !selectedFiles.length) {
      setStatus("Yangi yangilik uchun kamida bitta rasm yuklang.", true);
      return;
    }

    const data = new FormData();
    data.append("title", title);
    data.append("short_description", shortDescription);
    data.append("content", content);
    data.append("news_date", newsDate);

    if (selectedFiles.length) {
      data.append("main_image_index", String(Math.max(0, mainImageIndex - remoteImages.length)));
      selectedFiles.forEach(item => data.append("images", item.file || item));
    }

    isSaving = true;
    setButtonsDisabled(true);
    setStatus(id ? "Yangilik tahrirlanmoqda..." : "Yangilik saqlanmoqda...", false);

    try {
      const response = await fetch(`${API_BASE_URL}/news${id ? `/${encodeURIComponent(id)}` : ""}`, {
        method: id ? "PUT" : "POST",
        body: data,
      });

      const result = await parseResponse(response);
      if (!response.ok) throw new Error(getApiError(result, id ? "Yangilikni tahrirlashda xatolik yuz berdi." : "Yangilikni saqlashda xatolik yuz berdi."));

      setStatus(id ? "Yangilik muvaffaqiyatli yangilandi." : `Yangilik muvaffaqiyatli saqlandi. ID: ${result?.id ?? "—"}`, false);
      resetForm();
      await loadNews();
    } catch (error) {
      setStatus(error.message || "API bilan bog‘lanib bo‘lmadi.", true);
    } finally {
      isSaving = false;
      setButtonsDisabled(false);
    }
  }

  async function editNews(id) {
    setStatus("Yangilik ma’lumotlari yuklanmoqda...", false);

    try {
      const response = await fetch(`${API_BASE_URL}/news/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" } });
      const result = await parseResponse(response);
      if (!response.ok) throw new Error(getApiError(result, "Yangilikni olishda xatolik yuz berdi."));

      const item = normalizeNewsItem(result);
      document.getElementById("newsTitle").value = item.title;
      document.getElementById("newsDate").value = toInputDate(item.news_date || item.date);
      document.getElementById("newsShortDescription").value = item.short_description;
      document.getElementById("newsContent").value = item.content;
      editingId.value = item.id;

      remoteImages = extractImages(result).map((url, index) => ({ type: "remote", url, wasMain: index === item.main_image_index }));
      selectedFiles.forEach(file => file.url && URL.revokeObjectURL(file.url));
      selectedFiles = [];
      mainImageIndex = Math.max(0, remoteImages.findIndex(item => item.wasMain));
      if (mainImageIndex < 0) mainImageIndex = 0;
      renderImages();
      setEditMode(true);
      document.getElementById("create-news")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setStatus("Yangilik tahrirlash uchun ochildi.", false);
    } catch (error) {
      setStatus(error.message || "Yangilikni ochib bo‘lmadi.", true);
    }
  }

  async function deleteNews(id, title) {
    const confirmed = window.confirm(`“${title || "Ushbu yangilik"}”ni o‘chirishni tasdiqlaysizmi?\n\nBu amalni ortga qaytarib bo‘lmaydi.`);
    if (!confirmed) return;

    setStatus("Yangilik o‘chirilmoqda...", false);

    try {
      const response = await fetch(`${API_BASE_URL}/news/${encodeURIComponent(id)}`, { method: "DELETE", headers: { Accept: "application/json" } });
      const result = await parseResponse(response);
      if (!response.ok) throw new Error(getApiError(result, "Yangilikni o‘chirishda xatolik yuz berdi."));

      if (editingId.value === String(id)) resetForm();
      setStatus("Yangilik muvaffaqiyatli o‘chirildi.", false);
      await loadNews();
    } catch (error) {
      setStatus(error.message || "Yangilikni o‘chirib bo‘lmadi.", true);
    }
  }

  function renderNewsTable() {
    const filtered = newsItems.filter(item => activeFilter === "all" || item.status === activeFilter);

    if (!filtered.length) {
      tableBody.innerHTML = '<tr><td colspan="6">Bu bo‘limda yangilik topilmadi.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered.map(item => `
      <tr>
        <td>${escapeHtml(item.title || "Nomsiz yangilik")}</td>
        <td>${escapeHtml(item.category || "—")}</td>
        <td>${escapeHtml(formatDate(item.news_date || item.date))}</td>
        <td><span class="status-pill ${item.status === "draft" ? "draft" : "published"}">${item.status === "draft" ? "Qoralama" : "Chop etilgan"}</span></td>
        <td>${escapeHtml(formatViews(item.views))}</td>
        <td>
          <div class="news-row-actions">
            <button type="button" class="table-action" data-action="edit" data-id="${escapeHtml(item.id)}"><i class="fa-solid fa-pen"></i> Tahrirlash</button>
            <button type="button" class="table-action table-action-delete" data-action="delete" data-id="${escapeHtml(item.id)}" data-title="${escapeHtml(item.title)}"><i class="fa-solid fa-trash"></i> O‘chirish</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  tableBody.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const id = button.dataset.id;
    if (!id) return;

    if (button.dataset.action === "edit") editNews(id);
    if (button.dataset.action === "delete") deleteNews(id, button.dataset.title || "");
  });

  function renderFeatured() {
    if (!featuredCard) return;
    const item = newsItems.find(news => news.featured) || newsItems.find(news => news.status !== "draft") || newsItems[0];
    if (!item) return;

    const image = extractImages(item)[0];
    const imageBlock = featuredCard.querySelector(".featured-news-image");
    if (imageBlock && image) imageBlock.style.backgroundImage = `url("${escapeCssUrl(image)}")`;

    featuredCard.querySelector(".news-category").textContent = item.category || "Yangilik";
    featuredCard.querySelector(".news-date").textContent = formatDate(item.news_date || item.date);
    featuredCard.querySelector("h3").textContent = item.title || "Nomsiz yangilik";
    featuredCard.querySelector("p").textContent = item.short_description || "";
  }

  function updateStats() {
    document.getElementById("totalNewsStat")?.replaceChildren(document.createTextNode(String(newsItems.length)));
    document.getElementById("draftStat")?.replaceChildren(document.createTextNode(String(newsItems.filter(item => item.status === "draft").length)));
    document.getElementById("featuredStat")?.replaceChildren(document.createTextNode(String(newsItems.filter(item => item.featured).length)));

    const views = newsItems.reduce((sum, item) => sum + (Number(item.views) || 0), 0);
    document.getElementById("viewsStat")?.replaceChildren(document.createTextNode(views ? formatViews(views) : "—"));
  }

  function addFiles(files) {
    files.filter(file => file.type.startsWith("image/")).forEach(file => {
      selectedFiles.push({ type: "file", file, url: URL.createObjectURL(file), wasMain: false });
    });

    if (!remoteImages.length && selectedFiles.length === 1) mainImageIndex = 0;
    renderImages();
  }

  function renderImages() {
    const all = getDisplayImages();
    imageGrid.innerHTML = all.map((image, index) => {
      const isMain = index === mainImageIndex;
      const src = image.url;
      const removeButton = image.type === "file"
        ? `<button type="button" class="remove-image-button" data-action="remove" data-index="${index}" title="Rasmni o‘chirish"><i class="fa-solid fa-xmark"></i></button>`
        : "";

      return `<article class="news-image-item" draggable="true" data-index="${index}">
        <div class="news-image-preview">
          <img src="${escapeHtml(src)}" alt="Yangilik rasmi ${index + 1}">
          ${isMain ? '<span class="main-image-badge"><i class="fa-solid fa-star"></i> Asosiy</span>' : ""}
          ${removeButton}
        </div>
        <div class="news-image-item-footer">
          <span class="image-number">Rasm ${index + 1}</span>
          <button type="button" class="set-main-button ${isMain ? "is-main" : ""}" data-action="main" data-index="${index}" ${isMain ? "disabled" : ""}>
            <i class="fa-solid fa-star"></i> ${isMain ? "Asosiy rasm" : "Asosiy qilish"}
          </button>
        </div>
      </article>`;
    }).join("");

    imageCount.textContent = `${all.length} ta rasm`;
  }

  function getDisplayImages() {
    return [
      ...remoteImages,
      ...selectedFiles.map(file => ({ type: "file", fileData: file, url: file.url, wasMain: false })),
    ];
  }

  function resetForm() {
    form.reset();
    editingId.value = "";
    selectedFiles.forEach(file => file.url && URL.revokeObjectURL(file.url));
    selectedFiles = [];
    remoteImages = [];
    mainImageIndex = 0;
    renderImages();
    setEditMode(false);
  }

  function setEditMode(editing) {
    formEyebrow.textContent = editing ? "Yangilikni tahrirlash" : "Yangi maqola";
    formTitle.textContent = editing ? "Yangilikni tahrirlash" : "Yangilik qo‘shish";
    formModeBadge.textContent = editing ? "Tahrirlash" : "Yangi";
    saveButton.textContent = editing ? "Yangilash" : "Chop etish";
    cancelEditButton.hidden = !editing;
  }

  function setButtonsDisabled(disabled) {
    form.querySelectorAll("button").forEach(button => {
      button.disabled = disabled;
    });
  }

  function setStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
    status.classList.toggle("is-success", !isError);
  }

  async function parseResponse(response) {
    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return { detail: text }; }
  }

  function getApiError(result, fallback) {
    if (!result) return fallback;
    if (typeof result.detail === "string") return result.detail;
    if (Array.isArray(result.detail)) return result.detail.map(item => item.msg || item.message).join(", ");
    return result.message || result.error || fallback;
  }

  function normalizeList(result) {
    const list = Array.isArray(result) ? result : (result?.items || result?.news || result?.data || []);
    return Array.isArray(list) ? list.map(normalizeNewsItem) : [];
  }

  function normalizeNewsItem(item) {
    const id = item?.id ?? item?._id ?? item?.news_id ?? "";
    const statusValue = String(item?.status || item?.state || "published").toLowerCase();
    const status = ["draft", "qoralama"].includes(statusValue) ? "draft" : "published";

    return {
      ...item,
      id: String(id),
      title: item?.title || item?.name || "",
      short_description: item?.short_description || item?.description || item?.summary || "",
      content: item?.content || item?.full_content || item?.body || "",
      news_date: item?.news_date || item?.date || item?.published_at || "",
      category: item?.category || item?.category_name || "—",
      status,
      views: item?.views ?? item?.view_count ?? 0,
      featured: Boolean(item?.featured ?? item?.is_featured ?? item?.on_homepage ?? false),
      main_image_index: Number(item?.main_image_index ?? item?.main_image ?? 0) || 0,
    };
  }

  function extractImages(item) {
    const images = item?.images || item?.image_urls || item?.photos || [];
    if (Array.isArray(images)) {
      return images.map(image => typeof image === "string" ? image : (image?.url || image?.image_url || image?.path || "")).filter(Boolean).map(resolveImageUrl);
    }
    const single = item?.main_image_url || item?.image_url || item?.image;
    return single ? [resolveImageUrl(single)] : [];
  }

  function resolveImageUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_BASE_URL.replace(/\/$/, "")}/${String(url).replace(/^\//, "")}`;
  }

  function toInputDate(value) {
    if (!value) return "";
    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }

  function formatDate(value) {
    const input = toInputDate(value);
    if (!input) return "—";
    const date = new Date(`${input}T00:00:00`);
    return new Intl.DateTimeFormat("uz-UZ", { day: "numeric", month: "long", year: "numeric" }).format(date);
  }

  function formatViews(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return new Intl.NumberFormat("uz-UZ").format(number);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function escapeCssUrl(value) {
    return String(value).replace(/([\\"()])/g, "\\$1");
  }
})();
