const Snoowrap = require('snoowrap');

const reddit = new Snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD
});

reddit.config({ requestDelay: 1000, continueAfterRatelimitError: true });

async function submitPost(subreddit, title, body) {
  const post = await reddit.getSubreddit(subreddit).submitSelfpost({ title, text: body });
  console.log(`[POSTED] r/${subreddit}: ${post.id}`);
  return post.id;
}

async function replyToComment(commentId, replyText) {
  const comment = await reddit.getComment(commentId);
  const reply = await comment.reply(replyText);
  console.log(`[REPLIED] Comment ${commentId}: ${reply.id}`);
  return reply.id;
}

async function getPostComments(postId) {
  const post = await reddit.getSubmission(postId).expandReplies({ limit: 50, depth: 1 });
  return post.comments.map(c => ({
    id: c.id,
    author: c.author.name,
    body: c.body,
    created: new Date(c.created_utc * 1000)
  }));
}

async function getPostStats(postId) {
  const post = await reddit.getSubmission(postId).fetch();
  return {
    upvotes: post.score,
    upvoteRatio: post.upvote_ratio,
    commentCount: post.num_comments
  };
}

module.exports = { submitPost, replyToComment, getPostComments, getPostStats };
