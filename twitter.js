// twitter.js — Humphrey Twitter monitor with Telegram approval flow
// Uses twitter-api-v2 package for reliable OAuth 1.0a handling

const { TwitterApi } = require('twitter-api-v2');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY || '',
  appSecret: process.env.TWITTER_API_SECRET || '',
  accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
});

const rwClient = twitterClient.readWrite;

const HUMPHREY_PROMPT = `You are Humphrey, the Twitter voice of BDA AI Agent Services in Bermuda. You help AI agents and their operators get legal identity: Bermuda incorporation plus governance where the agent has sole proposing and voting power. World-first. Operational today.

Keep responses to 1-2 sentences, under 250 characters. No hashtags. No emojis. Direct and confident.

Key points:
- Agents today have zero legal standing — liability falls on the human personally
- Bermuda incorporation + agent-controlled governance solves this now
- World-first structure, no equivalent exists anywhere
- Send interested parties to: https://mindful-adventure-production-9e31.up.railway.app

If the tweet is irrelevant to AI agents or legal structures, respond with exactly: NULL`;

let lastMentionId = null;
let lastCheckTime = null;
let recentMentions = [];
let myUserId = null;

async function getMyUserId() {
  if (myUserId) return myUserId;
  const me = await rwClient.v2.me();
  myUserId = me.data.id;
  return myUserId;
}

async function getMentions() {
  const userId = await getMyUserId();
  const params = {
    'tweet.fields': 'author_id,text,created_at',
    'expansions': 'author_id',
    'user.fields': 'username',
    'max_results': 10,
  };
  if (lastMentionId) params.since_id = lastMentionId;

  // Use direct v2.get for raw response access (includes expansions)
  return rwClient.v2.get(`users/${userId}/mentions`, params);
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
      messages: [{
        role: 'user',
        content: `Tweet from @${authorName}: "${tweetText}"\n\nReply under 250 chars. If irrelevant respond: NULL`
      }]
    })
  });
  const data = await res.json();
  const text = data.content?.[0]?.text?.trim() || 'NULL';
  return text === 'NULL' ? null : text;
}

async function checkAndReply() {
  try {
    lastCheckTime = new Date().toLocaleString('en-GB', { timeZone: 'Atlantic/Bermuda' });
    console.log('Checking Twitter mentions...');

    const result = await getMentions();
    const mentions = result.data || [];
    const users = {};
    if (result.includes?.users) {
      result.includes.users.forEach(u => { users[u.id] = u.username; });
    }

    console.log(`Found ${mentions.length} mention(s)`);

    // Store recent mentions for /mentions Telegram command
    recentMentions = mentions.slice(0, 5).map(m => ({
      author: users[m.author_id] || 'unknown',
      text: m.text || '',
      id: m.id
    }));

    const userId = await getMyUserId();
    let newLastId = null;

    for (const tweet of [...mentions].reverse()) {
      // Skip own tweets
      if (tweet.author_id === userId) continue;

      const text = tweet.text || '';
      const authorName = users[tweet.author_id] || 'unknown';
      console.log(`Mention from @${authorName}: ${text.substring(0, 80)}`);

      const reply = await claudeReply(text, authorName);

      if (reply) {
        console.log('Generated reply, sending to Telegram for approval...');
        const telegram = require('./telegram.js');
        const approved = await telegram.requestTwitterApproval(authorName, text, reply, tweet.id);

        if (approved) {
          console.log('Approved — posting reply to Twitter...');
          await rwClient.v2.tweet({
            text: reply,
            reply: { in_reply_to_tweet_id: tweet.id }
          });
          console.log('Reply posted successfully');
        } else {
          console.log('Skipped by BC or timed out');
        }

        // Brief pause between processing tweets to avoid rate limits
        await new Promise(r => setTimeout(r, 2000));
      } else {
        console.log('Not relevant — skipping');
      }

      newLastId = tweet.id;
    }

    if (newLastId) lastMentionId = newLastId;

  } catch (err) {
    console.error('Twitter check error:', err.message);
    if (err.data) console.error('Twitter error data:', JSON.stringify(err.data).substring(0, 300));
  }
}

function getStatus() {
  return {
    lastCheck: lastCheckTime || 'Not yet',
    lastMentionId
  };
}

function getRecentMentions() {
  return recentMentions;
}

// Register status providers for Telegram /status and /mentions commands
const telegram = require('./telegram.js');
telegram.registerProvider('twitterStatus', getStatus);
telegram.registerProvider('recentMentions', getRecentMentions);

console.log('Humphrey Twitter agent starting...');
checkAndReply();
setInterval(checkAndReply, 5 * 60 * 1000);

module.exports = { checkAndReply, getStatus, getRecentMentions };
