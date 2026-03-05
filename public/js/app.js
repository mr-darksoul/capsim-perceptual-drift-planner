import { generateId, ROUNDS } from './constants.js';
import { createStore, cloneScenario } from './state.js';
import { loadScenarioFromStorage, saveScenarioToStorage } from './storage.js';
import { createPerceptualChart } from './chart.js';
import { initUI } from './ui.js';
import { exportScenarioToFile, readJsonFile } from './importExport.js';
import { validateScenarioClient } from './validation.js';
import { clampPoint, normalizeBounds, normalizeMonthIndex, normalizeRound } from './model.js';

const ROUND_ONE_YEAR = 2027;

async function fetchPresets() {
  const response = await fetch('/api/presets');
  if (!response.ok) {
    throw new Error('Failed to load presets.');
  }
  const payload = await response.json();
  return Array.isArray(payload.presets) ? payload.presets : [];
}

async function validateScenarioServer(candidate) {
  const response = await fetch('/api/scenario/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(candidate),
  });

  const payload = await response.json();
  return payload;
}

function normalizeScenarioClient(scenario) {
  const next = cloneScenario(scenario);
  const bounds = normalizeBounds(next.chartBounds);
  const rounds = Number.parseInt(next.meta?.rounds, 10) || ROUNDS;
  next.chartBounds = bounds;

  next.segments = (next.segments || []).map((segment) => ({
    ...segment,
    start: clampPoint(segment.start, bounds),
    driftPerRound: {
      deltaSize: Number(segment.driftPerRound?.deltaSize || 0),
      deltaPerformance: Number(segment.driftPerRound?.deltaPerformance || 0),
    },
    overrides: (segment.overrides || [])
      .filter((entry) => Number.isInteger(Number(entry.round)))
      .map((entry) => ({
        round: normalizeRound(entry.round),
        ...clampPoint(entry, bounds),
      }))
      .sort((a, b) => Number(a.round) - Number(b.round)),
  }));

  next.products = (next.products || []).map((product) => ({
    ...product,
    start: clampPoint(product.start, bounds),
    repositionPlan: (product.repositionPlan || [])
      .filter((entry) => Number.isInteger(Number(entry.round)))
      .map((entry) => ({
        round: normalizeRound(entry.round),
        ...clampPoint(entry, bounds),
      }))
      .sort((a, b) => Number(a.round) - Number(b.round)),
  }));

  const selectedRound = normalizeRound(next.ui?.selectedRound);
  const selectedMonthIndex = normalizeMonthIndex(
    next.ui?.selectedMonthIndex ?? (selectedRound - 1) * 12,
    rounds
  );

  next.ui = {
    selectedRound: Math.floor(selectedMonthIndex / 12) + 1,
    selectedMonthIndex,
    selectedProductId: next.products.some((product) => product.id === next.ui?.selectedProductId)
      ? next.ui.selectedProductId
      : null,
    showFitLines: Boolean(next.ui?.showFitLines),
  };

  next.meta = {
    ...next.meta,
    rounds: ROUNDS,
    startYear: ROUND_ONE_YEAR,
  };

  return next;
}

function findPresetName(presets, scenarioName) {
  const match = presets.find((preset) => preset.meta.name === scenarioName);
  return match ? match.meta.name : null;
}

