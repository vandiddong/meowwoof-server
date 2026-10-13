import { CONFIG } from '../game/GameConfig';
import { Random } from './SeededRandom';
export type Point = { x: number; z: number };
export type Peak = Point & { radius: number; height: number };
export type Village = Point & { roof: string; count: number; angle: number; kind: 'village'|'windmill'|'tower'|'farm'|'castle'|'lighthouse'; label: string };
export type Damage = Point & { radius: number; kind: 'ink'|'tear'|'water' };
export type Start = Point & { heading: number };
export type World = {
  seed: string; requestedSeed: string; attempt: number; fallback: boolean; round: number; archetype: string;
  rivers: Point[][]; riverWidth: number; lakes: (Point & {radius:number})[]; peaks: Peak[];
  villages: Village[]; forests: (Point & {radius:number})[]; trees: Point[];
  roads: Point[][]; bridges: (Point & {angle:number})[]; target: Point; starts: Start[];
  wind: Point; damage: Damage[]; damageRatio: number; difficulty: number;
  metrics: Record<string, number>; similarPairs: number; symmetric: boolean; phase: number;
};
export const ARCHETYPES = ['S자 강','두 강의 합류','중앙 산맥','평행 계곡','호수 마을','쌍둥이 마을','대칭 산맥','나선 도로','다중 다리','숲 평원','중앙 고원','해안과 만'] as const;
export const distance = (a: Point, b: Point) => Math.hypot(a.x-b.x,a.z-b.z);
export function segmentDistance(p: Point, a: Point, b: Point) {
  const dx=b.x-a.x,dz=b.z-a.z, t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz || 1)));
  return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);
}
export function riverDistance(w: World, p: Point) {
  let d=Infinity;
  for(const path of w.rivers) for(let i=1;i<path.length;i++) d=Math.min(d,segmentDistance(p,path[i-1],path[i]));
  for(const lake of w.lakes) d=Math.min(d, distance(p,lake)-lake.radius+w.riverWidth/2);
  return d;
}
export function heightAt(w: World, x: number,z: number) {
  const p={x,z}; let h=4+Math.sin(x/135+w.phase)*Math.cos(z/160)*2;
  for(const peak of w.peaks) { const d=distance(p,peak)/peak.radius; if(d<1) h+=peak.height*(1-d)**1.45; }
  for(const village of w.villages) { const d=distance(p,village); if(d<70) h=4+(h-4)*Math.max(0,(d-48)/22); }
  const rd=riverDistance(w,p), half=w.riverWidth/2;
  if(rd<half+14) h=1+Math.max(0,Math.min(1,(rd-half)/14))*(h-1);
  return Math.min(CONFIG.world.maxHeight,h);
}
// Match the exact two triangles used by the rendered terrain mesh.
export function surfaceHeight(w:World,x:number,z:number) {
  const half=CONFIG.world.size/2,cell=CONFIG.world.size/CONFIG.world.terrainSegments;
  if(Math.abs(x)>half||Math.abs(z)>half)return 0; // Surrounding sea outside the diorama.
  const ix=Math.min(CONFIG.world.terrainSegments-1,Math.floor((x+half)/cell));
  const iz=Math.min(CONFIG.world.terrainSegments-1,Math.floor((z+half)/cell));
  const x0=ix*cell-half,z0=iz*cell-half,u=(x-x0)/cell,v=(z-z0)/cell;
  const h00=heightAt(w,x0,z0),h10=heightAt(w,x0+cell,z0),h01=heightAt(w,x0,z0+cell),h11=heightAt(w,x0+cell,z0+cell);
  return u+v<=1?h00+(h10-h00)*u+(h01-h00)*v:h11+(h01-h11)*(1-u)+(h10-h11)*(1-v);
}
export const isLand = (w:World,p:Point) => Math.abs(p.x)<CONFIG.world.size/2-20 && Math.abs(p.z)<CONFIG.world.size/2-20 && riverDistance(w,p)>w.riverWidth/2+12;
function intersection(a:Point,b:Point,c:Point,d:Point):Point|null {
  const rx=b.x-a.x,rz=b.z-a.z,sx=d.x-c.x,sz=d.z-c.z, den=rx*sz-rz*sx;
  if(Math.abs(den)<1e-8)return null;
  const t=((c.x-a.x)*sz-(c.z-a.z)*sx)/den, u=((c.x-a.x)*rz-(c.z-a.z)*rx)/den;
  return t>=0&&t<=1&&u>=0&&u<=1?{x:a.x+t*rx,z:a.z+t*rz}:null;
}
export function evaluateDifficulty(w:World) {
  const avg=w.starts.reduce((s,p)=>s+distance(p,w.target),0)/5;
  const clues=w.villages.filter(v=>distance(v,w.target)<290).length;
  const m={distance:Math.min(1,avg/650),similarity:w.similarPairs/3,symmetry:w.symmetric?1:0,
    uniqueness:1-Math.min(1,clues/4),visibility:Math.min(1,w.peaks.filter(p=>distance(p,w.target)<350).length/4),
    damage:Math.min(1,w.damageRatio/.28),reachability:Math.min(1,avg/(CONFIG.flight.maxSpeed*CONFIG.flightSeconds))};
  w.metrics=m;
  return Object.entries(CONFIG.world.weights).reduce((s,[key,weight])=>s+m[key as keyof typeof m]*weight,0);
}
export function validateWorld(w:World):string[] {
  const issues:string[]=[];
  if(w.villages.length<2)issues.push('Not enough distinctive clues');
  if(!isLand(w,w.target)||heightAt(w,w.target.x,w.target.z)>35)issues.push('Invalid target');
  if(w.starts.length!==5)issues.push('Expected five starts');
  const distances=w.starts.map(s=>distance(s,w.target));
  for(const s of w.starts){
    if(!isLand(w,s)||heightAt(w,s.x,s.z)>CONFIG.flight.altitude-30)issues.push('Invalid start');
    if(distance(s,w.target)>CONFIG.flight.minSpeed*CONFIG.flightSeconds*.8)issues.push('Unreachable target');
    const facing=Math.atan2(w.target.x-s.x,w.target.z-s.z);
    const turnSeconds=Math.abs(Math.atan2(Math.sin(s.heading-facing),Math.cos(s.heading-facing)))/CONFIG.flight.maxTurnRate;
    if(distance(s,w.target)/CONFIG.flight.cruiseSpeed+turnSeconds>CONFIG.flightSeconds-4)issues.push('Unreachable with initial heading');
    if(Math.abs(Math.atan2(Math.sin(s.heading-facing),Math.cos(s.heading-facing)))>1.65)issues.push('Unfair heading');
  }
  if(Math.max(...distances)-Math.min(...distances)>45)issues.push('Unequal start distances');
  for(const v of w.villages) if(!isLand(w,v)||heightAt(w,v.x,v.z)>6)issues.push('Invalid landmark');
  for(const b of w.bridges)if(riverDistance(w,b)>1)issues.push('Bridge outside river');
  for(const d of w.damage)for(const p of [w.target,...w.villages.slice(0,2)])if(distance(d,p)<d.radius+35)issues.push('Essential clue obscured');
  if(w.damageRatio<CONFIG.world.damageBands[w.round-1][0]-.015||w.damageRatio>CONFIG.world.damageBands[w.round-1][1]+.015)issues.push('Damage outside range');
  const [lo,hi]=CONFIG.world.difficultyBands[w.round-1];
  if(w.difficulty<lo||w.difficulty>hi)issues.push('Difficulty outside range');
  return issues;
}
function candidate(seed:string,round:number,attempt:number):World {
  const rng=new Random(`${seed}:${round}:${attempt}`), a=rng.int(0,11), rotation=rng.range(-Math.PI,Math.PI);
  const rot=(p:Point):Point=>({x:p.x*Math.cos(rotation)-p.z*Math.sin(rotation),z:p.x*Math.sin(rotation)+p.z*Math.cos(rotation)});
  const w:World={seed:`${seed}:${round}:${attempt}`,requestedSeed:seed,attempt,fallback:false,round,archetype:ARCHETYPES[a],rivers:[],riverWidth:rng.range(23,38),lakes:[],peaks:[],villages:[],forests:[],trees:[],roads:[],bridges:[],target:{x:0,z:0},starts:[],wind:rot({x:rng.range(-CONFIG.world.windMax,CONFIG.world.windMax),z:rng.range(-CONFIG.world.windMax,CONFIG.world.windMax)}),damage:[],damageRatio:0,difficulty:0,metrics:{},similarPairs:Math.min(3,Math.floor(round/2)),symmetric:[5,6].includes(a),phase:rng.range(0,6)};
  const path=(offset:number,amp:number,end=600)=>Array.from({length:49},(_,i)=>rot({x:offset+Math.sin((i/48)*Math.PI*(a===8?5:2.5)+w.phase)*amp,z:-600+i/48*(end+600)}));
  if([0,1,3,5,8,11].includes(a)){w.rivers.push(path(a===11?230:0,rng.range(65,140)));if(a===1){const end=w.rivers[0][24],begin=rot({x:-480,z:-400});const branch=Array.from({length:25},(_,i)=>({x:begin.x+(end.x-begin.x)*i/24,z:begin.z+(end.z-begin.z)*i/24})); w.rivers.push(branch);} if(a===3)w.rivers.push(path(280,65));}
  if([4,11].includes(a))w.lakes.push({...rot({x:a===11?260:40,z:80}),radius:rng.range(110,155)});
  const peakCount=[2,3,6,10].includes(a)?7:rng.int(3,5);
  for(let i=0;i<peakCount;i++) { const p=rot({x:[2,10].includes(a)?(i-3)*90:rng.range(-420,420),z:[2,10].includes(a)?-220+rng.range(-40,40):rng.range(-420,420)});w.peaks.push({...p,radius:rng.range(75,130),height:rng.range(35,a===10?68:85)});}
  if(a===6)w.peaks=w.peaks.flatMap(p=>[p,{...p,x:-p.x,z:-p.z,height:p.height*.9}]);
  const kinds:Village['kind'][]=['windmill','tower','village','farm','castle','lighthouse'];
  for(let i=0;i<CONFIG.world.villageCount;i++){
    for(let tries=0;tries<100;tries++){
      const p=rot({x:rng.range(-410,410),z:rng.range(-410,410)});
      if(!isLand(w,p)||w.peaks.some(m=>distance(m,p)<m.radius+65)||w.villages.some(v=>distance(v,p)<120))continue;
      w.villages.push({...p,roof:rng.pick(['#cc6554','#e3ad4e','#748fa0']),count:rng.int(4,9),angle:rng.range(0,6.28),kind:kinds[i%kinds.length],label:['풍차 마을','시계탑','붉은 지붕','황금 농장','작은 성','등대'][i]});break;
    }
  }
  // Paired settlements share a silhouette, while roof color and landmark distinguish them.
  for(let i=0;i<w.similarPairs&&i+3<w.villages.length;i++){w.villages[i+3].count=w.villages[i].count;w.villages[i+3].angle=w.villages[i].angle;w.villages[i+3].kind=w.villages[i].kind;w.villages[i+3].roof=w.villages[i].roof==='#748fa0'?'#e3ad4e':'#748fa0';}
  for(let i=1;i<w.villages.length;i++){
    const road:Point[]=[w.villages[i-1],w.villages[i]];
    if(a===7){const mid={x:(road[0].x+road[1].x)/2,z:(road[0].z+road[1].z)/2};road.splice(1,0,rot({x:mid.x*.6-45,z:mid.z*.6+45}));}
    w.roads.push(road);
    for(let k=1;k<road.length;k++)for(const river of w.rivers)for(let j=1;j<river.length;j++){const cross=intersection(road[k-1],road[k],river[j-1],river[j]);if(cross&&!w.bridges.some(b=>distance(b,cross)<30))w.bridges.push({...cross,angle:Math.atan2(road[k].x-road[k-1].x,road[k].z-road[k-1].z)});}
  }
  for(let i=0;i<CONFIG.world.forestCount;i++)w.forests.push({...rot({x:rng.range(-460,460),z:rng.range(-460,460)}),radius:rng.range(48,105)});
  for(let i=0;i<CONFIG.world.treeCount*3&&w.trees.length<CONFIG.world.treeCount;i++){
    const f=rng.pick(w.forests),angle=rng.range(0,6.28),r=Math.sqrt(rng.next())*f.radius,p={x:f.x+Math.sin(angle)*r,z:f.z+Math.cos(angle)*r};
    if(isLand(w,p)&&!w.villages.some(v=>distance(v,p)<65)&&heightAt(w,p.x,p.z)<45)w.trees.push(p);
  }
  for(let i=0;i<120;i++) { const p={x:rng.range(-135,135),z:rng.range(-135,135)};if(isLand(w,p)&&heightAt(w,p.x,p.z)<25){w.target=p;break;} }
  const radius=rng.range(CONFIG.world.startRadius[0],CONFIG.world.startRadius[1]), offset=rng.range(0,6.28),headingOffset=rng.range(1.15,1.4);
  for(let i=0;i<5;i++){const angle=offset+i*Math.PI*2/5,p={x:w.target.x+Math.sin(angle)*radius,z:w.target.z+Math.cos(angle)*radius};w.starts.push({...p,heading:Math.atan2(w.target.x-p.x,w.target.z-p.z)+(rng.next()>.5?1:-1)*(headingOffset+rng.range(-.08,.08))});}
  // Non-overlapping masks have a measurable area and preserve target + two anchor clues.
  const desired=rng.range(CONFIG.world.damageBands[round-1][0],CONFIG.world.damageBands[round-1][1]),maskRadius=round<3?55:90;
  for(let i=0;i<500&&w.damageRatio<desired;i++){
    const d={x:rng.range(-600+maskRadius,600-maskRadius),z:rng.range(-600+maskRadius,600-maskRadius),radius:maskRadius,kind:rng.pick(['ink','tear','water'] as const)};
    const area=Math.PI*maskRadius**2/CONFIG.world.size**2;
    if(w.damageRatio+area>CONFIG.world.damageBands[round-1][1]+.008)break;
    if([w.target,...w.villages.slice(0,2)].some(p=>distance(d,p)<maskRadius+40)||w.damage.some(p=>distance(d,p)<maskRadius+p.radius+3))continue;
    w.damage.push(d);w.damageRatio+=area;
  }
  w.difficulty=evaluateDifficulty(w); return w;
}
export function generateWorld(seed:string,round:number):World {
  if(round<1||round>5)throw new Error('Round must be 1–5');
  for(let i=0;i<CONFIG.world.maxAttempts;i++){const w=candidate(seed,round,i);if(!validateWorld(w).length)return w;}
  // Bounded deterministic fallback candidates are validated by exactly the same rules.
  for(const backup of ['BOMB-RUN-SAFE-1','BOMB-RUN-SAFE-2','BOMB-RUN-SAFE-3'])for(let i=0;i<CONFIG.world.maxAttempts;i++){
    const w=candidate(backup,round,i);if(!validateWorld(w).length){w.requestedSeed=seed;w.fallback=true;return w;}
  }
  throw new Error(`No valid world for round ${round}; review generator configuration`);
}
