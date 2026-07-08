const ALLOWED_ORIGINS = [
  'https://juliusziegler88-stack.github.io',
  'http://localhost:8080'
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

async function googleTokenRequest(params, env) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      ...params
    })
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request.headers.get('Origin') || '');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/exchange') {
      const { code } = await request.json();
      if (!code) return new Response(JSON.stringify({ error: 'code fehlt' }), { status: 400, headers });

      const { ok, data } = await googleTokenRequest({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'postmessage'
      }, env);
      if (!ok) return new Response(JSON.stringify({ error: data.error || 'exchange fehlgeschlagen' }), { status: 400, headers });

      return new Response(JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in
      }), { status: 200, headers });
    }

    if (request.method === 'POST' && url.pathname === '/refresh') {
      const { refresh_token } = await request.json();
      if (!refresh_token) return new Response(JSON.stringify({ error: 'refresh_token fehlt' }), { status: 400, headers });

      const { ok, data } = await googleTokenRequest({
        grant_type: 'refresh_token',
        refresh_token
      }, env);
      if (!ok) return new Response(JSON.stringify({ error: data.error || 'refresh fehlgeschlagen' }), { status: 400, headers });

      return new Response(JSON.stringify({
        access_token: data.access_token,
        expires_in: data.expires_in
      }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers });
  }
};
