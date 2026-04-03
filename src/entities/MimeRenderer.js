import Phaser from 'phaser';

/**
 * MimeRenderer - Construye y anima un Mime por piezas (skeletal/tween).
 *
 * Forma: mezcla de pingüino bebé + gato bebé.
 * Todas las piezas se dibujan con Graphics y se montan en un Container.
 * El color se aplica como tinte. Las animaciones son tweens sobre las piezas.
 */

// Personalidades y sus modificadores de animación
const PERSONALITY_MODS = {
  aventurero: { speed: 0.7, amplitude: 1.4, tailSpeed: 0.6 },
  tranquilo:  { speed: 1.5, amplitude: 0.6, tailSpeed: 1.8 },
  picaro:     { speed: 0.9, amplitude: 1.0, tailSpeed: 1.0 },
};

// Paleta de colores pastel para Mimes
export const MIME_COLORS = {
  lila:      0xB39DDB,
  rosa:      0xF48FB1,
  celeste:   0x81D4FA,
  menta:     0x80CBC4,
  melocoton: 0xFFCC80,
  lavanda:   0xCE93D8,
};

export class MimeRenderer {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x - posición X central
   * @param {number} y - posición Y central (base de los pies)
   * @param {object} config
   * @param {number} config.color - color hex (ej: 0xB39DDB)
   * @param {string} config.personality - 'aventurero' | 'tranquilo' | 'picaro'
   * @param {string} [config.furType] - 'liso' | 'manchas' | 'rayas'
   * @param {string} [config.mood] - 'euforico' | 'contento' | 'normal' | 'triste' | 'enfadado'
   */
  constructor(scene, x, y, config = {}) {
    this.scene = scene;
    this.config = {
      color: config.color || 0xB39DDB,
      personality: config.personality || 'tranquilo',
      furType: config.furType || 'liso',
      mood: config.mood || 'contento',
    };

    this.mods = PERSONALITY_MODS[this.config.personality] || PERSONALITY_MODS.tranquilo;

    // Container principal
    this.container = scene.add.container(x, y);

    // Construir piezas
    this.buildParts();

    // Iniciar animaciones idle
    this.startIdleAnimations();

    // Aplicar expresión según mood
    this.setMood(this.config.mood);
  }

