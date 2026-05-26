const { createCanvas } = require('canvas');
const fs = require('fs');

function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const r = size * 0.22;
  const x = size / 2;
  const y = size / 2;

  // Rounded square background
  ctx.beginPath();
  ctx.moveTo(x - r, 0 + size * 0.04);
  ctx.arcTo(size - size * 0.04, size * 0.04, size - size * 0.04, size - size * 0.04, r);
  ctx.arcTo(size - size * 0.04, size - size * 0.04, size * 0.04, size - size * 0.04, r);
  ctx.arcTo(size * 0.04, size - size * 0.04, size * 0.04, size * 0.04, r);
  ctx.arcTo(size * 0.04, size * 0.04, size - size * 0.04, size * 0.04, r);
  ctx.closePath();

  // Deep black background
  ctx.fillStyle = '#0a0a0a';
  ctx.fill();

  // Subtle inner glow
  const gradient = ctx.createRadialGradient(x, y * 0.7, 0, x, y, size * 0.5);
  gradient.addColorStop(0, 'rgba(255,255,255,0.07)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fill();

  // Elegant P letterform
  const fontSize = size * 0.52;
  ctx.fillStyle = '#ffffff';
  ctx.font = `300 ${fontSize}px "Georgia", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('P', size / 2, size / 2 + size * 0.03);

  return canvas.toBuffer('image/png');
}

fs.writeFileSync('public/icon-192.png', createIcon(192));
fs.writeFileSync('public/icon-512.png', createIcon(512));

console.log('Icons created!');