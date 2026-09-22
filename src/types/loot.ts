export type LootStatus = 'selling' | 'distributing' | 'done';

export type LootSaleCurrency = 'meso' | 'twd';

export type LootCategory =
  | 'pitched'          // 漆黑飾品
  | 'pitched_upgrade'  // 漆黑強化 (各個卓越鐵鎚)
  | 'brilliant'        // 光輝套組
  | 'ring_related'     // 塔戒相關 (研磨石、規範四、永續四)
  | 'ring_upgrade'     // 相容舊版標籤
  | 'ring_box'         // 相容舊版標籤
  | 'custom';          // 自訂物品

export interface LootMemberPayout {
  charId: string;
  charName: string;
  playerName: string;
  isGuest?: boolean;
  isPaid: boolean;      // 是否已將分配金額交付給該成員
  paidAt?: string;       // 交付時間戳記 (ISO string)
  note?: string;         // 備註 (如：已遊戲內郵寄、扣抵裝備費)
}

export interface LootItem {
  id: string;                      // 唯一識別碼 (loot_${timestamp}_${rand})
  itemName: string;                // 物品名稱
  category: LootCategory;          // 物品類別
  imageUrl?: string;               // 圖片路徑 (使用者提供或自訂，未填時使用預設圖示)
  bossId: string;                  // 來源 BOSS GROUP ID (如 'lotus', 'damien', 'will'，亦相容舊版 bossId)
  entryIndex: number;              // 刷次 (1: 首刷, 2: 重置刷)
  weekKey: string;                 // 掉落週次 (例如 '2026-09-17')
  teamId?: string;                 // 來源隊伍 ID
  droppedAt: string;               // 掉落日期 (YYYY-MM-DD)
  handlerPlayerName?: string;      // 保管人 / 上架者玩家名稱

  // 拍賣與金額設定
  status: LootStatus;              // 'selling' (待售) | 'distributing' (分配中) | 'done' (已結清)
  saleCurrency?: LootSaleCurrency; // 交易幣別: 'meso' (楓幣，預設) | 'twd' (新台幣)
  totalSalePrice: number;          // 拍賣售出總金額 (楓幣或台幣元)
  taxRatePercent: number;          // 拍賣/交易手續費 % (預設 3%)
  netSalePrice: number;            // 扣除手續費後淨額 (楓幣或台幣元)
  splitAmountPerMember: number;    // 每人應分金額 (楓幣或台幣元)

  // 成員交付名冊
  members: LootMemberPayout[];
  note?: string;                   // 備註 (如：拍賣欄位到期日、買家資訊)
  createdAt: string;
  updatedAt: string;
}
