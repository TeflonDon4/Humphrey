const { Resend } = require('resend');
const db = require('./db');
const config = require('./config');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendDailyDigest() {
  const summary = await db.getDailySummary();
  const postsHtml = summary.posts.map(p =>
    `<li>Day ${p.day_number} — r/${p.subreddit}: ${p.upvotes} upvotes, ${p.comment_count} comments</li>`
  ).join('');

  const html = `
    <h2>PayAgent Reddit Campaign Digest</h2>
    <p><strong>Date:</strong> ${new Date().toDateString()}</p>
    <hr/>
    <h3>Comment Activity (last 24h)</h3>
    <ul>
      <li>✅ Replies posted: ${summary.comments.replied}</li>
      <li>❌ Replies rejected: ${summary.comments.rejected}</li>
      <li>⏳ Pending approval: ${summary.comments.pending}</li>
    </ul>
    <h3>Post Performance</h3>
    <ul>${postsHtml}</ul>
  `;

  await resend.emails.send({
    from: config.EMAIL_FROM,
    to: config.EMAIL_TO,
    subject: `PayAgent Reddit Digest — ${new Date().toDateString()}`,
    html
  });
}

module.exports = { sendDailyDigest };
