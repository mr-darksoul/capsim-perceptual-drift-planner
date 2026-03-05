'use strict';

const ROUNDS = 8;

const DEFAULT_BOUNDS = Object.freeze({
  sizeMin: 0,
  sizeMax: 20,
  performanceMin: 0,
  performanceMax: 20,
});

const ALLOWED_TAGS = Object.freeze(['existing', 'proposed']);

const ALLOWED_ICONS = Object.freeze([
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

module.exports = {
  ROUNDS,
  DEFAULT_BOUNDS,
  ALLOWED_TAGS,
  ALLOWED_ICONS,
};
