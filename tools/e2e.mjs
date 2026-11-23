#!/usr/bin/env node
// 端到端流程測試：node tools/e2e.mjs
// 假後端（tools/fake-backend.mjs）＋iPhone 13，實際點畫面：全玩家、報名＋特區、截止、幹部／管理員登入與權限、
// 以及 Modern Web Guidance 檢查項目（輸入法 Enter、深色 color-scheme、提示 aria-live、視窗 dvh）。
// 截圖存到 SMOKE_OUT（預設 tools/.smoke/）。
import { createRequire } from 'node:module';
import { makeWorld, attach } from './fake-backend.mjs';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = process.env.SMOKE_OUT || path.join(ROOT, 'tools/.smoke'); mkdirSync(OUT, { recursive: true });

const res = []; const ok = (name, cond, info = '') => { res.push([cond, name, info]); };
const b = await chromium.launch();

async function fresh(W, auth) {
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); const page = await ctx.newPage();
  page.errs = []; page.on('pageerror', e => page.errs.push(e.message));
  await attach(page, W);
  if (auth) await page.addInitScript(a => localStorage.setItem('k2611-auth', JSON.stringify(a)), auth);
  await page.goto('file://' + ROOT + '/index.html'); await page.waitForFunction(() => D.rows.length > 0 && Z.list.length > 0, null, { timeout: 10000 });
  return page;
}
const tab = async (p, k) => { await p.click(`#nav button[data-v="${k}"]`); await p.waitForTimeout(250); };
const toast = p => p.evaluate(() => (document.querySelector('.toast,#toast') || {}).textContent || '');

// ---------- 1. 全玩家：載入、排序、搜尋跳轉、開視窗 ----------
{
  const W = makeWorld(); const p = await fresh(W);
  const trs = await p.$$eval('#ptb tr[data-fid]', x => x.length);
  ok('全玩家：表格有畫出列（虛擬捲動）', trs > 5 && trs < 81, `畫出 ${trs} 列／共 81 人`);
  const pw = await p.$$eval('#ptb tr[data-fid]', x => x.slice(0, 10).map(t => t.dataset.fid));
  const powers = await p.evaluate(f => f.map(x => D.byF[x].power), pw);
  ok('全玩家：預設依戰力由高到低', powers.every((v, i) => !i || powers[i - 1] >= v));
  await p.click('th[data-a="hmenu"][data-v="power"]'); await p.waitForTimeout(200);
  ok('全玩家：點欄位標題打開排序視窗', await p.isVisible('#sheet.on [data-a="sort"]'));
  await p.click('[data-a="sort"][data-v="power|1"]'); await p.waitForTimeout(300);
  const asc = await p.evaluate(() => P.view.slice(0, 20).map(r => r.power));
  ok('全玩家：改成升序後順序正確', asc.every((v, i) => !i || asc[i - 1] <= v), asc.slice(0, 3).join(','));
  if (await p.isVisible('#sheet.on')) await p.click('#sheet [data-close] >> nth=-1').catch(() => {});
  await p.waitForTimeout(200);
  await p.fill('#qs', '超長名字'); await p.waitForTimeout(300);
  const sug = p.locator('[data-a] >> text=超長名字的測試玩家').first();
  if (await sug.count()) { await sug.click(); await p.waitForTimeout(400); }
  ok('全玩家：搜尋名字跳到該列並標示', await p.evaluate(() => P.hl === '99999' && !!document.querySelector('#ptb tr.hl[data-fid="99999"]')));
  await p.click('#ptb tr[data-fid="99999"] td.nm'); await p.waitForTimeout(400);
  ok('全玩家：點列開玩家視窗', await p.evaluate(() => U.sh && U.sh.kind === 'player' && U.sh.fid === '99999' && document.querySelector('#sheet').classList.contains('on')));
  const over = await p.evaluate(() => document.querySelector('#sheet .pn').scrollWidth - document.querySelector('#sheet .pn').clientWidth);
  ok('玩家視窗：超長名字不造成水平捲動', over <= 2, `多 ${over}px`);
  await p.screenshot({ path: OUT + '/e2e-1-sheet.png' });
  ok('流程 1 沒有 JS 錯誤', !p.errs.length, p.errs.join(' | '));
  await p.context().close();
}

