import { buildDistanceLines } from './fit.js';
import { buildRoundSnapshot } from './model.js';

const SEGMENT_ZONE_RADIUS_UNITS = 2.5;

const segmentZonePlugin = {
  id: 'segmentZonePlugin',
  beforeDatasetsDraw(chart, _args, pluginOptions) {
    if (!pluginOptions || pluginOptions.enabled === false) {
      return;
    }

    const zones = Array.isArray(pluginOptions.zones) ? pluginOptions.zones : [];
    if (zones.length === 0) {
      return;
    }

    const radiusUnits = Number(pluginOptions.radiusUnits) || SEGMENT_ZONE_RADIUS_UNITS;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    const { ctx } = chart;

    for (const zone of zones) {
      const centerX = xScale.getPixelForValue(zone.x);
      const centerY = yScale.getPixelForValue(zone.y);
      const radiusX = Math.abs(xScale.getPixelForValue(zone.x + radiusUnits) - centerX);
      const radiusY = Math.abs(yScale.getPixelForValue(zone.y + radiusUnits) - centerY);
      const circleRadius = Math.min(radiusX, radiusY);

      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        circleRadius
      );
      gradient.addColorStop(0, 'rgba(30, 64, 175, 0.42)');
      gradient.addColorStop(0.4, 'rgba(59, 130, 246, 0.22)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.03)');

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = gradient;
      ctx.fillRect(
        centerX - circleRadius,
        centerY - circleRadius,
        circleRadius * 2,
        circleRadius * 2
      );
      ctx.restore();

      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.stroke();
    }
  },
};

function formatPointLabel(point) {
  return `Performance ${point.x.toFixed(2)}, Size ${point.y.toFixed(2)}`;
}

export function createPerceptualChart(canvasElement) {
  if (!canvasElement || typeof window.Chart !== 'function') {
    return {
      update() {},
      destroy() {},
      isAvailable: false,
    };
  }

  const chart = new window.Chart(canvasElement, {
    plugins: [segmentZonePlugin],
    type: 'scatter',
    data: {
      datasets: [],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      animation: {
        duration: 300,
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 16,
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              const point = context.raw;
              const type = point.kind === 'segment' ? 'Segment' : 'Product';
              return `${type}: ${point.label} | Round ${point.round} | ${formatPointLabel(point)}`;
            },
          },
        },
        segmentZonePlugin: {
          enabled: true,
          radiusUnits: SEGMENT_ZONE_RADIUS_UNITS,
          zones: [],
        },
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Performance',
          },
          grid: {
            color: '#d1d5db',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Size',
          },
          grid: {
            color: '#d1d5db',
          },
        },
      },
    },
  });

  function update({ scenario, round, selectedProductId, showFitLines }) {
    const snapshot = buildRoundSnapshot(scenario, round);
    const bounds = scenario.chartBounds;

    chart.options.scales.x.min = bounds.performanceMin;
    chart.options.scales.x.max = bounds.performanceMax;
    chart.options.scales.y.min = bounds.sizeMin;
    chart.options.scales.y.max = bounds.sizeMax;

    const segmentPoints = snapshot.segments.map((segment) => ({
      x: segment.point.performance,
      y: segment.point.size,
      label: segment.name,
      id: segment.id,
      round: snapshot.round,
      kind: 'segment',
      color: segment.color,
    }));

    chart.options.plugins.segmentZonePlugin = {
      enabled: true,
      radiusUnits: SEGMENT_ZONE_RADIUS_UNITS,
      zones: segmentPoints,
    };

    const productPoints = snapshot.products.map((product) => ({
      x: product.point.performance,
      y: product.point.size,
      label: product.name,
      id: product.id,
      round: snapshot.round,
      kind: 'product',
      color: product.color,
      pointStyle: product.icon,
    }));

    const datasets = [
      {
        label: 'Segments',
        data: segmentPoints,
        pointRadius: 7,
        pointHoverRadius: 9,
        pointStyle: 'circle',
        showLine: false,
        pointBackgroundColor: segmentPoints.map((point) => point.color),
        pointBorderColor: segmentPoints.map((point) => point.color),
      },
      {
        label: 'Products',
        data: productPoints,
        pointRadius: 8,
        pointHoverRadius: 10,
        showLine: false,
        pointBackgroundColor: productPoints.map((point) => point.color),
        pointBorderColor: productPoints.map((point) => point.color),
        pointStyle: productPoints.map((point) => point.pointStyle || 'circle'),
      },
    ];

    if (showFitLines && selectedProductId) {
      const lines = buildDistanceLines(scenario, round, selectedProductId);
      for (const line of lines) {
        datasets.push({
          label: `line-${line.id}`,
          data: [
            {
              x: line.from.performance,
              y: line.from.size,
              label: 'From',
              round,
              kind: 'line',
            },
            {
              x: line.to.performance,
              y: line.to.size,
              label: 'To',
              round,
              kind: 'line',
            },
          ],
          type: 'line',
          showLine: true,
          parsing: false,
          pointRadius: 0,
          borderWidth: 1,
          borderColor: 'rgba(15, 23, 42, 0.25)',
          tension: 0,
          fill: false,
          order: 2,
          hidden: false,
        });
      }
    }

    chart.data.datasets = datasets;
    chart.update();
  }

  function destroy() {
    chart.destroy();
  }

  return {
    update,
    destroy,
    isAvailable: true,
  };
}
