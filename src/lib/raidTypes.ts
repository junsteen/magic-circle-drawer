/**
 * レイド魔法陣（Phase 1: 通信層）の型定義
 *
 * Phase 1 の範囲はルーム参加とリアルタイム描画共有まで。
 * ボス戦・スコア集計・合体判定に関する型は Phase 2 で追加する。
 */

/** 参加者の接続状態 */
export type RaidMemberStatus = 'connecting' | 'connected' | 'unstable' | 'left';

/** ルーム内での役割 */
export type RaidRole = 'host' | 'guest';

/** シグナリングメッセージの種別 */
export type RaidSignalKind = 'offer' | 'answer' | 'ice';

/** レイドルーム */
export interface RaidRoom {
  /** ルームコード（大文字英数6文字） */
  code: string;
  /** ホストのデバイスID */
  hostId: string;
  /** 作成時刻（UNIX秒） */
  createdAt: number;
  /** 有効期限（UNIX秒） */
  expiresAt: number;
}

/** ルーム参加者 */
export interface RaidMember {
  /** デバイスID（localStorage の arcane_device_id） */
  deviceId: string;
  /** 表示名 */
  name: string;
  /** 参加時刻（UNIX秒） */
  joinedAt: number;
}

/** 接続状態を含む参加者情報（クライアント側で保持する） */
export interface RaidPeer extends RaidMember {
  role: RaidRole;
  status: RaidMemberStatus;
  /** 直近の往復遅延（ミリ秒）。自分自身と未計測の場合は null */
  rttMs: number | null;
  /** 描画色（RAID_MEMBER_COLORS から参加順に割り当て） */
  color: string;
  /** 自分自身かどうか（一覧では自分も並べて表示する） */
  isSelf: boolean;
}

/** シグナリングメッセージ（サーバ経由で中継される） */
export interface RaidSignal {
  /** ポーリングのカーソルに使う連番 */
  id: number;
  fromId: string;
  /** 宛先デバイスID。'*' はブロードキャスト */
  toId: string;
  kind: RaidSignalKind;
  /** SDP または ICE candidate を JSON 文字列化したもの */
  payload: string;
}
