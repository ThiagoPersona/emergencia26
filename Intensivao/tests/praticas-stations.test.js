const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { validateStation } = require("../praticas-utils.js");

const stationDirectory = path.join(__dirname, "..", "praticas", "data", "estacoes");

test("banco inicial possui as cinco estacoes oficiais de 2025 validas", () => {
  const index = JSON.parse(fs.readFileSync(path.join(stationDirectory, "index.json"), "utf8"));
  assert.equal(index.length, 5);

  index.forEach((entry) => {
    const station = JSON.parse(fs.readFileSync(path.join(stationDirectory, entry.file), "utf8"));
    const validation = validateStation(station);
    const totalPoints = station.checklist.reduce((sum, item) => sum + item.weight, 0);

    assert.equal(validation.valid, true, `${entry.file}: ${validation.errors.join("; ")}`);
    assert.equal(totalPoints, 100, `${entry.file} deve totalizar 100 pontos`);
    assert.equal(station.source.exam, "TEME");
    assert.equal(station.source.year, 2025);
    assert.ok(station.referenceAnswer.length > 100);
  });
});
