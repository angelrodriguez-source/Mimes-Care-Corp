import Phaser from 'phaser';
import { MimeRenderer, MIME_COLORS } from '../entities/MimeRenderer.js';

/**
 * Escena de preview para visualizar los 3 tipos de Mime.
 * Muestra uno de cada personalidad con colores y pelaje distintos.
 */
export class MimePreviewScene extends Phaser.Scene {
  constructor() {
    super('MimePreviewScene');
  }

  create() {
    const { width, height } = this.scale;

    // Fondo degradado suave
    const bg = this.add.graphics();
    const topColor = Phaser.Display.Color.ValueToColor(0xE8EAF6);
    const botColor = Phaser.Display.Color.ValueToColor(0xFCE4EC);
    for (let y = 0; y < height; y++) {
      const t = y / height;
      const r = Phaser.Math.Linear(topColor.red, botColor.red, t);
      const g = Phaser.Math.Linear(topColor.green, botColor.green, t);
      const b = Phaser.Math.Linear(topColor.blue, botColor.blue, t);
      bg.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      bg.fillRect(0, y, width, 1);
    }

    // Suelo
    bg.fillStyle(0xBCAAA4, 0.4);
    bg.fillRect(0, height - 100, width, 100);
    bg.fillStyle(0xD7CCC8, 0.3);
    bg.fillRect(0, height - 100, width, 3);

    // Título
    this.add.text(width / 2, 30, 'Mimes Care Corp', {
      fontSize: '26px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#5C6BC0',
      stroke: '#ffffff',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, 58, 'Preview de personalidades', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#9E9E9E',
    }).setOrigin(0.5);

    // === LOS 3 MIMES ===
    const mimeY = height - 130;
    const spacing = width / 4;

    // Aventurero (celeste, rayas)
    this.aventurero = new MimeRenderer(this, spacing, mimeY, {
      color: MIME_COLORS.celeste,
      personality: 'aventurero',
      furType: 'rayas',
      mood: 'euforico',
    });
    this.aventurero.setScale(0.9);

    this.add.text(spacing, mimeY + 30, 'Aventurero', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#0288D1',
      stroke: '#ffffff',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Tranquilo (lila, liso)
    this.tranquilo = new MimeRenderer(this, spacing * 2, mimeY, {
      color: MIME_COLORS.lila,
      personality: 'tranquilo',
      furType: 'liso',
      mood: 'contento',
    });
    this.tranquilo.setScale(0.9);

    this.add.text(spacing * 2, mimeY + 30, 'Tranquilo', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#7E57C2',
      stroke: '#ffffff',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Pícaro (melocotón, manchas)
    this.picaro = new MimeRenderer(this, spacing * 3, mimeY, {
      color: MIME_COLORS.melocoton,
      personality: 'picaro',
      furType: 'manchas',
      mood: 'contento',
    });
    this.picaro.setScale(0.9);

    this.add.text(spacing * 3, mimeY + 30, 'Picaro', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#EF6C00',
      stroke: '#ffffff',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Interacción: click para hacer bounce
    this.aventurero.container.setSize(90, 120).setInteractive();
    this.aventurero.container.on('pointerdown', () => this.aventurero.celebrate());

    this.tranquilo.container.setSize(90, 120).setInteractive();
    this.tranquilo.container.on('pointerdown', () => this.tranquilo.bounce());

    this.picaro.container.setSize(90, 120).setInteractive();
    this.picaro.container.on('pointerdown', () => this.picaro.celebrate());

    // Instrucción
    this.add.text(width / 2, height - 30, 'Toca un Mime para interactuar', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#BDBDBD',
    }).setOrigin(0.5);

    this.cameras.main.fadeIn(500);
  }
}
