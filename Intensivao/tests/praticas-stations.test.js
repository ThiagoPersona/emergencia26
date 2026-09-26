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
  ["sim-proc-bloqueio-fascia-iliaca-01", "Analgesia regional para dor de quadril"],
  ["emt-1-trauma-dupla-ameaca", "Trauma com duas ameaças imediatas"],
  ["emt-1-bronquiolite-iot", "Lactente com deterioração respiratória"],
  ["emt-1-avci-pos-trombolise", "Déficit focal e deterioração neurológica"],
  ["emt-1-hda-varicosa", "Hematêmese e deterioração circulatória"],
  ["emt-1-gestao-fluxo", "Departamento de emergência em sobrecarga"],
  ["emt-2-tep-choque", "Hipotensão e sobrecarga de ventrículo direito"],
  ["emt-2-tvp-compressao", "Edema unilateral e exame venoso"],
  ["emt-2-via-aerea-suja", "Paciente com hipoxemia e orofaringe contaminada"],
  ["emt-3-queimadura-eletrica", "Paciente após choque elétrico e queda"],
  ["emt-3-pocus-consolidacao", "Janela pulmonar em dispneia febril"],
  ["emt-3-sindrome-toracica-aguda", "Criança falciforme com febre e hipoxemia"],
  ["emt-3-via-aerea-obesidade", "Insuficiência respiratória em paciente com obesidade"],
  ["int-rn-reanimacao", "Recém-nascido sem respiração eficaz"],
  ["int-ped-ovace", "Criança com engasgo e piora"],
  ["int-aph-amonia-imv", "Vítimas em instalação industrial"],
  ["int-ped-sepse-choque", "Criança febril com má perfusão"],
  ["int-pocus-vti-choque", "Choque após reposição inicial"],
  ["emt-4-ovace-lactente", "Lactente com obstrução de via aérea"],
  ["emt-4-trauma-torax-penetrante", "Ferimento torácico com deterioração"],
  ["emt-4-pocus-pelve", "Trauma com avaliação ultrassonográfica e radiografia"],
  ["emt-4-neuro-febre-convulsao", "Convulsão prolongada com febre"],
  ["emt-4-cardio-iam-arritmias", "Dor torácica com evolução elétrica"],
  ["emt-5-sepse-choque", "Febre e hipoperfusão"],
  ["emt-5-trauma-coluna", "Queda de altura com déficit motor"],
  ["emt-5-pocus-valvulas", "Hipotensão e sopro cardíaco"],
  ["emt-5-obstrucao-intestinal", "Dor abdominal e distensão progressiva"],
  ["emt-5-metanol", "Alteração visual após bebida de origem incerta"]
];

const EXPECTED_FAMILY_DISTRIBUTION = {
  "Via aérea e ventilação mecânica": 7,
  "Trauma e APH": 9,
  "POCUS": 9,
  "Cardiovascular e PCR": 6,
  "Pediatria": 8,
  "Toxicologia e animais peçonhentos": 4,
  "Neurologia": 4,
  "Respiratório, sepse e metabólico": 4,
  "Obstetrícia": 2,
  "Procedimentos, analgesia e sedação": 1,
  "Gastroenterologia": 2,
  "Gestão": 1
};

const REQUIRED_TASK_8_MEDIA = {
  "sim-cardio-bavt-marcapasso-01": ["ecg-bavt-cc0"],
  "sim-cardio-torsades-pcr-01": ["ecg-torsades-pd"],
  "sim-cardio-pos-rce-01": ["capnografia-capnograma-base"],
  "sim-tox-triciclico-01": ["ecg-triciclico-qrs"],
  "sim-proc-bloqueio-fascia-iliaca-01": ["fascia-iliaca-probe-placement", "us-fascia-iliaca-anatomia"]
};

const TRAINING_SIMULADO_BY_ID = new Map([
  ["sim-trauma-pediatrico-01", 2],
  ["sim-obst-eclampsia-01", 2],
  ["sim-obst-pcr-materna-01", 3],
  ...EXPECTED_STATIONS.filter(([id]) => /^emt-[123]-/.test(id)).map(([id]) => [id, Number(id[4])]),
  ...EXPECTED_STATIONS.filter(([id]) => id.startsWith("emt-4-")).map(([id]) => [id, 4]),
  ...EXPECTED_STATIONS.filter(([id]) => id.startsWith("emt-5-")).map(([id]) => [id, 5])
]);

