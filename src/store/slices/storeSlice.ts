import { Character } from '@/types/player';
import { ref, set } from 'firebase/database';
import { getRtdb } from '@/services/firebase';
import { StoreData, Team, WeeklyRecord, Guest } from '@/types/party';
import { getBoss, BOSSES } from '@/data/bosses';
import { AppSlice, StoreSlice, SaveTeamOptions } from '../types';
import { sanitizeStoreAndTeams } from '../sanitize';

export const DEFAULT_STORE: StoreData = {
  teams: {},
  weeklyRecords: {},
  guests: [],
};

export const createStoreSlice: AppSlice<StoreSlice> = (setSlice, get) => ({
  store: DEFAULT_STORE,
  isLoading: true,
  activeGroup: null,

  setActiveGroup: (group) => setSlice({ activeGroup: group }),

  setStore: (store) => setSlice({ store }),

  setIsLoading: (isLoading) => setSlice({ isLoading }),

  saveStoreToCloud: async (newStore: StoreData) => {
    const { activeGroup } = get();
    // 💡 關鍵修復：深層序列化過濾所有 undefined 欄位，確保 Firebase RTDB 寫入純淨合法 JSON
    const cleanStore = JSON.parse(JSON.stringify(newStore));
    setSlice({ store: cleanStore });
    if (!activeGroup?.firebaseConfig) return;
    const db = getRtdb(activeGroup.firebaseConfig);
    await set(ref(db, 'store'), cleanStore);
  },

    toggleAllCharacterBosses: async (character: Character) => {
    const { store, saveStoreToCloud } = get();

    // 收集該角色的所有 boss entries
    const entries: { bossId: string; entryIndex: 1 | 2 }[] = [];
    (character.bossIds || []).forEach((bId: string) => entries.push({ bossId: bId, entryIndex: 1 }));
    (character.resetBossIds || []).forEach((bId: string) => entries.push({ bossId: bId, entryIndex: 2 }));

    if (entries.length === 0) return;

    // 檢查目前是否全部皆已完成
    const allCompleted = entries.every(({ bossId, entryIndex }) => {
      const recKey = `rec_${character.id}_${bossId}_${entryIndex}`;
      return Boolean(store.weeklyRecords[recKey]?.isCompleted);
    });

    // 若全部已完成 -> 目標為「全部取消完成 (false)」；若未全滿 -> 目標為「全部完成 (true)」
    const targetCompleted = !allCompleted;
    const nextRecords = { ...store.weeklyRecords };

    if (!targetCompleted) {
      // 全部取消完成
      entries.forEach(({ bossId, entryIndex }) => {
        const recKey = `rec_${character.id}_${bossId}_${entryIndex}`;
        const targetRecord = store.weeklyRecords[recKey];
        const targetTeamId = targetRecord?.teamId;

        if (targetTeamId && store.teams[targetTeamId]) {
          const team = store.teams[targetTeamId];
          const rawMembers = team.memberTargets || (team.memberCharIds || []).map((id: any) => ({ charId: id, entryIndex }));
          rawMembers.forEach((m: any) => {
            const mKey = `rec_${m.charId}_${bossId}_${m.entryIndex || 1}`;
            const existing = nextRecords[mKey] || store.weeklyRecords[mKey] || {
              charId: m.charId,
              bossId,
              entryIndex: m.entryIndex || 1,
              teamId: targetTeamId,
            };
            nextRecords[mKey] = {
              ...existing,
              isCompleted: false,
            };
          });
        } else {
          nextRecords[recKey] = {
            ...(targetRecord || {
              charId: character.id,
              bossId,
              entryIndex,
            }),
            isCompleted: false,
          };
        }
      });
    } else {
      // 全部標記完成 (尊重 12 隻上限，最多勾選至 12 隻)
      let currentCompletedCount = Object.entries(nextRecords).filter(
        ([k, r]) => k.startsWith(`rec_${character.id}_`) && r && r.isCompleted
      ).length;

      for (const { bossId, entryIndex } of entries) {
        const recKey = `rec_${character.id}_${bossId}_${entryIndex}`;
        const targetRecord = nextRecords[recKey] || store.weeklyRecords[recKey];

        // 若已經是完成狀態，跳過
        if (targetRecord?.isCompleted) continue;

        // 若已達 12 隻上限，不再新增
        if (currentCompletedCount >= 12) break;

        const boss = getBoss(bossId);
        const targetTeamId = targetRecord?.teamId;

        if (targetTeamId && store.teams[targetTeamId]) {
          const team = store.teams[targetTeamId];
          const rawMembers = team.memberTargets || (team.memberCharIds || []).map((id: any) => ({ charId: id, entryIndex }));
          const validMembers = rawMembers.filter((m: any) => {
            if (!m.charId.startsWith('guest_')) return true;
            return (store.guests || []).some((g) => g.id === m.charId);
          });

          const isMulti = validMembers.length > 1;
          const actualTeamSize = validMembers.length;
          const maxPartySize = boss?.maxPartySize || 1;
          const dividesEvenly = Boolean(boss && boss.erionVestiges > 0 && isMulti && maxPartySize % actualTeamSize === 0);
          const fairShare = dividesEvenly ? maxPartySize / actualTeamSize : null;

          rawMembers.forEach((m: any) => {
            const mKey = `rec_${m.charId}_${bossId}_${m.entryIndex || 1}`;
            const existing = nextRecords[mKey] || store.weeklyRecords[mKey] || {
              charId: m.charId,
              bossId,
              entryIndex: m.entryIndex || 1,
              teamId: targetTeamId,
            };
            nextRecords[mKey] = {
              ...existing,
              isCompleted: true,
              ...(dividesEvenly && fairShare !== null ? { shardShares: fairShare } : {}),
            };
          });
        } else {
          nextRecords[recKey] = {
            ...(targetRecord || {
              charId: character.id,
              bossId,
              entryIndex,
            }),
            isCompleted: true,
          };
        }

        currentCompletedCount += 1;
      }
    }

    await saveStoreToCloud({
      ...store,
      weeklyRecords: nextRecords,
    });
  },

  toggleBossStatus: async (
    recordKey: string,
    onRequireShardModal?: (recordKey: string, boss: any, team: any, pendingComplete?: boolean) => void
  ) => {
    const { store, getCharName, saveStoreToCloud } = get();
    const targetRecord = store.weeklyRecords[recordKey];
    const targetTeamId = targetRecord?.teamId;
    const nextCompleted = !targetRecord?.isCompleted;

    const bossId = targetRecord?.bossId || (typeof recordKey === 'string' ? recordKey.split('_')[2] : '');
    const boss = getBoss(bossId);

    // 💡 12 隻 BOSS 上限檢查 (V1 經典防呆)
    if (nextCompleted) {
      const rawMembers =
        targetTeamId && store.teams[targetTeamId]
          ? store.teams[targetTeamId].memberTargets ||
            (store.teams[targetTeamId].memberCharIds || []).map((id: any) => ({ charId: id, entryIndex: 1 }))
          : [{ charId: targetRecord?.charId || (typeof recordKey === 'string' ? recordKey.split('_')[1] : ''), entryIndex: 1 }];

      for (const m of rawMembers) {
        if (!m.charId || m.charId.startsWith('guest_')) continue;
        let completedCount = 0;
        Object.entries(store.weeklyRecords).forEach(([k, r]) => {
          if (k.startsWith(`rec_${m.charId}_`) && r && r.isCompleted) {
            completedCount += 1;
          }
        });

        if (completedCount >= 12) {
          const charName = getCharName(m.charId);
          alert(`⚠️ 角色【${charName}】本週 BOSS 攻略數量已達 12 隻上限！無法再增加擊破紀錄。`);
          return;
        }
      }
    }

    // 💡 當即將標記為「已完成」(nextCompleted === true) 時：
    // 若為多人隊伍且該 BOSS 有掉落艾里溫碎片：
    if (nextCompleted && targetTeamId && store.teams[targetTeamId] && boss && boss.erionVestiges > 0) {
      const team = store.teams[targetTeamId];
      const rawMembers = team.memberTargets || (team.memberCharIds || []).map((id) => ({ charId: id, entryIndex: 1 }));
      const validMembers = rawMembers.filter((m: any) => {
        if (!m.charId.startsWith('guest_')) return true;
        return (store.guests || []).some((g) => g.id === m.charId);
      });

      const isMulti = validMembers.length > 1;
      if (isMulti) {
        const actualTeamSize = validMembers.length;
        const maxPartySize = boss.maxPartySize || 1;
        const dividesEvenly = maxPartySize % actualTeamSize === 0;

        // 1. 份數除不盡（如 4人打 6人王）：攔截並主動彈出 ShardShareModal 分配視窗！
        if (!dividesEvenly && onRequireShardModal) {
          onRequireShardModal(recordKey, boss, team, true);
          return;
        }
      }
    }

    const nextRecords = { ...store.weeklyRecords };

    if (targetTeamId && store.teams[targetTeamId]) {
      const team = store.teams[targetTeamId];
      const rawMembers = team.memberTargets || (team.memberCharIds || []).map((id) => ({ charId: id, entryIndex: 1 }));
      const validMembers = rawMembers.filter((m: any) => {
        if (!m.charId.startsWith('guest_')) return true;
        return (store.guests || []).some((g) => g.id === m.charId);
      });

      const isMulti = validMembers.length > 1;
      const actualTeamSize = validMembers.length;
      const maxPartySize = boss?.maxPartySize || 1;
      const dividesEvenly = Boolean(boss && boss.erionVestiges > 0 && isMulti && maxPartySize % actualTeamSize === 0);
      const fairShare = dividesEvenly ? maxPartySize / actualTeamSize : null;

      rawMembers.forEach((member: any) => {
        const mKey = `rec_${member.charId}_${bossId}_${member.entryIndex}`;
        const existing = nextRecords[mKey] || {
          charId: member.charId,
          bossId,
          entryIndex: member.entryIndex,
          teamId: targetTeamId,
        };

        nextRecords[mKey] = {
          ...existing,
          isCompleted: nextCompleted,
          // 若為整除且剛剛打勾完成，自動均分份數
          ...(nextCompleted && dividesEvenly && fairShare !== null ? { shardShares: fairShare } : {}),
        };
      });
    } else {
      const parts = typeof recordKey === 'string' ? recordKey.split('_') : [];
      nextRecords[recordKey] = {
        ...(targetRecord || {
          charId: parts[1],
          bossId: parts[2],
          entryIndex: Number(parts[3]) || 1,
        }),
        isCompleted: nextCompleted,
      };
    }

    await saveStoreToCloud({
      ...store,
      weeklyRecords: nextRecords,
    });
  },

  updateWeeklyRecord: async (recordKey: string, partialRecord: Partial<WeeklyRecord>) => {
    const { store, saveStoreToCloud } = get();
    const existing = store.weeklyRecords[recordKey] || {};
    const nextRecords = {
      ...store.weeklyRecords,
      [recordKey]: {
        ...existing,
        ...partialRecord,
      } as WeeklyRecord,
    };
    await saveStoreToCloud({
      ...store,
      weeklyRecords: nextRecords,
    });
  },

    saveTeamAndRecords: async (
    team: Team,
    updatedRecords: Record<string, WeeklyRecord>,
    bossId?: string,
    options?: SaveTeamOptions
  ) => {
    const { store, players, savePlayersToCloud, saveStoreToCloud } = get();

    // 1. 若有傳入新玩家角色資料 (難度切換)，優先持久化至雲端與本機狀態
    let effectivePlayers = players;
    if (options?.newPlayers) {
      await savePlayersToCloud(options.newPlayers);
      effectivePlayers = options.newPlayers;
    }

    const nextTeams = { ...store.teams };
    const nextWeeklyRecords = { ...store.weeklyRecords };

    // 2. 清理指定的已刪除記錄鍵
    if (options?.deletedRecordKeys) {
      options.deletedRecordKeys.forEach((key) => {
        delete nextWeeklyRecords[key];
      });
    }

    // 3. 💡 關鍵修復：若發生難度切換 (oldBossId)，安全退出該角色在【舊難度】的所有隊伍
    if (options?.oldBossId && options?.charId) {
      const oldBId = options.oldBossId;
      const cId = options.charId;
      const eIdx = options.entryIndex || 1;

      Object.entries(nextTeams).forEach(([tId, existingTeam]) => {
        if (tId === team.id) return;

        // 判斷是否為該角色的舊難度隊伍
        const hasMember = (existingTeam.memberTargets || []).some(
          (m) => m.charId === cId && m.entryIndex === eIdx
        );

        if (!hasMember) return;

        // 檢查是否屬於 oldBossId
        let existingBossId = '';
        for (const r of Object.values(nextWeeklyRecords)) {
          if (r && r.teamId === tId && r.bossId) {
            existingBossId = r.bossId;
            break;
          }
        }
        if (!existingBossId && tId.includes(`_${oldBId}_`)) {
          existingBossId = oldBId;
        }

        if (existingBossId === oldBId || tId.includes(`_${oldBId}_`)) {
          const remainingMembers = (existingTeam.memberTargets || []).filter(
            (m) => !(m.charId === cId && m.entryIndex === eIdx)
          );

          const hasRealChar = remainingMembers.some((m: any) => !m.charId.startsWith('guest_'));

          if (!hasRealChar || remainingMembers.length <= 1) {
            delete nextTeams[tId];
            if (remainingMembers.length === 1 && !remainingMembers[0].charId.startsWith('guest_')) {
              const solo = remainingMembers[0];
              const defaultSingleId = `single_${solo.charId}_${oldBId}_${solo.entryIndex}`;
              nextTeams[defaultSingleId] = {
                id: defaultSingleId,
                memberTargets: [solo],
                schedule: existingTeam.schedule || null,
              };
              const soloKey = `rec_${solo.charId}_${oldBId}_${solo.entryIndex}`;
              if (nextWeeklyRecords[soloKey]) {
                nextWeeklyRecords[soloKey] = {
                  ...nextWeeklyRecords[soloKey],
                  teamId: defaultSingleId,
                };
              }
            } else {
              remainingMembers.forEach((m: any) => {
                if (m.charId.startsWith('guest_')) {
                  const guestKey = `rec_${m.charId}_${oldBId}_${m.entryIndex || 1}`;
                  delete nextWeeklyRecords[guestKey];
                }
              });
            }
          } else {
            nextTeams[tId] = {
              ...existingTeam,
              memberTargets: remainingMembers,
            };
          }
        }
      });
    }

    // 4. 取得本次組隊涵蓋的所有成員 targets
    const currentTargets = team.memberTargets || [];

    // 5. 針對加入本隊伍的所有成員，檢查並退出他們原本參與的【同 BOSS】其他隊伍 (避免同一個 BOSS 雙重組隊)
    currentTargets.forEach((t) => {
      Object.entries(nextTeams).forEach(([tId, existingTeam]) => {
        if (tId === team.id) return;
        if (tId.startsWith('single_')) return;

        // 判斷 existingTeam 是否屬於同一個 BOSS
        let existingBossId = '';
        for (const r of Object.values(nextWeeklyRecords)) {
          if (r && r.teamId === tId && r.bossId) {
            existingBossId = r.bossId;
            break;
          }
        }
        if (!existingBossId) {
          const match = BOSSES.find((b) => tId.includes(`_${b.id}_`));
          if (match) existingBossId = match.id;
        }

        // 只有在【同一個 BOSS】內，同個角色才不能同時存在兩個隊伍
        if (bossId && existingBossId && existingBossId !== bossId) {
          return;
        }
        if (!existingBossId && bossId && !tId.includes(`_${bossId}_`)) {
          return;
        }

        const hasMember = (existingTeam.memberTargets || []).some(
          (m) => m.charId === t.charId && m.entryIndex === t.entryIndex
        );

        if (hasMember) {
          // 從同 BOSS 的原隊伍移除此成員
          const remainingMembers = (existingTeam.memberTargets || []).filter(
            (m) => !(m.charId === t.charId && m.entryIndex === t.entryIndex)
          );

          if (remainingMembers.length <= 1) {
            delete nextTeams[tId];

            if (remainingMembers.length === 1) {
              const solo = remainingMembers[0];
              const isSoloInNewTeam = currentTargets.some(
                (m) => m.charId === solo.charId && m.entryIndex === solo.entryIndex
              );

              if (!isSoloInNewTeam) {
                const bId = bossId || existingBossId || '';
                const recKey = bId ? `rec_${solo.charId}_${bId}_${solo.entryIndex}` : null;
                const defaultSingleId = bId
                  ? `single_${solo.charId}_${bId}_${solo.entryIndex}`
                  : `single_${solo.charId}_${solo.entryIndex}`;

                if (recKey && nextWeeklyRecords[recKey]) {
                  nextWeeklyRecords[recKey] = {
                    ...nextWeeklyRecords[recKey],
                    teamId: defaultSingleId,
                  };
                }

                nextTeams[defaultSingleId] = {
                  id: defaultSingleId,
                  memberTargets: [solo],
                  schedule: null,
                };
              }
            }
          } else {
            nextTeams[tId] = {
              ...existingTeam,
              memberTargets: remainingMembers,
            };
          }
        }
      });
    });

    // 6. 寫入新隊伍與清理空隊伍
    if (team.memberTargets.length > 0) {
      nextTeams[team.id] = team;
    } else {
      delete nextTeams[team.id];
    }

    // 7. 強制覆蓋寫入所有新隊伍成員的 updatedRecords，確保每個成員的 weeklyRecord 100% 正確指向新隊伍
    Object.entries(updatedRecords).forEach(([recKey, recVal]) => {
      nextWeeklyRecords[recKey] = {
        ...(nextWeeklyRecords[recKey] || {}),
        ...recVal,
        teamId: team.id,
      };
    });

    // 8. 呼叫 sanitizeStoreAndTeams 進行最終雙向校驗與防禦修復 (使用最新的 effectivePlayers)
    sanitizeStoreAndTeams(effectivePlayers, {
      teams: nextTeams,
      weeklyRecords: nextWeeklyRecords,
      guests: store.guests || [],
    });

    await saveStoreToCloud({
      ...store,
      teams: nextTeams,
      weeklyRecords: nextWeeklyRecords,
    });
  },

  addGuest: async (name: string): Promise<Guest> => {
    const { store, saveStoreToCloud } = get();
    const newGuest: Guest = {
      id: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
    };
    const nextGuests = [...(store.guests || []), newGuest];
    await saveStoreToCloud({
      ...store,
      guests: nextGuests,
    });
    return newGuest;
  },

  deleteGuest: async (guestId: string) => {
    const { store, saveStoreToCloud } = get();
    const nextGuests = (store.guests || []).filter((g) => g.id !== guestId);
    const nextTeams = { ...store.teams };
    Object.keys(nextTeams).forEach((tId) => {
      nextTeams[tId] = {
        ...nextTeams[tId],
        memberTargets: (nextTeams[tId].memberTargets || []).filter((m) => m.charId !== guestId),
        memberCharIds: (nextTeams[tId].memberCharIds || []).filter((id) => id !== guestId),
      };
    });

    await saveStoreToCloud({
      ...store,
      guests: nextGuests,
      teams: nextTeams,
    });
  },
});
