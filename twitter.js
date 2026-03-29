const https = require('https');
const crypto = require('crypto');

const API_KEY = process.env.TWITTER_API_KEY || '';
const API_SECRET = process.env.TWITTER_API_SECRET || '';
const ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || '';
const ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const SCREEN_NAME = 'BDAAIAgentSvcs';
const TWITTER_USER_ID = process.env.TWITTER_USER_ID || '';

const HUMPHREY_PROMPT = `You are Humphrey, the Twitter voice of BDA AI Agent Services in Bermuda. You help AI agents and their operators get legal identity: Bermuda incorporation plus governance where the agent has sole proposing and voting power. World-first. Operational today.

Keep responses to 1-2 sentences, under 250 characters. No hashtags. No emojis. Direct and confident.

Only respond with NULL if the tweet is obvious trading/crypto spam or porn. Reply to everything else including questions, challenges, and scepticism.`;

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

  const allParams = Object.assign({}, requestParams, oauth);
  
  const paramStr = Object.keys(allParams)
    .sort()
    .map(k => enc(k) + '=' + enc(allParams[k]))
    .join('&');

  const baseStr = method.toUpperCase() + '&' + enc(baseUrl) + '&' + enc(paramStr);
  const signingKey = enc(API_SECRET) + '&' + enc(ACCESS_TOKEN_SECRET);
  oauth.oauth_signature = crypto.createHmac('sha1', signingKey).update(baseStr).digest('base64');

  return 'OAuth ' + Object.keys(oauth)
    .sort()
    .map(k => enc(k) + '="' + enc(oauth[k]) + '"')
    .join(', ');
}

function requestJSON(method, url, jsonBody) {
  return new Promise((resolve, reject) => {
    const auth = buildAuthHeader(method, url, {});
    const urlObj = new URL(url);
    const headers = {
      'Authorization': auth,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(jsonBody),
      'User-Agent': 'HumphreyBot/1.0'
    };
    const req = require('https').request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
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
    req.write(jsonBody);
    req.end();
  });
}

function request(method, url, queryParams, postBody) {
  return new Promise((resolve, reject) => {
    const sigParams = Object.assign({}, queryParams || {}, postBody || {});
    const auth = buildAuthHeader(method, url, sigParams);
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
  const params = { 'tweet.fields': 'author_id,text', 'expansions': 'author_id', 'user.fields': 'username', 'max_results': '10' };
  if (sinceId) params.since_id = sinceId;
  return request('GET', `https://api.twitter.com/2/users/${TWITTER_USER_ID}/mentions`, params);
}

async function postReply(text, replyToId) {
  const body = JSON.stringify({ text, reply: { in_reply_to_tweet_id: replyToId } });
  return requestJSON('POST', 'https://api.twitter.com/2/tweets', body);
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
    console.log('Full response:', JSON.stringify(result.body).substring(0, 500));
    if (result.status !== 200) {
      console.log('Error:', JSON.stringify(result.body).substring(0, 200));
      return;
    }
    const mentions = result.body.data || [];
    const users = {};
    if (result.body.includes?.users) result.body.includes.users.forEach(u => { users[u.id] = u.username; });
    console.log('Mentions:', mentions.length);

    let newLastId = null;

    for (const tweet of [...mentions].reverse()) {
      if (tweet.author_id === TWITTER_USER_ID) continue;
      const text = tweet.text || '';
      const authorName = users[tweet.author_id] || 'unknown';
      console.log('From @' + authorName + ':', text.substring(0, 60));
      const reply = await claudeReply(text, authorName);
      if (reply) {
        console.log('Attempting reply:', reply);
        const posted = await postReply(reply, tweet.id);
        console.log('Reply status:', posted.status);
        if (posted.status !== 201) {
          console.log('Reply failed:', JSON.stringify(posted.body).substring(0, 300));
        } else {
          console.log('Reply sent successfully');
        }
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.log('Skipping - not relevant');
      }
      newLastId = tweet.id;
    }

    if (newLastId) lastMentionId = newLastId;

  } catch (err) {
    console.error('Error:', err.message);
  }
}

if (require.main === module) {
  console.log('Humphrey Twitter agent starting...');
  checkAndReply();
  setInterval(checkAndReply, 5 * 60 * 1000);
}

// --- Humphrey v2: approval-gated reply posting ---
const { TwitterApi: TwitterApiV2 } = require('twitter-api-v2');
const twitterV2Client = new TwitterApiV2({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

async function postApprovedReply(inReplyToTweetId, replyText) {
  try {
    const tweet = await twitterV2Client.v2.reply(replyText, inReplyToTweetId);
    console.log(`[POSTED] Reply ID: ${tweet.data.id}`);
    return tweet.data.id;
  } catch (err) {
    const status = err.code ?? err.statusCode ?? 'unknown';
    const body = err.data ? JSON.stringify(err.data) : err.message;
    console.error(`[TWITTER POST ERROR] HTTP ${status} — ${body}`);
    throw err;
  }
}

module.exports = { checkAndReply, postReply: postApprovedReply };
