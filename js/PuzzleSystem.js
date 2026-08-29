export class Interactable {
  constructor({ id, name, mesh, abilities = [], state = 'inactive', hint = '', handlers = {}, reset = null }) {
    this.id = id;
    this.name = name;
    this.mesh = mesh;
    this.abilities = abilities;
    this.state = state;
    this.hint = hint;
    this.handlers = handlers;
    this.resetHandler = reset;
    this.enabled = true;
    this.completed = false;
    mesh.traverse((child) => { if (child.isMesh) child.userData.interactable = this; });
  }

  accepts(ability) { return this.enabled && this.abilities.includes(ability); }

  handle(ability, context) {
    if (!this.accepts(ability)) return false;
    const fn = this.handlers[ability];
    if (!fn) return false;
    return fn(this, context) !== false;
  }

  reset() {
    this.completed = false;
    if (this.resetHandler) this.resetHandler(this);
  }
}

export class PuzzleSystem {
  constructor() {
    this.puzzles = new Map();
  }

  add(id, label, condition) {
    this.puzzles.set(id, { id, label, condition, complete: false });
  }

  evaluate(id) {
    const puzzle = this.puzzles.get(id);
    if (!puzzle || puzzle.complete) return false;
    if (puzzle.condition()) { puzzle.complete = true; return true; }
    return false;
  }

  reset(prefix = '') {
    for (const puzzle of this.puzzles.values()) if (!prefix || puzzle.id.startsWith(prefix)) puzzle.complete = false;
  }

  getStatus(prefix = '') {
    return [...this.puzzles.values()].filter((p) => !prefix || p.id.startsWith(prefix)).map((p) => `${p.complete ? '✓' : '○'} ${p.label}`).join('\n');
  }
}
