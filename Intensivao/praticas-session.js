(function(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TemePracticeSession = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
  "use strict";

  const MODES = new Set(["exam", "directed", "review"]);

  function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function resolveNow(nowMs) {
    return Number.isFinite(nowMs) ? nowMs : Date.now();
  }

  function normalizeMode(mode) {
    return MODES.has(mode) ? mode : "directed";
  }

  function lastPhaseIndex(station) {
    const phaseCount = station && Array.isArray(station.phases) ? station.phases.length : 0;
    return Math.max(0, phaseCount - 1);
  }

  function clampPhaseIndex(phaseIndex, station) {
    const index = Number.isInteger(phaseIndex) ? phaseIndex : 0;
    return Math.max(0, Math.min(lastPhaseIndex(station), index));
  }

  function createSession(station, mode, nowMs) {
    return {
      stationId: station.id,
      stationVersion: station.version,
      mode: normalizeMode(mode),
      status: "ready",
      phaseIndex: 0,
      createdAtMs: resolveNow(nowMs),
      startedAtMs: null,
      completedAtMs: null
    };
  }

  function startSession(session, nowMs) {
    const next = { ...session, status: "running" };
    if (session.startedAtMs == null) next.startedAtMs = resolveNow(nowMs);
    return next;
  }

  function movePhase(session, station, direction) {
    const delta = direction === "previous" ? -1 : direction === "next" ? 1 : 0;
    return {
      ...session,
      phaseIndex: clampPhaseIndex(session.phaseIndex + delta, station)
    };
  }

  function getPrimaryAction(session, station) {
    return session.phaseIndex >= lastPhaseIndex(station)
      ? { action: "finish", label: "Finalizar estação" }
      : { action: "next", label: "Próxima tarefa" };
  }

  function getDurationSeconds(station) {
    return Number.isFinite(station && station.durationSeconds)
      ? Math.max(0, station.durationSeconds)
      : 0;
  }

  function getRemainingSeconds(session, station, nowMs) {
    const duration = getDurationSeconds(station);
    if (!Number.isFinite(session.startedAtMs)) return duration;
    return Math.max(0, duration - Math.floor((resolveNow(nowMs) - session.startedAtMs) / 1000));
  }

  function serializeSession(session) {
    return JSON.stringify({
      stationId: session.stationId,
      stationVersion: session.stationVersion,
      mode: session.mode,
      status: session.status,
      phaseIndex: session.phaseIndex,
      createdAtMs: session.createdAtMs,
      startedAtMs: session.startedAtMs,
      completedAtMs: session.completedAtMs
    });
  }

  function parseRawSession(raw) {
    if (typeof raw !== "string") return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function hasValidTimestamps(session) {
    return Number.isFinite(session.createdAtMs) &&
      Number.isFinite(session.startedAtMs) &&
      session.completedAtMs === null &&
      session.startedAtMs >= session.createdAtMs;
  }

  function restoreSession(raw, station, nowMs) {
    const session = parseRawSession(raw);
    if (!isObject(session) || !isObject(station)) return null;
    if (session.stationId !== station.id || session.stationVersion !== station.version) return null;
    if (session.status !== "running" || !MODES.has(session.mode)) return null;
    if (!hasValidTimestamps(session)) return null;
    const currentTime = resolveNow(nowMs);
    if (session.startedAtMs > currentTime) return null;

    const restored = {
      stationId: session.stationId,
      stationVersion: session.stationVersion,
      mode: session.mode,
      status: session.status,
      phaseIndex: clampPhaseIndex(session.phaseIndex, station),
      createdAtMs: session.createdAtMs,
      startedAtMs: session.startedAtMs,
      completedAtMs: session.completedAtMs
    };
    const remainingSeconds = getRemainingSeconds(restored, station, currentTime);
    if (remainingSeconds <= 0) return null;
    return { ...restored, remainingSeconds };
  }

  return {
    createSession,
    startSession,
    movePhase,
    getPrimaryAction,
    getRemainingSeconds,
    serializeSession,
    restoreSession
  };
});
