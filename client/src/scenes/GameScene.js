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

    // Traccia l'ID dell'ultimo beetle che ha giocato per ogni team
    this.lastPlayedBeetleTeam1 = null;
    this.lastPlayedBeetleTeam2 = null;

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
    this.instructionsText = this.add.text(10, this.gameHeight - 100,
      '↑↓: Angolo | ←→: Muovi giocatore | SPAZIO: Carica e spara (timer si ferma)', {
      fontSize: '14px',
      fill: '#fff',
      backgroundColor: '#000000aa',
      padding: { x: 5, y: 5 }
    });

    // Info aggiuntivo
    this.infoText = this.add.text(10, this.gameHeight - 70,
      'La barra verde sotto il giocatore mostra la vita', {
      fontSize: '12px',
      fill: '#00ff00',
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
    this.timerPaused = false;

    // Genera nuovo seed per questo turno
    const rng = new DeterministicRandom(this.turnSeed);
    this.turnSeed = rng.nextInt(1, 999999999);

    // Trova TUTTI gli scarabei vivi di questo team
    const teamBeetles = this.beetles.filter(
      b => b.team === this.currentTeam && b.isAlive
    );

    console.log(`Team ${this.currentTeam} alive beetles:`, teamBeetles.map(b => `${b.id}(HP:${b.hp})`).join(', '));

    // Se non ci sono beetle vivi, il team ha perso
    if (teamBeetles.length === 0) {
      console.log(`💀 Team ${this.currentTeam} has NO alive beetles! GAME OVER!`);
      this.endGame();
      return;
    }

    // FIX: Seleziona il prossimo beetle in modo round-robin
    let selectedBeetle;
    const lastPlayedId = this.currentTeam === 1 ? this.lastPlayedBeetleTeam1 : this.lastPlayedBeetleTeam2;

    if (lastPlayedId === null) {
      // Prima volta, seleziona il primo beetle
      selectedBeetle = teamBeetles[0];
    } else {
      // Trova l'indice dell'ultimo beetle che ha giocato
      const lastIndex = teamBeetles.findIndex(b => b.id === lastPlayedId);

      if (lastIndex === -1) {
        // L'ultimo beetle che ha giocato è morto, prendi il primo disponibile
        selectedBeetle = teamBeetles[0];
      } else {
        // Prendi il prossimo nella lista (con wrap-around)
        const nextIndex = (lastIndex + 1) % teamBeetles.length;
        selectedBeetle = teamBeetles[nextIndex];
      }
    }

    this.activeBeetle = selectedBeetle;

    // Salva quale beetle ha giocato
    if (this.currentTeam === 1) {
      this.lastPlayedBeetleTeam1 = selectedBeetle.id;
    } else {
      this.lastPlayedBeetleTeam2 = selectedBeetle.id;
    }

    console.log(`🎮 Selected: ${this.activeBeetle.id} (HP: ${this.activeBeetle.hp}/${this.activeBeetle.maxHp})`);

    // Verifica che sia ancora vivo (doppio controllo di sicurezza)
    if (!this.activeBeetle.isAlive) {
      console.error('⚠️ CRITICAL BUG: Selected a DEAD beetle!');
      this.endGame();
      return;
    }

    // Inizia la fase di mira
    this.aimController.startAiming(
      this.activeBeetle.x,
      this.activeBeetle.y - this.activeBeetle.height,
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
    const maxVelocity = 1200; // pixels/s (raddoppiato per maggiore gittata)

    // FIX: Spara da sopra lo scarabeo, non dai piedi
    const startX = this.activeBeetle.x;
    const startY = this.activeBeetle.y - this.activeBeetle.height;

    const result = Physics.simulateShot(
      startX,
      startY,
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
    const animSpeed = 0.9; // Punti per frame (ridotto al 30% per animazione più lenta)

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
    // Raggio 40px: 0-5px=100%, 20px=60%, 40px=20% del max HP
    const explosionRadius = 40;

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

    // Applica danni (percentuale in base alla distanza)
    const damages = Physics.applyExplosionDamage(
      impactPoint.x,
      impactPoint.y,
      explosionRadius,
      this.beetles
    );

    // Mostra danni
    damages.forEach(({ beetle, damage, distance, percent }) => {
      beetle.updateSprite();

      // Log danno con stato alive
      if (!beetle.isAlive) {
        console.log(`💀 ${beetle.id} KILLED by ${damage} HP (${Math.round(percent)}% at ${Math.round(distance)}px)`);
      } else {
        console.log(`💔 ${beetle.id} took ${damage} HP (${Math.round(percent)}% at ${Math.round(distance)}px) - HP: ${beetle.hp}/${beetle.maxHp}`);
      }

      // Testo danno con percentuale
      const damageText = this.add.text(
        beetle.x,
        beetle.y - 40,
        beetle.isAlive ? `-${damage} HP (${Math.round(percent)}%)` : '💀 KILLED!',
        {
          fontSize: '18px',
          fill: beetle.isAlive ? '#ff0000' : '#ffffff',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 2
        }
      );
      damageText.setOrigin(0.5);

      this.tweens.add({
        targets: damageText,
        y: beetle.y - 80,
        alpha: 0,
        duration: 1000,
        onComplete: () => damageText.destroy()
      });
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

    // PRIMA controlla se qualcuno ha vinto (PRIMA di cambiare team!)
    const team1Alive = this.beetles.filter(b => b.team === 1 && b.isAlive).length;
    const team2Alive = this.beetles.filter(b => b.team === 2 && b.isAlive).length;

    console.log(`📊 Alive: Team1=${team1Alive}, Team2=${team2Alive}`);

    if (team1Alive === 0 || team2Alive === 0) {
      console.log('🏁 GAME OVER! Starting end game sequence...');
      // Aspetta un attimo per far vedere l'ultimo danno
      this.time.delayedCall(1500, () => {
        this.endGame();
      });
      return;
    }

    // Passa al prossimo team
    this.currentTeam = this.currentTeam === 1 ? 2 : 1;

    // Se torniamo al team 1, aumenta il numero di turno
    if (this.currentTeam === 1) {
      this.currentTurn++;
    }

    console.log(`⏭️ Next: Team ${this.currentTeam}`);

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

    // Movimento laterale del beetle attivo con LEFT/RIGHT
    if (this.gamePhase === 'aiming' && this.activeBeetle && this.aimController.cursors) {
      const moveSpeed = 80; // pixels/secondo
      const deltaSeconds = delta / 1000;

      if (this.aimController.cursors.left.isDown) {
        const newX = this.activeBeetle.x - (moveSpeed * deltaSeconds);
        // Verifica che non esca dallo schermo
        if (newX > 20) {
          this.activeBeetle.x = newX;
          // Aggiorna posizione sul terreno
          const groundY = this.terrain.getGroundY(Math.floor(this.activeBeetle.x));
          this.activeBeetle.y = groundY;
          this.activeBeetle.updateSprite();
          // Aggiorna anche la posizione del mirino
          this.aimController.shooterX = this.activeBeetle.x;
          this.aimController.shooterY = this.activeBeetle.y - this.activeBeetle.height;
        }
      } else if (this.aimController.cursors.right.isDown) {
        const newX = this.activeBeetle.x + (moveSpeed * deltaSeconds);
        // Verifica che non esca dallo schermo
        if (newX < this.gameWidth - 20) {
          this.activeBeetle.x = newX;
          // Aggiorna posizione sul terreno
          const groundY = this.terrain.getGroundY(Math.floor(this.activeBeetle.x));
          this.activeBeetle.y = groundY;
          this.activeBeetle.updateSprite();
          // Aggiorna anche la posizione del mirino
          this.aimController.shooterX = this.activeBeetle.x;
          this.aimController.shooterY = this.activeBeetle.y - this.activeBeetle.height;
        }
      }
    }

    // Aggiorna timer turno (si ferma quando si carica il colpo)
    if (this.gamePhase === 'aiming') {
      // Se si sta caricando, pausa il timer
      if (this.aimController && this.aimController.isCharging) {
        if (!this.timerPaused) {
          this.timerPaused = true;
          this.pausedTimeLeft = this.turnTimeLeft;
          console.log('⏸️ Timer paused while charging');
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
        const penalty = Math.ceil(this.activeBeetle.maxHp * 0.25);
        this.activeBeetle.takeDamage(penalty);
        this.activeBeetle.updateSprite();

        // Mostra penalità
        const penaltyText = this.add.text(
          this.activeBeetle.x,
          this.activeBeetle.y - 60,
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
          y: this.activeBeetle.y - 100,
          alpha: 0,
          duration: 1500,
          onComplete: () => penaltyText.destroy()
        });

        console.log(`⏱️ Timeout! ${this.activeBeetle.id} loses ${penalty} HP`);

        this.aimController.stopAiming();
        this.endTurn();
      }

      this.updateUI();
    }

    // Aggiorna debug info
    this.updateDebugInfo();
  }
}
