import { fetchJSON, registryIndexURL } from '../utils/registry.js';

export interface ListInput {
  limit?: number;
  offset?: number;
}

export interface AgentSummary {
  identifier: string;
  name: string;
  type: string;
  tier: string;
  sponsor: string;
}

export async function listAgents(input: ListInput): Promise<AgentSummary[]> {
  const limit = input.limit ?? 20;
  const offset = input.offset ?? 0;

  const index = await fetchJSON<AgentSummary[]>(registryIndexURL());
  const agents = Array.isArray(index) ? index : [];

  return agents.slice(offset, offset + limit).map((entry) => ({
    identifier: String(entry.identifier ?? ''),
    name: String(entry.name ?? ''),
    type: String(entry.type ?? ''),
    tier: String(entry.tier ?? ''),
    sponsor: String(entry.sponsor ?? ''),
  }));
}
