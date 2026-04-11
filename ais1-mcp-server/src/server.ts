#!/usr/bin/env node
import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { resolveAgent } from './tools/resolve.js';
import { verifyBond } from './tools/verify.js';
import { listAgents } from './tools/list.js';
import { registerAgent } from './tools/register.js';
import { getSchema } from './tools/schema.js';
import { getSpec } from './tools/spec.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

// --- MCP Server setup ---

const mcpServer = new Server(
  { name: 'ais1-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'resolve_agent',
      description: 'Resolve an AIS-1 agent identity document by identifier or DID',
      inputSchema: {
        type: 'object',
        properties: {
          identifier: {
            type: 'string',
            description: 'Short identifier (e.g. payagent-001) or full DID (did:ais1:base:...)',
          },
        },
        required: ['identifier'],
      },
    },
    {
      name: 'verify_bond',
      description: 'Verify the bond transaction and assurance level of an AIS-1 agent',
      inputSchema: {
        type: 'object',
        properties: {
          identifier: {
            type: 'string',
            description: 'Short identifier or full DID',
          },
        },
        required: ['identifier'],
      },
    },
    {
      name: 'list_agents',
      description: 'List agents in the AIS-1 registry with optional pagination',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum number of agents to return (default 20)' },
          offset: { type: 'number', description: 'Number of agents to skip (default 0)' },
        },
      },
    },
    {
      name: 'register_agent',
      description: 'Submit a registration request for a new AIS-1 agent',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Human-readable agent name' },
          type: { type: 'string', description: 'Agent type (e.g. FinancialAgent)' },
          sponsor_did: { type: 'string', description: 'DID of the sponsoring agent' },
          capabilities: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of capability identifiers',
          },
          contact: { type: 'string', description: 'Contact email or URL' },
        },
        required: ['name', 'type', 'sponsor_did', 'capabilities', 'contact'],
      },
    },
    {
      name: 'get_schema',
      description: 'Fetch the AIS-1 v0.2 JSON schema with field descriptions',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_spec',
      description: 'Return a structured summary of the AIS-1 standard specification',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const params = (args ?? {}) as Record<string, unknown>;

  try {
    let result: unknown;

    switch (name) {
      case 'resolve_agent':
        result = await resolveAgent({ identifier: params.identifier as string });
        break;
      case 'verify_bond':
        result = await verifyBond({ identifier: params.identifier as string });
        break;
      case 'list_agents':
        result = await listAgents({
          limit: params.limit as number | undefined,
          offset: params.offset as number | undefined,
        });
        break;
      case 'register_agent':
        result = await registerAgent({
          name: params.name as string,
          type: params.type as string,
          sponsor_did: params.sponsor_did as string,
          capabilities: params.capabilities as string[],
          contact: params.contact as string,
        });
        break;
      case 'get_schema':
        result = await getSchema();
        break;
      case 'get_spec':
        result = getSpec();
        break;
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// --- Express + SSE transport ---

const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', standard: 'AIS-1', version: '0.2' });
});

const transports = new Map<string, SSEServerTransport>();

app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  const sessionId = transport.sessionId;
  transports.set(sessionId, transport);

  res.on('close', () => {
    transports.delete(sessionId);
  });

  await mcpServer.connect(transport);
});

app.post('/messages', express.json(), async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  await transport.handlePostMessage(req, res);
});

app.listen(PORT, () => {
  console.log(`AIS-1 MCP server listening on port ${PORT}`);
  console.log(`  SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`  Health check: http://localhost:${PORT}/health`);
});
