/**
 * Preferred terms of the translations (Body Collective's wording). Add a line to change how a
 * word is translated; the change applies to texts that are translated after the next deploy
 * (bump TRANSLATION_VERSION in index.js to translate all texts again).
 */
const GLOSSARY = [
  '"practitioner" -> "Therapeutin" (a woman) or "Therapeut" (a man); several or unknown:',
  '  "Therapeutinnen und Therapeuten". Never "Praktiker", "Praktikerin" or "Praktiker:in".',
  '"treatment" -> "Behandlung"',
  '"bodywork" -> "Körperarbeit"',
  '"session" -> "Sitzung" (or "Behandlung" for a massage or treatment)',
  '"client" -> "Klientin" / "Klient"; several or unknown: "Klientinnen und Klienten"',
  '"booking" -> "Buchung"',
  '"spot" (place at a seminar or event) -> "Platz"',
];

// Forms of German gender-inclusive writing that read as stiff on Body Collective
const GENDER_RULE =
  'In German, never use gender marks such as ":in", ":innen", "*in", "_in" or a capital "I" ' +
  '("TherapeutIn"). For a person, use the form that fits them (from the text, e.g. the ' +
  'author\'s own words "Therapeutin"); for groups or unknown people, write both forms ' +
  '("Therapeutinnen und Therapeuten") or a neutral word.';

module.exports = { GLOSSARY, GENDER_RULE };
