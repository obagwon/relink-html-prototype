import * as THREE from 'three';
import { Interactable } from '../PuzzleSystem.js';

export class BloomRegion {
  constructor(world) {
    this.world = world;
    this.scene = world.scene;
    this.interaction = world.interaction;
    this.resetters = [];
    this.rootStates = { a: false, b: false, cBloom: false, cFreeze: false };
    this.restorableMaterials = [];
  }

  build() {
    this.buildTerrain();
    this.buildLandmark();
    this.buildVineBridge();
    this.buildFlower();
    this.buildLeaves();
    this.buildGrowingRamp();
    this.buildTreeRoots();
    this.buildDungeonRoom();
    return this;
  }

  buildTerrain() {
    const dead = this.world.palette.dead;
    const water = this.world.palette.water;
    const platforms = [
      [0, -.6, -66, 30, 1.2, 25], [0, -.6, -101, 38, 1.2, 21],
      [0, 3.4, -124, 26, 1.2, 25], [0, 3.4, -162, 38, 1.2, 13],
      [0, 7.4, -195, 48, 1.2, 28],
    ];
    for (const [x,y,z,sx,sy,sz] of platforms) this.world.addBox(new THREE.Vector3(x,y,z), new THREE.Vector3(sx,sy,sz), dead);
    const river = this.world.addBox(new THREE.Vector3(0, -.15, -124), new THREE.Vector3(52, .18, 102), water, { collider: false, castShadow: false });
    this.world.registerUpdate({ update: () => { river.mesh.material.opacity = .57 + Math.sin(performance.now() * .0015) * .07; } });
    for (let i = 0; i < 28; i++) {
      const z = -57 - i * 5.2;
      const side = i % 2 ? -1 : 1;
      const x = side * (10 + (i % 4) * 2.2);
      this.addDeadTree(x, z, .8 + (i % 3) * .22);
    }
  }

