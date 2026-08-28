import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/store';
import { useAlert } from '@/contexts/AlertContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { getNexonApiKey, setNexonApiKey, removeNexonApiKey, testNexonApiKey, fetchNexonCharacterInfo } from '@/services/nexon';
import { Key, ExternalLink, CheckCircle2, AlertCircle, Trash2, Eye, EyeOff, ShieldCheck, RefreshCw, Sparkles } from 'lucide-react';

interface NexonKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NexonKeyModal({ isOpen, onClose, onSuccess }: NexonKeyModalProps) {
  const { currentPlayer } = useAuth();
  const { players, savePlayersToCloud } = useStore();
  const { showAlert } = useAlert();

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; msg?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getNexonApiKey();
      setApiKey(stored);
      setTestResult(null);
    }
  }, [isOpen]);

  const handleTest = async () => {
    const clean = apiKey.trim();
    if (!clean) {
      setTestResult({ success: false, msg: '請先輸入 Nexon Open API Key！' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testNexonApiKey(clean);
    setIsTesting(false);

    if (res.success) {
      setTestResult({ success: true, msg: '🎉 連線測試成功！API Key 有效。' });
    } else {
      setTestResult({ success: false, msg: res.error || '連線測試失敗，請檢查金鑰！' });
    }
  };

  const handleSave = () => {
    const clean = apiKey.trim();
    if (!clean) {
      setTestResult({ success: false, msg: '請輸入金鑰後再儲存！' });
      return;
    }

    setNexonApiKey(clean);
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  const handleClear = () => {
    removeNexonApiKey();
    setApiKey('');
    setTestResult({ success: true, msg: '已清除本機儲存的 Nexon API Key。' });
  };

  // 一鍵同步當前玩家所有角色
  const handleSyncCurrentPlayerChars = async () => {
    const cleanKey = apiKey.trim() || getNexonApiKey();
    if (!cleanKey) {
      setTestResult({ success: false, msg: '請先輸入並儲存 Nexon API Key！' });
      return;
    }

    if (!currentPlayer || !currentPlayer.characters || currentPlayer.characters.length === 0) {
      showAlert({ title: '無角色可同步', message: '目前登入的玩家尚未建立任何角色！', type: 'info' });
      return;
    }

    setIsSyncingAll(true);
    let updatedCount = 0;
    const failedNames: string[] = [];

    try {
      setNexonApiKey(cleanKey);
      const updatedChars = [...currentPlayer.characters];

      for (let i = 0; i < updatedChars.length; i++) {
        const char = updatedChars[i];
        try {
          if (i > 0) { await new Promise((r) => setTimeout(r, 600)); }
          const info = await fetchNexonCharacterInfo(char.name, cleanKey, char.ocid);
          if (info && info.characterImage) {
            updatedChars[i] = {
              ...char,
              characterImage: info.characterImage,
              ocid: info.ocid || char.ocid,
            };
            updatedCount++;
          } else {
            failedNames.push(char.name);
          }
        } catch {
          failedNames.push(char.name);
        }
      }

      if (updatedCount > 0) {
        const nextPlayers = players.map((p) => {
          if (p.name === currentPlayer.name) {
            return {
              ...p,
              characters: updatedChars,
            };
          }
          return p;
        });
        await savePlayersToCloud(nextPlayers);

        showAlert({
          title: '全角色立繪同步成功',
          message: `🎉 已成功為「${currentPlayer.name}」旗下的 ${updatedCount} 隻角色更新官方最新高清立繪！`,
          type: 'success',
        });
        onClose();
      } else {
        setTestResult({ success: false, msg: '未能從 Nexon 獲取角色資料，請確認角色名稱是否正確。' });
      }
    } catch (err: any) {
      setTestResult({ success: false, msg: err?.message || '同步失敗，請檢查網路或金鑰。' });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const currentCharCount = currentPlayer?.characters?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            <Key className="w-5 h-5 text-amber-500" />
            <span>Nexon Open API 金鑰設定</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* 安全說明條 */}
          <div className="p-3 rounded-2xl bg-amber-400/10 border-2 border-amber-400/40 flex items-start gap-2.5 text-xs text-[#4A3B2C] dark:text-amber-200">
            <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-black text-sm">🔒 隱私與本機儲存保護</div>
              <p className="leading-relaxed opacity-90">
                您的 Nexon API Key <strong>僅會儲存在您目前的這台瀏覽器 (localStorage) 中</strong>，用於向 Nexon 官方伺服器自動抓取角色最新立繪，<strong>絕不會上傳或共享至任何後端資料庫</strong>。
              </p>
            </div>
          </div>

          {/* 30 秒申請指引 */}
          <div className="p-3.5 bg-black/5 dark:bg-black/25 rounded-2xl border-2 border-slate-300 dark:border-slate-700 space-y-2.5 text-xs">
            <div className="flex items-center justify-between font-black text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <span>📖 如何在 30 秒內免費獲取 Key？</span>
              </span>
              <a
                href="https://openapi.nexon.com/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline font-bold"
              >
                <span>前往 Nexon 開發者中心</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <ol className="list-decimal list-inside space-y-1 text-stone-600 dark:text-slate-300 font-medium leading-relaxed pl-1">
              <li>登入 Nexon 帳號並進入 <strong>「My Application」</strong>。</li>
              <li>點擊 <strong>「API Key 申請」</strong> ➔ 選擇 <strong>「新楓之谷 (MapleStory)」</strong>。</li>
              <li>複製產生的金鑰（以 <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-black/40 font-mono text-[11px]">live_</code> 或 <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-black/40 font-mono text-[11px]">test_</code> 開頭）。</li>
              <li>將金鑰貼至下方輸入框並點擊儲存！</li>
            </ol>
          </div>

          {/* 輸入框 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Nexon Open API Key
            </label>
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder="貼上您的 Nexon API Key (test_... 或 live_...)"
                className="w-full pl-3 pr-20 py-2 text-xs font-mono rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title={showKey ? '隱藏金鑰' : '顯示金鑰'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* 當前登入者一鍵批次同步卡片 */}
          {currentPlayer && currentCharCount > 0 && (
            <div className="p-3 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="font-black text-xs text-[#3E2F20] dark:text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>批次同步【{currentPlayer.name}】全角色立繪</span>
                </div>
                <div className="text-[11px] text-stone-500 dark:text-slate-400 truncate">
                  名下共 {currentCharCount} 隻角色，一鍵同步官方最新立繪
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={handleSyncCurrentPlayerChars}
                isLoading={isSyncingAll}
                className="text-xs shrink-0 h-8"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>立即全體同步</span>
              </Button>
            </div>
          )}

          {/* 測試結果狀態列 */}
          {testResult && (
            <div
              className={
                testResult.success
                  ? 'p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                  : 'p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold bg-red-500/15 border-red-500 text-red-600 dark:text-red-400'
              }
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{testResult.msg}</span>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <div>
            {getNexonApiKey() && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-red-500 hover:bg-red-500/10 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清除儲存</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="parchment"
              size="sm"
              onClick={handleTest}
              isLoading={isTesting}
              className="text-xs"
            >
              連線測試
            </Button>
            <Button
              type="button"
              variant="gold"
              size="md"
              onClick={handleSave}
              className="text-xs"
            >
              儲存至瀏覽器
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
