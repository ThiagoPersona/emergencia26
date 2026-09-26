const assert = require("node:assert/strict");
const test = require("node:test");

const {
  filterStations,
  pickStation,
  getExamArea,
  getSimuladoNumbers,
  getPastExamYears,
  getExamPlanLabel,
  buildSimuladoExamPlan,
  summarizeSimuladoExamPlan,
  getRecommendedStations
} = require("../praticas-catalog.js");

const entries = [
  {
    id: "a",
    title: "Via aerea",
    domain: "Via aerea",
    domains: ["Via aerea", "Emergencia"],
    difficulty: "basica",
    tags: ["via-aerea", "oxigenio"],
    competencies: ["item-airway", "oxigenio"],
    hasMedia: true
  },
  {
    id: "b",
    title: "Cardio basico",
    domain: "Cardio",
    domains: ["Cardio"],
    difficulty: "avancada",
    tags: ["ecg"],
    competencies: ["ritmo"],
    hasMedia: false
  },
  {
    id: "c",
    title: "Cardio visual",
    domain: "Cardio",
    domains: ["Cardio"],
    difficulty: "intermediaria",
    tags: ["ecg", "pocus"],
    competencies: ["ritmo", "pocus"],
    hasMedia: true
  }
];

test("filtra por cada criterio e combina filtros preservando a ordem", () => {
  assert.deepEqual(filterStations(entries, {}, []).map((entry) => entry.id), ["a", "b", "c"]);
  assert.deepEqual(filterStations(entries, { domain: "Cardio" }, []).map((entry) => entry.id), ["b", "c"]);
  assert.deepEqual(filterStations(entries, { difficulty: "intermediaria" }, []).map((entry) => entry.id), ["c"]);
  assert.deepEqual(filterStations(entries, { tag: "pocus" }, []).map((entry) => entry.id), ["c"]);
  assert.deepEqual(filterStations(entries, { hasMedia: true }, []).map((entry) => entry.id), ["a", "c"]);
  assert.deepEqual(filterStations(entries, { hasMedia: false }, []).map((entry) => entry.id), ["b"]);
  assert.deepEqual(
    filterStations(entries, {
      domain: "Cardio",
      difficulty: "intermediaria",
      tag: "pocus",
      hasMedia: true,
      unattempted: true
    }, [{ stationId: "b" }]).map((entry) => entry.id),
    ["c"]
  );
});

test("ignora filtros domain, difficulty e tag vazios ou apenas com whitespace", () => {
  assert.deepEqual(
    filterStations(entries, { domain: "", difficulty: "   ", tag: "\t" }, []).map((entry) => entry.id),
    ["a", "b", "c"]
  );
  assert.deepEqual(
    filterStations(entries, { domain: "  ", difficulty: "", tag: "" }, []).map((entry) => entry.id),
    ["a", "b", "c"]
  );
});

test("aceita dominio em domains ou domain e retorna vazio para entrada invalida", () => {
  const legacy = { id: "legacy", title: "Legado", domain: "Clinica", difficulty: "basica", tags: [] };
  const modern = { id: "modern", title: "Moderna", domains: ["Clinica"], difficulty: "basica", tags: [] };

  assert.deepEqual(filterStations([legacy, modern], { domain: "Clinica" }, []).map((entry) => entry.id), ["legacy", "modern"]);
  assert.deepEqual(filterStations(null, {}, []), []);
  assert.deepEqual(filterStations("invalido", {}, []), []);
});

test("sorteia sem repetir dentro do ciclo e reinicia quando o pool esgota", () => {
  const first = pickStation(entries, [], () => 0);
  const second = pickStation(entries, first.cycleIds, () => 0);
  const last = pickStation(entries, second.cycleIds, () => 0.999999);
  const restarted = pickStation(entries, last.cycleIds, () => 0);

  assert.equal(first.station.id, "a");
  assert.equal(second.station.id, "b");
  assert.equal(last.station.id, "c");
  assert.deepEqual(restarted, { station: entries[0], cycleIds: ["a"] });
  assert.equal(new Set(last.cycleIds).size, 3);
});

