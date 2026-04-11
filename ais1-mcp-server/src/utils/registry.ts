const REGISTRY_BASE_URL =
  process.env.REGISTRY_BASE_URL ?? 'https://kadikoy1.github.io/ais-1';

export function stripDIDPrefix(identifier: string): string {
  const prefix = 'did:ais1:base:';
  return identifier.startsWith(prefix) ? identifier.slice(prefix.length) : identifier;
}

export async function fetchJSON<T = unknown>(url: string): Promise<T> {
  const { default: fetch } = await import('node-fetch');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return response.json() as Promise<T>;
}

export function resolveURL(identifier: string): string {
  return `${REGISTRY_BASE_URL}/resolve/${identifier}.json`;
}

export function registryIndexURL(): string {
  return `${REGISTRY_BASE_URL}/registry/index.json`;
}

export function schemaURL(): string {
  return `${REGISTRY_BASE_URL}/schema/ais1-v0.2.json`;
}
