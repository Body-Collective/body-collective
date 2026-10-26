/**
 * VAT IDs of practitioners, for invoicing: practitioners in other EU countries with a valid VAT
 * ID are invoiced without VAT (reverse charge), everyone else with German VAT. The number is
 * checked in the EU's VIES database.
 */

const VIES_URL = 'https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number';
const VIES_TIMEOUT_MS = 10000;

// Country codes of VIES (Greece is "EL", Northern Ireland "XI")
const VIES_COUNTRY_CODES = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'FR', 'HR', 'HU',
  'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'XI',
]; // prettier-ignore

const VAT_ID_PATTERN = /^[A-Z]{2}[A-Z0-9+*]{2,13}$/;

/**
 * The VAT ID without spaces, dots and dashes, in capitals; "GR" becomes "EL".
 *
 * @param {string} value
 * @returns {string|null} null when it doesn't look like a VAT ID
 */
const normalizeVatId = value => {
  if (typeof value !== 'string') {
    return null;
  }
  const compact = value.toUpperCase().replace(/[\s.\-_/]/g, '');
  const vatId = compact.startsWith('GR') ? `EL${compact.slice(2)}` : compact;
  return VAT_ID_PATTERN.test(vatId) ? vatId : null;
};

/**
 * Checks the VAT ID in VIES.
 *
 * @param {string} vatId normalized VAT ID
 * @returns {Promise<Object>} { status, name?, checkedAt } with status 'valid', 'invalid',
 * 'unavailable' (VIES didn't answer; check again later) or 'not-eu' (not checked)
 */
const checkVatId = async vatId => {
  const checkedAt = new Date().toISOString();
  const countryCode = vatId.slice(0, 2);
  if (!VIES_COUNTRY_CODES.includes(countryCode)) {
    return { status: 'not-eu', checkedAt };
  }

  try {
    const response = await fetch(VIES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ countryCode, vatNumber: vatId.slice(2) }),
      signal: AbortSignal.timeout(VIES_TIMEOUT_MS),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || typeof data?.valid !== 'boolean') {
      return { status: 'unavailable', checkedAt };
    }
    // VIES gives "---" when a country doesn't share the name
    const name =
      typeof data.name === 'string' && /[A-Za-z]/.test(data.name) ? data.name.trim() : null;
    return { status: data.valid ? 'valid' : 'invalid', ...(name ? { name } : {}), checkedAt };
  } catch (e) {
    return { status: 'unavailable', checkedAt };
  }
};

module.exports = { normalizeVatId, checkVatId, VIES_COUNTRY_CODES };
