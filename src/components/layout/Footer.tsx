import { useState } from 'react';
import { Copy, Check, ShieldAlert, ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FooterProps {
  discordHandle?: string;
  discordUrl?: string;
}

export function Footer({
  discordHandle = 'aanon9876',
  discordUrl = 'https://discord.com/users/415486143891767318',
}: FooterProps) {
  const [copiedDiscord, setCopiedDiscord] = useState(false);

  const handleCopyDiscord = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(discordHandle);
    setCopiedDiscord(true);
    setTimeout(() => setCopiedDiscord(false), 2000);
  };

  return (
    <footer className="w-full mt-12 border-t-2 border-kerning-stroke/30 dark:border-slate-800 bg-[#EFE3CF]/70 dark:bg-slate-900/80 backdrop-blur-md transition-colors select-none text-[#4A3B2C] dark:text-slate-300">
      <div className="max-w-[1880px] w-full mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* 左側：品牌名稱與版本標籤 */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍁</span>
              <span className="font-black text-base text-[#3E2F20] dark:text-amber-300 font-sans tracking-tight">
                新楓之谷 每週 BOSS 攻略備忘錄
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 text-[10px] font-fredoka font-black">
                v2.0
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-slate-400 font-medium">
              專為小隊打造的即時討伐進度、結晶收益與艾里溫碎片分配助手
            </p>
          </div>

          {/* 右側：Discord 聯絡按鈕 (支援點擊直連開啟個人頁面 + 獨立一鍵複製帳號) */}
          <div className="flex items-center justify-center">
            <div className="flex items-center rounded-xl border border-kerning-stroke/50 bg-[#FFFDF9] dark:bg-slate-800 shadow-xs hover:border-indigo-400 transition-all group overflow-hidden">
              {/* 直連開啟 Discord 連結 */}
              <a
                href={discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 flex items-center gap-2.5 text-xs font-bold text-[#4A3B2C] dark:text-slate-200 hover:bg-indigo-50/60 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                title="點擊前往 Discord 個人檔案"
              >
                {/* Discord SVG 圖示 */}
                <svg className="w-4 h-4 text-[#5865F2] shrink-0 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] text-stone-500 dark:text-slate-400 font-sans leading-none flex items-center gap-1">
                    <span>Discord 聯絡</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </div>
                  <div className="font-mono text-xs text-[#3E2F20] dark:text-slate-200 mt-0.5">{discordHandle}</div>
                </div>
              </a>

              {/* 獨立一鍵複製帳號按鈕 */}
              <button
                type="button"
                onClick={handleCopyDiscord}
                className={cn(
                  'px-2.5 py-3 border-l border-kerning-stroke/30 dark:border-slate-700/60 transition-colors flex items-center justify-center cursor-pointer',
                  copiedDiscord
                    ? 'bg-emerald-500 text-white'
                    : 'hover:bg-indigo-100/50 dark:hover:bg-slate-750 text-stone-400 hover:text-indigo-600'
                )}
                title="點擊複製 Discord 帳號"
              >
                {copiedDiscord ? (
                  <Check className="w-3.5 h-3.5 text-white animate-in zoom-in-50 duration-150" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 下方著作權與遊戲宣告條 */}
        <div className="mt-6 pt-4 border-t border-kerning-stroke/20 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-500 dark:text-slate-400 text-center sm:text-left">
          <div>
            © {new Date().getFullYear()} BossParty Memo. All rights reserved.
          </div>
          <div className="flex items-center gap-1.5 opacity-85">
            <ShieldAlert className="w-3 h-3 shrink-0" />
            <span>本工具為社群非官方作品，MapleStory 遊戲版權與素材皆屬 NEXON 及遊戲橘子所有</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
