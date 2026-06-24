interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
}

interface Env {
  AKASHIC_DB: D1Database;
}

const CORS = { 'Access-Control-Allow-Origin': '*' };

export const onRequestPost: PagesFunction<Env> = async ({ params, env }) => {
  if (!env.AKASHIC_DB) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
  const id = params.id as string;
  if (!id || id.length !== 8) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  try {
    const row = await env.AKASHIC_DB
      .prepare('SELECT id, name, data, thumbnail FROM patterns WHERE id = ?')
      .bind(id)
      .first<{ id: string; name: string; data: string; thumbnail: string | null }>();

    if (!row) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // ダウンロードカウントを非同期でインクリメント（レスポンスをブロックしない）
    env.AKASHIC_DB
      .prepare('UPDATE patterns SET downloads = downloads + 1 WHERE id = ?')
      .bind(id)
      .run()
      .catch(() => { /* ignore */ });

    return new Response(
      JSON.stringify({
        id: row.id,
        name: row.name,
        data: JSON.parse(row.data),
        thumbnail: row.thumbnail ?? undefined,
      }),
      { headers: { 'Content-Type': 'application/json', ...CORS } },
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });
