/**
 * Minimal client for the OpenAI Responses API (POST /v1/responses) with Structured Outputs: the
 * answer follows the given JSON schema. Uses fetch, no SDK. The key (OPENAI_API_KEY) stays on
 * the server.
 */

const API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-6-luna';
const TIMEOUT_MS = 60 * 1000;

const translationError = (message, code) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

/**
 * @returns {boolean} true if the OpenAI key is set
 */
const isConfigured = () => !!process.env.OPENAI_API_KEY;

/**
 * Asks the model for a JSON answer that follows the schema.
 *
 * @param {Object} params
 * @param {string} params.instructions System instructions
 * @param {Object} params.input JSON input (sent as the user message)
 * @param {string} params.schemaName
 * @param {Object} params.schema JSON schema of the answer (strict)
 * @returns {Promise<Object>} The parsed answer
 */
const requestJson = async ({ instructions, input, schemaName, schema }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw translationError('OPENAI_API_KEY is not set', 'not-configured');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_TRANSLATION_MODEL || DEFAULT_MODEL,
        input: [
          { role: 'system', content: instructions },
          { role: 'user', content: JSON.stringify(input) },
        ],
        text: { format: { type: 'json_schema', name: schemaName, schema, strict: true } },
      }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      // The error of OpenAI is logged, never sent to the browser
      throw translationError(
        `OpenAI request failed (${response.status}): ${data?.error?.message || 'no details'}`,
        'openai-failed'
      );
    }
    if (data?.status === 'incomplete') {
      throw translationError('OpenAI response is incomplete', 'openai-incomplete');
    }
    const text = (data?.output || [])
      .filter(item => item?.type === 'message')
      .flatMap(item => item.content || [])
      .find(content => content?.type === 'output_text')?.text;
    if (!text) {
      throw translationError('OpenAI response has no text (refusal?)', 'openai-no-output');
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { isConfigured, requestJson };
