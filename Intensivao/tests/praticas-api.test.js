const assert = require("node:assert/strict");
const test = require("node:test");

const {
  validatePublicConfig,
  buildEvaluationEndpoint,
  parseApiError,
  getAuthViewModel
} = require("../praticas-api.js");

test("aceita somente configuracao publica HTTPS completa", () => {
  assert.deepEqual(validatePublicConfig({
    apiBaseUrl: "https://historia.example.com/",
    supabaseUrl: "https://project.supabase.co",
    supabaseAnonKey: "public-anon-key"
  }), { valid: true, errors: [] });

  const result = validatePublicConfig({
    apiBaseUrl: "javascript:alert(1)",
    supabaseUrl: "",
    supabaseAnonKey: ""
  });
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 3);
});

test("constroi endpoint sem barra duplicada", () => {
  assert.equal(
    buildEvaluationEndpoint("https://historia.example.com/"),
    "https://historia.example.com/api/teme-practice/evaluate"
  );
});

test("extrai mensagem segura de erro da API", () => {
  assert.equal(parseApiError({ error: "Sessão expirada." }, 401), "Sessão expirada.");
  assert.match(parseApiError(null, 500), /500/);
});

test("distingue configuracao ausente, sessao anonima e usuario autenticado", () => {
  assert.equal(getAuthViewModel(null, false).status, "unconfigured");
  assert.equal(getAuthViewModel(null, true).status, "anonymous");
  assert.deepEqual(getAuthViewModel({ user: { email: "thiago@example.com" } }, true), {
    status: "authenticated",
    email: "thiago@example.com"
  });
});
