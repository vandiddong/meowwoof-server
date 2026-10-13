import { CONFIG } from './GameConfig';
import { initialFlight, stepFlight, type FlightInput, type FlightState } from '../flight/FlightPhysics';
import { releaseBomb, stepBomb, horizontalError, type BombState } from '../bomb/BombPhysics';
import { scoreDistance, type RoundResult } from '../bomb/ImpactScoring';
import type { World } from '../world/WorldGenerator';
export type Phase='menu'|'briefing'|'mapExit'|'flight'|'bomb'|'result'|'final';
export class RoundSimulation {
  phase:Phase='briefing'; elapsed=0; flightTime=0; accumulator=0;
  flight:FlightState; inputs:FlightInput[]=[]; dropTick:number|null=null; bomb:BombState|null=null; result:RoundResult|null=null;
  constructor(public world:World,public slot=0){this.flight=initialFlight(world.starts[(slot+world.round-1)%5]);}
  drop() {if(this.phase!=='flight'||this.bomb||this.flightTime>=CONFIG.flightSeconds)return false;this.dropTick=this.inputs.length;this.bomb=releaseBomb(this.flight);this.phase='bomb';this.elapsed=0;return true;}
  advance(realDt:number,input:FlightInput) {
    this.accumulator+=Math.max(0,realDt);
    while(this.accumulator+1e-10>=CONFIG.fixedStep){this.accumulator-=CONFIG.fixedStep;this.tick(input);}
  }
  private tick(input:FlightInput){
    const dt=CONFIG.fixedStep;this.elapsed+=dt;
    if(this.phase==='briefing'&&this.elapsed+1e-8>=CONFIG.mapSeconds){this.phase='mapExit';this.elapsed=0;}
    else if(this.phase==='mapExit'&&this.elapsed+1e-8>=CONFIG.mapExitSeconds){this.phase='flight';this.elapsed=0;}
    else if(this.phase==='flight'){
      this.inputs.push({...input});this.flightTime+=dt;stepFlight(this.flight,input,dt);
      if(this.flightTime+1e-8>=CONFIG.flightSeconds)this.finish(null);
    }else if(this.phase==='bomb'&&this.bomb){stepBomb(this.bomb,this.world,dt);if(this.bomb.hit)this.finish(horizontalError(this.bomb,this.world.target));}
  }
  private finish(distance:number|null){this.result={round:this.world.round,score:distance===null?0:scoreDistance(distance),distance,seed:this.world.seed,dropped:distance!==null};this.phase='result';this.elapsed=0;}
}
