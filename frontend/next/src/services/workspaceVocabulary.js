// Transport vocabulary only: stored JSON, role codes and provider OAuth IDs stay intact.
const aliases = {
  client: 'workspace',
  client_id: 'workspace_id',
  client_ids: 'workspace_ids',
  client_email: 'workspace_email',
  assigned_clients: 'assigned_workspaces',
};

export function workspaceRequest(data) {
  if (data instanceof FormData) {
    const result = new FormData();
    for (const [legacy, canonical] of Object.entries(aliases)) {
      if (data.has(legacy) && data.has(canonical) &&
          JSON.stringify(data.getAll(legacy)) !== JSON.stringify(data.getAll(canonical))) {
        throw new Error(`Conflicting ${canonical} and ${legacy} values`);
      }
    }
    for (const [key, value] of data.entries()) {
      if (aliases[key] && data.has(aliases[key])) continue;
      result.append(aliases[key] || key, value);
    }
    return result;
  }
  if (!data || Object.getPrototypeOf(data) !== Object.prototype) return data;
  const result = { ...data };
  for (const [legacy, canonical] of Object.entries(aliases)) {
    if (!Object.prototype.hasOwnProperty.call(result, legacy)) continue;
    if (Object.prototype.hasOwnProperty.call(result, canonical) && String(result[canonical]) !== String(result[legacy])) {
      throw new Error(`Conflicting ${canonical} and ${legacy} values`);
    }
    result[canonical] = result[legacy];
    delete result[legacy];
  }
  // Known relation assignment envelope; do not recurse into arbitrary metadata.
  for (const key of ['add', 'assignments']) {
    if (Array.isArray(result[key])) result[key] = result[key].map(workspaceRequest);
  }
  return result;
}
