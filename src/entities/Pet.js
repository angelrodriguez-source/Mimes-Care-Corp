const SAVE_KEY = 'virtual_pet_save';

export class Pet {
  constructor() {
    this.name = 'Bolita';
    this.hunger = 80;     // 0 = starving, 100 = full
    this.happiness = 80;  // 0 = sad, 100 = happy
    this.energy = 80;     // 0 = exhausted, 100 = energized
    this.hygiene = 80;    // 0 = dirty, 100 = clean
    this.level = 1;
    this.xp = 0;
    this.coins = 50;
    this.lastUpdate = Date.now();

    this.load();
  }

  update() {
    const now = Date.now();
    const elapsed = (now - this.lastUpdate) / 1000; // seconds

    // Stats decay over time (lose ~1 point per 2 minutes)
    const decay = elapsed / 120;
    this.hunger = Math.max(0, this.hunger - decay);
    this.happiness = Math.max(0, this.happiness - decay * 0.8);
    this.energy = Math.max(0, this.energy - decay * 0.5);
    this.hygiene = Math.max(0, this.hygiene - decay * 0.6);

    this.lastUpdate = now;
  }

  feed(amount = 15) {
    if (this.coins < 5) return false;
    this.coins -= 5;
    this.hunger = Math.min(100, this.hunger + amount);
    this.hygiene = Math.max(0, this.hygiene - 3);
    this.addXp(5);
    this.save();
    return true;
  }

  play(amount = 20) {
    if (this.energy < 10) return false;
    this.happiness = Math.min(100, this.happiness + amount);
    this.energy = Math.max(0, this.energy - 15);
    this.hunger = Math.max(0, this.hunger - 10);
    this.addXp(10);
    this.save();
    return true;
  }

  sleep(amount = 40) {
    this.energy = Math.min(100, this.energy + amount);
    this.happiness = Math.min(100, this.happiness + 5);
    this.addXp(5);
    this.save();
    return true;
  }

  clean(amount = 30) {
    this.hygiene = Math.min(100, this.hygiene + amount);
    this.happiness = Math.min(100, this.happiness + 5);
    this.addXp(5);
    this.save();
    return true;
  }

  addXp(amount) {
    this.xp += amount;
    const needed = this.level * 100;
    if (this.xp >= needed) {
      this.xp -= needed;
      this.level++;
      this.coins += 20;
    }
  }

  earnCoins(amount) {
    this.coins += amount;
    this.save();
  }

  getMood() {
    const avg = (this.hunger + this.happiness + this.energy + this.hygiene) / 4;
    if (avg >= 75) return 'happy';
    if (avg >= 50) return 'neutral';
    if (avg >= 25) return 'sad';
    return 'sick';
  }

  save() {
    const data = {
      name: this.name,
      hunger: this.hunger,
      happiness: this.happiness,
      energy: this.energy,
      hygiene: this.hygiene,
      level: this.level,
      xp: this.xp,
      coins: this.coins,
      lastUpdate: this.lastUpdate,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage not available
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        Object.assign(this, data);
      }
    } catch (e) {
      // Start fresh
    }
  }
}
