/**
 * Gestisce il terreno distruttibile come bitmap mask
 * Ogni pixel può essere solido o vuoto
 */
export class TerrainMask {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height);
    this.data.fill(0); // 0 = vuoto, 1 = solido
  }

  /**
   * Controlla se un pixel è solido
   */
  isSolid(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    const index = Math.floor(y) * this.width + Math.floor(x);
    return this.data[index] === 1;
  }

  /**
   * Imposta un pixel come solido o vuoto
   */
  setPixel(x, y, solid) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    const index = Math.floor(y) * this.width + Math.floor(x);
    this.data[index] = solid ? 1 : 0;
  }

  /**
   * Scava un cratere circolare nel terreno
   */
  excavate(centerX, centerY, radius) {
    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(this.width, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(this.height, Math.ceil(centerY + radius));

    const radiusSq = radius * radius;
    const destroyed = [];

    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distSq = dx * dx + dy * dy;

        if (distSq <= radiusSq && this.isSolid(x, y)) {
          this.setPixel(x, y, false);
          destroyed.push({ x, y });
        }
      }
    }

    return destroyed;
  }

  /**
   * Genera un terreno collinare procedurale
   */
  generateHilly(seed, amplitude = 80, frequency = 0.01) {
    const { DeterministicRandom } = require('../utils/DeterministicRandom.js');
    const rng = new DeterministicRandom(seed);

    // Genera alcune colline casuali
    const numHills = rng.nextInt(3, 6);
    const hills = [];

    for (let i = 0; i < numHills; i++) {
      hills.push({
        x: rng.nextFloat(0, this.width),
        height: rng.nextFloat(amplitude * 0.5, amplitude * 1.5),
        width: rng.nextFloat(100, 300)
      });
    }

    // Riempie il terreno
    for (let x = 0; x < this.width; x++) {
      let groundY = this.height * 0.7; // Base height

      // Somma le colline
      for (const hill of hills) {
        const dist = Math.abs(x - hill.x);
        if (dist < hill.width) {
          const factor = Math.cos((dist / hill.width) * Math.PI);
          groundY -= hill.height * factor;
        }
      }

      // Riempie dalla groundY in giù
      for (let y = Math.floor(groundY); y < this.height; y++) {
        this.setPixel(x, y, true);
      }
    }
  }

  /**
   * Trova il punto più alto del terreno in una colonna x
   */
  getGroundY(x) {
    if (x < 0 || x >= this.width) return this.height;

    for (let y = 0; y < this.height; y++) {
      if (this.isSolid(x, y)) {
        return y;
      }
    }
    return this.height;
  }
}
