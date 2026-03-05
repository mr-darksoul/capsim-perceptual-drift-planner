'use strict';

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../server');

const presetsPath = path.join(__dirname, '..', 'data', 'presets.json');
const presetsFile = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));

test('api endpoints return expected payloads', async () => {
  const app = createApp();
  const server = app.listen(0);

  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
    const healthBody = await health.json();
    assert.deepEqual(healthBody, { status: 'ok' });

    const presetsRes = await fetch(`${baseUrl}/api/presets`);
    assert.equal(presetsRes.status, 200);
    const presetsBody = await presetsRes.json();
    assert.equal(Array.isArray(presetsBody.presets), true);
    assert.equal(presetsBody.presets.length >= 2, true);

    const validateRes = await fetch(`${baseUrl}/api/scenario/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(presetsFile.presets[0]),
    });
    assert.equal(validateRes.status, 200);
    const validateBody = await validateRes.json();
    assert.equal(validateBody.valid, true);
    assert.ok(validateBody.normalizedScenario);

    const invalid = JSON.parse(JSON.stringify(presetsFile.presets[0]));
    invalid.meta.rounds = 10;
    const invalidRes = await fetch(`${baseUrl}/api/scenario/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalid),
    });
    assert.equal(invalidRes.status, 400);
    const invalidBody = await invalidRes.json();
    assert.equal(invalidBody.valid, false);
    assert.equal(invalidBody.normalizedScenario, null);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});
