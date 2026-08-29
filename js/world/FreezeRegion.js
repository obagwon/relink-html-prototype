import * as THREE from 'three';
import { Interactable } from '../PuzzleSystem.js';

export class FreezeRegion {
  constructor(world){this.world=world;this.scene=world.scene;this.interaction=world.interaction;this.resetters=[];this.completed={fragment:false,slab:false,platform:false};this.restoreLights=[];}
  build(){this.buildTerrain();this.buildLandmark();this.buildFragment();this.buildSlab();this.buildPulsePlatform();this.buildWaterfall();this.buildGoal();return this;}

  buildTerrain(){
    const p=this.world.palette.snow;
    const boxes=[[66,-.6,35,17,1.2,18],[96,-.1,35,10,2.2,16],[126,1.4,35,12,3.2,15],[157,3.4,35,12,4.2,16]];
    boxes.forEach(([x,y,z,sx,sy,sz])=>this.world.addBox(new THREE.Vector3(x,y,z),new THREE.Vector3(sx,sy,sz),p));
    for(let i=0;i<6;i++){const x=164+i*4.1,y=5+i*.72,z=35+(i%2?1.5:-1.2);this.world.addBox(new THREE.Vector3(x,y,z),new THREE.Vector3(4.6,1,4.6),this.world.palette.ice);}
    for(let i=0;i<34;i++){const x=58+(i%12)*11,z=18+(i%3)*17,y=8+(i%5)*3;const shard=new THREE.Mesh(new THREE.TetrahedronGeometry(.45+(i%4)*.25),this.world.palette.ice);shard.position.set(x,y,z);shard.rotation.set(i,.3*i,.7*i);this.scene.add(shard);this.world.registerUpdate({update:(dt,t)=>{shard.position.y+=Math.sin(t*.7+i)*dt*.12;shard.rotation.y+=dt*.15;}});}
  }

