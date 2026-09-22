import { AppSlice, LootSlice } from '../types';
import { LootItem } from '@/types/loot';
import { calculateNetAndSplit } from '@/utils/currency';

export const createLootSlice: AppSlice<LootSlice> = (_setSlice, get) => ({
  addLoot: async (lootData) => {
    const { store, saveStoreToCloud } = get();
    const id = `loot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const defaultTaxRate = lootData.saleCurrency === 'twd' ? 0 : 3;
    const { netSalePrice, splitAmountPerMember } = calculateNetAndSplit(
      lootData.totalSalePrice,
      lootData.taxRatePercent ?? defaultTaxRate,
      (lootData.members || []).length
    );

    const allPaid =
      lootData.members &&
      lootData.members.length > 0 &&
      lootData.members.every((m) => m.isPaid);

    const status = allPaid
      ? 'done'
      : lootData.status || (lootData.totalSalePrice > 0 ? 'distributing' : 'selling');

    const newLoot: LootItem = {
      ...lootData,
      saleCurrency: lootData.saleCurrency || 'meso',
      id,
      netSalePrice,
      splitAmountPerMember,
      status,
      createdAt: now,
      updatedAt: now,
    };

    const nextLoots = {
      ...(store.loots || {}),
      [id]: newLoot,
    };

    const nextStore = {
      ...store,
      loots: nextLoots,
    };

    await saveStoreToCloud(nextStore);
    return newLoot;
  },

  updateLoot: async (lootId, updates) => {
    const { store, saveStoreToCloud } = get();
    const existing = store.loots?.[lootId];
    if (!existing) return;

    const merged: LootItem = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // 重新試算扣稅淨額與每人均分
    const defaultTaxRate = merged.saleCurrency === 'twd' ? 0 : 3;
    const { netSalePrice, splitAmountPerMember } = calculateNetAndSplit(
      merged.totalSalePrice,
      merged.taxRatePercent ?? defaultTaxRate,
      (merged.members || []).length
    );
    merged.netSalePrice = netSalePrice;
    merged.splitAmountPerMember = splitAmountPerMember;

    // 自動判斷結清狀態
    const allPaid =
      merged.members &&
      merged.members.length > 0 &&
      merged.members.every((m) => m.isPaid);

    if (allPaid) {
      merged.status = 'done';
    } else if (merged.status === 'done') {
      merged.status = merged.totalSalePrice > 0 ? 'distributing' : 'selling';
    } else if (!updates.status) {
      merged.status = merged.totalSalePrice > 0 ? 'distributing' : 'selling';
    }

    const nextLoots = {
      ...(store.loots || {}),
      [lootId]: merged,
    };

    await saveStoreToCloud({
      ...store,
      loots: nextLoots,
    });
  },

  deleteLoot: async (lootId) => {
    const { store, saveStoreToCloud } = get();
    if (!store.loots?.[lootId]) return;

    const nextLoots = { ...store.loots };
    delete nextLoots[lootId];

    await saveStoreToCloud({
      ...store,
      loots: nextLoots,
    });
  },

  toggleLootMemberPaid: async (lootId, charId, isPaidOverride, note) => {
    const { store, saveStoreToCloud } = get();
    const existing = store.loots?.[lootId];
    if (!existing) return;

    const now = new Date().toISOString();
    const nextMembers = (existing.members || []).map((m) => {
      if (m.charId === charId) {
        const nextPaid = isPaidOverride !== undefined ? isPaidOverride : !m.isPaid;
        return {
          ...m,
          isPaid: nextPaid,
          paidAt: nextPaid ? now : undefined,
          note: note !== undefined ? note : m.note,
        };
      }
      return m;
    });

    const allPaid = nextMembers.length > 0 && nextMembers.every((m) => m.isPaid);
    let nextStatus = existing.status;
    if (allPaid) {
      nextStatus = 'done';
    } else if (existing.status === 'done') {
      nextStatus = existing.totalSalePrice > 0 ? 'distributing' : 'selling';
    }

    const updated: LootItem = {
      ...existing,
      members: nextMembers,
      status: nextStatus,
      updatedAt: now,
    };

    const nextLoots = {
      ...(store.loots || {}),
      [lootId]: updated,
    };

    await saveStoreToCloud({
      ...store,
      loots: nextLoots,
    });
  },

  batchSetLootMembersPaid: async (lootId, isPaid) => {
    const { store, saveStoreToCloud } = get();
    const existing = store.loots?.[lootId];
    if (!existing) return;

    const now = new Date().toISOString();
    const nextMembers = (existing.members || []).map((m) => ({
      ...m,
      isPaid,
      paidAt: isPaid ? now : undefined,
    }));

    const nextStatus = isPaid
      ? 'done'
      : existing.totalSalePrice > 0
      ? 'distributing'
      : 'selling';

    const updated: LootItem = {
      ...existing,
      members: nextMembers,
      status: nextStatus,
      updatedAt: now,
    };

    const nextLoots = {
      ...(store.loots || {}),
      [lootId]: updated,
    };

    await saveStoreToCloud({
      ...store,
      loots: nextLoots,
    });
  },
});
