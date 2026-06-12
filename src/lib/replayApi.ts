/**
 * Cloudflare KV 経由のリプレイデータ保存・取得
 * 保存はクライアントから POST /api/replay/save、取得は GET /api/replay/[id]
 */

/**
 * 圧縮済みリプレイデータを KV に保存して短縮 ID を返す
 * 失敗時は null を返す
 */
export async function saveReplayToKV(compressed: string): Promise<string | null> {
  try {
    const res = await fetch('/api/replay/save', {
      method: 'POST',
      body: compressed,
      headers: { 'Content-Type': 'text/plain' },
    });
    if (!res.ok) return null;
    const json = await res.json() as { id?: string };
    return json.id ?? null;
  } catch {
    return null;
  }
}

/**
 * KV から圧縮済みリプレイデータを取得する
 * 失敗時は null を返す
 */
export async function loadReplayFromKV(id: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/replay/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
