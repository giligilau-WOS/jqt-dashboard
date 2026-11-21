# 2611王國：專案說明（給 Claude）

《寒霜啟示錄》（Whiteout Survival）2611 王國的全王國玩家名冊與活動報名工具。管理者是 jQt 台灣戰線聯盟盟主，同時管理 aQt。使用者以 iPhone 操作、用繁體中文溝通，回覆與介面文字一律使用繁體中文。

## 架構

| 部分 | 位置 | 說明 |
|---|---|---|
| 網頁 | GitHub Pages，單一 HTML 檔（`index.html`） | 原生 JavaScript，沒有框架、沒有建置流程 |
| 連線設定 | `config.js`（選用） | `window.K2611_CFG={url:'Apps Script /exec 網址',token:''}` |
| 本機儲存 | `storage.js` | `window.ROSTER_STORE`（localStorage 包裝） |
| 後端 | Google Apps Script（綁定試算表，**不在這個 repo**） | `Code.gs`（主程式）、`Plans.gs`（分隊、特區、報名、入口）、`GiftCodes.gs`（兌換碼） |
| 資料庫 | Google 試算表 | 各工作表見下方 |
| 資料來源 | whiteoutstats.com API | 第三方粉絲站，Bearer 金鑰，非官方 |
| 驗證工具 | `tools/*.mjs` | 見「驗證與測試」 |

目前網頁版本：`APP_VERSION='7.1.1'`（含「遊戲 ID 欄位」、「v7.1 兌換碼」補丁，v7.1.1 加上網站圖示）。圖示在 `icons/`：`favicon-32.png`、`icon-192.png`、`apple-touch-icon.png`（180×180，iPhone 加到主畫面用），來源是 jQt 聯盟徽章。使用者尚未回報 v7.1 的部署與測試結果。

## 網頁程式的修改慣例（重要）

網頁是一路用「補丁」疊上去的單一檔案，修改時要遵守：

1. **新功能貼在 `/* ===== 畫面 ===== */` 的正上方**，以 `/* ===== vX.Y 說明 ===== */` 開頭。
2. **用指派包裝，不要用同名 `function` 重新宣告。** 同名的 `function` 宣告會被提升（hoisting），檔案中最後一個會覆蓋所有前面的，順序很難推敲（v4.9.1 的主題不變色就是這個問題）。正確寫法：
   ```js
   const _rdX=render;render=function(){_rdX();/* 新增的事 */};
   ```
   每個暫存變數名稱都要不同（`_rd7`、`_rd11`、`_rd12`、`_rdG`…），`const` 重複宣告會讓整個腳本失效。既有的 19 個同名宣告記在 `tools/dup-functions-baseline.txt`，只能減少、不能增加。
3. **事件處理**：每個功能用自己的 `data-a` 前綴（`ev_`、`br_`、`w_`、`wx_`、`bm_`、`z_`、`gc_`、`th_`、`se_`、`ntc_`），各自掛一個 `document.addEventListener('click',…)`，只處理自己的前綴。新前綴不可與既有前綴重疊（例如 `w_` 與 `wx_` 要確認 `startsWith` 不會互相誤判）。
4. **底部彈出視窗**統一走 `openSheet({kind:'…'})`，再包裝 `playerSheet` 依 `U.sh.kind` 回傳內容。
5. 每次修改都要更新 `APP_VERSION`，並在最後告訴使用者「登入卡片的版本應該是 X」。
6. 使用者在這個環境不一定能讓 Claude 直接改檔案；沒有檔案時，給「一段程式＋貼在哪裡」，並請使用者貼回整份程式再改。

### 主要全域物件

| 名稱 | 內容 |
|---|---|
| `D` | 資料：`rows`（玩家）、`byF`（FID→玩家）、`regs`（活動→FID→報名）、`acc`（大小號）、`dls`（截止時間）、`card`（玩家歷史） |
| `U` | 介面狀態：`tab`、`sh`（目前視窗）、`theme`、`pal`（佈景主題） |
| `P` | 全玩家表格：排序、篩選、欄位、`view` |
| `AU` | 登入者：`{role:'admin'|'cadre', fid, code, pin, name, al}` |
| `EL` / `W` | 活動名單（舊版／v6 工作台） |
| `BR` | 一鍵報名 |
| `BM` | 全玩家批次勾選 |
| `Z` | 特區（`list`、`zmap` 報名時選的特區） |
| `GC` | 兌換碼 |
| `PD` / `PALS` / `PX` / `FX` | 佈景主題、動態效果（雪、櫻花、楓葉） |

