import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { confirmCheckoutSession } from '../../util/api';
import { storableError } from '../../util/errors';
import { fetchCurrentUser } from '../../ducks/user.duck';

// ================ Async thunks ================ //

// Stripe sends the user back with ?session_id=... after the payment link checkout. This saves the
// subscription to the profile right away, so the page doesn't have to wait for the webhook.
export const confirmCheckoutThunk = createAsyncThunk(
  'ManageSubscriptionPage/confirmCheckout',
  (sessionId, { dispatch, rejectWithValue }) => {
    return confirmCheckoutSession({ sessionId })
      .then(() => dispatch(fetchCurrentUser()))
      .catch(e => rejectWithValue(storableError(e)));
  }
);
// Note: we unwrap the thunk so that the promise chain can be listened on presentational components.
export const confirmCheckout = sessionId => dispatch =>
  dispatch(confirmCheckoutThunk(sessionId)).unwrap();

// ================ Slice ================ //

const manageSubscriptionPageSlice = createSlice({
  name: 'ManageSubscriptionPage',
  initialState: {
    confirmCheckoutInProgress: false,
    confirmCheckoutError: null,
    checkoutConfirmed: false,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(confirmCheckoutThunk.pending, state => {
        state.confirmCheckoutInProgress = true;
        state.confirmCheckoutError = null;
        state.checkoutConfirmed = false;
      })
      .addCase(confirmCheckoutThunk.fulfilled, state => {
        state.confirmCheckoutInProgress = false;
        state.checkoutConfirmed = true;
      })
      .addCase(confirmCheckoutThunk.rejected, (state, action) => {
        state.confirmCheckoutInProgress = false;
        state.confirmCheckoutError = action.payload;
      });
  },
});

export default manageSubscriptionPageSlice.reducer;

// ================ Load data ================ //

export const loadData = () => {
  // The subscription state lives in the current user's profile metadata
  return fetchCurrentUser();
};
