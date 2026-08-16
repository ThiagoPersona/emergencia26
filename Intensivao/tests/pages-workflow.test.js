const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("workflow publica scripts, estilos, dados das praticas e sidebar atual", () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, "..", "..", ".github", "workflows", "pages-intensivao.yml"),
    "utf8"
  );

  assert.match(workflow, /Intensivao\/\*\.js/);
  assert.match(workflow, /Intensivao\/\*\.css/);
  assert.match(workflow, /cp -R Intensivao\/praticas/);
  assert.match(workflow, /Intensivao\/_sidebar\.md/);
});

test("workflow publica o acervo local de midia pratica nas duas rotas do Pages", () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, "..", "..", ".github", "workflows", "pages-intensivao.yml"),
    "utf8"
  );

  assert.match(workflow, /cp -R Intensivao\/assets\/praticas\/\. site\/assets\/praticas\//);
  assert.match(workflow, /cp -R Intensivao\/assets\/praticas\/\. site\/Intensivao\/assets\/praticas\//);
});

test("link ativo da sidebar sobrescreve a cor clara padrao do Docsify", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

  assert.match(html, /\.sidebar ul li\.active > a[\s\S]{0,180}color: var\(--link\) !important/);
});

test("botao da sidebar rola para fora do topo no breakpoint mobile", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const mobileStart = html.indexOf("@media (max-width: 640px)");
  const mobileEnd = html.indexOf("@media print", mobileStart);
  const mobileCss = html.slice(mobileStart, mobileEnd);

  assert.match(mobileCss, /\.sidebar-toggle\s*\{[^}]*position:\s*absolute\s*!important;[^}]*top:\s*10px\s*!important;[^}]*left:\s*10px\s*!important;[^}]*width:\s*38px\s*!important;[^}]*height:\s*38px\s*!important;/);
  assert.match(mobileCss, /\.markdown-section\s*\{[^}]*padding-top:\s*62px\s*!important;/);
});

test("simulador monta antes de qualquer descricao visivel", () => {
  const simulator = fs.readFileSync(path.join(__dirname, "..", "praticas", "SIMULADOR.md"), "utf8");
  const heading = "# Simulador De Estações";
  const mount = '<div id="practice-simulator" class="practice-mount" aria-live="polite">';
  const notice = "> A correção automática é uma ferramenta de treino.";
  const mountIndex = simulator.indexOf(mount);

  assert.equal(simulator.indexOf(heading), 0);
  assert.equal(simulator.slice(heading.length, mountIndex).trim(), "");
  assert.equal(simulator.includes("## Modos"), false);
  assert.equal(simulator.includes("O simulador reúne"), false);
  assert.ok(mountIndex < simulator.indexOf(notice));
});

test("carrega os modulos do simulador na ordem de dependencia", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const scripts = [
    "praticas-utils.js",
    "praticas-catalog.js",
    "praticas-session.js",
    "praticas-media.js",
    "praticas-api.js",
    "praticas-app.js"
  ];
  const positions = scripts.map((script) => html.indexOf(`<script src="${script}"></script>`));

  positions.forEach((position) => assert.notEqual(position, -1));
  positions.slice(1).forEach((position, index) => assert.ok(positions[index] < position));
});

test("paginas praticas omitem blocos editoriais removidos", () => {
  const visual = fs.readFileSync(path.join(__dirname, "..", "praticas", "TREINO_VISUAL.md"), "utf8");
  const procedures = fs.readFileSync(path.join(__dirname, "..", "praticas", "PROCEDIMENTOS.md"), "utf8");

  assert.doesNotMatch(visual, /Como montar seu banco|O simulador aceita fases com mídia versionada/);
  assert.doesNotMatch(procedures, /Treino mínimo semanal|\| Procedimento \| Repetições \| Meta \|/);
});

test("sidebar posiciona o simulador imediatamente antes do desempenho", () => {
  const sidebar = fs.readFileSync(path.join(__dirname, "..", "_sidebar.md"), "utf8");
  const visual = "[Treino visual](praticas/TREINO_VISUAL.md)";
  const simulator = "[Simulador de estações](praticas/SIMULADOR.md)";
  const performance = "[Desempenho](praticas/DESEMPENHO.md)";

  assert.ok(sidebar.indexOf(visual) < sidebar.indexOf(simulator));
  assert.ok(sidebar.indexOf(simulator) < sidebar.indexOf(performance));
  assert.match(sidebar, /Simulador de estações[^\n]*\n\s*- \[Desempenho\]/);
});

