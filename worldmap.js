/* worldmap.js — 2611 王國戰情室 v8.3.0：王國大地圖 / 棋盤排位＋熊陣圖層＋測距 / Google Earth 3D 自由斜視 */
(function(){
'use strict';

const WORLD=1200, CENTER=600, R_CORE=48, R_FERTILE=150, R_TUNDRA=300;
const SIM_KEY='k2611_map_sim_v2';
const TURRETS=[
  {id:'tur_n',kind:'turret',name:'北砲台',x:585,y:615,size:2,color:'#ef4444'},
  {id:'tur_e',kind:'turret',name:'東砲台',x:615,y:615,size:2,color:'#ef4444'},
  {id:'tur_s',kind:'turret',name:'南砲台',x:615,y:585,size:2,color:'#ef4444'},
  {id:'tur_w',kind:'turret',name:'西砲台',x:585,y:585,size:2,color:'#ef4444'}
];
const FAC_COLORS={
  castle:'#f59e0b',turret:'#ef4444',sh:'#b91c1c',ft:'#7c3aed',
  fc_b:'#c2410c',fc_d:'#ca8a04',fc_r:'#0369a1',fc_a:'#be185d',
  fc_g:'#15803d',fc_p:'#0f766e',fc_t:'#475569',fc_e:'#9a3412'
};
// 官方 1200x1200 王國固定設施座標（4 座要塞、12 座堡壘、74 座聯盟工程站）
const RAW_FACS=[
  ['sh','要塞 1',597,800,6],['sh','要塞 2',400,597,6],['sh','要塞 3',597,400,6],['sh','要塞 4',800,597,6],
  ['ft','堡壘 1',237,828,6],['ft','堡壘 2',237,606,6],['ft','堡壘 3',237,348,6],['ft','堡壘 4',366,237,6],
  ['ft','堡壘 5',588,237,6],['ft','堡壘 6',846,237,6],['ft','堡壘 7',957,348,6],['ft','堡壘 8',957,606,6],
  ['ft','堡壘 9',957,828,6],['ft','堡壘 10',846,957,6],['ft','堡壘 11',606,957,6],['ft','堡壘 12',366,957,6],
  ['fc_b','建造站 Lv.1',1068,138,3],['fc_b','建造站 Lv.1',537,138,3],['fc_b','建造站 Lv.1',138,138,3],['fc_b','建造站 Lv.1',138,666,3],
  ['fc_b','建造站 Lv.1',138,1038,3],['fc_b','建造站 Lv.1',666,1068,3],['fc_b','建造站 Lv.1',1068,567,3],['fc_b','建造站 Lv.1',1068,1068,3],
  ['fc_b','建造站 Lv.3',486,327,3],['fc_b','建造站 Lv.3',768,867,3],['fc_b','建造站 Lv.3',867,567,3],['fc_b','建造站 Lv.3',327,666,3],
  ['fc_d','防禦站 Lv.2',666,138,3],['fc_d','防禦站 Lv.2',438,267,3],['fc_d','防禦站 Lv.2',138,537,3],['fc_d','防禦站 Lv.2',237,768,3],
  ['fc_d','防禦站 Lv.2',537,1038,3],['fc_d','防禦站 Lv.2',738,957,3],['fc_d','防禦站 Lv.2',1068,666,3],['fc_d','防禦站 Lv.2',957,438,3],
  ['fc_d','防禦站 Lv.4',816,717,3],['fc_d','防禦站 Lv.4',387,717,3],['fc_d','防禦站 Lv.4',588,327,3],
  ['fc_r','研究站 Lv.1',957,237,3],['fc_r','研究站 Lv.1',666,267,3],['fc_r','研究站 Lv.1',237,237,3],['fc_r','研究站 Lv.1',267,537,3],
  ['fc_r','研究站 Lv.1',237,957,3],['fc_r','研究站 Lv.1',537,936,3],['fc_r','研究站 Lv.1',936,537,3],['fc_r','研究站 Lv.1',957,957,3],
  ['fc_r','研究站 Lv.3',867,327,3],['fc_r','研究站 Lv.3',327,327,3],['fc_r','研究站 Lv.3',327,867,3],['fc_r','研究站 Lv.3',867,867,3],
  ['fc_a','攻擊站 Lv.2',867,138,3],['fc_a','攻擊站 Lv.2',366,138,3],['fc_a','攻擊站 Lv.2',138,438,3],['fc_a','攻擊站 Lv.2',138,867,3],
  ['fc_a','攻擊站 Lv.2',438,1068,3],['fc_a','攻擊站 Lv.2',1068,327,3],['fc_a','攻擊站 Lv.2',1068,867,3],['fc_a','攻擊站 Lv.2',867,1068,3],
  ['fc_a','攻擊站 Lv.4',816,486,3],['fc_a','攻擊站 Lv.4',387,486,3],['fc_a','攻擊站 Lv.4',588,867,3],
  ['fc_g','採集站 Lv.1',957,138,3],['fc_g','採集站 Lv.1',537,87,3],['fc_g','採集站 Lv.1',138,237,3],['fc_g','採集站 Lv.1',87,666,3],
  ['fc_g','採集站 Lv.1',267,1068,3],['fc_g','採集站 Lv.1',636,1137,3],['fc_g','採集站 Lv.1',1137,567,3],['fc_g','採集站 Lv.1',1068,936,3],
  ['fc_p','生產站 Lv.1',1068,237,3],['fc_p','生產站 Lv.1',768,138,3],['fc_p','生產站 Lv.1',237,138,3],['fc_p','生產站 Lv.1',138,327,3],
  ['fc_p','生產站 Lv.1',138,957,3],['fc_p','生產站 Lv.1',327,1038,3],['fc_p','生產站 Lv.1',1068,747,3],['fc_p','生產站 Lv.1',957,1068,3],
  ['fc_t','訓練站 Lv.2',237,486,3],['fc_t','訓練站 Lv.2',138,747,3],['fc_t','訓練站 Lv.2',486,957,3],['fc_t','訓練站 Lv.2',768,1038,3],
  ['fc_t','訓練站 Lv.2',957,747,3],['fc_t','訓練站 Lv.2',1068,486,3],['fc_t','訓練站 Lv.2',486,138,3],['fc_t','訓練站 Lv.2',768,237,3],
  ['fc_e','遠征站 Lv.3',768,327,3],['fc_e','遠征站 Lv.3',327,567,3],['fc_e','遠征站 Lv.3',486,867,3],['fc_e','遠征站 Lv.3',867,666,3]
];
const WORLD_FACS=[
  {id:'castle',kind:'castle',name:'🏰 太陽城',x:597,y:597,cx:600,cy:600,size:6,color:FAC_COLORS.castle},
  ...TURRETS.map(t=>({...t,cx:t.x,cy:t.y})),
  ...RAW_FACS.map((a,i)=>({id:'wf_'+i,kind:a[0],name:a[1],x:a[2],y:a[3],cx:a[2]+a[4]/2,cy:a[3]+a[4]/2,size:a[4],color:FAC_COLORS[a[0]]||'#64748b'}))
];

const AL_COLORS=['#2563eb','#10b981','#f97316','#8b5cf6','#ec4899','#06b6d4','#eab308','#ef4444','#14b8a6','#a855f7','#84cc16','#f43f5e','#0ea5e9','#d97706'];
const BLD_META={
  trap1:{label:'熊陷阱一',short:'🐻 熊一',size:3,color:'#d97706',bg:'rgba(245,158,11,.3)'},
  trap2:{label:'熊陷阱二',short:'🐻 熊二',size:3,color:'#b45309',bg:'rgba(217,119,6,.3)'},
  hq:{label:'荒原總部',short:'🏛️ 荒總',size:3,color:'#7c3aed',bg:'rgba(139,92,246,.3)'},
  hq2:{label:'雪原總部',short:'❄️ 雪總',size:3,color:'#0284c7',bg:'rgba(2,132,199,.3)'},
  banner:{label:'聯盟旗幟',short:'🚩 旗',size:1,color:'#0ea5e9',bg:'rgba(14,165,233,.32)'},
  obs:{label:'地形障礙',short:'⛰️',size:1,color:'#64748b',bg:'rgba(100,116,139,.38)'}
};

/* ===== 4 種社群熱門熊陷阱建議佈置圖層產生器（零碰撞驗證） ===== */
function buildBearTemplate(kind){
  if(!kind||kind==='none')return null;
  const traps=[{dx:0,dy:0,label:'熊一'}];
  const banners=[];
  const slots=[];
  const occ=new Set();
  const mark=(x,y,s)=>{for(let i=0;i<s;i++)for(let j=0;j<s;j++)occ.add((x+i)+','+(y+j))};
  const free=(x,y,s)=>{for(let i=0;i<s;i++)for(let j=0;j<s;j++)if(occ.has((x+i)+','+(y+j)))return false;return true};
  mark(0,0,3);

  if(kind==='clean'){
    // 經典整齊方陣：熊一 [0..2]x[0..2] + 右上 L 型旗幟對齊槽 [3,0..3] & [0..2,3] -> 全部 2x2 城池落在純偶數格，王城戰回城絕對不亂
    [[3,1],[1,3],[3,3]].forEach(([bx,by])=>{banners.push({dx:bx,dy:by});mark(bx,by,1)});
    mark(0,0,4);
    for(let x=-6;x<=8;x+=2){
      for(let y=-6;y<=8;y+=2){
        if(free(x,y,2)){
          const d=Math.hypot(x+1-1.5,y+1-1.5);
          if(d<=8.6){slots.push({dx:x,dy:y,d});mark(x,y,2)}
        }
      }
    }
  }else if(kind==='pinwheel'){
    // 極致緊湊風車陣：第一圈 8 座 2x2 城池順時針無縫緊貼 3x3 熊陷阱（每座都 2.55 格！），外圈緊密包覆
    const ring1=[[-1,-2],[1,-2],[3,-1],[3,1],[2,3],[0,3],[-2,2],[-2,0]];
    const ring2=[
      [-3,-2],[-3,-4],[-1,-4],[1,-4],[3,-3],[5,-3],[5,-1],[5,1],[4,3],[4,5],
      [2,5],[0,5],[-2,4],[-4,4],[-4,2],[-4,0],
      [-5,-2],[-3,-6],[-1,-6],[1,-6],[3,-5],[5,-5],[7,-1],[7,1],[6,3],[2,7],[0,7],[-4,6],[-6,2],[-6,0]
    ];
    ring1.concat(ring2).forEach(([x,y])=>{
      if(free(x,y,2)){
        const d=Math.hypot(x+1-1.5,y+1-1.5);
        slots.push({dx:x,dy:y,d});mark(x,y,2);
      }
    });
  }else if(kind==='dual'){
    // 雙熊並排黃金陣：熊一 (0,0) 與 熊二 (7,0) 中間夾 2 排 2x2 黃金雙打車頭位（x=3 & x=5，零浪費格！）
    traps.push({dx:7,dy:0,label:'熊二'});
    mark(7,0,3);
    banners.push({dx:3,dy:3},{dx:6,dy:3});
    banners.forEach(bn=>mark(bn.dx,bn.dy,1));
    const cand=[];
    // 中間黃金雙打位優先
    for(let x=3;x<=5;x+=2)for(let y=-4;y<=4;y+=2)cand.push([x,y]);
    // 兩側與上下對齊外圈
    for(let x=-4;x<=12;x+=2)for(let y=-4;y<=6;y+=2)cand.push([x,y]);
    for(let x=-4;x<=12;x+=2)for(let y=-6;y<=8;y+=2)cand.push([x,y]);
    // 先把緊貼熊一/熊二上下對齊的 y=3,5 補齊
    const extra=[];
    [-2,0,7,9,10].forEach(x=>{[3,5,-2,-4].forEach(y=>extra.push([x,y]))});
    extra.concat(cand).forEach(([x,y])=>{
      if(free(x,y,2)){
        const d1=Math.hypot(x+1-1.5,y+1-1.5), d2=Math.hypot(x+1-8.5,y+1-1.5);
        const d=Math.min(d1,d2);
        if(d<=7.8){slots.push({dx:x,dy:y,d,dual:Math.max(d1,d2)<=5.2});mark(x,y,2)}
      }
    });
  }else if(kind==='banner7'){
    // 7x7 標準領地旗幟網格：示範每 7 格一旗無重疊最大覆蓋 + 內部整齊城池位
    [[-4,1],[3,1],[10,1],[-4,8],[3,8],[10,8],[-4,-6],[3,-6],[10,-6]].forEach(([bx,by])=>{
      if(free(bx,by,1)){banners.push({dx:bx,dy:by});mark(bx,by,1)}
    });
    mark(0,0,4);
    for(let x=-6;x<=8;x+=2){
      for(let y=-6;y<=8;y+=2){
        if(free(x,y,2)){
          const d=Math.hypot(x+1-1.5,y+1-1.5);
          if(d<=8.5){slots.push({dx:x,dy:y,d});mark(x,y,2)}
        }
      }
    }
  }
  slots.sort((a,b)=>a.d-b.d||a.dx-b.dx||a.dy-b.dy);
  slots.forEach((s,i)=>{s.rank=i+1;s.ring=s.d<=3.9?1:s.d<=6.4?2:3});
  return{kind,traps,banners,slots};
}
const TPL_CACHE={};
function getTemplate(kind){
  if(!kind||kind==='none')return null;
  if(!TPL_CACHE[kind])TPL_CACHE[kind]=buildBearTemplate(kind);
  return TPL_CACHE[kind];
}

const M={
  mode:'map', // 'map' | 'board' | 'street'
  // Mode 1: Google Maps style world map
  proj:'iso', // 'iso' | 'flat'
  cam:{x:770,y:728,scale:9},
  alFilter:'all',
  shFilter:'all',
  showFacs:true,
  showMarks:true,
  selFid:'',
  selFacId:'',
  search:'',
  flyAnim:null,
  initCentered:false,
  // Shared Ruler (Mode 1 & Mode 2)
  measure:{on:false,pts:[],qa:'',qb:''}, // pts: [{x,y,label}]
  // Mode 2: Chessboard simulator
  board:{
    cam:{x:770,y:728,tile:26},
    tool:'move', // 'move' | 'trap1' | 'trap2' | 'hq' | 'hq2' | 'banner' | 'obs' | 'measure'
    scope:'jQt',
    placeAl:'jQt',
    pieces:[], // {id,kind,fid?,name,al?,power?,furn?,x,y,ox,oy,size}
    selId:'',
    drag:null,
    showRings:true,
    showTerr:true,
    tpl:'none', // 'none' | 'clean' | 'pinwheel' | 'dual' | 'banner7'
    tplOx:768, tplOy:731,
    tplSnap:true,
    addQ:'',
    loaded:false
  },
  // Mode 3: Google Earth 3D Orbit Camera
  sv:{
    tx:771, ty:729,     // 地面焦點 (target)
    yaw:0,              // 水平方位角 (rad, 0 = 看向北方 +Y)
    pitch:36*Math.PI/180, // 上下斜視俯仰角 (12° 貼地街景 ~ 85° 衛星俯瞰)
    dist:32,            // 焦點距離 (8 格貼近 ~ 260 格衛星高空)
    gesture:'orbit',    // 'orbit' (左右旋轉+上下調仰角) | 'pan' (單指地面滑行)
    useSim:false,
    selKey:'',
    holdDir:'',
    snow:[],
    hitBoxes:[]
  },
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
function fmtSec(s){return s>=60?`${Math.floor(s/60)}分${s%60}秒`:`${s}秒`}
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
    hives.push({al,count:list.length,clusterCount:best.length,x:xs[Math.floor(xs.length/2)],y:ys[Math.floor(ys.length/2)]});
  });
  hives.sort((a,b)=>(b.al==='jQt')-(a.al==='jQt')||(b.al==='aQt')-(a.al==='aQt')||b.count-a.count);
  M.cacheSig=sig;
  M.cacheData={players,byAl,byFid,hives};
  if(!M.initCentered&&hives.length){
    const h=hives.find(x=>x.al==='jQt')||hives[0];
    if(h){
      M.cam.x=h.x; M.cam.y=h.y; M.cam.scale=10;
      M.board.cam.x=h.x; M.board.cam.y=h.y;
      M.board.tplOx=Math.round(h.x-2); M.board.tplOy=Math.round(h.y-1);
      M.sv.tx=h.x; M.sv.ty=h.y; M.sv.yaw=0; M.sv.pitch=36*Math.PI/180; M.sv.dist=30;
      M.initCentered=true;
    }
  }
  return M.cacheData;
}

