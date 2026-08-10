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
  restorePracticeSetup
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

test("persiste modo, filtros e ciclo sem incluir audio", () => {
  const values = new Map();
  const storage = {
    setItem(key, value) { values.set(key, value); },
    getItem(key) { return values.get(key) || null; }
  };

  savePracticeSetup(storage, {
    mode: "exam",
    filters: { domain: "Via aerea", difficulty: "", competency: "", unattempted: true },
    cycleIds: ["station-1", "station-2"],
    audioBlob: { shouldNotPersist: true }
  });

  assert.equal(CYCLE_KEY, "teme26-practice-cycle-v2");
  assert.equal(PREFERENCES_KEY, "teme26-practice-setup-v2");
  assert.deepEqual(JSON.parse(storage.getItem(CYCLE_KEY)), ["station-1", "station-2"]);
  assert.deepEqual(JSON.parse(storage.getItem(PREFERENCES_KEY)), {
    mode: "exam",
    filters: { domain: "Via aerea", difficulty: "", competency: "", unattempted: true }
  });
  assert.deepEqual(restorePracticeSetup(storage), {
    mode: "exam",
    filters: { domain: "Via aerea", difficulty: "", competency: "", unattempted: true },
    cycleIds: ["station-1", "station-2"]
  });
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
