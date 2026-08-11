(function(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TemePracticeUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
  "use strict";

  const ALLOWED_STATUSES = new Set([
    "cumprido",
    "parcial",
    "ausente",
    "incorreto",
    "nao_verificavel"
  ]);
  const ALLOWED_VERIFICATION = new Set(["verbal", "manual", "hibrido"]);
  const ALLOWED_DIFFICULTIES = new Set(["basica", "intermediaria", "avancada"]);
  const ALLOWED_ORIGINS = new Set(["historica", "acervo_reescrito", "inedita"]);

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function validateNonEmptyStringArray(field, value, errors) {
    if (!Array.isArray(value) || value.length === 0 || !value.every(isNonEmptyString)) {
      errors.push(`${field} deve conter strings nao vazias`);
    }
  }

  function validateStation(station, options) {
    const errors = [];
    const requireVersion2 = Boolean(options && options.requireVersion2);

    if (!station || typeof station !== "object") {
      return { valid: false, errors: ["station deve ser um objeto"] };
    }

    ["id", "title", "domain"].forEach((field) => {
      if (!isNonEmptyString(station[field])) errors.push(`${field} obrigatorio`);
    });
    if (!Number.isInteger(station.version) || station.version < 1) {
      errors.push("version deve ser inteiro positivo");
    }
    if (!Number.isInteger(station.durationSeconds) || station.durationSeconds < 60) {
      errors.push("durationSeconds deve ser inteiro de pelo menos 60");
    }
    if (!Array.isArray(station.phases) || station.phases.length === 0) {
      errors.push("phases deve conter pelo menos uma fase");
    }
    if (!Array.isArray(station.checklist) || station.checklist.length === 0) {
      errors.push("checklist deve conter pelo menos um item");
    } else {
      const ids = new Set();
      station.checklist.forEach((item, index) => {
        const prefix = `checklist[${index}]`;
        if (!isNonEmptyString(item && item.id)) errors.push(`${prefix}.id obrigatorio`);
        if (ids.has(item && item.id)) errors.push(`${prefix}.id duplicado`);
        ids.add(item && item.id);
        if (!isNonEmptyString(item && item.label)) errors.push(`${prefix}.label obrigatorio`);
        if (typeof (item && item.weight) !== "number" || item.weight <= 0) {
          errors.push(`${prefix}.weight deve ser positivo`);
        }
        if (!ALLOWED_VERIFICATION.has(item && item.verification)) {
          errors.push(`${prefix}.verification invalido`);
        }
      });
    }

    if (requireVersion2) {
      if (station.version !== 2) errors.push("version deve ser 2");
      if (!isNonEmptyString(station.examTitle)) errors.push("examTitle obrigatorio");
      validateNonEmptyStringArray("domains", station.domains, errors);
      if (!ALLOWED_DIFFICULTIES.has(station.difficulty)) {
        errors.push("difficulty invalido");
      }
      if (!ALLOWED_ORIGINS.has(station.origin)) {
        errors.push("origin invalido");
      }
      validateNonEmptyStringArray("tags", station.tags, errors);
      validateNonEmptyStringArray("references", station.references, errors);

      if (Array.isArray(station.phases) && station.phases.length > 0) {
        const phaseIds = new Set();
        station.phases.forEach((phase, index) => {
          const prefix = `phases[${index}]`;
          if (!phase || typeof phase !== "object") {
            errors.push(`${prefix} deve ser um objeto`);
            return;
          }
          if (!isNonEmptyString(phase.id)) errors.push(`${prefix}.id obrigatorio`);
          if (phaseIds.has(phase.id)) errors.push(`${prefix}.id duplicado`);
          phaseIds.add(phase.id);
          if (!isNonEmptyString(phase.title)) errors.push(`${prefix}.title obrigatorio`);
          if (!isNonEmptyString(phase.prompt)) errors.push(`${prefix}.prompt obrigatorio`);
          if (Object.prototype.hasOwnProperty.call(phase, "patientState") &&
              (!phase.patientState || typeof phase.patientState !== "object" || Array.isArray(phase.patientState))) {
            errors.push(`${prefix}.patientState deve ser objeto`);
          }
          if (Object.prototype.hasOwnProperty.call(phase, "media") &&
              (!Array.isArray(phase.media) || phase.media.length === 0 || !phase.media.every(isNonEmptyString))) {
            errors.push(`${prefix}.media deve conter ids nao vazios`);
          }
        });
      }

      const totalPoints = Array.isArray(station.checklist)
        ? station.checklist.reduce((sum, item) => sum + (typeof (item && item.weight) === "number" ? item.weight : 0), 0)
        : 0;
      if (totalPoints !== 100) {
        errors.push("checklist deve totalizar exatamente 100 pontos");
      }
    }

    return { valid: errors.length === 0, errors };
  }

  function normalizeEvaluation(item, evaluation) {
    const status = ALLOWED_STATUSES.has(evaluation && evaluation.status)
      ? evaluation.status
      : "ausente";
    return {
      itemId: item.id,
      label: item.label,
      status,
      evidence: isNonEmptyString(evaluation && evaluation.evidence)
        ? evaluation.evidence.trim()
        : "Sem evidencia registrada.",
      rationale: isNonEmptyString(evaluation && evaluation.rationale)
        ? evaluation.rationale.trim()
        : "",
      manualConfirmed: typeof (evaluation && evaluation.manualConfirmed) === "boolean"
        ? evaluation.manualConfirmed
        : null
    };
  }

  function calculatePracticeScore(station, evaluations) {
    const validation = validateStation(station);
    if (!validation.valid) throw new Error(validation.errors.join("; "));

    const evaluationMap = new Map(
      (Array.isArray(evaluations) ? evaluations : []).map((item) => [item.itemId, item])
    );
    let earnedPoints = 0;
    let assessedPoints = 0;
    let pendingPoints = 0;
    const pendingManualItemIds = [];
    const criticalFailures = [];
    const normalizedEvaluations = [];

    station.checklist.forEach((item) => {
      const evaluation = normalizeEvaluation(item, evaluationMap.get(item.id));
      normalizedEvaluations.push(evaluation);

      const requiresManualConfirmation = item.verification === "manual" ||
        item.verification === "hibrido";
      const isManualPending = requiresManualConfirmation &&
        evaluation.manualConfirmed === null;

      if (isManualPending) {
        pendingPoints += item.weight;
        pendingManualItemIds.push(item.id);
        return;
      }

      assessedPoints += item.weight;
      const confirmationAccepted = !requiresManualConfirmation ||
        evaluation.manualConfirmed === true;
      if (confirmationAccepted && evaluation.status === "cumprido") {
        earnedPoints += item.weight;
      }
      if (confirmationAccepted && evaluation.status === "parcial") {
        earnedPoints += item.weight * 0.5;
      }
      if (item.verification === "manual" &&
          evaluation.status === "nao_verificavel" &&
          evaluation.manualConfirmed === true) {
        earnedPoints += item.weight;
      }

      const isCriticalStatusFailure = ["ausente", "incorreto"].includes(evaluation.status);
      const isCriticalManualDenial = requiresManualConfirmation &&
        evaluation.manualConfirmed === false;
      if (item.critical && (isCriticalStatusFailure || isCriticalManualDenial)) {
        criticalFailures.push(item.id);
      }
    });

    const totalPoints = station.checklist.reduce((sum, item) => sum + item.weight, 0);
    const provisionalPercent = assessedPoints
      ? Math.round((earnedPoints / assessedPoints) * 100)
      : 0;
    const finalPercent = pendingPoints === 0
      ? Math.round((earnedPoints / totalPoints) * 100)
      : null;

    return {
      earnedPoints,
      totalPoints,
      assessedPoints,
      pendingPoints,
      provisionalPercent,
      finalPercent,
      pendingManualItemIds,
      criticalFailures,
      evaluations: normalizedEvaluations
    };
  }

  function mergeManualChecks(evaluations, confirmations) {
    const safeConfirmations = confirmations && typeof confirmations === "object"
      ? confirmations
      : {};
    return (Array.isArray(evaluations) ? evaluations : []).map((evaluation) => {
      if (!Object.prototype.hasOwnProperty.call(safeConfirmations, evaluation.itemId)) {
        return { ...evaluation };
      }
      return { ...evaluation, manualConfirmed: Boolean(safeConfirmations[evaluation.itemId]) };
    });
  }

  function summarizePracticeAttempts(attempts) {
    const list = Array.isArray(attempts) ? attempts : [];
    const scored = list.filter((attempt) => Number.isFinite(attempt.finalPercent));
    const averagePercent = scored.length
      ? Math.round(scored.reduce((sum, attempt) => sum + attempt.finalPercent, 0) / scored.length)
      : null;
    const domains = new Map();
    const gaps = new Map();

    scored.forEach((attempt) => {
      const key = attempt.domain || "Sem dominio";
      const current = domains.get(key) || { domain: key, attempts: 0, total: 0 };
      current.attempts += 1;
      current.total += attempt.finalPercent;
      domains.set(key, current);

      (attempt.evaluations || []).forEach((evaluation) => {
        if (!["ausente", "incorreto"].includes(evaluation.status)) return;
        const gap = gaps.get(evaluation.itemId) || {
          itemId: evaluation.itemId,
          label: evaluation.label || evaluation.itemId,
          count: 0
        };
        gap.count += 1;
        gaps.set(evaluation.itemId, gap);
      });
    });

    return {
      totalAttempts: list.length,
      scoredAttempts: scored.length,
      averagePercent,
      byDomain: Array.from(domains.values())
        .map((item) => ({
          domain: item.domain,
          attempts: item.attempts,
          averagePercent: Math.round(item.total / item.attempts)
        }))
        .sort((a, b) => a.domain.localeCompare(b.domain, "pt-BR")),
      frequentGaps: Array.from(gaps.values())
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"))
    };
  }

  return {
    ALLOWED_STATUSES,
    validateStation,
    calculatePracticeScore,
    mergeManualChecks,
    summarizePracticeAttempts
  };
});
