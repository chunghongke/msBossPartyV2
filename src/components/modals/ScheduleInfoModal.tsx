import { Team } from '@/types/party';
import { useStore } from '@/contexts/StoreContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Clock, Check, Circle } from 'lucide-react';

interface ScheduleInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
}

export function ScheduleInfoModal({ isOpen, onClose, team }: ScheduleInfoModalProps) {
  const { store, getCharName } = useStore();

  if (!team || !team.schedule) return null;

  const daysOfWeek = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  const recurring = team.schedule.recurring;
  const tempOverride = team.schedule.tempOverride;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Clock className="w-5 h-5 text-purple-300" />
            <span>隊伍出團排程詳情</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 space-y-2">
            {tempOverride ? (
              <div>
                <div className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                  <span>⚡ 本週臨時覆蓋時間 (優先)</span>
                </div>
                <div className="text-base font-black text-purple-700 dark:text-purple-300 font-fredoka">
                  {daysOfWeek[tempOverride.dayOfWeek]} {tempOverride.timeStr}
                </div>
              </div>
            ) : null}

            {recurring ? (
              <div>
                <div className="text-[10px] font-bold text-slate-400">
                  {tempOverride ? '常態每週固定時間：' : '每週固定出團時間：'}
                </div>
                <div className="text-sm font-black text-[#3E2F20] dark:text-slate-200">
                  {daysOfWeek[recurring.dayOfWeek]} {recurring.timeStr}
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <div className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
              隊員名冊與本週擊破狀態
            </div>
            <div className="space-y-1.5">
              {team.memberTargets.map((m) => {
                const rec = Object.values(store.weeklyRecords).find(
                  (r) => r.charId === m.charId && r.teamId === team.id
                );
                const isCompleted = Boolean(rec?.isCompleted);

                return (
                  <div
                    key={`${m.charId}_${m.entryIndex}`}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="font-bold text-[#3E2F20] dark:text-slate-100">
                      {getCharName(m.charId)}
                    </div>
                    {isCompleted ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 font-black text-[10px] flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>已擊破</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-500 font-bold text-[10px] flex items-center gap-1">
                        <Circle className="w-2.5 h-2.5" />
                        <span>未完成</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="parchment" size="sm" onClick={onClose}>
            關閉
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
