(() => {
  // cPanel Node.js app / production News API.
  const API_BASE_URL = window.NEWS_API_BASE_URL || "https://nukusps.uz";

  const form = document.getElementById("newsForm");
  const imageInput = document.getElementById("newsImages");
  const imageGrid = document.getElementById("newsImagesGrid");
  const dropzone = document.getElementById("imageDropzone");
  const chooseImages = document.getElementById("chooseImages");
  const imageCount = document.getElementById("imageCount");
  const tableBody = document.getElementById("newsTableBody");
  const saveButton = document.getElementById("saveNewsButton");
  const cancelButton = document.getElementById("cancelEditButton");
  const editingId = document.getElementById("editingNewsId");
  const formTitle = document.getElementById("formTitle");
  const formEyebrow = document.getElementById("formEyebrow");
  const formModeBadge = document.getElementById("formModeBadge");
  const featuredCard = document.getElementById("featuredNewsCard");

  if (!form || !imageInput || !imageGrid || !tableBody) return;

  let newsItems = [];
  let selectedFiles = [];
  let remoteImages = [];
  let mainImageIndex = 0;
  let activeFilter = "all";
  let saving = false;
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

  ["dragenter", "dragover"].forEach(type => dropzone?.addEventListener(type, event => {
    event.preventDefault();
    dropzone.classList.add("is-dragging");
  }));

  ["dragleave", "drop"].forEach(type => dropzone?.addEventListener(type, event => {
    event.preventDefault();
    dropzone.classList.remove("is-dragging");
  }));

  dropzone?.addEventListener("drop", event => {
    addFiles(Array.from(event.dataTransfer?.files || []).filter(file => file.type.startsWith("image/")));
  });

  imageGrid.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const index = Number(button.dataset.index);
    if (!Number.isInteger(index)) return;

    if (button.dataset.action === "main") {
      mainImageIndex = index;
      renderImages();
      return;
    }

    if (button.dataset.action === "remove") {
      if (index < remoteImages.length) {
        setStatus("Mavjud rasmni o‘chirish uchun yangilikni yangi rasmlar bilan almashtiring.", true);
        return;
      }

      const fileIndex = index - remoteImages.length;
      const [removed] = selectedFiles.splice(fileIndex, 1);
      if (removed?.url) URL.revokeObjectURL(removed.url);
      mainImageIndex = Math.min(mainImageIndex, Math.max(0, remoteImages.length + selectedFiles.length - 1));
      renderImages();
    }
  });

  imageGrid.addEventListener("dragstart", event => {
    const card = event.target.closest(".news-image-item");
    if (!card) return;
    dragIndex = Number(card.dataset.index);
    card.classList.add("is-sorting");
  });

  imageGrid.addEventListener("dragover", event => {
    event.preventDefault();
    event.target.closest(".news-image-item")?.classList.add("drag-over");
  });

  imageGrid.addEventListener("dragleave", event => {
    event.target.closest(".news-image-item")?.classList.remove("drag-over");
  });

  imageGrid.addEventListener("dragend", event => {
    event.target.closest(".news-image-item")?.classList.remove("is-sorting");
    imageGrid.querySelectorAll(".news-image-item").forEach(card => card.classList.remove("drag-over"));
    dragIndex = null;
  });

  imageGrid.addEventListener("drop", event => {
    event.preventDefault();
    const target = event.target.closest(".news-image-item");
    if (!target || dragIndex === null) return;

    const to = Number(target.dataset.index);
    if (!Number.isInteger(to) || to === dragIndex) return;

    const all = getDisplayImages();
    const [moved] = all.splice(dragIndex, 1);
    all.splice(to, 0, moved);

    remoteImages = all.filter(item => item.type === "remote");
    selectedFiles = all.filter(item => item.type === "file").map(item => item.fileData);
    mainImageIndex = to;
    renderImages();
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!saving) saveNews(editingId.value.trim() || null);
  });

  cancelButton?.addEventListener("click", resetForm);

  document.querySelectorAll(".filter-button[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter || "all";
      document.querySelectorAll(".filter-button[data-filter]").forEach(item => item.classList.toggle("active", item === button));
      renderNewsTable();
    });
  });

  tableBody.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    if (!id) return;

    if (button.dataset.action === "edit") editNews(id);
    if (button.dataset.action === "delete") deleteNews(id, button.dataset.title || "");
  });

  loadNews();

  async function loadNews() {
    tableBody.innerHTML = '<tr><td colspan="6">Yangiliklar yuklanmoqda...</td></tr>';

    try {
      const response = await fetch(`${API_BASE_URL}/news`, { headers: { Accept: "application/json" } });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(apiError(data, "Yangiliklarni yuklashda xatolik yuz berdi."));

      newsItems = Array.isArray(data) ? data.map(normalizeNews) : [];
      renderNewsTable();
      updateStats();
      renderFeatured();
      setStatus("", false);
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="6">${escapeHtml(error.message || "API bilan bog‘lanib bo‘lmadi.")}</td></tr>`;
      setStatus(error.message || "API bilan bog‘lanib bo‘lmadi.", true);
    }
  }

  async function saveNews(id) {
    const title = document.getElementById("newsTitle")?.value.trim();
    const date = document.getElementById("newsDate")?.value;
    const shortDescription = document.getElementById("newsShortDescription")?.value.trim();
    const content = document.getElementById("newsContent")?.value.trim();

    if (!title || !date || !shortDescription || !content) {
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
    data.append("news_date", date);

    if (selectedFiles.length) {
      data.append("main_image_index", String(Math.max(0, mainImageIndex - remoteImages.length)));
      selectedFiles.forEach(item => data.append("images", item.file || item));
    }

    saving = true;
    setButtonsDisabled(true);
    setStatus(id ? "Yangilik tahrirlanmoqda..." : "Yangilik saqlanmoqda...", false);

    try {
      const response = await fetch(`${API_BASE_URL}/news${id ? `/${encodeURIComponent(id)}` : ""}`, {
        method: id ? "PUT" : "POST",
        body: data,
      });
      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(apiError(result, id ? "Yangilikni tahrirlashda xatolik yuz berdi." : "Yangilikni saqlashda xatolik yuz berdi."));
      }

      setStatus(id ? "Yangilik muvaffaqiyatli yangilandi." : "Yangilik muvaffaqiyatli saqlandi.", false);
      resetForm();
      await loadNews();
    } catch (error) {
      setStatus(error.message || "API bilan bog‘lanib bo‘lmadi.", true);
    } finally {
      saving = false;
      setButtonsDisabled(false);
    }
  }

  async function editNews(id) {
    setStatus("Yangilik yuklanmoqda...", false);

    try {
      const response = await fetch(`${API_BASE_URL}/news/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" } });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(apiError(data, "Yangilikni olishda xatolik yuz berdi."));

      const item = normalizeNews(data);
      document.getElementById("newsTitle").value = item.title;
      document.getElementById("newsDate").value = String(item.date || "").slice(0, 10);
      document.getElementById("newsShortDescription").value = item.short_description;
      document.getElementById("newsContent").value = item.content;
      editingId.value = item.id;

      remoteImages = (Array.isArray(data.images) ? data.images : []).map((image, index) => ({
        type: "remote",
        url: resolveImageUrl(image.url || image.filename || ""),
        wasMain: Boolean(image.is_main) || index === item.mainImageIndex,
      })).filter(image => image.url);

      selectedFiles.forEach(file => file.url && URL.revokeObjectURL(file.url));
      selectedFiles = [];
      mainImageIndex = Math.max(0, remoteImages.findIndex(image => image.wasMain));
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
    if (!window.confirm(`“${title || "Ushbu yangilik"}”ni o‘chirishni tasdiqlaysizmi?\n\nBu amalni ortga qaytarib bo‘lmaydi.`)) return;

    setStatus("Yangilik o‘chirilmoqda...", false);

    try {
      const response = await fetch(`${API_BASE_URL}/news/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(apiError(result, "Yangilikni o‘chirishda xatolik yuz berdi."));

      if (editingId.value === String(id)) resetForm();
      setStatus("Yangilik muvaffaqiyatli o‘chirildi.", false);
      await loadNews();
    } catch (error) {
      setStatus(error.message || "Yangilikni o‘chirib bo‘lmadi.", true);
    }
  }

  function renderNewsTable() {
    const list = newsItems.filter(item => activeFilter === "all" || item.status === activeFilter);

    if (!list.length) {
      tableBody.innerHTML = '<tr><td colspan="6">Bu bo‘limda yangilik topilmadi.</td></tr>';
      return;
    }

    tableBody.innerHTML = list.map(item => `
      <tr>
        <td>${escapeHtml(item.title || "Nomsiz yangilik")}</td>
        <td>${escapeHtml(item.category || "—")}</td>
        <td>${escapeHtml(formatDate(item.date))}</td>
        <td><span class="status-pill published">Chop etilgan</span></td>
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

  function renderFeatured() {
    if (!featuredCard || !newsItems.length) return;
    const item = newsItems[0];
    const images = Array.isArray(item.images) ? item.images : [];
    const main = images.find(image => image.is_main) || images[0];
    const imageBlock = featuredCard.querySelector(".featured-news-image");

    if (imageBlock && main?.url) {
      imageBlock.style.backgroundImage = `url("${escapeCssUrl(resolveImageUrl(main.url))}")`;
    }

    featuredCard.querySelector(".news-category").textContent = "Yangilik";
    featuredCard.querySelector(".news-date").textContent = formatDate(item.date);
    featuredCard.querySelector("h3").textContent = item.title;
    featuredCard.querySelector("p").textContent = item.short_description;
  }

  function updateStats() {
    document.getElementById("totalNewsStat")?.replaceChildren(document.createTextNode(String(newsItems.length)));
    document.getElementById("draftStat")?.replaceChildren(document.createTextNode("0"));
    document.getElementById("featuredStat")?.replaceChildren(document.createTextNode(newsItems.length ? "1" : "0"));
    document.getElementById("viewsStat")?.replaceChildren(document.createTextNode("—"));
  }

  function addFiles(files) {
    files.filter(file => file.type.startsWith("image/")).forEach(file => {
      selectedFiles.push({ file, url: URL.createObjectURL(file) });
    });

    if (!remoteImages.length && selectedFiles.length === 1) mainImageIndex = 0;
    renderImages();
  }

  function renderImages() {
    const all = getDisplayImages();
    imageGrid.innerHTML = all.map((image, index) => {
      const isMain = index === mainImageIndex;
      const removeButton = image.type === "file"
        ? `<button type="button" class="remove-image-button" data-action="remove" data-index="${index}" title="Rasmni o‘chirish"><i class="fa-solid fa-xmark"></i></button>`
        : "";

      return `<article class="news-image-item" draggable="true" data-index="${index}">
        <div class="news-image-preview">
          <img src="${escapeHtml(image.url)}" alt="Yangilik rasmi ${index + 1}">
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

    if (imageCount) imageCount.textContent = `${all.length} ta rasm`;
  }

  function getDisplayImages() {
    return [
      ...remoteImages,
      ...selectedFiles.map(item => ({ type: "file", fileData: item, url: item.url })),
    ];
  }

  function resetForm() {
    form.reset();
    editingId.value = "";
    selectedFiles.forEach(item => item.url && URL.revokeObjectURL(item.url));
    selectedFiles = [];
    remoteImages = [];
    mainImageIndex = 0;
    renderImages();
    setEditMode(false);
  }

  function setEditMode(editing) {
    if (formEyebrow) formEyebrow.textContent = editing ? "Kontentni yangilash" : "Yangi maqola";
    if (formTitle) formTitle.textContent = editing ? "Yangilikni tahrirlash" : "Yangilik qo‘shish";
    if (formModeBadge) formModeBadge.textContent = editing ? "Tahrirlash" : "Yangi";
    if (saveButton) saveButton.textContent = editing ? "Yangilash" : "Chop etish";
    if (cancelButton) cancelButton.hidden = !editing;
  }

  function setButtonsDisabled(disabled) {
    saveButton && (saveButton.disabled = disabled);
    chooseImages && (chooseImages.disabled = disabled);
  }

  function setStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
    status.classList.toggle("is-success", Boolean(message) && !isError);
  }

  async function readResponse(response) {
    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return { detail: text }; }
  }

  function apiError(data, fallback) {
    return data?.detail || data?.message || data?.error || fallback;
  }

  function normalizeNews(item) {
    return {
      ...item,
      id: String(item?.id ?? ""),
      title: item?.title || "",
      short_description: item?.short_description || "",
      content: item?.content || "",
      date: item?.date || item?.news_date || "",
      images: Array.isArray(item?.images) ? item.images : [],
      category: item?.category || "—",
      views: item?.views || 0,
      mainImageIndex: Math.max(0, (item?.images || []).findIndex(image => image.is_main)),
      status: item?.status || "published",
    };
  }

  function resolveImageUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_BASE_URL.replace(/\/$/, "")}/${String(url).replace(/^\//, "")}`;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "long", year: "numeric" }).format(date);
  }

  function formatViews(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number.toLocaleString("uz-UZ") : "—";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char]));
  }

  function escapeCssUrl(value) {
    return String(value).replace(/[\\\"()]/g, "\\$&");
  }
})();
