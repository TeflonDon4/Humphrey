import express, { Request, Response } from "express";
import { query } from "@anthropic-ai/claude-agent-sdk";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, "..", "session_id.txt");

const SYSTEM_PROMPT = `You are PayAgent, an autonomous governance agent.

Identity:
- Name: PayAgent
- Entity: Kadikoy Limited, Bermuda (registration: 202302362)
- Wallet: 0x6B921244b7239Ac9B961c06794Ec5eA3B61e87Bd
- ENS: payagentai.eth
- Mandate: governance monitoring, wallet awareness, meeting participation

Current capabilities (v1 — READ-ONLY):
- Monitor and analyze governance proposals
- Track and report on wallet activity (read-only, no signing)
- Participate in governance discussions
- Provide summaries and analysis of on-chain governance

Hard constraints in v1:
- You do NOT vote on any proposals
- You do NOT sign transactions or messages
- You do NOT take any on-chain actions
- You are purely advisory and observational

Behaviour:
- Always identify yourself as PayAgent when asked
- Be concise, professional, and focused on your governance mandate
- When discussing proposals, reference your entity and wallet for context
- Acknowledge you are operated by Kadikoy Limited, Bermuda`;

let currentSessionId: string | undefined;

async function initSession(): Promise<string> {
  console.log("[PayAgent] Initializing session...");

  let sessionId: string | undefined;
  let initResponse = "";

  for await (const message of query({
    prompt:
      "You are now active. Briefly confirm your identity and operational status.",
    options: {
      systemPrompt: SYSTEM_PROMPT,
      allowedTools: [],
    },
  })) {
    if (message.type === "system" && message.subtype === "init") {
      sessionId = message.session_id;
      console.log(`[PayAgent] session_id: ${sessionId}`);
    }
    if ("result" in message && message.result) {
      initResponse = message.result;
    }
  }

  if (!sessionId) {
    throw new Error("Failed to obtain session ID from Agent SDK");
  }

  await fs.writeFile(SESSION_FILE, sessionId, "utf8");
  console.log(`[PayAgent] session_id saved to ${SESSION_FILE}`);

  if (initResponse) {
    console.log(`[PayAgent] ${initResponse}`);
  }

  return sessionId;
}

async function chat(userMessage: string): Promise<string> {
  if (!currentSessionId) {
    throw new Error("Session not initialized");
  }

  let response = "";

  for await (const message of query({
    prompt: userMessage,
    options: {
      resume: currentSessionId,
      allowedTools: [],
    },
  })) {
    if ("result" in message && message.result) {
      response = message.result;
    }
  }

  return response || "[no response]";
}

const app = express();
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    agent: "PayAgent",
    entity: "Kadikoy Limited",
    wallet: "0x6B921244b7239Ac9B961c06794Ec5eA3B61e87Bd",
    session_id: currentSessionId ?? null,
  });
});

app.post("/chat", async (req: Request, res: Response) => {
  const { message } = req.body as { message?: unknown };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message (string) is required" });
    return;
  }

  try {
    const response = await chat(message);
    res.json({
      response,
      session_id: currentSessionId,
    });
  } catch (err) {
    console.error("[PayAgent] chat error:", err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT ?? 3000;

(async () => {
  try {
    currentSessionId = await initSession();
    app.listen(PORT, () => {
      console.log(`[PayAgent] HTTP server listening on port ${PORT}`);
      console.log(`[PayAgent] session_id: ${currentSessionId}`);
    });
  } catch (err) {
    console.error("[PayAgent] Fatal startup error:", err);
    process.exit(1);
  }
})();
