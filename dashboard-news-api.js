(() => {
  // Production News API.
  // Override this global before loading this script if the backend URL changes.
  const API_BASE_URL = window.NEWS_API_BASE_URL || "https://nukusps.uz";

  const form = document.getElementById("newsForm");
  const imageInput = document.getElementById("newsImages");
  const imageGrid = document.getElementById("newsImagesGrid");

  if (!form || !imageInput || !imageGrid) return;

  let selectedFiles = [];

  imageInput.addEventListener("change", (event) => {
    selectedFiles.push(...Array.from(event.target.files));
  }, true);

  const dropzone = document.getElementById("imageDropzone");
  dropzone?.addEventListener("drop", (event) => {
    selectedFiles.push(
      ...Array.from(event.dataTransfer.files).filter(file => file.type.startsWith("image/"))
    );
  }, true);

  imageGrid.addEventListener("click", (event) => {
    const removeButton = event.target.closest('[data-action="remove"]');
    if (!removeButton) return;

    const card = removeButton.closest(".news-image-item");
    if (!card) return;

    const index = Array.from(imageGrid.children).indexOf(card);
    if (index >= 0) selectedFiles.splice(index, 1);
  }, true);

  imageGrid.addEventListener("drop", (event) => {
    const dragged = imageGrid.querySelector('[data-dragged="true"]');
    const target = event.target.closest?.(".news-image-item");

    if (!dragged || !target || dragged === target) return;

    const from = Array.from(imageGrid.children).indexOf(dragged);
    const to = Array.from(imageGrid.children).indexOf(target);

    if (from < 0 || to < 0) return;

    const [moved] = selectedFiles.splice(from, 1);
    selectedFiles.splice(to, 0, moved);
  }, true);

  const status = document.createElement("p");
  status.className = "news-api-status";
  status.setAttribute("role", "status");
  form.querySelector(".form-actions")?.before(status);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createNews();
  });

  async function createNews() {
    const title = form.querySelector('input[type="text"]')?.value.trim();
    const newsDate = form.querySelector('input[type="date"]')?.value;
    const textareas = form.querySelectorAll("textarea");
    const shortDescription = textareas[0]?.value.trim();
    const content = textareas[1]?.value.trim();

    if (!title || !newsDate || !shortDescription || !content) {
      setStatus("Barcha matn maydonlarini to‘ldiring.", true);
      return;
    }

    if (!selectedFiles.length) {
      setStatus("Kamida bitta rasm yuklang.", true);
      return;
    }

    const cards = Array.from(imageGrid.querySelectorAll(".news-image-item"));
    const mainIndex = cards.findIndex(card => card.querySelector(".main-image-badge"));
    const safeMainIndex = mainIndex >= 0 ? mainIndex : 0;

    const data = new FormData();
    data.append("title", title);
    data.append("short_description", shortDescription);
    data.append("content", content);
    data.append("news_date", newsDate);
    data.append("main_image_index", String(safeMainIndex));

    selectedFiles.forEach(file => data.append("images", file));

    setStatus("Yangilik saqlanmoqda...", false);
    setButtonsDisabled(true);

    try {
      const response = await fetch(`${API_BASE_URL}/news`, {
        method: "POST",
        body: data,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.detail || "Yangilikni saqlashda xatolik yuz berdi.");
      }

      setStatus(`Yangilik muvaffaqiyatli saqlandi. ID: ${result.id}`, false);
      clearUploader();
      form.reset();
    } catch (error) {
      setStatus(error.message || "API bilan bog‘lanib bo‘lmadi.", true);
    } finally {
      setButtonsDisabled(false);
    }
  }

  function clearUploader() {
    imageGrid
      .querySelectorAll('[data-action="remove"]')
      .forEach(button => button.click());

    selectedFiles = [];
    imageInput.value = "";
  }

  function setStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
    status.classList.toggle("is-success", !isError);
  }

  function setButtonsDisabled(disabled) {
    form.querySelectorAll(".form-actions button").forEach(button => {
      button.disabled = disabled;
    });
  }
})();