// ---------- 2. 一般玩家報名：選特區＋軍團 → 名單出現；峽谷鎖同特區；取消；截止 ----------
{
  const W = makeWorld(); const p = await fresh(W);
  const fid = '10003'; // jQt
  await p.evaluate(f => openSheet({ kind: 'player', fid: f, tab: 'reg' }), fid); await p.waitForTimeout(300);
  const sel = `select[data-zsel="foundry|${fid}"]`;
  ok('報名：兵工廠有特區選單', await p.isVisible(sel));
  ok('報名：預設選自己聯盟的特區', (await p.$eval(sel, s => s.value)) === 'jqt');
  await p.click(`[data-a="z_reg"][data-ev="foundry"][data-fid="${fid}"][data-v="1"]`); await p.waitForTimeout(400);
  const post = W.posts.find(x => x.action === 'register' && x.event === 'foundry');
  ok('報名：送出 register（特區 jqt、軍團一）', !!post && post.zone === 'jqt' && post.choice === '1', JSON.stringify(post || {}));
  ok('報名：POST 不帶管理員或幹部憑證', post && !('pin' in post) && !('code' in post));
  ok('報名：峽谷特區被鎖成同一個（沒有下拉選單）', !(await p.isVisible(`select[data-zsel="canyon|${fid}"]`)));
  await p.click(`[data-a="z_reg"][data-ev="canyon"][data-fid="${fid}"][data-v="2"]`); await p.waitForTimeout(400);
  const pc = W.posts.find(x => x.action === 'register' && x.event === 'canyon');
  ok('報名：峽谷沿用兵工廠的特區', pc && pc.zone === 'jqt', JSON.stringify(pc || {}));
  await p.evaluate(() => { U.sh = null; renderSheet() });
  await tab(p, 'signups');
  await p.click('[data-a="sgT"][data-v="foundry"]'); await p.waitForTimeout(300);
  const nm = await p.evaluate(f => D.byF[f].name, fid);
  ok('報名：「活動報名」兵工廠名單出現此人', (await p.locator('#main').innerText()).includes(nm));
  await p.screenshot({ path: OUT + '/e2e-2-signups.png' });
  // 換到 XYZ 特區報兵工廠 → 被拒（因峽谷已在 jqt）時要顯示原因
  const fid2 = '10006'; // jQt
  await p.evaluate(f => openSheet({ kind: 'player', fid: f, tab: 'reg' }), fid2); await p.waitForTimeout(300);
  await p.selectOption(`select[data-zsel="foundry|${fid2}"]`, 'x'); await p.waitForTimeout(200);
  const warn = await p.locator('#sheet').innerText();
  ok('報名：選了不含自己聯盟的特區會提示要轉聯盟', /不在這個特區|需要轉聯盟/.test(warn));
  // 取消
  await p.evaluate(f => openSheet({ kind: 'player', fid: f, tab: 'reg' }), fid); await p.waitForTimeout(300);
  await p.click(`[data-a="z_reg"][data-ev="foundry"][data-fid="${fid}"][data-v="out"]`); await p.waitForTimeout(400);
  const po = W.posts.filter(x => x.action === 'register' && x.event === 'foundry').pop();
  ok('報名：取消寫成 choice:out', po && po.choice === 'out');
  ok('流程 2 沒有 JS 錯誤', !p.errs.length, p.errs.join(' | '));
  await p.context().close();
  // 截止後一般玩家按鈕要停用
  const W2 = makeWorld(); W2.deadlines = { foundry: new Date(Date.now() - 3600e3).toISOString(), canyon: new Date(Date.now() - 3600e3).toISOString() };
  const p2 = await fresh(W2);
  await p2.evaluate(() => openSheet({ kind: 'player', fid: '10003', tab: 'reg' })); await p2.waitForTimeout(300);
  ok('截止：一般玩家的兵工廠按鈕被停用', await p2.$eval('[data-a="z_reg"][data-ev="foundry"][data-v="1"]', e => e.disabled));
  ok('截止：太陽城沒截止仍可按', !(await p2.$eval('[data-a="z_reg"][data-ev="sfc"][data-v="in"]', e => e.disabled).catch(() => true)));
  await p2.context().close();
}

