import Phaser from 'phaser';

// Simple "catch falling food" minigame to earn coins
export class MinigameScene extends Phaser.Scene {
  constructor() {
    super('MinigameScene');
  }

  init(data) {
    this.pet = data.pet;
  }

  create() {
    const { width, height } = this.scale;

    // Semi-transparent overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    // Title
    this.add.text(width / 2, 30, '🎮 ¡Atrapa la comida!', {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(width / 2, 55, 'Toca las manzanas antes de que caigan', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#cccccc',
    }).setOrigin(0.5);

    // Score
    this.score = 0;
    this.timeLeft = 15; // seconds
    this.missed = 0;

    this.scoreText = this.add.text(20, 80, 'Puntos: 0', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 2,
    });

    this.timerText = this.add.text(width - 20, 80, 'Tiempo: 15', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0);

    // Spawn food items
    this.foods = [];
    this.spawnTimer = this.time.addEvent({
      delay: 800,
      callback: () => this.spawnFood(),
      loop: true,
    });

    // Countdown timer
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText(`Tiempo: ${this.timeLeft}`);
        if (this.timeLeft <= 0) {
          this.endGame();
        }
      },
      loop: true,
    });
  }

  spawnFood() {
    if (this.timeLeft <= 0) return;

    const { width } = this.scale;
    const x = Phaser.Math.Between(40, width - 40);

    // Random food emojis
    const emojis = ['🍎', '🍕', '🍔', '🌮', '🍩', '🍪', '🧁'];
    const emoji = Phaser.Math.RND.pick(emojis);
    const points = emoji === '🍎' ? 3 : 1; // Apples worth more

    const food = this.add.text(x, 100, emoji, {
      fontSize: '36px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    food.pointValue = points;

    // Click/tap to catch
    food.on('pointerdown', () => {
      this.score += food.pointValue;
      this.scoreText.setText(`Puntos: ${this.score}`);

      // "+N" floating text
      const plus = this.add.text(food.x, food.y, `+${food.pointValue}`, {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#FFD700',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);

      this.tweens.add({
        targets: plus,
        y: plus.y - 40,
        alpha: 0,
        duration: 500,
        onComplete: () => plus.destroy(),
      });

      food.destroy();
    });

    // Fall animation
    this.tweens.add({
      targets: food,
      y: 580,
      duration: Phaser.Math.Between(2000, 3500),
      ease: 'Linear',
      onComplete: () => {
        if (food.active) {
          food.destroy();
          this.missed++;
        }
      },
    });
  }

  endGame() {
    this.spawnTimer.destroy();
    this.countdownTimer.destroy();

    const { width, height } = this.scale;
    const coins = Math.floor(this.score / 2);

    // Results panel
    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a2e, 0.95);
    panel.fillRoundedRect(50, 180, width - 100, 240, 16);
    panel.lineStyle(3, 0xA855F7);
    panel.strokeRoundedRect(50, 180, width - 100, 240, 16);

    this.add.text(width / 2, 210, '¡Fin del juego!', {
      fontSize: '26px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(width / 2, 260, `Puntos: ${this.score}`, {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
    }).setOrigin(0.5);

    this.add.text(width / 2, 295, `Monedas ganadas: 🪙 ${coins}`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Give coins to pet
    if (this.pet) {
      this.pet.earnCoins(coins);
    }

    // Back button
    const backBtn = this.add.container(width / 2, 370);
    const btnBg = this.add.image(0, 0, 'button').setDisplaySize(160, 45);
    const btnText = this.add.text(0, 0, 'VOLVER', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#1a5c1a',
      strokeThickness: 3,
    }).setOrigin(0.5);
    backBtn.add([btnBg, btnText]);
    backBtn.setSize(160, 45);
    backBtn.setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      this.scene.stop();
      this.scene.resume('GameScene');
    });
  }
}
