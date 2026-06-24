interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

interface Env {
  AKASHIC_DB: D1Database;
}

const CORS = { 'Access-Control-Allow-Origin': '*' };

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const sort = url.searchParams.get('sort') === 'popular' ? 'popular' : 'new';
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));
  const offset = (page - 1) * limit;

  const orderBy = sort === 'popular' ? 'downloads DESC' : 'created_at DESC';

  try {
    const [rows, countRow] = await Promise.all([
      env.AKASHIC_DB
        .prepare(`SELECT id, name, thumbnail, downloads, created_at FROM patterns ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
        .bind(limit, offset)
        .all<{ id: string; name: string; thumbnail: string | null; downloads: number; created_at: number }>(),
      env.AKASHIC_DB
        .prepare('SELECT COUNT(*) as total FROM patterns')
        .first<{ total: number }>(),
    ]);

    return new Response(
      JSON.stringify({ patterns: rows.results, total: countRow?.total ?? 0, page }),
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
