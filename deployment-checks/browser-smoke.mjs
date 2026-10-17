import { verifyAirCombat } from './combat-smoke.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
await mkdir('screenshots',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const base=process.env.BOMB_RUN_TEST_URL||'http://127.0.0.1:4173';
try {
const errors=[];const bombDurationsMs=[];const resultFeedbackChecks=[];const statsChecks=[];const historyChecks=[];const transmittedRequests=[];
const desktopContext=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await desktopContext.newPage();
await page.addInitScript(()=>{localStorage.setItem('bomb-run-settings',JSON.stringify({quality:'low'}));localStorage.setItem('bomb-run-guide-v1','true');localStorage.setItem('bomb-run-training-v1',JSON.stringify('skipped'));localStorage.setItem('bomb-run-best-v2','249');});
const installAudioProbe=()=>{
  const NativeAudioContext=window.AudioContext;
  window.__audioTest={contexts:[],oscillatorStarts:0};
  window.AudioContext=class extends NativeAudioContext {
    constructor(...args){super(...args);this.__analyser=this.createAnalyser();this.__analyser.fftSize=2048;window.__audioTest.contexts.push(this);}
    createGain(){const node=super.createGain(),connect=node.connect.bind(node);node.connect=(destination,...args)=>{if(destination===this.destination)connect(this.__analyser);return connect(destination,...args);};return node;}
    createOscillator(){const node=super.createOscillator(),start=node.start.bind(node);node.start=(...args)=>{window.__audioTest.oscillatorStarts++;return start(...args);};return node;}
  };
};
await page.addInitScript(installAudioProbe);
const audioState=(target=page)=>target.evaluate(()=>{
  const context=window.__audioTest.contexts.at(-1),samples=new Float32Array(2048);
  context?.__analyser.getFloatTimeDomainData(samples);
  return{state:context?.state,rms:Math.sqrt(samples.reduce((sum,n)=>sum+n*n,0)/samples.length),starts:window.__audioTest.oscillatorStarts};
});

page.on('pageerror',e=>errors.push(e.message));page.on('request',request=>{if(/^https?:/.test(request.url())&&request.method()!=='GET'&&request.method()!=='HEAD')transmittedRequests.push({url:request.url(),method:request.method()});});
await page.goto(base);
await page.waitForFunction(()=>document.getElementById('app')?.dataset.phase==='menu');
assert.equal(await page.evaluate(()=>Object.hasOwn(window,'bombRun')),false);
assert.ok((await page.title()).includes('붐케르크'));
await page.waitForTimeout(1000);
await page.screenshot({path:'screenshots/menu-desktop.png'});
await page.locator('[data-action=history]').click();assert.equal(await page.locator('.history-list li').count(),0);assert.equal(await page.locator('.flight-history [data-history=goal]').innerText(),'250점');assert.equal(await page.evaluate(()=>localStorage.getItem('bomb-run-flight-history-v1')),null);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.getElementById('panels').inert),false);assert.equal(await page.evaluate(()=>localStorage.getItem('bomb-run-best-v2')),'249');historyChecks.push({case:'legacy best preserved without fabricated past games',passed:true});
await page.evaluate(()=>localStorage.setItem('bomb-run-flight-history-v1',JSON.stringify({version:1,rulesVersion:'1.6.0',entries:[{day:new Date(Date.now()+9*3600000).toISOString().slice(0,10),mode:'play',scores:[24,24,24,24,24],total:120}]})));
assert.equal(await page.evaluate(()=>localStorage.getItem('bomb-run-play-stats-v1')),null);
await page.locator('[data-action=stats]').click();await page.locator('[data-action=stats-enable]').click();assert.equal(await page.locator('[data-stat=starts]').innerText(),'0');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.getElementById('panels').inert),false);
statsChecks.push({case:'default off and explicit local consent',passed:true});
await page.locator('[data-action="play"]').click();
let finalLatencyMs=0;
for(let round=1;round<=5;round++){
  console.log(`Desktop round ${round}`);
  await page.waitForFunction(()=>document.getElementById('app').dataset.phase==='briefing');
  assert.equal(Number((await page.locator('.briefing-heading strong').innerText()).match(/ROUND\s+(\d+)/)[1]),round);
  if(round===1)await page.screenshot({path:'screenshots/tactical-map.png'});
  if(round===5)await page.screenshot({path:'screenshots/map-damage-round5.png'});
  await page.waitForFunction(()=>document.getElementById('app').dataset.phase==='flight',{},{timeout:20000});
  assert.equal(await page.locator('.result-feedback').count(),0,'Feedback must stay hidden until impact');
  if(round===1){
    await page.keyboard.down('KeyW');await page.keyboard.down('KeyA');
    assert.ok((await page.title()).includes('붐케르크'));
await page.waitForTimeout(1000);await page.keyboard.up('KeyW');await page.keyboard.up('KeyA');
    await page.mouse.move(700,450);await page.mouse.down();await page.mouse.move(730,530);await page.mouse.up();
    await page.screenshot({path:'screenshots/flight-desktop.png'});
    const sound=await audioState();assert.equal(sound.state,'running');assert.ok(sound.rms>.0001,'Engine must produce a real audio signal');assert.ok(sound.starts>=3);
  }
  if(round===1){
    assert.equal(await page.locator('#wind-label').count(),0);
    await page.evaluate(()=>window.__audioTest.contexts.at(-1).suspend());
    await page.keyboard.press('KeyR');await page.waitForTimeout(200);assert.equal((await audioState()).state,'running');
    await page.keyboard.down('KeyS');await page.waitForTimeout(800);await page.keyboard.up('KeyS');
    const retained=await page.locator('#speed-label').innerText();await page.waitForTimeout(700);
    assert.equal(await page.locator('#speed-label').innerText(),retained,'Reduced speed must persist after release');
  }
  await page.evaluate(()=>{
    window.__dropStart=null;window.__bombDurationMs=null;
    const observer=new MutationObserver(()=>{const phase=document.getElementById('app').dataset.phase;if(phase==='bomb'&&window.__dropStart===null)window.__dropStart=performance.now();if(phase==='result'&&window.__dropStart!==null){window.__bombDurationMs=performance.now()-window.__dropStart;observer.disconnect();}});
    observer.observe(document.getElementById('app'),{attributes:true,attributeFilter:['data-phase']});
  });
  const beforeDrop=round===1?(await audioState()).starts:0;
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  if(round===1){await page.waitForTimeout(120);assert.ok((await audioState()).starts>=beforeDrop+2,'Belly release sound must be played');await page.screenshot({path:'screenshots/bomb-belly-release.png'});}
  assert.ok(['bomb','result'].includes(await page.evaluate(()=>document.getElementById('app').dataset.phase)));
  await page.waitForFunction(()=>document.getElementById('app').dataset.phase==='result',{},{timeout:20000});
  const bombMs=await page.evaluate(()=>window.__bombDurationMs);bombDurationsMs.push(bombMs);
  assert.equal(await page.locator('#toast.visible').count(),0,'Drop toast must clear before the result is read');
  assert.equal(await page.locator('.impact-diagram').count(),1);assert.equal(await page.locator('.feedback-axes>div').count(),2);
  const analysis=await page.evaluate(()=>{
    const axis=[...document.querySelectorAll('.feedback-axes strong')].map(el=>parseFloat(el.textContent));
    const error=parseFloat(document.querySelector('.result-summary p strong').textContent);
    return{axis,error,tip:document.querySelector('.feedback-tip').textContent};
  });
  assert.ok(Math.abs(Math.hypot(...analysis.axis)-analysis.error)<.2,'Pilot-relative errors must reconstruct the scored impact distance');assert.ok(analysis.tip.length>10);
  resultFeedbackChecks.push({case:`desktop-round-${round}`,passed:true});
  assert.ok(bombMs>0&&bombMs<2200,`Post-drop result must arrive within 2.2s, got ${bombMs}ms`);
  if(round===1){assert.ok((await audioState()).starts>=beforeDrop+5,'Cute impact sound must be played');await page.screenshot({path:'screenshots/impact-result.png'});}
  if(round===5){
    finalLatencyMs=await page.evaluate(async()=>{const start=performance.now();document.querySelector('[data-action="next"]').click();await new Promise(requestAnimationFrame);return performance.now()-start;});
    assert.ok(finalLatencyMs<500,`Bombing final must paint immediately, got ${finalLatencyMs}ms`);
  }else await page.locator('[data-action="next"]').click();
}
await page.waitForFunction(()=>document.getElementById('app').dataset.phase==='final');
assert.equal(await page.locator('.combat-summary').count(),0,'Bombing ends without a combat finale');
assert.equal(await page.evaluate(()=>document.pointerLockElement),null,'Final board releases pointer lock');await page.waitForTimeout(700);assert.ok((await audioState()).rms<.0001,'Engine must stop on the final board');
assert.equal(await page.locator('.leader-row').count(),5);assert.equal(await page.locator('#world').isVisible(),false,'Final HTML board must not wait on a WebGL layer');
const completedHistory=await page.evaluate(()=>JSON.parse(localStorage.getItem('bomb-run-flight-history-v1')).entries);assert.equal(completedHistory.length,2);const actualTotal=completedHistory[1].scores.reduce((sum,n)=>sum+n,0);assert.equal(completedHistory[1].total,actualTotal);const progressGoal=Number((await page.locator('.flight-progress [data-history=goal]').innerText()).replace(/[^0-9]/g,''));assert.ok(progressGoal<=500&&(actualTotal===500?progressGoal===500:progressGoal>actualTotal));const delta=actualTotal-120;assert.ok((await page.locator('[data-history=comparison]').innerText()).includes(delta>0?`+${delta}점`:delta===0?'같은 점수':`이번 ${actualTotal}점`));
await page.locator('.flight-progress [data-action=history]').click();assert.equal(await page.locator('.history-list li').count(),2);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'history');
const reopened=await page.context().newPage();reopened.on('pageerror',e=>errors.push(e.message));await reopened.goto(base);await reopened.locator('[data-action=history]').click();assert.equal(await reopened.locator('.history-list li').count(),2);await reopened.close();historyChecks.push({case:'real completion stored once, previous-game comparison, bounded goal and new-tab persistence',passed:true});
for(const sample of [{name:'portrait',viewport:{width:320,height:568}},{name:'landscape',viewport:{width:667,height:375}}]){await page.setViewportSize(sample.viewport);await page.locator('.flight-progress').scrollIntoViewIfNeeded();const goal=await page.locator('.flight-progress [data-history=goal]').boundingBox(),again=await page.locator('[data-action=again]').boundingBox();assert.ok(again.y>=0&&again.y+again.height<=sample.viewport.height);assert.ok(goal.y>=0&&goal.y+goal.height<=again.y,'Next goal remains readable above sticky retry');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`screenshots/final-progress-${sample.name}.png`});historyChecks.push({case:`${sample.name} final goal and immediate retry`,passed:true});}
await page.setViewportSize({width:1440,height:1000});await page.locator('.final-panel').evaluate(el=>el.scrollTop=0);
await page.screenshot({path:'screenshots/final-score.png'});
const downloadEvent=page.waitForEvent('download');await page.locator('[data-action="download-card"]').click();
const card=await downloadEvent;await card.saveAs('screenshots/result-share-card.png');
const png=await readFile('screenshots/result-share-card.png');assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1920);
await page.evaluate(()=>{Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});Object.defineProperty(navigator,'share',{value:async()=>{throw new DOMException('Cancelled','AbortError');},configurable:true});});
let unexpectedDownloads=0;const onDownload=()=>unexpectedDownloads++;page.on('download',onDownload);
await page.locator('[data-action="share-card"]').click();await page.waitForTimeout(100);page.off('download',onDownload);assert.equal(unexpectedDownloads,0,'Cancelling sharing must not force a download');
await page.locator('[data-action="again"]').click();await page.locator('#tactical-map').waitFor();await page.locator('[data-action="home"]').first().click();
await page.locator('[data-action=stats]').click();assert.equal(await page.locator('[data-stat=starts]').innerText(),'2');assert.equal(await page.locator('[data-stat=completions]').innerText(),'1');assert.equal(await page.locator('[data-stat=retries]').innerText(),'1');assert.equal(await page.locator('[data-stat=completion-rate]').innerText(),'50%');assert.ok((await page.locator('[data-stat=fps]').innerText()).includes('FPS'));
const statsDownload=page.waitForEvent('download');await page.locator('[data-action=stats-export]').click();await (await statsDownload).saveAs('screenshots/local-play-check.json');const playCheck=JSON.parse(await readFile('screenshots/local-play-check.json','utf8'));assert.equal(playCheck.scope,'one-browser-local-beta-check');assert.equal(playCheck.days.reduce((sum,d)=>sum+d.starts,0),2);assert.equal(playCheck.days.reduce((sum,d)=>sum+d.rounds,0),5);assert.equal(playCheck.days.reduce((sum,d)=>sum+d.drops,0),5);
for(const day of playCheck.days)assert.deepEqual(Object.keys(day).sort(),['day','starts','completions','retries','nextDay','rounds','drops','frames','frameMs','slowFrames'].sort());assert.deepEqual(transmittedRequests,[]);
await page.screenshot({path:'screenshots/play-stats-desktop.png'});await page.keyboard.press('Escape');
await page.locator('[data-action=practice]').click();await page.locator('#tactical-map').waitFor();await page.locator('[data-action=home]').first().click();await page.locator('[data-action=training]').click();await page.waitForFunction(()=>document.getElementById('app').dataset.training==='turn');await page.locator('[data-action=training-skip]').click();
await page.locator('[data-action=history]').click();assert.equal(await page.locator('.history-list li').count(),2);const historyBest=await page.evaluate(()=>localStorage.getItem('bomb-run-best-v2')),historyStats=await page.evaluate(()=>localStorage.getItem('bomb-run-play-stats-v1'));await page.locator('[data-action=history-clear]').click();assert.equal(await page.locator('.history-list li').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('bomb-run-best-v2')),historyBest);assert.equal(await page.evaluate(()=>localStorage.getItem('bomb-run-play-stats-v1')),historyStats);await page.keyboard.press('Escape');historyChecks.push({case:'incomplete/practice/training excluded and deletion preserves best and diagnostics',passed:true});
await page.locator('[data-action=stats]').click();assert.equal(await page.locator('[data-stat=starts]').innerText(),'2');statsChecks.push({case:'five-round completion, retry, frames, excluded practice/training and manual aggregate export',passed:true});
const retainedBest=await page.evaluate(()=>localStorage.getItem('bomb-run-best-v2'));await page.locator('[data-action=stats-disable]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('bomb-run-play-stats-v1')),null);assert.equal(await page.evaluate(()=>localStorage.getItem('bomb-run-best-v2')),retainedBest);await page.keyboard.press('Escape');statsChecks.push({case:'withdrawal deletes only diagnostics',passed:true});
await page.locator('[data-action="settings"]').click();
await page.locator('#setting-sound').uncheck();
await page.locator('#setting-motion').check();
await page.locator('[data-action="save-settings"]').click();
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('bomb-run-settings')).reducedMotion),true);
await page.waitForTimeout(300);assert.ok((await audioState()).rms<.0001,'Sound OFF must mute the master output');
assert.equal(await page.locator('[data-action="friends"]').count(),0);
await page.locator('[data-action="daily"]').click();
assert.ok((await page.locator('.modal').innerText()).includes('이 기기에만'));
await page.locator('[data-action="close"]').click();
await page.locator('[data-action="rules"]').click();assert.ok((await page.locator('.modal').innerText()).includes('하루 3회'));assert.ok((await page.locator('.modal').innerText()).includes('30분'));await page.locator('[data-action="close"]').click();
await page.locator('[data-action="privacy"]').click();assert.ok((await page.locator('.modal').innerText()).includes('브라우저'));await page.locator('[data-action="close"]').click();
await page.close();
const mobile=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
await mobile.addInitScript(()=>{localStorage.setItem('bomb-run-settings',JSON.stringify({quality:'low'}));localStorage.setItem('bomb-run-guide-v1','true');localStorage.setItem('bomb-run-training-v1',JSON.stringify('skipped'));});
await mobile.addInitScript(installAudioProbe);
mobile.on('pageerror',e=>errors.push(e.message));
await mobile.goto(base);
await mobile.waitForFunction(()=>document.getElementById('app')?.dataset.phase==='menu');
await mobile.screenshot({path:'screenshots/menu-mobile-landscape.png'});
await mobile.locator('[data-action="play"]').tap();
await mobile.waitForFunction(()=>document.getElementById('app').dataset.phase==='flight',{},{timeout:20000});
const control=await mobile.locator('[data-control="left"]').boundingBox();
const slow=await mobile.locator('[data-control="slower"]').boundingBox();
const session=await mobile.context().newCDPSession(mobile);
await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:control.x+control.width/2,y:control.y+control.height/2,id:8},{x:slow.x+slow.width/2,y:slow.y+slow.height/2,id:9}]});
await mobile.waitForTimeout(700);
await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
const mobileSound=await audioState(mobile);assert.equal(mobileSound.state,'running');assert.ok(mobileSound.rms>.0001);
const retainedMobile=await mobile.locator('#speed-label').innerText();await mobile.waitForTimeout(700);
assert.equal(await mobile.locator('#speed-label').innerText(),retainedMobile);
await mobile.setViewportSize({width:390,height:844});assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await mobile.setViewportSize({width:844,height:390});
await mobile.screenshot({path:'screenshots/flight-mobile-landscape.png'});
await mobile.locator('[data-control="drop"]').tap();
await mobile.waitForFunction(()=>document.getElementById('app').dataset.phase==='result',{},{timeout:20000});
for(const sample of [{name:'small-portrait',width:320,height:568},{name:'portrait',width:390,height:844},{name:'small-landscape',width:667,height:375},{name:'landscape',width:844,height:390}]){
  await mobile.setViewportSize({width:sample.width,height:sample.height});await mobile.locator('.result-panel').evaluate(el=>el.scrollTop=0);
  assert.equal(await mobile.locator('.impact-diagram').count(),1);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const box=await mobile.locator('.result-panel').boundingBox(),next=await mobile.locator('[data-action="next"]').boundingBox();
  assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=sample.width+1&&box.y+box.height<=sample.height+1,`Result panel must fit ${sample.name}: ${JSON.stringify(box)}`);
  assert.ok(next.y>=0&&next.y+next.height<=sample.height+1,`Next round must be immediately reachable on ${sample.name}: ${JSON.stringify(next)}`);
  await mobile.screenshot({path:`screenshots/impact-feedback-${sample.name}.png`});
  await mobile.locator('.result-panel').evaluate(el=>el.scrollTop=el.scrollHeight);
  const tip=await mobile.locator('.feedback-tip').boundingBox(),action=await mobile.locator('[data-action=next]').boundingBox();
  assert.ok(tip.y>=0&&tip.y+tip.height<=sample.height+1,'Full advice must be readable after scrolling');
  const overlap=tip.x<action.x+action.width&&tip.x+tip.width>action.x&&tip.y<action.y+action.height&&tip.y+tip.height>action.y;assert.equal(overlap,false,'Next button must not cover the advice');
  resultFeedbackChecks.push({case:sample.name,passed:true});
}
await mobile.locator('[data-action="home"]').first().tap();
await mobile.setViewportSize({width:390,height:844});
await mobile.screenshot({path:'screenshots/menu-mobile-portrait.png'});
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await mobile.close();
const mapMarkerChecks=[];
for(const sample of [
  {name:'desktop',viewport:{width:1440,height:1000}},
  {name:'mobile-landscape',viewport:{width:844,height:390}},
  {name:'small-landscape',viewport:{width:667,height:375}},
  {name:'mobile-portrait',viewport:{width:390,height:844},motion:true},
  {name:'os-reduced',viewport:{width:390,height:844},os:true},
]){
  const targetPage=await browser.newPage({viewport:sample.viewport,reducedMotion:sample.os?'reduce':'no-preference'});
  targetPage.on('pageerror',e=>errors.push(e.message));
  await targetPage.addInitScript(settings=>{localStorage.setItem('bomb-run-settings',JSON.stringify(settings));localStorage.setItem('bomb-run-guide-v1','true');localStorage.setItem('bomb-run-training-v1',JSON.stringify('skipped'));},{quality:'low',reducedMotion:!!sample.motion});
  await targetPage.goto(base);await targetPage.locator('[data-action="play"]').click();await targetPage.locator('.target-beacon').waitFor();
  const marker=await targetPage.evaluate(()=>{
    const beacon=document.querySelector('.target-beacon'),canvas=document.getElementById('tactical-map'),paper=document.querySelector('.map-paper').getBoundingClientRect();
    const x=Math.round(parseFloat(beacon.style.left)/100*canvas.width),y=Math.round(parseFloat(beacon.style.top)/100*canvas.height);
    return {animations:beacon.getAnimations().length,pixel:Array.from(canvas.getContext('2d').getImageData(x,y,1,1).data),paperTop:paper.top,paperBottom:paper.bottom,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.ok(marker.pixel[0]>200&&marker.pixel[1]<80&&marker.pixel[2]<90,'Pulse must align with the red canvas target');
  assert.equal(marker.animations,sample.motion||sample.os?0:1);
  assert.equal(marker.overflow,false);
  assert.ok(marker.paperTop>=0&&marker.paperBottom<=sample.viewport.height+1,`${sample.name} map must fit the screen: ${JSON.stringify(marker)}`);
  assert.ok((await targetPage.locator('.briefing-tip').innerText()).includes('빨간 깃발 위치를 기억하세요'));
  if(sample.name!=='os-reduced')await targetPage.screenshot({path:`screenshots/briefing-target-${sample.name}.png`});
  if(sample.name==='desktop'){
    await targetPage.waitForFunction(()=>document.getElementById('app').dataset.phase==='flight');
    assert.equal(await targetPage.locator('.target-beacon').count(),0);assert.equal(await targetPage.locator('#tactical-map').count(),0);
  }
  mapMarkerChecks.push({case:sample.name,passed:true,pulse:marker.animations===1});await targetPage.close();
}
const guideChecks=[];
for(const sample of [{name:'desktop',viewport:{width:1440,height:1000}},{name:'portrait',viewport:{width:390,height:844},motion:true},{name:'landscape',viewport:{width:667,height:375},os:true}]){
  const guidePage=await browser.newPage({viewport:sample.viewport,reducedMotion:sample.os?'reduce':'no-preference'});
  guidePage.on('pageerror',e=>errors.push(e.message));
  await guidePage.addInitScript(settings=>{localStorage.setItem('bomb-run-settings',JSON.stringify(settings));localStorage.setItem('bomb-run-best','497');localStorage.setItem('bomb-run-training-v1',JSON.stringify('skipped'));},{quality:'low',reducedMotion:!!sample.motion});
  await guidePage.goto(base);await guidePage.locator('[data-action="play"]').click();await guidePage.locator('.guide-book').waitFor();
  assert.equal(await guidePage.evaluate(()=>document.getElementById('app').dataset.phase),'menu');
  assert.equal(await guidePage.locator('#tactical-map').count(),0);assert.equal(await guidePage.locator('.guide-progress span').count(),5);
  assert.equal(await guidePage.locator('[data-action="guide-prev"]').isDisabled(),true);
  await guidePage.locator('[data-action="guide-next"]').click();await guidePage.locator('[data-action="guide-prev"]').click();
  assert.equal(await guidePage.locator('.guide-progress [aria-current]').innerText(),'1');
  for(let chapter=1;chapter<=5;chapter++){
    assert.equal(await guidePage.locator('.guide-progress [aria-current]').innerText(),String(chapter));
    assert.equal(await guidePage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const box=await guidePage.locator('.guide-book').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=sample.viewport.height+1);
    if(sample.motion||sample.os)assert.equal(await guidePage.locator('.guide-sheet').evaluate(el=>el.getAnimations().length),0);
    if(chapter===2)await guidePage.screenshot({path:`screenshots/guide-objects-${sample.name}.png`});
    if(chapter===4)await guidePage.screenshot({path:`screenshots/guide-drop-${sample.name}.png`});
    if(chapter<5)await guidePage.locator('[data-action="guide-next"]').click();
  }
  assert.ok((await guidePage.locator('.guide-copy').innerText()).includes('71점'));
  assert.equal(await guidePage.evaluate(()=>document.getElementById('app').dataset.phase),'menu');
  await guidePage.locator('[data-action="guide-finish"]').click();await guidePage.locator('#tactical-map').waitFor();
  assert.equal(await guidePage.locator('.guide-book').count(),0);assert.ok(Number(await guidePage.locator('#map-count').innerText())>0);assert.ok((await guidePage.locator('.briefing-tip').innerText()).includes('10초'));
  assert.equal(await guidePage.evaluate(()=>localStorage.getItem('bomb-run-best')),'497');assert.equal(await guidePage.evaluate(()=>localStorage.getItem('bomb-run-guide-v1')),'true');
  await guidePage.locator('[data-action="home"]').first().click();await guidePage.locator('[data-action="guide"]').click();await guidePage.keyboard.press('Escape');
  assert.equal(await guidePage.evaluate(()=>document.getElementById('panels').inert),false);
  await guidePage.locator('[data-action="play"]').click();await guidePage.locator('#tactical-map').waitFor();assert.equal(await guidePage.locator('.guide-book').count(),0);
  guideChecks.push({case:sample.name,passed:true,pages:5});await guidePage.close();
}
const timeoutPage=await browser.newPage({viewport:{width:390,height:844}});
timeoutPage.on('pageerror',e=>errors.push(e.message));
await timeoutPage.addInitScript(()=>{localStorage.setItem('bomb-run-settings',JSON.stringify({quality:'low',reducedMotion:true}));localStorage.setItem('bomb-run-guide-v1','true');localStorage.setItem('bomb-run-training-v1',JSON.stringify('skipped'));});
await timeoutPage.goto(base);await timeoutPage.locator('[data-action="play"]').click();
await timeoutPage.waitForFunction(()=>document.getElementById('app')?.dataset.phase==='result',{},{timeout:40000});
assert.equal(await timeoutPage.locator('[data-feedback="no-drop"]').count(),1);assert.equal(await timeoutPage.locator('.impact-landing').count(),0);assert.equal(await timeoutPage.locator('.feedback-axes').count(),0);
assert.ok((await timeoutPage.locator('.feedback-tip').innerText()).includes('Space 또는 DROP'));assert.equal(await timeoutPage.locator('#score-count').innerText(),'0');
await timeoutPage.screenshot({path:'screenshots/impact-feedback-no-drop.png'});await timeoutPage.locator('[data-action="next"]').click();await timeoutPage.locator('#tactical-map').waitFor();
resultFeedbackChecks.push({case:'no-drop and next round',passed:true});await timeoutPage.close();
const trainingChecks=[];
for(const sample of [{name:'desktop',viewport:{width:1440,height:1000},first:true},{name:'portrait',viewport:{width:390,height:844},touch:true},{name:'small-portrait',viewport:{width:320,height:568},touch:true},{name:'landscape',viewport:{width:667,height:375},touch:true}]){
  const learner=await browser.newPage({viewport:sample.viewport,isMobile:!!sample.touch,hasTouch:!!sample.touch});learner.on('pageerror',e=>errors.push(e.message));
  await learner.addInitScript(first=>{localStorage.setItem('bomb-run-settings',JSON.stringify({quality:'low',trajectory:false}));localStorage.setItem('bomb-run-best-v2','249');if(!first)localStorage.setItem('bomb-run-guide-v1','true');},!!sample.first);
  await learner.goto(base);await learner.locator('[data-action=play]').click();
  if(sample.first){await learner.locator('.guide-book').waitFor();await learner.locator('[data-action=guide-finish]').click();}
  await learner.locator('.training-offer').waitFor();assert.equal(await learner.evaluate(()=>document.getElementById('app').dataset.phase),'menu');assert.equal(await learner.locator('#tactical-map').count(),0);
  await learner.locator('[data-action=training-start]').click();await learner.waitForFunction(()=>document.getElementById('app').dataset.training==='turn');
  if(sample.touch){const control=learner.locator('[data-control=left]'),box=await control.boundingBox(),session=await learner.context().newCDPSession(learner);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});await learner.waitForFunction(()=>document.getElementById('app').dataset.training==='slow');await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await learner.keyboard.down('KeyA');await learner.waitForFunction(()=>document.getElementById('app').dataset.training==='slow');await learner.keyboard.up('KeyA');}
  if(sample.touch){const box=await learner.locator('[data-control=slower]').boundingBox(),session=await learner.context().newCDPSession(learner);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:2}]});await learner.waitForFunction(()=>document.getElementById('app').dataset.training==='aim');await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await learner.keyboard.down('KeyS');await learner.waitForFunction(()=>document.getElementById('app').dataset.training==='aim');await learner.keyboard.up('KeyS');}
  assert.equal(await learner.locator('#training-clock').innerText(),'준비');await learner.waitForTimeout(500);assert.equal(await learner.locator('#training-clock').innerText(),'준비');
  assert.equal(await learner.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await learner.screenshot({path:`screenshots/training-aim-${sample.name}.png`});
  await learner.locator('[data-action=training-approach]').click();await learner.locator('#training-distance[data-ready=true]').waitFor({timeout:15000});
  if(sample.touch)await learner.locator('[data-control=drop]').tap();else await learner.keyboard.press('Space');
  await learner.locator('.training-result').waitFor({timeout:10000});assert.equal(await learner.locator('.impact-diagram').count(),1);assert.ok(parseFloat(await learner.locator('.result-summary p strong').innerText())<70);
  assert.equal(await learner.evaluate(()=>localStorage.getItem('bomb-run-best-v2')),'249');assert.equal(await learner.evaluate(()=>JSON.parse(localStorage.getItem('bomb-run-training-v1'))),'completed');assert.equal(await learner.locator('.leaderboard').count(),0);await learner.screenshot({path:`screenshots/training-result-${sample.name}.png`});
  await learner.locator('[data-action=training-retry]').click();await learner.waitForFunction(()=>document.getElementById('app').dataset.training==='aim');assert.equal(await learner.locator('.training-result').count(),0);
  await learner.locator('[data-action=training-approach]').click();
  if(sample.first){await learner.waitForFunction(()=>document.getElementById('app').dataset.training==='result',{},{timeout:25000});assert.equal(await learner.locator('[data-feedback=no-drop]').count(),1);}
  else{if(sample.touch)await learner.locator('[data-control=drop]').tap();else await learner.keyboard.press('Space');await learner.locator('.training-result').waitFor();}
  await learner.locator('[data-action=training-finish]').click();await learner.locator('#tactical-map').waitFor();
  assert.equal(await learner.evaluate(()=>document.getElementById('app').hasAttribute('data-training')),false);assert.equal(await learner.locator('.training-coach').count(),0);assert.equal(await learner.evaluate(()=>JSON.parse(localStorage.getItem('bomb-run-training-v1'))),'completed');
  await learner.locator('[data-action=home]').first().click();await learner.locator('[data-action=training]').click();await learner.waitForFunction(()=>document.getElementById('app').dataset.training==='turn');await learner.locator('[data-action=training-skip]').click();await learner.locator('[data-action=play]').waitFor();
  trainingChecks.push({case:sample.name,passed:true,keyboard:!sample.touch,touch:!!sample.touch});await learner.close();
}
const skipper=await browser.newPage({viewport:{width:390,height:844}});skipper.on('pageerror',e=>errors.push(e.message));await skipper.addInitScript(()=>{localStorage.setItem('bomb-run-guide-v1','true');localStorage.setItem('bomb-run-settings',JSON.stringify({quality:'low'}));});await skipper.goto(base);
await skipper.locator('[data-action=practice]').click();await skipper.locator('[data-action=training-skip]').click();await skipper.locator('#tactical-map').waitFor();assert.ok((await skipper.locator('.briefing-info').innerText()).includes('연습 모드'));
await skipper.locator('[data-action=home]').first().click();await skipper.locator('[data-action=play]').click();await skipper.locator('#tactical-map').waitFor();assert.equal(await skipper.locator('.training-offer:visible').count(),0);
trainingChecks.push({case:'skip preserves requested mode and does not reoffer',passed:true});await skipper.close();
for(const sample of [{name:'portrait',viewport:{width:320,height:568}},{name:'landscape',viewport:{width:667,height:375}}]){
 const checker=await browser.newPage({viewport:sample.viewport});checker.on('pageerror',e=>errors.push(e.message));await checker.addInitScript(()=>{localStorage.setItem('bomb-run-settings',JSON.stringify({quality:'low'}));localStorage.setItem('bomb-run-best-v2','321');});await checker.goto(base);await checker.locator('[data-action=stats]').click();await checker.locator('[data-action=stats-enable]').click();assert.equal(await checker.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await checker.locator('[data-action=stats-disable]').scrollIntoViewIfNeeded();const box=await checker.locator('[data-action=stats-disable]').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=sample.viewport.height);await checker.screenshot({path:`screenshots/play-stats-${sample.name}.png`});await checker.locator('[data-action=stats-disable]').click();await checker.keyboard.press('Escape');assert.equal(await checker.evaluate(()=>localStorage.getItem('bomb-run-best-v2')),'321');assert.equal(await checker.evaluate(()=>document.getElementById('panels').inert),false);statsChecks.push({case:`${sample.name} consent, scrollable controls, deletion and focus recovery`,passed:true});
await checker.evaluate(()=>{localStorage.setItem('bomb-run-guide-v1','true');localStorage.setItem('bomb-run-training-v1',JSON.stringify('skipped'));localStorage.setItem('bomb-run-flight-history-v1',JSON.stringify({version:1,rulesVersion:'1.6.0',entries:Array.from({length:20},(_,i)=>({day:'2026-10-16',mode:i%2?'daily':'play',scores:Array(5).fill(i*4),total:i*20}))}));});await checker.reload();await checker.locator('[data-action=history]').click();assert.equal(await checker.locator('.history-list li').count(),20);assert.equal(await checker.locator('.history-bar').count(),5);assert.equal(await checker.locator('.flight-history [data-history=goal]').innerText(),'400점');await checker.locator('[data-action=history-play]').scrollIntoViewIfNeeded();assert.equal(await checker.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await checker.screenshot({path:`screenshots/flight-history-${sample.name}.png`});await checker.locator('[data-action=history-play]').click();await checker.locator('#tactical-map').waitFor();assert.equal(await checker.evaluate(()=>document.getElementById('panels').inert),false);await checker.locator('[data-action=home]').first().click();await checker.locator('[data-action=history]').click();await checker.locator('[data-action=history-clear]').click();assert.equal(await checker.locator('.history-list li').count(),0);assert.equal(await checker.evaluate(()=>localStorage.getItem('bomb-run-best-v2')),'321');await checker.keyboard.press('Escape');historyChecks.push({case:`${sample.name} twenty records, goal, new flight and isolated deletion`,passed:true});await checker.close();
}
const combatChecks=await verifyAirCombat(browser,base,errors);
await writeFile('browser-report.json',JSON.stringify({passed:true,url:base,finalLatencyMs,combatChecks,bombDurationsMs,realDevicesTested:false,mapMarkerChecks,guideChecks,resultFeedbackChecks,trainingChecks,statsChecks,historyChecks,checks:['desktop full five-round game','keyboard flight','camera drag','single bomb','fast post-drop results','final AI board','separate menu entry for memory bombing and CPU combat','bombing final immediately after round five','independent CPU combat score and record','mobile drag, automatic fire and visible pause menu','saved settings','friends removed','daily local disclosure','mobile simultaneous steering and braking','retained keyboard and touch airspeed','wind removed','immediate final board','in-flight orientation changes','mobile touch drop','portrait overflow','audible engine signal','release and impact audio','master mute','gesture resumes suspended audio','mobile first-touch audio','no public debug snapshot','Boomkerque branding','1080x1920 share card download','share cancellation','public rules and privacy information','red target alignment and pulse','small landscape briefing fits','app and OS reduced-motion target','target indicator removed in flight','five-page guide before first flight','guide previous/next/reopen/escape','guide outside round clock','legacy personal record preserved','release-relative impact diagram and errors','responsive result and immediate next round','honest no-drop feedback','first-run training offer and skip','keyboard and touch guided steering/braking/drop','unlimited ready step before timed approach','training prediction and actual impact match','training records excluded and retry','training completion resumes normal flight without hints'],pageErrors:errors},null,2));
assert.deepEqual(errors,[]);
console.log('PASS browser: complete five rounds, mobile input, settings, local modes, no JS errors');
} finally {await browser.close();}
