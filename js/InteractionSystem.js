import * as THREE from 'three';

export class InteractionSystem {
  constructor(scene, camera, ui) {
    this.scene = scene;
    this.camera = camera;
    this.ui = ui;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 18;
    this.interactables = [];
    this.roots = [];
    this.target = null;
    this.hitPoint = new THREE.Vector3();
    this.highlighted = [];
  }

  register(item) {
    this.interactables.push(item);
    this.roots.push(item.mesh);
    return item;
  }

  clearHighlight() {
    for (const entry of this.highlighted) {
      if (entry.material?.emissive) entry.material.emissive.copy(entry.original);
      if ('emissiveIntensity' in entry.material) entry.material.emissiveIntensity = entry.intensity;
    }
    this.highlighted.length = 0;
  }

  setHighlight(item) {
    item.mesh.traverse((child) => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!material?.emissive) continue;
        this.highlighted.push({ material, original: material.emissive.clone(), intensity: material.emissiveIntensity });
        material.emissive.setHex(0xffffff);
        material.emissiveIntensity = Math.max(1.4, material.emissiveIntensity || 0);
      }
    });
  }

  update(selectedAbility) {
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const hits = this.raycaster.intersectObjects(this.roots, true);
    const hit = hits.find((h) => h.object.userData.interactable?.enabled);
    const next = hit?.object.userData.interactable || null;
    if (next !== this.target) {
      this.clearHighlight();
      this.target = next;
      if (next) this.setHighlight(next);
    }
    if (hit) this.hitPoint.copy(hit.point);
    this.ui.setTarget(this.target, selectedAbility);
    return this.target;
  }

  use(ability, context) {
    if (!this.target) return false;
    return this.target.handle(ability, context);
  }
}
