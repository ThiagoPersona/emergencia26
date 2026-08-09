const assert = require("node:assert/strict");
const test = require("node:test");

const {
  validateStation,
  calculatePracticeScore,
  mergeManualChecks,
  summarizePracticeAttempts
} = require("../praticas-utils.js");

const station = {
  id: "2025-vm-autopeep",
  version: 1,
  title: "Ventilacao mecanica e auto-PEEP",
  domain: "Via aerea e ventilacao mecanica",
  durationSeconds: 300,
  source: { exam: "TEME", year: 2025 },
  phases: [{ id: "inicio", title: "Inicio", prompt: "Avalie o paciente." }],
  checklist: [
    {
      id: "diagnostico",
      label: "Reconhece auto-PEEP",
      weight: 2,
      verification: "verbal",
      critical: true
    },
    {
      id: "frequencia",
      label: "Reduz a frequencia respiratoria",
      weight: 1,
      verification: "verbal",
      critical: false
    },
    {
      id: "ajuste",
      label: "Demonstra o ajuste no ventilador",
      weight: 1,
      verification: "manual",
      critical: false
    }
  ]
};

test("valida uma estacao completa e rejeita pesos invalidos", () => {
  assert.deepEqual(validateStation(station), { valid: true, errors: [] });

  const invalid = structuredClone(station);
  invalid.checklist[0].weight = 0;
  const result = validateStation(invalid);

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /weight/i);
});

test("calcula nota deterministica e mantem gesto nao observavel pendente", () => {
  const result = calculatePracticeScore(station, [
    { itemId: "diagnostico", status: "cumprido", evidence: "Ha auto-PEEP." },
    { itemId: "frequencia", status: "parcial", evidence: "Vou ajustar a FR." },
    { itemId: "ajuste", status: "nao_verificavel", evidence: "Gesto nao visivel no audio." }
  ]);

  assert.equal(result.earnedPoints, 2.5);
  assert.equal(result.totalPoints, 4);
  assert.equal(result.assessedPoints, 3);
  assert.equal(result.pendingPoints, 1);
  assert.equal(result.provisionalPercent, 83);
  assert.equal(result.finalPercent, null);
  assert.deepEqual(result.pendingManualItemIds, ["ajuste"]);
});

test("confirmacao manual conclui a nota sem alterar classificacao da IA", () => {
  const evaluations = [
    { itemId: "diagnostico", status: "cumprido", evidence: "Ha auto-PEEP." },
    { itemId: "frequencia", status: "cumprido", evidence: "Reduzo a FR." },
    { itemId: "ajuste", status: "nao_verificavel", evidence: "Gesto nao visivel." }
  ];
  const merged = mergeManualChecks(evaluations, { ajuste: true });
  const result = calculatePracticeScore(station, merged);

  assert.equal(merged[2].status, "nao_verificavel");
  assert.equal(merged[2].manualConfirmed, true);
  assert.equal(result.earnedPoints, 4);
  assert.equal(result.finalPercent, 100);
  assert.deepEqual(result.pendingManualItemIds, []);
});

test("identifica erro critico somente em item critico ausente ou incorreto", () => {
  const result = calculatePracticeScore(station, [
    { itemId: "diagnostico", status: "incorreto", evidence: "Disse ser vazamento." },
    { itemId: "frequencia", status: "ausente", evidence: "Nao mencionou." },
    { itemId: "ajuste", status: "nao_verificavel", evidence: "Gesto nao visivel." }
  ]);

  assert.deepEqual(result.criticalFailures, ["diagnostico"]);
});

test("resume tentativas por dominio e aponta itens mais ausentes", () => {
  const summary = summarizePracticeAttempts([
    {
      stationId: station.id,
      stationTitle: station.title,
      domain: station.domain,
      finalPercent: 80,
      completedAt: "2026-08-09T10:00:00.000Z",
      evaluations: [{ itemId: "diagnostico", label: "Reconhece auto-PEEP", status: "ausente" }]
    },
    {
      stationId: station.id,
      stationTitle: station.title,
      domain: station.domain,
      finalPercent: 100,
      completedAt: "2026-08-09T11:00:00.000Z",
      evaluations: [{ itemId: "diagnostico", label: "Reconhece auto-PEEP", status: "cumprido" }]
    }
  ]);

  assert.equal(summary.totalAttempts, 2);
  assert.equal(summary.averagePercent, 90);
  assert.equal(summary.byDomain[0].averagePercent, 90);
  assert.deepEqual(summary.frequentGaps[0], {
    itemId: "diagnostico",
    label: "Reconhece auto-PEEP",
    count: 1
  });
});
