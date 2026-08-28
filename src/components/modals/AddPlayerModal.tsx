import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, FormEvent } from 'react';
import { useStore } from '@/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { hashPassword } from '@/services/crypto';
import { UserPlus, AlertCircle, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { Player } from '@/types/player';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: (playerName: string) => void;
}

export function AddPlayerModal({ isOpen, onClose, onSwitchToLogin }: AddPlayerModalProps) {
  const { players, addPlayer } = useStore();
  const { currentPlayer, login } = useAuth();
  const isMandatory = !currentPlayer;

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍁');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 建立成功後續狀態 (詢問是否切換登入)
  const [createdPlayer, setCreatedPlayer] = useState<Player | null>(null);

  // 當視窗開啟或重置時清除狀態
  useEffect(() => {
    if (isOpen) {
      setName('');
      setEmoji('🍁');
      setPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      setIsSubmitting(false);
      setCreatedPlayer(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('請輸入玩家名稱！');
      return;
    }

    if (players.some((p) => p.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      setErrorMsg('此玩家名稱已存在，請使用其他暱稱！');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMsg('請設定至少 4 碼登入密碼以保護帳號！');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('兩次輸入的密碼不一致！');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const passHash = await hashPassword(password.trim());
      const newPlayer: Player = {
        name: cleanName,
        avatarEmoji: emoji || '👤',
        passwordHash: passHash,
        isAdmin: players.length === 0, // 小隊第一位建立者自動為管理員
        characters: [],
      };

      await addPlayer(newPlayer);

      // 若為未登入訪客 (isMandatory)，直接自動登入並關閉
      if (!currentPlayer) {
        await login(cleanName, password.trim(), [...players, newPlayer]);
        onClose();
        return;
      }

      // 若為管理員登入中建立新隊員，進入成功確認詢問步驟
      setCreatedPlayer(newPlayer);
    } catch (err: any) {
      setErrorMsg(err?.message || '建立玩家失敗！');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-md" hideCloseButton={isMandatory}>
        <DialogHeader>
          <DialogTitle>
            {createdPlayer ? (
              <>
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span>玩家身分建立成功</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5 text-amber-500" />
                <span>新增小隊冒險者玩家</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {createdPlayer ? (
          /* ========================================================
             步驟 2：建立成功卡片 & 詢問是否切換登入
             ======================================================== */
          <div className="py-4 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 border-2 border-amber-600 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20">
                {createdPlayer.avatarEmoji || '🍁'}
              </div>
              <div className="space-y-1">
                <div className="text-base font-black text-[#3E2F20] dark:text-slate-100 flex items-center justify-center gap-1.5">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                  <span>已成功建立玩家「{createdPlayer.name}」！</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-slate-300 font-bold">
                  新隊員已正式加入小隊名冊。您要切換登入為該玩家，還是維持目前的管理員身分？
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="parchment"
                size="md"
                onClick={onClose}
                className="w-full sm:w-auto text-xs"
              >
                <span>維持目前管理員身分</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  if (onSwitchToLogin) {
                    onSwitchToLogin(createdPlayer.name);
                  } else {
                    onClose();
                  }
                }}
                className="w-full sm:w-auto text-xs font-bold"
              >
                <span>切換為「{createdPlayer.name}」登入</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        ) : (
          /* ========================================================
             步驟 1：填寫玩家資料表單
             ======================================================== */
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-3.5 max-h-[72vh]">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  玩家名稱 (暱稱) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="例如：小楓、阿豪"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  required
                  maxLength={20}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  代表 Emoji 頭像
                </label>
                <EmojiPicker value={emoji} onChange={setEmoji} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  設定登入密碼 (至少 4 碼) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="請輸入至少 4 碼密碼"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  required
                  minLength={4}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  再次確認密碼 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="請再次輸入相同密碼"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  required
                  minLength={4}
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500 text-xs text-red-500 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="parchment"
                size="sm"
                onClick={onClose}
              >
                取消
              </Button>
              <Button type="submit" variant="gold" size="md" isLoading={isSubmitting}>
                <Check className="w-4 h-4 mr-1" />
                <span>建立玩家</span>
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
