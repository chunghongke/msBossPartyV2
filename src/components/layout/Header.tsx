import { useState } from 'react';
import { useGroup } from '@/contexts/GroupContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotif } from '@/contexts/NotifContext';
import { useAlert } from '@/contexts/AlertContext';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip';
import {
  Users,
  Share2,
  Clock,
  Bell,
  BellOff,
  Sun,
  Moon,
  Crown,
  Check,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  onOpenLoginModal?: () => void;
  onOpenGroupModal?: () => void;
  onOpenNotifModal?: () => void;
  countdownText?: string;
}

export function Header({
  onOpenLoginModal,
  onOpenGroupModal,
  onOpenNotifModal,
  countdownText,
}: HeaderProps) {
  const { activeGroup, generateInviteLink } = useGroup();
  const { currentPlayer, isAdmin } = useAuth();
  const { settings } = useNotif();
  const { showPrompt } = useAlert();
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const handleCopyInvite = async () => {
    if (!activeGroup) return;
    const link = generateInviteLink(activeGroup);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showPrompt({ title: '邀請同伴', message: '請手動選取並複製以下小隊邀請連結：', defaultValue: link });
    }
  };

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('boss_party_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('boss_party_theme', 'light');
    }
  };

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-40 w-full bg-[#3B2C1A]/95 dark:bg-[#151C2C]/95 backdrop-blur-md border-b-2.5 border-kerning-stroke text-white shadow-lg transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-kerning-stroke flex items-center justify-center text-2xl shrink-0 shadow-md">
              🍁
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-fredoka font-black text-base sm:text-lg text-amber-400 tracking-wide truncate maple-number-glow">
                  BossParty
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-bold rounded bg-red-600/80 border border-red-400/50 text-white">
                  v2.0
                </span>
              </div>

              {activeGroup ? (
                <button
                  type="button"
                  onClick={onOpenGroupModal}
                  className="flex items-center gap-1 text-xs text-amber-200/90 hover:text-white transition-colors truncate"
                >
                  <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-bold truncate max-w-[120px] sm:max-w-[180px]">
                    {activeGroup.name}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-70 shrink-0" />
                </button>
              ) : (
                <span className="text-xs text-slate-400">尚未連線群組</span>
              )}
            </div>
          </div>

          {countdownText && (
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/40 border border-amber-500/30 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-slate-300">重置倒數：</span>
              <span className="font-fredoka font-bold text-amber-300 tracking-wider">
                {countdownText}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {activeGroup && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="parchment"
                    onClick={handleCopyInvite}
                    className="h-9 px-2.5 sm:px-3 text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400">已複製</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden sm:inline">邀請同伴</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>複製 Base64 邀請連結，小夥伴點擊即可直接加入！</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onOpenNotifModal}
                  className="w-9 h-9 relative text-amber-300 hover:text-amber-200"
                >
                  {settings.enabled ? (
                    <Bell className="w-4 h-4 text-amber-400 fill-amber-400/30" />
                  ) : (
                    <BellOff className="w-4 h-4 opacity-50" />
                  )}
                  {settings.enabled && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-black" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>出團提醒與鈴聲設定</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleTheme}
                  className="w-9 h-9 text-amber-200 hover:text-amber-100"
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isDark ? '切換為明亮模式' : '切換為暗黑模式'}</TooltipContent>
            </Tooltip>

            {currentPlayer ? (
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="flex items-center gap-1.5 sm:gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border-2 border-amber-400/70 hover:border-amber-400 shadow-sm transition-all active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-400/30 border border-amber-400 flex items-center justify-center text-base shrink-0 shadow-inner">
                  {currentPlayer.avatarEmoji || '👤'}
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs sm:text-sm font-black text-amber-300 truncate max-w-[80px] sm:max-w-[110px]">
                    {currentPlayer.name}
                  </span>
                  {isAdmin && <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                </div>
              </button>
            ) : (
              <Button size="sm" variant="gold" onClick={onOpenLoginModal} className="h-9 text-xs">
                登入玩家
              </Button>
            )}
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
