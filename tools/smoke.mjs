#!/usr/bin/env node
// 端到端冒煙測試：node tools/smoke.mjs
// 以 iPhone 尺寸開啟 index.html，攔截所有對 Apps Script 的連線（不碰正式資料），
// 走過四個分頁與後台版本號，確認沒有任何 JavaScript 錯誤，並存截圖。
// 截圖存到 SMOKE_OUT（預設 tools/.smoke/，已列入 .gitignore）。
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.env.SMOKE_OUT || path.join(root, 'tools/.smoke');
mkdirSync(out, { recursive: true });
const fails = [], log = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
page.on('pageerror', e => fails.push('頁面錯誤：' + e.message));
page.on('console', m => { if (m.type() === 'error') log.push('console.error：' + m.text()); });

// 假的 Apps Script：GET 回空資料、POST 一律拒絕，確保不會寫到正式試算表
const posts = [];
await page.route(/script\.google(usercontent)?\.com/, async r => {
  const q = r.request();
  if (q.method() === 'POST') { posts.push(q.postData()); return r.fulfill({ json: { status: 'error', message: 'smoke-test：不允許寫入' } }); }
  const a = new URL(q.url()).searchParams.get('action') || '';
  return r.fulfill({ json: { status: 'ok', action: a, rows: [], players: [], regs: {}, accounts: [], zones: [], plans: [], codes: [] } });
});
// 其他外部網址（字型、CDN）不連，避免測試結果受網路影響
await page.route(u => !/^(file:|data:|blob:)/.test(u.href) && !/script\.google/.test(u.href), r => r.abort());

await page.goto('file://' + path.join(root, 'index.html'));
await page.waitForSelector('#nav button', { timeout: 10000 });
const ver = await page.evaluate(() => typeof APP_VERSION === 'string' ? APP_VERSION : null);
if (!ver) fails.push('APP_VERSION 不存在');

const tabs = [['players', '全玩家'], ['signups', '活動報名'], ['lists', '活動名單'], ['admin', '後台設定']];
for (const [k, label] of tabs) {
  const btn = page.locator(`#nav button[data-v="${k}"]`);
  if (!(await btn.count())) { fails.push(`找不到分頁按鈕：${label}`); continue; }
  await btn.click();
  await page.waitForTimeout(300); // 等 render 包裝鏈（fitNames、fxSync…）跑完，非等網路
  const txt = (await page.locator('#main').innerText()).trim();
  if (!txt) fails.push(`${label} 分頁是空白`);
  if (k === 'admin' && ver && !txt.includes(ver)) fails.push(`後台沒有顯示版本 ${ver}`);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (over > 2) fails.push(`${label} 分頁在 iPhone 寬度有水平捲動（多 ${over}px）`);
  await page.screenshot({ path: path.join(out, `${k}.png`) });
  console.log(`✅ ${label}（${txt.length} 字）`);
}
if (posts.length) console.log(`ℹ️  載入過程送出 ${posts.length} 個 POST（已被攔截）`);
await browser.close();

for (const s of log) console.log('⚠️  ' + s.slice(0, 200));
for (const s of fails) console.log('❌ ' + s);
console.log(fails.length ? `\n冒煙測試失敗：${fails.length} 項` : `\n冒煙測試通過（版本 ${ver}），截圖在 ${out}`);
process.exit(fails.length ? 1 : 0);
