const mockIntegrationSdk = {
  transactions: { show: jest.fn(), updateMetadata: jest.fn() },
  listings: { update: jest.fn() },
};

jest.mock('../../log', () => ({ error: () => {} }));
jest.mock('../../api-util/sdk', () => ({ getIntegrationSdk: () => mockIntegrationSdk }));

const { addRating, updateAggregateRating } = require('./index');

const CUSTOMER = 'customer-1';
const PROVIDER = 'provider-1';
const ref = (type, uuid) => ({ data: { id: { uuid }, type } });

const txResponse = ({ reviews = [], metadata = {}, listingMetadata = {} } = {}) => ({
  data: {
    data: {
      id: { uuid: 'tx-1' },
      type: 'transaction',
      attributes: { metadata },
      relationships: {
        customer: ref('user', CUSTOMER),
        listing: ref('listing', 'listing-1'),
        reviews: { data: reviews.map(r => ({ id: { uuid: r.id }, type: 'review' })) },
      },
    },
    included: [
      { id: { uuid: 'listing-1' }, type: 'listing', attributes: { metadata: listingMetadata } },
      ...reviews.map(r => ({
        id: { uuid: r.id },
        type: 'review',
        attributes: { type: r.type, rating: r.rating },
        relationships: { author: ref('user', r.author) },
      })),
    ],
  },
});

const customerReview = { id: 'r1', type: 'ofProvider', rating: 4, author: CUSTOMER };
const providerReview = { id: 'r2', type: 'ofCustomer', rating: 1, author: PROVIDER };

describe('aggregate rating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIntegrationSdk.transactions.updateMetadata.mockResolvedValue({});
    mockIntegrationSdk.listings.update.mockResolvedValue({});
  });

  it('adds a rating to the average', () => {
    expect(addRating({}, 5)).toEqual({ aggregateRating: 500, numberOfRatings: 1 });
    expect(addRating({ aggregateRating: 450, numberOfRatings: 2 }, 3)).toEqual({
      aggregateRating: 400,
      numberOfRatings: 3,
    });
  });

  it("adds the customer's review rating, read from the review, and marks the transaction", async () => {
    mockIntegrationSdk.transactions.show.mockResolvedValue(
      txResponse({
        reviews: [providerReview, customerReview],
        listingMetadata: { aggregateRating: 500, numberOfRatings: 1 },
      })
    );
    const result = await updateAggregateRating({ transactionId: { uuid: 'tx-1' }, userId: CUSTOMER });
    expect(result).toEqual({ aggregateRating: 450, numberOfRatings: 2 });
    expect(mockIntegrationSdk.transactions.updateMetadata).toHaveBeenCalledWith({
      id: { uuid: 'tx-1' },
      metadata: { isAggregatedRatingUpdated: true },
    });
    expect(mockIntegrationSdk.listings.update).toHaveBeenCalledWith({
      id: { uuid: 'listing-1' },
      metadata: { aggregateRating: 450, numberOfRatings: 2 },
    });
  });

  it('refuses someone else than the customer', async () => {
    mockIntegrationSdk.transactions.show.mockResolvedValue(txResponse({ reviews: [customerReview] }));
    await expect(
      updateAggregateRating({ transactionId: { uuid: 'tx-1' }, userId: PROVIDER })
    ).rejects.toEqual(expect.objectContaining({ status: 403, code: 'not-allowed' }));
    expect(mockIntegrationSdk.listings.update).not.toHaveBeenCalled();
  });

  it('counts a rating once', async () => {
    mockIntegrationSdk.transactions.show.mockResolvedValue(
      txResponse({ reviews: [customerReview], metadata: { isAggregatedRatingUpdated: true } })
    );
    await expect(
      updateAggregateRating({ transactionId: { uuid: 'tx-1' }, userId: CUSTOMER })
    ).rejects.toEqual(expect.objectContaining({ code: 'already-updated' }));
    expect(mockIntegrationSdk.listings.update).not.toHaveBeenCalled();
  });

  it('needs a review by the customer (not the provider review of the customer)', async () => {
    mockIntegrationSdk.transactions.show.mockResolvedValue(txResponse({ reviews: [providerReview] }));
    await expect(
      updateAggregateRating({ transactionId: { uuid: 'tx-1' }, userId: CUSTOMER })
    ).rejects.toEqual(expect.objectContaining({ code: 'no-review' }));
  });

  it('removes the mark again when the listing could not be updated', async () => {
    mockIntegrationSdk.transactions.show.mockResolvedValue(txResponse({ reviews: [customerReview] }));
    mockIntegrationSdk.listings.update.mockRejectedValue(new Error('API down'));
    await expect(
      updateAggregateRating({ transactionId: { uuid: 'tx-1' }, userId: CUSTOMER })
    ).rejects.toThrow('API down');
    expect(mockIntegrationSdk.transactions.updateMetadata).toHaveBeenLastCalledWith({
      id: { uuid: 'tx-1' },
      metadata: { isAggregatedRatingUpdated: false },
    });
  });
});
