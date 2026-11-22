/* worldmap.js — 2611 王國戰情室：王國大地圖 / 棋盤格排位模擬 / 模擬遊戲 3D 街景 */
(function(){
'use strict';

const WORLD=1200, CENTER=600, R_CORE=48, R_FERTILE=150, R_TUNDRA=300;
const SIM_KEY='k2611_map_sim_v1';
const TURRETS=[
  {name:'北砲台',x:585,y:615},{name:'東砲台',x:615,y:615},
  {name:'南砲台',x:615,y:585},{name:'西砲台',x:585,y:585}
];
const AL_COLORS=['#2563eb','#10b981','#f97316','#8b5cf6','#ec4899','#06b6d4','#eab308','#ef4444','#14b8a6','#a855f7','#84cc16','#f43f5e','#0ea5e9','#d97706'];
const BLD_META={
  trap1:{label:'熊陷阱一',short:'🐻 熊一',size:3,color:'#d97706',bg:'rgba(245,158,11,.28)'},
  trap2:{label:'熊陷阱二',short:'🐻 熊二',size:3,color:'#b45309',bg:'rgba(217,119,6,.28)'},
  hq:{label:'聯盟總部',short:'🏛️ 總部',size:3,color:'#7c3aed',bg:'rgba(139,92,246,.28)'},
  banner:{label:'聯盟旗幟',short:'🚩 旗',size:1,color:'#0284c7',bg:'rgba(14,165,233,.28)'},
  obs:{label:'地形障礙',short:'⛰️',size:1,color:'#64748b',bg:'rgba(100,116,139,.38)'}
};

const M={
  mode:'map', // 'map' | 'board' | 'street'
  // Mode 1: Google Maps style world map
  proj:'iso', // 'iso' | 'flat'
  cam:{x:770,y:728,scale:9},
  alFilter:'all',
  shFilter:'all', // 'all' | 'shield' | 'noshield'
  selFid:'',
  search:'',
  flyAnim:null,
  initCentered:false,
  // Mode 2: Chessboard simulator
  board:{
    cam:{x:770,y:728,tile:26},
    tool:'move', // 'move' | 'trap1' | 'trap2' | 'hq' | 'banner' | 'obs'
    scope:'jQt',
    pieces:[], // {id,kind:'city'|'trap1'|'trap2'|'hq'|'banner'|'obs',fid?,name,al?,power?,furn?,x,y,ox,oy,size}
    selId:'',
    drag:null, // {id,tx,ty,ok}
    showRings:true,
    showTerr:true,
    addQ:'',
    loaded:false
  },
  // Mode 3: 3D Street View
  sv:{
    x:770,y:720,yaw:0, // yaw in radians: 0=+Y (North/up), PI/2=+X (East/right)
    aerial:false,
    useSim:false,
    selKey:'',
    holdDir:'',
    snow:[],
    hitBoxes:[]
  },
  // Shared runtime
  mounted:false,
  raf:0,
  lastTs:0,
  cursorW:null,
  alColorMap:{},
  cacheSig:'',
  cacheData:null
};

function app(){return window.K2611_APP||{}}
function isDark(){return document.documentElement.getAttribute('data-theme')==='dark'}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function zoneOf(x,y){
  const r=Math.max(Math.abs(x-CENTER),Math.abs(y-CENTER));
  if(r<=R_CORE)return{k:'core',l:'王城紅地',c:'#ef4444'};
  if(r<=R_FERTILE)return{k:'fertile',l:'肥沃之地',c:'#10b981'};
  if(r<=R_TUNDRA)return{k:'tundra',l:'凍土平原',c:'#0284c7'};
  return{k:'ice',l:'外圍冰原',c:'#64748b'};
}
function marchSec(dist){return Math.max(1,Math.round(dist/3.2))}
function alColor(al){
  if(!al)return'#94a3b8';
  if(al==='jQt')return isDark()?'#38bdf8':'#2563eb';
  if(al==='aQt')return'#10b981';
  if(!M.alColorMap[al]){
    const idx=Object.keys(M.alColorMap).length+2;
    M.alColorMap[al]=AL_COLORS[idx%AL_COLORS.length];
  }
  return M.alColorMap[al];
}

/* ===== 資料彙整（結合王國名冊 + 玩家戰備座標） ===== */
function getWorldData(){
  const A=app(), D=A.D||{rows:[],byF:{}}, EX=A.EX||{det:{}};
  const sig=D.rows.length+'|'+Object.keys(EX.det||{}).length;
  if(M.cacheSig===sig&&M.cacheData)return M.cacheData;
  const players=[], byAl={}, byFid={};
  const now=Date.now();
  const isAct=ts=>{if(!ts)return false;const ms=ts<1e12?ts*1000:ts;return ms>now};
  Object.keys(EX.det||{}).forEach(fid=>{
    const e=EX.det[fid];
    if(!e||e.x==null||e.y==null||isNaN(e.x)||isNaN(e.y))return;
    const r=(D.byF&&D.byF[fid])||{fid,name:'玩家 '+fid,al:'',rk:'',power:0,furn:0};
    const p={
      fid, name:r.name||fid, al:r.al||'', rk:r.rk||'',
      power:r.power||0, furn:r.furn||0,
      x:Number(e.x), y:Number(e.y),
      shield:isAct(e.shield)?e.shield:0,
      burn:isAct(e.burn)?e.burn:0,
      office:e.office||'', avatar:e.avatar||'',
      troopTxt:e.troopTxt||'', redGear:e.redGear||0, egMax:e.egMax||0
    };
    players.push(p);
    byFid[fid]=p;
    const ak=p.al||'無聯盟';
    (byAl[ak]=byAl[ak]||[]).push(p);
  });
  // 計算每個聯盟的主聚落中心（找最密集的 30x30 區塊取中位數，避免離群小號拉偏）
  const hives=[];
  Object.keys(byAl).forEach(al=>{
    const list=byAl[al];
    const buckets={};
    list.forEach(p=>{
      const bk=Math.floor(p.x/30)+','+Math.floor(p.y/30);
      (buckets[bk]=buckets[bk]||[]).push(p);
    });
    let best=list, bestN=0;
    Object.values(buckets).forEach(arr=>{if(arr.length>bestN){bestN=arr.length;best=arr}});
    const xs=best.map(p=>p.x).sort((a,b)=>a-b);
    const ys=best.map(p=>p.y).sort((a,b)=>a-b);
    const mx=xs[Math.floor(xs.length/2)], my=ys[Math.floor(ys.length/2)];
    hives.push({al,count:list.length,clusterCount:best.length,x:mx,y:my});
  });
  hives.sort((a,b)=>(b.al==='jQt')-(a.al==='jQt')||(b.al==='aQt')-(a.al==='aQt')||b.count-a.count);
  M.cacheSig=sig;
  M.cacheData={players,byAl,byFid,hives};
  // 第一次有資料時自動把地圖/棋盤/街景對準 jQt 主聚落
  if(!M.initCentered&&hives.length){
    const h=hives.find(x=>x.al==='jQt')||hives[0];
    if(h){
      M.cam.x=h.x; M.cam.y=h.y; M.cam.scale=10;
      M.board.cam.x=h.x; M.board.cam.y=h.y;
      M.sv.x=h.x; M.sv.y=Math.max(2,h.y-10); M.sv.yaw=0;
      M.initCentered=true;
    }
  }
  return M.cacheData;
}

/* ===== 棋盤模擬存檔與載入 ===== */
function simSave(){
  try{localStorage.setItem(SIM_KEY,JSON.stringify({scope:M.board.scope,pieces:M.board.pieces,cam:M.board.cam}))}catch(e){}
}
function simLoadFromStorage(){
  if(M.board.loaded)return;
  M.board.loaded=true;
  try{
    const raw=localStorage.getItem(SIM_KEY);
    if(raw){
      const j=JSON.parse(raw);
      if(j&&Array.isArray(j.pieces)&&j.pieces.length){
        M.board.pieces=j.pieces;
        if(j.scope)M.board.scope=j.scope;
        if(j.cam)M.board.cam=Object.assign({x:770,y:728,tile:26},j.cam);
        return;
      }
    }
  }catch(e){}
  simLoadReal(M.board.scope,true);
}
function simLoadReal(scope,quiet){
  const wd=getWorldData(), A=app();
  M.board.scope=scope||'jQt';
  let list=[];
  if(scope==='ours')list=wd.players.filter(p=>p.al==='jQt'||p.al==='aQt');
  else if(scope==='all')list=wd.players.slice();
  else if(scope==='view'){
    list=wd.players.filter(p=>Math.abs(p.x-M.cam.x)<=35&&Math.abs(p.y-M.cam.y)<=35);
  }else list=wd.players.filter(p=>p.al===scope);
  // 保留手動放置的非城池建築
  const keepBlds=quiet?[]:M.board.pieces.filter(p=>p.kind!=='city');
  const cities=list.map(p=>({
    id:'c_'+p.fid,kind:'city',fid:p.fid,name:p.name,al:p.al,power:p.power,furn:p.furn,
    x:Math.round(p.x),y:Math.round(p.y),ox:Math.round(p.x),oy:Math.round(p.y),size:2
  }));
  M.board.pieces=keepBlds.concat(cities);
  M.board.selId='';
  if(cities.length){
    const h=wd.hives.find(x=>x.al===scope)||(scope==='ours'?wd.hives.find(x=>x.al==='jQt'):null);
    if(h){M.board.cam.x=h.x;M.board.cam.y=h.y}
    else{
      const xs=cities.map(c=>c.x).sort((a,b)=>a-b), ys=cities.map(c=>c.y).sort((a,b)=>a-b);
      M.board.cam.x=xs[Math.floor(xs.length/2)]; M.board.cam.y=ys[Math.floor(ys.length/2)];
    }
    M.board.cam.tile=26;
  }
  simSave();
  if(!quiet&&A.toast)A.toast('已載入 '+cities.length+' 座真實城池到棋盤');
}
function boardCollides(x,y,size,ignoreId){
  if(x<0||y<0||x+size>WORLD||y+size>WORLD)return true;
  for(const p of M.board.pieces){
    if(p.id===ignoreId)continue;
    if(x<p.x+p.size&&x+size>p.x&&y<p.y+p.size&&y+size>p.y)return true;
  }
  return false;
}
function nearestTrapInfo(p){
  const traps=M.board.pieces.filter(b=>b.kind==='trap1'||b.kind==='trap2');
  if(!traps.length)return null;
  const cx=p.x+p.size/2, cy=p.y+p.size/2;
  let best=null, bd=Infinity;
  traps.forEach(t=>{
    const d=Math.hypot(cx-(t.x+t.size/2),cy-(t.y+t.size/2));
    if(d<bd){bd=d;best={trap:t,dist:d}}
  });
  return best;
}
function buildRelocReport(){
  const moved=M.board.pieces.filter(p=>p.kind==='city'&&(p.x!==p.ox||p.y!==p.oy));
  const traps=M.board.pieces.filter(p=>p.kind==='trap1'||p.kind==='trap2');
  const lines=['📍【2611 聯盟陣型與遷城座標通知】'];
  if(traps.length){
    lines.push('');
    traps.forEach(t=>lines.push(`${BLD_META[t.kind].short}：X:${t.x} Y:${t.y}（3×3）`));
  }
  if(!moved.length){
    lines.push('','（目前沒有調整任何玩家座標，請先在棋盤上拖曳玩家棋子）');
    return lines.join('\n');
  }
  lines.push('',`需調整位置共 ${moved.length} 位：`);
  moved.sort((a,b)=>{
    const ta=nearestTrapInfo(a), tb=nearestTrapInfo(b);
    return(ta?ta.dist:999)-(tb?tb.dist:999);
  }).forEach(p=>{
    const nt=nearestTrapInfo(p);
    const extra=nt?`｜距${nt.trap.kind==='trap1'?'熊一':'熊二'} ${nt.dist.toFixed(1)} 格（約 ${marchSec(nt.dist)} 秒）`:'';
    lines.push(`• ${p.name}：(${p.ox}, ${p.oy}) → (${p.x}, ${p.y})${extra}`);
  });
  return lines.join('\n');
}

/* ===== 座標投影工具 ===== */
function mapWorldToScreen(wx,wy,w,h){
  const s=M.cam.scale;
  const dx=wx-M.cam.x, dy=wy-M.cam.y;
  if(M.proj==='flat'){
    return{x:w/2+dx*s, y:h/2-dy*s};
  }
  const hs=s*0.5;
  return{x:w/2+(dx-dy)*hs, y:h/2-(dx+dy)*hs};
}
function mapScreenToWorld(sx,sy,w,h){
  const s=M.cam.scale;
  if(M.proj==='flat'){
    return{x:M.cam.x+(sx-w/2)/s, y:M.cam.y-(sy-h/2)/s};
  }
  const hs=s*0.5;
  const u=(sx-w/2)/hs, v=-(sy-h/2)/hs;
  return{x:(u+v)/2+M.cam.x, y:(v-u)/2+M.cam.y};
}
function boardWorldToScreen(wx,wy,w,h){
  const t=M.board.cam.tile;
  return{x:w/2+(wx-M.board.cam.x)*t, y:h/2-(wy-M.board.cam.y)*t};
}
function boardScreenToWorld(sx,sy,w,h){
  const t=M.board.cam.tile;
  return{x:M.board.cam.x+(sx-w/2)/t, y:M.board.cam.y-(sy-h/2)/t};
}
function flyMapTo(x,y,scale){
  M.flyAnim={
    from:{x:M.cam.x,y:M.cam.y,scale:M.cam.scale},
    to:{x:clamp(x,0,WORLD),y:clamp(y,0,WORLD),scale:scale!=null?clamp(scale,0.35,42):M.cam.scale},
    t0:performance.now(),dur:420
  };
}

/* ===== 頁面 HTML 渲染 ===== */
function renderHtml(){
  const A=app(), EX=A.EX||{}, wd=getWorldData();
  if(!EX.okDet&&!EX.detTried&&A.loadExtraDetail)A.loadExtraDetail();
  simLoadFromStorage();
  const cnt=wd.players.length;
  const modeSeg=`
    <div class="seg" style="display:grid;grid-template-columns:repeat(3,1fr);width:100%;overflow:visible">
      <button style="padding:0 4px;min-height:38px;font-size:12.5px" class="${M.mode==='map'?'on':''}" data-mp="mode" data-v="map">🗺️ 大地圖</button>
      <button style="padding:0 4px;min-height:38px;font-size:12.5px" class="${M.mode==='board'?'on':''}" data-mp="mode" data-v="board">♟️ 棋盤模擬</button>
      <button style="padding:0 4px;min-height:38px;font-size:12.5px" class="${M.mode==='street'?'on':''}" data-mp="mode" data-v="street">👁️ 遊戲街景</button>
    </div>`;

  const topPills=M.mode==='map'?renderMapTopPills(wd):M.mode==='board'?renderBoardTopPills():renderStreetTopPills();
  const belowControls=M.mode==='map'?renderMapControls(wd):M.mode==='board'?renderBoardControls(wd):renderStreetControls(wd);

  const canvasBlock=`
    <div class="mp-wrap" id="mpWrap">
      <canvas id="mpCanvas"></canvas>
      ${renderHudOverlay(wd)}
    </div>`;

  const bottomCard=M.mode==='map'?renderMapPlaceCard(wd):M.mode==='board'?renderBoardInspector(wd):renderStreetFooter(wd);

  return`
    <div class="card tight" style="display:flex;flex-direction:column;gap:8px;padding:10px 12px">
      <div class="row sp" style="flex-wrap:nowrap">
        <div style="min-width:0"><b style="font-size:15px">🗺️ 2611 王國地圖</b> <span class="sub">· ${cnt} 城池</span></div>
        <button class="btn sm" style="min-height:32px;padding:0 10px" data-mp="refresh">↻ 重整</button>
      </div>
      ${modeSeg}
      ${topPills}
    </div>
    ${canvasBlock}
    ${bottomCard}
    <div class="card tight" style="display:flex;flex-direction:column;gap:8px">${belowControls}</div>`;
}

function renderMapTopPills(wd){
  const A=app(), esc=A.esc||(s=>s);
  const topHives=wd.hives.slice(0,7);
  return`<div class="mp-pills">
    <button class="btn sm soft" data-mp="fly" data-x="600" data-y="600" data-s="5">🏰 太陽城</button>
    ${topHives.map(h=>`<button class="btn sm ${M.alFilter===h.al?'pri':''}" data-mp="flyHive" data-v="${esc(h.al)}"><span class="mp-dot" style="background:${alColor(h.al)}"></span>${esc(h.al)} (${h.count})</button>`).join('')}
  </div>`;
}

function renderBoardTopPills(){
  const b=M.board;
  const tools=[
    ['move','👆 移動'],['trap1','🐻 熊一'],['trap2','🐻 熊二'],
    ['hq','🏛️ 總部'],['banner','🚩 旗幟'],['obs','⛰️ 障礙']
  ];
  return`<div class="mp-pills">
    ${tools.map(([k,l])=>`<button class="btn sm ${b.tool===k?'pri':''}" data-mp="bTool" data-v="${k}">${l}</button>`).join('')}
  </div>`;
}

function renderStreetTopPills(){
  const sv=M.sv;
  return`<div class="mp-pills">
    <button class="btn sm soft" data-mp="svGo" data-v="jQt">🚩 jQt</button>
    <button class="btn sm soft" data-mp="svGo" data-v="aQt">🚩 aQt</button>
    <button class="btn sm soft" data-mp="svGo" data-v="castle">🏰 太陽城</button>
    <button class="btn sm ${sv.aerial?'pri':''}" data-mp="svAerial">${sv.aerial?'🚁 空拍中':'🚶 地面中'}</button>
    <button class="btn sm ${sv.useSim?'pri':''}" data-mp="svSim">${sv.useSim?'♟️ 模擬陣型':'🌍 真實座標'}</button>
  </div>`;
}

function renderMapControls(wd){
  const A=app(), esc=A.esc||(s=>s);
  return`
    <div class="row" style="gap:6px">
      <input id="mpSearch" style="flex:1 1 180px" placeholder="搜尋玩家、聯盟，或輸入座標 772,729" value="${esc(M.search)}">
      <button class="btn sm pri" data-mp="goSearch">飛往</button>
    </div>
    <div id="mpSug"></div>
    <div class="mp-pills">
      <button class="btn sm ${M.proj==='iso'?'pri':''}" data-mp="proj" data-v="iso">💎 等距視角</button>
      <button class="btn sm ${M.proj==='flat'?'pri':''}" data-mp="proj" data-v="flat">🧭 正北平面</button>
      <select id="mpAlSel" style="min-height:36px;padding:4px 10px;font-size:13px;border-radius:12px">
        <option value="all" ${M.alFilter==='all'?'selected':''}>全部聯盟</option>
        <option value="ours" ${M.alFilter==='ours'?'selected':''}>僅 jQt + aQt</option>
        ${wd.hives.map(h=>`<option value="${esc(h.al)}" ${M.alFilter===h.al?'selected':''}>${esc(h.al)} (${h.count})</option>`).join('')}
      </select>
      <select id="mpShSel" style="min-height:36px;padding:4px 10px;font-size:13px;border-radius:12px">
        <option value="all" ${M.shFilter==='all'?'selected':''}>開罩：全部</option>
        <option value="shield" ${M.shFilter==='shield'?'selected':''}>🛡️ 僅開罩</option>
        <option value="noshield" ${M.shFilter==='noshield'?'selected':''}>⚔️ 僅未開罩</option>
      </select>
    </div>`;
}

function renderBoardControls(wd){
  const A=app(), esc=A.esc||(s=>s), b=M.board;
  const movedN=b.pieces.filter(p=>p.kind==='city'&&(p.x!==p.ox||p.y!==p.oy)).length;
  return`
    <div class="mp-pills">
      <select id="mpBScope" style="min-height:36px;padding:4px 10px;font-size:13px;border-radius:12px">
        <option value="jQt" ${b.scope==='jQt'?'selected':''}>載入：jQt</option>
        <option value="aQt" ${b.scope==='aQt'?'selected':''}>載入：aQt</option>
        <option value="ours" ${b.scope==='ours'?'selected':''}>載入：jQt + aQt</option>
        <option value="view" ${b.scope==='view'?'selected':''}>載入：地圖視野附近</option>
        ${wd.hives.filter(h=>h.al!=='jQt'&&h.al!=='aQt').slice(0,8).map(h=>`<option value="${esc(h.al)}" ${b.scope===h.al?'selected':''}>載入：${esc(h.al)}</option>`).join('')}
      </select>
      <button class="btn sm" data-mp="bLoadReal">↻ 重載真實</button>
      <button class="btn sm" data-mp="bResetAll">↩️ 歸位（${movedN}）</button>
      <button class="btn sm soft" data-mp="bCopy">📋 複製遷城表</button>
      <button class="btn sm" data-mp="bPreviewSv">👁️ 街景預覽</button>
    </div>
    <div class="row" style="gap:6px">
      <input id="mpBAdd" style="flex:1 1 150px;min-height:38px" placeholder="從名冊拉入盟友棋子…" value="${esc(b.addQ)}">
      <button class="btn sm ${b.showRings?'pri':''}" data-mp="bTogRings">🎯 熊距圈</button>
      <button class="btn sm ${b.showTerr?'pri':''}" data-mp="bTogTerr">🚩 領地框</button>
    </div>
    <div id="mpBAddSug"></div>`;
}

function renderStreetControls(wd){
  return`
    <div class="row" style="gap:6px">
      <input id="mpSvSearch" style="flex:1 1 180px;min-height:38px" placeholder="搜尋盟友名字，直接傳送到他家門口逛街…">
    </div>
    <div id="mpSvSug"></div>`;
}

function renderHudOverlay(wd){
  if(M.mode==='map'){
    const z=zoneOf(M.cam.x,M.cam.y);
    return`
      <div class="mp-hud-tl" id="mpHudCoord">X:${Math.round(M.cam.x)} · Y:${Math.round(M.cam.y)} <span style="color:${z.c}">● ${z.l}</span></div>
      <div class="mp-hud-br">
        <button class="mp-fab" data-mp="zoom" data-v="1.45" title="放大">＋</button>
        <button class="mp-fab" data-mp="zoom" data-v="0.69" title="縮小">－</button>
        <button class="mp-fab" data-mp="flyHive" data-v="jQt" title="回 jQt 聚落">🎯</button>
        <button class="mp-fab" data-mp="fly" data-x="600" data-y="600" data-s="0.65" title="全王國總覽">🌍</button>
      </div>`;
  }
  if(M.mode==='board'){
    return`
      <div class="mp-hud-tl" id="mpHudCoord">棋盤中心 X:${Math.round(M.board.cam.x)} · Y:${Math.round(M.board.cam.y)}｜點選棋子後拖曳或點目標格</div>
      <div class="mp-hud-br">
        <button class="mp-fab" data-mp="bZoom" data-v="1.3">＋</button>
        <button class="mp-fab" data-mp="bZoom" data-v="0.77">－</button>
        <button class="mp-fab" data-mp="bCenter" title="回到陣型中心">🎯</button>
      </div>`;
  }
  return`
    <div class="mp-hud-top" id="mpSvCompass">N · 0°｜X:${Math.round(M.sv.x)} Y:${Math.round(M.sv.y)}</div>
    <div class="mp-dpad" id="mpDpad">
      <div></div><button class="mp-fab" data-svhold="fwd">▲</button><div></div>
      <button class="mp-fab" data-svhold="left">↺</button><button class="mp-fab" data-svhold="back">▼</button><button class="mp-fab" data-svhold="right">↻</button>
    </div>`;
}

function renderMapPlaceCard(wd){
  const A=app(), esc=A.esc||(s=>s), fmtP=A.fmtP||(n=>n), furnL=A.furnL||(n=>n);
  const p=M.selFid&&wd.byFid[M.selFid];
  if(!p){
    return`<div class="card tight"><div class="sub">💡 <b>操作提示：</b>單指拖曳移動地圖、雙指縮放（電腦用滑鼠滾輪），點任一座城池可查看詳情、一鍵進入 3D 街景或匯入棋盤排位。</div></div>`;
  }
  const z=zoneOf(p.x,p.y), dCastle=Math.hypot(p.x-CENTER,p.y-CENTER);
  const shTxt=p.shield&&A.fmtLeft?A.fmtLeft(p.shield):'';
  const bnTxt=p.burn&&A.fmtLeft?A.fmtLeft(p.burn):'';
  const av=p.avatar?`<img src="${esc(p.avatar)}" alt="" referrerpolicy="no-referrer" style="width:44px;height:44px;border-radius:14px;object-fit:cover;flex:none">`:`<div style="width:44px;height:44px;border-radius:14px;background:${alColor(p.al)};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:17px;flex:none">${esc(p.name.slice(0,1))}</div>`;
  return`<div class="card tight" style="border-color:${alColor(p.al)}">
    <div class="row sp">
      <div class="row" style="gap:10px;flex-wrap:nowrap;min-width:0">${av}<div style="min-width:0">
        <b style="font-size:16px">${esc(p.name)}</b> <span class="bd a">${esc(p.al||'無聯盟')}</span> ${p.rk?`<span class="bd">${esc(p.rk)}</span>`:''}
        <div class="sub tnum" style="margin-top:2px">座標 <b>X:${p.x} · Y:${p.y}</b>（${z.l}）· 距太陽城 ${dCastle.toFixed(0)} 格</div>
      </div></div>
      <button class="btn sm" data-mp="clearSel">✕</button>
    </div>
    <div class="row" style="margin-top:8px;gap:6px">
      <span class="bd">戰力 ${fmtP(p.power)}</span>
      <span class="bd">熔爐 ${esc(furnL(p.furn))}</span>
      ${p.troopTxt?`<span class="bd">${esc(p.troopTxt)}</span>`:''}
      ${shTxt?`<span class="bd ok">🛡️ 開罩剩 ${esc(shTxt)}</span>`:'<span class="bd">未開罩</span>'}
      ${bnTxt?`<span class="bd d">🔥 燃燒剩 ${esc(bnTxt)}</span>`:''}
    </div>
    <div class="row" style="margin-top:10px;gap:8px">
      <button class="btn sm pri" data-mp="openCard" data-v="${esc(p.fid)}">👤 開啟名片</button>
      <button class="btn sm soft" data-mp="toStreet" data-v="${esc(p.fid)}">👁️ 街景拜訪</button>
      <button class="btn sm" data-mp="toBoard" data-v="${esc(p.fid)}">♟️ 棋盤模擬</button>
    </div>
  </div>`;
}

function renderBoardInspector(wd){
  const A=app(), esc=A.esc||(s=>s), b=M.board;
  const sel=b.pieces.find(p=>p.id===b.selId);
  if(!sel){
    const movedN=b.pieces.filter(p=>p.kind==='city'&&(p.x!==p.ox||p.y!==p.oy)).length;
    return`<div class="card tight"><div class="sub">♟️ <b>棋盤排位說明：</b>點選任一棋子後可直接拖曳、或點空白格移動（玩家城池 = <code>2×2</code>、熊陷阱／總部 = <code>3×3</code>、旗幟 = <code>1×1</code> 含 <code>7×7</code> 領地）。目前場上共 <b>${b.pieces.length}</b> 枚棋子（已調整 <b>${movedN}</b> 位），變更會自動存檔。</div></div>`;
  }
  const moved=sel.kind==='city'&&(sel.x!==sel.ox||sel.y!==sel.oy);
  const nt=sel.kind==='city'?nearestTrapInfo(sel):null;
  const meta=BLD_META[sel.kind];
  return`<div class="card tight" style="border-color:var(--ac)">
    <div class="row sp">
      <div>
        <b>${esc(meta?meta.label:sel.name)}</b> <span class="bd a">${sel.size}×${sel.size} 格</span>
        ${moved?`<span class="bd w">原 (${sel.ox},${sel.oy}) → 新 (${sel.x},${sel.y})</span>`:`<span class="bd">座標 (${sel.x}, ${sel.y})</span>`}
        ${nt?`<div class="sub tnum" style="margin-top:3px">🐻 距${nt.trap.kind==='trap1'?'熊一':'熊二'} <b>${nt.dist.toFixed(1)} 格</b>（估算行軍約 <b>${marchSec(nt.dist)} 秒</b>）</div>`:''}
      </div>
      <button class="btn sm" data-mp="bDesel">✕</button>
    </div>
    <div class="row" style="margin-top:8px;gap:6px">
      <button class="btn sm" data-mp="bNudge" data-dx="0" data-dy="1">⬆️ 上</button>
      <button class="btn sm" data-mp="bNudge" data-dx="0" data-dy="-1">⬇️ 下</button>
      <button class="btn sm" data-mp="bNudge" data-dx="-1" data-dy="0">⬅️ 左</button>
      <button class="btn sm" data-mp="bNudge" data-dx="1" data-dy="0">➡️ 右</button>
      ${moved?`<button class="btn sm soft" data-mp="bResetOne">↩️ 回原位</button>`:''}
      ${sel.kind!=='city'?`<button class="btn sm dg" data-mp="bDelOne">🗑️ 移除</button>`:`<button class="btn sm soft" data-mp="openCard" data-v="${esc(sel.fid)}">👤 名片</button>`}
    </div>
  </div>`;
}

function renderStreetFooter(wd){
  const A=app(), esc=A.esc||(s=>s), fmtP=A.fmtP||(n=>n), furnL=A.furnL||(n=>n);
  const sv=M.sv;
  let selObj=null;
  if(sv.selKey){
    const objs=getStreetObjects(wd);
    selObj=objs.find(o=>o.key===sv.selKey);
  }
  if(selObj){
    const d=Math.hypot(selObj.x-sv.x,selObj.y-sv.y);
    return`<div class="card tight" style="border-color:${selObj.color}">
      <div class="row sp">
        <div><b>${esc(selObj.name)}</b> ${selObj.al?`<span class="bd a">${esc(selObj.al)}</span>`:''} <span class="bd">距你 ${d.toFixed(1)} 格</span>
        <div class="sub tnum" style="margin-top:2px">座標 X:${Math.round(selObj.x)} · Y:${Math.round(selObj.y)}${selObj.power?' · 戰力 '+fmtP(selObj.power):''}${selObj.furn?' · '+furnL(selObj.furn):''}</div></div>
        <button class="btn sm" data-mp="svClearSel">✕</button>
      </div>
      <div class="row" style="margin-top:8px;gap:6px">
        <button class="btn sm pri" data-mp="svWalkTo" data-x="${selObj.x}" data-y="${selObj.y}">🚶 走到門口</button>
        ${selObj.fid?`<button class="btn sm soft" data-mp="openCard" data-v="${esc(selObj.fid)}">👤 查看名片</button>`:''}
      </div>
    </div>`;
  }
  return`<div class="card tight"><div class="sub">👁️ <b>冰原街景操作：</b>在畫面上左右滑動可 <b>360° 環景張望</b>，按住左下方向鍵（或點選畫面中前方雪地箭頭）就能沿著 2611 冰原街道前進散步；點任何一座立體城池即可查看盟友情報！</div></div>`;
}

/* ===== Mode 1：繪製王國大地圖 ===== */
function drawWorldMap(ctx,w,h,wd){
  const dark=isDark();
  ctx.fillStyle=dark?'#0c1829':'#dfeeff';
  ctx.fillRect(0,0,w,h);

  // 輔助函式：畫遊戲正方形區域（等距時為菱形）
  function drawZoneBox(r,fill,stroke,dash){
    const pts=[
      mapWorldToScreen(CENTER-r,CENTER-r,w,h),
      mapWorldToScreen(CENTER+r,CENTER-r,w,h),
      mapWorldToScreen(CENTER+r,CENTER+r,w,h),
      mapWorldToScreen(CENTER-r,CENTER+r,w,h)
    ];
    ctx.beginPath();
    ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<4;i++)ctx.lineTo(pts[i].x,pts[i].y);
    ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill()}
    if(stroke){
      ctx.save();
      if(dash)ctx.setLineDash(dash);
      ctx.strokeStyle=stroke;ctx.lineWidth=1.4;ctx.stroke();
      ctx.restore();
    }
  }

  // 四層遊戲地形帶
  drawZoneBox(600,dark?'#102033':'#eaf4ff',dark?'rgba(148,163,184,.28)':'rgba(30,64,110,.25)');
  drawZoneBox(R_TUNDRA,dark?'#142a42':'#dcedff',dark?'rgba(56,189,248,.32)':'rgba(2,132,199,.32)',[6,4]);
  drawZoneBox(R_FERTILE,dark?'#15363a':'#d9f5e8',dark?'rgba(52,211,153,.42)':'rgba(16,185,129,.45)',[5,4]);
  drawZoneBox(R_CORE,dark?'rgba(127,29,29,.45)':'rgba(254,202,202,.52)',dark?'rgba(248,113,113,.65)':'rgba(220,38,38,.55)');

  // 自適應座標網格
  const s=M.cam.scale;
  const step=s>=16?1:s>=6?5:s>=2?20:s>=0.8?50:100;
  const corners=[mapScreenToWorld(0,0,w,h),mapScreenToWorld(w,0,w,h),mapScreenToWorld(w,h,w,h),mapScreenToWorld(0,h,w,h)];
  const minX=Math.max(0,Math.floor(Math.min(...corners.map(c=>c.x))/step)*step);
  const maxX=Math.min(WORLD,Math.ceil(Math.max(...corners.map(c=>c.x))/step)*step);
  const minY=Math.max(0,Math.floor(Math.min(...corners.map(c=>c.y))/step)*step);
  const maxY=Math.min(WORLD,Math.ceil(Math.max(...corners.map(c=>c.y))/step)*step);

  ctx.save();
  ctx.strokeStyle=dark?'rgba(148,185,220,.11)':'rgba(15,45,85,.09)';
  ctx.lineWidth=1;
  ctx.beginPath();
  for(let gx=minX;gx<=maxX;gx+=step){
    const a=mapWorldToScreen(gx,minY,w,h), b=mapWorldToScreen(gx,maxY,w,h);
    ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
  }
  for(let gy=minY;gy<=maxY;gy+=step){
    const a=mapWorldToScreen(minX,gy,w,h), b=mapWorldToScreen(maxX,gy,w,h);
    ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
  }
  ctx.stroke();
  ctx.restore();

  // 太陽城與四座砲台
  const sc=mapWorldToScreen(CENTER,CENTER,w,h);
  const cRad=Math.max(6,s*3.2);
  ctx.save();
  ctx.fillStyle='#f59e0b';
  ctx.strokeStyle='#fff7ed';
  ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(sc.x,sc.y,cRad,0,Math.PI*2);ctx.fill();ctx.stroke();
  if(s>=1.2){
    ctx.font='800 12px -apple-system,sans-serif';
    ctx.textAlign='center';
    ctx.fillStyle=dark?'#fde68a':'#92400e';
    ctx.fillText('🏰 太陽城 (600,600)',sc.x,sc.y-cRad-6);
  }
  if(s>=1.5){
    TURRETS.forEach(t=>{
      const tp=mapWorldToScreen(t.x,t.y,w,h);
      ctx.fillStyle='#ef4444';
      ctx.beginPath();ctx.arc(tp.x,tp.y,Math.max(3.5,s*1.2),0,Math.PI*2);ctx.fill();
      if(s>=5){
        ctx.font='700 11px -apple-system,sans-serif';
        ctx.fillStyle=dark?'#fca5a5':'#991b1b';
        ctx.fillText(t.name,tp.x,tp.y-Math.max(6,s*1.5));
      }
    });
  }
  ctx.restore();

  // 篩選玩家並繪製城池
  const list=wd.players.filter(p=>{
    if(M.alFilter==='ours'&&p.al!=='jQt'&&p.al!=='aQt')return false;
    if(M.alFilter!=='all'&&M.alFilter!=='ours'&&p.al!==M.alFilter)return false;
    if(M.shFilter==='shield'&&!p.shield)return false;
    if(M.shFilter==='noshield'&&p.shield)return false;
    return true;
  });

  const labelBoxes=[];
  const canPlaceLabel=(lx,ly,lw,lh)=>{
    for(const b of labelBoxes){
      if(lx<b.x+b.w&&lx+lw>b.x&&ly<b.y+b.h&&ly+lh>b.y)return false;
    }
    labelBoxes.push({x:lx,y:ly,w:lw,h:lh});
    return true;
  };

  for(const p of list){
    const pt=mapWorldToScreen(p.x,p.y,w,h);
    if(pt.x<-40||pt.x>w+40||pt.y<-40||pt.y>h+40)continue;
    const col=alColor(p.al), sel=p.fid===M.selFid;
    if(s>=5){
      // 畫真實 2x2 城池占地
      const p0=mapWorldToScreen(p.x-1,p.y-1,w,h);
      const p1=mapWorldToScreen(p.x+1,p.y-1,w,h);
      const p2=mapWorldToScreen(p.x+1,p.y+1,w,h);
      const p3=mapWorldToScreen(p.x-1,p.y+1,w,h);
      ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.lineTo(p3.x,p3.y);ctx.closePath();
      ctx.fillStyle=col;ctx.fill();
      ctx.strokeStyle=sel?'#facc15':'#ffffff';
      ctx.lineWidth=sel?3:1.2;ctx.stroke();
      if(p.shield){
        ctx.beginPath();ctx.arc(pt.x,pt.y,Math.max(7,s*1.25),0,Math.PI*2);
        ctx.strokeStyle='rgba(56,189,248,.9)';ctx.lineWidth=2;ctx.stroke();
      }
      if(p.burn){
        ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('🔥',pt.x,pt.y+4);
      }
      if(s>=9||sel){
        ctx.font=(sel?'800 ':'700 ')+'11.5px -apple-system,sans-serif';
        const txt=p.name.slice(0,10);
        const tw=ctx.measureText(txt).width+10;
        const lx=pt.x-tw/2, ly=pt.y-Math.max(18,s*1.35)-12;
        if(sel||canPlaceLabel(lx,ly,tw,17)){
          ctx.fillStyle=sel?'#facc15':(dark?'rgba(12,24,42,.82)':'rgba(255,255,255,.9)');
          ctx.beginPath();
          if(ctx.roundRect)ctx.roundRect(lx,ly,tw,17,6);else ctx.rect(lx,ly,tw,17);
          ctx.fill();
          ctx.fillStyle=sel?'#1e293b':(dark?'#f1f5f9':'#0f172a');
          ctx.textAlign='center';ctx.fillText(txt,pt.x,ly+12.5);
        }
      }
    }else{
      const rad=sel?7:clamp(s*1.2,2.6,5.5);
      ctx.fillStyle=col;
      ctx.beginPath();ctx.arc(pt.x,pt.y,rad,0,Math.PI*2);ctx.fill();
      if(sel){ctx.strokeStyle='#facc15';ctx.lineWidth=2.5;ctx.stroke()}
      else if(p.shield){ctx.strokeStyle='#38bdf8';ctx.lineWidth=1.2;ctx.stroke()}
    }
  }

  // 遠景聯盟聚落標籤
  if(s<9){
    ctx.save();
    ctx.font='800 12px -apple-system,sans-serif';
    ctx.textAlign='center';
    wd.hives.slice(0,10).forEach(hv=>{
      if(hv.clusterCount<3)return;
      if(M.alFilter==='ours'&&hv.al!=='jQt'&&hv.al!=='aQt')return;
      if(M.alFilter!=='all'&&M.alFilter!=='ours'&&hv.al!==M.alFilter)return;
      const pt=mapWorldToScreen(hv.x,hv.y,w,h);
      if(pt.x<-50||pt.x>w+50||pt.y<-30||pt.y>h+30)return;
      const txt=`${hv.al} · ${hv.count}人`;
      const tw=ctx.measureText(txt).width+14;
      ctx.fillStyle=alColor(hv.al);
      ctx.beginPath();
      if(ctx.roundRect)ctx.roundRect(pt.x-tw/2,pt.y-24,tw,21,10);else ctx.rect(pt.x-tw/2,pt.y-24,tw,21);
      ctx.fill();
      ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillStyle='#fff';ctx.fillText(txt,pt.x,pt.y-9.5);
    });
    ctx.restore();
  }

  // 更新左上角即時座標 HUD
  const hud=document.getElementById('mpHudCoord');
  if(hud){
    const c=M.cursorW||M.cam, z=zoneOf(c.x,c.y);
    hud.innerHTML=`X:${Math.round(c.x)} · Y:${Math.round(c.y)} <span style="color:${z.c}">● ${z.l}</span>`;
  }
}