/* ===== 棋盤模擬與各聯盟地標存檔 ===== */
function simSave(){
  try{
    localStorage.setItem(SIM_KEY,JSON.stringify({
      scope:M.board.scope,placeAl:M.board.placeAl,pieces:M.board.pieces,
      cam:M.board.cam,tpl:M.board.tpl,tplOx:M.board.tplOx,tplOy:M.board.tplOy,tplSnap:M.board.tplSnap
    }));
  }catch(e){}
}
function simLoadFromStorage(){
  if(M.board.loaded)return;
  M.board.loaded=true;
  try{
    const raw=localStorage.getItem(SIM_KEY)||localStorage.getItem('k2611_map_sim_v1');
    if(raw){
      const j=JSON.parse(raw);
      if(j&&Array.isArray(j.pieces)&&j.pieces.length){
        M.board.pieces=j.pieces;
        if(j.scope)M.board.scope=j.scope;
        if(j.placeAl)M.board.placeAl=j.placeAl;
        if(j.cam)M.board.cam=Object.assign({x:770,y:728,tile:26},j.cam);
        if(j.tpl)M.board.tpl=j.tpl;
        if(j.tplOx!=null)M.board.tplOx=j.tplOx;
        if(j.tplOy!=null)M.board.tplOy=j.tplOy;
        if(j.tplSnap!=null)M.board.tplSnap=!!j.tplSnap;
        return;
      }
    }
  }catch(e){}
  simLoadReal(M.board.scope,true);
}
function simLoadReal(scope,quiet){
  const wd=getWorldData(), A=app();
  M.board.scope=scope||'jQt';
  if(scope&&scope!=='ours'&&scope!=='all'&&scope!=='view')M.board.placeAl=scope;
  let list=[];
  if(scope==='ours')list=wd.players.filter(p=>p.al==='jQt'||p.al==='aQt');
  else if(scope==='all')list=wd.players.slice();
  else if(scope==='view')list=wd.players.filter(p=>Math.abs(p.x-M.cam.x)<=35&&Math.abs(p.y-M.cam.y)<=35);
  else list=wd.players.filter(p=>p.al===scope);
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
function getAllianceLandmarks(){
  return M.board.pieces.filter(p=>p.kind!=='city'&&p.kind!=='obs');
}
function boardCollides(x,y,size,ignoreId){
  if(x<0||y<0||x+size>WORLD||y+size>WORLD)return true;
  for(const p of M.board.pieces){
    if(p.id===ignoreId)continue;
    if(x<p.x+p.size&&x+size>p.x&&y<p.y+p.size&&y+size>p.y)return true;
  }
  return false;
}
function detectBearSpot(){
  // 在目前棋盤城池中心附近搜尋被最多城池緊鄰包圍的 3x3 空洞
  const cities=M.board.pieces.filter(p=>p.kind==='city');
  if(!cities.length)return null;
  const cx=Math.round(M.board.cam.x), cy=Math.round(M.board.cam.y);
  let best=null, bestScore=-1;
  for(let dx=-14;dx<=14;dx++){
    for(let dy=-14;dy<=14;dy++){
      const tx=cx+dx, ty=cy+dy;
      if(boardCollides(tx,ty,3,''))continue;
      let sc=0;
      for(const c of cities){
        const d=Math.hypot((c.x+1)-(tx+1.5),(c.y+1)-(ty+1.5));
        if(d<=10)sc+=1/(d*d+0.5);
      }
      if(sc>bestScore){bestScore=sc;best={x:tx,y:ty,score:sc}}
    }
  }
  return best;
}
function alignTemplateToTrap(){
  const tr=M.board.pieces.find(p=>p.kind==='trap1')||M.board.pieces.find(p=>p.kind==='trap2');
  if(tr){M.board.tplOx=tr.x;M.board.tplOy=tr.y;return true}
  M.board.tplOx=Math.round(M.board.cam.x-1);M.board.tplOy=Math.round(M.board.cam.y-1);
  return false;
}
function snapToTemplate(tx,ty,size){
  if(!M.board.tplSnap||size!==2||M.board.tpl==='none')return{x:tx,y:ty};
  const tpl=getTemplate(M.board.tpl);if(!tpl)return{x:tx,y:ty};
  let best=null, bd=1.35;
  for(const s of tpl.slots){
    const sx=M.board.tplOx+s.dx, sy=M.board.tplOy+s.dy;
    const d=Math.hypot(tx-sx,ty-sy);
    if(d<bd){bd=d;best={x:sx,y:sy}}
  }
  return best||{x:tx,y:ty};
}
function autoFillTemplateByPower(){
  const A=app(), tpl=getTemplate(M.board.tpl);
  if(!tpl){A.toast&&A.toast('請先選一個熊陷阱建議佈置圖層');return}
  const cities=M.board.pieces.filter(p=>p.kind==='city').sort((a,b)=>(b.power||0)-(a.power||0));
  if(!cities.length){A.toast&&A.toast('棋盤上還沒有城池');return}
  // 先將全部城池暫移開避免互相卡位，再依戰力高→低填入 #1, #2, ...
  const blds=M.board.pieces.filter(p=>p.kind!=='city');
  const placed=[];
  const collidesTmp=(x,y,sz)=>{
    if(x<0||y<0||x+sz>WORLD||y+sz>WORLD)return true;
    for(const p of blds)if(x<p.x+p.size&&x+sz>p.x&&y<p.y+p.size&&y+sz>p.y)return true;
    for(const p of placed)if(x<p.x+p.size&&x+sz>p.x&&y<p.y+p.size&&y+sz>p.y)return true;
    return false;
  };
  let filled=0;
  for(const c of cities){
    let ok=false;
    for(const s of tpl.slots){
      const sx=M.board.tplOx+s.dx, sy=M.board.tplOy+s.dy;
      if(!collidesTmp(sx,sy,2)){c.x=sx;c.y=sy;placed.push(c);filled++;ok=true;break}
    }
    if(!ok){placed.push(c)}
  }
  simSave();
  A.toast&&A.toast(`已依戰力自動排入 ${filled} 座城池到建議格位（可隨時按「歸位」復原）`);
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
  const marks=getAllianceLandmarks();
  const lines=['📍【2611 聯盟陣型與遷城座標通知】'];
  if(marks.length){
    lines.push('');
    marks.forEach(t=>lines.push(`${t.al?'['+t.al+'] ':''}${BLD_META[t.kind].short}：X:${t.x} Y:${t.y}（${t.size}×${t.size}）`));
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
    const extra=nt?`｜距${nt.trap.kind==='trap1'?'熊一':'熊二'} ${nt.dist.toFixed(1)} 格（約 ${fmtSec(marchSec(nt.dist))}）`:'';
    lines.push(`• ${p.name}：(${p.ox}, ${p.oy}) → (${p.x}, ${p.y})${extra}`);
  });
  return lines.join('\n');
}

