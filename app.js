const $=id=>document.getElementById(id);
const PI=Math.PI,SQ3=Math.sqrt(3);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rnd=n=>Math.floor(Math.random()*n);

/* ---------- sound (Web Audio, no files) ---------- */
const AU={ctx:null,on:true,music:true};
function auInit(){
  if(AU.ctx){if(AU.ctx.state==='suspended')AU.ctx.resume();return;}
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  AU.ctx=new C();AU.master=AU.ctx.createGain();AU.master.gain.value=.55;AU.master.connect(AU.ctx.destination);
  AU.sfx=AU.ctx.createGain();AU.sfx.connect(AU.master);AU.mus=AU.ctx.createGain();AU.mus.gain.value=.22;AU.mus.connect(AU.master);
  startBgm();
}
function tone(freq,dur,type,vol,slide,when,dest){
  const c=AU.ctx;if(!c||!AU.on)return;const t=c.currentTime+(when||0);
  const o=c.createOscillator(),g=c.createGain();o.type=type||'square';o.frequency.setValueAtTime(freq,t);
  if(slide&&slide!==1)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*slide),t+dur);
  g.gain.setValueAtTime(vol||.15,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g);g.connect(dest||AU.sfx);o.start(t);o.stop(t+dur+.03);
}
let noiseBuf=null;
function noise(dur,vol,when,lp,dest){
  const c=AU.ctx;if(!c||!AU.on)return;const t=c.currentTime+(when||0);
  if(!noiseBuf){noiseBuf=c.createBuffer(1,c.sampleRate*1.2,c.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
  const s=c.createBufferSource();s.buffer=noiseBuf;const f=c.createBiquadFilter();f.type='lowpass';
  f.frequency.setValueAtTime(lp||2000,t);f.frequency.exponentialRampToValueAtTime(80,t+dur);
  const g=c.createGain();g.gain.setValueAtTime(vol||.3,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  s.connect(f);f.connect(g);g.connect(dest||AU.sfx);s.start(t);s.stop(t+dur+.03);
}
const SFX={
  select:()=>tone(880,.06,'square',.1),
  step:()=>tone(520,.04,'triangle',.08,1.4),
  cancel:()=>tone(330,.09,'square',.09,.6),
  beam:()=>{tone(1500,.4,'sawtooth',.16,.12);tone(750,.4,'square',.07,.2);},
  missile:()=>{noise(.45,.14,0,3500);tone(220,.45,'sawtooth',.05,2.2);},
  blade:()=>{noise(.16,.28,0,7000);tone(1300,.14,'triangle',.12,.3);},
  drill:()=>{for(let i=0;i<7;i++)tone(170+i*25,.07,'sawtooth',.11,1.25,i*.045);},
  hit:()=>{noise(.35,.42,0,1600);tone(130,.3,'square',.14,.4);},
  miss:()=>tone(500,.18,'sine',.12,2.4),
  boom:()=>{noise(1.1,.6,0,1000);tone(90,.9,'sawtooth',.2,.3);},
  capture:()=>[523,659,784,1047].forEach((f,i)=>tone(f,.13,'square',.11,1,i*.08)),
  produce:()=>[392,523,659,784].forEach((f,i)=>tone(f,.1,'triangle',.15,1,i*.06)),
  heal:()=>[659,784,988,1319].forEach((f,i)=>tone(f,.12,'sine',.14,1,i*.07)),
  start:()=>[392,523,659,784,1047].forEach((f,i)=>tone(f,.14,'square',.12,1,i*.07)),
  alert:()=>{tone(880,.12,'sawtooth',.1);tone(660,.2,'sawtooth',.1,1,.14);},
  special:()=>{[392,523,659,784,1047,1319].forEach((f,i)=>tone(f,.16,'sawtooth',.12,1,i*.06));noise(.7,.3,.35,3000);},
  turn:()=>{tone(392,.14,'square',.11);tone(587,.28,'square',.11,1,.12);},
  win:()=>[523,659,784,1047,784,1047].forEach((f,i)=>tone(f,.24,'square',.13,1,i*.15)),
  lose:()=>[392,349,311,262].forEach((f,i)=>tone(f,.34,'triangle',.15,1,i*.24))
};
const WEAPON_SFX=['beam','missile','drill','blade','beam','beam','blade','missile','blade'];
const mf=m=>440*Math.pow(2,(m-69)/12);
const DR={
  four:['kh','h','sh','h','kh','h','sh','h','kh','h','sh','h','kh','h','sh','kh'],
  sync:['kh','','h','k','sh','','h','','kh','','h','k','sh','','h','h'],
  half:['kh','','h','','s','','h','','kh','','h','k','s','','h',''],
  march:['kh','h','sh','h','kh','h','sh','h','kh','h','sh','h','kh','sh','sh','sh'],
  drift:['','h','','h','','h','','h','','h','','h','','h','','h']};
const BS={drive:[1,0,1,1,1,0,1,2,1,0,1,1,1,0,2,1],pulse:[1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2],walk:[1,0,0,1,0,0,1,0,2,0,0,2,0,1,0,0],drift:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],off:[1,0,1,0,2,0,1,0,1,0,1,0,2,0,1,1]};
const LD={a:[3,-1,4,3,5,-1,4,3,2,-1,3,4,5,4,3,-1],b:[0,2,4,2,5,4,2,0,1,3,5,3,4,2,1,-1],c:[4,4,-1,3,4,-1,5,4,3,-1,2,3,4,-1,5,-1],d:[5,-1,3,-1,4,-1,3,2,5,-1,3,-1,4,3,2,-1],arp:[0,1,2,1,0,1,2,1,0,1,2,1,0,1,2,1],stab:[3,-1,-1,3,-1,3,-1,-1,4,-1,-1,4,-1,4,-1,-1]};
const TRACKS={
 ally:[
  {n:'スペース・ドリフト',bpm:108,prog:[[57,60,64],[53,57,60],[48,52,55],[55,59,62]],bass:BS.drift,bw:'triangle',bv:.4,bl:1.7,lead:LD.arp,lw:'square',lv:.05,ll:.85,drum:DR.drift},
  {n:'スターライト・マーチ',bpm:132,prog:[[60,64,67],[55,59,62],[57,60,64],[53,57,60]],bass:BS.drive,bw:'triangle',bv:.45,bl:.8,lead:LD.a,lw:'square',lv:.06,ll:.7,drum:DR.four},
  {n:'コスモ・ラン',bpm:148,prog:[[53,57,60],[55,59,62],[52,55,59],[57,60,64]],bass:BS.pulse,bw:'triangle',bv:.42,bl:.6,lead:LD.b,lw:'sawtooth',lv:.045,ll:.6,drum:DR.sync},
  {n:'ネオン・シティ',bpm:138,prog:[[65,69,72],[67,71,74],[64,67,71],[60,64,67]],bass:BS.off,bw:'triangle',bv:.45,bl:.8,lead:LD.b,lw:'square',lv:.055,ll:.6,drum:DR.sync},
  {n:'サンライズ・ドライブ',bpm:116,prog:[[60,64,67],[57,60,64],[53,57,60],[55,59,62]],bass:BS.drive,bw:'triangle',bv:.45,bl:.9,lead:LD.a,lw:'sawtooth',lv:.04,ll:.7,drum:DR.half},
  {n:'ギャラクシー・ポップ',bpm:124,prog:[[62,66,69],[57,61,64],[59,62,66],[55,59,62]],bass:BS.off,bw:'triangle',bv:.45,bl:.9,lead:LD.c,lw:'square',lv:.06,ll:.6,drum:DR.half}],
 enemy:[
  {n:'ダーク・パルス',bpm:140,prog:[[50,53,57],[58,62,65],[48,52,55],[57,61,64]],bass:BS.pulse,bw:'sawtooth',bv:.3,bl:.6,lead:LD.stab,lw:'sawtooth',lv:.06,ll:.5,drum:DR.march},
  {n:'クリムゾン・アラーム',bpm:156,prog:[[52,55,59],[48,52,55],[50,54,57],[47,51,54]],bass:BS.drive,bw:'sawtooth',bv:.3,bl:.55,lead:LD.d,lw:'square',lv:.055,ll:.5,drum:DR.four},
  {n:'ブラックホール',bpm:128,prog:[[57,60,64],[50,53,57],[52,56,59],[57,60,64]],bass:BS.pulse,bw:'triangle',bv:.5,bl:.7,lead:LD.arp,lw:'sawtooth',lv:.04,ll:.6,drum:DR.half},
  {n:'デス・スター',bpm:134,prog:[[50,53,57],[46,50,53],[48,52,55],[45,48,52]],bass:BS.pulse,bw:'sawtooth',bv:.32,bl:.6,lead:LD.d,lw:'square',lv:.05,ll:.5,drum:DR.march},
  {n:'ラスト・ボス',bpm:160,prog:[[52,55,59],[53,57,60],[52,55,59],[51,55,58]],bass:BS.pulse,bw:'sawtooth',bv:.3,bl:.45,lead:LD.arp,lw:'sawtooth',lv:.045,ll:.4,drum:DR.four},
  {n:'ウォー・ドラム',bpm:118,prog:[[48,51,55],[56,60,63],[58,62,65],[55,58,62]],bass:BS.walk,bw:'sawtooth',bv:.32,bl:1.1,lead:LD.stab,lw:'square',lv:.06,ll:.6,drum:DR.march}]};
const bgmSel={ally:1,enemy:0};
try{const v=JSON.parse(localStorage.getItem('gw_bgm')||'null');if(v){['ally','enemy'].forEach(k=>{if(Number.isInteger(v[k])&&v[k]>=0&&v[k]<TRACKS[k].length)bgmSel[k]=v[k];});}}catch(e){}
let bgmPrev=null,bgmPrevT=0;
function curTrack(){if(bgmPrev&&performance.now()<bgmPrevT)return TRACKS[bgmPrev][bgmSel[bgmPrev]];const k=(typeof mode!=='undefined'&&mode==='play'&&cur===1)?'enemy':'ally';return TRACKS[k][bgmSel[k]];}
const bgmOpts=k=>TRACKS[k].map((t,i)=>`<option value="${i}" ${bgmSel[k]===i?'selected':''}>${i+1}. ${t.n}</option>`).join('');
const bgmSelHTML=()=>`<div class="grid2"><label>味方ターンのBGM<select data-bgm="ally">${bgmOpts('ally')}</select></label><label>敵ターンのBGM<select data-bgm="enemy">${bgmOpts('enemy')}</select></label></div>`;
let bgmStep=0,bgmNext=0,bgmFast=false,bgmId='';
function startBgm(){
  bgmNext=AU.ctx.currentTime+.15;
  setInterval(()=>{const c=AU.ctx;if(!c)return;if(!AU.on||!AU.music){bgmNext=c.currentTime+.15;return;}
    const T=curTrack();if(T.n!==bgmId){bgmId=T.n;bgmStep=0;bgmNext=c.currentTime+.1;}
    const st=60/(T.bpm*(bgmFast?1.25:1))/2;
    while(bgmNext<c.currentTime+.25){bgmNote(bgmStep,bgmNext-c.currentTime,st,T);bgmNext+=st;bgmStep++;}},60);
}
function bgmNote(s,w,st,T){
  if(!AU.on||!AU.music||w<0)return;const ch=T.prog[Math.floor(s/16)%T.prog.length],i=s%16;
  const b=T.bass[i];if(b)tone(mf(ch[0]-24+(b>1?12:0)),st*T.bl,T.bw,T.bv,1,w,AU.mus);
  const l=T.lead[i];if(l>=0){const n=[ch[0],ch[1],ch[2],ch[0]+12,ch[1]+12,ch[2]+12][l];tone(mf(n+12),st*T.ll,T.lw,T.lv,1,w,AU.mus);}
  if(i===0)ch.forEach(n=>tone(mf(n),st*14,'sine',.06,1,w,AU.mus));
  const d=T.drum[i];
  if(d.includes('k'))tone(150,.14,'sine',.55,.3,w,AU.mus);
  if(d.includes('s'))noise(.12,.2,w,3500,AU.mus);
  if(d.includes('h'))noise(.04,bgmFast?.12:.07,w,9000,AU.mus);
  if(bgmFast&&i%4===0)noise(.12,.22,w,400,AU.mus);
}
['pointerdown','touchend','click'].forEach(ev=>addEventListener(ev,auInit,{capture:true}));

/* ---------- data ---------- */
let COLS=11,ROWS=9;
function mkMap(top,mid){const rev=s=>[...s].reverse().join('').replace(/B/g,'R');return [...top,mid+rev(mid.slice(0,mid.length-1)),...top.slice().reverse().map(rev)];}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function genConnected(rows){const h=rows.length,w=rows[0].length,dd=r=>r&1?[[1,0],[1,-1],[0,-1],[-1,0],[0,1],[1,1]]:[[1,0],[0,-1],[-1,-1],[-1,0],[-1,1],[0,1]];
  const seen=new Set(['0,0']),q=[[0,0]];while(q.length){const [c,r]=q.shift();for(const [a,b] of dd(r)){const x=c+a,y=r+b;if(x<0||y<0||x>=w||y>=h||rows[y][x]==='x'||seen.has(x+','+y))continue;seen.add(x+','+y);q.push([x,y]);}}
  let p=0;rows.forEach(r=>[...r].forEach(ch=>{if(ch!=='x')p++;}));return seen.size===p;}
function genMap(w,h,seed,pr){const hh=(h-1)/2,hw=(w-1)/2;
  for(let k=0;k<400;k++){const R=rng(seed+k*7919);
    const pick=()=>{const q=R();let a=pr.x;if(q<a)return'x';a+=pr.a;if(q<a)return'a';a+=pr.n;if(q<a)return'n';a+=pr.s;if(q<a)return's';a+=pr.f;if(q<a)return'f';return'.';};
    const g=[];for(let r=0;r<=hh;r++){const row=[];for(let c=0;c<(r<hh?w:hw+1);c++)row.push(pick());g.push(row);}
    for(let r=0;r<4;r++)for(let c=0;c<5;c++)g[r][c]='.';
    g[0][0]='B';g[1][2]='s';g[3][1]='f';g[2][4]='s';g[hh][hw]='f';
    const rows=mkMap(g.slice(0,hh).map(r=>r.join('')),g[hh].join(''));
    if(genConnected(rows))return rows;}
  return mkMap(Array(hh).fill('.'.repeat(w)).map((r,i)=>i?r:'B'+r.slice(1)),'.'.repeat(hw+1));}
const MAPS=[
 {n:'星海の戦場',size:'標準',desc:'標準のマップ。バランスよく拠点が散らばる。',rows:mkMap(["B.a...n.s..","..a.s...a..","f...n.x..s.",".a..a...n.."],"s.n..f"),limit:30,funds:800,start:2,zoom:0},
 {n:'小惑星帯',size:'標準',desc:'小惑星だらけ。守りは固いが進みにくい。',rows:mkMap(["B..a.aa..s.",".aa..a.aa..",".s.aa.a..af","aa..a.s.aa."],"a.aa.f"),limit:30,funds:800,start:2,zoom:0},
 {n:'星雲の迷宮',size:'標準',desc:'星雲で回避しやすい。基地は左右の中央。',rows:mkMap(["..n.n...s..",".nn.n.nn.n.","f.n..n.n.s.","n.s.n.nn..n"],"B.nn.f"),limit:30,funds:800,start:2,zoom:0},
 {n:'ブラックホール回廊',size:'大型（2倍）',desc:'通れない穴が点在する広い戦場。回り道が多い。',rows:genMap(15,13,101,{x:.17,a:.06,n:.04,s:.035,f:.01}),limit:45,funds:1200,start:3,zoom:2},
 {n:'資源争奪戦',size:'大型（2倍）',desc:'拠点だらけの広い戦場。占領合戦で稼ぐ。',rows:genMap(15,13,202,{x:.02,a:.05,n:.05,s:.12,f:.05}),limit:45,funds:1200,start:3,zoom:2},
 {n:'銀河大戦線',size:'特大（4倍）',desc:'全地形がそろった巨大戦場。長期戦になる。',rows:genMap(21,19,303,{x:.05,a:.1,n:.09,s:.065,f:.02}),limit:60,funds:1800,start:4,zoom:3}];
const setup={mode:'cpu',map:0};
try{const v=JSON.parse(localStorage.getItem('gw_setup')||'null');if(v){if(v.mode==='pvp')setup.mode='pvp';if(Number.isInteger(v.map)&&v.map>=0&&v.map<MAPS.length)setup.map=v.map;}}catch(e){}
const TER={'.':{n:'宇宙空間',cost:1,def:0,ev:0},a:{n:'小惑星帯',cost:2,def:2,ev:0},n:{n:'星雲',cost:2,def:0,ev:.12},x:{n:'ブラックホール',cost:99,def:0,ev:0},
 s:{n:'ステーション',cost:1,def:1,ev:0,inc:150,cap:1},f:{n:'工廠',cost:1,def:1,ev:0,inc:150,cap:1,prod:1},H:{n:'本拠地',cost:1,def:2,ev:0,inc:400,cap:1,prod:1}};
const SIDE=[{n:'青軍',css:'#5ef2ff',cls:'b',c3:[0x5ef2ff,0xff5ce1,0xb394ff,0xffd75e]},{n:'赤軍',css:'#ff6a4d',cls:'r',c3:[0xff7a59,0xff3b6b,0xffb347,0x9fa8ff]}];
const ST={head:[[1,1,1,1],[2,0,1,0],[0,3,-1,2]],body:[[1,2,1,2],[0,4,-1,4],[1,0,3,0]],weap:[[4,0,0,1],[5,0,-1,2],[3,1,0,2],[3,0,1,0],[5,0,-1,2],[3,0,1,1],[4,1,-1,3],[4,0,0,2],[0,0,1,0]],legs:[[0,1,2,1],[1,3,-1,3],[0,0,4,0]]};
const KEYS=['head','body','weap','legs'];
const PART_N={head:['標準カメラ','センサー型','重装甲ヘッド'],body:['バランス','重装甲','スピード'],weap:['ビーム砲','ミサイル','ドリル','ブレード','レールガン','ガトリング','ハンマー','グレネード','リペアアーム'],legs:['二足','タンク','ホバー']};
const RANGE=[[1,2],[2,3],[1,1],[1,1],[2,4],[1,2],[1,1],[2,3],[1,1]];
const INDIRECT=[1,7],BEAMS=[0,4,5],HEAL=8;
const WP=[1,1.1,1,1,1.15,.8,1.2,1.05,0];
const atkW=u=>u.ws.filter(w=>w>=0&&w!==HEAL);
const hasHeal=u=>u.ws.includes(HEAL);
const isHealer=u=>hasHeal(u)&&!atkW(u).length;
const weapLabel=u=>u.ws[1]>=0?`右 ${PART_N.weap[u.ws[0]]} / 左 ${PART_N.weap[u.ws[1]]}`:PART_N.weap[u.ws[0]];
const rangeStr=w=>w===HEAL?'補給1':(RANGE[w][0]===RANGE[w][1]?RANGE[w][0]:RANGE[w][0]+'-'+RANGE[w][1]);
const PRESETS=[
 {n:'ストライカー',cfg:{head:0,body:0,weap:3,legs:0}},
 {n:'ファントム',cfg:{head:1,body:2,weap:0,legs:2}},
 {n:'アーティラリー',cfg:{head:1,body:1,weap:1,legs:1}},
 {n:'ドリラー',cfg:{head:0,body:0,weap:2,legs:0}},
 {n:'ガーディアン',cfg:{head:2,body:1,weap:0,legs:1}},
 {n:'メディック',cfg:{head:0,body:0,weap:8,legs:0}},
 {n:'デュアル',cfg:{head:1,body:0,weap:0,weap2:3,legs:0}}
];
function statsOf(cfg){const t=[3,3,3,3];KEYS.forEach(k=>ST[k][cfg[k]].forEach((v,i)=>t[i]+=v));if(cfg.weap2>=0)ST.weap[cfg.weap2].forEach((v,i)=>t[i]+=v);return t;}
const costOf=cfg=>{const s=statsOf(cfg);return 150+(s[0]+s[1]+s[2]+s[3])*15;};
const moveOf=u=>Math.min(6,Math.max(2,Math.floor(u.st[2]/2)+1));
const maxHp=st=>Math.round(70+st[3]*6+st[1]*2);

/* ---------- state ---------- */
let tiles,units,cur,turn,funds,cpu,mode='title',phase='idle',sel=null,R=null,origin=null,targets=[],busy=false,over=false,uid=0,prodSite=null,anim=true,info=null;
const custom={head:0,body:0,weap:0,legs:0,weap2:-1};
let useSlot=0;

function newGame(vsCpu){
  tiles=initTiles();
  const MP=MAPS[setup.map];TURN_LIMIT=MP.limit;
  units=[];funds=[MP.funds,MP.funds];cur=0;turn=1;cpu=[false,!!vsCpu];over=false;sel=null;phase='idle';
  [0,1].forEach(side=>{const h=hqOf(side),cand=[];
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){if(tiles[r][c].t==='x'||tiles[r][c].t==='H')continue;cand.push([dist(h[0],h[1],c,r),c,r]);}
    cand.sort((a,b)=>a[0]-b[0]);
    [0,1,3,2].slice(0,MP.start).forEach((pi,k)=>spawn(side,PRESETS[pi].cfg,PRESETS[pi].n,cand[k][1],cand[k][2]));});
  units.forEach(u=>u.acted=false);
  mode='play';showGame();beginTurn();setTimeout(()=>{const h=hqOf(0);if(h)focusTile(h[0],h[1]);},50);
}
function spawn(side,cfg,name,c,r,raw,aura,rank){const st=raw?raw.map(v=>2+v/10):statsOf(cfg);const disp=raw||st.map(v=>Math.min(99,Math.max(1,Math.round((v-2)*10))));const w2=cfg.weap2>=0?cfg.weap2:-1;const u={id:++uid,side,cfg:{...cfg,weap2:w2},ws:[cfg.weap,w2],aura:!!aura,rank:rank||'',name,st,disp,cost:Math.round(150+st.reduce((a,b)=>a+b,0)*15),max:maxHp(st),c,r,acted:true,moved:false};u.hp=u.max;units.push(u);return u;}
const unitAt=(c,r)=>units.find(u=>u.c===c&&u.r===r);
let TURN_LIMIT=30;const GACHA_COST=300,GACHA2_COST=3000;
let aiLv=2;try{const v=+localStorage.getItem('gw_lv');if(v>=1&&v<=4)aiLv=v;}catch(e){}
const AIL={1:{n:'よわい',skip:.45,inc:0,dmg:.85,threat:false,risk:.3},2:{n:'ふつう',skip:0,inc:0,dmg:1,threat:true,risk:.6},3:{n:'つよい',skip:0,inc:150,dmg:1,threat:true,risk:.9},4:{n:'げきつよ',skip:0,inc:300,dmg:1.15,threat:true,risk:1.2}};
const AI=()=>AIL[aiLv];
const lvOpts=()=>[1,2,3,4].map(i=>`<option value="${i}" ${aiLv===i?'selected':''}>Lv${i} ${AIL[i].n}</option>`).join('');
function targetsFor(u,s){const w=u.ws[s];if(w<0)return [];if(w===HEAL)return healTargets(u);if(INDIRECT.includes(w)&&u.moved)return [];return units.filter(e=>e.side!==u.side&&inRange(u,u.c,u.r,e,w));}
const allTargets=u=>[...new Set(u.ws.flatMap((w,s)=>w<0?[]:targetsFor(u,s)))];
const healTargets=u=>units.filter(a=>a!==u&&a.side===u.side&&a.hp<a.max&&dist(u.c,u.r,a.c,a.r)===1);
const GW=[[0,18],[1,12],[2,12],[3,14],[4,10],[5,14],[6,10],[7,6]];
function wPick(ex){const list=GW.filter(x=>x[0]!==ex),t=list.reduce((a,b)=>a+b[1],0);let r=Math.random()*t;for(const [w,n] of list){if((r-=n)<0)return w;}return list[0][0];}
function gachaRoll(mn,mx){mn=mn||1;mx=mx||99;const raw=[0,1,2,3].map(()=>mn+rnd(mx-mn+1));const sum=raw.reduce((a,b)=>a+b,0),s99=4+(sum-4*mn)/(4*(mx-mn))*392;
  const rank=s99>=290?'SSR':s99>=240?'SR':s99>=160?'R':'N';const w1=wPick(-1),w2=rnd(100)<6?HEAL:wPick(w1);
  return {raw,rank,cfg:{head:rnd(3),body:rnd(3),weap:w1,weap2:w2,legs:rnd(3)}};}
const initTiles=()=>{const rows=MAPS[setup.map].rows;COLS=rows[0].length;ROWS=rows.length;return rows.map(row=>[...row].map(ch=>({t:ch==='B'||ch==='R'?'H':ch,owner:ch==='B'?0:ch==='R'?1:-1})));};
function resetBoard(){mode='title';tiles=initTiles();units=[];cur=0;turn=1;funds=[0,0];cpu=[false,true];sel=null;phase='idle';info=null;targets=[];over=false;busy=false;prodSite=null;bgmFast=false;$('banner').hidden=true;$('banner').onclick=null;}
function hqOf(s){for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(tiles[r][c].t==='H'&&tiles[r][c].owner===s)return [c,r];return null;}
function scoreOf(s){return funds[s]+units.filter(u=>u.side===s).reduce((a,u)=>a+Math.round(u.cost*u.hp/u.max),0)+tiles.flat().filter(t=>TER[t.t].cap&&t.owner===s).length*200;}

/* ---------- hex math ---------- */
function nbrs(c,r){const d=r&1?[[1,0],[1,-1],[0,-1],[-1,0],[0,1],[1,1]]:[[1,0],[0,-1],[-1,-1],[-1,0],[-1,1],[0,1]];return d.map(([a,b])=>[c+a,r+b]).filter(([x,y])=>x>=0&&y>=0&&x<COLS&&y<ROWS);}
function cube(c,r){const x=c-(r-(r&1))/2;return [x,r,-x-r];}
function dist(a,b,c,d){const p=cube(a,b),q=cube(c,d);return Math.max(Math.abs(p[0]-q[0]),Math.abs(p[1]-q[1]),Math.abs(p[2]-q[2]));}
const K=(c,r)=>c+','+r,UK=k=>k.split(',').map(Number);
function reach(u){
  const mv=moveOf(u),best=new Map([[K(u.c,u.r),0]]),prev=new Map(),q=[[u.c,u.r,0]];
  while(q.length){q.sort((a,b)=>a[2]-b[2]);const [c,r,g]=q.shift();if(g>best.get(K(c,r)))continue;
    for(const [nc,nr] of nbrs(c,r)){const T=tiles[nr][nc];if(T.t==='x')continue;
      const o=unitAt(nc,nr);if(o&&o.side!==u.side)continue;
      const ng=g+(u.cfg.legs===2?1:TER[T.t].cost);if(ng>mv)continue;
      const kk=K(nc,nr);if(best.has(kk)&&best.get(kk)<=ng)continue;best.set(kk,ng);prev.set(kk,K(c,r));q.push([nc,nr,ng]);}}
  const set=new Set();for(const kk of best.keys()){const [c,r]=UK(kk);const o=unitAt(c,r);if(!o||o===u)set.add(kk);}
  return {set,prev,best};
}
function pathTo(R,from,to){const p=[];let k=to;while(k&&k!==from){p.unshift(UK(k));k=R.prev.get(k);}return p;}
function inRange(u,c,r,e,w){const d=dist(c,r,e.c,e.r);return (w===undefined?atkW(u):[w]).some(x=>{const g=RANGE[x];return d>=g[0]&&d<=g[1];});}
let thKey='',thSet=new Set();
function threatSet(u,fromOnly,rset){
  const set=new Set(),pos=rset&&origin?origin:[u.c,u.r],ws=atkW(u).length?atkW(u):(hasHeal(u)?[HEAL]:[]);
  for(const w of ws){const rg=RANGE[w],org=(fromOnly||INDIRECT.includes(w))?[pos]:[...(rset||reach(u).set)].map(UK);
    for(const [oc,or] of org)for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const d=dist(oc,or,c,r);if(d>=rg[0]&&d<=rg[1])set.add(K(c,r));}}
  return set;
}

