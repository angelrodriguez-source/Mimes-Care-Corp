import Phaser from 'phaser';
import { Pet } from '../entities/Pet.js';
import { StatBar } from '../ui/StatBar.js';
import { ActionButton } from '../ui/ActionButton.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    const { width, height } = this.scale;
    this.pet = new Pet();

    // Background
    this.add.image(width / 2, height / 2, 'bg').setDisplaySize(width, height);

    // Floor / room
    const floor = this.add.graphics();
    floor.fillStyle(0xD2B48C, 0.6);
    floor.fillRect(0, 420, width, 180);
    floor.fillStyle(0xC4A882, 0.4);
    floor.fillRect(0, 420, width, 5);

    // Pet sprite
    this.petSprite = this.add.image(width / 2, 340, 'pet').setScale(2);

    // Idle animation
    this.tweens.add({
      targets: this.petSprite,
      y: 345,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Mood face (text overlay on pet)
    this.moodText = this.add.text(width / 2, 330, '', {
      fontSize: '20px',
    }).setOrigin(0.5).setDepth(10);

    // Header panel
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x000000, 0.3);
    headerBg.fillRoundedRect(10, 10, width - 20, 110, 12);

    // Pet name and level
    this.nameText = this.add.text(20, 22, '', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });

    this.coinText = this.add.text(width - 20, 22, '', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(1, 0);

    // Stat bars
    this.hungerBar = new StatBar(this, 110, 55, 'Hambre', 0x22C55E, '🍎');
    this.happyBar = new StatBar(this, 110, 75, 'Felicidad', 0xF472B6, '😊');
    this.energyBar = new StatBar(this, 110, 95, 'Energia', 0x3B82F6, '⚡');
    this.hygieneBar = new StatBar(this, 110, 115, 'Higiene', 0x06B6D4, '🫧');

    // Action buttons
    const btnY = 520;
    const spacing = width / 5;

    new ActionButton(this, spacing * 1, btnY, '🍎', 'Comer', 0x22C55E, () => this.doFeed());
    new ActionButton(this, spacing * 2, btnY, '🎮', 'Jugar', 0xF472B6, () => this.doPlay());
    new ActionButton(this, spacing * 3, btnY, '💤', 'Dormir', 0x3B82F6, () => this.doSleep());
    new ActionButton(this, spacing * 4, btnY, '🚿', 'Limpiar', 0x06B6D4, () => this.doClean());

    // Floating message text
    this.msgText = this.add.text(width / 2, 250, '', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    // XP bar at bottom
    this.xpBg = this.add.graphics();
    this.xpFill = this.add.graphics();
    this.xpText = this.add.text(width / 2, height - 12, '', {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.updateUI();

    // Auto-save every 30s
    this.time.addEvent({
      delay: 30000,
      callback: () => this.pet.save(),
      loop: true,
    });

    this.cameras.main.fadeIn(300);
  }

  update() {
    this.pet.update();
    this.updateUI();
  }

  updateUI() {
    const { width, height } = this.scale;
    const p = this.pet;

    this.nameText.setText(`${p.name}  Nv.${p.level}`);
    this.coinText.setText(`🪙 ${p.coins}`);

    this.hungerBar.update(p.hunger);
    this.happyBar.update(p.happiness);
    this.energyBar.update(p.energy);
    this.hygieneBar.update(p.hygiene);

    // Mood expression
    const mood = p.getMood();
    const faces = { happy: '😄', neutral: '😐', sad: '😢', sick: '🤢' };
    this.moodText.setText(faces[mood] || '');

    // Pet tint based on mood
    const tints = { happy: 0xffffff, neutral: 0xe8e8e8, sad: 0xccccdd, sick: 0xaaddaa };
    this.petSprite.setTint(tints[mood] || 0xffffff);

    // XP bar
    const needed = p.level * 100;
    const pct = p.xp / needed;
    this.xpBg.clear();
    this.xpBg.fillStyle(0x000000, 0.4);
    this.xpBg.fillRect(0, height - 22, width, 22);
    this.xpFill.clear();
    this.xpFill.fillStyle(0xA855F7, 0.8);
    this.xpFill.fillRect(0, height - 22, width * pct, 22);
    this.xpText.setText(`XP: ${Math.round(p.xp)} / ${needed}`);
  }

  showMessage(text) {
    this.msgText.setText(text);
    this.msgText.setAlpha(1);
    this.tweens.add({
      targets: this.msgText,
      alpha: 0,
      y: 220,
      duration: 1500,
      onComplete: () => this.msgText.setY(250),
    });
  }

  animatePet() {
    this.tweens.add({
      targets: this.petSprite,
      scaleX: 2.2,
      scaleY: 1.8,
      duration: 150,
      yoyo: true,
    });
  }

  doFeed() {
    if (this.pet.feed()) {
      this.showMessage('¡Ñam ñam! 🍎');
      this.animatePet();
      this.showFoodAnimation();
    } else {
      this.showMessage('¡No tienes monedas! 😢');
    }
  }

  doPlay() {
    if (this.pet.play()) {
      this.showMessage('¡A jugar! 🎮\n+10 XP');
      this.animatePet();
      // Launch minigame
      this.scene.launch('MinigameScene', { pet: this.pet });
      this.scene.pause();
    } else {
      this.showMessage('¡Muy cansado! 💤');
    }
  }

  doSleep() {
    this.pet.sleep();
    this.showMessage('Zzz... 💤');
    // Sleep animation
    this.cameras.main.fadeOut(500, 0, 0, 30);
    this.time.delayedCall(1000, () => {
      this.cameras.main.fadeIn(500);
    });
    this.animatePet();
  }

  doClean() {
    this.pet.clean();
    this.showMessage('¡Limpio y brillante! ✨');
    this.animatePet();
    // Sparkle particles
    this.showSparkles();
  }

  showFoodAnimation() {
    const food = this.add.image(this.scale.width / 2, 200, 'food').setScale(0.5);
    this.tweens.add({
      targets: food,
      y: 320,
      scaleX: 0,
      scaleY: 0,
      duration: 600,
      ease: 'Back.easeIn',
      onComplete: () => food.destroy(),
    });
  }

  showSparkles() {
    for (let i = 0; i < 8; i++) {
      const x = this.petSprite.x + Phaser.Math.Between(-60, 60);
      const y = this.petSprite.y + Phaser.Math.Between(-60, 40);
      const star = this.add.text(x, y, '✨', { fontSize: '20px' });
      this.tweens.add({
        targets: star,
        alpha: 0,
        y: y - 40,
        duration: 800,
        delay: i * 100,
        onComplete: () => star.destroy(),
      });
    }
  }
}
