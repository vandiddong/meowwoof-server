import { describe,it,expect } from 'vitest';
import { generateWorld,validateWorld,riverDistance,heightAt,surfaceHeight,isLand,ARCHETYPES,distance } from '../src/world/WorldGenerator';
import { CONFIG } from '../src/game/GameConfig';
import { mapPoint } from '../src/map/TacticalMap';
import { RoundSimulation } from '../src/game/GameState';
import { initialFlight,stepFlight } from '../src/flight/FlightPhysics';
import { simulateImpact } from '../src/bomb/BombPhysics';
import { scoreDistance,totalScore,compareEntries } from '../src/bomb/ImpactScoring';
import { normalizedInput } from '../src/flight/FlightControls';
import { verifyReplay } from '../src/network/ScoreVerification';
const world=generateWorld('test-world',1);
describe('deterministic world generation and fairness',()=>{
  it('reproduces every map field from the same seed',()=>expect(generateWorld('same',3)).toEqual(generateWorld('same',3)));
  it('generates diverse geometry and all twelve archetypes',()=>{
    const worlds=Array.from({length:100},(_,i)=>generateWorld(`variety-${i}`,i%5+1));
    expect(new Set(worlds.map(w=>JSON.stringify(w.target))).size).toBeGreaterThan(80);
    expect(new Set(worlds.map(w=>w.archetype)).size).toBe(ARCHETYPES.length);
    expect(new Set(worlds.map(w=>JSON.stringify(w.rivers))).size).toBeGreaterThan(30);
  });
  it('positions bridges on continuous river segments',()=>{let bridges=0;for(let i=0;i<20;i++){const w=generateWorld(`bridge-${i}`,2);w.bridges.forEach(b=>{bridges++;expect(riverDistance(w,b)).toBeLessThan(1);});for(const path of w.rivers)for(let j=1;j<path.length;j++)expect(distance(path[j-1],path[j])).toBeLessThan(75);}expect(bridges).toBeGreaterThan(0);});
  it('places landmarks on flat dry ground',()=>{for(let r=1;r<=5;r++)generateWorld('landmarks',r).villages.forEach(p=>{const w=generateWorld('landmarks',r);expect(isLand(w,p)).toBe(true);expect(heightAt(w,p.x,p.z)).toBeLessThan(6);});});
  it('provides five different valid and similarly reachable starts',()=>{for(let r=1;r<=5;r++){const w=generateWorld('starts',r);expect(w.starts).toHaveLength(5);expect(new Set(w.starts.map(s=>`${s.x}:${s.z}`)).size).toBe(5);w.starts.forEach(s=>{expect(isLand(w,s)).toBe(true);expect(distance(s,w.target)).toBeLessThan(CONFIG.flight.minSpeed*CONFIG.flightSeconds*.8);});expect(validateWorld(w)).toEqual([]);}});
  it('places each target on valid terrain',()=>{for(let r=1;r<=5;r++){const w=generateWorld('targets',r);expect(isLand(w,w.target)).toBe(true);expect(heightAt(w,w.target.x,w.target.z)).toBeLessThan(35);}});
  it('keeps difficulty inside each round band',()=>{for(let i=0;i<30;i++)for(let r=1;r<=5;r++){const w=generateWorld(`difficulty-${i}`,r),[lo,hi]=CONFIG.world.difficultyBands[r-1];expect(w.difficulty).toBeGreaterThanOrEqual(lo);expect(w.difficulty).toBeLessThanOrEqual(hi);expect(validateWorld(w)).toEqual([]);}});
  it('rejects unequal/unreachable starts, invalid bridges and damaged clues',()=>{const w=structuredClone(world);w.starts[0]={x:9999,z:9999,heading:0};w.bridges.push({x:580,z:580,angle:0});w.damage.push({...w.target,radius:100,kind:'ink'});expect(validateWorld(w)).toContain('Unreachable target');expect(validateWorld(w)).toContain('Unequal start distances');expect(validateWorld(w)).toContain('Essential clue obscured');});
  it('performs bounded rejection sampling',()=>{const worlds=Array.from({length:20},(_,i)=>generateWorld(`rejection-${i}`,5));expect(worlds.some(w=>w.attempt>0||w.fallback)).toBe(true);worlds.forEach(w=>expect(w.attempt).toBeLessThan(CONFIG.world.maxAttempts));});
  it('projects exactly the same target coordinates on the map',()=>{const p=mapPoint(world.target,720);expect(p.x/720*1200-600).toBeCloseTo(world.target.x,10);expect(p.z/720*1200-600).toBeCloseTo(world.target.z,10);});
  it('preserves the target and two essential anchor clues under real opaque masks',()=>{for(let r=1;r<=5;r++){const w=generateWorld('damage',r);for(const mask of w.damage)for(const p of [w.target,...w.villages.slice(0,2)])expect(distance(p,mask)).toBeGreaterThan(mask.radius+35);if(r>=3)expect(w.damageRatio).toBeGreaterThan(.09);}});
});
describe('fixed timestep flight, bombs and scoring',()=>{
  function run(fps:number){const s=new RoundSimulation(world);s.phase='flight';for(let i=0;i<fps*3;i++)s.advance(1/fps,{turn:.25,throttle:.4});expect(s.drop()).toBe(true);for(let i=0;i<fps*12&&String(s.phase)==='bomb';i++)s.advance(1/fps,{turn:0,throttle:0});return s;}
  it('lands at the same point across 30, 60 and 144 FPS',()=>{const a=run(30),b=run(60),c=run(144);expect(a.bomb!.x).toBeCloseTo(b.bomb!.x,8);expect(a.bomb!.z).toBeCloseTo(c.bomb!.z,8);expect(a.result).toEqual(c.result);});
  it('replays the same release identically',()=>{const f=initialFlight(world.starts[0]);expect(simulateImpact(f,world)).toEqual(simulateImpact(f,world));});
  it('uses inherited speed and wind in impact position',()=>{const f=initialFlight(world.starts[0]),a=simulateImpact(f,world),b=simulateImpact({...f,speed:70},world),c=simulateImpact(f,{...world,wind:{x:30,z:30}});expect(distance(a,b)).toBeGreaterThan(30);expect(distance(a,c)).toBeGreaterThan(20);expect(a.y).toBeCloseTo(surfaceHeight(world,a.x,a.z)+CONFIG.bomb.radius);});
  it('awards zero after a complete no-drop flight',()=>{const s=new RoundSimulation(world);s.advance(25.65,{turn:0,throttle:0});expect(s.phase).toBe('result');expect(s.result?.score).toBe(0);expect(s.result?.distance).toBe(null);});
  it('allows only one bomb and finishes late drops after expiry',()=>{const s=new RoundSimulation(world);s.phase='flight';s.advance(19.9,{turn:0,throttle:0});expect(s.drop()).toBe(true);expect(s.drop()).toBe(false);s.advance(10,{turn:0,throttle:0});expect(s.result?.dropped).toBe(true);});
  it('gives exactly five seconds of map time plus a separate exit animation',()=>{const s=new RoundSimulation(world);s.advance(4.99,{turn:0,throttle:0});expect(s.phase).toBe('briefing');s.advance(.02,{turn:0,throttle:0});expect(s.phase).toBe('mapExit');expect(s.flightTime).toBe(0);s.advance(.65,{turn:0,throttle:0});expect(s.phase).toBe('flight');});
  it('totals five rounds to at most 500 and sorts ties by error then best round',()=>{const results=Array.from({length:5},(_,r)=>({round:r+1,score:scoreDistance(0),distance:0,seed:'x',dropped:true}));expect(totalScore(results)).toBe(500);expect(scoreDistance(90)).toBe(37);expect(scoreDistance(Infinity)).toBe(0);expect(compareEntries({name:'a',results:[{...results[0],score:50,distance:20}]},{name:'b',results:[{...results[0],score:50,distance:30}]})).toBeLessThan(0);});
  it('runs mobile and keyboard controls through identical normalized physics',()=>{const keyboard=initialFlight(world.starts[0]),touch=initialFlight(world.starts[0]);for(let i=0;i<1000;i++){stepFlight(keyboard,normalizedInput(new Set(['KeyA','KeyW']),[]),CONFIG.fixedStep);stepFlight(touch,normalizedInput(new Set(),['left','faster']),CONFIG.fixedStep);}expect(touch).toEqual(keyboard);});
  it('validates replayed input instead of trusting submitted scores',()=>{const inputs=Array.from({length:360},()=>({turn:.1,throttle:0}));const f=initialFlight(world.starts[0]);inputs.forEach(input=>stepFlight(f,input,CONFIG.fixedStep));const impact=simulateImpact(f,world);expect(verifyReplay(world,0,{slot:0,inputs,dropTick:360}).score).toBe(scoreDistance(distance(impact,world.target)));expect(()=>verifyReplay(world,0,{slot:1,inputs,dropTick:360})).toThrow();expect(()=>verifyReplay(world,0,{slot:0,inputs:[{turn:5,throttle:0}],dropTick:1})).toThrow();});
});
describe('rendered surface and replay capture',()=>{
  it('collides with the same terrain triangle surface used by rendering',()=>{
    const cell=CONFIG.world.size/CONFIG.world.terrainSegments,x=-120,z=45;
    const center=surfaceHeight(world,x+cell*.5,z+cell*.5);
    expect(center).toBeCloseTo((heightAt(world,x+cell,z)+heightAt(world,x,z+cell))/2,10);
    for(let i=0;i<30;i++)expect(heightAt(world,i*30-450,i*17-250)).toBeLessThan(CONFIG.flight.altitude-30);
  });
  it('captures the actual fixed-tick inputs and release for verification',()=>{
    const s=new RoundSimulation(world,2);s.phase='flight';s.advance(3,{turn:-.2,throttle:.4});s.drop();s.advance(10,{turn:0,throttle:0});
    expect(s.dropTick).toBe(360);expect(s.inputs).toHaveLength(360);
    const verified=verifyReplay(world,2,{slot:2,inputs:s.inputs,dropTick:s.dropTick});expect(verified.score).toBe(s.result!.score);expect(verified.distance).toBeCloseTo(s.result!.distance!,9);
  });
});

it('does not point every starting aircraft toward the answer',()=>{const w=generateWorld('heading-fairness',3);const offsets=w.starts.map(s=>Math.abs(Math.atan2(Math.sin(s.heading-Math.atan2(w.target.x-s.x,w.target.z-s.z)),Math.cos(s.heading-Math.atan2(w.target.x-s.x,w.target.z-s.z)))));offsets.forEach(a=>expect(a).toBeGreaterThan(1));expect(Math.max(...offsets)-Math.min(...offsets)).toBeLessThan(.2);});
