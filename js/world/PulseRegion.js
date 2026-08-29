import * as THREE from 'three';
import { Interactable } from '../PuzzleSystem.js';

export class PulseRegion {
  constructor(world){this.world=world;this.scene=world.scene;this.interaction=world.interaction;this.resetters=[];this.completed={runes:false,conductor:false,slab:false,arm:false};this.glowMaterials=[];}
  build(){this.buildTerrain();this.buildGiant();this.buildRunePuzzle();this.buildConductor();this.buildFloatingSlab();this.buildGiantArm();this.buildHeart();return this;}

  buildTerrain(){
    const sand=this.world.palette.sand;
    const boxes=[[-67,-.6,35,18,1.2,18],[-91,-.2,35,24,1.6,24],[-116,.4,35,17,2.4,18],[-151,1.4,35,16,3.2,18],[-168,2.4,35,16,4.8,20],[-195,4.1,35,28,5.8,25]];
    boxes.forEach(([x,y,z,sx,sy,sz])=>this.world.addBox(new THREE.Vector3(x,y,z),new THREE.Vector3(sx,sy,sz),sand));
    for(let i=0;i<24;i++){const x=-70-(i%8)*18,z=18+(i%3)*18,y=1+(i%4)*.7;const col=this.world.addCylinder(new THREE.Vector3(x,y,z),.45+(i%3)*.12,2+(i%4),this.world.palette.stone,{segments:7,collider:false}).mesh;col.rotation.z=(i%5===0)?.35:0;}
  }

