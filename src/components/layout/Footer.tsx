import { ShieldAlert, Github } from 'lucide-react';

interface FooterProps {
  discordUrl?: string;
  githubUrl?: string;
}

export function Footer({
  discordUrl = 'https://discord.com/users/415486143891767318',
  githubUrl = 'https://github.com/chunghongke/msBossPartyV2',
}: FooterProps) {
  return (
    <footer className="w-full mt-12 border-t-2 border-kerning-stroke/30 dark:border-slate-800 bg-[#EFE3CF]/70 dark:bg-slate-900/80 backdrop-blur-md transition-colors select-none text-[#4A3B2C] dark:text-slate-300">
      <div className="max-w-[1880px] w-full mx-auto px-4 sm:px-6 py-7">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          {/* 品牌名稱與版本標籤 */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">🍁</span>
            <span className="font-black text-base text-[#3E2F20] dark:text-amber-300 font-sans tracking-tight">
              新楓之谷 每週 BOSS 攻略備忘錄
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 text-[10px] font-fredoka font-black">
              v2.0
            </span>
          </div>

          {/* 社群與開源連結 (純圖示去背、完全置中) */}
          <div className="flex items-center justify-center gap-3">
            {/* Discord 連結 (無底色去背) */}
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
              title="Discord"
              className="text-stone-500 dark:text-slate-400 hover:text-[#5865F2] dark:hover:text-[#5865F2] p-1.5 rounded-lg transition-all hover:scale-115 active:scale-95 cursor-pointer"
            >
              {/* Discord SVG 圖示 */}
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>

            {/* GitHub 連結 (無底色去背) */}
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository"
              title="GitHub"
              className="text-stone-500 dark:text-slate-400 hover:text-black dark:hover:text-white p-1.5 rounded-lg transition-all hover:scale-115 active:scale-95 cursor-pointer"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* 下方著作權與遊戲宣告條 (完全置中) */}
        <div className="mt-5 pt-4 border-t border-kerning-stroke/20 dark:border-slate-800/80 flex flex-col items-center justify-center gap-1.5 text-[11px] text-stone-500 dark:text-slate-400 text-center">
          <div>
            © {new Date().getFullYear()} BossParty Memo. All rights reserved.
          </div>
          <div className="flex items-center justify-center gap-1.5 opacity-85">
            <ShieldAlert className="w-3 h-3 shrink-0" />
            <span>本工具為社群非官方作品，MapleStory 遊戲版權與素材皆屬 NEXON 及遊戲橘子所有</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
