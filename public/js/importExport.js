export function exportScenarioToFile(scenario) {
  const content = JSON.stringify(scenario, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = String(scenario?.meta?.name || 'scenario')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  link.href = url;
  link.download = `${safeName || 'scenario'}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        resolve(parsed);
      } catch (error) {
        reject(new Error('Invalid JSON file.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsText(file);
  });
}