/* ===== 測距尺共用邏輯（大地圖＋棋盤） ===== */
function getMeasureTargets(wd){
  const out=[];
  // 1. 聯盟自訂地標
  getAllianceLandmarks().forEach(p=>{
    out.push({key:'lm_'+p.id,label:`${p.al?'['+p.al+'] ':''}${BLD_META[p.kind].short}`,x:p.x+p.size/2,y:p.y+p.size/2});
  });
  // 2. 主力盟聚落
  wd.hives.slice(0,6).forEach(h=>{
    out.push({key:'hv_'+h.al,label:`🚩 ${h.al} 聚落`,x:h.x,y:h.y});
  });
  // 3. 太陽城 + 砲台 + 要塞 + 堡壘 + 距離 jQt 最近的 8 座工程站
  const refH=wd.hives.find(x=>x.al==='jQt')||{x:CENTER,y:CENTER};
  WORLD_FACS.filter(f=>f.kind==='castle'||f.kind==='sh'||f.kind==='ft').forEach(f=>{
    out.push({key:f.id,label:f.name,x:f.cx,y:f.cy});
  });
  WORLD_FACS.filter(f=>f.kind.startsWith('fc_'))
    .map(f=>({f,d:Math.hypot(f.cx-refH.x,f.cy-refH.y)}))
    .sort((a,b)=>a.d-b.d).slice(0,10)
    .forEach(({f})=>out.push({key:f.id,label:`🏭 ${f.name} (${f.x},${f.y})`,x:f.cx,y:f.cy}));
  return out;
}
function snapMeasurePoint(wx,wy,w,h,mode){
  const wd=getWorldData();
  const toScr=(x,y)=>mode==='board'?boardWorldToScreen(x,y,w,h):mapWorldToScreen(x,y,w,h);
  const sp=toScr(wx,wy);
  let best=null, bd=24;
  // 吸附聯盟地標
  getAllianceLandmarks().forEach(p=>{
    const cx=p.x+p.size/2, cy=p.y+p.size/2, pt=toScr(cx,cy);
    const d=Math.hypot(pt.x-sp.x,pt.y-sp.y);
    if(d<bd){bd=d;best={x:cx,y:cy,label:`${p.al?'['+p.al+'] ':''}${BLD_META[p.kind].short}`}}
  });
  // 吸附官方設施
  if(M.showFacs){
    WORLD_FACS.forEach(f=>{
      const pt=toScr(f.cx,f.cy), d=Math.hypot(pt.x-sp.x,pt.y-sp.y);
      if(d<bd){bd=d;best={x:f.cx,y:f.cy,label:f.name}}
    });
  }
  // 吸附玩家城池
  const cities=mode==='board'?M.board.pieces.filter(p=>p.kind==='city'):wd.players;
  for(const p of cities){
    const cx=mode==='board'?p.x+1:p.x, cy=mode==='board'?p.y+1:p.y;
    const pt=toScr(cx,cy), d=Math.hypot(pt.x-sp.x,pt.y-sp.y);
    if(d<bd){bd=d;best={x:cx,y:cy,label:p.name}}
  }
  if(best)return best;
  const rx=clamp(Math.round(wx),0,WORLD), ry=clamp(Math.round(wy),0,WORLD);
  return{x:rx,y:ry,label:`(${rx}, ${ry})`};
}
function drawMeasureOverlay(ctx,w,h,toScr){
  const pts=M.measure.pts;
  if(!pts.length)return;
  const dark=isDark();
  ctx.save();
  if(pts.length>=2){
    ctx.strokeStyle='#f59e0b';
    ctx.lineWidth=3;
    ctx.setLineDash([8,5]);
    ctx.beginPath();
    pts.forEach((p,i)=>{
      const sp=toScr(p.x,p.y);
      if(i===0)ctx.moveTo(sp.x,sp.y);else ctx.lineTo(sp.x,sp.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    // 每段中點距離氣泡
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1], b=pts[i];
      const d=Math.hypot(b.x-a.x,b.y-a.y);
      const sa=toScr(a.x,a.y), sb=toScr(b.x,b.y);
      const mx=(sa.x+sb.x)/2, my=(sa.y+sb.y)/2;
      const txt=`${d.toFixed(1)}格 · 約${fmtSec(marchSec(d))}`;
      ctx.font='800 11.5px -apple-system,sans-serif';
      const tw=ctx.measureText(txt).width+14;
      ctx.fillStyle='#f59e0b';
      ctx.beginPath();
      if(ctx.roundRect)ctx.roundRect(mx-tw/2,my-11,tw,22,11);else ctx.rect(mx-tw/2,my-11,tw,22);
      ctx.fill();
      ctx.fillStyle='#0f172a';ctx.textAlign='center';ctx.fillText(txt,mx,my+4);
    }
  }
  pts.forEach((p,i)=>{
    const sp=toScr(p.x,p.y);
    ctx.fillStyle='#facc15';ctx.strokeStyle='#0f172a';ctx.lineWidth=2.2;
    ctx.beginPath();ctx.arc(sp.x,sp.y,6.5,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.font='800 11px -apple-system,sans-serif';
    const tag=`${String.fromCharCode(65+i)} ${p.label}`;
    const tw=ctx.measureText(tag).width+10;
    ctx.fillStyle=dark?'rgba(12,24,42,.88)':'rgba(255,255,255,.94)';
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(sp.x-tw/2,sp.y-28,tw,18,6);else ctx.rect(sp.x-tw/2,sp.y-28,tw,18);
    ctx.fill();
    ctx.fillStyle=dark?'#fde68a':'#92400e';ctx.textAlign='center';ctx.fillText(tag,sp.x,sp.y-15);
  });
  ctx.restore();
}

/* ===== 座標投影工具 ===== */
function mapWorldToScreen(wx,wy,w,h){
  const s=M.cam.scale, dx=wx-M.cam.x, dy=wy-M.cam.y;
  if(M.proj==='flat')return{x:w/2+dx*s,y:h/2-dy*s};
  const hs=s*0.5;
  return{x:w/2+(dx-dy)*hs,y:h/2-(dx+dy)*hs};
}
function mapScreenToWorld(sx,sy,w,h){
  const s=M.cam.scale;
  if(M.proj==='flat')return{x:M.cam.x+(sx-w/2)/s,y:M.cam.y-(sy-h/2)/s};
  const hs=s*0.5, u=(sx-w/2)/hs, v=-(sy-h/2)/hs;
  return{x:(u+v)/2+M.cam.x,y:(v-u)/2+M.cam.y};
}
function boardWorldToScreen(wx,wy,w,h){
  const t=M.board.cam.tile;
  return{x:w/2+(wx-M.board.cam.x)*t,y:h/2-(wy-M.board.cam.y)*t};
}
function boardScreenToWorld(sx,sy,w,h){
  const t=M.board.cam.tile;
  return{x:M.board.cam.x+(sx-w/2)/t,y:M.board.cam.y-(sy-h/2)/t};
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
      <button style="padding:0 4px;min-height:38px;font-size:12.5px" class="${M.mode==='street'?'on':''}" data-mp="mode" data-v="street">🌍 3D 地球</button>
    </div>`;

  const topPills=M.mode==='map'?renderMapTopPills(wd):M.mode==='board'?renderBoardTopPills():renderStreetTopPills();
  const belowControls=M.mode==='map'?renderMapControls(wd):M.mode==='board'?renderBoardControls(wd):renderStreetControls(wd);

  const canvasBlock=`
    <div class="mp-wrap" id="mpWrap">
      <canvas id="mpCanvas"></canvas>
      ${renderHudOverlay(wd)}
    </div>`;

  const measureCard=(M.mode==='map'||M.mode==='board')&&(M.measure.on||M.measure.pts.length)?renderMeasureCard(wd):'';
  const bottomCard=M.mode==='map'?renderMapPlaceCard(wd):M.mode==='board'?renderBoardInspector(wd):renderStreetFooter(wd);

  return`
    <div class="card tight" style="display:flex;flex-direction:column;gap:8px;padding:10px 12px">
      <div class="row sp" style="flex-wrap:nowrap">
        <div style="min-width:0"><b style="font-size:15px">🗺️ 2611 王國地圖</b> <span class="sub">· ${cnt} 城池 · 95 官方設施</span></div>
        <button class="btn sm" style="min-height:32px;padding:0 10px" data-mp="refresh">↻ 重整</button>
      </div>
      ${modeSeg}
      ${topPills}
    </div>
    ${canvasBlock}
    ${measureCard}
    ${bottomCard}
    <div class="card tight" style="display:flex;flex-direction:column;gap:8px">${belowControls}</div>`;
}

function renderMapTopPills(wd){
  const A=app(), esc=A.esc||(s=>s);
  const topHives=wd.hives.slice(0,6);
  return`<div class="mp-pills">
    <button class="btn sm ${M.measure.on?'pri':'soft'}" data-mp="togMeasure">📏 ${M.measure.on?'測距中':'測距'}</button>
    <button class="btn sm soft" data-mp="fly" data-x="600" data-y="600" data-s="4.5">🏰 太陽城</button>
    ${topHives.map(h=>`<button class="btn sm ${M.alFilter===h.al?'pri':''}" data-mp="flyHive" data-v="${esc(h.al)}"><span class="mp-dot" style="background:${alColor(h.al)}"></span>${esc(h.al)} (${h.count})</button>`).join('')}
  </div>`;
}

function renderBoardTopPills(){
  const b=M.board;
  const tools=[
    ['move','👆 移動'],['measure','📏 測距'],['trap1','🐻 熊一'],['trap2','🐻 熊二'],
    ['hq','🏛️ 荒總'],['hq2','❄️ 雪總'],['banner','🚩 旗幟'],['obs','⛰️ 障礙']
  ];
  return`<div class="mp-pills">
    ${tools.map(([k,l])=>`<button class="btn sm ${(k==='measure'?M.measure.on:(!M.measure.on&&b.tool===k))?'pri':''}" data-mp="bTool" data-v="${k}">${l}</button>`).join('')}
  </div>`;
}

function renderStreetTopPills(){
  const sv=M.sv;
  return`<div class="mp-pills">
    <button class="btn sm ${sv.gesture==='orbit'?'pri':''}" data-mp="svGest" data-v="orbit">🔄 旋轉／調斜視</button>
    <button class="btn sm ${sv.gesture==='pan'?'pri':''}" data-mp="svGest" data-v="pan">🖐️ 平移滑行</button>
    <button class="btn sm soft" data-mp="svGo" data-v="jQt">🚩 jQt</button>
    <button class="btn sm soft" data-mp="svGo" data-v="aQt">🚩 aQt</button>
    <button class="btn sm soft" data-mp="svGo" data-v="castle">🏰 太陽城</button>
    <button class="btn sm ${sv.useSim?'pri':''}" data-mp="svSim">${sv.useSim?'♟️ 模擬陣型':'🌍 真實座標'}</button>
  </div>`;
}

function renderMapControls(wd){
  const A=app(), esc=A.esc||(s=>s);
  return`
    <div class="row" style="gap:6px">
      <input id="mpSearch" style="flex:1 1 180px" placeholder="搜尋玩家、聯盟、設施，或輸入座標 772,729" value="${esc(M.search)}">
      <button class="btn sm pri" data-mp="goSearch">飛往</button>
    </div>
    <div id="mpSug"></div>
    <div class="mp-pills">
      <button class="btn sm ${M.showFacs?'pri':''}" data-mp="togFacs">🏛️ 官方設施</button>
      <button class="btn sm ${M.showMarks?'pri':''}" data-mp="togMarks">🚩 聯盟地標 (${getAllianceLandmarks().length})</button>
      <button class="btn sm ${M.proj==='iso'?'pri':''}" data-mp="proj" data-v="iso">💎 等距視角</button>
      <button class="btn sm ${M.proj==='flat'?'pri':''}" data-mp="proj" data-v="flat">🧭 正北平面</button>
      <select id="mpAlSel" style="flex:none;min-height:36px;padding:4px 10px;font-size:13px;border-radius:12px">
        <option value="all" ${M.alFilter==='all'?'selected':''}>全部聯盟</option>
        <option value="ours" ${M.alFilter==='ours'?'selected':''}>僅 jQt + aQt</option>
        ${wd.hives.map(h=>`<option value="${esc(h.al)}" ${M.alFilter===h.al?'selected':''}>${esc(h.al)} (${h.count})</option>`).join('')}
      </select>
      <select id="mpShSel" style="flex:none;min-height:36px;padding:4px 10px;font-size:13px;border-radius:12px">
        <option value="all" ${M.shFilter==='all'?'selected':''}>開罩：全部</option>
        <option value="shield" ${M.shFilter==='shield'?'selected':''}>🛡️ 僅開罩</option>
        <option value="noshield" ${M.shFilter==='noshield'?'selected':''}>⚔️ 僅未開罩</option>
      </select>
    </div>`;
}

function renderBoardControls(wd){
  const A=app(), esc=A.esc||(s=>s), b=M.board;
  const movedN=b.pieces.filter(p=>p.kind==='city'&&(p.x!==p.ox||p.y!==p.oy)).length;
  const tpls=[
    ['none','📐 建議熊陣圖層：關'],
    ['clean','📐 經典整齊方陣（最推・好歸位）'],
    ['pinwheel','🌀 極致風車陣（第一圈最密 8 座）'],
    ['dual','🐻🐻 雙熊並排黃金陣（熊一＋熊二）'],
    ['banner7','🚩 7×7 標準旗幟領地網格']
  ];
  return`
    <div class="row" style="gap:6px">
      <select id="mpTplSel" style="flex:1 1 200px;min-height:38px;padding:4px 10px;font-size:13px;border-radius:12px">
        ${tpls.map(([k,l])=>`<option value="${k}" ${b.tpl===k?'selected':''}>${l}</option>`).join('')}
      </select>
      ${b.tpl!=='none'?`<button class="btn sm soft" data-mp="tplAlign">📍 對齊熊一</button><button class="btn sm ${b.tplSnap?'pri':''}" data-mp="tplSnap">🧲 吸附</button><button class="btn sm pri" data-mp="tplAuto">✨ 戰力排入</button>`:''}
    </div>
    ${b.tpl!=='none'?`<div class="row" style="gap:5px"><span class="sub">微調圖層原點 (${b.tplOx},${b.tplOy})：</span><button class="btn sm" data-mp="tplNudge" data-dx="0" data-dy="1">⬆️</button><button class="btn sm" data-mp="tplNudge" data-dx="0" data-dy="-1">⬇️</button><button class="btn sm" data-mp="tplNudge" data-dx="-1" data-dy="0">⬅️</button><button class="btn sm" data-mp="tplNudge" data-dx="1" data-dy="0">➡️</button></div>`:''}
    <div class="mp-pills">
      <select id="mpBScope" style="flex:none;min-height:36px;padding:4px 10px;font-size:13px;border-radius:12px">
        <option value="jQt" ${b.scope==='jQt'?'selected':''}>載入：jQt</option>
        <option value="aQt" ${b.scope==='aQt'?'selected':''}>載入：aQt</option>
        <option value="ours" ${b.scope==='ours'?'selected':''}>載入：jQt + aQt</option>
        <option value="view" ${b.scope==='view'?'selected':''}>載入：地圖視野附近</option>
        ${wd.hives.filter(h=>h.al!=='jQt'&&h.al!=='aQt').slice(0,8).map(h=>`<option value="${esc(h.al)}" ${b.scope===h.al?'selected':''}>載入：${esc(h.al)}</option>`).join('')}
      </select>
      <select id="mpPlaceAl" style="flex:none;min-height:36px;padding:4px 10px;font-size:13px;border-radius:12px" title="新放置地標所屬聯盟">
        ${['jQt','aQt',...wd.hives.map(h=>h.al).filter(x=>x!=='jQt'&&x!=='aQt').slice(0,8)].map(al=>`<option value="${esc(al)}" ${b.placeAl===al?'selected':''}>地標：${esc(al)}</option>`).join('')}
      </select>
      <button class="btn sm soft" data-mp="bDetectBear">✨ 偵測熊洞</button>
      <button class="btn sm" data-mp="bLoadReal">↻ 重載真實</button>
      <button class="btn sm" data-mp="bResetAll">↩️ 歸位（${movedN}）</button>
      <button class="btn sm soft" data-mp="bCopy">📋 複製遷城表</button>
      <button class="btn sm" data-mp="bPreviewSv">🌍 3D 預覽</button>
    </div>
    <div class="row" style="gap:6px">
      <input id="mpBAdd" style="flex:1 1 150px;min-height:38px" placeholder="從名冊拉入盟友棋子…" value="${esc(b.addQ)}">
      <button class="btn sm ${b.showRings?'pri':''}" data-mp="bTogRings">🎯 熊距圈</button>
      <button class="btn sm ${b.showTerr?'pri':''}" data-mp="bTogTerr">🚩 領地框</button>
      <button class="btn sm" data-mp="bExpMarks">📤 分享地標</button>
    </div>
    <div id="mpBAddSug"></div>`;
}

function renderStreetControls(wd){
  const sv=M.sv;
  const pitchDeg=Math.round(sv.pitch*180/Math.PI);
  return`
    <div class="row" style="gap:8px;align-items:center">
      <span class="sub" style="white-space:nowrap">📐 上下斜視角 <b class="tnum" id="mpPitchVal">${pitchDeg}°</b></span>
      <input id="mpPitchSlider" type="range" min="12" max="85" value="${pitchDeg}" style="flex:1 1 140px;min-height:32px;padding:0;border:0;background:transparent">
    </div>
    <div class="row" style="gap:6px">
      <button class="btn sm" style="flex:1" data-mp="svPreset" data-p="15" data-d="16">🚶 平視 15°</button>
      <button class="btn sm" style="flex:1" data-mp="svPreset" data-p="38" data-d="34">🌍 3D 斜視 38°</button>
      <button class="btn sm" style="flex:1" data-mp="svPreset" data-p="76" data-d="75">🛰️ 高空俯瞰 76°</button>
    </div>
    <div class="row" style="gap:6px">
      <input id="mpSvSearch" style="flex:1 1 180px;min-height:38px" placeholder="搜尋盟友名字或設施，直接飛過去看 3D 實景…">
    </div>
    <div id="mpSvSug"></div>`;
}

function renderHudOverlay(wd){
  if(M.mode==='map'){
    const z=zoneOf(M.cam.x,M.cam.y);
    return`
      <div class="mp-hud-tl" id="mpHudCoord">${M.measure.on?'📏 測距模式：請點選設施或城池':'X:'+Math.round(M.cam.x)+' · Y:'+Math.round(M.cam.y)+' <span style="color:'+z.c+'">● '+z.l+'</span>'}</div>
      <div class="mp-hud-br">
        <button class="mp-fab" data-mp="zoom" data-v="1.45" title="放大">＋</button>
        <button class="mp-fab" data-mp="zoom" data-v="0.69" title="縮小">－</button>
        <button class="mp-fab" data-mp="flyHive" data-v="jQt" title="回 jQt 聚落">🎯</button>
        <button class="mp-fab" data-mp="fly" data-x="600" data-y="600" data-s="0.62" title="全王國總覽">🌍</button>
      </div>`;
  }
  if(M.mode==='board'){
    return`
      <div class="mp-hud-tl" id="mpHudCoord">${M.measure.on?'📏 測距模式：請點兩個設施／城池':'棋盤中心 X:'+Math.round(M.board.cam.x)+' · Y:'+Math.round(M.board.cam.y)}</div>
      <div class="mp-hud-br">
        <button class="mp-fab" data-mp="bZoom" data-v="1.3">＋</button>
        <button class="mp-fab" data-mp="bZoom" data-v="0.77">－</button>
        <button class="mp-fab" data-mp="bCenter" title="回到陣型中心">🎯</button>
      </div>`;
  }
  const sv=M.sv;
  return`
    <div class="mp-hud-top" id="mpSvCompass">🧭 北 N 0° · 斜視 ${Math.round(sv.pitch*180/Math.PI)}°｜X:${Math.round(sv.tx)} Y:${Math.round(sv.ty)}</div>
    <div class="mp-hud-br" style="bottom:112px">
      <button class="mp-fab" data-mp="svPitchStep" data-v="10" title="拉高俯視角">📐＋</button>
      <button class="mp-fab" data-mp="svPitchStep" data-v="-10" title="壓低平視角">📐－</button>
      <button class="mp-fab" data-mp="svDistStep" data-v="0.75" title="拉近">＋</button>
      <button class="mp-fab" data-mp="svDistStep" data-v="1.33" title="拉遠">－</button>
      <button class="mp-fab" data-mp="svNorth" title="指北歸正">🧭</button>
    </div>
    <div class="mp-dpad" id="mpDpad">
      <div></div><button class="mp-fab" data-svhold="fwd">▲</button><div></div>
      <button class="mp-fab" data-svhold="left">◀</button><button class="mp-fab" data-svhold="back">▼</button><button class="mp-fab" data-svhold="right">▶</button>
    </div>`;
}

function renderMeasureCard(wd){
  const A=app(), esc=A.esc||(s=>s), pts=M.measure.pts;
  const targets=getMeasureTargets(wd);
  let total=0, segs=[];
  for(let i=1;i<pts.length;i++){
    const a=pts[i-1], b=pts[i];
    const d=Math.hypot(b.x-a.x,b.y-a.y);
    total+=d;
    segs.push({a,b,d,dx:Math.round(b.x-a.x),dy:Math.round(b.y-a.y)});
  }
  const flagsNeed=total>0?Math.ceil(total/7):0;
  return`<div class="card tight" style="border-color:#f59e0b">
    <div class="row sp">
      <b>📏 設施距離測量尺</b>
      <div class="row" style="gap:5px">
        ${pts.length?`<button class="btn sm" data-mp="mPop">↩️ 退一點</button><button class="btn sm" data-mp="mClr">🗑️ 清除</button>`:''}
        <button class="btn sm ${M.measure.on?'pri':''}" data-mp="togMeasure">${M.measure.on?'完成測距':'繼續選點'}</button>
      </div>
    </div>
    <div class="row" style="margin-top:8px;gap:6px">
      <select id="mpMQa" style="flex:1 1 130px;min-height:36px;padding:4px 8px;font-size:12.5px;border-radius:12px">
        <option value="">快捷起點（設施／聚落）</option>
        ${targets.map(t=>`<option value="${esc(t.key)}" ${M.measure.qa===t.key?'selected':''}>${esc(t.label)}</option>`).join('')}
      </select>
      <select id="mpMQb" style="flex:1 1 130px;min-height:36px;padding:4px 8px;font-size:12.5px;border-radius:12px">
        <option value="">快捷終點（設施／聚落）</option>
        ${targets.map(t=>`<option value="${esc(t.key)}" ${M.measure.qb===t.key?'selected':''}>${esc(t.label)}</option>`).join('')}
      </select>
      <button class="btn sm pri" data-mp="mQuick">測距</button>
    </div>
    ${segs.length?`
      <div class="row" style="margin-top:8px;gap:6px">
        <span class="bd w">總距離 <b>${total.toFixed(1)} 格</b></span>
        <span class="bd a">一般行軍約 <b>${fmtSec(marchSec(total))}</b></span>
        <span class="bd">鋪旗連接約 <b>${flagsNeed} 面旗</b></span>
      </div>
      <div style="margin-top:6px">${segs.map((s,i)=>`<div class="sub tnum" style="padding:2px 0"><b>${String.fromCharCode(65+i)}→${String.fromCharCode(66+i)}</b> ${esc(s.a.label)} ⇄ ${esc(s.b.label)}：<b>${s.d.toFixed(1)} 格</b>（ΔX ${s.dx>=0?'+':''}${s.dx}, ΔY ${s.dy>=0?'+':''}${s.dy}）</div>`).join('')}</div>
    `:`<div class="sub" style="margin-top:6px">在地圖或棋盤上依序點選兩個點（會自動吸附到城池、要塞、堡壘、工程站或熊陷阱），或直接用上方選單指定兩座設施。</div>`}
  </div>`;
}

function renderMapPlaceCard(wd){
  const A=app(), esc=A.esc||(s=>s), fmtP=A.fmtP||(n=>n), furnL=A.furnL||(n=>n);
  if(M.selFacId){
    const f=WORLD_FACS.find(x=>x.id===M.selFacId);
    if(f){
      const z=zoneOf(f.cx,f.cy), dC=Math.hypot(f.cx-CENTER,f.cy-CENTER);
      const jH=wd.hives.find(x=>x.al==='jQt');
      const dJ=jH?Math.hypot(f.cx-jH.x,f.cy-jH.y):null;
      return`<div class="card tight" style="border-color:${f.color}">
        <div class="row sp">
          <div><b style="font-size:16px">${esc(f.name)}</b> <span class="bd">${f.size}×${f.size}</span>
          <div class="sub tnum" style="margin-top:2px">座標 <b>X:${f.x} · Y:${f.y}</b>（${z.l}）· 距太陽城 ${dC.toFixed(0)} 格${dJ!=null?' · 距 jQt '+dJ.toFixed(0)+' 格（約 '+fmtSec(marchSec(dJ))+'）':''}</div></div>
          <button class="btn sm" data-mp="clearSel">✕</button>
        </div>
        <div class="row" style="margin-top:8px;gap:6px">
          <button class="btn sm soft" data-mp="mFromHere" data-x="${f.cx}" data-y="${f.cy}" data-l="${esc(f.name)}">📏 從此處測距</button>
          <button class="btn sm" data-mp="svAt" data-x="${f.cx}" data-y="${f.cy}">🌍 3D 查看</button>
        </div>
      </div>`;
    }
  }
  const p=M.selFid&&wd.byFid[M.selFid];
  if(!p){
    return`<div class="card tight"><div class="sub">💡 <b>提示：</b>已標註全王國 95 座官方設施（太陽城／4砲台／4要塞／12堡壘／74工程站）與聯盟自訂地標；開「📏 測距」可點任兩座設施測距離與所需旗幟數。</div></div>`;
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
    <div class="row" style="margin-top:10px;gap:6px">
      <button class="btn sm pri" data-mp="openCard" data-v="${esc(p.fid)}">👤 名片</button>
      <button class="btn sm soft" data-mp="toStreet" data-v="${esc(p.fid)}">🌍 3D 拜訪</button>
      <button class="btn sm" data-mp="toBoard" data-v="${esc(p.fid)}">♟️ 棋盤</button>
      <button class="btn sm" data-mp="mFromHere" data-x="${p.x}" data-y="${p.y}" data-l="${esc(p.name)}">📏 測距</button>
    </div>
  </div>`;
}

function renderBoardInspector(wd){
  const A=app(), esc=A.esc||(s=>s), b=M.board;
  const sel=b.pieces.find(p=>p.id===b.selId);
  if(!sel){
    const movedN=b.pieces.filter(p=>p.kind==='city'&&(p.x!==p.ox||p.y!==p.oy)).length;
    return`<div class="card tight"><div class="sub">♟️ <b>棋盤提示：</b>上方工具列可幫各聯盟標上 <b>🐻 熊一／熊二</b>、<b>🏛️ 荒總／❄️ 雪總</b>、<b>🚩 旗幟</b>（會同步顯示在大地圖與 3D 地球！），也可開啟下方 <b>📐 建議熊陣圖層</b> 對齊排位（目前 ${b.pieces.length} 棋子，已調 ${movedN} 位）。</div></div>`;
  }
  const moved=sel.kind==='city'&&(sel.x!==sel.ox||sel.y!==sel.oy);
  const nt=sel.kind==='city'?nearestTrapInfo(sel):null;
  const meta=BLD_META[sel.kind];
  return`<div class="card tight" style="border-color:var(--ac)">
    <div class="row sp">
      <div>
        <b>${esc(meta?(sel.al?'['+sel.al+'] ':'')+meta.label:sel.name)}</b> <span class="bd a">${sel.size}×${sel.size}</span>
        ${moved?`<span class="bd w">原(${sel.ox},${sel.oy})→新(${sel.x},${sel.y})</span>`:`<span class="bd">(${sel.x}, ${sel.y})</span>`}
        ${nt?`<div class="sub tnum" style="margin-top:3px">🐻 距${nt.trap.kind==='trap1'?'熊一':'熊二'} <b>${nt.dist.toFixed(1)} 格</b>（約 <b>${fmtSec(marchSec(nt.dist))}</b>）</div>`:''}
      </div>
      <button class="btn sm" data-mp="bDesel">✕</button>
    </div>
    <div class="row" style="margin-top:8px;gap:6px">
      <button class="btn sm" data-mp="bNudge" data-dx="0" data-dy="1">⬆️</button>
      <button class="btn sm" data-mp="bNudge" data-dx="0" data-dy="-1">⬇️</button>
      <button class="btn sm" data-mp="bNudge" data-dx="-1" data-dy="0">⬅️</button>
      <button class="btn sm" data-mp="bNudge" data-dx="1" data-dy="0">➡️</button>
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
    const d=Math.hypot(selObj.x-sv.tx,selObj.y-sv.ty);
    return`<div class="card tight" style="border-color:${selObj.color}">
      <div class="row sp">
        <div><b>${esc(selObj.name)}</b> ${selObj.al?`<span class="bd a">${esc(selObj.al)}</span>`:''} <span class="bd">距焦點 ${d.toFixed(1)} 格</span>
        <div class="sub tnum" style="margin-top:2px">座標 X:${Math.round(selObj.x)} · Y:${Math.round(selObj.y)}${selObj.power?' · 戰力 '+fmtP(selObj.power):''}${selObj.furn?' · '+furnL(selObj.furn):''}</div></div>
        <button class="btn sm" data-mp="svClearSel">✕</button>
      </div>
      <div class="row" style="margin-top:8px;gap:6px">
        <button class="btn sm pri" data-mp="svFocus" data-x="${selObj.x}" data-y="${selObj.y}">🎯 鎖定置中</button>
        ${selObj.fid?`<button class="btn sm soft" data-mp="openCard" data-v="${esc(selObj.fid)}">👤 名片</button>`:''}
      </div>
    </div>`;
  }
  return`<div class="card tight"><div class="sub">🌍 <b>Google Earth 3D 操作：</b>「🔄 旋轉／調斜視」模式下，<b>左右滑 360° 旋轉、上下滑調整上下斜視角（12°平視～85°俯瞰）</b>；雙指縮放升降高度；切「🖐️ 平移滑行」或按左下方向鍵可自由巡航整個 2611 王國！</div></div>`;
}

/* ===== Mode 1：繪製王國大地圖 ===== */
function drawWorldMap(ctx,w,h,wd){
  const dark=isDark();
  ctx.fillStyle=dark?'#0c1829':'#dfeeff';
  ctx.fillRect(0,0,w,h);

  function drawPolyBox(x0,y0,sz,fill,stroke,dash,lw){
    const pts=[
      mapWorldToScreen(x0,y0,w,h),
      mapWorldToScreen(x0+sz,y0,w,h),
      mapWorldToScreen(x0+sz,y0+sz,w,h),
      mapWorldToScreen(x0,y0+sz,w,h)
    ];
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<4;i++)ctx.lineTo(pts[i].x,pts[i].y);
    ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill()}
    if(stroke){
      ctx.save();if(dash)ctx.setLineDash(dash);
      ctx.strokeStyle=stroke;ctx.lineWidth=lw||1.3;ctx.stroke();ctx.restore();
    }
  }

  // 四層遊戲地形帶
  drawPolyBox(0,0,WORLD,dark?'#102033':'#eaf4ff',dark?'rgba(148,163,184,.28)':'rgba(30,64,110,.25)');
  drawPolyBox(CENTER-R_TUNDRA,CENTER-R_TUNDRA,R_TUNDRA*2,dark?'#142a42':'#dcedff',dark?'rgba(56,189,248,.32)':'rgba(2,132,199,.32)',[6,4]);
  drawPolyBox(CENTER-R_FERTILE,CENTER-R_FERTILE,R_FERTILE*2,dark?'#15363a':'#d9f5e8',dark?'rgba(52,211,153,.42)':'rgba(16,185,129,.45)',[5,4]);
  drawPolyBox(CENTER-R_CORE,CENTER-R_CORE,R_CORE*2,dark?'rgba(127,29,29,.45)':'rgba(254,202,202,.52)',dark?'rgba(248,113,113,.65)':'rgba(220,38,38,.55)');

  // 自適應網格
  const s=M.cam.scale;
  const step=s>=16?1:s>=6?5:s>=2?20:s>=0.8?50:100;
  const corners=[mapScreenToWorld(0,0,w,h),mapScreenToWorld(w,0,w,h),mapScreenToWorld(w,h,w,h),mapScreenToWorld(0,h,w,h)];
  const minX=Math.max(0,Math.floor(Math.min(...corners.map(c=>c.x))/step)*step);
  const maxX=Math.min(WORLD,Math.ceil(Math.max(...corners.map(c=>c.x))/step)*step);
  const minY=Math.max(0,Math.floor(Math.min(...corners.map(c=>c.y))/step)*step);
  const maxY=Math.min(WORLD,Math.ceil(Math.max(...corners.map(c=>c.y))/step)*step);
  ctx.save();
  ctx.strokeStyle=dark?'rgba(148,185,220,.11)':'rgba(15,45,85,.09)';
  ctx.lineWidth=1;ctx.beginPath();
  for(let gx=minX;gx<=maxX;gx+=step){const a=mapWorldToScreen(gx,minY,w,h),b=mapWorldToScreen(gx,maxY,w,h);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}
  for(let gy=minY;gy<=maxY;gy+=step){const a=mapWorldToScreen(minX,gy,w,h),b=mapWorldToScreen(maxX,gy,w,h);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}
  ctx.stroke();ctx.restore();

  // 官方 95 座固定設施（太陽城、砲台、要塞、堡壘、工程站）
  if(M.showFacs){
    for(const f of WORLD_FACS){
      const isMajor=f.kind==='castle'||f.kind==='sh'||f.kind==='ft';
      if(!isMajor&&f.kind!=='turret'&&s<1.1)continue;
      if(f.kind==='turret'&&s<1.5)continue;
      const pt=mapWorldToScreen(f.cx,f.cy,w,h);
      if(pt.x<-50||pt.x>w+50||pt.y<-50||pt.y>h+50)continue;
      const sel=M.selFacId===f.id;
      if(s>=3.5){
        drawPolyBox(f.x,f.y,f.size,f.color,sel?'#facc15':'#fff',null,sel?3:1.4);
      }else{
        const r=f.kind==='castle'?Math.max(6,s*3):isMajor?Math.max(4.5,s*2.2):Math.max(3,s*1.4);
        ctx.fillStyle=f.color;ctx.strokeStyle=sel?'#facc15':'#fff';ctx.lineWidth=sel?2.5:1.2;
        ctx.beginPath();ctx.arc(pt.x,pt.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();
      }
      if((f.kind==='castle'&&s>=0.6)||(isMajor&&s>=1.2)||(!isMajor&&s>=3.8)||sel){
        ctx.font=(sel?'800 ':'700 ')+'11px -apple-system,sans-serif';
        ctx.textAlign='center';
        ctx.fillStyle=sel?'#facc15':(dark?'#e2e8f0':'#0f172a');
        ctx.fillText(f.name,pt.x,pt.y-Math.max(8,s*f.size*0.42));
      }
    }
  }

  // 各聯盟自訂地標（旗幟 7x7 領地 + 熊陷阱 + 總部）同步繪製在大地圖！
  if(M.showMarks){
    const marks=getAllianceLandmarks();
    // 先畫旗幟 7x7 領地
    if(s>=2.2){
      marks.filter(p=>p.kind==='banner').forEach(p=>{
        drawPolyBox(p.x-3,p.y-3,7,'rgba(14,165,233,.14)','rgba(14,165,233,.55)',[4,3],1.2);
      });
    }
    marks.forEach(p=>{
      const cx=p.x+p.size/2, cy=p.y+p.size/2, pt=mapWorldToScreen(cx,cy,w,h);
      if(pt.x<-40||pt.x>w+40||pt.y<-40||pt.y>h+40)return;
      const meta=BLD_META[p.kind];
      if(s>=4){
        drawPolyBox(p.x,p.y,p.size,meta.bg,meta.color,null,2);
      }else{
        ctx.fillStyle=meta.color;ctx.strokeStyle='#fff';ctx.lineWidth=1.4;
        ctx.beginPath();ctx.arc(pt.x,pt.y,5,0,Math.PI*2);ctx.fill();ctx.stroke();
      }
      if(s>=2.5){
        ctx.font='800 11px -apple-system,sans-serif';ctx.textAlign='center';
        ctx.fillStyle=dark?'#fde68a':'#78350f';
        ctx.fillText((p.al?`[${p.al}] `:'')+meta.short,pt.x,pt.y-Math.max(8,s*p.size*0.45));
      }
    });
  }

  // 玩家城池
  const list=wd.players.filter(p=>{
    if(M.alFilter==='ours'&&p.al!=='jQt'&&p.al!=='aQt')return false;
    if(M.alFilter!=='all'&&M.alFilter!=='ours'&&p.al!==M.alFilter)return false;
    if(M.shFilter==='shield'&&!p.shield)return false;
    if(M.shFilter==='noshield'&&p.shield)return false;
    return true;
  });

  const labelBoxes=[];
  const canPlaceLabel=(lx,ly,lw,lh)=>{
    for(const b of labelBoxes)if(lx<b.x+b.w&&lx+lw>b.x&&ly<b.y+b.h&&ly+lh>b.y)return false;
    labelBoxes.push({x:lx,y:ly,w:lw,h:lh});return true;
  };
  for(const p of list){
    const pt=mapWorldToScreen(p.x,p.y,w,h);
    if(pt.x<-40||pt.x>w+40||pt.y<-40||pt.y>h+40)continue;
    const col=alColor(p.al), sel=p.fid===M.selFid;
    if(s>=5){
      drawPolyBox(p.x-1,p.y-1,2,col,sel?'#facc15':'#ffffff',null,sel?3:1.2);
      if(p.shield){ctx.beginPath();ctx.arc(pt.x,pt.y,Math.max(7,s*1.25),0,Math.PI*2);ctx.strokeStyle='rgba(56,189,248,.9)';ctx.lineWidth=2;ctx.stroke()}
      if(p.burn){ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('🔥',pt.x,pt.y+4)}
      if(s>=9||sel){
        ctx.font=(sel?'800 ':'700 ')+'11.5px -apple-system,sans-serif';
        const txt=p.name.slice(0,10), tw=ctx.measureText(txt).width+10;
        const lx=pt.x-tw/2, ly=pt.y-Math.max(18,s*1.35)-12;
        if(sel||canPlaceLabel(lx,ly,tw,17)){
          ctx.fillStyle=sel?'#facc15':(dark?'rgba(12,24,42,.82)':'rgba(255,255,255,.9)');
          ctx.beginPath();if(ctx.roundRect)ctx.roundRect(lx,ly,tw,17,6);else ctx.rect(lx,ly,tw,17);ctx.fill();
          ctx.fillStyle=sel?'#1e293b':(dark?'#f1f5f9':'#0f172a');
          ctx.textAlign='center';ctx.fillText(txt,pt.x,ly+12.5);
        }
      }
    }else{
      const rad=sel?7:clamp(s*1.2,2.6,5.5);
      ctx.fillStyle=col;ctx.beginPath();ctx.arc(pt.x,pt.y,rad,0,Math.PI*2);ctx.fill();
      if(sel){ctx.strokeStyle='#facc15';ctx.lineWidth=2.5;ctx.stroke()}
      else if(p.shield){ctx.strokeStyle='#38bdf8';ctx.lineWidth=1.2;ctx.stroke()}
    }
  }

  // 遠景聯盟聚落標籤
  if(s<9){
    ctx.save();ctx.font='800 12px -apple-system,sans-serif';ctx.textAlign='center';
    wd.hives.slice(0,10).forEach(hv=>{
      if(hv.clusterCount<3)return;
      if(M.alFilter==='ours'&&hv.al!=='jQt'&&hv.al!=='aQt')return;
      if(M.alFilter!=='all'&&M.alFilter!=='ours'&&hv.al!==M.alFilter)return;
      const pt=mapWorldToScreen(hv.x,hv.y,w,h);
      if(pt.x<-50||pt.x>w+50||pt.y<-30||pt.y>h+30)return;
      const txt=`${hv.al} · ${hv.count}人`, tw=ctx.measureText(txt).width+14;
      ctx.fillStyle=alColor(hv.al);
      ctx.beginPath();if(ctx.roundRect)ctx.roundRect(pt.x-tw/2,pt.y-24,tw,21,10);else ctx.rect(pt.x-tw/2,pt.y-24,tw,21);ctx.fill();
      ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillStyle='#fff';ctx.fillText(txt,pt.x,pt.y-9.5);
    });
    ctx.restore();
  }

  // 測距線覆蓋層
  drawMeasureOverlay(ctx,w,h,(x,y)=>mapWorldToScreen(x,y,w,h));

  const hud=document.getElementById('mpHudCoord');
  if(hud&&!M.measure.on){
    const c=M.cursorW||M.cam, z=zoneOf(c.x,c.y);
    hud.innerHTML=`X:${Math.round(c.x)} · Y:${Math.round(c.y)} <span style="color:${z.c}">● ${z.l}</span>`;
  }
}

/* ===== Mode 2：繪製棋盤格排位模擬（含官方設施＋4套熊陷阱建議圖層＋測距尺） ===== */
function drawBoard(ctx,w,h){
  const dark=isDark(), b=M.board, t=b.cam.tile;
  ctx.fillStyle=dark?'#0f1c2e':'#f1f7fe';
  ctx.fillRect(0,0,w,h);

  const tl=boardScreenToWorld(0,0,w,h), br=boardScreenToWorld(w,h,w,h);
  const x0=Math.max(0,Math.floor(tl.x)-1), x1=Math.min(WORLD,Math.ceil(br.x)+1);
  const y0=Math.max(0,Math.floor(br.y)-1), y1=Math.min(WORLD,Math.ceil(tl.y)+1);

  if(t>=8){
    ctx.fillStyle=dark?'rgba(148,185,220,.055)':'rgba(15,45,85,.045)';
    for(let gx=x0;gx<x1;gx++)for(let gy=y0;gy<y1;gy++)if((gx+gy)&1){
      const p=boardWorldToScreen(gx,gy+1,w,h);ctx.fillRect(p.x,p.y,t,t);
    }
  }
  const gStep=t>=10?1:5;
  ctx.strokeStyle=dark?'rgba(148,185,220,.14)':'rgba(15,45,85,.11)';
  ctx.lineWidth=1;ctx.beginPath();
  for(let gx=Math.floor(x0/gStep)*gStep;gx<=x1;gx+=gStep){const p=boardWorldToScreen(gx,y1,w,h);ctx.moveTo(p.x,0);ctx.lineTo(p.x,h)}
  for(let gy=Math.floor(y0/gStep)*gStep;gy<=y1;gy+=gStep){const p=boardWorldToScreen(x0,gy,w,h);ctx.moveTo(0,p.y);ctx.lineTo(w,p.y)}
  ctx.stroke();

  // 座標尺
  const tickStep=t>=22?2:t>=12?5:10;
  ctx.font='700 10.5px ui-monospace,monospace';
  ctx.fillStyle=dark?'rgba(203,213,225,.75)':'rgba(51,65,85,.75)';
  ctx.textAlign='center';
  for(let gx=Math.ceil(x0/tickStep)*tickStep;gx<=x1;gx+=tickStep){const p=boardWorldToScreen(gx,y1,w,h);ctx.fillText(String(gx),p.x+t/2,h-5)}
  ctx.textAlign='left';
  for(let gy=Math.ceil(y0/tickStep)*tickStep;gy<=y1;gy+=tickStep){const p=boardWorldToScreen(x0,gy,w,h);ctx.fillText(String(gy),5,p.y-t/2+4)}

  // 0. 視野內的官方固定設施（讓排陣不會壓到工程站／堡壘／要塞）
  if(M.showFacs){
    WORLD_FACS.forEach(f=>{
      if(f.x+f.size<x0||f.x>x1||f.y+f.size<y0||f.y>y1)return;
      const p=boardWorldToScreen(f.x,f.y+f.size,w,h);
      ctx.fillStyle='rgba(148,163,184,.25)';ctx.strokeStyle=f.color;ctx.lineWidth=2;
      ctx.fillRect(p.x+1,p.y+1,f.size*t-2,f.size*t-2);
      ctx.strokeRect(p.x+1,p.y+1,f.size*t-2,f.size*t-2);
      ctx.font='800 11px -apple-system,sans-serif';ctx.textAlign='center';
      ctx.fillStyle=dark?'#f8fafc':'#0f172a';
      ctx.fillText(f.name,p.x+f.size*t/2,p.y+f.size*t/2+4);
    });
  }

  // 0.5 網路熱門熊陷阱建議佈置對齊圖層（Ghost Overlay）
  const tpl=getTemplate(b.tpl);
  if(tpl){
    const ox=b.tplOx, oy=b.tplOy;
    // 若是 7x7 旗幟範本，畫出建議旗幟 7x7 覆蓋框
    if(b.tpl==='banner7'){
      tpl.banners.forEach(bn=>{
        const p=boardWorldToScreen(ox+bn.dx-3,oy+bn.dy+4,w,h);
        ctx.save();ctx.setLineDash([5,4]);
        ctx.fillStyle='rgba(14,165,233,.07)';ctx.strokeStyle='rgba(14,165,233,.48)';ctx.lineWidth=1.3;
        ctx.fillRect(p.x,p.y,7*t,7*t);ctx.strokeRect(p.x,p.y,7*t,7*t);ctx.restore();
      });
    }
    // 建議熊陷阱框
    tpl.traps.forEach(tr=>{
      const p=boardWorldToScreen(ox+tr.dx,oy+tr.dy+3,w,h);
      ctx.save();ctx.setLineDash([6,4]);
      ctx.fillStyle='rgba(245,158,11,.14)';ctx.strokeStyle='#f59e0b';ctx.lineWidth=2.2;
      ctx.fillRect(p.x+1,p.y+1,3*t-2,3*t-2);ctx.strokeRect(p.x+1,p.y+1,3*t-2,3*t-2);
      ctx.font='800 11px -apple-system,sans-serif';ctx.textAlign='center';ctx.fillStyle='#d97706';
      ctx.fillText('建議'+tr.label,p.x+1.5*t,p.y+1.5*t+4);
      ctx.restore();
    });
    // 建議旗幟位
    tpl.banners.forEach(bn=>{
      const p=boardWorldToScreen(ox+bn.dx,oy+bn.dy+1,w,h);
      ctx.save();ctx.setLineDash([3,2]);
      ctx.fillStyle='rgba(14,165,233,.18)';ctx.strokeStyle='#0284c7';ctx.lineWidth=1.5;
      ctx.fillRect(p.x+1,p.y+1,t-2,t-2);ctx.strokeRect(p.x+1,p.y+1,t-2,t-2);
      if(t>=18){ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText('🚩',p.x+t/2,p.y+t/2+4)}
      ctx.restore();
    });
    // 建議城池格位（金＝1圈車頭、藍＝2圈主力、綠＝3圈外圍，帶編號 #1..#N）
    tpl.slots.forEach(s=>{
      const sx=ox+s.dx, sy=oy+s.dy;
      const p=boardWorldToScreen(sx,sy+2,w,h);
      if(p.x+2*t<0||p.x>w||p.y+2*t<0||p.y>h)return;
      const col=s.dual||s.ring===1?'#f59e0b':s.ring===2?'#3b82f6':'#10b981';
      const bg=s.dual||s.ring===1?'rgba(245,158,11,.14)':s.ring===2?'rgba(59,130,246,.11)':'rgba(16,185,129,.1)';
      ctx.save();ctx.setLineDash([4,3]);
      ctx.fillStyle=bg;ctx.strokeStyle=col;ctx.lineWidth=1.5;
      ctx.fillRect(p.x+2,p.y+2,2*t-4,2*t-4);ctx.strokeRect(p.x+2,p.y+2,2*t-4,2*t-4);
      if(t>=15){
        ctx.font='800 10.5px ui-monospace,monospace';ctx.textAlign='center';ctx.fillStyle=col;
        ctx.fillText((s.dual?'★':'#')+s.rank,p.x+t,p.y+t+4);
      }
      ctx.restore();
    });
  }

  // 1. 聯盟旗幟 7x7 領地覆蓋框
  if(b.showTerr){
    b.pieces.filter(p=>p.kind==='banner').forEach(p=>{
      const tlP=boardWorldToScreen(p.x-3,p.y+4,w,h);
      ctx.save();ctx.setLineDash([5,3]);
      ctx.fillStyle='rgba(14,165,233,.13)';ctx.strokeStyle='rgba(14,165,233,.55)';ctx.lineWidth=1.5;
      ctx.fillRect(tlP.x,tlP.y,7*t,7*t);ctx.strokeRect(tlP.x,tlP.y,7*t,7*t);ctx.restore();
    });
  }

  // 2. 熊陷阱距離參考圈
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

  // 3. 已移動城池原位與虛線箭頭
  b.pieces.filter(p=>p.kind==='city'&&(p.x!==p.ox||p.y!==p.oy)).forEach(p=>{
    const oTL=boardWorldToScreen(p.ox,p.oy+p.size,w,h);
    ctx.save();ctx.setLineDash([4,3]);
    ctx.strokeStyle=dark?'rgba(250,204,21,.55)':'rgba(217,119,6,.55)';ctx.lineWidth=1.5;
    ctx.strokeRect(oTL.x+1,oTL.y+1,p.size*t-2,p.size*t-2);
    const c1=boardWorldToScreen(p.ox+p.size/2,p.oy+p.size/2,w,h);
    const c2=boardWorldToScreen(p.x+p.size/2,p.y+p.size/2,w,h);
    ctx.beginPath();ctx.moveTo(c1.x,c1.y);ctx.lineTo(c2.x,c2.y);ctx.stroke();
    ctx.restore();
  });

  // 4. 全部棋子
  b.pieces.forEach(p=>{
    const tlP=boardWorldToScreen(p.x,p.y+p.size,w,h);
    const pw=p.size*t, ph=p.size*t;
    if(tlP.x+pw<0||tlP.x>w||tlP.y+ph<0||tlP.y>h)return;
    const isSel=p.id===b.selId, meta=BLD_META[p.kind];
    const fill=meta?meta.bg:(p.x!==p.ox||p.y!==p.oy?'rgba(245,158,11,.28)':(dark?'rgba(56,189,248,.22)':'rgba(37,99,235,.18)'));
    const stroke=isSel?'#facc15':(meta?meta.color:alColor(p.al));
    ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=isSel?3:2;
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(tlP.x+2,tlP.y+2,pw-4,ph-4,Math.min(10,t*0.35));
    else ctx.rect(tlP.x+2,tlP.y+2,pw-4,ph-4);
    ctx.fill();ctx.stroke();

    ctx.textAlign='center';ctx.fillStyle=dark?'#f8fafc':'#0f172a';
    const cx=tlP.x+pw/2, cy=tlP.y+ph/2;
    if(meta){
      ctx.font=`800 ${clamp(Math.round(t*0.44),10,15)}px -apple-system,sans-serif`;
      ctx.fillText(meta.short,cx,cy+(p.al&&p.size>=3?-2:4));
      if(p.al&&p.size>=3&&t>=16){ctx.font='700 10px sans-serif';ctx.fillStyle=alColor(p.al);ctx.fillText(p.al,cx,cy+13)}
    }else if(t>=12){
      ctx.font=`800 ${clamp(Math.round(t*0.44),10,13.5)}px -apple-system,sans-serif`;
      ctx.fillText(p.name.slice(0,Math.max(2,Math.floor(pw/11))),cx,cy+(t>=20?-1:4));
      if(t>=20){
        const nt=nearestTrapInfo(p);
        ctx.font='700 10px ui-monospace,monospace';ctx.fillStyle=dark?'#93c5fd':'#1e40af';
        ctx.fillText(nt?nt.dist.toFixed(1)+'格':`${p.x},${p.y}`,cx,cy+13);
      }
    }
  });

  // 5. 拖曳幽靈預覽
  if(b.drag){
    const p=b.pieces.find(x=>x.id===b.drag.id);
    if(p){
      const tlP=boardWorldToScreen(b.drag.tx,b.drag.ty+p.size,w,h);
      ctx.save();
      ctx.fillStyle=b.drag.ok?'rgba(34,197,94,.35)':'rgba(239,68,68,.42)';
      ctx.strokeStyle=b.drag.ok?'#22c55e':'#ef4444';ctx.lineWidth=2.5;
      ctx.fillRect(tlP.x+1,tlP.y+1,p.size*t-2,p.size*t-2);
      ctx.strokeRect(tlP.x+1,tlP.y+1,p.size*t-2,p.size*t-2);
      ctx.restore();
    }
  }

  // 6. 測距線覆蓋層
  drawMeasureOverlay(ctx,w,h,(x,y)=>boardWorldToScreen(x,y,w,h));
}

/* ===== Mode 3：Google Earth 風格真 3D 軌道自由斜視引擎 ===== */
function getStreetObjects(wd){
  const objs=[];
  // 全 95 座官方設施
  WORLD_FACS.forEach(f=>{
    const h=f.kind==='castle'?10:f.kind==='sh'?5.5:f.kind==='ft'?4.6:f.kind==='turret'?4.2:2.6;
    objs.push({key:f.id,kind:f.kind,name:f.name,al:'',x:f.cx,y:f.cy,size:f.size,h,color:f.color});
  });
  // 各聯盟自訂地標（熊陷阱／總部／旗幟）永遠同步顯示！
  getAllianceLandmarks().forEach(p=>{
    const meta=BLD_META[p.kind];
    objs.push({
      key:'lm_'+p.id,kind:p.kind,name:(p.al?`[${p.al}] `:'')+meta.label,al:p.al||'',
      x:p.x+p.size/2,y:p.y+p.size/2,size:p.size,
      h:p.kind==='hq'||p.kind==='hq2'?3.4:p.kind==='banner'?2.8:1.8,
      color:meta.color
    });
  });
  if(M.sv.useSim&&M.board.pieces.length){
    M.board.pieces.filter(p=>p.kind==='city').forEach(p=>{
      objs.push({
        key:p.id,kind:'city',fid:p.fid||'',name:p.name,al:p.al||'',power:p.power||0,furn:p.furn||0,
        x:p.x+1,y:p.y+1,size:2,h:1.25+Math.min(1.4,(p.furn||20)/28),color:alColor(p.al),shield:0,burn:0
      });
    });
  }else{
    wd.players.forEach(p=>{
      objs.push({
        key:'p_'+p.fid,kind:'city',fid:p.fid,name:p.name,al:p.al,power:p.power,furn:p.furn,
        x:p.x,y:p.y,size:2,h:1.25+Math.min(1.4,(p.furn||20)/28),color:alColor(p.al),shield:p.shield,burn:p.burn
      });
    });
  }
  return objs;
}

function drawStreetView(ctx,w,h,wd,now){
  const dark=isDark(), sv=M.sv;
  const sinY=Math.sin(sv.yaw), cosY=Math.cos(sv.yaw);
  const sinP=Math.sin(sv.pitch), cosP=Math.cos(sv.pitch);

  // Google Earth 球面軌道相機位置：盯著地面焦點 (tx, ty, 0)
  const camX=sv.tx-sinY*cosP*sv.dist;
  const camY=sv.ty-cosY*cosP*sv.dist;
  const camZ=Math.max(1.8,sinP*sv.dist);
  const focal=Math.min(w,h)*1.05;

  // 真 3D 旋轉矩陣投影（支援 12° 貼地街景到 85° 衛星鳥瞰，零畸變！）
  // 相機基底向量：
  //   right = (cosY, -sinY, 0)
  //   fwd   = (sinY*cosP, cosY*cosP, -sinP)
  //   up    = (sinY*sinP, cosY*sinP,  cosP)
  function proj3(wx,wy,wz){
    const dx=wx-camX, dy=wy-camY, dz=wz-camZ;
    const rx=dx*cosY-dy*sinY;
    const hy=dx*sinY+dy*cosY; // 水平前方分量
    const cz=hy*cosP-dz*sinP; // 相機深度
    if(cz<=0.6)return null;
    const cy=hy*sinP+dz*cosP; // 相機上方分量
    const sc=focal/cz;
    return{sx:w/2+rx*sc,sy:h/2-cy*sc,cz,sc};
  }

  // 計算天空地平線位置（pitch 越高，地平線越往上移，>60° 時全畫面都是冰原大地）
  const horY=h/2-Math.tan(sv.pitch)*focal*0.92;
  const clampedHor=clamp(horY,-40,h*0.72);

  // 1. 天空背景＋極光／遠山
  if(clampedHor>0){
    const sky=ctx.createLinearGradient(0,0,0,Math.max(40,clampedHor+30));
    if(dark){sky.addColorStop(0,'#060d1f');sky.addColorStop(0.6,'#0e2444');sky.addColorStop(1,'#1c3f60')}
    else{sky.addColorStop(0,'#5aa3e8');sky.addColorStop(0.65,'#a7d4f8');sky.addColorStop(1,'#e8f5ff')}
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,clampedHor+16);
    if(dark){
      ctx.save();
      const aur=ctx.createLinearGradient(0,0,0,clampedHor);
      aur.addColorStop(0,'rgba(52,211,153,0)');aur.addColorStop(0.55,'rgba(45,212,191,0.22)');aur.addColorStop(1,'rgba(56,189,248,0)');
      ctx.fillStyle=aur;ctx.beginPath();ctx.moveTo(0,clampedHor);
      for(let x=0;x<=w;x+=28){ctx.lineTo(x,clampedHor*0.42+Math.sin(x*0.012+sv.yaw*2.5+now*0.0008)*18)}
      ctx.lineTo(w,clampedHor);ctx.closePath();ctx.fill();ctx.restore();
    }
    ctx.fillStyle=dark?'#152c47':'#c6dff5';
    ctx.beginPath();ctx.moveTo(0,clampedHor+6);
    for(let x=0;x<=w+20;x+=18){
      const a=sv.yaw+(x-w/2)/focal;
      ctx.lineTo(x,clampedHor-Math.max(2,12+Math.sin(a*5)*9+Math.cos(a*11)*6));
    }
    ctx.lineTo(w,clampedHor+6);ctx.closePath();ctx.fill();
  }

  // 2. 雪地地面
  const curZ=zoneOf(sv.tx,sv.ty);
  const gTop=Math.max(0,clampedHor);
  const gnd=ctx.createLinearGradient(0,gTop,0,h);
  if(dark){gnd.addColorStop(0,curZ.k==='core'?'#3b1d28':'#18324c');gnd.addColorStop(1,curZ.k==='core'?'#231118':'#0e2034')}
  else{gnd.addColorStop(0,curZ.k==='core'?'#f8d8d8':'#dceeff');gnd.addColorStop(1,curZ.k==='core'?'#f3c6c6':'#eef7ff')}
  ctx.fillStyle=gnd;ctx.fillRect(0,gTop,w,h-gTop);

  // 3. 真 3D 地面座標格線＋聯盟旗幟 7x7 領地鋪在地面上
  const span=clamp(Math.round(sv.dist*1.65),28,160);
  const gStep=sv.dist>110?10:sv.dist>55?5:2;
  const bx=Math.floor(sv.tx/gStep)*gStep, by=Math.floor(sv.ty/gStep)*gStep;
  ctx.save();
  ctx.strokeStyle=dark?'rgba(148,197,240,.15)':'rgba(30,64,110,.13)';
  ctx.lineWidth=1;ctx.beginPath();
  for(let dx=-span;dx<=span;dx+=gStep){
    const gx=bx+dx;let prev=null;
    for(let dy=-span;dy<=span;dy+=Math.max(4,gStep*2)){
      const p=proj3(gx,by+dy,0);
      if(p&&p.cz<span*2.2){if(prev)ctx.moveTo(prev.sx,prev.sy),ctx.lineTo(p.sx,p.sy);prev=p}else prev=null;
    }
  }
  for(let dy=-span;dy<=span;dy+=gStep){
    const gy=by+dy;let prev=null;
    for(let dx=-span;dx<=span;dx+=Math.max(4,gStep*2)){
      const p=proj3(bx+dx,gy,0);
      if(p&&p.cz<span*2.2){if(prev)ctx.moveTo(prev.sx,prev.sy),ctx.lineTo(p.sx,p.sy);prev=p}else prev=null;
    }
  }
  ctx.stroke();ctx.restore();

  // 地面旗幟 7x7 領地投影
  getAllianceLandmarks().filter(p=>p.kind==='banner').forEach(bn=>{
    if(Math.hypot(bn.x-sv.tx,bn.y-sv.ty)>span*1.4)return;
    const q=[proj3(bn.x-3,bn.y-3,0.03),proj3(bn.x+4,bn.y-3,0.03),proj3(bn.x+4,bn.y+4,0.03),proj3(bn.x-3,bn.y+4,0.03)];
    if(q.some(x=>!x))return;
    ctx.save();ctx.fillStyle='rgba(14,165,233,.18)';ctx.strokeStyle='rgba(56,189,248,.65)';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(q[0].sx,q[0].sy);for(let i=1;i<4;i++)ctx.lineTo(q[i].sx,q[i].sy);ctx.closePath();
    ctx.fill();ctx.stroke();ctx.restore();
  });

  // 地面焦點十字準心（像 Google Earth 軌道旋轉支點）
  const focP=proj3(sv.tx,sv.ty,0.05);
  if(focP){
    ctx.save();ctx.strokeStyle='rgba(250,204,21,.55)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(focP.sx,focP.sy,7,0,Math.PI*2);ctx.stroke();ctx.restore();
  }

  // 4. 收集視野內 3D 城池、官方設施與聯盟地標（由遠到近繪製）
  const objs=getStreetObjects(wd);
  const vis=[];
  const maxView=Math.max(75,sv.dist*2.4);
  for(const o of objs){
    const dCam=Math.hypot(o.x-camX,o.y-camY);
    const maxR=o.kind==='castle'?650:(o.kind==='sh'||o.kind==='ft')?240:maxView;
    if(dCam>maxR)continue;
    const pBase=proj3(o.x,o.y,0);
    if(!pBase||pBase.sx<-110||pBase.sx>w+110||pBase.sy<-80||pBase.sy>h+120)continue;
    const pTop=proj3(o.x,o.y,o.h);
    vis.push({o,cz:pBase.cz,dTarget:Math.hypot(o.x-sv.tx,o.y-sv.ty),pBase,pTop});
  }
  vis.sort((a,b)=>b.cz-a.cz);

  sv.hitBoxes=[];
  const labelCands=[];
  // 輔助畫 3D 方塊建築（頂面＋可見側面，斜視角度變化時立體感超強！）
  function drawBox3D(cx,cy,sz,bh,topCol,wallA,wallB,bandCol,isSel){
    const hs=sz*0.44;
    const b0=proj3(cx-hs,cy-hs,0), b1=proj3(cx+hs,cy-hs,0), b2=proj3(cx+hs,cy+hs,0), b3=proj3(cx-hs,cy+hs,0);
    const t0=proj3(cx-hs,cy-hs,bh), t1=proj3(cx+hs,cy-hs,bh), t2=proj3(cx+hs,cy+hs,bh), t3=proj3(cx-hs,cy+hs,bh);
    if(!b0||!b1||!b2||!b3||!t0||!t1||!t2||!t3)return null;
    const faces=[
      {pts:[b0,b1,t1,t0],cz:(b0.cz+b1.cz)/2,col:wallA},
      {pts:[b1,b2,t2,t1],cz:(b1.cz+b2.cz)/2,col:wallB},
      {pts:[b2,b3,t3,t2],cz:(b2.cz+b3.cz)/2,col:wallA},
      {pts:[b3,b0,t0,t3],cz:(b3.cz+b0.cz)/2,col:wallB}
    ];
    faces.sort((a,b)=>b.cz-a.cz);
    // 畫靠前的兩面牆
    for(let i=2;i<4;i++){
      const fp=faces[i].pts;
      ctx.fillStyle=faces[i].col;
      ctx.beginPath();ctx.moveTo(fp[0].sx,fp[0].sy);ctx.lineTo(fp[1].sx,fp[1].sy);ctx.lineTo(fp[2].sx,fp[2].sy);ctx.lineTo(fp[3].sx,fp[3].sy);ctx.closePath();
      ctx.fill();
    }
    // 畫頂面（高斜角俯瞰時清楚呈現聯盟色屋頂！）
    ctx.fillStyle=topCol;
    ctx.beginPath();ctx.moveTo(t0.sx,t0.sy);ctx.lineTo(t1.sx,t1.sy);ctx.lineTo(t2.sx,t2.sy);ctx.lineTo(t3.sx,t3.sy);ctx.closePath();
    ctx.fill();
    ctx.strokeStyle=isSel?'#facc15':bandCol;
    ctx.lineWidth=isSel?2.8:1.5;ctx.stroke();
    const xs=[b0.sx,b1.sx,b2.sx,b3.sx,t0.sx,t1.sx,t2.sx,t3.sx];
    const ys=[b0.sy,b1.sy,b2.sy,b3.sy,t0.sy,t1.sy,t2.sy,t3.sy];
    return{minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
  }

  for(const item of vis){
    const {o,cz,dTarget,pBase,pTop}=item;
    const isSel=o.key===sv.selKey;
    const alpha=o.kind==='castle'?1:clamp(1.3-cz/(maxView*1.15),0.28,1);
    ctx.save();ctx.globalAlpha=alpha;

    let box=null;
    if(o.kind==='banner'){
      if(pTop){
        ctx.strokeStyle='#e2e8f0';ctx.lineWidth=Math.max(2,pBase.sc*0.1);
        ctx.beginPath();ctx.moveTo(pBase.sx,pBase.sy);ctx.lineTo(pTop.sx,pTop.sy);ctx.stroke();
        const fw=clamp(pBase.sc*0.8,8,28);
        ctx.fillStyle=o.color;
        ctx.beginPath();ctx.moveTo(pTop.sx,pTop.sy);ctx.lineTo(pTop.sx+fw,pTop.sy+fw*0.3);ctx.lineTo(pTop.sx,pTop.sy+fw*0.6);ctx.closePath();ctx.fill();
        box={minX:pBase.sx-8,maxX:pTop.sx+fw,minY:pTop.sy,maxY:pBase.sy};
      }
    }else if(o.kind==='castle'){
      box=drawBox3D(o.x,o.y,5.6,o.h*0.7,'#fbbf24','#b45309','#d97706','#fef3c7',isSel);
      const peak=proj3(o.x,o.y,o.h*1.15);
      if(peak&&pTop){
        ctx.fillStyle='#fef3c7';ctx.beginPath();ctx.arc(peak.sx,peak.sy,clamp(pBase.sc*0.9,4,16),0,Math.PI*2);ctx.fill();
      }
    }else if(o.kind==='trap1'||o.kind==='trap2'){
      box=drawBox3D(o.x,o.y,2.8,o.h,'#fbbf24','#b45309','#d97706','#fde68a',isSel);
      if(pTop){ctx.font=`${clamp(Math.round(pBase.sc*0.9),12,24)}px sans-serif`;ctx.textAlign='center';ctx.fillText('🐻',pTop.sx,pTop.sy-2)}
    }else if(o.kind==='city'){
      const topC=dark?'#dbeafe':'#ffffff';
      const wA=dark?'#263b54':'#9fb7cf', wB=dark?'#365173':'#c3d7eb';
      box=drawBox3D(o.x,o.y,1.9,o.h,topC,wA,wB,o.color,isSel);
      // 頂面聯盟色核心（火晶城藍光、一般城橘光）
      if(pTop){
        ctx.fillStyle=(o.furn||0)>30?'#38bdf8':'#fb923c';
        ctx.beginPath();ctx.arc(pTop.sx,pTop.sy,clamp(pBase.sc*0.26,2,9),0,Math.PI*2);ctx.fill();
      }
      if(o.shield&&box){
        const r=Math.max((box.maxX-box.minX)*0.64,(box.maxY-box.minY)*0.75);
        ctx.fillStyle='rgba(56,189,248,.16)';ctx.strokeStyle='rgba(56,189,248,.82)';ctx.lineWidth=1.6;
        ctx.beginPath();ctx.arc((box.minX+box.maxX)/2,box.maxY-r*0.2,r,Math.PI,0);ctx.closePath();ctx.fill();ctx.stroke();
      }
      if(o.burn&&pTop){
        ctx.font=`${clamp(Math.round(pBase.sc*0.65),11,22)}px sans-serif`;ctx.textAlign='center';
        ctx.fillText('🔥',pTop.sx,pTop.sy-4-Math.sin(now*0.01)*2.5);
      }
    }else{
      // 官方設施（要塞／堡壘／工程站）或聯盟總部
      box=drawBox3D(o.x,o.y,o.size*0.9,o.h,o.color,dark?'#334155':'#64748b',dark?'#475569':'#94a3b8','#ffffff',isSel);
    }
    ctx.restore();

    if(box){
      sv.hitBoxes.push({key:o.key,x:box.minX-4,y:box.minY-18,w:box.maxX-box.minX+8,h:box.maxY-box.minY+22});
      const showLbl=isSel||o.kind==='castle'||o.kind==='trap1'||o.kind==='trap2'||o.kind==='hq'||o.kind==='hq2'||o.kind==='sh'||o.kind==='ft'||dTarget<Math.max(18,sv.dist*0.75);
      if(showLbl){
        labelCands.push({o,cz,sx:(box.minX+box.maxX)/2,ly:clamp(box.minY-20,44,h-84),isSel});
      }
    }
  }

  // 非重疊名牌繪製
  labelCands.sort((a,b)=>(b.isSel?2:0)-(a.isSel?2:0)||((b.o.kind!=='city'?1:0)-(a.o.kind!=='city'?1:0))||a.cz-b.cz);
  const used=[];let drawn=0;
  for(const c of labelCands){
    if(drawn>=10&&!c.isSel)break;
    ctx.font=(c.isSel?'800 ':'700 ')+'11px -apple-system,sans-serif';
    const txt=(c.o.al&&c.o.kind==='city'?`[${c.o.al}] ${c.o.name}`:c.o.name).slice(0,13);
    const tw=ctx.measureText(txt).width+12, th=18;
    const lx=clamp(c.sx-tw/2,6,w-tw-6), ly=c.ly;
    if(!c.isSel&&used.some(u=>lx<u.x+u.w+4&&lx+tw+4>u.x&&ly<u.y+u.h+4&&ly+th+4>u.y))continue;
    used.push({x:lx,y:ly,w:tw,h:th});drawn++;
    ctx.save();
    ctx.fillStyle=c.isSel?'#facc15':(dark?'rgba(9,19,35,.84)':'rgba(255,255,255,.92)');
    ctx.beginPath();if(ctx.roundRect)ctx.roundRect(lx,ly,tw,th,7);else ctx.rect(lx,ly,tw,th);ctx.fill();
    ctx.fillStyle=c.isSel?'#0f172a':(dark?'#f8fafc':'#0f172a');
    ctx.textAlign='center';ctx.fillText(txt,lx+tw/2,ly+12.5);ctx.restore();
  }

  // 5. 飄雪粒子（斜視角度低於 60° 時顯示）
  if(sv.pitch<1.05){
    if(!sv.snow.length)for(let i=0;i<30;i++)sv.snow.push({x:Math.random()*w,y:Math.random()*h,r:1+Math.random()*1.8,sp:0.4+Math.random()*0.8});
    ctx.fillStyle=dark?'rgba(255,255,255,.5)':'rgba(255,255,255,.78)';
    sv.snow.forEach(f=>{
      f.y+=f.sp;f.x+=Math.sin(now*0.001+f.y*0.03)*0.3;
      if(f.y>h){f.y=-4;f.x=Math.random()*w}if(f.x<0)f.x=w;if(f.x>w)f.x=0;
      ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill();
    });
  }

  // 6. 右下角同步迷你雷達
  const mr=44, mx=w-mr-10, my=h-mr-10;
  ctx.save();
  ctx.beginPath();ctx.arc(mx,my,mr,0,Math.PI*2);
  ctx.fillStyle=dark?'rgba(9,19,35,.8)':'rgba(255,255,255,.88)';ctx.fill();
  ctx.strokeStyle=dark?'rgba(125,211,252,.45)':'rgba(37,99,235,.4)';ctx.lineWidth=1.8;ctx.stroke();
  ctx.clip();
  const ang=sv.yaw-Math.PI/2;
  ctx.fillStyle='rgba(250,204,21,.25)';
  ctx.beginPath();ctx.moveTo(mx,my);ctx.arc(mx,my,mr,ang-0.55,ang+0.55);ctx.closePath();ctx.fill();
  const rSpan=Math.max(45,sv.dist*1.4), rScale=mr/rSpan;
  objs.forEach(o=>{
    const dx=o.x-sv.tx, dy=o.y-sv.ty;
    if(Math.abs(dx)>rSpan||Math.abs(dy)>rSpan)return;
    ctx.fillStyle=o.color;
    ctx.beginPath();ctx.arc(mx+dx*rScale,my-dy*rScale,o.kind==='city'?2.2:3.5,0,Math.PI*2);ctx.fill();
  });
  ctx.fillStyle='#facc15';ctx.strokeStyle='#0f172a';ctx.lineWidth=1.3;
  ctx.beginPath();ctx.arc(mx,my,3.8,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.restore();

  // 更新頂部羅盤＋仰角＋座標
  const comp=document.getElementById('mpSvCompass');
  if(comp){
    const deg=((Math.round(sv.yaw*180/Math.PI)%360)+360)%360;
    const pDeg=Math.round(sv.pitch*180/Math.PI);
    const dirs=['北 N','東北 NE','東 E','東南 SE','南 S','西南 SW','西 W','西北 NW'];
    comp.textContent=`🧭 ${dirs[Math.round(deg/45)%8]} ${deg}° · 斜視 ${pDeg}°｜X:${Math.round(sv.tx)} Y:${Math.round(sv.ty)}`;
  }
  const pv=document.getElementById('mpPitchVal'), ps=document.getElementById('mpPitchSlider');
  const pDeg=Math.round(sv.pitch*180/Math.PI);
  if(pv)pv.textContent=pDeg+'°';
  if(ps&&document.activeElement!==ps)ps.value=String(pDeg);
}

/* ===== 動畫迴圈 ===== */
function tick(ts){
  if(!M.mounted)return;
  const dt=M.lastTs?Math.min(0.05,(ts-M.lastTs)/1000):0.016;
  M.lastTs=ts;

  if(M.mode==='map'&&M.flyAnim){
    const p=clamp((ts-M.flyAnim.t0)/M.flyAnim.dur,0,1), e=1-Math.pow(1-p,3);
    M.cam.x=M.flyAnim.from.x+(M.flyAnim.to.x-M.flyAnim.from.x)*e;
    M.cam.y=M.flyAnim.from.y+(M.flyAnim.to.y-M.flyAnim.from.y)*e;
    M.cam.scale=M.flyAnim.from.scale+(M.flyAnim.to.scale-M.flyAnim.from.scale)*e;
    if(p>=1)M.flyAnim=null;
  }

  // Google Earth 四向巡航移動（方向自動對齊目前視角）
  if(M.mode==='street'&&M.sv.holdDir){
    const spd=Math.max(10,M.sv.dist*0.55)*dt;
    const sY=Math.sin(M.sv.yaw), cY=Math.cos(M.sv.yaw);
    if(M.sv.holdDir==='fwd'){M.sv.tx=clamp(M.sv.tx+sY*spd,0,WORLD);M.sv.ty=clamp(M.sv.ty+cY*spd,0,WORLD)}
    else if(M.sv.holdDir==='back'){M.sv.tx=clamp(M.sv.tx-sY*spd,0,WORLD);M.sv.ty=clamp(M.sv.ty-cY*spd,0,WORLD)}
    else if(M.sv.holdDir==='left'){M.sv.tx=clamp(M.sv.tx-cY*spd,0,WORLD);M.sv.ty=clamp(M.sv.ty+sY*spd,0,WORLD)}
    else if(M.sv.holdDir==='right'){M.sv.tx=clamp(M.sv.tx+cY*spd,0,WORLD);M.sv.ty=clamp(M.sv.ty-sY*spd,0,WORLD)}
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

/* ===== Canvas 觸控與滑鼠互動 ===== */
function bindCanvas(cv){
  const ptrs=new Map();
  let startP=null, moved=false, pinchDist0=0, pinchScale0=1;
  let draggingPieceId=null, panCam0=null, sv0=null, svMode='orbit';

  function posOf(e){const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
  function hitBoardPiece(sx,sy){
    const wp=boardScreenToWorld(sx,sy,cv.clientWidth,cv.clientHeight);
    for(let i=M.board.pieces.length-1;i>=0;i--){
      const p=M.board.pieces[i];
      if(wp.x>=p.x&&wp.x<=p.x+p.size&&wp.y>=p.y&&wp.y<=p.y+p.size)return p;
    }
    return null;
  }
  function hitMapTarget(sx,sy){
    const w=cv.clientWidth, h=cv.clientHeight, wd=getWorldData();
    let best=null, bd=22;
    for(const p of wd.players){
      if(M.alFilter==='ours'&&p.al!=='jQt'&&p.al!=='aQt')continue;
      if(M.alFilter!=='all'&&M.alFilter!=='ours'&&p.al!==M.alFilter)continue;
      const pt=mapWorldToScreen(p.x,p.y,w,h), d=Math.hypot(pt.x-sx,pt.y-sy);
      if(d<bd){bd=d;best={type:'city',p}}
    }
    if(!best&&M.showFacs){
      for(const f of WORLD_FACS){
        const pt=mapWorldToScreen(f.cx,f.cy,w,h), d=Math.hypot(pt.x-sx,pt.y-sy);
        if(d<bd){bd=d;best={type:'fac',f}}
      }
    }
    return best;
  }

  cv.addEventListener('contextmenu',e=>{if(M.mode==='street')e.preventDefault()});
  cv.addEventListener('pointerdown',e=>{
    cv.setPointerCapture(e.pointerId);
    const pt=posOf(e);
    ptrs.set(e.pointerId,pt);
    moved=false;M.flyAnim=null;
    if(ptrs.size===2){
      const arr=[...ptrs.values()];
      pinchDist0=Math.hypot(arr[1].x-arr[0].x,arr[1].y-arr[0].y)||1;
      pinchScale0=M.mode==='board'?M.board.cam.tile:M.mode==='street'?M.sv.dist:M.cam.scale;
      draggingPieceId=null;M.board.drag=null;
      return;
    }
    startP=pt;
    if(M.mode==='map'){
      panCam0={x:M.cam.x,y:M.cam.y};
    }else if(M.mode==='board'){
      panCam0={x:M.board.cam.x,y:M.board.cam.y};
      if(!M.measure.on&&M.board.tool==='move'){
        const hit=hitBoardPiece(pt.x,pt.y);
        if(hit){draggingPieceId=hit.id;M.board.selId=hit.id}
      }
    }else if(M.mode==='street'){
      sv0={tx:M.sv.tx,ty:M.sv.ty,yaw:M.sv.yaw,pitch:M.sv.pitch};
      // 電腦右鍵或 Shift 鍵可臨時切換旋轉/平移，手機依上方按鈕模式
      const flip=(e.button===2||e.shiftKey);
      svMode=flip?(M.sv.gesture==='orbit'?'pan':'orbit'):M.sv.gesture;
    }
  });

  cv.addEventListener('pointermove',e=>{
    const pt=posOf(e);
    if(M.mode==='map'&&!ptrs.size){M.cursorW=mapScreenToWorld(pt.x,pt.y,cv.clientWidth,cv.clientHeight);return}
    if(!ptrs.has(e.pointerId))return;
    ptrs.set(e.pointerId,pt);

    if(ptrs.size===2){
      const arr=[...ptrs.values()];
      const dist=Math.hypot(arr[1].x-arr[0].x,arr[1].y-arr[0].y)||1;
      const ratio=dist/pinchDist0;
      if(M.mode==='map')M.cam.scale=clamp(pinchScale0*ratio,0.35,42);
      else if(M.mode==='board')M.board.cam.tile=clamp(pinchScale0*ratio,8,56);
      else if(M.mode==='street')M.sv.dist=clamp(pinchScale0/ratio,8,260);
      moved=true;return;
    }
    if(!startP)return;
    const dx=pt.x-startP.x, dy=pt.y-startP.y;
    if(Math.hypot(dx,dy)>6)moved=true;

    if(M.mode==='map'&&panCam0){
      const w=cv.clientWidth, h=cv.clientHeight;
      const w0=mapScreenToWorld(startP.x,startP.y,w,h), w1=mapScreenToWorld(pt.x,pt.y,w,h);
      M.cam.x=clamp(panCam0.x-(w1.x-w0.x),0,WORLD);M.cam.y=clamp(panCam0.y-(w1.y-w0.y),0,WORLD);
    }else if(M.mode==='board'){
      if(draggingPieceId&&moved){
        const p=M.board.pieces.find(x=>x.id===draggingPieceId);
        if(p){
          const wp=boardScreenToWorld(pt.x,pt.y,cv.clientWidth,cv.clientHeight);
          let tx=clamp(Math.round(wp.x-p.size/2),0,WORLD-p.size);
          let ty=clamp(Math.round(wp.y-p.size/2),0,WORLD-p.size);
          const sn=snapToTemplate(tx,ty,p.size);
          tx=clamp(sn.x,0,WORLD-p.size);ty=clamp(sn.y,0,WORLD-p.size);
          M.board.drag={id:p.id,tx,ty,ok:!boardCollides(tx,ty,p.size,p.id)};
        }
      }else if(panCam0&&!draggingPieceId){
        M.board.cam.x=clamp(panCam0.x-dx/M.board.cam.tile,0,WORLD);
        M.board.cam.y=clamp(panCam0.y+dy/M.board.cam.tile,0,WORLD);
      }
    }else if(M.mode==='street'&&sv0){
      if(svMode==='orbit'){
        // Google Earth 風格：左右滑 360° 旋轉，上下滑自由調整上下斜視仰角 (12° ~ 85°)！
        M.sv.yaw=sv0.yaw-(dx/(cv.clientWidth||360))*Math.PI*1.35;
        M.sv.pitch=clamp(sv0.pitch+(dy/(cv.clientHeight||440))*Math.PI*0.75,12*Math.PI/180,85*Math.PI/180);
      }else{
        // Google Earth 平移滑行（依目前視角方向在地面滑動）
        const scale=M.sv.dist/(Math.min(cv.clientWidth,cv.clientHeight)||360)*1.35;
        const sY=Math.sin(sv0.yaw), cY=Math.cos(sv0.yaw);
        const rightMove=-dx*scale, fwdMove=dy*scale;
        M.sv.tx=clamp(sv0.tx+rightMove*cY+fwdMove*sY,0,WORLD);
        M.sv.ty=clamp(sv0.ty-rightMove*sY+fwdMove*cY,0,WORLD);
      }
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
      const w=cv.clientWidth, h=cv.clientHeight;
      if(M.mode==='map'){
        if(M.measure.on){
          const wp=mapScreenToWorld(pt.x,pt.y,w,h);
          M.measure.pts.push(snapMeasurePoint(wp.x,wp.y,w,h,'map'));
          A.render&&A.render();startP=null;return;
        }
        const hit=hitMapTarget(pt.x,pt.y);
        if(hit&&hit.type==='city'){M.selFid=hit.p.fid;M.selFacId=''}
        else if(hit&&hit.type==='fac'){M.selFacId=hit.f.id;M.selFid=''}
        else{M.selFid='';M.selFacId=''}
        A.render&&A.render();
      }else if(M.mode==='board'){
        const wp=boardScreenToWorld(pt.x,pt.y,w,h);
        if(M.measure.on){
          M.measure.pts.push(snapMeasurePoint(wp.x,wp.y,w,h,'board'));
          A.render&&A.render();startP=null;return;
        }
        const gx=Math.floor(wp.x), gy=Math.floor(wp.y);
        if(M.board.tool==='move'){
          const hit=hitBoardPiece(pt.x,pt.y);
          if(hit){M.board.selId=hit.id;A.render&&A.render()}
          else if(M.board.selId){
            const sel=M.board.pieces.find(x=>x.id===M.board.selId);
            if(sel){
              let tx=clamp(Math.floor(wp.x-sel.size/2+0.5),0,WORLD-sel.size);
              let ty=clamp(Math.floor(wp.y-sel.size/2+0.5),0,WORLD-sel.size);
              const sn=snapToTemplate(tx,ty,sel.size);
              tx=clamp(sn.x,0,WORLD-sel.size);ty=clamp(sn.y,0,WORLD-sel.size);
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
              const np={id:M.board.tool+'_'+Date.now().toString(36),kind:M.board.tool,al:M.board.tool==='obs'?'':M.board.placeAl,name:meta.label,x:tx,y:ty,ox:tx,oy:ty,size:meta.size};
              M.board.pieces.unshift(np);M.board.selId=np.id;
              if(M.board.tool==='trap1'){M.board.tplOx=tx;M.board.tplOy=ty}
              if(M.board.tool==='trap1'||M.board.tool==='trap2'||M.board.tool==='hq'||M.board.tool==='hq2')M.board.tool='move';
              simSave();A.render&&A.render();
            }
          }
        }
      }else if(M.mode==='street'){
        let hitKey='';
        for(let i=M.sv.hitBoxes.length-1;i>=0;i--){
          const b=M.sv.hitBoxes[i];
          if(pt.x>=b.x&&pt.x<=b.x+b.w&&pt.y>=b.y&&pt.y<=b.y+b.h){hitKey=b.key;break}
        }
        M.sv.selKey=hitKey;A.render&&A.render();
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
    else if(M.mode==='street')M.sv.dist=clamp(M.sv.dist*(e.deltaY<0?0.86:1.16),8,260);
  },{passive:false});
}

function bindDpad(){
  const dp=document.getElementById('mpDpad');
  if(!dp)return;
  const stop=()=>{M.sv.holdDir=''};
  dp.querySelectorAll('[data-svhold]').forEach(btn=>{
    btn.addEventListener('pointerdown',e=>{e.preventDefault();M.sv.holdDir=btn.dataset.svhold});
    btn.addEventListener('pointerup',stop);btn.addEventListener('pointercancel',stop);btn.addEventListener('pointerleave',stop);
  });
}

function mount(){
  const cv=document.getElementById('mpCanvas');
  if(!cv)return;
  bindCanvas(cv);bindDpad();
  if(!M.mounted){M.mounted=true;M.lastTs=0;M.raf=requestAnimationFrame(tick)}
}
function unmount(){
  M.mounted=false;M.sv.holdDir='';
  if(M.raf){cancelAnimationFrame(M.raf);M.raf=0}
}

/* ===== 搜尋與外部跳轉 ===== */
function searchPlayersHtml(q,actName){
  const A=app(), nz=A.nz||(s=>String(s).toLowerCase()), esc=A.esc||(s=>s), wd=getWorldData();
  const nq=nz(q);if(!nq)return'';
  const cm=q.trim().match(/^(\d{1,4})[\s,:：]+(\d{1,4})$/);
  let html='';
  if(cm){
    const x=clamp(+cm[1],0,WORLD), y=clamp(+cm[2],0,WORLD);
    html+=`<div class="sg" data-mp="${actName==='svPick'?'svAt':'fly'}" data-x="${x}" data-y="${y}" data-s="16"><b>📍 前往座標 X:${x} · Y:${y}</b><span class="sub">${zoneOf(x,y).l}</span></div>`;
  }
  // 同時搜尋官方設施
  WORLD_FACS.filter(f=>nz(f.name).includes(nq)).slice(0,4).forEach(f=>{
    html+=`<div class="sg" data-mp="${actName==='svPick'?'svAt':'fly'}" data-x="${f.cx}" data-y="${f.cy}" data-s="10"><span><b>${esc(f.name)}</b> <span class="bd">官方設施</span></span><span class="sub mono">X:${f.x} Y:${f.y}</span></div>`;
  });
  const hits=wd.players.filter(p=>nz(p.name).includes(nq)||nz(p.al).includes(nq)||p.fid.includes(nq)).slice(0,6);
  html+=hits.map(p=>`<div class="sg" data-mp="${actName}" data-v="${esc(p.fid)}"><span><b>${esc(p.name)}</b> <span class="bd a">${esc(p.al||'無')}</span></span><span class="sub mono">X:${p.x} Y:${p.y}</span></div>`).join('');
  return html?`<div class="sug">${html}</div>`:'<div class="sub">找不到符合的玩家或設施</div>';
}

function focusPlayerOnMap(fid){
  const A=app(), wd=getWorldData(), p=wd.byFid[fid];
  M.mode='map';M.measure.on=false;
  if(p){M.selFid=fid;M.selFacId='';M.alFilter='all';flyMapTo(p.x,p.y,18)}
  else A.toast&&A.toast('此玩家尚未同步到地圖座標');
  A.goTab&&A.goTab('map');
}
function focusPlayerInStreet(fid){
  const A=app(), wd=getWorldData(), p=wd.byFid[fid];
  M.mode='street';M.sv.useSim=false;
  if(p){M.sv.tx=p.x;M.sv.ty=p.y;M.sv.dist=22;M.sv.pitch=32*Math.PI/180;M.sv.selKey='p_'+fid}
  else A.toast&&A.toast('此玩家尚未同步到地圖座標');
  A.goTab&&A.goTab('map');
}

/* ===== 事件處理 ===== */
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-mp]');
  if(!el)return;
  const A=app(), wd=getWorldData(), act=el.dataset.mp, v=el.dataset.v||'';
  switch(act){
    case'mode':M.mode=v;if(v==='board')simLoadFromStorage();A.render&&A.render();break;
    case'refresh':if(A.EX){A.EX.detTried=false;M.cacheSig='';A.loadExtraDetail&&A.loadExtraDetail().then(()=>A.render&&A.render());A.toast&&A.toast('重新載入王國座標…')}break;
    case'proj':M.proj=v;A.render&&A.render();break;
    case'togFacs':M.showFacs=!M.showFacs;A.render&&A.render();break;
    case'togMarks':M.showMarks=!M.showMarks;A.render&&A.render();break;
    case'togMeasure':M.measure.on=!M.measure.on;A.render&&A.render();break;
    case'mPop':M.measure.pts.pop();A.render&&A.render();break;
    case'mClr':M.measure.pts=[];M.measure.qa='';M.measure.qb='';A.render&&A.render();break;
    case'mFromHere':M.measure.on=true;M.measure.pts=[{x:Number(el.dataset.x),y:Number(el.dataset.y),label:el.dataset.l||'起點'}];A.toast&&A.toast('已設為測距起點 A，請在地圖上點選終點 B');A.render&&A.render();break;
    case'mQuick':{
      const ts=getMeasureTargets(wd);
      const a=ts.find(x=>x.key===M.measure.qa), b=ts.find(x=>x.key===M.measure.qb);
      if(!a||!b){A.toast&&A.toast('請先選起點與終點設施');break}
      M.measure.pts=[{x:a.x,y:a.y,label:a.label},{x:b.x,y:b.y,label:b.label}];
      const d=Math.hypot(b.x-a.x,b.y-a.y);
      if(M.mode==='map')flyMapTo((a.x+b.x)/2,(a.y+b.y)/2,clamp(260/Math.max(20,d),0.55,14));
      A.render&&A.render();break;
    }
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
      const fac=WORLD_FACS.find(f=>nz(f.name).includes(nq));
      const hit=wd.players.find(p=>nz(p.name).includes(nq)||p.fid===q);
      if(hit){M.selFid=hit.fid;M.selFacId='';flyMapTo(hit.x,hit.y,18);A.render&&A.render()}
      else if(fac){M.selFacId=fac.id;M.selFid='';flyMapTo(fac.cx,fac.cy,10);A.render&&A.render()}
      else{const h=wd.hives.find(x=>nz(x.al)===nq);if(h)flyMapTo(h.x,h.y,10);else A.toast&&A.toast('找不到該玩家、設施或座標')}
      break;
    }
    case'pickMap':{const p=wd.byFid[v];if(p){M.selFid=v;M.selFacId='';M.search='';flyMapTo(p.x,p.y,18);A.render&&A.render()}break}
    case'clearSel':M.selFid='';M.selFacId='';A.render&&A.render();break;
    case'openCard':A.openSheet&&A.openSheet({kind:'player',fid:v,tab:'gear'});break;
    case'toStreet':focusPlayerInStreet(v);break;
    case'toBoard':{
      const p=wd.byFid[v];M.mode='board';M.measure.on=false;simLoadFromStorage();
      if(p){
        if(!M.board.pieces.some(x=>x.fid===v)){
          M.board.pieces.push({id:'c_'+v,kind:'city',fid:v,name:p.name,al:p.al,power:p.power,furn:p.furn,x:Math.round(p.x),y:Math.round(p.y),ox:Math.round(p.x),oy:Math.round(p.y),size:2});
          simSave();
        }
        M.board.selId='c_'+v;M.board.cam.x=p.x;M.board.cam.y=p.y;M.board.cam.tile=28;
      }
      A.render&&A.render();break;
    }
    case'bTool':{
      if(v==='measure'){M.measure.on=!M.measure.on}
      else{M.measure.on=false;M.board.tool=v}
      A.render&&A.render();break;
    }
    case'bZoom':M.board.cam.tile=clamp(M.board.cam.tile*Number(v||1),8,56);break;
    case'bCenter':{
      if(M.board.pieces.length){
        const xs=M.board.pieces.map(p=>p.x).sort((a,b)=>a-b), ys=M.board.pieces.map(p=>p.y).sort((a,b)=>a-b);
        M.board.cam.x=xs[Math.floor(xs.length/2)];M.board.cam.y=ys[Math.floor(ys.length/2)];
      }
      break;
    }
    case'bDetectBear':{
      const sp=detectBearSpot();
      if(!sp){A.toast&&A.toast('附近找不到合適的 3×3 熊洞空位');break}
      const existing=M.board.pieces.find(p=>p.kind==='trap1'&&p.al===M.board.placeAl);
      if(existing){existing.x=sp.x;existing.y=sp.y;M.board.selId=existing.id}
      else{
        const np={id:'trap1_'+Date.now().toString(36),kind:'trap1',al:M.board.placeAl,name:BLD_META.trap1.label,x:sp.x,y:sp.y,ox:sp.x,oy:sp.y,size:3};
        M.board.pieces.unshift(np);M.board.selId=np.id;
      }
      M.board.tplOx=sp.x;M.board.tplOy=sp.y;M.board.cam.x=sp.x+1.5;M.board.cam.y=sp.y+1.5;
      simSave();A.toast&&A.toast(`已偵測最佳熊洞位置 (${sp.x}, ${sp.y}) 並標記熊陷阱一！`);A.render&&A.render();break;
    }
    case'bLoadReal':simLoadReal(M.board.scope,false);A.render&&A.render();break;
    case'bResetAll':M.board.pieces.forEach(p=>{if(p.kind==='city'){p.x=p.ox;p.y=p.oy}});simSave();A.toast&&A.toast('已復原全部城池到真實座標');A.render&&A.render();break;
    case'bCopy':A.copyText&&A.copyText(buildRelocReport());break;
    case'bExpMarks':{
      const ms=getAllianceLandmarks();
      if(!ms.length){A.toast&&A.toast('尚未標記任何聯盟地標（請先放置熊陷阱／總部／旗幟）');break}
      const txt=ms.map(m=>`${m.al||'jQt'} ${BLD_META[m.kind].short} X:${m.x} Y:${m.y}`).join('\n');
      A.copyText&&A.copyText('🚩【2611 聯盟地標座標】\n'+txt);break;
    }
    case'bTogRings':M.board.showRings=!M.board.showRings;A.render&&A.render();break;
    case'bTogTerr':M.board.showTerr=!M.board.showTerr;A.render&&A.render();break;
    case'tplAlign':alignTemplateToTrap();simSave();A.toast&&A.toast(`建議圖層已對齊 (${M.board.tplOx}, ${M.board.tplOy})`);A.render&&A.render();break;
    case'tplSnap':M.board.tplSnap=!M.board.tplSnap;simSave();A.render&&A.render();break;
    case'tplAuto':autoFillTemplateByPower();A.render&&A.render();break;
    case'tplNudge':M.board.tplOx=clamp(M.board.tplOx+Number(el.dataset.dx||0),0,WORLD);M.board.tplOy=clamp(M.board.tplOy+Number(el.dataset.dy||0),0,WORLD);simSave();A.render&&A.render();break;
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
      const cx=Math.round(M.board.cam.x), cy=Math.round(M.board.cam.y);
      let fx=cx, fy=cy, ok=false;
      for(let rad=0;rad<=18&&!ok;rad++)for(let dx=-rad;dx<=rad&&!ok;dx++)for(let dy=-rad;dy<=rad&&!ok;dy++){
        if(Math.max(Math.abs(dx),Math.abs(dy))!==rad)continue;
        if(!boardCollides(cx+dx,cy+dy,2,'')){fx=cx+dx;fy=cy+dy;ok=true}
      }
      const ex=wd.byFid[v];
      M.board.pieces.push({id:'c_'+v,kind:'city',fid:v,name:r.name,al:r.al,power:r.power,furn:r.furn,x:fx,y:fy,ox:ex?Math.round(ex.x):fx,oy:ex?Math.round(ex.y):fy,size:2});
      M.board.selId='c_'+v;M.board.addQ='';simSave();A.toast&&A.toast('已將 '+r.name+' 放入棋盤');A.render&&A.render();break;
    }
    case'bPreviewSv':{
      M.mode='street';M.sv.useSim=true;M.sv.tx=M.board.cam.x;M.sv.ty=M.board.cam.y;M.sv.pitch=38*Math.PI/180;M.sv.dist=32;M.sv.selKey='';
      A.render&&A.render();break;
    }
    case'svGest':M.sv.gesture=v;A.render&&A.render();break;
    case'svSim':M.sv.useSim=!M.sv.useSim;M.sv.selKey='';A.render&&A.render();break;
    case'svPitchStep':M.sv.pitch=clamp(M.sv.pitch+Number(v||0)*Math.PI/180,12*Math.PI/180,85*Math.PI/180);break;
    case'svDistStep':M.sv.dist=clamp(M.sv.dist*Number(v||1),8,260);break;
    case'svNorth':M.sv.yaw=0;break;
    case'svPreset':M.sv.pitch=clamp(Number(el.dataset.p||38),12,85)*Math.PI/180;if(el.dataset.d)M.sv.dist=Number(el.dataset.d);A.render&&A.render();break;
    case'svClearSel':M.sv.selKey='';A.render&&A.render();break;
    case'svGo':{
      if(v==='castle'){M.sv.tx=CENTER;M.sv.ty=CENTER;M.sv.dist=46;M.sv.pitch=34*Math.PI/180;M.sv.selKey='castle';A.render&&A.render();break}
      const h=wd.hives.find(x=>x.al===v);
      if(h){M.sv.tx=h.x;M.sv.ty=h.y;M.sv.dist=30;M.sv.pitch=36*Math.PI/180;M.sv.selKey='';A.render&&A.render()}
      else A.toast&&A.toast('尚未找到 '+v+' 的聚落座標');
      break;
    }
    case'svAt':M.mode='street';M.sv.tx=Number(el.dataset.x||CENTER);M.sv.ty=Number(el.dataset.y||CENTER);M.sv.dist=28;M.sv.pitch=36*Math.PI/180;M.sv.selKey='';A.render&&A.render();break;
    case'svPick':focusPlayerInStreet(v);break;
    case'svFocus':M.sv.tx=Number(el.dataset.x||CENTER);M.sv.ty=Number(el.dataset.y||CENTER);M.sv.dist=18;A.render&&A.render();break;
  }
});

document.addEventListener('input',e=>{
  const t=e.target, id=t.id, A=app();
  if(id==='mpSearch'){M.search=t.value;const box=document.getElementById('mpSug');if(box)box.innerHTML=searchPlayersHtml(t.value,'pickMap')}
  else if(id==='mpSvSearch'){const box=document.getElementById('mpSvSug');if(box)box.innerHTML=searchPlayersHtml(t.value,'svPick')}
  else if(id==='mpPitchSlider'){M.sv.pitch=clamp(Number(t.value)||36,12,85)*Math.PI/180}
  else if(id==='mpBAdd'){
    M.board.addQ=t.value;const box=document.getElementById('mpBAddSug');if(!box)return;
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
  else if(t.id==='mpPlaceAl'){M.board.placeAl=t.value;simSave()}
  else if(t.id==='mpTplSel'){
    M.board.tpl=t.value;
    if(t.value!=='none')alignTemplateToTrap();
    simSave();A.render&&A.render();
  }
  else if(t.id==='mpMQa'){M.measure.qa=t.value}
  else if(t.id==='mpMQb'){M.measure.qb=t.value}
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
