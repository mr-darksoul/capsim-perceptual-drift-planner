import { ICON_OPTIONS, ROUNDS, TAG_OPTIONS } from './constants.js';

export function parseFinite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function parseRound(value) {
  const round = Number.parseInt(value, 10);
  if (!Number.isInteger(round)) {
    return null;
  }
  if (round < 1 || round > ROUNDS) {
    return null;
  }
  return round;
}

export function validateScenarioClient(scenario) {
  const errors = [];

  if (!scenario || typeof scenario !== 'object') {
    return {
      valid: false,
      errors: ['Scenario is missing or invalid.'],
    };
  }

  if (!Array.isArray(scenario.segments) || scenario.segments.length === 0) {
    errors.push('At least one segment is required.');
  }

  if (!Array.isArray(scenario.products)) {
    errors.push('Products must be an array.');
  }

  const segmentIds = new Set();
  const segmentNames = new Set();
  (scenario.segments || []).forEach((segment, index) => {
    if (!segment?.id) {
      errors.push(`Segment ${index + 1}: id is required.`);
    }
    if (segmentIds.has(segment?.id)) {
      errors.push(`Segment ${index + 1}: duplicate id.`);
    }
    segmentIds.add(segment?.id);

    const nameKey = String(segment?.name || '').trim().toLowerCase();
    if (!nameKey) {
      errors.push(`Segment ${index + 1}: name is required.`);
    }
    if (segmentNames.has(nameKey)) {
      errors.push(`Segment ${index + 1}: duplicate name.`);
    }
    segmentNames.add(nameKey);

    if (parseFinite(segment?.start?.size) === null) {
      errors.push(`Segment ${index + 1}: start size must be numeric.`);
    }
    if (parseFinite(segment?.start?.performance) === null) {
      errors.push(`Segment ${index + 1}: start performance must be numeric.`);
    }
    if (parseFinite(segment?.driftPerRound?.deltaSize) === null) {
      errors.push(`Segment ${index + 1}: drift delta size must be numeric.`);
    }
    if (parseFinite(segment?.driftPerRound?.deltaPerformance) === null) {
      errors.push(`Segment ${index + 1}: drift delta performance must be numeric.`);
    }

    const overrideRounds = new Set();
    (segment?.overrides || []).forEach((override, overrideIndex) => {
      const round = parseRound(override?.round);
      if (round === null) {
        errors.push(
          `Segment ${index + 1} override ${overrideIndex + 1}: round must be 1-${ROUNDS}.`
        );
      } else if (overrideRounds.has(round)) {
        errors.push(
          `Segment ${index + 1} override ${overrideIndex + 1}: duplicate round ${round}.`
        );
      } else {
        overrideRounds.add(round);
      }

      if (parseFinite(override?.size) === null) {
        errors.push(`Segment ${index + 1} override ${overrideIndex + 1}: size must be numeric.`);
      }
      if (parseFinite(override?.performance) === null) {
        errors.push(
          `Segment ${index + 1} override ${overrideIndex + 1}: performance must be numeric.`
        );
      }
    });
  });

  const productIds = new Set();
  const productNames = new Set();
  (scenario.products || []).forEach((product, index) => {
    if (!product?.id) {
      errors.push(`Product ${index + 1}: id is required.`);
    }
    if (productIds.has(product?.id)) {
      errors.push(`Product ${index + 1}: duplicate id.`);
    }
    productIds.add(product?.id);

    const nameKey = String(product?.name || '').trim().toLowerCase();
    if (!nameKey) {
      errors.push(`Product ${index + 1}: name is required.`);
    }
    if (productNames.has(nameKey)) {
      errors.push(`Product ${index + 1}: duplicate name.`);
    }
    productNames.add(nameKey);

    if (!TAG_OPTIONS.includes(product?.tag)) {
      errors.push(`Product ${index + 1}: tag must be ${TAG_OPTIONS.join(' or ')}.`);
    }

    if (!ICON_OPTIONS.includes(product?.icon)) {
      errors.push(`Product ${index + 1}: icon is invalid.`);
    }

    if (parseFinite(product?.start?.size) === null) {
      errors.push(`Product ${index + 1}: start size must be numeric.`);
    }

    if (parseFinite(product?.start?.performance) === null) {
      errors.push(`Product ${index + 1}: start performance must be numeric.`);
    }

    const planRounds = new Set();
    (product?.repositionPlan || []).forEach((entry, planIndex) => {
      const round = parseRound(entry?.round);
      if (round === null) {
        errors.push(
          `Product ${index + 1} reposition ${planIndex + 1}: round must be 1-${ROUNDS}.`
        );
      } else if (planRounds.has(round)) {
        errors.push(
          `Product ${index + 1} reposition ${planIndex + 1}: duplicate round ${round}.`
        );
      } else {
        planRounds.add(round);
      }

      if (parseFinite(entry?.size) === null) {
        errors.push(`Product ${index + 1} reposition ${planIndex + 1}: size must be numeric.`);
      }
      if (parseFinite(entry?.performance) === null) {
        errors.push(
          `Product ${index + 1} reposition ${planIndex + 1}: performance must be numeric.`
        );
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
