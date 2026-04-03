import Phaser from 'phaser';
import { generatePetSprite, generateFoodSprite, generateButtonSprite, generateBgSprite } from '../utils/spriteGenerator.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Generate all sprites programmatically (no external assets needed)
    generatePetSprite(this);
    generateFoodSprite(this);
    generateButtonSprite(this);
    generateBgSprite(this);
  }

  create() {
    this.scene.start('MenuScene');
  }
}
