const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = {
  async tweetExists(tweetId) {
    const res = await pool.query('SELECT id FROM monitored_tweets WHERE tweet_id = $1', [tweetId]);
    return res.rows.length > 0;
  },

  async saveTweet(tweetId, accountHandle, tweetText, tweetUrl, status, proposedReply = null) {
    await pool.query(
      `INSERT INTO monitored_tweets (tweet_id, account_handle, tweet_text, tweet_url, status, proposed_reply)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (tweet_id) DO NOTHING`,
      [tweetId, accountHandle, tweetText, tweetUrl, status, proposedReply]
    );
  },

  async getTweetById(tweetId) {
    const res = await pool.query('SELECT * FROM monitored_tweets WHERE tweet_id = $1', [tweetId]);
    return res.rows[0];
  },

  async updateTweetStatus(tweetId, status, finalReply = null) {
    await pool.query(
      `UPDATE monitored_tweets SET status = $1, final_reply = $2, posted_at = NOW() WHERE tweet_id = $3`,
      [status, finalReply, tweetId]
    );
    if (finalReply) {
      const tweet = await this.getTweetById(tweetId);
      await this.saveMemory(tweet.account_handle, 'tweet', tweet.tweet_text, finalReply);
    }
  },

  async updateTelegramMessageId(tweetId, messageId) {
    await pool.query(
      'UPDATE monitored_tweets SET telegram_message_id = $1 WHERE tweet_id = $2',
      [messageId, tweetId]
    );
  },

  async saveMemory(accountHandle, interactionType, content, ourResponse) {
    await pool.query(
      `INSERT INTO humphrey_memory (account_handle, interaction_type, content, our_response)
       VALUES ($1, $2, $3, $4)`,
      [accountHandle, interactionType, content, ourResponse]
    );
  },

  async getMemoryForAccount(accountHandle, limit = 5) {
    const res = await pool.query(
      `SELECT * FROM humphrey_memory WHERE account_handle = $1 ORDER BY created_at DESC LIMIT $2`,
      [accountHandle, limit]
    );
    return res.rows.reverse();
  },

  async logBlockedTopic(tweetId, accountHandle, topic, tweetText) {
    await pool.query(
      `INSERT INTO blocked_topics_log (tweet_id, account_handle, topic_flagged, tweet_text) VALUES ($1, $2, $3, $4)`,
      [tweetId, accountHandle, topic, tweetText]
    );
  },

  async setPendingEdit(tweetId) {
    await pool.query(
      `INSERT INTO approval_queue (tweet_id, proposed_reply, status) VALUES ($1, 'pending_edit', 'editing')`,
      [tweetId]
    );
  },

  async getPendingEdit() {
    const res = await pool.query(
      `SELECT aq.tweet_id, mt.account_handle FROM approval_queue aq
       JOIN monitored_tweets mt ON mt.tweet_id = aq.tweet_id
       WHERE aq.status = 'editing' ORDER BY aq.created_at DESC LIMIT 1`
    );
    return res.rows[0] || null;
  },

  async clearPendingEdit() {
    await pool.query(`UPDATE approval_queue SET status = 'resolved', resolved_at = NOW() WHERE status = 'editing'`);
  },

  async getDailySummary() {
    const res = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'posted') as posted,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'blocked') as blocked,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
       FROM monitored_tweets WHERE detected_at > NOW() - INTERVAL '24 hours'`
    );
    return res.rows[0];
  }
};
