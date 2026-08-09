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
