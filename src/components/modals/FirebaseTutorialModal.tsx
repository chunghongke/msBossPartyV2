import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { BookOpen, ExternalLink, Copy, Check, ChevronRight, ShieldCheck, Database, KeyRound, Sparkles } from 'lucide-react';

interface FirebaseTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FirebaseTutorialModal({ isOpen, onClose }: FirebaseTutorialModalProps) {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [copiedRules, setCopiedRules] = useState(false);

  const rulesJson = `{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}`;

  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(rulesJson);
      setCopiedRules(true);
      setTimeout(() => setCopiedRules(false), 2000);
    } catch {
      // ignore
    }
  };

  const steps = [
    {
      id: 1,
      title: '1. 建立免費專案',
      icon: <Sparkles className="w-4 h-4 text-amber-500" />,
      content: (
        <div className="space-y-3 text-xs text-[#3E2F20] dark:text-slate-200">
          <p className="leading-relaxed">
            Firebase 是 Google 提供的雲端服務，<strong>Spark 方案永久免費</strong>（提供 1GB 容量與每日 10GB 流量，足夠百人公會使用數年）。
          </p>
          <ol className="list-decimal list-inside space-y-2 text-stone-700 dark:text-slate-300">
            <li>
              開啟{' '}
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noreferrer"
                className="text-amber-600 dark:text-amber-400 font-bold underline inline-flex items-center gap-0.5"
              >
                <span>Firebase 控制台</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              ，使用您的 Google 帳號登入。
            </li>
            <li>點擊 <strong>「新增專案 (Add project)」</strong>。</li>
            <li>輸入專案名稱（例如：<code className="bg-black/10 px-1.5 py-0.5 rounded font-mono">maple-boss-party</code>），點擊「繼續」。</li>
            <li>Google Analytics 建議<strong>取消勾選</strong>（非必要），點擊 <strong>「建立專案」</strong>，等待 10 秒即可完成！</li>
          </ol>
        </div>
      ),
    },
    {
      id: 2,
      title: '2. 啟用即時資料庫',
      icon: <Database className="w-4 h-4 text-blue-500" />,
      content: (
        <div className="space-y-3 text-xs text-[#3E2F20] dark:text-slate-200">
          <p className="leading-relaxed">
            建立資料庫以儲存小隊所有玩家的打王進度與出團排程：
          </p>
          <ol className="list-decimal list-inside space-y-2 text-stone-700 dark:text-slate-300">
            <li>在 Firebase 控制台左側選單點擊 <strong>「建構 (Build)」 ➔ 「Realtime Database」</strong>。</li>
            <li>點擊畫面中央的 <strong>「建立資料庫 (Create Database)」</strong>。</li>
            <li>資料庫位置選擇預設（例如：<code className="bg-black/10 px-1.5 py-0.5 rounded font-mono">美國 (us-central1)</code> 或 <code className="bg-black/10 px-1.5 py-0.5 rounded font-mono">新加坡 (asia-southeast1)</code>），點擊「下一步」。</li>
            <li>安全性規則選擇 <strong>「以測試模式啟動 (Start in test mode)」</strong>，點擊 <strong>「啟用 (Enable)」</strong>。</li>
          </ol>
        </div>
      ),
    },
    {
      id: 3,
      title: '3. 設定讀寫權限規則',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
      content: (
        <div className="space-y-3 text-xs text-[#3E2F20] dark:text-slate-200">
          <p className="leading-relaxed">
            為避免測試模式 30 天後過期鎖定，請將 Realtime Database 的安全規則設為小隊成員皆可即時讀寫：
          </p>
          <ol className="list-decimal list-inside space-y-2 text-stone-700 dark:text-slate-300">
            <li>在 Realtime Database 頁面，點擊上方的 <strong>「規則 (Rules)」</strong> 分頁。</li>
            <li>將原本的內容替換為下方代碼：</li>
          </ol>

          <div className="relative p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] border border-slate-700">
            <pre className="overflow-x-auto">{rulesJson}</pre>
            <Button
              type="button"
              variant="parchment"
              size="sm"
              onClick={handleCopyRules}
              className="absolute top-2 right-2 h-7 px-2 text-[10px]"
            >
              {copiedRules ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span>已複製</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>一鍵複製規則</span>
                </>
              )}
            </Button>
          </div>

          <p className="text-[11px] text-stone-500 dark:text-slate-400">
            3. 貼上後，點擊右上角的 <strong>「發布 (Publish)」</strong> 藍色按鈕即可！
          </p>
        </div>
      ),
    },
    {
      id: 4,
      title: '4. 取得連線金鑰貼回',
      icon: <KeyRound className="w-4 h-4 text-purple-500" />,
      content: (
        <div className="space-y-3 text-xs text-[#3E2F20] dark:text-slate-200">
          <p className="leading-relaxed">
            最後一步，取得網頁應用程式的連線金鑰（firebaseConfig）：
          </p>
          <ol className="list-decimal list-inside space-y-2 text-stone-700 dark:text-slate-300">
            <li>點擊左上角「專案總覽」旁邊的 <strong>⚙️ 齒輪圖示 ➔ 「專案設定 (Project settings)」</strong>。</li>
            <li>在「一般 (General)」分頁向下滑動，找到「您的應用程式 (Your apps)」，點擊 <strong><code>&lt;/&gt;</code> (Web 網頁圖示)</strong>。</li>
            <li>輸入應用程式暱稱（例如：<code className="bg-black/10 px-1.5 py-0.5 rounded font-mono">BossParty</code>），點擊 <strong>「註冊應用程式」</strong>。</li>
            <li>在出現的代碼中，複製整段 <code className="bg-black/10 px-1.5 py-0.5 rounded font-mono">const firebaseConfig = &#123; ... &#125;;</code>。</li>
            <li>回到 BossParty 設定精靈步驟 2，直接<strong>貼上至大文字框</strong>，系統將自動解析填入所有欄位！</li>
          </ol>
        </div>
      ),
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <span>📖 Firebase 0 元免費資料庫建立指南</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* 步驟橫向分頁 */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {steps.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveTab(s.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all border-2 ${
                  activeTab === s.id
                    ? 'border-amber-500 bg-amber-500/20 text-amber-900 dark:text-amber-300 shadow-sm scale-105'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-400'
                }`}
              >
                {s.icon}
                <span>{s.title}</span>
              </button>
            ))}
          </div>

          {/* 步驟內容區 */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border-2 border-kerning-stroke min-h-[220px]">
            {steps.find((s) => s.id === activeTab)?.content}
          </div>
        </DialogBody>

        <DialogFooter className="flex items-center justify-between">
          <a
            href="https://console.firebase.google.com/"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
          >
            <span>前往 Firebase 控制台</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2">
            {activeTab < 4 ? (
              <Button
                type="button"
                variant="gold"
                size="sm"
                onClick={() => setActiveTab((prev) => Math.min(4, prev + 1))}
              >
                <span>下一步</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button type="button" variant="primary" size="sm" onClick={onClose}>
                <span>我已完成，開始連線！</span>
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
