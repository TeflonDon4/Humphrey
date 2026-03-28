const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');
const reddit = require('./reddit');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendApprovalRequest(commentId, author, subreddit, commentText, proposedReply, isSensitive = false) {
  const warning = isSensitive ? '\n🔴 *SENSITIVE TOPIC — review carefully before approving*' : '';

  const message = `🤖 *PayAgent Reddit Reply Request*${warning}

*Subreddit:* r/${subreddit}
*From:* u/${author}
*Their comment:* ${commentText}

*Proposed reply:*
_${proposedReply}_`;

  const sentMsg = await bot.sendMessage(CHAT_ID, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `rapprove_${commentId}` },
          { text: '❌ Reject', callback_data: `rreject_${commentId}` }
        ],
        [
          { text: '✏️ Edit & approve', callback_data: `redit_${commentId}` }
        ]
      ]
    }
  });

  await db.updateCommentTelegramId(commentId, sentMsg.message_id);
  return sentMsg.message_id;
}

bot.on('callback_query', async (query) => {
  const data = query.data;
  if (!data.startsWith('r')) return; // Only handle Reddit callbacks

  const action = data.startsWith('rapprove') ? 'approve' :
                 data.startsWith('rreject') ? 'reject' : 'edit';
  const commentId = data.split('_')[1];
  const comment = await db.getCommentById(commentId);

  if (action === 'approve') {
    await reddit.replyToComment(comment.reddit_comment_id, comment.proposed_reply);
    await db.updateCommentStatus(commentId, 'replied', comment.proposed_reply);
    await bot.answerCallbackQuery(query.id, { text: '✅ Reply posted!' });
    await bot.sendMessage(CHAT_ID, `✅ Replied to u/${comment.author} on r/${comment.subreddit}`);
  }

  if (action === 'reject') {
    await db.updateCommentStatus(commentId, 'rejected');
    await bot.answerCallbackQuery(query.id, { text: '❌ Rejected' });
  }

  if (action === 'edit') {
    await db.setPendingEdit(commentId, 'reddit');
    await bot.answerCallbackQuery(query.id, { text: 'Send your edited reply now' });
    await bot.sendMessage(CHAT_ID, `✏️ Send your edited reply for u/${comment.author}:`);
  }
});

bot.on('message', async (msg) => {
  if (msg.chat.id.toString() !== CHAT_ID.toString()) return;
  if (!msg.text || msg.text.startsWith('/')) return;

  const pendingEdit = await db.getPendingEdit('reddit');
  if (pendingEdit) {
    await reddit.replyToComment(pendingEdit.reddit_comment_id, msg.text);
    await db.updateCommentStatus(pendingEdit.id, 'replied', msg.text);
    await db.clearPendingEdit('reddit');
    await bot.sendMessage(CHAT_ID, `✅ Edited reply posted to u/${pendingEdit.author}`);
  }
});

module.exports = { sendApprovalRequest };