  buildGiant(){
    const giant=new THREE.Group();giant.position.set(-201,5.8,35);giant.rotation.y=-.08;
    const metal=this.world.palette.metal;const gold=this.world.palette.gold.clone();this.glowMaterials.push(gold);
    const torso=new THREE.Mesh(new THREE.BoxGeometry(20,9,12),metal);torso.rotation.z=.08;giant.add(torso);
    const chest=new THREE.Mesh(new THREE.TorusGeometry(3.1,.55,10,24),gold);chest.rotation.y=Math.PI/2;chest.position.set(-9.9,0,0);giant.add(chest);
    const head=new THREE.Mesh(new THREE.DodecahedronGeometry(5.1,1),metal);head.position.set(-15,2.6,0);giant.add(head);
    const eyeMat=gold.clone();this.glowMaterials.push(eyeMat);
    for(const z of [-1.45,1.45]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.48,12,8),eyeMat);eye.position.set(-18.9,3.4,z);giant.add(eye);}
    for(let i=0;i<8;i++){const band=new THREE.Mesh(new THREE.TorusGeometry(2.2+i*.1,.18,6,18),gold);band.rotation.y=Math.PI/2;band.position.set(-6+i*1.8,(i%2)*.4-1,0);giant.add(band);}
    this.scene.add(giant);this.giant=giant;
  }

  buildRunePuzzle(){
    const states=[1,3,2];const goals=[0,0,0];this.runeStates=states;
    const source=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.5,.5,16),this.world.palette.gold.clone());source.position.set(-78,.28,35);this.scene.add(source);
    const points=[new THREE.Vector3(-78,.38,35),new THREE.Vector3(-84,.38,35),new THREE.Vector3(-92,.38,35),new THREE.Vector3(-100,.38,35),new THREE.Vector3(-106,.38,35)];
    this.runeLines=[];
    for(let i=0;i<points.length-1;i++){const mat=new THREE.LineBasicMaterial({color:0xffb53a,transparent:true,opacity:.13});const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([points[i],points[i+1]]),mat);this.scene.add(line);this.runeLines.push(line);}
    this.runeItems=[];
    [-84,-92,-100].forEach((x,i)=>{
      const group=new THREE.Group();group.position.set(x,0,35);
      const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.65,.9,3.4,8),this.world.palette.stone);pillar.position.y=1.7;
      const head=new THREE.Mesh(new THREE.BoxGeometry(3,.28,.42),this.world.palette.gold.clone());head.position.y=3.35;head.rotation.y=states[i]*Math.PI/2;
      group.add(pillar,head);this.scene.add(group);
      const item=this.interaction.register(new Interactable({id:`pulse-rune-${i}`,name:`회전 룬 중계기 ${i+1}`,mesh:head,abilities:['pulse'],state:`direction ${states[i]}`,handlers:{pulse:(self)=>{states[i]=(states[i]+1)%4;head.rotation.y=states[i]*Math.PI/2;self.state=`direction ${states[i]}`;this.updateRuneEnergy();return true;}},reset:(self)=>{states[i]=[1,3,2][i];head.rotation.y=states[i]*Math.PI/2;self.state=`direction ${states[i]}`;self.completed=false;this.completed.runes=false;this.runeLines.forEach(l=>l.material.opacity=.13);}}));this.runeItems.push(item);this.resetters.push(()=>item.reset());
    });
    this.world.puzzles.add('pulse-runes','룬 기둥 에너지 방향 연결',()=>this.completed.runes);
  }

  updateRuneEnergy(){
    let linked=0;for(let i=0;i<this.runeStates.length;i++){if(this.runeStates[i]===0)linked++;else break;}
    this.runeLines.forEach((l,i)=>{l.material.opacity=i<=linked?.95:.13;l.material.color.setHex(i<=linked?0xffd05b:0x7b5620);});
    if(this.runeStates.every((v,i)=>v===0)&&!this.completed.runes){this.completed.runes=true;this.runeItems.forEach(i=>{i.completed=true;i.state='aligned · powered';});this.world.ui.toast('룬 기둥이 방향을 맞추며 에너지가 광장을 가로질렀습니다.');}
  }

  buildConductor(){
    const vine=new THREE.Mesh(new THREE.BoxGeometry(10,.35,.55),this.world.palette.green.clone());vine.position.set(-114,.9,35);vine.scale.x=.05;this.scene.add(vine);
    const root=new THREE.Mesh(new THREE.DodecahedronGeometry(.68,0),this.world.palette.dead.clone());root.position.set(-109,.9,35);this.scene.add(root);let grown=false,powered=false;
    const item=this.interaction.register(new Interactable({id:'pulse-bloom-conductor',name:'끊어진 회로의 시든 전도 덩굴',mesh:root,abilities:['bloom','pulse'],state:'withered · circuit broken',handlers:{bloom:(self)=>{if(grown)return false;grown=true;vine.scale.x=1;root.material.color.setHex(0x62ac4e);self.state='grown · connects two terminals';this.world.ui.toast('BLOOM으로 식물이 끊어진 두 단자를 연결했습니다.');return true;},pulse:(self)=>{if(!grown||powered)return false;powered=true;self.completed=true;self.state='grown + powered';vine.material.emissive.setHex(0xffad24);vine.material.emissiveIntensity=3.2;this.completed.conductor=true;this.world.ui.toast('에너지가 살아난 식물을 따라 흐릅니다.');return true;}},reset:(self)=>{grown=false;powered=false;self.completed=false;self.state='withered · circuit broken';this.completed.conductor=false;vine.scale.x=.05;vine.material.emissive.setHex(0x173a19);vine.material.emissiveIntensity=.55;root.material.color.setHex(0x554f43);}}));this.resetters.push(()=>item.reset());this.world.puzzles.add('pulse-conductor','BLOOM → PULSE 전도 덩굴',()=>this.completed.conductor);
  }

  buildFloatingSlab(){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(5.2,.8,5.2),this.world.palette.gold.clone());mesh.position.set(-133,2.9,35);this.scene.add(mesh);const collider=this.world.addCollider(mesh,{dynamic:true});let powered=false,frozen=false,t=0;
    const item=this.interaction.register(new Interactable({id:'pulse-floating-slab',name:'동력을 잃은 부유 석판',mesh,abilities:['pulse','freeze'],state:'inactive',handlers:{pulse:(self)=>{if(powered)return false;powered=true;self.state='powered · moving';return true;},freeze:(self)=>{if(!powered)return false;frozen=!frozen;self.state=frozen?'powered + frozen':'powered · moving';if(frozen&&mesh.position.x<-138){self.completed=true;this.completed.slab=true;self.state='frozen · bridge position';this.world.ui.toast('부유 석판이 협곡을 잇는 위치에 고정되었습니다.');}else if(!frozen){self.completed=false;this.completed.slab=false;}return true;}},reset:(self)=>{powered=false;frozen=false;t=0;mesh.position.x=-133;self.completed=false;self.state='inactive';this.completed.slab=false;}}));
    this.world.registerUpdate({update:(dt)=>{if(powered&&!frozen){t+=dt*.7;mesh.position.x=-134.5+Math.sin(t)*7.8;}}});this.resetters.push(()=>item.reset());this.world.puzzles.add('pulse-slab','PULSE → FREEZE 부유 석판',()=>this.completed.slab);
  }

  buildGiantArm(){
    const pivot=new THREE.Group();pivot.position.set(-178,6,35);const arm=new THREE.Mesh(new THREE.BoxGeometry(24,3.2,4.1),this.world.palette.metal.clone());arm.position.x=-8;const joint=new THREE.Mesh(new THREE.TorusGeometry(2.2,.55,9,22),this.world.palette.gold.clone());joint.rotation.y=Math.PI/2;pivot.add(arm,joint);this.scene.add(pivot);const collider=this.world.addCollider(arm,{active:false,dynamic:true});let powered=false,frozen=false,angle=.9;
    const item=this.interaction.register(new Interactable({id:'pulse-giant-arm',name:'잠든 거인의 팔꿈치 관절',mesh:joint,abilities:['pulse','freeze'],state:'inactive',handlers:{pulse:(self)=>{if(powered)return false;powered=true;self.state='powered · giant arm moving';this.world.ui.toast('거인의 팔 전체에 맥동이 흐르기 시작합니다.');return true;},freeze:(self)=>{if(!powered)return false;frozen=!frozen;self.state=frozen?'powered + frozen':'powered · moving';if(frozen){const horizontal=Math.abs(Math.sin(angle))<.25;collider.active=horizontal;self.completed=horizontal;this.completed.arm=horizontal;self.state=horizontal?'frozen · giant bridge':'frozen · wrong angle';if(horizontal)this.world.ui.toast('거인의 팔이 다리 각도에서 고정되었습니다.');}else{collider.active=false;self.completed=false;this.completed.arm=false;}return true;}},reset:(self)=>{powered=false;frozen=false;angle=.9;pivot.rotation.z=angle;collider.active=false;self.completed=false;self.state='inactive';this.completed.arm=false;}}));
    this.world.registerUpdate({update:(dt)=>{if(powered&&!frozen){angle+=dt*.48;pivot.rotation.z=angle;}}});this.resetters.push(()=>item.reset());this.world.puzzles.add('pulse-arm','거인의 팔 PULSE → FREEZE',()=>this.completed.arm);
  }

  buildHeart(){
    const mat=this.world.palette.gold.clone();mat.emissiveIntensity=.25;this.heart=new THREE.Mesh(new THREE.IcosahedronGeometry(1.5,1),mat);this.heart.position.set(-211,8.8,35);this.scene.add(this.heart);
    const item=this.interaction.register(new Interactable({id:'pulse-giant-heart',name:'거인의 심장 룬',mesh:this.heart,abilities:['pulse'],state:'energy paths incomplete',handlers:{pulse:(self)=>{if(!Object.values(this.completed).every(Boolean))return false;if(self.completed)return false;self.completed=true;self.state='awakened · fragment restored';mat.emissiveIntensity=5;this.world.game.completeRegion('pulse');this.world.ui.toast('FRAGMENT RESTORED · 기계의 조각',4200);return true;}},reset:(self)=>{self.completed=false;self.state='energy paths incomplete';mat.emissiveIntensity=.25;}}));this.resetters.push(()=>item.reset());
    this.world.addTrigger(new THREE.Vector3(-207,7.1,40),3,'E · 허브로 귀환',()=>this.world.game.gotoRegion('hub'),()=>this.world.game.progress.pulse);
    this.world.puzzles.add('pulse-heart','거인의 심장에 에너지 연결',()=>item.completed);
  }

  reset(){this.resetters.forEach(fn=>fn());}
  setRestored(restored){this.glowMaterials.forEach(m=>m.emissiveIntensity=restored?3.5:1.1);if(this.heart)this.heart.material.emissiveIntensity=restored?5:.25;}
}
