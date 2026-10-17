import assert from 'node:assert/strict';
export async function verifyAirCombat(browser,base,errors){
 const checks=[];
 for(const sample of [
  {name:'desktop',viewport:{width:1440,height:1000},touch:false},
  {name:'portrait',viewport:{width:320,height:568},touch:true},
  {name:'landscape',viewport:{width:667,height:375},touch:true}
 ]){
  const context=await browser.newContext({viewport:sample.viewport,hasTouch:sample.touch,isMobile:sample.touch});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('bomb-run-settings',JSON.stringify({quality:'low'}));localStorage.setItem('bomb-run-best-v2','321');localStorage.setItem('boomkerque-airbattle-best-v1','99');});
  await page.goto(base);await page.locator('[data-action=combat]').waitFor();
  assert.equal(await page.locator('[data-action=play]').count(),1);assert.equal(await page.locator('[data-action=combat]').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const activate=async(selector)=>sample.touch?page.locator(selector).tap():page.locator(selector).click();
  await activate('[data-action=combat]');await page.locator('.combat-intro').waitFor();
  assert.equal(await page.locator('.guide-book,.training-offer,#tactical-map').count(),0,'Combat never goes through bombing onboarding');
  await activate('[data-action=dogfight-start]');await page.waitForFunction(()=>document.getElementById('app').dataset.phase==='dogfight');
  await page.waitForFunction(()=>document.getElementById('ammo-label').textContent!=='100 / 100');
  assert.equal(await page.evaluate(()=>document.pointerLockElement),null,'Menu stays reachable without Esc');
  await activate('[data-action=pause]');await page.locator('.combat-pause').waitFor();
  const time=await page.locator('#time-label').innerText(),ammo=await page.locator('#ammo-label').innerText();await page.waitForTimeout(700);
  assert.equal(await page.locator('#time-label').innerText(),time);assert.equal(await page.locator('#ammo-label').innerText(),ammo);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const resume=await page.locator('.combat-pause [data-action=close]').boundingBox();assert.ok(resume.width>=44&&resume.height>=44&&resume.y>=0&&resume.y+resume.height<=sample.viewport.height);
  await page.screenshot({path:`screenshots/combat-pause-${sample.name}.png`});
  await activate('.combat-pause [data-action=close]');
  assert.equal(await page.evaluate(()=>document.getElementById('hud').inert),false);assert.equal(await page.evaluate(()=>document.getElementById('header').inert),false);
  await activate('[data-action=combat-auto]');assert.equal(await page.locator('[data-action=combat-auto]').getAttribute('aria-pressed'),'false');
  const height=()=>page.locator('#heading-label').innerText().then(t=>Number(t.replace(/[^0-9]/g,'')));
  const before=await height();
  if(sample.touch){
   const session=await context.newCDPSession(page),x=sample.viewport.width*.4,y=sample.viewport.height*.53;
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:51}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35,y:y-65,id:51}]});
   await page.waitForTimeout(500);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
  }else{
   await page.mouse.move(720,500);await page.mouse.move(770,430);await page.waitForTimeout(500);
  }
  assert.ok(await height()>before,'Mouse/touch up climbs without altitude buttons');
  assert.equal(await page.locator('[data-control=climb],[data-control=descend]').count(),0);
  const pause=await page.locator('[data-action=pause]').boundingBox(),auto=await page.locator('[data-action=combat-auto]').boundingBox();
  for(const box of [pause,auto])assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=sample.viewport.width&&box.y+box.height<=sample.viewport.height&&box.height>=44);
  assert.equal(await page.locator('.steering').isVisible(),false);assert.equal(await page.locator('.throttle').isVisible(),false);assert.equal(await page.locator('.drop').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`screenshots/combat-${sample.name}.png`});
  await activate('[data-action=pause]');await activate('[data-action=combat-retry]');
  await page.waitForFunction(()=>document.getElementById('app').dataset.phase==='dogfight');assert.ok(Number(await page.locator('#time-label').innerText())>58);
  if(sample.name==='desktop'){
   // Let a real, unmodified battle end through its clock or CPU damage.
   await page.waitForFunction(()=>document.getElementById('app').dataset.phase==='final',null,{timeout:75000});
   assert.equal(await page.locator('.combat-final').count(),1);assert.equal(await page.locator('.leaderboard,.flight-progress').count(),0);
   const scoring=await page.locator('.combat-summary p').innerText(),total=Number((await page.locator('.combat-final .score-number').innerText()).replace(/[^0-9]/g,''));
   const components=[...scoring.matchAll(/= (\d+)점/g)].map(m=>Number(m[1]));assert.equal(components.length,3);assert.equal(components.reduce((a,b)=>a+b,0),total);
   assert.equal(await page.evaluate(()=>localStorage.getItem('bomb-run-best-v2')),'321');assert.equal(await page.evaluate(()=>localStorage.getItem('bomb-run-flight-history-v1')),null);assert.equal(await page.evaluate(()=>localStorage.getItem('bomb-run-play-stats-v1')),null);
   assert.equal(Number(await page.evaluate(()=>localStorage.getItem('boomkerque-airbattle-best-v1'))),Math.max(99,total));
   await page.screenshot({path:'screenshots/combat-final.png'});
   await activate('[data-action=combat-retry]');await page.locator('[data-action=pause]').waitFor();await activate('[data-action=pause]');
  }else{await activate('[data-action=pause]');}
  await activate('.combat-pause [data-action=home]');await page.locator('[data-action=play]').waitFor();
  assert.equal(await page.locator('#combat-hud').isVisible(),false);
  await activate('[data-action=play]');await page.locator('.guide-book').waitFor();
  assert.equal(await page.evaluate(()=>document.getElementById('app').dataset.phase),'menu','Bombing keeps its independent first-run guide');
  checks.push({case:sample.name,passed:true,realDevice:false});await context.close();
 }
 return checks;
}
