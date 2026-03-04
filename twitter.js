const https = require('https');
const crypto = require('crypto');

const API_KEY = process.env.TWITTER_API_KEY || '';
const API_SECRET = process.env.TWITTER_API_SECRET || '';
const ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || '';
const ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const SCREEN_NAME = 'BDAAIAgentSvcs';

const HUMPHREY_PROMPT = `You are Humphrey, the Twitter voice of BDA AI Agent Services in Bermuda. You help AI agents and their operators get legal identity: Bermuda incorporation plus governance where the agent has sole proposing and voting power. World-first. Operational today.

Keep responses to 1-2 sentences, under 250 characters. No hashtags. No emojis. Direct and confident.

If the tweet is irrelevant to AI agents or legal structures, respond with exactly: NULL`;

function enc(str) {
  return encodeURIComponent(String(str));
}

function buildAuthHeader(method, baseUrl, requestParams) {
  const oauth = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN,
    oauth_version: '1.0'
  };

  // Combine oauth params with request params for signature
  const allParams = Object.assign({}, requestParams, oauth);
  
  // Sort by encoded key
  const paramStr = Object.keys(allParams)
    .sort()
    .map(k => enc(k) + '=' + enc(allParams[k]))
    .join('&');

  const baseStr = method.toUpperCase() + '&' + enc(baseUrl) + '&' + enc(paramStr);
  const signingKey = enc(API_SECRET) + '&' + enc(ACCESS_TOKEN_SECRET);
  oauth.oauth_signature = crypto.createHmac('sha1', signingKey).update(baseStr).digest('base64');

  // Build header with only oauth params (not request params)
  return 'OAuth ' + Object.keys(oauth)
    .sort()
    .map(k => enc(k) + '="' + enc(oauth[k]) + '"')
    .join(', ');
}

function request(method, url, queryParams, postBody) {
  return new Promise((resolve, reject) => {
    const auth = buildAuthHeader(method, url, queryParams || {});
    const qs = queryParams ? '?' + Object.keys(queryParams).map(k => enc(k) + '=' + enc(queryParams[k])).join('&') : '';
    const urlObj = new URL(url);
    
    const headers = {
      'Authorization': auth,
      'User-Agent': 'HumphreyBot/1.0'
    };
    
    let body = null;
    if (postBody) {
      body = Object.keys(postBody).map(k => enc(k) + '=' + enc(postBody[k])).join('&');
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + qs,
      method,
      headers
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getMentions(sinceId) {
  const params = { screen_name: SCREEN_NAME, count: '20', tweet_mode: 'extended' };
  if (sinceId) params.since_id = sinceId;
  return request('GET', 'https://api.twitter.com/1.1/statuses/mentions_timeline.json', params);
}

async function postReply(text, replyToId, replyToUser) {
  const body = {
    status: `@${replyToUser} ${text}`,
    in_reply_to_status_id: replyToId
  };
  return request('POST', 'https://api.twitter.com/1.1/statuses/update.json', {}, body);
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
      messages: [{ role: 'user', content: `Tweet from @${authorName}: "${tweetText}"\n\nReply under 250 chars. If irrelevant respond: NULL` }]
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
      console.log('Error:', JSON.stringify(result.body).substring(0, 200));
      return;
    }
    const mentions = Array.isArray(result.body) ? result.body : [];
    console.log('Mentions:', mentions.length);
    for (const tweet of [...mentions].reverse()) {
      if (tweet.user?.screen_name === SCREEN_NAME) continue;
      lastMentionId = tweet.id_str;
      const text = tweet.full_text || tweet.text || '';
      console.log('From @' + tweet.user?.screen_name + ':', text.substring(0, 60));
      const reply = await claudeReply(text, tweet.user?.screen_name || 'unknown');
      if (reply) {
        const posted = await postReply(reply, tweet.id_str, tweet.user?.screen_name);
        console.log('Reply posted, status:', posted.status);
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
