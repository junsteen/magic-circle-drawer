/**
 * レイド魔法陣（Phase 1: 通信層）の定数
 *
 * 各値の設計根拠は Issue #182 を参照。
 * ボス HP・ダメージ倍率など戦闘系の定数は Phase 2 で追加する。
 */

/** パーティ上限人数。4人フルメッシュ = 6接続 */
export const RAID_MAX_MEMBERS = 4;

/**
 * ルームコードの文字集合。
 * 口頭で伝える・手入力する想定のため大文字英数のみとし、
 * 紛らわしい I L O 0 1 を除外している（既存 generateId の方針を踏襲）。
 */
export const RAID_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const RAID_CODE_LENGTH = 6;

/** ルームの有効期限（秒） */
export const RAID_ROOM_TTL_SEC = 600;

/** 座標送信レート。人間の筆致は 5〜10Hz 帯なので 20Hz で視覚上十分 */
export const RAID_SEND_INTERVAL_MS = 50;
/** 1メッセージあたりの最大点数 */
export const RAID_MAX_POINTS_PER_MSG = 8;

/** 間引き: これ未満しか動いていない点は送らない（px） */
export const RAID_THIN_DISTANCE_PX = 2;
/** 間引き: 進行方向がこれ以上変わった点は距離が短くても送る（度） */
export const RAID_THIN_ANGLE_DEG = 15;

/** 受信描画を遅延させる量。ジッタを吸収して滑らかに見せる */
export const RAID_JITTER_BUFFER_MS = 100;

/** ハートビート送信間隔 */
export const RAID_HEARTBEAT_MS = 2000;
/** これだけ無応答なら「不安定」表示 */
export const RAID_UNSTABLE_MS = 6000;
/** これだけ無応答なら離脱とみなす */
export const RAID_LEAVE_MS = 15000;
/** これを超える RTT で回線警告バッジを出す（判定には影響しない） */
export const RAID_RTT_WARN_MS = 400;

/** 接続確立のタイムアウト。超過したらソロプレイを提案する */
export const RAID_CONNECT_TIMEOUT_MS = 30000;

/** シグナリングのポーリング間隔 */
export const RAID_SIGNAL_POLL_MS = 1000;

/** 時計同期に使う ping/pong の往復回数 */
export const RAID_CLOCK_SYNC_SAMPLES = 5;

/** キャンバスサイズ。既存モード（CANVAS_SIZE = 350）と揃える */
export const RAID_CANVAS_SIZE = 350;

/** 参加順に割り当てる描画色 */
export const RAID_MEMBER_COLORS = ['#00e5ff', '#ffd700', '#76ff03', '#ff4081'];

/** レイドモードのテーマカラー（既存モード色・難易度色のいずれとも衝突しない深紅） */
export const RAID_THEME_COLOR = '#d50000';

/** NAT 越え用の STUN サーバ。TURN は Phase 3 で導入する */
export const RAID_STUN_SERVERS = [
  'stun:stun.cloudflare.com:3478',
  'stun:stun.l.google.com:19302',
];

/** ルームコードの形式が正しいか検証する */
export function isValidRaidCode(code: string): boolean {
  if (code.length !== RAID_CODE_LENGTH) return false;
  for (const ch of code) {
    if (!RAID_CODE_CHARS.includes(ch)) return false;
  }
  return true;
}