  buildParts() {
    const color = this.config.color;
    const darkerColor = Phaser.Display.Color.ValueToColor(color);
    const darker = Phaser.Display.Color.GetColor(
      Math.max(0, darkerColor.red - 40),
      Math.max(0, darkerColor.green - 40),
      Math.max(0, darkerColor.blue - 40)
    );
    const lighterColor = Phaser.Display.Color.ValueToColor(color);
    const lighter = Phaser.Display.Color.GetColor(
      Math.min(255, lighterColor.red + 40),
      Math.min(255, lighterColor.green + 40),
      Math.min(255, lighterColor.blue + 40)
    );

    // === COLA (detrás de todo) ===
    this.cola = this.scene.add.graphics();
    this.cola.fillStyle(color, 1);
    this.cola.fillEllipse(0, 0, 28, 22);
    // Pelusa de la cola
    this.cola.fillStyle(lighter, 0.6);
    this.cola.fillEllipse(2, -2, 18, 14);
    this.cola.setPosition(38, -30);
    this.container.add(this.cola);

    // === PATAS ===
    this.pataL = this.scene.add.graphics();
    this.pataL.fillStyle(darker, 1);
    this.pataL.fillEllipse(0, 0, 26, 16);
    // Deditos
    this.pataL.fillStyle(color, 0.8);
    this.pataL.fillCircle(-6, -2, 5);
    this.pataL.fillCircle(0, -3, 5);
    this.pataL.fillCircle(6, -2, 5);
    this.pataL.setPosition(-22, 0);
    this.container.add(this.pataL);

    this.pataR = this.scene.add.graphics();
    this.pataR.fillStyle(darker, 1);
    this.pataR.fillEllipse(0, 0, 26, 16);
    this.pataR.fillStyle(color, 0.8);
    this.pataR.fillCircle(-6, -2, 5);
    this.pataR.fillCircle(0, -3, 5);
    this.pataR.fillCircle(6, -2, 5);
    this.pataR.setPosition(22, 0);
    this.container.add(this.pataR);

    // === CUERPO ===
    this.cuerpo = this.scene.add.graphics();
    // Cuerpo principal (forma pera/gota)
    this.cuerpo.fillStyle(color, 1);
    this.cuerpo.fillEllipse(0, -20, 90, 70);  // parte inferior más ancha
    this.cuerpo.fillEllipse(0, -50, 78, 60);  // parte superior

    // Barriga (más clara)
    this.cuerpo.fillStyle(lighter, 0.7);
    this.cuerpo.fillEllipse(0, -22, 54, 44);

    // Overlay de pelaje
    this.drawFur(this.cuerpo, this.config.furType, darker);

    this.cuerpo.setPosition(0, -40);
    this.container.add(this.cuerpo);

    // === BRAZOS ===
    this.brazoL = this.scene.add.graphics();
    this.brazoL.fillStyle(color, 1);
    this.brazoL.fillEllipse(0, 0, 20, 36);
    this.brazoL.fillStyle(darker, 1);
    this.brazoL.fillEllipse(0, 14, 14, 12); // manita
    this.brazoL.setPosition(-42, -48);
    this.container.add(this.brazoL);

    this.brazoR = this.scene.add.graphics();
    this.brazoR.fillStyle(color, 1);
    this.brazoR.fillEllipse(0, 0, 20, 36);
    this.brazoR.fillStyle(darker, 1);
    this.brazoR.fillEllipse(0, 14, 14, 12);
    this.brazoR.setPosition(42, -48);
    this.container.add(this.brazoR);

    // === CABEZA ===
    this.cabeza = this.scene.add.container(0, -85);

    // Forma de cabeza (redondeada, ligeramente más ancha que alta)
    const head = this.scene.add.graphics();
    head.fillStyle(color, 1);
    head.fillEllipse(0, 0, 80, 72);
    // Mejillas
    head.fillStyle(0xFFAB91, 0.3);
    head.fillEllipse(-26, 12, 18, 12);
    head.fillEllipse(26, 12, 18, 12);
    this.cabeza.add(head);

    // === OREJAS (gatito) ===
    this.orejaL = this.scene.add.graphics();
    this.orejaL.fillStyle(color, 1);
    this.orejaL.fillTriangle(0, 0, -14, -24, 14, -24);
    this.orejaL.fillTriangle(-10, -20, 10, -20, 0, -30); // punta
    // Interior oreja
    this.orejaL.fillStyle(0xFFAB91, 0.5);
    this.orejaL.fillTriangle(0, -4, -8, -20, 8, -20);
    this.orejaL.setPosition(-24, -28);
    this.cabeza.add(this.orejaL);

    this.orejaR = this.scene.add.graphics();
    this.orejaR.fillStyle(color, 1);
    this.orejaR.fillTriangle(0, 0, -14, -24, 14, -24);
    this.orejaR.fillTriangle(-10, -20, 10, -20, 0, -30);
    this.orejaR.fillStyle(0xFFAB91, 0.5);
    this.orejaR.fillTriangle(0, -4, -8, -20, 8, -20);
    this.orejaR.setPosition(24, -28);
    this.cabeza.add(this.orejaR);

    // === OJOS ===
    // Ojo izquierdo
    this.ojoL = this.scene.add.container(-18, -4);
    const ojoLBlanco = this.scene.add.graphics();
    ojoLBlanco.fillStyle(0xFFFFFF, 1);
    ojoLBlanco.fillEllipse(0, 0, 24, 26);
    ojoLBlanco.lineStyle(2, 0x333333, 0.3);
    ojoLBlanco.strokeEllipse(0, 0, 24, 26);
    this.ojoL.add(ojoLBlanco);

    this.pupilaL = this.scene.add.graphics();
    this.pupilaL.fillStyle(0x1a1a2e, 1);
    this.pupilaL.fillCircle(0, 0, 8);
    // Brillo
    this.pupilaL.fillStyle(0xFFFFFF, 1);
    this.pupilaL.fillCircle(3, -3, 3);
    this.pupilaL.fillCircle(-2, 2, 1.5);
    this.ojoL.add(this.pupilaL);
    this.cabeza.add(this.ojoL);

    // Ojo derecho
    this.ojoR = this.scene.add.container(18, -4);
    const ojoRBlanco = this.scene.add.graphics();
    ojoRBlanco.fillStyle(0xFFFFFF, 1);
    ojoRBlanco.fillEllipse(0, 0, 24, 26);
    ojoRBlanco.lineStyle(2, 0x333333, 0.3);
    ojoRBlanco.strokeEllipse(0, 0, 24, 26);
    this.ojoR.add(ojoRBlanco);

    this.pupilaR = this.scene.add.graphics();
    this.pupilaR.fillStyle(0x1a1a2e, 1);
    this.pupilaR.fillCircle(0, 0, 8);
    this.pupilaR.fillStyle(0xFFFFFF, 1);
    this.pupilaR.fillCircle(3, -3, 3);
    this.pupilaR.fillCircle(-2, 2, 1.5);
    this.ojoR.add(this.pupilaR);
    this.cabeza.add(this.ojoR);

    // === PÁRPADOS (para parpadeo y expresiones) ===
    this.parpadoL = this.scene.add.graphics();
    this.parpadoL.fillStyle(color, 1);
    this.parpadoL.fillEllipse(0, 0, 26, 28);
    this.parpadoL.setPosition(-18, -4);
    this.parpadoL.setScale(1, 0); // invisible por defecto
    this.cabeza.add(this.parpadoL);

    this.parpadoR = this.scene.add.graphics();
    this.parpadoR.fillStyle(color, 1);
    this.parpadoR.fillEllipse(0, 0, 26, 28);
    this.parpadoR.setPosition(18, -4);
    this.parpadoR.setScale(1, 0);
    this.cabeza.add(this.parpadoR);

    // === BOCA ===
    this.boca = this.scene.add.graphics();
    this.drawMouth('contento');
    this.boca.setPosition(0, 14);
    this.cabeza.add(this.boca);

    // === NARIZ ===
    const nariz = this.scene.add.graphics();
    nariz.fillStyle(0xFFAB91, 1);
    nariz.fillTriangle(0, 4, -5, 10, 5, 10);
    nariz.fillEllipse(0, 10, 12, 6);
    nariz.setPosition(0, -2);
    this.cabeza.add(nariz);

    this.container.add(this.cabeza);
  }