test("normaliza sorteio fora do intervalo e lida com lista vazia", () => {
  assert.equal(pickStation(entries, [], () => -10).station.id, "a");
  assert.equal(pickStation(entries, [], () => 10).station.id, "c");
  assert.deepEqual(pickStation([], ["old"], () => 0), { station: null, cycleIds: [] });
  assert.deepEqual(pickStation(null, [], () => 0), { station: null, cycleIds: [] });
});

test("cada simulado selecionado usa exatamente seus cinco cenarios na ordem editorial", () => {
  const index = require("../praticas/data/estacoes/index.json");
  assert.deepEqual(getSimuladoNumbers(index), [1, 2, 3, 4, 5, 6]);
  for (const number of getSimuladoNumbers(index)) {
    const plan = buildSimuladoExamPlan(index, number);
    assert.equal(plan.simulado, number);
    assert.deepEqual(plan.stationIds, index.filter((entry) => entry.trainingSimulado === number).map((entry) => entry.id));
    assert.equal(plan.stationIds.length, 5);
    assert.deepEqual(plan.attemptIds, {});
    assert.equal(plan.currentIndex, 0);
  }
  assert.equal(buildSimuladoExamPlan(index, 7), null);
  assert.deepEqual(getSimuladoNumbers([{ id: "a", trainingSimulado: 1 }]), []);
});

test("provas anteriores selecionam cinco estacoes do proprio ano sem misturar simulados", () => {
  const index = require("../praticas/data/estacoes/index.json");
  assert.deepEqual(getPastExamYears(index), [2022, 2023, 2024, 2025]);
  for (const year of getPastExamYears(index)) {
    const plan = buildSimuladoExamPlan(index, year);
    assert.equal(plan.simulado, year);
    assert.equal(plan.stationIds.length, 5);
    assert.deepEqual(plan.stationIds, index.filter((entry) => entry.year === year).map((entry) => entry.id));
    assert.equal(getExamPlanLabel(year), `Prova TEME ${year}`);
  }
  assert.equal(getExamPlanLabel(6), "Simulado 6");
});

test("nota final do simulado usa apenas as cinco tentativas desta execucao", () => {
  const plan = { simulado: 6, stationIds: ["a", "b", "c", "d", "e"], attemptIds: { a: "a-2", b: "b-1", c: "c-1", d: "d-1", e: "e-1" } };
  const attempts = [
    { id: "a-1", stationId: "a", finalPercent: 100, earnedPoints: 100 },
    { id: "a-2", stationId: "a", finalPercent: 80, earnedPoints: 79.5 },
    { id: "b-1", stationId: "b", finalPercent: 60, earnedPoints: 60 },
    { id: "c-1", stationId: "c", finalPercent: 90, earnedPoints: 90 },
    { id: "d-1", stationId: "d", provisionalPercent: 40, earnedPoints: 40 },
    { id: "e-1", stationId: "e", finalPercent: 70, earnedPoints: 70 }
  ];
  const pending = summarizeSimuladoExamPlan(plan, attempts);
  assert.equal(pending.completedCount, 4);
  assert.equal(pending.finalPercent, null);
  attempts[4].finalPercent = 40;
  const complete = summarizeSimuladoExamPlan(plan, attempts);
  assert.equal(complete.completedCount, 5);
  assert.equal(complete.finalPercent, 68);
  assert.equal(complete.earnedPoints, 339.5);
  assert.deepEqual(complete.scores, [80, 60, 90, 40, 70]);
});

test("rótulo da seara não entrega o diagnóstico", () => {
  assert.deepEqual(getExamArea({ family: "Trauma e APH", title: "Pneumotórax hipertensivo" }), { key: "trauma", label: "Trauma" });
  assert.deepEqual(getExamArea({ family: "Neurologia", title: "AVC hemorrágico" }), { key: "clinical", label: "Clínico" });
  assert.deepEqual(getExamArea({ family: "Gestão" }), { key: "clinical", label: "Gestão" });
  assert.deepEqual(getExamArea({ family: "Obstetrícia" }), { key: "clinical", label: "Obstetrícia" });
  assert.deepEqual(getExamArea({ family: "Procedimentos, analgesia e sedação" }), { key: "clinical", label: "Procedimentos" });
});

