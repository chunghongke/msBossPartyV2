import { useState } from 'react';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { Button } from '@/components/ui/Button';
import { RefreshCw, X, Sparkles } from 'lucide-react';

export function VersionUpdateBanner() {
  const { hasNewVersion, reload } = useVersionCheck();
  const [dismissed, setDismissed] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  if (!hasNewVersion || dismissed) return null;

  const handleReload = () => {
    setIsReloading(true);
    reload();
  };

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] max-w-[94vw] sm:max-w-md w-full pointer-events-auto"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#FFFDF9]/95 dark:bg-slate-900/95 border-2 border-amber-500 shadow-2xl backdrop-blur-md ring-4 ring-amber-400/25 animate-in slide-in-from-top-6 duration-300">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center text-base shrink-0 shadow-xs">
            🚀
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-stone-900 dark:text-slate-100 flex items-center gap-1">
              <span>發現系統新版本！</span>
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
            </div>
            <div className="text-[11px] font-bold text-stone-500 dark:text-slate-400 truncate">
              點擊立即載入最新功能與修復
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="gold"
            onClick={handleReload}
            isLoading={isReloading}
            className="h-7.5 px-3 text-xs font-black shadow-xs shrink-0 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>立即更新</span>
          </Button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 rounded-full transition-colors cursor-pointer"
            title="稍後再說"
            aria-label="關閉提示"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
