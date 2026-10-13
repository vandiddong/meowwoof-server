import type { FlightInput } from './FlightPhysics';
export function normalizedInput(keys:ReadonlySet<string>,values:readonly string[],throttle=0):FlightInput {
  return {turn:Number(keys.has('KeyA')||keys.has('ArrowLeft')||values.includes('left'))-Number(keys.has('KeyD')||keys.has('ArrowRight')||values.includes('right')),throttle:keys.has('KeyW')||values.includes('faster')?1:keys.has('KeyS')||values.includes('slower')?-1:throttle};
}
export class FlightControls {
  private keys=new Set<string>();private touch=new Map<number,string>();throttle=0;
  cameraYaw=0;cameraPitch=.4;private drag:{id:number;x:number;y:number}|null=null;
  constructor(canvas:HTMLElement,private onDrop:()=>void,private sensitivity:()=>number){
    window.addEventListener('keydown',e=>{if((e.target as HTMLElement)?.matches('input,select,textarea'))return;if(['Space','KeyW','KeyS','KeyA','KeyD','KeyR','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();this.keys.add(e.code);if(e.code==='Space'&&!e.repeat)onDrop();if(e.code==='KeyR')this.resetCamera();}});
    window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.clear());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
    document.addEventListener('pointerdown',e=>{const button=(e.target as HTMLElement).closest<HTMLElement>('[data-control]');if(button){e.preventDefault();button.setPointerCapture(e.pointerId);this.touch.set(e.pointerId,button.dataset.control!);if(button.dataset.control==='drop')onDrop();}});
    const release=(e:PointerEvent)=>{this.touch.delete(e.pointerId);if(this.drag?.id===e.pointerId)this.drag=null;};
    document.addEventListener('pointerup',release);document.addEventListener('pointercancel',release);
    canvas.addEventListener('pointerdown',e=>{this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(this.drag?.id!==e.pointerId)return;const s=this.sensitivity();this.cameraYaw-=(e.clientX-this.drag.x)*.006*s;this.cameraPitch=Math.max(.08,Math.min(1.15,this.cameraPitch+(e.clientY-this.drag.y)*.004*s));this.drag.x=e.clientX;this.drag.y=e.clientY;});
  }
  clear(){this.keys.clear();this.touch.clear();this.drag=null;}
  resetCamera(){this.cameraYaw=0;this.cameraPitch=.4;}
  input():FlightInput {return normalizedInput(this.keys,[...this.touch.values()],this.throttle);}
}