/* ===== Mode 2：繪製棋盤格排位模擬 ===== */
function drawBoard(ctx,w,h){
  const dark=isDark(), b=M.board, t=b.cam.tile;
  ctx.fillStyle=dark?'#0f1c2e':'#f1f7fe';
  ctx.fillRect(0,0,w,h);

  const tl=boardScreenToWorld(0,0,w,h), br=boardScreenToWorld(w,h,w,h);
  const x0=Math.max(0,Math.floor(tl.x)-1), x1=Math.min(WORLD,Math.ceil(br.x)+1);
  const y0=Math.max(0,Math.floor(br.y)-1), y1=Math.min(WORLD,Math.ceil(tl.y)+1);

  // 棋盤格交錯底色
  if(t>=8){
    ctx.fillStyle=dark?'rgba(148,185,220,.055)':'rgba(15,45,85,.045)';
    for(let gx=x0;gx<x1;gx++){
      for(let gy=y0;gy<y1;gy++){
        if((gx+gy)&1){
          const p=boardWorldToScreen(gx,gy+1,w,h);
          ctx.fillRect(p.x,p.y,t,t);
        }
      }
    }
  }
  // 格線
  const gStep=t>=10?1:5;
  ctx.strokeStyle=dark?'rgba(148,185,220,.14)':'rgba(15,45,85,.11)';
  ctx.lineWidth=1;
  ctx.beginPath();
  for(let gx=Math.floor(x0/gStep)*gStep;gx<=x1;gx+=gStep){
    const p=boardWorldToScreen(gx,y1,w,h);
    ctx.moveTo(p.x,0);ctx.lineTo(p.x,h);
  }
  for(let gy=Math.floor(y0/gStep)*gStep;gy<=y1;gy+=gStep){
    const p=boardWorldToScreen(x0,gy,w,h);
    ctx.moveTo(0,p.y);ctx.lineTo(w,p.y);
  }
  ctx.stroke();

  // 座標刻度尺（每 5 格標示）
  const tickStep=t>=22?2:t>=12?5:10;
  ctx.font='700 10.5px ui-monospace,monospace';
  ctx.fillStyle=dark?'rgba(203,213,225,.75)':'rgba(51,65,85,.75)';
  ctx.textAlign='center';
  for(let gx=Math.ceil(x0/tickStep)*tickStep;gx<=x1;gx+=tickStep){
    const p=boardWorldToScreen(gx,y1,w,h);
    ctx.fillText(String(gx),p.x+t/2,h-5);
  }
  ctx.textAlign='left';
  for(let gy=Math.ceil(y0/tickStep)*tickStep;gy<=y1;gy+=tickStep){
    const p=boardWorldToScreen(x0,gy,w,h);
    ctx.fillText(String(gy),5,p.y-t/2+4);
  }

  // 1. 聯盟旗幟 7x7 領地覆蓋框
  if(b.showTerr){
    b.pieces.filter(p=>p.kind==='banner').forEach(p=>{
      const tlP=boardWorldToScreen(p.x-3,p.y+4,w,h);
      ctx.fillStyle='rgba(14,165,233,.13)';
      ctx.strokeStyle='rgba(14,165,233,.55)';
      ctx.lineWidth=1.5;
      ctx.save();ctx.setLineDash([5,3]);
      ctx.fillRect(tlP.x,tlP.y,7*t,7*t);
      ctx.strokeRect(tlP.x,tlP.y,7*t,7*t);
      ctx.restore();
    });
  }

  // 2. 熊陷阱距離參考圈（第一圈/第二圈/第三圈）
  if(b.showRings){
    b.pieces.filter(p=>p.kind==='trap1'||p.kind==='trap2').forEach(tr=>{
      const c=boardWorldToScreen(tr.x+1.5,tr.y+1.5,w,h);
      ctx.save();ctx.setLineDash([4,4]);
      [3.5,6,8.5].forEach((rr,i)=>{
        ctx.beginPath();ctx.arc(c.x,c.y,rr*t,0,Math.PI*2);
        ctx.strokeStyle=i===0?'rgba(245,158,11,.65)':i===1?'rgba(245,158,11,.4)':'rgba(245,158,11,.22)';
        ctx.lineWidth=1.4;ctx.stroke();
      });
      ctx.restore();
    });
  }

  // 3. 已移動城池的原位標記與虛線箭頭
  b.pieces.filter(p=>p.kind==='city'&&(p.x!==p.ox||p.y!==p.oy)).forEach(p=>{
    const oTL=boardWorldToScreen(p.ox,p.oy+p.size,w,h);
    ctx.save();
    ctx.setLineDash([4,3]);
    ctx.strokeStyle=dark?'rgba(250,204,21,.55)':'rgba(217,119,6,.55)';
    ctx.lineWidth=1.5;
    ctx.strokeRect(oTL.x+1,oTL.y+1,p.size*t-2,p.size*t-2);
    const c1=boardWorldToScreen(p.ox+p.size/2,p.oy+p.size/2,w,h);
    const c2=boardWorldToScreen(p.x+p.size/2,p.y+p.size/2,w,h);
    ctx.beginPath();ctx.moveTo(c1.x,c1.y);ctx.lineTo(c2.x,c2.y);ctx.stroke();
    ctx.restore();
  });

  // 4. 繪製全部棋子
  b.pieces.forEach(p=>{
    const tlP=boardWorldToScreen(p.x,p.y+p.size,w,h);
    const pw=p.size*t, ph=p.size*t;
    if(tlP.x+pw<0||tlP.x>w||tlP.y+ph<0||tlP.y>h)return;
    const isSel=p.id===b.selId;
    const meta=BLD_META[p.kind];
    const fill=meta?meta.bg:(p.x!==p.ox||p.y!==p.oy?'rgba(245,158,11,.28)':(dark?'rgba(56,189,248,.22)':'rgba(37,99,235,.18)'));
    const stroke=isSel?'#facc15':(meta?meta.color:alColor(p.al));
    ctx.fillStyle=fill;
    ctx.strokeStyle=stroke;
    ctx.lineWidth=isSel?3:2;
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(tlP.x+2,tlP.y+2,pw-4,ph-4,Math.min(10,t*0.35));
    else ctx.rect(tlP.x+2,tlP.y+2,pw-4,ph-4);
    ctx.fill();ctx.stroke();

    // 棋子文字
    ctx.textAlign='center';
    ctx.fillStyle=dark?'#f8fafc':'#0f172a';
    const cx=tlP.x+pw/2, cy=tlP.y+ph/2;
    if(meta){
      ctx.font=`800 ${clamp(Math.round(t*0.48),10,16)}px -apple-system,sans-serif`;
      ctx.fillText(meta.short,cx,cy+4);
    }else if(t>=12){
      ctx.font=`800 ${clamp(Math.round(t*0.44),10,13.5)}px -apple-system,sans-serif`;
      const maxCh=Math.max(2,Math.floor(pw/11));
      ctx.fillText(p.name.slice(0,maxCh),cx,cy+(t>=20?-1:4));
      if(t>=20){
        const nt=nearestTrapInfo(p);
        ctx.font='700 10px ui-monospace,monospace';
        ctx.fillStyle=dark?'#93c5fd':'#1e40af';
        ctx.fillText(nt?nt.dist.toFixed(1)+'格':`${p.x},${p.y}`,cx,cy+13);
      }
    }
  });

  // 5. 拖曳中的幽靈預覽（綠＝合法、紅＝碰撞）
  if(b.drag){
    const p=b.pieces.find(x=>x.id===b.drag.id);
    if(p){
      const tlP=boardWorldToScreen(b.drag.tx,b.drag.ty+p.size,w,h);
      ctx.save();
      ctx.fillStyle=b.drag.ok?'rgba(34,197,94,.35)':'rgba(239,68,68,.42)';
      ctx.strokeStyle=b.drag.ok?'#22c55e':'#ef4444';
      ctx.lineWidth=2.5;
      ctx.fillRect(tlP.x+1,tlP.y+1,p.size*t-2,p.size*t-2);
      ctx.strokeRect(tlP.x+1,tlP.y+1,p.size*t-2,p.size*t-2);
      ctx.restore();
    }
  }
}

