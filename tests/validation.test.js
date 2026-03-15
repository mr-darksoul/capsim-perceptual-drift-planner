'use strict';

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeScenario } = require('../lib/validation');

const presetsPath = path.join(__dirname, '..', 'data', 'presets.json');
const presetsFile = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));

test('baseline preset validates successfully', () => {
  const baseline = presetsFile.presets[0];
  const result = normalizeScenario(baseline);
  assert.equal(result.valid, true);
  assert.ok(result.normalizedScenario);
});

test('invalid round in override fails validation', () => {
  const baseline = JSON.parse(JSON.stringify(presetsFile.presets[0]));
  baseline.segments[0].overrides = [{ round: 9, size: 10, performance: 10 }];

  const result = normalizeScenario(baseline);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('must be an integer from 1 to 4')));
});

test('duplicate product names fail validation', () => {
  const baseline = JSON.parse(JSON.stringify(presetsFile.presets[0]));
  baseline.products[1].name = baseline.products[0].name;

  const result = normalizeScenario(baseline);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('duplicate name') || error.includes('must be unique')));
});

test('non-finite values fail validation', () => {
  const baseline = JSON.parse(JSON.stringify(presetsFile.presets[0]));
  baseline.products[0].start.size = 'abc';

  const result = normalizeScenario(baseline);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('finite number')));
});
