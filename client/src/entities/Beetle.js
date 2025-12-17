/**
 * Rappresenta uno scarabeo nel gioco
 */
export class Beetle {
  constructor(id, playerId, team, x, y) {
    this.id = id;
    this.playerId = playerId;
    this.team = team; // 1 o 2
    this.x = x;
    this.y = y;
    this.hp = 100;
    this.maxHp = 100;
    this.flipped = false; // true se guarda a sinistra
    this.enhancements = [];
    this.isAlive = true;

    // Dimensioni
    this.width = 32;
    this.height = 24;

    // Rendering
    this.sprite = null;
    this.hpBar = null;
  }

  /**
   * Applica danno allo scarabeo
   */
  takeDamage(damage) {
    this.hp = Math.max(0, this.hp - damage);
    if (this.hp <= 0) {
      this.isAlive = false;
    }
    return this.hp;
  }

  /**
   * Cura lo scarabeo
   */
  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp;
  }

  /**
   * Muove lo scarabeo su una nuova posizione
   */
  moveTo(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Aggiorna la direzione dello scarabeo
   */
  setFlipped(flipped) {
    this.flipped = flipped;
  }

  /**
   * Aggiunge un potenziamento
   */
  addEnhancement(enhancement) {
    this.enhancements.push(enhancement);
  }

  /**
   * Rimuove un potenziamento
   */
  removeEnhancement(enhancementType) {
    this.enhancements = this.enhancements.filter(e => e.type !== enhancementType);
  }

  /**
   * Controlla se ha un certo potenziamento
   */
  hasEnhancement(enhancementType) {
    return this.enhancements.some(e => e.type === enhancementType);
  }

  /**
   * Crea la rappresentazione sprite in Phaser
   */
  createSprite(scene) {
    // Per ora usiamo un rettangolo colorato
    // In seguito sostituiremo con sprite animati
    const color = this.team === 1 ? 0x00ff00 : 0xff0000;

    this.sprite = scene.add.rectangle(
      this.x,
      this.y,
      this.width,
      this.height,
      color
    );
    this.sprite.setOrigin(0.5, 1); // Origine ai piedi

    // Barra HP (più grande e visibile)
    const hpBarHeight = 6;
    const hpBarY = this.y - this.height - 8;

    this.hpBarBg = scene.add.rectangle(
      this.x - this.width / 2,
      hpBarY,
      this.width,
      hpBarHeight,
      0x000000
    );
    this.hpBarBg.setOrigin(0, 0);
    this.hpBarBg.setStrokeStyle(1, 0xffffff, 0.5);

    this.hpBar = scene.add.rectangle(
      this.x - this.width / 2,
      hpBarY,
      this.width * (this.hp / this.maxHp),
      hpBarHeight,
      0x00ff00
    );
    this.hpBar.setOrigin(0, 0);
  }

  /**
   * Aggiorna la posizione dello sprite
   */
  updateSprite() {
    if (this.sprite) {
      this.sprite.setPosition(this.x, this.y);
      // Note: setFlipX() non funziona con Rectangle, solo con Sprite
      // Verrà riabilitato quando useremo sprite veri
    }
    if (this.hpBar && this.hpBarBg) {
      const hpBarHeight = 6;
      const hpBarY = this.y - this.height - 8;
      const hpWidth = this.width * (this.hp / this.maxHp);
      this.hpBar.setSize(hpWidth, hpBarHeight);
      this.hpBar.setPosition(this.x - this.width / 2, hpBarY);
      this.hpBarBg.setPosition(this.x - this.width / 2, hpBarY);

      // Cambia colore in base agli HP
      if (this.hp < 30) {
        this.hpBar.setFillStyle(0xff0000);
      } else if (this.hp < 60) {
        this.hpBar.setFillStyle(0xffff00);
      } else {
        this.hpBar.setFillStyle(0x00ff00);
      }
    }

    // Nascondi se morto
    if (!this.isAlive && this.sprite) {
      this.sprite.setAlpha(0.3);
      if (this.hpBar) this.hpBar.setVisible(false);
      if (this.hpBarBg) this.hpBarBg.setVisible(false);
    }
  }

  /**
   * Distrugge lo sprite
   */
  destroySprite() {
    if (this.sprite) this.sprite.destroy();
    if (this.hpBar) this.hpBar.destroy();
    if (this.hpBarBg) this.hpBarBg.destroy();
  }
}
