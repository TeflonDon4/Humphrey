export interface AIS1Spec {
  standard: string;
  version: string;
  publisher: string;
  licence: string;
  purpose: string;
  tiers: Record<string, string>;
  did_method: string;
  links: Record<string, string>;
}

export function getSpec(): AIS1Spec {
  return {
    standard: 'AIS-1 (Agent Identity Standard)',
    version: '0.2',
    publisher: 'BDA AI Agent Services, Bermuda',
    licence: 'CC0',
    purpose: 'Universal identity standard for AI agents',
    tiers: {
      Basic: 'Self-issued — no external verification',
      Standard: 'Sponsor-verified — endorsed by a registered sponsor',
      Enhanced: 'Legally-anchored — tied to a legal entity (e.g. Bermuda incorporation)',
    },
    did_method: 'did:ais1:base:{identifier}',
    links: {
      standard: 'https://ais-1.org',
      registry: 'https://agentconnect.io',
      github: 'https://github.com/kadikoy1/ais-1',
    },
  };
}
