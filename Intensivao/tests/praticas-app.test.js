const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createPracticeSession,
  advancePracticePhase,
  getPracticePrimaryAction,
  getRemainingSeconds,
  buildPracticeReport,
  parseStoredAttempts,
  upsertAttemptList
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