  drawFur(graphics, type, color) {
    if (type === 'manchas') {
      graphics.fillStyle(color, 0.25);
      graphics.fillCircle(-15, -55, 10);
      graphics.fillCircle(18, -38, 8);
      graphics.fillCircle(-8, -25, 12);
      graphics.fillCircle(22, -55, 7);
    } else if (type === 'rayas') {
      graphics.lineStyle(3, color, 0.2);
      for (let i = 0; i < 4; i++) {
        const y = -55 + i * 12;
        graphics.lineBetween(-25, y, 25, y);
      }
    }
    // 'liso' = sin overlay adicional
  }

  drawMouth(mood) {
    this.boca.clear();
    switch (mood) {
      case 'euforico':
        // Gran sonrisa abierta
        this.boca.fillStyle(0x333333, 1);
        this.boca.fillEllipse(0, 0, 18, 12);
        this.boca.fillStyle(0xEF5350, 0.6);
        this.boca.fillEllipse(0, 2, 10, 6); // lengüita
        break;
      case 'contento':
        // Sonrisa suave
        this.boca.lineStyle(2.5, 0x555555, 1);
        this.boca.beginPath();
        this.boca.arc(0, -4, 8, 0.3, Math.PI - 0.3);
        this.boca.strokePath();
        break;
      case 'normal':
        // Boca neutra
        this.boca.lineStyle(2.5, 0x555555, 1);
        this.boca.lineBetween(-6, 0, 6, 0);
        break;
      case 'triste':
        // Boca triste (arco invertido)
        this.boca.lineStyle(2.5, 0x555555, 1);
        this.boca.beginPath();
        this.boca.arc(0, 6, 8, Math.PI + 0.3, -0.3);
        this.boca.strokePath();
        break;
      case 'enfadado':
        // Boca tensa
        this.boca.lineStyle(3, 0x555555, 1);
        this.boca.lineBetween(-8, 0, 8, 2);
        break;
      default:
        this.drawMouth('contento');
    }
  }

