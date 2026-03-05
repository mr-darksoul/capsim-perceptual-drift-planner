function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createStore(initialState) {
  let state = deepClone(initialState);
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(updater) {
    const nextState =
      typeof updater === 'function' ? updater(deepClone(state)) : deepClone(updater);
    state = nextState;
    listeners.forEach((listener) => listener(getState()));
  }

  function update(partial) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    getState,
    setState,
    update,
    subscribe,
  };
}

export function cloneScenario(scenario) {
  return deepClone(scenario);
}
