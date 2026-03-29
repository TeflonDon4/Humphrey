const { TwitterApi } = require('twitter-api-v2');
const config = require('./config');
const db = require('./db');
const humphrey = require('./humphrey');
const guardrails = require('./guardrails');
const telegram = require('./telegram');

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

async function checkAccount(handle) {
  try {
    const user = await twitterClient.v2.userByUsername(handle);
    if (!user.data) return;

    const tweets = await twitterClient.v2.userTimeline(user.data.id, {
      max_results: 5,
      'tweet.fields': ['created_at', 'text'],
      exclude: ['retweets', 'replies']
    });

    for (const tweet of tweets.data?.data || []) {
      const exists = await db.tweetExists(tweet.id);
      if (exists) continue;

      const age = Date.now() - new Date(tweet.created_at).getTime();
      if (age > 2 * 60 * 60 * 1000) continue;

      const hardBlock = guardrails.checkHardBlock(tweet.text);
      if (hardBlock.blocked) {
        await db.logBlockedTopic(tweet.id, handle, hardBlock.topic, tweet.text);
        await db.saveTweet(tweet.id, handle, tweet.text, `https://twitter.com/${handle}/status/${tweet.id}`, 'blocked');
        console.log(`[BLOCKED] @${handle} — topic: ${hardBlock.topic}`);
        continue;
      }

      const relevance = guardrails.checkRelevance(tweet.text);
      if (!relevance.relevant) {
        console.log(`[IRRELEVANT] @${handle} skipped — "${tweet.text.substring(0, 80)}..."`);
        continue;
      }

      const sensitive = guardrails.checkSensitiveTopic(tweet.text);
      const memory = await db.getMemoryForAccount(handle, 5);

      let proposedReply;
      try {
        proposedReply = await humphrey.generateReply(tweet.text, handle, memory);
      } catch (aiErr) {
        console.error(`[ANTHROPIC ERROR] @${handle} tweet ${tweet.id}: ${aiErr.message}`);
        continue;
      }

      const tweetUrl = `https://twitter.com/${handle}/status/${tweet.id}`;

      await db.saveTweet(tweet.id, handle, tweet.text, tweetUrl, 'pending', proposedReply);
      await telegram.sendApprovalRequest(tweet.id, handle, tweet.text, tweetUrl, proposedReply, sensitive.sensitive);

      console.log(`[QUEUED] Approval request sent for @${handle}`);
    }
  } catch (err) {
    console.error(`[ERROR] @${handle}: ${err.message}`);
  }
}

async function checkMentions() {
  try {
    const mentions = await twitterClient.v2.userMentionTimeline(process.env.TWITTER_USER_ID, {
      max_results: 10,
      'tweet.fields': ['created_at', 'text', 'author_id'],
    });

    for (const tweet of mentions.data?.data || []) {
      const exists = await db.tweetExists(tweet.id);
      if (exists) continue;

      const age = Date.now() - new Date(tweet.created_at).getTime();
      if (age > 2 * 60 * 60 * 1000) continue;

      const hardBlock = guardrails.checkHardBlock(tweet.text);
      if (hardBlock.blocked) {
        await db.logBlockedTopic(tweet.id, 'mention', hardBlock.topic, tweet.text);
        await db.saveTweet(tweet.id, 'mention', tweet.text, `https://twitter.com/i/status/${tweet.id}`, 'blocked');
        continue;
      }

      const relevance = guardrails.checkRelevance(tweet.text);
      if (!relevance.relevant) {
        console.log(`[IRRELEVANT] mention skipped — "${tweet.text.substring(0, 80)}..."`);
        continue;
      }

      const sensitive = guardrails.checkSensitiveTopic(tweet.text);

      let proposedReply;
      try {
        proposedReply = await humphrey.generateReply(tweet.text, 'mention', []);
      } catch (aiErr) {
        console.error(`[ANTHROPIC ERROR] mention tweet ${tweet.id}: ${aiErr.message}`);
        continue;
      }

      const tweetUrl = `https://twitter.com/i/status/${tweet.id}`;

      await db.saveTweet(tweet.id, 'mention', tweet.text, tweetUrl, 'pending', proposedReply);
      await telegram.sendApprovalRequest(tweet.id, 'mention/@BDAAIAgentSvcs', tweet.text, tweetUrl, proposedReply, sensitive.sensitive);
      console.log(`[MENTION] Approval request sent`);
    }
  } catch (err) {
    console.error(`[ERROR] Mentions check: ${err.message}`);
  }
}

