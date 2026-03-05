import { DEFAULT_BOUNDS, ROUNDS } from './constants.js';

export function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

export function normalizeBounds(bounds) {
  const merged = { ...DEFAULT_BOUNDS, ...(bounds || {}) };
  return {
    sizeMin: Number.isFinite(Number(merged.sizeMin))
      ? Number(merged.sizeMin)
      : DEFAULT_BOUNDS.sizeMin,
    sizeMax: Number.isFinite(Number(merged.sizeMax))
      ? Number(merged.sizeMax)
      : DEFAULT_BOUNDS.sizeMax,
    performanceMin: Number.isFinite(Number(merged.performanceMin))
      ? Number(merged.performanceMin)
      : DEFAULT_BOUNDS.performanceMin,
    performanceMax: Number.isFinite(Number(merged.performanceMax))
      ? Number(merged.performanceMax)
      : DEFAULT_BOUNDS.performanceMax,
  };
}

export function clampPoint(point, bounds) {
  const resolvedBounds = normalizeBounds(bounds);
  return {
    size: clamp(Number(point.size), resolvedBounds.sizeMin, resolvedBounds.sizeMax),
    performance: clamp(
      Number(point.performance),
      resolvedBounds.performanceMin,
      resolvedBounds.performanceMax
    ),
  };
}

export function normalizeRound(round) {
  const parsed = Number.parseInt(round, 10);
  if (!Number.isInteger(parsed)) {
    return 1;
  }
  return clamp(parsed, 1, ROUNDS);
}

export function getSegmentPositionAtRound(segment, round, bounds) {
  const resolvedRound = normalizeRound(round);
  const overrides = Array.isArray(segment.overrides) ? segment.overrides : [];
  const override = overrides.find((entry) => Number(entry.round) === resolvedRound);

  // drift calculation happens here: Round 1 is start, then each round adds (round - 1) * drift.
  const computed = override
    ? { size: Number(override.size), performance: Number(override.performance) }
    : {
        size:
          Number(segment.start.size) +
          (resolvedRound - 1) * Number(segment.driftPerRound.deltaSize),
        performance:
          Number(segment.start.performance) +
          (resolvedRound - 1) * Number(segment.driftPerRound.deltaPerformance),
      };

  return clampPoint(computed, bounds);
}

export function getProductPositionAtRound(product, round, bounds) {
  const resolvedRound = normalizeRound(round);
  const steps = Array.isArray(product.repositionPlan)
    ? [...product.repositionPlan].sort((a, b) => Number(a.round) - Number(b.round))
    : [];

  let point = {
    size: Number(product.start.size),
    performance: Number(product.start.performance),
  };

  for (const step of steps) {
    if (Number(step.round) <= resolvedRound) {
      point = {
        size: Number(step.size),
        performance: Number(step.performance),
      };
    }
  }

  return clampPoint(point, bounds);
}

export function buildRoundSnapshot(scenario, round) {
  const resolvedRound = normalizeRound(round);
  const bounds = normalizeBounds(scenario.chartBounds);
  const segments = (scenario.segments || []).map((segment) => ({
    ...segment,
    point: getSegmentPositionAtRound(segment, resolvedRound, bounds),
  }));

  const products = (scenario.products || []).map((product) => ({
    ...product,
    point: getProductPositionAtRound(product, resolvedRound, bounds),
  }));

  return {
    round: resolvedRound,
    year: Number(scenario.meta?.startYear) + (resolvedRound - 1),
    segments,
    products,
  };
}
