import { useState } from 'react';
import { useGroup } from '@/contexts/GroupContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useAlert } from '@/contexts/AlertContext';
import { Users, Plus, Share2, Trash2, Check } from 'lucide-react';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateNew: () => void;
}

export function GroupModal({ isOpen, onClose, onOpenCreateNew }: GroupModalProps) {
  const { activeGroup, savedGroups, switchGroup, removeGroup, generateInviteLink } = useGroup();
  const { showConfirm, showPrompt } = useAlert();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (group: any) => {
    const link = generateInviteLink(group);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(group.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showPrompt({ title: '複製邀請連結', message: '請手動複製以下邀請連結：', defaultValue: link });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Users className="w-5 h-5" />
            <span>小隊群組切換與管理</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            您可在多個冒險小隊之間隨時無縫切換，每個小隊享有獨立的 Firebase 免費資料庫。
          </div>

          <div className="space-y-2">
            {savedGroups.map((group) => {
              const isActive = activeGroup?.id === group.id;

              return (
                <div
                  key={group.id}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center justify-between gap-2 ${
                    isActive
                      ? 'bg-amber-500/15 border-amber-500 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:border-amber-400'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      switchGroup(group.id);
                      onClose();
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-[#3E2F20] dark:text-slate-100 truncate">
                        {group.name}
                      </span>
                      {isActive && (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-500 text-slate-900">
                          目前連線
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                      專案：{group.firebaseConfig?.projectId || 'Firebase'}
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopy(group)}
                      className="w-8 h-8"
                      title="複製邀請連結"
                    >
                      {copiedId === group.id ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Share2 className="w-4 h-4 text-slate-500" />
                      )}
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        const ok = await showConfirm({
                          title: '移除小隊',
                          message: `確定要從本機清單移除小隊「${group.name}」嗎？這不會刪除 Firebase 雲端資料庫。`,
                          isDanger: true,
                          confirmText: '確定移除',
                        });
                        if (ok) removeGroup(group.id);
                      }}
                      className="w-8 h-8 text-red-500 hover:bg-red-500/10"
                      title="移除小隊"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="gold"
            size="md"
            onClick={() => {
              onClose();
              onOpenCreateNew();
            }}
            className="w-full mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>建立或加入另一個小隊</span>
          </Button>
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
