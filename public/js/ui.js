import { ICON_OPTIONS, TAG_OPTIONS, ROUNDS, getRoundsList } from './constants.js';
import { computeFitForMonth } from './fit.js';
import { buildMonthSnapshot } from './model.js';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
  const snapshot = buildMonthSnapshot(scenario, round);

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
  container.innerHTML = scenario.segments
    .map((segment) => {
      const cardError = fieldErrors[`segment:${segment.id}`];

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
            <label>Round 0 Size (End)
              <input type="number" step="0.1" data-action="segment-start-size" data-segment-id="${escapeHtml(
                segment.id
              )}" value="${escapeHtml(segment.start.size)}" />
            </label>
            <label>Round 0 Performance (End)
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
          ${cardError ? `<p class="inline-error">${escapeHtml(cardError)}</p>` : ''}
        </article>
      `;
    })
    .join('');
}

function renderProductEditor(container, scenario, fieldErrors) {
  container.innerHTML = scenario.products
    .map((product) => {
      const cardError = fieldErrors[`product:${product.id}`];

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
          ${cardError ? `<p class="inline-error">${escapeHtml(cardError)}</p>` : ''}
        </article>
      `;
    })
    .join('');
}

function renderFitTable(tbody, scenario, monthIndex) {
  const fitRows = computeFitForMonth(scenario, monthIndex);

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
    actions.setMonthIndex(Number(event.target.value));
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
    const totalMonths = Number(scenario.meta?.rounds || ROUNDS) * 12;
    const selectedRound = Number(scenario.ui.selectedRound || 1);
    const selectedMonthIndex = Number.isInteger(Number(scenario.ui.selectedMonthIndex))
      ? Number(scenario.ui.selectedMonthIndex)
      : (selectedRound - 1) * 12;
    const monthInRound = (selectedMonthIndex % 12) + 1;
    const monthName = MONTH_NAMES[selectedMonthIndex % 12] || MONTH_NAMES[0];
    const selectedYear = Number(scenario.meta.startYear) + Math.floor(selectedMonthIndex / 12);

    renderScenarioOptions(scenarioSelect, presets, state.activePresetName);
    roundSlider.min = '0';
    roundSlider.max = String(Math.max(0, totalMonths - 1));
    roundSlider.step = '1';
    roundSlider.value = String(selectedMonthIndex);
    renderRoundSelect(roundSelect, selectedRound);
    roundLabel.textContent = `Round ${selectedRound} - Month ${monthInRound}/12`;
    yearLabel.textContent = `${monthName} ${selectedYear} (Month ${selectedMonthIndex + 1}/${totalMonths})`;

    playPauseButton.textContent = playback.isPlaying ? 'Pause' : 'Play';

    showLinesCheckbox.checked = Boolean(scenario.ui.showFitLines);
    renderSelectedProductSelect(
      lineProductSelect,
      scenario.products,
      scenario.ui.selectedProductId
    );

    renderSegmentEditor(segmentEditor, scenario, fieldErrors);
    renderProductEditor(productEditor, scenario, fieldErrors);
    renderFitTable(fitTableBody, scenario, selectedMonthIndex);
    renderCustomLegend(legendContainer, scenario, selectedMonthIndex);
    renderErrors(globalErrorsContainer, globalErrors);

    chartController.update({
      scenario,
      monthIndex: selectedMonthIndex,
      selectedProductId: scenario.ui.selectedProductId,
      showFitLines: scenario.ui.showFitLines,
    });
  }

  store.subscribe(render);
  render(store.getState());
}
