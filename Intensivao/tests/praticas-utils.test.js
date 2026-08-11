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

const version2Station = {
  id: "visual-via-aerea-01",
  version: 2,
  title: "Abordagem visual da via aerea",
  domain: "Via aerea e ventilacao mecanica",
  examTitle: "Simulador pratico visual de emergencia",
  domains: ["Via aerea", "Ventilacao mecanica"],
  difficulty: "intermediaria",
  origin: "acervo_reescrito",
  tags: ["via-aerea", "simulacao"],
  durationSeconds: 300,
  phases: [
    {
      id: "avaliacao",
      title: "Avaliacao inicial",
      prompt: "Avalie o paciente e verbalize suas prioridades.",
      patientState: { age: 42, consciousness: "rebaixada" },
      media: ["paciente-inicial"]
    },
    {
      id: "conduta",
      title: "Conduta",
      prompt: "Demonstre a conduta imediata.",
      patientState: { oxygenSaturation: 86 },
      media: ["monitor-conduta"]
    }
  ],
  checklist: [
    { id: "seguranca", label: "Garante seguranca", weight: 25, verification: "verbal" },
    { id: "avaliacao", label: "Avalia a via aerea", weight: 25, verification: "verbal" },
    { id: "oxigenio", label: "Inicia oxigenio", weight: 25, verification: "manual" },
    { id: "reavaliacao", label: "Reavalia o paciente", weight: 25, verification: "hibrido" }
  ],
  references: ["Diretriz institucional de via aerea", "Manual de simulacao visual"]
};

test("valida uma estacao completa e rejeita pesos invalidos", () => {
  assert.deepEqual(validateStation(station), { valid: true, errors: [] });

  const invalid = structuredClone(station);
  invalid.checklist[0].weight = 0;
  const result = validateStation(invalid);

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /weight/i);
});

test("valida uma estacao completa no contrato visual versao 2", () => {
  assert.deepEqual(validateStation(version2Station, { requireVersion2: true }), {
    valid: true,
    errors: []
  });
});

test("rejeita dificuldade e origem fora dos valores permitidos na versao 2", () => {
  const invalid = structuredClone(version2Station);
  invalid.difficulty = "facil";
  invalid.origin = "talk";

  const result = validateStation(invalid, { requireVersion2: true });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /difficulty.*invalido/i);
  assert.match(result.errors.join(" "), /origin.*invalido/i);
});

test("rejeita fase sem prompt e patientState que nao seja objeto", () => {
  const invalid = structuredClone(version2Station);
  delete invalid.phases[0].prompt;
  invalid.phases[1].patientState = "instavel";

  const result = validateStation(invalid, { requireVersion2: true });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /phases\[0\]\.prompt obrigatorio/i);
  assert.match(result.errors.join(" "), /phases\[1\]\.patientState deve ser objeto/i);
});

test("rejeita media vazia e arrays estritos invalidos", () => {
  const invalid = structuredClone(version2Station);
  invalid.phases[0].media = [];
  invalid.domains = [];
  invalid.tags = ["  "];
  invalid.references = "referencia";

  const result = validateStation(invalid, { requireVersion2: true });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /media deve conter ids nao vazios/i);
  assert.match(result.errors.join(" "), /domains deve conter strings nao vazias/i);
  assert.match(result.errors.join(" "), /tags deve conter strings nao vazias/i);
  assert.match(result.errors.join(" "), /references deve conter strings nao vazias/i);
});

test("rejeita ids duplicados de fase e checklist na versao 2", () => {
  const invalid = structuredClone(version2Station);
  invalid.phases[1].id = invalid.phases[0].id;
  invalid.checklist[1].id = invalid.checklist[0].id;

  const result = validateStation(invalid, { requireVersion2: true });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /phases\[1\]\.id duplicado/i);
  assert.match(result.errors.join(" "), /checklist\[1\]\.id duplicado/i);
});

