interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<{ success: boolean }>;
  all<T>(): Promise<{ results: T[] }>;
}

interface Env {
  AKASHIC_DB: D1Database;
}

const CORS = { 'Access-Control-Allow-Origin': '*' };
/** SDP は数KB になるため create/join より大きめに取る */
const MAX_BODY_BYTES = 50_000;

// src/lib/raidConstants.ts と同じ値。
// Pages Functions は src からインポートできないため意図的に重複させている。
const CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

const VALID_KINDS = ['offer', 'answer', 'ice'];
/** 1リクエストで投函できるメッセージ数 */
const MAX_MESSAGES = 30;
/** 1回のポーリングで返すメッセージ数 */
const FETCH_LIMIT = 200;

interface OutgoingMessage {
  to: string;
  kind: string;
  payload: string;
}

function isValidMessage(m: unknown): m is OutgoingMessage {
  if (typeof m !== 'object' || m === null) return false;
  const { to, kind, payload } = m as { to?: unknown; kind?: unknown; payload?: unknown };
  return (
    typeof to === 'string' && to.length > 0 && to.length <= 64 &&
    typeof kind === 'string' && VALID_KINDS.includes(kind) &&
    typeof payload === 'string' && payload.length > 0
  );
}

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

  let parsed: { code?: unknown; deviceId?: unknown; since?: unknown; messages?: unknown };
  try {
    parsed = JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const { code, deviceId, since, messages } = parsed;
  if (
    typeof code !== 'string' || !CODE_PATTERN.test(code) ||
    typeof deviceId !== 'string' || deviceId.length < 1 || deviceId.length > 64
  ) {
    return new Response(JSON.stringify({ error: 'Validation failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const cursor = typeof since === 'number' && Number.isFinite(since) ? Math.max(0, since) : 0;

  const outgoing: OutgoingMessage[] = [];
  if (messages !== undefined) {
    if (!Array.isArray(messages) || messages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: 'Validation failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }
    for (const m of messages) {
      if (!isValidMessage(m)) {
        return new Response(JSON.stringify({ error: 'Validation failed' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
      outgoing.push(m);
    }
  }

  const now = Math.floor(Date.now() / 1000);

  try {
    // ICE candidate は順不同で処理できるため並列投函でよい
    if (outgoing.length > 0) {
      await Promise.all(
        outgoing.map((m) =>
          env.AKASHIC_DB
            .prepare('INSERT INTO raid_signals (room_code, from_id, to_id, kind, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(code, deviceId, m.to, m.kind, m.payload, now)
            .run()
        )
      );
    }

    const [signals, members] = await Promise.all([
      env.AKASHIC_DB
        .prepare(
          `SELECT id, from_id, to_id, kind, payload FROM raid_signals
           WHERE room_code = ? AND id > ? AND from_id != ? AND (to_id = ? OR to_id = '*')
           ORDER BY id LIMIT ${FETCH_LIMIT}`
        )
        .bind(code, cursor, deviceId, deviceId)
        .all<{ id: number; from_id: string; to_id: string; kind: string; payload: string }>(),
      env.AKASHIC_DB
        .prepare('SELECT device_id, name, joined_at FROM raid_members WHERE room_code = ? ORDER BY joined_at')
        .bind(code)
        .all<{ device_id: string; name: string; joined_at: number }>(),
    ]);

    return new Response(
      JSON.stringify({
        signals: signals.results.map((s) => ({
          id: s.id,
          fromId: s.from_id,
          toId: s.to_id,
          kind: s.kind,
          payload: s.payload,
        })),
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
