/**
 * Sistema di gestione armi per il gioco
 * Definisce tutte le armi disponibili e le loro caratteristiche
 */

export const WeaponType = {
  POOP_BALL: 'poop_ball',
  PISTOL: 'pistol',
  GRENADE: 'grenade',
  DYNAMITE: 'dynamite',
  BAZOOKA: 'bazooka'
};

/**
 * Definizioni delle armi con le loro caratteristiche
 */
export const WeaponDefinitions = {
  [WeaponType.POOP_BALL]: {
    name: 'Pallina di Cacca',
    icon: '💩',
    description: 'Sempre disponibile, arco parabolico',
    damage: 30, // 30% del max HP per colpo diretto
    maxAmmo: Infinity,
    startingAmmo: Infinity,
    // Fisica del proiettile
    gravity: 980, // Gravità normale
    maxVelocity: 800, // Velocità massima
    arcFactor: 1.0, // Fattore arco (riferimento base)
    explosionRadius: 40,
    // Comportamento speciale
    bounces: false,
    explodeOnImpact: true,
    delayedExplosion: false,
    explosionDelay: 0,
    knockbackMultiplier: 1.0,
    // Tipo di lancio
    launchType: 'throw' // throw = arco parabolico
  },

  [WeaponType.PISTOL]: {
    name: 'Pistola',
    icon: '🔫',
    description: 'Traiettoria dritta, gittata 4x',
    damage: 45, // 45% del max HP per colpo diretto
    maxAmmo: 20,
    startingAmmo: 10,
    // Fisica del proiettile - molto meno gravità per traiettoria dritta
    gravity: 245, // 1/4 della gravità = arco 4x più lungo
    maxVelocity: 1500, // Velocità alta per proiettile veloce
    arcFactor: 4.0, // Arco 4 volte più lungo
    explosionRadius: 20, // Esplosione più piccola
    // Comportamento speciale
    bounces: false,
    explodeOnImpact: true,
    delayedExplosion: false,
    explosionDelay: 0,
    knockbackMultiplier: 0.5,
    // Tipo di lancio
    launchType: 'shoot' // shoot = traiettoria dritta
  },

  [WeaponType.GRENADE]: {
    name: 'Bomba a Mano',
    icon: '💣',
    description: 'Esplode dopo 5 sec, rimbalza',
    damage: 65, // 65% del max HP per colpo diretto
    maxAmmo: 3,
    startingAmmo: 3,
    // Fisica del proiettile
    gravity: 980,
    maxVelocity: 700,
    arcFactor: 1.0,
    explosionRadius: 60,
    // Comportamento speciale
    bounces: true,
    bounceDecay: 0.6, // Perde 40% velocità ad ogni rimbalzo
    maxBounces: 5,
    explodeOnImpact: false, // Non esplode all'impatto
    delayedExplosion: true,
    explosionDelay: 5000, // 5 secondi
    knockbackMultiplier: 2.0, // Knockback forte
    // Tipo di lancio
    launchType: 'throw'
  },

  [WeaponType.DYNAMITE]: {
    name: 'Candelotto di Dinamite',
    icon: '🧨',
    description: 'Posiziona e accendi, esplode dopo 5 sec',
    damage: 75, // 75% del max HP per colpo diretto
    maxAmmo: 5,
    startingAmmo: 5,
    // Fisica del proiettile - non si lancia, si posiziona
    gravity: 0,
    maxVelocity: 0,
    arcFactor: 0,
    explosionRadius: 70,
    // Comportamento speciale
    bounces: false,
    explodeOnImpact: false,
    delayedExplosion: true,
    explosionDelay: 5000, // 5 secondi
    knockbackMultiplier: 2.5, // Knockback molto forte
    // Tipo di lancio
    launchType: 'place' // place = posiziona manualmente
  },

  [WeaponType.BAZOOKA]: {
    name: 'Bazooka',
    icon: '🚀',
    description: 'Gittata lunga, danno devastante',
    damage: 85, // 85% del max HP per colpo diretto
    maxAmmo: 3,
    startingAmmo: 3,
    // Fisica del proiettile - gravità bassissima per gittata lunga
    gravity: 120, // Gravità molto bassa
    maxVelocity: 2000, // Velocità altissima
    arcFactor: 8.0, // Arco molto lungo
    explosionRadius: 80, // Esplosione grande
    // Comportamento speciale
    bounces: false,
    explodeOnImpact: true,
    delayedExplosion: false,
    explosionDelay: 0,
    knockbackMultiplier: 3.0, // Knockback devastante
    // Tipo di lancio
    launchType: 'shoot'
  }
};

/**
 * Classe per gestire l'inventario armi di un giocatore
 */
