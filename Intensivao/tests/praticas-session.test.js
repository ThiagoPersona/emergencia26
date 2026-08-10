const assert = require("node:assert/strict");
const test = require("node:test");

let sessionApi = {};
try {
  sessionApi = require("../praticas-session.js");
} catch {
  // Keep the RED phase as an assertion failure until the module exists.
}

const station = {
  id: "station-1",
  version: 3,
  durationSeconds: 300,
  phases: [
    { id: "a", title: "A", prompt: "Primeira tarefa" },
    { id: "b", title: "B", prompt: "Segunda tarefa" },
    { id: "c", title: "C", prompt: "Tarefa final" }
  ]
};

function api(name) {
  assert.equal(typeof sessionApi[name], "function", `TemePracticeSession.${name} deve ser uma funcao`);
  return sessionApi[name];
}

test("cria sessao com modo dirigido por padrao e modo explicito", () => {
  const createSession = api("createSession");

  assert.deepEqual(createSession(station, undefined, 1000), {
    stationId: "station-1",
    stationVersion: 3,
    mode: "directed",
    status: "ready",
    phaseIndex: 0,
    createdAtMs: 1000,
    startedAtMs: null,
    completedAtMs: null
  });
  assert.equal(createSession(station, "exam", 1000).mode, "exam");
  assert.equal(createSession(station, "review", 1000).mode, "review");
});

test("inicia sessao uma unica vez e preserva o primeiro horario", () => {
  const createSession = api("createSession");
  const startSession = api("startSession");
  const ready = createSession(station, "directed", 1000);
  const running = startSession(ready, 2000);
  const repeated = startSession(running, 3000);

  assert.equal(running.status, "running");
  assert.equal(running.startedAtMs, 2000);
  assert.deepEqual(repeated, running);
  assert.notStrictEqual(running, ready);
});

test("avanca, retorna e limita a fase sem alterar status ou timestamps", () => {
  const createSession = api("createSession");
  const movePhase = api("movePhase");
  const session = {
    ...createSession(station, "directed", 1000),
    status: "running",
    phaseIndex: 1,
    startedAtMs: 2000
  };

  assert.equal(movePhase(session, station, "next").phaseIndex, 2);
  assert.equal(movePhase(session, station, "next").status, "running");
  assert.equal(movePhase(session, station, "next").startedAtMs, 2000);
  assert.equal(movePhase(session, station, "previous").phaseIndex, 0);
  assert.equal(movePhase({ ...session, phaseIndex: 0 }, station, "previous").phaseIndex, 0);
  assert.equal(movePhase({ ...session, phaseIndex: 2 }, station, "next").phaseIndex, 2);
});

test("oferece acao de avancar antes da ultima fase e finalizar na ultima", () => {
  const createSession = api("createSession");
  const getPrimaryAction = api("getPrimaryAction");

  assert.deepEqual(getPrimaryAction(createSession(station, "directed", 1000), station), {
    action: "next",
    label: "Próxima tarefa"
  });
  assert.deepEqual(getPrimaryAction({ ...createSession(station, "directed", 1000), phaseIndex: 2 }, station), {
    action: "finish",
    label: "Finalizar estação"
  });
});

test("calcula o tempo restante a partir do inicio e nunca fica negativo", () => {
  const createSession = api("createSession");
  const getRemainingSeconds = api("getRemainingSeconds");
  const ready = createSession(station, "directed", 1000);
  const running = { ...ready, status: "running", startedAtMs: 1000 };

  assert.equal(getRemainingSeconds(ready, station, 5000), 300);
  assert.equal(getRemainingSeconds(running, station, 61000), 240);
  assert.equal(getRemainingSeconds(running, station, 401000), 0);
});

test("serializa somente os campos conhecidos da sessao", () => {
  const createSession = api("createSession");
  const serializeSession = api("serializeSession");
  const session = {
    ...createSession(station, "exam", 1000),
    status: "running",
    startedAtMs: 2000,
    audioBlob: { type: "audio/webm" },
    remainingSeconds: 120,
    helper: () => "nao"
  };

  assert.deepEqual(JSON.parse(serializeSession(session)), {
    stationId: "station-1",
    stationVersion: 3,
    mode: "exam",
    status: "running",
    phaseIndex: 0,
    createdAtMs: 1000,
    startedAtMs: 2000,
    completedAtMs: null
  });
});

test("restaura sessao valida, limita a fase atual e calcula o restante", () => {
  const restoreSession = api("restoreSession");
  const raw = JSON.stringify({
    stationId: "station-1",
    stationVersion: 3,
    mode: "review",
    status: "running",
    phaseIndex: 99,
    createdAtMs: 1000,
    startedAtMs: 10000,
    completedAtMs: null,
    audioBlob: "ignorar"
  });

  assert.deepEqual(restoreSession(raw, station, 70000), {
    stationId: "station-1",
    stationVersion: 3,
    mode: "review",
    status: "running",
    phaseIndex: 2,
    createdAtMs: 1000,
    startedAtMs: 10000,
    completedAtMs: null,
    remainingSeconds: 240
  });
  assert.equal(restoreSession(JSON.parse(raw), station, 70000).phaseIndex, 2);
});

test("rejeita restauracao com entrada corrompida, divergente, invalida ou expirada", () => {
  const restoreSession = api("restoreSession");
  const base = {
    stationId: "station-1",
    stationVersion: 3,
    mode: "directed",
    status: "running",
    phaseIndex: 0,
    createdAtMs: 1000,
    startedAtMs: 1000,
    completedAtMs: null
  };

  assert.equal(restoreSession("nao-json", station, 2000), null);
  assert.equal(restoreSession({ ...base, stationId: "other" }, station, 2000), null);
  assert.equal(restoreSession({ ...base, stationVersion: 4 }, station, 2000), null);
  assert.equal(restoreSession({ ...base, status: "ready" }, station, 2000), null);
  assert.equal(restoreSession({ ...base, createdAtMs: "1000" }, station, 2000), null);
  assert.equal(restoreSession({ ...base, startedAtMs: NaN }, station, 2000), null);
  assert.equal(restoreSession({ ...base, completedAtMs: 1500 }, station, 2000), null);
  assert.equal(restoreSession(base, station, 301000), null);
});

test("rejeita restauracao quando o inicio esta no futuro do relogio informado", () => {
  const restoreSession = api("restoreSession");
  const futureSession = {
    stationId: "station-1",
    stationVersion: 3,
    mode: "directed",
    status: "running",
    phaseIndex: 0,
    createdAtMs: 1000,
    startedAtMs: 5000,
    completedAtMs: null
  };

  assert.equal(restoreSession(futureSession, station, 4000), null);
});

test("publica a API UMD no global do navegador", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const vm = require("node:vm");
  const sourcePath = path.join(__dirname, "..", "praticas-session.js");
  assert.equal(fs.existsSync(sourcePath), true, "praticas-session.js deve existir");
  const source = fs.readFileSync(sourcePath, "utf8");
  const context = {};

  vm.runInNewContext(source, context);
  assert.equal(typeof context.TemePracticeSession.createSession, "function");
});
