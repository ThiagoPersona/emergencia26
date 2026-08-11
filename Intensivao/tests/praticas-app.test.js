const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createPracticeSession,
  advancePracticePhase,
  getPracticePrimaryAction,
  getRemainingSeconds,
  buildPracticeReport,
  parseStoredAttempts,
  upsertAttemptList,
  getPublicStationView,
  getPracticePhaseControls,
  areStartActionsDisabled,
  getCurrentPhaseMedia,
  getRunningMediaOptions,
  getResultMediaOptions,
  DRAFT_KEY,
  CYCLE_KEY,
  PREFERENCES_KEY,
  savePracticeDraft,
  clearPracticeDraft,
  restorePracticeDraft,
  loadStationIndex,
  loadMediaManifest,
  loadStation,
  selectStationEntry,
  selectAlternativeStation,
  getRelatedStationEntries,
  renderPracticeModeControl,
  getSetupStationView,
  renderPracticeStartActions,
  savePracticeSetup,
  restorePracticeSetup,
  createPracticeApp
} = require("../praticas-app.js");

const station = {
  id: "station-1",
  version: 1,
  title: "Estacao teste",
  domain: "Teste",
  durationSeconds: 300,
  phases: [
    { id: "a", title: "A", prompt: "Primeira tarefa" },
    { id: "b", title: "B", prompt: "Segunda tarefa" }
  ],
  checklist: [
    { id: "item-1", label: "Primeiro item", weight: 1, verification: "verbal", critical: true }
  ]
};