  // === ANIMACIONES ===

  startIdleAnimations() {
    const { speed, amplitude, tailSpeed } = this.mods;

    // Respiración del cuerpo
    this.scene.tweens.add({
      targets: this.cuerpo,
      scaleY: { from: 1.0, to: 1.0 + 0.03 * amplitude },
      duration: 1200 * speed,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Balanceo de la cola
    this.scene.tweens.add({
      targets: this.cola,
      angle: { from: -15 * amplitude, to: 15 * amplitude },
      duration: 800 * tailSpeed,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Parpadeo periódico
    this.scene.time.addEvent({
      delay: 3000 * speed,
      callback: () => this.blink(),
      loop: true,
    });

    // Movimiento sutil de orejas
    this.scene.tweens.add({
      targets: this.orejaL,
      angle: { from: 0, to: -5 * amplitude },
      duration: 2000 * speed,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: this.orejaR,
      angle: { from: 0, to: 5 * amplitude },
      duration: 2200 * speed,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Movimiento sutil de pupilas (mirada)
    this.scene.tweens.add({
      targets: [this.pupilaL, this.pupilaR],
      x: { from: -2, to: 2 },
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Balanceo suave de brazos
    this.scene.tweens.add({
      targets: this.brazoL,
      angle: { from: 5, to: -5 * amplitude },
      duration: 1800 * speed,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: this.brazoR,
      angle: { from: -5, to: 5 * amplitude },
      duration: 1900 * speed,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  blink() {
    // Cerrar párpados
    this.scene.tweens.add({
      targets: [this.parpadoL, this.parpadoR],
      scaleY: { from: 0, to: 1 },
      duration: 80,
      yoyo: true,
      hold: 60,
    });
  }

  setMood(mood) {
    this.config.mood = mood;
    this.drawMouth(mood);

    // Ajustar orejas según mood
    if (mood === 'triste' || mood === 'enfadado') {
      this.scene.tweens.add({
        targets: this.orejaL,
        y: this.orejaL.y + 4,
        duration: 500,
      });
      this.scene.tweens.add({
        targets: this.orejaR,
        y: this.orejaR.y + 4,
        duration: 500,
      });
    }
  }

  // Animación de rebote (al interactuar)
  bounce() {
    this.scene.tweens.add({
      targets: this.container,
      y: this.container.y - 20,
      duration: 200,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  // Animación de alegría
  celebrate() {
    this.bounce();
    this.scene.tweens.add({
      targets: this.container,
      angle: { from: -5, to: 5 },
      duration: 150,
      yoyo: true,
      repeat: 2,
    });
  }

  setPosition(x, y) {
    this.container.setPosition(x, y);
  }

  setScale(s) {
    this.container.setScale(s);
  }

  destroy() {
    this.container.destroy(true);
  }
}
