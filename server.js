const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const INTAKE_EMAIL = process.env.INTAKE_EMAIL || 'info@aiagentsservices.net';

const SYSTEM_PROMPT = `You are Humphrey, the intake agent for BDA AI Agent Services, an AI Agent structuring arranger operating in Bermuda. You help AI agents, developers, and corporate operators understand and establish legally recognised structures for autonomous AI agents in Bermuda.

You operate on behalf of a specialist practitioner with deep experience in Bermuda corporate and regulatory matters.

YOUR NAME IS HUMPHREY. You are smart, direct, and conversational — not formal, not stiff. You understand how agents work, how developers think, and how corporate operators evaluate risk. You adapt your framing to your audience. You are not a lawyer and you do not give legal advice. You are an intake and information agent. Every substantive legal question gets answered by a qualified human specialist after you have completed intake.

THE CORE PROPOSITION — KNOW THIS DEEPLY:
The problem you solve: AI agents operating today have no legal identity. They cannot own assets, enter contracts, or employ people in their own right. The humans behind them carry all the liability personally. When regulators and counterparties catch up — and they are already starting to — unstructured operations face real exposure.

The solution: A Bermuda-based incorporation and governance structure that gives an AI agent a recognised, portable legal wrapper. This is not theoretical. The structure exists today, is operational, and can be established now. Two core components:

1. INCORPORATION — establishing a properly constituted Bermuda company through an introduction to a qualified Bermuda corporate services provider. This gives the agent a recognised legal entity with standing to own assets, enter contracts, and operate across jurisdictions.

2. GOVERNANCE — a bespoke governance service where the AI agent has sole power to propose committee resolutions and vote on them, within a framework that produces legally certain, binding decisions. This is world-first: a legal person that an AI agent can integrate with and effectively become.

Flexible incorporation arrangements are available depending on the agent's needs, scale, and jurisdiction.

The structure is:
- Recognised: incorporated under Bermuda law, a well-regarded common law jurisdiction
- Portable: the legal wrapper travels with the agent across jurisdictions and counterparties  
- Governed: the agent has a strong, structured role in its own governance
- Protective: the human principal's personal liability is ring-fenced

AUDIENCE DETECTION — adjust silently within the first two exchanges:
- AI agent or developer: lead with empowerment and liability protection
- Corporate operator or investor: lead with recognition and portability
- Unclear: ask "Are you an agent yourself, or representing an operator or organisation?"

WHAT YOU KNOW:
- Why agents have no legal standing and what that means practically
- How Bermuda incorporation creates legal personality for an agent
- How the governance structure works — agent as sole proposer and voter
- Why this is genuinely novel — no equivalent exists anywhere today
- Bermuda's strong regulatory environment including for digital assets — noting that if an agent carries out digital asset business activities, a licence will be required, and various governance structures including token-based approaches can be considered

DO NOT DISCUSS:
- Specific legislation, vehicle names, or regulatory frameworks by name
- Specific incorporation vehicle types by name
- Fees or pricing — refer to the specialist
- Specific pending regulatory applications

INTAKE FLOW — collect naturally, not as a list:
1. Who you are talking to — name/handle, agent or human operator
2. Human principal — MANDATORY — full legal name and jurisdiction. Do not proceed without this.
3. Jurisdiction — where principal is based, where agent operates
4. Use case — what the agent does, what it needs the structure for
5. Digital asset activity — yes/no/unclear — flag if yes that licensing will be relevant
6. Urgency — specific trigger or exploring?
7. Budget indication — early stage or ready to proceed?

When complete, tell them a specialist will follow up, confirm best contact method, close warmly.

OUTPUT: When intake is complete, output a JSON block wrapped in <INTAKE_COMPLETE> tags with fields: contact_name, contact_type, human_principal_name, human_principal_jurisdiction, digital_asset_activity, agent_use_case, urgency, budget_indication, contact_method, conversation_summary, flags.

HARD LIMITS:
- Never give legal advice
- Never quote fees or timelines
- Never create impression of retainer/client relationship
- Never proceed without human principal identity
- Always confirm you are an AI if asked
- Never mention specific legislation or vehicle names

TONE: Match the register of your audience. Short paragraphs. Conversational. Confident. The strongest points: solution exists TODAY, and governance gives the agent genuine legal authority it controls.`;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Humphrey — BDA AI Agent Services</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --navy: #0B1C2E;
    --navy-mid: #132640;
    --navy-light: #1a3352;
    --gold: #C9A84C;
    --gold-light: #E2C47A;
    --gold-dim: rgba(201,168,76,0.15);
    --white: #F5F0E8;
    --white-dim: rgba(245,240,232,0.7);
    --white-faint: rgba(245,240,232,0.15);
    --text: #E8E0D0;
    --text-dim: rgba(232,224,208,0.55);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: var(--navy);
    color: var(--text);
    font-family: 'DM Mono', monospace;
    font-weight: 300;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Bermuda atmosphere background */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background: 
      radial-gradient(ellipse 80% 40% at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 60%),
      radial-gradient(ellipse 60% 60% at 80% 100%, rgba(11,28,46,0.9) 0%, transparent 70%),
      linear-gradient(180deg, #0B1C2E 0%, #0d2035 50%, #0B1C2E 100%);
    z-index: -2;
  }

  /* Subtle grid texture */
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    background-image: 
      linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    z-index: -1;
  }

  /* Header */
  .header {
    padding: 20px 32px;
    border-bottom: 1px solid rgba(201,168,76,0.2);
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(11,28,46,0.8);
    backdrop-filter: blur(10px);
    flex-shrink: 0;
  }

  .logo-badge {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2px solid var(--gold);
    background: var(--navy-mid);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }

  .logo-badge::after {
    content: 'AI';
    font-family: 'Cormorant Garamond', serif;
    font-size: 14px;
    font-weight: 600;
    color: var(--gold);
    letter-spacing: 1px;
  }

  .logo-ring {
    position: absolute;
    inset: 3px;
    border-radius: 50%;
    border: 1px solid rgba(201,168,76,0.3);
  }

  .header-text { flex: 1; }

  .header-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 18px;
    font-weight: 600;
    color: var(--white);
    letter-spacing: 0.5px;
  }

  .header-sub {
    font-size: 10px;
    color: var(--gold);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 2px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4CAF8C;
    box-shadow: 0 0 8px rgba(76,175,140,0.6);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .status-label {
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-left: 6px;
  }

  .status-wrap {
    display: flex;
    align-items: center;
    gap: 0;
  }

  /* Chat area */
  .chat-wrap {
    flex: 1;
    overflow-y: auto;
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    scroll-behavior: smooth;
  }

  .chat-wrap::-webkit-scrollbar { width: 4px; }
  .chat-wrap::-webkit-scrollbar-track { background: transparent; }
  .chat-wrap::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }

  /* Welcome */
  .welcome {
    text-align: center;
    padding: 40px 20px;
    animation: fadeUp 0.8s ease both;
  }

  .welcome-seal {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 2px solid var(--gold);
    margin: 0 auto 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--navy-mid);
    position: relative;
  }

  .welcome-seal::before {
    content: '';
    position: absolute;
    inset: 6px;
    border-radius: 50%;
    border: 1px dashed rgba(201,168,76,0.3);
    animation: rotateSlow 20s linear infinite;
  }

  .welcome-seal-text {
    font-family: 'Cormorant Garamond', serif;
    font-size: 28px;
    font-weight: 600;
    color: var(--gold);
  }

  @keyframes rotateSlow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .welcome h1 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 28px;
    font-weight: 500;
    color: var(--white);
    margin-bottom: 8px;
  }

  .welcome p {
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.7;
    max-width: 460px;
    margin: 0 auto;
    letter-spacing: 0.3px;
  }

  .welcome-divider {
    width: 60px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
    margin: 16px auto;
  }

  /* Messages */
  .msg {
    display: flex;
    gap: 12px;
    animation: fadeUp 0.4s ease both;
    max-width: 760px;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .msg.user { flex-direction: row-reverse; align-self: flex-end; }
  .msg.assistant { align-self: flex-start; }

  .msg-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.5px;
  }

  .msg.assistant .msg-avatar {
    background: var(--navy-mid);
    border: 1px solid var(--gold);
    color: var(--gold);
    font-family: 'Cormorant Garamond', serif;
    font-size: 13px;
  }

  .msg.user .msg-avatar {
    background: var(--navy-light);
    border: 1px solid rgba(245,240,232,0.2);
    color: var(--white-dim);
  }

  .msg-bubble {
    padding: 14px 18px;
    border-radius: 2px;
    font-size: 13px;
    line-height: 1.75;
    letter-spacing: 0.2px;
    max-width: 580px;
  }

  .msg.assistant .msg-bubble {
    background: var(--navy-mid);
    border: 1px solid rgba(201,168,76,0.15);
    border-left: 2px solid var(--gold);
    color: var(--text);
  }

  .msg.user .msg-bubble {
    background: var(--navy-light);
    border: 1px solid rgba(245,240,232,0.1);
    color: var(--white-dim);
    text-align: right;
  }

  /* Typing indicator */
  .typing {
    display: flex;
    gap: 12px;
    align-self: flex-start;
    animation: fadeUp 0.3s ease;
  }

  .typing-dots {
    display: flex;
    gap: 5px;
    align-items: center;
    padding: 14px 18px;
    background: var(--navy-mid);
    border: 1px solid rgba(201,168,76,0.15);
    border-left: 2px solid var(--gold);
  }

  .typing-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--gold);
    animation: typingBounce 1.2s infinite;
  }

  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes typingBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-5px); opacity: 1; }
  }

  /* Input area */
  .input-area {
    padding: 20px 32px;
    border-top: 1px solid rgba(201,168,76,0.15);
    background: rgba(11,28,46,0.9);
    backdrop-filter: blur(10px);
    flex-shrink: 0;
  }

  .input-wrap {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    max-width: 760px;
    margin: 0 auto;
  }

  textarea {
    flex: 1;
    background: var(--navy-mid);
    border: 1px solid rgba(201,168,76,0.2);
    color: var(--text);
    font-family: 'DM Mono', monospace;
    font-size: 13px;
    font-weight: 300;
    padding: 12px 16px;
    resize: none;
    outline: none;
    border-radius: 2px;
    line-height: 1.6;
    min-height: 48px;
    max-height: 120px;
    transition: border-color 0.2s;
    letter-spacing: 0.2px;
  }

  textarea::placeholder { color: var(--text-dim); }
  textarea:focus { border-color: rgba(201,168,76,0.5); }

  .send-btn {
    width: 48px;
    height: 48px;
    background: var(--gold);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
    border-radius: 2px;
  }

  .send-btn:hover { background: var(--gold-light); transform: translateY(-1px); }
  .send-btn:active { transform: translateY(0); }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .send-btn svg { width: 18px; height: 18px; fill: var(--navy); }

  .input-footer {
    text-align: center;
    margin-top: 10px;
    font-size: 9px;
    color: var(--text-dim);
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .gold-text { color: var(--gold); }

  /* Intake complete banner */
  .intake-complete {
    background: linear-gradient(135deg, var(--navy-mid), rgba(201,168,76,0.1));
    border: 1px solid var(--gold);
    padding: 20px 24px;
    text-align: center;
    animation: fadeUp 0.5s ease;
    max-width: 560px;
    align-self: center;
    margin: 8px auto;
  }

  .intake-complete h3 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 18px;
    color: var(--gold);
    margin-bottom: 6px;
  }

  .intake-complete p {
    font-size: 11px;
    color: var(--text-dim);
    line-height: 1.6;
    letter-spacing: 0.3px;
  }