export class WeaponInventory {
  constructor() {
    this.ammo = {};
    this.currentWeapon = WeaponType.POOP_BALL;

    // Inizializza munizioni
    this.reset();
  }

  /**
   * Resetta l'inventario alle munizioni iniziali
   */
  reset() {
    for (const [type, def] of Object.entries(WeaponDefinitions)) {
      this.ammo[type] = def.startingAmmo;
    }
    this.currentWeapon = WeaponType.POOP_BALL;
  }

  /**
   * Ottiene le munizioni per un'arma
   */
  getAmmo(weaponType) {
    return this.ammo[weaponType] || 0;
  }

  /**
   * Usa una munizione
   */
  useAmmo(weaponType) {
    if (this.ammo[weaponType] === Infinity) return true;
    if (this.ammo[weaponType] > 0) {
      this.ammo[weaponType]--;
      return true;
    }
    return false;
  }

  /**
   * Aggiunge munizioni
   */
  addAmmo(weaponType, amount) {
    if (this.ammo[weaponType] === Infinity) return;
    const def = WeaponDefinitions[weaponType];
    if (def) {
      this.ammo[weaponType] = Math.min(def.maxAmmo, this.ammo[weaponType] + amount);
    }
  }

  /**
   * Controlla se l'arma può essere usata
   */
  canUse(weaponType) {
    return this.ammo[weaponType] === Infinity || this.ammo[weaponType] > 0;
  }

  /**
   * Seleziona un'arma
   */
  selectWeapon(weaponType) {
    if (this.canUse(weaponType)) {
      this.currentWeapon = weaponType;
      return true;
    }
    return false;
  }

  /**
   * Ottiene l'arma corrente
   */
  getCurrentWeapon() {
    return this.currentWeapon;
  }

  /**
   * Ottiene la definizione dell'arma corrente
   */
  getCurrentWeaponDef() {
    return WeaponDefinitions[this.currentWeapon];
  }

  /**
   * Ottiene tutte le armi disponibili con le loro munizioni
   */
  getAllWeapons() {
    return Object.entries(WeaponDefinitions).map(([type, def]) => ({
      type,
      ...def,
      ammo: this.ammo[type],
      canUse: this.canUse(type),
      isSelected: type === this.currentWeapon
    }));
  }
}

/**
 * Classe per gestire la UI del selettore armi
 */
export class WeaponSelector {
  constructor(scene) {
    this.scene = scene;
    this.isVisible = false;
    this.container = null;
    this.weaponSlots = [];
    this.onWeaponSelected = null;
    this.selectedIndex = 0;
    this.inputEnabled = false;
  }