/* ===== Mode 3：模擬遊戲 3D 街景（Google Street View 風格） ===== */
function getStreetObjects(wd){
  const objs=[];
  // 太陽城與四座砲台永遠存在於地平線上
  objs.push({key:'castle',kind:'castle',name:'🏰 太陽城',al:'',x:CENTER,y:CENTER,size:6,h:8.5,color:'#f59e0b'});
  TURRETS.forEach((t,i)=>objs.push({key:'tur_'+i,kind:'turret',name:t.name,al:'',x:t.x,y:t.y,size:2,h:4.2,color:'#ef4444'}));
  if(M.sv.useSim&&M.board.pieces.length){
    M.board.pieces.forEach(p=>{
      const meta=BLD_META[p.kind];
      objs.push({
        key:p.id,kind:p.kind,fid:p.fid||'',name:meta?meta.label:p.name,al:p.al||'',
        power:p.power||0,furn:p.furn||0,
        x:p.x+p.size/2,y:p.y+p.size/2,size:p.size,
        h:p.kind==='city'?1.25+Math.min(1.45,(p.furn||20)/28):p.kind==='hq'?2.8:p.kind==='banner'?2.2:1.4,
        color:meta?meta.color:alColor(p.al),
        shield:0,burn:0
      });
    });
  }else{
    wd.players.forEach(p=>{
      objs.push({
        key:'p_'+p.fid,kind:'city',fid:p.fid,name:p.name,al:p.al,power:p.power,furn:p.furn,
        x:p.x,y:p.y,size:2,
        h:1.25+Math.min(1.45,(p.furn||20)/28),
        color:alColor(p.al),shield:p.shield,burn:p.burn
      });
    });
  }
  return objs;
}

