/**
 * One-off: moves user fields that were made private in Console from the users' public data to
 * their private data (a field's existing values stay where they were saved). Default fields:
 * language (Preferred language) and years_experience.
 *
 * Needs the Integration API keys (SHARETRIBE_INTEGRATION_SDK_CLIENT_ID / SECRET) in .env. Run
 * from the project root:
 *
 *   node scripts/move-user-fields-to-private.js --dry-run
 *   node scripts/move-user-fields-to-private.js
 *   node scripts/move-user-fields-to-private.js company website   (other fields)
 */

require('dotenv').config({ quiet: true });
const integrationSdk = require('sharetribe-flex-integration-sdk');

const isDryRun = process.argv.includes('--dry-run');
const keysFromArgs = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const KEYS = keysFromArgs.length > 0 ? keysFromArgs : ['language', 'years_experience'];

const sdk = integrationSdk.createInstance({
  clientId: process.env.SHARETRIBE_INTEGRATION_SDK_CLIENT_ID,
  clientSecret: process.env.SHARETRIBE_INTEGRATION_SDK_CLIENT_SECRET,
});

const main = async () => {
  let page = 1;
  let totalPages = 1;
  let moved = 0;
  do {
    const response = await sdk.users.query({ page, perPage: 100 });
    for (const user of response.data.data) {
      const { publicData = {}, privateData = {} } = user.attributes.profile;
      const keys = KEYS.filter(key => publicData[key] != null);
      if (keys.length === 0) {
        continue;
      }
      // A value already in private data wins; the public copy is removed
      const newPrivateData = keys.reduce(
        (data, key) => (privateData[key] == null ? { ...data, [key]: publicData[key] } : data),
        {}
      );
      const clearedPublicData = keys.reduce((data, key) => ({ ...data, [key]: null }), {});
      console.log(`${user.id.uuid}: ${keys.join(', ')}`);
      if (!isDryRun) {
        await sdk.users.updateProfile({
          id: user.id,
          privateData: newPrivateData,
          publicData: clearedPublicData,
        });
      }
      moved += 1;
    }
    totalPages = response.data.meta.totalPages;
    page += 1;
  } while (page <= totalPages);
  console.log(
    `${isDryRun ? 'Would move' : 'Moved'} fields of ${moved} user(s): ${KEYS.join(', ')}`
  );
};

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
