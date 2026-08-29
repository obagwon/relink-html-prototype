import * as THREE from 'three';

export class Hub {
  constructor(world) {
    this.world = world;
    this.scene = world.scene;
    this.root = new THREE.Group();
    this.root.name = 'CentralHub';
    this.restoreObjects = [];
  }

  build() {
    this.scene.add(this.root);
    const ground = this.world.addCylinder(new THREE.Vector3(0, -.7, 0), 24, 1.4, this.world.palette.darkStone, { segments: 32, collider: true });
    this.root.add(ground.mesh);
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2;
      const r = 10 + (i % 3) * 2.2;
      const slab = this.world.addBox(new THREE.Vector3(Math.cos(a) * r, .03 + (i % 2) * .08, Math.sin(a) * r), new THREE.Vector3(4.8, .22, 2.4), this.world.palette.stone, { rotation: { y: -a + (i % 2) * .15 } });
      this.root.add(slab.mesh);
    }

    this.core = new THREE.Group();
    this.core.position.y = .2;
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 5.1, .8, 16), this.world.palette.stone);
    basin.receiveShadow = true;
    this.core.add(basin);
    const brokenMat = new THREE.MeshStandardMaterial({ color: 0x6d746f, emissive: 0x1e2b28, emissiveIntensity: .35, roughness: .65 });
    for (let i = 0; i < 7; i++) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(.9 + (i % 2) * .35, 0), brokenMat);
      const a = i / 7 * Math.PI * 2;
      shard.position.set(Math.cos(a) * (1.15 + (i % 2) * .45), 1.2 + (i % 3) * .55, Math.sin(a) * (1.15 + (i % 2) * .45));
      shard.rotation.set(a, a * .7, a * .2); this.core.add(shard);
    }
    const coreLight = new THREE.PointLight(0x91ac9d, 1.4, 16, 2); coreLight.position.y = 2; this.core.add(coreLight); this.coreLight = coreLight;
    this.root.add(this.core);

    const slots = [
      { key: 'bloom', angle: -Math.PI / 2, color: 0x83e85d },
      { key: 'freeze', angle: Math.PI / 6, color: 0x66d8ff },
      { key: 'pulse', angle: Math.PI * 5 / 6, color: 0xffc44f },
    ];
    this.slots = {};
    for (const slot of slots) {
      const group = new THREE.Group();
      group.position.set(Math.cos(slot.angle) * 4, .65, Math.sin(slot.angle) * 4);
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(.65, .9, 1.3, 8), this.world.palette.stone);
      const gemMat = new THREE.MeshStandardMaterial({ color: 0x2c302e, emissive: slot.color, emissiveIntensity: 0, roughness: .25 });
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.48), gemMat); gem.position.y = 1.05;
      const light = new THREE.PointLight(slot.color, 0, 8, 2); light.position.y = 1.1;
      group.add(pedestal, gem, light); this.root.add(group);
      this.slots[slot.key] = { gem, light };
    }

    this.addPortal('bloom', new THREE.Vector3(0, 0, -18), 0x83e85d, 'E · 생명의 지역으로 이동');
    this.addPortal('freeze', new THREE.Vector3(16, 0, 9), 0x66d8ff, 'E · 정지의 지역으로 이동');
    this.addPortal('pulse', new THREE.Vector3(-16, 0, 9), 0xffc44f, 'E · 기계의 지역으로 이동');

    for (let i = 0; i < 8; i++) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.05, .08, .5 + (i % 3) * .2, 5), this.world.palette.green);
      const a = i / 8 * Math.PI * 2;
      stem.position.set(Math.cos(a) * 7.2, .25, Math.sin(a) * 7.2);
      stem.visible = false; this.root.add(stem); this.restoreObjects.push(stem);
    }
    return this;
  }

  addPortal(region, position, color, label) {
    const group = new THREE.Group(); group.position.copy(position);
    const archMat = new THREE.MeshStandardMaterial({ color: 0x545954, emissive: color, emissiveIntensity: .2, roughness: .8 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.35, .28, 8, 24, Math.PI), archMat);
    ring.rotation.z = Math.PI; ring.position.y = .2;
    const left = new THREE.Mesh(new THREE.BoxGeometry(.55, 2.4, .7), archMat); left.position.set(-2.35, 1.2, 0);
    const right = left.clone(); right.position.x = 2.35;
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 2.5), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .12, side: THREE.DoubleSide, depthWrite: false }));
    veil.position.y = 1.25;
    group.add(ring, left, right, veil); this.root.add(group);
    this.world.registerUpdate({ update: (dt) => { veil.material.opacity = .1 + Math.sin(performance.now() * .002 + position.x) * .035; } });
    this.world.addTrigger(position.clone().add(new THREE.Vector3(0, 0, 1)), 3.1, label, () => this.world.game.gotoRegion(region));
  }

  updateRestoration(progress) {
    for (const [key, slot] of Object.entries(this.slots || {})) {
      const done = !!progress[key];
      slot.gem.material.color.setHex(done ? ({ bloom: 0x83e85d, freeze: 0x66d8ff, pulse: 0xffc44f }[key]) : 0x2c302e);
      slot.gem.material.emissiveIntensity = done ? 2.4 : 0;
      slot.light.intensity = done ? 2.5 : 0;
    }
    const count = ['bloom', 'freeze', 'pulse'].filter((k) => progress[k]).length;
    this.restoreObjects.forEach((o, i) => { o.visible = i < count * 3; });
    if (this.coreLight) { this.coreLight.intensity = 1.2 + count * 1.4; this.coreLight.color.setHex(count === 3 ? 0xffffff : 0x91ac9d); }
  }

  reset() {}
}
