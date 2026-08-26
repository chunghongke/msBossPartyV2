import React from 'react';
import { Sparkles, Cloud } from 'lucide-react';

interface PageLoadingScreenProps {
  groupName?: string;
}

export function PageLoadingScreen({ groupName }: PageLoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F5ECD7] dark:bg-[#0D1322] text-[#3E2F20] dark:text-slate-100 p-4 transition-colors">
      {/* 背景裝飾光暈 */}
      <div className="absolute w-72 h-72 rounded-full bg-amber-400/20 dark:bg-amber-500/10 blur-3xl pointer-events-none animate-pulse" />

      {/* 主載入卡片 */}
      <div className="relative flex flex-col items-center text-center space-y-6 max-w-sm w-full p-8 rounded-3xl bg-white/70 dark:bg-slate-900/80 backdrop-blur-md border-2 border-amber-500/30 shadow-2xl shadow-amber-950/10 animate-in fade-in zoom-in-95 duration-300">
        {/* 動畫頭部：旋轉光環 + 漂浮楓葉 */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          {/* 外層旋轉光環 */}
          <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
          
          {/* 中層呼吸漸層圓圈 */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <span className="text-2xl select-none animate-bounce" style={{ animationDuration: '1.8s' }}>
              🍁
            </span>
          </div>
        </div>

        {/* 文字標題與說明 */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-black">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
            <span>{groupName ? `小隊「${groupName}」` : '楓之谷 BOSS 攻略小隊'}</span>
          </div>

          <h2 className="text-lg font-black text-[#3E2F20] dark:text-slate-100 tracking-wide">
            正在連線雲端資料庫
          </h2>

          <p className="text-xs font-bold text-stone-500 dark:text-slate-400">
            同步小隊最新攻略進度、結晶收益與碎片分配中...
          </p>
        </div>

        {/* 底部雲端連線狀態徽章 */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-[11px] font-bold text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-slate-700">
          <Cloud className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>Firebase RTDB 即時連線中</span>
          <span className="flex h-2 w-2 relative ml-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
        </div>
      </div>
    </div>
  );
}
