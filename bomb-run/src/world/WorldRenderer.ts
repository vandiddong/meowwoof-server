import * as THREE from 'three';
import { CONFIG, type Settings } from '../game/GameConfig';
import { heightAt, surfaceHeight, riverDistance, type World, type Point } from './WorldGenerator';
import type { FlightState } from '../flight/FlightPhysics';
import type { BombState } from '../bomb/BombPhysics';
const C={grass:'#a9c38c',grass2:'#bacd96',sand:'#e1d8ae',water:'#70bcc8',trunk:'#917258',tree:'#548b6f',tree2:'#80aa79',road:'#ded1aa'};
const material=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true});
export class WorldRenderer {
  renderer:THREE.WebGLRenderer;scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(48,1,1,3500);
  root=new THREE.Group();plane=new THREE.Group();propeller=new THREE.Group();bombMesh:THREE.Mesh;target=new THREE.Group();impact=new THREE.Group();
  private terrainWorld:World|null=null;private trail:THREE.Line|null=null;private windmills:THREE.Group[]=[];private low=false;private frames=0;private frameSeconds=0;
  constructor(public canvas:HTMLCanvasElement,public settings:Settings){
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setClearColor('#dbe8df');this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.scene.fog=new THREE.Fog('#dbe8df',850,2100);this.scene.add(new THREE.HemisphereLight('#fff7dd','#6a8469',2.4));
    const sun=new THREE.DirectionalLight('#fff4dd',3.1);sun.position.set(-250,650,-100);this.scene.add(sun);
    const sea=new THREE.Mesh(new THREE.PlaneGeometry(5000,5000),material('#94bfc0'));sea.rotation.x=-Math.PI/2;sea.position.y=-.2;this.scene.add(sea);this.scene.add(this.root,this.plane,this.impact);this.buildPlane();
    this.bombMesh=new THREE.Mesh(new THREE.CapsuleGeometry(1.5,4,3,6),material('#4a535a'));this.scene.add(this.bombMesh);this.bombMesh.visible=false;
    this.resize();window.addEventListener('resize',()=>this.resize());
  }
  resize(){const width=this.canvas.clientWidth,height=this.canvas.clientHeight;this.camera.aspect=width/height;this.camera.updateProjectionMatrix();const low=this.settings.quality==='low'||(this.settings.quality==='auto'&&(this.low||width<800));this.renderer.setPixelRatio(Math.min(devicePixelRatio,low?CONFIG.quality.lowPixelRatio:CONFIG.quality.maxPixelRatio));this.renderer.setSize(width,height,false);}
  private mesh(parent:THREE.Group,geometry:THREE.BufferGeometry,color:string,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material(color));m.position.set(x,y,z);parent.add(m);return m;}
  private box(p:THREE.Group,color:string,w:number,h:number,d:number,x=0,y=0,z=0){return this.mesh(p,new THREE.BoxGeometry(w,h,d),color,x,y,z);}
  private buildPlane(){
    const body=this.mesh(this.plane,new THREE.CapsuleGeometry(3.5,14,4,10),'#ebbc60',0,0,0);body.rotation.x=Math.PI/2;
    this.box(this.plane,'#e8b75b',29,1.5,5,0,-.2,1);this.box(this.plane,'#e8b75b',12,1,3,0,1,-9);
    this.box(this.plane,'#cf6555',1.2,6,5,0,3,-8);
    const cockpit=this.mesh(this.plane,new THREE.SphereGeometry(2.7,8,6),'#608b92',0,2.8,-1);cockpit.scale.set(1,.7,1.5);
    this.box(this.plane,'#f6ead3',3,.1,5,-10,.65,1);this.box(this.plane,'#f6ead3',3,.1,5,10,.65,1);
    this.mesh(this.plane,new THREE.CylinderGeometry(3.2,3.2,3,10),'#677378',0,0,10).rotation.x=Math.PI/2;
    this.propeller.position.z=12;this.plane.add(this.propeller);this.box(this.propeller,'#554e45',1,13,.6);this.mesh(this.propeller,new THREE.SphereGeometry(1.3,8,5),'#eee2c7');
    this.box(this.plane,'#485953',1.2,2,1.2,-3,-4,2);this.box(this.plane,'#485953',1.2,2,1.2,3,-4,2);
  }
  private disposeGroup(group:THREE.Group){group.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});group.clear();}
  setWorld(w:World){
    this.disposeGroup(this.root);this.disposeGroup(this.impact);this.target=new THREE.Group();this.root.add(this.target);this.terrainWorld=w;this.windmills=[];this.trail=null;
    const n=CONFIG.world.terrainSegments,size=CONFIG.world.size,pos:number[]=[],colors:number[]=[],indices:number[]=[];
    for(let z=0;z<=n;z++)for(let x=0;x<=n;x++){
      const px=-size/2+x/n*size,pz=-size/2+z/n*size,y=heightAt(w,px,pz);pos.push(px,y,pz);
      const rd=riverDistance(w,{x:px,z:pz});const color=new THREE.Color(rd<w.riverWidth/2+13?C.sand:y>54?'#c4c6aa':y>28?'#9fae86':(Math.sin(x*2+z*9)>0?C.grass:C.grass2));colors.push(color.r,color.g,color.b);
      if(x<n&&z<n){const a=z*(n+1)+x;indices.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
    this.root.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true})));
    this.box(this.root,'#819674',size,18,size,0,-9,0);
    for(const path of w.rivers)this.ribbon(path,w.riverWidth,C.water,()=>2.0);
    for(const lake of w.lakes){const m=this.mesh(this.root,new THREE.CircleGeometry(lake.radius,48),C.water,lake.x,2,lake.z);m.rotation.x=-Math.PI/2;}
    for(const road of w.roads){const points:Point[]=[];for(let i=1;i<road.length;i++)for(let j=0;j<=40;j++)points.push({x:THREE.MathUtils.lerp(road[i-1].x,road[i].x,j/40),z:THREE.MathUtils.lerp(road[i-1].z,road[i].z,j/40)});this.ribbon(points,9,C.road,(x,z)=>surfaceHeight(w,x,z)+.5);}
    for(const b of w.bridges){const group=new THREE.Group();group.position.set(b.x,5,b.z);group.rotation.y=b.angle;this.root.add(group);this.box(group,'#aa8460',14,3,w.riverWidth+26);for(const x of [-7,7])this.box(group,'#eee1b9',1.5,3,w.riverWidth+28,x,3);}
    this.trees(w);
    for(const v of w.villages){
      const group=new THREE.Group();group.position.set(v.x,surfaceHeight(w,v.x,v.z),v.z);group.rotation.y=v.angle;this.root.add(group);
      this.mesh(group,new THREE.CylinderGeometry(36,36,.8,12),'#dfd3aa',0,.4,0);
      for(let i=0;i<v.count;i++){const angle=i/v.count*Math.PI*2,r=i===0?0:27,x=Math.sin(angle)*r,z=Math.cos(angle)*r;
        this.box(group,'#f4e5c5',11,12,12,x,6,z);const roof=this.mesh(group,new THREE.ConeGeometry(10,7,4),v.roof,x,15,z);roof.rotation.y=Math.PI/4;
        this.box(group,'#697f7d',3,3,.3,x,7,z+6.1);this.box(group,'#a88263',3,6,.4,x,3,z-6.1);
      }
      if(v.kind==='windmill'){this.mesh(group,new THREE.CylinderGeometry(5,8,28,8),'#efe6cd',0,14,0);this.mesh(group,new THREE.ConeGeometry(8,9,8),v.roof,0,32,0);const blades=new THREE.Group();blades.position.set(0,25,8);group.add(blades);this.box(blades,'#f8edd5',2,30,1);this.box(blades,'#f8edd5',30,2,1);this.windmills.push(blades);}
      if(v.kind==='tower'||v.kind==='lighthouse'){this.mesh(group,new THREE.CylinderGeometry(6,8,38,8),'#f4e5c5',0,19,0);this.mesh(group,new THREE.CylinderGeometry(7,7,5,8),v.roof,0,36,0);this.mesh(group,new THREE.ConeGeometry(9,8,8),v.roof,0,43,0);this.box(group,'#536d6c',4,5,.5,0,30,6.1);}
      if(v.kind==='castle'){this.box(group,'#afa994',28,18,18,0,9);for(const x of [-17,17])this.mesh(group,new THREE.CylinderGeometry(6,6,26,6),'#bdb8a2',x,13,0);}
      if(v.kind==='farm'){for(let i=0;i<4;i++)this.box(group,i%2?'#d3b567':'#a4aa64',36,.6,4,0,.6,48+i*7);}
    }
    const t=w.target;this.target.position.set(t.x,surfaceHeight(w,t.x,t.z),t.z);
    this.box(this.target,'#e6bb5e',9,7,9,0,3.5,0);this.box(this.target,'#f3df9e',10,.6,2,0,7.2,0);this.box(this.target,'#f4e3c0',1,22,1,10,11);this.box(this.target,'#da6655',9,6,.5,14,19);
    // Decorative clouds stay well above flight altitude.
    for(let i=0;i<8;i++){const g=new THREE.Group();g.position.set(-650+i*180,310+(i%3)*30,450-(i%4)*220);this.root.add(g);for(let j=0;j<3;j++){const m=this.mesh(g,new THREE.IcosahedronGeometry(24+j*5,1),'#f8f5e7',j*23,0,j*3);m.scale.y=.45;}}
  }
  private ribbon(path:Point[],width:number,color:string,elevation:(x:number,z:number)=>number){
    const pos:number[]=[],ix:number[]=[];
    path.forEach((p,i)=>{const before=path[Math.max(0,i-1)],after=path[Math.min(path.length-1,i+1)],angle=Math.atan2(after.z-before.z,after.x-before.x)+Math.PI/2;
      for(const s of [-1,1]){const x=p.x+Math.cos(angle)*width/2*s,z=p.z+Math.sin(angle)*width/2*s;pos.push(x,elevation(x,z),z);}if(i>0){const a=i*2-2;ix.push(a,a+2,a+1,a+1,a+2,a+3);}});
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(ix);geo.computeVertexNormals();const mat=material(color);mat.side=THREE.DoubleSide;this.root.add(new THREE.Mesh(geo,mat));
  }
  private trees(w:World){
    const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(1.5,2,8,5),material(C.trunk),w.trees.length),crowns=new THREE.InstancedMesh(new THREE.ConeGeometry(10,24,6),material(C.tree),w.trees.length),dummy=new THREE.Object3D();
    w.trees.forEach((p,i)=>{const y=surfaceHeight(w,p.x,p.z),scale=.75+(i%7)/10;dummy.position.set(p.x,y+4,p.z);dummy.scale.set(1,1,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=y+16;dummy.scale.set(scale,scale,scale);dummy.rotation.y=i*1.37;dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);crowns.setColorAt(i,new THREE.Color(i%3===0?C.tree2:C.tree));});this.root.add(trunks,crowns);
  }
  showTrajectory(points:{x:number;y:number;z:number}[]){if(this.trail){this.root.remove(this.trail);this.trail.geometry.dispose();(this.trail.material as THREE.Material).dispose();this.trail=null;}if(!points.length)return;const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p.x,p.y,p.z)));this.trail=new THREE.Line(geo,new THREE.LineDashedMaterial({color:'#fff1b1',dashSize:5,gapSize:4}));this.trail.computeLineDistances();this.root.add(this.trail);}
  revealImpact(b:BombState){
    if(!this.terrainWorld)return;this.disposeGroup(this.impact);
    const ground=surfaceHeight(this.terrainWorld,b.x,b.z),pos=new THREE.Vector3(b.x,ground+2,b.z);
    const ring=this.mesh(this.impact,new THREE.RingGeometry(9,12,48),'#e89b65',b.x,ground+1,b.z);ring.rotation.x=-Math.PI/2;
    for(let i=0;i<9;i++){const angle=i/9*Math.PI*2;const m=this.mesh(this.impact,new THREE.IcosahedronGeometry(6+i%3,0),'#f8e6be',b.x+Math.sin(angle)*10,ground+8+i%3*4,b.z+Math.cos(angle)*10);m.userData.puff=true;}
    const t=this.terrainWorld.target;const tg=surfaceHeight(this.terrainWorld,t.x,t.z)+2;
    const targetRing=this.mesh(this.impact,new THREE.RingGeometry(13,16,48),'#d56352',t.x,tg,t.z);targetRing.rotation.x=-Math.PI/2;
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([pos,new THREE.Vector3(t.x,tg,t.z)]),new THREE.LineDashedMaterial({color:'#b95e48',dashSize:8,gapSize:5}));line.computeLineDistances();this.impact.add(line);
  }
  render(dt:number,time:number,mode:'menu'|'flight'|'bomb'|'result',flight:FlightState|null,bomb:BombState|null,yaw=0,pitch=.4){
    this.propeller.rotation.z+=dt*40;this.windmills.forEach(m=>m.rotation.z+=dt*.6);
    this.plane.visible=!!flight&&mode!=='menu';this.bombMesh.visible=!!bomb&&mode==='bomb';
    let desired=new THREE.Vector3(),look=new THREE.Vector3();
    if(mode==='menu'){const a=.55+Math.sin(time*.04)*.16;desired.set(Math.sin(a)*780,590,Math.cos(a)*780);look.set(0,5,0);}
    else if(mode==='flight'&&flight){this.plane.position.set(flight.x,flight.y,flight.z);this.plane.rotation.set(0,flight.heading,flight.bank);const angle=flight.heading+yaw,dist=100;desired.set(flight.x-Math.sin(angle)*dist,flight.y+35+Math.sin(pitch)*85,flight.z-Math.cos(angle)*dist);look.set(flight.x+Math.sin(angle)*40,flight.y-35-pitch*65,flight.z+Math.cos(angle)*40);}
    else if(mode==='bomb'&&bomb){this.bombMesh.position.set(bomb.x,bomb.y,bomb.z);this.bombMesh.rotation.x=time*2;desired.set(bomb.x+60,bomb.y+65,bomb.z-95);look.set(bomb.x,bomb.y-12,bomb.z);}
    else if(this.terrainWorld){const t=this.terrainWorld.target,b=bomb||t,cx=(t.x+b.x)/2,cz=(t.z+b.z)/2,d=Math.min(650,Math.max(160,Math.hypot(t.x-b.x,t.z-b.z)*.7));desired.set(cx+d*.65,d+80,cz+d*.75);look.set(cx,10,cz);}
    this.camera.position.lerp(desired,this.settings.reducedMotion?1:1-Math.exp(-dt*6));this.camera.lookAt(look);this.renderer.render(this.scene,this.camera);
    if(this.settings.quality==='auto'&&!this.low){this.frames++;this.frameSeconds+=dt;if(this.frames>180){if(this.frameSeconds/this.frames>1/34){this.low=true;this.resize();}this.frames=0;this.frameSeconds=0;}}
  }
}
