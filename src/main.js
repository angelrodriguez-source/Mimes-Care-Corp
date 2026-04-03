import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { MinigameScene } from './scenes/MinigameScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 400,
  height: 600,
  backgroundColor: '#87CEEB',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, MinigameScene],
};

const game = new Phaser.Game(config);
