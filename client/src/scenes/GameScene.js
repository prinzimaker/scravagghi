import { TerrainMask } from '../terrain/TerrainMask.js';
import { Player } from '../entities/Player.js';
import { Physics } from '../physics/Physics.js';
import { AimController } from '../input/AimController.js';
import { KeyboardManager } from '../input/KeyboardManager.js';
import { DeterministicRandom } from '../utils/DeterministicRandom.js';
import { SoundManager } from '../managers/SoundManager.js';
import { WeaponSelector, WeaponDefinitions, WeaponType } from '../weapons/WeaponSystem.js';

/**
 * Scena principale del gioco
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  /**
   * Carica gli asset (audio manifest e file)
   */
  preload() {
    console.log('📦 Loading assets...');

    // Inizializza sound manager
    this.soundManager = new SoundManager(this);

    // Fase 1: Carica il manifest JSON
    this.soundManager.preload();

    // Fase 2: Quando il JSON è caricato, carica i file audio
    this.load.once('filecomplete-json-sounds-manifest', () => {
      console.log('📋 Manifest loaded, loading audio files...');
      this.soundManager.loadSoundFiles();

      // Avvia il caricamento dei file audio
      this.load.start();
    });
  }

  create() {
    console.log('🎮 GameScene created');

    // Inizializza il sound manager (dopo che i file sono stati caricati)
    if (this.soundManager) {
      this.soundManager.create();
    }

    // Dimensioni mondo di gioco (larghezza aumentata)
    this.gameWidth = 1200;
    this.gameHeight = 600;

    // Stato del gioco
    this.currentTurn = 1;
    this.currentTeamId = 0; // 0 o 1
    this.team0CurrentElement = 1; // Element corrente per team 0
    this.team1CurrentElement = 1; // Element corrente per team 1
    this.turnTimeLeft = 15000;
    this.gamePhase = 'aiming';
    this.isTurnTransitioning = false; // Previene chiamate multiple a endTurn()

    // Seed per deterministico
    this.gameSeed = Date.now();
    this.turnSeed = this.gameSeed;

    // Inizializza terreno
    this.initTerrain();

    // Inizializza giocatori (nuovo sistema!)
    this.initPlayers();

    // Render sfondo stile Worms classico
    this.renderWormsBackground();

    // Render terreno
    this.renderTerrain();

    // Inizializza il keyboard manager personalizzato
    this.keyboardManager = new KeyboardManager(this);
    this.keys = this.keyboardManager.getKeys();

    // Inizializza controller di mira
    this.aimController = new AimController(this);
    this.aimController.create();

    // Stato salto
    this.isJumping = false;

    // Passa i tasti all'AimController
    this.aimController.setKeys(this.keys);

    // Inizializza selettore armi con il nuovo keyboard manager
    this.weaponSelector = new WeaponSelector(this);
    this.weaponSelector.create();
    this.weaponSelector.setKeyboardManager(this.keyboardManager);
    this.isSelectingWeapon = false;

    // Listener per colpo sparato
    this.events.on('shot-fired', this.handleShot, this);

    // Inizializza pacchi armi nascosti
    this.initWeaponCrates();

    // UI
    this.createUI();

    // Inizia il primo turno
    this.startTurn();

    // Debug info
    this.updateDebugInfo();
  }

  /**
   * Inizializza il terreno
   */
  initTerrain() {
    this.terrain = new TerrainMask(this.gameWidth, this.gameHeight);

    // Genera terreno procedurale
    const rng = new DeterministicRandom(this.gameSeed);
    const numHills = rng.nextInt(3, 6);
    const hills = [];

    for (let i = 0; i < numHills; i++) {
      hills.push({
        x: rng.nextFloat(0, this.gameWidth),
        height: rng.nextFloat(40, 120),
        width: rng.nextFloat(100, 300)
      });
    }

    // Riempie il terreno
    for (let x = 0; x < this.gameWidth; x++) {
      let groundY = this.gameHeight * 0.7;

      for (const hill of hills) {
        const dist = Math.abs(x - hill.x);
        if (dist < hill.width) {
          const factor = Math.cos((dist / hill.width) * Math.PI);
          groundY -= hill.height * factor;
        }
      }

      for (let y = Math.floor(groundY); y < this.gameHeight; y++) {
        this.terrain.setPixel(x, y, true);
      }
    }
  }

  /**
   * Inizializza i giocatori (nuovo sistema con array di oggetti)
   */
  initPlayers() {
    this.players = [];

    // Nomi dei giocatori
    const team0Names = ['Giuseppe', 'Giorgio'];
    const team1Names = ['Aldus', 'Giovanna'];

    // Team 0 (Verde) - 2 giocatori
    const team0StartX = 150;
    for (let i = 0; i < 2; i++) {
      const x = team0StartX + i * 100;
      const y = this.terrain.getGroundY(x);
      const player = new Player(
        `p${this.players.length}`,
        team0Names[i],
        0, // team_id
        i + 1, // team_element
        x,
        y
      );
      player.createSprite(this);
      this.players.push(player);
    }

    // Team 1 (Rosso) - 2 giocatori
    const team1StartX = 950;
    for (let i = 0; i < 2; i++) {
      const x = team1StartX + i * 100;
      const y = this.terrain.getGroundY(x);
      const player = new Player(
        `p${this.players.length}`,
        team1Names[i],
        1, // team_id
        i + 1, // team_element
        x,
        y
      );
      player.createSprite(this);
      this.players.push(player);
    }

    console.log('👥 Players initialized:', this.players.map(p =>
      `${p.name}(T${p.team_id}E${p.team_element})`
    ).join(', '));

    // Giocatore attivo corrente
    this.activePlayer = null;
  }

  /**
   * Inizializza i pacchi armi nascosti nel terreno
   */
  initWeaponCrates() {
    this.weaponCrates = [];

    // Contenuti possibili dei pacchi
    const crateContents = [
      { weapon: WeaponType.PISTOL, ammo: 5, icon: '🔫' },
      { weapon: WeaponType.GRENADE, ammo: 2, icon: '💣' },
      { weapon: WeaponType.DYNAMITE, ammo: 2, icon: '🧨' },
      { weapon: WeaponType.BAZOOKA, ammo: 1, icon: '🚀' }
    ];

    // Crea 5-8 pacchi nascosti nel terreno
    const rng = new DeterministicRandom(this.gameSeed + 1000);
    const numCrates = rng.nextInt(5, 8);

    for (let i = 0; i < numCrates; i++) {
      // Posizione X casuale (evita i bordi)
      const x = rng.nextInt(100, this.gameWidth - 100);

      // Trova il terreno a quella posizione
      const groundY = this.terrain.getGroundY(x);

      // Piazza il pacco sotto la superficie (nascosto)
      const y = groundY + rng.nextInt(20, 60);

      // Solo se è dentro il terreno
      if (y < this.gameHeight && this.terrain.isSolid(x, y)) {
        const content = crateContents[rng.nextInt(0, crateContents.length - 1)];

        this.weaponCrates.push({
          x,
          y,
          weapon: content.weapon,
          ammo: content.ammo,
          icon: content.icon,
          revealed: false,
          collected: false,
          sprite: null
        });
      }
    }

    console.log(`📦 ${this.weaponCrates.length} weapon crates hidden in terrain`);
  }

  /**
   * Controlla se ci sono pacchi rivelati da un'esplosione
   */
  checkRevealedCrates(explosionX, explosionY, radius) {
    this.weaponCrates.forEach(crate => {
      if (crate.revealed || crate.collected) return;

      // Se il pacco è ora esposto (non più coperto da terreno)
      if (!this.terrain.isSolid(crate.x, crate.y)) {
        crate.revealed = true;

        // Crea lo sprite del pacco alla posizione originale
        crate.sprite = this.add.text(crate.x, crate.y, '📦', {
          fontSize: '24px'
        });
        crate.sprite.setOrigin(0.5);
        crate.sprite.setDepth(8);

        // Animazione di apparizione
        crate.sprite.setScale(0);
        this.tweens.add({
          targets: crate.sprite,
          scale: 1,
          duration: 200,
          ease: 'Back.easeOut',
          onComplete: () => {
            // Dopo l'apparizione, applica gravità
            this.applyCrateGravity(crate);
          }
        });

        console.log(`📦 Crate revealed at (${crate.x}, ${crate.y}) - ${crate.icon}`);
      }
    });
  }

  /**
   * Applica gravità a un pacco rivelato - cade finché non tocca il terreno
   */
  applyCrateGravity(crate) {
    if (!crate.sprite || crate.collected) return;

    // Trova la posizione del terreno sotto il pacco
    const groundY = this.terrain.getGroundY(Math.floor(crate.x));

    // Se il pacco è già a terra o sotto, niente gravità
    if (crate.y >= groundY - 12) {
      // Inizia animazione fluttuante
      this.startCrateFloatAnimation(crate, groundY - 12);
      return;
    }

    // Calcola distanza di caduta
    const fallDistance = groundY - 12 - crate.y;
    const fallDuration = Math.min(800, Math.max(200, fallDistance * 3));

    // Anima la caduta con rimbalzo
    this.tweens.add({
      targets: crate.sprite,
      y: groundY - 12, // 12 pixel sopra il terreno
      duration: fallDuration,
      ease: 'Bounce.easeOut',
      onUpdate: () => {
        // Aggiorna posizione logica del pacco
        crate.y = crate.sprite.y;
      },
      onComplete: () => {
        // Aggiorna posizione finale
        crate.y = groundY - 12;

        // Inizia animazione fluttuante
        this.startCrateFloatAnimation(crate, crate.y);
      }
    });
  }

  /**
   * Inizia l'animazione fluttuante di un pacco
   */
  startCrateFloatAnimation(crate, baseY) {
    if (!crate.sprite || crate.collected) return;

    // Animazione fluttuante continua
    this.tweens.add({
      targets: crate.sprite,
      y: baseY - 5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Controlla se il giocatore raccoglie un pacco
   */
  checkCrateCollection(player) {
    if (!player || !player.isAlive()) return;

    this.weaponCrates.forEach(crate => {
      if (!crate.revealed || crate.collected) return;

      // Distanza dal giocatore al pacco
      const dx = player.position.x - crate.x;
      const dy = player.position.y - crate.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Se il giocatore è abbastanza vicino (raggio di raccolta)
      if (distance < 30) {
        crate.collected = true;

        // Aggiungi munizioni all'inventario del giocatore
        player.weaponInventory.addAmmo(crate.weapon, crate.ammo);

        // Effetto di raccolta
        if (crate.sprite) {
          this.tweens.add({
            targets: crate.sprite,
            scale: 0,
            alpha: 0,
            y: crate.y - 30,
            duration: 300,
            onComplete: () => {
              crate.sprite.destroy();
              crate.sprite = null;
            }
          });
        }

        // Mostra messaggio di raccolta
        const collectText = this.add.text(
          player.position.x,
          player.position.y - 50,
          `+${crate.ammo} ${crate.icon}`,
          {
            fontSize: '20px',
            fill: '#00ff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
          }
        );
        collectText.setOrigin(0.5);
        collectText.setDepth(25);

        this.tweens.add({
          targets: collectText,
          y: player.position.y - 100,
          alpha: 0,
          duration: 1500,
          onComplete: () => collectText.destroy()
        });

        console.log(`📦 ${player.name} collected ${crate.ammo}x ${crate.icon}!`);

        // Aggiorna UI armi
        this.updateUI();
      }
    });
  }

  /**
   * Renderizza lo sfondo stile Worms classico (1995)
   * - Cielo sfumato blu
   * - Nuvole animate
   * - Acqua in fondo
   */
  renderWormsBackground() {
    const bgGraphics = this.add.graphics();
    bgGraphics.setDepth(-10); // Sfondo dietro tutto

    // === CIELO SFUMATO ===
    // Gradiente dal celeste chiaro (top) al blu più scuro (bottom)
    const skyTop = { r: 135, g: 206, b: 250 };     // Celeste chiaro
    const skyBottom = { r: 70, g: 130, b: 180 };   // Blu acciaio

    // Altezza del cielo (dove inizia l'acqua)
    const waterLevel = this.gameHeight - 40;

    for (let y = 0; y < waterLevel; y++) {
      const ratio = y / waterLevel;
      const r = Math.floor(skyTop.r + (skyBottom.r - skyTop.r) * ratio);
      const g = Math.floor(skyTop.g + (skyBottom.g - skyTop.g) * ratio);
      const b = Math.floor(skyTop.b + (skyBottom.b - skyTop.b) * ratio);

      const color = Phaser.Display.Color.GetColor(r, g, b);
      bgGraphics.fillStyle(color, 1);
      bgGraphics.fillRect(0, y, this.gameWidth, 1);
    }

    // === ACQUA ===
    // L'acqua è nella parte inferiore, sotto il terreno
    // Gradiente dal blu chiaro (superficie) al blu scuro (fondo)
    const waterTop = { r: 30, g: 100, b: 180 };
    const waterBottom = { r: 10, g: 40, b: 100 };

    for (let y = waterLevel; y < this.gameHeight; y++) {
      const ratio = (y - waterLevel) / (this.gameHeight - waterLevel);
      const r = Math.floor(waterTop.r + (waterBottom.r - waterTop.r) * ratio);
      const g = Math.floor(waterTop.g + (waterBottom.g - waterTop.g) * ratio);
      const b = Math.floor(waterTop.b + (waterBottom.b - waterTop.b) * ratio);

      const color = Phaser.Display.Color.GetColor(r, g, b);
      bgGraphics.fillStyle(color, 1);
      bgGraphics.fillRect(0, y, this.gameWidth, 1);
    }

    // === ONDE DELL'ACQUA (effetto superficie) ===
    bgGraphics.fillStyle(0x4080c0, 0.6);
    for (let x = 0; x < this.gameWidth; x += 8) {
      const waveOffset = Math.sin(x * 0.05) * 2;
      bgGraphics.fillRect(x, waterLevel + waveOffset, 6, 2);
    }

    // === NUVOLE ===
    this.clouds = [];
    const rng = new DeterministicRandom(this.gameSeed + 500);

    // Crea 5-8 nuvole
    const numClouds = rng.nextInt(5, 8);
    for (let i = 0; i < numClouds; i++) {
      const cloudX = rng.nextFloat(0, this.gameWidth);
      const cloudY = rng.nextFloat(30, 150);
      const cloudScale = rng.nextFloat(0.6, 1.2);
      const cloudSpeed = rng.nextFloat(5, 15); // pixel al secondo

      const cloud = this.createCloud(cloudX, cloudY, cloudScale);
      this.clouds.push({ sprite: cloud, speed: cloudSpeed, baseY: cloudY });
    }

    // === SOLE (opzionale, stile Worms) ===
    const sunX = this.gameWidth - 80;
    const sunY = 60;

    // Alone del sole
    const sunGlow = this.add.graphics();
    sunGlow.setDepth(-9);
    sunGlow.fillStyle(0xffff80, 0.3);
    sunGlow.fillCircle(sunX, sunY, 50);
    sunGlow.fillStyle(0xffff00, 0.4);
    sunGlow.fillCircle(sunX, sunY, 35);

    // Sole
    const sun = this.add.graphics();
    sun.setDepth(-8);
    sun.fillStyle(0xffee00, 1);
    sun.fillCircle(sunX, sunY, 25);
    sun.fillStyle(0xffff80, 1);
    sun.fillCircle(sunX - 5, sunY - 5, 10);

    this.backgroundGraphics = bgGraphics;
  }

  /**
   * Crea una singola nuvola (stile Worms pixelato)
   */
  createCloud(x, y, scale) {
    const cloud = this.add.graphics();
    cloud.setDepth(-5);
    cloud.setPosition(x, y);
    cloud.setScale(scale);

    // Nuvola fatta di cerchi sovrapposti (stile cartoon)
    cloud.fillStyle(0xffffff, 0.9);

    // Forma base della nuvola
    cloud.fillCircle(0, 0, 20);
    cloud.fillCircle(-25, 5, 15);
    cloud.fillCircle(25, 5, 18);
    cloud.fillCircle(-15, -10, 12);
    cloud.fillCircle(15, -8, 14);
    cloud.fillCircle(35, 10, 12);
    cloud.fillCircle(-35, 8, 10);

    // Ombra sotto la nuvola
    cloud.fillStyle(0xcccccc, 0.5);
    cloud.fillEllipse(0, 15, 70, 10);

    return cloud;
  }

  /**
   * Renderizza il terreno come texture (stile Worms classico)
   */
  renderTerrain() {
    // Crea texture per il terreno
    const graphics = this.add.graphics();
    graphics.setDepth(0); // Terreno sopra sfondo ma sotto i giocatori

    // Trova la superficie per ogni colonna (per disegnare l'erba)
    const surfaceY = [];
    for (let x = 0; x < this.gameWidth; x++) {
      surfaceY[x] = this.terrain.getGroundY(x);
    }

    // === PRIMO PASSAGGIO: Disegna il bordo scuro (outline stile Worms) ===
    const outlineGraphics = this.add.graphics();
    outlineGraphics.setDepth(-1); // Sotto il terreno principale

    for (let x = 0; x < this.gameWidth; x++) {
      for (let y = 0; y < this.gameHeight; y++) {
        if (this.terrain.isSolid(x, y)) {
          // Controlla se è un pixel di bordo (ha un vicino vuoto)
          const isEdge = !this.terrain.isSolid(x - 1, y) ||
                         !this.terrain.isSolid(x + 1, y) ||
                         !this.terrain.isSolid(x, y - 1) ||
                         !this.terrain.isSolid(x, y + 1);

          if (isEdge) {
            // Bordo scuro marrone
            outlineGraphics.fillStyle(0x2a1a0a, 1);
            outlineGraphics.fillRect(x - 1, y - 1, 3, 3);
          }
        }
      }
    }

    // === SECONDO PASSAGGIO: Disegna il terreno colorato ===
    for (let x = 0; x < this.gameWidth; x++) {
      for (let y = 0; y < this.gameHeight; y++) {
        if (this.terrain.isSolid(x, y)) {
          // Calcola profondità dalla superficie
          const depth = y - surfaceY[x];

          // Noise per variazione naturale (stile Worms pixelato)
          const noise = ((x * 7 + y * 13) % 20) / 20;
          const noise2 = ((x * 11 + y * 3) % 15) / 15;
          const dither = ((x + y) % 2) * 0.1; // Effetto dithering

          let r, g, b;

          if (depth < 3) {
            // ERBA - superficie (verde brillante stile Worms)
            const grassShade = 15 + noise * 25 + dither * 20;
            r = 40 + grassShade * 0.3;
            g = 150 + grassShade;
            b = 30 + grassShade * 0.2;
          } else if (depth < 8) {
            // RADICI/TERRA SUPERFICIALE (marrone chiaro con verde)
            const soilShade = noise * 20 + dither * 15;
            r = 110 + soilShade;
            g = 85 + soilShade * 0.7 + (8 - depth) * 6;
            b = 45 + soilShade * 0.3;
          } else if (depth < 30) {
            // TERRA (marrone medio con pattern)
            const earthShade = noise * 25 + noise2 * 15 + dither * 10;
            r = 130 + earthShade;
            g = 90 + earthShade * 0.5;
            b = 50 + earthShade * 0.2;
          } else {
            // TERRA PROFONDA/ROCCIA (marrone scuro)
            const rockShade = noise * 20 + dither * 10;
            r = 100 + rockShade;
            g = 75 + rockShade * 0.5;
            b = 45 + rockShade * 0.3;
          }

          const color = Phaser.Display.Color.GetColor(
            Math.floor(r),
            Math.floor(g),
            Math.floor(b)
          );
          graphics.fillStyle(color, 1);
          graphics.fillRect(x, y, 1, 1);
        }
      }
    }

    // === TERZO PASSAGGIO: Aggiungi fili d'erba sulla superficie ===
    for (let x = 0; x < this.gameWidth; x += 2) {
      const groundY = surfaceY[x];
      if (groundY < this.gameHeight && groundY > 0) {
        // Altezza variabile dell'erba
        const grassHeight = 4 + Math.floor(((x * 7) % 5));
        const grassShade = ((x * 3) % 40);
        const grassColor = Phaser.Display.Color.GetColor(
          25 + grassShade * 0.5,
          130 + grassShade,
          15 + grassShade * 0.3
        );

        graphics.fillStyle(grassColor, 0.9);
        for (let i = 0; i < grassHeight; i++) {
          const offsetX = Math.floor(Math.sin(x * 0.15 + i * 0.5) * 1.5);
          graphics.fillRect(x + offsetX, groundY - i - 1, 1, 1);
        }
      }
    }

    this.terrainGraphics = graphics;
    this.outlineGraphics = outlineGraphics;
  }

  /**
   * Aggiorna il rendering del terreno dopo una modifica (esplosione)
   */
  updateTerrainGraphics(x, y, radius) {
    // Ridisegna un'area più ampia per includere l'outline
    const minX = Math.max(0, x - radius - 8);
    const maxX = Math.min(this.gameWidth, x + radius + 8);
    const minY = Math.max(0, y - radius - 8);
    const maxY = Math.min(this.gameHeight, y + radius + 8);

    const waterLevel = this.gameHeight - 40;

    // Colori dello sfondo per riempire i buchi
    const skyTop = { r: 135, g: 206, b: 250 };
    const skyBottom = { r: 70, g: 130, b: 180 };
    const waterTop = { r: 30, g: 100, b: 180 };
    const waterBottom = { r: 10, g: 40, b: 100 };

    for (let px = minX; px < maxX; px++) {
      // Trova la nuova superficie per questa colonna
      const surfaceY = this.terrain.getGroundY(px);

      for (let py = minY; py < maxY; py++) {
        if (!this.terrain.isSolid(px, py)) {
          // Calcola il colore dello sfondo per questa posizione
          let bgR, bgG, bgB;

          if (py < waterLevel) {
            // Cielo
            const ratio = py / waterLevel;
            bgR = Math.floor(skyTop.r + (skyBottom.r - skyTop.r) * ratio);
            bgG = Math.floor(skyTop.g + (skyBottom.g - skyTop.g) * ratio);
            bgB = Math.floor(skyTop.b + (skyBottom.b - skyTop.b) * ratio);
          } else {
            // Acqua
            const ratio = (py - waterLevel) / (this.gameHeight - waterLevel);
            bgR = Math.floor(waterTop.r + (waterBottom.r - waterTop.r) * ratio);
            bgG = Math.floor(waterTop.g + (waterBottom.g - waterTop.g) * ratio);
            bgB = Math.floor(waterTop.b + (waterBottom.b - waterTop.b) * ratio);
          }

          const bgColor = Phaser.Display.Color.GetColor(bgR, bgG, bgB);

          // Disegna lo sfondo dove c'era il terreno
          this.terrainGraphics.fillStyle(bgColor, 1);
          this.terrainGraphics.fillRect(px, py, 1, 1);

          // Cancella anche l'outline in quest'area
          if (this.outlineGraphics) {
            this.outlineGraphics.fillStyle(bgColor, 1);
            this.outlineGraphics.fillRect(px - 1, py - 1, 3, 3);
          }
        } else {
          // Controlla se è un bordo e disegna outline
          if (this.outlineGraphics) {
            const isEdge = !this.terrain.isSolid(px - 1, py) ||
                           !this.terrain.isSolid(px + 1, py) ||
                           !this.terrain.isSolid(px, py - 1) ||
                           !this.terrain.isSolid(px, py + 1);

            if (isEdge) {
              this.outlineGraphics.fillStyle(0x2a1a0a, 1);
              this.outlineGraphics.fillRect(px - 1, py - 1, 3, 3);
            }
          }

          // Ridisegna con colori stile Worms
          const depth = py - surfaceY;
          const noise = ((px * 7 + py * 13) % 20) / 20;
          const noise2 = ((px * 11 + py * 3) % 15) / 15;
          const dither = ((px + py) % 2) * 0.1;

          let r, g, b;

          if (depth < 3) {
            // ERBA
            const grassShade = 15 + noise * 25 + dither * 20;
            r = 40 + grassShade * 0.3;
            g = 150 + grassShade;
            b = 30 + grassShade * 0.2;
          } else if (depth < 8) {
            // RADICI/TERRA SUPERFICIALE
            const soilShade = noise * 20 + dither * 15;
            r = 110 + soilShade;
            g = 85 + soilShade * 0.7 + (8 - depth) * 6;
            b = 45 + soilShade * 0.3;
          } else if (depth < 30) {
            // TERRA
            const earthShade = noise * 25 + noise2 * 15 + dither * 10;
            r = 130 + earthShade;
            g = 90 + earthShade * 0.5;
            b = 50 + earthShade * 0.2;
          } else {
            // TERRA PROFONDA
            const rockShade = noise * 20 + dither * 10;
            r = 100 + rockShade;
            g = 75 + rockShade * 0.5;
            b = 45 + rockShade * 0.3;
          }

          const color = Phaser.Display.Color.GetColor(
            Math.floor(r),
            Math.floor(g),
            Math.floor(b)
          );
          this.terrainGraphics.fillStyle(color, 1);
          this.terrainGraphics.fillRect(px, py, 1, 1);
        }
      }
    }
  }

  /**
   * Crea UI del gioco
   */
  createUI() {
    // TITOLO PRINCIPALE in cima - stile retro game
    const titleY = 32;
    const titleX = this.gameWidth / 2;

    // Layer 1: Ombra profonda (nero)
    const titleShadow2 = this.add.text(titleX + 4, titleY + 4, 'scravagghi', {
      fontSize: '48px',
      fontFamily: 'Georgia, serif',
      fill: '#000000',
      fontStyle: 'bold italic'
    });
    titleShadow2.setOrigin(0.5);
    titleShadow2.setDepth(98);
    titleShadow2.setAlpha(0.6);

    // Layer 2: Ombra (marrone scuro)
    const titleShadow = this.add.text(titleX + 2, titleY + 2, 'scravagghi', {
      fontSize: '48px',
      fontFamily: 'Georgia, serif',
      fill: '#4a2800',
      fontStyle: 'bold italic'
    });
    titleShadow.setOrigin(0.5);
    titleShadow.setDepth(99);

    // Layer 3: Bordo esterno (marrone)
    const titleOutline = this.add.text(titleX, titleY, 'scravagghi', {
      fontSize: '48px',
      fontFamily: 'Georgia, serif',
      fill: '#996600',
      fontStyle: 'bold italic',
      stroke: '#3d1a00',
      strokeThickness: 6
    });
    titleOutline.setOrigin(0.5);
    titleOutline.setDepth(100);

    // Layer 4: Testo principale (gradiente dorato simulato)
    this.titleText = this.add.text(titleX, titleY, 'scravagghi', {
      fontSize: '48px',
      fontFamily: 'Georgia, serif',
      fill: '#ffd700',
      fontStyle: 'bold italic',
      stroke: '#cc8800',
      strokeThickness: 2
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setDepth(101);

    // Layer 5: Highlight superiore (giallo chiaro)
    const titleHighlight = this.add.text(titleX, titleY - 1, 'scravagghi', {
      fontSize: '48px',
      fontFamily: 'Georgia, serif',
      fill: '#ffee88',
      fontStyle: 'bold italic'
    });
    titleHighlight.setOrigin(0.5);
    titleHighlight.setDepth(102);
    titleHighlight.setAlpha(0.4);

    // Effetto brillantezza animato
    this.tweens.add({
      targets: titleHighlight,
      alpha: { from: 0.2, to: 0.5 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Pannello turno (in alto a sinistra, sotto il titolo)
    this.turnText = this.add.text(20, 60, 'Turno 1 - Team Verde', {
      fontSize: '18px',
      fill: '#fff',
      fontStyle: 'bold',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 }
    });

    // Timer turno (accanto al turno)
    this.timerText = this.add.text(200, 60, '10s', {
      fontSize: '18px',
      fill: '#ffff00',
      fontStyle: 'bold',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 }
    });

    // Legenda comandi (in alto a destra, piccola)
    this.instructionsText = this.add.text(this.gameWidth - 10, 85,
      '↑↓ Angolo | ←→ Muovi | C Salta | SPAZIO Spara | ENTER Armi', {
      fontSize: '10px',
      fill: '#888888',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 }
    });
    this.instructionsText.setOrigin(1, 0);

    // Info giocatore corrente e arma (in alto a destra)
    this.currentPlayerText = this.add.text(this.gameWidth - 10, 60, 'Giocatore: ---', {
      fontSize: '14px',
      fill: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 }
    });
    this.currentPlayerText.setOrigin(1, 0);

    this.currentWeaponText = this.add.text(this.gameWidth - 10, 10, '💩 Pallina di Cacca', {
      fontSize: '16px',
      fill: '#ffff00',
      fontStyle: 'bold',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 }
    });
    this.currentWeaponText.setOrigin(1, 0);
  }

  /**
   * Inizia un nuovo turno (NUOVO SISTEMA SEMPLICE)
   */
  startTurn() {
    // Reset di tutti i tasti per evitare input bufferizzati
    if (this.keyboardManager) {
      this.keyboardManager.forceReset();
    }
    this.isJumping = false;

    // Usa l'element corrente per questo team
    const currentElement = this.currentTeamId === 0 ? this.team0CurrentElement : this.team1CurrentElement;

    this.gamePhase = 'aiming';
    this.turnTimeLeft = 15000;
    this.turnStartTime = Date.now();
    this.timerPaused = false;

    // Genera nuovo seed
    const rng = new DeterministicRandom(this.turnSeed);
    this.turnSeed = rng.nextInt(1, 999999999);

    // Trova tutti i giocatori vivi di questo team
    const teamPlayers = this.players.filter(p => p.team_id === this.currentTeamId && p.isAlive());

    if (teamPlayers.length === 0) {
      console.log(`💀 Team ${this.currentTeamId} eliminated! GAME OVER!`);
      this.endGame();
      return;
    }

    // Trova il max team_element per questo team
    const maxElement = Math.max(...this.players
      .filter(p => p.team_id === this.currentTeamId)
      .map(p => p.team_element)
    );

    // Cerca il player con currentElement, salta i morti
    let selectedPlayer = null;
    let attempts = 0;
    let searchElement = currentElement;

    while (!selectedPlayer && attempts < maxElement) {
      const candidate = this.players.find(
        p => p.team_id === this.currentTeamId && p.team_element === searchElement
      );

      if (candidate && candidate.isAlive()) {
        selectedPlayer = candidate;
      } else {
        // Morto o non esiste, vai al prossimo
        searchElement++;
        if (searchElement > maxElement) {
          searchElement = 1; // Wrap around
        }
      }
      attempts++;
    }

    if (!selectedPlayer) {
      // Non dovrebbe succedere ma per sicurezza
      console.error('⚠️ No valid player found!');
      this.endGame();
      return;
    }

    // Disattiva tutti, attiva il selezionato
    this.players.forEach(p => {
      p.isActive = false;
      p.updateSprite();
    });

    selectedPlayer.isActive = true;
    this.activePlayer = selectedPlayer;
    this.activePlayer.updateSprite();

    console.log(`🎯 Turn ${this.currentTurn} - Team ${this.currentTeamId}, Element ${selectedPlayer.team_element}`);
    console.log(`🎮 Selected: ${selectedPlayer.name} (HP: ${selectedPlayer.health}/${selectedPlayer.maxHealth})`);

    // Inizia la fase di mira
    const flipped = selectedPlayer.team_id === 1; // Team 1 spara a sinistra
    this.aimController.startAiming(
      selectedPlayer.position.x,
      selectedPlayer.position.y - selectedPlayer.height,
      flipped
    );

    // Imposta l'arma corrente del giocatore nell'AimController
    const currentWeapon = selectedPlayer.weaponInventory.getCurrentWeapon();
    const currentWeaponDef = selectedPlayer.weaponInventory.getCurrentWeaponDef();
    this.aimController.setWeapon(currentWeapon, currentWeaponDef);

    this.updateUI();

    // Reset del flag SOLO quando il turno è completamente avviato
    this.isTurnTransitioning = false;
  }

  /**
   * Gestisce il colpo sparato
   */
  handleShot(shotData) {
    console.log('💥 Shot fired!', shotData);

    this.gamePhase = 'shooting';

    // Ottieni l'arma corrente
    const weaponType = shotData.weaponType || WeaponType.POOP_BALL;
    const weaponDef = shotData.weaponDef || WeaponDefinitions[WeaponType.POOP_BALL];

    // Usa una munizione
    this.activePlayer.weaponInventory.useAmmo(weaponType);

    // Gestisci armi speciali (dinamite = posizionamento)
    if (weaponDef.launchType === 'place') {
      this.handleDynamitePlacement(weaponDef);
      return;
    }

    // Per la palla di cacca, mostra animazione di creazione
    if (weaponType === WeaponType.POOP_BALL) {
      this.animatePoopCreation(shotData, weaponType, weaponDef);
      return;
    }

    // Per altre armi, spara direttamente
    this.fireProjectile(shotData, weaponType, weaponDef);
  }

  /**
   * Animazione creazione palla di cacca
   */
  animatePoopCreation(shotData, weaponType, weaponDef) {
    const playerX = this.activePlayer.position.x;
    const playerY = this.activePlayer.position.y;

    // Crea la pallina che "cresce"
    const poopBall = this.add.text(playerX, playerY - 5, '💩', {
      fontSize: '4px'
    });
    poopBall.setOrigin(0.5);
    poopBall.setDepth(15);
    poopBall.setAlpha(0);

    // Anima le zampe velocemente durante la creazione
    let animPhase = 0;
    const legTimer = this.time.addEvent({
      delay: 50,
      callback: () => {
        animPhase += 1;
        this.activePlayer.drawLegs(animPhase);
      },
      repeat: 15
    });

    // Effetto "sforzo" - scarafaggio trema
    this.tweens.add({
      targets: this.activePlayer.container,
      x: playerX + 1,
      duration: 50,
      yoyo: true,
      repeat: 7,
      ease: 'Sine.easeInOut'
    });

    // Animazione crescita della pallina
    this.tweens.add({
      targets: poopBall,
      alpha: 1,
      duration: 200,
      onComplete: () => {
        // Scala da piccola a grande
        this.tweens.add({
          targets: poopBall,
          fontSize: 16, // Non funziona così, uso scale
          duration: 400
        });
      }
    });

    // Usa scale per far crescere
    poopBall.setScale(0.3);
    this.tweens.add({
      targets: poopBall,
      scale: 1.2,
      duration: 600,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Piccolo "plop" finale
        this.tweens.add({
          targets: poopBall,
          scale: 1,
          duration: 100,
          onComplete: () => {
            // Rimuovi la pallina statica
            poopBall.destroy();
            legTimer.remove();

            // Resetta le zampe
            this.activePlayer.drawLegs(0);

            // Ora spara il proiettile vero
            this.fireProjectile(shotData, weaponType, weaponDef);
          }
        });
      }
    });
  }

  /**
   * Spara il proiettile (dopo eventuale animazione)
   */
  fireProjectile(shotData, weaponType, weaponDef) {
    // Simula il colpo
    const rng = new DeterministicRandom(this.turnSeed);

    const startX = this.activePlayer.position.x;
    const startY = this.activePlayer.position.y - this.activePlayer.height;

    // Converti players in formato compatibile con Physics
    const beetlesCompat = this.players.map(p => ({
      x: p.position.x,
      y: p.position.y,
      width: p.width,
      height: p.height,
      isAlive: p.isAlive(),
      maxHp: p.maxHealth,
      takeDamage: (dmg) => p.takeDamage(dmg),
      hp: p.health,
      id: p.id,
      player: p // Riferimento al player originale
    }));

    const result = Physics.simulateShot(
      startX,
      startY,
      shotData.angle,
      shotData.power,
      weaponDef.maxVelocity,
      this.terrain,
      beetlesCompat,
      rng,
      weaponDef // Passa la definizione dell'arma
    );

    // Salva info arma per l'impatto
    result.weaponDef = weaponDef;
    result.weaponType = weaponType;

    console.log(`🔫 ${weaponDef.name} fired!`);
    console.log('Trajectory points:', result.trajectory.length);
    console.log('Impact:', result.impactPoint);

    // Anima il proiettile
    this.animateProjectile(result);
  }

  /**
   * Gestisce il posizionamento della dinamite
   */
  handleDynamitePlacement(weaponDef) {
    const x = this.activePlayer.position.x;
    const y = this.activePlayer.position.y;

    console.log(`🧨 Dynamite placed at (${x}, ${y})`);

    // Entra in fase "fuga" - il giocatore può muoversi ma non sparare
    this.gamePhase = 'escaping';
    this.aimController.stopAiming();

    // Crea sprite dinamite
    const dynamite = this.add.text(x, y - 20, '🧨', {
      fontSize: '24px'
    });
    dynamite.setOrigin(0.5);
    dynamite.setDepth(15);

    // Timer countdown visivo
    let countdown = 5;
    const countdownText = this.add.text(x, y - 45, `${countdown}`, {
      fontSize: '20px',
      fill: '#ff0000',
      fontStyle: 'bold'
    });
    countdownText.setOrigin(0.5);
    countdownText.setDepth(15);

    // Mostra istruzioni di fuga
    this.showEscapeMessage('SCAPPA! ← → per muoverti');

    // Countdown timer
    const countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        countdown--;
        countdownText.setText(`${countdown}`);

        if (countdown <= 0) {
          countdownTimer.remove();
          dynamite.destroy();
          countdownText.destroy();
          this.hideEscapeMessage();

          // Esplosione!
          this.handleDelayedExplosion(x, y, weaponDef);

          // ORA termina il turno
          this.endTurn();
        }
      },
      loop: true
    });
  }

  /**
   * Gestisce un'esplosione ritardata (granata/dinamite)
   */
  handleDelayedExplosion(x, y, weaponDef) {
    console.log(`💥 Delayed explosion at (${x}, ${y})`);

    const explosionRadius = weaponDef.explosionRadius;

    // Effetto esplosione
    const explosion = this.add.circle(x, y, explosionRadius, 0xff6600, 0.7);
    explosion.setDepth(1);

    this.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 1.5,
      duration: 500,
      onComplete: () => explosion.destroy()
    });

    // Scava cratere
    this.terrain.excavate(x, y, explosionRadius);
    this.updateTerrainGraphics(x, y, explosionRadius);

    // Controlla se sono stati rivelati pacchi armi
    this.checkRevealedCrates(x, y, explosionRadius);

    // Converti players per Physics
    const beetlesCompat = this.players.map(p => ({
      x: p.position.x,
      y: p.position.y,
      width: p.width,
      height: p.height,
      isAlive: p.isAlive(),
      maxHp: p.maxHealth,
      takeDamage: (dmg) => p.takeDamage(dmg),
      hp: p.health,
      id: p.id,
      player: p
    }));

    // Applica danni con l'arma specifica
    const damages = Physics.applyExplosionDamage(x, y, explosionRadius, beetlesCompat, weaponDef);

    // Processa i danni
    this.processExplosionDamages(damages, x, y, weaponDef);

    // Applica gravità animata ai players
    this.time.delayedCall(500, () => {
      this.applyAnimatedGravity(() => {
        // La gravità è stata applicata, il turno può continuare
        console.log('🪂 Gravity applied after delayed explosion');
      });
    });
  }

  /**
   * Anima il proiettile lungo la traiettoria
   */
  animateProjectile(result) {
    const weaponDef = result.weaponDef || WeaponDefinitions[WeaponType.POOP_BALL];
    const weaponType = result.weaponType || WeaponType.POOP_BALL;

    // Per granate con esplosione ritardata, il timer parte dal lancio
    const isTimedGrenade = weaponDef.delayedExplosion && !weaponDef.explodeOnImpact;
    let grenadeExploded = false;
    let grenadeTimer = null;
    let countdownText = null;

    // Crea il proiettile appropriato per il tipo di arma
    let projectile;
    const startX = result.trajectory[0].x;
    const startY = result.trajectory[0].y;

    if (weaponType === WeaponType.PISTOL) {
      // PISTOLA: proiettile piccolo e giallo/dorato
      projectile = this.add.graphics();
      projectile.fillStyle(0xffdd00, 1); // Giallo dorato
      projectile.fillEllipse(0, 0, 8, 4); // Ellisse orizzontale per bullet
      projectile.lineStyle(1, 0xcc9900);
      projectile.strokeEllipse(0, 0, 8, 4);
      projectile.setPosition(startX, startY);

      // Aggiungi scia luminosa
      this.createBulletTrail(projectile);

    } else if (weaponType === WeaponType.BAZOOKA) {
      // BAZOOKA: razzo con fiamma
      projectile = this.add.container(startX, startY);

      // Corpo del razzo
      const rocketBody = this.add.graphics();
      rocketBody.fillStyle(0x666666, 1); // Grigio metallico
      rocketBody.fillRect(-10, -3, 20, 6); // Corpo allungato

      // Punta del razzo (rossa)
      rocketBody.fillStyle(0xff0000, 1);
      rocketBody.fillTriangle(10, -4, 10, 4, 16, 0);

      // Alette posteriori
      rocketBody.fillStyle(0x444444, 1);
      rocketBody.fillTriangle(-10, -3, -10, -7, -6, -3);
      rocketBody.fillTriangle(-10, 3, -10, 7, -6, 3);

      projectile.add(rocketBody);

      // Fiamma del razzo (animata)
      const flame = this.add.graphics();
      flame.fillStyle(0xff6600, 0.8);
      flame.fillTriangle(-10, -2, -10, 2, -18, 0);
      flame.fillStyle(0xffff00, 0.6);
      flame.fillTriangle(-10, -1, -10, 1, -14, 0);
      projectile.add(flame);

      // Anima la fiamma
      this.tweens.add({
        targets: flame,
        scaleX: { from: 0.8, to: 1.2 },
        scaleY: { from: 0.8, to: 1.2 },
        alpha: { from: 0.6, to: 1 },
        duration: 50,
        yoyo: true,
        repeat: -1
      });

    } else if (weaponDef.icon) {
      // Altri proiettili: usa l'icona
      projectile = this.add.text(startX, startY, weaponDef.icon, { fontSize: '16px' });
      projectile.setOrigin(0.5);
    } else {
      // Default: cerchio giallo
      projectile = this.add.circle(startX, startY, 4, 0xffff00);
    }

    projectile.setDepth(5); // Sopra terreno, visibile durante volo

    // Per granate: avvia timer dal lancio e entra in fase fuga
    if (isTimedGrenade) {
      this.gamePhase = 'escaping';
      this.aimController.stopAiming();
      this.showEscapeMessage('SCAPPA! ← → per muoverti');

      let countdown = Math.ceil(weaponDef.explosionDelay / 1000);

      // Countdown visivo che segue la granata
      countdownText = this.add.text(0, 0, `${countdown}`, {
        fontSize: '16px',
        fill: '#ff0000',
        fontStyle: 'bold'
      });
      countdownText.setOrigin(0.5);
      countdownText.setDepth(15);

      // Timer che parte dal lancio
      grenadeTimer = this.time.addEvent({
        delay: 1000,
        callback: () => {
          countdown--;
          if (countdownText) {
            countdownText.setText(`${countdown}`);
          }

          if (countdown <= 0) {
            grenadeExploded = true;
          }
        },
        loop: true
      });
    }

    let currentPoint = 0;
    const animSpeed = 0.9; // Punti per frame

    // Timer per animazione
    const timer = this.time.addEvent({
      delay: 16, // ~60 FPS
      callback: () => {
        currentPoint += animSpeed;

        // Aggiorna posizione countdown se esiste
        if (countdownText && projectile) {
          countdownText.setPosition(projectile.x, projectile.y - 25);
        }

        // Se la granata è esplosa (timer scaduto), esplodi dove si trova
        if (grenadeExploded) {
          const explosionX = projectile.x;
          const explosionY = projectile.y;

          projectile.destroy();
          timer.remove();
          if (grenadeTimer) grenadeTimer.remove();
          if (countdownText) countdownText.destroy();
          this.hideEscapeMessage();

          // Esplosione!
          this.handleDelayedExplosion(explosionX, explosionY, weaponDef);
          this.endTurn();
          return;
        }

        if (currentPoint >= result.trajectory.length) {
          // Fine traiettoria
          projectile.destroy();
          timer.remove();

          if (result.impactPoint) {
            // Per granate con timer, aspetta che il timer finisca
            if (isTimedGrenade && !grenadeExploded) {
              // La granata si è fermata ma il timer non è ancora scaduto
              // Crea sprite granata ferma e aspetta
              this.handleGrenadeWaiting(result.impactPoint.x, result.impactPoint.y, weaponDef, grenadeTimer, countdownText);
            } else {
              if (countdownText) countdownText.destroy();
              this.handleImpact(result);
            }
          } else {
            // Nessun impatto (fuori schermo) → Frustrazione!
            console.log('😤 Shot went off-screen without hitting anything');
            if (this.soundManager) {
              this.soundManager.onOffTarget();
            }
            if (grenadeTimer) grenadeTimer.remove();
            if (countdownText) countdownText.destroy();
            this.hideEscapeMessage();
            this.endTurn();
          }

          return;
        }

        const pointIndex = Math.floor(currentPoint);
        const point = result.trajectory[pointIndex];
        const prevPoint = pointIndex > 0 ? result.trajectory[pointIndex - 1] : point;

        projectile.setPosition(point.x, point.y);

        // Ruota il proiettile nella direzione del movimento (per razzo e proiettile)
        if (weaponType === WeaponType.BAZOOKA || weaponType === WeaponType.PISTOL) {
          const dx = point.x - prevPoint.x;
          const dy = point.y - prevPoint.y;
          if (dx !== 0 || dy !== 0) {
            const angle = Math.atan2(dy, dx);
            projectile.setRotation(angle);
          }
        }
      },
      loop: true
    });
  }

  /**
   * Crea una scia luminosa per il proiettile della pistola
   */
  createBulletTrail(projectile) {
    // La scia viene creata come effetto di particelle semplificate
    const trail = this.add.graphics();
    trail.setDepth(4);

    // Aggiorna la scia ad ogni frame
    let prevPositions = [];
    const maxTrailLength = 5;

    this.time.addEvent({
      delay: 16,
      callback: () => {
        if (!projectile || !projectile.active) {
          trail.destroy();
          return;
        }

        // Aggiungi posizione corrente
        prevPositions.push({ x: projectile.x, y: projectile.y });

        // Mantieni solo le ultime N posizioni
        if (prevPositions.length > maxTrailLength) {
          prevPositions.shift();
        }

        // Disegna la scia
        trail.clear();
        prevPositions.forEach((pos, i) => {
          const alpha = (i + 1) / maxTrailLength * 0.5;
          const size = 2 + (i / maxTrailLength) * 2;
          trail.fillStyle(0xffff00, alpha);
          trail.fillCircle(pos.x, pos.y, size);
        });
      },
      loop: true
    });
  }

  /**
   * Gestisce la granata che si è fermata ma deve ancora esplodere
   */
  handleGrenadeWaiting(x, y, weaponDef, existingTimer, existingCountdown) {
    console.log(`💣 Grenade waiting at (${x}, ${y})`);

    // Crea sprite granata ferma
    const grenade = this.add.text(x, y, weaponDef.icon, {
      fontSize: '20px'
    });
    grenade.setOrigin(0.5);
    grenade.setDepth(15);

    // Sposta il countdown sulla posizione finale
    if (existingCountdown) {
      existingCountdown.setPosition(x, y - 25);
    }

    // Quando il timer esistente finisce, esplodi
    // Modifica il callback del timer esistente
    existingTimer.callback = () => {
      const currentText = existingCountdown ? parseInt(existingCountdown.text) : 0;
      const newCount = currentText - 1;

      if (existingCountdown) {
        existingCountdown.setText(`${newCount}`);
      }

      if (newCount <= 0) {
        existingTimer.remove();
        grenade.destroy();
        if (existingCountdown) existingCountdown.destroy();
        this.hideEscapeMessage();

        // Esplosione!
        this.handleDelayedExplosion(x, y, weaponDef);
        this.endTurn();
      }
    };
  }

  /**
   * Gestisce l'impatto del proiettile
   */
  handleImpact(result) {
    const { impactPoint, hitBeetle, weaponDef } = result;
    const weapon = weaponDef || WeaponDefinitions[WeaponType.POOP_BALL];

    // Raggio esplosione dall'arma
    const explosionRadius = weapon.explosionRadius;

    // Grafica esplosione
    const explosion = this.add.circle(
      impactPoint.x,
      impactPoint.y,
      explosionRadius,
      0xff6600,
      0.7
    );
    explosion.setDepth(1); // Sopra terreno ma sotto i giocatori

    this.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 1.5,
      duration: 500,
      onComplete: () => explosion.destroy()
    });

    // Scava cratere
    this.terrain.excavate(impactPoint.x, impactPoint.y, explosionRadius);
    this.updateTerrainGraphics(impactPoint.x, impactPoint.y, explosionRadius);

    // Controlla se sono stati rivelati pacchi armi
    this.checkRevealedCrates(impactPoint.x, impactPoint.y, explosionRadius);

    // Converti players per Physics
    const beetlesCompat = this.players.map(p => ({
      x: p.position.x,
      y: p.position.y,
      width: p.width,
      height: p.height,
      isAlive: p.isAlive(),
      maxHp: p.maxHealth,
      takeDamage: (dmg) => p.takeDamage(dmg),
      hp: p.health,
      id: p.id,
      player: p
    }));

    // Applica danni con l'arma specifica
    const damages = Physics.applyExplosionDamage(
      impactPoint.x,
      impactPoint.y,
      explosionRadius,
      beetlesCompat,
      weapon
    );

    // Processa i danni
    this.processExplosionDamages(damages, impactPoint.x, impactPoint.y, weapon);

    // Applica gravità animata ai players, poi termina il turno
    this.time.delayedCall(500, () => {
      this.applyAnimatedGravity(() => {
        this.endTurn();
      });
    });
  }

  /**
   * Processa i danni da esplosione e applica effetti
   */
  processExplosionDamages(damages, impactX, impactY, weaponDef) {
    // Controlla se qualcuno è stato colpito
    if (damages.length === 0) {
      // NESSUN GIOCATORE COLPITO → Frustrazione!
      console.log('😤 Shot hit terrain but no players affected');
      if (this.soundManager) {
        this.soundManager.onOffTarget();
      }
      return;
    }

    // Traccia eventi audio (UN SOLO suono per esplosione)
    let anyDeath = false;
    let maxIntensity = null;

    // Mostra danni (il danno è già stato applicato da Physics.applyExplosionDamage)
    damages.forEach(({ beetle, damage, distance, percent, knockbackMultiplier }) => {
      const player = beetle.player; // Recupera il player originale
      player.updateSprite();

      // SISTEMA PUNTEGGIO: L'attaccante guadagna punti per danni agli AVVERSARI
      if (this.activePlayer && player.team_id !== this.activePlayer.team_id) {
        // Punti = percentuale di danno x 100 (es: 30% = 3000 punti)
        const damagePoints = Math.round(percent * 100);
        this.activePlayer.addScore(damagePoints);
        console.log(`🏆 ${this.activePlayer.name} +${damagePoints} punti (danno ${Math.round(percent)}%)`);
      }

      // Log danno e traccia eventi audio
      if (player.isDead()) {
        console.log(`💀 ${player.name} KILLED by ${damage} HP (${Math.round(percent)}% at ${Math.round(distance)}px)`);

        // SISTEMA PUNTEGGIO: 500 punti per uccisione di avversario
        if (this.activePlayer && player.team_id !== this.activePlayer.team_id) {
          this.activePlayer.addScore(500);
          console.log(`🏆 ${this.activePlayer.name} +500 punti (uccisione!)`);
        }

        // Traccia che c'è stata almeno una morte
        anyDeath = true;
        player.fadeOut(this);
      } else {
        console.log(`💔 ${player.name} took ${damage} HP (${Math.round(percent)}% at ${Math.round(distance)}px) - HP: ${player.health}/${player.maxHealth}`);

        // Traccia l'intensità massima del danno
        if (this.soundManager) {
          const intensity = this.soundManager.calculateIntensity(damage, player.maxHealth);
          if (!maxIntensity || this.getIntensityPriority(intensity) > this.getIntensityPriority(maxIntensity)) {
            maxIntensity = intensity;
          }
        }
      }

      // KNOCKBACK: spostamento d'aria proporzionale al danno e al moltiplicatore dell'arma
      if (player.isAlive()) {
        // Calcola direzione dall'impatto al player
        const dx = player.position.x - impactX;
        const dy = player.position.y - impactY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
          // Normalizza direzione
          const dirX = dx / dist;
          const dirY = dy / dist;

          // Forza knockback: proporzionale al percent del danno e al moltiplicatore dell'arma
          const baseKnockback = 50;
          const knockbackForce = (percent / 100) * baseKnockback * (knockbackMultiplier || 1.0);

          // Calcola nuova posizione
          const newX = Math.max(20, Math.min(this.gameWidth - 20, player.position.x + dirX * knockbackForce));
          const newY = Math.max(player.height, Math.min(this.gameHeight, player.position.y + dirY * knockbackForce));

          // Anima lo spostamento
          this.tweens.add({
            targets: player.position,
            x: newX,
            y: newY,
            duration: 300,
            ease: 'Cubic.easeOut',
            onUpdate: () => player.updateSprite()
          });
        }
      }

      // Testo danno - mostra la % di vita persa
      const hpLostPercent = Math.round((damage / player.maxHealth) * 100);
      const damageText = this.add.text(
        player.position.x,
        player.position.y - 30,
        player.isAlive() ? `-${hpLostPercent}%` : '💀 KILLED!',
        {
          fontSize: '24px',
          fill: player.isAlive() ? '#ff4444' : '#ffffff',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3
        }
      );
      damageText.setOrigin(0.5);
      damageText.setDepth(20); // Sopra tutto per essere sempre visibile

      // Animazione lenta verso l'alto con fade
      this.tweens.add({
        targets: damageText,
        y: player.position.y - 100,
        alpha: 0,
        duration: 2000, // 2 secondi per salire lentamente
        ease: 'Quad.easeOut',
        onComplete: () => damageText.destroy()
      });
    });

    // AUDIO EVENT: Suona UN SOLO suono per questa esplosione
    if (damages.length > 0 && this.soundManager) {
      if (anyDeath) {
        // Se almeno un giocatore è morto → suono kill
        this.soundManager.onDeath();
      } else if (maxIntensity) {
        // Altrimenti suona il danno con intensità massima
        this.soundManager.onDamage(maxIntensity);
      }
    }
  }

  /**
   * Fine del turno (NUOVO SISTEMA SEMPLICE)
   */
  getIntensityPriority(intensity) {
    // Assegna priorità numerica alle intensità del danno
    const priorities = { low: 1, med: 2, hig: 3 };
    return priorities[intensity] || 0;
  }

  endTurn() {
    // Previeni chiamate multiple
    if (this.isTurnTransitioning) {
      console.warn('⚠️ endTurn() called during transition, ignoring');
      return;
    }

    console.log('⏭️ Turn ended');

    this.isTurnTransitioning = true;
    this.gamePhase = 'animating';

    // PRIMA controlla vittoria
    const team0Alive = this.players.filter(p => p.team_id === 0 && p.isAlive()).length;
    const team1Alive = this.players.filter(p => p.team_id === 1 && p.isAlive()).length;

    console.log(`📊 Alive: Team0=${team0Alive}, Team1=${team1Alive}`);

    if (team0Alive === 0 || team1Alive === 0) {
      console.log('🏁 GAME OVER! Starting end game sequence...');
      this.time.delayedCall(1500, () => {
        this.endGame();
      });
      return;
    }

    // Passa all'altro team
    this.currentTeamId = this.currentTeamId === 0 ? 1 : 0;

    // Incrementa l'element per il team che giocherà DOPO (cioè il team a cui passiamo)
    // NO! Dobbiamo incrementare l'element PRIMA di cambiare team
    // Ripristina il vecchio team per incrementare
    const teamThatJustPlayed = this.currentTeamId === 0 ? 1 : 0;

    // Incrementa element del team che ha appena giocato
    if (teamThatJustPlayed === 0) {
      const maxElement0 = Math.max(...this.players.filter(p => p.team_id === 0).map(p => p.team_element));
      this.team0CurrentElement++;
      if (this.team0CurrentElement > maxElement0) {
        this.team0CurrentElement = 1; // Wrap around
      }
    } else {
      const maxElement1 = Math.max(...this.players.filter(p => p.team_id === 1).map(p => p.team_element));
      this.team1CurrentElement++;
      if (this.team1CurrentElement > maxElement1) {
        this.team1CurrentElement = 1; // Wrap around
      }
    }

    // Se torniamo al team 0, aumenta il numero di turno
    if (this.currentTeamId === 0) {
      this.currentTurn++;
    }

    const nextElement = this.currentTeamId === 0 ? this.team0CurrentElement : this.team1CurrentElement;
    console.log(`⏭️ Next: Team ${this.currentTeamId}, Element ${nextElement}`);

    // Prossimo turno
    this.time.delayedCall(1000, () => {
      this.startTurn();
    });
  }

  /**
   * Fine della partita
   */
  endGame() {
    console.log('🏁 Game ended!');

    const team0Alive = this.players.filter(p => p.team_id === 0 && p.isAlive()).length;
    const team1Alive = this.players.filter(p => p.team_id === 1 && p.isAlive()).length;

    let winnerTeam;
    let winnerText;
    if (team0Alive > team1Alive) {
      winnerTeam = 0;
      winnerText = 'Team Verde vince!';
    } else if (team1Alive > team0Alive) {
      winnerTeam = 1;
      winnerText = 'Team Rosso vince!';
    } else {
      winnerTeam = -1;
      winnerText = 'Pareggio!';
    }

    // Ordina i giocatori per punteggio (dal più alto al più basso)
    const sortedPlayers = [...this.players].sort((a, b) => b.score - a.score);

    // Overlay vittoria
    const overlay = this.add.rectangle(
      this.gameWidth / 2,
      this.gameHeight / 2,
      this.gameWidth,
      this.gameHeight,
      0x000000,
      0.85
    );
    overlay.setDepth(200);

    // Titolo vittoria
    const winText = this.add.text(
      this.gameWidth / 2,
      80,
      `🏆 ${winnerText}`,
      {
        fontSize: '42px',
        fill: winnerTeam === 0 ? '#44ff44' : winnerTeam === 1 ? '#ff4444' : '#ffff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    winText.setOrigin(0.5);
    winText.setDepth(201);

    // Titolo classifica
    const scoreTitle = this.add.text(
      this.gameWidth / 2,
      140,
      '📊 CLASSIFICA FINALE',
      {
        fontSize: '28px',
        fill: '#ffffff',
        fontStyle: 'bold'
      }
    );
    scoreTitle.setOrigin(0.5);
    scoreTitle.setDepth(201);

    // Mostra punteggi di tutti i giocatori
    let yPos = 190;
    sortedPlayers.forEach((player, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      const teamColor = player.team_id === 0 ? '#44ff44' : '#ff4444';
      const teamBadge = player.team_id === 0 ? '🟢' : '🔴';
      const status = player.isAlive() ? '' : ' 💀';

      const scoreText = this.add.text(
        this.gameWidth / 2,
        yPos,
        `${medal} ${teamBadge} ${player.name}${status}: ${player.score.toLocaleString()} punti`,
        {
          fontSize: '22px',
          fill: teamColor,
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 2
        }
      );
      scoreText.setOrigin(0.5);
      scoreText.setDepth(201);
      yPos += 40;
    });

    // Calcola punteggio totale per team
    const team0Score = this.players.filter(p => p.team_id === 0).reduce((sum, p) => sum + p.score, 0);
    const team1Score = this.players.filter(p => p.team_id === 1).reduce((sum, p) => sum + p.score, 0);

    // Mostra totali team
    yPos += 20;
    const teamScoreText = this.add.text(
      this.gameWidth / 2,
      yPos,
      `Team Verde: ${team0Score.toLocaleString()} pts  |  Team Rosso: ${team1Score.toLocaleString()} pts`,
      {
        fontSize: '18px',
        fill: '#aaaaaa',
        fontStyle: 'bold'
      }
    );
    teamScoreText.setOrigin(0.5);
    teamScoreText.setDepth(201);

    // Istruzioni restart
    const restartText = this.add.text(
      this.gameWidth / 2,
      this.gameHeight - 50,
      'Premi R per ricominciare',
      {
        fontSize: '24px',
        fill: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 20, y: 10 }
      }
    );
    restartText.setOrigin(0.5);
    restartText.setDepth(201);

    // Restart
    this.input.keyboard.once('keydown-R', () => {
      this.scene.restart();
    });
  }

  /**
   * Aggiorna UI
   */
  updateUI() {
    const teamName = this.currentTeamId === 0 ? 'Verde' : 'Rosso';
    this.turnText.setText(`Turno ${this.currentTurn} - Team ${teamName}`);

    const seconds = Math.ceil(this.turnTimeLeft / 1000);
    this.timerText.setText(`${seconds}s`);

    if (seconds <= 3) {
      this.timerText.setColor('#ff0000');
    } else {
      this.timerText.setColor('#ffff00');
    }

    // Aggiorna info giocatore corrente
    if (this.activePlayer && this.currentPlayerText) {
      const teamColor = this.activePlayer.team_id === 0 ? '#44ff44' : '#ff4444';
      this.currentPlayerText.setText(`Giocatore: ${this.activePlayer.name}`);
      this.currentPlayerText.setColor(teamColor);
    }

    // Aggiorna info arma corrente
    if (this.activePlayer && this.currentWeaponText) {
      const weaponDef = this.activePlayer.weaponInventory.getCurrentWeaponDef();
      const ammo = this.activePlayer.weaponInventory.getAmmo(this.activePlayer.weaponInventory.getCurrentWeapon());
      const ammoText = ammo === Infinity ? '∞' : ammo;
      this.currentWeaponText.setText(`${weaponDef.icon} ${weaponDef.name} (${ammoText})`);
    }
  }

  /**
   * Controlla se il terreno è troppo ripido per essere scalato
   * @param {number} fromX - Posizione X di partenza
   * @param {number} toX - Posizione X di destinazione
   * @returns {boolean} True se si può camminare, false se troppo ripido
   */
  canWalkTo(fromX, toX) {
    const fromGroundY = this.terrain.getGroundY(Math.floor(fromX));
    const toGroundY = this.terrain.getGroundY(Math.floor(toX));

    // Calcola la differenza di altezza
    const heightDiff = fromGroundY - toGroundY; // Positivo = salita, Negativo = discesa

    // Se stiamo scendendo o restiamo allo stesso livello, sempre permesso
    if (heightDiff <= 0) {
      return true;
    }

    // Per salite piccole (≤ 3 pixel), permettiamo sempre
    // Questo include l'erba e le piccole irregolarità del terreno
    if (heightDiff <= 3) {
      return true;
    }

    // Per salite più grandi, usa la pendenza su un campione più largo
    // Invece di usare il movimento corrente, campiona su 10 pixel
    const sampleDist = 10;
    const direction = toX > fromX ? 1 : -1;
    const sampleToX = Math.floor(fromX) + (sampleDist * direction);
    const sampleToGroundY = this.terrain.getGroundY(sampleToX);
    const sampleHeightDiff = fromGroundY - sampleToGroundY;

    // Se stiamo scendendo nel campione, permesso
    if (sampleHeightDiff <= 0) {
      return true;
    }

    // Calcola la pendenza sul campione più largo
    const slope = sampleHeightDiff / sampleDist;

    // Pendenza massima permessa (circa 60 gradi = tan(60°) ≈ 1.73)
    const maxSlope = 1.73;

    // Se la pendenza è troppo ripida, non si può salire
    if (slope > maxSlope) {
      return false;
    }

    // Controlla se c'è un soffitto (overhang) sopra la destinazione
    // Usa l'altezza effettiva del cockroach scalato
    const cockroachHeight = this.activePlayer ? this.activePlayer.height : 24;
    for (let y = toGroundY - cockroachHeight; y < toGroundY; y++) {
      if (this.terrain.isSolid(Math.floor(toX), Math.floor(y))) {
        // C'è un ostacolo sopra, non possiamo passare
        return false;
      }
    }

    return true;
  }

  /**
   * Esegue un salto (50px avanti, 30px altezza) con traiettoria ad arco e collisioni
   */
  performJump() {
    if (!this.activePlayer || this.isJumping) return;

    this.isJumping = true;

    const startX = this.activePlayer.position.x;
    const startY = this.activePlayer.position.y;

    // Direzione del salto basata sulla direzione dello scarafaggio
    const direction = this.activePlayer.container.scaleX > 0 ? 1 : -1;
    const jumpDistanceX = 50 * direction;
    const jumpHeight = 30;

    // Perde punti per il salto
    this.activePlayer.addScore(-5);

    // Calcola la traiettoria parabolica
    const numSteps = 30;
    const trajectory = [];

    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      // Posizione X: movimento lineare
      const x = startX + jumpDistanceX * t;
      // Posizione Y: parabola (4*h*t*(1-t) per arco perfetto)
      const y = startY - 4 * jumpHeight * t * (1 - t);
      trajectory.push({ x, y, t });
    }

    // Verifica collisioni lungo la traiettoria
    let collisionPoint = null;
    let collisionIndex = -1;

    for (let i = 1; i < trajectory.length; i++) {
      const point = trajectory[i];

      // Controlla se il punto è dentro il terreno
      if (this.terrain.isSolid(Math.floor(point.x), Math.floor(point.y))) {
        collisionPoint = trajectory[i - 1]; // Usa il punto precedente
        collisionIndex = i - 1;
        break;
      }

      // Controlla se il punto è fuori dai limiti
      if (point.x < 10 || point.x > this.gameWidth - 10) {
        collisionPoint = trajectory[i - 1];
        collisionIndex = i - 1;
        break;
      }
    }

    // Se c'è collisione, tronca la traiettoria
    const finalTrajectory = collisionPoint
      ? trajectory.slice(0, collisionIndex + 1)
      : trajectory;

    // Punto finale
    let landingX, landingY;
    const lastPoint = finalTrajectory[finalTrajectory.length - 1];

    if (collisionPoint) {
      // Sbatte contro un ostacolo - cade verticalmente dal punto di collisione
      landingX = collisionPoint.x;
      landingY = this.terrain.getGroundY(Math.floor(landingX));
    } else {
      // Atterraggio normale
      landingX = startX + jumpDistanceX;
      landingX = Math.max(20, Math.min(this.gameWidth - 20, landingX));
      landingY = this.terrain.getGroundY(Math.floor(landingX));
    }

    // Anima le zampe durante il salto
    let legPhase = 0;
    const legTimer = this.time.addEvent({
      delay: 30,
      callback: () => {
        legPhase += 1.5;
        this.activePlayer.drawLegs(legPhase);
      },
      repeat: 30
    });

    // Anima lungo la traiettoria
    let currentStep = 0;
    const jumpDuration = collisionPoint ? 300 : 400;
    const stepDelay = jumpDuration / finalTrajectory.length;

    const jumpTimer = this.time.addEvent({
      delay: stepDelay,
      callback: () => {
        currentStep++;

        if (currentStep >= finalTrajectory.length) {
          // Fine della traiettoria - gestisci atterraggio o caduta
          jumpTimer.remove();

          if (collisionPoint) {
            // Sbattuto! Mostra effetto impatto
            const impactText = this.add.text(collisionPoint.x, collisionPoint.y - 20, '💫', {
              fontSize: '20px'
            });
            impactText.setOrigin(0.5);
            impactText.setDepth(25);

            this.tweens.add({
              targets: impactText,
              alpha: 0,
              y: collisionPoint.y - 50,
              duration: 500,
              onComplete: () => impactText.destroy()
            });

            // Cade giù dal punto di collisione
            this.tweens.add({
              targets: this.activePlayer.position,
              y: landingY,
              duration: 200,
              ease: 'Bounce.easeOut',
              onUpdate: () => this.activePlayer.updateSprite(),
              onComplete: () => this.finishJump(legTimer, landingX, landingY)
            });
          } else {
            // Atterraggio normale
            this.tweens.add({
              targets: this.activePlayer.position,
              y: landingY,
              duration: 100,
              ease: 'Quad.easeIn',
              onUpdate: () => this.activePlayer.updateSprite(),
              onComplete: () => this.finishJump(legTimer, landingX, landingY)
            });
          }
          return;
        }

        // Muovi allo step corrente
        const point = finalTrajectory[currentStep];
        this.activePlayer.position.x = point.x;
        this.activePlayer.position.y = point.y;
        this.activePlayer.updateSprite();
      },
      loop: true
    });
  }

  /**
   * Completa il salto e resetta lo stato
   */
  finishJump(legTimer, landingX, landingY) {
    legTimer.remove();
    this.activePlayer.drawLegs(0);
    this.isJumping = false;

    // Controlla raccolta pacchi
    this.checkCrateCollection(this.activePlayer);

    // Aggiorna posizione mira se in fase aiming
    if (this.gamePhase === 'aiming') {
      this.aimController.shooterX = landingX;
      this.aimController.shooterY = landingY - this.activePlayer.height;
    }

    // Reset del tasto jump usando il keyboard manager
    if (this.keyboardManager) {
      this.keyboardManager.resetKey('jump');
    }
  }

  /**
   * Applica gravità animata a tutti i giocatori dopo un'esplosione
   * @param {Function} onComplete - Callback da chiamare quando tutti hanno finito di cadere
   */
  applyAnimatedGravity(onComplete) {
    const fallingPlayers = [];

    // Controlla quali giocatori devono cadere
    this.players.forEach(player => {
      if (!player.isAlive()) return;

      const currentY = player.position.y;
      const groundY = this.terrain.getGroundY(Math.floor(player.position.x));

      // Se il giocatore è sopra il terreno (con margine), deve cadere
      if (currentY < groundY - 2) {
        fallingPlayers.push({
          player,
          startY: currentY,
          endY: groundY
        });
      }
    });

    if (fallingPlayers.length === 0) {
      // Nessuno deve cadere
      if (onComplete) onComplete();
      return;
    }

    console.log(`🪂 ${fallingPlayers.length} cockroaches falling...`);

    let completedCount = 0;

    fallingPlayers.forEach(({ player, startY, endY }) => {
      const fallDistance = endY - startY;
      // Durata proporzionale alla distanza (minimo 200ms, massimo 800ms)
      const duration = Math.min(800, Math.max(200, fallDistance * 3));

      // Anima la caduta
      this.tweens.add({
        targets: player.position,
        y: endY,
        duration: duration,
        ease: 'Bounce.easeOut', // Rimbalzo quando atterra
        onUpdate: () => {
          player.updateSprite();
        },
        onComplete: () => {
          player.updateSprite();
          completedCount++;

          // Quando tutti hanno finito di cadere
          if (completedCount >= fallingPlayers.length && onComplete) {
            onComplete();
          }
        }
      });
    });
  }

  /**
   * Mostra messaggio di fuga
   */
  showEscapeMessage(text) {
    if (this.escapeMessage) {
      this.escapeMessage.destroy();
    }

    this.escapeMessage = this.add.text(
      this.gameWidth / 2,
      80,
      text,
      {
        fontSize: '24px',
        fill: '#ff0000',
        fontStyle: 'bold',
        backgroundColor: '#000000cc',
        padding: { x: 20, y: 10 }
      }
    );
    this.escapeMessage.setOrigin(0.5);
    this.escapeMessage.setDepth(50);

    // Animazione lampeggiante
    this.tweens.add({
      targets: this.escapeMessage,
      alpha: 0.5,
      duration: 300,
      yoyo: true,
      repeat: -1
    });
  }

  /**
   * Nasconde messaggio di fuga
   */
  hideEscapeMessage() {
    if (this.escapeMessage) {
      this.escapeMessage.destroy();
      this.escapeMessage = null;
    }
  }

  /**
   * Apre il selettore armi
   */
  openWeaponSelector() {
    if (this.isSelectingWeapon || !this.activePlayer) return;

    this.isSelectingWeapon = true;
    console.log('🔫 Opening weapon selector');

    // Mostra il selettore
    this.weaponSelector.show(
      this.activePlayer.weaponInventory,
      (weaponType, weaponDef) => {
        this.isSelectingWeapon = false;

        // Reset di tutti i tasti dopo la chiusura del selettore
        if (this.keyboardManager) {
          this.keyboardManager.forceReset();
        }

        if (weaponType && weaponDef) {
          console.log(`🔫 Selected weapon: ${weaponDef.name}`);
          // Aggiorna l'arma nell'AimController
          this.aimController.setWeapon(weaponType, weaponDef);
          // Aggiorna UI con la nuova arma
          this.updateUI();
        } else {
          console.log('🔫 Weapon selection cancelled');
        }
      }
    );
  }

  /**
   * Aggiorna info debug
   */
  updateDebugInfo() {
    const fpsElement = document.getElementById('fps');
    const modeElement = document.getElementById('mode');
    const angleElement = document.getElementById('angle');
    const powerElement = document.getElementById('power');

    if (fpsElement) {
      fpsElement.textContent = `FPS: ${Math.round(this.game.loop.actualFps)}`;
    }
    if (modeElement) {
      modeElement.textContent = `Mode: ${this.gamePhase}`;
    }
    if (angleElement && this.aimController) {
      angleElement.textContent = `Angle: ${Math.round(this.aimController.angle)}°`;
    }
    if (powerElement && this.aimController) {
      powerElement.textContent = `Power: ${Math.round(this.aimController.power * 100)}%`;
    }
  }

  update(time, delta) {
    // === ANIMAZIONE NUVOLE (stile Worms) ===
    if (this.clouds && this.clouds.length > 0) {
      const deltaSeconds = delta / 1000;
      this.clouds.forEach(cloudData => {
        // Muovi la nuvola verso destra
        cloudData.sprite.x += cloudData.speed * deltaSeconds;

        // Se esce dallo schermo a destra, riportala a sinistra
        if (cloudData.sprite.x > this.gameWidth + 100) {
          cloudData.sprite.x = -100;
        }

        // Leggero movimento verticale ondulatorio
        const wobble = Math.sin(time * 0.001 + cloudData.baseY) * 2;
        cloudData.sprite.y = cloudData.baseY + wobble;
      });
    }

    // Aggiorna controller di mira
    if (this.aimController && !this.isSelectingWeapon) {
      this.aimController.update(delta);
    }

    // Aggiorna selettore armi
    if (this.weaponSelector) {
      this.weaponSelector.update();
    }

    // Gestione apertura selettore armi con ENTER (usa KeyboardManager)
    if (this.gamePhase === 'aiming' && !this.isSelectingWeapon && this.activePlayer) {
      if (this.keyboardManager.justPressed('enter')) {
        this.openWeaponSelector();
      }
    }

    // Movimento laterale del player attivo con LEFT/RIGHT
    // Permesso sia in fase 'aiming' che in fase 'escaping' (fuga da esplosione)
    const canMove = (this.gamePhase === 'aiming' || this.gamePhase === 'escaping') &&
                    this.activePlayer && this.aimController.cursors && !this.isSelectingWeapon;

    if (canMove) {
      // Velocità maggiore durante la fuga!
      const moveSpeed = this.gamePhase === 'escaping' ? 150 : 80;
      const deltaSeconds = delta / 1000;

      if (this.aimController.cursors.left.isDown) {
        const newX = this.activePlayer.position.x - (moveSpeed * deltaSeconds);
        if (newX > 20 && this.canWalkTo(this.activePlayer.position.x, newX)) {
          const groundY = this.terrain.getGroundY(Math.floor(newX));
          this.activePlayer.moveTo(newX, groundY);
          this.activePlayer.updateSprite();
          // Perde 1 punto per movimento
          this.activePlayer.addScore(-1);
          // Controlla raccolta pacchi
          this.checkCrateCollection(this.activePlayer);
          if (this.gamePhase === 'aiming') {
            this.aimController.shooterX = newX;
            this.aimController.shooterY = groundY - this.activePlayer.height;
          }
        }
      } else if (this.aimController.cursors.right.isDown) {
        const newX = this.activePlayer.position.x + (moveSpeed * deltaSeconds);
        if (newX < this.gameWidth - 20 && this.canWalkTo(this.activePlayer.position.x, newX)) {
          const groundY = this.terrain.getGroundY(Math.floor(newX));
          this.activePlayer.moveTo(newX, groundY);
          this.activePlayer.updateSprite();
          // Perde 1 punto per movimento
          this.activePlayer.addScore(-1);
          // Controlla raccolta pacchi
          this.checkCrateCollection(this.activePlayer);
          if (this.gamePhase === 'aiming') {
            this.aimController.shooterX = newX;
            this.aimController.shooterY = groundY - this.activePlayer.height;
          }
        }
      }

      // SALTO con tasto C (50px avanti, 30px altezza) - usa KeyboardManager
      if (this.keyboardManager.justPressed('jump') && !this.isJumping) {
        this.performJump();
      }
    }

    // Aggiorna timer turno (si ferma quando si carica il colpo O si seleziona arma)
    if (this.gamePhase === 'aiming') {
      // Se si sta caricando O selezionando arma, pausa il timer
      const shouldPause = (this.aimController && this.aimController.isCharging) || this.isSelectingWeapon;

      if (shouldPause) {
        if (!this.timerPaused) {
          this.timerPaused = true;
          this.pausedTimeLeft = this.turnTimeLeft;
          console.log('⏸️ Timer paused');
        }
        // Mantieni il tempo congelato
        this.turnTimeLeft = this.pausedTimeLeft;
      } else {
        // Timer normale
        if (this.timerPaused) {
          // Riprendi da dove eri rimasto
          this.timerPaused = false;
          this.turnStartTime = Date.now() - (15000 - this.pausedTimeLeft);
        }
        const elapsed = Date.now() - this.turnStartTime;
        this.turnTimeLeft = Math.max(0, 15000 - elapsed);
      }

      if (this.turnTimeLeft === 0 && !this.timerPaused) {
        // Tempo scaduto - penalità 25% HP
        const penalty = Math.ceil(this.activePlayer.maxHealth * 0.25);
        this.activePlayer.takeDamage(penalty);
        this.activePlayer.updateSprite();

        // EVENT: onTimeout - Frustrazione per tempo scaduto
        if (this.soundManager) {
          this.soundManager.onTimeout();
        }

        // Mostra penalità
        const penaltyText = this.add.text(
          this.activePlayer.position.x,
          this.activePlayer.position.y - 60,
          `⏱️ -${penalty} HP (Timeout!)`,
          {
            fontSize: '18px',
            fill: '#ffaa00',
            fontStyle: 'bold'
          }
        );
        penaltyText.setOrigin(0.5);

        this.tweens.add({
          targets: penaltyText,
          y: this.activePlayer.position.y - 100,
          alpha: 0,
          duration: 1500,
          onComplete: () => penaltyText.destroy()
        });

        console.log(`⏱️ Timeout! ${this.activePlayer.name} loses ${penalty} HP`);

        this.aimController.stopAiming();
        this.endTurn();
      }

      this.updateUI();
    }

    // Controllo morte per caduta nei burroni
    let anyFallDeath = false;
    this.players.forEach(player => {
      if (player.isAlive() && player.position.y > this.gameHeight + 50) {
        console.log(`💀 ${player.name} è caduto in un burrone!`);

        // Uccidi il player
        player.takeDamage(9999);
        player.updateSprite();

        // Traccia che c'è stata almeno una morte per caduta
        anyFallDeath = true;

        // Avvia fade out animato
        player.fadeOut(this);

        // Mostra messaggio di morte
        const fallText = this.add.text(
          player.position.x,
          this.gameHeight - 50,
          `${player.name} 💀 CADUTO!`,
          {
            fontSize: '20px',
            fill: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
          }
        );
        fallText.setOrigin(0.5);
        fallText.setDepth(20);

        this.tweens.add({
          targets: fallText,
          y: this.gameHeight - 100,
          alpha: 0,
          duration: 2000,
          onComplete: () => fallText.destroy()
        });
      }
    });

    // AUDIO EVENT: Suona UN SOLO suono se c'è stata almeno una morte per caduta
    if (anyFallDeath && this.soundManager) {
      this.soundManager.onDeath();
    }

    // Aggiorna debug info
    this.updateDebugInfo();
  }
}