/* ---------- combat ---------- */
function strike(a,d,w){
  const T=TER[tiles[d.r][d.c].t];
  const evc=Math.min(.4,Math.max(.03,.08+(d.st[2]-a.st[2])*.03+T.ev+(w===0||w===4?-.05:0)));
  if(Math.random()<evc)return {ev:true,dmg:0,crit:false,tev:T.ev};
  const sp=Math.random()<.09,crit=!sp&&Math.random()<.15;
  return {ev:false,crit,sp,tdef:T.def*2,dmg:Math.max(3,Math.round((9+a.st[0]*2.3)*(WP[w]||1)*(.85+Math.random()*.3)*(sp?1.8:crit?1.6:1)*(cpu[a.side]?AI().dmg:1)-d.st[1]*1.3-T.def*2))};
}
function expDmg(a,d,dc,dr,w){const T=TER[tiles[dr][dc].t];return Math.max(3,(9+a.st[0]*2.3)*(w===undefined?Math.max(1,...atkW(a).map(x=>WP[x])):(WP[w]||1))-d.st[1]*1.3-T.def*2);}
function pickCounter(d,a){let best=null;d.ws.forEach((w,s)=>{if(w<0||w===HEAL||!inRange(d,d.c,d.r,a,w))return;if(!best||(WP[w]||1)>(WP[best.w]||1))best={w,arm:s};});return best;}
function resolve(a,d,slot){
  const w=a.ws[slot],ev=[],s1=strike(a,d,w);ev.push({att:a,def:d,w,arm:slot,...s1});
  if(d.hp-s1.dmg>0){const cw=pickCounter(d,a);if(cw){const s2=strike(d,a,cw.w);s2.dmg=Math.round(s2.dmg*.8);ev.push({att:d,def:a,w:cw.w,arm:cw.arm,...s2});}}
  return ev;
}

