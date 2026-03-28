const config = require('./config');

function checkHardBlock(text) {
  const lower = text.toLowerCase();
  for (const topic of config.HARD_BLOCKED_TOPICS) {
    if (lower.includes(topic.toLowerCase())) {
      return { blocked: true, topic };
    }
  }
  return { blocked: false };
}

function checkSensitiveTopic(text) {
  const lower = text.toLowerCase();
  for (const topic of config.SENSITIVE_TOPICS) {
    if (lower.includes(topic.toLowerCase())) {
      return { sensitive: true, topic };
    }
  }
  return { sensitive: false };
}

module.exports = { checkHardBlock, checkSensitiveTopic };
