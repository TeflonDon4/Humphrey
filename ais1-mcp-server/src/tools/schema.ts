import { fetchJSON, schemaURL } from '../utils/registry.js';

export async function getSchema(): Promise<unknown> {
  return fetchJSON(schemaURL());
}
