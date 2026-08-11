const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  validateMediaManifest,
  collectStationMedia,
  preloadStationMedia,
  renderPhaseMedia
} = require("../praticas-media.js");

const REQUIRED_ACERVO_IDS = [
  "ecg-bavt-cc0",
  "ecg-iam-inferior-vd",
  "ecg-torsades-pd",
  "ecg-triciclico-qrs",
  "capnografia-capnograma-base",
  "vm-autopeep-sinais-fig4",
  "rx-pneumotorax-expiracao",
  "us-pneumotorax-mmode-barcode",
  "us-linhas-b",
  "us-edema-pulmonar-linhas-b",
  "us-fast-ruq-normal-morison",
  "us-fast-morison-positivo",
  "us-tamponamento-rv-collapse",
  "us-aaa-sacular-flap",
  "us-aaa-trombo-mural-cc0",
  "tc-avc-hemorragico",
  "tc-tce-subdural",
  "rx-ards-edema-naocardiogenico",
  "us-acesso-vascular-subclavia",
  "us-fascia-iliaca-anatomia",
  "fascia-iliaca-probe-placement"
];

test("acervo visual local contem os 21 itens licenciados e arquivos resolviveis", () => {
  const intensivaoRoot = path.resolve(__dirname, "..");
  const manifestPath = path.join(intensivaoRoot, "assets", "praticas", "media.json");
  const attributionPath = path.join(intensivaoRoot, "assets", "praticas", "ATRIBUICOES.md");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const result = validateMediaManifest(manifest);

  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.media.length, REQUIRED_ACERVO_IDS.length);
  assert.deepEqual(new Set(result.media.map((item) => item.id)), new Set(REQUIRED_ACERVO_IDS));

  const attributions = fs.readFileSync(attributionPath, "utf8");
  result.media.forEach((item) => {
    assert.match(item.examAlt, /\S/);
    assert.match(item.reviewAlt, /\S/);
    assert.notEqual(item.examAlt, item.reviewAlt);
    assert.match(item.reviewCaption, /\S/);
    assert.match(item.credit, /\S/);
    assert.match(item.sourceUrl, /^https:\/\//);
    assert.match(item.license, /\S/);
    assert.match(item.licenseUrl, /^https:\/\//);
    assert.match(attributions, new RegExp("`" + item.id + "`"));

    ["src", "thumbnail", "poster"].forEach((field) => {
      if (!item[field]) return;
      assert.equal(path.isAbsolute(item[field]), false, `${item.id}.${field} deve ser relativo`);
      assert.equal(item[field].includes(".."), false, `${item.id}.${field} nao pode atravessar diretorios`);
      const localPath = path.resolve(intensivaoRoot, item[field]);
      assert.equal(localPath.startsWith(intensivaoRoot + path.sep), true, `${item.id}.${field} fora de Intensivao`);
      assert.equal(fs.existsSync(localPath), true, `${item.id}.${field} ausente`);
      assert.ok(fs.statSync(localPath).size > 0, `${item.id}.${field} vazio`);
    });
  });
});

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

test("isola midia direta futura ao renderizar a colecao da fase atual", () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;
  try {
    const first = image("fase-um");
    const future = image("fase-dois");
    const item = comparison("comparacao", ["fase-um", "fase-dois"]);
    const station = {
      phases: [
        { media: ["comparacao"] },
        { media: ["fase-dois"] }
      ]
    };
    const collected = collectStationMedia(station, [item, first, future]);
    const container = document.createElement("div");

    assert.deepEqual(collected.phaseMedia[0].directIds, ["comparacao"]);
    assert.deepEqual(collected.phaseMedia[1].directIds, ["fase-dois"]);

    const firstGallery = renderPhaseMedia(container, collected.phaseMedia[0]);
    assert.equal(firstGallery.childNodes.length, 1);
    assert.equal(findByClass(firstGallery, "practice-media-frame").length, 2);

    const secondGallery = renderPhaseMedia(container, collected.phaseMedia[1]);
    assert.equal(secondGallery.childNodes.length, 1);
    assert.equal(findByClass(secondGallery, "practice-media-frame").length, 1);
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
    assert.equal(findByTag(container, "a").length, 0);

    renderPhaseMedia(container, [item], { reviewMode: true });
    assert.equal(findByTag(container, "img")[0].alt, item.reviewAlt);
    const caption = findByClass(container, "practice-media-caption")[0];
    const credit = findByClass(container, "practice-media-credit")[0];
    assert.equal(caption.textContent, item.reviewCaption);
    assert.equal(caption.childNodes.length, 0);
    assert.equal(credit.textContent, `${item.credit} | ${item.license}`);
    const links = findByTag(container, "a");
    assert.equal(links.length, 2);
    assert.equal(links[0].href, item.sourceUrl);
    assert.equal(links[0].textContent, "Fonte");
    assert.equal(links[1].href, item.licenseUrl);
    assert.equal(links[1].textContent, "Licença");
    links.forEach((link) => {
      assert.equal(link.attributes.target, "_blank");
      assert.equal(link.attributes.rel, "noopener noreferrer");
    });
  } finally {
    global.document = previousDocument;
  }
});

test("omite links de revisao que nao usam HTTPS", () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;
  try {
    const item = image("inseguro");
    item.sourceUrl = "http://example.org/source";
    item.licenseUrl = "javascript:alert(1)";
    const container = document.createElement("div");

    renderPhaseMedia(container, [item], { reviewMode: true });

    assert.equal(findByTag(container, "a").length, 0);
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
    rendered.currentTime = 12;
    const restart = findByClass(container, "practice-media-control")
      .find((button) => button.title === "Reiniciar vídeo");
    assert.ok(restart);
    restart.dispatch("click");
    assert.equal(rendered.currentTime, 0);
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

    let propagationStopped = false;
    modal.dispatch("click", {
      target: modal.childNodes[0],
      stopPropagation() { propagationStopped = true; }
    });
    assert.equal(propagationStopped, true);

    document.fullscreenElement = null;
    document.dispatch("fullscreenchange");
    assert.equal(findByClass(document.body, "practice-media-modal").length, 0);
  } finally {
    global.document = previousDocument;
  }
});
