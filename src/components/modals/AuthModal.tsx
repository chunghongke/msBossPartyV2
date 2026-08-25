import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { hashPassword } from '@/services/crypto';
import { UserCheck, KeyRound, LogOut, ShieldAlert, Crown, Check, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { currentPlayer, isAdmin, login, logout } = useAuth();
  const { players, updatePlayer } = useStore();

  const [selectedPlayerName, setSelectedPlayerName] = useState<string>(currentPlayer?.name || (players[0]?.name ?? ''));
  const [passwordInput, setPasswordInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 修改密碼相關
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // 隊長重設隊員密碼
  const [isAdminResetting, setIsAdminResetting] = useState(false);
  const [resetTargetName, setResetTargetName] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');

  const targetPlayer = players.find((p) => p.name === selectedPlayerName);
  const hasPassword = Boolean(targetPlayer?.passwordHash);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const res = await login(selectedPlayerName, passwordInput, players);
      if (!res.success) {
        setErrorMsg(res.error || '登入失敗！請確認密碼是否正確。');
        return;
      }
      setSuccessMsg('身分驗證成功！');
      setTimeout(() => {
        onClose();
      }, 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPlayer) return;

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('新密碼長度至少需要 4 碼！');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('兩次輸入的新密碼不一致！');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const hash = await hashPassword(newPassword.trim());
      await updatePlayer({
        ...currentPlayer,
        passwordHash: hash,
      });
      setSuccessMsg('密碼更新成功！');
      setIsChangingPass(false);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setErrorMsg(err?.message || '更新密碼失敗！');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    const target = players.find((p) => p.name === resetTargetName);
    if (!target) return;

    if (!adminNewPassword || adminNewPassword.length < 4) {
      setErrorMsg('重設密碼長度至少需要 4 碼！');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const hash = await hashPassword(adminNewPassword.trim());
      await updatePlayer({
        ...target,
        passwordHash: hash,
      });
      setSuccessMsg(`已為隊員「${target.name}」重設密碼成功！`);
      setIsAdminResetting(false);
      setAdminNewPassword('');
    } catch (err: any) {
      setErrorMsg(err?.message || '重設密碼失敗！');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <UserCheck className="w-5 h-5" />
            <span>玩家身分切換與驗證</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentPlayer?.avatarEmoji || '👤'}</span>
              <div>
                <div className="text-[10px] font-bold text-slate-400">目前登入玩家</div>
                <div className="font-black text-sm text-[#3E2F20] dark:text-slate-100 flex items-center gap-1">
                  <span>{currentPlayer?.name || '尚未登入'}</span>
                  {isAdmin && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                </div>
              </div>
            </div>

            {currentPlayer && (
              <Button size="sm" variant="parchment" onClick={logout} className="h-7 text-xs">
                <LogOut className="w-3.5 h-3.5" />
                <span>登出</span>
              </Button>
            )}
          </div>

          {!isChangingPass && !isAdminResetting && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  選擇要切換的玩家
                </label>
                <select
                  value={selectedPlayerName}
                  onChange={(e) => {
                    setSelectedPlayerName(e.target.value);
                    setPasswordInput('');
                    setErrorMsg('');
                  }}
                  className="w-full px-3 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                >
                  {players.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.avatarEmoji || '👤'} {p.name} {p.isAdmin ? '👑 (隊長)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {hasPassword && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    輸入登入密碼 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="請輸入密碼"
                    className="w-full px-3 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              )}

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500 text-xs text-red-500 font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500 text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentPlayer && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingPass(true);
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>修改密碼</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminResetting(true);
                        setResetTargetName(players.find((p) => p.name !== currentPlayer?.name)?.name || '');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>隊長重設隊員密碼</span>
                    </button>
                  )}
                </div>

                <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} className="ml-auto">
                  <span>確認切換</span>
                </Button>
              </div>
            </form>
          )}

          {isChangingPass && (
            <form onSubmit={handleSaveNewPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  設定 {currentPlayer?.name} 的新密碼 (至少 4 碼) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="請輸入至少 4 碼新密碼"
                  className="w-full px-3 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  required
                  minLength={4}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  再次確認新密碼 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="請再次輸入相同新密碼"
                  className="w-full px-3 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  required
                  minLength={4}
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500 text-xs text-red-500 font-bold">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <Button type="button" variant="parchment" size="sm" onClick={() => setIsChangingPass(false)}>
                  取消
                </Button>
                <Button type="submit" variant="gold" size="md" isLoading={isSubmitting}>
                  儲存新密碼
                </Button>
              </div>
            </form>
          )}

          {isAdminResetting && (
            <form onSubmit={handleAdminResetPassword} className="space-y-3">
              <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span>隊長特權：為忘記密碼的隊員直接設定新密碼</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  選擇要重設密碼的隊員
                </label>
                <select
                  value={resetTargetName}
                  onChange={(e) => setResetTargetName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                >
                  {players.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.avatarEmoji || '👤'} {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  為該隊員設定新密碼 (至少 4 碼) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  placeholder="輸入至少 4 碼新密碼"
                  className="w-full px-3 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                  minLength={4}
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500 text-xs text-red-500 font-bold">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <Button type="button" variant="parchment" size="sm" onClick={() => setIsAdminResetting(false)}>
                  取消
                </Button>
                <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
                  確認重設隊員密碼
                </Button>
              </div>
            </form>
          )}
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
