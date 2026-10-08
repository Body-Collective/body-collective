import { createCurrentUser } from '../util/testData';
import reducer, {
  clearCurrentUser,
  closeApplicationUnderReviewModal,
  saveCurrentUserLanguage,
} from './user.duck';

const fetchCurrentUserFulfilled = (currentUser, options) => ({
  type: 'user/fetchCurrentUser/fulfilled',
  payload: currentUser,
  meta: { arg: options, requestId: 'test', requestStatus: 'fulfilled' },
});

describe('user duck', () => {
  describe('application under review modal', () => {
    const pendingUser = createCurrentUser('pending-user', { state: 'pendingApproval' });
    const activeUser = createCurrentUser('active-user', { state: 'active' });
    const initialState = reducer(undefined, { type: '@@INIT' });

    it('is not shown by default', () => {
      expect(initialState.showApplicationUnderReviewModal).toEqual(false);
    });

    it('is shown when a user who waits for approval has just logged in or signed up', () => {
      const state = reducer(
        initialState,
        fetchCurrentUserFulfilled(pendingUser, { afterLogin: true })
      );
      expect(state.currentUser.id).toEqual(pendingUser.id);
      expect(state.showApplicationUnderReviewModal).toEqual(true);
    });

    it('is not shown when the user is loaded in another way (e.g. a page load)', () => {
      expect(
        reducer(initialState, fetchCurrentUserFulfilled(pendingUser, {}))
          .showApplicationUnderReviewModal
      ).toEqual(false);
      expect(
        reducer(initialState, fetchCurrentUserFulfilled(pendingUser, undefined))
          .showApplicationUnderReviewModal
      ).toEqual(false);
      expect(
        reducer(initialState, fetchCurrentUserFulfilled(pendingUser, { enforce: true }))
          .showApplicationUnderReviewModal
      ).toEqual(false);
    });

    it('is not shown to a user who has been approved', () => {
      const state = reducer(
        initialState,
        fetchCurrentUserFulfilled(activeUser, { afterLogin: true })
      );
      expect(state.showApplicationUnderReviewModal).toEqual(false);
    });

    it('is not shown when there is no user after the login', () => {
      const state = reducer(initialState, fetchCurrentUserFulfilled(null, { afterLogin: true }));
      expect(state.showApplicationUnderReviewModal).toEqual(false);
    });

    it('stays closed after the user has closed it, even if the user is fetched again', () => {
      let state = reducer(
        initialState,
        fetchCurrentUserFulfilled(pendingUser, { afterLogin: true })
      );
      state = reducer(state, closeApplicationUnderReviewModal());
      expect(state.showApplicationUnderReviewModal).toEqual(false);

      state = reducer(state, fetchCurrentUserFulfilled(pendingUser, { enforce: true }));
      expect(state.showApplicationUnderReviewModal).toEqual(false);
      expect(state.currentUser.id).toEqual(pendingUser.id);
    });

    it('is closed when the user logs out', () => {
      let state = reducer(
        initialState,
        fetchCurrentUserFulfilled(pendingUser, { afterLogin: true })
      );
      expect(state.showApplicationUnderReviewModal).toEqual(true);

      state = reducer(state, clearCurrentUser());
      expect(state.currentUser).toBeNull();
      expect(state.showApplicationUnderReviewModal).toEqual(false);
    });
  });
});

describe('saveCurrentUserLanguage', () => {
  const updatedUserResponse = language => ({
    data: {
      data: {
        id: { uuid: 'user1', _sdkType: 'UUID' },
        type: 'currentUser',
        attributes: {
          state: 'active',
          email: 'user1@example.com',
          emailVerified: true,
          profile: { firstName: 'A', lastName: 'B', publicData: { language } },
        },
      },
      included: [],
    },
  });

  it('saves the language to the public data of the profile and updates the current user', async () => {
    const updateProfile = jest.fn(() => Promise.resolve(updatedUserResponse('de')));
    const sdk = { currentUser: { updateProfile } };
    const dispatch = jest.fn();

    const user = await saveCurrentUserLanguage('de')(dispatch, () => ({}), sdk);

    expect(updateProfile).toHaveBeenCalledWith(
      { publicData: { language: 'de' } },
      { expand: true }
    );
    expect(user.attributes.profile.publicData.language).toEqual('de');
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0][0].type).toEqual('user/setCurrentUser');
  });

  it('does not fail when saving fails: the language is in use in the browser anyway', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const updateProfile = jest.fn(() => Promise.reject(new Error('network')));
    const dispatch = jest.fn();

    const user = await saveCurrentUserLanguage('de')(dispatch, () => ({}), {
      currentUser: { updateProfile },
    });

    expect(user).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
