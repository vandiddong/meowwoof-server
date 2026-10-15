import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
await mkdir('screenshots',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const base=process.env.BOMB_RUN_TEST_URL||'http://127.0.0.1:4173';
try {
const errors=[];const bombDurationsMs=[];
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.addInitScript(()=>{localStorage.setItem('bomb-run-settings',JSON.stringify({quality:'low'}));localStorage.setItem('bomb-run-guide-v1','true');});
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

page.on('pageerror',e=>errors.push(e.message));
await page.goto(base);
await page.waitForFunction(()=>document.getElementById('app')?.dataset.phase==='menu');
assert.equal(await page.evaluate(()=>Object.hasOwn(window,'bombRun')),false);
assert.ok((await page.title()).includes('붐케르크'));
await page.waitForTimeout(1000);
await page.screenshot({path:'screenshots/menu-desktop.png'});
await page.locator('[data-action="play"]').click();
let finalLatencyMs=0;
for(let round=1;round<=5;round++){
  console.log(`Desktop round ${round}`);
  await page.waitForFunction(()=>document.getElementById('app').dataset.phase==='briefing');
  assert.equal(Number((await page.locator('.briefing-heading strong').innerText()).match(/ROUND\s+(\d+)/)[1]),round);
  if(round===1)await page.screenshot({path:'screenshots/tactical-map.png'});
  if(round===5)await page.screenshot({path:'screenshots/map-damage-round5.png'});
  await page.waitForFunction(()=>document.getElementById('app').dataset.phase==='flight',{},{timeout:20000});
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
  assert.ok(bombMs>0&&bombMs<2200,`Post-drop result must arrive within 2.2s, got ${bombMs}ms`);
  if(round===1){assert.ok((await audioState()).starts>=beforeDrop+5,'Cute impact sound must be played');await page.screenshot({path:'screenshots/impact-result.png'});}
  if(round===5){
    finalLatencyMs=await page.evaluate(async()=>{const start=performance.now();document.querySelector('[data-action="next"]').click();await new Promise(requestAnimationFrame);return performance.now()-start;});
    assert.ok(finalLatencyMs<500,`Final leaderboard must paint immediately, got ${finalLatencyMs}ms`);
  }else await page.locator('[data-action="next"]').click();
}
await page.waitForFunction(()=>document.getElementById('app').dataset.phase==='final',{},{timeout:20000});
assert.equal(await page.locator('.leader-row').count(),5);
await page.screenshot({path:'screenshots/final-score.png'});
const downloadEvent=page.waitForEvent('download');await page.locator('[data-action="download-card"]').click();
const card=await downloadEvent;await card.saveAs('screenshots/result-share-card.png');
const png=await readFile('screenshots/result-share-card.png');assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1920);
await page.evaluate(()=>{Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});Object.defineProperty(navigator,'share',{value:async()=>{throw new DOMException('Cancelled','AbortError');},configurable:true});});
let unexpectedDownloads=0;const onDownload=()=>unexpectedDownloads++;page.on('download',onDownload);
await page.locator('[data-action="share-card"]').click();await page.waitForTimeout(100);page.off('download',onDownload);assert.equal(unexpectedDownloads,0,'Cancelling sharing must not force a download');
await page.locator('[data-action="home"]').first().click();
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
await mobile.addInitScript(()=>{localStorage.setItem('bomb-run-settings',JSON.stringify({quality:'low'}));localStorage.setItem('bomb-run-guide-v1','true');});
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
  await targetPage.addInitScript(settings=>{localStorage.setItem('bomb-run-settings',JSON.stringify(settings));localStorage.setItem('bomb-run-guide-v1','true');},{quality:'low',reducedMotion:!!sample.motion});
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
  await guidePage.addInitScript(settings=>{localStorage.setItem('bomb-run-settings',JSON.stringify(settings));localStorage.setItem('bomb-run-best','497');},{quality:'low',reducedMotion:!!sample.motion});
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
await writeFile('browser-report.json',JSON.stringify({passed:true,url:base,finalLatencyMs,bombDurationsMs,realDevicesTested:false,mapMarkerChecks,guideChecks,checks:['desktop full five-round game','keyboard flight','camera drag','single bomb','fast post-drop results','final AI board','saved settings','friends removed','daily local disclosure','mobile simultaneous steering and braking','retained keyboard and touch airspeed','wind removed','immediate final board','in-flight orientation changes','mobile touch drop','portrait overflow','audible engine signal','release and impact audio','master mute','gesture resumes suspended audio','mobile first-touch audio','no public debug snapshot','Boomkerque branding','1080x1920 share card download','share cancellation','public rules and privacy information','red target alignment and pulse','small landscape briefing fits','app and OS reduced-motion target','target indicator removed in flight','five-page guide before first flight','guide previous/next/reopen/escape','guide outside round clock','legacy personal record preserved'],pageErrors:errors},null,2));
assert.deepEqual(errors,[]);
console.log('PASS browser: complete five rounds, mobile input, settings, local modes, no JS errors');
} finally {await browser.close();}
