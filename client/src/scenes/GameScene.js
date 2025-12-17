import { TerrainMask } from '../terrain/TerrainMask.js';
import { Beetle } from '../entities/Beetle.js';
import { Physics } from '../physics/Physics.js';
import { AimController } from '../input/AimController.js';
import { DeterministicRandom } from '../utils/DeterministicRandom.js';

/**
 * Scena principale del gioco
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    console.log('🎮 GameScene created');

    // Dimensioni mondo di gioco
    this.gameWidth = 800;
    this.gameHeight = 600;

    // Stato del gioco
    this.currentTurn = 1;
    this.currentTeam = 1;
    this.turnTimeLeft = 10000; // 10 secondi
    this.gamePhase = 'aiming'; // aiming, shooting, animating

    // Seed per deterministico
    this.gameSeed = Date.now();
    this.turnSeed = this.gameSeed;

    // Inizializza terreno
    this.initTerrain();

    // Inizializza scarabei (mock data)
    this.initBeetles();

    // Render terreno
    this.renderTerrain();

    // Inizializza controller di mira
    this.aimController = new AimController(this);
    this.aimController.create();

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
   * Inizializza gli scarabei (mock data)
   */
  initBeetles() {
    this.beetles = [];

    // Team 1 (verde) - 2 scarabei
    for (let i = 0; i < 2; i++) {
      const x = 100 + i * 80;
      const y = this.terrain.getGroundY(x);
      const beetle = new Beetle(`team1-${i}`, 'player1', 1, x, y);
      beetle.createSprite(this);
      this.beetles.push(beetle);
    }

    // Team 2 (rosso) - 2 scarabei
    for (let i = 0; i < 2; i++) {
      const x = 620 + i * 80;
      const y = this.terrain.getGroundY(x);
      const beetle = new Beetle(`team2-${i}`, 'player2', 2, x, y);
      beetle.createSprite(this);
      beetle.setFlipped(true);
      beetle.updateSprite();
      this.beetles.push(beetle);
    }

    // Scarabeo attivo corrente
    this.activeBeetle = this.beetles[0];
  }

  /**
   * Renderizza il terreno come texture
   */
  renderTerrain() {
    // Crea texture per il terreno
    const graphics = this.add.graphics();

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
  }

  /**
   * Crea UI del gioco
   */
  createUI() {
    // Pannello turno
    this.turnText = this.add.text(this.gameWidth / 2, 20, 'Turno 1 - Team 1', {
      fontSize: '24px',
      fill: '#fff',
      fontStyle: 'bold'
    });
    this.turnText.setOrigin(0.5, 0);

    // Timer turno
    this.timerText = this.add.text(this.gameWidth / 2, 50, '10s', {
      fontSize: '20px',
      fill: '#ffff00'
    });
    this.timerText.setOrigin(0.5, 0);

    // Istruzioni
    this.instructionsText = this.add.text(10, this.gameHeight - 80,
      '↑↓: Regola angolo | SPAZIO: Tieni premuto per caricare, rilascia per sparare', {
      fontSize: '14px',
      fill: '#fff',
      backgroundColor: '#000000aa',
      padding: { x: 5, y: 5 }
    });
  }

  /**
   * Inizia un nuovo turno
   */
  startTurn() {
    console.log(`🎯 Turn ${this.currentTurn} - Team ${this.currentTeam}`);

    this.gamePhase = 'aiming';
    this.turnTimeLeft = 10000;
    this.turnStartTime = Date.now();

    // Genera nuovo seed per questo turno
    const rng = new DeterministicRandom(this.turnSeed);
    this.turnSeed = rng.nextInt(1, 999999999);

    // Trova lo scarabeo attivo per questo team
    const teamBeetles = this.beetles.filter(
      b => b.team === this.currentTeam && b.isAlive
    );

    if (teamBeetles.length === 0) {
      // Team ha perso
      this.endGame();
      return;
    }

    this.activeBeetle = teamBeetles[0];

    // Inizia la fase di mira
    this.aimController.startAiming(
      this.activeBeetle.x,
      this.activeBeetle.y,
      this.activeBeetle.flipped
    );

    this.updateUI();
  }

  /**
   * Gestisce il colpo sparato
   */
  handleShot(shotData) {
    console.log('💥 Shot fired!', shotData);

    this.gamePhase = 'shooting';

    // Simula il colpo
    const rng = new DeterministicRandom(this.turnSeed);
    const maxVelocity = 600; // pixels/s

    const result = Physics.simulateShot(
      this.activeBeetle.x,
      this.activeBeetle.y,
      shotData.angle,
      shotData.power,
      maxVelocity,
      this.terrain,
      this.beetles,
      rng
    );

    console.log('Trajectory points:', result.trajectory.length);
    console.log('Impact:', result.impactPoint);

    // Anima il proiettile
    this.animateProjectile(result);
  }

  /**
   * Anima il proiettile lungo la traiettoria
   */
  animateProjectile(result) {
    // Crea il proiettile
    const projectile = this.add.circle(
      result.trajectory[0].x,
      result.trajectory[0].y,
      4,
      0xffff00
    );

    let currentPoint = 0;
    const animSpeed = 3; // Punti per frame

    // Timer per animazione
    const timer = this.time.addEvent({
      delay: 16, // ~60 FPS
      callback: () => {
        currentPoint += animSpeed;

        if (currentPoint >= result.trajectory.length) {
          // Fine traiettoria
          projectile.destroy();
          timer.remove();

          if (result.impactPoint) {
            this.handleImpact(result);
          }

          this.endTurn();
          return;
        }

        const point = result.trajectory[Math.floor(currentPoint)];
        projectile.setPosition(point.x, point.y);
      },
      loop: true
    });
  }

  /**
   * Gestisce l'impatto del proiettile
   */
  handleImpact(result) {
    const { impactPoint, hitBeetle } = result;

    // Effetto esplosione
    const explosionRadius = 30;
    const maxDamage = 35;

    // Grafica esplosione
    const explosion = this.add.circle(
      impactPoint.x,
      impactPoint.y,
      explosionRadius,
      0xff6600,
      0.7
    );

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

    // Applica danni
    const damages = Physics.applyExplosionDamage(
      impactPoint.x,
      impactPoint.y,
      explosionRadius,
      maxDamage,
      this.beetles
    );

    // Mostra danni
    damages.forEach(({ beetle, damage }) => {
      beetle.updateSprite();

      // Testo danno
      const damageText = this.add.text(beetle.x, beetle.y - 40, `-${damage}`, {
        fontSize: '20px',
        fill: '#ff0000',
        fontStyle: 'bold'
      });
      damageText.setOrigin(0.5);

      this.tweens.add({
        targets: damageText,
        y: beetle.y - 80,
        alpha: 0,
        duration: 1000,
        onComplete: () => damageText.destroy()
      });

      console.log(`💔 ${beetle.id} took ${damage} damage (HP: ${beetle.hp})`);
    });

    // Applica gravità agli scarabei
    this.beetles.forEach(beetle => {
      if (Physics.applyGravityToBeetle(beetle, this.terrain)) {
        beetle.updateSprite();
      }
    });
  }

  /**
   * Fine del turno
   */
  endTurn() {
    console.log('⏭️ Turn ended');

    this.gamePhase = 'animating';

    // Passa al prossimo team
    this.currentTeam = this.currentTeam === 1 ? 2 : 1;

    // Se torniamo al team 1, aumenta il numero di turno
    if (this.currentTeam === 1) {
      this.currentTurn++;
    }

    // Controlla vittoria
    const team1Alive = this.beetles.filter(b => b.team === 1 && b.isAlive).length;
    const team2Alive = this.beetles.filter(b => b.team === 2 && b.isAlive).length;

    if (team1Alive === 0 || team2Alive === 0) {
      this.endGame();
      return;
    }

    // Prossimo turno dopo un delay
    this.time.delayedCall(1000, () => {
      this.startTurn();
    });
  }

  /**
   * Fine della partita
   */
  endGame() {
    console.log('🏁 Game ended!');

    const team1Alive = this.beetles.filter(b => b.team === 1 && b.isAlive).length;
    const team2Alive = this.beetles.filter(b => b.team === 2 && b.isAlive).length;

    let winner;
    if (team1Alive > team2Alive) {
      winner = 'Team 1 (Verde)';
    } else if (team2Alive > team1Alive) {
      winner = 'Team 2 (Rosso)';
    } else {
      winner = 'Pareggio';
    }

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
    this.turnText.setText(`Turno ${this.currentTurn} - Team ${this.currentTeam}`);

    const seconds = Math.ceil(this.turnTimeLeft / 1000);
    this.timerText.setText(`${seconds}s`);

    if (seconds <= 3) {
      this.timerText.setColor('#ff0000');
    } else {
      this.timerText.setColor('#ffff00');
    }
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
    if (this.aimController) {
      this.aimController.update(delta);
    }

    // Aggiorna timer turno
    if (this.gamePhase === 'aiming') {
      const elapsed = Date.now() - this.turnStartTime;
      this.turnTimeLeft = Math.max(0, 10000 - elapsed);

      if (this.turnTimeLeft === 0) {
        // Tempo scaduto - passa il turno
        this.aimController.stopAiming();
        this.endTurn();
      }

      this.updateUI();
    }

    // Aggiorna debug info
    this.updateDebugInfo();
  }
}
