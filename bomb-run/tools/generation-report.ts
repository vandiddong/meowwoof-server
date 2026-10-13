import { generateWorld,validateWorld,ARCHETYPES } from '../src/world/WorldGenerator';
const count=Number(process.argv[2]||1000);
let failures=0,fallbacks=0,rejections=0;const archetypes:Record<string,number>=Object.fromEntries(ARCHETYPES.map(a=>[a,0]));const rounds=Array.from({length:5},()=>({count:0,min:100,max:0,total:0,damage:0}));
const start=Date.now();
for(let i=0;i<count;i++){const r=i%5+1;try{const w=generateWorld(`audit-${i}`,r);if(validateWorld(w).length)failures++;fallbacks+=Number(w.fallback);rejections+=w.attempt;archetypes[w.archetype]++;const b=rounds[r-1];b.count++;b.min=Math.min(b.min,w.difficulty);b.max=Math.max(b.max,w.difficulty);b.total+=w.difficulty;b.damage+=w.damageRatio;}catch(e){failures++;console.error(`Failed seed audit-${i}: ${String(e)}`);}}
console.log(JSON.stringify({seeds:count,failures,successRate:(count-failures)/count,fallbacks,rejectedAttempts:rejections,rejectionRate:rejections/(count+rejections),elapsedSeconds:(Date.now()-start)/1000,rounds:rounds.map((r,i)=>({round:i+1,count:r.count,min:+r.min.toFixed(2),max:+r.max.toFixed(2),mean:+(r.total/r.count).toFixed(2),damagePercent:+(r.damage/r.count*100).toFixed(2)})),archetypes},null,2));
if(failures)process.exitCode=1;
