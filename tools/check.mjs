#!/usr/bin/env node
// 低成本靜態檢查（不需安裝任何套件）：node tools/check.mjs
// 1. index.html 內嵌腳本語法（含 const／let 重複宣告，這會讓整個腳本失效）
// 2. 新增的同名 function 宣告（hoisting 會讓最後一個覆蓋前面全部）
// 3. 補丁位置：所有 /* ===== vX.Y ===== */ 必須在 /* ===== 畫面 ===== */ 之前
// 4. index.html 有改動但 APP_VERSION 沒有更新
// 4b. keydown 的 Enter 沒避開輸入法選字
// 5. 疑似金鑰、PIN、密碼寫死在程式碼
// 6. Apps Script（*.gs，若存在）語法與 Code.gs／Plans.gs 函數分工
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import vm from 'node:vm';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const errs = [], warns = [], oks = [];

// 1. 語法
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!scripts.length) errs.push('找不到內嵌 <script>');
scripts.forEach((s, i) => {
  try { new vm.Script(s, { filename: `index.html#script${i + 1}` }); oks.push(`腳本 ${i + 1} 語法正確（${s.split('\n').length} 行）`); }
  catch (e) { errs.push(`腳本 ${i + 1} 語法錯誤：${e.message}`); }
});

// 2. 同名 function 宣告（只擋「新增的」，既有的列在 baseline）
const base = new Set(readFileSync(path.join(root, 'tools/dup-functions-baseline.txt'), 'utf8').split('\n').filter(Boolean));
const cnt = {};
for (const m of html.matchAll(/^(?:async )?function ([A-Za-z0-9_$]+)/gm)) cnt[m[1]] = (cnt[m[1]] || 0) + 1;
const dups = Object.keys(cnt).filter(k => cnt[k] > 1);
const fresh = dups.filter(k => !base.has(k));
if (fresh.length) errs.push(`新增的同名 function 宣告（請改用「const _rdX=fn;fn=function(){…}」包裝）：${fresh.join('、')}`);
else oks.push(`沒有新增同名 function 宣告（既有 ${dups.length} 個列在 baseline）`);
const gone = [...base].filter(k => !dups.includes(k));
if (gone.length) warns.push(`baseline 裡這些已不再重複，可從 tools/dup-functions-baseline.txt 移除：${gone.join('、')}`);

// 3. 補丁位置
const screen = html.indexOf('/* ===== 畫面 ===== */');
if (screen < 0) errs.push('找不到 /* ===== 畫面 ===== */ 標記');
else {
  const late = [...html.matchAll(/\/\* ===== (v[\d.]+[^*]*?) ===== \*\//g)].filter(m => m.index > screen).map(m => m[1]);
  if (late.length) errs.push(`這些補丁貼在「畫面」之後：${late.join('；')}`);
  else oks.push('所有版本補丁都在「畫面」區段之前');
}

// 4. APP_VERSION
const ver = (html.match(/APP_VERSION='([^']+)'/) || [])[1];
if (!ver) errs.push('找不到 APP_VERSION');
let headHtml = null;
try { headHtml = execSync('git show HEAD:index.html', { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }); } catch {}
if (headHtml != null && ver) {
  const headVer = (headHtml.match(/APP_VERSION='([^']+)'/) || [])[1];
  if (headHtml !== html && headVer === ver) errs.push(`index.html 有改動，但 APP_VERSION 仍是 ${ver}，請更新版本號`);
  else oks.push(`APP_VERSION=${ver}${headVer !== ver ? `（HEAD 是 ${headVer}）` : '（index.html 未改動）'}`);
}

// 4b. 按 Enter 觸發動作的 keydown 必須避開輸入法選字（注音、倉頡按 Enter 是確認選字）
const enterBad = html.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /keydown/.test(l) && /key\s*===\s*['"]Enter['"]/.test(l) && !(/isComposing/.test(l) && /229/.test(l)));
if (enterBad.length) errs.push(`keydown 的 Enter 沒有檢查輸入法選字（要加 !e.isComposing&&e.keyCode!==229），第 ${enterBad.map(x => x[0]).join('、')} 行`);
else oks.push('Enter 鍵處理都有避開輸入法選字');

// 5. 疑似寫死的秘密
const files = ['index.html', 'config.js', ...readdirSync(root).filter(f => f.endsWith('.gs'))];
const pats = [
  [/Bearer\s+[A-Za-z0-9._-]{20,}/, 'Bearer 金鑰'],
  [/\b(ADMIN_TOKEN|CADRE_CODE|WOS_API_KEY)\b\s*[:=]\s*['"][^'"]{3,}['"]/, '指令碼屬性的值'],
  [/\bpin\s*:\s*['"]\d{4,}['"]/, 'PIN'],
];
for (const f of files) {
  const p = path.join(root, f); if (!existsSync(p)) continue;
  const t = readFileSync(p, 'utf8');
  for (const [re, label] of pats) if (re.test(t)) errs.push(`${f} 疑似寫死 ${label}：${t.match(re)[0].slice(0, 40)}…`);
}
if (/token\s*:\s*'[^']+'/.test(readFileSync(path.join(root, 'config.js'), 'utf8'))) warns.push('config.js 的 token 不是空字串，請確認不是密碼');

// 6. Apps Script
const gs = readdirSync(root).filter(f => f.endsWith('.gs'));
for (const f of gs) {
  try { new vm.Script(readFileSync(path.join(root, f), 'utf8'), { filename: f }); oks.push(`${f} 語法正確`); }
  catch (e) { errs.push(`${f} 語法錯誤：${e.message}`); }
}
if (existsSync(path.join(root, 'Code.gs'))) {
  const code = readFileSync(path.join(root, 'Code.gs'), 'utf8');
  const bad = ['meta_', 'regs_', 'regsAll_', 'clearRegs_', 'doGet', 'doPost'].filter(n => new RegExp(`^\\s*function ${n.replace('$', '\\$')}\\s*\\(`, 'm').test(code));
  if (bad.length) errs.push(`Code.gs 不可定義（只能在 Plans.gs）：${bad.join('、')}`);
}
if (!gs.length) warns.push('repo 裡沒有 .gs 檔，Apps Script 未檢查（後端改動需在編輯器手動執行並重新部署）');

for (const s of oks) console.log('✅ ' + s);
for (const s of warns) console.log('⚠️  ' + s);
for (const s of errs) console.log('❌ ' + s);
console.log(errs.length ? `\n失敗：${errs.length} 項` : '\n靜態檢查全部通過');
process.exit(errs.length ? 1 : 0);
