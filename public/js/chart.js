import { buildDistanceLinesForMonth } from './fit.js';
import { buildMonthSnapshot } from './model.js';

const SEGMENT_ZONE_RADIUS_UNITS = 2.5;
const FINE_CUT_RADIUS_UNITS = 4;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
    const fineCutRadiusUnits =
      Number(pluginOptions.fineCutRadiusUnits) || FINE_CUT_RADIUS_UNITS;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    const { ctx } = chart;

    for (const zone of zones) {
      const centerX = xScale.getPixelForValue(zone.x);
      const centerY = yScale.getPixelForValue(zone.y);
      const idealX = xScale.getPixelForValue(zone.idealX ?? zone.x);
      const idealY = yScale.getPixelForValue(zone.idealY ?? zone.y);
      const radiusX = Math.abs(xScale.getPixelForValue(zone.x + radiusUnits) - centerX);
      const radiusY = Math.abs(yScale.getPixelForValue(zone.y + radiusUnits) - centerY);
      const circleRadius = Math.min(radiusX, radiusY);

      const gradient = ctx.createRadialGradient(
        idealX,
        idealY,
        0,
        idealX,
        idealY,
        circleRadius * 1.5
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

      const fineCutRadiusX = Math.abs(xScale.getPixelForValue(zone.x + fineCutRadiusUnits) - centerX);
      const fineCutRadiusY = Math.abs(yScale.getPixelForValue(zone.y + fineCutRadiusUnits) - centerY);
      const fineCutRadius = Math.min(fineCutRadiusX, fineCutRadiusY);

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([5, 4]);
      ctx.arc(centerX, centerY, fineCutRadius, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.65)';
      ctx.stroke();
      ctx.restore();
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
              const type =
                point.kind === 'segment'
                  ? 'Segment'
                  : point.kind === 'ideal'
                  ? 'Ideal'
                  : 'Product';
              return `${type}: ${point.label} | ${point.monthLabel} | Round ${point.round} | ${formatPointLabel(point)}`;
            },
          },
        },
        segmentZonePlugin: {
          enabled: true,
          radiusUnits: SEGMENT_ZONE_RADIUS_UNITS,
          fineCutRadiusUnits: FINE_CUT_RADIUS_UNITS,
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

  function update({ scenario, monthIndex, selectedProductId, showFitLines }) {
    const snapshot = buildMonthSnapshot(scenario, monthIndex);
    const bounds = scenario.chartBounds;
    const monthLabel = `${MONTH_NAMES[snapshot.month]} ${snapshot.year}`;

    chart.options.scales.x.min = bounds.performanceMin;
    chart.options.scales.x.max = bounds.performanceMax;
    chart.options.scales.y.min = bounds.sizeMin;
    chart.options.scales.y.max = bounds.sizeMax;

    const segmentPoints = snapshot.segments.map((segment) => ({
      x: segment.point.performance,
      y: segment.point.size,
      idealX: segment.idealPoint.performance,
      idealY: segment.idealPoint.size,
      label: segment.name,
      id: segment.id,
      round: snapshot.round,
      monthLabel,
      kind: 'segment',
      color: segment.color,
    }));

    const idealPoints = snapshot.segments.map((segment) => ({
      x: segment.idealPoint.performance,
      y: segment.idealPoint.size,
      label: `${segment.name} Ideal`,
      id: `${segment.id}-ideal`,
      round: snapshot.round,
      monthLabel,
      kind: 'ideal',
      color: '#0b3d91',
    }));

    chart.options.plugins.segmentZonePlugin = {
      enabled: true,
      radiusUnits: SEGMENT_ZONE_RADIUS_UNITS,
      fineCutRadiusUnits: FINE_CUT_RADIUS_UNITS,
      zones: segmentPoints,
    };

    const productPoints = snapshot.products.map((product) => ({
      x: product.point.performance,
      y: product.point.size,
      label: product.name,
      id: product.id,
      round: snapshot.round,
      monthLabel,
      kind: 'product',
      color: product.color,
      pointStyle: product.icon,
    }));

    const datasets = [
      {
        label: 'Segments',
        data: segmentPoints,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointStyle: 'circle',
        showLine: false,
        pointBackgroundColor: segmentPoints.map((point) => point.color),
        pointBorderColor: segmentPoints.map((point) => point.color),
      },
      {
        label: 'Ideal Centers',
        data: idealPoints,
        pointRadius: 3.5,
        pointHoverRadius: 5,
        pointStyle: 'crossRot',
        showLine: false,
        pointBackgroundColor: idealPoints.map((point) => point.color),
        pointBorderColor: idealPoints.map((point) => point.color),
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
      const lines = buildDistanceLinesForMonth(scenario, snapshot.monthIndex, selectedProductId);
      for (const line of lines) {
        datasets.push({
          label: `line-${line.id}`,
          data: [
            {
              x: line.from.performance,
              y: line.from.size,
              label: 'From',
              round: snapshot.round,
              monthLabel,
              kind: 'line',
            },
            {
              x: line.to.performance,
              y: line.to.size,
              label: 'To',
              round: snapshot.round,
              monthLabel,
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
