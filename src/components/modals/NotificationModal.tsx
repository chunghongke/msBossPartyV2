import { useState, ChangeEvent } from 'react';
import { useNotif } from '@/contexts/NotifContext';
import { useStore } from '@/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useAlert } from '@/contexts/AlertContext';
import { playNotificationChime, stopNotificationChime, saveCustomAudioBlob } from '@/services/audio';
import { Bell, Volume2, Play, Square, Clock } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const { showAlert } = useAlert();
  const { settings, updateSettings, requestPermission, testSendNotification, getTeamEffectiveSchedule } = useNotif();
  const { store, getCharName } = useStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [customFileName, setCustomFileName] = useState(settings.customAudioName || '');

  const handlePlayTest = async () => {
    setIsPlaying(true);
    await playNotificationChime(settings.chimeType, settings.volume);
    setTimeout(() => setIsPlaying(false), 4000);
  };

  const handleStopTest = () => {
    stopNotificationChime();
    setIsPlaying(false);
  };

  const handleUploadAudio = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const savedName = await saveCustomAudioBlob(file);
    setCustomFileName(savedName);
    updateSettings({
      chimeType: 'custom',
      customAudioName: savedName,
    });
  };

  const daysOfWeek = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

  const allScheduledTeams = Object.values(store.teams || {}).map((t) => ({
    team: t,
    schedule: getTeamEffectiveSchedule(t),
  })).filter((item) => item.schedule !== null);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            <Bell className="w-5 h-5 text-amber-300" />
            <span>出團排程與推播提醒設定</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4 max-h-[72vh]">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30">
            <div>
              <div className="font-black text-sm text-[#3E2F20] dark:text-slate-100">
                出團自動鈴聲推播提醒
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                當隊伍排定時間即將到來時，自動跳出系統通知並播放鈴聲。
              </div>
            </div>

            <Button
              size="sm"
              variant={settings.enabled ? 'green' : 'parchment'}
              onClick={async () => {
                if (!settings.enabled) {
                  const ok = await requestPermission();
                  if (!ok) {
                    showAlert({ title: '權限提示', message: '請在瀏覽器設定中允許通知權限，才能即時接收出團提醒！', type: 'warning' });
                  }
                } else {
                  updateSettings({ enabled: false });
                }
              }}
            >
              {settings.enabled ? '已啟用' : '點擊啟用'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                提前提醒時間
              </label>
              <select
                value={settings.advanceMinutes}
                onChange={(e) => updateSettings({ advanceMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
              >
                <option value={0}>準時 (0 分鐘前)</option>
                <option value={5}>提前 5 分鐘</option>
                <option value={10}>提前 10 分鐘</option>
                <option value={15}>提前 15 分鐘</option>
                <option value={30}>提前 30 分鐘</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                提醒音效選擇
              </label>
              <select
                value={settings.chimeType}
                onChange={(e) => updateSettings({ chimeType: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
              >
                <option value="short">短鈴聲 (chime_short)</option>
                <option value="long">長鈴聲 (chime_long)</option>
                <option value="synth">✨ 水晶琶音合成音效</option>
                <option value="custom">📁 本地自訂 MP3 音訊</option>
              </select>
            </div>
          </div>

          {settings.chimeType === 'custom' && (
            <div className="p-3 bg-black/5 dark:bg-black/25 rounded-xl border border-slate-300 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>自訂 MP3 鈴聲檔案</span>
                <span className="text-[10px] text-slate-400">永久儲存於瀏覽器 IndexedDB</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleUploadAudio}
                  className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                />
              </div>
              {customFileName && (
                <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1">
                  目前音效：{customFileName}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5" />
                <span>提醒音量 ({Math.round(settings.volume * 100)}%)</span>
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
              className="w-full h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            {isPlaying ? (
              <Button type="button" size="sm" variant="danger" onClick={handleStopTest} className="text-xs">
                <Square className="w-3.5 h-3.5" />
                <span>停止播放</span>
              </Button>
            ) : (
              <Button type="button" size="sm" variant="parchment" onClick={handlePlayTest} className="text-xs">
                <Play className="w-3.5 h-3.5" />
                <span>試聽鈴聲</span>
              </Button>
            )}

            <Button type="button" size="sm" variant="gold" onClick={testSendNotification} className="text-xs">
              <Bell className="w-3.5 h-3.5" />
              <span>發送測試推播</span>
            </Button>
          </div>

          {allScheduledTeams.length > 0 && (
            <div className="pt-2 border-t border-slate-300 dark:border-slate-700">
              <div className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-500" />
                <span>全小隊本週出團時間表：</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {allScheduledTeams.map(({ team, schedule }) => (
                  <div
                    key={team.id}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="font-bold text-[#3E2F20] dark:text-slate-100 truncate">
                      {(team.memberTargets || (team.memberCharIds || []).map((id) => ({ charId: id, entryIndex: 1 }))).map((m) => getCharName(m.charId)).join('、')}
                    </div>
                    <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 font-fredoka font-black text-[11px] shrink-0">
                      {daysOfWeek[schedule!.dayOfWeek]} {schedule!.timeStr}
                      {schedule!.isTemp && ' (本週)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="parchment" size="sm" onClick={onClose}>
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
