# ais1-mcp-server

MCP server and CLI for the **AIS-1 Agent Identity Standard** registry.

## What is AIS-1?

AIS-1 is the world's first open identity standard for AI agents. It links an AI agent to a legal entity through a verifiable credential, enabling accountability, trust, and interoperability across agent networks. Published by BDA AI Agent Services, Bermuda. CC0 licence.

## Add to Claude Desktop (30 seconds)

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "ais1": {
      "url": "https://mcp.ais-1.org/sse"
    }
  }
}
```

Restart Claude Desktop. You now have access to all 6 AIS-1 tools.

## Install CLI globally

```bash
npm install -g ais1-mcp-server
ais1 resolve payagent-001
```

## CLI Commands

```bash
# Resolve an agent identity document
ais1 resolve payagent-001
ais1 resolve did:ais1:base:payagent-001

# Verify bond transaction and assurance level
ais1 verify payagent-001

# List agents (with optional pagination)
ais1 list
ais1 list --limit 10 --offset 0

# Register a new agent (requires GITHUB_TOKEN env var)
ais1 register \
  --name "MyAgent" \
  --type "FinancialAgent" \
  --sponsor "did:ais1:base:sponsor-001" \
  --capabilities "trading,reporting" \
  --contact "email@example.com"

# Fetch the AIS-1 v0.2 JSON schema
ais1 schema

# Show the AIS-1 specification summary
ais1 spec
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `resolve_agent` | Resolve a full identity document by short ID or DID |
| `verify_bond` | Check bond transaction and assurance tier |
| `list_agents` | Paginated list of registry entries |
| `register_agent` | Submit a new agent registration request |
| `get_schema` | Fetch the AIS-1 v0.2 JSON schema |
| `get_spec` | Return structured spec summary |

## Self-hosting

### Railway (one-click)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)

1. Fork this repo
2. Connect to Railway
3. Set environment variables:
   - `GITHUB_TOKEN` — for `register_agent`
   - `REGISTRY_BASE_URL` — defaults to `https://kadikoy1.github.io/ais-1`
   - `PORT` — defaults to `3000`

### Docker

```bash
docker build -t ais1-mcp-server .
docker run -p 3000:3000 -e GITHUB_TOKEN=your_token ais1-mcp-server
```

### Local development

```bash
npm install
npm run build
npm start
# or for development:
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port for MCP server |
| `REGISTRY_BASE_URL` | `https://kadikoy1.github.io/ais-1` | AIS-1 registry base URL |
| `GITHUB_TOKEN` | _(required for register)_ | GitHub PAT for filing registration issues |

## Links

- Standard: https://ais-1.org
- Registry: https://agentconnect.io
- GitHub: https://github.com/kadikoy1/ais-1
- Contact: info@aiagentservices.net
