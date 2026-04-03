import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = this.scale;

    // Background gradient
    this.add.image(width / 2, height / 2, 'bg').setDisplaySize(width, height);

    // Title
    this.add.text(width / 2, 120, 'Mi Mascota\nVirtual', {
      fontSize: '48px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
      stroke: '#2d5a27',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Pet preview
    const pet = this.add.image(width / 2, 300, 'pet').setScale(1.5);
    this.tweens.add({
      targets: pet,
      y: 310,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Play button
    const playBtn = this.add.container(width / 2, 460);
    const btnBg = this.add.image(0, 0, 'button').setDisplaySize(200, 60);
    const btnText = this.add.text(0, 0, 'JUGAR', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#1a5c1a',
      strokeThickness: 4,
    }).setOrigin(0.5);
    playBtn.add([btnBg, btnText]);
    playBtn.setSize(200, 60);
    playBtn.setInteractive({ useHandCursor: true });

    playBtn.on('pointerover', () => btnBg.setTint(0xccffcc));
    playBtn.on('pointerout', () => btnBg.clearTint());
    playBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('GameScene'));
    });

    // Credits
    this.add.text(width / 2, height - 30, 'v1.0 - Hecho con Phaser.js', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      alpha: 0.7,
    }).setOrigin(0.5);

    this.cameras.main.fadeIn(500);
  }
}