function drawStreetView(ctx,w,h,wd,now){
  const dark=isDark(), sv=M.sv;
  const camZ=sv.aerial?7.8:2.65;
  const pitch=sv.aerial?0.28:0.08; // 俯視角
  const horizon=h*(sv.aerial?0.32:0.42);
  const focal=w*0.72;
  const sinY=Math.sin(sv.yaw), cosY=Math.cos(sv.yaw);

  // 世界座標轉相機空間 (right=rx, depth=dz, up=uz)
  function proj(wx,wy,wz){
    const dx=wx-sv.x, dy=wy-sv.y;
    const rx=dx*cosY-dy*sinY;
    const dz=dx*sinY+dy*cosY;
    if(dz<=0.45)return null;
    const u=wz-camZ;
    // 簡易 pitch 近似
    const sy=horizon-(u/dz-pitch)*focal;
    const sx=w/2+(rx/dz)*focal;
    return{sx,sy,dz,sc:focal/dz};
  }

  // 1. 天空與極光／日照漸層
  const sky=ctx.createLinearGradient(0,0,0,horizon+20);
  if(dark){
    sky.addColorStop(0,'#060d1f');
    sky.addColorStop(0.55,'#0e2444');
    sky.addColorStop(1,'#1c3f60');
  }else{
    sky.addColorStop(0,'#5aa3e8');
    sky.addColorStop(0.6,'#a7d4f8');
    sky.addColorStop(1,'#e8f5ff');
  }
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,horizon+10);

  // 極光帶（深色模式）與星星
  if(dark){
    ctx.save();
    for(let i=0;i<26;i++){
      const ang=((i*47.3)%360)*Math.PI/180;
      let diff=ang-sv.yaw;
      while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
      if(Math.abs(diff)>1.1)continue;
      const sx=w/2+Math.tan(diff)*focal*0.55;
      const sy=16+((i*29)%Math.max(40,horizon*0.65));
      ctx.fillStyle=`rgba(255,255,255,${0.35+0.45*Math.sin(now*0.002+i)})`;
      ctx.fillRect(sx,sy,2,2);
    }
    // 極光波浪
    const aur=ctx.createLinearGradient(0,horizon*0.15,0,horizon*0.78);
    aur.addColorStop(0,'rgba(52,211,153,0)');
    aur.addColorStop(0.5,'rgba(45,212,191,0.22)');
    aur.addColorStop(1,'rgba(56,189,248,0)');
    ctx.fillStyle=aur;
    ctx.beginPath();
    ctx.moveTo(0,horizon*0.75);
    for(let x=0;x<=w;x+=28){
      const y=horizon*0.36+Math.sin(x*0.012+sv.yaw*2.5+now*0.0008)*22+Math.cos(x*0.02-now*0.0005)*12;
      ctx.lineTo(x,y);
    }
    ctx.lineTo(w,horizon*0.82);ctx.closePath();ctx.fill();
    ctx.restore();
  }

  // 遠山剪影（隨視角旋轉平順滾動）
  ctx.fillStyle=dark?'#152c47':'#c6dff5';
  ctx.beginPath();ctx.moveTo(0,horizon+4);
  for(let x=0;x<=w+20;x+=18){
    const a=sv.yaw+(x-w/2)/focal;
    const mh=14+Math.sin(a*5)*11+Math.cos(a*11)*7+Math.sin(a*19)*4;
    ctx.lineTo(x,horizon-Math.max(2,mh));
  }
  ctx.lineTo(w,horizon+4);ctx.closePath();ctx.fill();

  // 2. 雪地地面漸層
  const curZ=zoneOf(sv.x,sv.y);
  const gnd=ctx.createLinearGradient(0,horizon,0,h);
  if(dark){
    gnd.addColorStop(0,curZ.k==='core'?'#3b1d28':'#18324c');
    gnd.addColorStop(1,curZ.k==='core'?'#231118':'#0e2034');
  }else{
    gnd.addColorStop(0,curZ.k==='core'?'#f8d8d8':'#dceeff');
    gnd.addColorStop(1,curZ.k==='core'?'#f3c6c6':'#eef7ff');
  }
  ctx.fillStyle=gnd;ctx.fillRect(0,horizon,w,h-horizon);

  // 3. 透視雪地座標格線（半徑 42 格，每 2 格一條）
  ctx.save();
  ctx.strokeStyle=dark?'rgba(148,197,240,.14)':'rgba(30,64,110,.12)';
  ctx.lineWidth=1;
  const gSpan=36, gStep=2;
  const bx=Math.floor(sv.x/gStep)*gStep, by=Math.floor(sv.y/gStep)*gStep;
  ctx.beginPath();
  for(let dx=-gSpan;dx<=gSpan;dx+=gStep){
    const gx=bx+dx;
    let prev=null;
    for(let dy=-gSpan;dy<=gSpan;dy+=4){
      const p=proj(gx,by+dy,0);
      if(p&&p.dz<52){if(prev)ctx.moveTo(prev.sx,prev.sy),ctx.lineTo(p.sx,p.sy);prev=p}else prev=null;
    }
  }
  for(let dy=-gSpan;dy<=gSpan;dy+=gStep){
    const gy=by+dy;
    let prev=null;
    for(let dx=-gSpan;dx<=gSpan;dx+=4){
      const p=proj(bx+dx,gy,0);
      if(p&&p.dz<52){if(prev)ctx.moveTo(prev.sx,prev.sy),ctx.lineTo(p.sx,p.sy);prev=p}else prev=null;
    }
  }
  ctx.stroke();
  ctx.restore();

  // 4. 地面 Google 街景前進箭頭（點一下可往前走！）
  const fwdP=proj(sv.x+sinY*5.5,sv.y+cosY*5.5,0.06);
  sv.fwdHit=null;
  if(fwdP&&fwdP.sy>horizon+20&&fwdP.sy<h-26){
    const ar=clamp(fwdP.sc*0.55,14,28);
    ctx.save();
    ctx.fillStyle='rgba(255,255,255,.32)';
    ctx.strokeStyle='rgba(255,255,255,.88)';
    ctx.lineWidth=2.4;
    ctx.beginPath();
    ctx.moveTo(fwdP.sx,fwdP.sy-ar*0.65);
    ctx.lineTo(fwdP.sx+ar,fwdP.sy+ar*0.35);
    ctx.lineTo(fwdP.sx,fwdP.sy+ar*0.05);
    ctx.lineTo(fwdP.sx-ar,fwdP.sy+ar*0.35);
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.restore();
    sv.fwdHit={x:fwdP.sx,y:fwdP.sy,r:ar+10};
  }

  // 5. 收集視野內的 3D 城池與地標，由遠到近繪製（Painter's algorithm）
  const objs=getStreetObjects(wd);
  const vis=[];
  for(const o of objs){
    const dx=o.x-sv.x, dy=o.y-sv.y;
    const dist=Math.hypot(dx,dy);
    const maxR=o.kind==='castle'?550:o.kind==='turret'?140:68;
    if(dist>maxR||dist<1.2)continue;
    const pBase=proj(o.x,o.y,0);
    if(!pBase||pBase.sx<-120||pBase.sx>w+120)continue;
    const pTop=proj(o.x,o.y,o.h);
    vis.push({o,dist,pBase,pTop});
  }
  vis.sort((a,b)=>b.dist-a.dist);

  sv.hitBoxes=[];
  const labelCands=[];
  for(const item of vis){
    const {o,dist,pBase,pTop}=item;
    const bw=clamp(pBase.sc*(o.size*0.64),6,165);
    const bh=Math.max(6,pBase.sy-(pTop?pTop.sy:pBase.sy-bw));
    const bx0=pBase.sx-bw/2, by0=pBase.sy-bh;
    const alpha=o.kind==='castle'?1:clamp(1.25-dist/68,0.22,1);
    const isSel=o.key===sv.selKey;

    ctx.save();
    ctx.globalAlpha=alpha;

    // 地面陰影
    ctx.fillStyle='rgba(8,20,38,.28)';
    ctx.beginPath();ctx.ellipse(pBase.sx,pBase.sy+2,bw*0.58,Math.max(3,bw*0.18),0,0,Math.PI*2);ctx.fill();

    if(o.kind==='castle'){
      // 太陽城巨型金色要塞
      ctx.fillStyle='#b45309';
      ctx.fillRect(bx0,by0+bh*0.25,bw,bh*0.75);
      ctx.fillStyle='#f59e0b';
      ctx.fillRect(bx0+bw*0.2,by0,bw*0.6,bh*0.85);
      ctx.fillStyle='#fef3c7';
      ctx.beginPath();ctx.moveTo(pBase.sx,by0-bh*0.28);ctx.lineTo(bx0+bw*0.75,by0+bh*0.08);ctx.lineTo(bx0+bw*0.25,by0+bh*0.08);ctx.closePath();ctx.fill();
    }else if(o.kind==='trap1'||o.kind==='trap2'){
      // 3D 熊陷阱競技場
      ctx.fillStyle='#b45309';
      ctx.beginPath();ctx.ellipse(pBase.sx,pBase.sy,bw*0.55,Math.max(4,bw*0.2),0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#f59e0b';
      ctx.fillRect(bx0+bw*0.15,by0+bh*0.35,bw*0.7,bh*0.65);
      ctx.font=`${clamp(Math.round(bw*0.45),12,26)}px sans-serif`;ctx.textAlign='center';
      ctx.fillText('🐻',pBase.sx,by0+bh*0.3);
    }else if(o.kind==='banner'){
      // 3D 聯盟旗幟
      ctx.strokeStyle='#e2e8f0';ctx.lineWidth=Math.max(2,bw*0.12);
      ctx.beginPath();ctx.moveTo(pBase.sx,pBase.sy);ctx.lineTo(pBase.sx,by0);ctx.stroke();
      ctx.fillStyle=o.color;
      ctx.beginPath();ctx.moveTo(pBase.sx,by0);ctx.lineTo(pBase.sx+bw*0.7,by0+bh*0.18);ctx.lineTo(pBase.sx,by0+bh*0.36);ctx.closePath();ctx.fill();
    }else{
      // 3D 立體領主城池（左右雙面受光 + 雪白屋頂 + 熔爐/火晶光塔）
      const sideW=bw*0.32;
      // 左暗面
      ctx.fillStyle=dark?'#263b54':'#9fb7cf';
      ctx.fillRect(bx0,by0+bh*0.22,bw-sideW,bh*0.78);
      // 右亮面
      ctx.fillStyle=dark?'#365173':'#c3d7eb';
      ctx.fillRect(bx0+bw-sideW,by0+bh*0.22,sideW,bh*0.78);
      // 聯盟色城牆腰帶
      ctx.fillStyle=o.color;
      ctx.fillRect(bx0,by0+bh*0.22,bw,Math.max(3,bh*0.14));
      // 積雪屋頂
      ctx.fillStyle=dark?'#dbeafe':'#ffffff';
      ctx.beginPath();ctx.moveTo(pBase.sx,by0);ctx.lineTo(bx0+bw+2,by0+bh*0.24);ctx.lineTo(bx0-2,by0+bh*0.24);ctx.closePath();ctx.fill();
      // 中央熔爐／火晶核心光點
      const isFc=(o.furn||0)>30;
      ctx.fillStyle=isFc?'#38bdf8':'#fb923c';
      ctx.beginPath();ctx.arc(pBase.sx,by0+bh*0.56,Math.max(2.5,bw*0.13),0,Math.PI*2);ctx.fill();
      if(isSel){
        ctx.strokeStyle='#facc15';ctx.lineWidth=2.5;
        ctx.strokeRect(bx0-2,by0-2,bw+4,bh+4);
      }
      // 護盾穹頂
      if(o.shield){
        ctx.fillStyle='rgba(56,189,248,.18)';
        ctx.strokeStyle='rgba(56,189,248,.85)';
        ctx.lineWidth=1.8;
        ctx.beginPath();ctx.arc(pBase.sx,pBase.sy-bh*0.15,Math.max(bw*0.68,bh*0.72),Math.PI,0);ctx.closePath();ctx.fill();ctx.stroke();
      }
      // 燃燒火焰
      if(o.burn){
        ctx.font=`${clamp(Math.round(bw*0.42),12,24)}px sans-serif`;ctx.textAlign='center';
        ctx.fillText('🔥',pBase.sx,by0-2-Math.sin(now*0.01)*3);
      }
    }

    ctx.restore();
    if(dist<28||o.kind==='castle'||isSel){
      labelCands.push({o,dist,sx:pBase.sx,ly:clamp(by0-22,46,h-92),isSel});
    }
    sv.hitBoxes.push({key:o.key,x:bx0-6,y:by0-24,w:bw+12,h:bh+30});
  }

  // 懸浮名牌（由近到遠且自動避開重疊，最多顯示 8 個清晰名牌）
  labelCands.sort((a,b)=>(b.isSel?1:0)-(a.isSel?1:0)||a.dist-b.dist);
  const usedLabels=[];
  let drawnLbl=0;
  for(const c of labelCands){
    if(drawnLbl>=8&&!c.isSel)break;
    ctx.font=(c.isSel?'800 ':'700 ')+'11px -apple-system,sans-serif';
    const tag=c.o.al?`[${c.o.al}] ${c.o.name}`:c.o.name;
    const txt=tag.slice(0,11)+' · '+Math.round(c.dist)+'格';
    const tw=ctx.measureText(txt).width+12, th=18;
    const lx=clamp(c.sx-tw/2,6,w-tw-6), ly=c.ly;
    if(!c.isSel&&usedLabels.some(u=>lx<u.x+u.w+4&&lx+tw+4>u.x&&ly<u.y+u.h+4&&ly+th+4>u.y))continue;
    usedLabels.push({x:lx,y:ly,w:tw,h:th});
    drawnLbl++;
    ctx.save();
    ctx.fillStyle=c.isSel?'#facc15':(dark?'rgba(9,19,35,.84)':'rgba(255,255,255,.92)');
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(lx,ly,tw,th,7);else ctx.rect(lx,ly,tw,th);
    ctx.fill();
    ctx.fillStyle=c.isSel?'#0f172a':(dark?'#f8fafc':'#0f172a');
    ctx.textAlign='center';ctx.fillText(txt,lx+tw/2,ly+12.5);
    ctx.restore();
  }

  // 6. 飄雪粒子
  if(!sv.snow.length){
    for(let i=0;i<36;i++)sv.snow.push({x:Math.random()*w,y:Math.random()*h,r:1+Math.random()*2,sp:0.4+Math.random()*0.9});
  }
  ctx.fillStyle=dark?'rgba(255,255,255,.55)':'rgba(255,255,255,.8)';
  sv.snow.forEach(f=>{
    f.y+=f.sp;f.x+=Math.sin(now*0.001+f.y*0.03)*0.35;
    if(f.y>h){f.y=-4;f.x=Math.random()*w}
    if(f.x<0)f.x=w;if(f.x>w)f.x=0;
    ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill();
  });

  // 7. 右下角同步迷你雷達（含視野扇形錐！）
  const mr=46, mx=w-mr-12, my=h-mr-12;
  ctx.save();
  ctx.beginPath();ctx.arc(mx,my,mr,0,Math.PI*2);
  ctx.fillStyle=dark?'rgba(9,19,35,.78)':'rgba(255,255,255,.85)';ctx.fill();
  ctx.strokeStyle=dark?'rgba(125,211,252,.45)':'rgba(37,99,235,.4)';ctx.lineWidth=1.8;ctx.stroke();
  ctx.clip();
  // 視野扇形（yaw=0 為上方 +Y）
  const ang=sv.yaw-Math.PI/2;
  ctx.fillStyle='rgba(250,204,21,.24)';
  ctx.beginPath();ctx.moveTo(mx,my);ctx.arc(mx,my,mr,ang-0.55,ang+0.55);ctx.closePath();ctx.fill();
  // 周圍 40 格內城池
  const rScale=mr/40;
  objs.forEach(o=>{
    const dx=o.x-sv.x, dy=o.y-sv.y;
    if(Math.abs(dx)>42||Math.abs(dy)>42)return;
    ctx.fillStyle=o.color;
    ctx.beginPath();ctx.arc(mx+dx*rScale,my-dy*rScale,o.kind==='castle'?4:2.4,0,Math.PI*2);ctx.fill();
  });
  // 自己（Google 小人金點）
  ctx.fillStyle='#facc15';ctx.strokeStyle='#0f172a';ctx.lineWidth=1.4;
  ctx.beginPath();ctx.arc(mx,my,4,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.restore();

  // 更新頂部羅盤條
  const comp=document.getElementById('mpSvCompass');
  if(comp){
    const deg=((Math.round(sv.yaw*180/Math.PI)%360)+360)%360;
    const dirs=['北 N','東北 NE','東 E','東南 SE','南 S','西南 SW','西 W','西北 NW'];
    const dLab=dirs[Math.round(deg/45)%8];
    comp.textContent=`🧭 ${dLab} ${deg}°｜X:${Math.round(sv.x)} · Y:${Math.round(sv.y)}（${curZ.l}）`;
  }
}

/* ===== 動畫迴圈 ===== */
function tick(ts){
  if(!M.mounted)return;
  const dt=M.lastTs?Math.min(0.05,(ts-M.lastTs)/1000):0.016;
  M.lastTs=ts;

  // 地圖飛躍補間動畫
  if(M.mode==='map'&&M.flyAnim){
    const p=clamp((ts-M.flyAnim.t0)/M.flyAnim.dur,0,1);
    const e=1-Math.pow(1-p,3);
    M.cam.x=M.flyAnim.from.x+(M.flyAnim.to.x-M.flyAnim.from.x)*e;
    M.cam.y=M.flyAnim.from.y+(M.flyAnim.to.y-M.flyAnim.from.y)*e;
    M.cam.scale=M.flyAnim.from.scale+(M.flyAnim.to.scale-M.flyAnim.from.scale)*e;
    if(p>=1)M.flyAnim=null;
  }

  // 街景按住方向鍵連續行走／轉頭
  if(M.mode==='street'&&M.sv.holdDir){
    const spd=11*dt, turn=1.65*dt;
    if(M.sv.holdDir==='fwd'){M.sv.x=clamp(M.sv.x+Math.sin(M.sv.yaw)*spd,0,WORLD);M.sv.y=clamp(M.sv.y+Math.cos(M.sv.yaw)*spd,0,WORLD)}
    else if(M.sv.holdDir==='back'){M.sv.x=clamp(M.sv.x-Math.sin(M.sv.yaw)*spd,0,WORLD);M.sv.y=clamp(M.sv.y-Math.cos(M.sv.yaw)*spd,0,WORLD)}
    else if(M.sv.holdDir==='left')M.sv.yaw-=turn;
    else if(M.sv.holdDir==='right')M.sv.yaw+=turn;
  }

  const cv=document.getElementById('mpCanvas');
  if(cv){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=cv.clientWidth||360, h=cv.clientHeight||440;
    if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){
      cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
    }
    const ctx=cv.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const wd=getWorldData();
    if(M.mode==='map')drawWorldMap(ctx,w,h,wd);
    else if(M.mode==='board')drawBoard(ctx,w,h);
    else drawStreetView(ctx,w,h,wd,ts);
  }
  M.raf=requestAnimationFrame(tick);
}

