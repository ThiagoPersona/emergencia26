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

test("link ativo da sidebar sobrescreve a cor clara padrao do Docsify", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

  assert.match(html, /\.sidebar ul li\.active > a[\s\S]{0,180}color: var\(--link\) !important/);
});

test("carrega o motor de sessao antes do orquestrador do simulador", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const sessionScript = html.indexOf('<script src="praticas-session.js"></script>');
  const appScript = html.indexOf('<script src="praticas-app.js"></script>');

  assert.notEqual(sessionScript, -1);
  assert.notEqual(appScript, -1);
  assert.ok(sessionScript < appScript);
});
