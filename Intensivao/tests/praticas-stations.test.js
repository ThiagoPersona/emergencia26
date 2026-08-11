const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { validateStation } = require("../praticas-utils.js");

const stationDirectory = path.join(__dirname, "..", "praticas", "data", "estacoes");
const mediaManifestPath = path.join(__dirname, "..", "assets", "praticas", "media.json");

const EXPECTED_STATIONS = [
  ["2025-vm-autopeep", "Deterioração em ventilação invasiva"],
  ["2025-trauma-hemorragico", "Trauma com sangramento externo importante"],
  ["2025-pocus-aaa-acesso", "POCUS no choque e acesso vascular guiado"],
  ["2025-pediatria-colinergico", "Criança com secreções e rebaixamento"],
  ["2025-tce-hic", "Deterioração neurológica após trauma"],
  ["sim-va-rsi-choque-01", "Via aérea avançada em instabilidade circulatória"],
  ["sim-va-cico-crico-01", "Falha de oxigenação após tentativas de via aérea"],
  ["sim-vm-sdra-dissincronia-01", "Hipoxemia persistente em ventilação invasiva"],
  ["sim-trauma-pediatrico-01", "Criança politraumatizada com choque"],
  ["sim-trauma-torax-instavel-01", "Trauma torácico com comprometimento ventilatório"],
  ["sim-aph-trauma-penetrante-01", "Atendimento pré-hospitalar de trauma penetrante"],
  ["sim-pocus-blue-dispneia-01", "Dispneia aguda com ultrassom pulmonar"],
  ["sim-pocus-efast-trauma-01", "POCUS no trauma com instabilidade"],
  ["sim-pocus-rush-choque-01", "Choque indiferenciado com POCUS dirigido"],
  ["sim-cardio-iam-inferior-vd-01", "Dor torácica com instabilidade hemodinâmica"],
  ["sim-cardio-bavt-marcapasso-01", "Deterioração com frequência muito baixa"],
  ["sim-cardio-torsades-pcr-01", "Colapso após alteração do ritmo"],
  ["sim-cardio-pos-rce-01", "Cuidados após retorno da circulação"],
  ["sim-ped-asma-grave-01", "Criança com esforço respiratório crescente"],
  ["sim-ped-bronquiolite-bradicardia-01", "Lactente com pausas respiratórias"],
  ["sim-tox-triciclico-01", "Rebaixamento após ingestão medicamentosa"],
  ["sim-tox-metanol-01", "Acidose após exposição a solvente"],
  ["sim-animais-escorpiao-choque-01", "Criança com piora após picada"],
  ["sim-neuro-avc-oclusao-01", "Déficit focal de início recente"],
  ["sim-resp-asma-intubado-01", "Instabilidade no ventilador após intubação"],
  ["sim-sepse-choque-refratario-01", "Hipoperfusão persistente apesar de tratamento inicial"],
  ["sim-metabolico-cetoacidose-01", "Descompensação metabólica com potássio baixo"],
  ["sim-obst-eclampsia-01", "Convulsão e hipertensão no fim da gestação"],
  ["sim-obst-pcr-materna-01", "Colapso materno em atendimento"],
  ["sim-proc-bloqueio-fascia-iliaca-01", "Analgesia regional para dor de quadril"]
];

const EXPECTED_FAMILY_DISTRIBUTION = {
  "Via aérea e ventilação mecânica": 4,
  "Trauma e APH": 4,
  "POCUS": 4,
  "Cardiovascular e PCR": 4,
  "Pediatria": 3,
  "Toxicologia e animais peçonhentos": 3,
  "Neurologia": 2,
  "Respiratório, sepse e metabólico": 3,
  "Obstetrícia": 2,
  "Procedimentos, analgesia e sedação": 1
};

const REQUIRED_TASK_8_MEDIA = {
  "sim-cardio-bavt-marcapasso-01": ["ecg-bavt-cc0"],
  "sim-cardio-torsades-pcr-01": ["ecg-torsades-pd"],
  "sim-cardio-pos-rce-01": ["capnografia-capnograma-base"],
  "sim-tox-triciclico-01": ["ecg-triciclico-qrs"],
  "sim-resp-asma-intubado-01": ["vm-autopeep-sinais-fig4"],
  "sim-proc-bloqueio-fascia-iliaca-01": ["fascia-iliaca-probe-placement", "us-fascia-iliaca-anatomia"]
};

