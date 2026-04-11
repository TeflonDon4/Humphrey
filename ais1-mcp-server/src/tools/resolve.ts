import { fetchJSON, resolveURL, stripDIDPrefix } from '../utils/registry.js';

export interface ResolveInput {
  identifier: string;
}

export async function resolveAgent(input: ResolveInput): Promise<unknown> {
  const id = stripDIDPrefix(input.identifier);
  const url = resolveURL(id);
  const doc = await fetchJSON(url);
  return doc;
}
