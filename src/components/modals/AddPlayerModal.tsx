import { useState, FormEvent } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { hashPassword } from '@/services/crypto';
import { UserPlus, AlertCircle } from 'lucide-react';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddPlayerModal({ isOpen, onClose }: AddPlayerModalProps) {
  const { players, addPlayer } = useStore();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍁');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('請輸入玩家名稱！');
      return;
    }

    if (players.some((p) => p.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      setErrorMsg('此玩家名稱已存在！');
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
      await addPlayer({
        name: cleanName,
        avatarEmoji: emoji || '👤',
        passwordHash: passHash,
        isAdmin: false,
        characters: [],
      });

      setName('');
      setPassword('');
      setConfirmPassword('');
      setEmoji('🍁');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || '建立玩家失敗！');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <UserPlus className="w-5 h-5" />
            <span>新增小隊冒險者玩家</span>
          </DialogTitle>
        </DialogHeader>

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
              />
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

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                代表 Emoji
              </label>
              <EmojiPicker value={emoji} onChange={setEmoji} />
            </div>

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
              <span>建立玩家</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