/* ===== Canvas 觸控與滑鼠互動（支援單指拖曳、雙指縮放、棋子拖拉、街景轉頭） ===== */
function bindCanvas(cv){
  const ptrs=new Map();
  let startP=null, moved=false, pinchDist0=0, pinchScale0=1;
  let draggingPieceId=null, panCam0=null, svYaw0=0;

  function posOf(e){
    const r=cv.getBoundingClientRect();
    return{x:e.clientX-r.left,y:e.clientY-r.top};
  }
  function hitBoardPiece(sx,sy){
    const w=cv.clientWidth, h=cv.clientHeight;
    const wp=boardScreenToWorld(sx,sy,w,h);
    for(let i=M.board.pieces.length-1;i>=0;i--){
      const p=M.board.pieces[i];
      if(wp.x>=p.x&&wp.x<=p.x+p.size&&wp.y>=p.y&&wp.y<=p.y+p.size)return p;
    }
    return null;
  }
  function hitMapCity(sx,sy){
    const w=cv.clientWidth, h=cv.clientHeight, wd=getWorldData();
    let best=null, bd=22;
    for(const p of wd.players){
      if(M.alFilter==='ours'&&p.al!=='jQt'&&p.al!=='aQt')continue;
      if(M.alFilter!=='all'&&M.alFilter!=='ours'&&p.al!==M.alFilter)continue;
      const pt=mapWorldToScreen(p.x,p.y,w,h);
      const d=Math.hypot(pt.x-sx,pt.y-sy);
      if(d<bd){bd=d;best=p}
    }
    return best;
  }

  cv.addEventListener('pointerdown',e=>{
    cv.setPointerCapture(e.pointerId);
    const pt=posOf(e);
    ptrs.set(e.pointerId,pt);
    moved=false;
    M.flyAnim=null;
    if(ptrs.size===2){
      const arr=[...ptrs.values()];
      pinchDist0=Math.hypot(arr[1].x-arr[0].x,arr[1].y-arr[0].y)||1;
      pinchScale0=M.mode==='board'?M.board.cam.tile:M.cam.scale;
      draggingPieceId=null;M.board.drag=null;
      return;
    }
    startP=pt;
    if(M.mode==='map'){
      panCam0={x:M.cam.x,y:M.cam.y};
    }else if(M.mode==='board'){
      panCam0={x:M.board.cam.x,y:M.board.cam.y};
      if(M.board.tool==='move'){
        const hit=hitBoardPiece(pt.x,pt.y);
        if(hit){draggingPieceId=hit.id;M.board.selId=hit.id}
      }
    }else if(M.mode==='street'){
      svYaw0=M.sv.yaw;
    }
  });

  cv.addEventListener('pointermove',e=>{
    const pt=posOf(e);
    if(M.mode==='map'&&!ptrs.size){
      M.cursorW=mapScreenToWorld(pt.x,pt.y,cv.clientWidth,cv.clientHeight);
      return;
    }
    if(!ptrs.has(e.pointerId))return;
    ptrs.set(e.pointerId,pt);

    if(ptrs.size===2){
      const arr=[...ptrs.values()];
      const dist=Math.hypot(arr[1].x-arr[0].x,arr[1].y-arr[0].y)||1;
      const ratio=dist/pinchDist0;
      if(M.mode==='map')M.cam.scale=clamp(pinchScale0*ratio,0.35,42);
      else if(M.mode==='board')M.board.cam.tile=clamp(pinchScale0*ratio,8,56);
      moved=true;
      return;
    }
    if(!startP)return;
    const dx=pt.x-startP.x, dy=pt.y-startP.y;
    if(Math.hypot(dx,dy)>6)moved=true;

    if(M.mode==='map'&&panCam0){
      const w=cv.clientWidth, h=cv.clientHeight;
      const w0=mapScreenToWorld(startP.x,startP.y,w,h);
      const w1=mapScreenToWorld(pt.x,pt.y,w,h);
      M.cam.x=clamp(panCam0.x-(w1.x-w0.x),0,WORLD);
      M.cam.y=clamp(panCam0.y-(w1.y-w0.y),0,WORLD);
    }else if(M.mode==='board'){
      if(draggingPieceId&&moved){
        const p=M.board.pieces.find(x=>x.id===draggingPieceId);
        if(p){
          const wp=boardScreenToWorld(pt.x,pt.y,cv.clientWidth,cv.clientHeight);
          const tx=clamp(Math.round(wp.x-p.size/2),0,WORLD-p.size);
          const ty=clamp(Math.round(wp.y-p.size/2),0,WORLD-p.size);
          M.board.drag={id:p.id,tx,ty,ok:!boardCollides(tx,ty,p.size,p.id)};
        }
      }else if(panCam0&&!draggingPieceId){
        M.board.cam.x=clamp(panCam0.x-dx/M.board.cam.tile,0,WORLD);
        M.board.cam.y=clamp(panCam0.y+dy/M.board.cam.tile,0,WORLD);
      }
    }else if(M.mode==='street'){
      M.sv.yaw=svYaw0-(dx/(cv.clientWidth||360))*Math.PI*1.35;
    }
  });

  function onUp(e){
    const pt=posOf(e);
    ptrs.delete(e.pointerId);
    const A=app();
    if(M.mode==='board'&&draggingPieceId&&M.board.drag){
      const d=M.board.drag, p=M.board.pieces.find(x=>x.id===d.id);
      if(p&&d.ok){p.x=d.tx;p.y=d.ty;simSave();A.render&&A.render()}
      else if(p&&!d.ok&&A.toast)A.toast('該位置已有其他城池或建築，無法重疊');
      M.board.drag=null;draggingPieceId=null;startP=null;return;
    }
    draggingPieceId=null;M.board.drag=null;

    if(!moved&&startP&&ptrs.size===0){
      // 點擊行為
      if(M.mode==='map'){
        const hit=hitMapCity(pt.x,pt.y);
        M.selFid=hit?hit.fid:'';
        A.render&&A.render();
      }else if(M.mode==='board'){
        const wp=boardScreenToWorld(pt.x,pt.y,cv.clientWidth,cv.clientHeight);
        const gx=Math.floor(wp.x), gy=Math.floor(wp.y);
        if(M.board.tool==='move'){
          const hit=hitBoardPiece(pt.x,pt.y);
          if(hit){M.board.selId=hit.id;A.render&&A.render()}
          else if(M.board.selId){
            // 已選棋子後點空地直接跳過去（iPhone 單手超好用！）
            const sel=M.board.pieces.find(x=>x.id===M.board.selId);
            if(sel){
              const tx=clamp(Math.floor(wp.x-sel.size/2+0.5),0,WORLD-sel.size);
              const ty=clamp(Math.floor(wp.y-sel.size/2+0.5),0,WORLD-sel.size);
              if(!boardCollides(tx,ty,sel.size,sel.id)){sel.x=tx;sel.y=ty;simSave();A.render&&A.render()}
              else A.toast&&A.toast('該位置已被佔用，請換旁邊一格');
            }
          }
        }else{
          const meta=BLD_META[M.board.tool];
          if(meta){
            const tx=clamp(gx-Math.floor(meta.size/2),0,WORLD-meta.size);
            const ty=clamp(gy-Math.floor(meta.size/2),0,WORLD-meta.size);
            if(boardCollides(tx,ty,meta.size,'')){A.toast&&A.toast('空間不足或與其他棋子重疊')}
            else{
              const np={id:M.board.tool+'_'+Date.now().toString(36),kind:M.board.tool,name:meta.label,x:tx,y:ty,ox:tx,oy:ty,size:meta.size};
              M.board.pieces.unshift(np);
              M.board.selId=np.id;
              if(M.board.tool==='trap1'||M.board.tool==='trap2'||M.board.tool==='hq')M.board.tool='move';
              simSave();A.render&&A.render();
            }
          }
        }
      }else if(M.mode==='street'){
        // 先判地面前進箭頭
        if(M.sv.fwdHit&&Math.hypot(pt.x-M.sv.fwdHit.x,pt.y-M.sv.fwdHit.y)<=M.sv.fwdHit.r){
          M.sv.x=clamp(M.sv.x+Math.sin(M.sv.yaw)*4.5,0,WORLD);
          M.sv.y=clamp(M.sv.y+Math.cos(M.sv.yaw)*4.5,0,WORLD);
          return;
        }
        // 再判 3D 建築（從最近到最遠）
        let hitKey='';
        for(let i=M.sv.hitBoxes.length-1;i>=0;i--){
          const b=M.sv.hitBoxes[i];
          if(pt.x>=b.x&&pt.x<=b.x+b.w&&pt.y>=b.y&&pt.y<=b.y+b.h){hitKey=b.key;break}
        }
        M.sv.selKey=hitKey;
        A.render&&A.render();
      }
    }
    startP=null;
  }

  cv.addEventListener('pointerup',onUp);
  cv.addEventListener('pointercancel',onUp);
  cv.addEventListener('wheel',e=>{
    e.preventDefault();
    const f=e.deltaY<0?1.18:0.85;
    if(M.mode==='map')M.cam.scale=clamp(M.cam.scale*f,0.35,42);
    else if(M.mode==='board')M.board.cam.tile=clamp(M.board.cam.tile*f,8,56);
    else if(M.mode==='street'){
      const step=e.deltaY<0?2.5:-2.5;
      M.sv.x=clamp(M.sv.x+Math.sin(M.sv.yaw)*step,0,WORLD);
      M.sv.y=clamp(M.sv.y+Math.cos(M.sv.yaw)*step,0,WORLD);
    }
  },{passive:false});
}

