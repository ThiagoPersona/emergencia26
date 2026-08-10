const assert = require("node:assert/strict");
const test = require("node:test");

const {
  validateMediaManifest,
  collectStationMedia,
  preloadStationMedia,
  renderPhaseMedia
} = require("../praticas-media.js");

function image(id) {
  return {
    id,
    type: "image",
    src: `assets/praticas/${id}.png`,
    thumbnail: `assets/praticas/${id}-thumb.png`,
    examAlt: `Imagem de ${id} para a prova`,
    reviewAlt: `Imagem de ${id} para revisao`,
    reviewCaption: `Legenda de revisao para ${id}`,
    credit: "Acervo local",
    sourceUrl: "https://example.org/source",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    modified: "2026-08-10"
  };
}

function video(id) {
  return {
    ...image(id),
    type: "video",
    src: `assets/praticas/${id}.mp4`,
    thumbnail: `assets/praticas/${id}-thumb.jpg`,
    poster: `assets/praticas/${id}-poster.jpg`
  };
}

function comparison(id, items) {
  const item = { ...image(id), type: "comparison", items };
  delete item.src;
  delete item.thumbnail;
  return item;
}

function createFakeDocument() {
  class FakeElement {
    constructor(tagName, ownerDocument) {
      this.tagName = tagName.toUpperCase();
      this.ownerDocument = ownerDocument;
      this.childNodes = [];
      this.parentNode = null;
      this.className = "";
      this.style = {};
      this.attributes = {};
      this.listeners = new Map();
      this.classList = {
        add: (...names) => {
          const classes = new Set(this.className.split(/\s+/).filter(Boolean));
          names.forEach((name) => classes.add(name));
          this.className = Array.from(classes).join(" ");
        }
      };
    }

    appendChild(child) {
      child.parentNode = this;
      this.childNodes.push(child);
      return child;
    }

    replaceChildren(...children) {
      this.childNodes.forEach((child) => { child.parentNode = null; });
      this.childNodes = [];
      children.forEach((child) => this.appendChild(child));
    }

    remove() {
      if (!this.parentNode) return;
      this.parentNode.childNodes = this.parentNode.childNodes.filter((child) => child !== this);
      this.parentNode = null;
    }

    setAttribute(name, value) {
      this.attributes[name] = value;
    }

    addEventListener(type, listener) {
      const handlers = this.listeners.get(type) || [];
      handlers.push(listener);
      this.listeners.set(type, handlers);
    }

    removeEventListener(type, listener) {
      const handlers = this.listeners.get(type) || [];
      this.listeners.set(type, handlers.filter((handler) => handler !== listener));
    }

    dispatch(type, event) {
      (this.listeners.get(type) || []).forEach((listener) => listener(event || { target: this }));
    }

    requestFullscreen() {
      this.ownerDocument.fullscreenElement = this;
      this.ownerDocument.dispatch("fullscreenchange");
      return Promise.resolve();
    }
  }

  const document = {
    listeners: new Map(),
    fullscreenElement: null,
    createElement(tagName) {
      return new FakeElement(tagName, document);
    },
    addEventListener(type, listener) {
      const handlers = document.listeners.get(type) || [];
      handlers.push(listener);
      document.listeners.set(type, handlers);
    },
    removeEventListener(type, listener) {
      const handlers = document.listeners.get(type) || [];
      document.listeners.set(type, handlers.filter((handler) => handler !== listener));
    },
    dispatch(type) {
      (document.listeners.get(type) || []).forEach((listener) => listener());
    },
    exitFullscreen() {
      document.fullscreenElement = null;
      document.dispatch("fullscreenchange");
      return Promise.resolve();
    }
  };
  document.body = document.createElement("body");
  return document;
}

function findByClass(root, className) {
  const found = [];
  const visit = (element) => {
    if (element.className.split(/\s+/).includes(className)) found.push(element);
    element.childNodes.forEach(visit);
  };
  visit(root);
  return found;
}

function findByTag(root, tagName) {
  const found = [];
  const visit = (element) => {
    if (element.tagName === tagName.toUpperCase()) found.push(element);
    element.childNodes.forEach(visit);
  };
  visit(root);
  return found;
}

test("aceita manifesto vazio e manifesto valido nos dois formatos", () => {
  assert.deepEqual(validateMediaManifest([]), { valid: true, errors: [], media: [] });

  const item = image("via-aerea");
  const result = validateMediaManifest({ media: [item] });

  assert.deepEqual(result, { valid: true, errors: [], media: [item] });
});

test("rejeita tipo desconhecido e campos obrigatorios ausentes", () => {
  const invalid = image("invalido");
  invalid.type = "audio";
  invalid.credit = "";
  delete invalid.reviewCaption;

  const result = validateMediaManifest([invalid]);

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /type invalido/i);
  assert.match(result.errors.join(" "), /credit obrigatorio/i);
  assert.match(result.errors.join(" "), /reviewCaption obrigatorio/i);
});

