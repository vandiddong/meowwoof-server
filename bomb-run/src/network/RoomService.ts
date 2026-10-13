import { generateWorld, type World } from '../world/WorldGenerator';
import { Random, hashSeed } from '../world/SeededRandom';
import { initialFlight, stepFlight, normalizeAngle } from '../flight/FlightPhysics';
import { horizontalError, simulateImpact } from '../bomb/BombPhysics';
import { scoreDistance, type Entry, type RoundResult } from '../bomb/ImpactScoring';
import { CONFIG } from '../game/GameConfig';
export interface OnlineRoomService {
  createRoom(nickname:string):Promise<{code:string;participantId:string}>;
  joinRoom(code:string,nickname:string):Promise<{participantId:string;slot:number}>;
  getRound(room:string,round:number):Promise<World>; // Authorized current round only, never future targets.
  submitReplay(room:string,round:number,replay:unknown):Promise<RoundResult>;
  getLeaderboard(room:string):Promise<{name:string;status:'waiting'|'playing'|'finished';total?:number}[]>;
}
export type LocalRoom={code:string;entries:(Entry&{slot:number})[]};
export class LocalRoomService {
  read(code:string):LocalRoom {try{return JSON.parse(localStorage.getItem(`bomb-run-room-${code}`)||'null')||{code,entries:[]};}catch{return{code,entries:[]};}}
  create(){return Math.random().toString(36).slice(2,8).toUpperCase().padEnd(6,'X');}
  join(code:string,name:string){if(!/^[A-Z0-9]{6}$/.test(code))throw new Error('초대 코드는 영문·숫자 6자리입니다.');const room=this.read(code);let entry=room.entries.find(e=>e.name===name);if(!entry){if(room.entries.length>=5)throw new Error('로컬 방은 최대 5명입니다.');entry={name,slot:room.entries.length,results:[]};room.entries.push(entry);this.save(room);}return entry.slot;}
  finish(code:string,name:string,results:RoundResult[]){const room=this.read(code),entry=room.entries.find(e=>e.name===name);if(entry)entry.results=results;this.save(room);return room.entries.filter(e=>e.results.length===5);}
  private save(room:LocalRoom){try{localStorage.setItem(`bomb-run-room-${room.code}`,JSON.stringify(room));}catch{/* Private browsing still supports single-player. */}}
}
export function localDailyDate(offset=0){const date=new Date();date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10);}
export function dailySeed(date:string){return `local-daily-${date}`;}
export function aiResult(world:World,slot:number):RoundResult {
  const rng=new Random(`${world.seed}:ai:${slot}`),f=initialFlight(world.starts[(slot+world.round-1)%5]);
  const aim={x:world.target.x+rng.range(-60,60)*(slot*.3+.5),z:world.target.z+rng.range(-60,60)*(slot*.3+.5)};
  let best=Infinity,bestDistance=Infinity;
  for(let step=0;step<CONFIG.flightSeconds/CONFIG.fixedStep;step++){
    const heading=Math.atan2(aim.x-f.x,aim.z-f.z),turn=Math.max(-1,Math.min(1,normalizeAngle(heading-f.heading)*2));
    stepFlight(f,{turn,throttle:-.35},CONFIG.fixedStep);
    if(step%24===0){const hit=simulateImpact(f,world),error=horizontalError(hit,aim);if(error<best){best=error;bestDistance=horizontalError(hit,world.target);}}
  }
  return {round:world.round,score:scoreDistance(bestDistance),distance:bestDistance,seed:world.seed,dropped:true};
}
export function simulatedLeaderboard(seed:string):Entry[]{return ['MILO','POPPY','FINN','OLIVE'].map((name,i)=>({name,ai:true,results:Array.from({length:5},(_,r)=>aiResult(generateWorld(seed,r+1),i+1))}));}
export const participantRotation=(code:string)=>hashSeed(code)%5;
