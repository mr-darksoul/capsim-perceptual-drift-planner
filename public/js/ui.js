import { ICON_OPTIONS, TAG_OPTIONS, getRoundsList } from './constants.js';
import { computeFitForRound } from './fit.js';
import { buildRoundSnapshot } from './model.js';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function findByRound(entries, round) {
  return (entries || []).find((entry) => Number(entry.round) === round) || null;
}

function formatNumber(value, fractionDigits = 2) {
  if (!Number.isFinite(Number(value))) {
    return '-';
  }
  return Number(value).toFixed(fractionDigits);
}

function renderScenarioOptions(selectElement, presets, selectedName) {
  const selectedExists = presets.some((preset) => preset.meta.name === selectedName);
  const optionsSource = [...presets];

  if (selectedName && !selectedExists) {
    optionsSource.unshift({
      meta: { name: selectedName },
      _isCustom: true,
    });
  }

  const options = optionsSource
    .map((preset) => {
      const isSelected = preset.meta.name === selectedName ? 'selected' : '';
      const label = preset._isCustom ? `${preset.meta.name} (custom)` : preset.meta.name;
      return `<option value="${escapeHtml(preset.meta.name)}" ${isSelected}>${escapeHtml(
        label
      )}</option>`;
    })
    .join('');
  selectElement.innerHTML = options;
}

function renderCustomLegend(container, scenario, round) {
  const snapshot = buildRoundSnapshot(scenario, round);

  const segmentItems = snapshot.segments
    .map(
      (segment) => `
        <li>
          <span class="legend-swatch" style="background:${escapeHtml(segment.color)}"></span>
          <span>${escapeHtml(segment.name)} (segment)</span>
        </li>
      `
    )
    .join('');

  const productItems = snapshot.products
    .map(
      (product) => `
        <li>
          <span class="legend-swatch" style="background:${escapeHtml(product.color)}"></span>
          <span>${escapeHtml(product.name)} (${escapeHtml(product.tag)})</span>
        </li>
      `
    )
    .join('');

  container.innerHTML = `
    <div class="legend-group">
      <h4>Segments</h4>
      <ul>${segmentItems || '<li>No segments</li>'}</ul>
    </div>
    <div class="legend-group">
      <h4>Products</h4>
      <ul>${productItems || '<li>No products</li>'}</ul>
    </div>
  `;
}

function renderRoundSelect(selectElement, selectedRound) {
  const options = getRoundsList()
    .map((round) => {
      const selected = round === selectedRound ? 'selected' : '';
      return `<option value="${round}" ${selected}>Round ${round}</option>`;
    })
    .join('');
  selectElement.innerHTML = options;
}

function renderSelectedProductSelect(selectElement, products, selectedProductId) {
  const base = '<option value="">None</option>';
  const options = products
    .map((product) => {
      const selected = product.id === selectedProductId ? 'selected' : '';
      return `<option value="${escapeHtml(product.id)}" ${selected}>${escapeHtml(
        product.name
      )}</option>`;
    })
    .join('');
  selectElement.innerHTML = base + options;
}

