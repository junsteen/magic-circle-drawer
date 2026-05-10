export interface Title {
  id: string;
  name: string;
  emblem: string;
  condition: string;
  achievementId: string;
}

export const TITLES: Title[] = [
  {
    id: 'novice',
    name: '見習い魔導士',
    emblem: '◯',
    condition: '最初の魔法陣を完成させる',
    achievementId: 'first_step',
  },
  {
    id: 'flash_mage',
    name: '閃光の魔導士',
    emblem: '✦',
    condition: '初めてSランクを取得',
    achievementId: 'first_s',
  },
  {
    id: 'triple_master',
    name: '三冠魔導士',
    emblem: '△',
    condition: '3種のパターンでSランク達成',
    achievementId: 'three_master',
  },
  {
    id: 'conqueror',
    name: '全パターン制覇者',
    emblem: '✧',
    condition: '全パターンでSランク達成',
    achievementId: 'all_master',
  },
  {
    id: 'seeker',
    name: '魔導の探求者',
    emblem: '◐',
    condition: '累計100回プレイ',
    achievementId: 'persistent',
  },
  {
    id: 'hard_conqueror',
    name: '困難の克服者',
    emblem: '◇',
    condition: 'HARD難易度をクリア',
    achievementId: 'hard_breaker',
  },
  {
    id: 'expert_sage',
    name: '極致の賢者',
    emblem: '◆',
    condition: 'EXPERT難易度をクリア',
    achievementId: 'expert_master',
  },
  {
    id: 'perfect_chanter',
    name: '完璧詠唱者',
    emblem: '★',
    condition: '100点を取得',
    achievementId: 'perfect_score',
  },
  {
    id: 'archivist',
    name: '記録の蒐集者',
    emblem: '▤',
    condition: '履歴を20件保存',
    achievementId: 'collector',
  },
  {
    id: 'streak_master',
    name: '連続達成の覇者',
    emblem: '▶',
    condition: '5連続でAランク以上',
    achievementId: 'streak_5',
  },
];

const EQUIPPED_KEY = 'arcane_tracer_equipped_title';

export function getEquippedTitleId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(EQUIPPED_KEY);
  } catch {
    return null;
  }
}

export function saveEquippedTitleId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id === null) {
      localStorage.removeItem(EQUIPPED_KEY);
    } else {
      localStorage.setItem(EQUIPPED_KEY, id);
    }
  } catch {}
}
