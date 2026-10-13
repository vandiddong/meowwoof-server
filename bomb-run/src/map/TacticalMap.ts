import { CONFIG } from '../game/GameConfig';
import { type World, type Point } from '../world/WorldGenerator';
export function mapPoint(p:Point,size=600){return{x:(p.x/CONFIG.world.size+.5)*size,z:(p.z/CONFIG.world.size+.5)*size};}
export function drawMap(canvas:HTMLCanvasElement,w:World,reveal?:Point){
  const size=720;canvas.width=size;canvas.height=size;const c=canvas.getContext('2d')!;
  const point=(p:Point)=>mapPoint(p,size),path=(points:Point[],color:string,width:number)=>{c.beginPath();points.forEach((p,i)=>{const q=point(p);if(i===0)c.moveTo(q.x,q.z);else c.lineTo(q.x,q.z);});c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();};
  c.fillStyle='#eee4c8';c.fillRect(0,0,size,size);c.strokeStyle='#dbd0ad';c.lineWidth=1;
  for(let i=0;i<=12;i++){c.beginPath();c.moveTo(i*60,0);c.lineTo(i*60,size);c.moveTo(0,i*60);c.lineTo(size,i*60);c.stroke();}
  for(const p of w.peaks){const q=point(p),r=p.radius/1200*size;c.fillStyle='#bdc39d';c.beginPath();c.ellipse(q.x,q.z,r,r*.8,0,0,Math.PI*2);c.fill();c.fillStyle='#8f9e7e';c.beginPath();c.moveTo(q.x,q.z-21);c.lineTo(q.x-20,q.z+17);c.lineTo(q.x+20,q.z+17);c.closePath();c.fill();c.fillStyle='#f8eed4';c.beginPath();c.moveTo(q.x,q.z-21);c.lineTo(q.x-7,q.z-5);c.lineTo(q.x+7,q.z-5);c.fill();}
  for(const f of w.forests){const q=point(f),r=f.radius/1200*size;c.fillStyle='#a1b899';c.beginPath();c.arc(q.x,q.z,r,0,Math.PI*2);c.fill();for(let i=0;i<5;i++){const x=q.x+Math.sin(i*2)*r*.6,y=q.z+Math.cos(i*2)*r*.6;c.fillStyle='#5f8a71';c.beginPath();c.moveTo(x,y-11);c.lineTo(x-8,y+8);c.lineTo(x+8,y+8);c.fill();}}
  w.rivers.forEach(p=>{path(p,'#e4d9b9',w.riverWidth/1200*size+9);path(p,'#79bdc8',w.riverWidth/1200*size);});
  for(const lake of w.lakes){const p=point(lake);c.beginPath();c.arc(p.x,p.z,lake.radius/1200*size,0,Math.PI*2);c.fillStyle='#79bdc8';c.fill();}
  w.roads.forEach(p=>path(p,'#c5a778',5));
  for(const b of w.bridges){const p=point(b);c.save();c.translate(p.x,p.z);c.rotate(-b.angle);c.fillStyle='#96785a';c.fillRect(-5,-16,10,32);c.fillStyle='#efe3c8';c.fillRect(-3,-14,6,28);c.restore();}
  w.villages.forEach((v,index)=>{const p=point(v);c.save();c.translate(p.x,p.z);for(let i=0;i<Math.min(v.count,6);i++){const a=i/v.count*Math.PI*2,x=Math.sin(a)*17,y=Math.cos(a)*17;c.fillStyle='#f8efdb';c.fillRect(x-6,y-5,12,11);c.fillStyle=v.roof;c.beginPath();c.moveTo(x-8,y-5);c.lineTo(x,y-13);c.lineTo(x+8,y-5);c.fill();}c.strokeStyle='#6d7060';c.lineWidth=3;if(v.kind==='windmill'){c.beginPath();c.moveTo(-12,-12);c.lineTo(12,12);c.moveTo(12,-12);c.lineTo(-12,12);c.stroke();}else if(v.kind==='tower'||v.kind==='lighthouse'){c.fillStyle='#f4ecd8';c.fillRect(-5,-18,10,25);c.fillStyle=v.roof;c.fillRect(-6,-19,12,5);}c.font='bold 15px sans-serif';c.fillStyle='#5f6555';c.textAlign='center';c.fillText(String(index+1).padStart(2,'0'),0,40);c.restore();});
  for(const d of w.damage){const p=point(d),r=d.radius/1200*size;c.fillStyle=d.kind==='ink'?'#4e5b52':d.kind==='water'?'#b3bba5':'#d0c3a1';c.beginPath();c.arc(p.x,p.z,r,0,Math.PI*2);c.fill();if(d.kind==='tear'){c.strokeStyle='#f8f4e9';c.lineWidth=5;c.stroke();}else{c.strokeStyle='#7e826d';c.lineWidth=2;c.stroke();}}
  const t=point(w.target);c.strokeStyle='#cc6652';c.lineWidth=3;c.beginPath();c.arc(t.x,t.z,20,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(t.x-29,t.z);c.lineTo(t.x+29,t.z);c.moveTo(t.x,t.z-29);c.lineTo(t.x,t.z+29);c.stroke();c.fillStyle='#cc6652';c.beginPath();c.arc(t.x,t.z,5,0,Math.PI*2);c.fill();
  if(reveal){const p=point(reveal);c.strokeStyle='#546e79';c.setLineDash([6,5]);c.beginPath();c.moveTo(p.x,p.z);c.lineTo(t.x,t.z);c.stroke();c.setLineDash([]);c.fillStyle='#546e79';c.beginPath();c.arc(p.x,p.z,7,0,Math.PI*2);c.fill();}
  c.fillStyle='#5d6957';c.font='bold 23px sans-serif';c.fillText('N ↑',size-65,42);c.strokeStyle='#c4b794';c.lineWidth=6;c.strokeRect(3,3,size-6,size-6);
}
