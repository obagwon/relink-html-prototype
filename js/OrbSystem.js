import * as THREE from 'three';
import { ABILITIES } from './config.js';

export class OrbSystem {
  constructor(scene, player) {
    this.player = player;
    this.group = new THREE.Group();
    this.group.name = 'AbilityOrbs';
    scene.add(this.group);
    this.orbs = {};
    this.selected = 'bloom';
    this.time = 0;
    this.tmpWorld = new THREE.Vector3();
    this.tmpTarget = new THREE.Vector3();
    this.tmpLocal = new THREE.Vector3();

    Object.entries(ABILITIES).forEach(([key, info], index) => {
      const root = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: info.color, emissive: info.color, emissiveIntensity: 2.2, roughness: .15, metalness: .15 });
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(.22, 2), mat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.34, .025, 6, 24), new THREE.MeshBasicMaterial({ color: info.color, transparent: true, opacity: .7 }));
      ring.rotation.x = Math.PI / 2;
      const light = new THREE.PointLight(info.color, 1.8, 5, 2);
      root.add(orb, ring, light);
      root.userData.index = index;
      root.userData.assignment = null;
      this.group.add(root);
      this.orbs[key] = root;
    });
    this.select('bloom');
  }

  select(key) {
    this.selected = key;
    for (const [name, root] of Object.entries(this.orbs)) {
      root.userData.selected = name === key;
      root.children[0].material.emissiveIntensity = name === key ? 4.2 : 1.6;
    }
  }

  getSelectedWorldPosition(target = new THREE.Vector3()) {
    return this.orbs[this.selected].getWorldPosition(target);
  }

  getAssignment(key) {
    return this.orbs[key]?.userData.assignment || null;
  }

  isInFlight(key) {
    return this.getAssignment(key)?.phase === 'flying';
  }

  castTo(key, item, worldPoint, onArrive) {
    const root = this.orbs[key];
    if (!root || !item?.mesh || this.isInFlight(key)) return false;

    this.group.updateWorldMatrix(true, true);
    item.mesh.updateWorldMatrix(true, false);
    const localAnchor = item.mesh.worldToLocal(worldPoint.clone());
    const startWorld = root.getWorldPosition(new THREE.Vector3());
    const distance = startWorld.distanceTo(worldPoint);
    root.userData.castPulse = 1;
    root.userData.assignment = {
      item,
      localAnchor,
      startWorld,
      phase: 'flying',
      progress: 0,
      duration: .48 + Math.min(.48, distance * .012),
      orbitAngle: this.time * 2.1,
      onArrive,
    };
    return true;
  }

  recallAll() {
    for (const root of Object.values(this.orbs)) root.userData.assignment = null;
  }

  getAnchorWorld(assignment, target) {
    assignment.item.mesh.updateWorldMatrix(true, false);
    return assignment.item.mesh.localToWorld(target.copy(assignment.localAnchor));
  }

  updateAssignedOrb(root, assignment, dt) {
    const anchor = this.getAnchorWorld(assignment, this.tmpTarget);

    if (assignment.phase === 'flying') {
      assignment.progress = Math.min(1, assignment.progress + dt / assignment.duration);
      const t = assignment.progress;
      const eased = 1 - Math.pow(1 - t, 3);
      this.tmpWorld.lerpVectors(assignment.startWorld, anchor, eased);
      this.tmpWorld.y += Math.sin(Math.PI * t) * Math.min(2.6, 1 + assignment.startWorld.distanceTo(anchor) * .06);
      this.tmpLocal.copy(this.tmpWorld).sub(this.group.position);
      root.position.copy(this.tmpLocal);

      if (t >= 1) {
        assignment.phase = 'dwelling';
        const callback = assignment.onArrive;
        assignment.onArrive = null;
        callback?.(anchor.clone());
      }
      return;
    }

    assignment.orbitAngle += dt * 2.15;
    const a = assignment.orbitAngle;
    this.tmpWorld.copy(anchor).add(new THREE.Vector3(Math.cos(a) * .58, .32 + Math.sin(a * 1.8) * .16, Math.sin(a) * .58));
    this.tmpLocal.copy(this.tmpWorld).sub(this.group.position);
    root.position.lerp(this.tmpLocal, 1 - Math.exp(-dt * 12));
  }

  update(dt, cameraController) {
    this.time += dt;
    this.group.position.copy(this.player.root.position).add(new THREE.Vector3(0, 1.15, 0));
    this.group.updateWorldMatrix(true, false);
    const forward = cameraController.getForward();

    for (const root of Object.values(this.orbs)) {
      const assignment = root.userData.assignment;
      const selected = root.userData.selected;

      if (assignment) {
        this.updateAssignedOrb(root, assignment, dt);
      } else {
        const a = this.time * 1.15 + root.userData.index * Math.PI * 2 / 3;
        const radius = selected ? 1.08 : .92;
        const target = new THREE.Vector3(Math.cos(a) * radius, Math.sin(a * 1.7) * .16, Math.sin(a) * radius);
        if (selected) target.addScaledVector(forward, .45);
        root.position.lerp(target, 1 - Math.exp(-dt * 11));
      }

      root.rotation.y += dt * (selected ? 2.6 : 1.25);
      root.rotation.x += dt * .45;
      const pulse = root.userData.castPulse || 0;
      const scale = (selected ? 1.28 : .92) + pulse * .55;
      root.scale.lerp(new THREE.Vector3(scale, scale, scale), .18);
      root.userData.castPulse = Math.max(0, pulse - dt * 5);
    }
  }
}
