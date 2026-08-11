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
