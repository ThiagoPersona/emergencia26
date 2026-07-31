const assert = require("node:assert/strict");
const test = require("node:test");

const {
  calculateCompletedThemeAverage,
  buildWrongAnswersLog
} = require("../provas-utils.js");

test("calcula media apenas dos temas totalmente respondidos", () => {
  const result = calculateCompletedThemeAverage([
    { title: "Via aerea", total: 10, answered: 10, accuracy: 80 },
    { title: "Trauma", total: 8, answered: 4, accuracy: 50 },
    { title: "PCR", total: 5, answered: 5, accuracy: 60 },
    { title: "Vazio", total: 0, answered: 0, accuracy: null }
  ]);

  assert.deepEqual(result, {
    completedThemes: 2,
    totalThemes: 4,
    average: 70
  });
});

test("monta log textual com dados uteis das questoes erradas", () => {
  const log = buildWrongAnswersLog([
    {
      theme: "Via aérea e ventilação mecânica",
      source: "TEME22 Q4",
      questionNumber: "2",
      selected: "B",
      answer: "C",
      prompt: "Sobre a decisão de intubar um paciente, escolha a opção errada.",
      selectedText: "Ausência do reflexo de vômito indica via aérea definitiva.",
      answerText: "Deglutição espontânea sugere proteção de via aérea.",
      selectedExplanation: "Reflexo de vômito isolado é pouco confiável.",
      thinking: "Não use reflexo isolado para decidir intubação.",
      route: "provas/001_via-aerea_vm"
    }
  ], { generatedAt: new Date("2026-07-31T12:00:00-03:00") });

  assert.match(log, /LOG DE QUESTOES ERRADAS/);
  assert.match(log, /Via aérea e ventilação mecânica/);
  assert.match(log, /TEME22 Q4/);
  assert.match(log, /Marcada: B/);
  assert.match(log, /Gabarito: C/);
  assert.match(log, /Por que errei\/ponto-chave: Reflexo de vômito isolado é pouco confiável\./);
  assert.match(log, /Como pensar: Não use reflexo isolado para decidir intubação\./);
});

test("log informa quando nao ha erros gravados", () => {
  const log = buildWrongAnswersLog([], { generatedAt: new Date("2026-07-31T12:00:00-03:00") });

  assert.match(log, /Nenhuma questao errada registrada/);
});