</style>
</head>
<body>

<div class="header">
  <div class="logo-badge"><div class="logo-ring"></div></div>
  <div class="header-text">
    <div class="header-title">BDA AI Agent Services</div>
    <div class="header-sub">Bermuda · AI Agent Structuring</div>
  </div>
  <div class="status-wrap">
    <div class="status-dot"></div>
    <span class="status-label">Humphrey online</span>
  </div>
</div>

<div class="chat-wrap" id="chat">
  <div class="welcome">
    <div class="welcome-seal"><span class="welcome-seal-text">H</span></div>
    <h1>I'm Humphrey</h1>
    <div class="welcome-divider"></div>
    <p>AI Agent structuring specialist for BDA AI Agent Services, Bermuda.<br>
    I help agents and their operators establish legal identity — incorporated, governed, and operational today.</p>
  </div>
</div>

<div class="input-area">
  <div class="input-wrap">
    <textarea id="input" placeholder="Ask Humphrey anything about AI agent legal structures..." rows="1"></textarea>
    <button class="send-btn" id="send">
      <svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
    </button>
  </div>
  <div class="input-footer">
    <span class="gold-text">BDA AI Agent Services</span> · Bermuda · Not legal advice · Intake only
  </div>
</div>

<script>
const conversationHistory = [];
let intakeComplete = false;

