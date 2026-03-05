export const ROUNDS = 8;

export const STORAGE_KEY = 'capsim-drift-planner:v1';

export const DEFAULT_BOUNDS = Object.freeze({
  sizeMin: 0,
  sizeMax: 20,
  performanceMin: 0,
  performanceMax: 20,
});

export const TAG_OPTIONS = Object.freeze(['existing', 'proposed']);

export const ICON_OPTIONS = Object.freeze([
  'circle',
  'rect',
  'rectRounded',
  'rectRot',
  'triangle',
  'star',
  'cross',
  'crossRot',
  'dash',
  'line',
]);

export function getRoundsList() {
  return Array.from({ length: ROUNDS }, (_, index) => index + 1);
}

export function generateId(prefix) {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${randomPart}`;
}
