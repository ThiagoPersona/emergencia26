(function(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TemePracticeCatalog = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
  "use strict";

  const FAILED_STATUSES = new Set(["ausente", "incorreto"]);

  function isEntry(entry) {
    return Boolean(entry) && typeof entry === "object" && !Array.isArray(entry) &&
      Object.prototype.hasOwnProperty.call(entry, "id");
  }

  function asEntries(entries) {
    return Array.isArray(entries) ? entries.filter(isEntry) : [];
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function containsValue(value, expected) {
    return Array.isArray(value) ? value.includes(expected) : value === expected;
  }

  function filterStations(entries, filters, attempts) {
    const list = asEntries(entries);
    if (!Array.isArray(entries)) return [];

    const criteria = filters && typeof filters === "object" ? filters : {};
    const attemptedIds = new Set(
      asArray(attempts)
        .filter((attempt) => attempt && typeof attempt === "object")
        .map((attempt) => attempt.stationId)
    );

    return list.filter((entry) => {
      if (criteria.domain !== undefined &&
          !(containsValue(entry.domains, criteria.domain) || entry.domain === criteria.domain)) {
        return false;
      }
      if (criteria.difficulty !== undefined && entry.difficulty !== criteria.difficulty) return false;
      if (criteria.tag !== undefined && !asArray(entry.tags).includes(criteria.tag)) return false;
      if (criteria.hasMedia === true && entry.hasMedia !== true) return false;
      if (criteria.unattempted === true && attemptedIds.has(entry.id)) return false;
      return true;
    });
  }

  function safeRandomIndex(length, randomFn) {
    if (length <= 0) return -1;
    const source = typeof randomFn === "function" ? randomFn : Math.random;
    const value = Number(source());
    const normalized = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    return Math.min(length - 1, Math.floor(normalized * length));
  }

  function pickStation(entries, cycleIds, randomFn) {
    const list = asEntries(entries);
    if (list.length === 0) return { station: null, cycleIds: [] };

    const cycle = Array.isArray(cycleIds) ? Array.from(new Set(cycleIds)) : [];
    let pool = list.filter((entry) => !cycle.includes(entry.id));
    if (pool.length === 0) {
      pool = list;
      cycle.length = 0;
    }

    const station = pool[safeRandomIndex(pool.length, randomFn)];
    if (!cycle.includes(station.id)) cycle.push(station.id);
    return { station, cycleIds: cycle };
  }

  function entryTokens(entry) {
    return asArray(entry.competencies).concat(asArray(entry.tags)).reduce((tokens, value) => {
      if (typeof value === "string") {
        tokens.push(value);
      } else if (value && typeof value === "object") {
        [value.id, value.tag, value.name].forEach((token) => {
          if (typeof token === "string") tokens.push(token);
        });
      }
      return tokens;
    }, []);
  }

  function failedGapCounts(attempts) {
    const counts = new Map();
    asArray(attempts).forEach((attempt) => {
      asArray(attempt && attempt.evaluations).forEach((evaluation) => {
        if (!FAILED_STATUSES.has(evaluation && evaluation.status)) return;
        const tokens = [evaluation.itemId].concat(asArray(evaluation.tags));
        Array.from(new Set(tokens)).forEach((token) => {
          if (typeof token !== "string" || token.length === 0) return;
          counts.set(token, (counts.get(token) || 0) + 1);
        });
      });
    });
    return counts;
  }

  function attemptCounts(attempts) {
    const counts = new Map();
    asArray(attempts).forEach((attempt) => {
      if (!attempt || typeof attempt !== "object") return;
      counts.set(attempt.stationId, (counts.get(attempt.stationId) || 0) + 1);
    });
    return counts;
  }

  function mostRecentStationId(attempts) {
    const list = asArray(attempts).filter((attempt) => attempt && typeof attempt === "object");
    if (list.length === 0) return undefined;

    let latest = null;
    let latestTime = -Infinity;
    list.forEach((attempt, index) => {
      const rawDate = attempt.completedAt || attempt.createdAt || attempt.updatedAt;
      const time = rawDate ? Date.parse(rawDate) : NaN;
      if (Number.isFinite(time) && (latest === null || time >= latestTime)) {
        latest = attempt;
        latestTime = time;
      } else if (latest === null && index === list.length - 1) {
        latest = attempt;
      }
    });
    return latest ? latest.stationId : undefined;
  }

  function getRecommendedStations(entries, attempts, limit) {
    const list = asEntries(entries);
    if (!Array.isArray(entries) || list.length === 0) return [];

    const safeAttempts = Array.isArray(attempts) ? attempts : [];
    const gaps = failedGapCounts(safeAttempts);
    const counts = attemptCounts(safeAttempts);
    const recentStationId = mostRecentStationId(safeAttempts);
    const canVary = list.some((entry) => entry.id !== recentStationId);
    const candidates = canVary
      ? list.filter((entry) => entry.id !== recentStationId)
      : list;
    const score = (entry) => Array.from(new Set(entryTokens(entry)))
      .reduce((total, token) => total + (gaps.get(token) || 0), 0);
    const title = (entry) => typeof entry.title === "string" ? entry.title : "";
    const maxItems = limit === undefined
      ? 3
      : Math.max(1, Number.isFinite(Number(limit)) ? Math.floor(Number(limit)) : 3);

    return candidates
      .slice()
      .sort((left, right) => {
        if (gaps.size > 0) {
          const scoreDifference = score(right) - score(left);
          if (scoreDifference !== 0) return scoreDifference;
        }
        const attemptDifference = (counts.get(left.id) || 0) - (counts.get(right.id) || 0);
        if (attemptDifference !== 0) return attemptDifference;
        return title(left).localeCompare(title(right), "pt-BR");
      })
      .slice(0, maxItems);
  }

  return {
    filterStations,
    pickStation,
    getRecommendedStations
  };
});