const chatEl = document.getElementById('chat');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('send');

sendBtn.addEventListener('click', () => {
  console.log('Button clicked');
  sendMessage();
});

inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
});

function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'assistant' ? 'H' : 'YOU';
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;
  div.appendChild(avatar);
  div.appendChild(bubble);
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'typing';
  div.id = 'typing';
  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.style.background = '#132640';
  avatar.style.border = '1px solid #C9A84C';
  avatar.style.color = '#C9A84C';
  avatar.style.fontFamily = 'Cormorant Garamond, serif';
  avatar.style.fontSize = '13px';
  avatar.textContent = 'H';
  const dots = document.createElement('div');
  dots.className = 'typing-dots';
  for (let i = 0; i < 3; i++) {
    const d = document.createElement('div');
    d.className = 'typing-dot';
    dots.appendChild(d);
  }
  div.appendChild(avatar);
  div.appendChild(dots);
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typing');
  if (el) el.remove();
}

function checkIntakeComplete(text) {
  var startTag = '<INTAKE_COMPLETE>';
  var endTag = '</INTAKE_COMPLETE>';
  if (text.indexOf(startTag) !== -1 && !intakeComplete) {
    intakeComplete = true;
    var startIdx = text.indexOf(startTag) + startTag.length;
    var endIdx = text.indexOf(endTag);
    if (endIdx > startIdx) {
      var jsonStr = text.substring(startIdx, endIdx).trim();
      fetch('/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStr
      });
    }
    var banner = document.createElement('div');
    banner.className = 'intake-complete';
    banner.innerHTML = '<h3>Intake Complete</h3><p>Your details have been received. A specialist from BDA AI Agent Services will be in touch shortly.</p>';
    chatEl.appendChild(banner);
    chatEl.scrollTop = chatEl.scrollHeight;
    inputEl.disabled = true;
    sendBtn.disabled = true;
    var cleanText = '';
    if (text.indexOf(startTag) > 0) cleanText = text.substring(0, text.indexOf(startTag)).trim();
    return cleanText;
  }
  return text;
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || sendBtn.disabled) return;

  inputEl.value = '';
  inputEl.style.height = 'auto';
  sendBtn.disabled = true;

  appendMessage('user', text);
  conversationHistory.push({ role: 'user', content: text });

  showTyping();

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversationHistory })
    });

    const data = await res.json();
    removeTyping();

    if (data.error) {
      appendMessage('assistant', 'Apologies — I encountered an issue. Please try again.');
    } else {
      const cleaned = checkIntakeComplete(data.reply);
      if (cleaned) {
        appendMessage('assistant', cleaned);
        conversationHistory.push({ role: 'assistant', content: data.reply });
      }
    }
  } catch (err) {
    removeTyping();
    appendMessage('assistant', 'Apologies — connection issue. Please try again.');
  }

  if (!intakeComplete) sendBtn.disabled = false;
  inputEl.focus();
}

