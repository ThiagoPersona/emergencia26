(function(root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TemePracticeApi = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(root) {
  "use strict";

  let supabaseClient = null;
  let initialized = false;

  function isSafeHttpUrl(value, allowLocalhost) {
    try {
      const url = new URL(value);
      if (url.protocol === "https:") return true;
      return Boolean(
        allowLocalhost &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
      );
    } catch {
      return false;
    }
  }

  function validatePublicConfig(config) {
    const errors = [];
    if (!config || !isSafeHttpUrl(config.apiBaseUrl, true)) errors.push("apiBaseUrl inválida");
    if (!config || !isSafeHttpUrl(config.supabaseUrl, false)) errors.push("supabaseUrl inválida");
    if (!config || typeof config.supabaseAnonKey !== "string" || !config.supabaseAnonKey.trim()) {
      errors.push("supabaseAnonKey obrigatória");
    }
    return { valid: errors.length === 0, errors };
  }

  function buildEvaluationEndpoint(apiBaseUrl) {
    return `${String(apiBaseUrl || "").replace(/\/+$/, "")}/api/teme-practice/evaluate`;
  }

  function parseApiError(payload, status) {
    if (payload && typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }
    if (payload && typeof payload.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
    return `A API respondeu com erro ${status || "desconhecido"}.`;
  }

  function getAuthViewModel(session, configured) {
    if (!configured) return { status: "unconfigured", email: "" };
    const email = session && session.user && typeof session.user.email === "string"
      ? session.user.email
      : "";
    return email
      ? { status: "authenticated", email }
      : { status: "anonymous", email: "" };
  }

  function getConfig() {
    return root && root.TEME_PRACTICE_CONFIG ? root.TEME_PRACTICE_CONFIG : null;
  }

  function init() {
    if (initialized) return supabaseClient;
    const config = getConfig();
    const validation = validatePublicConfig(config);
    if (!validation.valid) return null;
    if (!root.supabase || typeof root.supabase.createClient !== "function") return null;
    supabaseClient = root.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "teme-practice-auth"
      }
    });
    initialized = true;
    return supabaseClient;
  }

  async function getSession() {
    const client = init();
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session || null;
  }

  async function signIn(email, password) {
    const client = init();
    if (!client) throw new Error("Configuração de autenticação indisponível.");
    const { data, error } = await client.auth.signInWithPassword({
      email: String(email || "").trim(),
      password: String(password || "")
    });
    if (error) throw error;
    return data.session;
  }

  async function signOut() {
    const client = init();
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  function onAuthStateChange(callback) {
    const client = init();
    if (!client) return () => {};
    const { data } = client.auth.onAuthStateChange((_event, session) => callback(session));
    return () => data.subscription.unsubscribe();
  }

  async function evaluate({ station, audioBlob, transcript, durationSeconds }) {
    const config = getConfig();
    const validation = validatePublicConfig(config);
    if (!validation.valid) throw new Error(validation.errors.join("; "));
    const session = await getSession();
    if (!session || !session.access_token) {
      throw new Error("Entre na sua conta para usar a correção automática.");
    }

    const form = new FormData();
    form.set("station", JSON.stringify(station));
    form.set("transcript", String(transcript || "").trim());
    form.set("durationSeconds", String(Math.max(0, Math.round(durationSeconds || 0))));
    if (audioBlob && audioBlob.size > 0) {
      const extension = audioBlob.type.includes("mp4") ? "m4a" :
        audioBlob.type.includes("ogg") ? "ogg" : "webm";
      form.set("audio", audioBlob, `estacao.${extension}`);
    }

    const response = await fetch(buildEvaluationEndpoint(config.apiBaseUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: form,
      cache: "no-store"
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) throw new Error(parseApiError(payload, response.status));
    if (!payload || !Array.isArray(payload.evaluations)) {
      throw new Error("A API devolveu uma avaliação inválida.");
    }
    return payload;
  }

  async function authenticatedRequest(method, body) {
    const config = getConfig();
    const validation = validatePublicConfig(config);
    if (!validation.valid) throw new Error(validation.errors.join("; "));
    const session = await getSession();
    if (!session || !session.access_token) throw new Error("Entre na sua conta para sincronizar.");
    const response = await fetch(buildEvaluationEndpoint(config.apiBaseUrl), {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store"
    });
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok) throw new Error(parseApiError(payload, response.status));
    return payload;
  }

  function confirmManual(attemptId, confirmations) {
    return authenticatedRequest("PATCH", { attemptId, confirmations });
  }

  function listAttempts() {
    return authenticatedRequest("GET").then((payload) =>
      payload && Array.isArray(payload.attempts) ? payload.attempts : []
    );
  }

  return {
    validatePublicConfig,
    buildEvaluationEndpoint,
    parseApiError,
    getAuthViewModel,
    init,
    getSession,
    signIn,
    signOut,
    onAuthStateChange,
    evaluate,
    confirmManual,
    listAttempts
  };
});