function renderSegmentEditor(container, scenario, fieldErrors) {
  const rounds = getRoundsList();

  container.innerHTML = scenario.segments
    .map((segment) => {
      const cardError = fieldErrors[`segment:${segment.id}`];
      const rows = rounds
        .map((round) => {
          const override = findByRound(segment.overrides, round);
          return `
            <tr>
              <td>R${round}</td>
              <td>
                <input
                  type="number"
                  step="0.1"
                  data-action="segment-override-size"
                  data-segment-id="${escapeHtml(segment.id)}"
                  data-round="${round}"
                  value="${override ? escapeHtml(override.size) : ''}"
                  placeholder="auto"
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.1"
                  data-action="segment-override-performance"
                  data-segment-id="${escapeHtml(segment.id)}"
                  data-round="${round}"
                  value="${override ? escapeHtml(override.performance) : ''}"
                  placeholder="auto"
                />
              </td>
            </tr>
          `;
        })
        .join('');

      return `
        <article class="entity-card" data-segment-id="${escapeHtml(segment.id)}">
          <h4>${escapeHtml(segment.name)}</h4>
          <div class="grid-2">
            <label>Name
              <input type="text" data-action="segment-name" data-segment-id="${escapeHtml(
                segment.id
              )}" value="${escapeHtml(segment.name)}" />
            </label>
            <label>Color
              <input type="color" data-action="segment-color" data-segment-id="${escapeHtml(
                segment.id
              )}" value="${escapeHtml(segment.color)}" />
            </label>
            <label>Start Size
              <input type="number" step="0.1" data-action="segment-start-size" data-segment-id="${escapeHtml(
                segment.id
              )}" value="${escapeHtml(segment.start.size)}" />
            </label>
            <label>Start Performance
              <input type="number" step="0.1" data-action="segment-start-performance" data-segment-id="${escapeHtml(
                segment.id
              )}" value="${escapeHtml(segment.start.performance)}" />
            </label>
            <label>Drift Δ Size
              <input type="number" step="0.1" data-action="segment-drift-size" data-segment-id="${escapeHtml(
                segment.id
              )}" value="${escapeHtml(segment.driftPerRound.deltaSize)}" />
            </label>
            <label>Drift Δ Performance
              <input type="number" step="0.1" data-action="segment-drift-performance" data-segment-id="${escapeHtml(
                segment.id
              )}" value="${escapeHtml(segment.driftPerRound.deltaPerformance)}" />
            </label>
          </div>
          <details>
            <summary>Fine tune overrides by round</summary>
            <table class="plan-table">
              <thead><tr><th>Round</th><th>Size</th><th>Performance</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <p class="hint">Leave both fields blank for a round to use drift-based auto position.</p>
          </details>
          ${cardError ? `<p class="inline-error">${escapeHtml(cardError)}</p>` : ''}
        </article>
      `;
    })
    .join('');
}

function renderProductEditor(container, scenario, fieldErrors) {
  const rounds = getRoundsList();

  container.innerHTML = scenario.products
    .map((product) => {
      const cardError = fieldErrors[`product:${product.id}`];
      const rows = rounds
        .map((round) => {
          const step = findByRound(product.repositionPlan, round);
          return `
            <tr>
              <td>R${round}</td>
              <td>
                <input
                  type="number"
                  step="0.1"
                  data-action="product-plan-size"
                  data-product-id="${escapeHtml(product.id)}"
                  data-round="${round}"
                  value="${step ? escapeHtml(step.size) : ''}"
                  placeholder="none"
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.1"
                  data-action="product-plan-performance"
                  data-product-id="${escapeHtml(product.id)}"
                  data-round="${round}"
                  value="${step ? escapeHtml(step.performance) : ''}"
                  placeholder="none"
                />
              </td>
            </tr>
          `;
        })
        .join('');

      return `
        <article class="entity-card" data-product-id="${escapeHtml(product.id)}">
          <div class="card-title-row">
            <h4>${escapeHtml(product.name)}</h4>
            <button class="danger" data-action="product-delete" data-product-id="${escapeHtml(
              product.id
            )}">Delete</button>
          </div>
          <div class="grid-2">
            <label>Name
              <input type="text" data-action="product-name" data-product-id="${escapeHtml(
                product.id
              )}" value="${escapeHtml(product.name)}" />
            </label>
            <label>Tag
              <select data-action="product-tag" data-product-id="${escapeHtml(product.id)}">
                ${TAG_OPTIONS.map((tag) => {
                  const selected = product.tag === tag ? 'selected' : '';
                  return `<option value="${tag}" ${selected}>${tag}</option>`;
                }).join('')}
              </select>
            </label>
            <label>Color
              <input type="color" data-action="product-color" data-product-id="${escapeHtml(
                product.id
              )}" value="${escapeHtml(product.color)}" />
            </label>
            <label>Icon
              <select data-action="product-icon" data-product-id="${escapeHtml(product.id)}">
                ${ICON_OPTIONS.map((icon) => {
                  const selected = product.icon === icon ? 'selected' : '';
                  return `<option value="${icon}" ${selected}>${icon}</option>`;
                }).join('')}
              </select>
            </label>
            <label>Start Size
              <input type="number" step="0.1" data-action="product-start-size" data-product-id="${escapeHtml(
                product.id
              )}" value="${escapeHtml(product.start.size)}" />
            </label>
            <label>Start Performance
              <input type="number" step="0.1" data-action="product-start-performance" data-product-id="${escapeHtml(
                product.id
              )}" value="${escapeHtml(product.start.performance)}" />
            </label>
          </div>
          <details>
            <summary>Per-round reposition plan (absolute positions)</summary>
            <table class="plan-table">
              <thead><tr><th>Round</th><th>Size</th><th>Performance</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <p class="hint">Leave both fields blank for a round to keep the latest planned position.</p>
          </details>
          ${cardError ? `<p class="inline-error">${escapeHtml(cardError)}</p>` : ''}
        </article>
      `;
    })
    .join('');
}

