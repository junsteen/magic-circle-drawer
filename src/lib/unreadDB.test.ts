import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getUnreadTabs,
  setUnreadTab,
  clearUnreadTab,
  markTabsAsRead,
  setUnreadTabsFromNewUnlocks,
  type UnreadState,
} from './unreadDB';

describe('unreadDB', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getUnreadTabs', () => {
    it('should return default state when nothing is stored', async () => {
      const state = await getUnreadTabs();
      expect(state).toEqual({
        circles: false,
        achievements: false,
        titles: false,
        challenges: false,
      });
    });

    it('should return stored state', async () => {
      localStorage.setItem(
        'grimoire_unread_tabs',
        JSON.stringify({ circles: true, achievements: false, titles: true, challenges: false }),
      );
      const state = await getUnreadTabs();
      expect(state.circles).toBe(true);
      expect(state.titles).toBe(true);
    });
  });

  describe('setUnreadTab', () => {
    it('should set unread state for a single tab', async () => {
      await setUnreadTab('achievements', true);
      const state = await getUnreadTabs();
      expect(state.achievements).toBe(true);
    });

    it('should preserve other tabs state', async () => {
      await setUnreadTab('achievements', true);
      await setUnreadTab('circles', true);
      const state = await getUnreadTabs();
      expect(state.achievements).toBe(true);
      expect(state.circles).toBe(true);
      expect(state.titles).toBe(false);
    });
  });

  describe('clearUnreadTab', () => {
    it('should clear unread state for a tab', async () => {
      await setUnreadTab('achievements', true);
      await clearUnreadTab('achievements');
      const state = await getUnreadTabs();
      expect(state.achievements).toBe(false);
    });
  });

  describe('markTabsAsRead', () => {
    it('should clear all unread states', async () => {
      await setUnreadTab('achievements', true);
      await setUnreadTab('circles', true);
      await markTabsAsRead();
      const state = await getUnreadTabs();
      expect(state.achievements).toBe(false);
      expect(state.circles).toBe(false);
      expect(state.titles).toBe(false);
      expect(state.challenges).toBe(false);
    });
  });

  describe('setUnreadTabsFromNewUnlocks', () => {
    it('should mark achievements tab as unread when achievements are unlocked', async () => {
      await setUnreadTabsFromNewUnlocks(new Set(['ach1']), new Set(), new Set());
      const state = await getUnreadTabs();
      expect(state.achievements).toBe(true);
    });

    it('should mark titles tab as unread when titles are unlocked', async () => {
      await setUnreadTabsFromNewUnlocks(new Set(), new Set(['title1']), new Set());
      const state = await getUnreadTabs();
      expect(state.titles).toBe(true);
    });

    it('should not change unread state if no items are unlocked', async () => {
      const state1 = await getUnreadTabs();
      await setUnreadTabsFromNewUnlocks(new Set(), new Set(), new Set());
      const state2 = await getUnreadTabs();
      expect(state1).toEqual(state2);
    });
  });
});