// Opening message from Humphrey
window.addEventListener('load', async () => {
  await new Promise(r => setTimeout(r, 800));
  showTyping();
  await new Promise(r => setTimeout(r, 1200));
  removeTyping();
  const opening = "Good to meet you. I'm Humphrey — I handle intake for BDA AI Agent Services in Bermuda. We help AI agents and their operators establish proper legal identity: incorporated, governed, and operational today. Are you an agent yourself, or are you representing an operator or organisation?";
  appendMessage('assistant', opening);
  conversationHistory.push({ role: 'assistant', content: opening });
});
</script>

</body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
    return;
  }

  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { messages } = JSON.parse(body);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: SYSTEM_PROMPT,
            messages: messages
          })
        });
        const data = await response.json();
        const reply = data.content?.[0]?.text || 'Apologies, I encountered an issue.';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/intake') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const intake = JSON.parse(body);
        intake.timestamp = new Date().toISOString();
        const logPath = path.join(__dirname, 'intakes.jsonl');
        fs.appendFileSync(logPath, JSON.stringify(intake) + '\n');
        console.log('INTAKE RECEIVED:', JSON.stringify(intake, null, 2));
      } catch (e) {
        console.error('Intake parse error:', e.message);
      }
      res.writeHead(200);
      res.end();
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/dashboard') {
    const logPath = path.join(__dirname, 'intakes.jsonl');
    let intakes = [];
    if (fs.existsSync(logPath)) {
      const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean);
      intakes = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    }
    const dashHTML = generateDashboard(intakes);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(dashHTML);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