const SIMULADO_5_CHECKLIST = {
  "emt-5-sepse-choque": [
    ["Reconhece choque séptico (infecção + hipoperfusão: lactato 4, TEC, DU baixo ± hipotensão)", 13],
    ["Oxigênio para SatO2 >94% + 2 acessos calibrosos + PAM invasiva", 5],
    ["Hemoculturas antes do antibiótico", 6],
    ["Lactato seriado e exames laboratoriais iniciais", 4.5],
    ["Antibiótico EV de amplo espectro na 1ª hora", 13],
    ["Expansão volêmica inicial (cristaloide; considerar nora se refratário)", 11],
    ["Antitérmico", 2.5],
    ["Descreve a técnica corretamente", 14],
    ["Informa métrica utilizada", 6],
    ["Noradrenalina 0,05–0,3 µg/kg/min, titular para PAM ≥65 mmHg", 16],
    ["Hidrocortisona 200 mg/dia (refratariedade a vasopressor)", 4],
    ["Vasopressina 0,03 U/min se NE em dose alta/associar", 5]
  ],
  "emt-5-trauma-coluna": [
    ["Avalia sistematicamente o XABCDE", 8],
    ["Avalia estabilidade pélvica", 8],
    ["Indica eFAST", 4],
    ["RX de tórax e pelve no leito", 3.5],
    ["Cristaloides com volume restrito", 7.5],
    ["Considera ácido tranexâmico e hemocomponentes", 9],
    ["Considera vasopressor se hipotensão persistente", 4.5],
    ["Mantém colar cervical e posição supina", 5],
    ["Retira prancha longa com mobilização em bloco", 2.5],
    ["TC crânio +", 8],
    ["TC coluna cervical +", 8],
    ["TC coluna torácica +", 8],
    ["TC coluna lombar +", 8],
    ["TC tórax com contraste +", 8],
    ["TC abdome com contraste", 8]
  ],
  "emt-5-pocus-valvulas": [
    ["Reconhece que se trata de um choque indiferenciado (hipotensão + hipoperfusão).", 15],
    ["Choque séptico", 5],
    ["Choque cardiogênico (ex: ruptura de cordoalha mitral, endocardite infecciosa)", 5],
    ["Choque obstrutivo (TEP, tamponamento, mas menos provável pelo sopro)", 5],
    ["Visualização de válvula mitral 1", 5],
    ["Visualização de válvula mitral 2", 5],
    ["Visualização de válvula aórtica 1", 5],
    ["Visualização de válvula aórtica 2", 5],
    ["MOV: monitorização contínua, O2 suplementar, acesso venoso calibroso", 5],
    ["Reposição volêmica inicial", 5],
    ["Coleta 3 pares de hemoculturas ANTES DO antibiótico", 10],
    ["Inicia antibioticoterapia empírica EV de amplo espectro", 7.5],
    ["Cita o esquema antibiótico nominalmente (ex: ceftriaxona + oxacilina, ampicilina + gentamicina + oxacilina, ceftriaxona + gentamicina)", 7.5],
    ["Solicita ecocardiograma formal (transtorácico ou transesofágico)", 7.5],
    ["Aciona equipe de cardiologia/cirurgia cardíaca", 7.5]
  ],
  "emt-5-obstrucao-intestinal": [
    ["To-and-fro (conteúdo indo e voltando no lúmen)", 8],
    ["Sinal do ‘teclado de piano’ (pregas valvulares)", 8],
    ["Dilatação de alças > 3 cm", 8],
    ["Líquido livre perialças", 8],
    ["Peristaltismo reduzido (ou desorganizado em fases tardias)", 8],
    ["Hidratação venosa com cristaloides", 13],
    ["Sonda nasogástrica para descompressão gástrica", 15],
    ["Dieta zero", 4],
    ["Exames laboratoriais (hemograma, função renal, ± lactato)", 6],
    ["TC de abdome total com contraste IV", 13],
    ["Avaliação da cirurgia geral precoce", 9]
  ],
  "emt-5-metanol": [
    ["Solicita ECG 12 derivações", 8],
    ["Inicia hidratação visando diurese de 1–2 mL/kg/h", 8],
    ["Reconhece a hipótese de intoxicação por metanol: bebida de procedência duvidosa, período de latência, sintomas gastrointestinais e alteração visual", 14],
    ["Calcula o gap osmolar: 330 – 303 = 27 mOsm/kg", 8],
    ["Solicita dosagem sérica de metanol e etanol", 8],
    ["Interpreta acidose metabólica grave com ânion gap e gap osmolar elevados, compatível com diagnóstico presuntivo de intoxicação por metanol", 14],
    ["Inicia correção da acidose com bicarbonato de sódio IV", 9],
    ["Indica início imediato de antídoto (etanol ou fomepizol), sem aguardar a dosagem sérica de metanol", 7],
    ["Indica hemodiálise imediata, preferencialmente intermitente, diante de alteração visual, pH ≤ 7,15 e ânion gap > 24 mEq/L", 9],
    ["Indica ácido folínico (1 mg/kg IV a cada 4–6 h)", 5],
    ["Reconhece que lavagem gástrica e carvão ativado estão contraindicados", 6],
    ["Solicita acompanhamento laboratorial seriado (gasometria, ionograma, função renal e hepática a cada 12 h) e avaliação de fundo de olho", 4]
  ]
};

