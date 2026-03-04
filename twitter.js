const { TwitterApi } = require('twitter-api-v2');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY || '',
  appSecret: process.env.TWITTER_API_SECRET || '',
  accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
});

const ACCOUNT_ID = '2029291561155239937';

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
If the tweet is irrelevant to AI agents or legal structures, respond with exactly: NULL`;

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

let lastMentionId = null;

async function checkAndReply() {
  try {
    console.log('Checking mentions...');
    const params = {
      'tweet.fields': ['author_id', 'text'],
      'expansions': ['author_id'],
      'user.fields': ['username'],
      'max_results': 10
    };
    if (lastMentionId) params.since_id = lastMentionId;

    const response = await client.v2.userMentionTimeline(ACCOUNT_ID, params);
    const mentions = response.data.data;

    if (!mentions || mentions.length === 0) {
      console.log('No new mentions');
      return;
    }

    const users = {};
    if (response.data.includes?.users) {
      response.data.includes.users.forEach(u => { users[u.id] = u.username; });
    }

    const ordered = [...mentions].reverse();
    for (const tweet of ordered) {
      console.log('Mention:', tweet.id, tweet.text);
      lastMentionId = tweet.id;
      if (tweet.author_id === ACCOUNT_ID) continue;
      const authorName = users[tweet.author_id] || 'unknown';
      const reply = await claudeReply(tweet.text, authorName);
      if (reply) {
        console.log('Replying:', reply);
        await client.v2.reply(reply, tweet.id);
        console.log('Reply sent');
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.log('Skipping irrelevant tweet');
      }
    }
  } catch (err) {
    console.error('Twitter error:', err.message || err);
  }
}

console.log('Humphrey Twitter agent starting...');
checkAndReply();
setInterval(checkAndReply, 5 * 60 * 1000);

module.exports = { checkAndReply };
