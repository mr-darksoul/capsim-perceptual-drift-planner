'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { euclideanDistance, computeFitForRound } = require('../lib/fit');

test('euclideanDistance computes expected value', () => {
  const distance = euclideanDistance(
    { size: 0, performance: 0 },
    { size: 3, performance: 4 }
  );
  assert.equal(distance, 5);
});

test('computeFitForRound returns nearest segment per product', () => {
  const scenario = {
    chartBounds: { sizeMin: 0, sizeMax: 20, performanceMin: 0, performanceMax: 20 },
    segments: [
      {
        id: 'seg-a',
        name: 'A',
        color: '#111',
        start: { size: 5, performance: 5 },
        driftPerRound: { deltaSize: 0, deltaPerformance: 0 },
        overrides: [],
      },
      {
        id: 'seg-b',
        name: 'B',
        color: '#222',
        start: { size: 15, performance: 15 },
        driftPerRound: { deltaSize: 0, deltaPerformance: 0 },
        overrides: [],
      },
    ],
    products: [
      {
        id: 'prd-1',
        name: 'P1',
        tag: 'existing',
        color: '#000',
        icon: 'circle',
        start: { size: 6, performance: 5 },
        repositionPlan: [],
      },
    ],
  };

  const [row] = computeFitForRound(scenario, 1);
  assert.equal(row.nearestSegmentName, 'A');
  assert.ok(row.nearestDistance < 2);
  assert.equal(row.distances.length, 2);
});

test('ties keep first segment encountered', () => {
  const scenario = {
    chartBounds: { sizeMin: 0, sizeMax: 20, performanceMin: 0, performanceMax: 20 },
    segments: [
      {
        id: 'seg-a',
        name: 'A',
        color: '#111',
        start: { size: 4, performance: 5 },
        driftPerRound: { deltaSize: 0, deltaPerformance: 0 },
        overrides: [],
      },
      {
        id: 'seg-b',
        name: 'B',
        color: '#222',
        start: { size: 6, performance: 5 },
        driftPerRound: { deltaSize: 0, deltaPerformance: 0 },
        overrides: [],
      },
    ],
    products: [
      {
        id: 'prd-1',
        name: 'P1',
        tag: 'existing',
        color: '#000',
        icon: 'circle',
        start: { size: 5, performance: 5 },
        repositionPlan: [],
      },
    ],
  };

  const [row] = computeFitForRound(scenario, 1);
  assert.equal(row.nearestSegmentName, 'A');
});
