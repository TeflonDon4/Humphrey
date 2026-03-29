const config = require('./config');

const SPAM_PATTERNS = [
  'ADVANCE VIEW',
  'PRESALE',
  'ELITE UPDATE',
  'PRIVATE ACCESS',
  'ACTION REQUIRED',
  'FREE ACCESS',
  '▶️ LINK',
  'EXCLUSIVE ACCESS',
  'LIMITED OFFER',
  'ACT NOW',
  'SIGN UP NOW',
  'CLICK HERE',
  'JOIN NOW',
  'REGISTER NOW',
  'EARLY ACCESS',
];

const PROMO_KEYWORDS = /\b(free|exclusive|limited|presale|access|offer|deal|promo|discount|whitelist|airdrop|giveaway|win|prize|earn|profit)\b/i;

function checkHardBlock(tweetText) {
  const lower = tweetText.toLowerCase();
  for (const topic of config.HARD_BLOCKED_TOPICS) {
    if (lower.includes(topic.toLowerCase())) {
      return { blocked: true, topic };
    }
  }
  return { blocked: false };
}

function checkSensitiveTopic(tweetText) {
  const lower = tweetText.toLowerCase();
  for (const topic of config.SENSITIVE_TOPICS) {
    if (lower.includes(topic.toLowerCase())) {
      return { sensitive: true, topic };
    }
  }
  return { sensitive: false };
}

// Home timeline only — named accounts and mentions are not filtered
function checkSpam(tweetText, authorDescription = '') {
  const upper = tweetText.toUpperCase();

  for (const pattern of SPAM_PATTERNS) {
    if (upper.includes(pattern)) {
      return { spam: true, reason: `promotional pattern: "${pattern}"` };
    }
  }

  // t.co link + promotional keyword = likely spam
  if (tweetText.includes('t.co/') && PROMO_KEYWORDS.test(tweetText)) {
    return { spam: true, reason: 'promotional link with promo language' };
  }

  // No profile description is a strong spam signal
  if (!authorDescription || authorDescription.trim() === '') {
    return { spam: true, reason: 'no profile description' };
  }

  return { spam: false };
}

// Home timeline only — require minimum credibility before engaging
function checkAccountCredibility(author) {
  if (!author) return { credible: false, reason: 'author data missing' };

  const followers = author.public_metrics?.followers_count ?? 0;
  if (followers < 50) {
    return { credible: false, reason: `low follower count (${followers})` };
  }

  // Skip accounts created within the last 30 days
  if (author.created_at) {
    const ageMs = Date.now() - new Date(author.created_at).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays < 30) {
      return { credible: false, reason: `new account (${Math.floor(ageDays)} days old)` };
    }
  }

  return { credible: true };
}

module.exports = { checkHardBlock, checkSensitiveTopic, checkSpam, checkAccountCredibility };
