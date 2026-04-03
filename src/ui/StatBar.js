import Phaser from 'phaser';

export class StatBar {
  constructor(scene, x, y, label, color, icon) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = 120;
    this.height = 14;
    this.color = color;

    // Label
    this.label = scene.add.text(x - 5, y - 1, icon + ' ' + label, {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0.5);

    // Background bar
    this.bgBar = scene.add.graphics();
    this.bgBar.fillStyle(0x000000, 0.4);
    this.bgBar.fillRoundedRect(x, y - this.height / 2, this.width, this.height, 4);

    // Fill bar
    this.fillBar = scene.add.graphics();

    // Value text
    this.valueText = scene.add.text(x + this.width + 5, y - 1, '100', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0, 0.5);
  }

  update(value) {
    const clamped = Phaser.Math.Clamp(value, 0, 100);
    const fillWidth = (clamped / 100) * this.width;

    this.fillBar.clear();

    // Color changes based on value
    let barColor = this.color;
    if (clamped < 25) barColor = 0xEF4444;
    else if (clamped < 50) barColor = 0xF59E0B;

    this.fillBar.fillStyle(barColor, 0.9);
    this.fillBar.fillRoundedRect(this.x, this.y - this.height / 2, fillWidth, this.height, 4);

    this.valueText.setText(Math.round(clamped));
  }
}
