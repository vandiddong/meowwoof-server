import { CONFIG } from '../game/GameConfig';
import type { Start } from '../world/WorldGenerator';
export type FlightInput = { turn:number; throttle:number };
export type FlightState = { x:number; y:number; z:number; heading:number; speed:number; turnRate:number; bank:number };
export const initialFlight=(s:Start):FlightState=>({...s,y:CONFIG.flight.altitude,speed:CONFIG.flight.cruiseSpeed,turnRate:0,bank:0});
export const normalizeAngle=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
export function stepFlight(f:FlightState,input:FlightInput,dt:number) {
  const cfg=CONFIG.flight,targetSpeed=cfg.minSpeed+(Math.max(-1,Math.min(1,input.throttle))+1)/2*(cfg.maxSpeed-cfg.minSpeed);
  f.speed+=(targetSpeed-f.speed)*(1-Math.exp(-cfg.acceleration*dt));
  let turn=Math.max(-1,Math.min(1,input.turn))*cfg.maxTurnRate*(cfg.cruiseSpeed/f.speed);
  const limit=CONFIG.world.size/2-cfg.boundaryMargin;
  if(Math.abs(f.x)>limit||Math.abs(f.z)>limit){const home=Math.atan2(-f.x,-f.z);turn=turn*.15+Math.max(-1,Math.min(1,normalizeAngle(home-f.heading)*2))*cfg.maxTurnRate*1.8;}
  f.turnRate+=(turn-f.turnRate)*(1-Math.exp(-cfg.turnResponse*dt));
  f.heading=normalizeAngle(f.heading+f.turnRate*dt);
  f.x+=Math.sin(f.heading)*f.speed*dt;f.z+=Math.cos(f.heading)*f.speed*dt;
  f.bank+=(Math.max(-cfg.maxBank,Math.min(cfg.maxBank,-f.turnRate*.9))-f.bank)*(1-Math.exp(-4*dt));
}
