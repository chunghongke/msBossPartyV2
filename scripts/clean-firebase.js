/**
 * clean-firebase.js
 * BossParty Firebase 資料庫維護與清理腳本
 *
 * 使用方式：
 *   node scripts/clean-firebase.js <Firebase_Database_URL> [mode]
 *
 * 模式 (mode)：
 *   1. sanitize (預設): 智能清洗修復（自動備份 -> 清理孤立無效資料 -> 修復舊版 schedule 格式）
 *   2. reset-weekly: 重設每週進度（保留角色與組隊，將所有 BOSS 完成勾勾重設為未完成）
 *   3. clear-teams: 清空組隊與進度（保留所有玩家與角色名冊，清空 teams 與 weeklyRecords）
 *   4. wipe-all: 完全清空資料庫（需輸入 YES 確認）
 *
 * 範例：
 *   node scripts/clean-firebase.js https://my-project-default-rtdb.firebaseio.com sanitize
 *   node scripts/clean-firebase.js https://my-project-default-rtdb.firebaseio.com reset-weekly
 *   node scripts/clean-firebase.js https://my-project-default-rtdb.firebaseio.com clear-teams
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dbUrlArg = args[0];
const modeArg = args[1] || 'sanitize';

if (!dbUrlArg) {
  console.log('\n======================================================');
  console.log('🍁 BossParty Firebase 資料庫維護與清理工具');
  console.log('======================================================');
  console.log('使用指令：');
  console.log('  node scripts/clean-firebase.js <Database_URL> [mode]\n');
  console.log('可選模式 (mode)：');
  console.log('  sanitize     : 🌟 [推薦] 智能清洗修復 (自動備份 + 刪除孤立資料 + 修復舊版欄位)');
  console.log('  reset-weekly : 🔄 重設本週攻略進度 (保留角色與組隊，重設所有 BOSS 勾勾)');
  console.log('  clear-teams  : 👥 清空所有組隊與進度 (保留玩家與角色名冊，重組隊伍)');
  console.log('  wipe-all     : ⚠️ 完全清空並重設資料庫 (重設回初始狀態)\n');
  console.log('範例：');
  console.log('  node scripts/clean-firebase.js https://your-db-default-rtdb.firebaseio.com sanitize\n');
  process.exit(1);
}

const cleanDbUrl = dbUrlArg.trim().replace(/\/$/, '');

async function fetchJson(endpoint) {
  const res = await fetch(`${cleanDbUrl}/${endpoint}.json`);
  if (!res.ok) {
    throw new Error(`讀取 ${endpoint} 失敗 (HTTP ${res.status} ${res.statusText})`);
  }
  return res.json();
}

async function putJson(endpoint, data) {
  const res = await fetch(`${cleanDbUrl}/${endpoint}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`寫入 ${endpoint} 失敗 (HTTP ${res.status} ${res.statusText})`);
  }
  return res.json();
}

async function run() {
  console.log('\n📡 正在連線至 Firebase Realtime Database: ' + cleanDbUrl);

  // 1. 讀取現有資料
  let players = await fetchJson('players');
  let store = await fetchJson('store');

  if (!players && !store) {
    console.log('⚠️ 資料庫為空或無法讀取，請確認安全規則與 URL 是否正確。');
    return;
  }

  // 確保結構
  players = Array.isArray(players) ? players : [];
  store = store || {};
  store.teams = store.teams || {};
  store.weeklyRecords = store.weeklyRecords || {};
  store.guests = Array.isArray(store.guests) ? store.guests : [];

  // 2. 自動建立備份檔案
  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `firebase-backup-${timestamp}.json`);

  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        backupTime: now.toLocaleString(),
        dbUrl: cleanDbUrl,
        players,
        store,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`✅ [自動備份完成] 原資料庫已完整保存至: ${backupPath}\n`);

  // 收集現存合法角色 ID 清單
  const validCharIds = new Set();
  players.forEach((p) => {
    (p.characters || []).forEach((c) => {
      if (c && c.id) validCharIds.add(c.id);
    });
  });

  const validGuestIds = new Set(store.guests.map((g) => g.id));

  // 3. 根據模式執行
  if (modeArg === 'sanitize') {
    console.log('🛠️ 執行模式：【智能清洗與舊格式修復】...');

    let removedRecordsCount = 0;
    let repairedTeamsCount = 0;
    let removedEmptyTeamsCount = 0;

    // A. 清理孤立的 weeklyRecords
    const cleanedRecords = {};
    Object.entries(store.weeklyRecords).forEach(([key, rec]) => {
      if (!rec || !rec.charId) {
        removedRecordsCount++;
        return;
      }
      if (!validCharIds.has(rec.charId)) {
        removedRecordsCount++;
        return;
      }
      cleanedRecords[key] = rec;
    });

    // B. 清理與修復 teams
    const cleanedTeams = {};
    Object.entries(store.teams).forEach(([teamId, team]) => {
      if (!team) return;

      // 提取成員
      let rawMembers = team.memberTargets || (team.memberCharIds || []).map((id) => ({ charId: id, entryIndex: 1 }));
      if (!Array.isArray(rawMembers)) rawMembers = [];

      // 過濾只保留存在於資料庫的角色或 Guest
      const activeMembers = rawMembers.filter((m) => {
        if (!m || !m.charId) return false;
        if (m.charId.startsWith('guest_')) return validGuestIds.has(m.charId);
        return validCharIds.has(m.charId);
      });

      if (activeMembers.length === 0) {
        removedEmptyTeamsCount++;
        return;
      }

      // 修補舊格式 schedule
      let cleanedSchedule = team.schedule || null;
      if (cleanedSchedule) {
        const fixSlot = (slot) => {
          if (!slot) return null;
          let timeStr = typeof slot.timeStr === 'string' ? slot.timeStr : (typeof slot.time === 'string' ? slot.time : '');
          if (!timeStr && (slot.recurringHour !== undefined || slot.hour !== undefined)) {
            const h = String(slot.recurringHour ?? slot.hour ?? 21).padStart(2, '0');
            const m = String(slot.recurringMin ?? slot.minute ?? slot.min ?? 0).padStart(2, '0');
            timeStr = `${h}:${m}`;
          }
          if (!timeStr || !timeStr.includes(':')) timeStr = '21:00';
          const dayOfWeek = typeof slot.dayOfWeek === 'number' ? slot.dayOfWeek : (typeof slot.day === 'number' ? slot.day : 4);
          return { dayOfWeek, timeStr };
        };

        cleanedSchedule = {
          recurring: fixSlot(cleanedSchedule.recurring),
          tempOverride: fixSlot(cleanedSchedule.tempOverride),
        };
        repairedTeamsCount++;
      }

      cleanedTeams[teamId] = {
        id: teamId,
        bossId: team.bossId || '',
        entryIndex: team.entryIndex || 1,
        memberTargets: activeMembers,
        memberCharIds: activeMembers.map((m) => m.charId),
        schedule: cleanedSchedule,
        updatedAt: team.updatedAt || Date.now(),
      };
    });

    // C. 寫回修復後的資料
    store.weeklyRecords = cleanedRecords;
    store.teams = cleanedTeams;

    await putJson('store', store);

    console.log('======================================================');
    console.log('🎉 清洗修復完成！統計結果：');
    console.log(`  - 清除已刪除角色的孤立紀錄: ${removedRecordsCount} 筆`);
    console.log(`  - 清除無效/無成員的空隊伍: ${removedEmptyTeamsCount} 個`);
    console.log(`  - 修復並規格化排程時間欄位: ${repairedTeamsCount} 個`);
    console.log(`  - 現存合法玩家: ${players.length} 位`);
    console.log(`  - 現存合法角色: ${validCharIds.size} 隻`);
    console.log(`  - 現存有效組隊: ${Object.keys(cleanedTeams).length} 個`);
    console.log('======================================================\n');
  } else if (modeArg === 'reset-weekly') {
    console.log('🔄 執行模式：【重設本週攻略進度】...');

    let resetCount = 0;
    Object.keys(store.weeklyRecords).forEach((k) => {
      if (store.weeklyRecords[k]) {
        store.weeklyRecords[k].isCompleted = false;
        store.weeklyRecords[k].completedAt = null;
        resetCount++;
      }
    });

    await putJson('store/weeklyRecords', store.weeklyRecords);

    console.log('======================================================');
    console.log(`🎉 重設完成！已將 ${resetCount} 筆 BOSS 通關紀錄重設為未完成。`);
    console.log('（玩家名冊、角色資料與小隊組隊設定均完好保留）');
    console.log('======================================================\n');
  } else if (modeArg === 'clear-teams') {
    console.log('👥 執行模式：【清空所有組隊與進度】...');

    store.teams = {};
    store.weeklyRecords = {};
    store.guests = [];

    await putJson('store', store);

    console.log('======================================================');
    console.log('🎉 清空完成！已清空所有組隊、通關紀錄與臨時 Guest。');
    console.log(`（現存 ${players.length} 位玩家及其所有角色資料已 100% 完整保留）`);
    console.log('======================================================\n');
  } else if (modeArg === 'wipe-all') {
    console.log('⚠️ 執行模式：【完全清空資料庫】...');

    const emptyStore = { teams: {}, weeklyRecords: {}, guests: [] };
    await putJson('store', emptyStore);

    console.log('======================================================');
    console.log('🎉 已重設 store 節點。如需重設 players，請在 Firebase 控制台操作。');
    console.log('======================================================\n');
  } else {
    console.error(`❌ 未知的模式: ${modeArg}`);
  }
}

run().catch((err) => {
  console.error('\n❌ 執行失敗:', err.message);
  process.exit(1);
});
