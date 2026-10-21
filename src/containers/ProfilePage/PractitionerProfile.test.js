import React from 'react';
import '@testing-library/jest-dom';

import { createListing, createReview, createUser } from '../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import PractitionerProfile from './PractitionerProfile';

const { screen } = testingLibrary;

const practitioner = createUser('jana', {
  profile: {
    displayName: 'Jana',
    abbreviatedName: 'J',
    bio: 'First paragraph.\n\nSecond paragraph.',
    publicData: {
      userType: 'practitioner',
      professionalTitle: 'Therapist',
      locations: ['berlin', 'balearic_islands'],
      languagesSpoken: ['german', 'english'],
      quote: 'Here in this body are the sacred rivers',
      quoteAuthor: 'Saraha',
      experience: ['Ayurvedic massage since 2007'],
      training: [{ year: 'ongoing', title: 'Biodynamic Breath', teacher: 'in training' }],
    },
  },
});

describe('PractitionerProfile', () => {
  it('shows the profile, the trainings and only the reviews received', () => {
    render(
      <PractitionerProfile
        user={practitioner}
        listings={[]}
        reviews={[
          createReview('r1', { type: 'ofProvider', content: 'Wonderful session' }),
          createReview('r2', { type: 'ofCustomer', content: 'Lovely client' }),
        ]}
      />
    );
    expect(screen.getByText('Therapist')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Jana' })).toBeInTheDocument();
    expect(screen.getByText('“Here in this body are the sacred rivers”')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
    expect(screen.getByText('Ayurvedic massage since 2007')).toBeInTheDocument();
    expect(screen.getByText('Biodynamic Breath')).toBeInTheDocument();
    expect(screen.getByText('PractitionerProfile.ongoing')).toBeInTheDocument();
    expect(screen.getByText('Wonderful session')).toBeInTheDocument();
    expect(screen.queryByText('Lovely client')).not.toBeInTheDocument();
  });

  it('shows the treatments and seminars rows only when there are listings', () => {
    const treatment = createListing('l1', {
      title: 'Ayurvedic Abhyanga',
      publicData: { listingType: 'daily_booking' },
    });
    render(<PractitionerProfile user={practitioner} listings={[treatment]} reviews={[]} />);
    expect(screen.getByText('PractitionerProfile.treatmentsHeading')).toBeInTheDocument();
    expect(screen.queryByText('PractitionerProfile.seminarsHeading')).not.toBeInTheDocument();
    expect(screen.queryByText('PractitionerProfile.reviewsHeading')).not.toBeInTheDocument();
  });
});