// ---------- 3. 幹部登入與權限範圍 ----------
{
  const W = makeWorld(); W.deadlines = { foundry: new Date(Date.now() - 3600e3).toISOString(), canyon: new Date(Date.now() - 3600e3).toISOString() };
  const p = await fresh(W);
  await tab(p, 'admin');
  if (await p.isVisible('[data-a="lgMode"][data-v="cadre"]')) await p.click('[data-a="lgMode"][data-v="cadre"]');
  await p.fill('#lgq', '玩家00'); await p.waitForTimeout(300);
  const pick = p.locator('[data-a="lgPick"]').first();
  ok('幹部登入：輸入名字出現 R4/R5 建議', await pick.count() > 0);
  if (await pick.count()) await pick.click();
  await p.waitForTimeout(200);
  await p.fill('#lgc', 'wrong'); await p.click('[data-a="login"]'); await p.waitForTimeout(400);
  ok('幹部登入：密碼錯誤不會登入', await p.evaluate(() => !AU));
  await p.fill('#lgc', 'test-cadre'); await p.click('[data-a="login"]'); await p.waitForTimeout(500);
  const au = await p.evaluate(() => AU);
  ok('幹部登入：成功後 AU 是幹部、聯盟 jQt', au && au.role === 'cadre' && au.al === 'jQt', JSON.stringify(au && { role: au.role, al: au.al }));
  ok('幹部登入：登入後後台顯示版本號', (await p.locator('#main').innerText()).includes(await p.evaluate(() => APP_VERSION)));
  // 截止後：可改自己聯盟（jQt），不能改別聯盟（XYZ）
  await p.evaluate(() => openSheet({ kind: 'player', fid: '10003', tab: 'reg' })); await p.waitForTimeout(300);
  ok('幹部權限：截止後仍可改自己聯盟的兵工廠', !(await p.$eval('[data-a="z_reg"][data-ev="foundry"][data-v="1"]', e => e.disabled)));
  await p.evaluate(() => openSheet({ kind: 'player', fid: '10002', tab: 'reg' })); await p.waitForTimeout(300);
  ok('幹部權限：截止後不能改別聯盟（XYZ）的兵工廠', await p.$eval('[data-a="z_reg"][data-ev="foundry"][data-v="1"]', e => e.disabled));
  await p.evaluate(() => { U.sh = null; renderSheet() });
  // 存到 localStorage 的登入資料不應有 PIN 以外的秘密外洩到畫面
  await tab(p, 'lists'); await p.waitForTimeout(400);
  const lt = await p.locator('#main').innerText();
  ok('幹部：活動名單分頁有分隊工作台入口（進入分隊）', await p.locator('[data-a="w_open"][data-v="foundry"]').count() > 0 && lt.includes('進入分隊'));
  await p.screenshot({ path: OUT + '/e2e-3-lists.png' });
  ok('流程 3 沒有 JS 錯誤', !p.errs.length, p.errs.join(' | '));
  await p.context().close();
}

// ---------- 4. 管理員 PIN 登入 ----------
{
  const W = makeWorld(); const p = await fresh(W);
  await tab(p, 'admin'); await p.click('[data-a="lgMode"][data-v="admin"]'); await p.waitForTimeout(200);
  await p.fill('#lgp', 'test-admin');
  const btn = p.locator('#main button:has-text("登入")').last(); await btn.click(); await p.waitForTimeout(500);
  ok('管理員登入：PIN 正確後是管理員', await p.evaluate(() => AU && AU.role === 'admin'));
  const t = await p.locator('#main').innerText();
  ok('管理員：畫面沒有顯示 PIN', !t.includes('test-admin'));
  ok('流程 4 沒有 JS 錯誤', !p.errs.length, p.errs.join(' | '));
  await p.context().close();
}

// ---------- 5. Modern Web Guidance 檢查項目（v7.1.2） ----------
{
  const W = makeWorld(); const p = await fresh(W);
  // 注音、倉頡等輸入法：按 Enter 確認選字時（isComposing 或 keyCode 229）不能跳轉
  const enter = (o) => p.evaluate(o => { P.hl = ''; const q = document.querySelector('#qs'); q.value = '玩家05'; q.focus(); const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: o.comp }); if (o.kc) Object.defineProperty(e, 'keyCode', { get: () => o.kc }); q.dispatchEvent(e); return P.hl }, o);
  ok('輸入法選字中按 Enter（isComposing）不會跳轉', (await enter({ comp: true })) === '');
  ok('輸入法選字中按 Enter（Safari 的 keyCode 229）不會跳轉', (await enter({ comp: false, kc: 229 })) === '');
  ok('打完字再按 Enter 會跳到該玩家', (await enter({ comp: false, kc: 13 })) === '10005');
  // 深色主題要讓原生控制項（日期、時間、勾選框、捲軸）也變深色
  const cs = () => p.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  await p.evaluate(() => { document.documentElement.dataset.theme = 'dark' }); const dk = await cs();
  await p.evaluate(() => { document.documentElement.dataset.theme = 'light' }); const lt = await cs();
  ok('深色主題 color-scheme 是 dark、淺色是 light', dk === 'dark' && lt === 'light', `dark=${dk} light=${lt}`);
  ok('提示訊息有 aria-live，VoiceOver 會唸出來', await p.$eval('#toast', t => t.getAttribute('role') === 'status' && t.getAttribute('aria-live') === 'polite'));
  ok('底部視窗高度用 dvh（Safari 工具列出現時不被切掉）', await p.evaluate(() => [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.selectorText === '#sheet .pn' && r.style.maxHeight.includes('dvh')) } catch { return false } })));
  ok('流程 5 沒有 JS 錯誤', !p.errs.length, p.errs.join(' | '));
  await p.context().close();
}

await b.close();
let f = 0; for (const [c, n, i] of res) { if (!c) f++; console.log(`${c ? '✅' : '❌'} ${n}${i ? '　（' + i + '）' : ''}`); }
console.log(`\n${res.length - f}/${res.length} 通過`); process.exit(f ? 1 : 0);
