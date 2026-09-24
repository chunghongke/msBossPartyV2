import { AppSlice, LootSlice } from '../types';
import { LootItem, LootStatus } from '@/types/loot';
import { calculateNetAndSplit } from '@/utils/currency';
import { ref, set, remove } from 'firebase/database';
import { getRtdb } from '@/services/firebase';

/**
 * 💡 單點路徑更新核心函數 (Granular Path Update)
 * 直接精準操作 `store/loots/${lootId}`，絕不夾帶 teams 或 weeklyRecords，
 * 實現戰利品與隊伍常規操作的「物理隔離」，杜絕任何覆寫沖刷！
 */
async function syncSingleLootToCloud(
  activeGroup: any,
  lootId: string,
  loot: LootItem | null
) {
  if (!activeGroup?.firebaseConfig) {
    console.warn(`⚠️ [Firebase] 未綁定小隊群組，戰利品 ${lootId} 僅儲存於本機記憶體中！`);
    return;
  }
  const db = getRtdb(activeGroup.firebaseConfig);
  const lootRef = ref(db, `store/loots/${lootId}`);
  const startTime = Date.now();
  try {
    if (loot) {
      const cleanLoot = JSON.parse(JSON.stringify(loot));
      await set(lootRef, cleanLoot);
      console.log(
        `🎁 [Firebase 單點更新] 成功同步戰利品「${loot.itemName}」至 store/loots/${lootId} (耗時: ${Date.now() - startTime}ms)`
      );
    } else {
      await remove(lootRef);
      console.log(
        `🗑️ [Firebase 單點更新] 成功自雲端刪除戰利品 store/loots/${lootId} (耗時: ${Date.now() - startTime}ms)`
      );
    }
  } catch (err: any) {
    console.error(`❌ [Firebase 單點更新失敗] 戰利品 ${lootId}:`, err);
    if (err?.message?.includes('PERMISSION_DENIED') || err?.code === 'PERMISSION_DENIED') {
      alert(
        '【戰利品同步失敗】：寫入遭到權限拒絕 (PERMISSION_DENIED)！\n\n' +
        '原因通常為 Firebase 控制台的「安全性規則」未包含 loots 節點，或是修改後「尚未點擊發布 (Publish)」！'
      );
    }
  }
}

export const createLootSlice: AppSlice<LootSlice> = (setSlice, get) => ({
  addLoot: async (lootData) => {
    const { store, activeGroup } = get();
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

    setSlice({
      store: {
        ...store,
        loots: nextLoots,
      },
    });

    await syncSingleLootToCloud(activeGroup, id, newLoot);
    return newLoot;
  },

  updateLoot: async (lootId, updates) => {
    const { store, activeGroup } = get();
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

    setSlice({
      store: {
        ...store,
        loots: nextLoots,
      },
    });

    await syncSingleLootToCloud(activeGroup, lootId, merged);
  },

  deleteLoot: async (lootId) => {
    const { store, activeGroup } = get();
    if (!store.loots?.[lootId]) return;

    const nextLoots = { ...store.loots };
    delete nextLoots[lootId];

    setSlice({
      store: {
        ...store,
        loots: nextLoots,
      },
    });

    await syncSingleLootToCloud(activeGroup, lootId, null);
  },

  toggleLootMemberPaid: async (lootId, charId, isPaidOverride, note) => {
    const { store, activeGroup } = get();
    const existing = store.loots?.[lootId];
    if (!existing || existing.status === 'done' || existing.status === 'selling') return;

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
    const nextStatus: LootStatus = allPaid ? 'done' : 'distributing';

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

    setSlice({
      store: {
        ...store,
        loots: nextLoots,
      },
    });

    await syncSingleLootToCloud(activeGroup, lootId, updated);
  },

  batchSetLootMembersPaid: async (lootId, isPaid) => {
    const { store, activeGroup } = get();
    const existing = store.loots?.[lootId];
    if (!existing || existing.status === 'done' || existing.status === 'selling') return;

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

    setSlice({
      store: {
        ...store,
        loots: nextLoots,
      },
    });

    await syncSingleLootToCloud(activeGroup, lootId, updated);
  },
});
