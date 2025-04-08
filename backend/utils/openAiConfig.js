const PLACEHOLDER_FRAGMENTS = [
  'your-key',
  'sk-your',
  'your_api',
  'your-api',
  'api-key-here',
  'key-here',
  'goes-here',
  'changeme',
  'placeholder',
  'insert',
  'replace',
  'example',
  'xxxx',
  '****'
];

function isValidOpenAiApiKey(raw) {
  const key = typeof raw === 'string' ? raw.trim() : '';
  if (!key || key.length < 20) {
    return false;
  }

  if (!key.startsWith('sk-')) {
    return false;
  }

  const lower = key.toLowerCase();
  return !PLACEHOLDER_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function getOpenAiApiKey() {
  const key = process.env.OPENAI_API_KEY;
  return isValidOpenAiApiKey(key) ? key.trim() : null;
}

function isOpenAiConfigured() {
  return Boolean(getOpenAiApiKey());
}

module.exports = {
  isValidOpenAiApiKey,
  getOpenAiApiKey,
  isOpenAiConfigured
};
