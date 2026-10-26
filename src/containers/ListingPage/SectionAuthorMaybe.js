import React from 'react';
import { FormattedMessage } from '../../util/reactIntl';

import { Heading, Modal } from '../../components';
import UserCard from './UserCard/UserCard';
import InquiryForm from './InquiryForm/InquiryForm';

import css from './ListingPage.module.css';

const CONTACT_USER_LINK = 'inquiryModalContactUserLink';

const SectionAuthorMaybe = props => {
  const {
    title,
    listing,
    authorDisplayName,
    onContactUser,
    isInquiryModalOpen,
    onCloseInquiryModal,
    sendInquiryError,
    sendInquiryInProgress,
    onSubmitInquiry,
    currentUser,
    onManageDisableScrolling,
  } = props;

  if (!listing.author) {
    return null;
  }

  // No "Contact" link: clients can message the practitioner only after booking
  const showContact = false;

  return (
    <section id="author" className={css.sectionAuthor}>
      <Heading as="h2" rootClassName={css.sectionHeadingWithExtraMargin}>
        <FormattedMessage id="ListingPage.aboutProviderTitle" />
      </Heading>
      <UserCard
        user={listing.author}
        currentUser={currentUser}
        onContactUser={onContactUser}
        showContact={showContact}
        contactLinkId={CONTACT_USER_LINK}
      />
      <Modal
        id="ListingPage.inquiry"
        contentClassName={css.inquiryModalContent}
        isOpen={isInquiryModalOpen}
        onClose={onCloseInquiryModal}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
        focusElementId={CONTACT_USER_LINK}
      >
        <InquiryForm
          className={css.inquiryForm}
          submitButtonWrapperClassName={css.inquirySubmitButtonWrapper}
          listingTitle={title}
          authorDisplayName={authorDisplayName}
          sendInquiryError={sendInquiryError}
          onSubmit={onSubmitInquiry}
          inProgress={sendInquiryInProgress}
        />
      </Modal>
    </section>
  );
};

export default SectionAuthorMaybe;