test("simulado 5 preserva cada item, ordem e pontuação do checklist do curso", () => {
  const byId = new Map(readIndex().map((entry) => [entry.id, readStation(entry)]));
  for (const [id, expected] of Object.entries(SIMULADO_5_CHECKLIST)) {
    const station = byId.get(id);
    assert.ok(station, `${id} não aparece no índice`);
    assert.deepEqual(station.checklist.map(({ label, weight }) => [label, weight]), expected, id);
    assert.equal(expected.reduce((sum, [, points]) => sum + points, 0), 100, id);
  }
  assert.ok(byId.get("emt-5-pocus-valvulas").phases.some((phase) => phase.media?.length));
  assert.ok(byId.get("emt-5-obstrucao-intestinal").phases[0].media?.length);
  const bowelChecklist = byId.get("emt-5-obstrucao-intestinal").checklist;
  assert.match(bowelChecklist.find((item) => item.id === "liquido").explanation, /aceitar.*procurar/i);
  assert.match(bowelChecklist.find((item) => item.id === "peristaltismo").explanation, /aceitar.*motilidade/i);
  assert.doesNotMatch(byId.get("emt-5-metanol").phases[0].patientState.summary, /metanol/i);
});

const HISTORICAL_CHECKLIST_SHA256 = {
  "2025-vm-autopeep": "a82acc2aa325e563651298ca50b4f4bba2194ac581a640ae132dcd89fee992e6",
  "2025-trauma-hemorragico": "4fe1a6106e9d9cb20d108aac3eb88f3ba4ebc59c32bbd92f9d3188c44be189ed",
  "2025-pocus-aaa-acesso": "cfafa216b2574859cab335a70115514916b12d26d94417b22974814b9e3cc7e6",
  "2025-pediatria-colinergico": "c7c3d0a66164ce4fa600c3eff67ceb93928b87ea0bd3d7484a59cf335ef5f870",
  "2025-tce-hic": "ea41882deb9939db10d4398e1ce5a8aef11f0bca25935392e56901261a3dbaf0"
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

test("indice v2 possui exatamente as 57 estacoes na ordem editorial", () => {
  const index = readIndex();
  const expectedIds = EXPECTED_STATIONS.map(([id]) => id);
  const expectedFiles = expectedIds.map((id) => `${id}.json`);
  const stationFiles = fs.readdirSync(stationDirectory)
    .filter((file) => file.endsWith(".json") && file !== "index.json");

  assert.equal(index.length, 57);
  assert.deepEqual(index.map((entry) => entry.id), expectedIds);
  assert.equal(new Set(index.map((entry) => entry.id)).size, expectedIds.length);
  assert.equal(stationFiles.length, 57);
  assert.deepEqual(new Set(stationFiles), new Set(expectedFiles));
});

test("indice permite montar o catalogo sem baixar os JSONs", () => {
  const index = readIndex();
  const expectedTitles = new Map(EXPECTED_STATIONS);

  index.forEach((entry, indexPosition) => {
    const prefix = `index[${indexPosition}]`;
    const expectedKeys = ["id", "file", "schemaVersion", "examTitle", "title", "domain", "domains", "family", "difficulty", "origin", "tags", "hasMedia"];
    if (TRAINING_SIMULADO_BY_ID.has(entry.id)) expectedKeys.push("trainingSimulado");
    if (entry.id.startsWith("2025-")) expectedKeys.push("year");
    assert.deepEqual(Object.keys(entry), expectedKeys, `${prefix} deve expor somente os metadados ricos esperados`);
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

test("marcador presencial corresponde ao simulado sem atribuir autoria da prova oficial", () => {
  const index = readIndex();
  assert.equal(TRAINING_SIMULADO_BY_ID.size, 25);
  index.forEach((entry) => {
    const expected = TRAINING_SIMULADO_BY_ID.get(entry.id);
    assert.equal(entry.trainingSimulado, expected, `${entry.id}: procedência incorreta`);
    if (expected) {
      const station = readStation(entry);
      if (entry.id.startsWith("sim-")) {
        assert.equal(station.trainingReference?.collection, "Treino presencial", `${entry.id}: relação não registrada`);
        assert.equal(station.trainingReference?.simulado, expected, `${entry.id}: número do simulado divergente`);
      } else {
        assert.equal(station.source?.collection, "EmTalks simulado", `${entry.id}: fonte não registrada`);
        assert.equal(station.source?.simulado, expected, `${entry.id}: número do simulado divergente`);
      }
      assert.notEqual(station.source?.exam, "TEME", `${entry.id}: atribuição oficial indevida`);
    }
  });
});

test("simulado 4 mantém progressão, perguntas práticas e imagens diagnósticas verificáveis", () => {
  const byId = new Map(readIndex().map((entry) => [entry.id, readStation(entry)]));
  const airway = byId.get("emt-4-ovace-lactente");
  assert.equal(airway.phases.length, 4);
  assert.match(airway.phases[0].prompt, /primeira|inicial/i);
  assert.match(airway.phases[1].prompt, /manequim/i);
  assert.match(airway.phases[2].patientState.summary, /inconsciente/i);
  assert.match(airway.phases[3].prompt, /tubo/i);

  const trauma = byId.get("emt-4-trauma-torax-penetrante");
  assert.equal(trauma.phases.length, 2);
  assert.equal(trauma.phases[0].prompt, "Qual o diagnóstico sindrômico e sua etiologia mais provável? Que intervenções você realizaria neste momento?");
  assert.equal(trauma.phases[1].prompt, "Descreva o passo a passo da reanimação deste paciente.");
  assert.match(trauma.phases.at(-1).patientState.summary, /sem pulso|parada/i);
  assert.ok(trauma.phases[0].media.includes("us-trauma-colecao-pleural"));
  assert.doesNotMatch(trauma.phases.map((phase) => `${phase.prompt} ${phase.patientState.summary}`).join(" "), /1\.600|toracotomia|hemopneumotórax|choque hemorrágico/i);
  assert.deepEqual(trauma.checklist.map(({ label, weight }) => [label, weight]), [
    ["Reconhece o choque hemorrágico", 5],
    ["Reconhece possível choque obstrutivo associado", 5],
    ["Verbaliza achados clínicos sugestivos de hemopneumotórax", 5],
    ["2 acessos venosos calibrosos ou acesso intraósseo imediato", 5],
    ["Ácido Tranexâmico 1g IV em 10 min + 1g IV em 8h", 5],
    ["Infusão restrita de cristaloides isotônicos (máx 1,5L)", 5],
    ["Ativa Protocolo de Transfusão Maciça (1:1:1)", 5],
    ["Previne/trata hipotermia (cobertores, fluidos aquecidos)", 5],
    ["Verbaliza necessidade de monitoramento e correção de acidose e hipocalcemia (laboratorial ou empírica)", 5],
    ["Considera IOT precoce para segurança, com tubo de maior calibre (7,5–8,0 mm)", 5],
    ["Verbaliza que a drenagem >1500 mL na inserção ou >200 mL/hora por 2-4 horas indica toracotomia exploradora", 5],
    ["Aciona a cirurgia imediatamente", 5],
    ["Inicia RCP", 2.5],
    ["Indica toracotomia de reanimação (trauma torácico penetrante com PCR presenciada)", 10],
    ["Descreve descompressão torácica bilateral", 10],
    ["Descreve toracotomia anterolateral esquerda ou bilateral", 5],
    ["Verbaliza realização de pericardiotomia + exploração cardíaca e massagem cardíaca interna", 5],
    ["Verbaliza clampeamento da aorta descendente", 5],
    ["Verbaliza controle de sangramento pulmonar/vascular torácico", 2.5]
  ]);

  const pocus = byId.get("emt-4-pocus-pelve");
  assert.match(pocus.phases[0].prompt, /e.?FAST/i);
  assert.ok(pocus.phases.at(-1).media.includes("rx-pelve-diastase"));

  const neuro = byId.get("emt-4-neuro-febre-convulsao");
  assert.match(neuro.phases.at(-1).patientState.summary, /líquor|LCR/i);
  assert.ok(neuro.checklist.some((item) => /aciclovir/i.test(item.label)));

  const cardio = byId.get("emt-4-cardio-iam-arritmias");
  assert.deepEqual(cardio.phases.map((phase) => phase.media?.[0]), ["ecg-iam-inferior-vd", "ecg-vt-cc0", "ecg-vf-cc0"]);
  assert.ok(cardio.checklist.some((item) => /cardioversão elétrica sincronizada/i.test(item.label)));
  assert.match(cardio.referenceAnswer, /evidência incerta|utilidade não estabelecida/i);
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
    assert.ok(station.phases.length >= 2 && station.phases.length <= 6, `${entry.file}: numero de fases invalido`);

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

    const hasMedia = station.phases.some((phase) =>
      (Array.isArray(phase.media) && phase.media.length > 0) || phase.waveform === "flow-time-trapped" || phase.waveform === "flow-time-recovered");
    assert.equal(entry.hasMedia, hasMedia, `${entry.file}: hasMedia divergente`);
  });
});

test("fases não prometem ECG disponível sem apresentar o traçado", () => {
  readIndex().forEach((entry) => {
    const station = readStation(entry);
    station.phases.forEach((phase) => {
      const summary = phase.patientState.summary;
      if (/\bECG\b.*\bdisponível\b/i.test(summary)) {
        assert.ok((phase.media || []).length > 0, `${entry.id}/${phase.id}: ECG anunciado sem imagem`);
      }
      if (/interprete (?:o )?(?:ECG|eletrocardiograma|traçado|ritmo)/i.test(phase.prompt)) {
        assert.ok((phase.media || []).length > 0, `${entry.id}/${phase.id}: interpretação elétrica sem traçado`);
      }
    });
  });
});

test("fases de interpretação não antecipam o achado no estado clínico", () => {
  const byId = new Map(readIndex().map((entry) => [entry.id, readStation(entry)]));
  const getPhase = (stationId, phaseId) => byId.get(stationId).phases.find((phase) => phase.id === phaseId);
  const noSpoiler = [
    ["emt-2-tvp-compressao", "tecnica", /não colaba|não compress/i],
    ["emt-2-tvp-compressao", "conduta", /não compress|confirma/i],
    ["emt-3-pocus-consolidacao", "clipe", /ecotextura semelhante|derrame adjacente/i],
    ["emt-3-pocus-consolidacao", "decisao", /favorece pneumonia|não define a etiologia/i],
    ["2025-tce-hic", "imagem-deterioracao", /coleção subdural|desvio da linha média/i],
    ["sim-pocus-efast-trauma-01", "limitacao", /sem líquido livre/i],
    ["2025-vm-autopeep", "curvas", /não alcança a linha de base/i],
    ["sim-resp-asma-intubado-01", "curvas", /não alcança a linha de base|PEEP intrínseca/i],
    ["sim-tox-triciclico-01", "achado-eletrico", /QRS de 156|alteração terminal/i],
    ["sim-cardio-pos-rce-01", "gasometria-hemodinamica", /hiperóxia|hipercapnia|hipotensão/i],
    ["emt-1-avci-pos-trombolise", "imagem", /confirma hemorragia/i]
  ];
  noSpoiler.forEach(([stationId, phaseId, pattern]) => {
    assert.doesNotMatch(getPhase(stationId, phaseId).patientState.summary, pattern, `${stationId}/${phaseId}`);
  });

  const dvt = byId.get("emt-2-tvp-compressao");
  assert.doesNotMatch(getPhase(dvt.id, "conduta").prompt, /paredes.*separadas|n.o compress/i);
  assert.ok(getPhase(dvt.id, "conduta").media.includes("us-tvp-poplitea-compressao"));

  for (const stationId of ["2025-vm-autopeep", "sim-resp-asma-intubado-01"]) {
    const station = byId.get(stationId);
    assert.equal(station.phases[stationId === "2025-vm-autopeep" ? 1 : 0].waveform, "flow-time-trapped");
    assert.equal(station.phases.some((phase) => (phase.media || []).includes("vm-autopeep-sinais-fig4")), false);
  }
  assert.equal(getPhase("sim-resp-asma-intubado-01", "apos-ajuste").waveform, "flow-time-recovered");
  assert.match(getPhase("sim-tox-triciclico-01", "achado-eletrico").patientState.vitals["QRS medido"], /156 ms/);
  assert.doesNotMatch(getPhase("emt-2-tep-choque", "achados").prompt, /TEP|McConnell|sobrecarga de VD/i);
  assert.doesNotMatch(getPhase("emt-1-avci-pos-trombolise", "imagem").prompt, /hematoma/i);
});

test("TC solicitada no AVC apos trombolise aparece na fase de interpretacao sem laudo antecipado", () => {
  const entry = readIndex().find((candidate) => candidate.id === "emt-1-avci-pos-trombolise");
  const station = readStation(entry);
  const phase = station.phases.find((candidate) => candidate.id === "imagem");
  const media = JSON.parse(fs.readFileSync(mediaManifestPath, "utf8"))
    .find((candidate) => phase.media?.includes(candidate.id));

  assert.equal(entry.hasMedia, true);
  assert.match(phase.prompt, /TC/);
  assert.doesNotMatch(phase.patientState.summary, /hiperdens|hemorrag|hematoma/i);
  assert.ok(media, "a fase precisa apresentar a TC para interpretacao");
  assert.ok(fs.existsSync(path.join(__dirname, "..", media.src)), "arquivo de TC ausente");
  assert.match(media.sourceUrl, /^https:\/\/commons\.wikimedia\.org\//);
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
  readIndex().filter((entry) => entry.origin === "inedita").forEach((entry) => {
    const station = readStation(entry);
    const serialized = JSON.stringify(station);

    assert.equal(station.origin, "inedita", `${entry.file}: origem inesperada`);
    assert.equal(station.durationSeconds, 300, `${entry.file}: duracao inesperada`);
    assert.notEqual(station.source && station.source.exam, "TEME", `${entry.file}: atribuicao TEME indevida`);
    assert.doesNotMatch(serialized, /\b(?:TEME|Talks?|Eagle)\b/i, `${entry.file}: cita nome de curso`);
  });
});

test("estacoes da Task 8 possuem conteudo progressivo e midias obrigatorias", () => {
  const task8Entries = readIndex().slice(15, 30);

  assert.equal(task8Entries.length, 15);
  task8Entries.forEach((entry) => {
    const station = readStation(entry);
    assert.equal(station.examTitle, new Map(EXPECTED_STATIONS).get(entry.id));
    assert.notEqual(station.examTitle, station.title, `${entry.id}: titulo de prova entrega diagnostico`);
    const minPhases = ["emt-4-trauma-torax-penetrante", "emt-5-trauma-coluna", "emt-5-obstrucao-intestinal"].includes(station.id) ? 2 : 3;
    assert.ok(station.phases.length >= minPhases && station.phases.length <= 6, `${entry.id}: progressao invalida`);
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
