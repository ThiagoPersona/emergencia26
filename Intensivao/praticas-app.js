(function(root, factory) {
  const api = factory(root);
  api.createPracticeApp = factory;
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TemePracticeApp = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(root) {
  "use strict";

  const STORAGE_KEY = "teme26-practice-attempts-v1";
  const DRAFT_KEY = "teme26-practice-draft-v2";
  const CYCLE_KEY = "teme26-practice-cycle-v2";
  const PREFERENCES_KEY = "teme26-practice-setup-v2";
  const DEFAULT_FILTERS = {
    domain: "",
    difficulty: "",
    competency: "",
    media: "",
    unattempted: false
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
    mediaManifest: [],
    stationMedia: null,
    mediaStatus: "idle",
    loadError: "",
    loadToken: 0,
    session: null,
    timerId: null,
    mediaRecorder: null,
    mediaStream: null,
    audioChunks: [],
    audioBlob: null,
    audioUrl: null,
    runtimeNotice: "",
    transcript: "",
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

  function getPublicStationView(station, mode) {
    if (mode === "exam") {
      return {
        kicker: "MODO PROVA",
        title: station && station.examTitle ? station.examTitle : "Estação sorteada",
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
      title: station && station.title ? station.title : "Estação sorteada",
      domain: station && station.domain,
      difficulty: station && station.difficulty,
      showDiagnosticMeta: true
    };
  }

  function getPracticePhaseControls(session, station) {
    return {
      previous: {
        action: "previous",
        label: "Fase anterior",
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
    state.mode = normalizePracticeMode(mode);
    saveCurrentSetup();
    await loadCurrentModeSelection();
  }

  function cleanupRecording() {
    if (state.mediaStream) state.mediaStream.getTracks().forEach((track) => track.stop());
    state.mediaStream = null;
    state.mediaRecorder = null;
    if (state.audioUrl && root.URL) root.URL.revokeObjectURL(state.audioUrl);
    state.audioUrl = null;
  }

  function chooseAudioMimeType() {
    if (!root.MediaRecorder || typeof root.MediaRecorder.isTypeSupported !== "function") return "";
    return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]
      .find((type) => root.MediaRecorder.isTypeSupported(type)) || "";
  }

  async function startRecording() {
    if (!root.navigator || !root.navigator.mediaDevices || !root.MediaRecorder) {
      throw new Error("Este navegador não oferece gravação de áudio compatível.");
    }
    cleanupRecording();
    state.audioChunks = [];
    state.audioBlob = null;
    const stream = await root.navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = chooseAudioMimeType();
    const recorder = new root.MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) state.audioChunks.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      state.audioBlob = new Blob(state.audioChunks, { type: recorder.mimeType || "audio/webm" });
      state.audioUrl = root.URL.createObjectURL(state.audioBlob);
      renderReview();
    }, { once: true });
    recorder.start(1000);
    state.mediaStream = stream;
    state.mediaRecorder = recorder;
  }

  function stopRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
      state.mediaRecorder.stop();
    } else {
      cleanupRecording();
    }
    if (state.mediaStream) state.mediaStream.getTracks().forEach((track) => track.stop());
    state.mediaStream = null;
  }

  function renderError(mount, message) {
    mount.innerHTML = `<div class="practice-alert practice-alert-error"><strong>Não foi possível abrir o simulador.</strong><span>${escapeHtml(message)}</span></div>`;
  }

  function getEntryValues(field) {
    const values = new Set();
    state.stationEntries.forEach((entry) => {
      const source = field === "competency"
        ? [].concat(Array.isArray(entry.competencies) ? entry.competencies : [], Array.isArray(entry.tags) ? entry.tags : [])
        : field === "domain"
          ? [].concat(Array.isArray(entry.domains) ? entry.domains : [], entry.domain || [])
          : [entry.difficulty];
      source.forEach((value) => {
        if (typeof value === "string" && value.trim()) values.add(value);
      });
    });
    return Array.from(values).sort((left, right) => left.localeCompare(right, "pt-BR"));
  }

  function renderSelectOptions(values, selected, emptyLabel) {
    return [`<option value="">${escapeHtml(emptyLabel)}</option>`]
      .concat(values.map((value) => (
        `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`
      )))
      .join("");
  }

  function renderMediaFilterOptions(selected) {
    return [
      ["", "Todas as mídias"],
      ["with", "Com mídia"],
      ["without", "Sem mídia"]
    ].map(([value, label]) => (
      `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`
    )).join("");
  }

  function getEntryLabel(entry, index) {
    return entry && entry.title ? entry.title : `Estação ${index + 1}`;
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

  function getSetupStationView(station, selectedEntry, mode, mediaStatus) {
    const subject = station || selectedEntry;
    if (!subject) return { visible: false, startDisabled: true };
    const publicView = getPublicStationView(subject, mode);
    return {
      visible: true,
      loaded: Boolean(station),
      startDisabled: areStartActionsDisabled(mediaStatus) || !station,
      kicker: publicView.kicker,
      title: publicView.title,
      showDiagnosticMeta: publicView.showDiagnosticMeta,
      briefing: station && station.briefing ? station.briefing : "",
      durationSeconds: station && Number.isFinite(station.durationSeconds) ? station.durationSeconds : null,
      checklistCount: station && Array.isArray(station.checklist) ? station.checklist.length : null,
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
    const setupView = getSetupStationView(station, state.selectedEntry, state.mode, state.mediaStatus);
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
        ${state.stationEntries.length ? `<button class="practice-button practice-button-quiet" id="practice-choose-another" type="button">Sortear outra</button>` : ""}
      </div>` : "";
    const directedControls = state.mode === "directed" ? `
      <form id="practice-filters" class="practice-filter-bar">
        <label><span>Domínio</span><select name="domain">${renderSelectOptions(getEntryValues("domain"), state.filters.domain, "Todos os domínios")}</select></label>
        <label><span>Dificuldade</span><select name="difficulty">${renderSelectOptions(getEntryValues("difficulty"), state.filters.difficulty, "Todas as dificuldades")}</select></label>
        <label><span>Competência</span><select name="competency">${renderSelectOptions(getEntryValues("competency"), state.filters.competency, "Todas as competências")}</select></label>
        <label><span>Mídia</span><select name="media">${renderMediaFilterOptions(state.filters.media)}</select></label>
        <label class="practice-toggle"><input name="unattempted" type="checkbox" ${state.filters.unattempted ? "checked" : ""}><span>Não realizadas</span></label>
        <button class="practice-button" type="submit">Aplicar filtros</button>
      </form>
      <div class="practice-toolbar">
        <label for="practice-station">Estação</label>
        <select id="practice-station" ${state.mediaStatus === "loading" ? "disabled" : ""}>
          ${state.stationEntries.map((entry, index) => `<option value="${escapeHtml(entry.id)}" ${state.selectedEntry && entry.id === state.selectedEntry.id ? "selected" : ""}>${escapeHtml(getEntryLabel(entry, index))}</option>`).join("")}
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
              <span><strong>${setupView.durationSeconds == null ? "--:--" : formatClock(setupView.durationSeconds)}</strong> de estação</span>
              <span><strong>${setupView.checklistCount == null ? "--" : setupView.checklistCount}</strong> itens</span>
              ${showDiagnosticMeta ? `<span><strong>${escapeHtml(setupView.difficulty)}</strong> dificuldade</span>` : ""}
            </div>
          </div>
          ${renderPracticeStartActions(setupView)}
        ` : ""}
        <div id="practice-auth" class="practice-auth"><p>Verificando acesso à correção automática...</p></div>
        <p class="practice-help">O checklist permanece oculto durante a estação. Permita o microfone somente se desejar correção pela fala.</p>
      </section>`;

    mount.querySelectorAll("input[name='practice-mode']").forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) setPracticeMode(input.value);
      });
    });
    const filterForm = mount.querySelector("#practice-filters");
    if (filterForm) filterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      state.filters = normalizePracticeFilters({
        domain: form.get("domain"),
        difficulty: form.get("difficulty"),
        competency: form.get("competency"),
        media: form.get("media"),
        unattempted: form.get("unattempted") === "on"
      });
      saveCurrentSetup();
      loadCurrentModeSelection();
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

  async function beginSession(withRecording) {
    if (!state.station || areStartActionsDisabled(state.mediaStatus)) return;
    const now = Date.now();
    const prepared = createPracticeSession(state.station, now, state.mode);
    state.session = sessionModule && typeof sessionModule.startSession === "function"
      ? sessionModule.startSession(prepared, now)
      : { ...prepared, status: "running", startedAtMs: now };
    state.transcript = "";
    state.lastAttempt = null;
    state.runtimeNotice = "";
    if (root.localStorage) savePracticeDraft(root.localStorage, state.session);
    if (withRecording) {
      try {
        await startRecording();
      } catch (error) {
        state.runtimeNotice = `Microfone indisponível: ${error.message}. O treino continuará sem áudio.`;
      }
    }
    renderRunning();
    root.clearInterval(state.timerId);
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
      title: station && station.examTitle ? station.examTitle : "Estação em andamento"
    };
  }

  function getVitalEntries(patientState) {
    const vitals = patientState && patientState.vitals;
    if (!vitals || typeof vitals !== "object" || Array.isArray(vitals)) return [];
    return Object.entries(vitals).filter(([label, value]) => (
      typeof label === "string" && value != null && String(value).trim() !== ""
    ));
  }

  function renderRunning() {
    const mount = root.document.getElementById("practice-simulator");
    if (!mount || !state.session) return;
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
          <div><span class="practice-kicker">${escapeHtml(runningView.kicker)}</span><strong>${escapeHtml(runningView.title)} · Fase ${state.session.phaseIndex + 1}/${state.station.phases.length}</strong></div>
          <time id="practice-clock" class="practice-clock ${remaining <= 60 ? "is-warning" : ""}" datetime="PT${remaining}S">${formatClock(remaining)}</time>
        </header>
        ${state.runtimeNotice ? `<div class="practice-alert">${escapeHtml(state.runtimeNotice)}</div>` : ""}
        ${patientState && patientState.summary ? `<section class="practice-patient-state" aria-label="Estado clínico"><h2>Estado clínico</h2><p>${escapeHtml(patientState.summary)}</p></section>` : ""}
        ${vitals.length ? `<dl class="practice-vitals">${vitals.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : ""}
        <div class="practice-task">
          <span>${escapeHtml(phase.title)}</span>
          <p>${escapeHtml(phase.prompt)}</p>
        </div>
        <div id="practice-phase-media" aria-label="Mídia da fase atual"></div>
        <div class="practice-actions">
          <button id="practice-previous" class="practice-button" type="button" ${controls.previous.disabled ? "disabled" : ""}>${controls.previous.label}</button>
          <button id="practice-next" class="practice-button practice-button-primary" type="button">${controls.primary.label}</button>
          <button id="practice-finish" class="practice-button practice-button-danger" type="button">Encerrar estação</button>
        </div>
        <p class="practice-recording-state">${state.mediaRecorder ? "● Gravação em andamento" : "Treino sem gravação"}</p>
      </section>`;
    const mediaContainer = mount.querySelector("#practice-phase-media");
    if (mediaContainer && mediaModule && typeof mediaModule.renderPhaseMedia === "function") {
      mediaModule.renderPhaseMedia(mediaContainer, currentPhaseMedia, getRunningMediaOptions(currentPhaseMedia));
    }
    mount.querySelector("#practice-previous").addEventListener("click", () => {
      state.session = movePracticePhase(state.session, "previous");
      if (root.localStorage) savePracticeDraft(root.localStorage, state.session);
      renderRunning();
    });
    mount.querySelector("#practice-next").addEventListener("click", () => {
      if (controls.primary.action === "finish") {
        finishSession();
        return;
      }
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
    root.clearInterval(state.timerId);
    state.session = { ...state.session, status: "review", completedAtMs: Date.now() };
    if (root.localStorage) clearPracticeDraft(root.localStorage);
    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") stopRecording();
    else renderReview();
  }

  function renderReview() {
    const mount = root.document.getElementById("practice-simulator");
    if (!mount || !state.session || state.session.status !== "review") return;
    mount.innerHTML = `
      <section class="practice-shell">
        <span class="practice-kicker">Estação encerrada</span>
        <h2>Registre exatamente o que você falou</h2>
        ${state.audioUrl ? `<audio class="practice-audio" controls src="${escapeHtml(state.audioUrl)}"></audio>` : ""}
        <label class="practice-field" for="practice-transcript">
          <span>Transcrição</span>
          <textarea id="practice-transcript" rows="10" placeholder="A transcrição automática aparecerá aqui. No modo sem API, digite ou cole sua fala sem acrescentar ações que não foram verbalizadas.">${escapeHtml(state.transcript)}</textarea>
        </label>
        <div id="practice-api-message"></div>
        <div class="practice-actions">
          <button id="practice-ai-evaluate" class="practice-button practice-button-primary" type="button" ${state.audioBlob || state.transcript ? "" : "disabled"}>Transcrever e corrigir com IA</button>
          <button id="practice-manual-evaluate" class="practice-button" type="button">Abrir autoavaliação</button>
          <button id="practice-restart" class="practice-button practice-button-quiet" type="button">Descartar e reiniciar</button>
        </div>
      </section>`;
    const textarea = mount.querySelector("#practice-transcript");
    textarea.addEventListener("input", () => {
      state.transcript = textarea.value;
      mount.querySelector("#practice-ai-evaluate").disabled = !(state.audioBlob || state.transcript.trim());
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
        rationale: "Classificação manual do aluno."
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
    mount.innerHTML = `
      <section class="practice-shell">
        <div class="practice-result-head">
          <div><span class="practice-kicker">Resultado</span><h2>${escapeHtml(state.station.title)}</h2></div>
          <strong class="practice-score">${score}%</strong>
        </div>
        ${attempt.persistenceWarning ? `<div class="practice-alert">${escapeHtml(attempt.persistenceWarning)}</div>` : ""}
        ${attempt.summary ? `<div class="practice-feedback"><strong>Síntese da avaliação</strong><p>${escapeHtml(attempt.summary)}</p></div>` : ""}
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
        ${attempt.criticalFailures.length ? `<div class="practice-alert practice-alert-error"><strong>Erros críticos</strong><span>${attempt.criticalFailures.map(escapeHtml).join(", ")}</span></div>` : ""}
        <div class="practice-result-list">
          ${attempt.evaluations.map((evaluation) => `
            <article class="practice-result-item is-${escapeHtml(evaluation.status)}">
              <header><strong>${escapeHtml(evaluation.label)}</strong><span>${escapeHtml(evaluation.status.replace("_", " "))}</span></header>
              <p>${escapeHtml(evaluation.evidence)}</p>
              ${evaluation.rationale ? `<small>${escapeHtml(evaluation.rationale)}</small>` : ""}
            </article>`).join("")}
        </div>
        <section class="practice-result-media" aria-label="Mídias revisadas da estação">
          <h3>Revisão visual</h3>
          <div id="practice-result-media"></div>
        </section>
        ${relatedStations.length ? `<section class="practice-related-stations" aria-label="Estações relacionadas"><h3>Estações relacionadas</h3><div class="practice-related-actions">${relatedStations.map((entry, index) => `<button class="practice-button" type="button" data-related-station="${escapeHtml(entry.id)}">${escapeHtml(getEntryLabel(entry, index))}</button>`).join("")}</div></section>` : ""}
        <div class="practice-actions">
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

  function resetSimulator() {
    root.clearInterval(state.timerId);
    cleanupRecording();
    state.audioBlob = null;
    state.audioChunks = [];
    state.runtimeNotice = "";
    state.transcript = "";
    if (root.localStorage) clearPracticeDraft(root.localStorage);
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
    state.audioBlob = restored.audioBlob;
    state.audioUrl = restored.audioUrl;
    state.runtimeNotice = restored.notice;
    renderRunning();
    root.clearInterval(state.timerId);
    state.timerId = root.setInterval(updateTimer, 250);
    return true;
  }

  let mountingPromise = null;

  function mount() {
    if (mountingPromise) return mountingPromise;
    mountingPromise = (async () => {
      if (!root || !root.document) return;
      state.dashboardSyncStarted = false;
      const simulator = root.document.getElementById("practice-simulator");
      if (simulator) {
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
            state.filters = savedSetup.filters;
            state.cycleIds = savedSetup.cycleIds;
          }
          if (!(await restoreSavedDraft())) await loadCurrentModeSelection();
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
    getRemainingSeconds,
    buildPracticeReport,
    parseStoredAttempts,
    upsertAttemptList,
    mount
  };
});