const HISTORICAL_CHECKLIST_SHA256 = {
  "2025-vm-autopeep": "a82acc2aa325e563651298ca50b4f4bba2194ac581a640ae132dcd89fee992e6",
  "2025-trauma-hemorragico": "4fe1a6106e9d9cb20d108aac3eb88f3ba4ebc59c32bbd92f9d3188c44be189ed",
  "2025-pocus-aaa-acesso": "cfafa216b2574859cab335a70115514916b12d26d94417b22974814b9e3cc7e6",
  "2025-pediatria-colinergico": "a40bf46c30b8a7facff0a1da4d9520c45ad8cb16694b937481d2f3f7bfda03d5",
  "2025-tce-hic": "1398bcda6d4bc8b20d3c41d0b4d3cd0355d2784ae109f06b18e62421879bab3c"
};

function readIndex() {
  return JSON.parse(fs.readFileSync(path.join(stationDirectory, "index.json"), "utf8"));
}

function readStation(entry) {
  return JSON.parse(fs.readFileSync(path.join(stationDirectory, entry.file), "utf8"));
}

function checklistHash(checklist) {
  return crypto.createHash("sha256").update(JSON.stringify(checklist)).digest("hex");
}

test("indice v2 possui exatamente as 30 estacoes na ordem editorial", () => {
  const index = readIndex();
  const expectedIds = EXPECTED_STATIONS.map(([id]) => id);
  const expectedFiles = expectedIds.map((id) => `${id}.json`);
  const stationFiles = fs.readdirSync(stationDirectory)
    .filter((file) => file.endsWith(".json") && file !== "index.json");

  assert.equal(index.length, 30);
  assert.deepEqual(index.map((entry) => entry.id), expectedIds);
  assert.equal(new Set(index.map((entry) => entry.id)).size, expectedIds.length);
  assert.equal(stationFiles.length, 30);
  assert.deepEqual(new Set(stationFiles), new Set(expectedFiles));
});

test("indice permite montar o catalogo sem baixar os JSONs", () => {
  const index = readIndex();
  const expectedTitles = new Map(EXPECTED_STATIONS);

  index.forEach((entry, indexPosition) => {
    const prefix = `index[${indexPosition}]`;
    assert.deepEqual(
      Object.keys(entry),
      entry.id.startsWith("2025-")
        ? ["id", "file", "schemaVersion", "examTitle", "title", "domain", "domains", "family", "difficulty", "origin", "tags", "hasMedia", "year"]
        : ["id", "file", "schemaVersion", "examTitle", "title", "domain", "domains", "family", "difficulty", "origin", "tags", "hasMedia"],
      `${prefix} deve expor somente os metadados ricos esperados`
    );
    assert.equal(entry.schemaVersion, 2, `${prefix}.schemaVersion`);
    assert.equal(entry.examTitle, expectedTitles.get(entry.id), `${prefix}.examTitle`);
    assert.match(entry.title, /\S/, `${prefix}.title`);
    assert.notEqual(entry.examTitle, entry.title, `${prefix}.examTitle deve ser neutro`);
    assert.match(entry.domain, /\S/, `${prefix}.domain`);
    assert.ok(Array.isArray(entry.domains) && entry.domains.length > 0, `${prefix}.domains`);
    assert.match(entry.family, /\S/, `${prefix}.family`);
    assert.match(entry.difficulty, /^(basica|intermediaria|avancada)$/, `${prefix}.difficulty`);
    assert.match(entry.origin, /^(historica|acervo_reescrito|inedita)$/, `${prefix}.origin`);
    assert.ok(Array.isArray(entry.tags) && entry.tags.length > 0, `${prefix}.tags`);
    assert.equal(typeof entry.hasMedia, "boolean", `${prefix}.hasMedia`);
    assert.equal(fs.existsSync(path.join(stationDirectory, entry.file)), true, `${entry.file} ausente`);
    if (entry.id.startsWith("2025-")) assert.equal(entry.year, 2025, `${prefix}.year`);
    else assert.equal(Object.hasOwn(entry, "year"), false, `${prefix} inedito nao deve ter year`);
  });
});

