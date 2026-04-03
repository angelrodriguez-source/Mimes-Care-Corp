export class ActionButton {
  constructor(scene, x, y, emoji, label, color, callback) {
    this.scene = scene;
    this.container = scene.add.container(x, y);

    // Circle background
    const circle = scene.add.graphics();
    circle.fillStyle(color, 0.9);
    circle.fillCircle(0, 0, 32);
    circle.lineStyle(3, 0xffffff, 0.5);
    circle.strokeCircle(0, 0, 32);

    // Emoji icon
    const icon = scene.add.text(0, -2, emoji, {
      fontSize: '26px',
    }).setOrigin(0.5);

    // Label below
    const text = scene.add.text(0, 42, label, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.container.add([circle, icon, text]);
    this.container.setSize(64, 64);
    this.container.setInteractive({ useHandCursor: true });

    this.container.on('pointerdown', () => {
      scene.tweens.add({
        targets: this.container,
        scaleX: 0.85,
        scaleY: 0.85,
        duration: 80,
        yoyo: true,
        onComplete: callback,
      });
    });

    this.container.on('pointerover', () => {
      this.container.setScale(1.1);
    });
    this.container.on('pointerout', () => {
      this.container.setScale(1);
    });
  }
}
