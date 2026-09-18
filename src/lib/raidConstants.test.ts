import { describe, it, expect } from 'vitest';
import { RAID_CODE_CHARS, RAID_CODE_LENGTH, isValidRaidCode } from './raidConstants';

describe('isValidRaidCode', () => {
  // ─── 受け入れる形式 ─────────────────────────────────────────────────────────
  describe('受け入れる形式', () => {
    it('文字集合内の6文字なら true', () => {
      expect(isValidRaidCode('ABC234')).toBe(true);
      expect(isValidRaidCode('ZZY88B')).toBe(true);
    });

    it('文字集合に含まれる文字はすべて使える', () => {
      for (const ch of RAID_CODE_CHARS) {
        expect(isValidRaidCode(ch.repeat(RAID_CODE_LENGTH))).toBe(true);
      }
    });
  });

  // ─── 弾く形式 ───────────────────────────────────────────────────────────────
  describe('弾く形式', () => {
    it('長さが違えば false', () => {
      expect(isValidRaidCode('')).toBe(false);
      expect(isValidRaidCode('ABC23')).toBe(false);
      expect(isValidRaidCode('ABC2345')).toBe(false);
    });

    it('小文字は false', () => {
      expect(isValidRaidCode('abc234')).toBe(false);
      expect(isValidRaidCode('ABc234')).toBe(false);
    });

    it('紛らわしいため除外した文字（I L O 0 1）は false', () => {
      for (const ch of ['I', 'L', 'O', '0', '1']) {
        expect(isValidRaidCode(`ABC2${ch}4`)).toBe(false);
      }
    });

    it('記号や空白が混ざれば false', () => {
      expect(isValidRaidCode('ABC 34')).toBe(false);
      expect(isValidRaidCode('ABC-34')).toBe(false);
      expect(isValidRaidCode('日本語です')).toBe(false);
    });
  });
});