test("rejeita caminhos de midia remotos e exige https para fontes", () => {
  const invalid = video("remoto");
  invalid.src = "https://example.org/video.mp4";
  invalid.thumbnail = "//cdn.example.org/thumb.jpg";
  invalid.poster = "data:image/png;base64,abc";
  invalid.sourceUrl = "http://example.org/source";
  invalid.licenseUrl = "http://example.org/license";

  const result = validateMediaManifest([invalid]);

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /src deve ser caminho local/i);
  assert.match(result.errors.join(" "), /thumbnail deve ser caminho local/i);
  assert.match(result.errors.join(" "), /poster deve ser caminho local/i);
  assert.match(result.errors.join(" "), /sourceUrl deve usar https/i);
  assert.match(result.errors.join(" "), /licenseUrl deve usar https/i);
});

test("aceita somente caminhos relativos seguros para arquivos locais", () => {
  const invalid = [
    "file:///tmp/imagem.png",
    "javascript:alert(1)",
    "C:\\midias\\imagem.png",
    "\\\\servidor\\midias\\imagem.png",
    "/assets/praticas/imagem.png",
    "assets/../segredo.png"
  ];

  invalid.forEach((path) => {
    const item = image("caminho-seguro");
    item.src = path;
    const result = validateMediaManifest([item]);
    assert.equal(result.valid, false, path);
    assert.match(result.errors.join(" "), /src deve ser caminho local/i, path);
  });
});

test("rejeita ids duplicados e exige alternativas diferentes", () => {
  const first = image("duplicado");
  const second = image("duplicado");
  second.reviewAlt = second.examAlt;

  const result = validateMediaManifest([first, second]);

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /id duplicado/i);
  assert.match(result.errors.join(" "), /reviewAlt deve ser diferente de examAlt/i);
});

test("rejeita comparacao sem dois ids distintos", () => {
  const comparison = {
    ...image("comparacao"),
    type: "comparison",
    items: ["esquerda", "esquerda"]
  };
  delete comparison.src;
  delete comparison.thumbnail;

  const result = validateMediaManifest([comparison]);

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /items deve conter dois ids distintos/i);
});

test("rejeita ciclos entre comparacoes no manifesto", () => {
  const base = image("base");
  const left = comparison("esquerda", ["base", "direita"]);
  const right = comparison("direita", ["base", "esquerda"]);

  const result = validateMediaManifest([base, left, right]);

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /ciclo de comparison/i);
});

test("coleta midias por fase, inclui dependencias e preserva a primeira ordem", () => {
  const left = image("esquerda");
  const right = video("direita");
  const comparison = {
    ...image("comparacao"),
    type: "comparison",
    items: ["esquerda", "direita"]
  };
  delete comparison.src;
  delete comparison.thumbnail;
  const station = {
    phases: [
      { media: ["comparacao", "esquerda", "nao-existe"] },
      { media: ["direita", "comparacao"] }
    ]
  };

  const result = collectStationMedia(station, [left, right, comparison]);

  assert.deepEqual(result.media.map((item) => item.id), ["comparacao", "esquerda", "direita"]);
  assert.deepEqual(result.missingIds, ["nao-existe"]);
  assert.deepEqual(result.directIds, ["comparacao", "esquerda", "nao-existe", "direita"]);
});

test("relata ids ausentes de dependencias de comparacao sem duplicar resultados", () => {
  const only = image("disponivel");
  const comparison = {
    ...image("comparacao"),
    type: "comparison",
    items: ["disponivel", "faltante"]
  };
  delete comparison.src;
  delete comparison.thumbnail;

  const result = collectStationMedia({ phases: [{ media: ["comparacao", "faltante"] }] }, [only, comparison]);

  assert.deepEqual(result.media.map((item) => item.id), ["comparacao", "disponivel"]);
  assert.deepEqual(result.missingIds, ["faltante"]);
});

test("mantem preload parcial quando um loader falha", async () => {
  const imageItem = image("imagem");
  const videoItem = video("video");
  const comparisonItem = comparison("comparacao", ["imagem", "video"]);

  const result = await preloadStationMedia([imageItem, videoItem, comparisonItem], {
    image: async (item) => item.id,
    video: async () => { throw new Error("arquivo indisponivel"); }
  });

  assert.deepEqual(result.loaded.map((item) => item.id), ["imagem"]);
  assert.deepEqual(result.failures.map((failure) => failure.item.id), ["video", "comparacao"]);
  assert.match(result.failures[0].error.message, /arquivo indisponivel/i);
});

test("preload encerra ciclos de comparacao sem recursao infinita", async () => {
  const base = image("base");
  const left = comparison("esquerda", ["base", "direita"]);
  const right = comparison("direita", ["base", "esquerda"]);

  const result = await preloadStationMedia([base, left, right], {
    image: async (item) => item.id
  });

  assert.deepEqual(result.loaded.map((item) => item.id), ["base"]);
  assert.deepEqual(result.failures.map((failure) => failure.item.id).sort(), ["direita", "esquerda"]);
  assert.match(result.failures.map((failure) => failure.error.message).join(" "), /ciclo de comparison/i);
});

