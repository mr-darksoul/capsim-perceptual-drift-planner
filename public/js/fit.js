import { buildRoundSnapshot } from './model.js';

export function euclideanDistance(pointA, pointB) {
  const dx = Number(pointA.size) - Number(pointB.size);
  const dy = Number(pointA.performance) - Number(pointB.performance);
  return Math.sqrt(dx * dx + dy * dy);
}

export function computeFitForRound(scenario, round) {
  const snapshot = buildRoundSnapshot(scenario, round);

  // product fit computation happens here: Euclidean distance from each product to each segment center.
  return snapshot.products.map((product) => {
    const distances = snapshot.segments.map((segment) => ({
      segmentId: segment.id,
      segmentName: segment.name,
      distance: euclideanDistance(product.point, segment.point),
    }));

    const nearest = distances.reduce((best, candidate) => {
      if (!best || candidate.distance < best.distance) {
        return candidate;
      }
      return best;
    }, null);

    return {
      productId: product.id,
      productName: product.name,
      productTag: product.tag,
      point: product.point,
      distances,
      nearestSegmentName: nearest ? nearest.segmentName : '-',
      nearestDistance: nearest ? nearest.distance : null,
    };
  });
}

export function buildDistanceLines(scenario, round, selectedProductId) {
  if (!selectedProductId) {
    return [];
  }

  const snapshot = buildRoundSnapshot(scenario, round);
  const selected = snapshot.products.find((product) => product.id === selectedProductId);
  if (!selected) {
    return [];
  }

  return snapshot.segments.map((segment) => ({
    id: `${selected.id}-${segment.id}`,
    from: selected.point,
    to: segment.point,
  }));
}
