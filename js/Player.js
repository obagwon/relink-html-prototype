import * as THREE from 'three';

export class Player {
  constructor(scene) {
    this.root = new THREE.Group();
    this.root.name = 'Player';
    this.root.position.set(0, 1, 8);
    scene.add(this.root);

    const stone = new THREE.MeshStandardMaterial({ color: 0xd6d3c4, roughness: .88 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x4d5652, roughness: .9 });
    const eye = new THREE.MeshBasicMaterial({ color: 0x17211d });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.38, .58, 5, 10), stone);
    body.position.y = .9;
    body.castShadow = true;
    this.root.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.42, 16, 12), stone);
    head.scale.set(1, .9, .92); head.position.y = 1.58; head.castShadow = true;
    this.root.add(head);
    for (const x of [-.15, .15]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), eye);
      e.position.set(x, 1.61, -.37); this.root.add(e);
    }
    this.limbs = [];
    for (const [x, y, len] of [[-.46,.92,.52],[.46,.92,.52],[-.22,.35,.48],[.22,.35,.48]]) {
      const limb = new THREE.Mesh(new THREE.CapsuleGeometry(.095, len, 4, 7), dark);
      limb.position.set(x, y, 0); limb.castShadow = true; this.root.add(limb); this.limbs.push(limb);
    }

    this.keys = new Set();
    this.velocity = new THREE.Vector3();
    this.radius = .38;
    this.height = 1.9;
    this.grounded = false;
    this.enabled = false;
    this.speed = 5.3;
    this.runSpeed = 8.2;
    this.jumpSpeed = 8.4;
    this.gravity = -23;
    this.standingCollider = null;
    this.spawn = new THREE.Vector3(0, 1, 8);
    this.walkClock = 0;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space' && !e.repeat && this.enabled && this.grounded) {
        this.velocity.y = this.jumpSpeed;
        this.grounded = false;
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  teleport(position) {
    this.root.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.grounded = false;
    this.standingCollider = null;
  }

  setSpawn(position) {
    this.spawn.copy(position);
    this.teleport(position);
  }

  bounce(strength = 12) {
    this.velocity.y = Math.max(this.velocity.y, strength);
    this.grounded = false;
  }

  update(dt, cameraController, world) {
    if (!this.enabled) return;
    dt = Math.min(dt, .034);

    if (this.standingCollider?.active && this.standingCollider.delta) {
      this.root.position.add(this.standingCollider.delta);
    }

    const input = new THREE.Vector2(
      (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0),
      (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0),
    );
    if (input.lengthSq() > 1) input.normalize();

    const forward = cameraController.getForward();
    const right = cameraController.getRight();
    const move = new THREE.Vector3().addScaledVector(forward, input.y).addScaledVector(right, input.x);
    if (move.lengthSq() > 0) move.normalize();
    const speed = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) ? this.runSpeed : this.speed;

    if (move.lengthSq() > 0) {
      const targetAngle = Math.atan2(move.x, move.z);
      let delta = targetAngle - this.root.rotation.y;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      this.root.rotation.y += delta * Math.min(1, dt * 12);
      this.walkClock += dt * speed * 1.5;
      this.limbs[0].rotation.x = Math.sin(this.walkClock) * .55;
      this.limbs[1].rotation.x = -Math.sin(this.walkClock) * .55;
      this.limbs[2].rotation.x = -Math.sin(this.walkClock) * .45;
      this.limbs[3].rotation.x = Math.sin(this.walkClock) * .45;
    } else {
      for (const limb of this.limbs) limb.rotation.x *= Math.max(0, 1 - dt * 9);
    }

    const distance = speed * dt;
    this.tryHorizontal(this.root.position.x + move.x * distance, this.root.position.z, world);
    this.tryHorizontal(this.root.position.x, this.root.position.z + move.z * distance, world);

    this.velocity.y += this.gravity * dt;
    const oldY = this.root.position.y;
    const nextY = oldY + this.velocity.y * dt;
    const ground = world.findGround(this.root.position.x, this.root.position.z, oldY, nextY, this.radius);
    if (this.velocity.y <= 0 && ground && nextY <= ground.y + .18 && oldY >= ground.y - .35) {
      this.root.position.y = ground.y;
      this.velocity.y = 0;
      this.grounded = true;
      this.standingCollider = ground.collider;
    } else {
      this.root.position.y = nextY;
      this.grounded = false;
      this.standingCollider = null;
    }

    if (this.root.position.y < -12) world.respawnPlayer();
    world.checkPlayerTriggers(this);
  }

  tryHorizontal(x, z, world) {
    if (!world.blocksPlayer(x, z, this.root.position.y, this.radius, this.height)) {
      this.root.position.x = x;
      this.root.position.z = z;
    }
  }
}