/* ---------- map rendering ---------- */
const cv=$('map'),ctx=cv.getContext('2d');let S=20,PAD=8,CW=0,CH=0,zoomPref=1;
const YS=.8;
const ZOOMS=[1,1.4,1.8,2.2];let zi=1;try{const v=localStorage.getItem('gw_zoom');if(v!==null&&+v>=0&&+v<ZOOMS.length)zi=+v;}catch(e){}
zoomPref=zi;
const bgStars=Array.from({length:120},()=>[Math.random(),Math.random(),Math.random()]);
function sizeMap(){
  let bw0=$('mapwrap').clientWidth;if(matchMedia('(min-width:1000px)').matches)bw0=Math.min(bw0,(innerHeight-190-2*PAD)/((.85+YS*(1.5*(ROWS-1)+2)+.55)/(SQ3*(COLS+.5))));const W=bw0*ZOOMS[zi];S=(W-2*PAD)/(SQ3*(COLS+.5));CW=W;CH=Math.round(2*PAD+S*.85+S*YS*(1.5*(ROWS-1)+2)+S*.55);
  const dpr=Math.min(devicePixelRatio||1,2);cv.width=CW*dpr;cv.height=CH*dpr;cv.style.height=CH+'px';cv.style.width=W+'px';$('mapinner').style.width=W+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
}
function setZoom(n,save){
  n=Math.max(0,Math.min(ZOOMS.length-1,n));const sc=$('mapscroll');
  const fx=CW?(sc.scrollLeft+sc.clientWidth/2)/CW:.5,fy=CH?(sc.scrollTop+sc.clientHeight/2)/CH:.5;
  zi=n;if(save!==false){zoomPref=n;try{localStorage.setItem('gw_zoom',zi);}catch(e){}}
  sizeMap();sc.scrollLeft=fx*CW-sc.clientWidth/2;sc.scrollTop=fy*CH-sc.clientHeight/2;
  $('zLbl').textContent='マス '+ZOOMS[zi]+'×';if(typeof updateCmd==='function'&&tiles)updateCmd();$('zOut').disabled=zi===0;$('zIn').disabled=zi===ZOOMS.length-1;
}
function focusTile(c,r){const sc=$('mapscroll');if(sc.scrollWidth<=sc.clientWidth+2&&sc.scrollHeight<=sc.clientHeight+2)return;const [x,y]=ctr(c,r);sc.scrollTo({left:x-sc.clientWidth/2,top:y-sc.clientHeight/2,behavior:'smooth'});}
$('zOut').onclick=()=>setZoom(zi-1);$('zIn').onclick=()=>setZoom(zi+1);
let panelOpen=true;try{panelOpen=localStorage.getItem('gw_panel')!=='0';}catch(e){}
function setPanel(v){panelOpen=v;document.querySelector('.shell').classList.toggle('nopanel',!v);const t=$('pTog');t.setAttribute('aria-pressed',v);t.textContent=v?'パネル ▼':'パネル ▲';try{localStorage.setItem('gw_panel',v?'1':'0');}catch(e){}setZoom(zi,false);}
$('pTog').onclick=()=>setPanel(!panelOpen);
const FSE=document.documentElement,fsReq=FSE.requestFullscreen||FSE.webkitRequestFullscreen,fsOn=()=>document.fullscreenElement||document.webkitFullscreenElement;
function toggleFs(){try{if(fsOn()){(document.exitFullscreen||document.webkitExitFullscreen).call(document);}else{const r=fsReq.call(FSE);if(r&&r.catch)r.catch(()=>{});}}catch(e){}}
if(!fsReq)$('fsTog').hidden=true;
$('fsTog').onclick=toggleFs;
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{const on=!!fsOn();$('fsTog').setAttribute('aria-pressed',on);$('fsTog').textContent=on?'全画面を解除':'全画面';setTimeout(()=>{sizeMap();if(bR)sizeBattle();if(typeof updateCmd==='function'&&tiles)updateCmd();},120);}));
addEventListener('keydown',e=>{if((e.key==='f'||e.key==='F')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!/^(INPUT|SELECT|TEXTAREA)$/.test((e.target.tagName||'')))toggleFs();});
addEventListener('resize',()=>{sizeMap();if(bR)sizeBattle();});
const ctr=(c,r)=>[PAD+S*SQ3*(c+.5*(r&1))+S*SQ3/2,PAD+S*.85+S*YS+1.5*S*YS*r];
const LIFT={a:.16,s:.1,f:.18,H:.32};
const lift=T=>S*(LIFT[T.t]||0);
const ctrL=(c,r)=>{const [x,y]=ctr(c,r);return [x,y-lift(tiles[r][c])];};
function hexPath(x,y,s){ctx.beginPath();for(let i=0;i<6;i++){const a=PI/180*(60*i-30);ctx.lineTo(x+s*Math.cos(a),y+s*YS*Math.sin(a));}ctx.closePath();}
function bld(cx,by,rx,h,col,topc){const ry=rx*YS,t=by-h;ctx.lineWidth=1.2;ctx.strokeStyle=col;
  ctx.beginPath();ctx.moveTo(cx-rx,t);ctx.lineTo(cx,t+ry);ctx.lineTo(cx,by+ry);ctx.lineTo(cx-rx,by);ctx.closePath();ctx.fillStyle='#141846';ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx+rx,t);ctx.lineTo(cx,t+ry);ctx.lineTo(cx,by+ry);ctx.lineTo(cx+rx,by);ctx.closePath();ctx.fillStyle='#1f2560';ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx,t-ry);ctx.lineTo(cx+rx,t);ctx.lineTo(cx,t+ry);ctx.lineTo(cx-rx,t);ctx.closePath();ctx.fillStyle=topc||'#2c3380';ctx.fill();ctx.stroke();}
function cyl(cx,by,rx,h,col){const ry=rx*YS,t=by-h;ctx.lineWidth=1.2;ctx.strokeStyle=col;ctx.fillStyle='#1b2056';
  ctx.beginPath();ctx.ellipse(cx,by,rx,ry,0,0,PI);ctx.lineTo(cx-rx,t);ctx.ellipse(cx,t,rx,ry,0,PI,2*PI);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.ellipse(cx,t,rx,ry,0,0,7);ctx.fillStyle='#2c3380';ctx.fill();ctx.stroke();}
