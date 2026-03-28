const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = {
  async getCampaignState() {
    const res = await pool.query('SELECT * FROM campaign_state ORDER BY id DESC LIMIT 1');
    return res.rows[0] || null;
  },

  async initCampaign(startDate) {
    await pool.query(
      `INSERT INTO campaign_state (campaign_start, current_day) VALUES ($1, 1)`,
      [startDate]
    );
  },

  async incrementDay() {
    await pool.query(`UPDATE campaign_state SET current_day = current_day + 1, updated_at = NOW() WHERE id = (SELECT id FROM campaign_state ORDER BY id DESC LIMIT 1)`);
  },

  async savePost(dayNumber, subreddit, title, body, redditPostId) {
    await pool.query(
      `INSERT INTO reddit_posts (day_number, subreddit, title, body, reddit_post_id, posted_at, status) VALUES ($1, $2, $3, $4, $5, NOW(), 'posted')`,
      [dayNumber, subreddit, title, body, redditPostId]
    );
  },

  async getActivePosts() {
    const res = await pool.query(`SELECT * FROM reddit_posts WHERE status = 'posted' AND reddit_post_id IS NOT NULL`);
    return res.rows;
  },

  async updatePostStats(postId, upvotes, commentCount) {
    await pool.query(
      `UPDATE reddit_posts SET upvotes = $1, comment_count = $2, last_checked = NOW() WHERE id = $3`,
      [upvotes, commentCount, postId]
    );
  },

  async commentExists(redditCommentId) {
    const res = await pool.query('SELECT id FROM reddit_comments WHERE reddit_comment_id = $1', [redditCommentId]);
    return res.rows.length > 0;
  },

  async saveComment(redditCommentId, postId, redditPostId, author, commentText, proposedReply, isSensitive, sensitiveTopic) {
    await pool.query(
      `INSERT INTO reddit_comments (reddit_comment_id, post_id, reddit_post_id, author, comment_text, proposed_reply, is_sensitive, sensitive_topic)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [redditCommentId, postId, redditPostId, author, commentText, proposedReply, isSensitive, sensitiveTopic]
    );
  },

  async getCommentById(redditCommentId) {
    const res = await pool.query(
      `SELECT rc.*, rp.subreddit FROM reddit_comments rc
       JOIN reddit_posts rp ON rp.id = rc.post_id
       WHERE rc.reddit_comment_id = $1`,
      [redditCommentId]
    );
    return res.rows[0];
  },

  async updateCommentStatus(redditCommentId, status, finalReply = null) {
    await pool.query(
      `UPDATE reddit_comments SET status = $1, final_reply = $2, replied_at = NOW() WHERE reddit_comment_id = $3`,
      [status, finalReply, redditCommentId]
    );
    if (finalReply) {
      const comment = await this.getCommentById(redditCommentId);
      await this.saveMemory(comment.author, 'comment', comment.comment_text, finalReply, comment.subreddit);
    }
  },

  async updateCommentTelegramId(redditCommentId, messageId) {
    await pool.query(
      'UPDATE reddit_comments SET telegram_message_id = $1 WHERE reddit_comment_id = $2',
      [messageId, redditCommentId]
    );
  },

  async saveMemory(username, contextType, content, ourResponse, subreddit) {
    await pool.query(
      `INSERT INTO payagent_memory (reddit_username, context_type, content, our_response, subreddit) VALUES ($1, $2, $3, $4, $5)`,
      [username, contextType, content, ourResponse, subreddit]
    );
  },

  async getMemoryForUser(username, limit = 3) {
    const res = await pool.query(
      `SELECT * FROM payagent_memory WHERE reddit_username = $1 ORDER BY created_at DESC LIMIT $2`,
      [username, limit]
    );
    return res.rows.reverse();
  },

  async logBlockedComment(commentId, author, topic, commentText) {
    await pool.query(
      `INSERT INTO reddit_blocked_log (comment_id, author, topic_flagged, comment_text) VALUES ($1, $2, $3, $4)`,
      [commentId, author, topic, commentText]
    );
  },

  async setPendingEdit(id, platform) {
    await pool.query(
      `INSERT INTO approval_queue (tweet_id, proposed_reply, status, platform) VALUES ($1, 'pending_edit', 'editing', $2)`,
      [id, platform]
    ).catch(() => {
      pool.query(`UPDATE approval_queue SET status = 'editing' WHERE tweet_id = $1`, [id]);
    });
  },

  async getPendingEdit(platform) {
    const res = await pool.query(
      `SELECT aq.tweet_id as id, aq.tweet_id as reddit_comment_id, rc.author
       FROM approval_queue aq
       JOIN reddit_comments rc ON rc.reddit_comment_id = aq.tweet_id
       WHERE aq.status = 'editing' ORDER BY aq.created_at DESC LIMIT 1`
    );
    return res.rows[0] || null;
  },

  async clearPendingEdit(platform) {
    await pool.query(`UPDATE approval_queue SET status = 'resolved', resolved_at = NOW() WHERE status = 'editing'`);
  },

  async getDailySummary() {
    const res = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'replied') as replied,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
       FROM reddit_comments WHERE detected_at > NOW() - INTERVAL '24 hours'`
    );
    const posts = await pool.query(
      `SELECT day_number, subreddit, upvotes, comment_count FROM reddit_posts WHERE status = 'posted' ORDER BY day_number`
    );
    return { comments: res.rows[0], posts: posts.rows };
  }
};
