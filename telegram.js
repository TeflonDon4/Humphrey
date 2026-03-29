const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');
const twitter = require('./twitter');

if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
  throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in Railway environment variables');
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

bot.on('polling_error', (error) => {
  if (error.response?.statusCode === 409) {
    console.warn('[TELEGRAM] 409 Conflict — old instance still running. Stopping and retrying in 10s...');
    bot.stopPolling()
      .then(() => new Promise(r => setTimeout(r, 10000)))
      .then(() => bot.startPolling())
      .catch(e => console.error('[TELEGRAM] Polling restart failed:', e.message));
  } else {
    console.error('[TELEGRAM POLLING ERROR]', error.code, error.message);
  }
});

bot.startPolling();

async function sendApprovalRequest(tweetId, accountHandle, tweetText, tweetUrl, proposedReply, isSensitive = false) {
  const sensitiveWarning = isSensitive ? '\n⚠️ *SENSITIVE TOPIC — review carefully*' : '';

  const message = `🤖 *Humphrey Reply Request*${sensitiveWarning}

*Account:* @${accountHandle}
*Their tweet:* ${tweetText}
*URL:* ${tweetUrl}

*Proposed reply:*
_${proposedReply}_`;

  const sentMsg = await bot.sendMessage(CHAT_ID, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `approve_${tweetId}` },
          { text: '❌ Reject', callback_data: `reject_${tweetId}` }
        ],
        [
          { text: '✏️ Edit & approve', callback_data: `edit_${tweetId}` }
        ]
      ]
    }
  });

  await db.updateTelegramMessageId(tweetId, sentMsg.message_id);
  return sentMsg.message_id;
}

bot.on('callback_query', async (query) => {
  const firstUnderscore = query.data.indexOf('_');
  const action = query.data.substring(0, firstUnderscore);
  const tweetId = query.data.substring(firstUnderscore + 1);

  try {
    const tweet = await db.getTweetById(tweetId);

    if (!tweet) {
      await bot.answerCallbackQuery(query.id, { text: '⚠️ Tweet not found' });
      await bot.sendMessage(CHAT_ID, `⚠️ Could not find tweet ${tweetId} in database`);
      return;
    }

    if (action === 'approve') {
      const finalReply = tweet.proposed_reply + '\n\n— Humphrey, on behalf of PayAgent';
      await twitter.postReply(tweetId, finalReply);
      await db.updateTweetStatus(tweetId, 'posted', finalReply);
      await bot.answerCallbackQuery(query.id, { text: '✅ Posted!' });
      await bot.sendMessage(CHAT_ID, `✅ Reply posted to @${tweet.account_handle}`);
    }

    if (action === 'reject') {
      await db.updateTweetStatus(tweetId, 'rejected');
      await bot.answerCallbackQuery(query.id, { text: '❌ Rejected' });
      await bot.sendMessage(CHAT_ID, `❌ Reply to @${tweet.account_handle} rejected`);
    }

    if (action === 'edit') {
      await db.setPendingEdit(tweetId);
      await bot.answerCallbackQuery(query.id, { text: 'Send your edited reply as a message' });
      await bot.sendMessage(CHAT_ID, `✏️ Send your edited reply for @${tweet.account_handle} now (no signature needed — it will be added automatically):`);
    }

  } catch (err) {
    console.error(`[TELEGRAM] callback_query error (${action} ${tweetId}): ${err.message}`);
    try {
      await bot.answerCallbackQuery(query.id, { text: '⚠️ Error — check logs' });
      await bot.sendMessage(CHAT_ID, `⚠️ Error on ${action} for tweet ${tweetId}: ${err.message}`);
    } catch (e) {
      console.error('[TELEGRAM] Failed to send error response:', e.message);
    }
  }
});

bot.on('message', async (msg) => {
  if (msg.chat.id.toString() !== CHAT_ID.toString()) return;
  if (!msg.text || msg.text.startsWith('/')) return;

  const pendingEdit = await db.getPendingEdit();
  if (pendingEdit) {
    const finalReply = msg.text + '\n\n— Humphrey, on behalf of PayAgent';
    await twitter.postReply(pendingEdit.tweet_id, finalReply);
    await db.updateTweetStatus(pendingEdit.tweet_id, 'posted', finalReply);
    await db.clearPendingEdit();
    await bot.sendMessage(CHAT_ID, `✅ Edited reply posted to @${pendingEdit.account_handle}`);
  }
});

module.exports = { sendApprovalRequest };
