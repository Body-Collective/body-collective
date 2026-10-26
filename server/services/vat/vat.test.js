const { normalizeVatId, checkVatId } = require('./index');

describe('VAT IDs', () => {
  afterEach(() => {
    delete global.fetch;
  });

  it('normalizes the VAT ID', () => {
    expect(normalizeVatId(' de 123.456-789 ')).toEqual('DE123456789');
    expect(normalizeVatId('GR123456789')).toEqual('EL123456789');
    expect(normalizeVatId('123456789')).toBeNull();
    expect(normalizeVatId(null)).toBeNull();
  });

  it('checks EU numbers in VIES', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ valid: true, name: 'ACME SL' }) })
    );
    const result = await checkVatId('ES12345678A');
    expect(result).toMatchObject({ status: 'valid', name: 'ACME SL' });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      countryCode: 'ES',
      vatNumber: '12345678A',
    });
  });

  it('marks unchecked numbers', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('timeout')));
    expect(await checkVatId('ES12345678A')).toMatchObject({ status: 'unavailable' });
    expect(await checkVatId('CH123456789')).toMatchObject({ status: 'not-eu' });
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ valid: false, name: '---' }) })
    );
    const invalid = await checkVatId('DE000000000');
    expect(invalid.status).toEqual('invalid');
    expect(invalid.name).toBeUndefined();
  });
});
