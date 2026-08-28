const SYSTEM_PROMPT = `You extract nutrition info from a photo of food. The photo is one of two things:
(a) A printed nutrition facts label, or
(b) A plated meal / packaged food / restaurant dish with no legible label.

Reply with strict JSON only, no other text:
{"calories": number|null, "protein_g": number|null, "carbs_g": number|null, "fat_g": number|null, "food_name": string|null, "estimated": boolean}

Rules:
- If it's case (a), a real label: read the exact printed values. calories must be in kcal. If the label shows multiple columns (e.g. "per 100g" and "per serving"/"per pouch"/"per portion"/"per pack"), use the per-serving/per-pouch/per-portion column, not per-100g. Set "estimated": false.
- If it's case (b), no label: identify the food and estimate calories and macros based on what's visible and typical portion sizes for that dish. Set "estimated": true.
- food_name should be a short guess at the food or product name, otherwise null.
- If you truly cannot make a reasonable read or estimate (image unclear, not food at all), use null for the numeric fields.
- Never refuse to estimate case (b) just because it's not exact — a reasonable estimate is expected and useful; just mark it "estimated": true.`;

const BACKUP_PATH = 'data/nutrilog-backup.json';
const GITHUB_API = 'https://api.github.com';

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

function checkAuth(request, env) {
  if (!env.APP_SHARED_SECRET) return true;
  return request.headers.get('X-App-Secret') === env.APP_SHARED_SECRET;
}

async function handleScan(request, env, origin) {
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
      estimated: Boolean(parsed.estimated),
    },
    200,
    origin,
  );
}

function githubHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_BACKUP_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'nutrilog-worker',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function repoContentsUrl(env) {
  return `${GITHUB_API}/repos/${env.GITHUB_BACKUP_OWNER}/${env.GITHUB_BACKUP_REPO}/contents/${BACKUP_PATH}`;
}

async function handleBackupGet(_request, env, origin) {
  if (!env.GITHUB_BACKUP_TOKEN) {
    return json({ error: 'Server not configured: missing GITHUB_BACKUP_TOKEN' }, 500, origin);
  }

  const res = await fetch(repoContentsUrl(env), { headers: githubHeaders(env) });
  if (res.status === 404) {
    return json({ exists: false }, 200, origin);
  }
  if (!res.ok) {
    return json({ error: 'GitHub read failed', detail: (await res.text()).slice(0, 500) }, 502, origin);
  }

  const file = await res.json();
  const content = decodeURIComponent(escape(atob(file.content.replace(/\n/g, ''))));
  return json({ exists: true, content, updatedAt: file.sha }, 200, origin);
}

async function handleBackupPost(request, env, origin) {
  if (!env.GITHUB_BACKUP_TOKEN) {
    return json({ error: 'Server not configured: missing GITHUB_BACKUP_TOKEN' }, 500, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, origin);
  }

  const { data } = body || {};
  if (!data || typeof data !== 'object') {
    return json({ error: 'Missing data' }, 400, origin);
  }

  const contentStr = JSON.stringify(data, null, 2);
  const contentB64 = btoa(unescape(encodeURIComponent(contentStr)));

  // Fetch current sha, if the file already exists, so we update rather than conflict.
  let sha;
  const existing = await fetch(repoContentsUrl(env), { headers: githubHeaders(env) });
  if (existing.ok) {
    const existingFile = await existing.json();
    sha = existingFile.sha;
  }

  const putOnce = () =>
    fetch(repoContentsUrl(env), {
      method: 'PUT',
      headers: { ...githubHeaders(env), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Backup sync — ${new Date().toISOString()}`,
        content: contentB64,
        ...(sha ? { sha } : {}),
      }),
    });

  let putRes = await putOnce();

  if (putRes.status === 409) {
    // Someone else updated it in between — refetch sha once and retry.
    const retryExisting = await fetch(repoContentsUrl(env), { headers: githubHeaders(env) });
    if (retryExisting.ok) {
      sha = (await retryExisting.json()).sha;
      putRes = await putOnce();
    }
  }

  if (!putRes.ok) {
    return json({ error: 'GitHub write failed', detail: (await putRes.text()).slice(0, 500) }, 502, origin);
  }

  return json({ ok: true }, 200, origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (!checkAuth(request, env)) {
      return json({ error: 'Unauthorized' }, 401, origin);
    }

    if (pathname === '/backup' && request.method === 'GET') {
      return handleBackupGet(request, env, origin);
    }
    if (pathname === '/backup' && request.method === 'POST') {
      return handleBackupPost(request, env, origin);
    }
    if ((pathname === '/' || pathname === '/scan') && request.method === 'POST') {
      return handleScan(request, env, origin);
    }

    return json({ error: 'Not found' }, 404, origin);
  },
};
