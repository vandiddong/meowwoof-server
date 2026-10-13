import { CONFIG } from '../game/GameConfig';
import type { FlightState } from '../flight/FlightPhysics';
import { surfaceHeight, type World, type Point } from '../world/WorldGenerator';
export type BombState = {x:number;y:number;z:number;vx:number;vy:number;vz:number;hit:boolean;time:number};
export function releaseBomb(f:FlightState):BombState { return {x:f.x,y:f.y-3,z:f.z,vx:Math.sin(f.heading)*f.speed,vy:0,vz:Math.cos(f.heading)*f.speed,hit:false,time:0}; }
export function stepBomb(b:BombState,world:World,dt:number) {
  if(b.hit)return;
  const old={x:b.x,y:b.y,z:b.z},cfg=CONFIG.bomb;
  b.vx+=(world.wind.x*cfg.windAcceleration-cfg.drag*b.vx)*dt;
  b.vz+=(world.wind.z*cfg.windAcceleration-cfg.drag*b.vz)*dt;
  b.vy+=(-cfg.gravity-cfg.drag*.2*b.vy)*dt;
  b.x+=b.vx*dt;b.z+=b.vz*dt;b.y+=b.vy*dt;b.time+=dt;
  if(b.y<=surfaceHeight(world,b.x,b.z)+cfg.radius){
    // Bisect the swept segment so slopes do not depend on frame sampling.
    let lo=0,hi=1;
    for(let i=0;i<12;i++){const t=(lo+hi)/2,x=old.x+(b.x-old.x)*t,z=old.z+(b.z-old.z)*t,y=old.y+(b.y-old.y)*t;if(y<=surfaceHeight(world,x,z)+cfg.radius)hi=t;else lo=t;}
    b.x=old.x+(b.x-old.x)*hi;b.z=old.z+(b.z-old.z)*hi;b.y=surfaceHeight(world,b.x,b.z)+cfg.radius;b.hit=true;
  }
}
export function simulateImpact(f:FlightState,world:World):BombState { const b=releaseBomb(f);for(let i=0;i<3600&&!b.hit;i++)stepBomb(b,world,CONFIG.fixedStep);if(!b.hit)throw new Error('Bomb did not land');return b; }
export const horizontalError=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