### 介面

四個分頁：全玩家／活動報名／活動名單／後台設定（`TABS`，按鈕是 `#nav button[data-v]`，內容畫在 `#main`）。

- **全玩家**：虛擬捲動表格（列高 40px），點欄位標題排序與篩選，搜尋名字直接跳到該列，點列開玩家視窗（報名、大小號、歷史）。幹部有批次勾選模式，必須先選聯盟範圍。
- **活動報名**：特區管理卡片、一鍵報名（幹部）、各活動名單（依特區→聯盟→軍團分組，幹部可直接改正選／候補／取消）、產生 LINE 通知。
- **活動名單**：v6 分隊工作台，以特區為範圍；分頁 ① 隊伍 ② 調整 ③ 規則 ④ 公布。
- **後台設定**：登入、截止時間（管理員）、清除報名、大小號匯入、連線設定、版本檢查。

## 後端

### Apps Script 檔案分工

- `Code.gs`：設定工具、同步（名冊、玩家檔案、我們的聯盟）、大小號、驗證 `auth_`、讀取 API（`doGetBase_`）、舊的寫入 API（`doPostBase_`）。
- `Plans.gs`：分隊計畫、特區、報名（`registerZ_`、`regMany_`、`regs_`、`regsAll_`、`clearRegs_`、`meta_`），以及真正的入口 `doGet` / `doPost`。
- `GiftCodes.gs`：兌換碼清單、`checkGiftCodes`（每小時抓攻略站）、`setupGiftTrigger`。

**注意**：`meta_`、`regs_`、`regsAll_`、`clearRegs_`、`doGet`、`doPost` 只能存在於 `Plans.gs`，`Code.gs` 裡不可再有同名函數（Apps Script 所有 .gs 共用同一個全域，同名函數會互相覆蓋）。`Code.gs` 的 `doPostBase_` 裡還留著舊的 `register` 分支，但 `Plans.gs` 的 `doPost` 會先攔截 `register`，舊分支實際上不會被執行。

### 入口動作

GET（`?action=`）：`state`、`stdetail`、`regs`、`regsall`、`accounts`、`card`、`result`、`roster`、`plan`、`plans`、`zones`、`codes`

POST（`action`）：`login`、`register`、`regMany`、`accBind`、`accUnbind`、`accImport`、`clearRegs`、`setDeadline`、`publish`、`saveEvent`、`planSave`、`planLock`、`planUnlock`、`planDelete`、`zoneSave`、`zoneDelete`、`zoneDeadline`、`codeSet`、`codeCheck`

POST 用 `Content-Type: text/plain`（避免 CORS 預檢）。

### 權限

- **管理員**：只輸入 PIN（指令碼屬性 `ADMIN_TOKEN`），不限範圍。
- **幹部**：選自己的名字（名冊階級 R4、R5、Leader）＋共用密碼（`CADRE_CODE`，沒設定時是 `2611`，應改成難猜的值）。只能動自己聯盟的人。
- **一般玩家**：不用登入即可自己報名；截止後不能改。
- 截止後：管理員全部可改；幹部可改自己聯盟的兵工廠、峽谷。
- **權限一律由後端判斷**；前端隱藏按鈕只是介面，不算權限檢查。

### 指令碼屬性

`WOS_API_KEY`、`STATE_ID`（2611）、`ALLIANCE_TAGS`（預設 `jQt,aQt`）、`ACCESS_TOKEN`（目前已刪除，網址不帶密碼即可用）、`ADMIN_TOKEN`、`CADRE_CODE`、`TEST_FID`、`SHEET_ID`（選用）、`GIFT_SOURCES`（選用）。執行時自動寫入：`DEADLINE_{活動}`、`ZDL_{特區}_{inner|tal|frost}`、`STATE_RUN`、`STATE_META`、`STATE_BUSY`、`GIFT_META`。

**不要把 PIN、密碼、API 金鑰寫進程式碼、對話、commit 或驗證報告。**（`tools/check.mjs` 會擋常見寫法。）

### 工作表

王國名冊、歷史紀錄、暱稱歷程、聯盟異動、帳號綁定、報名（10 欄，第 10 欄是特區）、報名封存、分隊結果、活動紀錄、玩家檔案、玩家檔案最新、分隊計畫、特區、兌換碼。

