const SYSTEM_PROMPT = `You read nutrition facts labels from photos.
Reply with strict JSON only, no other text:
{"calories": number|null, "protein_g": number|null, "carbs_g": number|null, "fat_g": number|null, "food_name": string|null}

Rules:
- calories must be in kcal.
- If the label shows multiple columns (e.g. "per 100g" and "per serving"/"per pouch"/"per portion"/"per pack"), use the per-serving/per-pouch/per-portion column, not per-100g.
- food_name should be a short guess at the product name if visible (e.g. from a front-of-pack logo partially in frame), otherwise null.
- If a field truly isn't visible or legible, use null for that field. Never guess wildly.
- If the photo does not contain a nutrition label at all, return all fields as null.`;

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Secret',
    Vary: 'Origin',
  };
}

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function numOrNull(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin);
    }

    if (env.APP_SHARED_SECRET) {
      const provided = request.headers.get('X-App-Secret');
      if (provided !== env.APP_SHARED_SECRET) {
        return json({ error: 'Unauthorized' }, 401, origin);
      }
    }

    if (!env.OPENAI_API_KEY) {
      return json({ error: 'Server not configured: missing OPENAI_API_KEY' }, 500, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, origin);
    }

    const { image } = body || {};
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return json({ error: 'Missing or invalid image (expected a data: URL)' }, 400, origin);
    }

    const model = env.OPENAI_MODEL || 'gpt-4o-mini';

    let openaiRes;
    try {
      openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          max_tokens: 300,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Extract the nutrition facts from this label photo.' },
                { type: 'image_url', image_url: { url: image } },
              ],
            },
          ],
        }),
      });
    } catch {
      return json({ error: 'Could not reach OpenAI' }, 502, origin);
    }

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return json({ error: 'OpenAI request failed', detail: errText.slice(0, 500) }, 502, origin);
    }

    const data = await openaiRes.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return json({ error: 'No response from model' }, 502, origin);
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return json({ error: 'Could not parse model response' }, 502, origin);
    }

    return json(
      {
        calories: numOrNull(parsed.calories),
        protein: numOrNull(parsed.protein_g),
        carbs: numOrNull(parsed.carbs_g),
        fat: numOrNull(parsed.fat_g),
        name: typeof parsed.food_name === 'string' ? parsed.food_name : null,
      },
      200,
      origin,
    );
  },
};
