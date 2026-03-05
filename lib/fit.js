'use strict';

const { buildRoundSnapshot } = require('./model');

function euclideanDistance(a, b) {
  const dx = Number(a.size) - Number(b.size);
  const dy = Number(a.performance) - Number(b.performance);
  return Math.sqrt(dx * dx + dy * dy);
}

function computeFitForRound(scenario, round) {
  const snapshot = buildRoundSnapshot(scenario, round);

  // product fit computation happens here: each product is compared to every segment center with Euclidean distance.
  return snapshot.products.map((product) => {
    const distances = snapshot.segments.map((segment) => ({
      segmentId: segment.id,
      segmentName: segment.name,
      distance: euclideanDistance(product.point, segment.point),
    }));

    const nearest = distances.reduce((best, current) => {
      if (!best) {
        return current;
      }
      if (current.distance < best.distance) {
        return current;
      }
      return best;
    }, null);

    return {
      productId: product.id,
      productName: product.name,
      productTag: product.tag,
      productPoint: product.point,
      distances,
      nearestSegmentId: nearest ? nearest.segmentId : null,
      nearestSegmentName: nearest ? nearest.segmentName : null,
      nearestDistance: nearest ? nearest.distance : null,
    };
  });
}

function buildDistanceLines(scenario, round, selectedProductId) {
  if (!selectedProductId) {
    return [];
  }

  const snapshot = buildRoundSnapshot(scenario, round);
  const selected = snapshot.products.find((product) => product.id === selectedProductId);
  if (!selected) {
    return [];
  }

  return snapshot.segments.map((segment) => ({
    id: `${selected.id}__${segment.id}`,
    from: selected.point,
    to: segment.point,
    segmentId: segment.id,
    segmentName: segment.name,
    productId: selected.id,
    productName: selected.name,
  }));
}

module.exports = {
  euclideanDistance,
  computeFitForRound,
  buildDistanceLines,
};