  addDeadTree(x, z, scale) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.35 * scale, .55 * scale, 4.5 * scale, 7), this.world.palette.dead);
    trunk.position.y = 2.25 * scale;
    group.add(trunk);
    for (let i = 0; i < 4; i++) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(.08, .18, 2.2 * scale, 6), this.world.palette.dead);
      branch.position.set((i - 1.5) * .22, (3.2 + i * .32) * scale, 0);
      branch.rotation.z = (i % 2 ? -1 : 1) * (.65 + i * .08);
      group.add(branch);
    }
    group.position.set(x, 0, z); group.rotation.y = x * .17; this.scene.add(group);
  }

  buildLandmark() {
    const tree = new THREE.Group();
    tree.position.set(0, 8, -202);
    const mat = this.world.palette.dead.clone(); this.restorableMaterials.push(mat);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 8.2, 25, 10), mat); trunk.position.y = 12.5; trunk.castShadow = true; tree.add(trunk);
    for (let i = 0; i < 11; i++) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(.35 + (i%2)*.18, 1.15, 15 + (i%3)*3, 7), mat);
      const a = i / 11 * Math.PI * 2;
      branch.position.set(Math.cos(a) * 3.1, 23 + (i%3) * 1.8, Math.sin(a) * 3.1);
      branch.rotation.z = Math.PI / 2.7 + (i % 2) * .22; branch.rotation.y = -a;
      branch.castShadow = true; tree.add(branch);
    }
    const hollow = new THREE.Mesh(new THREE.CircleGeometry(3.1, 24), new THREE.MeshBasicMaterial({ color: 0x070907, side: THREE.DoubleSide }));
    hollow.position.set(0, 5.6, 7.05); tree.add(hollow);
    this.scene.add(tree); this.tree = tree;
  }

  buildVineBridge() {
    const bridgeMat = this.world.palette.green.clone(); bridgeMat.color.setHex(0x6caa52);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(3.4, .42, 13.8), bridgeMat);
    bridge.position.set(0, .2, -84.5); bridge.scale.z = .02; bridge.castShadow = true; this.scene.add(bridge);
    const collider = this.world.addCollider(bridge, { active: false });
    const bud = new THREE.Mesh(new THREE.DodecahedronGeometry(.7, 0), this.world.palette.dead.clone()); bud.position.set(0, .55, -77.8); this.scene.add(bud);
    let growing = false, progress = 0;
    const item = this.interaction.register(new Interactable({
      id: 'bloom-vine-bridge', name: '시든 덩굴 다리', mesh: bud, abilities: ['bloom'], state: 'withered',
      handlers: { bloom: (self) => { if (growing || self.completed) return false; growing = true; self.state = 'growing'; self.hint = '생명이 공간을 연결합니다'; return true; } },
      reset: (self) => { growing = false; progress = 0; self.state = 'withered'; bridge.scale.z = .02; collider.active = false; self.completed = false; bud.material.color.setHex(0x554f43); },
    }));
    this.world.registerUpdate({ update: (dt) => {
      if (!growing || item.completed) return;
      progress = Math.min(1, progress + dt / 1.7); bridge.scale.z = Math.max(.02, progress); this.world.refreshCollider(collider);
      if (progress >= 1) { growing = false; item.completed = true; item.state = 'grown · bridge'; collider.active = true; bud.material.color.setHex(0x77c65b); this.world.ui.toast('덩굴이 강을 가로질러 실제 다리가 되었습니다.'); }
    }});
    this.resetters.push(() => item.reset());
    this.world.puzzles.add('bloom-bridge', '덩굴 다리', () => item.completed);
  }

  buildFlower() {
    const group = new THREE.Group(); group.position.set(0, 0, -108);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.28, .42, 1.2, 8), this.world.palette.dead.clone()); stem.position.y = .6;
    const bud = new THREE.Mesh(new THREE.SphereGeometry(.8, 12, 8), this.world.palette.dead.clone()); bud.position.y = 1.3;
    const petals = new THREE.Group(); petals.position.y = 1.3; petals.scale.setScalar(.05);
    for (let i = 0; i < 8; i++) {
      const petal = new THREE.Mesh(new THREE.SphereGeometry(.62, 10, 7), new THREE.MeshStandardMaterial({ color: 0xd77f9d, emissive: 0x4b1829, emissiveIntensity: .35, roughness: .72 }));
      const a = i / 8 * Math.PI * 2; petal.scale.set(1.15,.22,.62); petal.position.set(Math.cos(a)*.72,0,Math.sin(a)*.72); petal.rotation.y=-a;
      petals.add(petal);
    }
    group.add(stem,bud,petals); this.scene.add(group);
    let opened = false, cooldown = 0;
    const item = this.interaction.register(new Interactable({ id:'bloom-flower', name:'닫힌 꽃 점프대', mesh:bud, abilities:['bloom'], state:'withered', handlers:{ bloom:(self)=>{ if(opened) return false; opened=true; self.completed=true; self.state='bloomed · jump pad'; petals.scale.setScalar(1); stem.material.color.setHex(0x4f9a4a); bud.visible=false; this.world.ui.toast('꽃이 피어 높은 지형으로 향하는 점프대가 되었습니다.'); return true;}}, reset:(self)=>{opened=false;cooldown=0;self.completed=false;self.state='withered';petals.scale.setScalar(.05);stem.material.color.setHex(0x554f43);bud.visible=true;} }));
    this.world.registerUpdate({ update:(dt)=>{ cooldown=Math.max(0,cooldown-dt); if(!opened||cooldown>0) return; const p=this.world.game.player; const dx=p.root.position.x, dz=p.root.position.z+108; if(dx*dx+dz*dz<1.5*1.5 && p.root.position.y<1.8){ p.bounce(12.8); p.velocity.z=-2.2; cooldown=1; this.world.ui.toast('꽃 점프!'); } }});
    this.resetters.push(()=>item.reset()); this.world.puzzles.add('bloom-flower','꽃 점프대',()=>item.completed);
  }

  buildLeaves() {
    this.leaves=[];
    const coords=[[0,-139],[-1.5,-146],[1.4,-153]];
    coords.forEach(([x,z],i)=>{
      const mat=this.world.palette.green.clone(); mat.color.setHex(0x668a52);
      const leaf=new THREE.Mesh(new THREE.CylinderGeometry(1.55,1.2,.25,12),mat); leaf.scale.z=.75; leaf.position.set(x,3.82,z); leaf.castShadow=true; this.scene.add(leaf);
      const collider=this.world.addCollider(leaf,{dynamic:true}); let frozen=false;
      const item=this.interaction.register(new Interactable({id:`bloom-leaf-${i}`,name:`물살 위 잎사귀 ${i+1}`,mesh:leaf,abilities:['freeze'],state:'moving',handlers:{freeze:(self)=>{frozen=!frozen;self.state=frozen?'frozen · platform':'moving';mat.emissive.setHex(frozen?0x2d9bc4:0x173a19);mat.emissiveIntensity=frozen?1.8:.35;return true;}},reset:(self)=>{frozen=false;self.state='moving';mat.emissive.setHex(0x173a19);mat.emissiveIntensity=.35;}}));
      const baseX=x; this.world.registerUpdate({update:(dt,t)=>{if(!frozen)leaf.position.x=baseX+Math.sin(t*.9+i*2.1)*3.3;}});
      this.leaves.push({item,get frozen(){return frozen;}}); this.resetters.push(()=>item.reset());
    });
    this.world.puzzles.add('bloom-leaves','움직이는 잎사귀 고정',()=>this.leaves.some((l)=>l.frozen));
  }

  buildGrowingRamp() {
    const root=new THREE.Mesh(new THREE.DodecahedronGeometry(.72,0),this.world.palette.dead.clone()); root.position.set(0,4.35,-168); this.scene.add(root);
    const segments=[];
    for(let i=0;i<10;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(3,.38,2.25),this.world.palette.green.clone());m.visible=false;this.scene.add(m);const c=this.world.addCollider(m,{active:false});segments.push({m,c});}
    let mode='idle',progress=0;
    const layout=()=>{const visible=Math.max(1,Math.ceil(progress*10));for(let i=0;i<10;i++){const s=segments[i];s.m.visible=i<visible;s.m.position.set(0,4.12+i*.48*(.45+progress),-169.2-i*1.65);s.c.active=mode==='frozen'&&s.m.visible;this.world.refreshCollider(s.c);}};
    const item=this.interaction.register(new Interactable({id:'bloom-growing-ramp',name:'성장 중인 방향 덩굴',mesh:root,abilities:['bloom','freeze'],state:'withered',handlers:{bloom:(self)=>{if(mode!=='idle')return false;mode='growing';progress=.04;self.state='growing · observe';self.hint='성장 도중 필요한 형태에서 RE:FREEZE';return true;},freeze:(self)=>{if(mode==='growing'||mode==='overgrown'){mode='frozen';progress=Math.max(.58,Math.min(progress,.88));layout();self.completed=true;self.state='frozen · ramp';root.material.color.setHex(0x72c45c);this.world.ui.toast('성장하던 덩굴의 현재 형태가 고정되어 경사로가 되었습니다.');return true;}if(mode==='frozen'){mode='growing';self.completed=false;self.state='growing · adjust';segments.forEach(s=>s.c.active=false);return true;}return false;}},reset:(self)=>{mode='idle';progress=0;self.completed=false;self.state='withered';root.material.color.setHex(0x554f43);segments.forEach(s=>{s.m.visible=false;s.c.active=false;});}}));
    this.world.registerUpdate({update:(dt)=>{if(mode==='growing'){progress=Math.min(1,progress+dt/4.2);layout();if(progress>=1){mode='overgrown';item.state='overgrown · RE:FREEZE to shape';}}}});
    this.resetters.push(()=>item.reset());this.world.puzzles.add('bloom-ramp','BLOOM → FREEZE 성장 덩굴',()=>item.completed);
  }

  buildTreeRoots() {
    const roots=[[-7,-187,'a'],[0,-185.5,'b'],[7,-187,'c']]; this.rootItems={};
    roots.forEach(([x,z,key])=>{
      const mat=this.world.palette.dead.clone();const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(.72,3.2,5,9),mat);mesh.position.set(x,9,z);mesh.rotation.z=Math.PI/2;this.scene.add(mesh);
      const abilities=key==='c'?['bloom','freeze']:['bloom'];
      const item=this.interaction.register(new Interactable({id:`bloom-root-${key}`,name:`죽은 나무 뿌리 ${key.toUpperCase()}`,mesh,abilities,state:'withered',handlers:{bloom:(self)=>{if(key==='c'){if(this.rootStates.cBloom)return false;this.rootStates.cBloom=true;self.state='growing · needs RE:FREEZE';mat.color.setHex(0x5b9c4c);mesh.scale.x=1.45;return true;}this.rootStates[key]=true;self.completed=true;self.state=key==='b'?'grown · boulder moved':'restored';mat.color.setHex(0x65ad51);if(key==='b')this.moveBoulder();this.checkTreeGate();return true;},freeze:(self)=>{if(key!=='c'||!this.rootStates.cBloom||this.rootStates.cFreeze)return false;this.rootStates.cFreeze=true;self.completed=true;self.state='grown + frozen';mat.emissive.setHex(0x247da2);mat.emissiveIntensity=1.5;this.checkTreeGate();return true;}},reset:(self)=>{self.completed=false;self.state='withered';mat.color.setHex(0x554f43);mat.emissive.setHex(0);mat.emissiveIntensity=0;mesh.scale.set(1,1,1);}}));
      this.rootItems[key]=item;this.resetters.push(()=>item.reset());
    });
    this.boulder=new THREE.Mesh(new THREE.DodecahedronGeometry(2.1,0),this.world.palette.stone);this.boulder.position.set(1.7,9.5,-188);this.scene.add(this.boulder);
    this.gate=this.world.addBox(new THREE.Vector3(0,11,-188.7),new THREE.Vector3(6.2,5.4,1.2),this.world.palette.dead,{colliderOptions:{id:'bloom-tree-gate'}});
    this.entranceLight=new THREE.PointLight(0x83e85d,0,16,2);this.entranceLight.position.set(0,12,-190);this.scene.add(this.entranceLight);
    this.treeOpen=false;
    this.world.addTrigger(new THREE.Vector3(0,8.1,-193),3,'E · 생명의 심장 테스트룸 입장',()=>this.world.game.gotoRegion('bloomDungeon'),()=>this.treeOpen);
    this.world.puzzles.add('bloom-tree','죽은 나무의 세 뿌리 봉인',()=>this.treeOpen);
  }

  moveBoulder(){this.boulder.position.x=6.2;this.boulder.rotation.z+=1.8;}
  checkTreeGate(){if(this.rootStates.a&&this.rootStates.b&&this.rootStates.cFreeze&&!this.treeOpen){this.treeOpen=true;this.gate.mesh.position.y=16;this.gate.collider.active=false;this.entranceLight.intensity=5;this.world.ui.toast('세 뿌리가 연결되었습니다. 죽은 나무 안쪽이 열립니다.',3200);}}

  buildDungeonRoom() {
    this.world.addCylinder(new THREE.Vector3(0,-.8,-260),17,1.6,this.world.palette.darkStone,{segments:32,collider:true});
    for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const p=new THREE.Vector3(Math.cos(a)*16,3.5,-260+Math.sin(a)*16);this.world.addCylinder(p,.6,7,this.world.palette.dead,{segments:7,collider:false});}
    const coreMat=new THREE.MeshStandardMaterial({color:0x3c443b,emissive:0x83e85d,emissiveIntensity:.12,roughness:.5});
    const core=new THREE.Mesh(new THREE.IcosahedronGeometry(2.2,1),coreMat);core.position.set(0,2.5,-268);this.scene.add(core);
    const conduit=new THREE.Mesh(new THREE.BoxGeometry(11,.35,.7),this.world.palette.green.clone());conduit.position.set(0,.65,-264);conduit.scale.x=.03;this.scene.add(conduit);
    const left=new THREE.Mesh(new THREE.CylinderGeometry(.7,1,2,8),this.world.palette.stone);left.position.set(-5.8,1,-264);this.scene.add(left);const right=left.clone();right.position.x=5.8;this.scene.add(right);
    const target=new THREE.Mesh(new THREE.DodecahedronGeometry(.85,0),this.world.palette.dead.clone());target.position.set(0,.9,-263.8);this.scene.add(target);
    let mode='withered',progress=0;
    const item=this.interaction.register(new Interactable({id:'bloom-dungeon-combo',name:'끊어진 생명 전도 뿌리',mesh:target,abilities:['bloom','freeze','pulse'],state:'withered',handlers:{bloom:(self)=>{if(mode!=='withered')return false;mode='growing';progress=.03;self.state='growing · freeze the connection';return true;},freeze:(self)=>{if(mode!=='growing'&&mode!=='overgrown')return false;mode='frozen';progress=Math.max(.68,Math.min(progress,.92));conduit.scale.x=progress;self.state='grown + frozen · energy path ready';target.material.emissive.setHex(0x258fc0);target.material.emissiveIntensity=1.7;return true;},pulse:(self)=>{if(mode!=='frozen')return false;mode='powered';self.completed=true;self.state='powered · fragment restored';conduit.material.emissive.setHex(0xffbd3e);conduit.material.emissiveIntensity=3.5;coreMat.color.setHex(0x74d95e);coreMat.emissiveIntensity=4;this.world.game.completeRegion('bloom');this.world.ui.toast('FRAGMENT RESTORED · 생명의 조각',4200);return true;}},reset:(self)=>{mode='withered';progress=0;self.completed=false;self.state='withered';conduit.scale.x=.03;conduit.material.emissive.setHex(0x173a19);conduit.material.emissiveIntensity=.55;coreMat.color.setHex(0x3c443b);coreMat.emissiveIntensity=.12;target.material.emissive.setHex(0);target.material.emissiveIntensity=0;}}));
    this.world.registerUpdate({update:(dt)=>{core.rotation.y+=dt*.3;if(mode==='growing'){progress=Math.min(1,progress+dt/3.8);conduit.scale.x=progress;if(progress>=1){mode='overgrown';item.state='overgrown · use RE:FREEZE';}}}});
    this.world.addTrigger(new THREE.Vector3(0,0,-252),2.5,'E · 허브로 귀환',()=>this.world.game.gotoRegion('hub'),()=>this.world.game.progress.bloom);
    this.resetters.push(()=>item.reset());this.world.puzzles.add('bloom-dungeon','BLOOM → FREEZE → PULSE 생명의 심장',()=>item.completed);
  }

  reset() {
    this.rootStates={a:false,b:false,cBloom:false,cFreeze:false};this.treeOpen=false;
    if(this.gate){this.gate.mesh.position.y=11;this.gate.collider.active=true;this.world.refreshCollider(this.gate.collider);}if(this.boulder)this.boulder.position.set(1.7,9.5,-188);if(this.entranceLight)this.entranceLight.intensity=0;
    this.resetters.forEach(fn=>fn());
  }

  setRestored(restored) {
    for(const mat of this.restorableMaterials){mat.color.setHex(restored?0x6a7e55:0x554f43);mat.emissive.setHex(restored?0x173a19:0);mat.emissiveIntensity=restored?.65:0;}
  }
}
