// Generate all game sprites programmatically using Phaser graphics
// No external image files needed!

export function generatePetSprite(scene) {
  const g = scene.make.graphics({ add: false });

  // Body (round blob)
  g.fillStyle(0x8B5CF6); // purple
  g.fillCircle(50, 55, 40);

  // Belly
  g.fillStyle(0xC4B5FD);
  g.fillCircle(50, 62, 25);

  // Eyes
  g.fillStyle(0xFFFFFF);
  g.fillCircle(38, 42, 12);
  g.fillCircle(62, 42, 12);
  g.fillStyle(0x1a1a2e);
  g.fillCircle(40, 42, 7);
  g.fillCircle(64, 42, 7);

  // Eye shine
  g.fillStyle(0xFFFFFF);
  g.fillCircle(43, 39, 3);
  g.fillCircle(67, 39, 3);

  // Mouth (smile)
  g.lineStyle(3, 0x6D28D9);
  g.beginPath();
  g.arc(50, 55, 12, 0.2, Math.PI - 0.2);
  g.strokePath();

  // Feet
  g.fillStyle(0x7C3AED);
  g.fillEllipse(36, 90, 18, 12);
  g.fillEllipse(64, 90, 18, 12);

  g.generateTexture('pet', 100, 100);
  g.destroy();
}

export function generateFoodSprite(scene) {
  const g = scene.make.graphics({ add: false });

  // Apple
  g.fillStyle(0xEF4444);
  g.fillCircle(20, 22, 16);
  // Leaf
  g.fillStyle(0x22C55E);
  g.fillTriangle(20, 6, 28, 2, 24, 14);
  // Stem
  g.lineStyle(2, 0x92400E);
  g.lineBetween(20, 6, 20, 12);

  g.generateTexture('food', 40, 40);
  g.destroy();
}

export function generateButtonSprite(scene) {
  const g = scene.make.graphics({ add: false });

  // Rounded rectangle button
  g.fillStyle(0x22C55E);
  g.fillRoundedRect(0, 0, 200, 60, 16);

  // Subtle highlight on top
  g.fillStyle(0x4ADE80, 0.3);
  g.fillRoundedRect(4, 4, 192, 28, 12);

  g.generateTexture('button', 200, 60);
  g.destroy();
}

export function generateBgSprite(scene) {
  const g = scene.make.graphics({ add: false });

  // Sky gradient (simulated with rectangles)
  const colors = [0x87CEEB, 0x98D8F0, 0xA8E2F5, 0xB8ECF8, 0xC8F6FB, 0x90EE90, 0x7BC47B, 0x6BAA6B];
  const segH = 75;
  for (let i = 0; i < colors.length; i++) {
    g.fillStyle(colors[i]);
    g.fillRect(0, i * segH, 400, segH);
  }

  // Sun
  g.fillStyle(0xFFF176, 0.8);
  g.fillCircle(320, 80, 40);
  g.fillStyle(0xFFFF00, 0.3);
  g.fillCircle(320, 80, 55);

  // Clouds
  g.fillStyle(0xFFFFFF, 0.7);
  g.fillCircle(80, 60, 25);
  g.fillCircle(105, 55, 30);
  g.fillCircle(130, 62, 22);

  g.fillCircle(220, 100, 20);
  g.fillCircle(240, 95, 25);
  g.fillCircle(260, 100, 18);

  g.generateTexture('bg', 400, 600);
  g.destroy();
}
