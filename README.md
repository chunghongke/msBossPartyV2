# 🍁 楓之谷 每週 BOSS 攻略備忘錄 2.0 (BossParty)

> **MapleStory Weekly Boss Raid & Crystal Memo 2.0**  
> 專為新楓之谷玩家與固定團設計的每週 BOSS 攻略進度、結晶收益、艾里溫碎片分配與出團提醒備忘錄！

![Version](https://img.shields.io/badge/version-2.0.0-orange.svg)
![React](https://img.shields.io/badge/React-18.3-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)
![Firebase](https://img.shields.io/badge/Firebase-RTDB-ffca28.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## ✨ 核心特色與亮點

### 1. 🎨 楓之谷羊皮紙與冒險者裝備卡片視覺
- **2.5D 卡通粗邊框**：經典高對比粗描邊、立體果凍按鈕（點擊 2px 下沉真實觸覺反饋）。
- **四大經典場景配色矩陣**：
  - **楓葉紅/橘**（Maple Red `#E53935` / Maple Orange `#FF9800`）
  - **弓箭手村綠**（Leaf Green `#4CAF50` 活力血條）
  - **魔法森林藍/紫**（Magic Blue `#1E88E5` / Mystic Purple `#8E24AA` 水晶碎片）
  - **廢棄都市深黑**（Kerning Darker `#0D1322` 俐落深色模式底色）
- **登入者專屬金色光暈**：標記個人卡片與代表頭像，支援自訂與常用 Emoji。

### 2. 🌐 0 元多群組隔離運營 (小圈圈共享)
- 前端 App 為純靜態網站（可直接免費託管於 **GitHub Pages / Vercel / Cloudflare Pages**）。
- 每個冒險小隊使用各自獨立的 **Firebase Spark 免費專案**，數據彼此隔離，無任何伺服器租用成本。
- **4 步 Setup Wizard 設定精靈**：圖文引導使用者 3 分鐘建專案，App 自動寫入資料庫初始骨架。
- **Base64 一鍵邀請連結**：複製網址傳給同伴，小夥伴點擊直接加入小隊資料庫。

### 3. ⚡ 0ms 樂觀更新與即時連線同步
- 點擊 BOSS 卡片立即蓋上綠色完成印章（0ms 反應無延遲），背景自動完成 Firebase RTDB 雙向同步。
- 若為多人隊伍，一人標記擊破，同隊伍所有隊員畫面**同步即時連動完成**！

### 4. 💰 結晶金幣與艾里溫碎片精準計算
- **39 隻 BOSS 靜態資料庫**：完整收錄史烏、戴米安、露希妲、威爾、綠水靈、真希拉、頓凱爾、戴斯克、賽蓮、卡洛斯、咖凌、最初的敵對者、燦爛的凶星、林波、巴德利斯、尤比太、瑪麗西亞等全部難度與價格。
- 依隊伍人數自動平分結晶金幣（格式化為億/萬）。
- 支援艾里溫碎片**份數比例分配**（全員均分、單人全拿）或**直接指定片數**。

### 5. 🔄 每週四 00:00 自動跨週重置
- 自動結轉上週碎片分配紀錄、清空臨時改期時間、重置擊破進度。
- 內建下週四 00:00 倒數計時器。

### 6. ⏰ 出團背景提醒與鈴聲推播
- 30 秒背景巡檢循環（臨時改期時間優先於常態時間）。
- 整合 **Web Notifications API** 系統橫幅推播與 **Web Audio API / HTML5 Audio** 出團鈴聲。
- 支援短鈴聲、長鈴聲、水晶琶音合成音與 **IndexedDB 本地 MP3 音訊儲存**。

### 7. 🎭 Nexon Open API 即時角色立繪查詢
- 輸入角色名稱即時串接 Nexon 官方 Open API 取得 `ocid` 與動態立繪頭像。

---

## 🏗️ 專案技術棧

- **核心框架**：React 18 + TypeScript + Vite
- **樣式與主題**：Tailwind CSS + PostCSS + Google Fonts (Fredoka, Noto Sans TC)
- **無障礙 UI 原件**：Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-tooltip`)
- **雲端資料庫**：Firebase Realtime Database (動態 App 多群組連線)
- **本地儲存**：Web Crypto API (SHA-256) + IndexedDB (`idb-keyval`) + LocalStorage
- **圖示庫**：Lucide React

---

## 📁 專案目錄結構

```text
BossParty/
├── public/
│   ├── images/bosses/      # 17 款 BOSS 高傳真立繪
│   ├── chime_short.mp3     # 出團短鈴聲
│   ├── chime_long.mp3      # 出團長鈴聲
│   ├── crystal-icon.png    # 楓幣結晶圖示
│   └── icon.png            # Favicon 圖示
├── src/
│   ├── components/
│   │   ├── character/      # BossCell (3格網格), CharacterCard (羊皮紙裝備卡)
│   │   ├── group/          # SetupWizard (4 步引導精靈)
│   │   ├── guest/          # GuestSection (臨時隊友專區)
│   │   ├── layout/         # Header (頂部導覽), MainLayout (主畫面)
│   │   ├── modals/         # 14 個業務功能彈窗 (Group, Auth, Party, Shard, Notif 等)
│   │   ├── player/         # PlayerNavBar (玩家分頁列)
│   │   └── ui/             # Button, Dialog, Badge, ProgressBar, Tooltip, EmojiPicker, ErrorBoundary
│   ├── contexts/           # GroupContext, AuthContext, StoreContext, NotifContext
│   ├── data/               # bosses.ts (39 款 BOSS 靜態庫與查詢工具)
│   ├── hooks/              # useCalculator, useWeeklyReset
│   ├── services/           # firebase.ts, crypto.ts, audio.ts, nexon.ts
│   ├── types/              # TypeScript 全域型別定義
│   ├── utils/              # cn.ts 類別合併工具
│   ├── App.tsx             # 根元件
│   ├── index.css           # 全域樣式與楓之谷主題 Token
│   └── main.tsx            # 進入點 (含 ErrorBoundary)
├── index.html              # HTML 模板
├── package.json            # 依賴配置
├── tailwind.config.js      # 楓之谷色彩矩陣與立體陰影配置
└── vite.config.ts          # Vite 與 Rollup 代碼拆分配置
```

---

## 🚀 本地開發與構建

### 1. 安裝依賴
```bash
npm install
```

### 2. 啟動開發伺服器
```bash
npm run dev
```

### 3. 生產打包構建
```bash
npm run build
```

### 4. 本地預覽生產版本
```bash
npm run preview
```

---

## 🌐 0 元免費部署指南

1. **部署前端靜態網站**：
   - 將本專案 Push 至 GitHub。
   - 在 [Vercel](https://vercel.com/) 或 [Cloudflare Pages](https://pages.cloudflare.com/) 匯入專案，Build Command 輸入 `npm run build`，Output Directory 輸入 `dist` 即可完成全球 CDN 部署。
2. **小隊啟用**：
   - 開啟部署好的網址，跟隨 **Setup Wizard** 建立小隊或輸入邀請連結，開始享受便利的每週備忘錄！
