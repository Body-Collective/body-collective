/**
 * One-off: translates the existing listings (title, description) and user profiles (bio,
 * practitioner profile) of the marketplace, like the app does after each save (see
 * server/services/translation). Unchanged texts are skipped, so it can be run again.
 *
 * Needs OPENAI_API_KEY and the Integration API keys (SHARETRIBE_INTEGRATION_SDK_CLIENT_ID /
 * SECRET) in .env. Run from the project root:
 *
 *   node scripts/translate-existing-content.js            (listings and profiles)
 *   node scripts/translate-existing-content.js --dry-run  (only lists what would be translated)
 */

require('dotenv').config({ quiet: true });
const integrationSdk = require('sharetribe-flex-integration-sdk');

const { translateListingWith } = require('../server/services/translation/listing');
const { translateProfileWith } = require('../server/services/translation/profile');

const isDryRun = process.argv.includes('--dry-run');

const sdk = integrationSdk.createInstance({
  clientId: process.env.SHARETRIBE_INTEGRATION_SDK_CLIENT_ID,
  clientSecret: process.env.SHARETRIBE_INTEGRATION_SDK_CLIENT_SECRET,
});

// All pages of a query
const queryAll = async (query, params) => {
  const results = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await query({ ...params, page, perPage: 100 });
    results.push(...response.data.data);
    totalPages = response.data.meta.totalPages;
    page += 1;
  } while (page <= totalPages);
  return results;
};

const run = async (label, items, translate) => {
  const counts = {};
  for (const item of items) {
    try {
      const { status } = isDryRun ? { status: 'dry-run' } : await translate(item);
      counts[status] = (counts[status] || 0) + 1;
      console.log(`${label} ${item.id.uuid}: ${status}`);
    } catch (e) {
      counts.failed = (counts.failed || 0) + 1;
      console.log(`${label} ${item.id.uuid}: failed (${e.code || e.status || e.message})`);
    }
  }
  console.log(`${label}s:`, counts);
};

const main = async () => {
  if (!isDryRun && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in .env');
  }
  const listings = await queryAll(sdk.listings.query, {});
  await run('listing', listings, listing =>
    translateListingWith({
      show: () => sdk.listings.show({ id: listing.id }).then(r => r.data.data),
      update: publicData => sdk.listings.update({ id: listing.id, publicData }),
    })
  );

  const users = await queryAll(sdk.users.query, {});
  await run('user', users, user =>
    translateProfileWith({
      show: () => sdk.users.show({ id: user.id }).then(r => r.data.data.attributes.profile),
      update: publicData => sdk.users.updateProfile({ id: user.id, publicData }),
    })
  );
};

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