/* ===== 街景長按方向鍵綁定 ===== */
function bindDpad(){
  const dp=document.getElementById('mpDpad');
  if(!dp)return;
  const stop=()=>{M.sv.holdDir=''};
  dp.querySelectorAll('[data-svhold]').forEach(btn=>{
    btn.addEventListener('pointerdown',e=>{e.preventDefault();M.sv.holdDir=btn.dataset.svhold});
    btn.addEventListener('pointerup',stop);
    btn.addEventListener('pointercancel',stop);
    btn.addEventListener('pointerleave',stop);
  });
}

/* ===== 頁面掛載 / 卸載 ===== */
function mount(){
  const cv=document.getElementById('mpCanvas');
  if(!cv)return;
  bindCanvas(cv);
  bindDpad();
  if(!M.mounted){
    M.mounted=true;
    M.lastTs=0;
    M.raf=requestAnimationFrame(tick);
  }
}
function unmount(){
  M.mounted=false;M.sv.holdDir='';
  if(M.raf){cancelAnimationFrame(M.raf);M.raf=0}
}

/* ===== 控制列與搜尋事件處理 ===== */
function searchPlayersHtml(q,actName){
  const A=app(), nz=A.nz||(s=>String(s).toLowerCase()), esc=A.esc||(s=>s), wd=getWorldData();
  const nq=nz(q);if(!nq)return'';
  const cm=q.trim().match(/^(\d{1,4})[\s,:：]+(\d{1,4})$/);
  let html='';
  if(cm&&actName==='pickMap'){
    const x=clamp(+cm[1],0,WORLD), y=clamp(+cm[2],0,WORLD);
    html+=`<div class="sg" data-mp="fly" data-x="${x}" data-y="${y}" data-s="16"><b>📍 飛往座標 X:${x} · Y:${y}</b><span class="sub">${zoneOf(x,y).l}</span></div>`;
  }
  const hits=wd.players.filter(p=>nz(p.name).includes(nq)||nz(p.al).includes(nq)||p.fid.includes(nq)).slice(0,7);
  html+=hits.map(p=>`<div class="sg" data-mp="${actName}" data-v="${esc(p.fid)}"><span><b>${esc(p.name)}</b> <span class="bd a">${esc(p.al||'無')}</span></span><span class="sub mono">X:${p.x} Y:${p.y}</span></div>`).join('');
  return html?`<div class="sug">${html}</div>`:'<div class="sub">找不到已定位的玩家</div>';
}

