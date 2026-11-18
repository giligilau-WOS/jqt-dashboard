// 有狀態的假後端（模擬 Apps Script 的回傳格式），只在記憶體裡，不連正式網址。
// 測試用帳密：管理員 PIN「test-admin」、幹部密碼「test-cadre」（假資料，不是正式值）。
// 後端回傳格式若改了，這裡要一起改。
export function makeWorld(n = 80) {
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const als = ['jQt', 'aQt', 'XYZ'], rks = ['R1', 'R2', 'R3', 'R4', 'R5'];
  const rows = [];
  for (let i = 0; i < n; i++) rows.push([String(10000 + i), '玩家' + String(i).padStart(2, '0'), als[i % 3], i === 0 ? 'R5' : i === 1 ? 'R4' : rks[i % 3], Math.round(3e8 * rnd()), 10 + Math.floor(rnd() * 20), Math.round(1e6 * rnd()), 'api', null, null, i + 1]);
  rows.push(['99999', '超長名字的測試玩家ABCDEFGHIJKLMNOP', 'jQt', 'R1', 1, 16, 0, 'api', null, null, 0]);
  return { rows, regs: { foundry: {}, canyon: {}, sfc: {}, tal: {}, frost: {} }, zones: [{ id: 'jqt', name: 'jQt・aQt 特區', als: ['jQt', 'aQt'], fid: '', dl: {} }, { id: 'x', name: 'XYZ 特區', als: ['XYZ'], fid: '10002', dl: {} }], zmap: {}, deadlines: {}, plans: {}, codes: [], posts: [] };
}
export async function attach(page, W) {
  await page.route(u => !/^(file:|data:|blob:)/.test(u.href) && !/script\.google/.test(u.href), r => r.abort());
  await page.route(/script\.google/, async r => {
    const q = r.request(), now = Date.now();
    const base = { status: 'ok', now, deadlines: W.deadlines };
    if (q.method() === 'GET') {
      const a = new URL(q.url()).searchParams;
      const act = a.get('action');
      const out = {
        state: () => ({ rows: W.rows, meta: {}, updatedAt: new Date().toISOString() }),
        regsall: () => ({ regs: W.regs }),
        accounts: () => ({ groups: [] }),
        zones: () => ({ zones: W.zones, zmap: W.zmap }),
        stdetail: () => ({ details: {} }),
        card: () => ({ hist: [], names: [] }),
        plan: () => ({ plan: W.plans[a.get('key')] || null }),
        plans: () => ({ plans: [] }),
        codes: () => ({ codes: W.codes, meta: null }),
      }[act];
      return r.fulfill({ json: Object.assign(base, out ? out() : {}) });
    }
    const b = JSON.parse(q.postData() || '{}'); W.posts.push(b);
    const row = f => W.rows.find(x => x[0] === f);
    let res = { ok: false, error: 'unknown_action' };
    if (b.action === 'login') {
      if (b.pin) res = b.pin === 'test-admin' ? { ok: true, role: 'admin' } : { ok: false, error: 'bad_pin' };
      else { const r0 = row(b.fid); res = r0 && b.code === 'test-cadre' && ['R4', 'R5'].includes(r0[3]) ? { ok: true, role: 'cadre', name: r0[1], al: r0[2] } : { ok: false, error: 'bad_code' }; }
    } else if (b.action === 'register') {
      const inner = ['foundry', 'canyon'], other = inner.find(e => e !== b.event);
      const og = inner.includes(b.event) && W.regs[other][b.fid];
      const oz = og && (og.choice === '1' || og.choice === '2') ? (W.zmap[other] || {})[b.fid] : '';
      if (b.choice !== 'out' && oz && b.zone && oz !== b.zone) res = { ok: false, error: 'zone_conflict', event: other, zone: oz };
      else { W.regs[b.event][b.fid] = { choice: b.choice, play: b.play || '', note: b.note || '', at: '', by: 'self', zone: b.zone || '' }; if (b.zone) (W.zmap[b.event] = W.zmap[b.event] || {})[b.fid] = b.zone; res = { ok: true, by: 'self' }; }
    } else if (b.action === 'regMany') {
      (b.fids || []).forEach(f => { const g = W.regs[b.event][f]; if (g && g.choice === 'out' && !b.force) return; W.regs[b.event][f] = { choice: b.choice, play: b.play || '', note: (b.roles || {})[f] || '' } });
      res = { ok: true, n: (b.fids || []).length };
    } else if (b.action === 'planSave') { W.plans[b.key] = b.plan; res = { ok: true, rev: 1 }; }
    return r.fulfill({ json: res });
  });
}
