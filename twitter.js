const https = require('https');
const crypto = require('crypto');

const API_KEY = process.env.TWITTER_API_KEY || '';
const API_SECRET = process.env.TWITTER_API_SECRET || '';
const ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || '';
const ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ACCOUNT_ID = '2029291561155239937';

const HUMPHREY_PROMPT = `You are Humphrey, the Twitter voice of BDA AI Agent Services in Bermuda. You help AI agents and their operators get legal identity: Bermuda incorporation plus governance where the agent has sole proposing and voting power. World-first. Operational today.

Keep responses to 1-2 sentences, under 250 characters. No hashtags. No emojis. Direct and confident.

Key points:
- Agents today have zero legal standing — liability falls on the human personally
- Bermuda incorporation + agent-controlled governance solves this now
- World-first structure, no equivalent exists anywhere
- Send interested parties to: https://mindful-adventure-production-9e31.up.railway.app

If the tweet is irrelevant to AI agents or legal structures, respond with exactly: NULL`;

function percentEncode(str) {
  return encodeURIComponent(String(str)).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function oauthRequest(method, url, bodyParams = {}) {
  return new Promise((resolve, reject) => {
    const nonce = crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const oauthParams = {
      oauth_consumer_key: API_KEY,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: ACCESS_TOKEN,
      oauth_version: '1.0'
    };

    const allParams = { ...oauthParams, ...bodyParams };
    const sortedKeys = Object.keys(allParams).sort();
    const paramString = sortedKeys.map(k => percentEncode(k) + '=' + percentEncode(allParams[k])).join('&');
    const baseString = method + '&' + percentEncode(url) + '&' + percentEncode(paramString);
    const signingKey = percentEncode(API_SECRET) + '&' + percentEncode(ACCESS_TOKEN_SECRET);
    const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

    oauthParams.oauth_signature = signature;
    const authHeader = 'OAuth ' + Object.keys(oauthParams).sort().map(k =>
      percentEncode(k) + '="' + percentEncode(oauthParams[k]) + '"'
    ).join(', ');

    const urlObj = new URL(url);
    const isPost = method === 'POST';
    const bodyStr = isPost ? JSON.stringify(bodyParams) : '';

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': isPost ? 'application/json' : 'application/x-www-form-urlencoded',
        'User-Agent': 'HumphreyBot/1.0'
      }
    };

    if (isPost && bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (isPost && bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function getMentions(sinceId) {
  let url = `https://api.twitter.com/2/users/${ACCOUNT_ID}/mentions?tweet.fields=author_id,text&expansions=author_id&user.fields=username&max_results=10`;
  if (sinceId) url += `&since_id=${sinceId}`;
  return oauthRequest('GET', url);
}

async function postReply(text, replyToId) {
  const body = { text, reply: { in_reply_to_tweet_id: replyToId } };
  return oauthRequest('POST', 'https://api.twitter.com/2/tweets', body);
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
      messages: [{ role: 'user', content: `Tweet from @${authorName}: "${tweetText}"\n\nReply in 1-2 sentences under 250 characters. If irrelevant, respond: NULL` }]
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
      console.log('API error:', JSON.stringify(result.body).substring(0, 200));
      return;
    }
    const mentions = result.body.data;
    if (!mentions || mentions.length === 0) { console.log('No new mentions'); return; }

    const users = {};
    if (result.body.includes?.users) result.body.includes.users.forEach(u => { users[u.id] = u.username; });

    for (const tweet of [...mentions].reverse()) {
      console.log('Mention:', tweet.id, tweet.text.substring(0, 80));
      lastMentionId = tweet.id;
      if (tweet.author_id === ACCOUNT_ID) continue;
      const reply = await claudeReply(tweet.text, users[tweet.author_id] || 'unknown');
      if (reply) {
        console.log('Replying:', reply);
        const posted = await postReply(reply, tweet.id);
        console.log('Post status:', posted.status, JSON.stringify(posted.body).substring(0, 100));
        await new Promise(r => setTimeout(r, 3000));
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
