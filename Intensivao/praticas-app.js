(function(root, factory) {
  const api = factory(root);
  api.createPracticeApp = factory;
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TemePracticeApp = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(root) {
  "use strict";

  const STORAGE_KEY = "teme26-practice-attempts-v1";
  const DRAFT_KEY = "teme26-practice-draft-v2";
  const ANSWERS_KEY = "teme26-practice-answers-v1";
  const CYCLE_KEY = "teme26-practice-cycle-v2";
  const EXAM_PLAN_KEY = "teme26-practice-exam-plan-v1";
  const PREFERENCES_KEY = "teme26-practice-setup-v2";
  const DEFAULT_FILTERS = {
    domain: "",
    difficulty: "",
    competency: "",
    media: "",
    unattempted: false
  };
  const DIRECTED_FAMILY_PREFIXES = {
    "Via aérea e ventilação mecânica": "VA",
    "Trauma e APH": "Trauma",
    POCUS: "POCUS",
    "Cardiovascular e PCR": "Cardio/PCR",
    Pediatria: "Pediatria",
    Neurologia: "Neuro",
    "Respiratório, sepse e metabólico": "Clínico",
    "Toxicologia e animais peçonhentos": "Toxico",
    Obstetrícia: "Obstetrícia",
    "Procedimentos, analgesia e sedação": "Procedimentos",
    Gastroenterologia: "Gastro",
    Gestão: "Gestão"
  };
  const LEGACY_STATION_METADATA = {
    "2025-vm-autopeep": {
      title: "Ventilação mecânica e auto-PEEP",
      examTitle: "Deterioração em ventilação invasiva",
      domain: "Via aérea e ventilação mecânica",
      domains: ["Via aérea e ventilação mecânica"],
      difficulty: "intermediaria",
      competencies: ["gasometria", "vcv", "autopeep", "reduz-volume-minuto", "aumenta-expiracao"],
      tags: ["curvas ventilatórias", "auto-PEEP", "broncoobstrução", "gasometria", "reavaliação"]
    },
    "2025-trauma-hemorragico": {
      title: "Trauma com hemorragia exsanguinante",
      examTitle: "Trauma com sangramento externo importante",
      domain: "Trauma e controle de danos",
      domains: ["Trauma e controle de danos"],
      difficulty: "intermediaria",
      competencies: ["hemorragia", "compressao", "torniquete", "choque", "efast", "transfusao", "txa", "calcio", "aquecimento", "cirurgia"],
      tags: ["XABCDE", "hemorragia exsanguinante", "choque hemorrágico", "transfusão maciça", "controle cirúrgico"]
    },
    "2025-pocus-aaa-acesso": {
      title: "POCUS no choque, aneurisma de aorta e acesso guiado",
      examTitle: "POCUS no choque e acesso vascular guiado",
      domain: "POCUS",
      domains: ["POCUS"],
      difficulty: "avancada",
      competencies: ["aorta-transversal", "aorta-aneurisma", "plax", "subcostal", "vci", "morison", "diagnostico", "transdutor", "tecnica", "agulha"],
      tags: ["aorta abdominal", "choque hemorrágico", "FAST", "punção guiada", "visualização da ponta da agulha"]
    },
    "2025-pediatria-colinergico": {
      title: "Pediatria: síndrome colinérgica por chumbinho",
      examTitle: "Criança com secreções e rebaixamento",
      domain: "Emergências pediátricas e toxicologia",
      domains: ["Emergências pediátricas e toxicologia"],
      difficulty: "intermediaria",
      competencies: ["hipotese-colinergica", "glicemia", "oxigenio", "aquecimento", "acesso", "agente-identifica", "atropina-dose", "atropina-bolus"],
      tags: ["toxíndrome colinérgica", "descontaminação", "atropina", "via aérea pediátrica", "CIATox"]
    },
    "2025-tce-hic": {
      title: "TCE grave e hipertensão intracraniana",
      examTitle: "Deterioração neurológica após trauma",
      domain: "Emergências neurológicas",
      domains: ["Emergências neurológicas"],
      difficulty: "avancada",
      competencies: ["via-aerea", "capnia", "paco2", "hiperventilacao", "hiperosmolar", "cab30", "cabeca-neutra", "reversao", "neurocirurgia", "pressao"],
      tags: ["TCE grave", "lesão secundária", "terapia hiperosmolar", "herniação", "coagulopatia", "neurocirurgia"]
    }
  };
  const state = {
    stationEntries: [],
    stations: [],
    station: null,
    selectedEntry: null,
    mode: "directed",
    filters: { ...DEFAULT_FILTERS },
    cycleIds: [],
    examPlan: null,
    mediaManifest: [],
    stationMedia: null,
    mediaStatus: "idle",
    loadError: "",
    loadToken: 0,
    session: null,
    timerId: null,
    mediaRecorder: null,
    mediaStream: null,
    recordingGeneration: 0,
    audioChunks: [],
    audioBlob: null,
    audioUrl: null,
    runtimeNotice: "",
    transcript: "",
    phaseAnswers: {},
    lastAttempt: null,
    apiStatus: "idle",
    dashboardSyncStarted: false
  };

  const sessionModule = root && root.TemePracticeSession
    ? root.TemePracticeSession
    : (typeof require === "function" ? require("./praticas-session.js") : null);
  const catalogModule = root && root.TemePracticeCatalog
    ? root.TemePracticeCatalog
    : (typeof require === "function" ? require("./praticas-catalog.js") : null);
  const mediaModule = root && root.TemePracticeMedia
    ? root.TemePracticeMedia
    : (typeof require === "function" ? require("./praticas-media.js") : null);
  const utilsModule = root && root.TemePracticeUtils
    ? root.TemePracticeUtils
    : (typeof require === "function" ? require("./praticas-utils.js") : null);

  function getPublicStationView(station, mode, caseNumber) {
    if (mode === "exam") {
      const area = catalogModule && typeof catalogModule.getExamArea === "function"
        ? catalogModule.getExamArea(station) : null;
      return {
        kicker: "MODO PROVA",
        title: `${area ? area.label : "Caso"} ${Number.isInteger(caseNumber) && caseNumber > 0 ? caseNumber : 1}`,
        showDiagnosticMeta: false
      };
    }
    if (mode === "review") {
      return {
        kicker: "REVISÃO",
        title: station && station.examTitle ? station.examTitle : "Estação recomendada",
        showDiagnosticMeta: false
      };
    }
    return {
      kicker: station && station.domain ? station.domain : "TREINO DIRIGIDO",
      title: station && station.examTitle ? station.examTitle : "Estação sorteada",
      domain: station && station.domain,
      difficulty: station && station.difficulty,
      showDiagnosticMeta: false
    };
  }

  function getExamCaseNumber(entry, entries) {
    if (!entry || !catalogModule || typeof catalogModule.getExamArea !== "function") return 1;
    const area = catalogModule.getExamArea(entry);
    if (!area) return 1;
    const sameArea = (Array.isArray(entries) ? entries : []).filter((candidate) =>
      catalogModule.getExamArea(candidate)?.label === area.label
    );
    const index = sameArea.findIndex((candidate) => candidate.id === entry.id);
    return index >= 0 ? index + 1 : 1;
  }

  function getPracticePhaseControls(session, station) {
    return {
      previous: {
        action: "previous",
        label: "Anterior",
        disabled: !session || session.phaseIndex <= 0
      },
      primary: getPracticePrimaryAction(session, station)
    };
  }

  function areStartActionsDisabled(mediaStatus) {
    return mediaStatus !== "ready";
  }

  function getCurrentPhaseMedia(stationMedia, session) {
    const phaseMedia = stationMedia && Array.isArray(stationMedia.phaseMedia)
      ? stationMedia.phaseMedia
      : [];
    const phaseIndex = session && Number.isInteger(session.phaseIndex) ? session.phaseIndex : -1;
    return phaseMedia[phaseIndex] || { media: [], directIds: [], missingIds: [] };
  }

  function getRunningMediaOptions(phaseMedia) {
    if (!phaseMedia) return { reviewMode: false };
    return {
      reviewMode: false,
      directIds: phaseMedia && Array.isArray(phaseMedia.directIds) ? phaseMedia.directIds : []
    };
  }

  function getResultMediaOptions() {
    return { reviewMode: true };
  }

  function savePracticeDraft(storage, session) {
    if (!storage || !sessionModule || typeof sessionModule.serializeSession !== "function") return;
    storage.setItem(DRAFT_KEY, sessionModule.serializeSession(session));
  }

  function clearPracticeDraft(storage) {
    if (!storage) return;
    storage.removeItem(DRAFT_KEY);
  }

  function restorePracticeDraft(raw, station, nowMs) {
    if (!sessionModule || typeof sessionModule.restoreSession !== "function") return null;
    const session = sessionModule.restoreSession(raw, station, nowMs);
    if (!session) return null;
    return {
      session,
      audioBlob: null,
      audioUrl: null,
      notice: "Sessão restaurada sem a gravação anterior."
    };
  }

  function normalizePracticeMode(mode) {
    return ["exam", "directed", "review"].includes(mode) ? mode : "directed";
  }

  function normalizePracticeFilters(filters) {
    const source = filters && typeof filters === "object" ? filters : {};
    return {
      domain: typeof source.domain === "string" ? source.domain : "",
      difficulty: typeof source.difficulty === "string" ? source.difficulty : "",
      competency: typeof source.competency === "string" ? source.competency : "",
      media: ["with", "without"].includes(source.media) ? source.media : "",
      unattempted: source.unattempted === true
    };
  }

  function parseStoredValue(storage, key, fallback) {
    if (!storage || typeof storage.getItem !== "function") return fallback;
    try {
      const value = storage.getItem(key);
      return value == null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function savePracticeSetup(storage, setup) {
    if (!storage || typeof storage.setItem !== "function") return;
    const source = setup && typeof setup === "object" ? setup : {};
    storage.setItem(CYCLE_KEY, JSON.stringify(
      Array.isArray(source.cycleIds) ? Array.from(new Set(source.cycleIds.filter((id) => typeof id === "string"))) : []
    ));
    storage.setItem(PREFERENCES_KEY, JSON.stringify({
      mode: normalizePracticeMode(source.mode),
      filters: normalizePracticeFilters(source.filters)
    }));
  }

  function restorePracticeSetup(storage) {
    const preferences = parseStoredValue(storage, PREFERENCES_KEY, {});
    const cycleIds = parseStoredValue(storage, CYCLE_KEY, []);
    return {
      mode: normalizePracticeMode(preferences && preferences.mode),
      filters: normalizePracticeFilters(preferences && preferences.filters),
      cycleIds: Array.isArray(cycleIds)
        ? Array.from(new Set(cycleIds.filter((id) => typeof id === "string")))
        : []
    };
  }

  function restoreExamPlan(storage, entries) {
    const plan = parseStoredValue(storage, EXAM_PLAN_KEY, null);
    const ids = plan && plan.stationIds;
    const available = new Set((Array.isArray(entries) ? entries : []).map((entry) => entry.id));
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 5 ||
        new Set(ids).size !== ids.length || ids.some((id) => !available.has(id)) ||
        !Number.isInteger(plan.currentIndex) || plan.currentIndex < 0 || plan.currentIndex >= ids.length ||
        !Number.isInteger(plan.roundNumber) || plan.roundNumber < 0) return null;
    return { stationIds: ids, currentIndex: plan.currentIndex, roundNumber: plan.roundNumber };
  }

  function saveExamPlan() {
    if (root.localStorage && state.examPlan) {
      root.localStorage.setItem(EXAM_PLAN_KEY, JSON.stringify(state.examPlan));
    }
  }

  function getFetch(fetchFn) {
    if (typeof fetchFn === "function") return fetchFn;
    if (root && typeof root.fetch === "function") return root.fetch.bind(root);
    throw new Error("Fetch indisponível neste navegador.");
  }

  async function loadJson(url, fetchFn, errorMessage) {
    const response = await getFetch(fetchFn)(url, { cache: "no-store" });
    if (!response || !response.ok) throw new Error(errorMessage);
    return response.json();
  }

  function isStationEntry(entry) {
    return Boolean(entry) && typeof entry === "object" &&
      typeof entry.id === "string" && entry.id.length > 0 &&
      typeof entry.file === "string" && entry.file.length > 0;
  }

  async function loadStationIndex(fetchFn) {
    const index = await loadJson(
      `${stationBasePath()}index.json`,
      fetchFn,
      "Não foi possível carregar o índice de estações."
    );
    if (!Array.isArray(index) || !index.every(isStationEntry)) {
      throw new Error("O índice de estações está inválido.");
    }
    return index.map((entry) => ({
      ...(LEGACY_STATION_METADATA[entry.id] || {}),
      ...entry
    }));
  }

  async function loadMediaManifest(fetchFn, media) {
    const manifest = await loadJson(
      "assets/praticas/media.json",
      fetchFn,
      "Não foi possível carregar o manifesto de mídia."
    );
    const renderer = media || mediaModule;
    if (!renderer || typeof renderer.validateMediaManifest !== "function") {
      throw new Error("O visualizador de mídia não está disponível.");
    }
    const validation = renderer.validateMediaManifest(manifest);
    if (!validation.valid) throw new Error(`Manifesto de mídia inválido: ${validation.errors.join("; ")}`);
    return manifest;
  }

  async function loadStation(entry, options) {
    if (!isStationEntry(entry)) throw new Error("A estação selecionada não está disponível.");
    const dependencies = options && typeof options === "object" ? options : {};
    const validator = dependencies.utils || utilsModule;
    const renderer = dependencies.media || mediaModule;
    if (!validator || typeof validator.validateStation !== "function") {
      throw new Error("O validador de estações não está disponível.");
    }
    if (!renderer || typeof renderer.collectStationMedia !== "function" ||
        typeof renderer.preloadStationMedia !== "function") {
      throw new Error("O visualizador de mídia não está disponível.");
    }

    const station = await loadJson(
      `${stationBasePath()}${entry.file}`,
      dependencies.fetch,
      `Falha ao carregar ${entry.file}.`
    );
    const validation = validator.validateStation(station, {
      requireVersion2: entry.schemaVersion === 2
    });
    if (!validation.valid) throw new Error(`${entry.id}: ${validation.errors.join("; ")}`);

    const stationMedia = renderer.collectStationMedia(
      station,
      Object.prototype.hasOwnProperty.call(dependencies, "mediaManifest")
        ? dependencies.mediaManifest
        : state.mediaManifest
    );
    if (stationMedia.missingIds.length) {
      throw new Error(`Recurso ausente: ${stationMedia.missingIds.join(", ")}.`);
    }
    const preload = await renderer.preloadStationMedia(stationMedia.media);
    if (preload.failures.length) {
      throw new Error(`Recurso ausente: ${preload.failures.map((failure) => failure.item.id).join(", ")}.`);
    }
    return { station, stationMedia, mediaStatus: "ready" };
  }

  function filterDirectedStationEntries(entries, filters, attempts) {
    const selectedFilters = normalizePracticeFilters(filters);
    const filtered = catalogModule.filterStations(entries, {
      domain: selectedFilters.domain,
      difficulty: selectedFilters.difficulty,
      hasMedia: selectedFilters.media === "with"
        ? true
        : selectedFilters.media === "without"
          ? false
          : undefined,
      unattempted: selectedFilters.unattempted
    }, attempts);
    if (!selectedFilters.competency) return filtered;
    return filtered.filter((entry) => (
      (Array.isArray(entry.competencies) && entry.competencies.includes(selectedFilters.competency)) ||
      (Array.isArray(entry.tags) && entry.tags.includes(selectedFilters.competency))
    ));
  }

  function selectStationEntry(entries, mode, filters, attempts, cycleIds, randomFn) {
    const selectedMode = normalizePracticeMode(mode);
    const list = Array.isArray(entries) ? entries : [];
    const catalog = catalogModule;
    if (!catalog) return { entry: null, cycleIds: [] };

    if (selectedMode === "exam") {
      const selection = catalog.pickStation(list, cycleIds, randomFn);
      return { entry: selection.station, cycleIds: selection.cycleIds };
    }
    if (selectedMode === "review") {
      const related = catalog.getRecommendedStations(list, attempts, 3);
      return { entry: related[0] || null, cycleIds: Array.isArray(cycleIds) ? cycleIds : [] };
    }

    const filtered = filterDirectedStationEntries(list, filters, attempts);
    return { entry: filtered[0] || null, cycleIds: Array.isArray(cycleIds) ? cycleIds : [] };
  }

  function selectAlternativeStation(options) {
    const source = options && typeof options === "object" ? options : {};
    const entries = Array.isArray(source.entries) ? source.entries : [];
    const mode = normalizePracticeMode(source.mode);
    const cycleIds = Array.isArray(source.cycleIds) ? source.cycleIds.slice() : [];
    if (!catalogModule) return { entry: null, cycleIds };

    if (mode === "exam") {
      const selection = catalogModule.pickStation(entries, cycleIds, source.randomFn);
      return { entry: selection.station, cycleIds: selection.cycleIds };
    }

    if (mode === "review") {
      const recommended = catalogModule.getRecommendedStations(entries, source.attempts, 3);
      return {
        entry: recommended.find((entry) => entry.id !== source.currentEntryId) || null,
        cycleIds
      };
    }

    const filtered = filterDirectedStationEntries(entries, source.filters, source.attempts)
      .filter((entry) => entry.id !== source.currentEntryId);
    const selection = catalogModule.pickStation(filtered, [], source.randomFn);
    return { entry: selection.station, cycleIds };
  }

  function getRelatedStationEntries(entries, attempts) {
    if (!catalogModule || typeof catalogModule.getRecommendedStations !== "function") return [];
    return catalogModule.getRecommendedStations(entries, attempts, 3);
  }

  function getExamAlternatives() {
    if (!state.examPlan || !state.selectedEntry || !catalogModule) return [];
    const area = catalogModule.getExamArea(state.selectedEntry);
    if (!area) return [];
    const planned = new Set(state.examPlan.stationIds);
    return state.stationEntries.filter((entry) => !planned.has(entry.id) &&
      catalogModule.getExamArea(entry)?.key === area.key);
  }

  function enrichStationEntry(entry, station) {
    return {
      ...entry,
      title: station.title || entry.title,
      examTitle: station.examTitle || entry.examTitle,
      domain: station.domain || entry.domain,
      domains: Array.isArray(station.domains) ? station.domains : entry.domains,
      difficulty: station.difficulty || entry.difficulty,
      competencies: Array.isArray(station.competencies) ? station.competencies : entry.competencies,
      tags: Array.isArray(station.tags) ? station.tags : entry.tags
    };
  }

  function createPracticeSession(station, createdAtMs, mode) {
    if (sessionModule && typeof sessionModule.createSession === "function") {
      return sessionModule.createSession(station, mode || state.mode, createdAtMs);
    }
    return {
      stationId: station.id,
      stationVersion: station.version,
      mode: normalizePracticeMode(mode || state.mode),
      status: "ready",
      phaseIndex: 0,
      createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : Date.now(),
      startedAtMs: null,
      completedAtMs: null
    };
  }

  function advancePracticePhase(session) {
    return movePracticePhase(session, "next");
  }

  function movePracticePhase(session, direction) {
    const station = state.station && state.station.id === session.stationId
      ? state.station
      : null;
    if (sessionModule && typeof sessionModule.movePhase === "function") {
      return sessionModule.movePhase(session, station || { phases: [{}, {}] }, direction);
    }
    const phaseCount = station ? station.phases.length : 2;
    return {
      ...session,
      phaseIndex: Math.max(0, Math.min(
        session.phaseIndex + (direction === "previous" ? -1 : direction === "next" ? 1 : 0),
        Math.max(0, phaseCount - 1)
      ))
    };
  }

  function getPracticePrimaryAction(session, station) {
    if (sessionModule && typeof sessionModule.getPrimaryAction === "function") {
      return sessionModule.getPrimaryAction(session, station);
    }
    const isLastPhase = session.phaseIndex >= station.phases.length - 1;
    return isLastPhase
      ? { action: "finish", label: "Finalizar estação" }
      : { action: "next", label: "Próxima tarefa" };
  }

  function getRemainingSeconds(session, nowMs, durationSeconds) {
    if (sessionModule && typeof sessionModule.getRemainingSeconds === "function") {
      const currentStation = state.station && state.station.id === session.stationId
        ? state.station
        : { durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 300 };
      const stationForClock = Number.isFinite(durationSeconds)
        ? { ...currentStation, durationSeconds }
        : currentStation;
      return sessionModule.getRemainingSeconds(session, stationForClock, nowMs);
    }
    const duration = Number.isFinite(durationSeconds)
      ? durationSeconds
      : (state.station && state.station.id === session.stationId
        ? state.station.durationSeconds
        : 300);
    if (!Number.isFinite(session.startedAtMs)) return duration;
    return Math.max(0, duration - Math.floor((nowMs - session.startedAtMs) / 1000));
  }

  function parseStoredAttempts(raw) {
    try {
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function getStoredAttempts() {
    if (!root || !root.localStorage) return [];
    return parseStoredAttempts(root.localStorage.getItem(STORAGE_KEY));
  }

  function upsertAttemptList(attempts, attempt) {
    const list = Array.isArray(attempts) ? attempts : [];
    const filtered = list.filter((item) => !attempt.id || item.id !== attempt.id);
    return [attempt, ...filtered].slice(0, 250);
  }

  function saveAttempt(attempt) {
    if (!root || !root.localStorage) return;
    const next = upsertAttemptList(getStoredAttempts(), attempt);
    root.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    root.localStorage.removeItem(DRAFT_KEY);
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
      }).format(new Date(value));
    } catch {
      return value || "Data não informada";
    }
  }

  function buildPracticeReport(attempt) {
    const score = Number.isFinite(attempt.finalPercent)
      ? attempt.finalPercent
      : attempt.provisionalPercent;
    const lines = [
      "RELATORIO DE TREINO PRATICO TEME",
      "=================================",
      `Estacao: ${attempt.stationTitle || attempt.stationId || "Nao informada"}`,
      `Dominio: ${attempt.domain || "Nao informado"}`,
      `Data: ${formatDate(attempt.completedAt)}`,
      `Nota: ${Number.isFinite(score) ? `${score}%` : "pendente"}`,
      "",
      "CHECKLIST"
    ];

    (attempt.evaluations || []).forEach((evaluation, index) => {
      lines.push(`${index + 1}. [${String(evaluation.status || "ausente").toUpperCase()}] ${evaluation.label || evaluation.itemId}`);
      lines.push(`   Evidencia: ${evaluation.evidence || "Sem evidencia."}`);
      if (evaluation.rationale) lines.push(`   Comentario: ${evaluation.rationale}`);
    });

    if ((attempt.criticalFailures || []).length) {
      lines.push("", "ERROS CRITICOS", ...(attempt.criticalFailures.map((item) => `- ${item}`)));
    }
    if (attempt.transcript) lines.push("", "TRANSCRICAO", attempt.transcript);

    return `${lines.join("\n")}\n`;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatClock(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
  }

  function formatAudioSize(bytes) {
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`
      : `${Math.round(bytes / 1024)} kB`;
  }

  function stationBasePath() {
    return "praticas/data/estacoes/";
  }

  async function loadStations() {
    const entries = await loadStationIndex();
    state.stationEntries = entries;
    state.stations = entries;
    return entries;
  }

  function saveCurrentSetup() {
    if (!root || !root.localStorage) return;
    savePracticeSetup(root.localStorage, state);
  }

  function getStationEntry(stationId) {
    return state.stationEntries.find((entry) => entry.id === stationId) || null;
  }

  function updateStationEntry(entry, station) {
    const enriched = enrichStationEntry(entry, station);
    state.stationEntries = state.stationEntries.map((candidate) => (
      candidate.id === entry.id ? enriched : candidate
    ));
    state.stations = state.stationEntries;
    state.selectedEntry = enriched;
    return enriched;
  }

  async function loadSelectedStation(entry) {
    const requestToken = state.loadToken + 1;
    state.loadToken = requestToken;
    state.selectedEntry = entry || null;
    state.station = null;
    state.stationMedia = null;
    state.mediaStatus = "loading";
    state.loadError = "";
    renderSetup();

    try {
      const loaded = await loadStation(entry);
      if (requestToken !== state.loadToken) return null;
      updateStationEntry(entry, loaded.station);
      state.station = loaded.station;
      state.stationMedia = loaded.stationMedia;
      state.mediaStatus = loaded.mediaStatus;
      state.session = createPracticeSession(state.station, Date.now(), state.mode);
      renderSetup();
      return loaded.station;
    } catch (error) {
      if (requestToken !== state.loadToken) return null;
      state.mediaStatus = "error";
      state.loadError = error && error.message ? error.message : "Recurso ausente.";
      renderSetup();
      return null;
    }
  }

  function selectEntryForCurrentMode(randomFn) {
    if (state.mode === "exam" && catalogModule && typeof catalogModule.buildExamRound === "function") {
      if (!state.examPlan) startNewExamRound(randomFn);
      const plannedHistory = Array.from(new Set(state.cycleIds.concat(state.examPlan.stationIds)));
      if (plannedHistory.length !== state.cycleIds.length) {
        state.cycleIds = plannedHistory;
        saveCurrentSetup();
      }
      return getStationEntry(state.examPlan.stationIds[state.examPlan.currentIndex]);
    }
    const selection = selectStationEntry(
      state.stationEntries,
      state.mode,
      state.filters,
      getStoredAttempts(),
      state.cycleIds,
      randomFn
    );
    state.cycleIds = selection.cycleIds;
    saveCurrentSetup();
    return selection.entry;
  }

  async function loadCurrentModeSelection() {
    const entry = selectEntryForCurrentMode();
    if (!entry) {
      state.station = null;
      state.stationMedia = null;
      state.mediaStatus = "error";
      state.loadError = "Nenhuma estação atende aos filtros atuais.";
      renderSetup();
      return;
    }
    await loadSelectedStation(entry);
  }

  async function setPracticeMode(mode) {
    const nextMode = normalizePracticeMode(mode);
    if (nextMode === "exam" && state.mode !== "exam") startNewExamRound();
    state.mode = nextMode;
    saveCurrentSetup();
    await loadCurrentModeSelection();
  }

  function startNewExamRound(randomFn) {
    if (!catalogModule || typeof catalogModule.buildExamRound !== "function") return;
    const previousPlan = state.examPlan || restoreExamPlan(root.localStorage, state.stationEntries);
    state.examPlan = catalogModule.buildExamRound(
      state.stationEntries,
      state.cycleIds,
      previousPlan ? previousPlan.roundNumber + 1 : 0,
      randomFn
    );
    state.cycleIds = Array.from(new Set(state.cycleIds.concat(state.examPlan.stationIds)));
    saveExamPlan();
    saveCurrentSetup();
  }

  async function advanceExamStation() {
    if (state.mode !== "exam" || !state.examPlan) return;
    if (state.examPlan.currentIndex < state.examPlan.stationIds.length - 1) {
      state.examPlan = { ...state.examPlan, currentIndex: state.examPlan.currentIndex + 1 };
    } else {
      startNewExamRound();
    }
    saveExamPlan();
    const entry = getStationEntry(state.examPlan.stationIds[state.examPlan.currentIndex]);
    if (entry) await loadSelectedStation(entry);
  }

  function stopStreamTracks(stream) {
    if (!stream || typeof stream.getTracks !== "function") return;
    stream.getTracks().forEach((track) => track.stop());
  }

  function clearRecordedAudio() {
    if (state.audioUrl && root.URL) root.URL.revokeObjectURL(state.audioUrl);
    state.audioUrl = null;
    state.audioBlob = null;
    state.audioChunks = [];
  }

  function cleanupRecording() {
    state.recordingGeneration += 1;
    const recorder = state.mediaRecorder;
    const stream = state.mediaStream;
    state.mediaRecorder = null;
    state.mediaStream = null;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stopStreamTracks(stream);
    clearRecordedAudio();
  }

  function chooseAudioMimeType() {
    if (!root.MediaRecorder || typeof root.MediaRecorder.isTypeSupported !== "function") return "";
    return ["audio/mp4;codecs=mp4a.40.2", "audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"]
      .find((type) => root.MediaRecorder.isTypeSupported(type)) || "";
  }

  async function startRecording(expectedLifecycleGeneration, expectedRecordingGeneration) {
    if (!root.navigator || !root.navigator.mediaDevices || !root.MediaRecorder) {
      throw new Error("Este navegador não oferece gravação de áudio compatível.");
    }
    const stream = await root.navigator.mediaDevices.getUserMedia({ audio: true });
    if (
      expectedLifecycleGeneration !== lifecycleGeneration
      || expectedRecordingGeneration !== state.recordingGeneration
    ) {
      stopStreamTracks(stream);
      return false;
    }
    const mimeType = chooseAudioMimeType();
    let recorder;
    try {
      recorder = new root.MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 48000
      });
      recorder.addEventListener("dataavailable", (event) => {
        if (expectedRecordingGeneration !== state.recordingGeneration) return;
        if (event.data && event.data.size > 0) state.audioChunks.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        if (expectedRecordingGeneration !== state.recordingGeneration) return;
        if (state.mediaRecorder === recorder) state.mediaRecorder = null;
        state.audioBlob = new Blob(state.audioChunks, { type: recorder.mimeType || "audio/webm" });
        state.audioUrl = state.audioBlob.size > 0 ? root.URL.createObjectURL(state.audioBlob) : null;
        renderReview();
      }, { once: true });
      recorder.start(1000);
    } catch (error) {
      stopStreamTracks(stream);
      throw error;
    }
    state.mediaStream = stream;
    state.mediaRecorder = recorder;
    return true;
  }

  function stopRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
      state.mediaRecorder.stop();
    } else {
      cleanupRecording();
    }
    stopStreamTracks(state.mediaStream);
    state.mediaStream = null;
  }

  function renderError(mount, message) {
    mount.innerHTML = `<div class="practice-alert practice-alert-error"><strong>Não foi possível abrir o simulador.</strong><span>${escapeHtml(message)}</span></div>`;
  }

  function getEntryLabel(entry, index) {
    return entry && entry.title ? entry.title : `Estação ${index + 1}`;
  }

  function getLatestCompletedScores(attempts) {
    const latestScores = new Map();
    (Array.isArray(attempts) ? attempts : []).forEach((attempt) => {
      if (attempt && !latestScores.has(attempt.stationId) && Number.isFinite(attempt.finalPercent)) {
        latestScores.set(attempt.stationId, attempt.finalPercent);
      }
    });
    return latestScores;
  }

  function renderDirectedStationOptions(entries, latestScores, selectedId) {
    const groups = new Map();
    entries.forEach((entry, index) => {
      const family = entry.family || entry.domain || "Outros cenários";
      if (!groups.has(family)) groups.set(family, []);
      const prefix = DIRECTED_FAMILY_PREFIXES[family] || family;
      const score = latestScores.get(entry.id);
      const label = `${prefix} - ${entry.title || `Cenário ${index + 1}`}${score == null ? "" : ` - ${Math.round(score)}%`}`;
      groups.get(family).push(`<option value="${escapeHtml(entry.id)}" ${entry.id === selectedId ? "selected" : ""}>${escapeHtml(label)}</option>`);
    });
    return Array.from(groups, ([family, options]) => (
      `<optgroup label="${escapeHtml(family)}">${options.join("")}</optgroup>`
    )).join("");
  }

  function renderPracticeModeControl(mode) {
    const selectedMode = normalizePracticeMode(mode);
    return `
      <fieldset class="practice-mode-control">
        <legend class="practice-visually-hidden">Modo de prática</legend>
        ${[
          ["exam", "Modo prova"],
          ["directed", "Treino dirigido"],
          ["review", "Revisão"]
        ].map(([value, label]) => `
          <label class="practice-mode-option">
            <input type="radio" name="practice-mode" value="${value}" data-practice-mode="${value}" ${selectedMode === value ? "checked" : ""}>
            <span>${label}</span>
          </label>`).join("")}
      </fieldset>`;
  }

  function getSetupStationView(station, selectedEntry, mode, mediaStatus, caseNumber) {
    const subject = station || selectedEntry;
    if (!subject) return { visible: false, startDisabled: true };
    const publicView = getPublicStationView(mode === "exam" ? (selectedEntry || subject) : subject, mode, caseNumber);
    return {
      visible: true,
      loaded: Boolean(station),
      startDisabled: areStartActionsDisabled(mediaStatus) || !station,
      kicker: publicView.kicker,
      title: publicView.title,
      showDiagnosticMeta: publicView.showDiagnosticMeta,
      briefing: station && station.briefing ? station.briefing : "",
      durationSeconds: station && Number.isFinite(station.durationSeconds) ? station.durationSeconds : null,
      checklistCount: mode !== "exam" && station && Array.isArray(station.checklist) ? station.checklist.length : null,
      difficulty: subject.difficulty || "não definida"
    };
  }

  function renderPracticeStartActions(view) {
    if (!view || !view.visible) return "";
    const disabled = view.startDisabled ? " disabled" : "";
    return `
      <div class="practice-actions practice-start-actions">
        <button class="practice-button practice-button-primary" id="practice-start-record" type="button"${disabled}>Iniciar e gravar</button>
        <button class="practice-button" id="practice-start-manual" type="button"${disabled}>Iniciar sem áudio</button>
      </div>`;
  }

  function renderSetup() {
    const mount = root.document && root.document.getElementById("practice-simulator");
    if (!mount) return;
    const station = state.station;
    const caseNumber = getExamCaseNumber(state.selectedEntry, state.stationEntries);
    const setupView = getSetupStationView(station, state.selectedEntry, state.mode, state.mediaStatus, caseNumber);
    const latestScores = state.mode === "directed" ? getLatestCompletedScores(getStoredAttempts()) : new Map();
    const selectedScore = state.selectedEntry && latestScores.get(state.selectedEntry.id);
    const showDiagnosticMeta = setupView.showDiagnosticMeta;
    const relatedIntro = state.mode === "review"
      ? "A escolha usa seu histórico. Os detalhes da estação aparecem ao iniciar."
      : "";
    const statusMessage = state.mediaStatus === "loading"
      ? "Carregando estação e preparando recursos visuais..."
      : "";
    const retryActions = state.mediaStatus === "error" ? `
      <div class="practice-actions">
        <button class="practice-button" id="practice-retry-load" type="button">Tentar novamente</button>
        ${(state.mode === "exam" ? getExamAlternatives().length : state.stationEntries.length) ? `<button class="practice-button practice-button-quiet" id="practice-choose-another" type="button">Sortear outra</button>` : ""}
      </div>` : "";
    const directedControls = state.mode === "directed" ? `
      <div class="practice-toolbar">
        <label for="practice-station">Cenário</label>
        ${selectedScore == null ? "" : `<span class="practice-selected-score" aria-label="Última nota: ${Math.round(selectedScore)}%">${Math.round(selectedScore)}%</span>`}
        <select id="practice-station" ${state.mediaStatus === "loading" ? "disabled" : ""}>
          ${renderDirectedStationOptions(state.stationEntries, latestScores, state.selectedEntry && state.selectedEntry.id)}
        </select>
      </div>` : "";

    mount.innerHTML = `
      <section class="practice-shell practice-setup">
        ${renderPracticeModeControl(state.mode)}
        ${directedControls}
        ${statusMessage ? `<p class="practice-help" role="status">${statusMessage}</p>` : ""}
        ${state.mediaStatus === "error" ? `<div class="practice-alert practice-alert-error"><strong>Recurso ausente.</strong><span>${escapeHtml(state.loadError || "Não foi possível preparar a estação.")}</span></div>${retryActions}` : ""}
        ${setupView.visible ? `
          <div class="practice-briefing practice-setup-preview ${setupView.loaded ? "" : "is-loading"}">
            <span class="practice-kicker">${escapeHtml(setupView.kicker)}</span>
            <h2>${escapeHtml(setupView.title)}</h2>
            ${showDiagnosticMeta && setupView.briefing ? `<p>${escapeHtml(setupView.briefing)}</p>` : relatedIntro ? `<p>${escapeHtml(relatedIntro)}</p>` : statusMessage ? `<p>${escapeHtml(statusMessage)}</p>` : ""}
            <div class="practice-meta">
              <span><strong>${setupView.durationSeconds == null ? "--:--" : formatClock(setupView.durationSeconds)}</strong> de ${state.mode === "directed" ? "cenário" : "estação"}</span>
              ${state.mode === "exam" && state.examPlan ? `<span>Estação <strong>${state.examPlan.currentIndex + 1}/${state.examPlan.stationIds.length}</strong></span>` : ""}
              ${state.mode === "exam" ? "" : `<span><strong>${setupView.checklistCount == null ? "--" : setupView.checklistCount}</strong> itens</span>`}
              ${showDiagnosticMeta ? `<span><strong>${escapeHtml(setupView.difficulty)}</strong> dificuldade</span>` : ""}
            </div>
          </div>
          ${renderPracticeStartActions(setupView)}
          ${state.mode === "exam" ? `<div class="practice-actions"><button class="practice-button practice-button-quiet" id="practice-new-exam-round" type="button">Sortear nova série de 5</button></div>` : ""}
        ` : ""}
        <div id="practice-auth" class="practice-auth"><p>Verificando acesso à correção automática...</p></div>
        <p class="practice-help">O checklist permanece oculto durante a estação. Permita o microfone somente se desejar correção pela fala.</p>
      </section>`;

    mount.querySelectorAll("input[name='practice-mode']").forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) setPracticeMode(input.value);
      });
    });
    const stationSelect = mount.querySelector("#practice-station");
    if (stationSelect) stationSelect.addEventListener("change", (event) => {
      const entry = getStationEntry(event.target.value);
      if (entry) loadSelectedStation(entry);
    });
    const retryButton = mount.querySelector("#practice-retry-load");
    if (retryButton) retryButton.addEventListener("click", () => {
      if (state.selectedEntry) loadSelectedStation(state.selectedEntry);
    });
    const anotherButton = mount.querySelector("#practice-choose-another");
    if (anotherButton) anotherButton.addEventListener("click", () => {
      if (state.mode === "exam" && state.examPlan) {
        const alternatives = getExamAlternatives();
        const fresh = alternatives.filter((entry) => !state.cycleIds.includes(entry.id));
        const pool = fresh.length ? fresh : alternatives;
        const entry = pool[Math.floor(Math.random() * pool.length)];
        if (!entry) return;
        state.examPlan.stationIds[state.examPlan.currentIndex] = entry.id;
        state.cycleIds = Array.from(new Set(state.cycleIds.concat(entry.id)));
        saveExamPlan();
        saveCurrentSetup();
        loadSelectedStation(entry);
        return;
      }
      const selection = selectAlternativeStation({
        entries: state.stationEntries,
        mode: state.mode,
        filters: state.filters,
        attempts: getStoredAttempts(),
        cycleIds: state.cycleIds,
        currentEntryId: state.selectedEntry && state.selectedEntry.id
      });
      if (!selection.entry) return;
      if (state.mode === "exam") state.cycleIds = selection.cycleIds;
      saveCurrentSetup();
      loadSelectedStation(selection.entry);
    });
    const recordButton = mount.querySelector("#practice-start-record");
    if (recordButton) recordButton.addEventListener("click", () => beginSession(true));
    const manualButton = mount.querySelector("#practice-start-manual");
    if (manualButton) manualButton.addEventListener("click", () => beginSession(false));
    const newRoundButton = mount.querySelector("#practice-new-exam-round");
    if (newRoundButton) newRoundButton.addEventListener("click", () => {
      startNewExamRound();
      loadCurrentModeSelection();
    });
    renderAuthPanel();
  }


  async function renderAuthPanel() {
    const container = root.document.getElementById("practice-auth");
    if (!container || !root.TemePracticeApi) return;
    const config = root.TEME_PRACTICE_CONFIG;
    const configured = root.TemePracticeApi.validatePublicConfig(config).valid;
    let session = null;
    if (configured) {
      try {
        session = await root.TemePracticeApi.getSession();
      } catch {
        session = null;
      }
    }
    const view = root.TemePracticeApi.getAuthViewModel(session, configured);
    if (view.status === "unconfigured") {
      container.innerHTML = "<p><strong>Correção automática ainda não configurada.</strong> O modo manual permanece disponível.</p>";
      return;
    }
    if (view.status === "authenticated") {
      container.innerHTML = `<div><span>Conectado como <strong>${escapeHtml(view.email)}</strong></span><button id="practice-signout" class="practice-button practice-button-quiet" type="button">Sair</button></div>`;
      container.querySelector("#practice-signout").addEventListener("click", async () => {
        await root.TemePracticeApi.signOut();
        renderAuthPanel();
      });
      return;
    }
    container.innerHTML = `
      <details>
        <summary>Entrar para usar transcrição e correção automática</summary>
        <form id="practice-login" class="practice-login">
          <label><span>E-mail</span><input name="email" type="email" autocomplete="username" required></label>
          <label><span>Senha</span><input name="password" type="password" autocomplete="current-password" required></label>
          <button class="practice-button practice-button-primary" type="submit">Entrar</button>
          <p id="practice-login-error" role="alert"></p>
        </form>
      </details>`;
    container.querySelector("#practice-login").addEventListener("submit", async (event) => {
      event.preventDefault();
      const errorNode = container.querySelector("#practice-login-error");
      const button = event.currentTarget.querySelector("button");
      const data = new FormData(event.currentTarget);
      button.disabled = true;
      errorNode.textContent = "";
      try {
        await root.TemePracticeApi.signIn(data.get("email"), data.get("password"));
        renderAuthPanel();
      } catch (error) {
        errorNode.textContent = error.message || "Falha no login.";
        button.disabled = false;
      }
    });
  }

  function clearSessionTimer() {
    if (state.timerId != null) root.clearInterval(state.timerId);
    state.timerId = null;
  }

  function isSessionStartCurrent(startGeneration, expectedLifecycleGeneration, simulator, station, mode) {
    return startGeneration === sessionStartGeneration
      && expectedLifecycleGeneration === lifecycleGeneration
      && root.document.getElementById("practice-simulator") === simulator
      && state.station === station
      && state.mode === mode;
  }

  async function beginSession(withRecording) {
    if (!state.station || areStartActionsDisabled(state.mediaStatus)) return;
    const station = state.station;
    const mode = state.mode;
    const simulator = root.document.getElementById("practice-simulator");
    const expectedLifecycleGeneration = lifecycleGeneration;
    const startGeneration = sessionStartGeneration + 1;
    sessionStartGeneration = startGeneration;
    cleanupRecording();
    clearSessionTimer();
    const expectedRecordingGeneration = state.recordingGeneration;
    let runtimeNotice = "";
    if (withRecording) {
      try {
        const recordingReady = await startRecording(
          expectedLifecycleGeneration,
          expectedRecordingGeneration
        );
        if (!recordingReady) return;
      } catch (error) {
        if (!isSessionStartCurrent(startGeneration, expectedLifecycleGeneration, simulator, station, mode)) return;
        runtimeNotice = `Microfone indisponível: ${error.message}. O treino continuará sem áudio.`;
      }
    }
    if (!isSessionStartCurrent(startGeneration, expectedLifecycleGeneration, simulator, station, mode)) {
      cleanupRecording();
      return;
    }
    const now = Date.now();
    const prepared = createPracticeSession(station, now, mode);
    state.session = sessionModule && typeof sessionModule.startSession === "function"
      ? sessionModule.startSession(prepared, now)
      : { ...prepared, status: "running", startedAtMs: now };
    state.transcript = "";
    state.phaseAnswers = {};
    if (root.localStorage) root.localStorage.removeItem(ANSWERS_KEY);
    state.lastAttempt = null;
    state.runtimeNotice = runtimeNotice;
    if (root.localStorage) savePracticeDraft(root.localStorage, state.session);
    renderRunning();
    state.timerId = root.setInterval(updateTimer, 250);
  }

  function renderInlineNotice(mount, message) {
    if (!mount) return;
    const notice = root.document.createElement("div");
    notice.className = "practice-alert";
    notice.textContent = message;
    mount.prepend(notice);
  }

  function getRunningStationView(station, mode) {
    return {
      kicker: mode === "exam" ? "MODO PROVA" : "ESTAÇÃO EM ANDAMENTO",
      title: mode === "exam"
        ? getPublicStationView(state.selectedEntry || station, mode,
          getExamCaseNumber(state.selectedEntry, state.stationEntries)).title
        : station && station.examTitle ? station.examTitle : "Estação em andamento"
    };
  }

  function renderFlowTimeWaveform(kind) {
    if (kind !== "flow-time-trapped" && kind !== "flow-time-recovered") return "";
    const trapped = kind === "flow-time-trapped";
    const path = trapped
      ? "M 70 135 L 70 62 L 155 62 L 155 210 C 205 175 260 160 345 158 L 345 62 L 430 62 L 430 210 C 480 175 535 160 620 158 L 620 62 L 705 62"
      : "M 70 135 L 70 62 L 155 62 L 155 210 C 205 165 260 135 315 135 L 345 135 L 345 62 L 430 62 L 430 210 C 480 165 535 135 590 135 L 620 135 L 620 62 L 705 62";
    const description = trapped
      ? "Curva fluxo-tempo simulada: o fluxo expiratório ainda está abaixo de zero quando o ciclo seguinte começa."
      : "Curva fluxo-tempo simulada: o fluxo expiratório retorna a zero antes do ciclo seguinte.";
    return `<figure class="practice-waveform">
      <svg viewBox="0 0 800 250" role="img" aria-label="${description}" xmlns="http://www.w3.org/2000/svg">
        <path d="M 52 135 H 748 M 52 32 V 222" fill="none" stroke="#8595a3" stroke-width="2" />
        <path d="${path}" fill="none" stroke="#0b6b69" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
        <text x="18" y="28">Fluxo</text><text x="703" y="236">Tempo</text>
      </svg>
      <figcaption>Curva fluxo-tempo simulada</figcaption>
    </figure>`;
  }

  function savePhaseAnswers() {
    if (!root.localStorage || !state.session) return;
    root.localStorage.setItem(ANSWERS_KEY, JSON.stringify({
      stationId: state.session.stationId,
      startedAtMs: state.session.startedAtMs,
      answers: state.phaseAnswers
    }));
  }

  function restorePhaseAnswers(session) {
    const raw = root.localStorage && root.localStorage.getItem(ANSWERS_KEY);
    try {
      const saved = JSON.parse(raw);
      return saved && saved.stationId === session.stationId && saved.startedAtMs === session.startedAtMs &&
        saved.answers && typeof saved.answers === "object" && !Array.isArray(saved.answers)
        ? saved.answers : {};
    } catch { return {}; }
  }

  function collectPhaseAnswers() {
    return state.station.phases.map((phase, index) => {
      const answer = String(state.phaseAnswers[phase.id] || "").trim();
      return answer ? `Pergunta ${index + 1}: ${answer}` : "";
    }).filter(Boolean).join("\n\n");
  }

  function getVitalEntries(patientState) {
    const vitals = patientState && patientState.vitals;
    if (!vitals || typeof vitals !== "object" || Array.isArray(vitals)) return [];
    return Object.entries(vitals).filter(([label, value]) => (
      typeof label === "string" && value != null && String(value).trim() !== ""
    ));
  }

  function closeMobileSidebarForRunningStation() {
    if (root.innerWidth <= 980 && root.document && root.document.body && root.document.body.classList) {
      root.document.body.classList.add("close");
    }
  }

  function renderRunning() {
    const mount = root.document.getElementById("practice-simulator");
    if (!mount || !state.session) return;
    closeMobileSidebarForRunningStation();
    const phase = state.station.phases[state.session.phaseIndex];
    const remaining = getRemainingSeconds(state.session, Date.now(), state.station.durationSeconds);
    const controls = getPracticePhaseControls(state.session, state.station);
    const runningView = getRunningStationView(state.station, state.mode);
    const patientState = phase && phase.patientState;
    const vitals = getVitalEntries(patientState);
    const currentPhaseMedia = getCurrentPhaseMedia(state.stationMedia, state.session);
    mount.innerHTML = `
      <section class="practice-shell practice-running">
        <header class="practice-run-header">
          <div><span class="practice-kicker">${escapeHtml(runningView.kicker)}</span><strong>${escapeHtml(runningView.title)}</strong><small>Pergunta ${state.session.phaseIndex + 1} de ${state.station.phases.length}</small></div>
          <time id="practice-clock" class="practice-clock ${remaining <= 60 ? "is-warning" : ""}" datetime="PT${remaining}S">${formatClock(remaining)}</time>
        </header>
        ${state.runtimeNotice ? `<div class="practice-alert">${escapeHtml(state.runtimeNotice)}</div>` : ""}
        ${patientState && patientState.summary ? `<section class="practice-patient-state" aria-label="Estado clínico"><h2>Estado clínico</h2><p>${escapeHtml(patientState.summary)}</p></section>` : ""}
        ${vitals.length ? `<dl class="practice-vitals">${vitals.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : ""}
        <div class="practice-task"><span>${escapeHtml(phase.title)}</span><p>${escapeHtml(phase.prompt)}</p></div>
        ${renderFlowTimeWaveform(phase.waveform)}
        <div id="practice-phase-media" aria-label="Mídia da fase atual"></div>
        <label class="practice-field practice-slide-answer" for="practice-slide-answer"><span>Resposta desta pergunta</span><textarea id="practice-slide-answer" rows="3">${escapeHtml(state.phaseAnswers[phase.id] || "")}</textarea></label>
        <div class="practice-actions practice-slide-actions">
          <button id="practice-previous" class="practice-button" type="button" ${controls.previous.disabled ? "disabled" : ""}>${controls.previous.label}</button>
          ${controls.primary.action === "next" ? `<button id="practice-next" class="practice-button practice-button-primary" type="button">Próxima pergunta</button>` : `<span class="practice-end-hint">Última pergunta. Você pode voltar enquanto houver tempo.</span>`}
          <button id="practice-finish" class="practice-button practice-button-danger" type="button">Encerrar estação</button>
        </div>
        <p class="practice-recording-state">${state.mediaRecorder ? "● Gravação em andamento" : "Treino sem gravação"}</p>
      </section>`;
    const mediaContainer = mount.querySelector("#practice-phase-media");
    if (mediaContainer && mediaModule && typeof mediaModule.renderPhaseMedia === "function") {
      mediaModule.renderPhaseMedia(mediaContainer, currentPhaseMedia, getRunningMediaOptions(currentPhaseMedia));
    }
    mount.querySelector("#practice-slide-answer").addEventListener("input", (event) => {
      state.phaseAnswers[phase.id] = event.target.value;
      savePhaseAnswers();
    });
    mount.querySelector("#practice-previous").addEventListener("click", () => {
      state.session = movePracticePhase(state.session, "previous");
      if (root.localStorage) savePracticeDraft(root.localStorage, state.session);
      renderRunning();
    });
    const nextButton = mount.querySelector("#practice-next");
    if (nextButton) nextButton.addEventListener("click", () => {
      state.session = movePracticePhase(state.session, "next");
      if (root.localStorage) savePracticeDraft(root.localStorage, state.session);
      renderRunning();
    });
    mount.querySelector("#practice-finish").addEventListener("click", finishSession);
  }

  function updateTimer() {
    if (!state.session || state.session.status !== "running") return;
    const remaining = getRemainingSeconds(state.session, Date.now(), state.station.durationSeconds);
    const clock = root.document.getElementById("practice-clock");
    if (clock) {
      clock.textContent = formatClock(remaining);
      clock.classList.toggle("is-warning", remaining <= 60);
    }
    if (remaining === 0) finishSession();
  }

  function finishSession() {
    if (!state.session || state.session.status !== "running") return;
    clearSessionTimer();
    state.session = { ...state.session, status: "review", completedAtMs: Date.now() };
    if (root.localStorage) clearPracticeDraft(root.localStorage);
    if (root.localStorage) root.localStorage.removeItem(ANSWERS_KEY);
    if (!state.mediaRecorder || state.mediaRecorder.state === "inactive") state.transcript = collectPhaseAnswers();
    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") stopRecording();
    else renderReview();
  }

  function renderReview() {
    const mount = root.document.getElementById("practice-simulator");
    if (!mount || !state.session || state.session.status !== "review") return;
    const recordedSeconds = Math.max(0, Math.round(
      ((state.session.completedAtMs || Date.now()) - state.session.startedAtMs) / 1000
    ));
    mount.innerHTML = `
      <section class="practice-shell">
        <span class="practice-kicker">Estação encerrada</span>
        <h2>Revise suas respostas</h2>
        ${state.audioUrl ? `<audio class="practice-audio" controls src="${escapeHtml(state.audioUrl)}"></audio>` : ""}
        ${state.audioUrl ? `<div class="practice-audio-info"><span>Gravação: ${formatClock(recordedSeconds)} · ${formatAudioSize(state.audioBlob.size)}</span><a href="${escapeHtml(state.audioUrl)}" download="estacao.${state.audioBlob.type.includes("mp4") ? "m4a" : state.audioBlob.type.includes("ogg") ? "ogg" : "webm"}">Baixar gravação</a></div>` : ""}
        ${state.audioBlob && !state.audioBlob.size ? `<div class="practice-alert practice-alert-error">Nenhum áudio foi captado. Você ainda pode registrar sua resposta em texto ou usar a autoavaliação.</div>` : ""}
        <label class="practice-field" for="practice-transcript">
          <span>Respostas da estação</span>
          <textarea id="practice-transcript" rows="8" placeholder="Registre somente o que foi dito ou demonstrado.">${escapeHtml(state.transcript)}</textarea>
        </label>
        <div id="practice-api-message"></div>
        <div class="practice-actions">
          <button id="practice-ai-evaluate" class="practice-button practice-button-primary" type="button" ${state.audioBlob?.size || state.transcript ? "" : "disabled"}>Transcrever e corrigir com IA</button>
          <button id="practice-manual-evaluate" class="practice-button" type="button">Abrir autoavaliação</button>
          <button id="practice-restart" class="practice-button practice-button-quiet" type="button">Descartar e reiniciar</button>
        </div>
      </section>`;
    const textarea = mount.querySelector("#practice-transcript");
    textarea.addEventListener("input", () => {
      state.transcript = textarea.value;
      mount.querySelector("#practice-ai-evaluate").disabled = !(state.audioBlob?.size || state.transcript.trim());
    });
    mount.querySelector("#practice-manual-evaluate").addEventListener("click", renderManualChecklist);
    mount.querySelector("#practice-ai-evaluate").addEventListener("click", requestAiEvaluation);
    mount.querySelector("#practice-restart").addEventListener("click", resetSimulator);
  }

  function renderManualChecklist() {
    const mount = root.document.getElementById("practice-simulator");
    if (!mount) return;
    mount.innerHTML = `
      <section class="practice-shell">
        <span class="practice-kicker">Autoavaliação honesta</span>
        <h2>Marque apenas o que foi dito ou demonstrado</h2>
        <form id="practice-manual-form" class="practice-checklist">
          ${state.station.checklist.map((item, index) => `
            <fieldset class="practice-check-item" data-item-id="${escapeHtml(item.id)}">
              <legend><span>${index + 1}</span>${escapeHtml(item.label)} <small>${item.weight} pts · ${escapeHtml(item.verification)}</small></legend>
              <div class="practice-status-options">
                ${["cumprido", "parcial", "ausente", "incorreto"].map((status) => `
                  <label><input type="radio" name="status-${escapeHtml(item.id)}" value="${status}" ${status === "ausente" ? "checked" : ""}><span>${status.replace("_", " ")}</span></label>
                `).join("")}
              </div>
              <input type="text" name="evidence-${escapeHtml(item.id)}" placeholder="Evidência curta da sua fala ou gesto">
            </fieldset>`).join("")}
          <div class="practice-actions">
            <button class="practice-button practice-button-primary" type="submit">Calcular resultado</button>
            <button id="practice-back-review" class="practice-button" type="button">Voltar</button>
          </div>
        </form>
      </section>`;
    mount.querySelector("#practice-manual-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const evaluations = state.station.checklist.map((item) => ({
        itemId: item.id,
        status: form.get(`status-${item.id}`) || "ausente",
        evidence: String(form.get(`evidence-${item.id}`) || "Autoavaliação sem evidência textual."),
        rationale: "Classificação manual do aluno.",
        manualConfirmed: item.verification === "verbal" ? null : ["cumprido", "parcial"].includes(form.get(`status-${item.id}`))
      }));
      finalizeEvaluation(evaluations, "manual");
    });
    mount.querySelector("#practice-back-review").addEventListener("click", renderReview);
  }

  function finalizeEvaluation(evaluations, evaluationMode, attemptId, metadata) {
    const score = root.TemePracticeUtils.calculatePracticeScore(state.station, evaluations);
    const attempt = {
      id: attemptId || (root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : `local-${Date.now()}`),
      stationId: state.station.id,
      stationVersion: state.station.version,
      stationTitle: state.station.title,
      domain: state.station.domain,
      startedAt: new Date(state.session.startedAtMs).toISOString(),
      completedAt: new Date(state.session.completedAtMs || Date.now()).toISOString(),
      durationSeconds: Math.min(state.station.durationSeconds, Math.max(0, Math.round(((state.session.completedAtMs || Date.now()) - state.session.startedAtMs) / 1000))),
      evaluationMode,
      transcript: state.transcript.trim(),
      summary: metadata && metadata.summary ? metadata.summary : "",
      strengths: metadata && Array.isArray(metadata.strengths) ? metadata.strengths : [],
      priorities: metadata && Array.isArray(metadata.priorities) ? metadata.priorities : [],
      persistenceWarning: metadata && metadata.persistenceWarning ? metadata.persistenceWarning : null,
      ...score
    };
    state.lastAttempt = attempt;
    saveAttempt(attempt);
    state.audioBlob = null;
    cleanupRecording();
    renderResult();
  }

  function renderResult() {
    const mount = root.document.getElementById("practice-simulator");
    const attempt = state.lastAttempt;
    if (!mount || !attempt) return;
    const score = Number.isFinite(attempt.finalPercent) ? attempt.finalPercent : attempt.provisionalPercent;
    const relatedStations = getRelatedStationEntries(state.stationEntries, getStoredAttempts());
    const checklistById = new Map(state.station.checklist.map((item) => [item.id, item]));
    const missingCritical = attempt.criticalFailures.map((id) => checklistById.get(id)?.label || id);
    const missedItems = attempt.evaluations.filter((evaluation) => ["ausente", "incorreto", "parcial"].includes(evaluation.status));
    const completedCount = attempt.evaluations.filter((evaluation) => evaluation.status === "cumprido" &&
      (checklistById.get(evaluation.itemId)?.verification === "verbal" || evaluation.manualConfirmed === true)).length;
    const earnedFor = (evaluation, item) => {
      if (!item || (item.verification !== "verbal" && evaluation.manualConfirmed !== true)) return 0;
      return evaluation.status === "cumprido" ? item.weight : evaluation.status === "parcial" ? item.weight / 2 : 0;
    };
    mount.innerHTML = `
      <section class="practice-shell">
        <div class="practice-result-head">
          <div><span class="practice-kicker">Resultado</span><h2>${escapeHtml(state.station.title)}</h2></div>
          <strong class="practice-score">${score}%</strong>
        </div>
        <p class="practice-result-overview">${completedCount} de ${state.station.checklist.length} critérios contemplados · ${missedItems.length} ausentes ou parciais · ${attempt.earnedPoints}/${attempt.totalPoints} pontos</p>
        ${attempt.persistenceWarning ? `<div class="practice-alert">${escapeHtml(attempt.persistenceWarning)}</div>` : ""}
        ${attempt.summary ? `<div class="practice-feedback"><strong>Síntese da avaliação</strong><p>${escapeHtml(attempt.summary)}</p></div>` : ""}
        <div class="practice-feedback"><strong>Raciocínio clínico</strong><p>${escapeHtml(state.station.referenceAnswer || "")}</p></div>
        ${attempt.pendingManualItemIds.length ? `
          <form id="practice-manual-confirm" class="practice-manual-confirm">
            <h3>Confirme os gestos manuais</h3>
            <p>Marque apenas o que você realmente executou no manequim ou material.</p>
            ${attempt.pendingManualItemIds.map((itemId) => {
              const item = state.station.checklist.find((candidate) => candidate.id === itemId);
              return `<fieldset><legend>${escapeHtml(item ? item.label : itemId)}</legend><label><input required type="radio" name="manual-${escapeHtml(itemId)}" value="true"> Executei</label><label><input required type="radio" name="manual-${escapeHtml(itemId)}" value="false"> Não executei</label></fieldset>`;
            }).join("")}
            <button class="practice-button practice-button-primary" type="submit">Concluir nota</button>
          </form>` : ""}
        ${missingCritical.length ? `<div class="practice-alert practice-alert-error"><strong>Pontos críticos esquecidos</strong><span>${missingCritical.map(escapeHtml).join("; ")}</span></div>` : ""}
        ${missedItems.length ? `<div class="practice-feedback"><strong>Prioridades para revisar</strong><ul>${missedItems.slice(0, 5).map((evaluation) => `<li>${escapeHtml(evaluation.label)}</li>`).join("")}</ul></div>` : ""}
        <div class="practice-result-list">
          ${attempt.evaluations.map((evaluation) => {
            const item = checklistById.get(evaluation.itemId);
            return `
            <article class="practice-result-item is-${escapeHtml(evaluation.status)}">
              <header><strong>${escapeHtml(evaluation.label)}</strong><span>${escapeHtml(evaluation.status.replace("_", " "))} · ${earnedFor(evaluation, item)}/${item?.weight || 0} pts</span></header>
              <p>${escapeHtml(evaluation.evidence)}</p>
              ${evaluation.rationale ? `<small>${escapeHtml(evaluation.rationale)}</small>` : ""}
              ${item?.explanation ? `<small>${escapeHtml(item.explanation)}</small>` : ""}
            </article>`; }).join("")}
        </div>
        ${state.station.references?.length ? `<details class="practice-references"><summary>Referências clínicas</summary><ul>${state.station.references.map((url) => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a></li>`).join("")}</ul></details>` : ""}
        ${attempt.transcript ? `<details class="practice-references practice-transcript-details">
          <summary>Transcrição da fala</summary>
          <label class="practice-field" for="practice-result-transcript"><span>Texto analisado</span><textarea id="practice-result-transcript" rows="8" ${attempt.evaluationMode === "ai" ? "" : "readonly"}>${escapeHtml(attempt.transcript)}</textarea></label>
          ${attempt.evaluationMode === "ai" ? `<div class="practice-actions"><button id="practice-reevaluate-transcript" class="practice-button" type="button" disabled>Reavaliar após corrigir texto</button></div><div id="practice-reevaluation-message" role="status"></div>` : ""}
        </details>` : ""}
        <section class="practice-result-media" aria-label="Mídias revisadas da estação">
          <h3>Revisão visual</h3>
          <div id="practice-result-media"></div>
        </section>
        ${state.mode !== "exam" && relatedStations.length ? `<section class="practice-related-stations" aria-label="Estações relacionadas"><h3>Estações relacionadas</h3><div class="practice-related-actions">${relatedStations.map((entry, index) => `<button class="practice-button" type="button" data-related-station="${escapeHtml(entry.id)}">${escapeHtml(getEntryLabel(entry, index))}</button>`).join("")}</div></section>` : ""}
        <div class="practice-actions">
          ${state.mode === "exam" && state.examPlan ? `<button id="practice-next-station" class="practice-button practice-button-primary" type="button" ${attempt.pendingManualItemIds.length ? "disabled" : ""}>${state.examPlan.currentIndex + 1 < state.examPlan.stationIds.length ? "Próxima estação" : "Nova série de 5"}</button>` : ""}
          <button id="practice-download" class="practice-button practice-button-primary" type="button">Baixar relatório</button>
          <button id="practice-repeat" class="practice-button" type="button">Repetir estação</button>
          <a class="practice-button practice-button-quiet" href="#/praticas/DESEMPENHO">Ver desempenho</a>
        </div>
      </section>`;
    const mediaContainer = mount.querySelector("#practice-result-media");
    if (mediaContainer && mediaModule && typeof mediaModule.renderPhaseMedia === "function") {
      mediaModule.renderPhaseMedia(
        mediaContainer,
        state.stationMedia && Array.isArray(state.stationMedia.media) ? state.stationMedia.media : [],
        getResultMediaOptions()
      );
    }
    mount.querySelector("#practice-download").addEventListener("click", () => downloadText(buildPracticeReport(attempt), `treino-${attempt.stationId}.txt`));
    mount.querySelector("#practice-repeat").addEventListener("click", resetSimulator);
    const revisedTranscript = mount.querySelector("#practice-result-transcript");
    const reevaluateButton = mount.querySelector("#practice-reevaluate-transcript");
    if (revisedTranscript && reevaluateButton) {
      revisedTranscript.addEventListener("input", () => {
        const value = revisedTranscript.value.trim();
        reevaluateButton.disabled = value.length < 10 || value === attempt.transcript.trim();
      });
      reevaluateButton.addEventListener("click", () => requestTranscriptReevaluation(
        attempt,
        revisedTranscript.value,
        reevaluateButton,
        mount.querySelector("#practice-reevaluation-message")
      ));
    }
    const nextStation = mount.querySelector("#practice-next-station");
    if (nextStation) nextStation.addEventListener("click", advanceExamStation);
    mount.querySelectorAll("[data-related-station]").forEach((button) => {
      button.addEventListener("click", () => {
        const entry = getStationEntry(button.dataset.relatedStation);
        if (!entry) return;
        state.mode = "directed";
        saveCurrentSetup();
        loadSelectedStation(entry);
      });
    });
    const confirmationForm = mount.querySelector("#practice-manual-confirm");
    if (confirmationForm) confirmationForm.addEventListener("submit", confirmManualItems);
  }

  async function confirmManualItems(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const confirmations = Object.fromEntries(state.lastAttempt.pendingManualItemIds.map((itemId) => [
      itemId,
      data.get(`manual-${itemId}`) === "true"
    ]));
    const merged = root.TemePracticeUtils.mergeManualChecks(state.lastAttempt.evaluations, confirmations);
    const score = root.TemePracticeUtils.calculatePracticeScore(state.station, merged);
    state.lastAttempt = { ...state.lastAttempt, ...score, evaluations: score.evaluations };
    saveAttempt(state.lastAttempt);
    if (state.lastAttempt.evaluationMode === "ai" && state.lastAttempt.id && root.TemePracticeApi) {
      try {
        await root.TemePracticeApi.confirmManual(state.lastAttempt.id, confirmations);
      } catch (error) {
        state.lastAttempt.persistenceWarning = `Nota concluída localmente; sincronização pendente: ${error.message}`;
        saveAttempt(state.lastAttempt);
      }
    }
    renderResult();
  }

  async function requestAiEvaluation() {
    const message = root.document.getElementById("practice-api-message");
    if (!root.TemePracticeApi || typeof root.TemePracticeApi.evaluate !== "function") {
      message.innerHTML = "<div class=\"practice-alert\">A API protegida ainda não está configurada neste navegador. Use a autoavaliação manual.</div>";
      return;
    }
    const button = root.document.getElementById("practice-ai-evaluate");
    button.disabled = true;
    button.textContent = "Analisando...";
    try {
      const result = await root.TemePracticeApi.evaluate({
        station: state.station,
        audioBlob: state.audioBlob,
        transcript: state.transcript.trim(),
        durationSeconds: Math.min(state.station.durationSeconds, Math.round((Date.now() - state.session.startedAtMs) / 1000))
      });
      state.transcript = result.transcript || state.transcript;
      finalizeEvaluation(result.evaluations, "ai", result.attemptId, result);
    } catch (error) {
      message.innerHTML = `<div class="practice-alert practice-alert-error"><strong>Correção indisponível.</strong><span>${escapeHtml(error.message)}</span></div>`;
      button.disabled = false;
      button.textContent = "Tentar correção novamente";
    }
  }

  async function requestTranscriptReevaluation(attempt, revisedText, button, message) {
    if (!root.TemePracticeApi || typeof root.TemePracticeApi.evaluate !== "function") return;
    const transcript = String(revisedText || "").trim();
    if (transcript.length < 10 || state.lastAttempt !== attempt || state.session?.status !== "review") return;
    button.disabled = true;
    button.textContent = "Reavaliando...";
    try {
      const result = await root.TemePracticeApi.evaluate({
        station: state.station,
        audioBlob: null,
        transcript,
        durationSeconds: attempt.durationSeconds
      });
      if (state.lastAttempt !== attempt || state.session?.status !== "review") return;
      state.transcript = result.transcript || transcript;
      finalizeEvaluation(result.evaluations, "ai", result.attemptId, result);
    } catch (error) {
      if (state.lastAttempt !== attempt || state.session?.status !== "review") return;
      message.innerHTML = `<div class="practice-alert practice-alert-error">${escapeHtml(error.message || "Não foi possível reavaliar.")}</div>`;
      button.disabled = false;
      button.textContent = "Reavaliar após corrigir texto";
    }
  }

  function resetSimulator() {
    clearSessionTimer();
    cleanupRecording();
    state.runtimeNotice = "";
    state.transcript = "";
    state.phaseAnswers = {};
    if (root.localStorage) clearPracticeDraft(root.localStorage);
    if (root.localStorage) root.localStorage.removeItem(ANSWERS_KEY);
    state.session = state.station ? createPracticeSession(state.station, Date.now(), state.mode) : null;
    renderSetup();
  }

  function downloadText(content, filename) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = root.URL.createObjectURL(blob);
    const anchor = root.document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    root.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    root.URL.revokeObjectURL(url);
  }

  function renderDashboard(skipSync) {
    const mount = root.document && root.document.getElementById("practice-dashboard");
    if (!mount || !root.TemePracticeUtils) return;
    const attempts = getStoredAttempts();
    const summary = root.TemePracticeUtils.summarizePracticeAttempts(attempts);
    mount.innerHTML = `
      <section class="practice-shell">
        <div class="practice-dashboard-stats">
          <div><strong>${summary.totalAttempts}</strong><span>tentativas</span></div>
          <div><strong>${summary.averagePercent == null ? "-" : `${summary.averagePercent}%`}</strong><span>média concluída</span></div>
          <div><strong>${summary.byDomain.length}</strong><span>domínios treinados</span></div>
        </div>
        <p id="practice-sync-state" class="practice-help">Histórico local${root.TemePracticeApi ? "; verificando sincronização..." : "."}</p>
        <h2>Lacunas mais frequentes</h2>
        ${summary.frequentGaps.length ? `<ol class="practice-gap-list">${summary.frequentGaps.slice(0, 10).map((gap) => `<li><span>${escapeHtml(gap.label)}</span><strong>${gap.count}x</strong></li>`).join("")}</ol>` : "<p>Nenhuma lacuna registrada. Conclua uma estação para iniciar o histórico.</p>"}
        <h2>Últimas tentativas</h2>
        ${attempts.length ? `<div class="practice-history">${attempts.slice(0, 20).map((attempt) => `<article><div><strong>${escapeHtml(attempt.stationTitle)}</strong><span>${escapeHtml(formatDate(attempt.completedAt))}</span></div><b>${Number.isFinite(attempt.finalPercent) ? `${attempt.finalPercent}%` : "pendente"}</b></article>`).join("")}</div>` : "<p>O histórico local está vazio.</p>"}
        <div class="practice-actions">
          <button id="practice-export-history" class="practice-button practice-button-primary" type="button" ${attempts.length ? "" : "disabled"}>Exportar histórico</button>
          <button id="practice-clear-history" class="practice-button practice-button-danger" type="button" ${attempts.length ? "" : "disabled"}>Limpar histórico local</button>
        </div>
      </section>`;
    const exportButton = mount.querySelector("#practice-export-history");
    if (exportButton) exportButton.addEventListener("click", () => {
      const content = attempts.map(buildPracticeReport).join("\n\n");
      downloadText(content, "historico-pratica-teme.txt");
    });
    const clearButton = mount.querySelector("#practice-clear-history");
    if (clearButton) clearButton.addEventListener("click", () => {
      if (!root.confirm("Apagar apenas o histórico prático salvo neste navegador?")) return;
      root.localStorage.removeItem(STORAGE_KEY);
      renderDashboard();
    });
    if (!skipSync && !state.dashboardSyncStarted) syncDashboardAttempts();
  }

  async function syncDashboardAttempts() {
    if (!root.TemePracticeApi || !root.localStorage) return;
    state.dashboardSyncStarted = true;
    const status = root.document.getElementById("practice-sync-state");
    try {
      const session = await root.TemePracticeApi.getSession();
      if (!session) {
        if (status) status.textContent = "Histórico local. Entre no simulador para sincronizar entre dispositivos.";
        return;
      }
      const serverAttempts = await root.TemePracticeApi.listAttempts();
      let merged = getStoredAttempts();
      serverAttempts.slice().reverse().forEach((attempt) => {
        merged = upsertAttemptList(merged, attempt);
      });
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      renderDashboard(true);
      const refreshed = root.document.getElementById("practice-sync-state");
      if (refreshed) refreshed.textContent = "Histórico sincronizado com sua conta.";
    } catch (error) {
      if (status) status.textContent = `Histórico local; sincronização indisponível: ${error.message}`;
    }
  }

  async function restoreSavedDraft() {
    if (!root.localStorage) return false;
    const raw = root.localStorage.getItem(DRAFT_KEY);
    if (!raw) return false;
    let draft;
    try {
      draft = JSON.parse(raw);
    } catch {
      clearPracticeDraft(root.localStorage);
      return false;
    }
    const entry = getStationEntry(draft && draft.stationId);
    if (!entry) {
      clearPracticeDraft(root.localStorage);
      return false;
    }
    state.mode = normalizePracticeMode(draft.mode);
    await loadSelectedStation(entry);
    if (!state.station || state.mediaStatus !== "ready") return false;
    const restored = restorePracticeDraft(raw, state.station, Date.now());
    if (!restored) {
      clearPracticeDraft(root.localStorage);
      return false;
    }
    state.session = restored.session;
    state.phaseAnswers = restorePhaseAnswers(restored.session);
    state.audioBlob = restored.audioBlob;
    state.audioUrl = restored.audioUrl;
    state.runtimeNotice = restored.notice;
    renderRunning();
    clearSessionTimer();
    state.timerId = root.setInterval(updateTimer, 250);
    return true;
  }

  let mountingPromise = null;
  let guardedSimulator = null;
  let activeSimulator = null;
  let lifecycleGeneration = 0;
  let sessionStartGeneration = 0;
  let lifecycleListenersAttached = false;

  function cleanupRuntime() {
    lifecycleGeneration += 1;
    sessionStartGeneration += 1;
    clearSessionTimer();
    cleanupRecording();
  }

  function leaveSimulatorLifecycle() {
    cleanupRuntime();
    activeSimulator = null;
  }

  function ensureLifecycleListeners() {
    if (lifecycleListenersAttached || !root || typeof root.addEventListener !== "function") return;
    root.addEventListener("hashchange", leaveSimulatorLifecycle);
    root.addEventListener("pagehide", leaveSimulatorLifecycle);
    lifecycleListenersAttached = true;
  }

  function trackSimulatorMount(simulator) {
    if (activeSimulator && activeSimulator !== simulator) cleanupRuntime();
    activeSimulator = simulator || null;
  }

  function guardMobileSimulatorClicks(simulator) {
    if (!simulator || guardedSimulator === simulator) return;
    simulator.addEventListener("click", (event) => {
      if (root.innerWidth <= 980) event.stopPropagation();
    });
    guardedSimulator = simulator;
  }

  function mount() {
    if (!root || !root.document) return Promise.resolve();
    ensureLifecycleListeners();
    const simulator = root.document.getElementById("practice-simulator");
    const enteringSimulator = Boolean(simulator && activeSimulator !== simulator);
    trackSimulatorMount(simulator);
    if (mountingPromise) return mountingPromise;
    mountingPromise = (async () => {
      state.dashboardSyncStarted = false;
      if (simulator) {
        guardMobileSimulatorClicks(simulator);
        try {
          if (!state.stationEntries.length) {
            const [entries, manifest] = await Promise.all([
              loadStationIndex(),
              loadMediaManifest()
            ]);
            state.stationEntries = entries;
            state.stations = entries;
            state.mediaManifest = manifest;
            const savedSetup = restorePracticeSetup(root.localStorage);
            state.mode = savedSetup.mode;
            state.filters = { ...DEFAULT_FILTERS };
            state.cycleIds = savedSetup.cycleIds;
            state.examPlan = restoreExamPlan(root.localStorage, state.stationEntries);
          }
          if (!(await restoreSavedDraft())) {
            if (state.mode === "exam" && enteringSimulator) startNewExamRound();
            await loadCurrentModeSelection();
          }
        } catch (error) {
          renderError(simulator, error.message);
        }
      }
      renderDashboard();
    })().finally(() => {
      mountingPromise = null;
    });
    return mountingPromise;
  }

  return {
    createPracticeSession,
    advancePracticePhase,
    getPracticePrimaryAction,
    getPublicStationView,
    getPracticePhaseControls,
    areStartActionsDisabled,
    getCurrentPhaseMedia,
    getRunningMediaOptions,
    getResultMediaOptions,
    renderFlowTimeWaveform,
    DRAFT_KEY,
    CYCLE_KEY,
    EXAM_PLAN_KEY,
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
    getRemainingSeconds,
    buildPracticeReport,
    parseStoredAttempts,
    upsertAttemptList,
    mount
  };
});
