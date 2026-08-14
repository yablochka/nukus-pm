(() => {
  const API_BASE_URL = window.NEWS_API_BASE_URL || "http://127.0.0.1:8000";

  const form = document.getElementById("newsForm");
  const imageInput = document.getElementById("newsImages");
  const imageGrid = document.getElementById("newsImagesGrid");

  if (!form || !imageInput || !imageGrid) return;

  // The uploader resets input.value after every selection, so keep the actual
  // File objects separately. Capture phase lets us see files before the
  // existing uploader clears the input.
  let selectedFiles = [];

  imageInput.addEventListener("change", (event) => {
    selectedFiles.push(...Array.from(event.target.files));
  }, true);

  const dropzone = document.getElementById("imageDropzone");
  dropzone?.addEventListener("drop", (event) => {
    selectedFiles.push(...Array.from(event.dataTransfer.files).filter(file => file.type.startsWith("image/")));
  }, true);

  const status = document.createElement("p");
  status.className = "news-api-status";
  status.setAttribute("role", "status");
  form.querySelector(".form-actions")?.before(status);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createNews();
  });

  form.querySelectorAll(".form-actions button").forEach(button => {
    button.addEventListener("click", async () => {
      await createNews();
    });
  });

  async function createNews() {
    const fields = form.querySelectorAll("input, textarea");
    const title = fields[0]?.value.trim();
    const newsDate = form.querySelector('input[type="date"]')?.value;
    const shortDescription = form.querySelectorAll("textarea")[0]?.value.trim();
    const content = form.querySelectorAll("textarea")[1]?.value.trim();

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
      form.reset();
      selectedFiles = [];
    } catch (error) {
      setStatus(error.message || "API bilan bog‘lanib bo‘lmadi.", true);
    } finally {
      setButtonsDisabled(false);
    }
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
