import { Game } from './Game.js';

const status = document.querySelector('#runtime-status');
try {
  const game = new Game(document.querySelector('#game-canvas'));
  window.RELINK = game;
  game.init();
  status.textContent = 'ready';
} catch (error) {
  status.textContent = `error: ${error.message}`;
  throw error;
}

document.querySelector('#start-button').addEventListener('click', () => window.RELINK.start());
document.querySelector('#resume-button').addEventListener('click', () => window.RELINK.resume());
document.querySelector('#reset-region-button').addEventListener('click', () => window.RELINK.resetCurrentRegion());
document.querySelector('#reset-progress-button').addEventListener('click', () => window.RELINK.resetProgress());