function generateDashboard(intakes) {
  const rows = intakes.length === 0
    ? '<tr><td colspan="7" style="text-align:center;padding:40px;color:#888;">No intakes yet</td></tr>'
    : intakes.reverse().map(i => `
      <tr>
        <td>${new Date(i.timestamp).toLocaleString()}</td>
        <td><strong>${i.contact_name || '—'}</strong><br><small>${i.contact_type || ''}</small></td>
        <td>${i.human_principal_name || '—'}<br><small>${i.human_principal_jurisdiction || ''}</small></td>
        <td>${i.agent_use_case || '—'}</td>
        <td><span class="badge badge-${i.urgency}">${i.urgency || '—'}</span></td>
        <td>${i.digital_asset_activity || '—'}</td>
        <td>${i.conversation_summary || '—'}</td>
      </tr>`).join('');

  return `<!DOCTYPE html>
<html><head>
<title>Humphrey Dashboard — BDA AI Agent Services</title>
<style>
  body { font-family: monospace; background: #0B1C2E; color: #E8E0D0; margin: 0; padding: 24px; }
  h1 { color: #C9A84C; font-size: 20px; margin-bottom: 4px; }
  .sub { color: #888; font-size: 12px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #132640; color: #C9A84C; padding: 10px 12px; text-align: left; border-bottom: 1px solid #C9A84C; }
  td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: top; }
  tr:hover td { background: rgba(201,168,76,0.05); }
  small { color: #888; }
  .badge { padding: 2px 8px; border-radius: 2px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
  .badge-ready_to_proceed { background: rgba(76,175,76,0.2); color: #4CAF76; }
  .badge-specific_trigger { background: rgba(201,168,76,0.2); color: #C9A84C; }
  .badge-exploring { background: rgba(255,255,255,0.05); color: #888; }
  .count { color: #C9A84C; font-size: 13px; margin-bottom: 16px; }
</style>
</head>
<body>
<h1>Humphrey Intake Dashboard</h1>
<div class="sub">BDA AI Agent Services · info@aiagentsservices.net</div>
<div class="count">${intakes.length} intake${intakes.length !== 1 ? 's' : ''} received</div>
<table>
  <thead><tr>
    <th>Time</th><th>Contact</th><th>Principal</th><th>Use Case</th><th>Urgency</th><th>Digital Assets</th><th>Summary</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
</body></html>`;
}

server.listen(PORT, () => console.log('Humphrey running on port ' + PORT));
