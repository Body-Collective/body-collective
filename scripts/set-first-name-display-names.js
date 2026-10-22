/**
 * One-off: changes display names that are still Sharetribe's default ("Jana R" / "Jana R.") to
 * the first name only ("Jana"), like new signups get. Display names that users chose themselves
 * are not changed.
 *
 * Needs the Integration API keys (SHARETRIBE_INTEGRATION_SDK_CLIENT_ID / SECRET) in .env. Run
 * from the project root:
 *
 *   node scripts/set-first-name-display-names.js --dry-run   (only lists the changes)
 *   node scripts/set-first-name-display-names.js
 */

require('dotenv').config({ quiet: true });
const integrationSdk = require('sharetribe-flex-integration-sdk');

const isDryRun = process.argv.includes('--dry-run');

const sdk = integrationSdk.createInstance({
  clientId: process.env.SHARETRIBE_INTEGRATION_SDK_CLIENT_ID,
  clientSecret: process.env.SHARETRIBE_INTEGRATION_SDK_CLIENT_SECRET,
});

// Sharetribe's default display name: first name and the initial of the last name
const isDefaultDisplayName = ({ displayName, firstName, lastName }) => {
  const first = (firstName || '').trim();
  const initial = (lastName || '').trim().charAt(0);
  const name = (displayName || '').trim();
  return !!first && !!initial && [`${first} ${initial}`, `${first} ${initial}.`].includes(name);
};

const main = async () => {
  let page = 1;
  let totalPages = 1;
  let changed = 0;
  do {
    const response = await sdk.users.query({ page, perPage: 100 });
    for (const user of response.data.data) {
      const profile = user.attributes.profile;
      if (isDefaultDisplayName(profile)) {
        const displayName = profile.firstName.trim();
        console.log(`${user.id.uuid}: "${profile.displayName}" -> "${displayName}"`);
        if (!isDryRun) {
          await sdk.users.updateProfile({ id: user.id, displayName });
        }
        changed += 1;
      }
    }
    totalPages = response.data.meta.totalPages;
    page += 1;
  } while (page <= totalPages);
  console.log(`${isDryRun ? 'Would change' : 'Changed'} ${changed} display name(s).`);
};

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
