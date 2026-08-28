import { useState, useEffect, FormEvent } from 'react';
import { useGroup } from '@/contexts/GroupContext';
import { useAlert } from '@/contexts/AlertContext';
import { GroupConfig, FirebaseConfig } from '@/types/group';
import { testFirebaseConnection, initializeGroupDatabase } from '@/services/firebase';
import { hashPassword } from '@/services/crypto';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { FirebaseTutorialModal } from '@/components/modals/FirebaseTutorialModal';
import {
  Users,
  Share2,
  Trash2,
  Check,
  Link,
  Flame,
  ShieldCheck,
  BookOpen,
  Sparkles,
  AlertCircle,
  ListFilter,
  Lock,
  User,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GroupModal({ isOpen, onClose }: GroupModalProps) {
  const { activeGroup, savedGroups, switchGroup, saveGroup, removeGroup, generateInviteLink, parseInviteLink } = useGroup();
  const { showConfirm, showPrompt } = useAlert();

  const [activeTab, setActiveTab] = useState<string>('list');
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
      setActiveTab('list');
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

  const handleInviteSubmit = (e: FormEvent) => {
    e.preventDefault();
    setInviteError('');

    const parsed = parseInviteLink(inviteInput.trim());
    if (!parsed) {
      setInviteError('無法解析此邀請連結，請確認網址格式是否正確！');
      return;
    }

    saveGroup(parsed);
    switchGroup(parsed.id);
    onClose();
  };

  const handleParseSnippet = (snippet: string) => {
    setRawSnippet(snippet);
    try {
      const extract = (key: string) => {
        const regex = new RegExp(`${key}\\s*:\\s*['"]([^'"]+)['"]`);
        const match = snippet.match(regex);
        return match ? match[1] : '';
      };

      const extractedApiKey = extract('apiKey');
      const extractedAuthDomain = extract('authDomain');
      const extractedDatabaseURL = extract('databaseURL');
      const extractedProjectId = extract('projectId');
      const extractedStorageBucket = extract('storageBucket');
      const extractedMessagingSenderId = extract('messagingSenderId');
      const extractedAppId = extract('appId');

      if (extractedApiKey) setApiKey(extractedApiKey);
      if (extractedAuthDomain) setAuthDomain(extractedAuthDomain);
      if (extractedDatabaseURL) setDatabaseURL(extractedDatabaseURL);
      if (extractedProjectId) setProjectId(extractedProjectId);
      if (extractedStorageBucket) setStorageBucket(extractedStorageBucket);
      if (extractedMessagingSenderId) setMessagingSenderId(extractedMessagingSenderId);
      if (extractedAppId) setAppId(extractedAppId);
    } catch {
      // 容錯忽略解析錯誤
    }
  };

  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!groupName.trim()) {
      setCreateError('請填寫小隊名稱！');
      return;
    }

    if (!apiKey.trim() || !databaseURL.trim() || !projectId.trim()) {
      setCreateError('請填寫完整的 Firebase 設定 (apiKey, databaseURL, projectId)！');
      return;
    }

    if (!adminName.trim()) {
      setCreateError('請填寫隊長暱稱！');
      return;
    }

    if (!adminPassword || adminPassword.length < 4) {
      setCreateError('隊長密碼長度至少需 4 碼！');
      return;
    }

    if (adminPassword !== adminPasswordConfirm) {
      setCreateError('兩次輸入的隊長密碼不相符！');
      return;
    }

    setIsSubmitting(true);

    try {
      const fbConfig: FirebaseConfig = {
        apiKey: apiKey.trim(),
        authDomain: authDomain.trim() || undefined,
        databaseURL: databaseURL.trim(),
        projectId: projectId.trim(),
        storageBucket: storageBucket.trim() || undefined,
        messagingSenderId: messagingSenderId.trim() || undefined,
        appId: appId.trim() || undefined,
      };

      const testRes = await testFirebaseConnection(fbConfig);
      if (!testRes.success) {
        setCreateError(testRes.error || 'Firebase 連線失敗！請檢查 databaseURL 與 Firebase 權限規則設定。');
        setIsSubmitting(false);
        return;
      }

      const adminPasswordHash = await hashPassword(adminPassword);
      await initializeGroupDatabase(fbConfig, {
        name: adminName.trim(),
        avatarEmoji: adminEmoji || '👑',
        passwordHash: adminPasswordHash,
      });

      const newGroup: GroupConfig = {
        id: `group_${Date.now()}`,
        name: groupName.trim(),
        firebaseConfig: fbConfig,
        joinedAt: Date.now(),
      };

      saveGroup(newGroup);
      switchGroup(newGroup.id);
      onClose();
    } catch (err: any) {
      setCreateError(err?.message || '建立小隊失敗，請檢查設定與網路連線！');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
        <DialogContent maxWidthClass="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              <Users className="w-5 h-5 text-amber-500" />
              <span>冒險小隊與雲端管理</span>
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4 max-h-[75vh]">
            <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setInviteError(''); setCreateError(''); }}>
              <TabsList>
                <TabsTrigger value="list">
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>小隊清單 ({savedGroups.length})</span>
                </TabsTrigger>
                <TabsTrigger value="invite">
                  <Link className="w-3.5 h-3.5" />
                  <span>邀請連結加入</span>
                </TabsTrigger>
                <TabsTrigger value="create">
                  <Flame className="w-3.5 h-3.5" />
                  <span>建立全新小隊</span>
                </TabsTrigger>
              </TabsList>

              {/* 頁籤 1：我的小隊清單 */}
              <TabsContent value="list">
                <div className="space-y-3 pt-1">
                  <div className="text-xs text-stone-500 dark:text-slate-400">
                    您可在多個冒險小隊之間隨時無縫切換，每個小隊享有獨立的 Firebase 免費雲端資料庫。
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {savedGroups.map((group) => {
                      const isActive = activeGroup?.id === group.id;

                      return (
                        <div
                          key={group.id}
                          className={cn(
                            'p-3 rounded-2xl border-2 transition-all flex items-center justify-between gap-2 shadow-xs',
                            isActive
                              ? 'bg-amber-500/15 border-amber-500 shadow-amber-500/10'
                              : 'bg-white/80 dark:bg-slate-800 border-[#D4B982]/60 dark:border-slate-700 hover:border-amber-400'
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
                </div>
              </TabsContent>

              {/* 頁籤 2：貼上邀請連結加入 */}
              <TabsContent value="invite">
                <form onSubmit={handleInviteSubmit} className="space-y-3.5 pt-1">
                  <div className="space-y-1.5">
                    <Label>
                      貼上隊友分享的小隊邀請連結 <span className="text-red-500">*</span>
                    </Label>
                    <textarea
                      value={inviteInput}
                      onChange={(e) => {
                        setInviteInput(e.target.value);
                        setInviteError('');
                      }}
                      placeholder="請在此貼上完整邀請網址 (例如 https://...#invite=...)"
                      rows={3}
                      className="w-full px-3 py-2 text-xs rounded-xl border-2 border-[#D4B982] dark:border-slate-700 bg-[#FFFDF9] dark:bg-slate-900 text-[#3E2F20] dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500 shadow-inner"
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

                  <div className="pt-2">
                    <Button type="submit" variant="primary" size="md" className="w-full font-bold">
                      <Check className="w-4 h-4 mr-1" />
                      <span>立即加入並連線小隊</span>
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* 頁籤 3：建立全新 Firebase 小隊 */}
              <TabsContent value="create">
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

                  <div className="space-y-1">
                    <Label>
                      小隊名稱 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      value={groupName}
                      onChange={(e) => {
                        setGroupName(e.target.value);
                        setCreateError('');
                      }}
                      placeholder="例如：楓之谷冒險團、公會固定團"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>快速貼上 Firebase Config 程式碼</Label>
                    <textarea
                      value={rawSnippet}
                      onChange={(e) => handleParseSnippet(e.target.value)}
                      placeholder="貼上 const firebaseConfig = { apiKey: '...', databaseURL: '...', ... }"
                      rows={2}
                      className="w-full px-3 py-1.5 text-[11px] rounded-xl border-2 border-[#D4B982] dark:border-slate-700 bg-[#FFFDF9] dark:bg-slate-900 text-[#3E2F20] dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500 shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label>apiKey <span className="text-red-500">*</span></Label>
                      <Input
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>projectId <span className="text-red-500">*</span></Label>
                      <Input
                        type="text"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        placeholder="my-project"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>databaseURL <span className="text-red-500">*</span></Label>
                    <Input
                      type="text"
                      value={databaseURL}
                      onChange={(e) => setDatabaseURL(e.target.value)}
                      placeholder="https://xxx-default-rtdb.firebaseio.com"
                      required
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="text-xs font-black text-[#3E2F20] dark:text-slate-100 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>設定隊長 (管理員) 身分</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label>隊長暱稱 <span className="text-red-500">*</span></Label>
                        <Input
                          type="text"
                          leftIcon={<User className="w-3.5 h-3.5" />}
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          placeholder="例如：隊長小楓"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>代表 Emoji</Label>
                        <EmojiPicker value={adminEmoji} onChange={setAdminEmoji} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label>管理密碼 (至少4碼) <span className="text-red-500">*</span></Label>
                        <Input
                          type="password"
                          leftIcon={<Lock className="w-3.5 h-3.5" />}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="請輸入密碼"
                          required
                          minLength={4}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>確認密碼 <span className="text-red-500">*</span></Label>
                        <Input
                          type="password"
                          leftIcon={<Lock className="w-3.5 h-3.5" />}
                          value={adminPasswordConfirm}
                          onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                          placeholder="請再次輸入密碼"
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

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="gold"
                      size="md"
                      isLoading={isSubmitting}
                      className="w-full font-bold"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      <span>測試連線並建立小隊</span>
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <FirebaseTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </>
  );
}
