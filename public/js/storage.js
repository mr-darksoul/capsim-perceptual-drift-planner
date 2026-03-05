import { STORAGE_KEY } from './constants.js';

export function loadScenarioFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

export function saveScenarioToStorage(scenario) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scenario));
    return true;
  } catch (_error) {
    return false;
  }
}

export function clearStoredScenario() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (_error) {
    return false;
  }
}
