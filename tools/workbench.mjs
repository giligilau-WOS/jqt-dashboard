#!/usr/bin/env node
// 分隊工作台點擊測試：node tools/workbench.mjs
// 以幹部、管理員身分進入兵工廠與峽谷的分隊工作台，四個分頁的每個 w_ 按鈕都點一次，
// 檢查沒有 JS 錯誤、每次重算後人數守恆。只用假後端。
import { createRequire } from 'node:module'; import { makeWorld, attach } from './fake-backend.mjs';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url); const { chromium, devices } = require('playwright');
{}
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = process.env.SMOKE_OUT || path.join(ROOT, 'tools/.smoke'); mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const W = makeWorld(); W.rows.forEach((r, i) => { if (r[2] !== 'XYZ' && i % 4 !== 3) { W.regs.foundry[r[0]] = { choice: i % 2 ? '1' : '2', play: '', note: '' }; W.regs.canyon[r[0]] = { choice: i % 3 ? '1' : '2', play: '', note: '' } } });
let clicks = 0; const errs = [], cons = [];
for (const role of [{ role: 'cadre', fid: '10000', code: 'x', name: '玩家00', al: 'jQt' }, { role: 'admin', pin: 'x', name: '管理員', al: '*' }]) {
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(role.role + '：' + e.message)); p.on('dialog', d => d.dismiss());
  await attach(p, W); await p.addInitScript(a => localStorage.setItem('k2611-auth', JSON.stringify(a)), role);
  await p.goto('file://' + ROOT + '/index.html'); await p.waitForFunction(() => D.rows.length && Z.list.length);
  await p.click('#nav button[data-v="lists"]'); await p.waitForTimeout(500);
  for (const ev of ['foundry', 'canyon']) {
    await p.click(`[data-a="w_open"][data-v="${ev}"]`); await p.waitForTimeout(800);
    for (const t of ['team', 'adj', 'rule', 'pub', 'team']) {
      await p.click(`[data-a="w_tab"][data-v="${t}"]`); await p.waitForTimeout(300);
      const sig = await p.$$eval('#main [data-a^="w"]', es => es.map(e => e.dataset.a + '|' + (e.dataset.v || '')));
      for (const s of [...new Set(sig)]) {
        const [a, v] = s.split('|'); if (['w_back', 'w_tab', 'w_open', 'w_zone'].includes(a) || /del|reset|publish|lock|clear/i.test(a)) continue;
        const loc = p.locator(`#main [data-a="${a}"]${v ? `[data-v="${v}"]` : ':not([data-v])'}`).first();
        if (!(await loc.count()) || !(await loc.isVisible()) || await loc.isDisabled()) continue;
        await loc.click({ timeout: 2000 }).catch(() => {}); clicks++; await p.waitForTimeout(120);
        if (await p.isVisible('#sheet.on')) { await p.evaluate(() => { U.sh = null; renderSheet() }) }
        const bad = await p.evaluate(() => { if (!W.plan) return ''; try { const R = wAll(W.plan); for (const ev of W.plan.evs) { const r = R[ev], P = wpool(W.plan, ev), n = r.teams.reduce((s, x) => s + x.list.length, 0) + r.wait.length + r.none.length; if (n !== P.length) return ev + ' 人數 ' + n + '≠' + P.length } } catch (e) { return '例外 ' + e.message } return '' });
        if (bad) cons.push(`${role.role} ${t} 點 ${s} 後：${bad}`);
        if (!(await p.isVisible('[data-a="w_tab"]'))) { await p.click('#nav button[data-v="lists"]').catch(() => {}); if (await p.isVisible(`[data-a="w_open"][data-v="${ev}"]`)) await p.click(`[data-a="w_open"][data-v="${ev}"]`); await p.waitForTimeout(400); await p.click(`[data-a="w_tab"][data-v="${t}"]`).catch(() => {}); }
      }
      await p.screenshot({ path: `${OUT}/wb-${role.role}-${ev}-${t}.png` });
    }
    await p.click('[data-a="w_back"]').catch(() => {}); await p.waitForTimeout(400);
  }
  await ctx.close();
}
await b.close();
console.log('點擊次數', clicks, '｜送出的 POST：', JSON.stringify([...new Set(W.posts.map(x => x.action))]));
console.log(errs.length ? '❌ JS 錯誤：\n' + [...new Set(errs)].join('\n') : '✅ 沒有 JS 錯誤');
console.log(cons.length ? '❌ 人數不守恆：\n' + cons.slice(0, 10).join('\n') : '✅ 每次點擊後分隊人數都守恆');
process.exit(errs.length || cons.length || !clicks ? 1 : 0);
