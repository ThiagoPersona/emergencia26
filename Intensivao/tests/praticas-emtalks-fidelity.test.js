const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..", "praticas", "data", "estacoes");
const read = (id) => JSON.parse(fs.readFileSync(path.join(root, `${id}.json`), "utf8"));

const expected = {
  "sim-trauma-pediatrico-01": [9, [15, 7.5, 15, 5, 5, 15, 7.5, 15, 15]],
  "sim-obst-eclampsia-01": [12, [7.5, 5, 5, 2.5, 2.5, 2.5, 15, 10, 5, 15, 15, 15]],
  "sim-obst-pcr-materna-01": [14, [5, 5, 5, 5, 15, 2.5, 2.5, 2.5, 10, 10, 10, 10, 10, 7.5]],
  "emt-1-trauma-dupla-ameaca": [17, [10, 7.5, 15, 7.5, 2.5, 10, 15, 10, 2.5, 2.5, 2.5, 12, 0.8, 0.7, 0.5, 0.5, 0.5]],
  "emt-1-bronquiolite-iot": [19, [7, 3, 3, 3, 3, 8, 3, 8, 8, 4, 9, 6, 5.5, 5, 8, 6.5, 5, 3.75, 1.25]],
  "emt-1-avci-pos-trombolise": [23, [11, 12, 11, 2, 2, 2, 2, 2.5, 2.5, 10, 7, 3, 3, 4, 3, 5, 3, 4, 2, 1, 1, 4, 3]],
  "emt-1-hda-varicosa": [20, [2, 4, 7, 7, 10, 2, 2, 2, 2, 2, 2, 3, 6, 8, 7, 8, 8, 7, 6, 5]],
  "emt-1-gestao-fluxo": [9, [15, 5, 15, 10, 15, 10, 10, 10, 10]],
  "emt-2-tep-choque": [16, [8.75, 2.5, 2.5, 2.5, 8.75, 5, 5, 5, 5, 5, 5, 5, 5, 15, 10, 10]],
  "emt-2-tvp-compressao": [14, [5, 5, 10, 12, 12, 6, 6, 6, 6, 6, 6, 5, 10, 5]],
  "emt-2-via-aerea-suja": [15, [5, 5, 5, 5, 5, 5, 10, 10, 10, 10, 5, 5, 10, 5, 5]],
  "emt-3-queimadura-eletrica": [15, [10, 10, 5, 5, 5, 10, 10, 5, 5, 5, 5, 5, 5, 5, 10]],
  "emt-3-pocus-consolidacao": [13, [5, 5, 5, 5, 5, 5, 5, 10, 10, 10, 10, 10, 15]],
  "emt-3-sindrome-toracica-aguda": [12, [10, 10, 8, 12, 10, 10, 8, 2, 10, 4, 12, 4]],
  "emt-3-via-aerea-obesidade": [18, [4, 7, 6, 8, 10, 6, 6, 3, 5, 5, 5, 5, 6, 5, 6, 4, 2, 7]],
  "emt-4-ovace-lactente": [18, [5, 10, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7.5, 5, 7.5]],
  "emt-4-trauma-torax-penetrante": [19, [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 2.5, 10, 10, 5, 5, 5, 2.5]],
  "emt-4-pocus-pelve": [13, [7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 10, 10, 10, 5, 5, 10, 5]],
  "emt-4-neuro-febre-convulsao": [12, [5, 8, 10, 10, 10, 3.5, 7.5, 4, 16, 11, 10, 5]],
  "emt-4-cardio-iam-arritmias": [9, [10, 10, 10, 15, 10, 10, 5, 15, 15]]
};

test("checklists dos simulados 1-4 preservam granularidade, ordem e pontos do material local", () => {
  for (const [id, [count, weights]] of Object.entries(expected)) {
    const checklist = read(id).checklist;
    assert.equal(checklist.length, count, id);
    assert.deepEqual(checklist.map((item) => item.weight), weights, id);
  }
});

test("o caso de pelve não entrega a interpretação antes da pergunta", () => {
  const phase = read("emt-4-pocus-pelve").phases[1];
  assert.doesNotMatch(phase.patientState.summary, /diástase|separação do anel|livre inequívoco.*significa/i);
});

test("o gabarito da TVP interpreta a mesma veia do clipe apresentado", () => {
  const station = read("emt-2-tvp-compressao");
  assert.ok(station.phases.at(-1).media.includes("us-tvp-poplitea-compressao"));
  assert.match(station.referenceAnswer, /poplítea não compressível/i);
});