function renderFitTable(tbody, scenario, round) {
  const fitRows = computeFitForRound(scenario, round);

  tbody.innerHTML = fitRows
    .map((row) => {
      const allDistances = row.distances
        .map((distance) => `${escapeHtml(distance.segmentName)}: ${formatNumber(distance.distance, 2)}`)
        .join(' | ');

      return `
        <tr>
          <td>${escapeHtml(row.productName)} <span class="pill">${escapeHtml(row.productTag)}</span></td>
          <td>${escapeHtml(row.nearestSegmentName)}</td>
          <td>${formatNumber(row.nearestDistance, 3)}</td>
          <td>${allDistances}</td>
        </tr>
      `;
    })
    .join('');
}

function renderErrors(container, errors) {
  if (!errors || errors.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="error-box">
      <strong>Validation issues</strong>
      <ul>
        ${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}
      </ul>
    </div>
  `;
}

function parseNumericInput(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function initUI({ store, actions, chartController }) {
  const scenarioSelect = document.getElementById('scenario-select');
  const roundSlider = document.getElementById('round-slider');
  const roundSelect = document.getElementById('round-select');
  const roundLabel = document.getElementById('round-label');
  const yearLabel = document.getElementById('year-label');
  const playPauseButton = document.getElementById('play-pause');
  const showLinesCheckbox = document.getElementById('show-fit-lines');
  const lineProductSelect = document.getElementById('line-product-select');

  const segmentEditor = document.getElementById('segment-editor');
  const productEditor = document.getElementById('product-editor');
  const addProductButton = document.getElementById('add-product');

  const fitTableBody = document.getElementById('fit-table-body');
  const legendContainer = document.getElementById('custom-legend');

  const exportButton = document.getElementById('export-json');
  const importInput = document.getElementById('import-json');
  const globalErrorsContainer = document.getElementById('global-errors');

  scenarioSelect.addEventListener('change', (event) => {
    actions.selectPreset(event.target.value);
  });

  roundSlider.addEventListener('input', (event) => {
    actions.setRound(Number(event.target.value));
  });

  roundSelect.addEventListener('change', (event) => {
    actions.setRound(Number(event.target.value));
  });

  playPauseButton.addEventListener('click', () => {
    actions.togglePlayback();
  });

  showLinesCheckbox.addEventListener('change', (event) => {
    actions.setShowFitLines(Boolean(event.target.checked));
  });

  lineProductSelect.addEventListener('change', (event) => {
    actions.setSelectedProduct(event.target.value || null);
  });

  addProductButton.addEventListener('click', () => {
    actions.addProduct();
  });

  exportButton.addEventListener('click', () => {
    actions.exportScenario();
  });

  importInput.addEventListener('change', (event) => {
    const [file] = event.target.files || [];
    if (file) {
      actions.importScenario(file);
    }
    event.target.value = '';
  });

  segmentEditor.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) {
      return;
    }
    const action = target.dataset.action;
    const segmentId = target.dataset.segmentId;
    const round = Number(target.dataset.round);
    if (!action || !segmentId) {
      return;
    }

    const inputErrorKey = `segment:${segmentId}`;

    if (action === 'segment-name') {
      if (!target.value.trim()) {
        actions.setFieldError(inputErrorKey, 'Segment name cannot be blank.');
        return;
      }
      actions.clearFieldError(inputErrorKey);
      actions.updateSegment(segmentId, (segment) => {
        segment.name = target.value.trim();
      });
      return;
    }

    if (action === 'segment-color') {
      actions.clearFieldError(inputErrorKey);
      actions.updateSegment(segmentId, (segment) => {
        segment.color = target.value;
      });
      return;
    }

    const parsed = parseNumericInput(target.value);

    if (action === 'segment-override-size' || action === 'segment-override-performance') {
      const card = target.closest(`[data-segment-id="${segmentId}"]`);
      const sizeInput = card?.querySelector(
        `input[data-action="segment-override-size"][data-round="${round}"]`
      );
      const performanceInput = card?.querySelector(
        `input[data-action="segment-override-performance"][data-round="${round}"]`
      );
      const sizeValue = parseNumericInput(sizeInput?.value);
      const performanceValue = parseNumericInput(performanceInput?.value);

      if ((sizeInput?.value || '') === '' && (performanceInput?.value || '') === '') {
        actions.clearFieldError(inputErrorKey);
        actions.updateSegment(segmentId, (segment) => {
          segment.overrides = (segment.overrides || []).filter(
            (entry) => Number(entry.round) !== round
          );
        });
        return;
      }

      if (sizeValue === null || performanceValue === null) {
        actions.setFieldError(
          inputErrorKey,
          `Segment override round ${round} requires numeric Size and Performance.`
        );
        return;
      }

      actions.clearFieldError(inputErrorKey);
      actions.updateSegment(segmentId, (segment) => {
        const overrides = (segment.overrides || []).filter(
          (entry) => Number(entry.round) !== round
        );
        overrides.push({
          round,
          size: sizeValue,
          performance: performanceValue,
        });
        overrides.sort((a, b) => Number(a.round) - Number(b.round));
        segment.overrides = overrides;
      });
      return;
    }

    if (parsed === null) {
      actions.setFieldError(inputErrorKey, 'Numeric fields require finite numbers.');
      return;
    }

    actions.clearFieldError(inputErrorKey);
    actions.updateSegment(segmentId, (segment) => {
      if (action === 'segment-start-size') {
        segment.start.size = parsed;
      }
      if (action === 'segment-start-performance') {
        segment.start.performance = parsed;
      }
      if (action === 'segment-drift-size') {
        segment.driftPerRound.deltaSize = parsed;
      }
      if (action === 'segment-drift-performance') {
        segment.driftPerRound.deltaPerformance = parsed;
      }
    });
  });

  productEditor.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const action = target.dataset.action;
    const productId = target.dataset.productId;

    if (action === 'product-delete' && productId) {
      actions.deleteProduct(productId);
    }
  });

  productEditor.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) {
      return;
    }

    const action = target.dataset.action;
    const productId = target.dataset.productId;
    const round = Number(target.dataset.round);
    if (!action || !productId) {
      return;
    }

    const inputErrorKey = `product:${productId}`;

    if (action === 'product-name') {
      if (!target.value.trim()) {
        actions.setFieldError(inputErrorKey, 'Product name cannot be blank.');
        return;
      }
      actions.clearFieldError(inputErrorKey);
      actions.updateProduct(productId, (product) => {
        product.name = target.value.trim();
      });
      return;
    }

    if (action === 'product-tag') {
      actions.clearFieldError(inputErrorKey);
      actions.updateProduct(productId, (product) => {
        product.tag = target.value;
      });
      return;
    }

    if (action === 'product-color') {
      actions.clearFieldError(inputErrorKey);
      actions.updateProduct(productId, (product) => {
        product.color = target.value;
      });
      return;
    }

    if (action === 'product-icon') {
      actions.clearFieldError(inputErrorKey);
      actions.updateProduct(productId, (product) => {
        product.icon = target.value;
      });
      return;
    }

    if (action === 'product-plan-size' || action === 'product-plan-performance') {
      const card = target.closest(`[data-product-id="${productId}"]`);
      const sizeInput = card?.querySelector(
        `input[data-action="product-plan-size"][data-round="${round}"]`
      );
      const performanceInput = card?.querySelector(
        `input[data-action="product-plan-performance"][data-round="${round}"]`
      );
      const sizeValue = parseNumericInput(sizeInput?.value);
      const performanceValue = parseNumericInput(performanceInput?.value);

      if ((sizeInput?.value || '') === '' && (performanceInput?.value || '') === '') {
        actions.clearFieldError(inputErrorKey);
        actions.updateProduct(productId, (product) => {
          product.repositionPlan = (product.repositionPlan || []).filter(
            (entry) => Number(entry.round) !== round
          );
        });
        return;
      }

      if (sizeValue === null || performanceValue === null) {
        actions.setFieldError(
          inputErrorKey,
          `Product reposition round ${round} requires numeric Size and Performance.`
        );
        return;
      }

      actions.clearFieldError(inputErrorKey);
      actions.updateProduct(productId, (product) => {
        const steps = (product.repositionPlan || []).filter(
          (entry) => Number(entry.round) !== round
        );
        steps.push({ round, size: sizeValue, performance: performanceValue });
        steps.sort((a, b) => Number(a.round) - Number(b.round));
        product.repositionPlan = steps;
      });
      return;
    }

    const parsed = parseNumericInput(target.value);
    if (parsed === null) {
      actions.setFieldError(inputErrorKey, 'Numeric fields require finite numbers.');
      return;
    }

    actions.clearFieldError(inputErrorKey);
    actions.updateProduct(productId, (product) => {
      if (action === 'product-start-size') {
        product.start.size = parsed;
      }
      if (action === 'product-start-performance') {
        product.start.performance = parsed;
      }
    });
  });

  function render(state) {
    if (!state.scenario) {
      return;
    }

    const { scenario, presets, playback, globalErrors, fieldErrors } = state;
    const selectedRound = Number(scenario.ui.selectedRound || 1);

    renderScenarioOptions(scenarioSelect, presets, state.activePresetName);
    roundSlider.value = String(selectedRound);
    renderRoundSelect(roundSelect, selectedRound);
    roundLabel.textContent = `Round ${selectedRound}`;
    yearLabel.textContent = `Year ${Number(scenario.meta.startYear) + (selectedRound - 1)}`;

    playPauseButton.textContent = playback.isPlaying ? 'Pause' : 'Play';

    showLinesCheckbox.checked = Boolean(scenario.ui.showFitLines);
    renderSelectedProductSelect(
      lineProductSelect,
      scenario.products,
      scenario.ui.selectedProductId
    );

    renderSegmentEditor(segmentEditor, scenario, fieldErrors);
    renderProductEditor(productEditor, scenario, fieldErrors);
    renderFitTable(fitTableBody, scenario, selectedRound);
    renderCustomLegend(legendContainer, scenario, selectedRound);
    renderErrors(globalErrorsContainer, globalErrors);

    chartController.update({
      scenario,
      round: selectedRound,
      selectedProductId: scenario.ui.selectedProductId,
      showFitLines: scenario.ui.showFitLines,
    });
  }

  store.subscribe(render);
  render(store.getState());
}
