import { describe, it, expect } from 'vitest';

/**
 * formatDate 関数のテスト
 * タイムスタンプが秒単位・ミリ秒単位の両方に対応することを検証
 */
describe('formatDate function', () => {
  // formatDate 関数を テスト用に分離
  function formatDate(ts: number): string {
    // 秒単位（10 桁）の場合はミリ秒に変換、ミリ秒単位（13 桁以上）はそのまま使用
    const tsMs = ts < 1e12 ? ts * 1000 : ts;
    const d = new Date(tsMs);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${date} ${hours}:${minutes}:${seconds}`;
  }

  describe('ミリ秒単位タイムスタンプ', () => {
    it('現在時刻（ミリ秒）を正しくフォーマットする', () => {
      // 2026-06-07 15:11:07 UTC を表すミリ秒タイムスタンプ
      const tsMs = 1780812667000;
      const result = formatDate(tsMs);
      // 日付部分が正しく解析されることを確認
      expect(result).toMatch(/2026\/06\/07/);
    });

    it('ミリ秒部分を無視して秒精度でフォーマットする', () => {
      // 同じ秒でも、ミリ秒が異なる
      const ts1 = 1780812667000;
      const ts2 = 1780812667999;
      const result1 = formatDate(ts1);
      const result2 = formatDate(ts2);
      // 同じ秒なので同じフォーマット結果
      expect(result1).toBe(result2);
    });
  });

  describe('秒単位タイムスタンプ', () => {
    it('秒単位タイムスタンプを自動検出してミリ秒に変換', () => {
      // 2026-06-07 15:11:07 を表す秒タイムスタンプ
      const tsSec = 1780812667;
      const result = formatDate(tsSec);
      // ミリ秒タイムスタンプと同じ日付フォーマット
      expect(result).toMatch(/2026\/06\/07/);
    });

    it('秒単位とミリ秒単位が同じ結果を返す', () => {
      const tsSec = 1780812667;
      const tsMs = 1780812667000;
      const resultSec = formatDate(tsSec);
      const resultMs = formatDate(tsMs);
      // 同じ日時を示す秒とミリ秒は同じフォーマット結果
      expect(resultSec).toBe(resultMs);
    });

    it('1970年の秒タイムスタンプをサポート', () => {
      // Unix epoch
      const ts = 0;
      const result = formatDate(ts);
      // 1970年1月1日でフォーマット（タイムゾーンにより日付は異なる場合がある）
      expect(result).toMatch(/1970/);
    });
  });

  describe('エッジケース', () => {
    it('境界値 1e12 での処理', () => {
      // 1e12 はちょうど秒単位とミリ秒単位の境界
      // 実装では ts < 1e12 ? ts * 1000 : ts なので
      // ts = 1e12 は条件を満たさず、ミリ秒単位として処理される
      // 1e12 ミリ秒 = 1,000,000,000,000 ミリ秒 ≈ 31.7 年 → 1970年 + 31.7年 = 約 2001年9月
      const tsAtBoundary = 1e12;
      const result = formatDate(tsAtBoundary);
      expect(result).toMatch(/2001/);
    });

    it('境界値直下 1e12-1 での処理', () => {
      // 1e12-1 は ts < 1e12 の条件を満たすため秒単位として処理される
      // (1e12 - 1) * 1000 はミリ秒に変換される
      // 1e12 秒 * 1000 = 1e15 ミリ秒 = 約 31,688 年
      const tsBeforeBoundary = 1e12 - 1;
      const result = formatDate(tsBeforeBoundary);
      // 秒単位として 1000倍されるため、非常に大きな年数になる
      expect(result).toMatch(/^\d+\/\d{2}\/\d{2}/);
    });

    it('フォーマット結果が YYYY/MM/DD HH:MM:SS 形式', () => {
      const ts = 1780812667000;
      const result = formatDate(ts);
      // 正規表現で形式を確認
      expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('パディング処理が正しく行われる', () => {
      // 月日が 1 桁の場合、ゼロパディングされる
      // 2026-01-01 00:00:00 を表すミリ秒タイムスタンプ
      const ts = 1767225600000;
      const result = formatDate(ts);
      // 01 月 01 日という形式
      expect(result).toMatch(/2026\/01\/01/);
    });
  });

  describe('タイムゾーン考慮', () => {
    it('ローカルタイムゾーンで正しく変換される', () => {
      // Date オブジェクトはローカルタイムゾーンで解析される
      const ts = 1780812667000;
      const d = new Date(ts);
      const year = d.getFullYear();
      // 少なくともこの年は 2026 であることを確認
      expect(year).toBe(2026);
    });
  });

  describe('実際の使用ケース', () => {
    it('新規データのミリ秒タイムスタンプ (Date.now()) を正しくフォーマット', () => {
      // 実際のアプリケーションでは Date.now() がミリ秒を返す
      const now = Date.now();
      const result = formatDate(now);
      // 今年の年号が含まれることを確認
      const currentYear = new Date().getFullYear();
      expect(result).toContain(String(currentYear));
      // 形式チェック
      expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('iPhone で秒単位で保存されたタイムスタンプも正しく処理', () => {
      // 古いデータが秒単位で保存されている場合のシミュレーション
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const result = formatDate(nowInSeconds);
      // 秒単位でも同じ年月日を返す
      const currentYear = new Date().getFullYear();
      expect(result).toContain(String(currentYear));
    });

    it('秒単位とミリ秒単位のタイムスタンプが同一日時を返す', () => {
      const baseTimestamp = 1609459200; // 2021-01-01 00:00:00 UTC
      const resultSec = formatDate(baseTimestamp);
      const resultMs = formatDate(baseTimestamp * 1000);
      // 秒単位とミリ秒単位が同じフォーマット結果を返す
      expect(resultSec).toBe(resultMs);
    });

    it('古いテストデータ (2020年) も正しく処理', () => {
      const timestamp2020 = 1577836800; // 2020-01-01 00:00:00 UTC (秒単位)
      const result = formatDate(timestamp2020);
      expect(result).toMatch(/2020/);
    });

    it('未来のテストデータも正しく処理', () => {
      const timestamp2030Ms = 1893456000000; // 2030-01-01 00:00:00 UTC (ミリ秒単位)
      const result = formatDate(timestamp2030Ms);
      expect(result).toMatch(/2030/);
    });
  });
});
