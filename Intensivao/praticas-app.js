(function(root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TemePracticeApp = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(root) {
  "use strict";

  const STORAGE_KEY = "teme26-practice-attempts-v1";
  const DRAFT_KEY = "teme26-practice-draft-v1";
  const state = {
    stations: [],
    station: null,
    session: null,
    timerId: null,
    mediaRecorder: null,
    mediaStream: null,
    audioChunks: [],
    audioBlob: null,
    audioUrl: null,
    transcript: "",
    lastAttempt: null,
    apiStatus: "idle",
    dashboardSyncStarted: false
  };

  function createPracticeSession(station, createdAtMs) {
    return {
      stationId: station.id,
      stationVersion: station.version,
      status: "ready",
      phaseIndex: 0,
      createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : Date.now(),
      startedAtMs: null,
      completedAtMs: null
    };
  }

  function advancePracticePhase(session) {
    const station = state.station && state.station.id === session.stationId
      ? state.station
      : null;
    const phaseCount = station ? station.phases.length : 2;
    return {
      ...session,
      phaseIndex: Math.min(session.phaseIndex + 1, Math.max(0, phaseCount - 1))
    };
  }

  function getRemainingSeconds(session, nowMs, durationSeconds) {
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
    const indexResponse = await fetch(`${stationBasePath()}index.json`, { cache: "no-store" });
    if (!indexResponse.ok) throw new Error("Não foi possível carregar o índice de estações.");
    const index = await indexResponse.json();
    const stations = await Promise.all(index.map(async (entry) => {
      const response = await fetch(`${stationBasePath()}${entry.file}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Falha ao carregar ${entry.file}.`);
      return response.json();
    }));
    const utils = root.TemePracticeUtils;
    stations.forEach((station) => {
      const validation = utils.validateStation(station);
      if (!validation.valid) throw new Error(`${station.id}: ${validation.errors.join("; ")}`);
    });
    state.stations = stations;
    state.station = stations[0] || null;
    return stations;
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

  function renderSetup() {
    const mount = root.document && root.document.getElementById("practice-simulator");
    if (!mount || !state.station) return;
    mount.innerHTML = `
      <section class="practice-shell">
        <div class="practice-toolbar">
          <label for="practice-station">Estação</label>
          <select id="practice-station">
            ${state.stations.map((station) => `<option value="${escapeHtml(station.id)}" ${station.id === state.station.id ? "selected" : ""}>${escapeHtml(station.title)}</option>`).join("")}
          </select>
        </div>
        <div class="practice-briefing">
          <span class="practice-kicker">${escapeHtml(state.station.domain)} · TEME ${escapeHtml(state.station.source.year)}</span>
          <h2>${escapeHtml(state.station.title)}</h2>
          <p>${escapeHtml(state.station.briefing)}</p>
          <div class="practice-meta">
            <span><strong>05:00</strong> de estação</span>
            <span><strong>${state.station.checklist.length}</strong> itens</span>
            <span><strong>100</strong> pontos</span>
          </div>
        </div>
        <div class="practice-actions">
          <button class="practice-button practice-button-primary" id="practice-start-record" type="button">Iniciar e gravar</button>
          <button class="practice-button" id="practice-start-manual" type="button">Iniciar sem áudio</button>
        </div>
        <div id="practice-auth" class="practice-auth"><p>Verificando acesso à correção automática...</p></div>
        <p class="practice-help">O checklist permanece oculto durante a estação. Permita o microfone somente se desejar correção pela fala.</p>
      </section>`;

    mount.querySelector("#practice-station").addEventListener("change", (event) => {
      state.station = state.stations.find((station) => station.id === event.target.value) || state.stations[0];
      state.session = createPracticeSession(state.station, Date.now());
      renderSetup();
    });
    mount.querySelector("#practice-start-record").addEventListener("click", () => beginSession(true));
    mount.querySelector("#practice-start-manual").addEventListener("click", () => beginSession(false));
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
    const mount = root.document.getElementById("practice-simulator");
    state.session = {
      ...createPracticeSession(state.station, Date.now()),
      status: "running",
      startedAtMs: Date.now()
    };
    state.transcript = "";
    state.lastAttempt = null;
    if (withRecording) {
      try {
        await startRecording();
      } catch (error) {
        renderInlineNotice(mount, `Microfone indisponível: ${error.message}. O treino continuará sem áudio.`);
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

  function renderRunning() {
    const mount = root.document.getElementById("practice-simulator");
    if (!mount || !state.session) return;
    const phase = state.station.phases[state.session.phaseIndex];
    const remaining = getRemainingSeconds(state.session, Date.now(), state.station.durationSeconds);
    mount.innerHTML = `
      <section class="practice-shell practice-running">
        <header class="practice-run-header">
          <div><span class="practice-kicker">${escapeHtml(state.station.title)}</span><strong>Fase ${state.session.phaseIndex + 1}/${state.station.phases.length}</strong></div>
          <time id="practice-clock" class="practice-clock ${remaining <= 60 ? "is-warning" : ""}" datetime="PT${remaining}S">${formatClock(remaining)}</time>
        </header>
        <div class="practice-task">
          <span>${escapeHtml(phase.title)}</span>
          <p>${escapeHtml(phase.prompt)}</p>
        </div>
        <div class="practice-actions">
          <button id="practice-next" class="practice-button practice-button-primary" type="button" ${state.session.phaseIndex >= state.station.phases.length - 1 ? "disabled" : ""}>Próxima tarefa</button>
          <button id="practice-finish" class="practice-button practice-button-danger" type="button">Encerrar estação</button>
        </div>
        <p class="practice-recording-state">${state.mediaRecorder ? "● Gravação em andamento" : "Treino sem gravação"}</p>
      </section>`;
    mount.querySelector("#practice-next").addEventListener("click", () => {
      state.session = advancePracticePhase(state.session);
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
        <div class="practice-actions">
          <button id="practice-download" class="practice-button practice-button-primary" type="button">Baixar relatório</button>
          <button id="practice-repeat" class="practice-button" type="button">Repetir estação</button>
          <a class="practice-button practice-button-quiet" href="#/praticas/DESEMPENHO">Ver desempenho</a>
        </div>
      </section>`;
    mount.querySelector("#practice-download").addEventListener("click", () => downloadText(buildPracticeReport(attempt), `treino-${attempt.stationId}.txt`));
    mount.querySelector("#practice-repeat").addEventListener("click", resetSimulator);
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
    state.transcript = "";
    state.session = createPracticeSession(state.station, Date.now());
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

  async function mount() {
    if (!root || !root.document) return;
    state.dashboardSyncStarted = false;
    const simulator = root.document.getElementById("practice-simulator");
    if (simulator) {
      try {
        if (!state.stations.length) await loadStations();
        state.session = createPracticeSession(state.station, Date.now());
        renderSetup();
      } catch (error) {
        renderError(simulator, error.message);
      }
    }
    renderDashboard();
  }

  return {
    createPracticeSession,
    advancePracticePhase,
    getRemainingSeconds,
    buildPracticeReport,
    parseStoredAttempts,
    upsertAttemptList,
    mount
  };
});
