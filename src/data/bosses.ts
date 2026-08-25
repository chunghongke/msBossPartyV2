import { Boss, BossGroup } from '@/types/boss';

export function getBossGroupKey(bossId: string): string {
  return bossId.replace(/_(easy|normal|hard|extreme)$/, '');
}

export function getBossCleanName(name: string): string {
  if (name && name.startsWith('(') && name.length >= 3 && name.indexOf(')') === 2) {
    return name.slice(3);
  }
  return name;
}

export const BOSSES: Boss[] = [
  // 史烏
  { id: 'lotus_normal', name: '(普)史烏', groupKey: 'lotus', maxPartySize: 2, difficulty: 'normal', allowReset: true, crystalValue: 27207040, erionVestiges: 0, image: './images/bosses/lotus.png' },
  { id: 'lotus_hard', name: '(困)史烏', groupKey: 'lotus', maxPartySize: 2, difficulty: 'hard', allowReset: true, crystalValue: 91900000, erionVestiges: 0, image: './images/bosses/lotus.png' },
  { id: 'lotus_extreme', name: '(極)史烏', groupKey: 'lotus', maxPartySize: 2, difficulty: 'extreme', allowReset: true, crystalValue: 323500000, erionVestiges: 0, image: './images/bosses/lotus.png' },

  // 戴米安
  { id: 'damien_normal', name: '(普)戴米安', groupKey: 'damien', maxPartySize: 6, difficulty: 'normal', allowReset: true, crystalValue: 28843452, erionVestiges: 0, image: './images/bosses/damien.png' },
  { id: 'damien_hard', name: '(困)戴米安', groupKey: 'damien', maxPartySize: 6, difficulty: 'hard', allowReset: true, crystalValue: 85700000, erionVestiges: 0, image: './images/bosses/damien.png' },

  // 露希妲
  { id: 'lucid_easy', name: '(簡)露希妲', groupKey: 'lucid', maxPartySize: 6, difficulty: 'easy', allowReset: true, crystalValue: 53800000, erionVestiges: 0, image: './images/bosses/lucid.png' },
  { id: 'lucid_normal', name: '(普)露希妲', groupKey: 'lucid', maxPartySize: 6, difficulty: 'normal', allowReset: true, crystalValue: 64300000, erionVestiges: 0, image: './images/bosses/lucid.png' },
  { id: 'lucid_hard', name: '(困)露希妲', groupKey: 'lucid', maxPartySize: 6, difficulty: 'hard', allowReset: true, crystalValue: 124000000, erionVestiges: 0, image: './images/bosses/lucid.png' },

  // 威爾
  { id: 'will_easy', name: '(簡)威爾', groupKey: 'will', maxPartySize: 6, difficulty: 'easy', allowReset: true, crystalValue: 57400000, erionVestiges: 0, image: './images/bosses/will.png' },
  { id: 'will_normal', name: '(普)威爾', groupKey: 'will', maxPartySize: 6, difficulty: 'normal', allowReset: true, crystalValue: 74200000, erionVestiges: 0, image: './images/bosses/will.png' },
  { id: 'will_hard', name: '(困)威爾', groupKey: 'will', maxPartySize: 6, difficulty: 'hard', allowReset: true, crystalValue: 127400000, erionVestiges: 0, image: './images/bosses/will.png' },

  // 綠水靈
  { id: 'guardian_angel_slime_normal', name: '(普)綠水靈', groupKey: 'guardian_angel_slime', maxPartySize: 6, difficulty: 'normal', allowReset: true, crystalValue: 43000000, erionVestiges: 0, image: './images/bosses/guardian_angel_slime.png' },
  { id: 'guardian_angel_slime_hard', name: '(困)綠水靈', groupKey: 'guardian_angel_slime', maxPartySize: 6, difficulty: 'hard', allowReset: true, crystalValue: 126500000, erionVestiges: 0, image: './images/bosses/guardian_angel_slime.png' },

  // 真希拉
  { id: 'verus_hilla_normal', name: '(普)真希拉', groupKey: 'verus_hilla', maxPartySize: 6, difficulty: 'normal', allowReset: true, crystalValue: 124400000, erionVestiges: 0, image: './images/bosses/verus_hilla.png' },
  { id: 'verus_hilla_hard', name: '(困)真希拉', groupKey: 'verus_hilla', maxPartySize: 6, difficulty: 'hard', allowReset: true, crystalValue: 145200000, erionVestiges: 0, image: './images/bosses/verus_hilla.png' },

  // 頓凱爾
  { id: 'dunkel_normal', name: '(普)頓凱爾', groupKey: 'dunkel', maxPartySize: 6, difficulty: 'normal', allowReset: true, crystalValue: 84700000, erionVestiges: 0, image: './images/bosses/dunkel.png' },
  { id: 'dunkel_hard', name: '(困)頓凱爾', groupKey: 'dunkel', maxPartySize: 6, difficulty: 'hard', allowReset: true, crystalValue: 126200000, erionVestiges: 0, image: './images/bosses/dunkel.png' },

  // 戴斯克
  { id: 'gloom_normal', name: '(普)戴斯克', groupKey: 'gloom', maxPartySize: 6, difficulty: 'normal', allowReset: true, crystalValue: 79500000, erionVestiges: 0, image: './images/bosses/gloom.png' },
  { id: 'gloom_hard', name: '(困)戴斯克', groupKey: 'gloom', maxPartySize: 6, difficulty: 'hard', allowReset: true, crystalValue: 111200000, erionVestiges: 0, image: './images/bosses/gloom.png' },

  // 賽蓮
  { id: 'seren_normal', name: '(普)賽蓮', groupKey: 'seren', maxPartySize: 6, difficulty: 'normal', allowReset: true, crystalValue: 149800000, erionVestiges: 0, image: './images/bosses/seren.png' },
  { id: 'seren_hard', name: '(困)賽蓮', groupKey: 'seren', maxPartySize: 6, difficulty: 'hard', allowReset: true, crystalValue: 271600000, erionVestiges: 0, image: './images/bosses/seren.png' },
  { id: 'seren_extreme', name: '(極)賽蓮', groupKey: 'seren', maxPartySize: 6, difficulty: 'extreme', allowReset: true, crystalValue: 724200000, erionVestiges: 30, image: './images/bosses/seren.png' },

  // 卡洛斯
  { id: 'kalos_easy', name: '(簡)卡洛斯', groupKey: 'kalos', maxPartySize: 6, difficulty: 'easy', allowReset: true, crystalValue: 236900000, erionVestiges: 0, image: './images/bosses/kalos.png' },
  { id: 'kalos_normal', name: '(普)卡洛斯', groupKey: 'kalos', maxPartySize: 6, difficulty: 'normal', allowReset: true, crystalValue: 30900000, erionVestiges: 0, image: './images/bosses/kalos.png' },
  { id: 'kalos_hard', name: '(困)卡洛斯', groupKey: 'kalos', maxPartySize: 6, difficulty: 'hard', allowReset: true, crystalValue: 618800000, erionVestiges: 0, image: './images/bosses/kalos.png' },
  { id: 'kalos_extreme', name: '(極)卡洛斯', groupKey: 'kalos', maxPartySize: 6, difficulty: 'extreme', allowReset: true, crystalValue: 1443300000, erionVestiges: 180, image: './images/bosses/kalos.png' },

  // 咖凌
  { id: 'kaling_easy', name: '(簡)咖凌', groupKey: 'kaling', maxPartySize: 6, difficulty: 'easy', allowReset: true, crystalValue: 258300000, erionVestiges: 0, image: './images/bosses/kaling.png' },
  { id: 'kaling_normal', name: '(普)咖凌', groupKey: 'kaling', maxPartySize: 6, difficulty: 'normal', allowReset: true, crystalValue: 361700000, erionVestiges: 0, image: './images/bosses/kaling.png' },
  { id: 'kaling_hard', name: '(困)咖凌', groupKey: 'kaling', maxPartySize: 6, difficulty: 'hard', allowReset: true, crystalValue: 721100000, erionVestiges: 60, image: './images/bosses/kaling.png' },
  { id: 'kaling_extreme', name: '(極)咖凌', groupKey: 'kaling', maxPartySize: 6, difficulty: 'extreme', allowReset: true, crystalValue: 1237100000, erionVestiges: 480, image: './images/bosses/kaling.png' },

  // 最初的敵對者
  { id: 'first_adversary_easy', name: '(簡)最初的敵對者', groupKey: 'first_adversary', maxPartySize: 3, difficulty: 'easy', allowReset: true, crystalValue: 252700000, erionVestiges: 0, image: './images/bosses/first_adversary.png' },
  { id: 'first_adversary_normal', name: '(普)最初的敵對者', groupKey: 'first_adversary', maxPartySize: 3, difficulty: 'normal', allowReset: true, crystalValue: 371000000, erionVestiges: 0, image: './images/bosses/first_adversary.png' },
  { id: 'first_adversary_hard', name: '(困)最初的敵對者', groupKey: 'first_adversary', maxPartySize: 3, difficulty: 'hard', allowReset: true, crystalValue: 682000000, erionVestiges: 30, image: './images/bosses/first_adversary.png' },
  { id: 'first_adversary_extreme', name: '(極)最初的敵對者', groupKey: 'first_adversary', maxPartySize: 3, difficulty: 'extreme', allowReset: true, crystalValue: 1344000000, erionVestiges: 240, image: './images/bosses/first_adversary.png' },

  // 燦爛的凶星
  { id: 'radiant_star_normal', name: '(普)燦爛的凶星', groupKey: 'radiant_star', maxPartySize: 3, difficulty: 'normal', allowReset: false, crystalValue: 355320000, erionVestiges: 0, image: './images/bosses/radiant_star.png' },
  { id: 'radiant_star_hard', name: '(困)燦爛的凶星', groupKey: 'radiant_star', maxPartySize: 3, difficulty: 'hard', allowReset: false, crystalValue: 817510000, erionVestiges: 90, image: './images/bosses/radiant_star.png' },

  // 林波
  { id: 'limbo_normal', name: '(普)林波', groupKey: 'limbo', maxPartySize: 3, difficulty: 'normal', allowReset: true, crystalValue: 420000000, erionVestiges: 0, image: './images/bosses/limbo.png' },
  { id: 'limbo_hard', name: '(困)林波', groupKey: 'limbo', maxPartySize: 3, difficulty: 'hard', allowReset: true, crystalValue: 749000000, erionVestiges: 60, image: './images/bosses/limbo.png' },

  // 巴德利斯
  { id: 'baldrix_normal', name: '(普)巴德利斯', groupKey: 'baldrix', maxPartySize: 3, difficulty: 'normal', allowReset: true, crystalValue: 560000000, erionVestiges: 0, image: './images/bosses/baldrix.png' },
  { id: 'baldrix_hard', name: '(困)巴德利斯', groupKey: 'baldrix', maxPartySize: 3, difficulty: 'hard', allowReset: true, crystalValue: 840000000, erionVestiges: 120, image: './images/bosses/baldrix.png' },

  // 尤比太
  { id: 'youpiter_normal', name: '(普)尤比太', groupKey: 'youpiter', maxPartySize: 3, difficulty: 'normal', allowReset: false, crystalValue: 705000000, erionVestiges: 45, image: './images/bosses/youpiter.png' },
  { id: 'youpiter_hard', name: '(困)尤比太', groupKey: 'youpiter', maxPartySize: 3, difficulty: 'hard', allowReset: false, crystalValue: 1368000000, erionVestiges: 600, image: './images/bosses/youpiter.png' },

  // 瑪麗西亞
  { id: 'maricia_normal', name: '(普)瑪麗西亞', groupKey: 'maricia', maxPartySize: 3, difficulty: 'normal', allowReset: true, crystalValue: 150000000, erionVestiges: 0, image: './images/bosses/maricia.png' },
];

export const BOSS_MAP = new Map<string, Boss>(BOSSES.map((b) => [b.id, b]));

export function getBoss(id: string): Boss | undefined {
  return BOSS_MAP.get(id);
}

export const BOSS_GROUPS: BossGroup[] = Array.from(
  BOSSES.reduce((acc, boss) => {
    const key = boss.groupKey;
    if (!acc.has(key)) {
      acc.set(key, {
        groupKey: key,
        displayName: getBossCleanName(boss.name),
        bosses: [],
      });
    }
    acc.get(key)!.bosses.push(boss);
    return acc;
  }, new Map<string, BossGroup>()).values()
);
