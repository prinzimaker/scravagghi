/**
 * Sistema di fisica per proiettili balistici e collisioni
 */
export class Physics {
  static GRAVITY = 980; // pixels/s^2 (simula 9.8 m/s^2)
  static TIME_STEP = 1 / 60; // 60 FPS

  /**
   * Simula un colpo balistico e restituisce la traiettoria completa
   * @param {number} startX - Posizione X iniziale
   * @param {number} startY - Posizione Y iniziale
   * @param {number} angle - Angolo in gradi (0 = orizzontale destra, 90 = su, -90 = giù)
   * @param {number} power - Potenza [0, 1]
   * @param {number} maxVelocity - Velocità massima in pixels/s
   * @param {TerrainMask} terrain - Mappa del terreno
   * @param {Array<Beetle>} beetles - Array di scarabei per collision detection
   * @param {DeterministicRandom} rng - Generatore casuale deterministico
   * @returns {Object} Risultato della simulazione
   */
  static simulateShot(startX, startY, angle, power, maxVelocity, terrain, beetles, rng) {
    // Calcola velocità iniziale
    const velocity = power * maxVelocity;
    const angleRad = (angle * Math.PI) / 180;
    let vx = Math.cos(angleRad) * velocity;
    let vy = -Math.sin(angleRad) * velocity; // -sin perché Y cresce verso il basso

    // Stato iniziale
    let x = startX;
    let y = startY;
    const trajectory = [{ x, y, t: 0 }];

    let impactPoint = null;
    let hitBeetle = null;
    let maxHeight = startY;
    let time = 0;

    // Simula fino a impatto o fuori schermo
    const maxIterations = 1000;
    for (let i = 0; i < maxIterations; i++) {
      // Aggiorna velocità (gravità)
      vy += Physics.GRAVITY * Physics.TIME_STEP;

      // Aggiorna posizione
      x += vx * Physics.TIME_STEP;
      y += vy * Physics.TIME_STEP;
      time += Physics.TIME_STEP;

      trajectory.push({ x, y, t: time });

      // Track max height
      if (y < maxHeight) maxHeight = y;

      // Check fuori schermo
      if (x < 0 || x > terrain.width || y > terrain.height) {
        break;
      }

      // Check collisione con terreno
      if (terrain.isSolid(Math.floor(x), Math.floor(y))) {
        impactPoint = { x, y };
        break;
      }

      // Check collisione con beetle
      for (const beetle of beetles) {
        if (!beetle.isAlive) continue;

        const dx = x - beetle.x;
        const dy = y - beetle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < beetle.width / 2) {
          impactPoint = { x, y };
          hitBeetle = beetle;
          break;
        }
      }

      if (hitBeetle) break;
    }

    return {
      trajectory,
      impactPoint,
      hitBeetle,
      maxHeight: startY - maxHeight,
      distance: impactPoint ? Math.sqrt(
        Math.pow(impactPoint.x - startX, 2) +
        Math.pow(impactPoint.y - startY, 2)
      ) : 0,
      duration: time
    };
  }

  /**
   * Calcola il danno in base alla distanza dall'esplosione
   * @param {number} distance - Distanza dal centro dell'esplosione
   * @param {number} explosionRadius - Raggio dell'esplosione
   * @param {number} maxDamage - Danno massimo al centro
   * @returns {number} Danno calcolato
   */
  static calculateExplosionDamage(distance, explosionRadius, maxDamage) {
    if (distance >= explosionRadius) return 0;

    // Danno diminuisce linearmente con la distanza
    const factor = 1 - (distance / explosionRadius);
    return Math.floor(maxDamage * factor);
  }

  /**
   * Applica danni da esplosione a tutti i beetle nell'area
   * @param {number} centerX - Centro X esplosione
   * @param {number} centerY - Centro Y esplosione
   * @param {number} radius - Raggio esplosione
   * @param {number} maxDamage - Danno massimo
   * @param {Array<Beetle>} beetles - Array di scarabei
   * @returns {Array} Array di danni applicati {beetle, damage}
   */
  static applyExplosionDamage(centerX, centerY, radius, maxDamage, beetles) {
    const damages = [];

    for (const beetle of beetles) {
      if (!beetle.isAlive) continue;

      const dx = beetle.x - centerX;
      const dy = beetle.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < radius) {
        const damage = Physics.calculateExplosionDamage(distance, radius, maxDamage);
        if (damage > 0) {
          beetle.takeDamage(damage);
          damages.push({ beetle, damage, distance });
        }
      }
    }

    return damages;
  }

  /**
   * Applica gravità a uno scarabeo e lo fa cadere sul terreno
   * @param {Beetle} beetle - Scarabeo da far cadere
   * @param {TerrainMask} terrain - Terreno
   * @returns {boolean} True se è caduto, false se era già a terra
   */
  static applyGravityToBeetle(beetle, terrain) {
    if (!beetle.isAlive) return false;

    // Controlla se ha terreno sotto
    const groundY = terrain.getGroundY(Math.floor(beetle.x));

    if (beetle.y < groundY) {
      // Deve cadere
      let y = beetle.y;
      while (y < groundY && !terrain.isSolid(Math.floor(beetle.x), Math.floor(y))) {
        y++;
      }
      beetle.moveTo(beetle.x, y);
      return true;
    }

    return false;
  }

  /**
   * Trova una posizione valida sul terreno per uno scarabeo
   * @param {number} x - Posizione X desiderata
   * @param {TerrainMask} terrain - Terreno
   * @returns {number} Posizione Y valida
   */
  static findGroundPosition(x, terrain) {
    const groundY = terrain.getGroundY(Math.floor(x));
    return groundY;
  }
}
