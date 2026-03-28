const { startScheduler } = require('./scheduler');
const email = require('./email');
const db = require('./db');

async function main() {
  // Initialise campaign if not already started
  const state = await db.getCampaignState();
  if (!state) {
    const startDate = process.env.CAMPAIGN_START_DATE || new Date().toISOString().split('T')[0];
    await db.initCampaign(startDate);
    console.log(`Campaign initialised. Start date: ${startDate}`);
  }

  startScheduler();

  // Daily digest at 9am UTC
  const scheduleDigest = () => {
    const now = new Date();
    const next9am = new Date(now);
    next9am.setUTCHours(9, 0, 0, 0);
    if (now >= next9am) next9am.setUTCDate(next9am.getUTCDate() + 1);
    setTimeout(() => {
      email.sendDailyDigest();
      setInterval(email.sendDailyDigest, 24 * 60 * 60 * 1000);
    }, next9am - now);
  };

  scheduleDigest();
  console.log('PayAgent Reddit bot online.');
}

main().catch(console.error);