test("todas as estacoes atendem ao contrato visual v2 e totalizam 100 pontos", () => {
  readIndex().forEach((entry) => {
    const station = readStation(entry);
    const validation = validateStation(station, { requireVersion2: true });
    const totalPoints = station.checklist.reduce((sum, item) => sum + item.weight, 0);

    assert.equal(validation.valid, true, `${entry.file}: ${validation.errors.join("; ")}`);
    assert.equal(station.id, entry.id, `${entry.file}: id divergente do indice`);
    assert.equal(totalPoints, 100, `${entry.file} deve totalizar 100 pontos`);
    assert.ok(Array.isArray(station.criticalErrors) && station.criticalErrors.length > 0, `${entry.file}: criticalErrors vazio`);
    assert.ok(station.checklist.some((item) => item.critical === true), `${entry.file}: sem item critico`);
    assert.ok(station.referenceAnswer.length > 100, `${entry.file}: referenceAnswer insuficiente`);
  });
});

test("checklists historicos preservam hashes e estruturas anteriores a Task 7", () => {
  const index = readIndex();

  Object.entries(HISTORICAL_CHECKLIST_SHA256).forEach(([id, expectedHash]) => {
    const station = readStation(index.find((entry) => entry.id === id));
    const expectedKeys = id === "2025-vm-autopeep"
      ? ["id", "label", "weight", "verification", "critical", "expected"]
      : ["id", "label", "weight", "verification", "critical"];

    assert.equal(station.source.exam, "TEME", `${id}: prova historica alterada`);
    assert.equal(station.source.year, 2025, `${id}: ano historico alterado`);
    assert.equal(checklistHash(station.checklist), expectedHash, `${id}: checklist historico alterado`);
    station.checklist.forEach((item) => {
      assert.deepEqual(Object.keys(item), expectedKeys, `${id}/${item.id}: estrutura alterada`);
    });
  });
});

test("fases revelam estado e midia progressivamente usando apenas o manifesto", () => {
  const manifestIds = new Set(JSON.parse(fs.readFileSync(mediaManifestPath, "utf8")).map((item) => item.id));

  readIndex().forEach((entry) => {
    const station = readStation(entry);
    assert.ok(station.phases.length >= 3 && station.phases.length <= 6, `${entry.file}: use de 3 a 6 fases`);

    station.phases.forEach((phase, phaseIndex) => {
      const prefix = `${entry.file}/phases[${phaseIndex}]`;
      assert.match(phase.prompt, /\S/, `${prefix}.prompt vazio`);
      assert.equal(typeof phase.patientState, "object", `${prefix}.patientState ausente`);
      assert.match(phase.patientState.summary, /\S/, `${prefix}.patientState.summary vazio`);
      if (Object.hasOwn(phase.patientState, "vitals")) {
        assert.equal(typeof phase.patientState.vitals, "object", `${prefix}.patientState.vitals invalido`);
        assert.ok(Object.keys(phase.patientState.vitals).length > 0, `${prefix}.patientState.vitals vazio`);
      }
      (phase.media || []).forEach((mediaId) => {
        assert.equal(manifestIds.has(mediaId), true, `${prefix}: midia inexistente ${mediaId}`);
      });
    });

    const hasMedia = station.phases.some((phase) => Array.isArray(phase.media) && phase.media.length > 0);
    assert.equal(entry.hasMedia, hasMedia, `${entry.file}: hasMedia divergente`);
  });
});

test("estacao historica de AAA usa midia que demonstra trombo mural, nao flap", () => {
  const entry = readIndex().find((item) => item.id === "2025-pocus-aaa-acesso");
  const station = readStation(entry);
  const aortaPhase = station.phases.find((phase) => phase.id === "aorta");
  const manifest = JSON.parse(fs.readFileSync(mediaManifestPath, "utf8"));
  const media = manifest.find((item) => aortaPhase.media.includes(item.id));
  const reviewDescription = `${media.reviewAlt} ${media.reviewCaption}`;

  assert.equal(aortaPhase.prompt, "Identifique a janela, o vaso e a medida relevante na imagem apresentada.");
  assert.match(reviewDescription, /trombo mural/i);
  assert.doesNotMatch(reviewDescription, /flap/i);
});

