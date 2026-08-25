import { useState, FormEvent } from 'react';
import { Guest, StoreData } from '@/types/party';
import { Button } from '@/components/ui/Button';
import { useAlert } from '@/contexts/AlertContext';
import { Users, UserPlus, Trash2 } from 'lucide-react';

interface GuestSectionProps {
  guests: Guest[];
  store: StoreData;
  onAddGuest: (name: string) => Promise<any>;
  onDeleteGuest: (guestId: string) => Promise<any>;
}

export function GuestSection({ guests = [], store, onAddGuest, onDeleteGuest }: GuestSectionProps) {
  const { showConfirm } = useAlert();
  const [nameInput, setNameInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const clean = nameInput.trim();
    if (!clean) return;
    setIsAdding(true);
    try {
      await onAddGuest(clean);
      setNameInput('');
    } finally {
      setIsAdding(false);
    }
  };

  const getTeamCount = (guestId: string): number => {
    let count = 0;
    Object.values(store.teams || {}).forEach((team) => {
      if (team.memberTargets?.some((t) => t.charId === guestId)) {
        count += 1;
      }
    });
    return count;
  };

  return (
    <div id="guest-section" className="parchment-card rounded-2xl border-3 border-kerning-stroke p-4 sm:p-5 my-8 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#D4B982] dark:border-slate-700">
        <div>
          <div className="font-black text-base sm:text-lg text-[#3E2F20] dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>👥 臨時隊友名冊 (Guest)</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            非固定常駐成員，可加入各 BOSS 隊伍協助平分結晶與艾里溫碎片收益。
          </p>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="臨時隊友暱稱"
            className="px-3 py-1.5 text-xs rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            maxLength={15}
          />
          <Button type="submit" size="sm" variant="gold" isLoading={isAdding} className="shrink-0">
            <UserPlus className="w-3.5 h-3.5" />
            <span>新增</span>
          </Button>
        </form>
      </div>

      <div className="mt-4">
        {guests.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {guests.map((g) => {
              const count = getTeamCount(g.id);
              return (
                <div
                  key={g.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border-2 border-kerning-stroke bg-[#FFFDF9] dark:bg-slate-800 shadow-sm"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-black text-xs text-[#3E2F20] dark:text-slate-100 truncate">
                      {g.name}
                    </div>
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                      參與 {count} 隊
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label={`刪除臨時隊友 ${g.name}`}
                    onClick={async () => {
                      const ok = await showConfirm({
                        title: '刪除臨時隊友',
                        message: `確定要刪除臨時隊友「${g.name}」嗎？這將會同步將他從所有參與的隊伍中移除。`,
                        isDanger: true,
                        confirmText: '確定刪除',
                      });
                      if (ok) onDeleteGuest(g.id);
                    }}
                    className="w-6 h-6 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            目前名冊中無臨時隊友
          </div>
        )}
      </div>
    </div>
  );
}
