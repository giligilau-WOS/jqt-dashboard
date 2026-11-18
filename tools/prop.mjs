#!/usr/bin/env node
// 屬性測試：node tools/prop.mjs [次數=600] [亂數種子=12345]
// 在真實 index.html 的頁面環境裡，對分隊、一鍵報名、批次報名、截止與權限跑隨機輸入，檢查不變量。
// 只用假資料；所有 Apps Script 連線都被攔截，POST 一律拒絕。
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const N = +(process.argv[2] || 600), SEED = +(process.argv[3] || 12345);

const b = await chromium.launch(); const page = await b.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route(/script\.google/, r => r.request().method() === 'POST' ? r.fulfill({ json: { ok: false, error: 'blocked' } }) : r.fulfill({ json: { status: 'ok', rows: [], regs: {}, zones: [], groups: [], plans: [], codes: [] } }));
await page.route(u => !/^(file:|data:)/.test(u.href) && !/script\.google/.test(u.href), r => r.abort());
await page.goto('file://' + ROOT + '/index.html');
await page.waitForSelector('#nav button');

const res = await page.evaluate(([N, SEED]) => {
  let seed = SEED; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)), pick = a => a[ri(0, a.length - 1)];
  const F = {}; const fail = (k, msg, ctx) => { (F[k] = F[k] || { n: 0, ex: msg, ctx }).n++; };
  const ALS = ['jQt', 'aQt', 'XYZ', ''];
  function genWorld() {
    const n = pick([0, 1, 2, 3, 5, 15, 30, 61, 120, ri(0, 200)]);
    const rows = []; for (let i = 0; i < n; i++) { const p = pick([0, 1e6, 5e7, ri(1, 3e8), ri(1, 3e8), ri(1, 3e8)]); rows.push({ fid: String(1000 + i), name: 'P' + i, al: pick(ALS), rk: '', power: p, furn: ri(0, 30), kills: ri(0, 1e6), src: pick(['', '', '', '舊資料']), d1: null, d7: null, rkN: 0 }); }
    const regs = {}; ['foundry', 'canyon', 'sfc', 'tal', 'frost'].forEach(ev => { regs[ev] = {}; rows.forEach(r => { const x = rnd(); if (x < .35) return; const inner = ev === 'foundry' || ev === 'canyon'; regs[ev][r.fid] = { choice: x < .45 ? 'out' : inner ? pick(['1', '2']) : 'in', play: '', note: pick(['', '正選', '候補']) }; }); });
    const acc = []; for (let i = 0; i + 1 < rows.length && i < 10; i += 2) if (rnd() < .5) acc.push({ members: [{ fid: rows[i].fid }, { fid: rows[i + 1].fid }] });
    return { rows, regs, acc };
  }
  function load(w) { D.rows = w.rows.map(r => Object.assign({}, r)); D.byF = {}; D.rows.forEach(r => { D.byF[r.fid] = r }); D.regs = JSON.parse(JSON.stringify(w.regs)); D.acc = w.acc; D.accOf = {}; D.dls = {}; }

  // ---------- 1. 分隊 wAll ----------
  for (let it = 0; it < N; it++) {
    const w = genWorld(); load(w);
    const als = pick([['jQt'], ['jQt', 'aQt'], ['jQt', 'aQt', 'XYZ']]);
    const evs = pick([['foundry'], ['canyon'], ['foundry', 'canyon']]);
    const pl = wNew(als, evs[0]); pl.evs = evs; wFix(pl);
    Object.assign(pl.opt, { src: pick(['vote', 'bar']), lg1: pick(['bal', 'spear']), cross: pick(['prefer', 'strict', 'any']), bal: pick(['bar', 'bar', 'm', 's', 'step']), head: ri(0, 6), tail: ri(0, 6), main: pick([30, 20, 5]) });
    INNER.forEach(ev => pl.teams[ev].forEach(t => { t.on = rnd() < .85; t.time = pick(['20:00', '21:00', '22:00']) }));
    const pool = wpool(pl, evs[0]); const fids = pool.map(p => p.r.fid);
    const useRules = rnd() < .5, useManual = rnd() < .3;
    if (useRules) {
      fids.slice(0, 3).forEach(f => { const t = pick(pl.teams[evs[0]]); pl.rules.locks[f] = t.id });
      fids.slice(3, 5).forEach(f => { pl.rules.only[f] = pick(als) });
      if (fids.length > 9) pl.rules.groups = [fids.slice(5, 9)];
    }
    if (useManual) fids.slice(-2).forEach(f => { pl.manual[evs[0]][f] = pick(['wait', pick(pl.teams[evs[0]]).id]) });
    const snap = JSON.stringify(pl);
    let R; try { R = wAll(pl) } catch (e) { fail('wAll 拋出例外', e.message, { n: w.rows.length, opt: pl.opt }); continue; }
    if (JSON.stringify(pl) !== snap) { const a = JSON.parse(snap); fail('wAll 改動了分隊計畫本身', '計算不應有副作用', null); }
    const ctx = { n: w.rows.length, als, evs, opt: Object.assign({}, pl.opt), rules: useRules, manual: useManual };
    evs.forEach(ev => {
      const r = R[ev], T = pl.teams[ev].filter(t => t.on), tid = new Set(T.map(t => t.id));
      // 不變量：每人剛好一個去處
      const seen = {}; r.teams.forEach(x => x.list.forEach(p => { seen[p.r.fid] = (seen[p.r.fid] || 0) + 1 }));
      const dup = Object.keys(seen).filter(f => seen[f] > 1); if (dup.length) fail('同一人出現在兩隊', dup.slice(0, 3).join(','), ctx);
      const P = wpool(pl, ev);
      P.forEach(p => { const a = r.A[p.r.fid]; const inT = !!seen[p.r.fid]; if (!(a === 'wait' || a === 'none' || (tid.has(a) && inT))) fail('有人沒有去處（不在隊伍、候補、無隊可放）', p.r.fid + '→' + a, ctx) });
      const placed = r.teams.reduce((s, x) => s + x.list.length, 0) + r.wait.length + r.none.length;
      if (placed !== P.length) fail('人數不守恆', placed + ' vs ' + P.length, ctx);
      // 正選 ≤ 名額
      r.teams.forEach(x => { const m = x.list.filter(p => p.main).length; if (m > pl.opt.main) fail('正選超過名額', m + '>' + pl.opt.main, ctx) });
      // 手動與固定規則被遵守
      Object.entries(pl.manual[ev] || {}).forEach(([f, t]) => { if (!P.some(p => p.r.fid === f)) return; if (t === 'wait' ? r.A[f] !== 'wait' : (tid.has(t) && r.A[f] !== t)) fail('手動指定沒被遵守', f, ctx) });
      Object.entries(pl.rules.locks).forEach(([f, t]) => { if (!P.some(p => p.r.fid === f) || (pl.manual[ev] || {})[f]) return; if (tid.has(t) && r.A[f] !== t) fail('固定規則沒被遵守', f + ' 應在 ' + t + ' 實際 ' + r.A[f], ctx) });
      // 依報名分軍團：自動放的人，軍團要和報名一致
      if (pl.opt.src === 'vote') P.forEach(p => { const a = r.A[p.r.fid]; if (!tid.has(a) || ['手動', '固定'].includes(r.why[p.r.fid])) return; const t = T.find(t => t.id === a); if (String(t.lg) !== p.vote) fail('依報名分軍團，卻被放到另一個軍團', p.r.fid, ctx) });
      // 嚴格同盟：自動放的人，若自己聯盟在該軍團有開隊，就應在自己聯盟
      if (pl.opt.cross === 'strict' && !useRules && !useManual && evs.length === 1) P.forEach(p => { const a = r.A[p.r.fid]; if (!tid.has(a)) return; const t = T.find(t => t.id === a); const own = T.some(x => x.al === p.r.al && x.lg === t.lg); if (own && t.al !== p.r.al) fail('嚴格同盟卻被放到別的聯盟', p.r.fid, ctx) });
      // 平均：無規則、無手動時，同一軍團內各隊人數差 ≤ 1（槓鈴、中段、蛇形）
      if (!useRules && !useManual && pl.opt.cross === 'any' && evs.length === 1 && pl.opt.bal !== 'step') ['1', '2'].forEach(lg => { const xs = r.teams.filter(x => String(x.t.lg) === lg).map(x => x.list.length); if (xs.length > 1 && Math.max(...xs) - Math.min(...xs) > 1) fail('同軍團各隊人數差超過 1（bal=' + pl.opt.bal + '）', xs.join('/'), ctx) });
    });
    // 兩場一起分：同一人兩場在同一聯盟（沒有手動、固定時）
    if (evs.length === 2 && !useRules && !useManual) { const a = R.foundry, c = R.canyon; Object.keys(a.A).forEach(f => { const ta = pl.teams.foundry.find(t => t.id === a.A[f]), tc = pl.teams.canyon.find(t => t.id === c.A[f]); if (ta && tc && ta.al !== tc.al) { const fx = wFixedAl(pl)[f]; const onF = pl.teams.foundry.some(t => t.on && t.al === fx && t.lg === ta.lg), onC = pl.teams.canyon.some(t => t.on && t.al === fx && t.lg === tc.lg); if (onF && onC) fail('兩場一起分，同一人卻在不同聯盟（兩場都有可放的隊）', f + ' 指定 ' + fx + ' 實際 ' + ta.al + '/' + tc.al + ' bal=' + pl.opt.bal + ' why=' + a.why[f] + '/' + c.why[f], ctx) } }) }
    // 決定性：再算一次結果相同
    try { const R2 = wAll(pl); evs.forEach(ev => { if (JSON.stringify(R2[ev].A) !== JSON.stringify(R[ev].A)) fail('同樣輸入算兩次結果不同', ev, ctx) }) } catch (e) { fail('第二次 wAll 拋出例外', e.message, ctx) }
    // 往返：存檔（JSON）→ 讀回 → wFix → 結果相同
    const back = JSON.parse(JSON.stringify(pl)); wFix(back); const R3 = wAll(back);
    evs.forEach(ev => { if (JSON.stringify(R3[ev].A) !== JSON.stringify(R[ev].A)) fail('存檔讀回後分隊結果不同', ev, ctx) });
    // 舊格式：缺 rules/opt/hist 的計畫讀回不崩潰
    const old = JSON.parse(JSON.stringify(pl)); delete old.rules; delete old.hist; delete old.rep; delete old.opt; delete old.manual;
    try { wFix(old); wAll(old) } catch (e) { fail('舊格式計畫（缺欄位）讀回會崩潰', e.message, ctx) }
  }

  // ---------- 2. 槓鈴分軍團 wLegions：人數符合比例 ----------
  for (let it = 0; it < N; it++) {
    const w = genWorld(); load(w); const pl = wNew(['jQt', 'aQt'], 'foundry'); pl.opt.lg1 = pick(['bal', 'spear']); pl.opt.head = ri(0, 6); pl.opt.tail = ri(0, 6);
    const T = pl.teams.foundry.filter(() => rnd() < .8); const P = wpool(pl, 'foundry');
    const L = wLegions(pl, P, T), n1 = T.filter(t => t.lg === 1).length, n2 = T.filter(t => t.lg === 2).length;
    if (Object.keys(L).length !== P.length) fail('wLegions 有人沒分到軍團', Object.keys(L).length + '/' + P.length, null);
    if (n1 && n2) { const t1 = Math.round(P.length * n1 / (n1 + n2)), c1 = Object.values(L).filter(x => x === '1').length; if (c1 !== t1) fail('wLegions 軍團一人數不符比例', c1 + ' vs ' + t1, { N: P.length, n1, n2, opt: pl.opt }) }
  }

  // ---------- 3. 一鍵報名 brCalc ----------
  const saveAU = AU;
  for (let it = 0; it < N; it++) {
    const w = genWorld(); load(w); BR.ev = pick(['tal', 'frost', 'sfc']); BR.metric = 'power'; BR.als = pick([[], ['jQt'], ['jQt', 'aQt']]); BR.minFurn = pick([0, 16]);
    if (BR.legs == null) BR.legs = 1; BR.legs = pick([1, 2]); BR.m = pick([0, 30, 5]); BR.s = pick([0, 10, 20]);
    let p; try { p = brCalc() } catch (e) { fail('brCalc 拋出例外', e.message, null); continue }
    const m = D.regs[BR.ev] || {};
    p.list.forEach(x => { const g = m[x.r.fid]; if (g && g.choice === 'out') fail('一鍵報名把「不參加」的人加回來', x.r.fid, null); if (BR.als.length && !BR.als.includes(x.r.al)) fail('一鍵報名超出聯盟範圍', x.r.al, null); if (BR.minFurn && x.r.furn < BR.minFurn) fail('一鍵報名收了熔爐不足的人', x.r.furn, null); if (x.r.src === '舊資料') fail('一鍵報名收了舊資料的人', x.r.fid, null) });
    if (p.list.length > p.N) fail('一鍵報名人數超過名額', p.list.length + '>' + p.N, null);
    if (p.list.filter(x => x.role === '正選').length > p.mt) fail('正選超過名額', '', null);
    // 冪等：套用後再算一次，不應再有新報名或更新
    p.list.forEach(x => { (D.regs[BR.ev] = D.regs[BR.ev] || {})[x.r.fid] = { choice: 'in', play: '', note: x.role } });
    const p2 = brCalc(); if (p2.add || p2.upd) fail('一鍵報名不冪等：套用後再算仍有變更', 'add=' + p2.add + ' upd=' + p2.upd, { ev: BR.ev, m: BR.m, s: BR.s, legs: BR.legs });
  }

  // ---------- 4. 批次報名 bmPlan ----------
  for (let it = 0; it < N; it++) {
    const w = genWorld(); load(w); AU = { role: 'admin', pin: 'x' };
    const ev = pick(['foundry', 'canyon', 'sfc', 'tal', 'frost']); BM.f = Object.assign({}, BM.f, { ev, lg: pick(['1', '2']), excl16: rnd() < .5, force: rnd() < .3, role: pick(['auto', 'main', 'sub', 'none']), n: ri(0, 40), target: '' }); BM.mode = pick(['reg', 'cancel']);
    BM.sel = new Set(D.rows.filter(() => rnd() < .6).map(r => r.fid)); P.view = D.rows.slice();
    let p; try { p = bmPlan() } catch (e) { fail('bmPlan 拋出例外', e.message, null); continue }
    const list = p.list || p.todo || [];
    list.forEach(x => { if (!BM.sel.has(x.r.fid)) fail('批次報名包含沒勾選的人', x.r.fid, null); const g = regOf(ev, x.r.fid); if (BM.mode !== 'cancel' && g && g.choice === 'out' && !BM.f.force) fail('批次報名沒勾強制卻把「不參加」的人加回來', x.r.fid, null); if (BM.mode === 'cancel' && x.choice !== 'out') fail('取消模式卻寫入非 out', x.choice, null) });
  }
  AU = saveAU;

  // ---------- 5. 截止與權限 canReg / zDl ----------
  const now = Date.now();
  for (let it = 0; it < N; it++) {
    const ev = pick(['foundry', 'canyon', 'sfc', 'tal', 'frost']); D.off = 0; D.dls = { [ev]: pick(['', new Date(now - 3600e3).toISOString(), new Date(now + 3600e3).toISOString()]) };
    const r = { fid: '1', al: pick(['jQt', 'aQt', 'XYZ']) }; const who = pick([null, 'admin', 'cadre']);
    AU = who === 'admin' ? { role: 'admin' } : who === 'cadre' ? { role: 'cadre', al: pick(['jQt', 'aQt']), fid: '9' } : null;
    const ok = canReg(ev, r), cl = closed(ev);
    const expect = !cl || who === 'admin' || (who === 'cadre' && INNER.includes(ev) && r.al === AU.al);
    if (ok !== expect) fail('canReg 與規則不符', JSON.stringify({ ev, cl, who, al: r.al, cadreAl: AU && AU.al, ok }), null);
    if (cl && who === null && ok) fail('截止後一般玩家仍可報名', ev, null);
    if (cl && who === 'cadre' && ok && r.al !== AU.al) fail('截止後幹部能動別聯盟的人', ev, null);
  }
  AU = saveAU;
  // zDl：特區截止優先、太陽城用全域
  Z.list = [{ id: 'jqt', name: 'J', als: ['jQt', 'aQt'], dl: { inner: '2030-01-01T00:00:00Z', tal: '', frost: '2031-01-01T00:00:00Z' } }];
  D.dls = { foundry: 'G1', canyon: 'G2', sfc: 'G3', tal: 'G4', frost: 'G5' };
  const zc = [['foundry', 'jqt', '2030-01-01T00:00:00Z'], ['canyon', 'jqt', '2030-01-01T00:00:00Z'], ['sfc', 'jqt', 'G3'], ['tal', 'jqt', 'G4'], ['frost', 'jqt', '2031-01-01T00:00:00Z'], ['foundry', '', 'G1'], ['foundry', 'nope', 'G1']];
  zc.forEach(([ev, z, e]) => { const g = zDl(ev, z); if (g !== e) fail('zDl 截止時間取錯', ev + '/' + z + ' → ' + g + '（應為 ' + e + '）', null) });
  // 舊報名沒特區 → 依聯盟對應
  D.byF = { a: { fid: 'a', al: 'aQt' }, b: { fid: 'b', al: 'XYZ' } }; Z.zmap = { foundry: {} };
  if (zOfReg('foundry', 'a') !== 'jqt') fail('沒特區的舊報名沒有依聯盟對應', zOfReg('foundry', 'a'), null);
  if (zOfReg('foundry', 'b') !== '') fail('不在任何特區的聯盟卻對應到特區', zOfReg('foundry', 'b'), null);
  return F;
}, [N, SEED]);
await b.close();
const keys = Object.keys(res);
console.log(`隨機輸入：每組 ${N} 次（分隊、槓鈴分軍團、一鍵報名、批次報名、截止權限）`);
if (errs.length) console.log('頁面錯誤：', errs.slice(0, 5));
if (!keys.length) console.log('✅ 全部屬性通過');
for (const k of keys) console.log(`❌ ${k}：${res[k].n} 次，例：${res[k].ex}${res[k].ctx ? '\n   情境：' + JSON.stringify(res[k].ctx) : ''}`);
process.exit(keys.length ? 1 : 0);
