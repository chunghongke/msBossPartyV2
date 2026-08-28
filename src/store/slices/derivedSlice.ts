import { Character } from '@/types/player';
import { AppSlice, DerivedSlice } from '../types';

export const createDerivedSlice: AppSlice<DerivedSlice> = (_, get) => ({
  getAllCharacters: () => {
    const { players } = get();
    const list: (Character & { playerName: string })[] = [];
    players.forEach((p) => {
      (p.characters || []).forEach((c) => {
        list.push({ ...c, playerName: p.name });
      });
    });
    return list;
  },

  getCharName: (charId: string): string => {
    const { getAllCharacters, store } = get();
    const allChars = getAllCharacters();
    const c = allChars.find((x) => x.id === charId);
    if (c) return c.name;

    const g = (store.guests || []).find((x) => x.id === charId);
    if (g) return `${g.name}(臨時)`;

    return '未知角色';
  },
});
