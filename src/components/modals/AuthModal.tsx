import { useState, useEffect, useRef, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { hashPassword } from '@/services/crypto';
import { UserCheck, KeyRound, LogOut, ShieldAlert, Crown, Check, UserPlus, ArrowLeft } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddPlayerModal?: () => void;
  preselectedPlayerName?: string;
}

type AuthMode = 'login' | 'register' | 'change_password' | 'admin_reset';

export function AuthModal({ isOpen, onClose, preselectedPlayerName }: AuthModalProps) {
  const { currentPlayer, isAdmin, login, logout } = useAuth();
  const { players, addPlayer, updatePlayer } = useStore();

  const [mode, setMode] = useState<AuthMode>('login');

  // 登入狀態
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');

  // 註冊 (新隊員) 狀態
  const [regName, setRegName] = useState('');
  const [regEmoji, setRegEmoji] = useState('🍁');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // 修改密碼相關
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // 隊長重設隊員密碼
  const [resetTargetName, setResetTargetName] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');

  // 通用狀態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoginSuccess, setIsLoginSuccess] = useState(false);
  const [successUserName, setSuccessUserName] = useState('');
  const [successEmoji, setSuccessEmoji] = useState('🍁');

  const isMandatory = !currentPlayer;

  const prevIsOpen = useRef(false);

  const selectablePlayers = currentPlayer
    ? players.filter((p) => p.name !== currentPlayer.name)
    : players;

  // 彈窗開啟或雲端玩家資料同步時，確保模式與選擇狀態正確
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      prevIsOpen.current = true;
      setPasswordInput('');
      setRegName('');
      setRegEmoji('🍁');
      setRegPassword('');
      setRegConfirmPassword('');
      setErrorMsg('');
      setSuccessMsg('');
      setIsLoginSuccess(false);
    } else if (!isOpen) {
      prevIsOpen.current = false;
    }

    if (isOpen) {
      if (preselectedPlayerName && players.some((p) => p.name === preselectedPlayerName)) {
        setSelectedPlayerName(preselectedPlayerName);
      } else if (!selectedPlayerName || !selectablePlayers.some((p) => p.name === selectedPlayerName)) {
        if (selectablePlayers.length > 0) {
          setSelectedPlayerName(selectablePlayers[0].name);
        } else {
          setSelectedPlayerName('');
        }
      }
    }
  }, [isOpen, selectablePlayers, selectedPlayerName, preselectedPlayerName, players]);

  const targetPlayer = players.find((p) => p.name === selectedPlayerName);
  const hasPassword = Boolean(targetPlayer?.passwordHash);

  // 1. 處理既有玩家登入
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

      setSuccessUserName(selectedPlayerName);
      setSuccessEmoji(targetPlayer?.avatarEmoji || '🍁');
      setIsLoginSuccess(true);

      setTimeout(() => {
        setIsLoginSuccess(false);
        onClose();
      }, 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. 處理新隊員註冊並直接登入
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    const cleanName = regName.trim();
    if (!cleanName) {
      setErrorMsg('請輸入玩家暱稱！');
      return;
    }

    if (players.some((p) => p.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      setErrorMsg('此玩家名稱已存在，請使用其他暱稱！');
      return;
    }

    if (!regPassword || regPassword.length < 4) {
      setErrorMsg('請設定至少 4 碼登入密碼以保護帳號！');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('兩次輸入的密碼不一致！');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const passHash = await hashPassword(regPassword.trim());
      const newPlayer = {
        name: cleanName,
        avatarEmoji: regEmoji || '👤',
        passwordHash: passHash,
        isAdmin: players.length === 0, // 小隊第一位成員自動為管理員
        characters: [],
      };

      await addPlayer(newPlayer);
      await login(cleanName, regPassword.trim(), [...players, newPlayer]);

      setSuccessUserName(cleanName);
      setSuccessEmoji(regEmoji || '🍁');
      setIsLoginSuccess(true);

      setTimeout(() => {
        setIsLoginSuccess(false);
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err?.message || '建立玩家失敗！');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. 處理修改自己的密碼
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
      setTimeout(() => {
        setMode('login');
        setNewPassword('');
        setConfirmNewPassword('');
        setSuccessMsg('');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message || '更新密碼失敗！');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. 管理員重設隊員密碼
  const handleAdminResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    const target = players.find((p) => p.name === resetTargetName);
    if (!target) {
      setErrorMsg('找不到目標玩家！');
      return;
    }

    if (!adminNewPassword || adminNewPassword.length < 4) {
      setErrorMsg('請輸入至少 4 碼的新密碼！');
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
      setTimeout(() => {
        setMode('login');
        setAdminNewPassword('');
        setSuccessMsg('');
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || '重設密碼失敗！');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!isMandatory && !open) {
          onClose();
        }
      }}
    >
      <DialogContent
        maxWidthClass="max-w-md"
        hideCloseButton={isMandatory}
        onPointerDownOutside={(e) => {
          if (isMandatory) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isMandatory) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'register' ? (
              <>
                <UserPlus className="w-5 h-5 text-amber-500" />
                <span>我是新隊員：建立玩家身分</span>
              </>
            ) : mode === 'change_password' ? (
              <>
                <KeyRound className="w-5 h-5 text-amber-500" />
                <span>修改登入密碼</span>
              </>
            ) : mode === 'admin_reset' ? (
              <>
                <Crown className="w-5 h-5 text-yellow-500" />
                <span>👑 管理員重設隊員密碼</span>
              </>
            ) : (
              <>
                <UserCheck className="w-5 h-5 text-amber-500" />
                <span>{isMandatory ? '🍁 歡迎！請登入或建立玩家身分' : '切換玩家身分 / 登入'}</span>
              </>
            )}
          </DialogTitle>
          {isMandatory && mode === 'login' && (
            <p className="text-xs text-stone-600 dark:text-slate-300 font-bold mt-1 text-left">
              👋 進入小隊前請先選擇您的玩家帳號登入，或點擊「我是新隊員」加入小隊。
            </p>
          )}
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* 登入 / 註冊成功專屬動畫彈窗 */}
          {isLoginSuccess ? (
            <div className="py-8 px-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 animate-ping opacity-40" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 border-3.5 border-kerning-stroke flex items-center justify-center shadow-xl text-4xl">
                  {successEmoji}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-2xl">
                  <Check className="w-7 h-7 stroke-[3]" />
                  <span>身分認證成功！</span>
                </div>
                <p className="text-sm font-bold text-[#3E2F20] dark:text-slate-200">
                  歡迎冒險者 <strong className="text-amber-600 dark:text-amber-400 font-black">{successUserName}</strong> 進入小隊！
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ========================================================
                  模式 A：既有玩家登入選單
                  ======================================================== */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-3.5">
                  {/* 目前登入狀態膠囊 */}
                  <div className="p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-lg shadow-inner">
                          {currentPlayer?.avatarEmoji || '👤'}
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-stone-500 dark:text-slate-400">目前登入身分</div>
                          <div className="font-black text-sm text-[#3E2F20] dark:text-slate-100 flex items-center gap-1">
                            <span>{currentPlayer?.name || '尚未登入 (訪客)'}</span>
                            {isAdmin && <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                          </div>
                        </div>
                      </div>

                      {currentPlayer && (
                        <Button
                          type="button"
                          size="sm"
                          variant="parchment"
                          onClick={() => {
                            logout();
                            setErrorMsg('');
                            setSuccessMsg('');
                          }}
                          className="h-7 text-xs"
                          title="登出當前玩家身分"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>登出</span>
                        </Button>
                      )}
                    </div>
                    {currentPlayer && (
                      <div className="text-[10.5px] text-[#5C3E14] dark:text-amber-300/90 font-bold bg-amber-500/10 px-2 py-1 rounded-lg">
                        💡 若要切換成其他隊員，請直接在下方選單選取該隊員並登入，無須先按登出。
                      </div>
                    )}
                  </div>

                  {selectablePlayers.length > 0 ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {currentPlayer ? '選擇要切換登入的隊員' : '選擇要登入的玩家'} <span className="text-red-500">*</span>
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
                          {selectablePlayers.map((p) => (
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
                            placeholder="請輸入密碼"
                            className="w-full px-3.5 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
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
                  ) : currentPlayer ? (
                    <div className="py-4 px-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-xs text-[#5C3E14] dark:text-amber-300 font-bold text-center">
                      🍁 小隊目前只有您一位隊員。若要邀請新隊友加入，可透過右上角「分享小隊」複製邀請連結發給隊友！
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                      小隊目前尚無任何玩家，請先建立新玩家身分！
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
                      {!currentPlayer && (
                        <Button
                          type="button"
                          variant="gold"
                          size="sm"
                          onClick={() => {
                            setMode('register');
                            setErrorMsg('');
                            setSuccessMsg('');
                          }}
                          className="text-xs h-8 font-bold"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>我是新隊員</span>
                        </Button>
                      )}

                      {currentPlayer && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode('change_password');
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
                            setMode('admin_reset');
                            setResetTargetName(players.find((p) => p.name !== currentPlayer?.name)?.name || '');
                            setErrorMsg('');
                            setSuccessMsg('');
                          }}
                          className="text-xs font-bold text-yellow-600 dark:text-yellow-400 hover:underline flex items-center gap-1"
                        >
                          <Crown className="w-3.5 h-3.5" />
                          <span>重設隊員密碼</span>
                        </button>
                      )}
                    </div>

                    {selectablePlayers.length > 0 && (
                      <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
                        <span>{currentPlayer ? `切換為「${selectedPlayerName}」登入` : '確認登入'}</span>
                      </Button>
                    )}
                  </div>
                </form>
              )}

              {/* ========================================================
                  模式 B：我是新隊員 (註冊新玩家身分)
                  ======================================================== */}
              {mode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-[#5C3E14] dark:text-amber-200">
                    ✨ 輸入您的遊戲暱稱與頭像表情符號，並設定專屬密碼以加入小隊！
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      玩家名稱 (暱稱) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => {
                        setRegName(e.target.value);
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
                      代表頭像 (表情符號)
                    </label>
                    <EmojiPicker value={regEmoji} onChange={setRegEmoji} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      設定登入密碼 (至少 4 碼) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
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
                      value={regConfirmPassword}
                      onChange={(e) => {
                        setRegConfirmPassword(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="請再次輸入密碼"
                      className="w-full px-3.5 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                      required
                      minLength={4}
                    />
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500 text-xs text-red-500 font-bold flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between gap-2">
                    {players.length > 0 ? (
                      <Button
                        type="button"
                        variant="parchment"
                        size="sm"
                        onClick={() => {
                          setMode('login');
                          setErrorMsg('');
                        }}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>返回登入選單</span>
                      </Button>
                    ) : <div />}

                    <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
                      <Check className="w-4 h-4" />
                      <span>建立身分並進入小隊</span>
                    </Button>
                  </div>
                </form>
              )}

              {/* ========================================================
                  模式 C：修改自己的密碼
                  ======================================================== */}
              {mode === 'change_password' && (
                <form onSubmit={handleSaveNewPassword} className="space-y-3.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-[#5C3E14] dark:text-amber-200">
                    🔒 設定 {currentPlayer?.name} 的新登入密碼（至少 4 碼）
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      輸入新密碼 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="請輸入至少 4 碼新密碼"
                      className="w-full px-3.5 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                      required
                      minLength={4}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      確認新密碼 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => {
                        setConfirmNewPassword(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="請再次輸入新密碼"
                      className="w-full px-3.5 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                      required
                      minLength={4}
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

                  <div className="pt-2 flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="parchment"
                      size="sm"
                      onClick={() => {
                        setMode('login');
                        setErrorMsg('');
                      }}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>返回</span>
                    </Button>

                    <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
                      <Check className="w-4 h-4" />
                      <span>儲存新密碼</span>
                    </Button>
                  </div>
                </form>
              )}

              {/* ========================================================
                  模式 D：管理員重設隊員密碼
                  ======================================================== */}
              {mode === 'admin_reset' && (
                <form onSubmit={handleAdminResetPassword} className="space-y-3.5">
                  <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-xs text-[#5C3E14] dark:text-yellow-200">
                    👑 您正在使用管理員權限，直接為指定隊員重設登入密碼。
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      選擇要重設密碼的隊員 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={resetTargetName}
                      onChange={(e) => {
                        setResetTargetName(e.target.value);
                        setErrorMsg('');
                      }}
                      className="w-full px-3 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500 shadow-xs"
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
                      為該隊員設定的新密碼 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={adminNewPassword}
                      onChange={(e) => {
                        setAdminNewPassword(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="請輸入至少 4 碼新密碼"
                      className="w-full px-3.5 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                      required
                      minLength={4}
                      autoFocus
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

                  <div className="pt-2 flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="parchment"
                      size="sm"
                      onClick={() => {
                        setMode('login');
                        setErrorMsg('');
                      }}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>返回</span>
                    </Button>

                    <Button type="submit" variant="danger" size="md" isLoading={isSubmitting}>
                      <Crown className="w-4 h-4" />
                      <span>強制重設密碼</span>
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </DialogBody>

        {!isMandatory && !isLoginSuccess && (
          <DialogFooter>
            <Button type="button" variant="parchment" size="sm" onClick={onClose}>
              關閉
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
