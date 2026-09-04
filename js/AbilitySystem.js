import * as THREE from 'three';
import { ABILITIES } from './config.js';

const ABILITY_KEYS = {
  Digit1: 'bloom',
  Digit2: 'freeze',
  Digit3: 'pulse',
};

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
    this.isTargeting = false;
    this.pointer = new THREE.Vector2();
    this.pointerClient = { x: innerWidth / 2, y: innerHeight / 2 };

    window.addEventListener('keydown', (event) => {
      const ability = ABILITY_KEYS[event.code];
      if (ability && !event.repeat && (document.pointerLockElement === canvas || this.isTargeting)) {
        event.preventDefault();
        this.beginTargeting(ability);
      }
      if (event.code === 'Escape' && this.isTargeting) {
        event.preventDefault();
        this.cancelTargeting();
      }
    });

    canvas.addEventListener('mousemove', (event) => {
      if (!this.isTargeting) return;
      this.setPointerFromEvent(event);
      this.refreshTarget();
    });

    canvas.addEventListener('mousedown', (event) => {
      if (event.button !== 0 || !this.isTargeting) return;
      event.preventDefault();
      this.setPointerFromEvent(event);
      this.confirmTarget();
    });
  }

  select(key) {
    if (!ABILITIES[key]) return false;
    this.selected = key;
    this.orbs.select(key);
    this.ui.setAbility(key);
    return true;
  }

  beginTargeting(key, { releasePointer = true } = {}) {
    if (!this.select(key)) return false;
    if (this.orbs.isInFlight(key)) {
      this.ui.toast(`${ABILITIES[key].name} 구체가 이동 중입니다.`);
      return false;
    }
    if (releasePointer && !this.isTargeting && document.pointerLockElement !== this.canvas) return false;

    this.isTargeting = true;
    this.pointer.set(0, 0);
    this.pointerClient.x = innerWidth / 2;
    this.pointerClient.y = innerHeight / 2;
    this.ui.setAbilityTargeting(true, key);
    this.ui.setTargetingPointer(this.pointerClient.x, this.pointerClient.y);
    this.refreshTarget();

    if (releasePointer && document.pointerLockElement === this.canvas) document.exitPointerLock();
    return true;
  }

  setPointerFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.max(rect.left, Math.min(event.clientX, rect.right));
    const y = Math.max(rect.top, Math.min(event.clientY, rect.bottom));
    this.pointer.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    this.pointerClient.x = x;
    this.pointerClient.y = y;
    this.ui.setTargetingPointer(x, y);
  }

  refreshTarget() {
    if (!this.isTargeting) return null;
    return this.interaction.update(this.selected, this.pointer);
  }

  confirmTarget() {
    const target = this.refreshTarget();
    if (!target) {
      this.ui.toast('능력을 사용할 물체를 선택하세요.');
      return false;
    }
    if (!target.accepts(this.selected)) {
      this.ui.toast(`${target.name}은(는) ${ABILITIES[this.selected].name}에 반응하지 않습니다.`);
      return false;
    }

    const ability = this.selected;
    const point = this.interaction.hitPoint.clone();
    const launched = this.orbs.castTo(ability, target, point, (arrivalPoint) => {
      this.resolveCast(ability, target, arrivalPoint);
    });
    if (!launched) return false;

    this.ui.toast(`${target.name} 선택 · 구체가 이동합니다.`);
    this.finishTargeting(true);
    return true;
  }

  cancelTargeting({ restorePointer = true } = {}) {
    if (!this.isTargeting) return;
    this.finishTargeting(restorePointer);
    this.ui.toast('능력 선택을 취소했습니다.', 1200);
  }

  finishTargeting(restorePointer) {
    this.isTargeting = false;
    this.interaction.clearTarget();
    this.ui.setAbilityTargeting(false, this.selected);
    if (restorePointer && document.pointerLockElement !== this.canvas) {
      const request = this.canvas.requestPointerLock();
      request?.catch?.(() => this.ui.setPaused(true));
    }
  }

  resolveCast(ability, target, point) {
    this.spawnImpact(point, ability);
    this.audio.playAbility(ability);
    const success = this.interaction.useTarget(target, ability, { ability, point });
    if (!success) this.ui.toast(`${target.name}은(는) 지금 ${ABILITIES[ability].name}에 반응하지 않습니다.`);
  }

  spawnImpact(point, ability) {
    const color = ABILITIES[ability].color;
    const spark = new THREE.Mesh(
      new THREE.IcosahedronGeometry(.14, 1),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending }),
    );
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(.24, .025, 8, 30),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, blending: THREE.AdditiveBlending }),
    );
    spark.position.copy(point);
    halo.position.copy(point);
    halo.lookAt(this.camera.position);
    this.scene.add(spark, halo);
    this.effects.push({ spark, halo, life: .42, maxLife: .42 });
  }

  update(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.life -= dt;
      const ratio = Math.max(0, fx.life / fx.maxLife);
      fx.spark.material.opacity = ratio;
      fx.halo.material.opacity = ratio * .9;
      fx.spark.scale.setScalar(1 + (1 - ratio) * 3.5);
      fx.halo.scale.setScalar(1 + (1 - ratio) * 5.5);
      if (fx.life <= 0) {
        this.scene.remove(fx.spark, fx.halo);
        fx.spark.geometry.dispose();
        fx.spark.material.dispose();
        fx.halo.geometry.dispose();
        fx.halo.material.dispose();
        this.effects.splice(i, 1);
      }
    }
  }
}
