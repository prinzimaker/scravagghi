import { WeaponDefinitions, WeaponType } from '../weapons/WeaponSystem.js';

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
   * @param {Object} weaponDef - Definizione dell'arma (opzionale)
   * @returns {Object} Risultato della simulazione
   */
  static simulateShot(startX, startY, angle, power, maxVelocity, terrain, beetles, rng, weaponDef = null) {
    // Usa i valori dell'arma se disponibili, altrimenti default
    const gravity = weaponDef ? weaponDef.gravity : Physics.GRAVITY;
    const actualMaxVelocity = weaponDef ? weaponDef.maxVelocity : maxVelocity;
    const bounces = weaponDef ? weaponDef.bounces : false;
    const bounceDecay = weaponDef ? (weaponDef.bounceDecay || 0.6) : 0.6;
    const maxBounces = weaponDef ? (weaponDef.maxBounces || 5) : 5;
    const explodeOnImpact = weaponDef ? weaponDef.explodeOnImpact : true;

    // Calcola velocità iniziale
    const velocity = power * actualMaxVelocity;
    const angleRad = (angle * Math.PI) / 180;
    let vx = Math.cos(angleRad) * velocity;
    let vy = -Math.sin(angleRad) * velocity; // -sin perché Y cresce verso il basso

    // Stato iniziale
    let x = startX;
    let y = startY;
    const trajectory = [{ x, y, t: 0, event: 'start' }];

    let impactPoint = null;
    let hitBeetle = null;
    let maxHeight = startY;
    let time = 0;
    let bounceCount = 0;

    // Simula fino a impatto o fuori schermo
    const maxIterations = 2000; // Aumentato per traiettorie più lunghe
    for (let i = 0; i < maxIterations; i++) {
      // Aggiorna velocità (gravità)
      vy += gravity * Physics.TIME_STEP;

      // Aggiorna posizione
      const prevX = x;
      const prevY = y;
      x += vx * Physics.TIME_STEP;
      y += vy * Physics.TIME_STEP;
      time += Physics.TIME_STEP;

      // Track max height
      if (y < maxHeight) maxHeight = y;

      // Check fuori schermo
      if (x < 0 || x > terrain.width || y > terrain.height) {
        trajectory.push({ x, y, t: time, event: 'offscreen' });
        break;
      }

      // Check collisione con terreno
      if (terrain.isSolid(Math.floor(x), Math.floor(y))) {
        if (bounces && bounceCount < maxBounces && !explodeOnImpact) {
          // Calcola la normale del terreno per il rimbalzo
          const normal = Physics.getTerrainNormal(terrain, Math.floor(x), Math.floor(y));

          // Rimbalza
          const dotProduct = vx * normal.x + vy * normal.y;
          vx = (vx - 2 * dotProduct * normal.x) * bounceDecay;
          vy = (vy - 2 * dotProduct * normal.y) * bounceDecay;

          // Torna alla posizione precedente e sposta leggermente nella direzione della normale
          x = prevX + normal.x * 2;
          y = prevY + normal.y * 2;

          bounceCount++;
          trajectory.push({ x, y, t: time, event: 'bounce', bounceCount });

          // Se la velocità è troppo bassa, fermati
          const speed = Math.sqrt(vx * vx + vy * vy);
          if (speed < 20) {
            impactPoint = { x, y };
            trajectory.push({ x, y, t: time, event: 'stopped' });
            break;
          }
        } else {
          // Impatto finale
          impactPoint = { x, y };
          trajectory.push({ x, y, t: time, event: 'impact' });
          break;
        }
      } else {
        trajectory.push({ x, y, t: time });
      }

      // Check collisione con beetle (solo se esplode all'impatto)
      // Usa ray casting per proiettili veloci che potrebbero saltare i giocatori
      if (explodeOnImpact) {
        // Grace period: ignora collisioni troppo vicine al punto di partenza
        const distanceFromStart = Math.sqrt(
          Math.pow(x - startX, 2) + Math.pow(y - startY, 2)
        );
        const gracePeriodOver = distanceFromStart > 40;

        if (gracePeriodOver) {
          for (const beetle of beetles) {
            if (!beetle.isAlive) continue;

            // Hitbox rettangolare del beetle (x,y è ai piedi del beetle)
            const beetleLeft = beetle.x - beetle.width / 2 - 4;
            const beetleRight = beetle.x + beetle.width / 2 + 4;
            const beetleTop = beetle.y - beetle.height - 4;
            const beetleBottom = beetle.y + 4;

            // Ray casting: controlla se la linea da prevX,prevY a x,y interseca l'hitbox
            const hit = Physics.lineIntersectsRect(
              prevX, prevY, x, y,
              beetleLeft, beetleTop, beetleRight, beetleBottom
            );

            if (hit) {
              impactPoint = { x: hit.x, y: hit.y };
              hitBeetle = beetle;
              trajectory.push({ x: hit.x, y: hit.y, t: time, event: 'hit_player' });
              break;
            }
          }
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
      duration: time,
      bounceCount
    };
  }

  /**
   * Controlla se un segmento di linea interseca un rettangolo
   * Restituisce il punto di intersezione più vicino o null
   */
  static lineIntersectsRect(x1, y1, x2, y2, rectLeft, rectTop, rectRight, rectBottom) {
    // Controlla se il punto finale è dentro il rettangolo
    if (x2 >= rectLeft && x2 <= rectRight && y2 >= rectTop && y2 <= rectBottom) {
      return { x: x2, y: y2 };
    }

    // Controlla intersezione con ogni lato del rettangolo
    const intersections = [];

    // Lato sinistro
    const leftHit = Physics.lineIntersectsLine(x1, y1, x2, y2, rectLeft, rectTop, rectLeft, rectBottom);
    if (leftHit) intersections.push(leftHit);

    // Lato destro
    const rightHit = Physics.lineIntersectsLine(x1, y1, x2, y2, rectRight, rectTop, rectRight, rectBottom);
    if (rightHit) intersections.push(rightHit);

    // Lato superiore
    const topHit = Physics.lineIntersectsLine(x1, y1, x2, y2, rectLeft, rectTop, rectRight, rectTop);
    if (topHit) intersections.push(topHit);

    // Lato inferiore
    const bottomHit = Physics.lineIntersectsLine(x1, y1, x2, y2, rectLeft, rectBottom, rectRight, rectBottom);
    if (bottomHit) intersections.push(bottomHit);

    if (intersections.length === 0) return null;

    // Restituisci il punto più vicino a (x1, y1)
    let closest = intersections[0];
    let closestDist = Math.sqrt(Math.pow(closest.x - x1, 2) + Math.pow(closest.y - y1, 2));

    for (let i = 1; i < intersections.length; i++) {
      const dist = Math.sqrt(Math.pow(intersections[i].x - x1, 2) + Math.pow(intersections[i].y - y1, 2));
      if (dist < closestDist) {
        closest = intersections[i];
        closestDist = dist;
      }
    }

    return closest;
  }

  /**
   * Controlla se due segmenti di linea si intersecano
   * Restituisce il punto di intersezione o null
   */
  static lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (Math.abs(denom) < 0.0001) return null; // Linee parallele

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      return {
        x: x1 + ua * (x2 - x1),
        y: y1 + ua * (y2 - y1)
      };
    }

    return null;
  }

  /**
   * Calcola la normale del terreno in un punto
   */
  static getTerrainNormal(terrain, x, y) {
    // Campiona i punti circostanti per determinare la normale
    const samples = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 }
    ];

    let nx = 0;
    let ny = 0;

    for (const sample of samples) {
      const sx = x + sample.dx;
      const sy = y + sample.dy;
      if (!terrain.isSolid(sx, sy)) {
        nx += sample.dx;
        ny += sample.dy;
      }
    }

    // Normalizza
    const length = Math.sqrt(nx * nx + ny * ny);
    if (length > 0) {
      nx /= length;
      ny /= length;
    } else {
      // Default: normale verso l'alto
      nx = 0;
      ny = -1;
    }

    return { x: nx, y: ny };
  }

  /**
   * Calcola la percentuale di danno in base alla distanza dall'esplosione
   * Curva personalizzata: 0px=100%, 20px=60%, 40px=20%
   * @param {number} distance - Distanza dal centro dell'esplosione in pixel
   * @param {number} radius - Raggio dell'esplosione (default 40)
   * @returns {number} Percentuale di danno [0-100]
   */
  static calculateDamagePercent(distance, radius = 40) {
    // Colpo diretto (entro 5 pixel) = 100%
    if (distance <= 5) return 100;

    // Curva lineare basata sul raggio dell'esplosione
    // Al centro = 100%, al bordo = 20%
    const falloffRate = 80 / radius; // Quanto danno perde per pixel
    const damagePercent = Math.max(0, 100 - (distance * falloffRate));

    return damagePercent;
  }

  /**
   * Applica danni da esplosione a tutti i beetle nell'area
   * Il danno è calcolato come percentuale del HP massimo del beetle
   * @param {number} centerX - Centro X esplosione
   * @param {number} centerY - Centro Y esplosione
   * @param {number} radius - Raggio esplosione
   * @param {Array<Beetle>} beetles - Array di scarabei
   * @param {Object} weaponDef - Definizione dell'arma (opzionale)
   * @returns {Array} Array di danni applicati {beetle, damage, distance, percent, knockback}
   */
  static applyExplosionDamage(centerX, centerY, radius, beetles, weaponDef = null) {
    const damages = [];
    const baseDamagePercent = weaponDef ? weaponDef.damage : 30; // Danno base dell'arma (default pallina di cacca)
    const knockbackMultiplier = weaponDef ? weaponDef.knockbackMultiplier : 1.0;

    for (const beetle of beetles) {
      if (!beetle.isAlive) continue;

      const dx = beetle.x - centerX;
      const dy = beetle.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < radius) {
        // Calcola percentuale di danno in base alla distanza
        const distancePercent = Physics.calculateDamagePercent(distance, radius);

        // Calcola il danno effettivo:
        // (danno base arma) * (percentuale distanza / 100)
        // Es: Bazooka (85%) a distanza 0 = 85% del max HP
        // Es: Bazooka (85%) a distanza che da 60% = 85% * 0.6 = 51% del max HP
        const effectiveDamagePercent = baseDamagePercent * (distancePercent / 100);

        // Applica la percentuale all'HP massimo del beetle
        const damage = Math.ceil((beetle.maxHp * effectiveDamagePercent) / 100);

        if (damage > 0) {
          beetle.takeDamage(damage);
          damages.push({
            beetle,
            damage,
            distance,
            percent: effectiveDamagePercent,
            knockbackMultiplier
          });
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