function createStorage(initialValues) {
  const values = new Map(Object.entries(initialValues || {}));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

function createFakeDocument() {
  class FakeElement {
    constructor(tagName, ownerDocument) {
      this.tagName = String(tagName || "div").toUpperCase();
      this.ownerDocument = ownerDocument;
      this.listeners = new Map();
      this.childNodes = [];
      this.attributes = {};
      this.className = "";
      this.style = {};
      this.disabled = false;
      this.checked = false;
      this.value = "";
      this.name = "";
      this._innerHTML = "";
      this._parsedNodes = [];
      this.classList = {
        toggle: (name, enabled) => {
          const names = new Set(this.className.split(/\s+/).filter(Boolean));
          if (enabled) names.add(name);
          else names.delete(name);
          this.className = Array.from(names).join(" ");
        }
      };
    }

    set innerHTML(value) {
      this._innerHTML = String(value);
      this._parsedNodes = [];
      const tagPattern = /<(input|button|select|form|div|textarea|time)\b([^>]*)>/gi;
      let match;
      while ((match = tagPattern.exec(this._innerHTML))) {
        const node = new FakeElement(match[1], this.ownerDocument);
        const attrs = match[2];
        const read = (name) => {
          const attr = attrs.match(new RegExp(`${name}="([^"]*)"`, "i"));
          return attr ? attr[1] : "";
        };
        node.id = read("id");
        node.name = read("name");
        node.value = read("value");
        node.type = read("type");
        node.className = read("class");
        node.disabled = /(?:^|\s)disabled(?:\s|$)/i.test(attrs);
        node.checked = /(?:^|\s)checked(?:\s|$)/i.test(attrs);
        this._parsedNodes.push(node);
      }
    }

    get innerHTML() { return this._innerHTML; }

    appendChild(child) {
      this.childNodes.push(child);
      return child;
    }

    prepend(child) { this.childNodes.unshift(child); }

    replaceChildren(...children) { this.childNodes = children; }

    setAttribute(name, value) { this.attributes[name] = String(value); }

    addEventListener(type, listener) {
      const listeners = this.listeners.get(type) || [];
      listeners.push(listener);
      this.listeners.set(type, listeners);
    }

    dispatch(type, properties) {
      const event = {
        target: this,
        currentTarget: this,
        preventDefault() {},
        ...(properties || {})
      };
      (this.listeners.get(type) || []).forEach((listener) => listener(event));
    }

    click() {
      if (!this.disabled) this.dispatch("click");
    }

    querySelector(selector) {
      if (selector.startsWith("#")) {
        const id = selector.slice(1);
        return this._parsedNodes.find((node) => node.id === id) || null;
      }
      return null;
    }

    querySelectorAll(selector) {
      if (selector === "input[name='practice-mode']") {
        return this._parsedNodes.filter((node) => node.tagName === "INPUT" && node.name === "practice-mode");
      }
      if (selector === "[data-related-station]") return [];
      return [];
    }
  }

  const roots = new Map();
  const document = {
    createElement(tagName) { return new FakeElement(tagName, document); },
    getElementById(id) {
      if (roots.has(id)) return roots.get(id);
      for (const root of roots.values()) {
        const found = root.querySelector(`#${id}`);
        if (found) return found;
      }
      return null;
    },
    registerRoot(id) {
      const element = new FakeElement("main", document);
      element.id = id;
      roots.set(id, element);
      return element;
    }
  };
  return document;
}

function createInteractiveRoot(fetch, storage) {
  const document = createFakeDocument();
  const simulator = document.registerRoot("practice-simulator");
  const intervals = [];
  const clearedIntervals = [];
  const recorders = [];

  class FakeMediaRecorder {
    constructor(stream) {
      this.stream = stream;
      this.state = "inactive";
      this.listeners = new Map();
      this.mimeType = "audio/webm";
      recorders.push(this);
    }

    addEventListener(type, listener) { this.listeners.set(type, listener); }
    start() { this.state = "recording"; }
    stop() { this.state = "inactive"; }
    static isTypeSupported() { return true; }
  }

  const root = {
    document,
    fetch,
    localStorage: storage,
    navigator: {
      mediaDevices: {
        async getUserMedia() {
          return { getTracks: () => [{ stop() {} }] };
        }
      }
    },
    MediaRecorder: FakeMediaRecorder,
    URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    setInterval(callback, delay) {
      const id = { callback, delay };
      intervals.push(id);
      return id;
    },
    clearInterval(id) { clearedIntervals.push(id); }
  };
  return { root, simulator, intervals, clearedIntervals, recorders };
}

function createStation(id) {
  return {
    ...station,
    id,
    title: `Estacao ${id}`,
    examTitle: `Paciente ${id}`,
    phases: station.phases.map((phase) => ({ ...phase }))
  };
}

function jsonResponse(value, ok = true) {
  return { ok, json: async () => value };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

async function waitFor(assertion, attempts = 30) {
  let lastError;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return assertion();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
  throw lastError;
}

test("cria sessao preparada e avanca fases sem ultrapassar o fim", () => {
  const session = createPracticeSession(station, 1000);

  assert.equal(session.status, "ready");
  assert.equal(session.phaseIndex, 0);
  assert.equal(session.mode, "directed");
  assert.equal(session.startedAtMs, null);

  const first = advancePracticePhase(session);
  const last = advancePracticePhase(first);
  assert.equal(first.phaseIndex, 1);
  assert.equal(last.phaseIndex, 1);
});

test("botao principal avanca fases e finaliza a ultima tarefa", () => {
  const firstPhase = createPracticeSession(station, 1000);
  const lastPhase = { ...firstPhase, phaseIndex: station.phases.length - 1 };

  assert.deepEqual(getPracticePrimaryAction(firstPhase, station), {
    action: "next",
    label: "Próxima tarefa"
  });
  assert.deepEqual(getPracticePrimaryAction(lastPhase, station), {
    action: "finish",
    label: "Finalizar estação"
  });
});

test("cronometro nunca retorna valor negativo", () => {
  const running = { ...createPracticeSession(station, 1000), status: "running", startedAtMs: 1000 };

  assert.equal(getRemainingSeconds(running, 61000), 240);
  assert.equal(getRemainingSeconds(running, 401000), 0);
});

test("gera relatorio legivel com evidencias, lacunas e nota", () => {
  const report = buildPracticeReport({
    stationTitle: "Estacao teste",
    domain: "Teste",
    completedAt: "2026-08-09T12:00:00.000Z",
    finalPercent: 50,
    provisionalPercent: 50,
    criticalFailures: ["item-1"],
    evaluations: [
      {
        itemId: "item-1",
        label: "Primeiro item",
        status: "ausente",
        evidence: "Nao foi mencionado.",
        rationale: "Era uma acao prioritaria."
      }
    ]
  });

  assert.match(report, /RELATORIO DE TREINO PRATICO TEME/);
  assert.match(report, /Nota: 50%/);
  assert.match(report, /Primeiro item/);
  assert.match(report, /Nao foi mencionado/);
  assert.match(report, /ERROS CRITICOS/);
});

test("ignora historico local corrompido", () => {
  assert.deepEqual(parseStoredAttempts("nao-json"), []);
  assert.deepEqual(parseStoredAttempts(JSON.stringify({ bad: true })), []);
  assert.equal(parseStoredAttempts(JSON.stringify([{ id: "ok" }])).length, 1);
});

test("atualiza tentativa existente sem duplicar o historico", () => {
  const result = upsertAttemptList(
    [{ id: "a", finalPercent: null }, { id: "b", finalPercent: 70 }],
    { id: "a", finalPercent: 90 }
  );

  assert.equal(result.length, 2);
  assert.equal(result[0].id, "a");
  assert.equal(result[0].finalPercent, 90);
});

test("deriva titulo publico por modo sem vazar diagnostico na prova", () => {
  const diagnosticStation = {
    ...station,
    title: "Choque hemorragico por ruptura de aneurisma",
    examTitle: "Paciente instavel na sala de emergencia",
    domain: "POCUS",
    domains: ["POCUS", "Trauma"],
    difficulty: "avancada",
    tags: ["aaa", "choque"]
  };

  const exam = getPublicStationView(diagnosticStation, "exam");
  assert.equal(exam.kicker, "MODO PROVA");
  assert.equal(exam.title, "Paciente instavel na sala de emergencia");
  assert.equal(exam.showDiagnosticMeta, false);
  assert.equal(Object.values(exam).join(" ").includes(diagnosticStation.domain), false);
  assert.equal(Object.values(exam).join(" ").includes(diagnosticStation.title), false);
  assert.equal(Object.values(exam).join(" ").includes(diagnosticStation.difficulty), false);

  const directed = getPublicStationView(diagnosticStation, "directed");
  assert.equal(directed.title, diagnosticStation.title);
  assert.equal(directed.domain, diagnosticStation.domain);
  assert.equal(directed.difficulty, diagnosticStation.difficulty);
  assert.equal(directed.showDiagnosticMeta, true);

  const review = getPublicStationView(diagnosticStation, "review");
  assert.equal(review.kicker, "REVISÃO");
  assert.equal(review.showDiagnosticMeta, false);
  assert.equal(Object.values(review).join(" ").includes(diagnosticStation.title), false);
  assert.equal(Object.values(review).join(" ").includes(diagnosticStation.domain), false);
});

test("expoe controles anterior, proximo e finalizar por fase", () => {
  const first = createPracticeSession(station, 1000);
  const last = { ...first, phaseIndex: station.phases.length - 1 };

  assert.deepEqual(getPracticePhaseControls(first, station), {
    previous: { action: "previous", label: "Fase anterior", disabled: true },
    primary: { action: "next", label: "Próxima tarefa" }
  });
  assert.deepEqual(getPracticePhaseControls(last, station), {
    previous: { action: "previous", label: "Fase anterior", disabled: false },
    primary: { action: "finish", label: "Finalizar estação" }
  });
});

test("bloqueia inicio enquanto a midia da estacao esta carregando", () => {
  assert.equal(areStartActionsDisabled("idle"), true);
  assert.equal(areStartActionsDisabled("loading"), true);
  assert.equal(areStartActionsDisabled("ready"), false);
  assert.equal(areStartActionsDisabled("error"), true);
});

test("usa somente a colecao de midia da fase atual sem interpretacao", () => {
  const firstPhase = { media: [{ id: "atual" }], directIds: ["atual"] };
  const futurePhase = { media: [{ id: "futura" }], directIds: ["futura"] };
  const stationMedia = {
    media: [{ id: "atual" }, { id: "futura" }],
    phaseMedia: [firstPhase, futurePhase]
  };
  const running = { ...createPracticeSession(station, 1000), phaseIndex: 0 };

  assert.strictEqual(getCurrentPhaseMedia(stationMedia, running), firstPhase);
  assert.deepEqual(getRunningMediaOptions(), { reviewMode: false });
  assert.deepEqual(getRunningMediaOptions(firstPhase), {
    reviewMode: false,
    directIds: ["atual"]
  });
});

test("configura a midia do resultado para revisao visual", () => {
  assert.deepEqual(getResultMediaOptions(), { reviewMode: true });
});

test("persiste e limpa rascunho da sessao com chave v2", () => {
  const values = new Map();
  const storage = {
    setItem(key, value) { values.set(key, value); },
    getItem(key) { return values.get(key) || null; },
    removeItem(key) { values.delete(key); }
  };
  const running = {
    ...createPracticeSession(station, 1000),
    status: "running",
    startedAtMs: 2000,
    phaseIndex: 1
  };

  savePracticeDraft(storage, running);
  assert.equal(DRAFT_KEY, "teme26-practice-draft-v2");
  assert.deepEqual(JSON.parse(storage.getItem(DRAFT_KEY)), {
    stationId: station.id,
    stationVersion: station.version,
    mode: "directed",
    status: "running",
    phaseIndex: 1,
    createdAtMs: 1000,
    startedAtMs: 2000,
    completedAtMs: null
  });
  clearPracticeDraft(storage);
  assert.equal(storage.getItem(DRAFT_KEY), null);
});

test("restaura rascunho valido sem recuperar audio", () => {
  const raw = JSON.stringify({
    stationId: station.id,
    stationVersion: station.version,
    mode: "exam",
    status: "running",
    phaseIndex: 1,
    createdAtMs: 1000,
    startedAtMs: 2000,
    completedAtMs: null
  });

  const restored = restorePracticeDraft(raw, station, 3000);
  assert.equal(restored.session.phaseIndex, 1);
  assert.equal(restored.session.mode, "exam");
  assert.equal(restored.audioBlob, null);
  assert.equal(restored.audioUrl, null);
  assert.equal(restored.notice, "Sessão restaurada sem a gravação anterior.");
});

test("carrega somente o indice do catalogo e o manifesto de midia", async () => {
  const calls = [];
  const fetchJson = async (url) => {
    calls.push(url);
    return {
      ok: true,
      json: async () => url.endsWith("index.json")
        ? [{ id: "station-1", file: "station-1.json" }]
        : []
    };
  };

  const entries = await loadStationIndex(fetchJson);
  const manifest = await loadMediaManifest(fetchJson, {
    validateMediaManifest(value) {
      return { valid: true, errors: [], media: value };
    }
  });

  assert.deepEqual(entries, [{ id: "station-1", file: "station-1.json" }]);
  assert.deepEqual(manifest, []);
  assert.deepEqual(calls, [
    "praticas/data/estacoes/index.json",
    "assets/praticas/media.json"
  ]);
});

test("carrega, valida e prepara somente a estacao selecionada", async () => {
  const calls = [];
  const validationOptions = [];
  const phaseMedia = { media: [{ id: "curva" }], directIds: ["curva"], missingIds: [] };
  const loaded = await loadStation(
    { id: "station-v2", file: "station-v2.json", schemaVersion: 2 },
    {
      fetch: async (url) => {
        calls.push(url);
        return { ok: true, json: async () => ({ ...station, id: "station-v2", version: 2 }) };
      },
      utils: {
        validateStation(value, options) {
          validationOptions.push(options);
          return { valid: value.id === "station-v2", errors: [] };
        }
      },
      media: {
        collectStationMedia(value, manifest) {
          assert.equal(value.id, "station-v2");
          assert.deepEqual(manifest, []);
          return { media: phaseMedia.media, phaseMedia: [phaseMedia], missingIds: [], directIds: ["curva"] };
        },
        async preloadStationMedia(media) {
          assert.strictEqual(media, phaseMedia.media);
          return { loaded: media, failures: [] };
        }
      },
      mediaManifest: []
    }
  );

  assert.deepEqual(calls, ["praticas/data/estacoes/station-v2.json"]);
  assert.deepEqual(validationOptions, [{ requireVersion2: true }]);
  assert.equal(loaded.station.id, "station-v2");
  assert.strictEqual(loaded.stationMedia.phaseMedia[0], phaseMedia);
  assert.equal(loaded.mediaStatus, "ready");
});

test("seleciona estacoes por modo e recomenda as relacionadas ao desempenho", () => {
  const entries = [
    { id: "airway-1", title: "Via aerea A", domain: "Via aerea", difficulty: "basica", competencies: ["airway"], tags: ["airway"] },
    { id: "airway-2", title: "Via aerea B", domain: "Via aerea", difficulty: "avancada", competencies: ["airway"], tags: ["airway"] },
    { id: "ecg-1", title: "ECG", domain: "Cardio", difficulty: "basica", competencies: ["ecg"], tags: ["ecg"] }
  ];
  const attempts = [{
    stationId: "airway-1",
    completedAt: "2026-08-10T12:00:00.000Z",
    evaluations: [{ itemId: "airway", status: "ausente" }]
  }];

  const directed = selectStationEntry(entries, "directed", { domain: "Cardio" }, attempts, [], () => 0);
  assert.equal(directed.entry.id, "ecg-1");

  const exam = selectStationEntry(entries, "exam", {}, attempts, ["airway-1"], () => 0);
  assert.equal(exam.entry.id, "airway-2");
  assert.deepEqual(exam.cycleIds, ["airway-1", "airway-2"]);

  const review = selectStationEntry(entries, "review", {}, attempts, [], () => 0);
  assert.equal(review.entry.id, "airway-2");
  assert.deepEqual(getRelatedStationEntries(entries, attempts).map((entry) => entry.id), ["airway-2", "ecg-1"]);
});

test("filtra treino dirigido por competencia mesmo quando ela nao e uma tag", () => {
  const entries = [
    { id: "a", title: "Alfa", domain: "Emergencia", difficulty: "basica", competencies: ["via-aerea"], tags: [] },
    { id: "b", title: "Beta", domain: "Emergencia", difficulty: "basica", competencies: ["via-aerea"], tags: ["procedimento"] },
    { id: "c", title: "Gama", domain: "Emergencia", difficulty: "basica", competencies: ["ecg"], tags: [] }
  ];

  const selected = selectStationEntry(entries, "directed", { competency: "via-aerea" }, [], [], () => 0);
  const alternative = selectAlternativeStation({
    entries,
    mode: "directed",
    filters: { competency: "via-aerea" },
    attempts: [],
    cycleIds: ["exam-preservado"],
    currentEntryId: "a",
    randomFn: () => 0
  });

  assert.equal(selected.entry.id, "a");
  assert.equal(alternative.entry.id, "b");
  assert.deepEqual(alternative.cycleIds, ["exam-preservado"]);
});

test("filtra treino dirigido por disponibilidade de midia", () => {
  const entries = [
    { id: "com-midia", title: "Com midia", domain: "Emergencia", difficulty: "basica", hasMedia: true },
    { id: "sem-midia", title: "Sem midia", domain: "Emergencia", difficulty: "basica", hasMedia: false }
  ];

  const selected = selectStationEntry(entries, "directed", { media: "without" }, [], [], () => 0);

  assert.equal(selected.entry.id, "sem-midia");
});

test("persiste modo, filtros e ciclo sem incluir audio", () => {
  const values = new Map();
  const storage = {
    setItem(key, value) { values.set(key, value); },
    getItem(key) { return values.get(key) || null; }
  };

  savePracticeSetup(storage, {
    mode: "exam",
    filters: { domain: "Via aerea", difficulty: "", competency: "", media: "", unattempted: true },
    cycleIds: ["station-1", "station-2"],
    audioBlob: { shouldNotPersist: true }
  });

  assert.equal(CYCLE_KEY, "teme26-practice-cycle-v2");
  assert.equal(PREFERENCES_KEY, "teme26-practice-setup-v2");
  assert.deepEqual(JSON.parse(storage.getItem(CYCLE_KEY)), ["station-1", "station-2"]);
  assert.deepEqual(JSON.parse(storage.getItem(PREFERENCES_KEY)), {
    mode: "exam",
    filters: { domain: "Via aerea", difficulty: "", competency: "", media: "", unattempted: true }
  });
  assert.deepEqual(restorePracticeSetup(storage), {
    mode: "exam",
    filters: { domain: "Via aerea", difficulty: "", competency: "", media: "", unattempted: true },
    cycleIds: ["station-1", "station-2"]
  });
});

test("persiste o filtro de midia e aceita setups salvos sem esse campo", () => {
  const storage = createStorage();

  savePracticeSetup(storage, {
    mode: "directed",
    filters: { media: "without" },
    cycleIds: []
  });

  assert.equal(restorePracticeSetup(storage).filters.media, "without");

  storage.setItem(PREFERENCES_KEY, JSON.stringify({
    mode: "directed",
    filters: { domain: "Emergencia" }
  }));
  assert.equal(restorePracticeSetup(storage).filters.media, "");
});

test("sorteia outra estacao conforme o modo sem contaminar o ciclo da prova", () => {
  const entries = [
    { id: "airway-1", title: "Via aerea A", domain: "Via aerea", difficulty: "basica", competencies: ["airway"], tags: ["airway"] },
    { id: "airway-2", title: "Via aerea B", domain: "Via aerea", difficulty: "avancada", competencies: ["airway"], tags: ["airway"] },
    { id: "ecg-1", title: "ECG", domain: "Cardio", difficulty: "basica", competencies: ["ecg"], tags: ["ecg"] }
  ];
  const attempts = [{
    stationId: "airway-1",
    completedAt: "2026-08-10T12:00:00.000Z",
    evaluations: [{ itemId: "airway", status: "ausente" }]
  }];
  const originalCycle = ["airway-1"];

  const exam = selectAlternativeStation({
    entries,
    mode: "exam",
    filters: {},
    attempts,
    cycleIds: originalCycle,
    currentEntryId: "airway-1",
    randomFn: () => 0
  });
  assert.equal(exam.entry.id, "airway-2");
  assert.deepEqual(exam.cycleIds, ["airway-1", "airway-2"]);
  assert.deepEqual(originalCycle, ["airway-1"]);

  const review = selectAlternativeStation({
    entries,
    mode: "review",
    filters: {},
    attempts,
    cycleIds: originalCycle,
    currentEntryId: "airway-1"
  });
  assert.equal(review.entry.id, "airway-2");
  assert.deepEqual(review.cycleIds, originalCycle);

  const directed = selectAlternativeStation({
    entries,
    mode: "directed",
    filters: { domain: "Cardio" },
    attempts,
    cycleIds: originalCycle,
    currentEntryId: "airway-1",
    randomFn: () => 0
  });
  assert.equal(directed.entry.id, "ecg-1");
  assert.deepEqual(directed.cycleIds, originalCycle);
});

test("enriquece os cinco ids legados sem baixar seus JSONs", async () => {
  const legacyIndex = [
    { id: "2025-vm-autopeep", file: "2025-vm-autopeep.json", year: 2025 },
    { id: "2025-trauma-hemorragico", file: "2025-trauma-hemorragico.json", year: 2025 },
    { id: "2025-pocus-aaa-acesso", file: "2025-pocus-aaa-acesso.json", year: 2025 },
    { id: "2025-pediatria-colinergico", file: "2025-pediatria-colinergico.json", year: 2025 },
    { id: "2025-tce-hic", file: "2025-tce-hic.json", year: 2025 }
  ];
  const calls = [];
  const entries = await loadStationIndex(async (url) => {
    calls.push(url);
    return { ok: true, json: async () => legacyIndex };
  });

  assert.deepEqual(calls, ["praticas/data/estacoes/index.json"]);
  assert.deepEqual(entries.map(({ id, examTitle, domain, difficulty }) => ({ id, examTitle, domain, difficulty })), [
    { id: "2025-vm-autopeep", examTitle: "Deterioração em ventilação invasiva", domain: "Via aérea e ventilação mecânica", difficulty: "intermediaria" },
    { id: "2025-trauma-hemorragico", examTitle: "Trauma com sangramento externo importante", domain: "Trauma e controle de danos", difficulty: "intermediaria" },
    { id: "2025-pocus-aaa-acesso", examTitle: "POCUS no choque e acesso vascular guiado", domain: "POCUS", difficulty: "avancada" },
    { id: "2025-pediatria-colinergico", examTitle: "Criança com secreções e rebaixamento", domain: "Emergências pediátricas e toxicologia", difficulty: "intermediaria" },
    { id: "2025-tce-hic", examTitle: "Deterioração neurológica após trauma", domain: "Emergências neurológicas", difficulty: "avancada" }
  ]);
  entries.forEach((entry) => {
    assert.ok(Array.isArray(entry.domains) && entry.domains.length > 0, entry.id);
    assert.ok(Array.isArray(entry.competencies) && entry.competencies.length > 0, entry.id);
    assert.ok(Array.isArray(entry.tags) && entry.tags.length > 0, entry.id);
  });
});

test("mantem metadados v2 do indice acima do fallback legado", async () => {
  const entries = await loadStationIndex(async () => ({
    ok: true,
    json: async () => [{
      id: "2025-vm-autopeep",
      file: "2025-vm-autopeep-v2.json",
      schemaVersion: 2,
      examTitle: "Título neutro v2",
      domain: "Domínio v2",
      domains: ["Domínio v2"],
      difficulty: "avancada",
      competencies: ["competência-v2"],
      tags: ["tag-v2"]
    }]
  }));

  assert.equal(entries[0].examTitle, "Título neutro v2");
  assert.equal(entries[0].domain, "Domínio v2");
  assert.equal(entries[0].difficulty, "avancada");
  assert.deepEqual(entries[0].competencies, ["competência-v2"]);
});

test("renderiza modos como radios nativos com uma unica opcao marcada", () => {
  const markup = renderPracticeModeControl("review");

  assert.equal((markup.match(/type="radio"/g) || []).length, 3);
  assert.equal((markup.match(/name="practice-mode"/g) || []).length, 3);
  assert.match(markup, /value="exam"/);
  assert.match(markup, /value="directed"/);
  assert.match(markup, /value="review"[^>]*checked/);
  assert.doesNotMatch(markup, /role="radio"|role="radiogroup"/);
});

test("mantem preview e acoes de inicio visiveis e desabilitadas durante preload", () => {
  const selectedEntry = {
    id: "2025-vm-autopeep",
    title: "Ventilação mecânica e auto-PEEP",
    examTitle: "Deterioração em ventilação invasiva",
    domain: "Via aérea e ventilação mecânica",
    difficulty: "intermediaria"
  };
  const view = getSetupStationView(null, selectedEntry, "directed", "loading");
  const actions = renderPracticeStartActions(view);

  assert.equal(view.visible, true);
  assert.equal(view.startDisabled, true);
  assert.equal(view.title, selectedEntry.title);
  assert.match(actions, /id="practice-start-record"[^>]*disabled/);
  assert.match(actions, /id="practice-start-manual"[^>]*disabled/);
});

test("mantem start bloqueado no preload e habilita quando a estacao fica pronta", async () => {
  const pendingStation = deferred();
  const storage = createStorage();
  const fetch = async (url) => {
    if (url.endsWith("index.json")) return jsonResponse([{ id: "a", file: "a.json" }]);
    if (url.endsWith("media.json")) return jsonResponse([]);
    return pendingStation.promise;
  };
  const fixture = createInteractiveRoot(fetch, storage);
  const app = createPracticeApp(fixture.root);

  const mounting = app.mount();
  await waitFor(() => {
    assert.equal(fixture.simulator.querySelector("#practice-start-manual").disabled, true);
  });
  fixture.simulator.querySelector("#practice-start-manual").click();
  assert.equal(storage.getItem(DRAFT_KEY), null);
  assert.equal(fixture.intervals.length, 0);

  pendingStation.resolve(jsonResponse(createStation("a")));
  await mounting;
  assert.equal(fixture.simulator.querySelector("#practice-start-manual").disabled, false);
});

test("troca o modo pelo evento change do radio nativo", async () => {
  let stationLoads = 0;
  const storage = createStorage();
  const fetch = async (url) => {
    if (url.endsWith("index.json")) return jsonResponse([{ id: "a", file: "a.json" }]);
    if (url.endsWith("media.json")) return jsonResponse([]);
    stationLoads += 1;
    return jsonResponse(createStation("a"));
  };
  const fixture = createInteractiveRoot(fetch, storage);
  const app = createPracticeApp(fixture.root);
  await app.mount();

  const examInput = fixture.simulator.querySelectorAll("input[name='practice-mode']")
    .find((input) => input.value === "exam");
  examInput.checked = true;
  examInput.dispatch("change");

  await waitFor(() => {
    assert.equal(JSON.parse(storage.getItem(PREFERENCES_KEY)).mode, "exam");
    assert.equal(stationLoads, 2);
    const currentExamInput = fixture.simulator.querySelectorAll("input[name='practice-mode']")
      .find((input) => input.value === "exam");
    assert.equal(currentExamInput.checked, true);
  });
});

test("renderiza filtro de midia com todas, com e sem midia", async () => {
  const storage = createStorage();
  const fetch = async (url) => {
    if (url.endsWith("index.json")) return jsonResponse([{ id: "a", file: "a.json", hasMedia: true }]);
    if (url.endsWith("media.json")) return jsonResponse([]);
    return jsonResponse(createStation("a"));
  };
  const fixture = createInteractiveRoot(fetch, storage);
  const app = createPracticeApp(fixture.root);

  await app.mount();

  assert.match(fixture.simulator.innerHTML, /<select name="media">/);
  assert.match(fixture.simulator.innerHTML, /<option value=""[^>]*>Todas as mídias<\/option>/);
  assert.match(fixture.simulator.innerHTML, /<option value="with"[^>]*>Com mídia<\/option>/);
  assert.match(fixture.simulator.innerHTML, /<option value="without"[^>]*>Sem mídia<\/option>/);
});

test("sorteia outra estacao dirigida por click sem contaminar o ciclo da prova", async () => {
  const stationUrls = [];
  const storage = createStorage({
    [PREFERENCES_KEY]: JSON.stringify({ mode: "directed", filters: {} }),
    [CYCLE_KEY]: JSON.stringify(["exam-preservado"])
  });
  const fetch = async (url) => {
    if (url.endsWith("index.json")) return jsonResponse([
      { id: "a", file: "a.json", domain: "Teste" },
      { id: "b", file: "b.json", domain: "Teste" }
    ]);
    if (url.endsWith("media.json")) return jsonResponse([]);
    stationUrls.push(url);
    return jsonResponse({}, false);
  };
  const fixture = createInteractiveRoot(fetch, storage);
  const app = createPracticeApp(fixture.root);
  await app.mount();

  fixture.simulator.querySelector("#practice-choose-another").click();
  await waitFor(() => assert.equal(stationUrls.length, 2));

  assert.match(stationUrls[0], /a\.json$/);
  assert.match(stationUrls[1], /b\.json$/);
  assert.deepEqual(JSON.parse(storage.getItem(CYCLE_KEY)), ["exam-preservado"]);
});

test("sorteia outra estacao de prova por click e persiste o ciclo atualizado", async () => {
  const stationUrls = [];
  const storage = createStorage({
    [PREFERENCES_KEY]: JSON.stringify({ mode: "exam", filters: {} }),
    [CYCLE_KEY]: JSON.stringify([])
  });
  const fetch = async (url) => {
    if (url.endsWith("index.json")) return jsonResponse([
      { id: "a", file: "a.json" },
      { id: "b", file: "b.json" }
    ]);
    if (url.endsWith("media.json")) return jsonResponse([]);
    stationUrls.push(url);
    return jsonResponse({}, false);
  };
  const fixture = createInteractiveRoot(fetch, storage);
  const app = createPracticeApp(fixture.root);
  await app.mount();

  const cycleBeforeClick = JSON.parse(storage.getItem(CYCLE_KEY));
  assert.deepEqual(cycleBeforeClick, [stationUrls[0].match(/([^/]+)\.json$/)[1]]);

  fixture.simulator.querySelector("#practice-choose-another").click();
  await waitFor(() => assert.equal(stationUrls.length, 2));

  const loadedIds = stationUrls.map((url) => url.match(/([^/]+)\.json$/)[1]);
  assert.notEqual(loadedIds[0], loadedIds[1]);
  assert.deepEqual(JSON.parse(storage.getItem(CYCLE_KEY)), loadedIds);
});

test("retry dispara um novo load e libera o start apos sucesso", async () => {
  let stationLoads = 0;
  const storage = createStorage();
  const fetch = async (url) => {
    if (url.endsWith("index.json")) return jsonResponse([{ id: "a", file: "a.json" }]);
    if (url.endsWith("media.json")) return jsonResponse([]);
    stationLoads += 1;
    return stationLoads === 1
      ? jsonResponse({}, false)
      : jsonResponse(createStation("a"));
  };
  const fixture = createInteractiveRoot(fetch, storage);
  const app = createPracticeApp(fixture.root);
  await app.mount();

  fixture.simulator.querySelector("#practice-retry-load").click();
  await waitFor(() => {
    assert.equal(stationLoads, 2);
    assert.equal(fixture.simulator.querySelector("#practice-start-manual").disabled, false);
  });
});

test("mudanca de fase preserva inicio gravador e intervalo ativos", async () => {
  const storage = createStorage();
  const fetch = async (url) => {
    if (url.endsWith("index.json")) return jsonResponse([{ id: "a", file: "a.json" }]);
    if (url.endsWith("media.json")) return jsonResponse([]);
    return jsonResponse(createStation("a"));
  };
  const fixture = createInteractiveRoot(fetch, storage);
  const app = createPracticeApp(fixture.root);
  await app.mount();

  fixture.simulator.querySelector("#practice-start-record").click();
  await waitFor(() => assert.ok(fixture.simulator.querySelector("#practice-next")));
  const before = JSON.parse(storage.getItem(DRAFT_KEY));
  const recorder = fixture.recorders[0];
  const interval = fixture.intervals[0];

  fixture.simulator.querySelector("#practice-next").click();
  const after = JSON.parse(storage.getItem(DRAFT_KEY));

  assert.equal(after.phaseIndex, 1);
  assert.equal(after.startedAtMs, before.startedAtMs);
  assert.strictEqual(fixture.recorders[0], recorder);
  assert.equal(recorder.state, "recording");
  assert.deepEqual(fixture.intervals, [interval]);
  assert.match(fixture.simulator.innerHTML, /Gravação em andamento/);
});

test("mount restaura draft em andamento sem recuperar audio", async () => {
  const now = Date.now();
  const storage = createStorage({
    [DRAFT_KEY]: JSON.stringify({
      stationId: "a",
      stationVersion: 1,
      mode: "exam",
      status: "running",
      phaseIndex: 1,
      createdAtMs: now - 2000,
      startedAtMs: now - 1000,
      completedAtMs: null
    })
  });
  const fetch = async (url) => {
    if (url.endsWith("index.json")) return jsonResponse([{ id: "a", file: "a.json" }]);
    if (url.endsWith("media.json")) return jsonResponse([]);
    return jsonResponse(createStation("a"));
  };
  const fixture = createInteractiveRoot(fetch, storage);
  const app = createPracticeApp(fixture.root);

  await app.mount();

  assert.match(fixture.simulator.innerHTML, /Sessão restaurada sem a gravação anterior/);
  assert.match(fixture.simulator.innerHTML, /Treino sem gravação/);
  assert.equal(fixture.recorders.length, 0);
  assert.equal(fixture.intervals.length, 1);
  assert.match(fixture.simulator.innerHTML, /Fase 2\/2/);
});

test("mount concorrente restaura um unico draft sem sortear outra estacao", async () => {
  const now = Date.now();
  const loads = { index: 0, media: 0, station: 0 };
  const storage = createStorage({
    [DRAFT_KEY]: JSON.stringify({
      stationId: "a",
      stationVersion: 1,
      mode: "exam",
      status: "running",
      phaseIndex: 1,
      createdAtMs: now - 2000,
      startedAtMs: now - 1000,
      completedAtMs: null
    })
  });
  const fetch = async (url) => {
    if (url.endsWith("index.json")) {
      loads.index += 1;
      return jsonResponse([{ id: "a", file: "a.json" }]);
    }
    if (url.endsWith("media.json")) {
      loads.media += 1;
      return jsonResponse([]);
    }
    loads.station += 1;
    return jsonResponse(createStation("a"));
  };
  const fixture = createInteractiveRoot(fetch, storage);
  const app = createPracticeApp(fixture.root);

  const firstMount = app.mount();
  const secondMount = app.mount();
  assert.strictEqual(secondMount, firstMount);
  await firstMount;

  assert.deepEqual(loads, { index: 1, media: 1, station: 1 });
  assert.equal(fixture.intervals.length, 1);
  assert.match(fixture.simulator.innerHTML, /Sessão restaurada sem a gravação anterior/);
  assert.match(fixture.simulator.innerHTML, /Fase 2\/2/);
});
