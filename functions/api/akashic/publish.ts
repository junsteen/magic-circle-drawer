interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<{ success: boolean }>;
}

interface Env {
  AKASHIC_DB: D1Database;
}

const CORS = { 'Access-Control-Allow-Origin': '*' };
const MAX_BODY_BYTES = 100_000;
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateId(): string {
  const values = new Uint8Array(8);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => CHARS[v % CHARS.length]).join('');
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.text();
  if (!body || body.length > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Invalid data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  let parsed: { name?: unknown; data?: unknown; thumbnail?: unknown; authorId?: unknown };
  try {
    parsed = JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const { name, data, thumbnail, authorId } = parsed;
  if (
    typeof name !== 'string' || name.length < 1 || name.length > 50 ||
    typeof data !== 'object' || data === null ||
    typeof authorId !== 'string' || authorId.length < 1
  ) {
    return new Response(JSON.stringify({ error: 'Validation failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const id = generateId();
  const createdAt = Math.floor(Date.now() / 1000);

  try {
    await env.AKASHIC_DB
      .prepare('INSERT INTO patterns (id, name, data, thumbnail, author_id, downloads, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)')
      .bind(id, name, JSON.stringify(data), thumbnail ?? null, authorId, createdAt)
      .run();

    return new Response(JSON.stringify({ id }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });
