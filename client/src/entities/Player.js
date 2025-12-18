import { WeaponInventory } from '../weapons/WeaponSystem.js';

/**
 * Rappresenta un giocatore (scarafaggio) nella partita
 */
export class Player {
  constructor(id, name, team_id, team_element, x, y) {
    // Identificazione
    this.id = id;
    this.name = name;
    this.team_id = team_id; // 0 o 1
    this.team_element = team_element; // 1, 2, 3, 4...

    // Stats
    this.health = 100;
    this.maxHealth = 100;

    // Punteggio
    this.score = 0;

    // Inventario armi
    this.weaponInventory = new WeaponInventory();

    // Posizione
    this.position = { x, y };
    this.lastX = x; // Per rilevare movimento

    // Stato
    this.isActive = false; // true quando è il suo turno
    this.hasFadedOut = false; // true quando l'animazione di fade è stata avviata
    this.isMoving = false;
    this.legAnimPhase = 0; // Fase animazione zampe

    // Dimensioni scarafaggio (raddoppiate)
    this.width = 40;
    this.height = 24;
    this.spriteScale = 2; // Scala dello sprite

    // Rendering (Phaser sprites)
    this.container = null;
    this.body = null;
    this.head = null;
    this.bandana = null; // Bandana colorata per il team
    this.legs = []; // Array di zampe
    this.antennae = [];
    this.hpBar = null;
    this.hpBarBg = null;
    this.nameText = null;
  }

  /**
   * Aggiunge/sottrae punteggio
   */
  addScore(points) {
    this.score += points;
    // Score può andare in negativo
    return this.score;
  }

  /**
   * Ottiene il punteggio
   */
  getScore() {
    return this.score;
  }

  /**
   * Applica danno al giocatore
   */
  takeDamage(damage) {
    this.health = Math.max(0, this.health - damage);
    return this.health;
  }

  /**
   * Cura il giocatore
   */
  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this.health;
  }

  /**
   * Controlla se il giocatore è vivo
   */
  isAlive() {
    return this.health > 0;
  }

  /**
   * Controlla se il giocatore è morto
   */
  isDead() {
    return this.health <= 0;
  }

  /**
   * Muove il giocatore
   */
  moveTo(x, y) {
    this.lastX = this.position.x;
    this.position.x = x;
    this.position.y = y;
  }

  /**
   * Crea lo sprite scarafaggio in Phaser
   */
  createSprite(scene) {
    this.scene = scene;

    // Colori UGUALI per tutti gli scarafaggi (marrone naturale)
    const bodyColor = 0x4a3728;      // Marrone scuro corpo
    const shellColor = 0x6b4423;     // Marrone guscio
    const legColor = 0x3d2817;       // Marrone zampe

    // Colore della bandana/cappello in base al team
    const teamColor = this.team_id === 0 ? 0x22aa22 : 0xcc2222; // Verde o Rosso
    const teamColorDark = this.team_id === 0 ? 0x116611 : 0x881111;

    // Container per tutto lo scarafaggio
    this.container = scene.add.container(this.position.x, this.position.y);
    this.container.setDepth(10);
    this.container.setScale(this.spriteScale); // Scala raddoppiata

    // Corpo principale (ellisse)
    this.body = scene.add.ellipse(0, -6, 16, 10, shellColor);
    this.body.setStrokeStyle(1, bodyColor);
    this.container.add(this.body);

    // Testa
    this.head = scene.add.ellipse(8, -6, 6, 5, bodyColor);
    this.container.add(this.head);

    // BANDANA/CAPPELLO colorato sulla testa per indicare il team
    // Piccola bandana che avvolge la testa
    this.bandana = scene.add.graphics();
    this.bandana.fillStyle(teamColor, 1);
    // Fascia sulla testa
    this.bandana.fillRect(5, -10, 8, 3);
    // Nodo della bandana
    this.bandana.fillStyle(teamColorDark, 1);
    this.bandana.fillTriangle(13, -10, 16, -12, 13, -7);
    this.container.add(this.bandana);

    // Antenne
    const antenna1 = scene.add.graphics();
    antenna1.lineStyle(1, legColor);
    antenna1.moveTo(10, -11);
    antenna1.lineTo(14, -15);
    this.container.add(antenna1);
    this.antennae.push(antenna1);

    const antenna2 = scene.add.graphics();
    antenna2.lineStyle(1, legColor);
    antenna2.moveTo(10, -4);
    antenna2.lineTo(14, -2);
    this.container.add(antenna2);
    this.antennae.push(antenna2);

    // Zampe (6 zampe - 3 per lato)
    // Le zampe sono graphics objects che animeremo
    for (let i = 0; i < 6; i++) {
      const leg = scene.add.graphics();
      leg.lineStyle(2, legColor);
      this.legs.push(leg);
      this.container.add(leg);
    }

    // Disegna zampe nella posizione iniziale
    this.drawLegs(0);

    // Occhietti
    const eye1 = scene.add.circle(9, -7, 1.5, 0xffffff);
    const eye2 = scene.add.circle(9, -5, 1.5, 0xffffff);
    this.container.add(eye1);
    this.container.add(eye2);

    // Pupille
    const pupil1 = scene.add.circle(9.5, -7, 0.8, 0x000000);
    const pupil2 = scene.add.circle(9.5, -5, 0.8, 0x000000);
    this.container.add(pupil1);
    this.container.add(pupil2);

    // Linea centrale del guscio
    const shellLine = scene.add.graphics();
    shellLine.lineStyle(1, bodyColor);
    shellLine.moveTo(-6, -6);
    shellLine.lineTo(6, -6);
    this.container.add(shellLine);

    // Barra HP (sotto lo scarafaggio) - dimensioni adattate alla scala
    const hpBarHeight = 5;
    const hpBarY = 10;

    this.hpBarBg = scene.add.rectangle(
      this.position.x - this.width / 2,
      this.position.y + hpBarY,
      this.width,
      hpBarHeight,
      0x000000
    );
    this.hpBarBg.setOrigin(0, 0);
    this.hpBarBg.setStrokeStyle(1, 0xffffff, 0.5);
    this.hpBarBg.setDepth(11);

    this.hpBar = scene.add.rectangle(
      this.position.x - this.width / 2,
      this.position.y + hpBarY,
      this.width * (this.health / this.maxHealth),
      hpBarHeight,
      0x00ff00
    );
    this.hpBar.setOrigin(0, 0);
    this.hpBar.setDepth(11);

    // Nome del giocatore (sopra lo scarafaggio) con colore team
    const nameColor = this.team_id === 0 ? '#44ff44' : '#ff4444';
    this.nameText = scene.add.text(
      this.position.x,
      this.position.y - this.height - 15,
      this.name,
      {
        fontSize: '12px',
        fill: nameColor,
        stroke: '#000000',
        strokeThickness: 2,
        fontStyle: 'bold'
      }
    );
    this.nameText.setOrigin(0.5);
    this.nameText.setVisible(true);
    this.nameText.setDepth(12);
  }

  /**
   * Disegna le zampe in una determinata fase di animazione
   */
  drawLegs(phase) {
    if (!this.legs || this.legs.length < 6) return;

    const legLength = 6;
    const bodyOffsetY = -6;
    const legColor = 0x3d2817; // Marrone zampe (uguale per tutti)

    // Posizioni base delle zampe sul corpo
    const legPositions = [
      { x: -4, y: bodyOffsetY - 3 },  // Zampa anteriore sinistra
      { x: -4, y: bodyOffsetY + 3 },  // Zampa anteriore destra
      { x: 0, y: bodyOffsetY - 4 },   // Zampa centrale sinistra
      { x: 0, y: bodyOffsetY + 4 },   // Zampa centrale destra
      { x: 4, y: bodyOffsetY - 3 },   // Zampa posteriore sinistra
      { x: 4, y: bodyOffsetY + 3 },   // Zampa posteriore destra
    ];

    // Animazione: le zampe si muovono in gruppi alternati
    const wave = Math.sin(phase * 0.3) * 4;

    this.legs.forEach((leg, i) => {
      leg.clear();
      leg.lineStyle(1.5, legColor);

      const pos = legPositions[i];
      const isLeftSide = i % 2 === 0;
      const groupOffset = (i < 2 || i >= 4) ? wave : -wave;

      // Punto di partenza (sul corpo)
      const startX = pos.x;
      const startY = pos.y;

      // Punto finale (estremità zampa)
      const endX = startX + (isLeftSide ? -legLength : legLength);
      const endY = startY + groupOffset * 0.5;

      // Disegna zampa con ginocchio
      const kneeX = startX + (isLeftSide ? -3 : 3);
      const kneeY = startY - 2 + groupOffset * 0.3;

      leg.moveTo(startX, startY);
      leg.lineTo(kneeX, kneeY);
      leg.lineTo(endX, endY);
      leg.strokePath();
    });
  }

  /**
   * Aggiorna lo sprite
   */
  updateSprite() {
    if (!this.container) return;

    // Rileva movimento
    const moved = Math.abs(this.position.x - this.lastX) > 0.5;

    if (moved) {
      this.isMoving = true;
      this.legAnimPhase += 0.5;
      this.drawLegs(this.legAnimPhase);

      // Direzione (flip orizzontale) - mantieni la scala base
      const direction = this.position.x > this.lastX ? 1 : -1;
      this.container.setScale(direction * this.spriteScale, this.spriteScale);
    } else {
      if (this.isMoving) {
        // Appena fermato, resetta zampe
        this.drawLegs(0);
        this.isMoving = false;
      }
    }

    this.lastX = this.position.x;

    // Aggiorna posizione container
    this.container.setPosition(this.position.x, this.position.y);

    // Evidenzia se è attivo (bordo giallo)
    if (this.body) {
      if (this.isActive) {
        this.body.setStrokeStyle(2, 0xffff00);
      } else {
        this.body.setStrokeStyle(1, 0x4a3728); // Marrone scuro
      }
    }

    // Aggiorna barra HP
    if (this.hpBar && this.hpBarBg) {
      const hpBarHeight = 5;
      const hpBarY = this.position.y + 10;
      const hpWidth = this.width * (this.health / this.maxHealth);

      this.hpBar.setSize(hpWidth, hpBarHeight);
      this.hpBar.setPosition(this.position.x - this.width / 2, hpBarY);
      this.hpBarBg.setPosition(this.position.x - this.width / 2, hpBarY);

      // Colore barra HP
      if (this.health < 30) {
        this.hpBar.setFillStyle(0xff0000);
      } else if (this.health < 60) {
        this.hpBar.setFillStyle(0xffff00);
      } else {
        this.hpBar.setFillStyle(0x00ff00);
      }
    }

    // Aggiorna nome
    if (this.nameText) {
      this.nameText.setPosition(this.position.x, this.position.y - this.height - 15);
      this.nameText.setVisible(true);
    }

    // Se morto, nascondi UI
    if (this.isDead()) {
      if (this.hpBar) this.hpBar.setVisible(false);
      if (this.hpBarBg) this.hpBarBg.setVisible(false);
      if (this.nameText) this.nameText.setVisible(false);
    }
  }

  /**
   * Avvia animazione di fade out quando il player muore
   */
  fadeOut(scene) {
    if (this.hasFadedOut || !this.isDead()) return;

    this.hasFadedOut = true;

    const fadeDuration = 2500;
    const targets = [this.container, this.hpBar, this.hpBarBg, this.nameText].filter(Boolean);

    if (targets.length > 0) {
      scene.tweens.add({
        targets: targets,
        alpha: 0,
        duration: fadeDuration,
        ease: 'Power2'
      });
    }
  }

  /**
   * Distrugge lo sprite
   */
  destroySprite() {
    if (this.container) this.container.destroy(true);
    if (this.hpBar) this.hpBar.destroy();
    if (this.hpBarBg) this.hpBarBg.destroy();
    if (this.nameText) this.nameText.destroy();
  }
}
