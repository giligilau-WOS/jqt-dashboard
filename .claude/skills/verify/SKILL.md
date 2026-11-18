---
name: verify
description: 2611王國名冊提交前驗證。改完 index.html（或交付 Apps Script 程式）後、git commit 之前執行：靜態檢查、iPhone 尺寸冒煙測試、邏輯屬性測試，最後產出驗證報告。
---

# 提交前驗證（2611王國）

沒有建置、沒有 npm。工具只有 Node 與環境內建的 Playwright（`require('playwright')` 直接可用，不要重新安裝）。

## 1. 低成本檢查（必做）

```bash
node tools/check.mjs
```

檢查：內嵌腳本語法（含重複 `const`）、新增的同名 `function`、補丁是否在「畫面」之前、`index.html` 改了但 `APP_VERSION` 沒改、寫死的 PIN／金鑰、`.gs`（若存在）語法與 `Code.gs`／`Plans.gs` 分工。有 ❌ 先修，全部通過才進下一步。

## 2. 冒煙測試（必做）

```bash
node tools/smoke.mjs
```

以 iPhone 13 尺寸開 `index.html`，**攔截全部 Apps Script 連線、拒絕所有 POST**，依序點四個分頁，確認：沒有 JS 錯誤、分頁不是空白、後台顯示 `APP_VERSION`、沒有水平捲動。截圖在 `tools/.smoke/`（已 gitignore），打開看一下這次改到的那一頁。

接著跑端到端流程與工作台點擊測試（都用 `tools/fake-backend.mjs` 假後端）：

```bash
node tools/e2e.mjs
node tools/workbench.mjs
```

這次的改動有新的互動（按鈕、視窗、表單）時，在 `tools/e2e.mjs` 加一段流程：需要的假資料與 POST 動作加在 `fake-backend.mjs`，實際點過該流程並檢查畫面與送出的 POST 內容（`W.posts` 裡的 body 要符合預期的 `action` 與欄位）。

**禁止**對 `config.js` 的正式網址送任何 POST。

## 3. 邏輯測試（改到純邏輯時必做）

觸發：分隊、正選／候補名額、一鍵／批次報名、截止時間、權限範圍、特區對應、資料格式轉換。

```bash
node tools/prop.mjs            # 預設每組 600 次
node tools/prop.mjs 3000 777   # 改到邏輯時跑多一點、換種子
```

`prop.mjs` 在真實頁面裡直接呼叫函數（`wAll`、`wLegions`、`brCalc`、`bmPlan`、`canReg`、`zDl`、`zOfReg`）。新邏輯就在裡面新增一段，輸入含邊界（0 人、1 人、剛好名額、超過名額、同名玩家、空特區、截止時間剛好等於現在）。至少驗證兩項：

- **不變量**：每人最多一隊；正選 ≤ 名額；兵工廠與峽谷同特區；幹部不會改到別聯盟；`choice:'out'` 不被加回。
- **冪等**：同一操作做兩次＝做一次。
- **往返**：存檔→讀回後完全相同。
- **差分**（重構時）：`git show HEAD:index.html` 的舊版當標準答案，同輸入比對新舊輸出。

## 4. 失敗處理

- 新增或修改測試時，先在暫存目錄的副本故意改壞程式，確認測試會失敗。
- 依錯誤訊息與截圖修正後重跑。不得放寬檢查、加 `sleep` 掩蓋、修改 `tools/dup-functions-baseline.txt` 或 `REVIEW.md` 來過關。
- 同一個問題連續 3 輪仍失敗：停止修改，回報錯誤證據與試過的三個方向。

## 5. 驗證報告（回覆使用者時附上）

```
驗證印記：verified: [check, smoke, prop, e2e, workbench, differential?]（沒做的項目寫「未做：原因」）
- node tools/check.mjs → 通過／失敗摘要
- node tools/smoke.mjs → 通過，版本 X
- node tools/prop.mjs → N 組隨機輸入，驗證了哪些屬性
- node tools/e2e.mjs → X/Y 通過；node tools/workbench.mjs → 點擊次數、零錯誤
- 過程中抓到並修好的問題
- 這裡驗證不到、需要使用者在 iPhone 實測的項目（Apps Script、實際資料、Safari 手感）
登入卡片的版本應該是 X
```

最後附上 `CLAUDE.md` 裡「交付給使用者的測試清單」。若有 Apps Script 改動，寫清楚在編輯器執行哪個函數、看紀錄哪一行、然後「部署 → 管理部署作業 → 編輯 → 新版本」。
