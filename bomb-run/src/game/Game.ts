import { CONFIG,DEFAULT_SETTINGS,type Settings } from './GameConfig';
import { RoundSimulation,type Phase } from './GameState';
import { generateWorld,type World } from '../world/WorldGenerator';
import { WorldRenderer } from '../world/WorldRenderer';
import { FlightControls } from '../flight/FlightControls';
import { drawMap } from '../map/TacticalMap';
import { stepBomb,releaseBomb } from '../bomb/BombPhysics';
import { compareEntries,totalScore,type RoundResult,type Entry } from '../bomb/ImpactScoring';
import { AudioManager } from '../audio/AudioManager';
import { LocalRoomService,aiResult,localDailyDate,dailySeed } from '../network/RoomService';
import type { Replay } from '../network/ScoreVerification';
import { shell,menu,button,escapeHtml } from '../ui/UI';
type Mode='play'|'practice'|'friends'|'daily';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
function read<T>(key:string,fallback:T):T {try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
function save(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
export class Game {
  settings:Settings={...DEFAULT_SETTINGS,...read<Partial<Settings>>('bomb-run-settings',{})};
  view:WorldRenderer;controls:FlightControls;audio=new AudioManager();rooms=new LocalRoomService();
  sim:RoundSimulation|null=null;phase:Phase='menu';mode:Mode='play';round=1;seed='';slot=0;name='PILOT';roomCode='';
  replays:Replay[]=[];results:RoundResult[]=[];worlds:World[]=[];previousTime=0;time=0;lastTrajectory=0;best=read<number>('bomb-run-best',0);private frame=0;private hidden=false;
  constructor(){
    document.querySelector('#app')!.innerHTML=shell();
    try{this.view=new WorldRenderer($<HTMLCanvasElement>('world'),this.settings);}catch(e){$('panels').innerHTML='<section class="modal"><h1>WebGL을 시작할 수 없어요</h1><p>하드웨어 가속을 켜고 최신 브라우저에서 다시 열어주세요.</p></section>';throw e;}
    this.controls=new FlightControls($('world'),()=>this.drop(),()=>this.settings.sensitivity);
    this.audio.enabled=this.settings.sound;this.home();
    document.addEventListener('click',e=>{const el=(e.target as HTMLElement).closest<HTMLElement>('[data-action]');if(el){e.preventDefault();void this.action(el.dataset.action!);}});
    document.addEventListener('visibilitychange',()=>{this.hidden=document.hidden;this.previousTime=0;});
    requestAnimationFrame(t=>this.loop(t));
    // Read-only diagnostics for browser QA. Gameplay controls remain normal UI inputs.
    Object.defineProperty(window,'bombRun',{value:{get state(){return gameSnapshot();}},writable:false});
    const gameSnapshot=()=>({phase:this.phase,round:this.round,score:totalScore(this.results),flightTime:this.sim?.flightTime,bomb:this.sim?.bomb,worldSeed:this.sim?.world.seed,errors:this.sim?.world.difficulty});
  }
  home(){this.sim=null;this.phase='menu';this.audio.update(0,false);$('hud').hidden=true;$('dialog').hidden=true;$('header').classList.remove('in-game');$('footer').hidden=false;$('panels').innerHTML=menu(this.best);this.view.setWorld(generateWorld('home-11',1));this.controls.clear();}
  private toast(text:string){$('toast').textContent=text;$('toast').classList.add('visible');window.setTimeout(()=>$('toast').classList.remove('visible'),3500);}
  async action(action:string){
    try{
      if(action==='home'){this.home();return;}
      if(action==='sound'){this.settings.sound=!this.settings.sound;this.audio.enabled=this.settings.sound;save('bomb-run-settings',this.settings);await this.audio.unlock();this.toast(this.settings.sound?'사운드 ON':'사운드 OFF');return;}
      if(action==='settings'){this.showSettings();return;}
      if(action==='close'){$('dialog').hidden=true;return;}
      if(action==='save-settings'){this.settings.sound=$<HTMLInputElement>('setting-sound').checked;this.settings.reducedMotion=$<HTMLInputElement>('setting-motion').checked;this.settings.trajectory=$<HTMLInputElement>('setting-trajectory').checked;this.settings.quality=$<HTMLSelectElement>('setting-quality').value as Settings['quality'];this.settings.sensitivity=Number($<HTMLInputElement>('setting-sensitivity').value);this.audio.enabled=this.settings.sound;save('bomb-run-settings',this.settings);this.view.resize();$('dialog').hidden=true;return;}
      if(action==='friends'){this.showFriends();return;}
      if(action==='room-create'){$<HTMLInputElement>('room-code').value=this.rooms.create();this.toast('같은 기기에서 최대 5명이 순서대로 도전합니다.');return;}
      if(action==='room-start'){this.name=$<HTMLInputElement>('nickname').value.trim().slice(0,20)||'PILOT';this.roomCode=$<HTMLInputElement>('room-code').value.trim().toUpperCase();this.slot=this.rooms.join(this.roomCode,this.name);await this.start('friends',`room-${this.roomCode}`);return;}
      if(action==='daily'){this.showDaily();return;}
      if(action==='daily-start'){await this.start('daily',dailySeed(localDailyDate()));return;}
      if(action==='practice-daily'){await this.start('practice',dailySeed(localDailyDate()));return;}
      if(action==='play'||action==='practice'){await this.start(action);return;}
      if(action==='again'){await this.start(this.mode,this.mode==='daily'?dailySeed(localDailyDate()):this.mode==='friends'?`room-${this.roomCode}`:undefined);return;}
      if(action==='next'){if(this.round>=CONFIG.rounds){this.finish();return;}this.round++;this.beginRound();return;}
      if(action==='download-replay'){const data={version:1,mode:this.mode,seed:this.seed,slot:this.slot,name:this.name,results:this.results,replays:this.replays};const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='bomb-run-flight-log.json';a.click();URL.revokeObjectURL(url);return;}
      if(action==='copy-code'){try{await navigator.clipboard.writeText(this.roomCode);this.toast('도전 코드를 복사했습니다. 결과는 기기 간 동기화되지 않습니다.');}catch{this.toast(`도전 코드: ${this.roomCode}`);}return;}
    }catch(e){this.toast(e instanceof Error?e.message:'작업을 완료하지 못했습니다.');}
  }
  private async start(mode:Mode,seed?:string){
    this.mode=mode;this.seed=seed||crypto.randomUUID();if(mode!=='friends'){this.slot=0;this.name='YOU';}
    this.results=[];this.replays=[];this.round=1;this.worlds=[];$('dialog').hidden=true;await this.audio.unlock();this.controls.resetCamera();
    // Precompute five lightweight shared worlds; scene meshes are built only for the current round.
    for(let i=1;i<=CONFIG.rounds;i++)this.worlds.push(generateWorld(this.seed,i));
    this.beginRound();
  }
  private beginRound(){
    const w=this.worlds[this.round-1];this.sim=new RoundSimulation(w,this.slot);this.view.setWorld(w);this.controls.clear();this.controls.resetCamera();this.phase='briefing';
    $('header').classList.add('in-game');$('footer').hidden=true;$('hud').hidden=true;
    $('panels').innerHTML=`<section class="briefing"><div class="briefing-heading"><span>MISSION BRIEFING</span><strong>ROUND ${String(this.round).padStart(2,'0')} <small>/ 05</small></strong></div><div class="map-paper"><div class="map-header"><span>OPERATION ${String(this.round).padStart(2,'0')}</span><strong>${w.archetype}</strong><span id="map-count">5</span></div><canvas id="tactical-map" aria-label="작전 지도: 빨간 십자선이 목표이며 출발 지점은 표시되지 않습니다"></canvas><div class="map-footer"><span>⊕ 훈련 표적</span><span>← 북쪽 기준 · 출발 위치 비공개</span></div></div><p class="briefing-tip">강, 마을, 산의 위치를 기억하세요. <strong>5초 후 지도가 사라집니다.</strong></p><div class="briefing-info"><span>≋ 바람 ${Math.hypot(w.wind.x,w.wind.z).toFixed(1)} m/s</span><span>난이도 ${Math.round(w.difficulty)} / 100</span><span>${this.mode==='practice'?'연습 모드 · 궤적 보조 가능':'한 라운드, 단 한 발'}</span></div></section>`;
    drawMap($<HTMLCanvasElement>('tactical-map'),w);
  }
  drop(){if(this.sim?.drop()){this.audio.tone('drop');this.view.showTrajectory([]);this.controls.clear();$('panels').innerHTML='';this.phase='bomb';$('phase-label').textContent='BOMB AWAY';this.toast('투하 완료 · 바람에 맡겨보세요');}}
  private changedPhase(phase:Phase){
    this.phase=phase;
    if(phase==='mapExit')document.querySelector('.map-paper')?.classList.add(this.settings.reducedMotion?'fade-away':'fly-away');
    if(phase==='flight'){$('panels').innerHTML='';$('hud').hidden=false;$('phase-label').textContent=this.mode==='practice'?'PRACTICE · FIND YOUR TARGET':'FIND YOUR TARGET';}
    if(phase==='result'){if(this.sim?.bomb){this.view.revealImpact(this.sim.bomb);this.audio.tone('impact');}this.showResult();}
  }
  private showResult(){
    const result=this.sim!.result!;this.results.push(result);this.replays.push({slot:this.slot,inputs:this.sim!.inputs,dropTick:this.sim!.dropTick});$('hud').hidden=true;
    $('panels').innerHTML=`<section class="result-panel"><span class="eyebrow">ROUND ${String(this.round).padStart(2,'0')} COMPLETE</span><h2>${result.dropped?result.score>=80?'A perfect little moment.':result.score>=30?'So close to the mark.':'Every flight teaches you.':'MISSION FAILED'}</h2><div class="score-number"><span id="score-count">0</span><small>/ 100</small></div><p>${result.distance===null?'미투하 · 0 POINTS':`목표까지 <strong>${result.distance.toFixed(1)} m</strong> · 수평 착탄 오차`}</p><div class="round-dots">${Array.from({length:5},(_,i)=>`<div class="${i<this.results.length?'done':''}"><span>${String(i+1).padStart(2,'0')}</span><strong>${this.results[i]?.score??'—'}</strong></div>`).join('')}</div><div class="result-actions">${button(this.round===5?'최종 결과 보기 →':'다음 라운드 →','next','primary')}${button('메뉴로','home','text-button')}</div></section>`;
  }
  private finish(){
    this.phase='final';this.sim!.phase='final';this.audio.tone('score');const total=totalScore(this.results),improved=total>this.best;
    if(this.mode!=='practice'&&improved){this.best=total;save('bomb-run-best',total);}
    let entries:Entry[]=[{name:this.name,results:this.results}],label='AI 모의 경쟁 · 온라인 순위가 아닙니다';
    if(this.mode==='friends'){entries=this.rooms.finish(this.roomCode,this.name,this.results);label=`로컬 방 ${this.roomCode} · 같은 기기에 저장된 결과`;}else{
      entries.push(...['MILO','POPPY','FINN','OLIVE'].map((name,i)=>({name,ai:true,results:this.worlds.map(w=>aiResult(w,i+1))})));
    }
    entries.sort(compareEntries);
    if(this.mode==='daily'){
      const key=`bomb-run-daily-${localDailyDate()}`,old=read<{best:number;official:number|null}>(key,{best:0,official:null});
      save(key,{best:Math.max(old.best,total),official:old.official??total});label=`오늘의 로컬 도전 · UTC ${localDailyDate()} · 첫 완료 기록 ${old.official??total}점 · 서버 순위 없음`;
    }
    const board=entries.map((e,i)=>`<div class="leader-row ${e.name===this.name&&!e.ai?'self':''}"><span>${String(i+1).padStart(2,'0')}</span><strong>${escapeHtml(e.name)} <small>${e.ai?'AI':'PILOT'}</small></strong><div class="mini-scores">${e.results.map(r=>`<span>${r.score}</span>`).join('')}</div><b>${totalScore(e.results)}</b></div>`).join('');
    const room=this.mode==='friends'?this.rooms.read(this.roomCode):null;
    $('panels').innerHTML=`<section class="final-panel"><span class="eyebrow">ALL FIVE FLIGHTS. ONE ADVENTURE.</span><h2>Mission accomplished.</h2><div class="final-summary"><div class="score-number">${total}<small>/ 500</small></div><div><span>${this.mode==='practice'?'PRACTICE COMPLETE':improved?'✦ NEW PERSONAL BEST':'YOUR FLIGHT SCORE'}</span><p>${this.results.filter(r=>r.dropped).length}회 투하 · ${this.results.filter(r=>r.distance!==null).reduce((s,r)=>s+r.distance!,0).toFixed(0)}m 누적 오차</p></div></div><div class="leaderboard"><div class="board-title"><strong>FLIGHT LOG</strong><span>${escapeHtml(label)}</span></div>${board}${room?room.entries.filter(e=>e.results.length<5).map(e=>`<div class="waiting">${escapeHtml(e.name)} · 아직 완료하지 않음</div>`).join(''):''}</div><div class="result-actions">${button('다시 날아볼까요? ↗','again','primary')}${button('메뉴로','home','secondary')}${button('비행 기록 다운로드','download-replay','text-button')}${this.mode==='friends'?button('코드 복사','copy-code','text-button'):''}</div></section>`;
  }
  private showSettings(){
    $('dialog').hidden=false;$('dialog').innerHTML=`<section class="modal"><span class="eyebrow">MAKE YOURSELF AT HOME</span><h2>비행 설정</h2><label class="setting">사운드 <input id="setting-sound" type="checkbox" ${this.settings.sound?'checked':''}></label><label class="setting">움직임 줄이기 <input id="setting-motion" type="checkbox" ${this.settings.reducedMotion?'checked':''}></label><label class="setting">연습 모드 낙하 궤적 <input id="setting-trajectory" type="checkbox" ${this.settings.trajectory?'checked':''}></label><label class="setting">그래픽 품질 <select id="setting-quality">${(['auto','low','high'] as const).map(v=>`<option value="${v}" ${v===this.settings.quality?'selected':''}>${{auto:'자동',low:'낮음',high:'높음'}[v]}</option>`).join('')}</select></label><label class="setting">카메라 감도 <input id="setting-sensitivity" type="range" min="0.3" max="2" step="0.1" value="${this.settings.sensitivity}"></label><p class="modal-note">설정 중에는 진행이 일시 정지됩니다. 모바일은 가로 화면을 권장합니다.</p><div class="result-actions">${button('저장하기','save-settings','primary')}${button('닫기','close','text-button')}</div></section>`;
  }
  private showFriends(){
    $('dialog').hidden=false;$('dialog').innerHTML=`<section class="modal"><span class="eyebrow">PASS THE CONTROLS</span><h2>친구와 같은 하늘을</h2><p>백엔드 없이 실행되는 <strong>로컬 데모</strong>입니다. 같은 기기에서 최대 5명이 번갈아 플레이하세요. 코드를 공유하면 다른 기기에서도 같은 지형을 플레이할 수 있지만 결과는 동기화되지 않습니다.</p><label class="field">닉네임<input id="nickname" maxlength="20" placeholder="PILOT" autocomplete="off"></label><label class="field">6자리 도전 코드<input id="room-code" maxlength="6" placeholder="새 방을 만들거나 코드 입력" autocomplete="off"></label><div class="result-actions">${button('새 로컬 방 만들기','room-create','secondary')}${button('참가 및 출격 ↗','room-start','primary')}${button('닫기','close','text-button')}</div></section>`;
  }
  private showDaily(){
    const today=read<{best:number;official:number|null}>(`bomb-run-daily-${localDailyDate()}`,{best:0,official:null}),yesterday=read<{best:number;official:number|null}>(`bomb-run-daily-${localDailyDate(-1)}`,{best:0,official:null});
    $('dialog').hidden=false;$('dialog').innerHTML=`<section class="modal"><span class="eyebrow">A NEW SKY, EVERY DAY · UTC</span><h2>오늘의 로컬 도전</h2><p>${localDailyDate()} · 모두 같은 5개 지형과 바람.<br>첫 완료 기록은 하루 한 번 저장하며 최고 기록은 갱신됩니다. 연습 기록은 별도입니다.</p><div class="daily-stats"><div><span>첫 완료</span><strong>${today.official??'—'}</strong></div><div><span>오늘 최고</span><strong>${today.best}</strong></div><div><span>어제 최고</span><strong>${yesterday.best}</strong></div></div><p class="modal-note">로컬 기록만 저장됩니다. 서버 날짜·비밀 시드·검증된 온라인 리더보드는 백엔드 연결 후 제공됩니다.</p><div class="result-actions">${button(today.official===null?'오늘의 도전 시작 ↗':'오늘 기록에 재도전 ↗','daily-start','primary')}${button('같은 지형 연습','practice-daily','secondary')}${button('닫기','close','text-button')}</div></section>`;
  }
  private loop(timestamp:number){
    this.frame=requestAnimationFrame(t=>this.loop(t));if(this.hidden){this.previousTime=0;return;}
    const dt=this.previousTime?Math.max(0,(timestamp-this.previousTime)/1000):1/60;this.previousTime=timestamp;this.time+=dt;
    if(this.sim&&$('dialog').hidden&&this.phase!=='final'){
      this.sim.advance(dt,this.controls.input());if(this.sim.phase!==this.phase)this.changedPhase(this.sim.phase);
      if(this.phase==='briefing')$('map-count').textContent=String(Math.max(1,Math.ceil(CONFIG.mapSeconds-this.sim.elapsed)));
      if(this.phase==='flight'||this.phase==='bomb')this.updateHUD();
      if(this.phase==='result'){$('score-count').textContent=String(Math.round(this.sim.result!.score*Math.min(1,this.sim.elapsed/(this.settings.reducedMotion?.01:.65))));}
      if(this.phase==='flight'&&this.mode==='practice'&&this.settings.trajectory&&this.time-this.lastTrajectory>.3){this.lastTrajectory=this.time;const b=releaseBomb(this.sim.flight),points=[];for(let i=0;i<2000&&!b.hit;i++){stepBomb(b,this.sim.world,CONFIG.fixedStep);if(i%24===0)points.push({x:b.x,y:b.y,z:b.z});}this.view.showTrajectory(points);}
    }
    const mode=this.phase==='menu'||this.phase==='briefing'||this.phase==='mapExit'?'menu':this.phase==='flight'?'flight':this.phase==='bomb'?'bomb':'result';
    this.view.render(Math.min(dt,CONFIG.maxCatchupSeconds),this.time,mode,this.sim?.flight??null,this.sim?.bomb??null,this.controls.cameraYaw,this.controls.cameraPitch);
    this.audio.update(this.sim?.flight.speed??0,this.phase==='flight'&&$('dialog').hidden);
  }
  private updateHUD(){
    const sim=this.sim!,w=sim.world;$('round-label').textContent=`ROUND ${String(this.round).padStart(2,'0')} / 05`;
    $('time-label').textContent=Math.max(0,CONFIG.flightSeconds-sim.flightTime).toFixed(1);$('time-label').classList.toggle('urgent',CONFIG.flightSeconds-sim.flightTime<5);
    $('speed-label').innerHTML=`${Math.round(sim.flight.speed)} <small>m/s</small>`;$('wind-label').innerHTML=`${Math.hypot(w.wind.x,w.wind.z).toFixed(1)} <small>m/s</small>`;
    $('wind-arrow').style.transform=`rotate(${Math.atan2(w.wind.x,-w.wind.z)}rad)`;
    const heading=((Math.PI-sim.flight.heading)*180/Math.PI+360)%360;$('heading-label').textContent=`${['N','NE','E','SE','S','SW','W','NW'][Math.round(heading/45)%8]} ${Math.round(heading)}°`;
    $('total-label').innerHTML=`${String(totalScore(this.results)).padStart(3,'0')} <small>/ 500</small>`;
    const drop=document.querySelector<HTMLButtonElement>('.drop')!;drop.disabled=this.phase!=='flight';drop.classList.toggle('spent',this.phase==='bomb');
  }
}
