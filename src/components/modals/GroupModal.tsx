import React, { useState, useEffect } from 'react';
import { useGroup } from '@/contexts/GroupContext';
import { useAlert } from '@/contexts/AlertContext';
import { GroupConfig, FirebaseConfig } from '@/types/group';
import { testFirebaseConnection, initializeGroupDatabase } from '@/services/firebase';
import { hashPassword } from '@/services/crypto';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { FirebaseTutorialModal } from '@/components/modals/FirebaseTutorialModal';
import {
  Users,
  Plus,
  Share2,
  Trash2,
  Check,
  ArrowLeft,
  Link,
  Flame,
  ShieldCheck,
  BookOpen,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GroupModal({ isOpen, onClose }: GroupModalProps) {
  const { activeGroup, savedGroups, switchGroup, saveGroup, removeGroup, generateInviteLink, parseInviteLink } = useGroup();
  const { showConfirm, showPrompt, showAlert } = useAlert();

  // 模式：'list' (清單與切換) | 'add' (加入或建立)
  const [viewMode, setViewMode] = useState<'list' | 'add'>('list');
  const [addTab, setAddTab] = useState<'invite' | 'create'>('invite');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // 邀請連結表單
  const [inviteInput, setInviteInput] = useState('');
  const [inviteError, setInviteError] = useState('');

  // 建立全新小隊表單
  const [groupName, setGroupName] = useState('');
  const [rawSnippet, setRawSnippet] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [databaseURL, setDatabaseURL] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');

  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [adminEmoji, setAdminEmoji] = useState('👑');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // 重置表單狀態
  useEffect(() => {
    if (isOpen) {
      setViewMode('list');
      setAddTab('invite');
      setInviteInput('');
      setInviteError('');
      setGroupName('');
      setRawSnippet('');
      setApiKey('');
      setAuthDomain('');
      setDatabaseURL('');
      setProjectId('');
      setStorageBucket('');
      setMessagingSenderId('');
      setAppId('');
      setAdminName('');
      setAdminPassword('');
      setAdminPasswordConfirm('');
      setAdminEmoji('👑');
      setCreateError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleCopy = async (group: GroupConfig) => {
    const link = generateInviteLink(group);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(group.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showPrompt({ title: '複製邀請連結', message: '請手動複製以下邀請連結：', defaultValue: link });
    }
  };

  // 解析 Firebase Snippet
  const handleParseSnippet = (snippet: string) => {
    setRawSnippet(snippet);
    setCreateError('');
    try {
      const apiKeyMatch = snippet.match(/apiKey:\s*["']([^"']+)["']/);
      const authDomainMatch = snippet.match(/authDomain:\s*["']([^"']+)["']/);
      const databaseURLMatch = snippet.match(/databaseURL:\s*["']([^"']+)["']/);
      const projectIdMatch = snippet.match(/projectId:\s*["']([^"']+)["']/);
      const storageBucketMatch = snippet.match(/storageBucket:\s*["']([^"']+)["']/);
      const senderIdMatch = snippet.match(/messagingSenderId:\s*["']([^"']+)["']/);
      const appIdMatch = snippet.match(/appId:\s*["']([^"']+)["']/);

      if (apiKeyMatch) setApiKey(apiKeyMatch[1]);
      if (authDomainMatch) setAuthDomain(authDomainMatch[1]);
      if (databaseURLMatch) setDatabaseURL(databaseURLMatch[1]);
      if (projectIdMatch) setProjectId(projectIdMatch[1]);
      if (storageBucketMatch) setStorageBucket(storageBucketMatch[1]);
      if (senderIdMatch) setMessagingSenderId(senderIdMatch[1]);
      if (appIdMatch) setAppId(appIdMatch[1]);
    } catch {
      // ignore
    }
  };

  const getFirebaseConfig = (): FirebaseConfig => ({
    apiKey: apiKey.trim(),
    authDomain: authDomain.trim(),
    databaseURL: databaseURL.trim(),
    projectId: projectId.trim(),
    storageBucket: storageBucket.trim(),
    messagingSenderId: messagingSenderId.trim(),
    appId: appId.trim(),
  });

  // 1. 處理邀請連結加入
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    const parsed = parseInviteLink(inviteInput.trim());
    if (parsed) {
      saveGroup(parsed);
      showAlert({
        title: '加入成功',
        message: `已成功加入小隊「${parsed.name}」並完成連線！`,
        type: 'success',
      });
      onClose();
    } else {
      setInviteError('無效的邀請連結格式，請確認是否完整複製！');
    }
  };

  // 2. 處理建立全新小隊
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!groupName.trim()) {
      setCreateError('請輸入小隊名稱！');
      return;
    }

    const config = getFirebaseConfig();
    if (!config.apiKey || !config.databaseURL || !config.projectId) {
      setCreateError('請至少填寫 Firebase apiKey、databaseURL 與 projectId！');
      return;
    }

    if (!adminName.trim()) {
      setCreateError('請填寫隊長暱稱！');
      return;
    }

    if (!adminPassword || adminPassword.length < 4) {
      setCreateError('請設定至少 4 碼隊長管理密碼以保護小隊資料！');
      return;
    }

    if (adminPassword !== adminPasswordConfirm) {
      setCreateError('兩次輸入的隊長密碼不一致！');
      return;
    }

    setIsSubmitting(true);

    try {
      // 測試連線
      const testRes = await testFirebaseConnection(config);
      if (!testRes.success) {
        setCreateError(testRes.error || 'Firebase 連線測試失敗，請檢查 Config 資訊！');
        setIsSubmitting(false);
        return;
      }

      // 初始化資料庫
      const passHash = await hashPassword(adminPassword.trim());
      const initRes = await initializeGroupDatabase(config, {
        name: adminName.trim(),
        passwordHash: passHash,
        avatarEmoji: adminEmoji,
      });

      if (!initRes.success) {
        setCreateError(initRes.error || '初始化資料庫失敗！');
        setIsSubmitting(false);
        return;
      }

      const newGroup: GroupConfig = {
        id: `group_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: groupName.trim(),
        firebaseConfig: config,
        joinedAt: Date.now(),
      };

      saveGroup(newGroup);
      showAlert({
        title: '建立成功',
        message: `已成功建立小隊「${newGroup.name}」並完成連線！`,
        type: 'success',
      });
      onClose();
    } catch (err: any) {
      setCreateError(err?.message || '建立小隊失敗！');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent maxWidthClass={viewMode === 'add' && addTab === 'create' ? 'max-w-xl' : 'max-w-md'}>
          <DialogHeader>
            <DialogTitle>
              {viewMode === 'list' ? (
                <>
                  <Users className="w-5 h-5 text-amber-500" />
                  <span>小隊群組切換與管理</span>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    title="返回小隊清單"
                  >
                    <ArrowLeft className="w-5 h-5 text-stone-600 dark:text-slate-300" />
                  </button>
                  <span>建立或加入小隊</span>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4 max-h-[75vh]">
            {/* ========================================================
                模式一：小隊清單與切換
                ======================================================== */}
            {viewMode === 'list' ? (
              <div className="space-y-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  您可在多個冒險小隊之間隨時無縫切換，每個小隊享有獨立的 Firebase 免費資料庫。
                </div>

                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {savedGroups.map((group) => {
                    const isActive = activeGroup?.id === group.id;

                    return (
                      <div
                        key={group.id}
                        className={cn(
                          'p-3 rounded-2xl border-2 transition-all flex items-center justify-between gap-2 shadow-xs',
                          isActive
                            ? 'bg-amber-500/15 border-amber-500 shadow-amber-500/10'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:border-amber-400'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            switchGroup(group.id);
                            onClose();
                          }}
                          className="flex-1 text-left min-w-0 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-[#3E2F20] dark:text-slate-100 truncate">
                              {group.name}
                            </span>
                            {isActive && (
                              <span className="px-1.5 py-0.2 text-[10px] font-black rounded-md bg-amber-500 text-slate-950">
                                目前連線
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                            專案：{group.firebaseConfig?.projectId || 'Firebase'}
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleCopy(group)}
                            className="w-8 h-8 rounded-xl"
                            title="複製邀請連結"
                          >
                            {copiedId === group.id ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Share2 className="w-4 h-4 text-slate-500 hover:text-amber-600" />
                            )}
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={async () => {
                              const ok = await showConfirm({
                                title: '移除小隊',
                                message: `確定要從本機清單移除小隊「${group.name}」嗎？這不會刪除 Firebase 雲端資料庫。\n若日後需再次使用，可透過邀請連結隨時加回。`,
                                isDanger: true,
                                confirmText: '確定移除',
                              });
                              if (ok) removeGroup(group.id);
                            }}
                            className="w-8 h-8 rounded-xl text-red-500 hover:bg-red-500/10"
                            title="移除小隊"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="gold"
                  size="md"
                  onClick={() => setViewMode('add')}
                  className="w-full mt-2 font-bold"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span>建立或加入另一個小隊</span>
                </Button>
              </div>
            ) : (
              /* ========================================================
                 模式二：加入或建立小隊
                 ======================================================== */
              <div className="space-y-3.5">
                {/* 頂部 Tab 選單 */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-black/30 border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setAddTab('invite');
                      setInviteError('');
                      setCreateError('');
                    }}
                    className={cn(
                      'py-1.5 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                      addTab === 'invite'
                        ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                    )}
                  >
                    <Link className="w-3.5 h-3.5" />
                    <span>貼上邀請連結加入</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAddTab('create');
                      setInviteError('');
                      setCreateError('');
                    }}
                    className={cn(
                      'py-1.5 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                      addTab === 'create'
                        ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                    )}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>建立全新小隊</span>
                  </button>
                </div>

                {/* Tab A：邀請連結加入 */}
                {addTab === 'invite' && (
                  <form onSubmit={handleInviteSubmit} className="space-y-3.5 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        請貼上隊友分享的小隊邀請連結 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={inviteInput}
                        onChange={(e) => {
                          setInviteInput(e.target.value);
                          setInviteError('');
                        }}
                        placeholder="請在此貼上完整邀請網址 (例如 https://...#invite=...)"
                        rows={3}
                        className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                        required
                        autoFocus
                      />
                    </div>

                    {inviteError && (
                      <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500 text-xs text-red-500 font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{inviteError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="parchment"
                        size="sm"
                        onClick={() => setViewMode('list')}
                      >
                        返回清單
                      </Button>
                      <Button type="submit" variant="primary" size="md" className="font-bold">
                        <Check className="w-4 h-4 mr-1" />
                        <span>立即加入並連線</span>
                      </Button>
                    </div>
                  </form>
                )}

                {/* Tab B：建立全新 Firebase 小隊 */}
                {addTab === 'create' && (
                  <form onSubmit={handleCreateGroup} className="space-y-3 pt-1">
                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-amber-400/15 border border-amber-500/30 text-xs text-[#5C3E14] dark:text-amber-300 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>使用 Firebase 永久免費雲端資料庫</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsTutorialOpen(true)}
                        className="text-amber-700 dark:text-amber-200 underline flex items-center gap-1 text-[11px] shrink-0 font-black"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>5分鐘免費建立教學</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        小隊名稱 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => {
                          setGroupName(e.target.value);
                          setCreateError('');
                        }}
                        placeholder="例如：楓之谷冒險團、公會固定團"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        快速貼上 Firebase Config 程式碼
                      </label>
                      <textarea
                        value={rawSnippet}
                        onChange={(e) => handleParseSnippet(e.target.value)}
                        placeholder="貼上 const firebaseConfig = { apiKey: '...', databaseURL: '...', ... }"
                        rows={2}
                        className="w-full px-3 py-1.5 text-[11px] rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                          apiKey <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="AIzaSy..."
                          className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                          projectId <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={projectId}
                          onChange={(e) => setProjectId(e.target.value)}
                          placeholder="my-project"
                          className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        databaseURL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={databaseURL}
                        onChange={(e) => setDatabaseURL(e.target.value)}
                        placeholder="https://xxx-default-rtdb.firebaseio.com"
                        className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                        required
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                      <div className="text-xs font-black text-[#3E2F20] dark:text-slate-100 flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        <span>設定隊長 (管理員) 身分</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                            隊長暱稱 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={adminName}
                            onChange={(e) => setAdminName(e.target.value)}
                            placeholder="例如：隊長小楓"
                            className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                            代表 Emoji
                          </label>
                          <EmojiPicker value={adminEmoji} onChange={setAdminEmoji} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                            管理密碼 (至少4碼) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="請輸入密碼"
                            className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            required
                            minLength={4}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                            確認密碼 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            value={adminPasswordConfirm}
                            onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                            placeholder="請再次輸入密碼"
                            className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            required
                            minLength={4}
                          />
                        </div>
                      </div>
                    </div>

                    {createError && (
                      <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500 text-xs text-red-500 font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{createError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="parchment"
                        size="sm"
                        onClick={() => setViewMode('list')}
                      >
                        返回清單
                      </Button>
                      <Button
                        type="submit"
                        variant="gold"
                        size="md"
                        isLoading={isSubmitting}
                        className="font-bold"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        <span>測試連線並建立小隊</span>
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </DialogBody>

          {viewMode === 'list' && (
            <DialogFooter>
              <Button variant="parchment" size="sm" onClick={onClose}>
                關閉
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <FirebaseTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </>
  );
}
