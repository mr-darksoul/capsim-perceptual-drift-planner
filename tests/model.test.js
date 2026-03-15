'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getSegmentPositionAtRound,
  getProductPositionAtRound,
  clampPoint,
} = require('../lib/model');

const bounds = {
  sizeMin: 0,
  sizeMax: 20,
  performanceMin: 0,
  performanceMax: 20,
};

test('segment uses start values for round 1', () => {
  const segment = {
    start: { size: 13.9, performance: 6.1 },
    driftPerRound: { deltaSize: -0.7, deltaPerformance: 0.7 },
    overrides: [],
  };

  const point = getSegmentPositionAtRound(segment, 1, bounds);
  assert.ok(Math.abs(point.size - 13.2) < 1e-9);
  assert.ok(Math.abs(point.performance - 6.8) < 1e-9);
});

test('segment drift applies for non-overridden rounds', () => {
  const segment = {
    start: { size: 13.9, performance: 6.1 },
    driftPerRound: { deltaSize: -0.7, deltaPerformance: 0.7 },
    overrides: [],
  };

  const point = getSegmentPositionAtRound(segment, 4, bounds);
  assert.ok(Math.abs(point.size - 11.1) < 1e-9);
  assert.ok(Math.abs(point.performance - 8.9) < 1e-9);
});

test('segment override takes precedence over drift', () => {
  const segment = {
    start: { size: 13.9, performance: 6.1 },
    driftPerRound: { deltaSize: -0.7, deltaPerformance: 0.7 },
    overrides: [{ round: 4, size: 16, performance: 16 }],
  };

  const point = getSegmentPositionAtRound(segment, 4, bounds);
  assert.equal(point.size, 16);
  assert.equal(point.performance, 16);
});

test('points are clamped to chart bounds', () => {
  const clamped = clampPoint({ size: -5, performance: 30 }, bounds);
  assert.equal(clamped.size, 0);
  assert.equal(clamped.performance, 20);
});

test('product stays at start position across rounds', () => {
  const product = {
    start: { size: 10, performance: 10 },
    repositionPlan: [
      { round: 3, size: 11, performance: 12 },
      { round: 6, size: 13, performance: 15 },
    ],
  };

  const atRound2 = getProductPositionAtRound(product, 2, bounds);
  const atRound4 = getProductPositionAtRound(product, 4, bounds);
  const atRound8 = getProductPositionAtRound(product, 8, bounds);

  assert.deepEqual(atRound2, { size: 10, performance: 10 });
  assert.deepEqual(atRound4, { size: 10, performance: 10 });
  assert.deepEqual(atRound8, { size: 10, performance: 10 });
});
