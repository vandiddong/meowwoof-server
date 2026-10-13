import { CONFIG } from '../game/GameConfig';
export type RoundResult = {round:number;score:number;distance:number|null;seed:string;dropped:boolean};
export function scoreDistance(distance:number) {if(!Number.isFinite(distance)||distance<0)return 0;return Math.max(0,Math.min(100,Math.round(100*Math.exp(-Math.pow(distance/CONFIG.scoring.scale,CONFIG.scoring.exponent)))));}
export const totalScore=(results:RoundResult[])=>results.reduce((s,r)=>s+r.score,0);
export type Entry = {name:string;results:RoundResult[];ai?:boolean};
export function compareEntries(a:Entry,b:Entry){return totalScore(b.results)-totalScore(a.results)||a.results.reduce((s,r)=>s+(r.distance??CONFIG.world.size*2),0)-b.results.reduce((s,r)=>s+(r.distance??CONFIG.world.size*2),0)||Math.max(0,...b.results.map(r=>r.score))-Math.max(0,...a.results.map(r=>r.score));}
