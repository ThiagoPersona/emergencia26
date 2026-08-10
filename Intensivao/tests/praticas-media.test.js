const assert = require("node:assert/strict");
const test = require("node:test");

const {
  validateMediaManifest,
  collectStationMedia,
  preloadStationMedia
} = require("../praticas-media.js");

function image(id) {
  return {
    id,
    type: "image",
    src: `assets/praticas/${id}.png`,
    thumbnail: `assets/praticas/${id}-thumb.png`,
    examAlt: `Imagem de ${id} para a prova`,
    reviewAlt: `Imagem de ${id} para revisao`,
    reviewCaption: `Legenda de revisao para ${id}`,
    credit: "Acervo local",
    sourceUrl: "https://example.org/source",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    modified: "2026-08-10"
  };
}

function video(id) {
  return {
    ...image(id),
    type: "video",
    src: `assets/praticas/${id}.mp4`,
    thumbnail: `assets/praticas/${id}-thumb.jpg`,
    poster: `assets/praticas/${id}-poster.jpg`
  };
}

test("aceita manifesto vazio e manifesto valido nos dois formatos", () => {
  assert.deepEqual(validateMediaManifest([]), { valid: true, errors: [], media: [] });

  const item = image("via-aerea");
  const result = validateMediaManifest({ media: [item] });

  assert.deepEqual(result, { valid: true, errors: [], media: [item] });
});

test("rejeita tipo desconhecido e campos obrigatorios ausentes", () => {
  const invalid = image("invalido");
  invalid.type = "audio";
  invalid.credit = "";
  delete invalid.reviewCaption;

  const result = validateMediaManifest([invalid]);

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /type invalido/i);
  assert.match(result.errors.join(" "), /credit obrigatorio/i);
  assert.match(result.errors.join(" "), /reviewCaption obrigatorio/i);
});

test("rejeita caminhos de midia remotos e exige https para fontes", () => {
  const invalid = video("remoto");
  invalid.src = "https://example.org/video.mp4";
  invalid.thumbnail = "//cdn.example.org/thumb.jpg";
  invalid.poster = "data:image/png;base64,abc";
  invalid.sourceUrl = "http://example.org/source";
  invalid.licenseUrl = "http://example.org/license";

  const result = validateMediaManifest([invalid]);

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /src deve ser caminho local/i);
  assert.match(result.errors.join(" "), /thumbnail deve ser caminho local/i);
  assert.match(result.errors.join(" "), /poster deve ser caminho local/i);
  assert.match(result.errors.join(" "), /sourceUrl deve usar https/i);
  assert.match(result.errors.join(" "), /licenseUrl deve usar https/i);
});

test("rejeita ids duplicados e exige alternativas diferentes", () => {
  const first = image("duplicado");
  const second = image("duplicado");
  second.reviewAlt = second.examAlt;

  const result = validateMediaManifest([first, second]);

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /id duplicado/i);
  assert.match(result.errors.join(" "), /reviewAlt deve ser diferente de examAlt/i);
});

test("rejeita comparacao sem dois ids distintos", () => {
  const comparison = {
    ...image("comparacao"),
    type: "comparison",
    items: ["esquerda", "esquerda"]
  };
  delete comparison.src;
  delete comparison.thumbnail;

  const result = validateMediaManifest([comparison]);

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /items deve conter dois ids distintos/i);
});

test("coleta midias por fase, inclui dependencias e preserva a primeira ordem", () => {
  const left = image("esquerda");
  const right = video("direita");
  const comparison = {
    ...image("comparacao"),
    type: "comparison",
    items: ["esquerda", "direita"]
  };
  delete comparison.src;
  delete comparison.thumbnail;
  const station = {
    phases: [
      { media: ["comparacao", "esquerda", "nao-existe"] },
      { media: ["direita", "comparacao"] }
    ]
  };

  const result = collectStationMedia(station, [left, right, comparison]);

  assert.deepEqual(result.media.map((item) => item.id), ["comparacao", "esquerda", "direita"]);
  assert.deepEqual(result.missingIds, ["nao-existe"]);
});

test("relata ids ausentes de dependencias de comparacao sem duplicar resultados", () => {
  const only = image("disponivel");
  const comparison = {
    ...image("comparacao"),
    type: "comparison",
    items: ["disponivel", "faltante"]
  };
  delete comparison.src;
  delete comparison.thumbnail;

  const result = collectStationMedia({ phases: [{ media: ["comparacao", "faltante"] }] }, [only, comparison]);

  assert.deepEqual(result.media.map((item) => item.id), ["comparacao", "disponivel"]);
  assert.deepEqual(result.missingIds, ["faltante"]);
});

test("mantem preload parcial quando um loader falha", async () => {
  const imageItem = image("imagem");
  const videoItem = video("video");
  const comparison = { ...image("comparacao"), type: "comparison", items: ["imagem", "video"] };
  delete comparison.src;
  delete comparison.thumbnail;

  const result = await preloadStationMedia([imageItem, videoItem, comparison], {
    image: async (item) => item.id,
    video: async () => { throw new Error("arquivo indisponivel"); }
  });

  assert.deepEqual(result.loaded.map((item) => item.id), ["imagem", "comparacao"]);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].item.id, "video");
  assert.match(result.failures[0].error.message, /arquivo indisponivel/i);
});
