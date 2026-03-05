'use strict';

const {
  ROUNDS,
  DEFAULT_BOUNDS,
  ALLOWED_TAGS,
  ALLOWED_ICONS,
} = require('./constants');
const { clampPoint, normalizeBounds, normalizeRound } = require('./model');

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asRound(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    return null;
  }
  if (parsed < 1 || parsed > ROUNDS) {
    return null;
  }
  return parsed;
}

function uniqueNameKey(name) {
  return String(name || '').trim().toLowerCase();
}

function normalizeScenario(input) {
  const errors = [];

  if (!isObject(input)) {
    return {
      valid: false,
      errors: ['Scenario must be a JSON object.'],
      normalizedScenario: null,
    };
  }

  const scenario = JSON.parse(JSON.stringify(input));

  const version = Number.parseInt(scenario.version, 10);
  if (!Number.isInteger(version)) {
    errors.push('version must be an integer.');
  }

  const rawMeta = isObject(scenario.meta) ? scenario.meta : {};
  const name = asNonEmptyString(rawMeta.name);
  if (!name) {
    errors.push('meta.name is required.');
  }

  const rounds = Number.parseInt(rawMeta.rounds, 10);
  if (rounds !== ROUNDS) {
    errors.push(`meta.rounds must be ${ROUNDS}.`);
  }

  const startYear = Number.parseInt(rawMeta.startYear, 10);
  if (!Number.isInteger(startYear)) {
    errors.push('meta.startYear must be an integer year.');
  }

  const mergedBounds = normalizeBounds(
    isObject(scenario.chartBounds) ? scenario.chartBounds : DEFAULT_BOUNDS
  );
  if (!isObject(scenario.chartBounds)) {
    errors.push('chartBounds is required.');
  }

  if (mergedBounds.sizeMin >= mergedBounds.sizeMax) {
    errors.push('chartBounds.sizeMin must be less than chartBounds.sizeMax.');
  }
  if (mergedBounds.performanceMin >= mergedBounds.performanceMax) {
    errors.push(
      'chartBounds.performanceMin must be less than chartBounds.performanceMax.'
    );
  }

  const normalized = {
    version: Number.isInteger(version) ? version : 1,
    meta: {
      name: name || 'Untitled Scenario',
      rounds: ROUNDS,
      startYear: Number.isInteger(startYear) ? startYear : 2027,
    },
    chartBounds: mergedBounds,
    segments: [],
    products: [],
    ui: {
      selectedRound: 1,
      selectedProductId: null,
      showFitLines: false,
    },
  };

  if (!Array.isArray(scenario.segments) || scenario.segments.length === 0) {
    errors.push('segments must be a non-empty array.');
  }

  const segmentIdSet = new Set();
  const segmentNameSet = new Set();

  const segments = Array.isArray(scenario.segments) ? scenario.segments : [];
  segments.forEach((segment, index) => {
    const label = `segments[${index}]`;
    if (!isObject(segment)) {
      errors.push(`${label} must be an object.`);
      return;
    }

    const id = asNonEmptyString(segment.id);
    if (!id) {
      errors.push(`${label}.id is required.`);
    } else if (segmentIdSet.has(id)) {
      errors.push(`${label}.id must be unique.`);
    } else {
      segmentIdSet.add(id);
    }

    const nameValue = asNonEmptyString(segment.name);
    if (!nameValue) {
      errors.push(`${label}.name is required.`);
    } else {
      const nameKey = uniqueNameKey(nameValue);
      if (segmentNameSet.has(nameKey)) {
        errors.push(`${label}.name must be unique.`);
      }
      segmentNameSet.add(nameKey);
    }

    const color = asNonEmptyString(segment.color);
    if (!color) {
      errors.push(`${label}.color is required.`);
    }

    const start = isObject(segment.start) ? segment.start : null;
    if (!start) {
      errors.push(`${label}.start is required.`);
    }
    const startSize = start ? asFiniteNumber(start.size) : null;
    const startPerformance = start ? asFiniteNumber(start.performance) : null;
    if (startSize === null) {
      errors.push(`${label}.start.size must be a finite number.`);
    }
    if (startPerformance === null) {
      errors.push(`${label}.start.performance must be a finite number.`);
    }

    const drift = isObject(segment.driftPerRound) ? segment.driftPerRound : null;
    if (!drift) {
      errors.push(`${label}.driftPerRound is required.`);
    }
    const deltaSize = drift ? asFiniteNumber(drift.deltaSize) : null;
    const deltaPerformance = drift ? asFiniteNumber(drift.deltaPerformance) : null;
    if (deltaSize === null) {
      errors.push(`${label}.driftPerRound.deltaSize must be a finite number.`);
    }
    if (deltaPerformance === null) {
      errors.push(`${label}.driftPerRound.deltaPerformance must be a finite number.`);
    }

    let overrides = [];
    if (segment.overrides === undefined) {
      overrides = [];
    } else if (!Array.isArray(segment.overrides)) {
      errors.push(`${label}.overrides must be an array if provided.`);
    } else {
      const overrideRounds = new Set();
      overrides = segment.overrides
        .map((entry, overrideIndex) => {
          const overrideLabel = `${label}.overrides[${overrideIndex}]`;
          if (!isObject(entry)) {
            errors.push(`${overrideLabel} must be an object.`);
            return null;
          }
          const overrideRound = asRound(entry.round);
          if (overrideRound === null) {
            errors.push(`${overrideLabel}.round must be an integer from 1 to ${ROUNDS}.`);
            return null;
          }
          if (overrideRounds.has(overrideRound)) {
            errors.push(`${overrideLabel}.round is duplicated.`);
            return null;
          }
          overrideRounds.add(overrideRound);

          const overrideSize = asFiniteNumber(entry.size);
          const overridePerformance = asFiniteNumber(entry.performance);
          if (overrideSize === null) {
            errors.push(`${overrideLabel}.size must be a finite number.`);
            return null;
          }
          if (overridePerformance === null) {
            errors.push(`${overrideLabel}.performance must be a finite number.`);
            return null;
          }

          const clamped = clampPoint(
            { size: overrideSize, performance: overridePerformance },
            mergedBounds
          );
          return {
            round: overrideRound,
            size: clamped.size,
            performance: clamped.performance,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.round - b.round);
    }

    const normalizedStart = clampPoint(
      {
        size: startSize !== null ? startSize : 0,
        performance: startPerformance !== null ? startPerformance : 0,
      },
      mergedBounds
    );

    normalized.segments.push({
      id: id || `segment-${index + 1}`,
      name: nameValue || `Segment ${index + 1}`,
      color: color || '#374151',
      start: normalizedStart,
      driftPerRound: {
        deltaSize: deltaSize !== null ? deltaSize : 0,
        deltaPerformance: deltaPerformance !== null ? deltaPerformance : 0,
      },
      overrides,
    });
  });

  if (!Array.isArray(scenario.products)) {
    errors.push('products must be an array.');
  }

  const productIdSet = new Set();
  const productNameSet = new Set();

  const products = Array.isArray(scenario.products) ? scenario.products : [];
  products.forEach((product, index) => {
    const label = `products[${index}]`;
    if (!isObject(product)) {
      errors.push(`${label} must be an object.`);
      return;
    }

    const id = asNonEmptyString(product.id);
    if (!id) {
      errors.push(`${label}.id is required.`);
    } else if (productIdSet.has(id)) {
      errors.push(`${label}.id must be unique.`);
    } else {
      productIdSet.add(id);
    }

    const nameValue = asNonEmptyString(product.name);
    if (!nameValue) {
      errors.push(`${label}.name is required.`);
    } else {
      const nameKey = uniqueNameKey(nameValue);
      if (productNameSet.has(nameKey)) {
        errors.push(`${label}.name must be unique.`);
      }
      productNameSet.add(nameKey);
    }

    const tag = asNonEmptyString(product.tag);
    if (!tag || !ALLOWED_TAGS.includes(tag)) {
      errors.push(`${label}.tag must be one of: ${ALLOWED_TAGS.join(', ')}.`);
    }

    const icon = asNonEmptyString(product.icon);
    if (!icon || !ALLOWED_ICONS.includes(icon)) {
      errors.push(`${label}.icon must be one of: ${ALLOWED_ICONS.join(', ')}.`);
    }

    const color = asNonEmptyString(product.color);
    if (!color) {
      errors.push(`${label}.color is required.`);
    }

    const start = isObject(product.start) ? product.start : null;
    if (!start) {
      errors.push(`${label}.start is required.`);
    }
    const startSize = start ? asFiniteNumber(start.size) : null;
    const startPerformance = start ? asFiniteNumber(start.performance) : null;
    if (startSize === null) {
      errors.push(`${label}.start.size must be a finite number.`);
    }
    if (startPerformance === null) {
      errors.push(`${label}.start.performance must be a finite number.`);
    }

    let repositionPlan = [];
    if (product.repositionPlan === undefined) {
      repositionPlan = [];
    } else if (!Array.isArray(product.repositionPlan)) {
      errors.push(`${label}.repositionPlan must be an array if provided.`);
    } else {
      const planRounds = new Set();
      repositionPlan = product.repositionPlan
        .map((entry, planIndex) => {
          const planLabel = `${label}.repositionPlan[${planIndex}]`;
          if (!isObject(entry)) {
            errors.push(`${planLabel} must be an object.`);
            return null;
          }
          const planRound = asRound(entry.round);
          if (planRound === null) {
            errors.push(`${planLabel}.round must be an integer from 1 to ${ROUNDS}.`);
            return null;
          }
          if (planRounds.has(planRound)) {
            errors.push(`${planLabel}.round is duplicated.`);
            return null;
          }
          planRounds.add(planRound);

          const size = asFiniteNumber(entry.size);
          const performance = asFiniteNumber(entry.performance);
          if (size === null) {
            errors.push(`${planLabel}.size must be a finite number.`);
            return null;
          }
          if (performance === null) {
            errors.push(`${planLabel}.performance must be a finite number.`);
            return null;
          }

          const clamped = clampPoint({ size, performance }, mergedBounds);
          return {
            round: planRound,
            size: clamped.size,
            performance: clamped.performance,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.round - b.round);
    }

    const normalizedStart = clampPoint(
      {
        size: startSize !== null ? startSize : 0,
        performance: startPerformance !== null ? startPerformance : 0,
      },
      mergedBounds
    );

    normalized.products.push({
      id: id || `product-${index + 1}`,
      name: nameValue || `Product ${index + 1}`,
      tag: ALLOWED_TAGS.includes(tag) ? tag : 'existing',
      color: color || '#111827',
      icon: ALLOWED_ICONS.includes(icon) ? icon : 'circle',
      start: normalizedStart,
      repositionPlan,
    });
  });

  const ui = isObject(scenario.ui) ? scenario.ui : {};
  const selectedRound = asRound(ui.selectedRound);
  if (selectedRound === null && ui.selectedRound !== undefined) {
    errors.push(`ui.selectedRound must be between 1 and ${ROUNDS}.`);
  }

  const selectedProductId = ui.selectedProductId;
  const selectedProductExists = normalized.products.some(
    (product) => product.id === selectedProductId
  );

  if (
    selectedProductId !== null &&
    selectedProductId !== undefined &&
    typeof selectedProductId !== 'string'
  ) {
    errors.push('ui.selectedProductId must be a string or null.');
  }

  normalized.ui = {
    selectedRound: selectedRound !== null ? selectedRound : 1,
    selectedProductId: selectedProductExists ? selectedProductId : null,
    showFitLines: Boolean(ui.showFitLines),
  };

  if (normalized.products.length === 0) {
    normalized.ui.selectedProductId = null;
  }

  if (!selectedProductExists && selectedProductId) {
    errors.push('ui.selectedProductId must match an existing product id.');
  }

  const valid = errors.length === 0;
  return {
    valid,
    errors,
    normalizedScenario: valid ? normalized : null,
  };
}

function validateScenario(input) {
  const result = normalizeScenario(input);
  return {
    valid: result.valid,
    errors: result.errors,
  };
}

module.exports = {
  normalizeScenario,
  validateScenario,
  isObject,
  asFiniteNumber,
  asRound,
};
