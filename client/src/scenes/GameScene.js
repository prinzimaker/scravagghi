import { TerrainMask } from '../terrain/TerrainMask.js';
import { Player } from '../entities/Player.js';
import { Physics } from '../physics/Physics.js';
import { AimController } from '../input/AimController.js';
import { DeterministicRandom } from '../utils/DeterministicRandom.js';
import { SoundManager } from '../managers/SoundManager.js';
import { WeaponSelector, WeaponDefinitions, WeaponType, CrateContents } from '../weapons/WeaponSystem.js';

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
    this.turnTimeLeft = 10000;
    this.gamePhase = 'aiming';
    this.isTurnTransitioning = false; // Previene chiamate multiple a endTurn()

    // Seed per deterministico
    this.gameSeed = Date.now();
    this.turnSeed = this.gameSeed;

    // Inizializza terreno
    this.initTerrain();

    // Inizializza casse di armi nascoste nel terreno
    this.initWeaponCrates();

    // Inizializza giocatori (nuovo sistema!)
    this.initPlayers();

    // Render terreno
    this.renderTerrain();

    // Inizializza controller di mira
    this.aimController = new AimController(this);
    this.aimController.create();

    // Inizializza selettore armi
    this.weaponSelector = new WeaponSelector(this);
    this.weaponSelector.create();
    this.isSelectingWeapon = false;

    // Tasto ENTER per aprire selettore armi
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    // Listener per colpo sparato
    this.events.on('shot-fired', this.handleShot, this);

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
   * Inizializza le casse di armi nascoste nel terreno
   */
  initWeaponCrates() {
    this.weaponCrates = [];
    const rng = new DeterministicRandom(this.gameSeed + 1000);

    // Genera 5-8 casse nascoste nel terreno
    const numCrates = rng.nextInt(5, 9);

    for (let i = 0; i < numCrates; i++) {
      // Posizione X casuale (evita i bordi)
      const x = rng.nextInt(100, this.gameWidth - 100);

      // Trova la superficie del terreno in quella posizione
      const surfaceY = this.terrain.getGroundY(x);

      // La cassa è sotterrata 30-80 pixel sotto la superficie
      const depth = rng.nextInt(30, 80);
      const y = surfaceY + depth;

      // Assicurati che sia dentro il terreno
      if (y < this.gameHeight - 20) {
        // Contenuto casuale della cassa
        const contentIndex = rng.nextInt(0, CrateContents.length);
        const content = CrateContents[contentIndex];

        this.weaponCrates.push({
          x,
          y,
          width: 24,
          height: 24,
          content,
          revealed: false,
          collected: false,
          sprite: null
        });
      }
    }

    console.log(`📦 Generated ${this.weaponCrates.length} hidden weapon crates`);
  }

  /**
   * Controlla se una cassa è stata rivelata (il terreno sopra è stato distrutto)
   */
  checkRevealedCrates() {
    for (const crate of this.weaponCrates) {
      if (crate.revealed || crate.collected) continue;

      // Controlla se c'è terreno sopra la cassa
      // Se non c'è terreno sopra, la cassa è rivelata
      let terrainAbove = false;
      for (let checkY = crate.y - crate.height; checkY >= 0; checkY -= 5) {
        if (this.terrain.isSolid(crate.x, checkY)) {
          terrainAbove = true;
          break;
        }
      }

      // Se non c'è terreno sopra, rivela la cassa
      if (!terrainAbove) {
        this.revealCrate(crate);
      }
    }
  }

  /**
   * Rivela una cassa (crea lo sprite visibile)
   */
  revealCrate(crate) {
    if (crate.revealed) return;

    crate.revealed = true;
    console.log(`📦 Crate revealed at (${crate.x}, ${crate.y}) containing ${crate.content.name}`);

    // Crea sprite della cassa
    crate.sprite = this.add.text(crate.x, crate.y, '📦', {
      fontSize: '28px'
    });
    crate.sprite.setOrigin(0.5);
    crate.sprite.setDepth(8); // Sotto i giocatori ma sopra il terreno

    // Animazione di apparizione
    crate.sprite.setScale(0);
    this.tweens.add({
      targets: crate.sprite,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });

    // La cassa cade per gravità se non c'è terreno sotto
    this.dropCrate(crate);
  }

  /**
   * Fa cadere la cassa finché non tocca il terreno
   */
  dropCrate(crate) {
    const groundY = this.terrain.getGroundY(crate.x);
    if (crate.y < groundY) {
      // Anima la caduta
      this.tweens.add({
        targets: crate,
        y: groundY,
        duration: 300,
        ease: 'Bounce.easeOut',
        onUpdate: () => {
          if (crate.sprite) {
            crate.sprite.setPosition(crate.x, crate.y);
          }
        }
      });
    }
  }

  /**
   * Controlla se un giocatore ha raccolto una cassa
   */
  checkCrateCollection(player) {
    for (const crate of this.weaponCrates) {
      if (!crate.revealed || crate.collected) continue;

      // Controlla collisione giocatore-cassa
      const dx = Math.abs(player.position.x - crate.x);
      const dy = Math.abs(player.position.y - crate.y);

      if (dx < 20 && dy < 20) {
        this.collectCrate(crate, player);
        return true;
      }
    }
    return false;
  }

  /**
   * Raccoglie una cassa e aggiunge il contenuto all'inventario del giocatore
   */
  collectCrate(crate, player) {
    crate.collected = true;
    console.log(`📦 ${player.name} collected ${crate.content.name}!`);

    // Aggiungi munizioni all'inventario
    player.weaponInventory.addAmmo(crate.content.type, crate.content.amount);

    // Mostra messaggio di raccolta
    const pickupText = this.add.text(
      crate.x,
      crate.y - 20,
      `${crate.content.icon} ${crate.content.name}`,
      {
        fontSize: '16px',
        fill: '#00ff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    pickupText.setOrigin(0.5);
    pickupText.setDepth(25);

    // Animazione del testo
    this.tweens.add({
      targets: pickupText,
      y: crate.y - 60,
      alpha: 0,
      duration: 1500,
      onComplete: () => pickupText.destroy()
    });

    // Distruggi lo sprite della cassa
    if (crate.sprite) {
      this.tweens.add({
        targets: crate.sprite,
        scale: 0,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          crate.sprite.destroy();
          crate.sprite = null;
        }
      });
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
   * Renderizza il terreno come texture
   */
  renderTerrain() {
    // Crea texture per il terreno
    const graphics = this.add.graphics();
    graphics.setDepth(0); // Terreno in fondo

    // Disegna il terreno pixel per pixel
    for (let x = 0; x < this.gameWidth; x++) {
      for (let y = 0; y < this.gameHeight; y++) {
        if (this.terrain.isSolid(x, y)) {
          // Colore variabile per dare texture
          const shade = ((x + y) % 10) * 10;
          const color = Phaser.Display.Color.GetColor(
            100 + shade,
            80 + shade,
            40 + shade
          );
          graphics.fillStyle(color, 1);
          graphics.fillRect(x, y, 1, 1);
        }
      }
    }

    this.terrainGraphics = graphics;
  }

  /**
   * Aggiorna il rendering del terreno dopo una modifica
   */
  updateTerrainGraphics(x, y, radius) {
    // Ridisegna solo l'area modificata
    const minX = Math.max(0, x - radius);
    const maxX = Math.min(this.gameWidth, x + radius);
    const minY = Math.max(0, y - radius);
    const maxY = Math.min(this.gameHeight, y + radius);

    for (let px = minX; px < maxX; px++) {
      for (let py = minY; py < maxY; py++) {
        if (!this.terrain.isSolid(px, py)) {
          // Cancella il pixel
          this.terrainGraphics.fillStyle(0x1a1a2e, 1);
          this.terrainGraphics.fillRect(px, py, 1, 1);
        }
      }
    }

    // Controlla se qualche cassa nascosta è stata rivelata
    this.checkRevealedCrates();
  }

  /**
   * Crea UI del gioco
   */
  createUI() {
    // TITOLO PRINCIPALE in cima
    this.titleText = this.add.text(this.gameWidth / 2, 35, 'SCRAVAGGHI', {
      fontSize: '42px',
      fill: '#ffcc00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setDepth(100); // Sopra tutto

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
    this.instructionsText = this.add.text(this.gameWidth - 10, 60,
      '↑↓ Angolo | ←→ Muovi | SPAZIO Spara | ENTER Armi', {
      fontSize: '11px',
      fill: '#aaaaaa',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 4 }
    });
    this.instructionsText.setOrigin(1, 0); // Allineato a destra
  }

  /**
   * Inizia un nuovo turno (NUOVO SISTEMA SEMPLICE)
   */
  startTurn() {
    // Usa l'element corrente per questo team
    const currentElement = this.currentTeamId === 0 ? this.team0CurrentElement : this.team1CurrentElement;

    this.gamePhase = 'aiming';
    this.turnTimeLeft = 10000;
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

    // Applica gravità ai players
    this.players.forEach(player => {
      const beetleCompat = {
        x: player.position.x,
        y: player.position.y,
        isAlive: player.isAlive(),
        moveTo: (nx, ny) => player.moveTo(nx, ny)
      };

      if (Physics.applyGravityToBeetle(beetleCompat, this.terrain)) {
        player.updateSprite();
      }
    });
  }

  /**
   * Anima il proiettile lungo la traiettoria
   */
  animateProjectile(result) {
    const weaponDef = result.weaponDef || WeaponDefinitions[WeaponType.POOP_BALL];

    // Per granate con esplosione ritardata, il timer parte dal lancio
    const isTimedGrenade = weaponDef.delayedExplosion && !weaponDef.explodeOnImpact;
    let grenadeExploded = false;
    let grenadeTimer = null;
    let countdownText = null;

    // Crea il proiettile con l'icona dell'arma
    let projectile;
    if (weaponDef.icon) {
      projectile = this.add.text(
        result.trajectory[0].x,
        result.trajectory[0].y,
        weaponDef.icon,
        { fontSize: '16px' }
      );
      projectile.setOrigin(0.5);
    } else {
      projectile = this.add.circle(
        result.trajectory[0].x,
        result.trajectory[0].y,
        4,
        0xffff00
      );
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

        const point = result.trajectory[Math.floor(currentPoint)];
        projectile.setPosition(point.x, point.y);
      },
      loop: true
    });
  }

  /**
   * Gestisce la granata che si è fermata ma deve ancora esplodere
   */
  handleGrenadeWaiting(x, y, weaponDef, existingTimer, existingCountdown) {
    console.log(`💣 Grenade waiting at (${x}, ${y})`);

    // Ferma il timer esistente
    if (existingTimer) {
      existingTimer.remove();
    }

    // Crea sprite granata ferma
    const grenade = this.add.text(x, y, weaponDef.icon, {
      fontSize: '20px'
    });
    grenade.setOrigin(0.5);
    grenade.setDepth(15);

    // Prendi il countdown corrente
    let countdown = existingCountdown ? parseInt(existingCountdown.text) : 1;

    // Distruggi il vecchio countdown e creane uno nuovo sulla granata
    if (existingCountdown) {
      existingCountdown.destroy();
    }

    const countdownText = this.add.text(x, y - 25, `${countdown}`, {
      fontSize: '16px',
      fill: '#ff0000',
      fontStyle: 'bold'
    });
    countdownText.setOrigin(0.5);
    countdownText.setDepth(15);

    // Nuovo timer per il countdown rimanente
    const waitTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        countdown--;
        countdownText.setText(`${countdown}`);

        if (countdown <= 0) {
          waitTimer.remove();
          grenade.destroy();
          countdownText.destroy();
          this.hideEscapeMessage();

          // Esplosione!
          this.handleDelayedExplosion(x, y, weaponDef);
          this.endTurn();
        }
      },
      loop: true
    });
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

    // Applica gravità ai players
    this.players.forEach(player => {
      const beetleCompat = {
        x: player.position.x,
        y: player.position.y,
        isAlive: player.isAlive(),
        moveTo: (x, y) => player.moveTo(x, y)
      };

      if (Physics.applyGravityToBeetle(beetleCompat, this.terrain)) {
        player.updateSprite();
      }
    });

    // Termina il turno
    this.endTurn();
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

      // Log danno e traccia eventi audio
      if (player.isDead()) {
        console.log(`💀 ${player.name} KILLED by ${damage} HP (${Math.round(percent)}% at ${Math.round(distance)}px)`);

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

    let winner;
    if (team0Alive > team1Alive) {
      winner = 'Team 0 (Verde) vince!';
    } else if (team1Alive > team0Alive) {
      winner = 'Team 1 (Rosso) vince!';
    } else {
      winner = 'Pareggio!';
    }

    // Nota: non ci sono suoni per vittoria nelle linee guida audio
    // I suoni sono solo per feedback durante il gameplay (danno, morte, frustrazione)

    // Overlay vittoria
    const overlay = this.add.rectangle(
      this.gameWidth / 2,
      this.gameHeight / 2,
      this.gameWidth,
      this.gameHeight,
      0x000000,
      0.7
    );

    const winText = this.add.text(
      this.gameWidth / 2,
      this.gameHeight / 2 - 50,
      `🏆 ${winner} vince!`,
      {
        fontSize: '48px',
        fill: '#ffff00',
        fontStyle: 'bold'
      }
    );
    winText.setOrigin(0.5);

    const restartText = this.add.text(
      this.gameWidth / 2,
      this.gameHeight / 2 + 50,
      'Premi R per ricominciare',
      {
        fontSize: '24px',
        fill: '#fff'
      }
    );
    restartText.setOrigin(0.5);

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

        if (weaponType && weaponDef) {
          console.log(`🔫 Selected weapon: ${weaponDef.name}`);
          // Aggiorna l'arma nell'AimController
          this.aimController.setWeapon(weaponType, weaponDef);
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
    // Aggiorna controller di mira
    if (this.aimController && !this.isSelectingWeapon) {
      this.aimController.update(delta);
    }

    // Aggiorna selettore armi
    if (this.weaponSelector) {
      this.weaponSelector.update();
    }

    // Gestione apertura selettore armi con ENTER
    if (this.gamePhase === 'aiming' && !this.isSelectingWeapon && this.activePlayer) {
      if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
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
      let playerMoved = false;

      if (this.aimController.cursors.left.isDown) {
        const newX = this.activePlayer.position.x - (moveSpeed * deltaSeconds);
        if (newX > 20) {
          const groundY = this.terrain.getGroundY(Math.floor(newX));
          this.activePlayer.moveTo(newX, groundY);
          this.activePlayer.updateSprite();
          playerMoved = true;
          if (this.gamePhase === 'aiming') {
            this.aimController.shooterX = newX;
            this.aimController.shooterY = groundY - this.activePlayer.height;
          }
        }
      } else if (this.aimController.cursors.right.isDown) {
        const newX = this.activePlayer.position.x + (moveSpeed * deltaSeconds);
        if (newX < this.gameWidth - 20) {
          const groundY = this.terrain.getGroundY(Math.floor(newX));
          this.activePlayer.moveTo(newX, groundY);
          this.activePlayer.updateSprite();
          playerMoved = true;
          if (this.gamePhase === 'aiming') {
            this.aimController.shooterX = newX;
            this.aimController.shooterY = groundY - this.activePlayer.height;
          }
        }
      }

      // Controlla se il giocatore ha raccolto una cassa
      if (playerMoved) {
        this.checkCrateCollection(this.activePlayer);
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
          this.turnStartTime = Date.now() - (10000 - this.pausedTimeLeft);
        }
        const elapsed = Date.now() - this.turnStartTime;
        this.turnTimeLeft = Math.max(0, 10000 - elapsed);
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
