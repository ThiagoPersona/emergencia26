const assert = require("node:assert/strict");
const test = require("node:test");

const {
  filterStations,
  pickStation,
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

test("recomenda por lacunas ausentes ou incorretas, relacionando itemId a competencias e tags", () => {
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
    ["a", "b", "c"]
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
