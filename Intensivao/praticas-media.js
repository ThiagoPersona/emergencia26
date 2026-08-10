(function(root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TemePracticeMedia = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(root) {
  "use strict";

  const MEDIA_TYPES = new Set(["image", "video", "comparison"]);
  const REQUIRED_FIELDS = [
    "id",
    "examAlt",
    "reviewAlt",
    "reviewCaption",
    "credit",
    "sourceUrl",
    "license",
    "licenseUrl",
    "modified"
  ];

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function isLocalPath(value) {
    return isNonEmptyString(value) && !/^(?:https?:|\/\/|data:)/i.test(value.trim());
  }

  function isHttpsUrl(value) {
    return isNonEmptyString(value) && /^https:\/\/\S+$/i.test(value.trim());
  }

  function getManifestMedia(manifest) {
    if (Array.isArray(manifest)) return manifest;
    if (manifest && typeof manifest === "object" && Array.isArray(manifest.media)) return manifest.media;
    return null;
  }

  function validateMediaManifest(manifest) {
    const media = getManifestMedia(manifest);
    const errors = [];
    if (!media) return { valid: false, errors: ["manifest deve ser um array ou conter media"], media: [] };

    const ids = new Set();
    media.forEach((item, index) => {
      const prefix = `media[${index}]`;
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        errors.push(`${prefix} deve ser um objeto`);
        return;
      }

      REQUIRED_FIELDS.forEach((field) => {
        if (!isNonEmptyString(item[field])) errors.push(`${prefix}.${field} obrigatorio`);
      });
      if (ids.has(item.id)) errors.push(`${prefix}.id duplicado`);
      if (isNonEmptyString(item.id)) ids.add(item.id);
      if (!MEDIA_TYPES.has(item.type)) errors.push(`${prefix}.type invalido`);
      if (isNonEmptyString(item.examAlt) && item.examAlt === item.reviewAlt) {
        errors.push(`${prefix}.reviewAlt deve ser diferente de examAlt`);
      }
      if (!isHttpsUrl(item.sourceUrl)) errors.push(`${prefix}.sourceUrl deve usar https`);
      if (!isHttpsUrl(item.licenseUrl)) errors.push(`${prefix}.licenseUrl deve usar https`);

      ["src", "thumbnail", "poster"].forEach((field) => {
        if (item[field] !== undefined && !isLocalPath(item[field])) {
          errors.push(`${prefix}.${field} deve ser caminho local`);
        }
      });

      if (item.type === "image") {
        ["src", "thumbnail"].forEach((field) => {
          if (!isLocalPath(item[field])) errors.push(`${prefix}.${field} obrigatorio`);
        });
      }
      if (item.type === "video") {
        ["src", "poster", "thumbnail"].forEach((field) => {
          if (!isLocalPath(item[field])) errors.push(`${prefix}.${field} obrigatorio`);
        });
      }
      if (item.type === "comparison" &&
          (!Array.isArray(item.items) || item.items.length !== 2 ||
            !item.items.every(isNonEmptyString) || item.items[0] === item.items[1])) {
        errors.push(`${prefix}.items deve conter dois ids distintos`);
      }
    });

    return { valid: errors.length === 0, errors, media };
  }

  function collectStationMedia(station, manifest) {
    const manifestMedia = getManifestMedia(manifest) || [];
    const byId = new Map(manifestMedia
      .filter((item) => item && typeof item === "object" && isNonEmptyString(item.id))
      .map((item) => [item.id, item]));
    const media = [];
    const missingIds = [];
    const visited = new Set();
    const missing = new Set();

    function include(id) {
      if (!isNonEmptyString(id) || visited.has(id)) return;
      const item = byId.get(id);
      if (!item) {
        if (!missing.has(id)) {
          missing.add(id);
          missingIds.push(id);
        }
        return;
      }
      visited.add(id);
      media.push(item);
      if (item.type === "comparison" && Array.isArray(item.items)) item.items.forEach(include);
    }

    const phases = station && Array.isArray(station.phases) ? station.phases : [];
    phases.forEach((phase) => {
      if (phase && Array.isArray(phase.media)) phase.media.forEach(include);
    });

    return { media, missingIds };
  }

  function defaultImageLoader(item) {
    return new Promise((resolve, reject) => {
      if (!root || typeof root.Image !== "function") {
        reject(new Error("Image indisponivel neste ambiente"));
        return;
      }
      const image = new root.Image();
      image.onload = () => resolve(item);
      image.onerror = () => reject(new Error(`Falha ao carregar imagem: ${item.id}`));
      image.src = item.src;
    });
  }

  function defaultVideoLoader(item) {
    return new Promise((resolve, reject) => {
      if (!root || !root.document || typeof root.document.createElement !== "function") {
        reject(new Error("Video indisponivel neste ambiente"));
        return;
      }
      const video = root.document.createElement("video");
      const finish = (callback) => {
        video.removeEventListener("loadeddata", onLoad);
        video.removeEventListener("error", onError);
        callback();
      };
      const onLoad = () => finish(() => resolve(item));
      const onError = () => finish(() => reject(new Error(`Falha ao carregar video: ${item.id}`)));
      video.preload = "metadata";
      video.muted = true;
      video.src = item.src;
      video.addEventListener("loadeddata", onLoad, { once: true });
      video.addEventListener("error", onError, { once: true });
      if (typeof video.load === "function") video.load();
    });
  }

  async function preloadStationMedia(media, loaders) {
    const list = Array.isArray(media) ? media.filter((item) => item && typeof item === "object") : [];
    const byId = new Map(list.filter((item) => isNonEmptyString(item.id)).map((item) => [item.id, item]));
    const loaded = [];
    const failures = [];
    const loading = new Map();
    const loadImage = loaders && typeof loaders.image === "function" ? loaders.image : defaultImageLoader;
    const loadVideo = loaders && typeof loaders.video === "function" ? loaders.video : defaultVideoLoader;

    function recordLoaded(item) {
      if (!loaded.includes(item)) loaded.push(item);
    }

    function recordFailure(item, error) {
      if (!failures.some((failure) => failure.item === item)) failures.push({ item, error });
    }

    async function loadItem(item) {
      if (loading.has(item.id)) return loading.get(item.id);
      const pending = (async () => {
        try {
          if (item.type === "comparison") {
            const dependencies = Array.isArray(item.items) ? item.items : [];
            await Promise.all(dependencies.map((id) => {
              const dependency = byId.get(id);
              if (!dependency) return Promise.reject(new Error(`Midia ausente: ${id}`));
              return loadItem(dependency);
            }));
          } else if (item.type === "video") {
            await loadVideo(item);
          } else {
            await loadImage(item);
          }
          recordLoaded(item);
        } catch (error) {
          recordFailure(item, error instanceof Error ? error : new Error(String(error)));
        }
      })();
      loading.set(item.id, pending);
      return pending;
    }

    await Promise.all(list.map(loadItem));
    return { loaded, failures };
  }

  function appendText(parent, tagName, className, value) {
    const element = root.document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = value;
    parent.appendChild(element);
    return element;
  }

  function createIconButton(label, symbol, handler) {
    const button = root.document.createElement("button");
    button.type = "button";
    button.className = "practice-media-control";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.textContent = symbol;
    button.addEventListener("click", handler);
    return button;
  }

  function addImageControls(frame, image, item) {
    const controls = root.document.createElement("div");
    controls.className = "practice-media-toolbar";
    let scale = 1;
    const applyScale = () => { image.style.transform = `scale(${scale})`; };
    const reset = () => { scale = 1; applyScale(); };
    controls.appendChild(createIconButton("Ampliar imagem", "+", () => {
      scale = Math.min(3, Number((scale + 0.25).toFixed(2)));
      applyScale();
    }));
    controls.appendChild(createIconButton("Reduzir imagem", "-", () => {
      scale = Math.max(0.5, Number((scale - 0.25).toFixed(2)));
      applyScale();
    }));
    controls.appendChild(createIconButton("Restaurar imagem", "1:1", reset));
    controls.appendChild(createIconButton("Abrir em tela cheia", "[]", () => {
      const modal = root.document.createElement("div");
      modal.className = "practice-media-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      const modalContent = root.document.createElement("div");
      modalContent.className = "practice-media-modal-content";
      const modalImage = root.document.createElement("img");
      modalImage.src = item.src;
      modalImage.alt = image.alt;
      modalContent.appendChild(modalImage);
      const close = createIconButton("Fechar tela cheia", "x", () => modal.remove());
      close.classList.add("practice-media-modal-close");
      modalContent.appendChild(close);
      modal.appendChild(modalContent);
      modal.addEventListener("click", (event) => { if (event.target === modal) modal.remove(); });
      root.document.body.appendChild(modal);
      if (typeof modal.requestFullscreen === "function") modal.requestFullscreen().catch(() => {});
    }));
    controls.appendChild(createIconButton("Fechar visualizador", "x", () => frame.remove()));
    frame.appendChild(controls);
  }

  function createMediaFrame(item, reviewMode) {
    const frame = root.document.createElement("figure");
    frame.className = "practice-media-frame";
    const alt = reviewMode ? item.reviewAlt : item.examAlt;
    if (item.type === "video") {
      const video = root.document.createElement("video");
      video.src = item.src;
      video.poster = item.poster;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.controls = true;
      video.setAttribute("aria-label", alt);
      frame.appendChild(video);
    } else {
      const image = root.document.createElement("img");
      image.src = item.src;
      image.alt = alt;
      frame.appendChild(image);
      addImageControls(frame, image, item);
    }
    if (reviewMode) appendText(frame, "figcaption", "practice-media-caption", item.reviewCaption);
    appendText(frame, "small", "practice-media-credit", `${item.credit} | ${item.license}`);
    return frame;
  }

  function renderPhaseMedia(container, media, options) {
    if (!container || !root || !root.document || typeof root.document.createElement !== "function") return null;
    const list = Array.isArray(media) ? media.filter((item) => item && typeof item === "object") : [];
    const byId = new Map(list.filter((item) => isNonEmptyString(item.id)).map((item) => [item.id, item]));
    const reviewMode = Boolean(options && options.reviewMode);
    const gallery = root.document.createElement("section");
    gallery.className = "practice-media-gallery";

    list.forEach((item) => {
      if (item.type === "comparison") {
        const comparison = root.document.createElement("section");
        comparison.className = "practice-media-comparison";
        (Array.isArray(item.items) ? item.items : []).forEach((id) => {
          const dependency = byId.get(id);
          if (dependency && dependency.type !== "comparison") comparison.appendChild(createMediaFrame(dependency, reviewMode));
        });
        if (comparison.childNodes.length) {
          if (reviewMode) appendText(comparison, "p", "practice-media-caption", item.reviewCaption);
          appendText(comparison, "small", "practice-media-credit", `${item.credit} | ${item.license}`);
          gallery.appendChild(comparison);
        }
        return;
      }
      gallery.appendChild(createMediaFrame(item, reviewMode));
    });

    container.replaceChildren(gallery);
    return gallery;
  }

  return {
    validateMediaManifest,
    collectStationMedia,
    preloadStationMedia,
    renderPhaseMedia
  };
});
