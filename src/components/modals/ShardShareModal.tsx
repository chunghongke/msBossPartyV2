import { useState, useEffect, FormEvent } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { Boss } from '@/types/boss';
import { Team, ShardMode } from '@/types/party';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface ShardShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  boss: Boss | null;
  team: Team | null;
  recordKey: string;
}

export function ShardShareModal({ isOpen, onClose, boss, team, recordKey }: ShardShareModalProps) {
  const { store, getCharName, updateWeeklyRecord } = useStore();

  const [mode, setMode] = useState<ShardMode>('shares');
  const [sharesMap, setSharesMap] = useState<Record<string, number>>({});
  const [quantityMap, setQuantityMap] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxShares = boss?.maxPartySize || 6;
  const members = team?.memberTargets || [];

  useEffect(() => {
    if (isOpen && boss && team) {
      const initialShares: Record<string, number> = {};
      const initialQuantities: Record<string, number> = {};

      members.forEach((m) => {
        const key = `rec_${m.charId}_${boss.id}_${m.entryIndex}`;
        const rec = store.weeklyRecords[key];
        initialShares[key] = rec?.shardShares ?? 1;
        initialQuantities[key] = rec?.shardQuantity ?? Math.floor(boss.erionVestiges / Math.max(1, members.length));
      });

      const currentRec = store.weeklyRecords[recordKey];
      setMode(currentRec?.shardMode || 'shares');
      setSharesMap(initialShares);
      setQuantityMap(initialQuantities);
      setErrorMsg('');
    }
  }, [isOpen, boss, team, recordKey, store.weeklyRecords]);

  if (!boss || !team) return null;

  const handleApplyEqualShare = () => {
    const next: Record<string, number> = {};
    members.forEach((m) => {
      const key = `rec_${m.charId}_${boss.id}_${m.entryIndex}`;
      next[key] = 1;
    });
    setSharesMap(next);
    setErrorMsg('');
  };

  const handleApplySingleTakeAll = (targetKey: string) => {
    const next: Record<string, number> = {};
    members.forEach((m) => {
      const key = `rec_${m.charId}_${boss.id}_${m.entryIndex}`;
      next[key] = key === targetKey ? maxShares : 0;
    });
    setSharesMap(next);
    setErrorMsg('');
  };

  const handleShareChange = (key: string, delta: number) => {
    const current = sharesMap[key] || 0;
    const nextVal = Math.max(0, Math.min(maxShares, current + delta));
    setSharesMap({ ...sharesMap, [key]: nextVal });
    setErrorMsg('');
  };

  const handleQuantityChange = (key: string, val: number) => {
    setQuantityMap({ ...quantityMap, [key]: Math.max(0, val) });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      for (const m of members) {
        const key = `rec_${m.charId}_${boss.id}_${m.entryIndex}`;
        await updateWeeklyRecord(key, {
          shardMode: mode,
          shardShares: mode === 'shares' ? sharesMap[key] ?? 1 : null,
          shardQuantity: mode === 'quantity' ? quantityMap[key] ?? 0 : null,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || '儲存分配設定失敗！');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Sparkles className="w-5 h-5 text-purple-300" />
            <span>艾里溫碎片分配：{boss.name}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave}>
          <DialogBody className="space-y-4">
            <div className="flex rounded-xl bg-black/10 dark:bg-black/30 p-1 border border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setMode('shares')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === 'shares'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                份數比例分配 (預設)
              </button>
              <button
                type="button"
                onClick={() => setMode('quantity')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === 'quantity'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                直接指定片數
              </button>
            </div>

            {mode === 'shares' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    此 BOSS 掉落基礎份數：<strong className="text-purple-600 dark:text-purple-400">{boss.erionVestiges} 片</strong>
                  </span>
                  <Button type="button" size="sm" variant="parchment" onClick={handleApplyEqualShare} className="h-6 text-[10px]">
                    <RefreshCw className="w-3 h-3" />
                    <span>全員均分</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  {members.map((m) => {
                    const key = `rec_${m.charId}_${boss.id}_${m.entryIndex}`;
                    const currentShares = sharesMap[key] || 0;
                    const estimatedPieces = Math.round(boss.erionVestiges * (currentShares / maxShares));

                    return (
                      <div
                        key={key}
                        className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-xs text-[#3E2F20] dark:text-slate-100 truncate">
                            {getCharName(m.charId)}
                          </div>
                          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                            約 {estimatedPieces} 片
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleShareChange(key, -1)}
                            className="w-7 h-7 rounded-lg bg-black/10 hover:bg-black/20 text-slate-800 dark:text-slate-200 font-bold text-sm flex items-center justify-center active:scale-95"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-fredoka font-black text-sm text-purple-600 dark:text-purple-400">
                            {currentShares} 份
                          </span>
                          <button
                            type="button"
                            onClick={() => handleShareChange(key, 1)}
                            className="w-7 h-7 rounded-lg bg-black/10 hover:bg-black/20 text-slate-800 dark:text-slate-200 font-bold text-sm flex items-center justify-center active:scale-95"
                          >
                            +
                          </button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleApplySingleTakeAll(key)}
                            className="h-7 px-1.5 text-[10px] text-purple-600"
                            title="由該隊員全拿"
                          >
                            全拿
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((m) => {
                  const key = `rec_${m.charId}_${boss.id}_${m.entryIndex}`;
                  const currentQty = quantityMap[key] ?? 0;

                  return (
                    <div
                      key={key}
                      className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="font-black text-xs text-[#3E2F20] dark:text-slate-100 truncate">
                        {getCharName(m.charId)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={currentQty}
                          onChange={(e) => handleQuantityChange(key, Number(e.target.value))}
                          min={0}
                          max={9999}
                          className="w-20 px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-right focus:outline-none focus:border-purple-500"
                        />
                        <span className="text-xs text-slate-500 font-bold">片</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500 text-xs text-red-500 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="parchment" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" variant="gold" size="md" isLoading={isSubmitting}>
              <span>確認分配</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