test("prioriza estacoes com lacunas e depois relaciona itemId a competencias e tags", () => {
  const recommendationEntries = [
    { id: "a", title: "Alfa via aerea", competencies: ["item-airway"], tags: [] },
    { id: "b", title: "Beta via aerea", competencies: [], tags: ["via-aerea"] },
    { id: "c", title: "Cardio", competencies: ["ecg"], tags: ["ecg"] },
    { id: "d", title: "Dermato", competencies: ["pele"], tags: ["pele"] }
  ];
  const attempts = [
    {
      stationId: "a",
      completedAt: "2026-08-08T10:00:00.000Z",
      evaluations: [
        { itemId: "item-airway", status: "ausente" },
        { itemId: "item-airway", status: "incorreto" },
        { itemId: "ecg", status: "cumprido" }
      ]
    },
    {
      stationId: "d",
      completedAt: "2026-08-10T10:00:00.000Z",
      evaluations: [{ itemId: "via-aerea", status: "ausente" }]
    }
  ];

  assert.deepEqual(
    getRecommendedStations(recommendationEntries, attempts, 3).map((entry) => entry.id),
    ["a", "d", "b"]
  );
});

test("revisao de declara-cico prioriza CICO e depois estacoes clinicamente relacionadas", () => {
  const bankLikeEntries = [
    {
      id: "sim-resp-asma-intubado-01",
      title: "Asma intubada com hiperinsuflação dinâmica",
      competencies: [],
      tags: ["asma ameaçadora à vida", "auto-PEEP", "curvas ventilatórias"]
    },
    {
      id: "sim-va-cico-crico-01",
      title: "CICO e cricotireoidostomia de emergência",
      competencies: [],
      tags: [
        "via aérea difícil",
        "CICO",
        "cricotireoidostomia",
        "bisturi-bougie-tubo",
        "capnografia"
      ]
    },
    {
      id: "sim-va-rsi-choque-01",
      title: "Intubação em sequência rápida no choque",
      competencies: [],
      tags: ["RSI", "pré-oxigenação", "bougie", "CAPNOGRAFIA", "plano de resgate"]
    },
    {
      id: "sim-trauma-pediatrico-01",
      title: "Trauma pediátrico com choque hemorrágico",
      competencies: [],
      tags: ["XABCDE pediátrico", "choque hemorrágico", "eFAST"]
    }
  ];
  const attempts = [{
    stationId: "sim-va-cico-crico-01",
    completedAt: "2026-08-10T10:00:00.000Z",
    evaluations: [
      { itemId: "declara-cico", status: "incorreto" },
      { itemId: "confirma-capnografia", status: "cumprido" }
    ]
  }];

  assert.deepEqual(
    getRecommendedStations(bankLikeEntries, attempts, 3).map((entry) => entry.id),
    ["sim-va-cico-crico-01", "sim-va-rsi-choque-01", "sim-resp-asma-intubado-01"]
  );
  assert.deepEqual(
    getRecommendedStations(bankLikeEntries, [], 3).map((entry) => entry.id),
    ["sim-resp-asma-intubado-01", "sim-va-cico-crico-01", "sim-va-rsi-choque-01"]
  );
});

test("fallback recomenda menos realizadas, desempata por titulo e aplica limite minimo", () => {
  const fallbackEntries = [
    { id: "a", title: "Zeta", competencies: [], tags: [] },
    { id: "b", title: "Alfa", competencies: [], tags: [] },
    { id: "c", title: "Beta", competencies: [], tags: [] }
  ];
  const attempts = [
    { stationId: "a", completedAt: "2026-08-08T10:00:00.000Z", evaluations: [] },
    { stationId: "a", completedAt: "2026-08-09T10:00:00.000Z", evaluations: [] },
    { stationId: "b", completedAt: "2026-08-10T10:00:00.000Z", evaluations: [] }
  ];

  assert.deepEqual(getRecommendedStations(fallbackEntries, attempts, 0).map((entry) => entry.id), ["c"]);
  assert.deepEqual(getRecommendedStations(fallbackEntries, [], 3).map((entry) => entry.id), ["b", "c", "a"]);
});
