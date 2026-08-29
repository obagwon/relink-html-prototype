import * as THREE from 'three';

export class CameraController {
  constructor(camera, canvas, player, world) {
    this.camera = camera;
    this.canvas = canvas;
    this.player = player;
    this.world = world;
    this.yaw = 0;
    this.pitch = .34;
    this.distance = 6.4;
    this.currentTarget = new THREE.Vector3();
    this.desiredPosition = new THREE.Vector3();
    this.forward = new THREE.Vector3(0, 0, -1);
    this.right = new THREE.Vector3(1, 0, 0);

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== this.canvas) return;
      this.yaw -= e.movementX * .00235;
      this.pitch = THREE.MathUtils.clamp(this.pitch + e.movementY * .0018, .05, .78);
    });
  }

  getForward() {
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    return this.forward;
  }

  getRight() {
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
    return this.right;
  }

  update(dt, snap = false) {
    const target = this.player.root.position.clone().add(new THREE.Vector3(0, 1.25, 0));
    const horizontal = Math.cos(this.pitch) * this.distance;
    this.desiredPosition.set(
      target.x + Math.sin(this.yaw) * horizontal,
      target.y + 1.0 + Math.sin(this.pitch) * this.distance,
      target.z + Math.cos(this.yaw) * horizontal,
    );
    const alpha = snap ? 1 : 1 - Math.exp(-dt * 9);
    this.currentTarget.lerp(target, alpha);
    this.camera.position.lerp(this.desiredPosition, alpha);
    this.camera.lookAt(this.currentTarget);
  }
}