test("rejeita checklist cuja soma de pesos nao seja exatamente 100 na versao 2", () => {
  const invalid = structuredClone(version2Station);
  invalid.checklist[0].weight = 24;

  const result = validateStation(invalid, { requireVersion2: true });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /checklist deve totalizar exatamente 100 pontos/i);
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

test("item manual permanece pendente mesmo com status verbal cumprido", () => {
  const manualStation = structuredClone(station);
  manualStation.checklist = [
    {
      id: "gesto-manual",
      label: "Executa o gesto manual",
      weight: 4,
      verification: "manual",
      critical: false
    }
  ];

  const result = calculatePracticeScore(manualStation, [
    { itemId: "gesto-manual", status: "cumprido", evidence: "Gesto descrito na fala." }
  ]);

  assert.equal(result.earnedPoints, 0);
  assert.equal(result.assessedPoints, 0);
  assert.equal(result.pendingPoints, 4);
  assert.equal(result.finalPercent, null);
  assert.deepEqual(result.pendingManualItemIds, ["gesto-manual"]);
});

test("fala sem confirmacao nao pontua item hibrido", () => {
  const hybridStation = structuredClone(station);
  hybridStation.checklist = [
    {
      id: "gesto-hibrido",
      label: "Verbaliza e executa a conduta",
      weight: 4,
      verification: "hibrido",
      critical: false
    }
  ];

  const result = calculatePracticeScore(hybridStation, [
    { itemId: "gesto-hibrido", status: "cumprido", evidence: "Conduta verbalizada." }
  ]);

  assert.equal(result.earnedPoints, 0);
  assert.equal(result.assessedPoints, 0);
  assert.equal(result.pendingPoints, 4);
  assert.equal(result.finalPercent, null);
  assert.deepEqual(result.pendingManualItemIds, ["gesto-hibrido"]);
});

test("falha verbal critica de item hibrido aparece mesmo com gesto pendente", () => {
  const hybridStation = structuredClone(station);
  hybridStation.checklist = [
    {
      id: "hibrido-critico",
      label: "Verbaliza e executa a conduta crítica",
      weight: 4,
      verification: "hibrido",
      critical: true
    }
  ];

  const result = calculatePracticeScore(hybridStation, [
    { itemId: "hibrido-critico", status: "incorreto", evidence: "Conduta verbal incorreta." }
  ]);

  assert.equal(result.finalPercent, null);
  assert.deepEqual(result.pendingManualItemIds, ["hibrido-critico"]);
  assert.deepEqual(result.criticalFailures, ["hibrido-critico"]);
});

test("item hibrido confirmado pontua apenas com status verbal aceitavel", () => {
  const hybridStation = structuredClone(station);
  hybridStation.checklist = [
    { id: "completo", label: "Conduta completa", weight: 4, verification: "hibrido" },
    { id: "parcial", label: "Conduta parcial", weight: 2, verification: "hibrido" },
    { id: "sem-fala", label: "Conduta sem fala", weight: 4, verification: "hibrido" }
  ];

  const result = calculatePracticeScore(hybridStation, [
    { itemId: "completo", status: "cumprido", manualConfirmed: true },
    { itemId: "parcial", status: "parcial", manualConfirmed: true },
    { itemId: "sem-fala", status: "nao_verificavel", manualConfirmed: true }
  ]);

  assert.equal(result.earnedPoints, 5);
  assert.equal(result.assessedPoints, 10);
  assert.equal(result.pendingPoints, 0);
  assert.equal(result.finalPercent, 50);
  assert.deepEqual(result.pendingManualItemIds, []);
});

test("negacao explicita zera itens criticos manuais e hibridos e registra falhas", () => {
  const criticalStation = structuredClone(station);
  criticalStation.checklist = [
    { id: "manual", label: "Gesto manual critico", weight: 4, verification: "manual", critical: true },
    { id: "hibrido", label: "Gesto hibrido critico", weight: 6, verification: "hibrido", critical: true }
  ];

  const result = calculatePracticeScore(criticalStation, [
    { itemId: "manual", status: "cumprido", manualConfirmed: false },
    { itemId: "hibrido", status: "cumprido", manualConfirmed: false }
  ]);

  assert.equal(result.earnedPoints, 0);
  assert.equal(result.assessedPoints, 10);
  assert.equal(result.pendingPoints, 0);
  assert.equal(result.finalPercent, 0);
  assert.deepEqual(result.pendingManualItemIds, []);
  assert.deepEqual(result.criticalFailures, ["manual", "hibrido"]);
  assert.deepEqual(result.evaluations.map((evaluation) => evaluation.status), ["cumprido", "cumprido"]);
});

test("identifica erro critico verbal ausente ou incorreto", () => {
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