async function checkHomeTimeline() {
  try {
    const timeline = await twitterClient.v2.homeTimeline({
      max_results: 20,
      'tweet.fields': ['created_at', 'text', 'author_id'],
      expansions: ['author_id'],
      'user.fields': ['public_metrics', 'description', 'created_at'],
      exclude: ['retweets', 'replies']
    });

    for (const tweet of timeline.data?.data || []) {
      const exists = await db.tweetExists(tweet.id);
      if (exists) continue;

      const age = Date.now() - new Date(tweet.created_at).getTime();
      if (age > 2 * 60 * 60 * 1000) continue;

      const author = timeline.includes?.users?.find(u => u.id === tweet.author_id);
      const handle = author?.username || 'unknown';

      if (handle.toLowerCase() === 'bdaaiagentsvcs') continue;

      // Credibility check — home timeline only
      const credibility = guardrails.checkAccountCredibility(author);
      if (!credibility.credible) {
        console.log(`[SPAM] @${handle} skipped — ${credibility.reason}`);
        continue;
      }

      // Spam/promotional content check — home timeline only
      const spam = guardrails.checkSpam(tweet.text, author?.description);
      if (spam.spam) {
        console.log(`[SPAM] @${handle} skipped — ${spam.reason}`);
        continue;
      }

      const hardBlock = guardrails.checkHardBlock(tweet.text);
      if (hardBlock.blocked) {
        await db.logBlockedTopic(tweet.id, handle, hardBlock.topic, tweet.text);
        await db.saveTweet(tweet.id, handle, tweet.text, `https://twitter.com/${handle}/status/${tweet.id}`, 'blocked');
        continue;
      }

      const relevance = guardrails.checkRelevance(tweet.text);
      if (!relevance.relevant) {
        console.log(`[IRRELEVANT] timeline @${handle} skipped — "${tweet.text.substring(0, 80)}..."`);
        continue;
      }

      const sensitive = guardrails.checkSensitiveTopic(tweet.text);
      const memory = await db.getMemoryForAccount(handle, 3);

      let proposedReply;
      try {
        proposedReply = await humphrey.generateReply(tweet.text, handle, memory);
      } catch (aiErr) {
        console.error(`[ANTHROPIC ERROR] timeline @${handle} tweet ${tweet.id}: ${aiErr.message}`);
        continue;
      }

      const tweetUrl = `https://twitter.com/${handle}/status/${tweet.id}`;

      await db.saveTweet(tweet.id, handle, tweet.text, tweetUrl, 'pending', proposedReply);
      await telegram.sendApprovalRequest(tweet.id, handle, tweet.text, tweetUrl, proposedReply, sensitive.sensitive);
      console.log(`[TIMELINE] Approval request sent for @${handle}`);

      await new Promise(r => setTimeout(r, 2000));
    }
  } catch (err) {
    console.error(`[ERROR] Home timeline check: ${err.message}`);
  }
}

async function runMonitorLoop() {
  console.log(`Humphrey online.`);
  console.log(`Monitoring ${config.MONITORED_ACCOUNTS.length} named accounts every ${config.POLL_INTERVAL / 60000} minutes.`);
  console.log(`Also monitoring @BDAAIAgentSvcs home timeline and mentions.`);

  const run = async () => {
    for (const handle of config.MONITORED_ACCOUNTS) {
      await checkAccount(handle);
      await new Promise(r => setTimeout(r, 2000));
    }
    await checkHomeTimeline();
    await checkMentions();
  };

  await run();
  setInterval(run, config.POLL_INTERVAL);
}

module.exports = { runMonitorLoop };
