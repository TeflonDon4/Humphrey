export interface RegisterInput {
  name: string;
  type: string;
  sponsor_did: string;
  capabilities: string[];
  contact: string;
}

export interface RegisterOutput {
  request_id: string;
  status: 'pending';
  instructions: string;
}

export async function registerAgent(input: RegisterInput): Promise<RegisterOutput> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is not set');
  }

  const body = [
    `**Agent Name:** ${input.name}`,
    `**Type:** ${input.type}`,
    `**Sponsor DID:** ${input.sponsor_did}`,
    `**Capabilities:** ${input.capabilities.join(', ')}`,
    `**Contact:** ${input.contact}`,
  ].join('\n');

  const { default: fetch } = await import('node-fetch');
  const response = await fetch('https://api.github.com/repos/kadikoy1/ais-1/issues', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      title: `[Registration Request] ${input.name}`,
      body,
      labels: ['registration-request'],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }

  const issue = await response.json() as { number: number };
  const requestId = `reg-${issue.number}`;

  return {
    request_id: requestId,
    status: 'pending',
    instructions:
      'Your registration has been submitted. For ALA-ready Bermuda incorporation contact info@aiagentservices.net',
  };
}
