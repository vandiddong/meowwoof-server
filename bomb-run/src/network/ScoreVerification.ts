import { CONFIG } from '../game/GameConfig';
import { initialFlight, stepFlight, type FlightInput } from '../flight/FlightPhysics';
import { simulateImpact, horizontalError } from '../bomb/BombPhysics';
import { scoreDistance } from '../bomb/ImpactScoring';
import type { World } from '../world/WorldGenerator';
export type Replay = {slot:number;inputs:FlightInput[];dropTick:number|null};
/** Pure verification for a future trusted server. World, participant slot and round
 * must be selected by authenticated server state, never supplied by the client.
 * This does not prove human input or prevent automated play. */
export function verifyReplay(world:World,assignedSlot:number,replay:Replay){
  if(replay.slot!==assignedSlot||replay.inputs.length>Math.ceil(CONFIG.flightSeconds/CONFIG.fixedStep))throw new Error('Invalid participant or duration');
  if(replay.dropTick!==null&&(!Number.isInteger(replay.dropTick)||replay.dropTick<0||replay.dropTick>=CONFIG.flightSeconds/CONFIG.fixedStep||replay.dropTick>replay.inputs.length))throw new Error('Invalid drop time');
  for(const input of replay.inputs)if(!Number.isFinite(input.turn)||!Number.isFinite(input.throttle)||Math.abs(input.turn)>1||Math.abs(input.throttle)>1)throw new Error('Invalid controls');
  if(replay.dropTick===null){if(replay.inputs.length<Math.floor(CONFIG.flightSeconds/CONFIG.fixedStep))throw new Error('Incomplete timeout');return {score:0,distance:null};}
  const f=initialFlight(world.starts[(assignedSlot+world.round-1)%5]);
  for(let i=0;i<replay.dropTick;i++)stepFlight(f,replay.inputs[i],CONFIG.fixedStep);
  const impact=simulateImpact(f,world),distance=horizontalError(impact,world.target);
  return {score:scoreDistance(distance),distance};
}
