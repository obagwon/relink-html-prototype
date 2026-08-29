import * as THREE from 'three';
import { ABILITIES } from './config.js';

export class AbilitySystem {
  constructor(scene, camera, canvas, orbs, interaction, ui, audio) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    this.orbs = orbs;
    this.interaction = interaction;
    this.ui = ui;
    this.audio = audio;
    this.selected = 'bloom';
    this.effects = [];

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Digit1') this.select('bloom');
      if (e.code === 'Digit2') this.select('freeze');
      if (e.code === 'Digit3') this.select('pulse');
    });
    window.addEventListener('wheel', (e) => {
      if (document.pointerLockElement !== canvas) return;
      const keys = Object.keys(ABILITIES);
      const i = keys.indexOf(this.selected);
      this.select(keys[(i + (e.deltaY > 0 ? 1 : keys.length - 1)) % keys.length]);
    }, { passive: true });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && document.pointerLockElement === canvas) this.use();
    });
  }

  select(key) {
    if (!ABILITIES[key]) return;
    this.selected = key;
    this.orbs.select(key);
    this.ui.setAbility(key);
  }

  use() {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const point = this.interaction.target ? this.interaction.hitPoint.clone() : this.camera.position.clone().addScaledVector(direction, 14);
    this.spawnBeam(point);
    this.orbs.cast();
    this.audio.playAbility(this.selected);
    const success = this.interaction.use(this.selected, { ability: this.selected, point });
    if (!success && this.interaction.target) this.ui.toast(`${ABILITIES[this.selected].name}에 반응하지 않습니다.`);
  }

  spawnBeam(point) {
    const start = this.orbs.getSelectedWorldPosition(new THREE.Vector3());
    const geometry = new THREE.BufferGeometry().setFromPoints([start, point]);
    const material = new THREE.LineBasicMaterial({ color: ABILITIES[this.selected].color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending });
    const line = new THREE.Line(geometry, material);
    const spark = new THREE.Mesh(new THREE.IcosahedronGeometry(.12, 1), new THREE.MeshBasicMaterial({ color: ABILITIES[this.selected].color, transparent: true }));
    spark.position.copy(point);
    this.scene.add(line, spark);
    this.effects.push({ line, spark, life: .24 });
  }

  update(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.life -= dt;
      fx.line.material.opacity = Math.max(0, fx.life / .24);
      fx.spark.material.opacity = Math.max(0, fx.life / .24);
      fx.spark.scale.setScalar(1 + (1 - fx.life / .24) * 4);
      if (fx.life <= 0) {
        this.scene.remove(fx.line, fx.spark);
        fx.line.geometry.dispose(); fx.line.material.dispose(); fx.spark.geometry.dispose(); fx.spark.material.dispose();
        this.effects.splice(i, 1);
      }
    }
  }
}
