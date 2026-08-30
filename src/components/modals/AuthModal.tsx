import { useState, useEffect, useRef, FormEvent } from 'react';
import { Player } from '@/types/player';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { AvatarPicker } from '@/components/ui/AvatarPicker';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { hashPassword } from '@/services/crypto';
import { UserCheck, Smile, KeyRound, LogOut, ShieldAlert, Crown, Check, UserPlus, Lock, User } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddPlayerModal?: () => void;
  preselectedPlayerName?: string;
}

type AuthMode = 'login' | 'register' | 'change_avatar' | 'change_password' | 'admin_reset';

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
  const [regAvatarImage, setRegAvatarImage] = useState<string | undefined>();
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // 修改密碼相關
  // 修改頭像相關
  const [editAvatarEmoji, setEditAvatarEmoji] = useState('🍁');
  const [editAvatarImage, setEditAvatarImage] = useState<string | undefined>();

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
  const [successAvatarImage, setSuccessAvatarImage] = useState<string | undefined>();

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
      setRegAvatarImage(undefined);
      setRegPassword('');
      setRegConfirmPassword('');
      setEditAvatarEmoji(currentPlayer?.avatarEmoji || '🍁');
      setEditAvatarImage(currentPlayer?.avatarImage);
      setErrorMsg('');
      setSuccessMsg('');
      setIsLoginSuccess(false);
      setMode(players.length === 0 ? 'register' : 'login');
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
        setErrorMsg(res.error || '密碼錯誤，請重新輸入！');
        return;
      }

      const playerObj = players.find((p) => p.name === selectedPlayerName);
      setSuccessUserName(selectedPlayerName);
      setSuccessEmoji(playerObj?.avatarEmoji || '🍁');
      setSuccessAvatarImage(playerObj?.avatarImage);
      setIsLoginSuccess(true);

      setTimeout(() => {
        setIsLoginSuccess(false);
        onClose();
      }, 1000);
    } catch {
      setErrorMsg('登入發生異常，請重試！');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. 處理我是新隊員 (註冊玩家)
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanName = regName.trim();
    if (!cleanName) {
      setErrorMsg('請輸入玩家名稱！');
      return;
    }

    const isDuplicate = players.some((p) => p.name.trim().toLowerCase() === cleanName.toLowerCase());
    if (isDuplicate) {
      setErrorMsg(`玩家名稱【${cleanName}】已被使用，請更換其他名稱！`);
      return;
    }

    if (!regPassword) {
      setErrorMsg('請設定登入密碼！');
      return;
    }

    if (regPassword.length < 4) {
      setErrorMsg('密碼長度至少需 4 碼！');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('兩次輸入的密碼不相符，請重新確認！');
      return;
    }

    setIsSubmitting(true);
    try {
      const passwordHash = await hashPassword(regPassword);
      const isFirstPlayer = players.length === 0;

      const newPlayer = {
        name: cleanName,
        avatarEmoji: regEmoji || '🍁',
        avatarImage: regAvatarImage || undefined,
        passwordHash,
        isAdmin: isFirstPlayer,
        characters: [],
      };

      await addPlayer(newPlayer);
      await login(cleanName, regPassword, [...players, newPlayer]);

      setSuccessUserName(cleanName);
      setSuccessEmoji(regEmoji || '🍁');
      setSuccessAvatarImage(regAvatarImage);
      setIsLoginSuccess(true);

      setTimeout(() => {
        setIsLoginSuccess(false);
        onClose();
      }, 1000);
    } catch {
      setErrorMsg('建立玩家身分失敗，請檢查網路！');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2.5 處理修改頭像
  const handleSaveAvatar = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPlayer) return;

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updated: Player = {
        ...currentPlayer,
        avatarEmoji: editAvatarEmoji || '🍁',
      };
      if (editAvatarImage) {
        updated.avatarImage = editAvatarImage;
      } else {
        delete (updated as any).avatarImage;
      }

      await updatePlayer(updated);
      setSuccessMsg('✨ 個人頭像已成功更新並同步至全小隊！');
    } catch (err) {
      console.error('更新頭像失敗:', err);
      setErrorMsg('更新頭像失敗，請稍後重試！');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. 處理修改密碼
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPlayer) return;

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('新密碼長度至少需 4 碼！');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('兩次輸入的新密碼不相符！');
      return;
    }

    setIsSubmitting(true);
    try {
      const passwordHash = await hashPassword(newPassword);
      const updated = {
        ...currentPlayer,
        passwordHash,
      };

      await updatePlayer(updated);
      setSuccessMsg('✨ 密碼修改成功！下次登入時請使用新密碼。');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => {
        setMode('login');
      }, 1500);
    } catch {
      setErrorMsg('修改密碼失敗，請稍後重試！');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. 管理員重設隊員密碼
  const handleAdminResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isAdmin) {
      setErrorMsg('只有管理員可以重設隊員密碼！');
      return;
    }

    const target = players.find((p) => p.name === resetTargetName);
    if (!target) {
      setErrorMsg('找不到該隊員！');
      return;
    }

    if (adminNewPassword && adminNewPassword.length < 4) {
      setErrorMsg('新密碼長度至少需 4 碼！');
      return;
    }

    setIsSubmitting(true);
    try {
      const passwordHash = adminNewPassword ? await hashPassword(adminNewPassword) : undefined;
      const updated = {
        ...target,
        passwordHash,
      };

      await updatePlayer(updated);
      setSuccessMsg(
        adminNewPassword
          ? `✨ 已成功將【${target.name}】的密碼重設為新密碼！`
          : `✨ 已成功清除【${target.name}】的密碼保護（改為免密碼直接登入）！`
      );
      setAdminNewPassword('');
    } catch {
      setErrorMsg('重設隊員密碼失敗！');
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
        maxWidthClass="max-w-xl"
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
            <UserCheck className="w-5 h-5 text-amber-500" />
            <span>{isMandatory ? '🍁 歡迎！請登入或建立玩家身分' : '玩家身分與認證中心'}</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {isLoginSuccess ? (
            <div className="py-8 px-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 animate-ping opacity-40" />
                <div className="w-20 h-20 rounded-full overflow-hidden border-3.5 border-kerning-stroke flex items-center justify-center shadow-xl">
                  {successAvatarImage ? (
                    <img src={successAvatarImage} alt={successUserName} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 flex items-center justify-center text-4xl">
                      {successEmoji}
                    </div>
                  )}
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
            <Tabs value={mode} onValueChange={(val) => { setMode(val as AuthMode); setErrorMsg(''); setSuccessMsg(''); }}>
              <TabsList>
                <TabsTrigger value="login">
                  <User className="w-3.5 h-3.5" />
                  <span>登入</span>
                </TabsTrigger>
                <TabsTrigger value="register">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>新隊員</span>
                </TabsTrigger>
                {currentPlayer && (
                  <TabsTrigger value="change_avatar">
                    <Smile className="w-3.5 h-3.5" />
                    <span>改頭像</span>
                  </TabsTrigger>
                )}
                {currentPlayer && (
                  <TabsTrigger value="change_password">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>改密碼</span>
                  </TabsTrigger>
                )}
                {isAdmin && (
                  <TabsTrigger value="admin_reset">
                    <Crown className="w-3.5 h-3.5 text-yellow-400" />
                    <span>管理</span>
                  </TabsTrigger>
                )}
              </TabsList>

              {/* 頁籤 1：既有隊員登入 */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-3.5 pt-1">
                  {/* 目前登入狀態膠囊 */}
                  <div className="p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="relative group cursor-pointer" onClick={() => { setMode('change_avatar'); setEditAvatarEmoji(currentPlayer?.avatarEmoji || '🍁'); setEditAvatarImage(currentPlayer?.avatarImage); }} title="點擊更換個人頭像">
                          <PlayerAvatar player={currentPlayer} size="md" className="w-9 h-9 rounded-xl shadow-inner group-hover:brightness-110" />
                          <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold text-white transition-opacity">
                            更換
                          </div>
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
                  </div>

                  {selectablePlayers.length > 0 ? (
                    <>
                      <div className="space-y-1.5">
                        <Label>
                          {currentPlayer ? '選擇要切換登入的隊員' : '選擇要登入的玩家'} <span className="text-red-500">*</span>
                        </Label>
                        <select
                          value={selectedPlayerName}
                          onChange={(e) => {
                            setSelectedPlayerName(e.target.value);
                            setPasswordInput('');
                            setErrorMsg('');
                            setSuccessMsg('');
                          }}
                          className="w-full px-3 py-2 text-sm rounded-xl border-2 border-[#D4B982] dark:border-slate-700 bg-[#FFFDF9] dark:bg-slate-900 text-[#3E2F20] dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500 shadow-inner"
                        >
                          {selectablePlayers.map((p) => (
                            <option key={p.name} value={p.name}>
                              {p.avatarEmoji || '👤'} {p.name} {p.isAdmin ? '👑 (管理員)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {hasPassword ? (
                        <div className="space-y-1.5">
                          <Label>
                            輸入登入密碼 <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="password"
                            leftIcon={<Lock className="w-4 h-4" />}
                            value={passwordInput}
                            onChange={(e) => {
                              setPasswordInput(e.target.value);
                              setErrorMsg('');
                            }}
                            placeholder="請輸入密碼"
                            required
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs text-[#5C3E14] dark:text-amber-300 font-bold">
                          💡 此玩家尚未設定密碼，可直接點擊下方按鈕登入。登入後可切換至「改密碼」頁籤補設密碼保護。
                        </div>
                      )}
                    </>
                  ) : currentPlayer ? (
                    <div className="py-4 px-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-xs text-[#5C3E14] dark:text-amber-300 font-bold text-center">
                      🍁 小隊目前只有您一位隊員。若要邀請新隊友加入，可點選上方「新隊員」頁籤或發送邀請連結！
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                      小隊目前尚無任何玩家，請點選上方「新隊員」頁籤建立身分！
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

                  <div className="pt-2 flex items-center justify-end gap-2">
                    {selectablePlayers.length > 0 && (
                      <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} className="w-full">
                        <span>{currentPlayer ? `切換為「${selectedPlayerName}」登入` : '確認登入'}</span>
                      </Button>
                    )}
                  </div>
                </form>
              </TabsContent>

              {/* 頁籤 2：我是新隊員 (註冊) */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-3.5 pt-1">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-[#5C3E14] dark:text-amber-200">
                    ✨ 輸入您的遊戲暱稱與代表頭像，並設定專屬密碼以加入小隊！
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      玩家名稱 (暱稱) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      leftIcon={<User className="w-4 h-4" />}
                      value={regName}
                      onChange={(e) => {
                        setRegName(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="例如：小楓、阿豪"
                      required
                      maxLength={20}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>代表頭像 (Emoji 或自訂照片)</Label>
                    <AvatarPicker
                      avatarEmoji={regEmoji}
                      avatarImage={regAvatarImage}
                      onChangeEmoji={setRegEmoji}
                      onChangeImage={setRegAvatarImage}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      設定登入密碼 (至少 4 碼) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="password"
                      leftIcon={<Lock className="w-4 h-4" />}
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="請輸入至少 4 碼密碼"
                      required
                      minLength={4}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      再次確認密碼 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="password"
                      leftIcon={<Lock className="w-4 h-4" />}
                      value={regConfirmPassword}
                      onChange={(e) => {
                        setRegConfirmPassword(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="請再次輸入密碼"
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

                  <div className="pt-2">
                    <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} className="w-full">
                      <Check className="w-4 h-4" />
                      <span>建立身分並進入小隊</span>
                    </Button>
                  </div>
                </form>
              </TabsContent>

                            {/* 頁籤：修改個人頭像 */}
              {currentPlayer && (
                <TabsContent value="change_avatar">
                  <form onSubmit={handleSaveAvatar} className="space-y-3.5 pt-1">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-[#5C3E14] dark:text-amber-200">
                      🎨 正在為隊員 <strong>{currentPlayer.name}</strong> 設定代表頭像（可選取 Emoji 或上傳照片自訂圓形裁切）：
                    </div>

                    <AvatarPicker
                      avatarEmoji={editAvatarEmoji}
                      avatarImage={editAvatarImage}
                      onChangeEmoji={setEditAvatarEmoji}
                      onChangeImage={setEditAvatarImage}
                    />

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

                    <div className="pt-2">
                      <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} className="w-full">
                        <Check className="w-4 h-4" />
                        <span>確認儲存頭像</span>
                      </Button>
                    </div>
                  </form>
                </TabsContent>
              )}

              {/* 頁籤 3：修改密碼 */}
              {currentPlayer && (
                <TabsContent value="change_password">
                  <form onSubmit={handleChangePassword} className="space-y-3.5 pt-1">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-[#5C3E14] dark:text-amber-200">
                      🔒 正在為隊員 <strong>{currentPlayer.name}</strong> 修改登入密碼。
                    </div>

                    <div className="space-y-1.5">
                      <Label>
                        輸入新密碼 (至少 4 碼) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="password"
                        leftIcon={<Lock className="w-4 h-4" />}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder="請輸入新密碼"
                        required
                        minLength={4}
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>
                        再次確認新密碼 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="password"
                        leftIcon={<Lock className="w-4 h-4" />}
                        value={confirmNewPassword}
                        onChange={(e) => {
                          setConfirmNewPassword(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder="請再次輸入新密碼"
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

                    <div className="pt-2">
                      <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} className="w-full">
                        <Check className="w-4 h-4" />
                        <span>確認修改密碼</span>
                      </Button>
                    </div>
                  </form>
                </TabsContent>
              )}

              {/* 頁籤 4：管理員重設隊員密碼 */}
              {isAdmin && (
                <TabsContent value="admin_reset">
                  <form onSubmit={handleAdminResetPassword} className="space-y-3.5 pt-1">
                    <div className="p-2.5 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-xs text-yellow-950 dark:text-yellow-200">
                      👑 <strong>小隊長管理特權</strong>：當隊員忘記密碼時，您可以為其指派新密碼，或留空直接清除密碼保護。
                    </div>

                    <div className="space-y-1.5">
                      <Label>選擇要重設密碼的隊員</Label>
                      <select
                        value={resetTargetName}
                        onChange={(e) => setResetTargetName(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border-2 border-[#D4B982] dark:border-slate-700 bg-[#FFFDF9] dark:bg-slate-900 text-[#3E2F20] dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500 shadow-inner"
                      >
                        {players.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.avatarEmoji || '👤'} {p.name} {p.name === currentPlayer?.name ? '(自己)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>指派新密碼 (留空代表直接清除密碼保護)</Label>
                      <Input
                        type="password"
                        leftIcon={<Lock className="w-4 h-4" />}
                        value={adminNewPassword}
                        onChange={(e) => {
                          setAdminNewPassword(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder="請輸入新密碼 (留空即清除保護)"
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

                    <div className="pt-2">
                      <Button type="submit" variant="gold" size="md" isLoading={isSubmitting} className="w-full">
                        <Crown className="w-4 h-4" />
                        <span>{adminNewPassword ? '重設為此密碼' : '清除該隊員密碼保護'}</span>
                      </Button>
                    </div>
                  </form>
                </TabsContent>
              )}
            </Tabs>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