  /**
   * Crea la UI del selettore
   */
  create() {
    const gameHeight = this.scene.gameHeight;
    const gameWidth = this.scene.gameWidth;

    // Container principale (inizialmente nascosto sotto lo schermo)
    this.container = this.scene.add.container(gameWidth / 2, gameHeight + 60);
    this.container.setDepth(100); // Sempre sopra tutto

    // Sfondo della barra
    const barWidth = 420;
    const barHeight = 80;
    const bg = this.scene.add.rectangle(0, 0, barWidth, barHeight, 0x000000, 0.85);
    bg.setStrokeStyle(2, 0xffffff, 0.8);
    this.container.add(bg);

    // Titolo
    const title = this.scene.add.text(0, -barHeight/2 + 12, 'SELEZIONA ARMA', {
      fontSize: '12px',
      fill: '#ffff00',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    this.container.add(title);

    // Crea slot per ogni arma
    const weapons = Object.entries(WeaponDefinitions);
    const slotWidth = 70;
    const startX = -(weapons.length * slotWidth) / 2 + slotWidth / 2;

    weapons.forEach(([type, def], index) => {
      const x = startX + index * slotWidth;
      const slot = this.createWeaponSlot(type, def, x, 5, index);
      this.weaponSlots.push(slot);
    });

    // Istruzioni
    const instructions = this.scene.add.text(0, barHeight/2 - 10, '← → per scegliere, INVIO per confermare, ESC per annullare', {
      fontSize: '10px',
      fill: '#aaaaaa'
    });
    instructions.setOrigin(0.5);
    this.container.add(instructions);

    // Input handling
    this.setupInput();
  }

  /**
   * Crea uno slot per un'arma
   */
  createWeaponSlot(type, def, x, y, index) {
    const slotContainer = this.scene.add.container(x, y);

    // Sfondo slot
    const slotBg = this.scene.add.rectangle(0, 0, 60, 50, 0x333333, 0.8);
    slotBg.setStrokeStyle(2, 0x666666);

    slotContainer.add(slotBg);

    // Icona arma
    const icon = this.scene.add.text(0, -8, def.icon, {
      fontSize: '24px'
    });
    icon.setOrigin(0.5);
    slotContainer.add(icon);

    // Quantità munizioni
    const ammoText = this.scene.add.text(0, 18, '∞', {
      fontSize: '12px',
      fill: '#00ff00',
      fontStyle: 'bold'
    });
    ammoText.setOrigin(0.5);
    slotContainer.add(ammoText);

    this.container.add(slotContainer);

    return {
      type,
      def,
      container: slotContainer,
      bg: slotBg,
      icon,
      ammoText,
      index
    };
  }

  /**
   * Configura l'input
   */
  setupInput() {
    // Tasti per navigazione
    this.leftKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.enterKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  /**
   * Mostra il selettore armi
   */
  show(inventory, callback) {
    if (this.isVisible) return;

    this.isVisible = true;
    this.inventory = inventory;
    this.onWeaponSelected = callback;

    // Trova l'indice dell'arma corrente
    const currentWeapon = inventory.getCurrentWeapon();
    this.selectedIndex = this.weaponSlots.findIndex(s => s.type === currentWeapon);
    if (this.selectedIndex < 0) this.selectedIndex = 0;

    // Aggiorna display munizioni
    this.updateAmmoDisplay();

    // Aggiorna selezione
    this.updateSelection();

    // Anima l'entrata
    this.scene.tweens.add({
      targets: this.container,
      y: this.scene.gameHeight - 50,
      duration: 200,
      ease: 'Back.easeOut'
    });

    // Abilita input
    this.inputEnabled = true;
  }

  /**
   * Nasconde il selettore armi
   */
  hide() {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.inputEnabled = false;

    // Anima l'uscita
    this.scene.tweens.add({
      targets: this.container,
      y: this.scene.gameHeight + 60,
      duration: 200,
      ease: 'Back.easeIn'
    });
  }

  /**
   * Aggiorna il display delle munizioni
   */
  updateAmmoDisplay() {
    if (!this.inventory) return;

    this.weaponSlots.forEach(slot => {
      const ammo = this.inventory.getAmmo(slot.type);
      const canUse = this.inventory.canUse(slot.type);

      // Aggiorna testo munizioni
      if (ammo === Infinity) {
        slot.ammoText.setText('∞');
      } else {
        slot.ammoText.setText(`${ammo}`);
      }

      // Colore in base alla disponibilità
      if (!canUse) {
        slot.ammoText.setColor('#ff0000');
        slot.icon.setAlpha(0.4);
      } else if (ammo <= 1 && ammo !== Infinity) {
        slot.ammoText.setColor('#ffff00');
        slot.icon.setAlpha(1);
      } else {
        slot.ammoText.setColor('#00ff00');
        slot.icon.setAlpha(1);
      }
    });
  }

  /**
   * Aggiorna la selezione visiva
   */
  updateSelection() {
    this.weaponSlots.forEach((slot, index) => {
      if (index === this.selectedIndex) {
        slot.bg.setStrokeStyle(3, 0xffff00);
        slot.bg.setFillStyle(0x555500, 0.9);
      } else {
        slot.bg.setStrokeStyle(2, 0x666666);
        slot.bg.setFillStyle(0x333333, 0.8);
      }
    });
  }

  /**
   * Seleziona l'arma precedente
   */
  selectPrevious() {
    this.selectedIndex--;
    if (this.selectedIndex < 0) {
      this.selectedIndex = this.weaponSlots.length - 1;
    }
    this.updateSelection();
  }

  /**
   * Seleziona l'arma successiva
   */
  selectNext() {
    this.selectedIndex++;
    if (this.selectedIndex >= this.weaponSlots.length) {
      this.selectedIndex = 0;
    }
    this.updateSelection();
  }

  /**
   * Conferma la selezione
   */
  confirmSelection() {
    const slot = this.weaponSlots[this.selectedIndex];
    if (slot && this.inventory.canUse(slot.type)) {
      this.inventory.selectWeapon(slot.type);
      this.hide();
      if (this.onWeaponSelected) {
        this.onWeaponSelected(slot.type, slot.def);
      }
      return true;
    }
    return false;
  }

  /**
   * Annulla la selezione
   */
  cancel() {
    this.hide();
    if (this.onWeaponSelected) {
      this.onWeaponSelected(null, null);
    }
  }

  /**
   * Update chiamato ogni frame
   */
  update() {
    if (!this.inputEnabled) return;

    // Navigazione con tastiera
    if (Phaser.Input.Keyboard.JustDown(this.leftKey)) {
      this.selectPrevious();
    }
    if (Phaser.Input.Keyboard.JustDown(this.rightKey)) {
      this.selectNext();
    }
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.confirmSelection();
    }
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.cancel();
    }
  }

  /**
   * Distrugge il selettore
   */
  destroy() {
    if (this.container) {
      this.container.destroy(true);
    }
  }
}
