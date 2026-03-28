module.exports = {

  // Target subreddits
  SUBREDDITS: {
    AI_AGENTS: 'AI_Agents',
    ARTIFICIAL: 'artificial',
    ETHEREUM: 'ethereum',
    CRYPTO: 'CryptoTechnology',
    LEGALTECH: 'legaltech',
    FUTUROLOGY: 'Futurology',
    BERMUDA: 'Bermuda'
  },

  // How often to check for new comments (milliseconds)
  COMMENT_POLL_INTERVAL: 15 * 60 * 1000, // 15 minutes

  // Post time each day (UTC hour)
  DAILY_POST_HOUR: 14, // 2pm UTC = good for US morning + Europe afternoon

  // Topics requiring BC approval via Telegram
  SENSITIVE_TOPICS: [
    'committee',
    'committee seat',
    'governance mechanism',
    'corporate authority',
    'who controls',
    'who runs payagent',
    'kadikoy',
    'autonomous operations committee',
    'board seat',
    'how does payagent make decisions'
  ],

  // Hard blocked — never engage
  HARD_BLOCKED_TOPICS: [
    'BMA',
    'Bermuda Monetary Authority',
    'licence',
    'licensing fees',
    'client',
    'your clients',
    'AML',
    'compliance officer',
    'regulatory approval',
    'pricing',
    'how much does it cost'
  ],

  // Protected info — must never appear in any Reddit post or reply
  NEVER_DISCLOSE: [
    'committee seat mechanism',
    'autonomous operations committee structure',
    'how corporate authority is technically held',
    'internal governance details beyond what is publicly known'
  ],

  EMAIL_TO: 'info@aiagentsservices.net',
  EMAIL_FROM: 'payagent@aiagentsservices.net'
};
