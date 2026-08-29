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
    document.querySelectorAll('.ability').forEach((el) => el.classList.toggle('selected', el.dataset.ability === key));
    this.crosshair.style.color = ABILITIES[key].css;
  }

  setTarget(target, ability) {
    const visible = !!target;
    this.targetCard.classList.toggle('hidden', !visible);
    this.crosshair.classList.toggle('active', visible);
    if (!target) return;
    this.targetName.textContent = target.name;
    const accepts = target.accepts(ability);
    this.targetHint.textContent = accepts ? `${ABILITIES[ability].name} 사용 · ${target.state}` : `${target.abilities.map((a) => ABILITIES[a].name).join(' / ')} · ${target.state}`;
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
    document.querySelectorAll('[data-fragment]').forEach((el) => el.classList.toggle('done', !!progress[el.dataset.fragment]));
  }

  toggleDebug() { this.debug.classList.toggle('hidden'); }
  updateDebug(text) { if (!this.debug.classList.contains('hidden')) this.debug.textContent = text; }
}
