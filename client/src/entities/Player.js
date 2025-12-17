/**
 * Rappresenta un giocatore nella partita
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

    // Armi disponibili
    this.weapons = ['grenade']; // Per ora solo granata

    // Posizione
    this.position = { x, y };

    // Stato
    this.isActive = false; // true quando è il suo turno
    this.hasFadedOut = false; // true quando l'animazione di fade è stata avviata

    // Dimensioni
    this.width = 32;
    this.height = 24;

    // Rendering (Phaser sprites)
    this.sprite = null;
    this.hpBar = null;
    this.hpBarBg = null;
    this.nameText = null;
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
    this.position.x = x;
    this.position.y = y;
  }

  /**
   * Crea lo sprite in Phaser
   */
  createSprite(scene) {
    // Colore in base al team
    const color = this.team_id === 0 ? 0x00ff00 : 0xff0000;

    // Sprite principale (rettangolo colorato)
    this.sprite = scene.add.rectangle(
      this.position.x,
      this.position.y,
      this.width,
      this.height,
      color
    );
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setDepth(10); // Giocatori sempre davanti a tutto

    // Barra HP
    const hpBarHeight = 6;
    const hpBarY = this.position.y - this.height - 8;

    this.hpBarBg = scene.add.rectangle(
      this.position.x - this.width / 2,
      hpBarY,
      this.width,
      hpBarHeight,
      0x000000
    );
    this.hpBarBg.setOrigin(0, 0);
    this.hpBarBg.setStrokeStyle(1, 0xffffff, 0.5);
    this.hpBarBg.setDepth(11); // Barra HP sopra i giocatori

    this.hpBar = scene.add.rectangle(
      this.position.x - this.width / 2,
      hpBarY,
      this.width * (this.health / this.maxHealth),
      hpBarHeight,
      0x00ff00
    );
    this.hpBar.setOrigin(0, 0);
    this.hpBar.setDepth(11); // Barra HP sopra i giocatori

    // Nome del giocatore (opzionale)
    this.nameText = scene.add.text(
      this.position.x,
      this.position.y - this.height - 20,
      this.name,
      {
        fontSize: '10px',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    this.nameText.setOrigin(0.5);
    this.nameText.setVisible(false); // Nascosto di default
    this.nameText.setDepth(12); // Nome sopra tutto
  }

  /**
   * Aggiorna lo sprite
   */
  updateSprite() {
    if (this.sprite) {
      this.sprite.setPosition(this.position.x, this.position.y);

      // Evidenzia se è attivo
      if (this.isActive) {
        this.sprite.setStrokeStyle(3, 0xffff00);
      } else {
        this.sprite.setStrokeStyle(0);
      }
    }

    if (this.hpBar && this.hpBarBg) {
      const hpBarHeight = 6;
      const hpBarY = this.position.y - this.height - 8;
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

    if (this.nameText) {
      this.nameText.setPosition(this.position.x, this.position.y - this.height - 20);
      this.nameText.setVisible(this.isActive);
    }

    // Se morto, nascondi UI (il fade out è gestito dal metodo fadeOut)
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

    // Nascondi subito le UI
    if (this.hpBar) this.hpBar.setVisible(false);
    if (this.hpBarBg) this.hpBarBg.setVisible(false);
    if (this.nameText) this.nameText.setVisible(false);

    // Anima il fade dello sprite
    if (this.sprite) {
      scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        duration: 1500,
        ease: 'Power2'
      });
    }
  }

  /**
   * Distrugge lo sprite
   */
  destroySprite() {
    if (this.sprite) this.sprite.destroy();
    if (this.hpBar) this.hpBar.destroy();
    if (this.hpBarBg) this.hpBarBg.destroy();
    if (this.nameText) this.nameText.destroy();
  }
}
