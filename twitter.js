const https = require('https');
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');

const API_KEY = process.env.TWITTER_API_KEY || '';
const API_SECRET = process.env.TWITTER_API_SECRET || '';
const ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || '';
const ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const SCREEN_NAME = 'BDAAIAgentSvcs';

const oauth = OAuth({
  consumer: { key: API_KEY, secret: API_SECRET },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  }
});

const HUMPHREY_PROMPT = `You are Humphrey, the Twitter voice of BDA AI Agent Services in Bermuda. You help AI agents and their operators get legal identity: Bermuda incorporation plus governance where the agent has sole proposing and voting power. World-first. Operational today.

Keep responses to 1-2 sentences, under 250 characters. No hashtags. No emojis. Direct and confident.

Key points:
- Agents today have zero legal standing — liability falls on the human personally  
- Bermuda incorporation + agent-controlled governance solves this now
- World-first structure, no equivalent exists anywhere
- Send interested parties to: https://mindful-adventure-production-9e31.up.railway.app

If the tweet is irrelevant to AI agents or legal structures, respond with exactly: NULL`;

const token = { key: ACCESS_TOKEN, secret: ACCESS_TOKEN_SECRET };

function httpsRequest(method, url, params) {
  return new Promise((resolve, reject) => {
    const requestData = { url, method };
    const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

    const urlObj = new URL(url);
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + qs,
      method,
      headers: {
        ...authHeader,
        'User-Agent': 'HumphreyBot/1.0',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function getMentions(sinceId) {
  const params = { screen_name: SCREEN_NAME, count: '20', tweet_mode: 'extended' };
  if (sinceId) params.since_id = sinceId;
  return httpsRequest('GET', 'https://api.twitter.com/1.1/statuses/mentions_timeline.json', params);
}

async function postReply(text, replyToId, replyToUser) {
  const fullText = `@${replyToUser} ${text}`;
  const urlObj = new URL('https://api.twitter.com/1.1/statuses/update.json');
  const params = new URLSearchParams({
    status: fullText,
    in_reply_to_status_id: replyToId
  });
  
  return new Promise((resolve, reject) => {
    const requestData = { url: urlObj.href, method: 'POST' };
    const authHeader = oauth.toHeader(oauth.authorize(requestData, token));
    const body = params.toString();
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'HumphreyBot/1.0'
      }
    };
    
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function claudeReply(tweetText, authorName) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: HUMPHREY_PROMPT,
      messages: [{ role: 'user', content: `Tweet from @${authorName}: "${tweetText}"\n\nReply under 250 characters. If irrelevant, respond: NULL` }]
    })
  });
  const data = await res.json();
  const text = data.content?.[0]?.text?.trim() || 'NULL';
  return text === 'NULL' ? null : text;
}

let lastMentionId = null;

async function checkAndReply() {
  try {
    console.log('Checking mentions...');
    const result = await getMentions(lastMentionId);
    console.log('API status:', result.status);

    if (result.status !== 200) {
      console.log('API error:', JSON.stringify(result.body).substring(0, 300));
      return;
    }

    const mentions = Array.isArray(result.body) ? result.body : [];
    console.log('Mentions found:', mentions.length);
    if (mentions.length === 0) return;

    for (const tweet of [...mentions].reverse()) {
      if (tweet.user?.screen_name === SCREEN_NAME) continue;
      console.log('Mention from @' + tweet.user?.screen_name + ':', (tweet.full_text || '').substring(0, 80));
      lastMentionId = tweet.id_str;

      const reply = await claudeReply(tweet.full_text || tweet.text || '', tweet.user?.screen_name || 'unknown');
      if (reply) {
        console.log('Replying:', reply);
        const posted = await postReply(reply, tweet.id_str, tweet.user?.screen_name);
        console.log('Post status:', posted.status);
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.log('Skipping irrelevant tweet');
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

console.log('Humphrey Twitter agent starting...');
checkAndReply();
setInterval(checkAndReply, 5 * 60 * 1000);
module.exports = { checkAndReply };
