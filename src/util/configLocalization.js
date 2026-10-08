/**
 * The texts of the fields, categories and types are written in Console in one language. This
 * file translates them with the translation files (src/translations), so the labels follow the
 * language of the app. A text that has no translation keeps the text of Console.
 *
 * Translation keys ({key} is the key of the field in Console, {option} the option value):
 *
 *   UserFields.{key}                    label of a user field
 *   UserFields.{key}.{option}           label of an option of an enum or multi-enum user field
 *   UserFields.{key}.placeholder        placeholder text of the input (optional)
 *   UserFields.{key}.required           message when the field is required (optional)
 *   ListingFields.{key}                 the same for listing fields
 *   ListingFields.{key}.{option}
 *   TransactionFields.{key}             the same for the transaction fields of listing types
 *   TransactionFields.{key}.{option}
 *   Categories.{categoryId}             name of a category or a subcategory
 *   ListingTypes.{listingType}          label of a listing type
 *   UserTypes.{userType}                label of a user type
 */

export const USER_FIELDS_PREFIX = 'UserFields';
export const LISTING_FIELDS_PREFIX = 'ListingFields';
export const TRANSACTION_FIELDS_PREFIX = 'TransactionFields';
export const CATEGORIES_PREFIX = 'Categories';
export const LISTING_TYPES_PREFIX = 'ListingTypes';
export const USER_TYPES_PREFIX = 'UserTypes';

/**
 * Returns the translation of the key, or the fallback if there is no translation.
 *
 * @param {Object} messages translations of the app (intl.messages)
 * @param {string} id translation key
 * @param {*} fallback returned when the key has no translation
 * @returns {*}
 */
export const translateOr = (messages, id, fallback) => {
  const message = messages?.[id];
  return typeof message === 'string' && message.trim() !== '' && message !== id
    ? message
    : fallback;
};

const withLabel = (config, label) => (config && label ? { ...config, label } : config);

/**
 * Translates the texts of one extended data field (user, listing or transaction field).
 *
 * @param {Object} field field config (key, label, enumOptions, saveConfig, showConfig, filterConfig)
 * @param {string} prefix e.g. 'UserFields'
 * @param {Object} messages translations
 * @returns {Object} the field with translated texts
 */
export const localizeField = (field, prefix, messages) => {
  if (!field?.key) {
    return field;
  }
  const baseId = `${prefix}.${field.key}`;
  const label = translateOr(messages, baseId, null);
  const placeholder = translateOr(messages, `${baseId}.placeholder`, null);
  const required = translateOr(messages, `${baseId}.required`, null);

  const enumOptionsMaybe = Array.isArray(field.enumOptions)
    ? {
        enumOptions: field.enumOptions.map(o => ({
          ...o,
          label: translateOr(messages, `${baseId}.${o.option}`, o.label),
        })),
      }
    : {};

  const saveConfig = field.saveConfig
    ? {
        ...withLabel(field.saveConfig, label),
        ...(placeholder ? { placeholderMessage: placeholder } : {}),
        ...(required ? { requiredMessage: required } : {}),
      }
    : field.saveConfig;

  return {
    ...field,
    ...(label ? { label } : {}),
    ...enumOptionsMaybe,
    ...(field.saveConfig ? { saveConfig } : {}),
    ...(field.showConfig ? { showConfig: withLabel(field.showConfig, label) } : {}),
    ...(field.filterConfig ? { filterConfig: withLabel(field.filterConfig, label) } : {}),
  };
};

const localizeFields = (fields, prefix, messages) =>
  Array.isArray(fields) ? fields.map(f => localizeField(f, prefix, messages)) : fields;

/**
 * Translates the names of categories and their subcategories.
 *
 * @param {Array} categories [{ id, name, subcategories }]
 * @param {Object} messages translations
 * @returns {Array}
 */
export const localizeCategories = (categories, messages) =>
  Array.isArray(categories)
    ? categories.map(c => ({
        ...c,
        name: translateOr(messages, `${CATEGORIES_PREFIX}.${c.id}`, c.name),
        ...(Array.isArray(c.subcategories)
          ? { subcategories: localizeCategories(c.subcategories, messages) }
          : {}),
      }))
    : categories;

const localizeListingTypes = (listingTypes, messages) =>
  Array.isArray(listingTypes)
    ? listingTypes.map(lt => ({
        ...lt,
        label: translateOr(messages, `${LISTING_TYPES_PREFIX}.${lt.listingType}`, lt.label),
        ...(Array.isArray(lt.transactionFields)
          ? {
              transactionFields: localizeFields(
                lt.transactionFields,
                TRANSACTION_FIELDS_PREFIX,
                messages
              ),
            }
          : {}),
      }))
    : listingTypes;

const localizeUserTypes = (userTypes, messages) =>
  Array.isArray(userTypes)
    ? userTypes.map(ut => ({
        ...ut,
        label: translateOr(messages, `${USER_TYPES_PREFIX}.${ut.userType}`, ut.label),
      }))
    : userTypes;

/**
 * Translates the texts of the user fields, listing fields, transaction fields, categories,
 * listing types and user types in the app configuration. Keys, ids and values are not changed.
 *
 * @param {Object} config the app configuration (see util/configHelpers.js mergeConfig)
 * @param {Object} messages translations of the language in use (intl.messages)
 * @returns {Object} a new config object with translated texts
 */
export const localizeConfig = (config, messages) => {
  if (!config || !messages) {
    return config;
  }
  const { user, listing, categoryConfiguration } = config;

  return {
    ...config,
    ...(user
      ? {
          user: {
            ...user,
            userTypes: localizeUserTypes(user.userTypes, messages),
            userFields: localizeFields(user.userFields, USER_FIELDS_PREFIX, messages),
          },
        }
      : {}),
    ...(listing
      ? {
          listing: {
            ...listing,
            listingTypes: localizeListingTypes(listing.listingTypes, messages),
            listingFields: localizeFields(listing.listingFields, LISTING_FIELDS_PREFIX, messages),
          },
        }
      : {}),
    ...(categoryConfiguration
      ? {
          categoryConfiguration: {
            ...categoryConfiguration,
            categories: localizeCategories(categoryConfiguration.categories, messages),
          },
        }
      : {}),
  };
};
