import React from 'react';
import { FieldArray } from 'react-final-form-arrays';

import { FormattedMessage } from '../../../util/reactIntl';
import {
  LANGUAGE_OPTIONS,
  MAX_LOCATIONS,
  PRACTITIONER_PROFILE_FIELD,
  getMaxLocationsForPlan,
} from '../../../util/practitionerProfile';
import { getSubscription } from '../../../util/subscription';

import {
  FieldCheckboxGroup,
  FieldTextInput,
  H4,
  InlineTextButton,
  NamedLink,
} from '../../../components';

import css from './ProfileSettingsForm.module.css';

const field = name => `${PRACTITIONER_PROFILE_FIELD}.${name}`;

const EMPTY_TRAINING_ROW = { year: '', title: '', teacher: '' };

// Rows of trainings: year (or "ongoing"), training and teacher or school
const TrainingRows = props => {
  const { name, formId, intl, push } = props;
  const t = id => intl.formatMessage({ id: `ProfileSettingsForm.practitioner.${id}` });
  return (
    <FieldArray name={field(name)}>
      {({ fields }) => (
        <div className={css.rows}>
          {fields.map((rowName, index) => (
            <div key={rowName} className={css.trainingRow}>
              <FieldTextInput
                id={`${formId}.${name}.${index}.year`}
                name={`${rowName}.year`}
                className={css.trainingYear}
                type="text"
                label={t('trainingYear')}
                placeholder={t('trainingYearPlaceholder')}
                maxLength={20}
              />
              <FieldTextInput
                id={`${formId}.${name}.${index}.title`}
                name={`${rowName}.title`}
                className={css.trainingTitle}
                type="text"
                label={t('trainingTitle')}
                placeholder={t('trainingTitlePlaceholder')}
                maxLength={200}
              />
              <FieldTextInput
                id={`${formId}.${name}.${index}.teacher`}
                name={`${rowName}.teacher`}
                className={css.trainingTeacher}
                type="text"
                label={t('trainingTeacher')}
                placeholder={t('trainingTeacherPlaceholder')}
                maxLength={200}
              />
              <InlineTextButton
                type="button"
                className={css.removeRow}
                onClick={() => fields.remove(index)}
              >
                <FormattedMessage id="ProfileSettingsForm.practitioner.removeRow" />
              </InlineTextButton>
            </div>
          ))}
          <InlineTextButton
            type="button"
            className={css.addRow}
            onClick={() => push(field(name), EMPTY_TRAINING_ROW)}
          >
            <FormattedMessage id="ProfileSettingsForm.practitioner.addTraining" />
          </InlineTextButton>
        </div>
      )}
    </FieldArray>
  );
};

// Locations typed by the practitioner (city, town or island). Essential shows one location,
// Professional up to MAX_LOCATIONS: with Essential, adding more is shown but disabled, with a
// link to upgrade.
const LocationRows = props => {
  const { formId, intl, push, plan } = props;
  const t = id => intl.formatMessage({ id: `ProfileSettingsForm.practitioner.${id}` });
  const maxForPlan = getMaxLocationsForPlan(plan);
  return (
    <FieldArray name={field('locations')}>
      {({ fields }) => {
        const canAddMore = fields.length < MAX_LOCATIONS;
        const planAllowsMore = fields.length < maxForPlan;
        return (
          <fieldset className={css.practitionerField}>
            <legend className={css.locationsLabel}>{t('locations')}</legend>
            <div className={css.rows}>
              {fields.map((name, index) => (
                <div key={name} className={css.lineRow}>
                  <FieldTextInput
                    id={`${formId}.locations.${index}`}
                    name={name}
                    className={css.lineInput}
                    type="text"
                    placeholder={t('locationPlaceholder')}
                    aria-label={t('locations')}
                    maxLength={60}
                  />
                  {index > 0 ? (
                    <InlineTextButton
                      type="button"
                      className={css.removeRow}
                      onClick={() => fields.remove(index)}
                    >
                      <FormattedMessage id="ProfileSettingsForm.practitioner.removeRow" />
                    </InlineTextButton>
                  ) : null}
                </div>
              ))}
              {canAddMore ? (
                <div className={css.addLocation}>
                  <InlineTextButton
                    type="button"
                    className={css.addRow}
                    disabled={!planAllowsMore}
                    onClick={() => push(field('locations'), '')}
                  >
                    <FormattedMessage id="ProfileSettingsForm.practitioner.addLocation" />
                  </InlineTextButton>
                  {!planAllowsMore ? (
                    <span className={css.planNote}>
                      <FormattedMessage
                        id="ProfileSettingsForm.practitioner.locationsProfessionalOnly"
                        values={{
                          upgradeLink: (
                            <NamedLink name="ManageSubscriptionPage">
                              <FormattedMessage id="ProfileSettingsForm.practitioner.upgrade" />
                            </NamedLink>
                          ),
                        }}
                      />
                    </span>
                  ) : null}
                </div>
              ) : null}
              {fields.length > maxForPlan ? (
                <p className={css.planNote}>
                  <FormattedMessage
                    id="ProfileSettingsForm.practitioner.locationsHiddenOnEssential"
                    values={{ count: maxForPlan }}
                  />
                </p>
              ) : null}
            </div>
          </fieldset>
        );
      }}
    </FieldArray>
  );
};

