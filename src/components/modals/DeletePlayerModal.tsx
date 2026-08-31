import { useState } from 'react';
import { Player } from '@/types/player';
import { useStore } from '@/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { AlertTriangle, Trash2, Users, FileX2, UserX } from 'lucide-react';

interface DeletePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
}

export function DeletePlayerModal({ isOpen, onClose, player }: DeletePlayerModalProps) {
  const { deletePlayer } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!player) return null;

  const characters = player.characters || [];
  const charCount = characters.length;
  const totalBossCount = characters.reduce((acc, c) => {
    return acc + (c.bossIds || []).length + (c.resetBossIds || []).length;
  }, 0);

  const handleConfirmDelete = async () => {
    setIsSubmitting(true);
    try {
      await deletePlayer(player.name);
      onClose();
    } catch (err: any) {
      alert(err?.message || '刪除冒險者玩家失敗，請稍後再試。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent maxWidthClass="max-w-md" className="p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>刪除冒險者確認</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="px-5 py-3 space-y-4">
          {/* 目標玩家預覽卡片 */}
          <div className="flex items-center gap-3 p-3.5 bg-gradient-to-b from-[#FFFDF9] to-[#F6ECD5] dark:from-slate-800 dark:to-slate-900 border-2 border-amber-400/80 dark:border-slate-700 rounded-2xl shadow-sm">
            <PlayerAvatar
              player={player}
              size="md"
              className="w-12 h-12 rounded-xl text-xl shadow-xs border-1.5 border-amber-600/40 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <h4 className="font-black text-base text-[#3E2F20] dark:text-slate-100 truncate flex items-center gap-1.5">
                <span>{player.name}</span>
                {player.isAdmin && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-md font-bold">
                    管理員
                  </span>
                )}
              </h4>
              <div className="text-xs text-stone-500 dark:text-slate-400 font-bold flex items-center gap-2 mt-0.5">
                <span>{charCount} 隻角色</span>
                <span>•</span>
                <span>{totalBossCount} 隻排定 BOSS</span>
              </div>
            </div>
          </div>

          {/* 危險操作警示清單 */}
          <div className="p-3 bg-rose-500/10 dark:bg-rose-950/30 border-2 border-rose-500/30 rounded-2xl space-y-2">
            <div className="text-xs font-black text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <span>⚠️ 刪除玩家將自動進行全鏈路連鎖清理：</span>
            </div>

            <ul className="text-xs text-rose-900/90 dark:text-rose-200/90 space-y-1.5 font-bold pl-1">
              <li className="flex items-start gap-1.5">
                <UserX className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>永久刪除玩家【{player.name}】及其名下所有 {charCount} 隻角色。</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Users className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>自動退出所有多人組隊；若隊伍只剩 1 位正式隊友將自動解散回歸單人隊。</span>
              </li>
              <li className="flex items-start gap-1.5">
                <FileX2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>徹底清空旗下所有角色的每週討伐進度與結晶/碎片紀錄。</span>
              </li>
            </ul>
          </div>

          <div className="text-[11px] text-center font-black text-rose-600 dark:text-rose-400">
            ⚠️ 此操作將永久刪除該冒險者的所有資料且無法復原！
          </div>
        </DialogBody>

        <DialogFooter className="px-5 pb-5 pt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="parchment"
            size="sm"
            disabled={isSubmitting}
            onClick={onClose}
          >
            取消
          </Button>

          <Button
            type="button"
            variant="danger"
            size="sm"
            isLoading={isSubmitting}
            onClick={handleConfirmDelete}
            className="font-black text-xs h-8"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            <span>確定永久刪除玩家</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
