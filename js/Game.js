import * as THREE from 'three';
import { Player } from './Player.js';
import { CameraController } from './CameraController.js';
import { OrbSystem } from './OrbSystem.js';
import { InteractionSystem } from './InteractionSystem.js';
import { AbilitySystem } from './AbilitySystem.js';
import { PuzzleSystem } from './PuzzleSystem.js';
import { AudioSystem } from './AudioSystem.js';
import { UI } from './UI.js';
import { World } from './world/World.js';
import { REGION_INFO, STORAGE_KEY } from './config.js';

export class Game {
  constructor(canvas){
    this.canvas=canvas;this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.08,500);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.setSize(innerWidth,innerHeight);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08;
    this.ui=new UI();this.audio=new AudioSystem();this.puzzles=new PuzzleSystem();this.interaction=new InteractionSystem(this.scene,this.camera,this.ui);
    this.player=new Player(this.scene);this.world=new World(this);this.cameraController=new CameraController(this.camera,this.canvas,this.player,this.world);this.orbs=new OrbSystem(this.scene,this.player);this.abilities=new AbilitySystem(this.scene,this.camera,this.canvas,this.orbs,this.interaction,this.ui,this.audio);
    this.lastFrame=performance.now()/1000;this.elapsed=0;this.started=false;this.currentRegion='hub';this.progress=this.loadProgress();this.fps=60;this.frameAccumulator=0;this.frameCount=0;this.query=new URLSearchParams(location.search);this.smokeMode=this.query.has('smoke');this.preview=this.query.get('preview');this.testMode=this.smokeMode||!!this.preview;
  }

  init(){
    this.world.build();this.ui.setFragments(this.progress);this.ui.setAbility('bloom');this.gotoRegion('hub',true);this.cameraController.update(1,true);this.bindEvents();this.renderer.setAnimationLoop(()=>this.animate());if(this.testMode){this.started=true;this.player.enabled=true;this.ui.showGame();if(this.preview)this.gotoRegion(this.preview,true);if(this.smokeMode)setTimeout(()=>{const report=this.runSelfTest();document.querySelector('#runtime-status').textContent='tests: '+report.filter(r=>r.pass).length+'/'+report.length;console.info('RELINK_SMOKE',JSON.stringify(report));},900);}
  }

  bindEvents(){
    window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));});
    document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===this.canvas;const targeting=this.abilities.isTargeting;this.player.enabled=locked&&!targeting;if(this.started)this.ui.setPaused(!locked&&!targeting);});
    document.addEventListener('pointerlockerror',()=>{if(this.started&&!this.abilities.isTargeting)this.ui.setPaused(true);});
    window.addEventListener('keydown',(e)=>{
      if(this.abilities.isTargeting&&e.code!=='F1')return;
      if(e.code==='KeyE'&&document.pointerLockElement===this.canvas)this.world.interact();
      if(e.code==='KeyR'&&!e.repeat&&this.started)this.resetCurrentRegion();
      if(e.code==='F1'){e.preventDefault();this.ui.toggleDebug();}
      if(e.code==='F2')this.gotoRegion('hub');
      if(e.code==='F3')this.gotoRegion('bloom');
      if(e.code==='F4')this.gotoRegion('freeze');
      if(e.code==='F5'){e.preventDefault();this.gotoRegion('pulse');}
    });
  }

  start(){this.started=true;this.audio.ensure();this.ui.showGame();this.canvas.requestPointerLock();this.ui.toast('세 개의 구체는 당신과 함께 움직입니다.',2600);}
  resume(){this.canvas.requestPointerLock();}

  gotoRegion(key,silent=false){
    const info=REGION_INFO[key];if(!info)return;this.currentRegion=key;const position=new THREE.Vector3(...info.spawn);this.player.setSpawn(position);this.ui.setRegion(info);this.interaction.clearTarget();this.ui.hideInteraction();
    if(key==='hub'||key==='bloom'||key==='bloomDungeon')this.cameraController.yaw=0;
    if(key==='freeze')this.cameraController.yaw=-Math.PI/2;
    if(key==='pulse')this.cameraController.yaw=Math.PI/2;
    this.cameraController.update(1,true);if(!silent)this.ui.toast(`${info.name} 이동`);
  }

  resetCurrentRegion(){
    const region=this.currentRegion==='bloomDungeon'?'bloom':this.currentRegion;if(region==='hub'){this.gotoRegion('hub');return;}this.world.resetRegion(region);this.ui.toast('현재 지역 퍼즐을 초기 상태로 되돌렸습니다.');
  }

  completeRegion(region){
    if(this.progress[region])return;this.progress[region]=true;localStorage.setItem(STORAGE_KEY,JSON.stringify(this.progress));this.ui.setFragments(this.progress);this.world.updateRestoration(this.progress);this.audio.success();
  }

  resetProgress(){localStorage.removeItem(STORAGE_KEY);this.progress={bloom:false,freeze:false,pulse:false};this.ui.setFragments(this.progress);this.world.updateRestoration(this.progress);for(const key of ['bloom','freeze','pulse'])this.world.regions[key]?.reset();this.gotoRegion('hub');this.resume();this.ui.toast('모든 조각과 퍼즐 진행도를 초기화했습니다.');}
  loadProgress(){try{return{bloom:false,freeze:false,pulse:false,...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}}catch{return{bloom:false,freeze:false,pulse:false}}}

  animate(){
    const now=performance.now()/1000;const dt=Math.min(Math.max(0,now-this.lastFrame),.05);this.lastFrame=now;const targeting=this.abilities.isTargeting;if(!targeting)this.elapsed+=dt;const active=this.started&&(this.testMode||document.pointerLockElement===this.canvas);
    if(targeting){this.player.enabled=false;this.abilities.refreshTarget();}else if(active){this.world.update(dt,this.elapsed);this.player.update(dt,this.cameraController,this.world);this.cameraController.update(dt);this.orbs.update(dt,this.cameraController);}else{this.cameraController.update(dt);this.orbs.update(dt,this.cameraController);}
    this.abilities.update(targeting?0:dt);this.renderer.render(this.scene,this.camera);this.updateDebug(dt);
  }

  runSelfTest(){
    const report=[];const check=(name,pass,detail='')=>report.push({name,pass:!!pass,detail});const oldProgress={...this.progress};const oldStored=localStorage.getItem(STORAGE_KEY);
    try{
      check('scene-load',this.scene.children.length>20,`${this.scene.children.length} scene roots`);
      check('collision-world',this.world.colliders.length>25,`${this.world.colliders.length} colliders`);
      check('three-orbs',Object.keys(this.orbs.orbs).length===3);
      check('interactable-registry',this.interaction.interactables.length>=15,`${this.interaction.interactables.length} targets`);
      this.gotoRegion('hub',true);this.player.enabled=true;const before=this.player.root.position.clone();this.player.keys.add('KeyW');for(let i=0;i<36;i++){this.world.update(1/60,this.elapsed+i/60);this.player.update(1/60,this.cameraController,this.world);}this.player.keys.delete('KeyW');check('camera-relative-move',this.player.root.position.distanceTo(before)>.5,this.player.root.position.toArray().map(v=>v.toFixed(2)).join(','));
      const y=this.player.root.position.y;this.player.grounded=true;this.player.bounce(8);this.player.update(1/60,this.cameraController,this.world);check('jump',this.player.root.position.y>y);const theoreticalRunJumpRange=this.player.runSpeed*((2*this.player.jumpSpeed)/Math.abs(this.player.gravity));check('jump-range-config',theoreticalRunJumpRange>14,theoreticalRunJumpRange.toFixed(2)+'m');
      const yaw=this.cameraController.yaw;this.cameraController.yaw+=Math.PI*2;this.cameraController.update(1,true);check('camera-360',Number.isFinite(this.camera.position.x)&&this.cameraController.getForward().length()>.99);this.cameraController.yaw=yaw;
      for(const key of ['bloom','freeze','pulse'])this.abilities.select(key);check('ability-switch',this.abilities.selected==='pulse');
      const focusStarted=this.abilities.beginTargeting('bloom',{releasePointer:false});check('ability-time-stop-mode',focusStarted&&this.abilities.isTargeting&&this.ui.hud.classList.contains('targeting'));this.abilities.cancelTargeting({restorePointer:false});
      this.gotoRegion('bloom',true);this.player.teleport(new THREE.Vector3(0,.1,-74));this.camera.position.set(0,2.3,-69);this.camera.lookAt(0,.55,-77.8);this.camera.updateMatrixWorld(true);this.abilities.select('bloom');const aimed=this.interaction.update('bloom',new THREE.Vector2(0,0));check('free-pointer-raycast',aimed?.id==='bloom-vine-bridge',aimed?.id||'none');
      const bridge=this.interaction.interactables.find(i=>i.id==='bloom-vine-bridge');this.orbs.update(1/60,this.cameraController);let orbArrived=false;const launched=this.orbs.castTo('bloom',bridge,this.interaction.hitPoint.clone(),()=>{orbArrived=true;});for(let i=0;i<120;i++)this.orbs.update(1/60,this.cameraController);const assignment=this.orbs.getAssignment('bloom');check('orb-target-flight',launched&&orbArrived&&assignment?.phase==='dwelling');const orbPoint=this.orbs.orbs.bloom.getWorldPosition(new THREE.Vector3());const anchorPoint=this.orbs.getAnchorWorld(assignment,new THREE.Vector3());check('orb-target-dwell',orbPoint.distanceTo(anchorPoint)<1.5,orbPoint.distanceTo(anchorPoint).toFixed(2)+'m');
      bridge.handle('bloom',{});for(let i=0;i<120;i++)this.world.update(1/60,i/60);check('bloom-growth',bridge.completed&&bridge.state.includes('bridge'));
      this.world.regions.bloom.reset();check('region-reset',!bridge.completed&&bridge.state==='withered');
      const leaf=this.interaction.interactables.find(i=>i.id==='bloom-leaf-0');leaf.handle('freeze',{});check('freeze-motion',leaf.state.includes('frozen'));
      const conductor=this.interaction.interactables.find(i=>i.id==='pulse-bloom-conductor');conductor.handle('bloom',{});conductor.handle('pulse',{});check('bloom-pulse-combo',conductor.completed);
      const combo=this.interaction.interactables.find(i=>i.id==='bloom-dungeon-combo');combo.handle('bloom',{});for(let i=0;i<150;i++)this.world.update(1/60,2+i/60);combo.handle('freeze',{});combo.handle('pulse',{});check('three-ability-combo',combo.completed&&this.progress.bloom);
      for(const region of ['hub','bloom','freeze','pulse'])this.gotoRegion(region,true);check('region-travel',this.currentRegion==='pulse');
      const saved=this.progress.bloom;localStorage.setItem(STORAGE_KEY,JSON.stringify(this.progress));check('local-storage',JSON.parse(localStorage.getItem(STORAGE_KEY)).bloom===saved);
    }catch(error){check('uncaught-smoke-error',false,error.stack||error.message);}
    finally{this.orbs.recallAll();this.interaction.clearTarget();this.progress=oldProgress;if(oldStored===null)localStorage.removeItem(STORAGE_KEY);else localStorage.setItem(STORAGE_KEY,oldStored);for(const key of ['bloom','freeze','pulse'])this.world.regions[key].reset();this.world.updateRestoration(this.progress);this.ui.setFragments(this.progress);this.gotoRegion('hub',true);}
    return report;
  }
  updateDebug(dt){
    this.frameAccumulator+=dt;this.frameCount++;if(this.frameAccumulator>=.35){this.fps=Math.round(this.frameCount/this.frameAccumulator);this.frameAccumulator=0;this.frameCount=0;}
    const p=this.player.root.position;const target=this.interaction.target;const prefix=this.currentRegion==='bloomDungeon'?'bloom':this.currentRegion;
    this.ui.updateDebug(`FPS: ${this.fps}\nPLAYER: ${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}\nREGION: ${this.currentRegion}\nABILITY: ${this.abilities.selected}\nTARGET: ${target?.name||'-'}\nSTATE: ${target?.state||'-'}\n\n${this.puzzles.getStatus(prefix)}`);
  }
}






