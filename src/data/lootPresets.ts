import { LootCategory } from '@/types/loot';

export interface LootPreset {
  name: string;
  category: LootCategory;
  defaultBossGroupKey?: string; // 建議來源 BOSS GROUP (如 'lotus', 'damien', 'will')
  description?: string;
  defaultIcon?: string;
}

export const PRIMARY_LOOT_CATEGORIES: LootCategory[] = [
  'ring_related',
  'pitched',
  'brilliant',
  'pitched_upgrade',
  'custom',
];

export const LOOT_CATEGORIES: Record<string, { label: string; badgeClass: string; icon: string }> = {
  ring_related: {
    label: '塔戒相關',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40',
    icon: '💍',
  },
  pitched: {
    label: '漆黑飾品',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40',
    icon: '💎',
  },
  brilliant: {
    label: '光輝套組',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
    icon: '✨',
  },
  pitched_upgrade: {
    label: '漆黑強化',
    badgeClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/40',
    icon: '🔨',
  },
  // 相容舊版鍵值
  ring_upgrade: {
    label: '塔戒相關',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40',
    icon: '💍',
  },
  ring_box: {
    label: '塔戒相關',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40',
    icon: '💍',
  },
  custom: {
    label: '自訂物品',
    badgeClass: 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/40',
    icon: '📦',
  },
};

export const LOOT_PRESETS: LootPreset[] = [
  // ── 塔戒相關 (Ring Related) ──
  { name: '規範四', category: 'ring_related', description: '規範戒指 4級 (起源之塔戒指)' },
  { name: '永續四', category: 'ring_related', description: '永續之戒 4級 (起源之塔戒指)' },
  { name: '生命研磨石', category: 'ring_related', description: '用於強化永續之戒等起源之塔戒指' },
  { name: '信念的研磨石', category: 'ring_related', description: '用於強化規範戒指/武器跳躍等起源之塔戒指' },

  // ── 漆黑的BOSS飾品 (Pitched Boss Set) ──
  { name: '全面控制核心', category: 'pitched', defaultBossGroupKey: 'lotus', description: '史烏掉落200等漆黑心臟' },
  { name: '口紅控制器標誌', category: 'pitched', defaultBossGroupKey: 'lotus', description: '史烏掉落臉飾' },
  { name: '附有魔力的眼罩', category: 'pitched', defaultBossGroupKey: 'damien', description: '戴米安掉落眼飾' },
  { name: '受詛咒的魔導書', category: 'pitched', defaultBossGroupKey: 'will', description: '威爾掉落口袋道具' },
  { name: '夢幻的腰帶', category: 'pitched', defaultBossGroupKey: 'lucid', description: '露希妲掉落腰帶' },
  { name: '巨大的恐怖', category: 'pitched', defaultBossGroupKey: 'gloom', description: '戴斯克掉落戒指' },
  { name: '指揮官力量耳環', category: 'pitched', defaultBossGroupKey: 'dunkel', description: '頓凱爾掉落耳環' },
  { name: '苦痛的根源', category: 'pitched', defaultBossGroupKey: 'verus_hilla', description: '真希拉掉落墜飾' },
  { name: '米特拉的憤怒', category: 'pitched', defaultBossGroupKey: 'seren', description: '賽蓮掉落徽章' },

  // ── 光輝套組 (Brilliant Boss Set) ──
  { name: '根源的耳語', category: 'brilliant', defaultBossGroupKey: 'limbo', description: '林波掉落250等頂級耳環' },
  { name: '恍惚的惡夢', category: 'brilliant', defaultBossGroupKey: 'radiant_star', description: '燦爛的凶星掉落頂級戒指' },
  { name: '死亡之誓', category: 'brilliant', defaultBossGroupKey: 'baldrix', description: '巴德利斯掉落頂級飾品' },
  { name: '傲慢的原罪', category: 'brilliant', defaultBossGroupKey: 'youpiter', description: '尤比太掉落頂級臉飾' },
  { name: '不朽的遺產', category: 'brilliant', defaultBossGroupKey: 'first_adversary', description: '最初的敵對者掉落頂級徽章' },

  // ── 漆黑強化 (卓越鐵鎚) ──
  { name: '卓越鐵鎚 (口紅)', category: 'pitched_upgrade', defaultBossGroupKey: 'lotus', description: '史烏掉落臉飾卓越鐵鎚' },
  { name: '卓越鐵鎚 (眼罩)', category: 'pitched_upgrade', defaultBossGroupKey: 'damien', description: '戴米安掉落眼飾卓越鐵鎚' },
  { name: '卓越鐵鎚 (腰帶)', category: 'pitched_upgrade', defaultBossGroupKey: 'lucid', description: '露希妲掉落腰帶卓越鐵鎚' },
  { name: '卓越鐵鎚 (耳環)', category: 'pitched_upgrade', defaultBossGroupKey: 'dunkel', description: '頓凱爾掉落耳環卓越鐵鎚' },
  { name: '卓越鐵鎚 (勳章)', category: 'pitched_upgrade', defaultBossGroupKey: 'seren', description: '賽蓮掉落勳章卓越鐵鎚' },
];

/** 根據關鍵字搜尋預設戰利品 */
export function searchLootPresets(query: string): LootPreset[] {
  const q = query.trim().toLowerCase();
  if (!q) return LOOT_PRESETS;
  return LOOT_PRESETS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
  );
}

/** 依名稱自動推導分類 */
export function inferCategoryByName(name: string): LootCategory {
  const match = LOOT_PRESETS.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (match) return match.category;
  if (name.includes('研磨石') || name.includes('規範') || name.includes('永續') || name.includes('塔戒') || name.includes('戒指箱')) return 'ring_related';
  if (name.includes('鐵鎚') || name.includes('卓越')) return 'pitched_upgrade';
  if (name.includes('漆黑') || name.includes('全面控制') || name.includes('口紅') || name.includes('眼罩') || name.includes('魔導書') || name.includes('恐怖') || name.includes('苦痛') || name.includes('米特拉')) return 'pitched';
  if (name.includes('光輝') || name.includes('耳語') || name.includes('細語') || name.includes('惡夢') || name.includes('死亡之誓') || name.includes('傲慢的原罪') || name.includes('不朽的遺產')) return 'brilliant';
  return 'custom';
}
