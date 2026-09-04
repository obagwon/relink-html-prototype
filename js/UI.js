import { ABILITIES } from './config.js';

export class UI {
  constructor() {
    this.hud = document.querySelector('#hud');
    this.startScreen = document.querySelector('#start-screen');
    this.pauseScreen = document.querySelector('#pause-screen');
    this.regionName = document.querySelector('#region-name');
    this.objective = document.querySelector('#objective');
    this.targetCard = document.querySelector('#target-card');
    this.targetName = document.querySelector('#target-name');
    this.targetHint = document.querySelector('#target-hint');
    this.crosshair = document.querySelector('#crosshair');
    this.interactionPrompt = document.querySelector('#interaction-prompt');
    this.abilityTargeting = document.querySelector('#ability-targeting');
    this.abilityTargetingName = document.querySelector('#ability-targeting-name');
    this.toastElement = document.querySelector('#toast');
    this.debug = document.querySelector('#debug-panel');
    this.controls = document.querySelector('#controls-tip');
    this.toastTimer = 0;
  }

  showGame() {
    this.startScreen.classList.remove('visible');
    this.pauseScreen.classList.remove('visible');
    this.hud.classList.remove('hidden');
    this.controls.classList.remove('fade');
    setTimeout(() => this.controls.classList.add('fade'), 6000);
  }

  setPaused(paused) { this.pauseScreen.classList.toggle('visible', paused); }

  setRegion(info) {
    this.regionName.textContent = info.name;
    this.objective.textContent = info.objective;
  }

  setObjective(text) { this.objective.textContent = text; }

  setAbility(key) {
    document.querySelectorAll('.ability').forEach((element) => element.classList.toggle('selected', element.dataset.ability === key));
    this.crosshair.style.color = ABILITIES[key].css;
    if (this.hud.classList.contains('targeting')) this.setAbilityTargeting(true, key);
  }

  setAbilityTargeting(active, key) {
    const info = ABILITIES[key];
    this.hud.classList.toggle('targeting', active);
    this.abilityTargeting.classList.toggle('hidden', !active);
    document.body.classList.toggle('ability-targeting-active', active);
    if (active && info) {
      this.hud.style.setProperty('--ability-color', info.css);
      this.abilityTargetingName.textContent = `${info.name} · TARGET SELECT`;
    }
    if (!active) this.targetCard.classList.add('hidden');
  }

  setTargetingPointer(x, y) {
    const cardX = Math.min(x + 24, Math.max(16, innerWidth - 250));
    const cardY = Math.min(y + 20, Math.max(80, innerHeight - 94));
    this.hud.style.setProperty('--target-x', `${cardX}px`);
    this.hud.style.setProperty('--target-y', `${cardY}px`);
  }

  setTarget(target, ability) {
    const visible = !!target;
    this.targetCard.classList.toggle('hidden', !visible);
    this.crosshair.classList.toggle('active', visible);
    if (!target) return;
    this.targetName.textContent = target.name;
    const accepts = target.accepts(ability);
    this.targetCard.classList.toggle('invalid', !accepts);
    this.targetHint.textContent = accepts
      ? `클릭하여 ${ABILITIES[ability].name} 사용 · ${target.state}`
      : `${target.abilities.map((key) => ABILITIES[key].name).join(' / ')} 필요 · ${target.state}`;
    this.crosshair.style.color = accepts ? ABILITIES[ability].css : '#ffffff';
  }

  showInteraction(label = 'E · 상호작용') {
    this.interactionPrompt.textContent = label;
    this.interactionPrompt.classList.remove('hidden');
  }

  hideInteraction() { this.interactionPrompt.classList.add('hidden'); }

  toast(text, duration = 2200) {
    clearTimeout(this.toastTimer);
    this.toastElement.textContent = text;
    this.toastElement.classList.add('show');
    this.toastTimer = setTimeout(() => this.toastElement.classList.remove('show'), duration);
  }

  setFragments(progress) {
    document.querySelectorAll('[data-fragment]').forEach((element) => element.classList.toggle('done', !!progress[element.dataset.fragment]));
  }

  toggleDebug() { this.debug.classList.toggle('hidden'); }
  updateDebug(text) { if (!this.debug.classList.contains('hidden')) this.debug.textContent = text; }
}
