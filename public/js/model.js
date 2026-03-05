import { DEFAULT_BOUNDS, ROUNDS } from './constants.js';

const IDEAL_OFFSETS = Object.freeze({
  traditional: Object.freeze({ deltaPerformance: 0.0, deltaSize: 0.0 }),
  lowend: Object.freeze({ deltaPerformance: -0.8, deltaSize: 0.8 }),
  highend: Object.freeze({ deltaPerformance: 1.4, deltaSize: -1.4 }),
  performance: Object.freeze({ deltaPerformance: 1.4, deltaSize: -1.0 }),
  size: Object.freeze({ deltaPerformance: 1.0, deltaSize: -1.4 }),
});

function segmentKey(segment) {
  const raw = String(segment?.name || segment?.id || '').toLowerCase();
  return raw.replace(/[^a-z]/g, '');
}

function getMetaRounds(scenario) {
  const rounds = Number.parseInt(scenario?.meta?.rounds, 10);
  if (!Number.isInteger(rounds) || rounds <= 0) {
    return ROUNDS;
  }
  return rounds;
}

function getSegmentPositionAtAbsoluteRound(segment, roundNumber, bounds) {
  const resolvedRound = Math.max(1, Number.parseInt(roundNumber, 10) || 1);
  const overrides = Array.isArray(segment.overrides) ? segment.overrides : [];
  const override = overrides.find((entry) => Number(entry.round) === resolvedRound);

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
  // drift calculation happens here: Round 1 is start, then each later round adds yearly drift.
  return getSegmentPositionAtAbsoluteRound(segment, resolvedRound, bounds);
}

export function getSegmentIdealPositionAtRound(segment, round, bounds) {
  const centerPoint = getSegmentPositionAtRound(segment, round, bounds);
  const offsets = IDEAL_OFFSETS[segmentKey(segment)] || IDEAL_OFFSETS.traditional;

  return clampPoint(
    {
      performance: centerPoint.performance + offsets.deltaPerformance,
      size: centerPoint.size + offsets.deltaSize,
    },
    bounds
  );
}

export function normalizeMonthIndex(monthIndex, rounds = ROUNDS) {
  const parsed = Number.parseInt(monthIndex, 10);
  const maxMonthIndex = Math.max(0, rounds * 12 - 1);
  if (!Number.isInteger(parsed)) {
    return 0;
  }
  return clamp(parsed, 0, maxMonthIndex);
}

export function getSegmentPositionAtMonth(segment, monthIndex, bounds) {
  const resolvedMonthIndex = Math.max(0, Number.parseInt(monthIndex, 10) || 0);
  const baseRound = Math.floor(resolvedMonthIndex / 12) + 1;
  const monthInYear = resolvedMonthIndex % 12;
  const interpolation = monthInYear / 12;

  const basePoint = getSegmentPositionAtAbsoluteRound(segment, baseRound, bounds);
  const nextPoint = getSegmentPositionAtAbsoluteRound(segment, baseRound + 1, bounds);

  return clampPoint(
    {
      performance:
        basePoint.performance + (nextPoint.performance - basePoint.performance) * interpolation,
      size: basePoint.size + (nextPoint.size - basePoint.size) * interpolation,
    },
    bounds
  );
}

export function getSegmentIdealPositionAtMonth(segment, monthIndex, bounds) {
  const centerPoint = getSegmentPositionAtMonth(segment, monthIndex, bounds);
  const offsets = IDEAL_OFFSETS[segmentKey(segment)] || IDEAL_OFFSETS.traditional;

  return clampPoint(
    {
      performance: centerPoint.performance + offsets.deltaPerformance,
      size: centerPoint.size + offsets.deltaSize,
    },
    bounds
  );
}

export function getProductPositionAtRound(product, _round, bounds) {
  const point = {
    size: Number(product.start.size),
    performance: Number(product.start.performance),
  };

  return clampPoint(point, bounds);
}

export function buildRoundSnapshot(scenario, round) {
  const resolvedRound = normalizeRound(round);
  const bounds = normalizeBounds(scenario.chartBounds);
  const segments = (scenario.segments || []).map((segment) => ({
    ...segment,
    point: getSegmentPositionAtRound(segment, resolvedRound, bounds),
    idealPoint: getSegmentIdealPositionAtRound(segment, resolvedRound, bounds),
  }));

  const products = (scenario.products || []).map((product) => ({
    ...product,
    point: getProductPositionAtRound(product, resolvedRound, bounds),
  }));

  return {
    round: resolvedRound,
    monthIndex: (resolvedRound - 1) * 12,
    month: 0,
    year: Number(scenario.meta?.startYear) + (resolvedRound - 1),
    segments,
    products,
  };
}

export function buildMonthSnapshot(scenario, monthIndex) {
  const rounds = getMetaRounds(scenario);
  const resolvedMonthIndex = normalizeMonthIndex(monthIndex, rounds);
  const resolvedRound = Math.floor(resolvedMonthIndex / 12) + 1;
  const resolvedMonth = resolvedMonthIndex % 12;
  const bounds = normalizeBounds(scenario.chartBounds);

  const segments = (scenario.segments || []).map((segment) => ({
    ...segment,
    point: getSegmentPositionAtMonth(segment, resolvedMonthIndex, bounds),
    idealPoint: getSegmentIdealPositionAtMonth(segment, resolvedMonthIndex, bounds),
  }));

  const products = (scenario.products || []).map((product) => ({
    ...product,
    point: getProductPositionAtRound(product, resolvedRound, bounds),
  }));

  return {
    round: resolvedRound,
    monthIndex: resolvedMonthIndex,
    month: resolvedMonth,
    year: Number(scenario.meta?.startYear) + Math.floor(resolvedMonthIndex / 12),
    segments,
    products,
  };
}
