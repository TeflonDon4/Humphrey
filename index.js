const { runMonitorLoop } = require('./monitor');
const email = require('./email');

runMonitorLoop();

// Schedule daily digest at 8am UTC
const scheduleDigest = () => {
  const now = new Date();
  const next8am = new Date(now);
  next8am.setUTCHours(8, 0, 0, 0);
  if (now >= next8am) next8am.setUTCDate(next8am.getUTCDate() + 1);
  const msUntilNext = next8am - now;
  setTimeout(() => {
    email.sendDailyDigest();
    setInterval(email.sendDailyDigest, 24 * 60 * 60 * 1000);
  }, msUntilNext);
};

scheduleDigest();
console.log('Humphrey is online.');
