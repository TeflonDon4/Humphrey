import { fetchJSON, resolveURL, stripDIDPrefix } from '../utils/registry.js';

export interface VerifyInput {
  identifier: string;
}

export interface VerifyOutput {
  valid: boolean;
  tier: string;
  bond_tx: string;
  sponsor: string;
  issued: string;
}

export async function verifyBond(input: VerifyInput): Promise<VerifyOutput> {
  const id = stripDIDPrefix(input.identifier);
  const url = resolveURL(id);
  const doc = await fetchJSON<Record<string, unknown>>(url);

  const bond = (doc['bondTransaction'] as string) ?? '';
  const tier = (doc['assuranceLevel'] as string) ?? 'unknown';
  const sponsor = (doc['sponsorDID'] as string) ?? '';
  const issued = (doc['issuedAt'] as string) ?? '';

  return {
    valid: Boolean(bond),
    tier,
    bond_tx: bond,
    sponsor,
    issued,
  };
}
