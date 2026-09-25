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

test("nao envia audio acima do limite aceito pela hospedagem", async (t) => {
  const originalConfig = globalThis.TEME_PRACTICE_CONFIG;
  const originalSupabase = globalThis.supabase;
  globalThis.TEME_PRACTICE_CONFIG = {
    apiBaseUrl: "https://historia.example.com",
    supabaseUrl: "https://project.supabase.co",
    supabaseAnonKey: "public-anon-key"
  };
  globalThis.supabase = {
    createClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: "test" } } }) } })
  };
  t.after(() => {
    globalThis.TEME_PRACTICE_CONFIG = originalConfig;
    globalThis.supabase = originalSupabase;
  });
  let fetchCalls = 0;
  t.mock.method(globalThis, "fetch", async () => { fetchCalls += 1; throw new Error("Não deveria enviar"); });
  const { evaluate } = require("../praticas-api.js");

  await assert.rejects(evaluate({
    station: { id: "teste" },
    audioBlob: new Blob([new Uint8Array(4 * 1024 * 1024 + 1)], { type: "audio/webm" }),
    transcript: "",
    durationSeconds: 300
  }), /4 MB/);
  assert.equal(fetchCalls, 0);
});

test("traduz falha de rede sem esconder erros normais da API", () => {
  const { getPracticeFetchError } = require("../praticas-api.js");
  assert.match(getPracticeFetchError(new TypeError("Failed to fetch")).message, /Não foi possível conectar/);
  assert.match(getPracticeFetchError(new Error("Failed to fetch")).message, /Não foi possível conectar/);
  assert.match(getPracticeFetchError(new Error("Limite atingido")).message, /Limite atingido/);
});
