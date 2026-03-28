const cron = require('node-cron');
const db = require('./db');
const reddit = require('./reddit');
const payagent = require('./payagent');
const guardrails = require('./guardrails');
const telegram = require('./telegram');
const campaign = require('./campaign');
const config = require('./config');

async function runDailyPost() {
  const state = await db.getCampaignState();
  if (!state || state.current_day > 7) {
    console.log('Campaign complete.');
    return;
  }

  const post = campaign.posts.find(p => p.day === state.current_day);
  if (!post) return;

  if (post.engagementDay) {
    console.log(`[DAY ${state.current_day}] Engagement day — sweeping all open threads`);
    await sweepAllThreads();
  } else {
    console.log(`[DAY ${state.current_day}] Posting to r/${post.subreddit}`);
    const postId = await reddit.submitPost(post.subreddit, post.title, post.body);
    await db.savePost(state.current_day, post.subreddit, post.title, post.body, postId);
  }

  await db.incrementDay();
}

async function sweepAllThreads() {
  const activePosts = await db.getActivePosts();
  for (const post of activePosts) {
    if (!post.reddit_post_id) continue;
    const comments = await reddit.getPostComments(post.reddit_post_id);

    for (const comment of comments) {
      const exists = await db.commentExists(comment.id);
      if (exists) continue;
      if (comment.author === 'PayAgentAI') continue;

      const hardBlock = guardrails.checkHardBlock(comment.body);
      if (hardBlock.blocked) {
        await db.logBlockedComment(comment.id, comment.author, hardBlock.topic, comment.body);
        continue;
      }

      const sensitive = guardrails.checkSensitiveTopic(comment.body);
      const memory = await db.getMemoryForUser(comment.author, 3);
      const proposedReply = await payagent.generateReply(
        comment.body, comment.author, post.subreddit, memory, post.title
      );

      await db.saveComment(comment.id, post.id, post.reddit_post_id, comment.author, comment.body, proposedReply, sensitive.sensitive, sensitive.topic);
      await telegram.sendApprovalRequest(
        comment.id, comment.author, post.subreddit, comment.body, proposedReply, sensitive.sensitive
      );

      await new Promise(r => setTimeout(r, 2000));
    }

    const stats = await reddit.getPostStats(post.reddit_post_id);
    await db.updatePostStats(post.id, stats.upvotes, stats.commentCount);
  }
}

function startScheduler() {
  // Daily post at 2pm UTC
  cron.schedule('0 14 * * *', async () => {
    console.log('[CRON] Running daily post check');
    await runDailyPost();
  });

  // Comment monitoring every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[CRON] Sweeping threads for new comments');
    await sweepAllThreads();
  });

  console.log('PayAgent scheduler started.');
}

module.exports = { startScheduler, runDailyPost, sweepAllThreads };
