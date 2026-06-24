interface KVNamespace {
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

interface Env {
  REPLAY_KV: KVNamespace;
}

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30日
const MAX_BODY_BYTES = 500_000; // 500KB上限

function generateId(): string {
  // URL安全な英数字8文字（紛らわしい文字を除外）
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const values = new Uint8Array(8);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.text();

  if (!body || body.length > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Invalid data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = generateId();
  await env.REPLAY_KV.put(id, body, { expirationTtl: TTL_SECONDS });

  return new Response(JSON.stringify({ id }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