  buildLandmark(){
    const base=this.world.addCylinder(new THREE.Vector3(191,8.4,35),15,3.2,this.world.palette.ice,{segments:16,collider:true});
    const garden=new THREE.Group();garden.position.set(191,10,35);
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2;const col=new THREE.Mesh(new THREE.CylinderGeometry(.45,.7,7+(i%3)*2,8),this.world.palette.snow);col.position.set(Math.cos(a)*9,3.5,Math.sin(a)*9);garden.add(col);const cap=new THREE.Mesh(new THREE.BoxGeometry(1.5,.35,1.5),this.world.palette.ice);cap.position.copy(col.position).add(new THREE.Vector3(0,(7+(i%3)*2)/2,0));garden.add(cap);}
    const crown=new THREE.Mesh(new THREE.TorusGeometry(6,.32,8,32),this.world.palette.ice);crown.rotation.x=Math.PI/2;crown.position.y=5.5;garden.add(crown);
    this.goalCrystal=new THREE.Mesh(new THREE.OctahedronGeometry(1.5,1),new THREE.MeshStandardMaterial({color:0x5d7180,emissive:0x66d8ff,emissiveIntensity:.35,roughness:.18}));this.goalCrystal.position.y=2.2;garden.add(this.goalCrystal);
    const light=new THREE.PointLight(0x66d8ff,2,35,2);light.position.y=3;garden.add(light);this.restoreLights.push(light);
    this.scene.add(garden);
  }

  buildFragment(){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(4.2,.7,4.2),this.world.palette.ice.clone());mesh.position.set(84,4,35);mesh.rotation.y=.3;this.scene.add(mesh);const collider=this.world.addCollider(mesh,{dynamic:true});let frozen=false,phase=0;
    const item=this.interaction.register(new Interactable({id:'freeze-falling-fragment',name:'반복 낙하 유적 파편',mesh,abilities:['freeze'],state:'falling',handlers:{freeze:(self)=>{frozen=!frozen;self.state=frozen?'frozen · current height':'falling';mesh.material.emissiveIntensity=frozen?2:.7;if(frozen&&mesh.position.y>.7&&mesh.position.y<3.8){this.completed.fragment=true;self.completed=true;self.state='frozen · usable platform';this.world.ui.toast('낙하하던 파편의 현재 높이가 발판으로 고정되었습니다.');}else if(!frozen){this.completed.fragment=false;self.completed=false;}return true;}},reset:(self)=>{frozen=false;phase=0;mesh.position.y=4;self.state='falling';self.completed=false;this.completed.fragment=false;mesh.material.emissiveIntensity=.7;}}));
    this.world.registerUpdate({update:(dt)=>{if(!frozen){phase=(phase+dt*.55)%1;mesh.position.y=7.5-phase*9;if(mesh.position.y<-.8)mesh.position.y=7.5;}}});this.resetters.push(()=>item.reset());this.world.puzzles.add('freeze-fragment','떨어지는 파편 고정',()=>this.completed.fragment);
  }

  buildSlab(){
    const pivot=new THREE.Group();pivot.position.set(111,2.5,35);const slab=new THREE.Mesh(new THREE.BoxGeometry(15,.65,3.5),this.world.palette.stone.clone());pivot.add(slab);this.scene.add(pivot);const collider=this.world.addCollider(slab,{active:false,dynamic:true});let frozen=false,angle=.9;
    const item=this.interaction.register(new Interactable({id:'freeze-rotating-slab',name:'회전하는 긴 석판',mesh:slab,abilities:['freeze'],state:'rotating',handlers:{freeze:(self)=>{frozen=!frozen;self.state=frozen?'frozen · angle locked':'rotating';if(frozen){const horizontal=Math.abs(Math.sin(angle))<.28;collider.active=horizontal;this.completed.slab=horizontal;self.completed=horizontal;self.state=horizontal?'frozen · horizontal bridge':'frozen · wrong angle';if(horizontal)this.world.ui.toast('수평 순간이 고정되어 석판이 다리가 되었습니다.');}else{collider.active=false;this.completed.slab=false;self.completed=false;}return true;}},reset:(self)=>{frozen=false;angle=.9;self.state='rotating';self.completed=false;this.completed.slab=false;collider.active=false;}}));
    this.world.registerUpdate({update:(dt)=>{if(!frozen){angle+=dt*.72;pivot.rotation.z=angle;}}});this.resetters.push(()=>item.reset());this.world.puzzles.add('freeze-slab','회전 석판 수평 고정',()=>this.completed.slab);
  }

  buildPulsePlatform(){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(5,.7,5),this.world.palette.ice.clone());mesh.position.set(137,3.35,35);this.scene.add(mesh);const collider=this.world.addCollider(mesh,{dynamic:true});let powered=false,frozen=false,t=0;
    const item=this.interaction.register(new Interactable({id:'freeze-pulse-platform',name:'멈춘 기계식 부유 발판',mesh,abilities:['pulse','freeze'],state:'inactive',handlers:{pulse:(self)=>{if(powered)return false;powered=true;frozen=false;self.state='powered · moving';mesh.material.emissive.setHex(0xffb535);mesh.material.emissiveIntensity=1.6;return true;},freeze:(self)=>{if(!powered)return false;frozen=!frozen;self.state=frozen?'powered + frozen':'powered · moving';if(frozen&&mesh.position.x>145){this.completed.platform=true;self.completed=true;self.state='frozen · route aligned';this.world.ui.toast('PULSE로 움직인 발판을 필요한 위치에 고정했습니다.');}else if(!frozen){this.completed.platform=false;self.completed=false;}return true;}},reset:(self)=>{powered=false;frozen=false;t=0;mesh.position.x=137;self.state='inactive';self.completed=false;this.completed.platform=false;mesh.material.emissive.setHex(0x1b6f9a);mesh.material.emissiveIntensity=.7;}}));
    this.world.registerUpdate({update:(dt)=>{if(powered&&!frozen){t+=dt*.65;mesh.position.x=140.5+Math.sin(t)*7.2;}}});this.resetters.push(()=>item.reset());this.world.puzzles.add('freeze-pulse','PULSE → FREEZE 부유 발판',()=>this.completed.platform);
  }

  buildWaterfall(){
    const falls=new THREE.Mesh(new THREE.PlaneGeometry(7,18),new THREE.MeshBasicMaterial({color:0x79d8ff,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}));falls.position.set(183,8,28);falls.rotation.y=Math.PI/2;this.scene.add(falls);
    const iceWall=new THREE.Mesh(new THREE.BoxGeometry(1,8,5),this.world.palette.ice.clone());iceWall.position.set(183,5,31);iceWall.visible=false;this.scene.add(iceWall);const collider=this.world.addCollider(iceWall,{active:false});
    const item=this.interaction.register(new Interactable({id:'freeze-waterfall',name:'떨어지는 폭포',mesh:falls,abilities:['freeze'],state:'flowing',handlers:{freeze:(self)=>{const frozen=!iceWall.visible;iceWall.visible=frozen;collider.active=frozen;falls.material.opacity=frozen?.12:.35;self.state=frozen?'frozen · ice wall':'flowing';return true;}},reset:(self)=>{iceWall.visible=false;collider.active=false;falls.material.opacity=.35;self.state='flowing';}}));this.resetters.push(()=>item.reset());
  }

  buildGoal(){
    const pos=new THREE.Vector3(191,10.1,35);this.world.addTrigger(pos,4,'E · 정지의 조각 복원',()=>{this.world.game.completeRegion('freeze');this.world.ui.toast('FRAGMENT RESTORED · 정지의 조각',4200);},()=>this.completed.fragment&&this.completed.slab&&this.completed.platform&&!this.world.game.progress.freeze);
    this.world.addTrigger(new THREE.Vector3(191,10.1,40),3,'E · 허브로 귀환',()=>this.world.game.gotoRegion('hub'),()=>this.world.game.progress.freeze);
  }

  reset(){this.resetters.forEach(fn=>fn());}
  setRestored(restored){if(this.goalCrystal){this.goalCrystal.material.color.setHex(restored?0xa6edff:0x5d7180);this.goalCrystal.material.emissiveIntensity=restored?4:.35;}this.restoreLights.forEach(l=>l.intensity=restored?5:2);}
}
