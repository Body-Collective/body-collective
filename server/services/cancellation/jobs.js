const log = require('../../log');
const { processPendingPayouts } = require('./payouts');
const { processPendingRefunds } = require('./refund');

const INTERVAL_MS = 15 * 60 * 1000;

/**
 * Background work of customer cancellations, every 15 minutes:
 *  - finishes the refunds of cancellations that were interrupted after the transition
 *  - pays out the practitioner's share once the funds of the payment are available
 * Requires a long-running server process and STRIPE_SECRET_KEY.
 *
 * @returns {Object} The interval timer
 */
const startCancellationJob = () => {
  let running = false;
  const run = async () => {
    // A slow round must not overlap with the next one
    if (running) {
      return;
    }
    running = true;
    try {
      await processPendingRefunds();
      await processPendingPayouts();
    } catch (e) {
      log.error(e, 'cancellation-job-failed', {});
    } finally {
      running = false;
    }
  };
  const timer = setInterval(run, INTERVAL_MS);
  // Don't keep the process alive just for this job
  timer.unref?.();
  return timer;
};

module.exports = { startCancellationJob };
