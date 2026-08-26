import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { hashPassword } from '@/services/crypto';
import { UserCheck, KeyRound, LogOut, ShieldAlert, Crown, Check, ShieldCheck, UserPlus } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddPlayerModal?: () => void;
}

export function AuthModal({ isOpen, onClose, onOpenAddPlayerModal }: AuthModalProps) {
  const { currentPlayer, isAdmin, login, logout } = useAuth();
  const { players, updatePlayer } = useStore();

  const [selectedPlayerName, setSelectedPlayerName] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoginSuccess, setIsLoginSuccess] = useState(false);

  // 修改密碼相關
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // 隊長重設隊員密碼
  const [isAdminResetting, setIsAdminResetting] = useState(false);
  const [resetTargetName, setResetTargetName] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');

  // 當彈窗開啟或玩家清單更新時，自動對齊選中的玩家
  useEffect(() => {
    if (isOpen && players.length > 0) {
      if (!selectedPlayerName || !players.some((p) => p.name === selectedPlayerName)) {
        setSelectedPlayerName(currentPlayer?.name || players[0]?.name || '');
      }
      setPasswordInput('');
      setErrorMsg('');
      setSuccessMsg('');
      setIsLoginSuccess(false);
      setIsChangingPass(false);
      setIsAdminResetting(false);
    }
  }, [isOpen, currentPlayer, players]);

  const targetPlayer = players.find((p) => p.name === selectedPlayerName);
  const hasPassword = Boolean(targetPlayer?.passwordHash);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedPlayerName) {
      setErrorMsg('請選擇要登入的玩家！');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await login(selectedPlayerName, passwordInput, players);
      if (!res.success) {
        setErrorMsg(res.error || '登入失敗！請確認密碼是否正確。');
        return;
      }
      
      // 登入成功：顯示立體成功彈窗並停留 1 秒 (1000ms)
      setIsLoginSuccess(true);
      setTimeout(() => {
        setIsLoginSuccess(false);
        onClose();
      }, 1000);
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
      setSuccessMsg('已為隊員「' + target.name + '」重設密碼成功！');
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
            <UserCheck className="w-5 h-5 text-amber-500" />
            <span>{isMandatory ? '🍁 歡迎！請登入或建立玩家身分' : '玩家身分登入與切換'}</span>
          </DialogTitle>
          {isMandatory && (
            <p className="text-xs text-stone-600 dark:text-slate-300 font-bold mt-1 text-left">
              👋 進入小隊前請先選擇您的玩家帳號登入，或點擊下方「建立新玩家身分」加入小隊。
            </p>
          )}
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* 登入成功專屬動畫彈窗 (停留 1 秒) */}
          {isLoginSuccess ? (
            <div className="py-8 px-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 animate-ping opacity-40" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 border-3.5 border-kerning-stroke flex items-center justify-center shadow-xl text-4xl">
                  {targetPlayer?.avatarEmoji || '🍁'}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-2xl">
                  <Check className="w-7 h-7 stroke-[3]" />
                  <span>登入成功！</span>
                </div>
                <p className="text-sm font-bold text-[#3E2F20] dark:text-slate-200">
                  歡迎回來，冒險者 <strong className="text-amber-600 dark:text-amber-400 font-black">{selectedPlayerName}</strong>！
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* 目前登入狀態膠囊 */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-lg shadow-inner">
                    {currentPlayer?.avatarEmoji || '👤'}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-stone-500 dark:text-slate-400">目前登入玩家</div>
                    <div className="font-black text-sm text-[#3E2F20] dark:text-slate-100 flex items-center gap-1">
                      <span>{currentPlayer?.name || '尚未登入'}</span>
                      {isAdmin && <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
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
                <form onSubmit={handleLogin} className="space-y-3.5">
                  {players.length > 0 ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          選擇要登入 / 切換的玩家 <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedPlayerName}
                          onChange={(e) => {
                            setSelectedPlayerName(e.target.value);
                            setPasswordInput('');
                            setErrorMsg('');
                            setSuccessMsg('');
                          }}
                          className="w-full px-3 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500 shadow-xs"
                        >
                          {players.map((p) => (
                            <option key={p.name} value={p.name}>
                              {p.avatarEmoji || '👤'} {p.name} {p.isAdmin ? '👑 (管理員)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {hasPassword ? (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            輸入登入密碼 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            value={passwordInput}
                            onChange={(e) => {
                              setPasswordInput(e.target.value);
                              setErrorMsg('');
                            }}
                            placeholder="請輸入此玩家的密碼 (至少4碼)"
                            className="w-full px-3 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 shadow-xs"
                            required
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs text-[#5C3E14] dark:text-amber-300 font-bold">
                          💡 此玩家尚未設定密碼，可直接點擊下方按鈕登入。登入後可隨時補設密碼保護。
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                      小隊目前尚無任何玩家，請先建立新玩家！
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

                  <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {onOpenAddPlayerModal && (
                        <Button
                          type="button"
                          variant="parchment"
                          size="sm"
                          onClick={() => {
                            onClose();
                            onOpenAddPlayerModal();
                          }}
                          className="text-xs h-8"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>我是新隊員</span>
                        </Button>
                      )}

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

                    {players.length > 0 && (
                      <Button type="submit" variant="gold" size="md" isLoading={isSubmitting} className="ml-auto">
                        <span>確認登入</span>
                      </Button>
                    )}
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
                      placeholder="輸入新密碼"
                      className="w-full px-3 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                      required
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
                      placeholder="再次輸入新密碼"
                      className="w-full px-3 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

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
                    <Button
                      type="button"
                      variant="parchment"
                      size="sm"
                      onClick={() => {
                        setIsChangingPass(false);
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                    >
                      返回
                    </Button>
                    <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
                      <span>儲存密碼</span>
                    </Button>
                  </div>
                </form>
              )}

              {isAdminResetting && (
                <form onSubmit={handleAdminResetPassword} className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-700 dark:text-purple-300 font-bold">
                    👑 隊長特權：您可以為忘記密碼的隊員設定新的登入密碼。
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      選擇要重設密碼的隊員
                    </label>
                    <select
                      value={resetTargetName}
                      onChange={(e) => setResetTargetName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                    >
                      {players
                        .filter((p) => p.name !== currentPlayer?.name)
                        .map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.avatarEmoji || '👤'} {p.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      輸入為隊員指定的新密碼 (至少 4 碼) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      placeholder="輸入為該隊員設定的新密碼"
                      className="w-full px-3 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

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
                    <Button
                      type="button"
                      variant="parchment"
                      size="sm"
                      onClick={() => {
                        setIsAdminResetting(false);
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                    >
                      返回
                    </Button>
                    <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
                      <span>確認重設隊員密碼</span>
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </DialogBody>

        {!isLoginSuccess && (
          <DialogFooter>
            {!isMandatory && (
              <Button type="button" variant="parchment" size="sm" onClick={onClose}>
                關閉
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
