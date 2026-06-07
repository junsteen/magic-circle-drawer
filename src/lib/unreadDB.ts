export type TabId = 'circles' | 'achievements' | 'titles' | 'challenges';

const UNREAD_STORAGE_KEY = 'grimoire_unread_tabs';

export interface UnreadState {
  circles: boolean;
  achievements: boolean;
  titles: boolean;
  challenges: boolean;
}

function getDefaultUnreadState(): UnreadState {
  return {
    circles: false,
    achievements: false,
    titles: false,
    challenges: false,
  };
}

export async function getUnreadTabs(): Promise<UnreadState> {
  try {
    const stored = localStorage.getItem(UNREAD_STORAGE_KEY);
    if (stored) {
      return { ...getDefaultUnreadState(), ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load unread state:', e);
  }
  return getDefaultUnreadState();
}

export async function setUnreadTab(tab: TabId, unread: boolean): Promise<void> {
  try {
    const current = await getUnreadTabs();
    current[tab] = unread;
    localStorage.setItem(UNREAD_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save unread state:', e);
  }
}

export async function clearUnreadTab(tab: TabId): Promise<void> {
  await setUnreadTab(tab, false);
}

export async function markTabsAsRead(): Promise<void> {
  try {
    const defaultState = getDefaultUnreadState();
    localStorage.setItem(UNREAD_STORAGE_KEY, JSON.stringify(defaultState));
  } catch (e) {
    console.error('Failed to clear unread state:', e);
  }
}

export async function setUnreadTabsFromNewUnlocks(
  newUnlockedAchievements: Set<string>,
  newUnlockedTitles: Set<string>,
  newUnlockedChallenges: Set<string>,
): Promise<void> {
  try {
    const current = await getUnreadTabs();
    if (newUnlockedAchievements.size > 0) {
      current.achievements = true;
    }
    if (newUnlockedTitles.size > 0) {
      current.titles = true;
    }
    if (newUnlockedChallenges.size > 0) {
      current.challenges = true;
    }
    localStorage.setItem(UNREAD_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to set unread tabs:', e);
  }
}
