const { Resend } = require('resend');
const db = require('./db');
const config = require('./config');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendDailyDigest() {
  const summary = await db.getDailySummary();
  const html = `
    <h2>Humphrey Daily Digest</h2>
    <p><strong>Date:</strong> ${new Date().toDateString()}</p>
    <hr/>
    <ul>
      <li>✅ Replies posted: ${summary.posted}</li>
      <li>❌ Replies rejected: ${summary.rejected}</li>
      <li>🚫 Hard blocked: ${summary.blocked}</li>
      <li>⏳ Pending approval: ${summary.pending}</li>
    </ul>
  `;
  await resend.emails.send({
    from: config.EMAIL_FROM,
    to: config.EMAIL_TO,
    subject: `Humphrey Daily Digest — ${new Date().toDateString()}`,
    html
  });
}

module.exports = { sendDailyDigest };
