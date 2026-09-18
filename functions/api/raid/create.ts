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
const MAX_BODY_BYTES = 2_000;

// src/lib/raidConstants.ts と同じ値。
// Pages Functions は src からインポートできないため意図的に重複させている。
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const ROOM_TTL_SEC = 600;

/** ルームコードの衝突時にやり直す回数 */
const MAX_CODE_ATTEMPTS = 5;

function generateCode(): string {
  const values = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => CODE_CHARS[v % CODE_CHARS.length]).join('');
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

  let parsed: { name?: unknown; deviceId?: unknown };
  try {
    parsed = JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const { name, deviceId } = parsed;
  if (
    typeof name !== 'string' || name.length < 1 || name.length > 20 ||
    typeof deviceId !== 'string' || deviceId.length < 1 || deviceId.length > 64
  ) {
    return new Response(JSON.stringify({ error: 'Validation failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const createdAt = Math.floor(Date.now() / 1000);
  const expiresAt = createdAt + ROOM_TTL_SEC;

  try {
    // 期限切れのルーム・参加者・シグナルを掃除する（ルーム作成時のみ実行）
    env.AKASHIC_DB
      .prepare('DELETE FROM raid_signals WHERE room_code IN (SELECT code FROM raid_rooms WHERE expires_at < ?)')
      .bind(createdAt).run()
      .then(() =>
        env.AKASHIC_DB
          .prepare('DELETE FROM raid_members WHERE room_code IN (SELECT code FROM raid_rooms WHERE expires_at < ?)')
          .bind(createdAt).run()
      )
      .then(() =>
        env.AKASHIC_DB
          .prepare('DELETE FROM raid_rooms WHERE expires_at < ?')
          .bind(createdAt).run()
      )
      .catch(() => { /* 掃除の失敗はルーム作成を妨げない */ });

    // コードが衝突した場合はやり直す（PRIMARY KEY 制約違反で例外になる）
    let code = '';
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const candidate = generateCode();
      try {
        await env.AKASHIC_DB
          .prepare('INSERT INTO raid_rooms (code, host_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
          .bind(candidate, deviceId, createdAt, expiresAt)
          .run();
        code = candidate;
        break;
      } catch {
        // 次の候補で再試行
      }
    }

    if (!code) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    await env.AKASHIC_DB
      .prepare('INSERT INTO raid_members (room_code, device_id, name, joined_at) VALUES (?, ?, ?, ?)')
      .bind(code, deviceId, name, createdAt)
      .run();

    return new Response(JSON.stringify({ code, hostId: deviceId, createdAt, expiresAt }), {
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
