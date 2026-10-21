import React from 'react';
import { FieldArray } from 'react-final-form-arrays';

import { FormattedMessage } from '../../../util/reactIntl';
import {
  LANGUAGE_OPTIONS,
  LOCATION_OPTIONS,
  PRACTITIONER_PROFILE_FIELD,
} from '../../../util/practitionerProfile';

import { FieldCheckboxGroup, FieldTextInput, H4, InlineTextButton } from '../../../components';

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
 * @returns {JSX.Element}
 */
const PractitionerProfileFields = props => {
  const { formId, intl, push } = props;
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
        <FieldCheckboxGroup
          id={`${formId}.locations`}
          name={field('locations')}
          className={css.practitionerField}
          label={t('locations')}
          options={options(LOCATION_OPTIONS, 'location')}
        />
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
