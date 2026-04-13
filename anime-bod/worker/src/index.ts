interface Env {
  DB: D1Database;
}

const ALLOWED_ORIGINS = [
  'https://cjwinslow.com',
  'http://localhost:8090',
  'http://localhost:8080',
];

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/sync')) {
      return new Response('Not found', { status: 404, headers: cors });
    }

    const key = url.searchParams.get('key');
    if (!key || key.length < 8) {
      return new Response('Missing or invalid key', { status: 401, headers: cors });
    }

    if (request.method === 'GET') {
      const row = await env.DB.prepare('SELECT state, updated_at FROM user_state WHERE user_key = ?')
        .bind(key)
        .first<{ state: string; updated_at: string }>();

      if (!row) {
        return new Response('No state found', { status: 404, headers: cors });
      }

      return new Response(row.state, {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'PUT') {
      const body = await request.text();
      if (!body) {
        return new Response('Empty body', { status: 400, headers: cors });
      }

      const now = new Date().toISOString();
      await env.DB.prepare(
        'INSERT INTO user_state (user_key, state, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_key) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at'
      )
        .bind(key, body, now)
        .run();

      return new Response(JSON.stringify({ ok: true, updated: now }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405, headers: cors });
  },
};