function focusPlayerOnMap(fid){
  const A=app(), wd=getWorldData(), p=wd.byFid[fid];
  M.mode='map';
  if(p){M.selFid=fid;M.alFilter='all';flyMapTo(p.x,p.y,18)}
  else A.toast&&A.toast('此玩家尚未同步到地圖座標');
  A.goTab&&A.goTab('map');
}
function focusPlayerInStreet(fid){
  const A=app(), wd=getWorldData(), p=wd.byFid[fid];
  M.mode='street';M.sv.useSim=false;
  if(p){
    M.sv.x=p.x; M.sv.y=Math.max(2,p.y-7); M.sv.yaw=0; M.sv.selKey='p_'+fid;
  }else A.toast&&A.toast('此玩家尚未同步到地圖座標');
  A.goTab&&A.goTab('map');
}

document.addEventListener('click',e=>{
  const el=e.target.closest('[data-mp]');
  if(!el)return;
  const A=app(), wd=getWorldData(), act=el.dataset.mp, v=el.dataset.v||'';
  switch(act){
    case'mode':M.mode=v;if(v==='board')simLoadFromStorage();A.render&&A.render();break;
    case'refresh':if(A.EX){A.EX.detTried=false;M.cacheSig='';A.loadExtraDetail&&A.loadExtraDetail().then(()=>A.render&&A.render());A.toast&&A.toast('重新載入王國座標…')}break;
    case'proj':M.proj=v;A.render&&A.render();break;
    case'zoom':M.cam.scale=clamp(M.cam.scale*Number(v||1),0.35,42);break;
    case'fly':flyMapTo(Number(el.dataset.x||600),Number(el.dataset.y||600),el.dataset.s?Number(el.dataset.s):15);break;
    case'flyHive':{
      const h=wd.hives.find(x=>x.al===v);
      if(h){flyMapTo(h.x,h.y,10);const sug=document.getElementById('mpSug');if(sug)sug.innerHTML=''}
      break;
    }
    case'goSearch':{
      const q=(M.search||'').trim(), cm=q.match(/^(\d{1,4})[\s,:：]+(\d{1,4})$/);
      if(cm){flyMapTo(+cm[1],+cm[2],16);break}
      const nz=A.nz||(s=>s), nq=nz(q);
      const hit=wd.players.find(p=>nz(p.name).includes(nq)||p.fid===q);
      if(hit){M.selFid=hit.fid;flyMapTo(hit.x,hit.y,18);A.render&&A.render()}
      else{
        const h=wd.hives.find(x=>nz(x.al)===nq);
        if(h)flyMapTo(h.x,h.y,10);
        else A.toast&&A.toast('找不到該玩家或座標（格式如 772,729）');
      }
      break;
    }
    case'pickMap':{
      const p=wd.byFid[v];
      if(p){M.selFid=v;M.search='';flyMapTo(p.x,p.y,18);A.render&&A.render()}
      break;
    }
    case'clearSel':M.selFid='';A.render&&A.render();break;
    case'openCard':A.openSheet&&A.openSheet({kind:'player',fid:v,tab:'gear'});break;
    case'toStreet':focusPlayerInStreet(v);break;
    case'toBoard':{
      const p=wd.byFid[v];M.mode='board';simLoadFromStorage();
      if(p){
        if(!M.board.pieces.some(x=>x.fid===v)){
          M.board.pieces.push({id:'c_'+v,kind:'city',fid:v,name:p.name,al:p.al,power:p.power,furn:p.furn,x:Math.round(p.x),y:Math.round(p.y),ox:Math.round(p.x),oy:Math.round(p.y),size:2});
          simSave();
        }
        M.board.selId='c_'+v;M.board.cam.x=p.x;M.board.cam.y=p.y;M.board.cam.tile=28;
      }
      A.render&&A.render();break;
    }
    case'bTool':M.board.tool=v;A.render&&A.render();break;
    case'bZoom':M.board.cam.tile=clamp(M.board.cam.tile*Number(v||1),8,56);break;
    case'bCenter':{
      if(M.board.pieces.length){
        const xs=M.board.pieces.map(p=>p.x).sort((a,b)=>a-b), ys=M.board.pieces.map(p=>p.y).sort((a,b)=>a-b);
        M.board.cam.x=xs[Math.floor(xs.length/2)];M.board.cam.y=ys[Math.floor(ys.length/2)];
      }
      break;
    }
    case'bLoadReal':simLoadReal(M.board.scope,false);A.render&&A.render();break;
    case'bResetAll':M.board.pieces.forEach(p=>{if(p.kind==='city'){p.x=p.ox;p.y=p.oy}});simSave();A.toast&&A.toast('已將全部玩家棋子復原到真實座標');A.render&&A.render();break;
    case'bCopy':A.copyText&&A.copyText(buildRelocReport());break;
    case'bTogRings':M.board.showRings=!M.board.showRings;A.render&&A.render();break;
    case'bTogTerr':M.board.showTerr=!M.board.showTerr;A.render&&A.render();break;
    case'bDesel':M.board.selId='';A.render&&A.render();break;
    case'bNudge':{
      const sel=M.board.pieces.find(p=>p.id===M.board.selId);if(!sel)break;
      const nx=sel.x+Number(el.dataset.dx||0), ny=sel.y+Number(el.dataset.dy||0);
      if(!boardCollides(nx,ny,sel.size,sel.id)){sel.x=nx;sel.y=ny;simSave();A.render&&A.render()}
      else A.toast&&A.toast('該方向已有其他棋子阻擋');
      break;
    }
    case'bResetOne':{
      const sel=M.board.pieces.find(p=>p.id===M.board.selId);if(!sel)break;
      if(!boardCollides(sel.ox,sel.oy,sel.size,sel.id)){sel.x=sel.ox;sel.y=sel.oy;simSave();A.render&&A.render()}
      else A.toast&&A.toast('原本位置目前被其他棋子佔用');
      break;
    }
    case'bDelOne':M.board.pieces=M.board.pieces.filter(p=>p.id!==M.board.selId);M.board.selId='';simSave();A.render&&A.render();break;
    case'bAddMem':{
      const r=A.D&&A.D.byF&&A.D.byF[v];if(!r)break;
      if(M.board.pieces.some(p=>p.fid===v)){M.board.selId='c_'+v;M.board.addQ='';A.render&&A.render();break}
      // 在目前棋盤中心螺旋找最近空 2x2 格
      const cx=Math.round(M.board.cam.x), cy=Math.round(M.board.cam.y);
      let fx=cx, fy=cy, ok=false;
      for(let rad=0;rad<=18&&!ok;rad++){
        for(let dx=-rad;dx<=rad&&!ok;dx++){
          for(let dy=-rad;dy<=rad&&!ok;dy++){
            if(Math.max(Math.abs(dx),Math.abs(dy))!==rad)continue;
            if(!boardCollides(cx+dx,cy+dy,2,'')){fx=cx+dx;fy=cy+dy;ok=true}
          }
        }
      }
      const ex=wd.byFid[v];
      M.board.pieces.push({id:'c_'+v,kind:'city',fid:v,name:r.name,al:r.al,power:r.power,furn:r.furn,x:fx,y:fy,ox:ex?Math.round(ex.x):fx,oy:ex?Math.round(ex.y):fy,size:2});
      M.board.selId='c_'+v;M.board.addQ='';simSave();A.toast&&A.toast('已將 '+r.name+' 放入棋盤');A.render&&A.render();
      break;
    }
    case'bPreviewSv':{
      M.mode='street';M.sv.useSim=true;
      M.sv.x=M.board.cam.x;M.sv.y=Math.max(2,M.board.cam.y-10);M.sv.yaw=0;M.sv.selKey='';
      A.render&&A.render();break;
    }
    case'svAerial':M.sv.aerial=!M.sv.aerial;A.render&&A.render();break;
    case'svSim':M.sv.useSim=!M.sv.useSim;M.sv.selKey='';A.render&&A.render();break;
    case'svClearSel':M.sv.selKey='';A.render&&A.render();break;
    case'svGo':{
      if(v==='castle'){M.sv.x=CENTER;M.sv.y=CENTER-18;M.sv.yaw=0;M.sv.selKey='castle';A.render&&A.render();break}
      const h=wd.hives.find(x=>x.al===v);
      if(h){M.sv.x=h.x;M.sv.y=Math.max(2,h.y-10);M.sv.yaw=0;M.sv.selKey='';A.render&&A.render()}
      else A.toast&&A.toast('尚未找到 '+v+' 的聚落座標');
      break;
    }
    case'svPick':{focusPlayerInStreet(v);break}
    case'svWalkTo':{
      const tx=Number(el.dataset.x||CENTER), ty=Number(el.dataset.y||CENTER);
      M.sv.x=tx;M.sv.y=Math.max(2,ty-5.5);M.sv.yaw=0;A.render&&A.render();break;
    }
  }
});

