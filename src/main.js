import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { MinigameScene } from './scenes/MinigameScene.js';
import { MimePreviewScene } from './scenes/MimePreviewScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 400,
  height: 600,
  backgroundColor: '#E8EAF6',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MimePreviewScene, BootScene, MenuScene, GameScene, MinigameScene],
};

const game = new Phaser.Game(config);
