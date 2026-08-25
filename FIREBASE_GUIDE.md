# 🍁 Firebase 0 元免費資料庫建立指南

專為 **新楓之谷 每週 BOSS 攻略備忘錄 2.0 (BossParty)** 設計的 3 分鐘圖文建立教學。

---

## 🌟 為什麼使用 Firebase Spark 方案？
- **永久 0 元**：提供 1GB 雲端儲存空間、每日 10GB 流量與 100 個即時連線數（足以供百人公會使用數年）。
- **0ms 雙向即時連線**：出團打勾秒連動，一人點擊完成、全隊員即時同步更新。
- **資料自主**：資料庫建立於您自己的 Google 帳號下，數據不經過任何第三方。

---

## 🚀 4 步驟設定教學

### 步驟 1：前往 Firebase 控制台並建立專案
1. 開啟 [Firebase Console (控制台)](https://console.firebase.google.com/)，使用您的 Google 帳號登入。
2. 點擊 **「新增專案 (Add project)」**。
3. 輸入專案名稱（例如：`maple-boss-party`），點擊「繼續」。
4. Google Analytics 建議**取消勾選**（不需要），點擊 **「建立專案」**，約 10 秒後完成。

---

### 步驟 2：建立 Realtime Database 資料庫
1. 在 Firebase 控制台左側選單點擊 **「建構 (Build)」 ➔ 「Realtime Database」**。
2. 點擊畫面中央的 **「建立資料庫 (Create Database)」**。
3. 資料庫地區選擇預設（例如：`美國 us-central1` 或 `新加坡 asia-southeast1`），點擊「下一步」。
4. 安全性規則選擇 **「以測試模式啟動 (Start in test mode)」**，點擊 **「啟用 (Enable)」**。

---

### 步驟 3：設定永久開放讀寫規則 (安全性規則)
> 💡 測試模式預設會在 30 天後過期鎖定，請將規則改為永久開放供小隊成員讀寫：

1. 在 Realtime Database 頁面頂部，點擊 **「規則 (Rules)」** 分頁。
2. 將編輯框內容替換為：
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
3. 點擊右上角藍色的 **「發布 (Publish)」** 按鈕。

---

### 步驟 4：取得 Web 應用程式連線設定 (firebaseConfig)
1. 點擊左上角「專案總覽」旁邊的 ⚙️ 齒輪圖示 ➔ 選擇 **「專案設定 (Project settings)」**。
2. 在「一般 (General)」分頁往下滑，找到「您的應用程式」，點擊 **`</>` (Web 網頁圖示)**。
3. 隨意輸入 App 暱稱（例如：`BossParty`），點擊 **「註冊應用程式」**。
4. 複製出現的整段設定代碼，例如：
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "maple-boss-party.firebaseapp.com",
  databaseURL: "https://maple-boss-party-default-rtdb.firebaseio.com",
  projectId: "maple-boss-party",
  storageBucket: "maple-boss-party.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```
5. 回到 BossParty 的 Setup Wizard **步驟 2**，直接貼上至大文字框，系統將自動解析並填妥所有欄位！
6. 點擊 **「測試連線與寫入權限」**，確認綠色勾勾後，即可進入步驟 3 設定隊長帳號啟航！🍁
