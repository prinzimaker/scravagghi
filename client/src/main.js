import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';

/**
 * Configurazione principale di Phaser
 */
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scene: [GameScene],
  pixelArt: false,
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  }
};

// Crea il gioco
const game = new Phaser.Game(config);

console.log('🎮 Scravagghi Client v0.1');
console.log('📦 Phaser:', Phaser.VERSION);

// Export per debug
window.game = game;