歷史資料只往後新增，不覆蓋。儲存頻率：jQt、aQt 每天；其他聯盟的戰力歷史每週一、玩家檔案細項每兩週。

### 觸發器

`setupAllTriggers`：每小時 `syncOurAlliances`、每天 3 點 `syncStateRoster`（分段接力）、4 點 `syncPlayerDetails`（分段接力）。`setupGiftTrigger`：每小時 `checkGiftCodes`。

### 部署

改完 Apps Script 一定要：部署 → 管理部署作業 → 編輯 → 版本選「新版本」→ 部署（網址不變）。使用者曾經忘記這一步，導致功能失敗。

## whiteoutstats API

- `GET /v1/alliances/{kid}/{tag}?include=info,roster`（tag 區分大小寫）
- `GET /v1/players/{fid}?include=base,ranks`：VIP、熔爐、擊殺、戰力、迷宮、六個關卡（魔物洞穴等，`value%10000` 是累計關數）、全服排名
- `GET /v1/states/{kid}/ranks?limit=100`：各排行榜前 100
- 免費版：每分鐘 60 次、每天 5,000 次，資料最多延遲 60 分鐘
- 沒有「列出全王國玩家」的端點；州的 `player_count` 不可信（顯示 718，實際收集約 1,985 人）
- 有 18 個聯盟簡稱回傳 404（nex、HSk、IND、NOT、WLF、gQt、8Qt、WYB、BOO、GRD、5Qt、awa、Kor、GdH、GDT、WEH、EEE、090）
- 沒有個人兵種戰力

## 活動規則（來自第三方攻略，以遊戲內為準）

| 活動 | 代號 | 報名方式 | 預設名額 |
|---|---|---|---|
| 兵工廠 | `foundry` | 選特區＋軍團一／二 | 每軍團正選 30＋候補 10，最多 2 軍團，熔爐 16 以上 |
| 峽谷會戰 | `canyon` | 選特區＋軍團一／二 | 同上，每軍團至少 15 人才能配對 |
| 太陽城 | `sfc` | 參加（不分特區） | 沒有上限；一鍵報名預設 50 |
| 雪域兵器聯賽 | `tal` | 選特區＋目標聯盟 | 每軍團正選 30＋候補 20，最多 2 軍團 |
| 霜龍霸主 | `frost` | 選特區＋目標聯盟 | 最多 60 人，候補預設 0 |

正選／候補記在報名的「備註」欄（`note`：`正選`／`候補`）。

## 已定案的設計

- **特區**：一群聯盟組成的活動單位，一個聯盟只能屬於一個特區。預設「jQt・aQt 特區」（id `jqt`）。幹部可建立包含自己聯盟的特區，只能改自己建立的；預設特區只有管理員能改。
- **兵工廠與峽谷必須同一個特區**（遊戲中同時截止）；前端鎖定，後端 `registerZ_` 會回 `zone_conflict`。
- 各特區有自己的截止時間（兵工廠＋峽谷共用一組、雪域、霜龍），特區裡任何聯盟的幹部都能設；沒設就用管理員的預設截止。太陽城是全王國共用。
- 沒有特區的舊報名，依玩家目前的聯盟自動對應特區。
- 玩家換聯盟不影響報名，以報名時選的特區為準；不在特區內的人標「需要先轉聯盟」。
- 取消報名寫成 `choice:'out'`，一鍵報名與批次報名都不會把他加回來（除非勾選強制）。
- **分隊（v6）**：先分軍團（依報名，或槓鈴重分），軍團內預設「槓鈴」：每隊平分頭部強者與尾部新手，中段再補平。兩個活動可一起分，同一人兩場會在同一聯盟。常駐規則（固定、限定聯盟、互斥群組）跟著分隊存檔；大小號時間衝突提示；最多保留 5 個版本。
- 出席率只給幹部看（尚未實作）。

## 不做的事

- **不寫自動兌換程式**：官方兌換頁有驗證碼，大量自動兌換需要破解驗證碼，不協助。改做：複製 ID 清單、兌換碼通知與兌換教學。
- LINE Notify 已在 2025 年 3 月底停止服務，不要用它做推播。
- 不重現遊戲官方的美術、標誌、角色。

## 驗證與測試（每次修改都要做）

完整流程寫在 `.claude/skills/verify/SKILL.md`（`/verify`）；審查規則在 `REVIEW.md`。重點：

