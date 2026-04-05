/** 描画イベントの種別 */
export type DrawEventType = 'start' | 'move' | 'end';

/** 描画1イベント (座標 + タイムスタンプ + 種別) */
export interface DrawEvent {
  x: number;
  y: number;
  t: number; // 開始からの経過ミリ秒
  type: DrawEventType;
}

/** 1ストローク分の描画ログ */
export type DrawStroke = DrawEvent[];

/** 魔法陣データ (構造＋動作の完全再現用) */
export interface MagicCircleData {
  seed?: number;
  pattern: {
    name: string;
    vertices: { x: number; y: number }[];
    edges: { from: number; to: number }[];
    circles: { cx: number; cy: number; radius: number }[];
  };
  drawLogs: DrawStroke[];
  timestamp: number;
}
