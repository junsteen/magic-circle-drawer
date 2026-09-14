interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<{ success: boolean }>;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
}

interface Env {
  AKASHIC_DB: D1Database;
}

const CORS = { 'Access-Control-Allow-Origin': '*' };
const MAX_BODY_BYTES = 2_000;

// src/lib/raidConstants.ts と同じ値。
// Pages Functions は src からインポートできないため意図的に重複させている。
const CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
const MAX_MEMBERS = 4;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.AKASHIC_DB) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const body = await request.text();
  if (!body || body.length > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Invalid data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  let parsed: { code?: unknown; name?: unknown; deviceId?: unknown };
  try {
    parsed = JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const { code, name, deviceId } = parsed;
  if (
    typeof code !== 'string' || !CODE_PATTERN.test(code) ||
    typeof name !== 'string' || name.length < 1 || name.length > 20 ||
    typeof deviceId !== 'string' || deviceId.length < 1 || deviceId.length > 64
  ) {
    return new Response(JSON.stringify({ error: 'Validation failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const now = Math.floor(Date.now() / 1000);

  try {
    const room = await env.AKASHIC_DB
      .prepare('SELECT code, host_id, created_at, expires_at FROM raid_rooms WHERE code = ?')
      .bind(code)
      .first<{ code: string; host_id: string; created_at: number; expires_at: number }>();

    if (!room || room.expires_at < now) {
      return new Response(JSON.stringify({ error: 'Room not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const existing = await env.AKASHIC_DB
      .prepare('SELECT device_id, name, joined_at FROM raid_members WHERE room_code = ? ORDER BY joined_at')
      .bind(code)
      .all<{ device_id: string; name: string; joined_at: number }>();

    const alreadyJoined = existing.results.some((m) => m.device_id === deviceId);

    // 再参加（同一デバイスの復帰）は定員に関係なく許可する
    if (!alreadyJoined && existing.results.length >= MAX_MEMBERS) {
      return new Response(JSON.stringify({ error: 'Room is full' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    if (!alreadyJoined) {
      await env.AKASHIC_DB
        .prepare('INSERT INTO raid_members (room_code, device_id, name, joined_at) VALUES (?, ?, ?, ?)')
        .bind(code, deviceId, name, now)
        .run();
    }

    const members = await env.AKASHIC_DB
      .prepare('SELECT device_id, name, joined_at FROM raid_members WHERE room_code = ? ORDER BY joined_at')
      .bind(code)
      .all<{ device_id: string; name: string; joined_at: number }>();

    return new Response(
      JSON.stringify({
        code: room.code,
        hostId: room.host_id,
        createdAt: room.created_at,
        expiresAt: room.expires_at,
        members: members.results.map((m) => ({
          deviceId: m.device_id,
          name: m.name,
          joinedAt: m.joined_at,
        })),
      }),
      { headers: { 'Content-Type': 'application/json', ...CORS } }
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