const ownerCss=o=>o<0?'#a2a4d6':SIDE[o].css;
function rgba(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`;}
let tNow=0;
function draw(){
  ctx.clearRect(0,0,CW,CH);ctx.fillStyle='#0b0e2a';ctx.fillRect(0,0,CW,CH);
  ctx.fillStyle='#e9e6ff';bgStars.forEach(([x,y,z])=>{ctx.globalAlpha=.25+z*.5;ctx.fillRect(x*CW,y*CH,1.2,1.2);});ctx.globalAlpha=1;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const [x,y0]=ctr(c,r),T=tiles[r][c],L=lift(T),y=y0-L,D=S*.3+L;
    const base=T.t==='x'?'#05061a':T.t==='a'?'#1c2050':T.t==='n'?'#3a1f5e':'#141848';
    const vx=i=>x+S*.97*Math.cos(PI/180*(60*i-30)),vy=i=>y+S*.97*YS*Math.sin(PI/180*(60*i-30));
    const face=(i,j,sh)=>{ctx.beginPath();ctx.moveTo(vx(i),vy(i));ctx.lineTo(vx(j),vy(j));ctx.lineTo(vx(j),vy(j)+D);ctx.lineTo(vx(i),vy(i)+D);ctx.closePath();ctx.fillStyle=base;ctx.fill();
      ctx.fillStyle=`rgba(2,3,16,${sh})`;ctx.fill();if(TER[T.t].cap&&T.owner>=0){ctx.fillStyle=rgba(SIDE[T.owner].css,.16);ctx.fill();}ctx.lineWidth=1;ctx.strokeStyle='#23285f';ctx.stroke();};
    if(T.t!=='x'){face(2,3,.62);face(1,2,.42);}
    hexPath(x,y,S*.97);
    ctx.fillStyle=base;ctx.fill();
    if(T.t!=='x'){hexPath(x,y,S*.97);ctx.fillStyle='rgba(255,255,255,.03)';ctx.fill();}
    if(TER[T.t].cap&&T.owner>=0){hexPath(x,y,S*.97);ctx.fillStyle=rgba(SIDE[T.owner].css,.14);ctx.fill();}
    hexPath(x,y,S*.97);ctx.lineWidth=1;ctx.strokeStyle=T.t==='x'?'#171a45':'#2f3578';ctx.stroke();
    ctx.lineWidth=1.4;
    const E=(ex,ey,rx)=>{ctx.beginPath();ctx.ellipse(ex,ey,rx,rx*YS,0,0,7);};
    if(T.t==='a'){ctx.strokeStyle='#8a8ec0';[[-.3,-.15,.18],[.22,.05,.22],[-.05,.32,.13]].forEach(([dx,dy,rr])=>{E(x+dx*S,y+dy*S*YS,rr*S);ctx.stroke();});}
    if(T.t==='n'){ctx.fillStyle='rgba(255,92,225,.18)';E(x-S*.15,y,S*.45);ctx.fill();E(x+S*.25,y+S*.1*YS,S*.35);ctx.fill();}
    if(T.t==='x'){ctx.strokeStyle='#7a62d6';E(x,y,S*.5);ctx.stroke();ctx.strokeStyle='#b394ff';ctx.beginPath();ctx.ellipse(x,y,S*.28,S*.28*YS,0,tNow*2,tNow*2+4);ctx.stroke();}
    const oc=ownerCss(T.owner);
    if(T.t==='s'){const by=y+S*.28*YS;cyl(x,by,S*.2,S*.5,oc);ctx.strokeStyle=oc;ctx.lineWidth=1.4;E(x,by-S*.3,S*.42);ctx.stroke();
      ctx.beginPath();ctx.moveTo(x,by-S*.5-S*.16*YS);ctx.lineTo(x,by-S*.88);ctx.stroke();ctx.fillStyle=oc;ctx.beginPath();ctx.arc(x,by-S*.88,S*.05,0,7);ctx.fill();}
    if(T.t==='f'){const by=y+S*.3*YS;cyl(x+S*.24,y+S*.02,S*.09,S*.6,oc);bld(x-S*.06,by,S*.36,S*.34,oc);
      ctx.strokeStyle=oc;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+S*.06,by-S*.1);ctx.lineTo(x+S*.26,by-S*.1+S*.1*YS*0);ctx.moveTo(x+S*.06,by-S*.2);ctx.lineTo(x+S*.26,by-S*.2);ctx.stroke();}
    if(T.t==='H'){const by=y+S*.36*YS;bld(x,by,S*.52,S*.3,oc);bld(x,by-S*.3,S*.32,S*.34,oc);
      const top=by-S*.64-S*.32*YS;ctx.fillStyle=oc;ctx.shadowColor=oc;ctx.shadowBlur=10;ctx.lineWidth=1.4;ctx.strokeStyle=oc;
      ctx.beginPath();for(let i=0;i<10;i++){const a=-PI/2+i*PI/5,rr=i%2?S*.1:S*.24;ctx.lineTo(x+rr*Math.cos(a),top-S*.22+rr*Math.sin(a));}ctx.closePath();ctx.fill();ctx.shadowBlur=0;}
    if(T.cp){ctx.fillStyle='#ffd75e';ctx.font='700 '+Math.round(S*.38)+'px sans-serif';ctx.textAlign='center';ctx.fillText('占領中',x,y-S*.62);}
  }
  const thU=sel&&(phase==='select'||phase==='moved'||phase==='target')?sel:(info?unitAt(info[0],info[1]):null);
  if(thU){
    const only=sel===thU&&phase!=='select',key=thU.id+'|'+only+'|'+units.map(x=>x.id+':'+x.c+','+x.r).join(';');
    if(key!==thKey){thKey=key;thSet=threatSet(thU,only,sel===thU&&phase==='select'?R.set:null);}
    const tc=isHealer(thU)?'125,255,155':thU.side===cur?'255,106,77':'255,190,70';
    for(const k of thSet){const [c,r]=UK(k),[x,y]=ctrL(c,r);hexPath(x,y,S*.9);ctx.fillStyle=`rgba(${tc},.11)`;ctx.fill();ctx.strokeStyle=`rgba(${tc},.4)`;ctx.lineWidth=1;ctx.stroke();}
  }
  if(sel&&phase==='select'&&R){
    for(const k of R.set){const [c,r]=UK(k),[x,y]=ctrL(c,r);hexPath(x,y,S*.9);ctx.fillStyle=rgba(SIDE[sel.side].css,.2);ctx.fill();ctx.strokeStyle=rgba(SIDE[sel.side].css,.55);ctx.lineWidth=1;ctx.stroke();
      const cst=R.best&&R.best.get(k);if(cst>0){ctx.fillStyle='rgba(236,235,255,.85)';ctx.font='700 '+Math.round(S*.32)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(cst,x,y+S*.05);ctx.textBaseline='alphabetic';}}
  }
  const tg=phase==='target'||phase==='moved'?targets:[];
  tg.forEach(e=>{const [x,y]=ctrL(e.c,e.r),al=sel&&e.side===sel.side;hexPath(x,y,S*.9);ctx.fillStyle=al?'rgba(125,255,155,.22)':'rgba(255,106,77,.22)';ctx.fill();ctx.strokeStyle=al?'#7dff9b':'#ff6a4d';ctx.lineWidth=phase==='target'?2.2:1.2;ctx.stroke();});
  if(info&&!sel){const [x,y]=ctrL(info[0],info[1]);hexPath(x,y,S*.95);ctx.strokeStyle='#ffd75e';ctx.lineWidth=1.6;ctx.stroke();}
  units.slice().sort((a,b)=>a.r-b.r).forEach(drawUnit);
}
function drawUnit(u){
  const [cx,cy0]=u.px?u.px:ctr(u.c,u.r),cy=cy0-lift(tiles[u.r][u.c]),team=SIDE[u.side].css,s=S,k=s/8.2;
  const done=u.acted&&u.side===cur&&mode==='play'&&!over;
  const col=done?'#7f84b8':team,f=u.side?-1:1,c=u.cfg;
  ctx.save();ctx.globalAlpha=done?.62:1;
  ctx.beginPath();ctx.ellipse(cx,cy+s*.5,s*.8,s*.3,0,0,7);ctx.fillStyle='rgba(8,9,32,.85)';ctx.fill();
  ctx.lineWidth=u===sel?2.4:1.6;ctx.strokeStyle=col;ctx.shadowColor=col;ctx.shadowBlur=u===sel?14:5;ctx.stroke();ctx.shadowBlur=0;
  if(u===sel){ctx.beginPath();ctx.ellipse(cx,cy+s*.5,s*.95+Math.sin(tNow*5)*1.5,s*.38+Math.sin(tNow*5)*.8,0,0,7);ctx.lineWidth=1.2;ctx.stroke();}
  if(u.aura){ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<5;i++){const hue=(tNow*45+i*62)%360,ox=(i-2)*s*.26,g=ctx.createLinearGradient(cx,cy-s*1.15,cx,cy+s*.55);
      g.addColorStop(0,`hsla(${hue},95%,62%,0)`);g.addColorStop(.45,`hsla(${hue},95%,62%,.17)`);g.addColorStop(1,`hsla(${(hue+70)%360},95%,62%,0)`);
      ctx.fillStyle=g;ctx.beginPath();const pt=(t,d)=>[cx+ox+Math.sin(tNow*2.2+i*1.7+t*5)*s*.17*(.4+t)+d*s*.15,cy+s*.55-t*s*1.7];
      let q=pt(0,-1);ctx.moveTo(q[0],q[1]);for(let t=.1;t<=1.001;t+=.1){q=pt(t,-1);ctx.lineTo(q[0],q[1]);}for(let t=1;t>=-.001;t-=.1){q=pt(t,1);ctx.lineTo(q[0],q[1]);}ctx.closePath();ctx.fill();}
    ctx.beginPath();ctx.ellipse(cx,cy+s*.5,s*.86,s*.34,0,0,7);ctx.strokeStyle=`hsla(${(tNow*60)%360},95%,65%,.38)`;ctx.lineWidth=1.6;ctx.shadowColor=`hsl(${(tNow*60)%360},95%,60%)`;ctx.shadowBlur=8;ctx.stroke();ctx.restore();}
  ctx.lineWidth=Math.max(1,k*.17);ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=col;ctx.fillStyle='#1b1f4e';
  const box=(x,y,w,h)=>{ctx.beginPath();ctx.rect(cx+x*k,cy+y*k,w*k,h*k);ctx.fill();ctx.stroke();};
  const ln=(a,b,x2,y2)=>{ctx.beginPath();ctx.moveTo(cx+a*k,cy+b*k);ctx.lineTo(cx+x2*k,cy+y2*k);ctx.stroke();};
  const ci=(x,y,r,fill)=>{ctx.beginPath();ctx.arc(cx+x*k,cy+y*k,r*k,0,7);ctx.fill();ctx.stroke();};
  // legs
  if(c.legs===0){box(-2.4,1.2,1.7,3.2);box(.7,1.2,1.7,3.2);box(-2.9,4.2,2.7,.9);box(.2,4.2,2.7,.9);}
  else if(c.legs===1){box(-3.8,2,7.6,2.8);[-2.5,0,2.5].forEach(x=>ci(x,3.4,.9));}
  else{ctx.beginPath();ctx.ellipse(cx,cy+3.4*k,3.2*k,1*k,0,0,7);ctx.fill();ctx.stroke();[-1.6,0,1.6].forEach(x=>ln(x,4.6,x,5.6));}
  // torso
  const w=c.body===1?6.4:c.body===2?3.8:4.8;
  box(-w/2,-2.6,w,3.9);ln(-w/2+.8,-1.2,w/2-.8,-1.2);ci(0,.1,.6);
  // arms
  const fx=f>0?w/2:-w/2-1.3,bx=f>0?-w/2-1.3:w/2;box(bx,-2.3,1.3,3.3);box(fx,-2.3,1.3,3.3);
  // head
  if(c.head===0){box(-1.6,-5.3,3.2,2.4);ln(-1.1,-4.2,1.1,-4.2);}
  else if(c.head===1){ci(0,-4.2,1.7);ctx.fillStyle=col;ci(f*.5,-4.2,.45);ctx.fillStyle='#1b1f4e';}
  else{box(-2.2,-5.2,4.4,2.3);ln(-1.4,-4.2,1.4,-4.2);ln(-2.2,-5.2,-2.8,-6.4);ln(2.2,-5.2,2.8,-6.4);}
  // weapons: right arm = front hand, left arm = back hand
  const drawW=(wp,hx,hy,f)=>{
    const X=x=>hx+f*x,wb=(x0,y0,len,h)=>box(f>0?hx+x0:hx-x0-len,hy+y0,len,h);
    if(wp===0){wb(0,-.55,3.6,1.1);ctx.fillStyle=col;ci(X(3.8),hy,.5);}
    else if(wp===1){wb(-1.6,-4.4,3.4,2.2);[0,1,2].forEach(i=>ln(X(-1.1+i*1.1),-4.4,X(-1.1+i*1.1),-5.4));}
    else if(wp===2){ctx.beginPath();ctx.moveTo(cx+hx*k,cy+(hy-1.1)*k);ctx.lineTo(cx+X(4.2)*k,cy+hy*k);ctx.lineTo(cx+hx*k,cy+(hy+1.1)*k);ctx.closePath();ctx.fill();ctx.stroke();ln(X(1),hy-.7,X(2),hy+.5);}
    else if(wp===3){ctx.lineWidth=k*.36;ln(hx,hy+.9,X(3.6),hy-4.8);ctx.lineWidth=Math.max(1,k*.17);ln(X(-.2),hy-.4,X(1.2),hy+.9);}
    else if(wp===4){wb(0,-.35,5.8,.7);wb(.8,-1,1.2,2);}
    else if(wp===5){[-1,0,1].forEach(i=>wb(0,i*.75-.25,3.3,.5));ci(X(-.2),hy,1);}
    else if(wp===6){ln(hx,hy+.8,X(2.4),hy-3.4);wb(1.2,-5.2,2.6,1.9);}
    else if(wp===7){wb(0,-.8,3,1.6);ci(X(3.2),hy,1.2);}
    else if(wp===8){ctx.strokeStyle='#7dff9b';ctx.lineWidth=k*.4;ln(-1,-1.2,1,-1.2);ln(0,-2.2,0,-.2);ci(X(.9),hy,1);ln(X(.9)-.5,hy,X(.9)+.5,hy);ln(X(.9),hy-.5,X(.9),hy+.5);ctx.strokeStyle=col;ctx.lineWidth=Math.max(1,k*.17);}
  };
  const hxF=f*(w/2+.65);
  drawW(u.ws[0],hxF,.8,f);
  if(u.ws[1]>=0)drawW(u.ws[1],-hxF,.8,-f);
  const bw=s*1.05,bx0=cx-bw/2,by=cy+s*.84;ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(bx0,by,bw,3);
  const pr=u.hp/u.max;ctx.fillStyle=pr>.5?col:pr>.25?'#ffd75e':'#ff3b6b';ctx.fillRect(bx0,by,bw*pr,3);
  {const TT=TER[tiles[u.r][u.c].t],tg=[];if(TT.def)tg.push('防+'+TT.def);if(TT.ev)tg.push('避+'+Math.round(TT.ev*100)+'%');
   if(tg.length){ctx.font='700 '+Math.round(s*.27)+'px "Noto Sans JP",sans-serif';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.lineWidth=3;ctx.strokeStyle='rgba(8,9,32,.9)';ctx.strokeText(tg.join(' '),cx,cy+s*(u.rank?1.5:1.12));ctx.fillStyle='#ffd75e';ctx.fillText(tg.join(' '),cx,cy+s*(u.rank?1.5:1.12));}}
  if(u.rank){const rc={N:'#aeb2d6',R:'#5ec8ff',SR:'#c58bff',SSR:'#ffd75e'}[u.rank]||'#fff',yb=cy+s*1.1;ctx.font='800 '+Math.round(s*.3)+'px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.textBaseline='alphabetic';
    const tw=ctx.measureText(u.rank).width+s*.34;ctx.fillStyle='rgba(8,9,32,.88)';ctx.fillRect(cx-tw/2,yb-s*.27,tw,s*.36);ctx.lineWidth=1.2;ctx.strokeStyle=rc;ctx.strokeRect(cx-tw/2,yb-s*.27,tw,s*.36);
    if(u.rank==='SSR'||u.rank==='SR'){ctx.shadowColor=rc;ctx.shadowBlur=8;}ctx.fillStyle=rc;ctx.fillText(u.rank,cx,yb);ctx.shadowBlur=0;}
  ctx.restore();
  if(done){ctx.save();ctx.beginPath();ctx.arc(cx+s*.62,cy-s*.62,s*.27,0,7);ctx.fillStyle='#2b3070';ctx.fill();ctx.lineWidth=1.4;ctx.strokeStyle='#cfd2ff';ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='700 '+Math.round(s*.3)+'px "Noto Sans JP",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('済',cx+s*.62,cy-s*.61);ctx.restore();}
  else if(u.side===cur&&!u.acted&&mode==='play'&&!cpu[cur]&&!over){ctx.save();ctx.beginPath();ctx.arc(cx+s*.62,cy-s*.62,s*.12+Math.sin(tNow*4)*s*.02,0,7);ctx.fillStyle='#ffd75e';ctx.shadowColor='#ffd75e';ctx.shadowBlur=6;ctx.fill();ctx.restore();}
}
function mapPop(c,r,text,color){
  const [x,y]=ctr(c,r);const el=document.createElement('div');el.className='pop'+(color==='#ff3040'?' dmg':'');el.textContent=text;if(color!=='#ff3040')el.style.color=color;
  el.style.left=x+'px';el.style.top=(y-S*.4)+'px';$('mapinner').appendChild(el);setTimeout(()=>el.remove(),950);
}
let lastDraw=0;
function tick(now){tNow=now/1000;if(bR&&!$('battle').hidden)battleFrame();else if(mode!=='title'&&now-lastDraw>=30){lastDraw=now;draw();}}
function loop(now){tick(now);requestAnimationFrame(loop);}
setInterval(()=>{if(document.hidden)tick(performance.now());},100);
const nextFrame=cb=>document.hidden?setTimeout(cb,50):requestAnimationFrame(cb);

/* ---------- UI ---------- */
function statusUI(){
  if(mode==='title'){$('status').innerHTML='';return;}
  $('status').innerHTML=`<span class="pill">TURN ${turn}/${TURN_LIMIT}</span>`+[0,1].map(s=>`<span class="pill ${SIDE[s].cls} ${s===cur?'on':''}">${SIDE[s].n}${cpu[s]?'(CPU Lv'+aiLv+')':''} ${funds[s]}G</span>`).join('');
}
function unitBlock(u){
  const T=TER[tiles[u.r][u.c].t],rg=u.ws.filter(w=>w>=0).map(rangeStr).join(' / ');
  return `<p><b style="color:${SIDE[u.side].css}">${SIDE[u.side].n} ${u.name}</b> <span class="muted">HP ${u.hp}/${u.max}</span></p>
  <p class="muted">${PART_N.head[u.cfg.head]}・${PART_N.body[u.cfg.body]}・${PART_N.legs[u.cfg.legs]}</p>
  <p class="muted">武器：${weapLabel(u)}</p>
  <div class="stats"><div>攻撃<b>${u.disp[0]}</b></div><div>防御<b>${u.disp[1]}</b></div><div>速度<b>${u.disp[2]}</b></div><div>重量<b>${u.disp[3]}</b></div><div>移動<b>${moveOf(u)}</b></div><div>射程<b style="font-size:13px">${rg}</b></div><div>HP<b>${u.hp}</b></div><div>最大HP<b>${u.max}</b></div></div>
  <p class="muted">地形：${T.n}${T.def?'（防御+'+T.def+'）':''}${T.ev?'（回避+）':''}</p>`;
}
function panelRoster(){
  const row=u=>{const p=Math.round(u.hp/u.max*100);return `<div class="rrow"><div class="rh"><b style="color:${SIDE[u.side].css}">${u.name}</b><span class="muted">${weapLabel(u)}${u.acted&&u.side===cur?'・行動済':''}</span><button data-a="focus" data-id="${u.id}">位置</button></div><div class="bar"><i style="width:${p}%;background:${SIDE[u.side].css}"></i></div><div class="stats"><div>HP<b>${u.hp}/${u.max}</b></div><div>攻撃<b>${u.disp[0]}</b></div><div>防御<b>${u.disp[1]}</b></div><div>速度<b>${u.disp[2]}</b></div></div></div>`;};
  const mine=units.filter(u=>u.side===cur),foe=units.filter(u=>u.side!==cur);
  panel(`<h2>出撃中の部隊</h2><div class="roster"><p class="muted">${SIDE[cur].n}（${mine.length}機）</p>${mine.map(row).join('')||'<p class="muted">なし</p>'}<p class="muted">${SIDE[1-cur].n}（${foe.length}機）</p>${foe.map(row).join('')||'<p class="muted">なし</p>'}</div><div class="btns"><button class="go" data-a="cancel">閉じる</button></div>`);
}
function movedBtns(){const T=tiles[sel.r][sel.c],canCap=TER[T.t].cap&&T.owner!==sel.side;
  return `${atkButtons()}${canCap?'<button class="go" data-a="cap">占領'+(T.t==='H'?(T.cp&&T.cp.id===sel.id?'（完了）':'（1/2）'):'')+'</button>':''}<button data-a="wait">待機</button><button data-a="undo">戻る</button>`;}
const terLine=(T,short)=>{const a=[];if(T.def)a.push('防御+'+T.def);if(T.ev)a.push('回避+'+Math.round(T.ev*100)+'%');if(!short){if(T.cost>1&&T.cost<90)a.push('移動コスト'+T.cost);if(T.cost>=90)a.push('通行不可');if(T.inc)a.push('収入'+T.inc+'G');}return a.join('　')||'効果なし';};
function unitMini(u){const p=Math.round(u.hp/u.max*100);
  return `<div class="cs"><b style="color:${SIDE[u.side].css}">${u.name}</b><div class="cb"><i style="width:${p}%;background:${SIDE[u.side].css}"></i></div>HP <em>${u.hp}/${u.max}</em><br>攻<em>${u.disp[0]}</em> 防<em>${u.disp[1]}</em> 速<em>${u.disp[2]}</em> 重<em>${u.disp[3]}</em><br><span style="color:var(--amber)">${TER[tiles[u.r][u.c].t].n}：${terLine(TER[tiles[u.r][u.c].t],true)}</span></div>`;}
let cmdOff=false;
function updateCmd(){
  const el=$('cmd');let h='',an=null,bar=false,prod=false;
  if(!over&&mode==='play'&&!cpu[cur]){
    if(sel&&phase==='select'){const mv=sel.c!==origin[0]||sel.r!==origin[1];if(mv){h='<button class="go" data-a="ok">決定</button><button data-a="cancel">取消</button>';an=[sel.c,sel.r];bar=true;}}
    else if(sel&&phase==='moved'){h=movedBtns()+'<button data-a="end">ターン終了</button><button data-a="closecmd">✕ 閉じる</button>';an=[sel.c,sel.r];}
    else if(sel&&phase==='target'){h='<button data-a="back">戻る</button>';an=[sel.c,sel.r];bar=true;}
    else if(phase==='idle'&&!sel&&info){const iu=unitAt(info[0],info[1]),T0=tiles[info[1]][info[0]],occ=iu&&iu.side===cur&&TER[T0.t].prod&&T0.owner===cur;h=(iu?unitMini(iu):`<div class="cs"><b>${T0.n||TER[T0.t].n}</b><span style="color:var(--amber)">${terLine(TER[T0.t])}</span></div>`)+(occ?'<div class="cs" style="white-space:normal">この基地には機体がいるので生産できません。機体が動いて空いてから生産できます</div>':'')+'<button class="go" data-a="end">ターン終了</button><button data-a="roster">部隊一覧</button><button data-a="closecmd">✕ 閉じる</button>';an=info;}
    else if(phase==='prod'&&prodSite){const f=funds[cur];
      h='<button data-a="cancel">✕ 閉じる</button><button class="go" data-a="end">ターン終了</button>'
       +`<button class="go" data-a="gacha" data-m="99" aria-disabled="${GACHA_COST>f}">ガチャ ${GACHA_COST}G</button><button class="go" data-a="gacha" data-m="1000" aria-disabled="${GACHA2_COST>f}">超ガチャ ${GACHA2_COST}G</button>`
       +PRESETS.map((p,i)=>{const c=costOf(p.cfg);return `<button data-a="buy" data-i="${i}" aria-disabled="${c>f}">${p.n} ${c}G</button>`;}).join('');an=prodSite;prod=true;}
  }
  if(!h||!tiles||cmdOff){el.hidden=true;return;}
  if(sel&&an&&!prod)h=unitMini(sel)+h;
  el.innerHTML=h;el.hidden=false;el.classList.toggle('cbar',bar);el.classList.toggle('prod',prod);el.style.maxHeight=Math.max(110,Math.min(CH-8,$('mapscroll').clientHeight-8))+'px';
  const [x,y]=ctrL(an[0],an[1]),w=el.offsetWidth,hh=el.offsetHeight;
  let left,top;
  if(bar){left=Math.max(4,Math.min(CW-w-4,x-w/2));top=y-S*1.35-hh;if(top<4)top=y+S*.95;}
  else{left=x+S*.95;if(left+w>CW-4)left=x-S*.95-w;left=Math.max(4,left);top=Math.max(4,Math.min(CH-hh-4,y-hh/2));}
  el.style.left=left+'px';el.style.top=top+'px';
  const sc=$('mapscroll');
  if(left<sc.scrollLeft+4)sc.scrollLeft=left-4;else if(left+w>sc.scrollLeft+sc.clientWidth-4)sc.scrollLeft=left+w-sc.clientWidth+4;
  if(top<sc.scrollTop+4)sc.scrollTop=top-4;else if(top+hh>sc.scrollTop+sc.clientHeight-4)sc.scrollTop=top+hh-sc.clientHeight+4;
}
function panel(html){const P=$('panel'),had=P.contains(document.activeElement);P.innerHTML=html;if(had){const t=P.querySelector('button.go,button');if(t)t.focus({preventScroll:true});}cmdOff=false;updateCmd();}
function miniSize(rows){const W=264,w=rows[0].length,h=rows.length,sz=W/(Math.sqrt(3)*(w+.5));return [W,Math.ceil(sz*.8*(1.5*(h-1)+2)+sz*.9)];}
function drawMini(cv0,rows){
  const c2=cv0.getContext('2d'),W=cv0.width,H=cv0.height,w=rows[0].length,h=rows.length,sz=W/(Math.sqrt(3)*(w+.5)),yy=.8;
  c2.fillStyle='#0b0e2a';c2.fillRect(0,0,W,H);
  const col={'.':'#1c2160',a:'#7b7fb5',n:'#b055d8',x:'#000',s:'#9fe9ff',f:'#ffd75e',H:'#fff'};
  for(let r=0;r<h;r++)for(let c=0;c<w;c++){const ch=rows[r][c],x=sz*Math.sqrt(3)*(c+.5*(r&1))+sz*Math.sqrt(3)/2,y=sz*yy+sz*.3+1.5*sz*yy*r;
    c2.beginPath();for(let k=0;k<6;k++){const a=Math.PI/180*(60*k-30);c2.lineTo(x+sz*.94*Math.cos(a),y+sz*.94*yy*Math.sin(a));}c2.closePath();
    c2.fillStyle=ch==='x'?'#000':'#10143c';c2.fill();c2.strokeStyle='#2a2f6b';c2.lineWidth=.6;c2.stroke();
    if(ch==='B'||ch==='R'){c2.fillStyle=ch==='B'?'#5ef2ff':'#ff6a4d';c2.beginPath();c2.arc(x,y,sz*.62,0,7);c2.fill();}
    else if(ch==='a'||ch==='n'){c2.fillStyle=col[ch];c2.globalAlpha=.8;c2.beginPath();c2.arc(x,y,sz*.42,0,7);c2.fill();c2.globalAlpha=1;}
    else if(ch==='s'){c2.fillStyle=col.s;c2.beginPath();c2.arc(x,y,sz*.3,0,7);c2.fill();}
    else if(ch==='f'){c2.fillStyle=col.f;c2.fillRect(x-sz*.32,y-sz*.28,sz*.64,sz*.56);}
    else if(ch==='x'){c2.strokeStyle='#7a62d6';c2.lineWidth=.8;c2.beginPath();c2.arc(x,y,sz*.45,0,7);c2.stroke();}}
}
function renderTitle(){
  const t=$('titleView');
  t.innerHTML=`<section class="tsec"><h2>1. 対戦方法</h2>
    <div class="modes"><button class="mcard" data-t="mode" data-v="cpu" aria-pressed="${setup.mode==='cpu'}"><b>CPUと対戦</b><span>ひとりで遊ぶ</span></button><button class="mcard" data-t="mode" data-v="pvp" aria-pressed="${setup.mode==='pvp'}"><b>2人で対戦</b><span>1台を交互に操作</span></button></div>
    <label ${setup.mode==='cpu'?'':'hidden'}>CPUのつよさ<select data-lv="1">${lvOpts()}</select></label></section>
  <section class="tsec"><h2>2. マップ</h2><div class="maps">${MAPS.map((m,i)=>`<button class="mapcard" data-t="map" data-v="${i}" aria-pressed="${setup.map===i}"><canvas width="264" height="${miniSize(m.rows)[1]}" data-mm="${i}"></canvas><b>${i+1}. ${m.n}</b><span>【${m.size}｜${m.rows[0].length}×${m.rows.length}】${m.desc}</span></button>`).join('')}</div></section>
  <section class="tsec"><h2>3. 音楽</h2>${bgmSelHTML()}<p class="muted">曲を選ぶと試聴できます（味方＝自分のターン、敵＝相手のターンで流れる曲）。サウンドのON/OFFは右上のボタンで。</p></section>
  <button class="go big" data-t="start">出撃！</button>
  <details class="tsec"><summary>あそびかた</summary><ul class="rules"><li>自分のユニットをタップ → 移動先をタップ → 攻撃・占領・待機を選ぶ</li><li>ステーション◎と工廠■を占領すると毎ターン資金が増える</li><li>本拠地と工廠をタップすると新しいロボットを生産できる（ガチャもあり）</li><li>脚で移動力、右腕・左腕の武器で射程と攻撃方法が変わる</li><li>攻撃はたまに「必殺技」が出て、ダメージが1.8倍になる（敵も出す）</li><li>本拠地の占領は2ターンかかる。ターン上限（標準30／大型45／特大60）で決着しなければ戦力評価で勝敗が決まる</li><li>メディックは隣の味方のHPを補給できる。「部隊一覧」で全機の能力が見られる</li></ul></details>`;
  t.querySelectorAll('canvas[data-mm]').forEach(c=>drawMini(c,MAPS[+c.dataset.mm].rows));
}
function enterTitle(){resetBoard();$('shell').classList.add('title');$('panel').innerHTML='';renderTitle();statusUI();window.scrollTo(0,0);}
function showGame(){$('shell').classList.remove('title');setZoom(matchMedia('(min-width:1000px)').matches?zoomPref:Math.max(zoomPref,MAPS[setup.map].zoom||0),false);}
$('titleView').addEventListener('click',e=>{const b=e.target.closest('button[data-t]');if(!b)return;const t=b.dataset.t;
  if(t==='mode'){SFX.select();setup.mode=b.dataset.v;}
  else if(t==='map'){SFX.select();setup.map=+b.dataset.v;}
  else if(t==='start'){try{localStorage.setItem('gw_setup',JSON.stringify(setup));}catch(er){}auInit();SFX.start();newGame(setup.mode==='cpu');return;}
  try{localStorage.setItem('gw_setup',JSON.stringify(setup));}catch(er){}
  renderTitle();});
function panelIdle(){
  if(over)return;
  if(cpu[cur]){panel(`<h2>ENEMY PHASE</h2><p class="muted">${SIDE[cur].n}が行動中…</p>`);return;}
  let h=`<h2 style="color:${SIDE[cur].css}">${SIDE[cur].n}のターン</h2>`;
  if(info){const [c,r]=info,u=unitAt(c,r),T=tiles[r][c];
    if(u)h+=unitBlock(u);
    else h+=`<p>${TER[T.t].n}${TER[T.t].cap?'（'+(T.owner<0?'中立':SIDE[T.owner].n)+'）':''}</p><p class="muted">${TER[T.t].inc?'収入 '+TER[T.t].inc+'G/ターン　':''}${TER[T.t].def?'防御+'+TER[T.t].def:''}${TER[T.t].ev?'回避しやすい':''}${T.t==='x'?'通行できない':''}</p>`;
  } else h+=`<p class="muted">動かすユニットをタップ。本拠地・工廠をタップで生産。</p>`;
  h+=bgmSelHTML()+(cpu[1]?`<label>CPUのつよさ<select data-lv="1">${lvOpts()}</select></label>`:'')+`<div class="btns"><button class="go" data-a="end">ターン終了</button><button data-a="roster">部隊一覧</button><button data-a="surrender">降参</button><button data-a="quit">タイトルへ</button></div>`;
  panel(h);
}
function panelSelect(){
  const moved=sel.c!==origin[0]||sel.r!==origin[1];
  panel(`<h2>移動先を選択</h2>${unitBlock(sel)}<p class="muted">光っているマスをタップで移動。「決定」するまで何度でも動かし直せます。赤い範囲は攻撃が届くところ。</p><div class="btns"><button class="go" data-a="ok">${moved?'ここで決定':'その場で行動'}</button><button data-a="cancel">キャンセル</button></div>`);
}
function atkButtons(){
  const u=sel,n=u.ws.filter(w=>w>=0).length;let h='';
  u.ws.forEach((w,s)=>{if(w<0)return;const t=targetsFor(u,s);if(!t.length)return;const nm=n>1?(s?'左腕 ':'右腕 ')+PART_N.weap[w]:'';
    h+=`<button class="go" data-a="atk" data-s="${s}">${w===HEAL?'補給':'攻撃'}${nm?'：'+nm:''}（${t.length}）</button>`;});
  return h;
}
function panelMoved(){
  const T=tiles[sel.r][sel.c],canCap=TER[T.t].cap&&T.owner!==sel.side;
  panel(`<h2>行動を選択</h2>${unitBlock(sel)}${sel.ws.some(w=>INDIRECT.includes(w))&&sel.moved?'<p class="muted">ミサイル・グレネードは移動後に撃てません</p>':''}<div class="btns">
  ${atkButtons()}
  ${canCap?'<button class="go" data-a="cap">占領'+(T.t==='H'?(T.cp&&T.cp.id===sel.id?'（完了）':'（1/2）'):'')+'</button>':''}
  <button data-a="wait">待機</button><button data-a="undo">戻る</button></div>`);
}
function panelTarget(){
  const w=sel.ws[useSlot],h=w===HEAL;
  panel(`<h2>${h?'補給先を選択':'攻撃目標を選択（'+PART_N.weap[w]+'）'}</h2><p class="muted">${h?'緑に光る味方をタップ':'赤く光る敵をタップ'}</p>${targets.map(e=>h?`<p class="muted">${e.name}：回復 約${Math.min(Math.max(15,Math.round(e.max*.35)),e.max-e.hp)}（HP ${e.hp}/${e.max}）</p>`:`<p class="muted">${e.name}：予想ダメージ 約${Math.round(expDmg(sel,e,e.c,e.r,w))}（HP ${e.hp}）［${TER[tiles[e.r][e.c].t].n} ${terLine(TER[tiles[e.r][e.c].t],true)}］</p>`).join('')}<div class="btns"><button data-a="back">戻る</button></div>`);
}
function panelProd(){
  const f=funds[cur];
  const cc=costOf(custom),cs=statsOf(custom);
  panel(`<div class="btns"><button data-a="cancel">✕ 閉じる</button><button class="go" data-a="end">ターン終了</button></div><h2>生産（所持 ${f}G）</h2><div class="grid2">${PRESETS.map((p,i)=>{const c=costOf(p.cfg);return `<button class="preset" data-a="buy" data-i="${i}" aria-disabled="${c>f}">${p.n} ${c}G<span>${PART_N.weap[p.cfg.weap]}${p.cfg.weap2>=0?'＋'+PART_N.weap[p.cfg.weap2]:''}・${PART_N.legs[p.cfg.legs]}</span></button>`}).join('')}</div>
  <h2>ガチャ</h2><p class="muted">能力（攻撃・防御・速度・重量）が1〜99ランダム。右腕・左腕の武器もランダム！</p><div class="btns"><button class="go" data-a="gacha" data-m="99" aria-disabled="${GACHA_COST>f}">ガチャを回す ${GACHA_COST}G</button></div>
  <h2>超ガチャ</h2><p class="muted">能力が200〜1000のランダム！とんでもない機体が出る。右腕・左腕の武器もランダム。</p><div class="btns"><button class="go" data-a="gacha" data-m="1000" aria-disabled="${GACHA2_COST>f}">超ガチャを回す ${GACHA2_COST}G</button></div>
  <h2>カスタム</h2><div class="grid2">${KEYS.map(k=>`<label>${{head:'頭',body:'胴体',weap:'右腕の武器',legs:'脚'}[k]}<select id="cu-${k}" data-k="${k}">${PART_N[k].map((n,i)=>`<option value="${i}" ${custom[k]===i?'selected':''}>${n}</option>`).join('')}</select></label>`).join('')}<label>左腕の武器<select id="cu-weap2" data-k="weap2"><option value="-1" ${custom.weap2<0?'selected':''}>なし</option>${PART_N.weap.map((n,i)=>`<option value="${i}" ${custom.weap2===i?'selected':''}>${n}</option>`).join('')}</select></label></div>
  <div class="stats"><div>攻撃<b>${cs[0]}</b></div><div>防御<b>${cs[1]}</b></div><div>速度<b>${cs[2]}</b></div><div>重量<b>${cs[3]}</b></div></div>
  <div class="btns"><button class="go" data-a="buyc" aria-disabled="${cc>f}">カスタム機を生産 ${cc}G</button><button data-a="cancel">閉じる</button></div>`);
}
const onChange=e=>{if(e.target.dataset.bgm){const k=e.target.dataset.bgm;bgmSel[k]=+e.target.value;try{localStorage.setItem('gw_bgm',JSON.stringify(bgmSel));}catch(er){}bgmPrev=k;bgmPrevT=performance.now()+8000;auInit();return;}
  if(e.target.dataset.lv){aiLv=+e.target.value;try{localStorage.setItem('gw_lv',aiLv);}catch(er){}statusUI();return;}
  const k=e.target.dataset.k;if(k){custom[k]=+e.target.value;panelProd();$('cu-'+k).focus({preventScroll:true});}};
$('panel').addEventListener('change',onChange);$('titleView').addEventListener('change',onChange);
const onCmd=async e=>{
  const b=e.target.closest('button');if(!b)return;const a=b.dataset.a;
  if(a==='cpu'||a==='pvp'){newGame(a==='cpu');return;}
  if(a==='closecmd'||(a==='cancel'&&b.closest('#cmd'))){cmdOff=true;$('cmd').hidden=true;if(a==='closecmd')return;}
  if(busy)return;
  if(a==='end'){SFX.select();endTurn();}
  else if(a==='quit'){enterTitle();}
  else if(a==='surrender'){if(confirm(SIDE[cur].n+'が降参しますか？'))showResult(1-cur,SIDE[cur].n+'が降参した');}
  else if(a==='cancel'){SFX.cancel();restoreSel();if(phase==='prod')info=null;sel=null;phase='idle';prodSite=null;panelIdle();}
  else if(a==='atk'){SFX.select();useSlot=+b.dataset.s||0;targets=targetsFor(sel,useSlot);phase='target';panelTarget();}
  else if(a==='ok'){SFX.select();afterMove();}
  else if(a==='back'){targets=allTargets(sel);phase='moved';panelMoved();}
  else if(a==='wait'){SFX.select();sel.acted=true;sel=null;phase='idle';panelIdle();}
  else if(a==='undo'){SFX.cancel();sel.c=origin[0];sel.r=origin[1];sel.moved=false;R=reach(sel);phase='select';targets=[];panelSelect();}
  else if(a==='cap'){const u=sel;sel=null;phase='idle';await capture(u);if(!over)panelIdle();}
  else if(a==='roster'){SFX.select();phase='idle';panelRoster();}
  else if(a==='focus'){const t=units.find(x=>x.id===+b.dataset.id);if(t){SFX.select();info=[t.c,t.r];phase='idle';panelIdle();}}
  else if((a==='gacha'||a==='buy'||a==='buyc')&&!prodSite){SFX.cancel();}
  else if(a==='gacha'){
    const gm=+b.dataset.m||99,gc=gm>99?GACHA2_COST:GACHA_COST;
    if(gc>funds[cur]){SFX.cancel();const t0=b.innerHTML;b.textContent='資金が足りません';setTimeout(()=>{if(b.isConnected)b.innerHTML=t0;},1200);return;}
    const gr=gachaRoll(gm>99?200:1,gm>99?1000:99);funds[cur]-=gc;spawn(cur,gr.cfg,(gm>99?'超ガチャ機[':'ガチャ機[')+gr.rank+']',prodSite[0],prodSite[1],gr.raw,gm>99,gr.rank);
    (gr.rank==='SSR'||gr.rank==='SR'?SFX.capture:SFX.produce)();mapPop(prodSite[0],prodSite[1],gr.rank+'!',gr.rank==='SSR'?'#ffd75e':SIDE[cur].css);
    prodSite=null;phase='idle';statusUI();panelIdle();
  }
  else if(a==='buy'||a==='buyc'){
    const cfg=a==='buy'?PRESETS[+b.dataset.i].cfg:{...custom},name=a==='buy'?PRESETS[+b.dataset.i].n:'カスタム機',c=costOf(cfg);
    if(c>funds[cur]){SFX.cancel();const t0=b.innerHTML;b.textContent='資金が足りません';setTimeout(()=>{if(b.isConnected)b.innerHTML=t0;},1200);return;}
    funds[cur]-=c;spawn(cur,cfg,name,prodSite[0],prodSite[1]);SFX.produce();mapPop(prodSite[0],prodSite[1],'発進',SIDE[cur].css);
    prodSite=null;phase='idle';statusUI();panelIdle();
  }
};
document.addEventListener('click',e=>{const el=$('cmd');if(!el.hidden&&!el.contains(e.target)){cmdOff=true;el.hidden=true;}},true);
$('panel').addEventListener('click',onCmd);$('cmd').addEventListener('click',onCmd);
$('sndTog').onclick=()=>{AU.on=!AU.on;$('sndTog').setAttribute('aria-pressed',AU.on);$('sndTog').textContent='サウンド '+(AU.on?'ON':'OFF');};
$('bgmTog').onclick=()=>{AU.music=!AU.music;$('bgmTog').setAttribute('aria-pressed',AU.music);$('bgmTog').textContent='BGM '+(AU.music?'ON':'OFF');};
$('animTog').onclick=()=>{anim=!anim;$('animTog').setAttribute('aria-pressed',anim);$('animTog').textContent='戦闘アニメ '+(anim?'ON':'OFF');};

cv.addEventListener('click',async e=>{
  if(mode!=='play'||busy||over||cpu[cur])return;
  const rc=cv.getBoundingClientRect(),mx=e.clientX-rc.left,my=e.clientY-rc.top;
  let hit=null,bd=1e9;for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const [x,y]=ctr(c,r),d=(x-mx)**2+(y-my)**2;if(d<bd){bd=d;hit=[c,r];}}
  if(!hit||bd>S*S)return;const [c,r]=hit,u=unitAt(c,r);
  if(phase==='target'){if(u&&targets.includes(u)){const a=sel,sl=useSlot;sel=null;phase='idle';targets=[];await (a.ws[sl]===HEAL?doHeal(a,u):doAttack(a,u,sl));if(!over)panelIdle();}return;}
  if(phase==='moved'){if(u===sel){cmdOff=false;updateCmd();}return;}
  if(phase==='select'&&sel){
    const k=K(c,r);
    if(u===sel){SFX.select();afterMove();return;}
    if(R.set.has(k)&&!u){busy=true;await walk(sel,movePath(k));busy=false;SFX.select();panelSelect();return;}
  }
  restoreSel();
  if(u&&u.side===cur&&!u.acted){SFX.select();sel=u;origin=[u.c,u.r];R=reach(u);phase='select';info=null;panelSelect();return;}
  const T=tiles[r][c];
  if(!u&&TER[T.t].prod&&T.owner===cur){SFX.select();sel=null;phase='prod';prodSite=[c,r];info=[c,r];panelProd();return;}
  sel=null;phase='idle';info=[c,r];
  panelIdle();
});
function restoreSel(){if(sel&&phase==='select'&&origin){sel.c=origin[0];sel.r=origin[1];sel.px=null;sel.moved=false;}}
function pathBfs(set,from,to){const q=[from],prev=new Map([[from,null]]);while(q.length){const k=q.shift();if(k===to)break;const [c,r]=UK(k);for(const [nc,nr] of nbrs(c,r)){const kk=K(nc,nr);if(!set.has(kk)||prev.has(kk))continue;prev.set(kk,k);q.push(kk);}}
  if(!prev.has(to))return [UK(to)];const p=[];let k=to;while(k!==from){p.unshift(UK(k));k=prev.get(k);}return p;}
function movePath(k){const here=K(sel.c,sel.r);return (sel.c===origin[0]&&sel.r===origin[1])?pathTo(R,here,k):pathBfs(R.set,here,k);}
function afterMove(){sel.moved=sel.c!==origin[0]||sel.r!==origin[1];targets=allTargets(sel);phase='moved';panelMoved();}
async function walk(u,path){
  if(path.length)u.moved=true;
  for(const [c,r] of path){const a=ctr(u.c,u.r),b=ctr(c,r);const t0=performance.now();
    await new Promise(res=>{const st=()=>{const k=Math.min(1,(performance.now()-t0)/110);u.px=[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k];if(k<1)nextFrame(st);else res();};st();});
    u.c=c;u.r=r;SFX.step();}
  u.px=null;
}
async function capture(u){
  const T=tiles[u.r][u.c];u.acted=true;
  if(T.t==='H'&&!(T.cp&&T.cp.id===u.id)){T.cp={id:u.id};SFX.select();mapPop(u.c,u.r,'占領中 1/2',SIDE[u.side].css);statusUI();await sleep(300);return;}
  T.cp=null;T.owner=u.side;SFX.capture();mapPop(u.c,u.r,'占領',SIDE[u.side].css);statusUI();
  await sleep(300);checkWin();
}
async function doAttack(a,d,slot){
  busy=true;a.acted=true;
  const evs=resolve(a,d,slot||0);
  let fx=anim;
  if(fx){try{await playBattle(a,d,evs);}catch(err){console.error(err);fx=false;anim=false;bR=null;const bt=$('battle');bt.hidden=true;const cvs=bt.querySelector('canvas');if(cvs)cvs.remove();bgmFast=false;const t=$('animTog');t.setAttribute('aria-pressed',false);t.textContent='戦闘アニメ OFF（使用不可）';}}
  for(const ev of evs){
    ev.def.hp=Math.max(0,ev.def.hp-ev.dmg);
    if(!fx){SFX[WEAPON_SFX[ev.w]]();await sleep(250);ev.ev?SFX.miss():SFX.hit();mapPop(ev.def.c,ev.def.r,ev.ev?'MISS':(ev.sp?'必殺!':ev.crit?'!':'')+ev.dmg,ev.ev?'#a2a4d6':'#ff3040');await sleep(450);}
  }
  for(const u of [a,d])if(u.hp<=0){if(!fx)SFX.boom();units.splice(units.indexOf(u),1);mapPop(u.c,u.r,'撃破','#ffd75e');}
  busy=false;statusUI();checkWin();
}
async function doHeal(a,t){
  busy=true;a.acted=true;const gain=Math.min(Math.max(15,Math.round(t.max*.35)),t.max-t.hp);t.hp+=gain;
  SFX.heal();mapPop(t.c,t.r,'+'+gain,'#7dff9b');await sleep(600);busy=false;statusUI();
}
function showResult(w,msg){
  over=true;bgmFast=false;sel=null;phase='idle';
  const btns=`<div class="btns"><button class="go" data-a="${cpu[1]?'cpu':'pvp'}">もう一度</button><button data-a="quit">タイトルへ</button></div>`;
  if(w<0){SFX.win();bannerShow(`<div style="color:var(--amber)">引き分け<small>${msg}</small></div>`,false,0);panel(`<h2 style="color:var(--amber)">引き分け</h2><p class="muted">${msg}</p>${btns}`);return;}
  (cpu[w]?SFX.lose:SFX.win)();
  bannerShow(`<div style="color:${SIDE[w].css}">${SIDE[w].n} 勝利<small>${msg}</small></div>`,false,0);
  panel(`<h2 style="color:${SIDE[w].css}">${SIDE[w].n}の勝利</h2><p class="muted">${turn}ターンで決着しました。${msg}</p>${btns}`);
}
function checkWin(){
  if(over)return true;
  for(const s of [0,1]){
    const hq=tiles.flat().find(t=>t.t==='H'&&t.owner===s);
    const lost=!hq||(!units.some(u=>u.side===s)&&funds[s]<Math.min(...PRESETS.map(p=>costOf(p.cfg))));
    if(lost){showResult(1-s,hq?'敵部隊を全滅させた':'敵の本拠地を占領した');return true;}
  }
  return false;
}
function bannerShow(html,tap,ms){
  const b=$('banner');b.innerHTML=html;b.hidden=false;b.classList.toggle('tap',tap);
  return new Promise(res=>{if(tap){b.onclick=()=>{b.hidden=true;b.onclick=null;res();};}else if(ms){setTimeout(()=>{b.hidden=true;res();},ms);}else res();});
}
async function beginTurn(){
  $('banner').hidden=true;
  let inc=0;tiles.flat().forEach(t=>{if(t.owner===cur&&TER[t.t].inc)inc+=TER[t.t].inc;});if(cpu[cur])inc+=AI().inc;funds[cur]+=inc;
  tiles.forEach((row,r)=>row.forEach((T,c)=>{if(T.cp){const o=unitAt(c,r);if(!o||o.id!==T.cp.id)T.cp=null;}}));
  units.forEach(u=>{if(u.side===cur){u.acted=false;u.moved=false;}});
  sel=null;phase='idle';info=null;statusUI();
  if(checkWin())return;
  const hot=!cpu[0]&&!cpu[1];
  busy=true;panelIdle();SFX.turn();
  await bannerShow(`<div style="color:${SIDE[cur].css}">${SIDE[cur].n}のターン<small>収入 +${inc}G${hot?'　タップで開始':''}</small></div>`,hot,hot?0:1100);
  busy=false;
  if(cpu[cur])runAI();else panelIdle();
}
function endTurn(){if(over)return;sel=null;phase='idle';cur=1-cur;if(cur===0)turn++;
  if(turn>TURN_LIMIT){const a=scoreOf(0),b=scoreOf(1);showResult(a===b?-1:a>b?0:1,`${TURN_LIMIT}ターン経過：戦力評価 ${a} 対 ${b}`);return;}
  beginTurn();}

/* ---------- CPU ---------- */
async function runAI(){
  busy=true;panelIdle();
  const mine=units.filter(u=>u.side===cur&&!u.acted);
  for(const u of mine){if(over||!units.includes(u))continue;await aiUnit(u);await sleep(200);}
  if(!over)aiProduce();
  busy=false;if(!over){await sleep(400);endTurn();}
}
async function aiUnit(u){
  focusTile(u.c,u.r);origin=[u.c,u.r];
  const RR=reach(u);let best=null,cap=null;
  const foes=units.filter(x=>x.side!==u.side);
  if(isHealer(u)){await aiHeal(u,RR);return;}
  if(Math.random()<AI().skip){const ks=[...RR.set],k=ks[rnd(ks.length)],[wc,wr]=UK(k);sel=u;R=RR;phase='select';await sleep(250);
    if(wc!==u.c||wr!==u.r)await walk(u,pathTo(RR,K(u.c,u.r),k));u.acted=true;sel=null;phase='idle';return;}
  const hq=hqOf(u.side),threats=hq&&AI().threat?foes.filter(e=>dist(e.c,e.r,hq[0],hq[1])<=moveOf(e)+2):[];
  for(const k of RR.set){const [c,r]=UK(k),T=tiles[r][c];
    for(const e of foes){let bw=-1,bx=0;u.ws.forEach((w,s)=>{if(w<0||w===HEAL||!inRange(u,c,r,e,w))return;if(INDIRECT.includes(w)&&(c!==u.c||r!==u.r))return;const x=expDmg(u,e,e.c,e.r,w);if(bw<0||x>bx){bw=s;bx=x;}});if(bw<0)continue;
      const ex=bx;let sc=ex+(ex>=e.hp?60:0)+TER[T.t].def*2+(threats.includes(e)?25:0);
      if(ex<e.hp&&inRange(e,e.c,e.r,{c,r}))sc-=expDmg(e,u,c,r)*AI().risk;
      if(!best||sc>best.sc)best={sc,c,r,e,slot:bw};}
    if(TER[T.t].cap&&T.owner!==u.side){const sc=T.t==='H'?999:T.owner>=0?38:30;if(!cap||sc>cap.sc)cap={sc,c,r};}
  }
  sel=u;R=RR;phase='select';await sleep(250);
  if(cap&&(cap.sc>=999||!best||best.sc<cap.sc)){await walk(u,pathTo(RR,K(u.c,u.r),K(cap.c,cap.r)));sel=null;phase='idle';await capture(u);return;}
  if(best&&best.sc>0){await walk(u,pathTo(RR,K(u.c,u.r),K(best.c,best.r)));sel=null;phase='idle';await doAttack(u,best.e,best.slot);busy=true;return;}
  const goals=[];tiles.forEach((row,r)=>row.forEach((T,c)=>{if(TER[T.t].cap&&T.owner!==u.side)goals.push([c,r,T.t==='H'?0:2]);}));
  foes.forEach(e=>goals.push([e.c,e.r,threats.includes(e)?-2:1]));
  let tgt=null,bd=1e9;
  for(const k of RR.set){const [c,r]=UK(k);let m=1e9;goals.forEach(g=>m=Math.min(m,dist(c,r,g[0],g[1])+g[2]*.5));if(TER[tiles[r][c].t].prod&&tiles[r][c].owner===u.side)m+=3;if(m<bd){bd=m;tgt=[c,r];}}
  if(tgt&&(tgt[0]!==u.c||tgt[1]!==u.r))await walk(u,pathTo(RR,K(u.c,u.r),K(tgt[0],tgt[1])));
  u.acted=true;sel=null;phase='idle';
}
async function aiHeal(u,RR){
  origin=[u.c,u.r];
  const al=units.filter(x=>x.side===u.side&&x!==u),en=units.filter(x=>x.side!==u.side);let best=null;
  for(const k of RR.set){const [c,r]=UK(k);for(const a of al){if(dist(c,r,a.c,a.r)!==1||a.hp>=a.max)continue;const sc=(a.max-a.hp)+(a.hp/a.max<.4?30:0);if(!best||sc>best.sc)best={sc,c,r,a};}}
  sel=u;R=RR;phase='select';await sleep(250);
  if(best){await walk(u,pathTo(RR,K(u.c,u.r),K(best.c,best.r)));sel=null;phase='idle';await doHeal(u,best.a);busy=true;return;}
  let tgt=null,bd=1e9;
  for(const k of RR.set){const [c,r]=UK(k);let m=1e9;al.forEach(a=>m=Math.min(m,dist(c,r,a.c,a.r)+(a.hp<a.max?-1:0)));en.forEach(e=>{if(dist(c,r,e.c,e.r)<=3)m+=3;});if(m<bd){bd=m;tgt=[c,r];}}
  if(tgt&&(tgt[0]!==u.c||tgt[1]!==u.r))await walk(u,pathTo(RR,K(u.c,u.r),K(tgt[0],tgt[1])));
  u.acted=true;sel=null;phase='idle';
}
function aiProduce(){
  tiles.forEach((row,r)=>row.forEach((T,c)=>{
    if(!TER[T.t].prod||T.owner!==cur||unitAt(c,r))return;
    const mineU=units.filter(u=>u.side===cur),healerOk=mineU.length>=3&&!mineU.some(isHealer);
    const opts=PRESETS.filter(p=>costOf(p.cfg)<=funds[cur]-(mineU.length>5?400:0)&&(p.cfg.weap!==HEAL||healerOk));
    if(!opts.length)return;const tw=opts.map(q=>{const z=statsOf(q.cfg);const w0=z[0]+z[1];return aiLv===1?1:aiLv>=3?w0*w0:w0;}),sum=tw.reduce((x,y)=>x+y,0);let xr=Math.random()*sum,pi=0;while(pi<opts.length-1&&(xr-=tw[pi])>0)pi++;const p=opts[pi];funds[cur]-=costOf(p.cfg);spawn(cur,p.cfg,p.n,c,r);mapPop(c,r,'発進',SIDE[cur].css);
  }));statusUI();
}

/* ---------- 3D battle ---------- */
let camShake=0,camBase=[0,2.3,12.5];
let bR=null,bScene,bCam,bF=[],bfx=[],bT=0,bLast=0,skip=false;
const B3=(w,h,d)=>new THREE.BoxGeometry(w,h,d),S3=r=>new THREE.SphereGeometry(r,10,8),CL=(a,b,h,s)=>new THREE.CylinderGeometry(a,b,h,s||8);
function makePart(mats){return (geo,col,x,y,z,parent,rx,rz)=>{const p=new THREE.Group();
  p.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0x1b1f4e,transparent:true,opacity:.86})));
  const m=new THREE.LineBasicMaterial({color:col});m.base=col;mats.push(m);p.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),m));
  const e=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:col,transparent:true,opacity:.25}));e.scale.setScalar(1.05);p.add(e);
  p.position.set(x,y,z);if(rx)p.rotation.x=rx;if(rz)p.rotation.z=rz;parent.add(p);return p;};}
const HEADS=[(P,g,c)=>{P(B3(1.1,.8,.9),c,0,3.55,0,g);P(B3(.9,.22,.1),c,0,3.55,.48,g);P(CL(.04,.04,.5,6),c,0,4.2,0,g);},
 (P,g,c)=>{P(S3(.55),c,0,3.6,0,g);P(CL(.18,.18,.12,10),c,0,3.6,.55,g,PI/2);[-1,1].forEach(s=>P(CL(.03,.03,.9,6),c,s*.35,4.25,0,g,0,-s*.4));},
 (P,g,c)=>{P(B3(1.5,.65,1.1),c,0,3.5,0,g);P(B3(1.2,.15,.1),c,0,3.5,.58,g);[-1,1].forEach(s=>P(CL(0,.15,.7,4),c,s*.6,4.05,0,g,0,-s*.5));}];
const BODIES=[(P,g,c)=>{P(B3(2,1.7,1.1),c,0,2.1,0,g);P(new THREE.OctahedronGeometry(.35,0),c,0,2.15,.6,g);P(B3(1.5,.35,.9),c,0,1.05,0,g);},
 (P,g,c)=>{P(B3(2.6,1.9,1.5),c,0,2.05,0,g);P(B3(2.2,.5,.2),c,0,2.3,.82,g);P(B3(2.2,.5,.2),c,0,1.7,.82,g);P(B3(1.9,.4,1.2),c,0,.95,0,g);},
 (P,g,c)=>{P(CL(.9,.45,1.8,6),c,0,2.1,0,g);P(S3(.25),c,0,2.2,.75,g);P(CL(.4,.4,.35,6),c,0,1.05,0,g);}];
const SHX=[1.3,1.6,1.15];
const WEAPS=[(P,el,a,c)=>{P(B3(.45,.45,1.4),c,0,0,.4,el);P(CL(.1,.1,.5),c,0,0,1.3,el,PI/2);return [0,0,1.6];},
 (P,el,a,c)=>{P(B3(.8,.8,.9),c,.1,0,.1,el);[[-.15,-.15],[.15,-.15],[-.15,.15],[.15,.15]].forEach(([x,y])=>P(CL(.1,.1,.2),c,.1+x,y,.6,el,PI/2));P(B3(.7,.7,.8),c,0,.45,-.3,a);return [.1,0,.7];},
 (P,el,a,c)=>{P(CL(.35,.35,.3,10),c,0,0,.15,el,PI/2);el.drill=P(CL(0,.33,1.4,8),c,0,0,1,el,PI/2);return [0,0,1.7];},
 (P,el,a,c)=>{P(B3(.45,.5,.5),c,0,0,0,el);P(B3(.08,.35,2.2),c,0,0,1.3,el);P(B3(.2,.6,.15),c,0,0,.3,el);return [0,0,2.4];},
 (P,el,a,c)=>{P(B3(.3,.3,2.2),c,0,0,.9,el);P(B3(.55,.15,.9),c,0,0,.2,el);P(B3(.55,.15,.2),c,0,0,1.6,el);return [0,0,2.1];},
 (P,el,a,c)=>{P(B3(.5,.5,.7),c,0,0,.1,el);[[-.14,-.14],[.14,-.14],[-.14,.14],[.14,.14]].forEach(([x,y])=>P(CL(.07,.07,1.2,6),c,x,y,.9,el,PI/2));return [0,0,1.5];},
 (P,el,a,c)=>{P(B3(.14,.14,1.7),c,0,0,.5,el);P(B3(.8,.8,.9),c,0,0,1.6,el);return [0,0,2.1];},
 (P,el,a,c)=>{P(CL(.3,.3,1.2,8),c,0,0,.5,el,PI/2);P(CL(.42,.3,.35,8),c,0,0,1.2,el,PI/2);P(B3(.5,.4,.5),c,0,-.1,-.1,el);return [0,0,1.3];},
 (P,el,a,c)=>{P(B3(.5,.5,.9),c,0,0,.3,el);P(B3(.9,.18,.18),c,0,0,.9,el);P(B3(.18,.9,.18),c,0,0,.9,el);return [0,0,1.0];}];
const LEGS=[(P,g,c)=>{[-1,1].forEach(s=>{P(B3(.5,1.1,.55),c,s*.45,.25,0,g);P(S3(.22),c,s*.45,-.4,0,g);P(B3(.45,1.1,.5),c,s*.45,-1.05,0,g);P(B3(.75,.25,1.1),c,s*.45,-1.75,.15,g);});return false;},
 (P,g,c)=>{P(B3(1.4,.6,1),c,0,.45,0,g);P(B3(.4,1.1,.4),c,0,-.4,0,g);[-1,1].forEach(s=>{P(B3(.6,.9,2.4),c,s*.85,-1.5,0,g);[-.8,0,.8].forEach(z=>P(CL(.3,.3,.65,10),c,s*.85,-1.5,z,g,0,PI/2));});return false;},
 (P,g,c)=>{P(CL(.35,.6,1,6),c,0,.2,0,g);P(CL(1.3,1.3,.25,16),c,0,-.55,0,g);[[-.8,0],[.8,0],[0,.8],[0,-.8]].forEach(([x,z])=>P(CL(.25,.15,.3,8),c,x,-.85,z,g));return true;}];
function buildRobot(cfg,c){
  const g=new THREE.Group(),mats=[],P=makePart(mats);HEADS[cfg.head](P,g,c[0]);BODIES[cfg.body](P,g,c[1]);const bx=SHX[cfg.body];
  const L=new THREE.Group();L.position.set(-bx,2.75,0);g.add(L);P(S3(.3),c[2],0,0,0,L);P(B3(.38,1,.38),c[2],0,-.7,0,L);
  let el2=null,mz2=null;
  if(cfg.weap2>=0){el2=new THREE.Group();el2.position.set(0,-1.45,0);L.add(el2);const m2=WEAPS[cfg.weap2](P,el2,L,c[2]);mz2=new THREE.Object3D();mz2.position.set(...m2);el2.add(mz2);}
  else{P(B3(.36,.9,.36),c[2],0,-1.6,0,L);P(B3(.5,.35,.45),c[2],0,-2.2,0,L);}
  const a=new THREE.Group();a.position.set(bx,2.75,0);g.add(a);P(S3(.32),c[2],0,0,0,a);P(B3(.4,1,.4),c[2],0,-.7,0,a);
  const el=new THREE.Group();el.position.set(0,-1.45,0);a.add(el);const mp=WEAPS[cfg.weap](P,el,a,c[2]);const mz=new THREE.Object3D();mz.position.set(...mp);el.add(mz);
  const lg=new THREE.Group();g.add(lg);const hover=LEGS[cfg.legs](P,lg,c[3]);
  return {g,mats,a,el,el2,mz,mzs:[mz,mz2],L,hover,drills:[el.drill,el2&&el2.drill].filter(Boolean)};
}
function addAura(r){const g=new THREE.Group();r.auras=[];
  [2.1,2.5,2.9].forEach((rad,i)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad*.8,6.5,28,1,true),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.06,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));
    m.position.y=1.6;g.add(m);r.auras.push(m);});
  r.g.add(g);}
function initBattle(){
  bR=new THREE.WebGLRenderer({antialias:true});bR.setPixelRatio(Math.min(devicePixelRatio,2));$('battle').prepend(bR.domElement);
  bScene=new THREE.Scene();bScene.background=new THREE.Color(0x121640);bCam=new THREE.PerspectiveCamera(45,1,.1,100);
  const sg=new THREE.BufferGeometry(),sp=[];for(let i=0;i<500;i++)sp.push((Math.random()-.5)*44,(Math.random()-.3)*28,-6-Math.random()*18);
  sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));bScene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xe9e6ff,size:.07})));
  const gr=new THREE.GridHelper(20,20,0x7a62d6,0x2d2f6e);gr.position.y=-1.85;bScene.add(gr);
  $('battle').addEventListener('click',()=>{skip=true;});
}
function sizeBattle(){const el=$('battle'),w=el.clientWidth,h=el.clientHeight;bR.setSize(w,h);bCam.aspect=w/h;bCam.updateProjectionMatrix();camBase=[0,2.3,Math.max(w<500?12.5:10.8,12.5/(w/h))];bCam.position.set(...camBase);bCam.lookAt(0,.3,0);}
function bHud(){const [A,Bb]=bF;
  [[A,'A'],[Bb,'B']].forEach(([f,k])=>{$('bn'+k).textContent=SIDE[f.u.side].n+' '+f.u.name;$('bh'+k).textContent=Math.max(0,f.hp);$('bb'+k).style.width=Math.max(0,f.hp/f.u.max*100)+'%';const T=TER[tiles[f.u.r][f.u.c].t];$('bt'+k).textContent='地形：'+T.n+' '+terLine(T,true);});}
const bsl=ms=>sleep(skip?0:ms);
function bodyPos(f){return new THREE.Vector3(f.g.position.x,f.g.position.y+1.3,f.g.position.z);}
const rm=m=>{bScene.remove(m);if(m.geometry)m.geometry.dispose();if(m.material)m.material.dispose();};
function bSparks(pos,color,n){for(let i=0;i<n;i++){const m=new THREE.Mesh(B3(.09,.09,.09),new THREE.MeshBasicMaterial({color:i%3?color:0xffffff,transparent:true}));m.position.copy(pos);
  const v=new THREE.Vector3((Math.random()-.5)*7,Math.random()*6-1,(Math.random()-.5)*7);bScene.add(m);let life=.7;
  bfx.push({kill:()=>rm(m),up(dt){life-=dt;m.position.addScaledVector(v,dt);v.y-=8*dt;m.rotation.x+=.3;m.material.opacity=Math.max(0,life/.7);if(life<=0){rm(m);return false}return true}});}}
function bBeam(fa,fd,color){const a=new THREE.Vector3();fa.mzs[fa.arm].getWorldPosition(a);const b=bodyPos(fd);const d=b.clone().sub(a),len=d.length(),mid=a.clone().add(b).multiplyScalar(.5),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
  [[.05,1],[.18,.3]].forEach(([r,o])=>{const m=new THREE.Mesh(CL(r,r,len,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:o}));m.position.copy(mid);m.quaternion.copy(q);bScene.add(m);let life=.35;
  bfx.push({kill:()=>rm(m),up(dt){life-=dt;m.material.opacity=o*Math.max(0,life/.35);if(life<=0){rm(m);return false}return true}});});}
function bMissile(fa,fd,color,delay){return new Promise(res=>{setTimeout(()=>{const a=new THREE.Vector3();fa.mzs[fa.arm].getWorldPosition(a);const b=bodyPos(fd);b.y+=(Math.random()-.5)*.6;
  const c=a.clone().add(b).multiplyScalar(.5);c.y+=2.5+Math.random()*1.5;c.z+=(Math.random()-.5)*3;const m=new THREE.Mesh(B3(.14,.14,.4),new THREE.MeshBasicMaterial({color}));bScene.add(m);let k=0;const prev=a.clone();
  bfx.push({kill:()=>{rm(m);res();},up(dt){k+=dt/.65;const u=Math.min(1,k);const p=a.clone().multiplyScalar((1-u)*(1-u)).add(c.clone().multiplyScalar(2*u*(1-u))).add(b.clone().multiplyScalar(u*u));
   m.position.copy(p);m.lookAt(p.clone().add(p.clone().sub(prev)));prev.copy(p);if(u>=1){rm(m);bSparks(b,color,10);res();return false}return true}});},skip?0:delay);});}
function bPop(f,text,color,o){o=o||{};const v=bodyPos(f);v.y+=1.3;v.project(bCam);const el=document.createElement('div');el.className='pop'+(o.dmg?' dmg':'');if(!o.dmg)el.style.color=color;el.style.fontSize=(o.size||22)+'px';
  el.innerHTML=text+(o.sub?`<small>${o.sub}</small>`:'');
  const bt=$('battle');el.style.left=((v.x+1)/2*bt.clientWidth+(Math.random()-.5)*26)+'px';el.style.top=((1-v.y)/2*bt.clientHeight+(o.dy||0))+'px';bt.appendChild(el);setTimeout(()=>el.remove(),1000);}
const SPN=['ギガ・ブラスト','ミサイル・ストーム','ドリル・ブレイク','ギャラクシー斬','超電磁砲','ガトリング・ラッシュ','メテオ・クラッシュ','グレネード・バースト'];
let auroraTex=null;
function getAuroraTex(){if(auroraTex)return auroraTex;const c=document.createElement('canvas');c.width=4;c.height=128;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,128);
  g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.3,'rgba(255,255,255,.55)');g.addColorStop(.62,'rgba(255,255,255,.22)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,4,128);
  auroraTex=new THREE.CanvasTexture(c);return auroraTex;}
function addSpAura(r){const g=new THREE.Group(),tex=getAuroraTex();
  for(let i=0;i<4;i++){const rad=1.6+i*.35,m=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad*.85,7.2,28,1,true,i*1.6,Math.PI*.85),new THREE.MeshBasicMaterial({map:tex,color:0xffd75e,transparent:true,opacity:.34,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));m.position.y=1.8;g.add(m);}
  r.g.add(g);r.spAura=g;}
function delSpAura(r){if(r.spAura){r.g.remove(r.spAura);r.spAura.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});r.spAura=null;}}
function splitDmg(t,n){if(n<=1)return [t];const w=Array.from({length:n},()=>.6+Math.random()),sm=w.reduce((a,b)=>a+b,0),p=w.map(x=>Math.floor(t*x/sm));let r=t-p.reduce((a,b)=>a+b,0);for(let i=0;r>0;i=(i+1)%n,r--)p[i]++;return p;}
async function bAttack(fa,fd,ev){
  const col=SIDE[fa.u.side].c3[0],css=SIDE[fa.u.side].css,w=ev.w,key=ev.arm?'l':'a';
  fa.arm=ev.arm;fa.aim=1;
  const nHit={0:1,4:1,5:6,1:4,7:4,2:4,3:2,6:1}[w]||1,n=ev.ev?1:Math.min(Math.ceil(nHit*(ev.sp?1.5:1)),Math.max(1,ev.dmg)),parts=ev.ev?[0]:splitDmg(ev.dmg,n);
  let hi=0;
  if(ev.sp){SFX.special();const bt=$('battle'),bn=document.createElement('div');bn.className='bsp';bn.innerHTML='必殺技！<small>'+SPN[w]+'</small>';bt.appendChild(bn);setTimeout(()=>bn.remove(),1200);
    addSpAura(fa);fa.glow=1.1;fa.aim=1;fa.tLean=-.25;fa.armT[key]=-2.4;fa.armK=.2;camShake=1.2;await bsl(1000);}
  const arm=v=>{fa.armT[key]=v;};
  const rest=()=>{fa.armT.a=null;fa.armT.l=null;fa.tLean=0;fa.tTwist=0;fa.tHop=0;fa.armK=.18;};
  const hit=()=>{
    if(ev.ev){if(hi===0){SFX.miss();fd.dodge=.45;fd.tTwist=fd.face*.45;setTimeout(()=>{fd.tTwist=0;},420);bPop(fd,'MISS','#a2a4d6',{size:24,sub:ev.tev?'地形効果 回避+'+Math.round(ev.tev*100)+'%':''});}hi++;bHud();return;}
    if(hi>=parts.length){hi++;return;}
    const part=parts[hi++],last=hi===parts.length;
    SFX.hit();fd.hp-=part;fd.shake=.3;fd.flash=.25;fd.react=1;fd.stagger=Math.min(.9,.2+part/fd.u.max*3);camShake=Math.min(2,camShake+.15+part/fd.u.max*3);
    bPop(fd,'-'+part,css,{size:(parts.length>1?22:38)+(ev.sp?8:0),dmg:1,sub:ev.sp&&parts.length===1?'★'+SPN[w]:''});
    if(last){
      if(ev.sp){const f2=document.createElement('div');f2.className='bflash';$('battle').appendChild(f2);setTimeout(()=>f2.remove(),500);bPop(fd,'必殺！','#ffd75e',{size:24,dy:-60,sub:SPN[w]});camShake=2.6;}
      if(parts.length>1)bPop(fd,'合計 '+ev.dmg,'#ff3040',{size:26,dy:34,dmg:1});
      if(ev.crit)bPop(fd,'CRITICAL!','#ffd75e',{size:20,dy:-34});
      if(ev.tdef>0)bPop(fd,'',css,{size:1,dy:8,sub:'地形防御で -'+ev.tdef});
      if(fd.hp<=0){fd.dead=true;fd.tLean=0;setTimeout(SFX.boom,250);camShake=2;}
    }
    bHud();};
  if(BEAMS.includes(w)){
    fa.tLean=-.12;arm(-1.45);fa.armK=.2;await bsl(w===4?560:380);
    if(w===5){for(let i=0;i<n+(ev.ev?5:0);i++){arm(-1.45+(i%2?.12:-.12));SFX.beam();bBeam(fa,fd,col);if(!ev.ev)bSparks(bodyPos(fd),col,6);hit();fa.stagger=.08;await bsl(90);}}
    else{SFX[WEAPON_SFX[w]]();bBeam(fa,fd,col);if(!ev.ev)bSparks(bodyPos(fd),col,22);hit();fa.stagger=w===4?.55:.25;fa.tLean=-.3;if(w===4)camShake+=.7;await bsl(480);}
    await bsl(120);
  }else if(INDIRECT.includes(w)){
    arm(-1.85);fa.tLean=-.25;fa.armK=.2;await bsl(380);
    const pr=[0,110,220,330].map(d=>{setTimeout(SFX.missile,skip?0:d);return bMissile(fa,fd,col,d).then(()=>{if(!ev.ev||hi===0)hit();});});
    fa.stagger=.3;await Promise.all(pr);await bsl(380);
  }else{
    fa.tLean=-.3;fa.tTwist=-fa.face*.5;arm(-2.7);fa.armK=.22;await bsl(w===6?420:320);
    fa.dash=1;fa.tLean=.35;fa.tTwist=0;await bsl(260);
    for(let i=0;i<n;i++){
      if(w===6){fa.tHop=1.1;arm(-2.9);await bsl(240);}
      fa.armK=.5;arm(-.3);fa.tHop=0;SFX[WEAPON_SFX[w]]();await bsl(w===6?120:95);
      if(!ev.ev)bSparks(bodyPos(fd),col,w===6?32:14);
      hit();if(w===6)camShake+=1;
      if(i<n-1){fa.armK=.28;fa.tTwist=(i%2?1:-1)*fa.face*.5;arm(-2.3+(i%2)*.5);fa.spin=.3;await bsl(w===2?100:170);}
    }
    fa.spin=.5;await bsl(280);fa.dash=0;rest();await bsl(320);
  }
  fa.aim=0;rest();delSpAura(fa);
}
async function playBattle(a,d,evs){
  if(!bR)initBattle();
  $('battle').hidden=false;sizeBattle();skip=false;bgmFast=true;
  bF.forEach(f=>{bScene.remove(f.g);f.g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});bfx.forEach(f=>f.kill());bfx=[];
  const left=a.side===0?a:d,right=left===a?d:a;
  bF=[left,right].map((u,i)=>{const r=buildRobot(u.cfg,SIDE[u.side].c3);const x=i?3.2:-3.2,face=i?-1:1;
    Object.assign(r,{u,hp:u.hp,x,cx:x,face,react:0,glow:0,stagger:0,tLean:0,tTwist:0,tHop:0,hopC:0,armT:{a:null,l:null},armK:.18,victory:0,baseY:face>0?PI/2-.35:-PI/2+.35,arm:0,aim:0,dash:0,shake:0,flash:0,dodge:0,dead:false,spin:0});
    r.g.scale.setScalar(.62);r.g.rotation.y=r.baseY;if(u.aura)addAura(r);bScene.add(r.g);return r;});
  bHud();bLast=performance.now();
  await bsl(450);
  for(const ev of evs){const fa=bF.find(f=>f.u===ev.att),fd=bF.find(f=>f.u===ev.def);await bAttack(fa,fd,ev);await bsl(300);}
  const alive=bF.filter(f=>f.hp>0);
  if(alive.length===1&&bF.length===2){const wv=alive[0];wv.victory=1;wv.tHop=.8;await bsl(320);wv.tHop=0;await bsl(650);}else await bsl(700);
  bfx.forEach(f=>f.kill());bfx=[];
  $('battle').hidden=true;bgmFast=false;camShake=0;
}
function battleFrame(){
  const now=performance.now(),dt=Math.min(.05,(now-bLast)/1000);bLast=now;bT+=dt;
  bF.forEach((r,i)=>{
    r.react=Math.max(0,r.react-dt*2.5);r.stagger=Math.max(0,r.stagger-dt*1.6);r.hopC+=(r.tHop-r.hopC)*.25;
    const base=-.6+(r.hover?.15+Math.sin(bT*2.5+i)*.12:Math.sin(bT*2+i)*.04)+r.hopC;
    const tx=r.x+(r.dash?r.face*(Math.abs(r.x)*2-2.2):0);r.cx+=(tx-r.cx)*.25;r.dodge=Math.max(0,r.dodge-dt);
    r.g.position.x=r.cx-r.face*r.stagger+(r.shake>0?(Math.random()-.5)*.25:0);r.g.rotation.x+=((r.dead?0:r.tLean-r.react*.5)-r.g.rotation.x)*.25;r.g.rotation.y+=((r.baseY+r.tTwist)-r.g.rotation.y)*.2;r.g.position.z=r.dodge>0?Math.sin((1-r.dodge/.45)*PI)*1.4:0;
    if(r.dead){r.g.rotation.z+=(r.face*-.6-r.g.rotation.z)*.05;r.g.position.y+=(-1.1-r.g.position.y)*.05;}else r.g.position.y=base;
    let atR=r.armT.a!==null?r.armT.a:(r.aim&&r.arm===0?-1.45:0),atL=r.armT.l!==null?r.armT.l:(r.aim&&r.arm===1?-1.45:0);if(r.victory){atR=atL=-2.8;}r.a.rotation.x+=(atR-r.a.rotation.x)*r.armK;r.el.rotation.x=-r.a.rotation.x*(r.armT.a!==null?.35:1);r.L.rotation.x+=(atL-r.L.rotation.x)*r.armK;if(r.el2)r.el2.rotation.x=-r.L.rotation.x*(r.armT.l!==null?.35:1);r.L.rotation.z=Math.sin(bT*2+i)*.06;
    r.spin=Math.max(0,r.spin-dt);r.drills.forEach(dr=>{dr.rotation.y+=(r.spin>0||r.dash?.6:.08);});
    if(r.auras)r.auras.forEach((m,j)=>{m.material.color.setHSL(((bT*.12+j*.31)%1),.9,.6);m.rotation.y+=dt*(.6+j*.3);m.scale.y=1+Math.sin(bT*2+j)*.08;});
    if(r.spAura){r.spAura.children.forEach((m,j)=>{m.rotation.y+=dt*(1.6+j*.9)*(j%2?-1:1);m.scale.set(1+Math.sin(bT*10+j)*.1,1+Math.sin(bT*7+j)*.15,1+Math.sin(bT*10+j)*.1);m.material.opacity=.3+Math.sin(bT*6+j*1.7)*.1;m.material.color.setHSL((.08+.1*Math.sin(bT*2+j)+(j%2)*.82)%1,.9,.62);});if(Math.random()<.7)bSparks(new THREE.Vector3(r.g.position.x+(Math.random()-.5)*1.4,r.g.position.y+.2,r.g.position.z+(Math.random()-.5)*.8),Math.random()<.5?0xffd75e:0xff6a1a,1);}
    r.shake=Math.max(0,r.shake-dt);r.flash=Math.max(0,r.flash-dt);
    r.glow=Math.max(0,r.glow-dt);r.mats.forEach(m=>m.color.setHex(r.flash>0&&Math.floor(r.flash*30)%2?0xffffff:(r.dead?0x4a4c7a:(r.glow>0&&Math.floor(bT*16)%2?0xffd75e:m.base))));
  });
  for(let i=bfx.length-1;i>=0;i--)if(!bfx[i].up(dt))bfx.splice(i,1);
  camShake=Math.max(0,camShake-dt*3);bCam.position.set(camBase[0]+(Math.random()-.5)*camShake*.6,camBase[1]+(Math.random()-.5)*camShake*.4,camBase[2]);
  bR.render(bScene,bCam);
}

/* ---------- boot ---------- */
setPanel(panelOpen);enterTitle();requestAnimationFrame(loop);
