/**
 * 楓之谷大額楓幣格式化與計算輔助函式
 * 1 億 = 100,000,000 (10^8)
 * 1 萬 = 10,000 (10^4)
 */

/** 將數值轉為友善中文大額楓幣格式 (例: 120 億 5,000 萬 楓幣) */
export function formatMapleMeso(amount: number | null | undefined): string {
  if (!amount || isNaN(amount) || amount <= 0) return '0 楓幣';

  const yi = Math.floor(amount / 100000000);
  const remainingAfterYi = amount % 100000000;
  const wan = Math.floor(remainingAfterYi / 10000);
  const remainder = remainingAfterYi % 10000;

  const parts: string[] = [];
  if (yi > 0) parts.push(`${yi.toLocaleString()} 億`);
  if (wan > 0) parts.push(`${wan.toLocaleString()} 萬`);
  if (remainder > 0 && yi === 0 && wan === 0) parts.push(`${remainder.toLocaleString()}`);

  return parts.length > 0 ? `${parts.join(' ')} 楓幣` : '0 楓幣';
}

/** 簡約短格式 (例: 120.5 億) */
export function formatMapleMesoShort(amount: number | null | undefined): string {
  if (!amount || isNaN(amount) || amount <= 0) return '0';
  if (amount >= 100000000) {
    const yiVal = amount / 100000000;
    // 最多取 2 位小數，去掉尾隨 0
    const str = yiVal.toFixed(2).replace(/\.?0+$/, '');
    return `${str} 億`;
  }
  if (amount >= 10000) {
    const wanVal = amount / 10000;
    const str = wanVal.toFixed(1).replace(/\.?0+$/, '');
    return `${str} 萬`;
  }
  return amount.toLocaleString();
}

/**
 * 解析使用者輸入字串為純整數楓幣數值
 * 支援純數字、小數、以及含有「億」「萬」關鍵字的字串
 */
export function parseMapleMesoInput(input: string | number): number {
  if (typeof input === 'number') {
    return isNaN(input) || input < 0 ? 0 : Math.floor(input);
  }
  if (!input || typeof input !== 'string') return 0;

  const clean = input.trim().replace(/,/g, '');
  if (!clean) return 0;

  // 1. 純數字（或小數）
  if (/^\d+(\.\d+)?$/.test(clean)) {
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : Math.floor(val);
  }

  // 2. 含有「億」或「萬」
  let total = 0;
  const yiMatch = clean.match(/([\d.]+)\s*億/);
  if (yiMatch) {
    const yiVal = parseFloat(yiMatch[1]);
    if (!isNaN(yiVal)) total += Math.floor(yiVal * 100000000);
  }

  const wanMatch = clean.match(/([\d.]+)\s*萬/);
  if (wanMatch) {
    const wanVal = parseFloat(wanMatch[1]);
    if (!isNaN(wanVal)) total += Math.floor(wanVal * 10000);
  }

  // 若沒對應到億或萬，但有純數字部分
  if (total === 0) {
    const num = parseFloat(clean.replace(/[^\d.]/g, ''));
    if (!isNaN(num)) total = Math.floor(num);
  }

  return Math.max(0, total);
}

/** 試算扣除拍賣手續費後淨額與每人均分金額 */
export function calculateNetAndSplit(
  totalSalePrice: number,
  taxRatePercent: number = 3,
  memberCount: number = 1
): {
  netSalePrice: number;
  taxAmount: number;
  splitAmountPerMember: number;
  remainder: number;
} {
  const safeTotal = Math.max(0, Math.floor(totalSalePrice || 0));
  const safeTaxRate = Math.max(0, Math.min(100, Number(taxRatePercent) || 0));
  const taxAmount = Math.floor(safeTotal * (safeTaxRate / 100));
  const netSalePrice = Math.max(0, safeTotal - taxAmount);

  const count = Math.max(1, memberCount);
  const splitAmountPerMember = Math.floor(netSalePrice / count);
  const remainder = netSalePrice - splitAmountPerMember * count;

  return {
    netSalePrice,
    taxAmount,
    splitAmountPerMember,
    remainder,
  };
}

/** 將數值轉為台幣格式 (例: NT$ 15,000) */
export function formatTwd(amount: number | null | undefined): string {
  if (!amount || isNaN(amount) || amount <= 0) return 'NT$ 0';
  return `NT$ ${Math.floor(amount).toLocaleString()}`;
}

/** 簡約台幣短格式 (例: NT$ 1.5萬 或 NT$ 1,500) */
export function formatTwdShort(amount: number | null | undefined): string {
  if (!amount || isNaN(amount) || amount <= 0) return 'NT$ 0';
  if (amount >= 10000) {
    const wan = amount / 10000;
    const str = wan.toFixed(1).replace(/\.?0+$/, '');
    return `NT$ ${str}萬`;
  }
  return `NT$ ${amount.toLocaleString()}`;
}

/**
 * 解析使用者輸入字串為純整數台幣數值
 * 支援純數字、逗號、以及含有「萬」關鍵字的字串 (如 1.5萬 ➡️ 15000)
 */
export function parseTwdInput(input: string | number): number {
  if (typeof input === 'number') {
    return isNaN(input) || input < 0 ? 0 : Math.floor(input);
  }
  if (!input || typeof input !== 'string') return 0;

  const clean = input.trim().replace(/,/g, '').replace(/NT\$/i, '').replace(/元/g, '');
  if (!clean) return 0;

  // 1. 純數字（或小數）
  if (/^\d+(\.\d+)?$/.test(clean)) {
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : Math.floor(val);
  }

  // 2. 含有「萬」
  let total = 0;
  const wanMatch = clean.match(/([\d.]+)\s*萬/);
  if (wanMatch) {
    const wanVal = parseFloat(wanMatch[1]);
    if (!isNaN(wanVal)) total += Math.floor(wanVal * 10000);
  }

  // 3. 提取所有有效數字
  if (total === 0) {
    const num = parseFloat(clean.replace(/[^\d.]/g, ''));
    if (!isNaN(num)) total = Math.floor(num);
  }

  return Math.max(0, total);
}

/** 通用多幣別格式化 (完整長格式) */
export function formatLootPrice(
  amount: number | null | undefined,
  currency: 'meso' | 'twd' = 'meso'
): string {
  if (currency === 'twd') {
    return formatTwd(amount);
  }
  return formatMapleMeso(amount);
}

/** 通用多幣別格式化 (精簡短格式) */
export function formatLootPriceShort(
  amount: number | null | undefined,
  currency: 'meso' | 'twd' = 'meso'
): string {
  if (currency === 'twd') {
    return formatTwdShort(amount);
  }
  return formatMapleMesoShort(amount);
}
