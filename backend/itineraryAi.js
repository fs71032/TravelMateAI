const { getOpenAiApiKey } = require('./utils/openAiConfig');

async function generateWithOpenAI(prompt, dayCount, seed, destinationContext = '') {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return null;
  }
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const systemPrompt = [
    'You are TravelMate AI — a professional local travel planner with verified knowledge of real venues worldwide.',
    'Return JSON only: {"items":[{"day":number,"title":string,"details":string}]}.',
    `Include exactly ${dayCount} items with day numbers 1 through ${dayCount}.`,
    '',
    'STRICT RULES:',
    '- Use ONLY real, existing places (restaurants, museums, neighborhoods, parks, viewpoints) at the requested destination.',
    '- Never invent venue names. Prefer well-known landmarks and reputable local businesses.',
    '- Organize each day geographically: cluster nearby stops to minimize travel time.',
    '- Format details with timed blocks, e.g. "09:00–10:30 — Activity at [Real Place Name] (address or district)".',
    '- Include: Morning, Afternoon, Evening blocks + one "Local tip:" line + transport note when moving between districts.',
    '- Day 1: lighter pace (orientation); final day: flexible timing suitable for departure.',
    '- Match the requested travel style and budget realistically.',
    '- Write in clear English; keep proper nouns in local spelling (e.g. Alfama, Blloku).',
    '- When VERIFIED GOOGLE PLACES DATA is provided, prioritize those exact venues in the schedule.'
  ].join('\n');

  const userContent = [destinationContext, prompt].filter(Boolean).join('\n\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: seed != null ? 0.75 : 0.55,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText.slice(0, 240)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty response.');
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('OpenAI returned invalid JSON.');
  }

  return normalizeItems(parsed.items, dayCount);
}

function normalizeItems(items, dayCount) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('OpenAI JSON is missing an items array.');
  }

  const stamp = Date.now();
  return items.slice(0, dayCount).map((item, index) => {
    const dayNumber = Number.isInteger(item.day) ? item.day : index + 1;
    return {
      id: item.id || `ai-${stamp}-${dayNumber}`,
      day: dayNumber,
      title: typeof item.title === 'string' ? item.title.trim() : '',
      details: typeof item.details === 'string' ? item.details.trim() : ''
    };
  });
}

module.exports = { generateWithOpenAI };
