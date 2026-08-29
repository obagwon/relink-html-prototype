import * as THREE from 'three';
import { Hub } from './Hub.js';
import { BloomRegion } from './BloomRegion.js';
import { FreezeRegion } from './FreezeRegion.js';
import { PulseRegion } from './PulseRegion.js';

export class World {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.ui = game.ui;
    this.interaction = game.interaction;
    this.puzzles = game.puzzles;
    this.colliders = [];
    this.updatables = [];
    this.triggers = [];
    this.regions = {};
    this.nearTrigger = null;
    this.palette = {
      stone: new THREE.MeshStandardMaterial({ color: 0x5d625e, roughness: .95 }),
      darkStone: new THREE.MeshStandardMaterial({ color: 0x343b3a, roughness: 1 }),
      dead: new THREE.MeshStandardMaterial({ color: 0x554f43, roughness: 1 }),
      green: new THREE.MeshStandardMaterial({ color: 0x4f9a4a, emissive: 0x173a19, emissiveIntensity: .55, roughness: .85 }),
      ice: new THREE.MeshPhysicalMaterial({ color: 0x91dfff, emissive: 0x1b6f9a, emissiveIntensity: .7, transparent: true, opacity: .72, roughness: .12, metalness: .08 }),
      snow: new THREE.MeshStandardMaterial({ color: 0xd9e8e8, roughness: .9 }),
      sand: new THREE.MeshStandardMaterial({ color: 0x796a4d, roughness: .92 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x5d5544, metalness: .55, roughness: .68 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xc89434, emissive: 0x6d3b08, emissiveIntensity: 1.1, metalness: .5, roughness: .42 }),
      water: new THREE.MeshPhysicalMaterial({ color: 0x4d8896, transparent: true, opacity: .65, roughness: .22, metalness: .08 }),
    };
  }

  build() {
    this.addSkyAndLighting();
    this.regions.hub = new Hub(this).build();
    this.regions.bloom = new BloomRegion(this).build();
    this.regions.freeze = new FreezeRegion(this).build();
    this.regions.pulse = new PulseRegion(this).build();
    this.updateRestoration(this.game.progress);
  }

  addSkyAndLighting() {
    this.scene.background = new THREE.Color(0x7c8b86);
    this.scene.fog = new THREE.FogExp2(0x7c8b86, .0053);
    const hemi = new THREE.HemisphereLight(0xd8eee4, 0x30312b, 1.8);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0cf, 3.1);
    sun.position.set(-50, 85, 35); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -180; sun.shadow.camera.right = 180;
    sun.shadow.camera.top = 180; sun.shadow.camera.bottom = -180;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 340;
    this.scene.add(sun);
  }

  addBox(position, size, material = this.palette.stone, options = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
    mesh.position.copy(position); mesh.castShadow = options.castShadow ?? true; mesh.receiveShadow = options.receiveShadow ?? true;
    if (options.rotation) mesh.rotation.set(options.rotation.x || 0, options.rotation.y || 0, options.rotation.z || 0);
    this.scene.add(mesh);
    let collider = null;
    if (options.collider !== false) collider = this.addCollider(mesh, options.colliderOptions || {});
    return { mesh, collider };
  }

  addCylinder(position, radius, height, material = this.palette.stone, options = {}) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, options.radiusTop ?? radius, height, options.segments || 12), material);
    mesh.position.copy(position); mesh.castShadow = true; mesh.receiveShadow = true;
    if (options.rotation) mesh.rotation.set(options.rotation.x || 0, options.rotation.y || 0, options.rotation.z || 0);
    this.scene.add(mesh);
    const collider = options.collider ? this.addCollider(mesh, options.colliderOptions || {}) : null;
    return { mesh, collider };
  }

  addCollider(mesh, { active = true, dynamic = false, blockSides = true, surface = true, id = '' } = {}) {
    const collider = { mesh, active, dynamic, blockSides, surface, id, box: new THREE.Box3(), delta: new THREE.Vector3(), previous: new THREE.Vector3() };
    mesh.updateWorldMatrix(true, true);
    collider.box.setFromObject(mesh);
    mesh.getWorldPosition(collider.previous);
    this.colliders.push(collider);
    return collider;
  }

  addTrigger(position, radius, label, callback, condition = () => true) {
    const trigger = { position: position.clone(), radius, label, callback, condition };
    this.triggers.push(trigger);
    return trigger;
  }

  registerUpdate(object) { this.updatables.push(object); return object; }

  update(dt, time) {
    for (const object of this.updatables) object.update?.(dt, time);
    for (const collider of this.colliders) {
      collider.delta.set(0, 0, 0);
      if (!collider.dynamic) continue;
      const current = collider.mesh.getWorldPosition(new THREE.Vector3());
      collider.delta.subVectors(current, collider.previous);
      collider.previous.copy(current);
      collider.mesh.updateWorldMatrix(true, true);
      collider.box.setFromObject(collider.mesh);
    }
  }

  refreshCollider(collider) {
    collider.mesh.updateWorldMatrix(true, true);
    collider.box.setFromObject(collider.mesh);
    collider.mesh.getWorldPosition(collider.previous);
  }

  blocksPlayer(x, z, feetY, radius, height) {
    for (const collider of this.colliders) {
      if (!collider.active || !collider.blockSides) continue;
      const b = collider.box;
      if (feetY >= b.max.y - .07 || feetY + height <= b.min.y + .05) continue;
      const nearestX = Math.max(b.min.x, Math.min(x, b.max.x));
      const nearestZ = Math.max(b.min.z, Math.min(z, b.max.z));
      const dx = x - nearestX, dz = z - nearestZ;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }

  findGround(x, z, oldY, nextY, radius) {
    let best = null;
    for (const collider of this.colliders) {
      if (!collider.active || !collider.surface) continue;
      const b = collider.box;
      if (x < b.min.x - radius * .35 || x > b.max.x + radius * .35 || z < b.min.z - radius * .35 || z > b.max.z + radius * .35) continue;
      const top = b.max.y;
      if (top > oldY + .42 || nextY > top + .3 || oldY < top - .45) continue;
      if (!best || top > best.y) best = { y: top, collider };
    }
    return best;
  }

  checkPlayerTriggers(player) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const trigger of this.triggers) {
      if (!trigger.condition()) continue;
      const d = trigger.position.distanceTo(player.root.position);
      if (d <= trigger.radius && d < nearestDistance) { nearest = trigger; nearestDistance = d; }
    }
    this.nearTrigger = nearest;
    if (nearest) this.ui.showInteraction(nearest.label);
    else this.ui.hideInteraction();
  }

  interact() { if (this.nearTrigger?.condition()) this.nearTrigger.callback(); }
  respawnPlayer() { this.game.player.teleport(this.game.player.spawn); this.ui.toast('마지막 안전 지점으로 돌아왔습니다.'); }
  resetRegion(region) { this.regions[region]?.reset?.(); this.puzzles.reset(region); this.game.gotoRegion(region === 'bloomDungeon' ? 'bloomDungeon' : region, true); }

  updateRestoration(progress) {
    this.regions.hub?.updateRestoration(progress);
    this.regions.bloom?.setRestored(!!progress.bloom);
    this.regions.freeze?.setRestored(!!progress.freeze);
    this.regions.pulse?.setRestored(!!progress.pulse);
  }
}

