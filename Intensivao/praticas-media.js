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
    if (!isNonEmptyString(value) || value !== value.trim()) return false;
    if (/\\/.test(value) || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("/")) return false;
    return value.split("/").every((segment) => segment && segment !== "." && segment !== "..");
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

    const comparisons = new Map(media
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item && item.type === "comparison" && isNonEmptyString(item.id))
      .map(({ item, index }) => [item.id, { item, index }]));
    const states = new Map();
    const cycleIndexes = new Set();

    function visitComparison(id, trail) {
      const entry = comparisons.get(id);
      if (!entry) return;
      const state = states.get(id);
      if (state === "visiting") {
        const cycleStart = trail.indexOf(id);
        trail.slice(cycleStart).forEach((cycleId) => cycleIndexes.add(comparisons.get(cycleId).index));
        return;
      }
      if (state === "visited") return;
      states.set(id, "visiting");
      const nextTrail = trail.concat(id);
      (Array.isArray(entry.item.items) ? entry.item.items : []).forEach((dependencyId) => {
        if (comparisons.has(dependencyId)) visitComparison(dependencyId, nextTrail);
      });
      states.set(id, "visited");
    }

    comparisons.forEach((_, id) => visitComparison(id, []));
    cycleIndexes.forEach((index) => errors.push(`media[${index}].items contem ciclo de comparison`));

    return { valid: errors.length === 0, errors, media };
  }

  function collectStationMedia(station, manifest) {
    const manifestMedia = getManifestMedia(manifest) || [];
    const byId = new Map(manifestMedia
      .filter((item) => item && typeof item === "object" && isNonEmptyString(item.id))
      .map((item) => [item.id, item]));
    const media = [];
    const missingIds = [];
    const directIds = [];
    const visited = new Set();
    const missing = new Set();
    const direct = new Set();

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

    function includeDirect(id) {
      if (isNonEmptyString(id) && !direct.has(id)) {
        direct.add(id);
        directIds.push(id);
      }
      include(id);
    }

    const phases = station && Array.isArray(station.phases) ? station.phases : [];
    phases.forEach((phase) => {
      if (phase && Array.isArray(phase.media)) phase.media.forEach(includeDirect);
    });

    return { media, missingIds, directIds };
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

    function loadItem(item, visiting) {
      const path = Array.isArray(visiting) ? visiting : [];
      if (path.includes(item.id)) {
        recordFailure(item, new Error(`Ciclo de comparison: ${path.concat(item.id).join(" -> ")}`));
        return Promise.resolve(false);
      }
      if (loading.has(item.id)) return loading.get(item.id);

      let finish;
      const pending = new Promise((resolve) => { finish = resolve; });
      loading.set(item.id, pending);
      (async () => {
        try {
          if (item.type === "comparison") {
            const dependencies = Array.isArray(item.items) ? item.items : [];
            const results = await Promise.all(dependencies.map((id) => {
              const dependency = byId.get(id);
              if (!dependency) return Promise.resolve(false);
              return loadItem(dependency, path.concat(item.id));
            }));
            if (!results.every(Boolean)) throw new Error(`Falha ao carregar dependencias: ${item.id}`);
          } else if (item.type === "video") {
            await loadVideo(item);
          } else {
            await loadImage(item);
          }
          recordLoaded(item);
          finish(true);
        } catch (error) {
          recordFailure(item, error instanceof Error ? error : new Error(String(error)));
          finish(false);
        }
      })();
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
    const applyScale = () => {
      image.style.width = `${scale * 100}%`;
      image.style.maxWidth = scale === 1 ? "100%" : "none";
    };
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
      const modalToolbar = root.document.createElement("div");
      modalToolbar.className = "practice-media-modal-toolbar";
      const modalImage = root.document.createElement("img");
      modalImage.src = item.src;
      modalImage.alt = image.alt;
      let closed = false;
      const closeModal = () => {
        if (closed) return;
        closed = true;
        root.document.removeEventListener("fullscreenchange", onFullscreenChange);
        if (root.document.fullscreenElement === modal && typeof root.document.exitFullscreen === "function") {
          root.document.exitFullscreen().catch(() => {});
        }
        modal.remove();
      };
      const onFullscreenChange = () => {
        if (root.document.fullscreenElement !== modal) closeModal();
      };
      const close = createIconButton("Fechar tela cheia", "x", closeModal);
      modalToolbar.appendChild(close);
      modalContent.appendChild(modalToolbar);
      modalContent.appendChild(modalImage);
      modal.appendChild(modalContent);
      modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
      root.document.body.appendChild(modal);
      root.document.addEventListener("fullscreenchange", onFullscreenChange);
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
      const stage = root.document.createElement("div");
      stage.className = "practice-media-stage";
      stage.appendChild(image);
      frame.appendChild(stage);
      addImageControls(frame, image, item);
    }
    if (reviewMode) appendText(frame, "figcaption", "practice-media-caption", item.reviewCaption);
    appendText(frame, "small", "practice-media-credit", `${item.credit} | ${item.license}`);
    return frame;
  }

  // Passe collectStationMedia(...).directIds em options.directIds para preservar midias diretas da fase.
  function renderPhaseMedia(container, media, options) {
    if (!container || !root || !root.document || typeof root.document.createElement !== "function") return null;
    const list = Array.isArray(media) ? media.filter((item) => item && typeof item === "object") : [];
    const byId = new Map(list.filter((item) => isNonEmptyString(item.id)).map((item) => [item.id, item]));
    const reviewMode = Boolean(options && options.reviewMode);
    const directIds = new Set(
      options && Array.isArray(options.directIds)
        ? options.directIds.filter(isNonEmptyString)
        : options && Array.isArray(options.phaseMediaIds)
          ? options.phaseMediaIds.filter(isNonEmptyString)
          : []
    );
    const comparisonDependencyIds = new Set(list
      .filter((item) => item.type === "comparison" && Array.isArray(item.items))
      .flatMap((item) => item.items));
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
      if (comparisonDependencyIds.has(item.id) && !directIds.has(item.id)) return;
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