test("estacoes ineditas nao citam cursos nem recebem atribuicao historica", () => {
  readIndex().slice(5).forEach((entry) => {
    const station = readStation(entry);
    const serialized = JSON.stringify(station);

    assert.equal(station.origin, "inedita", `${entry.file}: origem inesperada`);
    assert.equal(station.durationSeconds, 300, `${entry.file}: duracao inesperada`);
    assert.notEqual(station.source && station.source.exam, "TEME", `${entry.file}: atribuicao TEME indevida`);
    assert.doesNotMatch(serialized, /\b(?:TEME|Talks?|Eagle)\b/i, `${entry.file}: cita nome de curso`);
  });
});

test("estacoes da Task 8 possuem conteudo progressivo e midias obrigatorias", () => {
  const task8Entries = readIndex().slice(15);

  assert.equal(task8Entries.length, 15);
  task8Entries.forEach((entry) => {
    const station = readStation(entry);
    assert.equal(station.examTitle, new Map(EXPECTED_STATIONS).get(entry.id));
    assert.notEqual(station.examTitle, station.title, `${entry.id}: titulo de prova entrega diagnostico`);
    assert.ok(station.phases.length >= 3 && station.phases.length <= 6, `${entry.id}: progressao invalida`);
    assert.ok(station.referenceAnswer.length > 200, `${entry.id}: resposta oral incompleta`);
    assert.ok(station.references.length >= 2, `${entry.id}: referencias insuficientes`);
  });

  Object.entries(REQUIRED_TASK_8_MEDIA).forEach(([id, requiredMediaIds]) => {
    const station = readStation(task8Entries.find((entry) => entry.id === id));
    const usedMediaIds = new Set(station.phases.flatMap((phase) => phase.media || []));

    requiredMediaIds.forEach((mediaId) => {
      assert.equal(usedMediaIds.has(mediaId), true, `${id}: midia obrigatoria ausente ${mediaId}`);
    });
  });

  const methanol = readStation(task8Entries.find((entry) => entry.id === "sim-tox-metanol-01"));
  assert.match(methanol.referenceAnswer, /metanol abaixo de 20 mg\/dL/i);
  assert.match(methanol.referenceAnswer, /pH normal e sem sintomas/i);
});

test("fase final do metanol pede tendencia laboratorial e criterios de suspensao", () => {
  const entry = readIndex().find((item) => item.id === "sim-tox-metanol-01");
  const station = readStation(entry);
  const phase = station.phases.find((item) => item.id === "durante-depuracao");

  assert.equal(
    phase.prompt,
    "Ajuste antídoto e cofator durante a hemodiálise, descreva a tendência laboratorial esperada e defina os critérios para suspender a terapia extracorpórea e o antídoto."
  );
});

test("referencias e familias clinicas seguem a distribuicao final sem sobreposicao", () => {
  const index = readIndex();
  const stations = index.map(readStation);
  const familyCounts = Object.fromEntries(
    Object.keys(EXPECTED_FAMILY_DISTRIBUTION).map((family) => [family, 0])
  );

  stations.forEach((station) => {
    assert.ok(Array.isArray(station.references) && station.references.length > 0, `${station.id}: references vazio`);
    station.references.forEach((reference) => assert.match(reference, /^https:\/\//, `${station.id}: referencia nao HTTPS`));
  });

  index.forEach((entry, indexPosition) => {
    assert.equal(typeof entry.family, "string", `index[${indexPosition}].family ausente`);
    assert.equal(Object.hasOwn(familyCounts, entry.family), true, `${entry.id}: familia desconhecida`);
    familyCounts[entry.family] += 1;
  });

  assert.deepEqual(familyCounts, EXPECTED_FAMILY_DISTRIBUTION);
});
