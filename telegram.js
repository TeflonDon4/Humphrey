// telegram.js — Humphrey Telegram bot
// Handles: BC notifications, Twitter approval flow, BC↔Humphrey private chat

const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Provider registry — twitter.js and server.js register functions here
// so telegram.js never needs to require() them (avoids circular deps)
const providers = {};

function registerProvider(name, fn) {
  providers[name] = fn;
}

// Pending Twitter approvals: messageId -> { resolve, timeout, originalText }
const pendingApprovals = new Map();

let bot = null;

if (!TELEGRAM_BOT_TOKEN) {
  console.log('Telegram: no TELEGRAM_BOT_TOKEN set, bot disabled');
} else {
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
  console.log('Telegram bot started');

  // Handle inline keyboard button presses (Twitter approve/skip)
  bot.on('callback_query', async (query) => {
    const { data, message } = query;
    const msgId = message.message_id;

    if (pendingApprovals.has(msgId)) {
      const { resolve, timeout, originalText } = pendingApprovals.get(msgId);
      pendingApprovals.delete(msgId);
      clearTimeout(timeout);

      const approved = data.startsWith('approve_');
      const statusLabel = approved ? '✅ APPROVED' : '❌ SKIPPED';

      await bot.editMessageText(originalText + `\n\n${statusLabel}`, {
        chat_id: TELEGRAM_CHAT_ID,
        message_id: msgId,
        parse_mode: 'Markdown'
      }).catch(() => {});

      await bot.answerCallbackQuery(query.id, {
        text: approved ? 'Reply will be posted.' : 'Tweet skipped.'
      }).catch(() => {});

      resolve(approved);
    } else {
      await bot.answerCallbackQuery(query.id, {
        text: 'This approval has already been handled.'
      }).catch(() => {});
    }
  });

  // Handle messages and commands from BC
  bot.on('message', async (msg) => {
    const chatId = String(msg.chat.id);

    // Only respond to BC's configured chat
    if (chatId !== String(TELEGRAM_CHAT_ID)) return;

    const text = (msg.text || '').trim();
    if (!text) return;

    if (text === '/start' || text === '/help') {
      const helpText =
        '*Humphrey — Command Reference*\n\n' +
        '/status — uptime and current stats\n' +
        '/mentions — last 5 Twitter mentions\n' +
        '/conversations — last 3 web intake conversations\n' +
        '\nAny other message → Humphrey replies as your private AI assistant.';
      await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
      return;
    }

    if (text === '/status') {
      const uptime = Math.floor(process.uptime() / 60);
      const twitterStatus = providers['twitterStatus'] ? providers['twitterStatus']() : null;
      const convCount = providers['conversationCount'] ? providers['conversationCount']() : 0;

      const lines = [
        '*Humphrey Status*',
        '',
        `Uptime: ${uptime} minutes`,
        `Web conversations today: ${convCount}`,
      ];

      if (twitterStatus) {
        lines.push(`Last Twitter check: ${twitterStatus.lastCheck || 'not yet'}`);
        if (twitterStatus.lastMentionId) {
          lines.push(`Last mention ID: ${twitterStatus.lastMentionId}`);
        }
      } else {
        lines.push('Twitter: not active');
      }

      await bot.sendMessage(chatId, lines.join('\n'), { parse_mode: 'Markdown' });
      return;
    }

    if (text === '/mentions') {
      const mentions = providers['recentMentions'] ? providers['recentMentions']() : [];
      if (!mentions.length) {
        await bot.sendMessage(chatId, 'No recent mentions found.');
        return;
      }
      const mentionLines = mentions.slice(0, 5).map((m, i) =>
        `${i + 1}. *@${m.author}*: "${m.text.substring(0, 120)}"`
      );
      await bot.sendMessage(chatId, '*Recent Twitter Mentions:*\n\n' + mentionLines.join('\n\n'), {
        parse_mode: 'Markdown'
      });
      return;
    }

    if (text === '/conversations') {
      const convs = providers['recentConversations'] ? providers['recentConversations']() : [];
      if (!convs.length) {
        await bot.sendMessage(chatId, 'No conversations saved yet.');
        return;
      }
      const convLines = convs.map((c, i) => {
        const time = new Date(c.timestamp).toLocaleString('en-GB', { timeZone: 'Atlantic/Bermuda' });
        const contact = c.intakeData && c.intakeData.contact_name ? ` — ${c.intakeData.contact_name}` : '';
        const summary = c.summary || 'No summary';
        return `${i + 1}. *${time}*${contact}\n${summary.substring(0, 200)}`;
      });
      await bot.sendMessage(chatId, '*Recent Intake Conversations:*\n\n' + convLines.join('\n\n'), {
        parse_mode: 'Markdown'
      });
      return;
    }

    // Free text — respond as Humphrey (private mode for BC)
    if (!text.startsWith('/')) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: `You are Humphrey, the AI intake agent for BDA AI Agent Services, operated by BC in Bermuda. You are responding to BC — your principal and operator — via private Telegram. Answer questions directly and helpfully about BDA AI Agent Services operations, incoming leads, Twitter activity, and the Bermuda legal structure for AI agents. Be candid and useful. Keep responses concise.`,
            messages: [{ role: 'user', content: text }]
          })
        });
        const data = await response.json();
        const reply = data.content?.[0]?.text || 'I encountered an issue processing that.';
        await bot.sendMessage(chatId, reply);
      } catch (e) {
        console.error('Telegram Claude error:', e.message);
        await bot.sendMessage(chatId, 'Error calling Claude: ' + e.message);
      }
    }
  });

  bot.on('polling_error', (err) => {
    console.error('Telegram polling error:', err.message);
  });
}

// Send a plain notification to BC
async function notify(message) {
  if (!bot || !TELEGRAM_CHAT_ID) return;
  try {
    await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
  } catch (e) {
    console.error('Telegram notify error:', e.message);
  }
}

// Send a Twitter mention to BC for approval
// Returns a Promise<boolean> — true = approved, false = skipped/timed out
function requestTwitterApproval(tweetAuthor, tweetText, proposedReply, tweetId) {
  return new Promise(async (resolve) => {
    if (!bot || !TELEGRAM_CHAT_ID) {
      // No Telegram configured — skip all tweets
      resolve(false);
      return;
    }

    const msgText =
      `*New Twitter mention — approval needed*\n\n` +
      `*From:* @${tweetAuthor}\n` +
      `*Tweet:* "${tweetText}"\n\n` +
      `*Proposed reply:*\n${proposedReply}`;

    try {
      const sent = await bot.sendMessage(TELEGRAM_CHAT_ID, msgText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ APPROVE', callback_data: `approve_${tweetId}` },
            { text: '❌ SKIP', callback_data: `skip_${tweetId}` }
          ]]
        }
      });

      // Auto-skip after 30 minutes
      const timeout = setTimeout(() => {
        if (pendingApprovals.has(sent.message_id)) {
          pendingApprovals.delete(sent.message_id);
          bot.editMessageText(msgText + '\n\n⏰ _Timed out (30 min) — skipped_', {
            chat_id: TELEGRAM_CHAT_ID,
            message_id: sent.message_id,
            parse_mode: 'Markdown'
          }).catch(() => {});
          resolve(false);
        }
      }, 30 * 60 * 1000);

      pendingApprovals.set(sent.message_id, { resolve, timeout, originalText: msgText });

    } catch (e) {
      console.error('Telegram approval send error:', e.message);
      resolve(false);
    }
  });
}

module.exports = { notify, requestTwitterApproval, registerProvider };