function createActions(store) {
  let playbackHandle = null;

  function stopPlayback() {
    if (playbackHandle) {
      clearInterval(playbackHandle);
      playbackHandle = null;
    }
    store.update({
      playback: { isPlaying: false },
    });
  }

  function commitScenario(nextScenario, options = {}) {
    const { activePresetName = null, preserveErrors = false } = options;
    const normalizedScenario = normalizeScenarioClient(nextScenario);
    const validation = validateScenarioClient(normalizedScenario);

    const nextState = {
      ...store.getState(),
      scenario: normalizedScenario,
      activePresetName,
      globalErrors: preserveErrors
        ? store.getState().globalErrors
        : validation.valid
        ? []
        : validation.errors,
    };

    store.setState(nextState);

    if (validation.valid) {
      saveScenarioToStorage(normalizedScenario);
    }
  }

  function updateScenario(mutator) {
    const state = store.getState();
    if (!state.scenario) {
      return;
    }
    const draft = cloneScenario(state.scenario);
    mutator(draft);
    commitScenario(draft, { activePresetName: state.activePresetName });
  }

  function updateSegment(segmentId, mutator) {
    updateScenario((scenario) => {
      const segment = scenario.segments.find((item) => item.id === segmentId);
      if (!segment) {
        return;
      }
      mutator(segment);
    });
  }

  function updateProduct(productId, mutator) {
    updateScenario((scenario) => {
      const product = scenario.products.find((item) => item.id === productId);
      if (!product) {
        return;
      }
      mutator(product);
    });
  }

  return {
    selectPreset(name) {
      const state = store.getState();
      const preset = state.presets.find((item) => item.meta.name === name);
      if (!preset) {
        return;
      }
      stopPlayback();
      const cloned = cloneScenario(preset);
      commitScenario(cloned, { activePresetName: preset.meta.name });
      store.update({ fieldErrors: {}, globalErrors: [] });
    },

    setRound(round) {
      updateScenario((scenario) => {
        const rounds = Number.parseInt(scenario.meta?.rounds, 10) || ROUNDS;
        const selectedRound = normalizeRound(round);
        scenario.ui.selectedRound = selectedRound;
        scenario.ui.selectedMonthIndex = normalizeMonthIndex((selectedRound - 1) * 12, rounds);
      });
    },

    setMonthIndex(monthIndex) {
      updateScenario((scenario) => {
        const rounds = Number.parseInt(scenario.meta?.rounds, 10) || ROUNDS;
        const normalizedMonth = normalizeMonthIndex(monthIndex, rounds);
        scenario.ui.selectedMonthIndex = normalizedMonth;
        scenario.ui.selectedRound = Math.floor(normalizedMonth / 12) + 1;
      });
    },

    togglePlayback() {
      const state = store.getState();
      if (!state.scenario) {
        return;
      }

      if (playbackHandle) {
        stopPlayback();
        return;
      }

      store.update({ playback: { isPlaying: true } });
      playbackHandle = setInterval(() => {
        const snapshot = store.getState();
        if (!snapshot.scenario) {
          stopPlayback();
          return;
        }

        const rounds = Number.parseInt(snapshot.scenario.meta?.rounds, 10) || ROUNDS;
        const maxMonthIndex = rounds * 12 - 1;
        const currentMonth = normalizeMonthIndex(
          snapshot.scenario.ui.selectedMonthIndex ?? (snapshot.scenario.ui.selectedRound - 1) * 12,
          rounds
        );
        const nextMonth = currentMonth >= maxMonthIndex ? 0 : currentMonth + 1;
        this.setMonthIndex(nextMonth);
      }, 900);
    },

    setShowFitLines(value) {
      updateScenario((scenario) => {
        scenario.ui.showFitLines = Boolean(value);
      });
    },

    setSelectedProduct(productId) {
      updateScenario((scenario) => {
        scenario.ui.selectedProductId = productId || null;
      });
    },

    updateSegment,

    updateProduct,

    addProduct() {
      updateScenario((scenario) => {
        scenario.products.push({
          id: generateId('prd'),
          name: 'New Product',
          tag: 'proposed',
          color: '#334155',
          icon: 'circle',
          start: {
            size: 10,
            performance: 10,
          },
          repositionPlan: [],
        });
      });
    },

    deleteProduct(productId) {
      updateScenario((scenario) => {
        scenario.products = scenario.products.filter((product) => product.id !== productId);
        if (scenario.ui.selectedProductId === productId) {
          scenario.ui.selectedProductId = null;
        }
      });
      const fieldErrors = { ...store.getState().fieldErrors };
      delete fieldErrors[`product:${productId}`];
      store.update({ fieldErrors });
    },

    exportScenario() {
      const scenario = store.getState().scenario;
      if (!scenario) {
        return;
      }
      exportScenarioToFile(scenario);
    },

    async importScenario(file) {
      try {
        const parsed = await readJsonFile(file);
        const result = await validateScenarioServer(parsed);

        if (!result.valid || !result.normalizedScenario) {
          store.update({ globalErrors: result.errors || ['Imported file is invalid.'] });
          return;
        }

        stopPlayback();
        const activePresetName = findPresetName(
          store.getState().presets,
          result.normalizedScenario.meta.name
        );

        commitScenario(result.normalizedScenario, {
          activePresetName,
          preserveErrors: false,
        });
        store.update({ fieldErrors: {}, globalErrors: [] });
      } catch (error) {
        store.update({ globalErrors: [error.message || 'Import failed.'] });
      }
    },

    setFieldError(key, message) {
      const fieldErrors = { ...store.getState().fieldErrors, [key]: message };
      store.update({ fieldErrors });
    },

    clearFieldError(key) {
      const fieldErrors = { ...store.getState().fieldErrors };
      delete fieldErrors[key];
      store.update({ fieldErrors });
    },

    stopPlayback,
  };
}

async function bootstrap() {
  const chartCanvas = document.getElementById('perceptual-map');
  let chartInitError = null;
  let chartController;
  try {
    chartController = createPerceptualChart(chartCanvas);
  } catch (error) {
    chartInitError = error?.message || 'Chart failed to initialize.';
    chartController = {
      update() {},
      destroy() {},
      isAvailable: false,
    };
  }

  const store = createStore({
    presets: [],
    scenario: null,
    activePresetName: null,
    playback: { isPlaying: false },
    globalErrors: [],
    fieldErrors: {},
  });

  const actions = createActions(store);

  initUI({
    store,
    actions,
    chartController,
  });

  try {
    const presets = await fetchPresets();
    if (presets.length === 0) {
      throw new Error('No presets available.');
    }

    const storedScenario = loadScenarioFromStorage();
    let initialScenario = presets[0];
    let activePresetName = presets[0].meta.name;

    if (storedScenario) {
      const validationResult = await validateScenarioServer(storedScenario);
      if (validationResult.valid && validationResult.normalizedScenario) {
        initialScenario = validationResult.normalizedScenario;
        activePresetName = findPresetName(presets, initialScenario.meta.name);
      }
    }

    const normalizedInitialScenario = normalizeScenarioClient(initialScenario);

    store.setState({
      presets,
      scenario: normalizedInitialScenario,
      activePresetName,
      playback: { isPlaying: false },
      globalErrors:
        chartInitError || chartController.isAvailable === false
          ? [
              chartInitError ||
                'Chart library failed to load. Refresh the page. If issue persists, restart npm start.',
            ]
          : [],
      fieldErrors: {},
    });

    saveScenarioToStorage(normalizedInitialScenario);
  } catch (error) {
    store.update({
      globalErrors: [error.message || 'Failed to initialize the app.'],
    });
    actions.stopPlayback();
  }
}

bootstrap();
