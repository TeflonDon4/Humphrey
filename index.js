(async () => {
  try {
    console.log('[STARTUP] Humphrey v2 initialising...');

    console.log('[STARTUP] Loading monitor module...');
    const { runMonitorLoop } = require('./monitor');
    console.log('[STARTUP] monitor.js loaded OK');

    console.log('[STARTUP] Loading email module...');
    const email = require('./email');
    console.log('[STARTUP] email.js loaded OK');

    console.log('[STARTUP] Starting monitor loop...');
    await runMonitorLoop();
    console.log('[STARTUP] Monitor loop running');

    // Schedule daily digest at 8am UTC
    const scheduleDigest = () => {
      const now = new Date();
      const next8am = new Date(now);
      next8am.setUTCHours(8, 0, 0, 0);
      if (now >= next8am) next8am.setUTCDate(next8am.getUTCDate() + 1);
      const msUntilNext = next8am - now;
      console.log(`[STARTUP] Daily digest scheduled in ${Math.round(msUntilNext / 60000)} minutes`);
      setTimeout(() => {
        email.sendDailyDigest().catch(err => console.error('[DIGEST ERROR]', err.message));
        setInterval(() => {
          email.sendDailyDigest().catch(err => console.error('[DIGEST ERROR]', err.message));
        }, 24 * 60 * 60 * 1000);
      }, msUntilNext);
    };

    scheduleDigest();
    console.log('[STARTUP] Humphrey is online.');

  } catch (err) {
    console.error('[STARTUP FATAL]', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
