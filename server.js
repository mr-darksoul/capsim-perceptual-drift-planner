'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const { normalizeScenario } = require('./lib/validation');

const PRESETS_PATH = path.join(__dirname, 'data', 'presets.json');

function loadPresets() {
  const raw = fs.readFileSync(PRESETS_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.presets)) {
    throw new Error('Invalid presets.json format: expected { "presets": [] }.');
  }

  const normalizedPresets = [];
  for (let i = 0; i < parsed.presets.length; i += 1) {
    const result = normalizeScenario(parsed.presets[i]);
    if (!result.valid || !result.normalizedScenario) {
      const detail = result.errors.join('; ');
      throw new Error(`Preset at index ${i} is invalid: ${detail}`);
    }
    normalizedPresets.push(result.normalizedScenario);
  }

  return normalizedPresets;
}

function createApp() {
  const app = express();
  const presets = loadPresets();

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/presets', (_req, res) => {
    res.json({ presets });
  });

  app.post('/api/scenario/validate', (req, res) => {
    const candidate = req.body && req.body.scenario ? req.body.scenario : req.body;
    const result = normalizeScenario(candidate);

    res.status(result.valid ? 200 : 400).json({
      valid: result.valid,
      errors: result.errors,
      normalizedScenario: result.normalizedScenario,
    });
  });

  app.use('/vendor/chartjs', express.static(path.join(__dirname, 'node_modules', 'chart.js', 'dist')));
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  return app;
}

function startServer() {
  const app = createApp();
  const port = Number(process.env.PORT) || 3000;
  return app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Capstone planner running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer,
  loadPresets,
};
