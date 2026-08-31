import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RefreshCw, CheckCircle2, AlertCircle, Sparkles, Loader2 } from 'lucide-react';

export interface SyncProgressData {
  isOpen: boolean;
  playerName: string;
  currentCharName: string;
  current: number;
  total: number;
  successCount: number;
  failedCount: number;
  isCompleted: boolean;
}

interface SyncProgressModalProps {
  progress: SyncProgressData | null;
  onClose: () => void;
}

export function SyncProgressModal({ progress, onClose }: SyncProgressModalProps) {
  const isOpen = Boolean(progress?.isOpen);

  const playerName = progress?.playerName || '';
  const currentCharName = progress?.currentCharName || '';
  const current = progress?.current || 0;
  const total = progress?.total || 0;
  const successCount = progress?.successCount || 0;
  const failedCount = progress?.failedCount || 0;
  const isCompleted = Boolean(progress?.isCompleted);

  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && isCompleted) {
          onClose();
        }
      }}
    >
      {isOpen && (
        <DialogContent maxWidthClass="max-w-md" hideCloseButton={!isCompleted} className="p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="flex items-center gap-2">
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <RefreshCw className="w-5 h-5 text-amber-500 animate-spin shrink-0" />
              )}
              <span>
                {isCompleted ? '🎉 官方立繪同步完成' : `🔄 正在同步「${playerName}」的角色立繪`}
              </span>
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="px-5 py-3 space-y-4">
            {/* 中間立體卡片：當前角色進度展示 */}
            <div className="p-4 bg-gradient-to-b from-[#FFFDF9] to-[#F6ECD5] dark:from-slate-800 dark:to-slate-900 border-2 border-[#D4B982] dark:border-slate-700 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {isCompleted ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-500/50 flex items-center justify-center shrink-0">
                      <Loader2 className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-stone-500 dark:text-slate-400">
                      {isCompleted ? '全部角色處理完畢' : '正在連線 Nexon API 查詢：'}
                    </div>
                    <div className="font-black text-sm text-[#3E2F20] dark:text-slate-100 truncate">
                      {isCompleted
                        ? `✅ 已完成全部 ${total} 隻角色的立繪更新`
                        : currentCharName || '準備連線中...'}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-fredoka font-black text-base sm:text-lg text-amber-800 dark:text-amber-300">
                    {current}
                  </span>
                  <span className="text-xs text-stone-400 dark:text-slate-500 font-fredoka font-bold">
                    {' '}/ {total}
                  </span>
                </div>
              </div>

              {/* 進度條 */}
              <ProgressBar
                current={current}
                total={total}
                variant={isCompleted ? 'green' : 'gold'}
                size="lg"
                showLabel={false}
              />

              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-stone-500 dark:text-slate-400">
                  {isCompleted ? '已完成 100%' : '處理進度'}
                </span>
                <span className="font-fredoka font-black text-amber-700 dark:text-amber-300">
                  {percentage}%
                </span>
              </div>
            </div>

            {/* 下方即時統計膠囊 */}
            <div className="grid grid-cols-3 gap-2 text-center select-none">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300/80 dark:border-emerald-800/80 rounded-xl">
                <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>成功更新</span>
                </div>
                <div className="font-fredoka font-black text-sm text-emerald-700 dark:text-emerald-200 mt-0.5">
                  {successCount}
                </div>
              </div>

              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/80 rounded-xl">
                <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-0.5">
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>剩餘待查</span>
                </div>
                <div className="font-fredoka font-black text-sm text-amber-700 dark:text-amber-200 mt-0.5">
                  {Math.max(0, total - current)}
                </div>
              </div>

              <div className="p-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-300/80 dark:border-rose-800/80 rounded-xl">
                <div className="text-[10px] font-bold text-rose-800 dark:text-rose-300 flex items-center justify-center gap-0.5">
                  <AlertCircle className="w-2.5 h-2.5" />
                  <span>未找到/失敗</span>
                </div>
                <div className="font-fredoka font-black text-sm text-rose-700 dark:text-rose-200 mt-0.5">
                  {failedCount}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-stone-500 dark:text-slate-400 font-bold text-center leading-relaxed">
              {isCompleted
                ? '✨ 立繪已成功快取至資料庫，再次點擊同步將優先使用快取秒開！'
                : '💡 依據 Nexon 官方 API 規範設有安全查詢間隔，請稍候片刻。'}
            </div>
          </DialogBody>

          <DialogFooter className="px-5 pb-5 pt-2">
            {isCompleted ? (
              <Button
                type="button"
                variant="green"
                size="sm"
                onClick={onClose}
                className="w-full font-black text-xs h-8"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                <span>確認並關閉視窗</span>
              </Button>
            ) : (
              <div className="w-full text-center text-xs text-stone-500 dark:text-slate-400 font-bold py-1">
                立繪同步中，請勿關閉視窗...
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