test("publica tema e banco autonomos de gestao sem alterar o total de questoes", () => {
  const base = path.join(__dirname, "..");
  const themePath = path.join(base, "temas", "026_gestao-departamento-emergencia.md");
  const proofPath = path.join(base, "provas", "026_gestao-departamento-emergencia.md");
  const legacyProofPath = path.join(base, "provas", "017_paliativos-vulnerabilidades-etica-gestao.md");
  const reading = fs.readFileSync(path.join(base, "LEITURA_OFICIAL.md"), "utf8");
  const proofs = fs.readFileSync(path.join(base, "PROVAS.md"), "utf8");
  const sidebar = fs.readFileSync(path.join(base, "_sidebar.md"), "utf8");

  assert.equal(fs.existsSync(themePath), true);
  assert.equal(fs.existsSync(proofPath), true);
  assert.match(reading, /Gestão do Departamento de Emergência[^\n]*026_gestao-departamento-emergencia\.md/);
  assert.match(sidebar, /Gestão do Departamento de Emergência[^\n]*026_gestao-departamento-emergencia\.md/);
  assert.match(proofs, /Gestão do Departamento de Emergência \| 15 \| \[Resolver\]\(provas\/026_gestao-departamento-emergencia\.md\)/);
  assert.match(proofs, /Paliativos, vulnerabilidades, ética e legislação \| 14 \|/);
  assert.match(proofs, /Total atual da seção: \*\*632 questões em estilo TEME\*\*/);

  const managementProof = fs.readFileSync(proofPath, "utf8");
  const legacyProof = fs.readFileSync(legacyProofPath, "utf8");
  const managementSources = Array.from(
    managementProof.matchAll(/<p class="quiz-source">(TEME\d+ Q\d+)<\/p>/g),
    (match) => match[1]
  ).sort();
  const expectedSources = [
    "TEME22 Q30",
    "TEME23 Q54",
    "TEME23 Q96",
    "TEME24 Q46",
    "TEME24 Q75",
    "TEME24 Q87",
    "TEME25 Q87",
    "TEME26 Q7",
    "TEME26 Q12",
    "TEME26 Q24",
    "TEME26 Q29",
    "TEME26 Q48",
    "TEME26 Q56",
    "TEME26 Q62",
    "TEME26 Q96"
  ].sort();
  assert.equal((managementProof.match(/class="quiz-card"/g) || []).length, 15);
  assert.equal((legacyProof.match(/class="quiz-card"/g) || []).length, 14);
  assert.deepEqual(managementSources, expectedSources);
  expectedSources.forEach((source) => {
    assert.doesNotMatch(legacyProof, new RegExp(`<p class="quiz-source">${source}<\\/p>`));
  });
  assert.equal((managementProof.match(/<div class="quiz-feedback" hidden>/g) || []).length, 15);
  assert.doesNotMatch(managementProof, /quiz-source[^\n]*(?:gabarito|resposta correta)/i);
});

test("migra o progresso das questoes de gestao sem contaminar os dois temas", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const movedKeys = [
    "q-t017-001",
    "q-t017-005",
    "q-t017-006",
    "q-t017-007",
    "q-t017-008",
    "q-t017-009",
    "q-t017-012",
    "q-t017-015",
    "q-t017-018",
    "q-t017-021",
    "q-t017-022",
    "q-t017-024",
    "q-t017-025",
    "q-t017-026",
    "q-t017-028"
  ];

  assert.match(html, /const QUIZ_ROUTE_MIGRATIONS =/);
  assert.match(html, /from:\s*"provas\/017_paliativos-vulnerabilidades-etica-gestao"/);
  assert.match(html, /to:\s*"provas\/026_gestao-departamento-emergencia"/);
  movedKeys.forEach((key) => assert.match(html, new RegExp(`"${key}"`)));
  assert.match(html, /function migrateQuizProgress\(/);
  assert.match(html, /function sanitizeQuizProgressForRoute\(/);
  assert.ok(html.indexOf("migrateQuizProgress();") < html.indexOf("hydrateProofProgressTable();"));
});

test("tema de gestao ajusta capacidade paralela e hierarquia de barreiras", () => {
  const base = path.join(__dirname, "..");
  const theme = fs.readFileSync(path.join(base, "temas", "026_gestao-departamento-emergencia.md"), "utf8");
  const review = fs.readFileSync(path.join(base, "INTENSIVAO.md"), "utf8");

  assert.match(theme, /ciclo efetivo\s*=\s*tempo de ciclo\s*\/\s*número de recursos paralelos/i);
  assert.match(theme, /Barreiras fortes[\s\S]{0,500}Barreiras intermediárias[\s\S]{0,500}Barreiras fracas/i);
  assert.match(review, /capacidade agregada/i);
});
