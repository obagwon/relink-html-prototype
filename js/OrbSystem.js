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

    Object.entries(ABILITIES).forEach(([key, info], index) => {
      const root = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: info.color, emissive: info.color, emissiveIntensity: 2.2, roughness: .15, metalness: .15 });
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(.22, 2), mat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.34, .025, 6, 24), new THREE.MeshBasicMaterial({ color: info.color, transparent: true, opacity: .7 }));
      ring.rotation.x = Math.PI / 2;
      const light = new THREE.PointLight(info.color, 1.8, 5, 2);
      root.add(orb, ring, light);
      root.userData.index = index;
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

  cast() {
    this.orbs[this.selected].userData.castPulse = 1;
  }

  update(dt, cameraController) {
    this.time += dt;
    this.group.position.copy(this.player.root.position).add(new THREE.Vector3(0, 1.15, 0));
    const forward = cameraController.getForward();
    for (const root of Object.values(this.orbs)) {
      const a = this.time * 1.15 + root.userData.index * Math.PI * 2 / 3;
      const selected = root.userData.selected;
      const radius = selected ? 1.08 : .92;
      const target = new THREE.Vector3(Math.cos(a) * radius, Math.sin(a * 1.7) * .16, Math.sin(a) * radius);
      if (selected) target.addScaledVector(forward, .45);
      root.position.lerp(target, 1 - Math.exp(-dt * 11));
      root.rotation.y += dt * (selected ? 2.6 : 1.25);
      root.rotation.x += dt * .45;
      const pulse = root.userData.castPulse || 0;
      const scale = (selected ? 1.28 : .92) + pulse * .55;
      root.scale.lerp(new THREE.Vector3(scale, scale, scale), .18);
      root.userData.castPulse = Math.max(0, pulse - dt * 5);
    }
  }
}