document.addEventListener('input',e=>{
  const t=e.target, id=t.id, A=app();
  if(id==='mpSearch'){
    M.search=t.value;
    const box=document.getElementById('mpSug');
    if(box)box.innerHTML=searchPlayersHtml(t.value,'pickMap');
  }else if(id==='mpSvSearch'){
    const box=document.getElementById('mpSvSug');
    if(box)box.innerHTML=searchPlayersHtml(t.value,'svPick');
  }else if(id==='mpBAdd'){
    M.board.addQ=t.value;
    const box=document.getElementById('mpBAddSug');
    if(!box)return;
    const nz=A.nz||(s=>s), esc=A.esc||(s=>s), q=nz(t.value);
    if(!q){box.innerHTML='';return}
    const rows=((A.D&&A.D.rows)||[]).filter(r=>nz(r.name).includes(q)||nz(r.al).includes(q)).slice(0,7);
    box.innerHTML=rows.length?`<div class="sug">${rows.map(r=>`<div class="sg" data-mp="bAddMem" data-v="${esc(r.fid)}"><span><b>${esc(r.name)}</b> <span class="bd a">${esc(r.al||'無')}</span></span><span class="sub">＋ 放入棋盤</span></div>`).join('')}</div>`:'<div class="sub">找不到符合的盟友</div>';
  }
});

document.addEventListener('change',e=>{
  const t=e.target, A=app();
  if(t.id==='mpAlSel'){M.alFilter=t.value;A.render&&A.render()}
  else if(t.id==='mpShSel'){M.shFilter=t.value;A.render&&A.render()}
  else if(t.id==='mpBScope'){simLoadReal(t.value,false);A.render&&A.render()}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target&&e.target.id==='mpSearch'){
    const btn=document.querySelector('[data-mp="goSearch"]');if(btn)btn.click();
  }
});

window.K2611_MAP={
  renderHtml,mount,unmount,focusPlayerOnMap,focusPlayerInStreet
};
})();