1. **沒驗證不 commit。** 改 `index.html` 後依序執行，全部都要通過：
   ```bash
   node tools/check.mjs       # 語法、重複 const、新增同名 function、補丁位置、版本號、寫死的秘密（1 秒）
   node tools/smoke.mjs       # iPhone 尺寸開頁、四個分頁走一遍、零 JS 錯誤、截圖
   node tools/prop.mjs        # 屬性測試：分隊、一鍵／批次報名、截止與權限，各 600 組隨機輸入
   node tools/e2e.mjs         # 端到端：全玩家、報名＋特區、截止、幹部／管理員登入與權限（31 項）
   node tools/workbench.mjs   # 分隊工作台：所有按鈕點一遍，零 JS 錯誤、人數守恆
   ```
   沒有 npm、沒有建置；腳本只用 Node 與環境內建的 Playwright。`prop.mjs` 可加參數 `[次數] [亂數種子]` 跑更多（例：`node tools/prop.mjs 3000 777`）。
2. **測試不碰正式資料**：所有腳本都攔截 Apps Script 連線；`e2e.mjs`、`workbench.mjs` 用 `tools/fake-backend.mjs`（記憶體裡的假後端，測試帳密是假的 `test-admin`／`test-cadre`）。驗證時**絕對不可**對 `config.js` 裡的正式網址送 POST（會改到全王國的報名）。後端回傳格式改了，`fake-backend.mjs` 要一起改。
3. **改到純邏輯要擴充屬性測試**：改到分隊（槓鈴、軍團、互斥群組）、正選／候補名額、截止時間判斷、權限範圍、特區對應時，在 `tools/prop.mjs` 加上對應的屬性（新功能就新增一段），至少驗證：
   - 不變量：每人最多出現在一隊；正選數不超過名額；兵工廠與峽谷同一特區；幹部動不到別聯盟的人。
   - 冪等：一鍵報名跑兩次＝跑一次；`choice:'out'` 的人不會被加回來。
   - 往返：存檔後讀回的分隊計畫與規則完全相同。
4. **重構要差分測試**：改寫既有函數時，用 `git show HEAD:index.html` 取出舊版當標準答案，相同隨機輸入比對新舊輸出。
5. **Apps Script 不在 repo**，無法在這裡執行：交付時寫清楚「在編輯器先執行哪個函數、看紀錄裡哪一行」，並提醒重新部署成新版本。
6. **使用者的回報是第一手驗證**：瀏覽器自動化抓不到 iPhone Safari 的實際手感（固定表頭、動態效果、捲動），這些要請使用者實測。
7. **禁止欺騙驗證器**：不放寬檢查、不加 `sleep` 掩蓋問題、不為了過關改 `tools/dup-functions-baseline.txt` 或 `REVIEW.md`。同一個錯誤修 3 輪仍失敗就停下，回報證據與試過的三個方向。
8. **測試本身也要能抓錯**：新增屬性或流程時，在暫存目錄的副本故意改壞對應程式，確認測試會失敗後再提交。
9. **抓到漏網之魚就變成規則**：能從 diff 機械判斷的，加進 `tools/check.mjs`；行為上的錯誤，加進 `tools/prop.mjs` 或 `tools/e2e.mjs`；寫程式常犯的，在本檔加一行禁令；特定模組的陷阱，加一列到 `REVIEW.md`。

### 交付給使用者的測試清單

1. 登入卡片版本號正確。
2. 全玩家：表格載入、排序篩選、點人開視窗。
3. 報名：選特區＋軍團送出，「活動報名」名單同步出現。
4. 幹部功能用一個幹部帳號實測權限範圍。
5. 改到 Apps Script 時：先在編輯器執行相關函數看紀錄，再重新部署成新版本。

## 尚未完成

1. v7.1 兌換碼：等使用者回報 `checkGiftCodes` 第一次執行的紀錄，依結果調整抓取規則（來源網站可能擋連線或改版）。
2. 一鍵報名、全玩家批次報名加上「選特區」（目前自動用玩家聯盟所屬的特區）。
3. 賽後總結與出席紀錄（每聯盟預設全員出席，標請假／缺席，寫入活動紀錄，幹部看出席率）。
4. 太陽城、雪域、霜龍的最終名單選拔工具。
5. 搜尋玩家舊暱稱。
6. 多個功能從未實際執行過（分隊工作台、批次報名、特區、主題動態效果、iPhone 上的固定表頭），使用者回報的結果要當成第一手驗證。