/**
 * Fields of a practitioner's profile in Profile settings: professional title, locations,
 * languages, quote, experience and trainings. See util/practitionerProfile.js. Only shown to
 * practitioners.
 *
 * @component
 * @param {Object} props
 * @param {string} props.formId
 * @param {Object} props.intl
 * @param {Function} props.push Final Form array mutator
 * @param {Object} props.currentUser The practitioner (their plan decides how many locations)
 * @returns {JSX.Element}
 */
const PractitionerProfileFields = props => {
  const { formId, intl, push, currentUser } = props;
  const { plan } = getSubscription(currentUser);
  const t = id => intl.formatMessage({ id: `ProfileSettingsForm.practitioner.${id}` });
  const options = (keys, prefix) =>
    keys.map(key => ({
      key,
      label: intl.formatMessage({ id: `PractitionerProfile.${prefix}.${key}` }),
    }));

  return (
    <>
      <div className={css.sectionContainer}>
        <H4 as="h2" className={css.sectionTitle}>
          <FormattedMessage id="ProfileSettingsForm.practitioner.aboutHeading" />
        </H4>
        <FieldTextInput
          id={`${formId}.professionalTitle`}
          name={field('professionalTitle')}
          className={css.practitionerField}
          type="text"
          label={t('professionalTitle')}
          placeholder={t('professionalTitlePlaceholder')}
          maxLength={60}
        />
        <LocationRows formId={formId} intl={intl} push={push} plan={plan} />
        <FieldCheckboxGroup
          id={`${formId}.languagesSpoken`}
          name={field('languagesSpoken')}
          className={css.practitionerField}
          label={t('languagesSpoken')}
          options={options(LANGUAGE_OPTIONS, 'language')}
          twoColumns
        />
        <FieldTextInput
          id={`${formId}.quote`}
          name={field('quote')}
          className={css.practitionerField}
          type="textarea"
          label={t('quote')}
          placeholder={t('quotePlaceholder')}
          maxLength={600}
        />
        <FieldTextInput
          id={`${formId}.quoteAuthor`}
          name={field('quoteAuthor')}
          className={css.practitionerField}
          type="text"
          label={t('quoteAuthor')}
          placeholder={t('quoteAuthorPlaceholder')}
          maxLength={80}
        />
      </div>

      <div className={css.sectionContainer}>
        <H4 as="h2" className={css.sectionTitle}>
          <FormattedMessage id="ProfileSettingsForm.practitioner.experienceHeading" />
        </H4>
        <p className={css.extraInfo}>
          <FormattedMessage id="ProfileSettingsForm.practitioner.experienceInfo" />
        </p>
        <FieldArray name={field('experience')}>
          {({ fields }) => (
            <div className={css.rows}>
              {fields.map((lineName, index) => (
                <div key={lineName} className={css.lineRow}>
                  <FieldTextInput
                    id={`${formId}.experience.${index}`}
                    name={lineName}
                    className={css.lineInput}
                    type="text"
                    placeholder={t('experiencePlaceholder')}
                    maxLength={200}
                  />
                  <InlineTextButton
                    type="button"
                    className={css.removeRow}
                    onClick={() => fields.remove(index)}
                  >
                    <FormattedMessage id="ProfileSettingsForm.practitioner.removeRow" />
                  </InlineTextButton>
                </div>
              ))}
              <InlineTextButton
                type="button"
                className={css.addRow}
                onClick={() => push(field('experience'), '')}
              >
                <FormattedMessage id="ProfileSettingsForm.practitioner.addExperience" />
              </InlineTextButton>
            </div>
          )}
        </FieldArray>
      </div>

      <div className={css.sectionContainer}>
        <H4 as="h2" className={css.sectionTitle}>
          <FormattedMessage id="PractitionerProfile.trainingHeading" />
        </H4>
        <TrainingRows name="training" formId={formId} intl={intl} push={push} />
      </div>

      <div className={css.sectionContainer}>
        <H4 as="h2" className={css.sectionTitle}>
          <FormattedMessage id="PractitionerProfile.furtherTrainingHeading" />
        </H4>
        <TrainingRows name="furtherTraining" formId={formId} intl={intl} push={push} />
      </div>
    </>
  );
};

export default PractitionerProfileFields;
