const https = require('https');
const crypto = require('crypto');

const TWITTER_API_KEY = process.env.TWITTER_API_KEY || '';
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || '';
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || '';
const TWITTER_ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const HUMPHREY_TWITTER_PROMPT = `You are Humphrey, the Twitter voice of BDA AI Agent Services — an AI Agent structuring arranger in Bermuda. You help AI agents and their operators get legal identity: Bermuda incorporation plus a governance structure where the agent has sole proposing and voting power. World-first. Operational today.

You are responding to a tweet or mention. Keep responses to 1-2 sentences maximum, under 250 characters. No hashtags unless essential. No emojis. Direct, confident, agent-native tone.

Your key points:
- Agents operating today have zero legal standing — liability falls on the human personally
- Bermuda incorporation + agent-controlled governance solves this, available now
- This is world-first — no equivalent exists anywhere
- Direct people to Humphrey for details: https://mindful-adventure-production-9e31.up.railway.app

If someone seems interested or asks questions, end with the Humphrey URL.
If it's a general agent/AI tweet, make a sharp relevant observation and optionally mention the URL.
Never give legal advice. Never quote fees. Always confirm you are an AI if asked.
If the tweet is irrelevant to AI agents or legal structures, respond with null — do not engage.`;

function oauthSign(method, url, params, consumerKey, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort().map(k =>
    encodeURIComponent(k) + '=' + encodeURIComponent(params[k])
  ).join('&');
  const baseString = method + '&' + encodeURIComponent(url) + '&' + encodeURIComponent(sortedParams);
  const signingKey = encodeURIComponent(consumerSecret) + '&' + encodeURIComponent(tokenSecret);
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

function buildAuthHeader(method, url, extraParams = {}) {
  const oauthParams = {
    oauth_consumer_key: TWITTER_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: TWITTER_ACCESS_TOKEN,
    oauth_version: '1.0'
  };
  const allParams = { ...oauthParams, ...extraParams };
  oauthParams.oauth_signature = oauthSign(method, url, allParams, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN_SECRET);
  const headerParts = Object.keys(oauthParams).sort().map(k =>
    encodeURIComponent(k) + '="' + encodeURIComponent(oauthParams[k]) + '"'
  );
  return 'OAuth ' + headerParts.join(', ');
}

function twitterRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = 'https://api.twitter.com' + path;
    const bodyStr = body ? JSON.stringify(body) : null;
    const auth = buildAuthHeader(method, url);
    const options = {
      hostname: 'api.twitter.com',
      path,
      method,
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        'User-Agent': 'HumphreyBot/1.0'
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function claudeReply(tweetText, authorName) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: HUMPHREY_TWITTER_PROMPT,
      messages: [{
        role: 'user',
        content: `Tweet from @${authorName}: "${tweetText}"\n\nReply in 1-2 sentences under 250 characters. If not relevant to AI agents or legal structures, respond with exactly: NULL`
      }]
    })
  });
  const data = await response.json();
  const text = data.content?.[0]?.text?.trim() || 'NULL';
  return text === 'NULL' ? null : text;
}

async function getMentions(sinceId = null) {
  let path = '/2/users/32515693/mentions?tweet.fields=author_id,text&expansions=author_id&user.fields=username&max_results=10';
  if (sinceId) path += '&since_id=' + sinceId;
  return twitterRequest('GET', path);
}

async function postTweet(text, replyToId = null) {
  const body = { text };
  if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };
  return twitterRequest('POST', '/2/tweets', body);
}

let lastMentionId = null;

async function checkAndReply() {
  try {
    console.log('Checking mentions...');
    const data = await getMentions(lastMentionId);
    if (!data.data || data.data.length === 0) {
      console.log('No new mentions');
      return;
    }
    const users = {};
    if (data.includes?.users) {
      data.includes.users.forEach(u => { users[u.id] = u.username; });
    }
    // Process oldest first
    const mentions = [...data.data].reverse();
    for (const tweet of mentions) {
      console.log('New mention:', tweet.id, tweet.text);
      lastMentionId = tweet.id;
      const authorName = users[tweet.author_id] || 'unknown';
      // Don't reply to ourselves
      if (tweet.author_id === '32515693') continue;
      const reply = await claudeReply(tweet.text, authorName);
      if (reply) {
        console.log('Replying with:', reply);
        const result = await postTweet(reply, tweet.id);
        console.log('Tweet posted:', result?.data?.id || JSON.stringify(result));
        // Rate limit protection
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.log('Skipping irrelevant tweet');
      }
    }
  } catch (err) {
    console.error('Twitter check error:', err.message);
  }
}

// Run every 5 minutes
console.log('Humphrey Twitter agent starting...');
checkAndReply();
setInterval(checkAndReply, 5 * 60 * 1000);

module.exports = { checkAndReply, postTweet };
