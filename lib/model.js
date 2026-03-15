'use strict';

const { ROUNDS, DEFAULT_BOUNDS } = require('./constants');

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function normalizeBounds(bounds) {
  const merged = { ...DEFAULT_BOUNDS, ...(bounds || {}) };
  const sizeMin = Number(merged.sizeMin);
  const sizeMax = Number(merged.sizeMax);
  const performanceMin = Number(merged.performanceMin);
  const performanceMax = Number(merged.performanceMax);
  return {
    sizeMin: Number.isFinite(sizeMin) ? sizeMin : DEFAULT_BOUNDS.sizeMin,
    sizeMax: Number.isFinite(sizeMax) ? sizeMax : DEFAULT_BOUNDS.sizeMax,
    performanceMin: Number.isFinite(performanceMin)
      ? performanceMin
      : DEFAULT_BOUNDS.performanceMin,
    performanceMax: Number.isFinite(performanceMax)
      ? performanceMax
      : DEFAULT_BOUNDS.performanceMax,
  };
}

function clampPoint(point, bounds) {
  const resolvedBounds = normalizeBounds(bounds);
  return {
    size: clamp(point.size, resolvedBounds.sizeMin, resolvedBounds.sizeMax),
    performance: clamp(
      point.performance,
      resolvedBounds.performanceMin,
      resolvedBounds.performanceMax
    ),
  };
}

function normalizeRound(round) {
  const numericRound = Number.parseInt(round, 10);
  if (!Number.isFinite(numericRound)) {
    return 1;
  }
  return clamp(numericRound, 1, ROUNDS);
}

function getSegmentPositionAtRound(segment, round, bounds) {
  const resolvedRound = normalizeRound(round);
  const overrides = Array.isArray(segment.overrides) ? segment.overrides : [];
  const override = overrides.find((entry) => Number(entry.round) === resolvedRound);

  // drift calculation happens here: each round center is treated as an end-of-year point.
  const basePoint = override
    ? { size: Number(override.size), performance: Number(override.performance) }
    : {
        size: Number(segment.start.size) + resolvedRound * Number(segment.driftPerRound.deltaSize),
        performance:
          Number(segment.start.performance) +
          resolvedRound * Number(segment.driftPerRound.deltaPerformance),
      };

  return clampPoint(basePoint, bounds);
}

function getProductPositionAtRound(product, round, bounds) {
  const _resolvedRound = normalizeRound(round);
  const chosen = {
    size: Number(product.start.size),
    performance: Number(product.start.performance),
  };

  return clampPoint(chosen, bounds);
}

function buildRoundSnapshot(scenario, round) {
  const resolvedRound = normalizeRound(round);
  const bounds = scenario.chartBounds || DEFAULT_BOUNDS;

  const segments = (scenario.segments || []).map((segment) => {
    const point = getSegmentPositionAtRound(segment, resolvedRound, bounds);
    return {
      id: segment.id,
      name: segment.name,
      color: segment.color,
      point,
    };
  });

  const products = (scenario.products || []).map((product) => {
    const point = getProductPositionAtRound(product, resolvedRound, bounds);
    return {
      id: product.id,
      name: product.name,
      tag: product.tag,
      color: product.color,
      icon: product.icon,
      point,
    };
  });

  return {
    round: resolvedRound,
    segments,
    products,
  };
}

function getRoundYear(meta, round) {
  const startYear = Number(meta && meta.startYear);
  if (!Number.isFinite(startYear)) {
    return null;
  }
  return startYear + (normalizeRound(round) - 1);
}

module.exports = {
  clamp,
  normalizeBounds,
  clampPoint,
  normalizeRound,
  getSegmentPositionAtRound,
  getProductPositionAtRound,
  buildRoundSnapshot,
  getRoundYear,
};