test("renderiza dependencias diretas fora da comparacao com directIds da coleta", () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;
  try {
    const left = image("esquerda");
    const right = image("direita");
    const item = comparison("comparacao", ["esquerda", "direita"]);
    const container = document.createElement("div");
    const direct = collectStationMedia({ phases: [{ media: ["comparacao", "esquerda"] }] }, [item, left, right]);
    const transitive = collectStationMedia({ phases: [{ media: ["comparacao"] }] }, [item, left, right]);

    renderPhaseMedia(container, direct.media, { directIds: direct.directIds });
    assert.equal(findByClass(container, "practice-media-frame").length, 3);

    renderPhaseMedia(container, transitive.media, { directIds: transitive.directIds });
    assert.equal(findByClass(container, "practice-media-frame").length, 2);

    renderPhaseMedia(container, [item, left, right], { phaseMediaIds: ["esquerda"] });
    assert.equal(findByClass(container, "practice-media-frame").length, 3);
  } finally {
    global.document = previousDocument;
  }
});

test("renderiza alternativas de prova e revisao e preserva texto como conteudo", () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;
  try {
    const item = image("texto");
    item.examAlt = "Exame <nao interpretar>";
    item.reviewAlt = "Revisao <nao interpretar>";
    item.reviewCaption = "Legenda <nao interpretar>";
    item.credit = "Credito <nao interpretar>";
    const container = document.createElement("div");

    renderPhaseMedia(container, [item]);
    assert.equal(findByTag(container, "img")[0].alt, item.examAlt);

    renderPhaseMedia(container, [item], { reviewMode: true });
    assert.equal(findByTag(container, "img")[0].alt, item.reviewAlt);
    const caption = findByClass(container, "practice-media-caption")[0];
    const credit = findByClass(container, "practice-media-credit")[0];
    assert.equal(caption.textContent, item.reviewCaption);
    assert.equal(caption.childNodes.length, 0);
    assert.equal(credit.textContent, `${item.credit} | ${item.license}`);
  } finally {
    global.document = previousDocument;
  }
});

test("renderiza video com controles, poster e alternativa", () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;
  try {
    const item = video("procedimento");
    const container = document.createElement("div");

    renderPhaseMedia(container, [item], { reviewMode: true });
    const rendered = findByTag(container, "video")[0];
    assert.equal(rendered.src, item.src);
    assert.equal(rendered.poster, item.poster);
    assert.equal(rendered.muted, true);
    assert.equal(rendered.loop, true);
    assert.equal(rendered.playsInline, true);
    assert.equal(rendered.controls, true);
    assert.equal(rendered.attributes["aria-label"], item.reviewAlt);
  } finally {
    global.document = previousDocument;
  }
});

test("amplia e restaura a imagem sem mover a toolbar", () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;
  try {
    const container = document.createElement("div");
    renderPhaseMedia(container, [image("zoom")]);
    const rendered = findByTag(container, "img")[0];
    const toolbar = findByClass(container, "practice-media-toolbar")[0];
    const controls = findByClass(toolbar, "practice-media-control");

    controls.find((button) => button.title === "Ampliar imagem").dispatch("click");
    assert.equal(rendered.style.width, "125%");
    assert.equal(rendered.style.maxWidth, "none");
    assert.equal(toolbar.style.width, undefined);

    controls.find((button) => button.title === "Restaurar imagem").dispatch("click");
    assert.equal(rendered.style.width, "100%");
    assert.equal(rendered.style.maxWidth, "100%");
  } finally {
    global.document = previousDocument;
  }
});

test("mantem toolbar fora da area ampliada e fecha modal ao sair de tela cheia", () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;
  try {
    const container = document.createElement("div");
    renderPhaseMedia(container, [image("imagem")]);

    const frame = findByClass(container, "practice-media-frame")[0];
    const stage = findByClass(frame, "practice-media-stage")[0];
    const toolbar = findByClass(frame, "practice-media-toolbar")[0];
    assert.equal(stage.parentNode, frame);
    assert.equal(toolbar.parentNode, frame);
    assert.equal(stage.childNodes.includes(toolbar), false);

    const fullscreen = findByClass(toolbar, "practice-media-control")
      .find((button) => button.title === "Abrir em tela cheia");
    fullscreen.dispatch("click");
    const modal = findByClass(document.body, "practice-media-modal")[0];
    assert.equal(document.fullscreenElement, modal);

    document.fullscreenElement = null;
    document.dispatch("fullscreenchange");
    assert.equal(findByClass(document.body, "practice-media-modal").length, 0);
  } finally {
    global.document = previousDocument;
  }
});
