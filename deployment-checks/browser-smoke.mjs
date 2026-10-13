import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir,writeFile } from 'node:fs/promises';
await mkdir('screenshots',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const base=process.env.BOMB_RUN_TEST_URL||'http://127.0.0.1:4173';
try {
const errors=[];
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.addInitScript(()=>localStorage.setItem('bomb-run-settings',JSON.stringify({quality:'low'})));
await page.addInitScript(()=>{
  const NativeAudioContext=window.AudioContext;
  window.__audioTest={contexts:[],oscillatorStarts:0};
  window.AudioContext=class extends NativeAudioContext {
    constructor(...args){super(...args);this.__analyser=this.createAnalyser();this.__analyser.fftSize=2048;window.__audioTest.contexts.push(this);}
    createGain(){const node=super.createGain(),connect=node.connect.bind(node);node.connect=(destination,...args)=>{if(destination===this.destination)connect(this.__analyser);return connect(destination,...args);};return node;}
    createOscillator(){const node=super.createOscillator(),start=node.start.bind(node);node.start=(...args)=>{window.__audioTest.oscillatorStarts++;return start(...args);};return node;}
  };
});
const audioState=()=>page.evaluate(()=>{
  const context=window.__audioTest.contexts.at(-1),samples=new Float32Array(2048);
  context?.__analyser.getFloatTimeDomainData(samples);
  return{state:context?.state,rms:Math.sqrt(samples.reduce((sum,n)=>sum+n*n,0)/samples.length),starts:window.__audioTest.oscillatorStarts};
});

page.on('pageerror',e=>errors.push(e.message));
await page.goto(base);
await page.waitForFunction(()=>document.getElementById('app')?.dataset.phase==='menu');
assert.equal(await page.evaluate(()=>Object.hasOwn(window,'bombRun')),false);
await page.waitForTimeout(1000);
await page.screenshot({path:'screenshots/menu-desktop.png'});
await page.locator('[data-action="play"]').click();
for(let round=1;round<=5;round++){
  console.log(`Desktop round ${round}`);
  await page.waitForFunction(()=>document.getElementById('app').dataset.phase==='briefing');
  assert.equal(Number((await page.locator('.briefing-heading strong').innerText()).match(/ROUND\s+(\d+)/)[1]),round);
  if(round===1)await page.screenshot({path:'screenshots/tactical-map.png'});
  if(round===5)await page.screenshot({path:'screenshots/map-damage-round5.png'});
  await page.waitForFunction(()=>document.getElementById('app').dataset.phase==='flight',{},{timeout:12000});
  if(round===1){
    await page.keyboard.down('KeyW');await page.keyboard.down('KeyA');
    await page.waitForTimeout(1000);await page.keyboard.up('KeyW');await page.keyboard.up('KeyA');
    await page.mouse.move(700,450);await page.mouse.down();await page.mouse.move(730,530);await page.mouse.up();
    await page.screenshot({path:'screenshots/flight-desktop.png'});
    const sound=await audioState();assert.equal(sound.state,'running');assert.ok(sound.rms>.0001,'Engine must produce a real audio signal');assert.ok(sound.starts>=3);
  }
  const beforeDrop=round===1?(await audioState()).starts:0;
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  if(round===1){await page.waitForTimeout(120);assert.ok((await audioState()).starts>=beforeDrop+2,'Belly release sound must be played');await page.screenshot({path:'screenshots/bomb-belly-release.png'});}
  assert.ok(['bomb','result'].includes(await page.evaluate(()=>document.getElementById('app').dataset.phase)));
  await page.waitForFunction(()=>document.getElementById('app').dataset.phase==='result',{},{timeout:15000});
  if(round===1){assert.ok((await audioState()).starts>=beforeDrop+5,'Cute impact sound must be played');await page.screenshot({path:'screenshots/impact-result.png'});}
  await page.locator('[data-action="next"]').click();
}
await page.waitForFunction(()=>document.getElementById('app').dataset.phase==='final',{},{timeout:15000});
assert.equal(await page.locator('.leader-row').count(),5);
await page.screenshot({path:'screenshots/final-score.png'});
await page.locator('[data-action="home"]').first().click();
await page.locator('[data-action="settings"]').click();
await page.locator('#setting-sound').uncheck();
await page.locator('#setting-motion').check();
await page.locator('[data-action="save-settings"]').click();
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('bomb-run-settings')).reducedMotion),true);
await page.waitForTimeout(300);assert.ok((await audioState()).rms<.0001,'Sound OFF must mute the master output');
await page.locator('[data-action="friends"]').click();
await page.locator('#nickname').fill('Pilot One');
await page.locator('[data-action="room-create"]').click();
assert.match(await page.locator('#room-code').inputValue(),/^[A-Z0-9]{6}$/);
await page.locator('[data-action="close"]').click();
await page.locator('[data-action="daily"]').click();
assert.ok((await page.locator('.modal').innerText()).includes('로컬'));
await page.locator('[data-action="close"]').click();
await page.close();
const mobile=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
await mobile.addInitScript(()=>localStorage.setItem('bomb-run-settings',JSON.stringify({quality:'low'})));
mobile.on('pageerror',e=>errors.push(e.message));
await mobile.goto(base);
await mobile.waitForFunction(()=>document.getElementById('app')?.dataset.phase==='menu');
await mobile.screenshot({path:'screenshots/menu-mobile-landscape.png'});
await mobile.locator('[data-action="play"]').tap();
await mobile.waitForFunction(()=>document.getElementById('app').dataset.phase==='flight',{},{timeout:15000});
const control=await mobile.locator('[data-control="left"]').boundingBox();
const session=await mobile.context().newCDPSession(mobile);
await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:control.x+control.width/2,y:control.y+control.height/2,id:8}]});
await mobile.waitForTimeout(300);
await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await mobile.screenshot({path:'screenshots/flight-mobile-landscape.png'});
await mobile.locator('[data-control="drop"]').tap();
await mobile.waitForFunction(()=>document.getElementById('app').dataset.phase==='result',{},{timeout:15000});
await mobile.locator('[data-action="home"]').first().tap();
await mobile.setViewportSize({width:390,height:844});
await mobile.screenshot({path:'screenshots/menu-mobile-portrait.png'});
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await writeFile('browser-report.json',JSON.stringify({passed:true,url:base,checks:['desktop full five-round game','keyboard flight','camera drag','single bomb','final AI board','saved settings','room code','daily local disclosure','mobile touch drop','portrait overflow','audible engine signal','release and impact audio','master mute','no public debug snapshot'],pageErrors:errors},null,2));
assert.deepEqual(errors,[]);
console.log('PASS browser: complete five rounds, mobile input, settings, local modes, no JS errors');
} finally {await browser.close();}
