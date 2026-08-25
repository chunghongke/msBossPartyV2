import React, { useState } from 'react';
import { useGroup } from '@/contexts/GroupContext';
import { useAlert } from '@/contexts/AlertContext';
import { GroupConfig, FirebaseConfig } from '@/types/group';
import { testFirebaseConnection, initializeGroupDatabase } from '@/services/firebase';
import { hashPassword } from '@/services/crypto';
import { Button } from '@/components/ui/Button';
import { Flame, Sparkles, Link, Check, ExternalLink, ShieldCheck, AlertCircle, ArrowRight, ArrowLeft, BookOpen } from 'lucide-react';
import { FirebaseTutorialModal } from '@/components/modals/FirebaseTutorialModal';

export function SetupWizard() {
  const { saveGroup, parseInviteLink } = useGroup();
  const { showAlert } = useAlert();
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const [step, setStep] = useState<number>(1);
  const [inviteInput, setInviteInput] = useState<string>('');
  const [inviteError, setInviteError] = useState<string>('');

  const [groupName, setGroupName] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [authDomain, setAuthDomain] = useState<string>('');
  const [databaseURL, setDatabaseURL] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [storageBucket, setStorageBucket] = useState<string>('');
  const [messagingSenderId, setMessagingSenderId] = useState<string>('');
  const [appId, setAppId] = useState<string>('');

  const [rawSnippet, setRawSnippet] = useState<string>('');

  const [adminName, setAdminName] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState<string>('');
  const [adminEmoji, setAdminEmoji] = useState<string>('👑');

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleParseSnippet = (snippet: string) => {
    setRawSnippet(snippet); setTestResult(null);
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

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    const parsed = parseInviteLink(inviteInput.trim());
    if (parsed) {
      saveGroup(parsed);
    } else {
      setInviteError('無效的邀請連結格式，請確認是否完整複製！');
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

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const config = getFirebaseConfig();

    if (!config.apiKey || !config.databaseURL || !config.projectId) {
      setTestResult({ success: false, error: '請至少填寫 apiKey、databaseURL 與 projectId！' });
      setIsTesting(false);
      return;
    }

    const res = await testFirebaseConnection(config);
    setTestResult(res);
    setIsTesting(false);
  };

  const handleFinishSetup = async () => {
    if (!adminName.trim()) {
      showAlert({ title: '填寫提示', message: '請填寫隊長暱稱或名稱！', type: 'warning' });
      return;
    }

    if (!adminPassword || adminPassword.length < 4) {
      showAlert({ title: '密碼設定提示', message: '請設定至少 4 碼隊長管理密碼以保護小隊資料！', type: 'warning' });
      return;
    }

    if (adminPassword !== adminPasswordConfirm) {
      showAlert({ title: '密碼不一致', message: '兩次輸入的密碼不一致，請重新檢查！', type: 'warning' });
      return;
    }

    setIsTesting(true);
    try {
      const config = getFirebaseConfig();
      const passHash = adminPassword.trim() ? await hashPassword(adminPassword.trim()) : '';

      const initRes = await initializeGroupDatabase(config, {
        name: adminName.trim(),
        passwordHash: passHash,
        avatarEmoji: adminEmoji,
      });

      if (!initRes.success) {
        showAlert({ title: '初始化失敗', message: initRes.error || '初始化資料庫失敗！', type: 'error' });
        return;
      }

      const finalGroup: GroupConfig = {
        id: `group_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: groupName.trim() || '我的冒險小隊',
        firebaseConfig: config,
        joinedAt: Date.now(),
      };

      saveGroup(finalGroup);
    } catch (err: any) {
      showAlert({ title: '建立小隊失敗', message: '發生錯誤：' + (err?.message || '未知錯誤'), type: 'error' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5ECD7] dark:bg-[#0D1322] flex items-center justify-center p-3 sm:p-6 transition-colors font-sans">
      <div className="parchment-card max-w-2xl w-full rounded-3xl border-3.5 border-kerning-stroke p-5 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 border-2.5 border-kerning-stroke shadow-maple-btn text-3xl mb-1">
            🍁
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#3E2F20] dark:text-amber-300 tracking-tight leading-tight">
            新楓之谷 每週 BOSS 攻略備忘錄
          </h1>
          <p className="text-xs sm:text-sm text-[#6B573E] dark:text-stone-300 font-bold">
            0 元自建專屬小隊，結晶楓幣收益與出團即時連動
          </p>
        </div>

        {/* Step 1: 選擇路徑 */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: 建立全新小隊 */}
              <div
                onClick={() => setStep(2)}
                className="group p-5 rounded-2xl border-3 border-amber-500/80 bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-500/5 cursor-pointer transition-all duration-200 shadow-sm hover:scale-[1.02]"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-3 shadow-md">
                  <Flame className="w-5 h-5" />
                </div>
                <h2 className="font-black text-base text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                  <span>建立全新小隊</span>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </h2>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-4">
                  引導您在 3 分鐘內申請免費 Firebase 資料庫，自動初始化小隊。
                </p>
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>開始建立</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTutorialOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 font-bold text-[11px] flex items-center gap-1 border border-amber-500/40 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>圖文教學</span>
                  </button>
                </div>
              </div>

              {/* Option B: 加入現有小隊 */}
              <div className="p-5 rounded-2xl border-3 border-sky-500/80 bg-sky-500/10 dark:bg-sky-500/5 transition-all duration-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center mb-3 shadow-md">
                    <Link className="w-5 h-5" />
                  </div>
                  <h2 className="font-black text-base text-sky-700 dark:text-sky-400 mb-1">
                    加入現有小隊
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-3">
                    輸入隊長提供的邀請連結，直接連線加入現有資料庫。
                  </p>
                </div>

                <form onSubmit={handleInviteSubmit} className="space-y-2">
                  <input
                    type="text"
                    value={inviteInput}
                    onChange={(e) => {
                      setInviteInput(e.target.value);
                      setInviteError('');
                    }}
                    placeholder="貼上 #invite=... 邀請連結"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                  {inviteError && (
                    <div className="text-[11px] text-red-500 font-bold">{inviteError}</div>
                  )}
                  <Button type="submit" size="sm" variant="parchment" className="w-full text-xs">
                    連線加入
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: 填寫小隊名稱與說明 */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#D4B982] dark:border-slate-700">
              <span className="font-black text-sm text-[#3E2F20] dark:text-slate-200">
                步驟 1/3：命名您的小隊
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                步驟 1 / 3
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                小隊名稱 (公會名稱或好友圈) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="例如：楓之谷週四拓荒團、冒險者公會"
                className="w-full px-3.5 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                maxLength={30}
                required
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-stone-700 dark:text-slate-300 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span>為什麼使用 Firebase Spark 免費方案？</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                <li><strong>完全 0 元</strong>：永久免費額度包含 1GB 儲存空間與每日 10GB 流量（足夠 100+ 人公會使用數年）。</li>
                <li><strong>即時同步</strong>：0 延遲 WebSocket 雙向即時連線，出團打勾秒連動。</li>
                <li><strong>資料自主</strong>：資料庫完全由您自己掌控，數據不經過任何第三方伺服器。</li>
              </ul>
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="parchment" size="sm" onClick={() => setStep(1)} className="font-black text-xs">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>返回</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  if (!groupName.trim()) {
                    showAlert({ title: '填寫提示', message: '請輸入小隊名稱！', type: 'warning' });
                    return;
                  }
                  setStep(3);
                }}
              >
                <span>下一步：設定 Firebase</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Firebase 配置 */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-300 max-h-[70vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#D4B982] dark:border-slate-700">
              <span className="font-black text-sm text-[#3E2F20] dark:text-slate-200">
                步驟 2/3：連結 Firebase Realtime Database
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                步驟 2 / 3
              </span>
            </div>

            {/* 快速申請引導連結 */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-bold">尚未建立 Firebase 專案？</div>
                <div className="text-[11px] opacity-80">前往 Firebase 控制台建立免費專案並啟用 Realtime Database</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="parchment"
                  size="sm"
                  onClick={() => setIsTutorialOpen(true)}
                  className="h-8 px-2.5 text-xs flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>圖文教學</span>
                </Button>
                <a
                  href="https://console.firebase.google.com/"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1 shrink-0 text-xs shadow-sm"
              >
                <span>開啟控制台</span>
                <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* 快捷貼上整段 firebaseConfig 代碼 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                快捷貼上 Firebase 設定物件 (自動解析)
              </label>
              <textarea
                value={rawSnippet}
                onChange={(e) => handleParseSnippet(e.target.value)}
                placeholder="貼上 const firebaseConfig = { apiKey: '...', databaseURL: '...', ... };"
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* 各別欄位 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  apiKey <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  projectId <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => { setProjectId(e.target.value); setTestResult(null); }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  databaseURL <span className="text-red-500">*</span> (必須包含 https://...firebasedatabase.app)
                </label>
                <input
                  type="text"
                  value={databaseURL}
                  onChange={(e) => { setDatabaseURL(e.target.value); setTestResult(null); }}
                  placeholder="https://your-app-default-rtdb.firebaseio.com"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  required
                />
              </div>
            </div>

            {/* 連線測試狀態 */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                type="button"
                variant="parchment"
                size="sm"
                onClick={handleTestConnection}
                isLoading={isTesting}
                className="text-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>測試連線與寫入權限</span>
              </Button>

              {testResult && (
                <div
                  className={`text-xs font-bold flex items-center gap-1.5 ${
                    testResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                  }`}
                >
                  {testResult.success ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>連線測試成功！</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span>{testResult.error || '連線失敗'}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-3 border-t border-slate-300 dark:border-slate-700">
              <Button type="button" variant="parchment" size="sm" onClick={() => setStep(2)} className="font-black text-xs">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>上一步</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  if (!apiKey || !databaseURL || !projectId) {
                    showAlert({ title: '填寫提示', message: '請填寫完整 Firebase 設定 (包含 apiKey、databaseURL 與 projectId)！', type: 'warning' });
                    return;
                  }
                  setStep(4);
                }}
              >
                <span>下一步：設定隊長帳號</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: 隊長帳號與初始化 */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#D4B982] dark:border-slate-700">
              <span className="font-black text-sm text-[#3E2F20] dark:text-slate-200">
                步驟 3/3：設定隊長 (管理員) 帳號
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                步驟 3 / 3
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                隊長暱稱 / 玩家名稱 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="例如：隊長小楓"
                className="w-full px-3.5 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                maxLength={20}
                required
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  隊長管理密碼 (至少 4 碼) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="請輸入至少 4 碼密碼"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  required
                  minLength={4}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  再次確認管理密碼 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={adminPasswordConfirm}
                  onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                  placeholder="請再次輸入相同密碼"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  required
                  minLength={4}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                代表 Emoji 頭像
              </label>
              <div className="flex gap-2">
                {['👑', '🍁', '🧙‍♂️', '🗡️', '🐱', '🦁'].map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setAdminEmoji(em)}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border-2 ${
                      adminEmoji === em ? 'border-amber-500 bg-amber-500/20' : 'border-transparent hover:bg-black/10'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-stone-600 dark:text-stone-300">
              完成後系統將自動於您的 Firebase 寫入初始玩家資料結構，並自動產出小隊專屬的 Base64 邀請連結供同伴加入！
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="parchment" size="sm" onClick={() => setStep(3)} className="font-black text-xs">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>上一步</span>
              </Button>
              <Button
                type="button"
                variant="gold"
                size="md"
                onClick={handleFinishSetup}
                isLoading={isTesting}
              >
                <Sparkles className="w-4 h-4" />
                <span>完成建立並啟航！</span>
              </Button>
            </div>
          </div>
        )}
      </div>
      <FirebaseTutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
    </div>
  );
}
